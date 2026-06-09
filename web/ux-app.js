(() => {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const qsa = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const DIR = { up: '↑', down: '↓', left: '←', right: '→' };
  const EL_CLASS = { '火': 'el-fire', '水': 'el-water', '风': 'el-wind', '土': 'el-earth' };
  const EL_ICON = { '火': '火', '水': '水', '风': '风', '土': '土' };
  const PHASE_TEXT = {
    init: '准备', player_turn: '玩家回合', monster_turn: '怪物行动', round_end: '回合结算',
    battle_end: '战斗结束', shop: '商店', day_end: '当天结束', loading: '加载中'
  };

  const ui = {
    vm: null,
    selectedUnitId: null,
    selectedSlotGlobal: null,
    selectedSlot: null,
    selectedCell: null,
    activeLogTab: 'events',
    busy: false,
    slotArmed: false,
    lastPhase: null
  };

  function esc(v) {
    return String(v ?? '').replace(/[&<>'"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[ch]));
  }
  function pct(n, d) { return Math.max(0, Math.min(100, Math.round((Number(n || 0) / Math.max(1, Number(d || 1))) * 100))); }
  function clsForEl(el) { return EL_CLASS[el] || 'el-earth'; }
  function phaseText(phase) { return PHASE_TEXT[phase] || phase || '-'; }
  function unitIcon(unit) {
    if (!unit) return '·';
    if (unit.side === 'boss') return '王';
    if (unit.side === 'hero_leader') return '我';
    if (unit.side === 'enemy') return '怪';
    return EL_ICON[unit.element] || '灵';
  }
  function getAllUnits(vm = ui.vm) {
    if (!vm) return [];
    return [...(vm.heroes || []), ...(vm.enemies || []), vm.leaders?.player, vm.leaders?.enemy].filter(Boolean);
  }
  function unitById(id) { return getAllUnits().find(u => u.id === id) || null; }
  function cellAt(r, c) { return (ui.vm?.board?.cells || []).find(x => Number(x.r) === Number(r) && Number(x.c) === Number(c)) || null; }
  function isNext(type) { return (ui.vm?.nextActions || []).some(a => a.type === type); }
  function selectedHero() { return unitById(ui.selectedUnitId || ui.vm?.selected?.unitId) || null; }

  function slotsFlat() {
    const out = [];
    for (const hero of ui.vm?.heroes || []) {
      (hero.slots || []).forEach((slot, localIndex) => out.push({ hero, slot, localIndex, globalIndex: out.length }));
    }
    return out;
  }
  function selectedSlotInfo() {
    const flat = slotsFlat();
    if (ui.selectedSlotGlobal != null && flat[ui.selectedSlotGlobal]) return flat[ui.selectedSlotGlobal];
    const hero = selectedHero();
    if (!hero) return null;
    const local = Number(ui.selectedSlot ?? ui.vm?.selected?.slotId ?? 0);
    const found = flat.find(x => x.hero.id === hero.id && x.localIndex === local);
    return found || flat.find(x => x.hero.id === hero.id) || flat[0] || null;
  }

  async function api(path, body) {
    const res = await fetch(path, {
      method: body ? 'POST' : 'GET',
      headers: body ? { 'content-type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
      cache: 'no-store'
    });
    const data = await res.json();
    if (!res.ok || data.ok === false) throw new Error(data.error || `HTTP ${res.status}`);
    return data;
  }
  async function loadView() {
    const data = await api('/api/view');
    ui.vm = data.viewModel;
    normalizeSelection();
    render();
  }
  async function report(mode = 'player') {
    const data = await api(`/api/report?mode=${encodeURIComponent(mode)}`);
    return data.report || '';
  }
  async function runCommand(type, payload = {}) {
    if (ui.busy) return;
    ui.busy = true;
    setBusy(true);
    try {
      const data = await api('/api/action', Object.assign({ type }, payload));
      ui.vm = data.viewModel || ui.vm;
      if (data.events && data.events.length) toast(data.events[data.events.length - 1].text || data.events[data.events.length - 1].type);
      normalizeSelection();
      render();
      return data;
    } catch (err) {
      toast(err.message || String(err), true);
      document.body.classList.add('shake');
      setTimeout(() => document.body.classList.remove('shake'), 300);
    } finally {
      ui.busy = false;
      render();
    }
  }
  function setBusy(busy) { qsa('button').forEach(btn => btn.disabled = !!busy && !btn.classList.contains('log-tab')); }
  function toast(text, danger = false) {
    const el = document.createElement('div');
    el.className = 'toast';
    if (danger) el.style.borderLeftColor = '#a84f3e';
    el.textContent = text;
    $('toast-stack').appendChild(el);
    setTimeout(() => el.remove(), 2600);
  }
  function normalizeSelection() {
    const vm = ui.vm;
    if (!vm) return;
    if (!ui.selectedUnitId || !unitById(ui.selectedUnitId)) ui.selectedUnitId = vm.selected?.unitId || null;
    if (vm.selected?.cell) ui.selectedCell = vm.selected.cell;
    const info = selectedSlotInfo();
    if (info) { ui.selectedSlotGlobal = info.globalIndex; ui.selectedSlot = info.localIndex; }
    window.__YSBZS__ = { lastViewModel: vm, runCommand, loadView, isBusy: () => ui.busy };
  }

  function render() {
    const vm = ui.vm;
    if (!vm) return;
    document.body.dataset.phase = vm.phase || 'init';
    $('game-shell').dataset.phase = vm.phase || 'init';
    $('phase-label').textContent = phaseText(vm.phase);
    $('day-label').textContent = `第${vm.day || 1}天 ${vm.period || ''}`.trim();
    $('round-label').textContent = `${vm.round || 0}/${vm.maxRounds || '-'}`;
    $('gold-label').textContent = vm.gold ?? 0;
    const pl = vm.leaders?.player, en = vm.leaders?.enemy;
    $('p-castle-txt').textContent = pl ? `${pl.hp}/${pl.maxHp}` : '-/-';
    $('e-castle-txt').textContent = en ? `${en.hp}/${en.maxHp}` : '-/-';
    renderHeroes(); renderBoard(); renderCellDetail(); renderSlots(); renderControls(); renderRewards(); renderShop(); renderTrial(); renderLog(); maybeBanner();
  }
  function maybeBanner() {
    const phase = ui.vm?.phase;
    if (!phase || ui.lastPhase === null) { ui.lastPhase = phase; return; }
    if (phase !== ui.lastPhase) {
      const b = $('phase-banner');
      b.textContent = phaseText(phase);
      b.classList.remove('show'); void b.offsetWidth; b.classList.add('show');
      ui.lastPhase = phase;
    }
  }

  function renderHeroes() {
    const heroes = ui.vm.heroes || [];
    $('hero-count').textContent = `${heroes.length}人`;
    $('hero-list').innerHTML = heroes.map(h => {
      const sel = h.id === ui.selectedUnitId;
      const dead = h.alive === false || h.hp <= 0;
      return `<button class="hero-card${sel ? ' sel' : ''}" data-hero-id="${esc(h.id)}" type="button">
        <div class="avatar ${clsForEl(h.element)}">${esc(unitIcon(h))}</div>
        <div class="hero-main">
          <strong>${esc(h.name)}</strong>
          <span>${esc(h.element || '-')} · HP ${esc(h.hp)}/${esc(h.maxHp)} · AP ${esc(h.ap ?? 0)}${dead ? ' · 已退场' : ''}</span>
          <div class="hpbar"><i style="width:${pct(h.hp, h.maxHp)}%"></i></div>
        </div>
        <span class="element-tag ${clsForEl(h.element)}">${esc(h.element || '-')}</span>
      </button>`;
    }).join('') || '<div class="detail-card empty">没有可操作英雄。</div>';
    qsa('.hero-card', $('hero-list')).forEach(btn => btn.addEventListener('click', () => selectHero(btn.dataset.heroId)));
  }
  async function selectHero(unitId) {
    const prev = ui.selectedUnitId;
    ui.selectedUnitId = unitId === ui.selectedUnitId ? null : unitId;
    ui.selectedSlotGlobal = null;
    ui.selectedSlot = null;
    ui.slotArmed = false;
    console.log(`[selectHero] ${prev}→${ui.selectedUnitId}`);
    await runCommand('SELECT_UNIT', { unitId: ui.selectedUnitId });
  }

  function renderBoard() {
    const board = ui.vm.board || { rows: 0, cols: 0, cells: [] };
    const cellSize = board.cols > 8 || board.rows > 8 ? 48 : 52;
    $('board').style.gridTemplateColumns = `repeat(${board.cols}, ${cellSize}px)`;
    $('board').style.gridTemplateRows = `repeat(${board.rows}, ${cellSize}px)`;
    $('board-axis-x').style.gridTemplateColumns = `repeat(${board.cols}, ${cellSize}px)`;
    $('board-axis-y').style.gridTemplateRows = `repeat(${board.rows}, ${cellSize}px)`;
    $('board-axis-x').innerHTML = Array.from({ length: board.cols }, (_, i) => `<span>${i + 1}</span>`).join('');
    $('board-axis-y').innerHTML = Array.from({ length: board.rows }, (_, i) => `<span>${i + 1}</span>`).join('');

    const selected = ui.selectedCell || ui.vm.selected?.cell;
    const selectedH = selectedHero();
    const moveTargets = legalMoveTargets(selectedH);
    const previewKeys = new Set((ui.vm.previewGrid || []).map(x => `${x.r},${x.c}`));
    const threatKeys = new Set((ui.vm.threatGrid || []).map(x => `${x.r},${x.c}`));
    const previewMap = new Map((ui.vm.previewGrid || []).map(x => [`${x.r},${x.c}`, x]));
    const threatMap = new Map((ui.vm.threatGrid || []).map(x => [`${x.r},${x.c}`, x]));

    $('board').innerHTML = board.cells.map(cell => {
      const key = `${cell.r},${cell.c}`;
      const unit = unitById(cell.unitId);
      const classes = ['cell'];
      if (selected && selected.r === cell.r && selected.c === cell.c) classes.push('selected');
      if (moveTargets.has(key)) classes.push('move-target');
      if (previewKeys.has(key)) classes.push('preview-hit');
      if (threatKeys.has(key)) classes.push('threat-hit');
      if (cell.unitId && cell.unitId !== selectedH?.id) classes.push('blocked');
      const elements = Object.entries(cell.elements || {}).filter(([, n]) => Number(n) > 0)
        .map(([el, n]) => `<span class="element-badge ${clsForEl(el)}">${esc(el)}${esc(n)}</span>`).join('');
      const p = previewMap.get(key); const t = threatMap.get(key);
      return `<button class="${classes.join(' ')}" data-r="${cell.r}" data-c="${cell.c}" type="button" aria-label="R${cell.r + 1}C${cell.c + 1}">
        ${elements ? `<div class="element-stack">${elements}</div>` : ''}
        ${unit ? unitToken(unit) : '<span class="empty-dot">·</span>'}
        ${p ? `<span class="preview-num">预${esc(p.damage ?? p.layers ?? '+')}</span>` : ''}
        ${t ? `<span class="threat-num">危${esc(t.damage ?? t.atk ?? '!')}</span>` : ''}
      </button>`;
    }).join('');
    qsa('.cell', $('board')).forEach(btn => btn.addEventListener('click', () => onCellClick(Number(btn.dataset.r), Number(btn.dataset.c))));
  }
  function unitToken(unit) {
    const side = unit.side === 'hero' ? 'hero' : unit.side === 'boss' ? 'boss leader' : unit.side === 'hero_leader' ? 'hero leader' : 'enemy';
    const name = unit.name || unit.displayName || unit.id;
    return `<div class="unit-token ${side}" title="${esc(name)}"><span>${esc(unitIcon(unit))}</span><small>${esc(Math.max(0, unit.hp ?? 0))}</small></div>`;
  }
  function legalMoveTargets(hero) {
    const set = new Set();
    if (!hero?.position || (ui.vm.phase !== 'init' && ui.vm.phase !== 'player_turn') || ui.slotArmed) return set;
    const ap = Number(hero.ap || 1);
    for (const cell of ui.vm.board?.cells || []) {
      const d = Math.abs(cell.r - hero.position.r) + Math.abs(cell.c - hero.position.c);
      if (d > 0 && d <= ap && !cell.unitId) set.add(`${cell.r},${cell.c}`);
    }
    return set;
  }
  async function onCellClick(r, c) {
    ui.selectedCell = { r, c };
    const cell = cellAt(r, c);
    const hero = selectedHero();
    console.log(`[onCellClick] r=${r} c=${c} phase=${ui.vm?.phase} slotArmed=${ui.slotArmed} hero=${hero?.id||'null'} cellEmpty=${!cell?.unitId}`);
    await runCommand('SELECT_CELL', { r, c });
    if (ui.slotArmed) { console.log('→ 槽瞄准态，只选目标'); return; }
    if ((ui.vm?.phase === 'init' || ui.vm?.phase === 'player_turn') && hero && cell && !cell.unitId) {
      console.log('→ 条件满足，执行移动（后端自动开战）');
      await runCommand('MOVE_HERO', { unitId: hero.id, to: { r, c } });
    } else {
      console.log(`→ 不满足移动条件: phase=${ui.vm?.phase} hero=${!!hero} cell=${!!cell} empty=${!cell?.unitId}`);
    }
  }

  function renderCellDetail() {
    const c = ui.selectedCell || ui.vm.selected?.cell;
    if (!c) { $('cell-detail').className = 'detail-card empty'; $('cell-detail').textContent = '选择棋盘格后显示单位、元素与预览。'; return; }
    const cell = cellAt(c.r, c.c);
    const unit = unitById(cell?.unitId);
    const lines = [`位置：第${Number(c.r) + 1}行第${Number(c.c) + 1}列`];
    if (unit) lines.push(`单位：${unit.displayName || unit.name} · HP ${unit.hp}/${unit.maxHp} · 攻 ${unit.atk || 0}`);
    const els = Object.entries(cell?.elements || {}).filter(([, n]) => Number(n) > 0).map(([el, n]) => `${el}${n}`).join(' ');
    lines.push(`元素：${els || '无'}`);
    if (cell?.preview) lines.push(`预览：${JSON.stringify(cell.preview)}`);
    if (cell?.threat) lines.push(`威胁：${JSON.stringify(cell.threat)}`);
    $('cell-detail').className = 'detail-card'; $('cell-detail').textContent = lines.join('\n');
  }

  function renderSlots() {
    const flat = slotsFlat();
    const selected = selectedSlotInfo();
    $('slot-summary').textContent = selected ? `${selected.hero.name} · ${selected.slot.label}` : '未选择';
    $('slot-list').innerHTML = flat.map(x => {
      const s = x.slot, h = x.hero;
      const sel = selected && selected.globalIndex === x.globalIndex;
      const used = s.used;
      const locked = ui.vm.phase !== 'player_turn' || !s.canUse || ui.busy;
      return `<div class="slot-card${sel ? ' sel' : ''}${used ? ' used' : ''}${locked ? ' locked' : ''}" data-slot="${x.globalIndex}">
        <div class="slot-main">
          <strong>${esc(h.name)} · ${esc(s.label)}</strong>
          <span class="${clsForEl(s.element)}">${esc(s.element)}${esc(s.layers)} · ${esc(s.shapeName || s.shapeId || '-')} · ${esc(DIR[s.direction] || s.direction || '→')}</span>
        </div>
        <div class="slot-actions">
          ${['up','left','right','down'].map(d => `<button class="as-dir-btn" data-slot-dir="${x.globalIndex}" data-dir="${d}" type="button"${locked ? ' disabled' : ''}>${DIR[d]}</button>`).join('')}
          <button class="use-btn" data-use="${x.globalIndex}" type="button"${locked || used ? ' disabled' : ''}>施放</button>
        </div>
      </div>`;
    }).join('') || '<div class="detail-card empty">没有行动槽。</div>';
    qsa('[data-slot]', $('slot-list')).forEach(el => el.addEventListener('click', ev => { if (ev.target.closest('button')) return; selectSlot(Number(el.dataset.slot)); }));
    qsa('[data-slot-dir]', $('slot-list')).forEach(btn => btn.addEventListener('click', ev => { ev.stopPropagation(); setSlotDir(Number(btn.dataset.slotDir), btn.dataset.dir); }));
    qsa('[data-use]', $('slot-list')).forEach(btn => btn.addEventListener('click', ev => { ev.stopPropagation(); useSlot(Number(btn.dataset.use)); }));
  }
  async function selectSlot(globalIndex) {
    const info = slotsFlat()[globalIndex]; if (!info) return;
    ui.selectedUnitId = info.hero.id; ui.selectedSlotGlobal = globalIndex; ui.selectedSlot = info.localIndex; ui.slotArmed = true;
    await runCommand('SELECT_SLOT', { slotId: info.localIndex, unitId: info.hero.id });
  }
  async function setSlotDir(globalIndex, dir) {
    const info = slotsFlat()[globalIndex]; if (!info) return;
    ui.selectedUnitId = info.hero.id; ui.selectedSlotGlobal = globalIndex; ui.selectedSlot = info.localIndex; ui.slotArmed = true;
    await runCommand('SET_ACTION_DIRECTION', { unitId: info.hero.id, slotId: info.localIndex, dir });
  }
  async function useSlot(globalIndex) {
    const info = slotsFlat()[globalIndex] || selectedSlotInfo(); if (!info) return;
    ui.selectedUnitId = info.hero.id; ui.selectedSlotGlobal = info.globalIndex; ui.selectedSlot = info.localIndex; ui.slotArmed = false;
    await runCommand('USE_SLOT', { unitId: info.hero.id, slotId: info.localIndex, cell: ui.selectedCell || ui.vm.selected?.cell || null });
  }

  function renderControls() {
    const phase = ui.vm.phase;
    $('etb').textContent = phase === 'init' ? '开始战斗' : '结束回合';
    $('etb').disabled = !(phase === 'init' || phase === 'player_turn') || ui.busy;
    $('monster-btn').disabled = !(phase === 'monster_turn' || phase === 'round_end') || ui.busy;
    $('exa').disabled = ui.busy || phase === 'shop' || phase === 'day_end';
    $('full-day-btn').disabled = ui.busy || !['init','battle_end','day_end'].includes(phase);
    $('shop-btn').disabled = ui.busy || phase !== 'battle_end';
    $('day7-btn').disabled = ui.busy;
    $('new-game-btn').disabled = ui.busy;
    $('roll-shop-btn').disabled = phase !== 'shop' || ui.busy;
    $('exit-shop-btn').disabled = phase !== 'shop' || ui.busy;
    $('reward-btn').disabled = !(phase === 'battle_end' || isNext('REWARD_OPTIONS')) || ui.busy;
    $('operation-hint').textContent = hintText();
  }
  function hintText() {
    const phase = ui.vm.phase;
    if (phase === 'init') return '点击“开始战斗”，进入玩家回合。';
    if (phase === 'player_turn') return '选择英雄 → 点空格移动/点目标查看 → 选择行动槽 → 调方向 → 施放。';
    if (phase === 'monster_turn' || phase === 'round_end') return '点击“怪物行动”或“自动战斗”继续推进。';
    if (phase === 'battle_end') return '战斗结束，可以生成奖励或进入商店。';
    if (phase === 'shop') return '购买、冻结、刷新商品，然后离开商店。';
    return '可使用右侧按钮继续流程。';
  }

  function renderRewards() {
    const rewards = ui.vm.rewards || [];
    $('reward-list').innerHTML = rewards.map((r, i) => `<button class="reward-card" data-reward-index="${i}" type="button"${ui.busy ? ' disabled' : ''}>
      <strong>${esc(r.name || r.petName || r.relicName || r.type || `奖励${i + 1}`)}</strong><span>选择</span>
    </button>`).join('');
    qsa('[data-reward-index]', $('reward-list')).forEach(btn => btn.addEventListener('click', () => runCommand('PICK_REWARD', { index: Number(btn.dataset.rewardIndex) })));
  }
  function renderShop() {
    const offers = ui.vm.shop?.offers || [];
    $('shop-list').innerHTML = offers.map(o => `<div class="offer-card${o.frozen ? ' frozen' : ''}">
      <div class="offer-main"><strong>${esc(o.name)}</strong><span class="${clsForEl(o.element)}">${esc(o.element || '-')} · ${esc(o.role || '-')} · ${esc(o.price)}金${o.frozen ? ' · 已冻结' : ''}</span></div>
      <div class="offer-actions"><button class="mini-btn buy" data-buy-offer="${esc(o.offerId)}" type="button"${ui.busy || ui.vm.phase !== 'shop' || Number(o.price) > Number(ui.vm.gold || 0) ? ' disabled' : ''}>购买</button><button class="mini-btn freeze" data-freeze-offer="${esc(o.offerId)}" data-frozen="${o.frozen ? '1' : '0'}" type="button"${ui.busy || ui.vm.phase !== 'shop' ? ' disabled' : ''}>${o.frozen ? '解冻' : '冻结'}</button></div>
    </div>`).join('');
    qsa('[data-buy-offer]', $('shop-list')).forEach(btn => btn.addEventListener('click', () => runCommand('BUY_OFFER', { offerId: btn.dataset.buyOffer })));
    qsa('[data-freeze-offer]', $('shop-list')).forEach(btn => btn.addEventListener('click', () => runCommand(btn.dataset.frozen === '1' ? 'UNFREEZE_OFFER' : 'FREEZE_OFFER', { offerId: btn.dataset.freezeOffer })));
  }
  function renderTrial() {
    const t = ui.vm.day7Trial;
    if (!t) { $('trial-card').className = 'trial-card empty'; $('trial-card').textContent = '未进入特殊试炼。'; return; }
    $('trial-card').className = 'trial-card';
    $('trial-card').textContent = [
      t.title || '第7天火核心试炼',
      t.enemyHeroPosition ? `敌方英雄：${t.enemyHeroPosition}` : '',
      `第1回合击杀：${t.round1KillCount || 0}/2`,
      t.round1Kills?.length ? `击杀目标：${t.round1Kills.join('、')}` : '',
      t.passedRound1Standard ? '达成1金3银首回合解决2怪标准' : ''
    ].filter(Boolean).join('\n');
  }

  async function renderLog() {
    const vm = ui.vm;
    if (!vm) return;
    if (ui.activeLogTab === 'report') {
      $('log').textContent = await report('player');
      return;
    }
    if (ui.activeLogTab === 'debug') {
      $('log').textContent = JSON.stringify({ selected: vm.selected, nextActions: vm.nextActions, meta: vm.meta }, null, 2);
      return;
    }
    const events = vm.events || [];
    $('log').textContent = events.slice(-22).map(e => `${String(e.step || '').padStart(3, '0')} [${e.type}] ${e.text || ''}`).join('\n') || '暂无事件。';
  }

  function bind() {
    $('new-game-btn').addEventListener('click', () => { console.log('[bind] 新开一天'); runCommand('NEW_GAME', { day: 1, period: '上午', gold: 8 }); });
    $('day7-btn').addEventListener('click', () => { console.log('[bind] 第7天试炼'); runCommand('SETUP_DAY7_FIRE_TRIAL'); });
    $('etb').addEventListener('click', () => { const cmd = ui.vm?.phase === 'init' ? 'START_BATTLE' : 'END_PLAYER_TURN'; console.log(`[bind] ${cmd}`); runCommand(cmd); });
    $('monster-btn').addEventListener('click', () => { console.log('[bind] monster-btn'); runCommand(ui.vm?.phase === 'round_end' ? 'START_NEXT_ROUND' : 'RUN_MONSTER_TURN'); });
    $('exa').addEventListener('click', () => { console.log('[bind] 自动战斗'); runCommand('RUN_BATTLE'); });
    $('full-day-btn').addEventListener('click', () => { console.log('[bind] 一键完整流程'); runCommand('RUN_FULL_DAY'); });
    $('reward-btn').addEventListener('click', () => { console.log('[bind] 生成奖励'); runCommand('REWARD_OPTIONS', { poolId: 'reward_pT1', count: 3 }); });
    $('shop-btn').addEventListener('click', () => { console.log('[bind] 进入商店'); runCommand('ENTER_SHOP', { poolId: 'night_base', slots: 6 }); });
    $('roll-shop-btn').addEventListener('click', () => { console.log('[bind] 刷新商店'); runCommand('ROLL_SHOP', { slots: 6 }); });
    $('exit-shop-btn').addEventListener('click', () => { console.log('[bind] 离开商店'); runCommand('EXIT_SHOP'); });
    qsa('.log-tab').forEach(btn => btn.addEventListener('click', () => { qsa('.log-tab').forEach(x => x.classList.remove('active')); btn.classList.add('active'); ui.activeLogTab = btn.dataset.logTab; renderLog(); }));
    window.addEventListener('resize', scaleApp);
    scaleApp();
  }
  function scaleApp() {
    const s = Math.min(window.innerWidth / 1280, window.innerHeight / 720);
    const shell = $('game-shell');
    shell.style.transform = `scale(${s})`;
    shell.style.left = `${Math.max(0, (window.innerWidth - 1280 * s) / 2)}px`;
    shell.style.top = `${Math.max(0, (window.innerHeight - 720 * s) / 2)}px`;
  }

  bind();
  loadView().catch(err => toast(err.message || String(err), true));
})();
