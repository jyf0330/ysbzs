(() => {
  const $ = id => document.getElementById(id);
  const game = $('game');
  const els = {
    stageTitle: $('stage-title'), stageSub: $('stage-sub'), roundTitle: $('round-title'), phaseTitle: $('phase-title'), enemyCount: $('enemy-count'), stateLabel: $('state-label'),
    heroCount: $('hero-count'), heroList: $('hero-list'), currentHeroLine: $('current-hero-line'), slotCount: $('slot-count'), slotGrid: $('slot-grid'),
    board: $('board'), boardHint: $('board-hint'), detailAvatar: $('detail-avatar'), detailName: $('detail-name'), detailHp: $('detail-hp'), detailAtk: $('detail-atk'), detailAp: $('detail-ap'), detailTags: $('detail-tags'), detailSlots: $('detail-slots'), miniShape: $('mini-shape'), shapeCopy: $('shape-copy'),
    logLines: $('log-lines'), toast: $('status-toast'), error: $('error-cover'), start: $('start-action')
  };
  const state = {
    playerId: 'p1',
    sessionId: localStorage.getItem('paperBattleSessionId') || `paper_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`,
    vm: null,
    selectedCell: null,
    ap: 1,
    commandNo: 1,
    booted: false,
    busy: false,
    lastError: null
  };
  localStorage.setItem('paperBattleSessionId', state.sessionId);

  const elementMap = {
    '火': { icon: '🔥', cls: 'fire', name: '火' },
    '水': { icon: '💧', cls: 'water', name: '水' },
    '风': { icon: '🍃', cls: 'wind', name: '风' },
    '土': { icon: '⛰', cls: 'earth', name: '土' },
    '-': { icon: '◇', cls: 'none', name: '-' },
    null: { icon: '◇', cls: 'none', name: '-' },
    undefined: { icon: '◇', cls: 'none', name: '-' }
  };
  const displayGlyph = {
    '融焰娘': '焰', '火绒狐': '狐', '冲浪鸭': '鸭', '疾风隼': '隼',
    '精灵龙黄金复制体': '龙', '皮皮鸡黄金复制体': '鸡', '骑士蜂黄金复制体': '蜂', '棉悠悠黄金复制体': '羊',
    '兽群统领': '王', '敌方Boss': '王', '我方英雄': '主', '孙悟空': '猴', '唐三藏': '僧', '唐僧': '僧', '玉兔精': '兔', '蜘蛛精': '蛛'
  };
  const phaseText = phase => ({
    init: '初始化', player_turn: '我方调整阶段', player: '我方调整阶段', monster_turn: '敌方行动阶段', round_end: '回合结算', battle_end: '战斗结束', shop: '商店阶段', day_end: '今日结束'
  }[phase] || phase || '未知阶段');
  const elInfo = el => elementMap[el] || elementMap['-'];
  const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
  const shortName = (name = '?') => displayGlyph[name] || String(name).replace(/黄金复制体/g, '').slice(0, 1) || '?';
  const html = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[c]));
  const liveUnits = () => [...(state.vm?.heroes || []), ...(state.vm?.enemies || []), state.vm?.leaders?.player, state.vm?.leaders?.enemy].filter(Boolean);
  const selected = () => state.vm?.selected || { unitId: null, slotId: null, cell: null, direction: 'right' };
  const selectedHero = () => (state.vm?.heroes || []).find(h => h.id === selected().unitId) || (state.vm?.heroes || [])[0] || null;
  const selectedSlotIndex = () => Number.isInteger(Number(selected().slotId)) ? Number(selected().slotId) : 0;
  const selectedSlot = () => selectedHero()?.slots?.[selectedSlotIndex()] || null;
  const allSlots = () => {
    const out = [];
    (state.vm?.heroes || []).forEach((hero, heroIndex) => (hero.slots || []).forEach((slot, slotIndex) => out.push({ hero, heroIndex, slot, slotIndex, globalIndex: out.length })));
    return out;
  };
  function setToast(text, kind = 'info') {
    els.toast.textContent = text;
    els.toast.dataset.kind = kind;
  }
  async function fetchJson(path, body) {
    const opts = {
      method: body ? 'POST' : 'GET',
      headers: { 'x-session-id': state.sessionId, 'x-player-id': state.playerId },
      cache: 'no-store'
    };
    if (body) { opts.headers['content-type'] = 'application/json'; opts.body = JSON.stringify(body); }
    const res = await fetch(path, opts);
    const data = await res.json().catch(() => ({}));
    if (!res.ok || data.ok === false) throw new Error(data.error || `${opts.method} ${path} HTTP ${res.status}`);
    if (data.sessionId) state.sessionId = data.sessionId;
    if (data.viewModel) state.vm = data.viewModel;
    localStorage.setItem('paperBattleSessionId', state.sessionId);
    return data;
  }
  async function apiView() { return fetchJson('/api/view'); }
  async function newSession(setupTrial = true) {
    state.sessionId = `paper_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
    localStorage.setItem('paperBattleSessionId', state.sessionId);
    setToast('创建新会话…');
    await fetchJson('/api/session/new', { sessionId: state.sessionId, playerId: state.playerId, day: 1, period: '上午', gold: 12 });
    if (setupTrial) await runCommand('SETUP_DAY7_FIRE_TRIAL', {}, { silent: true });
    await selectDefaultHeroSlot();
    setToast('已连接真实 /api，已进入第7天试炼');
  }
  async function runCommand(type, payload = {}, opts = {}) {
    if (state.busy) return null;
    state.busy = true;
    try {
      const vm = state.vm || {};
      const body = Object.assign({ type, playerId: state.playerId, commandId: `paper_${state.commandNo++}` }, payload);
      if (vm.battleId) body.battleId = vm.battleId;
      if (Number.isFinite(Number(vm.stateVersion))) body.baseStateVersion = Number(vm.stateVersion);
      const data = await fetchJson('/api/action', body);
      state.lastError = null;
      if (!opts.silent) setToast(`已执行：${commandLabel(type)}`);
      render();
      return data;
    } catch (err) {
      state.lastError = err;
      setToast(`操作失败：${err.message || err}`, 'error');
      console.error(err);
      render();
      return null;
    } finally { state.busy = false; }
  }
  function commandLabel(type) {
    return ({ SELECT_UNIT: '选择角色', SELECT_SLOT: '选择作用形状', SELECT_CELL: '选择格子', MOVE_HERO: '移动角色', SET_ACTION_DIRECTION: '调整方向', USE_SLOT: '施放形状', END_PLAYER_TURN: '结束我方回合', RUN_MONSTER_TURN: '敌方行动', RUN_PLAYER_ALL_OUT: '开始行动', START_NEXT_ROUND: '下一回合', SETUP_DAY7_FIRE_TRIAL: '第7天试炼', RUN_DAY7_FIRE_TRIAL_ALL: '自动试炼' }[type] || type);
  }
  async function selectDefaultHeroSlot() {
    const hero = (state.vm?.heroes || [])[0];
    if (!hero) return;
    await runCommand('SELECT_UNIT', { unitId: hero.id }, { silent: true });
    await runCommand('SELECT_SLOT', { unitId: hero.id, slotId: 0 }, { silent: true });
  }
  async function boot() {
    try {
      els.error.classList.add('hidden');
      setToast('连接项目服务…');
      await apiView();
      if (!state.vm?.day7Trial) await newSession(true);
      else if (!selected().unitId) await selectDefaultHeroSlot();
      state.booted = true;
      render();
      setToast('Live API 已接入');
    } catch (err) {
      state.lastError = err;
      els.error.classList.remove('hidden');
      setToast('未连接到项目服务', 'error');
      console.error(err);
    }
  }
  function shapePattern(slotOrName, dir = 'right') {
    const name = typeof slotOrName === 'string' ? slotOrName : (slotOrName?.shapeName || '');
    let pts;
    if (/横扫|横/.test(name)) pts = [[0,-1],[0,0],[0,1]];
    else if (/长柄T|T/.test(name)) pts = [[0,0],[-1,0],[0,-1],[0,1]];
    else if (/十字/.test(name)) pts = [[0,0],[-1,0],[1,0],[0,-1],[0,1]];
    else if (/L|折/.test(name)) pts = [[0,0],[1,0],[1,1]];
    else if (/单点|刺/.test(name)) pts = [[0,0]];
    else pts = [[0,0]];
    if (dir === 'right') return pts;
    if (dir === 'left') return pts.map(([r,c]) => [r,-c]);
    if (dir === 'down') return pts.map(([r,c]) => [c,r]);
    if (dir === 'up') return pts.map(([r,c]) => [-c,-r]);
    return pts;
  }
  function localPreviewSet() {
    const hero = selectedHero();
    const slot = selectedSlot();
    if (!hero?.position || !slot) return new Set();
    const rows = Number(state.vm?.board?.rows || 8), cols = Number(state.vm?.board?.cols || 8);
    const dir = selected().direction || slot.direction || 'right';
    return new Set(shapePattern(slot, dir).map(([dr, dc]) => `${hero.position.r + dr},${hero.position.c + dc}`).filter(key => {
      const [r, c] = key.split(',').map(Number);
      return r >= 0 && c >= 0 && r < rows && c < cols;
    }));
  }
  function miniShape(pattern, size = 3) {
    const off = Math.floor(size / 2);
    return `<div class="${size === 5 ? 'mini-shape-grid' : 'slot-mini'}">${pattern.map(([r, c]) => {
      const rr = clamp(r + off, 0, size - 1) + 1, cc = clamp(c + off, 0, size - 1) + 1;
      return `<i style="grid-row:${rr};grid-column:${cc}"></i>`;
    }).join('')}</div>`;
  }
  function render() {
    if (!state.vm) return;
    renderTop(); renderHeroes(); renderSlots(); renderBoard(); renderRight(); renderLog(); renderStartButton();
    game.dataset.phase = state.vm.phase || 'unknown';
  }
  function renderTop() {
    const vm = state.vm;
    const title = vm.day7Trial?.title || `第${vm.day || '-'}天`;
    els.stageTitle.textContent = title.replace('第7天火核心试炼', '第7天 · 火核心试炼');
    els.stageSub.textContent = `实际数据 · ${vm.period || '上午'} · 金币 ${vm.gold ?? 0}`;
    els.roundTitle.textContent = `第${vm.round ?? '-'}回合`;
    els.phaseTitle.textContent = phaseText(vm.phase);
    const enemies = (vm.enemies || []).filter(u => u.alive !== false && Number(u.hp || 0) > 0).length + (vm.leaders?.enemy && vm.leaders.enemy.alive !== false && Number(vm.leaders.enemy.hp || 0) > 0 ? 1 : 0);
    els.enemyCount.textContent = enemies;
    els.stateLabel.textContent = `Live · v${vm.stateVersion ?? 0} · ${state.sessionId.slice(-6)}`;
  }
  function renderHeroes() {
    const heroes = state.vm.heroes || [];
    els.heroCount.textContent = `${heroes.length}/4`;
    els.heroList.innerHTML = heroes.map(h => {
      const el = elInfo(h.element), active = h.id === selected().unitId;
      const hp = `${h.hp ?? 0}/${h.maxHp ?? h.hp ?? 0}`;
      const ap = h.availableAp ?? h.ap ?? '-';
      return `<button class="hero-card ${active ? 'active' : ''}" data-unit="${html(h.id)}">
        <div class="avatar ${el.cls}">${shortName(h.name)}</div>
        <div class="hero-meta"><h3>${html(h.name)}</h3><div class="line">♥ ${hp}</div><div class="line">⚔ ${h.atk ?? '-'}　AP ${ap}</div></div>
        <div class="elem ${el.cls}" title="${html(el.name)}">${el.icon}</div>
      </button>`;
    }).join('') || '<div class="empty-line">暂无上阵角色</div>';
    els.heroList.querySelectorAll('[data-unit]').forEach(btn => btn.addEventListener('click', () => selectHero(btn.dataset.unit)));
    const h = selectedHero();
    els.currentHeroLine.textContent = h ? `${h.name} · ${h.element || '-'} · ${h.role || '-'} · ${h.quality || '-'}` : '未选择';
  }
  function renderSlots() {
    const slots = allSlots();
    els.slotCount.textContent = `${slots.length}/12`;
    els.slotGrid.innerHTML = slots.map(info => {
      const el = elInfo(info.slot.element), active = info.hero.id === selected().unitId && info.slotIndex === selectedSlotIndex();
      const pattern = shapePattern(info.slot, selected().direction || info.slot.direction || 'right');
      return `<button class="slot-card ${active ? 'active' : ''} ${info.slot.used ? 'used' : ''}" data-unit="${html(info.hero.id)}" data-slot="${info.slotIndex}" title="${html(info.hero.name)} · ${html(info.slot.shapeName)}">
        <span class="slot-el ${el.cls}">${el.icon}</span>${miniShape(pattern, 3)}<small>${html(info.slot.shapeName || info.slot.label || '形状')}</small><span class="slot-hero">${html(info.hero.name)}</span>
      </button>`;
    }).join('');
    els.slotGrid.querySelectorAll('[data-slot]').forEach(btn => btn.addEventListener('click', () => selectSlot(btn.dataset.unit, Number(btn.dataset.slot))));
  }
  function renderBoard() {
    const board = state.vm.board || { rows: 8, cols: 8, cells: [] };
    const rows = Number(board.rows || 8), cols = Number(board.cols || 8);
    const cellByKey = new Map((board.cells || []).map(c => [`${c.r},${c.c}`, c]));
    const unitByCell = new Map();
    liveUnits().forEach(u => { if (u?.position) unitByCell.set(`${u.position.r},${u.position.c}`, u); });
    const local = localPreviewSet();
    const real = new Set((board.previewGrid || []).map(p => `${p.r},${p.c}`));
    const selectedCell = selected().cell || state.selectedCell;
    els.board.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
    els.board.style.gridTemplateRows = `repeat(${rows}, 1fr)`;
    const out = [];
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      const key = `${r},${c}`;
      const cell = cellByKey.get(key) || { r, c, elements: {} };
      const unit = unitByCell.get(key);
      const elemEntries = Object.entries(cell.elements || {}).filter(([, v]) => Number(v) > 0);
      const terrain = terrainText(cell.terrain);
      const cls = [c === cols - 1 ? 'edge-c' : '', r === rows - 1 ? 'edge-r' : '', local.has(key) ? 'preview-local' : '', real.has(key) ? 'preview-real' : '', cell.threat ? 'threat' : '', selectedCell && selectedCell.r === r && selectedCell.c === c ? 'selected-cell' : ''].filter(Boolean).join(' ');
      out.push(`<div class="cell ${cls}" data-r="${r}" data-c="${c}">
        ${elemEntries.length ? `<div class="element-stack">${elemEntries.slice(0,3).map(([el,v]) => `<span title="${html(el)}${v}">${elInfo(el).icon}${v}</span>`).join('')}</div>` : ''}
        ${terrain ? `<span class="terrain" title="${html(terrain)}">${terrainIcon(terrain)}</span>` : ''}
        ${unit ? renderToken(unit) : ''}
      </div>`);
    }
    els.board.innerHTML = out.join('');
    els.board.querySelectorAll('.cell').forEach(cell => cell.addEventListener('click', e => {
      const token = e.target.closest('.token');
      if (token) return;
      selectCell(Number(cell.dataset.r), Number(cell.dataset.c));
    }));
    els.board.querySelectorAll('.token[data-unit]').forEach(t => t.addEventListener('click', e => {
      e.stopPropagation();
      const id = t.dataset.unit;
      if ((state.vm.heroes || []).some(h => h.id === id)) selectHero(id);
      else selectCell(Number(t.closest('.cell')?.dataset.r || 0), Number(t.closest('.cell')?.dataset.c || 0));
    }));
  }
  function terrainText(terrain) {
    if (!terrain) return '';
    const t = terrain.type || terrain.id || terrain.name || '';
    if (!t || ['plain','normal','普通','平地'].includes(String(t))) return '';
    return String(t);
  }
  const terrainIcon = t => /rock|岩|石|障碍/i.test(t) ? '🪨' : /fire|火/i.test(t) ? '♨' : /water|水/i.test(t) ? '💧' : '◇';
  function renderToken(u) {
    const el = elInfo(u.element), side = u.side || 'neutral', active = u.id === selected().unitId;
    const maxHp = Math.max(1, Number(u.maxHp || u.hp || 1));
    const pct = clamp(Math.round(Number(u.hp || 0) / maxHp * 100), 0, 100);
    const roleCls = side === 'enemy' ? 'role-enemy' : side === 'boss' ? 'role-boss' : `role-${el.cls}`;
    return `<div class="token side-${side} ${active ? 'selected' : ''} ${roleCls}" data-unit="${html(u.id)}" title="${html(u.displayName || u.name)} HP${u.hp}/${u.maxHp || u.hp}">
      <span class="token-base"></span><div class="token-figure">${shortName(u.name)}</div><span class="unit-hp"><i style="width:${pct}%"></i></span><span class="unit-name">${html(u.name)}</span>
    </div>`;
  }
  function renderRight() {
    const h = selectedHero();
    if (!h) { els.detailName.textContent = '未选择'; return; }
    const el = elInfo(h.element), slot = selectedSlot(), dir = selected().direction || slot?.direction || 'right';
    els.detailAvatar.className = `detail-avatar ${el.cls}`;
    els.detailAvatar.textContent = shortName(h.name);
    els.detailName.textContent = h.name;
    els.detailHp.textContent = `${h.hp ?? 0}/${h.maxHp ?? h.hp ?? 0}`;
    els.detailAtk.textContent = h.atk ?? '-';
    els.detailAp.textContent = h.availableAp ?? h.ap ?? '-';
    els.detailTags.innerHTML = [h.element, h.quality, h.role].filter(Boolean).map(x => `<span class="tag">${html(x)}</span>`).join('');
    els.detailSlots.innerHTML = (h.slots || []).map((s, i) => `<button class="detail-slot ${i === selectedSlotIndex() ? 'active' : ''} ${s.used ? 'used' : ''}" data-slot="${i}" title="${html(s.shapeName)}">${miniShape(shapePattern(s, dir), 3)}</button>`).join('');
    els.detailSlots.querySelectorAll('[data-slot]').forEach(btn => btn.addEventListener('click', () => selectSlot(h.id, Number(btn.dataset.slot))));
    const pattern = shapePattern(slot, dir);
    els.miniShape.innerHTML = miniShape(pattern, 5);
    const hit = slot?.hitCells || pattern.length;
    const usedText = slot?.used ? '已使用' : (slot?.canUse === false ? '不可用' : '可用');
    els.shapeCopy.innerHTML = `<h3>${html(slot?.shapeName || '未选择')}</h3>
      <div class="copy-line"><span class="copy-label">属性：</span>${html(slot?.element || '-')} / 层数 ${slot?.layers ?? 1} / ${html(dir)}</div>
      <div class="copy-line"><span class="copy-label">覆盖：</span>${hit} 格，状态：${usedText}</div>
      <div class="copy-line"><span class="copy-label">结算：</span>走真实 reducer，点击施放或开始行动后由 /api/action 返回战报。</div>`;
  }
  function renderLog() {
    const recent = [ ...(state.vm.playerViewState?.recentUiEvents || []), ...(state.vm.events || []) ];
    const lines = recent.map(e => e.text || e.type).filter(Boolean).slice(-8);
    els.logLines.innerHTML = lines.slice(-4).map(t => `<div class="log-line">◇ ${colorNames(t)}</div>`).join('') || '<div class="log-line">◇ 暂无事件。</div>';
  }
  function colorNames(text) {
    return html(text).replace(/(融焰娘|火绒狐|冲浪鸭|疾风隼|孙悟空|唐三藏|唐僧|蜘蛛精|玉兔精)/g, '<b>$1</b>').replace(/(精灵龙黄金复制体|皮皮鸡黄金复制体|骑士蜂黄金复制体|棉悠悠黄金复制体|兽群统领|敌方Boss|敌方)/g, '<b>$1</b>');
  }
  function renderStartButton() {
    const p = state.vm.phase;
    let label = '开始行动', wait = false;
    if (p === 'init') label = '开始战斗';
    else if (p === 'monster_turn') label = '敌方行动';
    else if (p === 'round_end') label = '下一回合';
    else if (p === 'battle_end') label = '重开试炼';
    else if (p === 'shop' || p === 'day_end') { label = '无法行动'; wait = true; }
    els.start.textContent = label;
    els.start.dataset.state = wait ? 'wait' : 'ready';
  }
  async function selectHero(unitId) { await runCommand('SELECT_UNIT', { unitId }); await runCommand('SELECT_SLOT', { unitId, slotId: 0 }, { silent: true }); }
  async function selectSlot(unitId, slotId) { await runCommand('SELECT_SLOT', { unitId, slotId }); }
  async function selectCell(r, c) { state.selectedCell = { r, c }; await runCommand('SELECT_CELL', { r, c }); }
  async function moveSelected() {
    const hero = selectedHero();
    const cell = selected().cell || state.selectedCell;
    if (!hero || !cell) return setToast('请先选择我方角色和目标格', 'error');
    await runCommand('MOVE_HERO', { unitId: hero.id, cell });
  }
  async function useSelectedSlot() {
    const hero = selectedHero();
    if (!hero) return setToast('请先选择角色', 'error');
    const cell = selected().cell || state.selectedCell || null;
    await runCommand('USE_SLOT', { unitId: hero.id, slotId: selectedSlotIndex(), cell, ap: state.ap });
  }
  async function smartStart() {
    const phase = state.vm?.phase;
    if (phase === 'init') return runCommand('START_BATTLE');
    if (phase === 'player_turn' || phase === 'player') return runCommand('RUN_PLAYER_ALL_OUT');
    if (phase === 'monster_turn') return runCommand('RUN_MONSTER_TURN');
    if (phase === 'round_end') return runCommand('START_NEXT_ROUND');
    if (phase === 'battle_end') return newSession(true);
    setToast(`当前阶段 ${phaseText(phase)} 不能开始行动`, 'error');
  }
  document.querySelectorAll('[data-dir]').forEach(btn => btn.addEventListener('click', () => {
    const hero = selectedHero();
    if (!hero) return setToast('请先选择角色', 'error');
    runCommand('SET_ACTION_DIRECTION', { unitId: hero.id, slotId: selectedSlotIndex(), dir: btn.dataset.dir });
  }));
  document.querySelectorAll('[data-ap]').forEach(btn => btn.addEventListener('click', () => {
    state.ap = Number(btn.dataset.ap || 1);
    document.querySelectorAll('[data-ap]').forEach(x => x.classList.toggle('active', x === btn));
    setToast(`当前 AP：${state.ap}`);
  }));
  $('move-btn').onclick = moveSelected;
  $('use-slot-btn').onclick = useSelectedSlot;
  $('end-turn-btn').onclick = () => runCommand('END_PLAYER_TURN');
  $('monster-turn-btn').onclick = () => runCommand('RUN_MONSTER_TURN');
  $('start-action').onclick = smartStart;
  $('new-trial').onclick = () => newSession(true);
  $('refresh-view').onclick = async () => { await apiView(); render(); setToast('已刷新 /api/view'); };
  $('auto-trial').onclick = () => runCommand('RUN_DAY7_FIRE_TRIAL_ALL');
  $('toggle-trace').onclick = () => game.classList.toggle('trace-on');
  $('toggle-guide').onclick = () => game.classList.toggle('guides');
  $('retry-connect').onclick = boot;
  document.addEventListener('keydown', e => {
    if (e.key.toLowerCase() === 't') game.classList.toggle('trace-on');
    if (e.key.toLowerCase() === 'g') game.classList.toggle('guides');
  });
  window.__PAPER_BATTLE__ = { state, runCommand, apiView, newSession };
  boot();
})();
