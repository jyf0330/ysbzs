(() => {
  const sharedUi = {};
  function stableKey(value) {
    if (value === null || value === undefined) return String(value);
    if (typeof value !== 'object') return String(value);
    try { return JSON.stringify(value); } catch (_) { return Object.prototype.toString.call(value); }
  }
  function createRenderCache() {
    const keys = new Map();
    return {
      shouldRender(name, value) { const next = stableKey(value); if (keys.get(name) === next) return false; keys.set(name, next); return true; },
      invalidate(name = null) { if (name) keys.delete(name); else keys.clear(); }
    };
  }

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
  const MANUAL_LOCK_TYPES = new Set(['MOVE_HERO', 'USE_SLOT']);

  const ui = {
    vm: null,
    selectedUnitId: null,
    selectedSlotGlobal: null,
    selectedSlot: null,
    selectedCell: null,
    activeLogTab: 'events',
    busy: false,
    slotArmed: false,
    lastPhase: null,
    playerId: 'p1',
    nextCommandNo: 1,
    cellDetail: null,
    replay: { events: [], step: 0 },
    apBySlot: {},
    prepOpen: false,
    prepFilter: '',
    draggedRosterId: null,
    manualAutoLock: false
  };
  Object.assign(ui, sharedUi);
  const renderCache = createRenderCache();

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
  function qualityMark(q) { return { '钻石': '◆', '黄金': '★', '白银': '◇', '青铜': '●' }[q] || ''; }
  function qualityTag(q) {
    return q ? `<span class="quality-tag quality-${esc(q)}">${qualityMark(q)}${esc(q)}</span>` : '';
  }
  function compactMechanics(list = []) {
    const valid = list.filter(x => x && x.id !== 'none');
    if (!valid.length) return '机制 无';
    return valid.map(x => `${x.status === 'implemented' ? '✓' : '待'} ${String(x.id).replace(/^mech_/, '')}`).join(' ');
  }
  function statChips(unit = {}) {
    const ap = unit.availableAp != null ? `${unit.availableAp}/${unit.ap ?? unit.availableAp}` : unit.ap;
    const chips = [
      ['HP', `${unit.hp ?? '-'}/${unit.maxHp ?? '-'}`],
      ['攻', unit.atk ?? 0],
      ['防', unit.def ?? 0],
      ['盾', unit.shield ?? 0],
      ['AP', ap ?? '-']
    ];
    return chips.map(([k, v]) => `<span class="stat-chip"><b>${esc(k)}</b>${esc(v)}</span>`).join('');
  }
  function heroBattleStats(unit = {}) {
    const ap = unit.availableAp != null ? `${unit.availableAp}/${unit.ap ?? unit.availableAp}` : (unit.ap ?? '-');
    return [
      ['HP', `${unit.hp ?? '-'}/${unit.maxHp ?? '-'}`],
      ['攻击', unit.atk ?? 0],
      ['防御', unit.def ?? 0],
      ['护盾', unit.shield ?? 0],
      ['AP', ap],
      ['移动', unit.moveRange ?? unit.moveAp ?? '-']
    ];
  }
  function renderStatGrid(stats, className = 'detail-stat-grid') {
    return `<div class="${className}">${stats.map(([k, v]) => `<span><b>${esc(k)}</b>${esc(v)}</span>`).join('')}</div>`;
  }
  function slotPlanText(unit = {}) {
    const shape = unit.shape?.shapeName || unit.shapeName || unit.shapeId || '-';
    const slots = unit.slots || [];
    const used = slots.filter(s => s.used).length;
    const slotText = slots.length ? `槽${used}/${slots.length}` : `槽${unit.shape?.slotCount || '-'}`;
    const els = slots.length ? slots.map(s => `${s.element}${s.layers || ''}`).join('') : '';
    return `${shape} · ${slotText}${els ? ` · ${els}` : ''}`;
  }
  function boardUnitName(unit = {}) {
    return unit.name || unit.displayName || unit.id || '-';
  }
  function boardUnitShortName(unit = {}) {
    const name = boardUnitName(unit);
    return String(name).replace(/[·\s].*$/, '').slice(0, 3);
  }
  function slotShortName(slot = {}) {
    const label = String(slot.label || '');
    if (label && !/^第\d+槽$/.test(label)) return label.slice(0, 4);
    const shape = String(slot.shapeName || slot.shapeId || '');
    let verb = '击';
    if (shape.includes('刺')) verb = '刺';
    else if (shape.includes('弹')) verb = '弹';
    else if (shape.includes('扫')) verb = '扫';
    else if (shape.includes('风')) verb = '风';
    else if (shape.includes('治')) verb = '疗';
    return `${slot.element || ''}${verb}`.slice(0, 4);
  }
  function skillName(unit = {}, slot = null) {
    return slot?.shapeName || unit.shape?.skill || unit.shape?.shapeName || unit.skill || '普通行动';
  }
  function skillDescription(unit = {}, slot = null) {
    if (slot) return `${slot.shapeName || slot.shapeId || '行动'}，${slot.element || '-'}属性，基础${slot.layers ?? '-'}层，命中${slot.hitCells ?? '-'}格。`;
    const shape = unit.shape || {};
    if (shape.skill) return shape.skill;
    const slotCount = shape.slotCount ?? ((unit.slots || []).length || '-');
    return `${shape.shapeName || '普通行动'}，${shape.shapeClass || '单体/范围'}，${shape.hitCells ?? '-'}格，${slotCount}个行动槽。`;
  }

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
      headers: body ? { 'content-type': 'application/json', 'x-player-id': ui.playerId } : { 'x-player-id': ui.playerId },
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
  function makeCommand(type, payload = {}) {
    const commandNo = ui.nextCommandNo++;
    return Object.assign({
      type,
      commandId: `client_${String(commandNo).padStart(6, '0')}`,
      playerId: ui.playerId,
      battleId: ui.vm?.battleId,
      baseStateVersion: ui.vm?.stateVersion ?? 0
    }, payload);
  }

  async function runCommand(type, payload = {}, options = {}) {
    if (ui.busy) return;
    if (!options.autoFlow && MANUAL_LOCK_TYPES.has(type)) ui.manualAutoLock = true;
    if (type === 'NEW_GAME') {
      ui.manualAutoLock = false;
      ui.prepOpen = false;
      ui.prepFilter = '';
    }
    ui.busy = true;
    setBusy(true);
    try {
      const data = await api('/api/action', makeCommand(type, payload));
      ui.vm = data.viewModel || ui.vm;
      if (type === 'START_BATTLE') ui.prepOpen = false;
      if (!options.suppressToast && data.events && data.events.length && /^SELECT_/.test(data.events[data.events.length - 1].type)) toast(data.events[data.events.length - 1].text || data.events[data.events.length - 1].type);
      normalizeSelection();
      render();
      return data;
    } catch (err) {
      toast(err.message || String(err), true);
      document.body.classList.add('shake');
      setTimeout(() => document.body.classList.remove('shake'), 300);
    } finally {
      ui.busy = false;
      setBusy(false);
      if (ui.vm) {
        renderControls();
        renderPrepOverlay();
      }
    }
  }
  async function saveGame() {
    try {
      const data = await api('/api/save');
      localStorage.setItem('ysbzs.save.slot1', JSON.stringify(data.save));
      toast(`已保存：v${data.save?.state?.stateVersion ?? ui.vm?.stateVersion ?? 0}`);
      return data.save;
    } catch (err) { toast(err.message || String(err), true); }
  }
  async function loadGameFromStorage() {
    try {
      const raw = localStorage.getItem('ysbzs.save.slot1');
      if (!raw) { toast('没有找到本地存档。', true); return null; }
      const data = await api('/api/load', { save: JSON.parse(raw) });
      ui.vm = data.viewModel || ui.vm;
      normalizeSelection();
      render();
      toast(`已读取：v${ui.vm?.stateVersion ?? 0}`);
      return data;
    } catch (err) { toast(err.message || String(err), true); }
  }
  function setBusy(busy) { qsa('button').forEach(btn => btn.disabled = !!busy && !btn.classList.contains('log-tab')); }
  function toast(text, danger = false) {
    const el = document.createElement('div');
    el.className = 'toast';
    if (danger) el.style.borderLeftColor = '#a84f3e';
    const raw = String(text ?? '');
    el.textContent = raw.length > 72 ? `${raw.slice(0, 72)}...` : raw;
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
    window.__YSBZS__ = { lastViewModel: vm, runCommand, loadView, makeCommand, saveGame, loadGameFromStorage, isBusy: () => ui.busy };
  }

  function renderStaticStatus(vm) {
    document.body.dataset.phase = vm.phase || 'init';
    $('game-shell').dataset.phase = vm.phase || 'init';
    $('phase-label').textContent = phaseText(vm.phase);
    $('day-label').textContent = `第${vm.day || 1}天 ${vm.period || ''}`.trim();
    $('round-label').textContent = `${vm.round || 0}/${vm.maxRounds || '-'}`;
    $('gold-label').textContent = vm.gold ?? 0;
    if ($('state-version-label')) $('state-version-label').textContent = `v${vm.stateVersion ?? 0}`;
    const pl = vm.leaders?.player, en = vm.leaders?.enemy;
    $('p-castle-txt').textContent = pl ? `${pl.hp}/${pl.maxHp}` : '-/-';
    $('e-castle-txt').textContent = en ? `${en.hp}/${en.maxHp}` : '-/-';
  }

  function render() {
    const vm = ui.vm;
    if (!vm) return;
    renderStaticStatus(vm);
    if (renderCache.shouldRender('heroes', {
      heroes: vm.heroes,
      selectedUnitId: ui.selectedUnitId,
      selectedSlotGlobal: ui.selectedSlotGlobal,
      slotArmed: ui.slotArmed,
      busy: ui.busy
    })) renderHeroes();
    if (renderCache.shouldRender('roster', { inventory: vm.inventory, prepFilter: ui.prepFilter, prepOpen: ui.prepOpen, phase: vm.phase, busy: ui.busy })) renderRoster();
    if (renderCache.shouldRender('board', {
      board: vm.board,
      previewGrid: vm.previewGrid,
      threatGrid: vm.threatGrid,
      selectedCell: ui.selectedCell || vm.selected?.cell,
      selectedUnitId: ui.selectedUnitId,
      slotArmed: ui.slotArmed
    })) renderBoard();
    if (renderCache.shouldRender('cellDetail', {
      selectedCell: ui.selectedCell || vm.selected?.cell,
      selectedUnitId: ui.selectedUnitId,
      selectedSlotGlobal: ui.selectedSlotGlobal,
      selectedSlot: ui.selectedSlot,
      slotArmed: ui.slotArmed,
      apBySlot: ui.apBySlot,
      detail: ui.cellDetail,
      board: vm.board
    })) renderCellDetail();
    if (renderCache.shouldRender('slots', { heroes: vm.heroes, phase: vm.phase, selectedSlotGlobal: ui.selectedSlotGlobal, selectedSlot: ui.selectedSlot, slotArmed: ui.slotArmed, busy: ui.busy, apBySlot: ui.apBySlot })) renderSlots();
    renderActionPopover();
    renderControls();
    renderPrepOverlay();
    renderOperationRail();
    if (renderCache.shouldRender('rewards', { rewards: vm.rewards, busy: ui.busy })) renderRewards();
    if (renderCache.shouldRender('shop', { shop: vm.shop, gold: vm.gold, phase: vm.phase, busy: ui.busy })) renderShop();
    if (renderCache.shouldRender('trial', vm.day7Trial)) renderTrial();
    if (renderCache.shouldRender('log', { tab: ui.activeLogTab, events: vm.events, selected: vm.selected, meta: vm.meta, replay: ui.replay })) renderLog();
    updateDebugPanel();
    maybeBanner();
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
      return `<article class="hero-card${sel ? ' sel' : ''}">
        <button class="hero-select" data-hero-id="${esc(h.id)}" type="button">
          <span class="avatar ${clsForEl(h.element)}">${esc(unitIcon(h))}</span>
          <div class="hero-main compact-hero-main">
            <div class="hero-title-line">
              <strong>${esc(h.name)}</strong>
              <span class="${clsForEl(h.element)}">${esc(h.element || '-')}</span>
              ${qualityTag(h.quality)}
            </div>
            ${renderStatGrid(heroBattleStats(h), 'hero-stat-grid')}
            ${dead ? '<em>退场</em>' : ''}
          </div>
        </button>
      </article>`;
    }).join('') || '<div class="detail-card empty">没有可操作英雄。</div>';
  }
  async function selectHero(unitId) {
    ui.selectedUnitId = unitId === ui.selectedUnitId ? null : unitId;
    ui.selectedSlotGlobal = null;
    ui.selectedSlot = null;
    ui.slotArmed = false;
    await runCommand('SELECT_UNIT', { unitId: ui.selectedUnitId });
  }

  function renderRoster() {
    const inv = ui.vm.inventory || { active: [], bench: [], activeCount: 0, maxActive: 4 };
    const card = (item, active) => {
      const id = item.instanceId || item.petId;
      const unsupported = (item.mechanicStatus || []).filter(x => x.id !== 'none' && x.status !== 'implemented');
      const supported = (item.mechanicStatus || []).filter(x => x.id !== 'none' && x.status === 'implemented');
      const canUp = active || (item.canActivate !== false && unsupported.length === 0);
      return `<div class="roster-card${active ? '' : ' bench'}${unsupported.length ? ' locked' : ''}" data-roster-id="${esc(id)}">
        <div class="roster-info">
          <strong>${esc(item.name || item.petId)}${qualityTag(item.quality)}<span class="role-tag">${esc(item.role || item.element || '-')}</span></strong>
          <div class="stat-row roster-stats">${statChips(item)}</div>
          <span class="hero-sub">Lv${esc(item.level || 1)} · 售${esc(item.sellValue || 1)}金 · ${esc(compactMechanics([...(supported || []), ...(unsupported || [])]))}</span>
        </div>
        <div class="roster-actions">
          <button class="mini-btn" data-roster-toggle="${esc(id)}" type="button"${ui.busy || (!active && !canUp) ? ' disabled' : ''}>${active ? '备战' : '上阵'}</button>
          <button class="mini-btn sell" data-roster-sell="${esc(id)}" type="button"${ui.busy ? ' disabled' : ''}>出售</button>
        </div>
      </div>`;
    };
    renderPrepOverlay();
  }
  function prepItemText(item = {}) {
    return [
      item.name,
      item.petId,
      item.element,
      item.role,
      item.quality,
      item.level ? `lv${item.level}` : ''
    ].filter(Boolean).join(' ').toLowerCase();
  }
  function prepMatchesFilter(item) {
    const text = ui.prepFilter.trim().toLowerCase();
    if (!text) return true;
    return prepItemText(item).includes(text);
  }
  function renderPrepOverlay() {
    const overlay = $('prep-overlay');
    if (!overlay || !ui.vm) return;
    const phase = ui.vm.phase || 'init';
    if (phase !== 'init') ui.prepOpen = false;
    overlay.classList.toggle('hidden', !ui.prepOpen);
    overlay.setAttribute('aria-hidden', ui.prepOpen ? 'false' : 'true');
    const openBtn = $('prep-open-btn');
    if (openBtn) {
      openBtn.disabled = ui.busy || phase !== 'init';
      openBtn.textContent = phase === 'init' ? '备战' : '已锁定';
      openBtn.title = phase === 'init' ? '备战：调整背包和上阵阵容。' : '战斗开始后不能再备战。';
    }
    const filter = $('prep-filter');
    if (filter && filter.value !== ui.prepFilter) filter.value = ui.prepFilter;
    const inv = ui.vm.inventory || { active: [], bench: [], activeCount: 0, maxActive: 4 };
    const active = (inv.active || []).filter(prepMatchesFilter);
    const bench = (inv.bench || []).filter(prepMatchesFilter);
    const countText = `${inv.activeCount || inv.active?.length || 0}/${inv.maxActive || 4}`;
    if ($('prep-status')) $('prep-status').textContent = `当前上阵 ${countText}。拖到另一列即可上阵或下阵。`;
    if ($('prep-active-list')) $('prep-active-list').innerHTML = active.map(x => prepCard(x, true)).join('') || '<div class="prep-empty">没有匹配的上阵宠物。</div>';
    if ($('prep-bench-list')) $('prep-bench-list').innerHTML = bench.map(x => prepCard(x, false)).join('') || '<div class="prep-empty">没有匹配的背包宠物。</div>';
    if ($('prep-ready-btn')) $('prep-ready-btn').disabled = ui.busy || phase !== 'init';
  }
  function prepCard(item, active) {
    const id = item.instanceId || item.petId;
    const unsupported = (item.mechanicStatus || []).filter(x => x.id !== 'none' && x.status !== 'implemented');
    const locked = !active && (item.canActivate === false || unsupported.length > 0);
    return `<article class="prep-card${active ? ' active' : ' bench'}${locked ? ' locked' : ''}" draggable="${ui.busy ? 'false' : 'true'}" data-prep-roster-id="${esc(id)}" data-prep-active="${active ? '1' : '0'}">
      <div class="avatar ${clsForEl(item.element)}">${esc(EL_ICON[item.element] || '灵')}</div>
      <div class="prep-card-main">
        <strong>${esc(item.name || item.petId)}${qualityTag(item.quality)}<span class="role-tag">${esc(item.role || item.element || '-')}</span></strong>
        <div class="stat-row roster-stats">${statChips(item)}</div>
        <span>${esc(item.element || '-')} · Lv${esc(item.level || 1)} · ${esc(compactMechanics(item.mechanicStatus || []))}</span>
      </div>
      <button class="mini-btn" data-prep-toggle="${esc(id)}" type="button"${ui.busy || locked ? ' disabled' : ''}>${active ? '下阵' : '上阵'}</button>
    </article>`;
  }
  async function dropPrepRoster(instanceId, zone) {
    if (!instanceId || !zone || !ui.vm) return;
    const inv = ui.vm.inventory || {};
    const item = [...(inv.active || []), ...(inv.bench || [])].find(x => (x.instanceId || x.petId) === instanceId);
    if (!item) return;
    const currentlyActive = item.active !== false;
    const wantActive = zone === 'active';
    if (currentlyActive === wantActive) {
      toast(wantActive ? '已经在上阵阵容。' : '已经在备战席。');
      return;
    }
    await runCommand('TOGGLE_UNIT_ACTIVE', { instanceId });
  }

  function renderBoard() {
    const board = ui.vm.board || { rows: 0, cols: 0, cells: [] };
    const cellSize = board.cols > 8 || board.rows > 8 ? 48 : 49;
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
      if (unit?.side === 'hero' || unit?.side === 'hero_leader') classes.push('hero-cell');
      if (unit && unit.id === ui.selectedUnitId) classes.push('selected-unit');
      const elements = Object.entries(cell.elements || {}).filter(([, n]) => Number(n) > 0)
        .map(([el, n]) => `<span class="element-badge ${clsForEl(el)}">${esc(el)}${esc(n)}</span>`).join('');
      const p = previewMap.get(key); const t = threatMap.get(key);
      const aria = unit ? `R${cell.r + 1}C${cell.c + 1} ${unit.displayName || boardUnitName(unit)} 生命 ${unit.hp}/${unit.maxHp} 攻击 ${unit.atk ?? 0}` : `R${cell.r + 1}C${cell.c + 1}`;
      return `<button class="${classes.join(' ')}" data-r="${cell.r}" data-c="${cell.c}" type="button" aria-label="${esc(aria)}">
        ${elements ? `<div class="element-stack">${elements}</div>` : ''}
        ${unit ? unitToken(unit) : '<span class="empty-dot">·</span>'}
        ${p ? `<span class="preview-num">预${esc(p.damage ?? p.layers ?? '+')}</span>` : ''}
        ${t ? `<span class="threat-num">危${esc(t.damage ?? t.atk ?? '!')}</span>` : ''}
      </button>`;
    }).join('');
  }
  function unitToken(unit) {
    const side = unit.side === 'hero' ? 'hero' : unit.side === 'boss' ? 'boss leader' : unit.side === 'hero_leader' ? 'hero leader' : 'enemy';
    const name = boardUnitShortName(unit);
    const active = unit.id === ui.selectedUnitId ? ' is-active' : '';
    return `<div class="unit-token ${side}${active}" title="${esc(unit.displayName || boardUnitName(unit))}">
      <span class="unit-token-name">${esc(name)}</span>
      <span class="unit-token-hp"><i style="width:${pct(unit.hp, unit.maxHp)}%"></i></span>
      <span class="unit-token-mini">${esc(Math.max(0, unit.hp ?? 0))}</span>
    </div>`;
  }
  function legalMoveTargets(hero) {
    const set = new Set();
    if (!hero?.position || ui.vm.phase !== 'player_turn' || ui.slotArmed) return set;
    const range = Number(hero.moveRange ?? hero.ap ?? 1);
    for (const cell of ui.vm.board?.cells || []) {
      const d = Math.abs(cell.r - hero.position.r) + Math.abs(cell.c - hero.position.c);
      if (d > 0 && d <= range && !cell.unitId) set.add(`${cell.r},${cell.c}`);
    }
    return set;
  }
  async function fetchCellDetail(r, c) {
    try {
      const data = await api('/api/action', makeCommand('GET_CELL_DETAIL', { r, c }));
      ui.cellDetail = data.result || null;
      if (data.viewModel) ui.vm = data.viewModel;
      renderCellDetail();
      return ui.cellDetail;
    } catch (err) {
      ui.cellDetail = null;
      toast(err.message || String(err), true);
      return null;
    }
  }
  async function onCellClick(r, c) {
    ui.selectedCell = { r, c };
    const cell = cellAt(r, c);
    const unit = unitById(cell?.unitId);
    const isHeroUnit = unit?.side === 'hero';
    if (isHeroUnit) {
      ui.selectedUnitId = unit.id;
      ui.selectedSlotGlobal = null;
      ui.selectedSlot = null;
      ui.slotArmed = false;
      closeApModal();
      await runCommand('SELECT_UNIT', { unitId: unit.id });
      await fetchCellDetail(r, c);
      return;
    }
    const hero = selectedHero();
    await runCommand('SELECT_CELL', { r, c });
    await fetchCellDetail(r, c);
    if (ui.slotArmed) return;
    if (ui.vm?.phase === 'player_turn' && !hero && cell && !cell.unitId) {
      toast('先点棋盘上的英雄或左侧英雄卡，再点空格移动。');
      return;
    }
    if (ui.vm?.phase === 'player_turn' && hero && cell && !cell.unitId) {
      await runCommand('MOVE_HERO', { unitId: hero.id, to: { r, c } });
    }
  }

  function renderCellDetail() {
    const slotInfo = ui.slotArmed ? selectedSlotInfo() : null;
    if (slotInfo) {
      $('detail-summary').textContent = `${slotInfo.hero.name} · ${slotInfo.slot.label}`;
      $('cell-detail').className = 'detail-card selected-detail';
      $('cell-detail').innerHTML = renderSlotInfo(slotInfo);
      return;
    }
    const hero = selectedHero();
    const c = ui.selectedCell || ui.vm.selected?.cell;
    if (hero && (!c || unitById(cellAt(c.r, c.c)?.unitId)?.id === hero.id)) {
      $('detail-summary').textContent = hero.name;
      $('cell-detail').className = 'detail-card selected-detail';
      $('cell-detail').innerHTML = renderUnitDetail(hero);
      return;
    }
    if (!c) {
      $('detail-summary').textContent = '未选择';
      $('cell-detail').className = 'detail-card empty';
      $('cell-detail').innerHTML = '请选择宠物、行动块或棋盘格。';
      return;
    }
    $('detail-summary').textContent = `R${Number(c.r) + 1} C${Number(c.c) + 1}`;
    const detail = ui.cellDetail && Number(ui.cellDetail.r) === Number(c.r) && Number(ui.cellDetail.c) === Number(c.c) ? ui.cellDetail : null;
    const cell = cellAt(c.r, c.c);
    const unit = detail?.unit || unitById(cell?.unitId);
    const parts = [`<div class="detail-pos">第${Number(c.r) + 1}行第${Number(c.c) + 1}列</div>`];
    if (unit) {
      parts.push(`<div class="detail-unit"><span class="${clsForEl(unit.element)}">${esc(unitIcon(unit))}</span> <strong>${esc(unit.displayName || unit.name)}</strong><small>${esc(unit.role || unit.element || '')}</small></div>`);
      parts.push(`<div class="stat-row detail-stats">${statChips(unit)}</div>`);
      if (unit.shape) parts.push(`<div class="detail-plan">${esc(slotPlanText(unit))}</div>`);
      const mech = compactMechanics(unit.mechanicStatus || []);
      if (mech !== '机制 无') parts.push(`<div class="detail-plan">${esc(mech)}</div>`);
    } else {
      parts.push(`<div class="detail-unit dim">空格</div>`);
    }
    const elsObj = detail?.elements || cell?.elements || {};
    const elHTML = Object.entries(elsObj).filter(([, n]) => Number(n) > 0)
      .map(([el, n]) => `<span class="popup-el ${clsForEl(el)}">${EL_ICON[el] || el}${n}</span>`).join(' ');
    parts.push(`<div class="detail-els">${elHTML || '元素：<span class="dim">无</span>'}</div>`);
    const terrain = detail?.terrain || cell?.terrain;
    if (terrain?.modules?.length) parts.push(`<div class="detail-terrain">地形：${terrain.modules.join('、')}</div>`);
    const preview = detail?.preview || cell?.preview;
    const threat = detail?.threat || cell?.threat;
    if (preview) parts.push(`<div class="detail-extra">⚡ ${esc(preview.damage ?? preview.layers ?? '')}</div>`);
    if (threat) parts.push(`<div class="detail-extra threat">⚠ ${esc(threat.damage ?? threat.atk ?? '')}</div>`);
    $('cell-detail').className = 'detail-card'; $('cell-detail').innerHTML = parts.join('\n');
  }
  function renderActionPopover() {
    const panel = $('action-popover');
    const info = ui.slotArmed ? selectedSlotInfo() : null;
    if (!panel) return;
    if (!info) {
      panel.className = 'action-popover hidden';
      panel.setAttribute('aria-hidden', 'true');
      panel.innerHTML = '';
      return;
    }
    const s = info.slot;
    const h = info.hero;
    const locked = ui.vm.phase !== 'player_turn' || !s.canUse || ui.busy;
    const apKey = `${h.id}:${info.localIndex}`;
    const maxAp = Math.max(1, Number(h.availableAp ?? s.availableAp ?? h.ap ?? 1));
    const ap = Math.max(1, Math.min(maxAp, Number(ui.apBySlot[apKey] || 1)));
    ui.apBySlot[apKey] = ap;
    panel.className = 'action-popover';
    panel.setAttribute('aria-hidden', 'false');
    panel.innerHTML = `<div class="action-popover-title"><strong id="action-popover-title">${esc(slotShortName(s))}</strong><span>${esc(h.name)}</span></div>
      <div class="action-popover-meta">方向 ${esc(DIR[s.direction] || s.direction || '→')} · AP ${esc(ap)} / ${esc(maxAp)}</div>
      <div class="detail-ap-row" aria-label="AP 分配">
        ${Array.from({ length: maxAp }, (_, i) => i + 1).map(n => `<button class="ap-choice${n === ap ? ' sel' : ''}" data-ap-choice="${n}" type="button"${locked ? ' disabled' : ''}>${n}</button>`).join('')}
      </div>
      <div class="detail-actions" aria-label="行动块方向与释放">
        ${['left','up','right','down'].map(d => `<button class="as-dir-btn detail-dir" data-slot-dir="${info.globalIndex}" data-dir="${d}" type="button"${locked ? ' disabled' : ''}>${DIR[d]}</button>`).join('')}
        <button class="use-btn detail-use" data-use="${info.globalIndex}" type="button"${locked || s.used ? ' disabled' : ''}>释放</button>
      </div>
      <div class="action-popover-hint">${s.used ? '已释放' : locked ? '当前不可用' : '点棋盘选目标，或直接释放。'}</div>`;
    positionActionPopover(info.globalIndex);
  }
  function positionActionPopover(globalIndex) {
    const panel = $('action-popover');
    const left = document.querySelector('.left-panel');
    const btn = document.querySelector(`#slot-list [data-slot="${globalIndex}"]`);
    if (!panel || !left || !btn) return;
    const shell = $('game-shell');
    const scale = shell ? (shell.getBoundingClientRect().width / shell.offsetWidth || 1) : 1;
    const btnRect = btn.getBoundingClientRect();
    const leftRect = left.getBoundingClientRect();
    const top = (btnRect.top - leftRect.top) / scale;
    const maxTop = Math.max(8, left.offsetHeight - panel.offsetHeight - 8);
    panel.style.top = `${Math.max(8, Math.min(top, maxTop))}px`;
  }
  function renderUnitDetail(unit) {
    const elementLayers = Object.entries(unit.elements || unit.elementLayers || {})
      .filter(([, n]) => Number(n) > 0)
      .map(([el, n]) => `<span class="popup-el ${clsForEl(el)}">${esc(EL_ICON[el] || el)}${esc(n)}</span>`).join(' ');
    const slotList = (unit.slots || []).map((s, i) => `<span class="detail-slot-pill ${s.used ? 'used' : ''}">${esc(i + 1)}. ${esc(s.label || s.shapeName || '行动块')} · ${esc(s.element || '-')} ${esc(DIR[s.direction] || s.direction || '→')}</span>`).join('');
    const activeSlot = selectedSlotInfo();
    const facing = activeSlot?.hero?.id === unit.id ? activeSlot.slot.direction : (ui.vm?.selected?.direction || 'right');
    return [
      `<div class="detail-hero-head"><span class="detail-avatar ${clsForEl(unit.element)}">${esc(unitIcon(unit))}</span><div><strong>${esc(unit.displayName || unit.name)}</strong><small>${esc(unit.element || '-')} · ${esc(unit.quality || '普通')} · ${esc(unit.role || '-')}</small></div></div>`,
      renderStatGrid(heroBattleStats(unit)),
      `<div class="detail-skill-panel"><strong>技能 ${esc(skillName(unit))}</strong><span>${esc(skillDescription(unit))}</span></div>`,
      `<div class="detail-state-panel"><span><b>当前状态</b>${unit.alive === false ? '退场' : '正常'}</span><span><b>面向方向</b>${esc(DIR[facing] || facing || '→')}</span><span><b>行动形状</b>${esc(slotPlanText(unit))}</span></div>`,
      `<div class="detail-plan">${esc(compactMechanics(unit.mechanicStatus || []))}</div>`,
      elementLayers ? `<div class="detail-els">${elementLayers}</div>` : '<div class="detail-els">元素层：<span class="dim">无</span></div>',
      slotList ? `<div class="detail-slot-list">${slotList}</div>` : ''
    ].join('\n');
  }
  function renderSlotInfo(info) {
    const s = info.slot;
    const h = info.hero;
    return `<div class="detail-hero-head"><span class="detail-avatar ${clsForEl(h.element)}">${esc(unitIcon(h))}</span><div><strong>${esc(h.displayName || h.name)}</strong><small>${esc(h.element || '-')} · ${esc(h.quality || '普通')} · ${esc(h.role || '-')}</small></div></div>
      ${renderStatGrid(heroBattleStats(h))}
      <div class="detail-skill-panel"><strong>当前行动块：${esc(slotShortName(s))}</strong><span>${esc(skillDescription(h, s))}</span></div>
      <div class="detail-state-panel"><span><b>槽位</b>${esc(info.localIndex + 1)}/3</span><span><b>方向</b>${esc(DIR[s.direction] || s.direction || '→')}</span><span><b>状态</b>${s.used ? '已释放' : s.canUse === false ? '不可用' : '可用'}</span></div>`;
  }

  function renderActionBlockCard(info) {
    const s = info.slot;
    const h = info.hero;
    const selected = ui.selectedSlotGlobal === info.globalIndex;
    const locked = ui.vm.phase !== 'player_turn' || !s.canUse || ui.busy;
    return `<button class="action-block${selected ? ' sel' : ''}${s.used ? ' used' : ''}${locked ? ' locked' : ''}" data-slot="${info.globalIndex}" type="button"${ui.busy ? ' disabled' : ''} aria-label="${esc(`${h.name} ${slotShortName(s)} ${DIR[s.direction] || s.direction || '→'}`)}">
      <b class="${clsForEl(s.element)}">${esc(EL_ICON[s.element] || s.element || '·')}</b>
      <span><strong>${esc(slotShortName(s))}</strong><small>${esc(h.name)}</small></span>
      <i>${esc(DIR[s.direction] || s.direction || '→')}</i>
    </button>`;
  }
  function renderSlots() {
    const flat = slotsFlat();
    const selected = selectedSlotInfo();
    if ($('slot-summary')) $('slot-summary').textContent = selected ? `${selected.hero.name} · ${selected.slot.label}` : '未选择';
    if ($('action-block-count')) $('action-block-count').textContent = `${flat.length}/12`;
    if ($('slot-list')) $('slot-list').innerHTML = flat.map(renderActionBlockCard).join('') || '<div class="detail-card empty">暂无行动块。</div>';
  }
  async function selectSlot(globalIndex) {
    const info = slotsFlat()[globalIndex]; if (!info) return;
    document.body.dataset.lastSlotClick = String(globalIndex);
    ui.selectedUnitId = info.hero.id; ui.selectedSlotGlobal = globalIndex; ui.selectedSlot = info.localIndex; ui.slotArmed = true;
    renderCache.invalidate('heroes');
    renderCache.invalidate('slots');
    renderCache.invalidate('cellDetail');
    renderHeroes();
    renderSlots();
    renderCellDetail();
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
    await runCommand('USE_SLOT', { unitId: info.hero.id, slotId: info.localIndex, cell: ui.selectedCell || ui.vm.selected?.cell || null, ap: ui.apBySlot[`${info.hero.id}:${info.localIndex}`] || 1 });
  }

  function openApModal(info) {
    if (!info || !$('ap-modal')) return;
    const key = `${info.hero.id}:${info.localIndex}`;
    const max = Math.max(1, Number(info.hero.availableAp ?? info.slot.availableAp ?? info.hero.ap ?? 1));
    const current = Math.max(1, Math.min(max, Number(ui.apBySlot[key] || 1)));
    ui.apBySlot[key] = current;
    $('ap-modal').classList.remove('hidden');
    $('ap-modal').setAttribute('aria-hidden', 'false');
    $('ap-modal').innerHTML = `<h3>AP 分配</h3><div>${esc(info.hero.name)} · ${esc(info.slot.label)}</div><div>剩余 AP：${max}，本次使用：<strong>${current}</strong></div><div class="ap-buttons">${Array.from({ length: max }, (_, i) => i + 1).map(n => `<button data-ap-choice="${n}" class="${n === current ? 'sel' : ''}" type="button">${n}</button>`).join('')}<button data-ap-close="1" type="button">关闭</button></div>`;
  }
  function closeApModal() { if ($('ap-modal')) { $('ap-modal').classList.add('hidden'); $('ap-modal').setAttribute('aria-hidden', 'true'); } }
  function chooseAp(n) {
    const info = selectedSlotInfo();
    if (!info) return;
    const key = `${info.hero.id}:${info.localIndex}`;
    ui.apBySlot[key] = Math.max(1, Number(n || 1));
    renderCache.invalidate('cellDetail');
    renderCellDetail();
    renderActionPopover();
    renderOperationRail();
  }

  function renderControls() {
    const phase = ui.vm.phase;
    $('etb').textContent = phase === 'init' ? '开始战斗' : '结束回合';
    $('etb').disabled = !(phase === 'init' || phase === 'player_turn') || ui.busy;
    $('monster-btn').disabled = !(phase === 'monster_turn' || phase === 'round_end') || ui.busy;
    const fullDayDisabled = ui.busy || ui.manualAutoLock || !['init','battle_end','day_end'].includes(phase);
    $('full-day-btn').disabled = fullDayDisabled;
    $('full-day-btn').title = ui.manualAutoLock ? '已手动移动或施放，本场完整自动流程已锁定。' : '';
    if ($('all-out-btn')) {
      const hasUsableSlot = slotsFlat().some(x => !x.slot.used && x.slot.canUse !== false);
      $('all-out-btn').disabled = ui.busy || phase !== 'player_turn' || !hasUsableSlot;
      $('all-out-btn').title = phase === 'player_turn' ? '按左侧行动块顺序释放，不移动、不重新摆位。' : '进入玩家回合后可用。';
    }
    $('shop-btn').disabled = ui.busy || phase !== 'battle_end';
    $('day7-btn').disabled = ui.busy;
    $('new-game-btn').disabled = ui.busy;
    $('roll-shop-btn').disabled = phase !== 'shop' || ui.busy;
    $('exit-shop-btn').disabled = phase !== 'shop' || ui.busy;
    $('reward-btn').disabled = !(phase === 'battle_end' || isNext('REWARD_OPTIONS')) || ui.busy;
    $('operation-hint').textContent = hintText();
  }
  function renderOperationRail() {
    const rail = $('operation-rail');
    if (!rail || !ui.vm) return;
    const hero = selectedHero();
    const slot = ui.slotArmed ? selectedSlotInfo() : null;
    const mode = operationMode(hero, slot);
    const actionText = slot ? `${slotShortName(slot.slot)} ${DIR[slot.slot.direction] || slot.slot.direction || '→'}` : '未选行动块';
    rail.innerHTML = [
      opChip('模式', mode.label, mode.cls),
      opChip('英雄', hero ? `${hero.name} · AP${hero.availableAp ?? hero.ap ?? 0}` : '未选英雄', hero ? 'ready' : 'idle'),
      opChip('行动', actionText, slot ? 'armed' : 'idle')
    ].join('');
  }
  function operationMode(hero, slot) {
    const phase = ui.vm?.phase;
    if (phase === 'init') return { label: '准备', cls: 'idle' };
    if (phase === 'player_turn' && slot) return { label: '瞄准', cls: 'armed' };
    if (phase === 'player_turn' && hero) return { label: '移动', cls: 'ready' };
    if (phase === 'player_turn') return { label: '选英雄', cls: 'idle' };
    if (phase === 'monster_turn' || phase === 'round_end') return { label: '观察', cls: 'target' };
    return { label: phaseText(phase), cls: 'idle' };
  }
  function opChip(label, value, cls = 'idle') {
    return `<span class="op-chip ${cls}"><span>${esc(label)}</span><strong>${esc(value)}</strong></span>`;
  }
  function hintText() {
    const phase = ui.vm.phase;
    if (phase === 'init') return '点击“开始战斗”，进入玩家回合。';
    if (phase === 'player_turn' && ui.slotArmed) return '瞄准中：点棋盘只选择目标格；点我方英雄可退出瞄准并回到移动。';
    if (phase === 'player_turn') {
      const hero = selectedHero();
      if (hero) return `${hero.name} 已选中：点空格移动；点敌人或Boss查看详情；点行动槽进入瞄准。`;
      return '点棋盘上的我方英雄或左侧英雄卡选中，再点空格移动。';
    }
    if (phase === 'monster_turn' || phase === 'round_end') return '点击“怪物行动”继续推进。';
    if (phase === 'battle_end') return '战斗结束，可以生成奖励或进入商店。';
    if (phase === 'shop') return '购买、冻结、刷新商品，然后离开商店。';
    return '可使用右侧按钮继续流程。';
  }
  async function runAllOut() {
    if (ui.vm?.phase !== 'player_turn') {
      toast('我方全部出击只能在玩家回合使用。', true);
      return;
    }
    const order = slotsFlat()
      .filter(x => !x.slot.used && x.slot.canUse !== false)
      .map(x => ({ unitId: x.hero.id, slotId: x.localIndex }));
    if (!order.length) {
      toast('没有可释放的行动块。', true);
      return;
    }
    for (const item of order) {
      if (ui.vm?.phase !== 'player_turn') break;
      const info = slotsFlat().find(x => x.hero.id === item.unitId && x.localIndex === item.slotId);
      if (!info || info.slot.used || info.slot.canUse === false) continue;
      ui.selectedUnitId = info.hero.id;
      ui.selectedSlotGlobal = info.globalIndex;
      ui.selectedSlot = info.localIndex;
      ui.slotArmed = true;
      await runCommand('SELECT_SLOT', { slotId: info.localIndex, unitId: info.hero.id }, { autoFlow: true, suppressToast: true });
      await runCommand('USE_SLOT', {
        unitId: info.hero.id,
        slotId: info.localIndex,
        cell: null,
        ap: ui.apBySlot[`${info.hero.id}:${info.localIndex}`] || 1
      }, { autoFlow: true, suppressToast: true });
    }
    ui.slotArmed = false;
    renderCache.invalidate();
    render();
    toast(`我方全部出击：尝试释放 ${order.length} 个行动块。`);
  }

  function renderRewards() {
    const rewards = ui.vm.rewards || [];
    $('reward-list').innerHTML = rewards.map((r, i) => `<button class="reward-card" data-reward-index="${i}" type="button"${ui.busy ? ' disabled' : ''}>
      <strong>${esc(r.name || r.petName || r.relicName || r.type || `奖励${i + 1}`)}</strong><span>选择</span>
    </button>`).join('');
  }
  function renderShop() {
    const offers = ui.vm.shop?.offers || [];
    const events = ui.vm.shop?.events || [];
    const eventHtml = events.length ? `<div class="shop-event-list">${events.map(e => `<div class="shop-event-card"><div><strong>${esc(e.name)}</strong><span>${esc(e.optionText || '')} · ${esc(e.costText || '无成本')} → ${esc(e.gainText || '')}</span></div><button class="mini-btn" data-shop-event="${esc(e.id)}" type="button"${ui.busy || ui.vm.phase !== 'shop' ? ' disabled' : ''}>触发</button></div>`).join('')}</div>` : '';
    const offerHtml = offers.map(o => `<div class="offer-card${o.frozen ? ' frozen' : ''}">
      <div class="offer-main"><strong>${esc(o.name)}</strong><span class="${clsForEl(o.element)}">${esc(o.element || '-')} · ${esc(o.role || '-')} · ${esc(o.price)}金${o.frozen ? ' · 已冻结' : ''}</span></div>
      <div class="offer-actions"><button class="mini-btn buy" data-buy-offer="${esc(o.offerId)}" type="button"${ui.busy || ui.vm.phase !== 'shop' || Number(o.price) > Number(ui.vm.gold || 0) ? ' disabled' : ''}>购买</button><button class="mini-btn freeze" data-freeze-offer="${esc(o.offerId)}" data-frozen="${o.frozen ? '1' : '0'}" type="button"${ui.busy || ui.vm.phase !== 'shop' ? ' disabled' : ''}>${o.frozen ? '解冻' : '冻结'}</button></div>
    </div>`).join('');
    $('shop-list').innerHTML = eventHtml + offerHtml;
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
      requestAnimationFrame(() => autoScrollLog());
      return;
    }
    if (ui.activeLogTab === 'replay') {
      await renderReplay();
      return;
    }
    if (ui.activeLogTab === 'debug') {
      $('log').textContent = JSON.stringify({ selected: vm.selected, playerViewState: vm.playerViewState, nextActions: vm.nextActions, meta: vm.meta, stateHash: vm.stateHash }, null, 2);
      requestAnimationFrame(() => autoScrollLog());
      return;
    }
    const events = vm.events || [];
    $('log').textContent = events.slice(-22).map(e => `${String(e.step || '').padStart(3, '0')} [${e.type}] ${e.text || ''}`).join('\n') || '暂无事件。';
    requestAnimationFrame(() => autoScrollLog());
  }
  function autoScrollLog() {
    const log = $('log');
    if (!log) return;
    log.scrollTop = log.scrollHeight;
    const replayEvents = $('brp-events');
    if (replayEvents) replayEvents.scrollTop = replayEvents.scrollHeight;
  }

  async function loadReplayEvents() {
    const data = await api('/api/action', makeCommand('EXPORT_BATTLE_TRACE'));
    ui.replay.events = data.result?.events || data.events || [];
    ui.replay.step = Math.min(ui.replay.step || 0, ui.replay.events.length);
    return ui.replay.events;
  }
  async function renderReplay() {
    if (!ui.replay.events.length) await loadReplayEvents();
    const events = ui.replay.events || [];
    const step = Math.min(ui.replay.step || 0, events.length);
    $('log').innerHTML = `<div class="replay-panel">
      <div class="replay-toolbar"><span class="replay-counter" id="brp-count">步骤 ${step}/${events.length}</span><button data-replay-refresh="1" type="button">刷新事件</button><button data-replay-prev="1" type="button">上一步</button><button data-replay-next="1" type="button">下一步</button><button data-replay-copy="1" type="button">复制JSON</button><button data-replay-play="1" type="button">回放输入</button></div>
      <div id="brp-events" class="replay-events">${events.map((e, i) => `<div class="replay-event${i + 1 === step ? ' active' : ''}">${String(i + 1).padStart(3, '0')} [${esc(e.type)}] ${esc(e.text || '')}</div>`).join('') || '暂无事件。'}</div>
      <textarea id="replay-json" class="replay-json">${esc(JSON.stringify(events, null, 2))}</textarea>
      <div id="brp-text">${events[step - 1] ? esc(events[step - 1].text || events[step - 1].type) : '选择步骤查看事件文本。'}</div>
    </div>`;
    requestAnimationFrame(() => autoScrollLog());
  }
  async function copyReplayJson() {
    const text = $('replay-json')?.value || JSON.stringify(ui.replay.events || [], null, 2);
    try { await navigator.clipboard.writeText(text); toast('已复制回放 JSON。'); }
    catch { const ta = $('replay-json'); if (ta) { ta.focus(); ta.select(); document.execCommand('copy'); toast('已复制回放 JSON。'); } }
  }
  async function replayFromInput() {
    try {
      const events = JSON.parse($('replay-json')?.value || '[]');
      const data = await api('/api/action', makeCommand('REPLAY_BATTLE_TRACE', { events }));
      ui.replay.events = data.result?.events || events;
      ui.replay.step = 0;
      await renderReplay();
      toast(`回放载入 ${ui.replay.events.length} 步。`);
    } catch (err) { toast(`回放 JSON 无效：${err.message || err}`, true); }
  }

  function updateDebugPanel() {
    const el = document.getElementById('ysbzs-debug');
    if (!el || !ui.vm) return;
    const pre = el.querySelector('pre');
    if (pre) pre.textContent = JSON.stringify({
      phase: ui.vm.phase,
      selected: ui.vm.selected,
      heroCount: ui.vm.heroes?.length || 0,
      gold: ui.vm.gold,
      stateVersion: ui.vm.stateVersion,
      stateHash: ui.vm.stateHash,
      recentEvents: (ui.vm.events || []).slice(-5)
    }, null, 2);
  }
  function toggleDebugPanel() {
    const existing = document.getElementById('ysbzs-debug');
    if (existing) { existing.remove(); return; }
    const panel = document.createElement('div');
    panel.id = 'ysbzs-debug';
    panel.className = 'ysbzs-debug';
    panel.innerHTML = '<div class="ysbzs-debug-head">🐛 调试面板 <button type="button" data-debug-close="1">✕</button></div><pre></pre>';
    document.body.appendChild(panel);
    makeDraggable(panel, panel.querySelector('.ysbzs-debug-head'));
    updateDebugPanel();
  }
  function makeDraggable(panel, handle) {
    if (!panel || !handle) return;
    let drag = null;
    handle.addEventListener('mousedown', ev => {
      drag = { x: ev.clientX, y: ev.clientY, left: panel.offsetLeft, top: panel.offsetTop };
      ev.preventDefault();
    });
    window.addEventListener('mousemove', ev => {
      if (!drag) return;
      panel.style.left = `${drag.left + ev.clientX - drag.x}px`;
      panel.style.top = `${drag.top + ev.clientY - drag.y}px`;
      panel.style.right = 'auto';
      panel.style.bottom = 'auto';
    });
    window.addEventListener('mouseup', () => { drag = null; });
  }
  function updateFullscreenButton() {
    const btn = $('fullscreen-btn');
    if (!btn) return;
    const supported = !!document.documentElement.requestFullscreen && !!document.exitFullscreen;
    const active = !!document.fullscreenElement;
    btn.disabled = !supported;
    btn.textContent = active ? '退出' : '全屏';
    btn.setAttribute('aria-pressed', active ? 'true' : 'false');
    btn.title = supported ? (active ? '退出全屏' : '全屏显示游戏') : '当前浏览器不支持全屏';
  }
  async function toggleFullscreen() {
    if (!document.documentElement.requestFullscreen || !document.exitFullscreen) {
      toast('当前浏览器不支持全屏。', true);
      updateFullscreenButton();
      return;
    }
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await document.documentElement.requestFullscreen();
      updateFullscreenButton();
      scaleApp();
    } catch (err) {
      toast(`全屏切换失败：${err.message || err}`, true);
      updateFullscreenButton();
    }
  }

  function bind() {
    $('fullscreen-btn')?.addEventListener('click', () => toggleFullscreen());
    $('new-game-btn').addEventListener('click', () => runCommand('NEW_GAME', { day: 1, period: '上午', gold: 8 }));
    $('day7-btn').addEventListener('click', () => runCommand('SETUP_DAY7_FIRE_TRIAL'));
    $('save-game-btn')?.addEventListener('click', () => saveGame());
    $('load-game-btn')?.addEventListener('click', () => loadGameFromStorage());
    $('etb').addEventListener('click', () => runCommand(ui.vm?.phase === 'init' ? 'START_BATTLE' : 'END_PLAYER_TURN'));
    $('monster-btn').addEventListener('click', () => runCommand(ui.vm?.phase === 'round_end' ? 'START_NEXT_ROUND' : 'RUN_MONSTER_TURN'));
    $('full-day-btn').addEventListener('click', () => {
      if (ui.manualAutoLock) { toast('已手动操作，本场完整自动流程已锁定。', true); return; }
      runCommand('RUN_FULL_DAY', {}, { autoFlow: true });
    });
    $('all-out-btn')?.addEventListener('click', () => runAllOut());
    $('prep-open-btn')?.addEventListener('click', () => { ui.prepOpen = true; renderPrepOverlay(); });
    $('prep-close-btn')?.addEventListener('click', () => { ui.prepOpen = false; renderPrepOverlay(); });
    $('prep-ready-btn')?.addEventListener('click', () => runCommand('START_BATTLE'));
    $('prep-filter')?.addEventListener('input', ev => {
      ui.prepFilter = ev.target.value || '';
      renderCache.invalidate('roster');
      renderRoster();
      renderPrepOverlay();
    });
    $('reward-btn').addEventListener('click', () => runCommand('REWARD_OPTIONS', { poolId: 'reward_pT1', count: 3 }));
    $('shop-btn').addEventListener('click', () => runCommand('ENTER_SHOP', { poolId: 'night_base', slots: 6 }));
    $('roll-shop-btn').addEventListener('click', () => runCommand('ROLL_SHOP', { slots: 6 }));
    $('exit-shop-btn').addEventListener('click', () => runCommand('EXIT_SHOP'));
    $('hero-list').addEventListener('click', ev => {
      const slot = ev.target.closest('[data-slot]');
      if (slot) { selectSlot(Number(slot.dataset.slot)); return; }
      const btn = ev.target.closest('[data-hero-id]');
      if (btn) selectHero(btn.dataset.heroId);
    });
    $('prep-overlay')?.addEventListener('click', ev => {
      const toggle = ev.target.closest('[data-prep-toggle]');
      if (toggle) { runCommand('TOGGLE_UNIT_ACTIVE', { instanceId: toggle.dataset.prepToggle }); return; }
    });
    $('prep-overlay')?.addEventListener('dragstart', ev => {
      const card = ev.target.closest('[data-prep-roster-id]');
      if (!card) return;
      ui.draggedRosterId = card.dataset.prepRosterId;
      ev.dataTransfer?.setData('text/plain', ui.draggedRosterId);
      ev.dataTransfer?.setData('application/x-ysbzs-roster', ui.draggedRosterId);
      card.classList.add('dragging');
    });
    $('prep-overlay')?.addEventListener('dragend', ev => {
      ev.target.closest('[data-prep-roster-id]')?.classList.remove('dragging');
      qsa('[data-prep-drop-zone]').forEach(x => x.classList.remove('drop-hover'));
      ui.draggedRosterId = null;
    });
    $('prep-overlay')?.addEventListener('dragover', ev => {
      const zone = ev.target.closest('[data-prep-drop-zone]');
      if (!zone) return;
      ev.preventDefault();
      zone.classList.add('drop-hover');
    });
    $('prep-overlay')?.addEventListener('dragleave', ev => {
      const zone = ev.target.closest('[data-prep-drop-zone]');
      if (zone && !zone.contains(ev.relatedTarget)) zone.classList.remove('drop-hover');
    });
    $('prep-overlay')?.addEventListener('drop', ev => {
      const zone = ev.target.closest('[data-prep-drop-zone]');
      if (!zone) return;
      ev.preventDefault();
      zone.classList.remove('drop-hover');
      const id = ev.dataTransfer?.getData('application/x-ysbzs-roster') || ev.dataTransfer?.getData('text/plain') || ui.draggedRosterId;
      dropPrepRoster(id, zone.dataset.prepDropZone);
    });
    $('board').addEventListener('click', ev => {
      const btn = ev.target.closest('[data-r][data-c]');
      if (btn) onCellClick(Number(btn.dataset.r), Number(btn.dataset.c));
    });
    $('slot-list').addEventListener('click', ev => {
      const dirBtn = ev.target.closest('[data-slot-dir]');
      if (dirBtn) { setSlotDir(Number(dirBtn.dataset.slotDir), dirBtn.dataset.dir); return; }
      const useBtn = ev.target.closest('[data-use]');
      if (useBtn) { useSlot(Number(useBtn.dataset.use)); return; }
      const slot = ev.target.closest('[data-slot]');
      if (slot) selectSlot(Number(slot.dataset.slot));
    });
    $('cell-detail').addEventListener('click', ev => {
      const apChoice = ev.target.closest('[data-ap-choice]');
      if (apChoice) { chooseAp(apChoice.dataset.apChoice); return; }
      const dirBtn = ev.target.closest('[data-slot-dir]');
      if (dirBtn) { setSlotDir(Number(dirBtn.dataset.slotDir), dirBtn.dataset.dir); return; }
      const useBtn = ev.target.closest('[data-use]');
      if (useBtn) useSlot(Number(useBtn.dataset.use));
    });
    $('action-popover')?.addEventListener('click', ev => {
      const apChoice = ev.target.closest('[data-ap-choice]');
      if (apChoice) { chooseAp(apChoice.dataset.apChoice); return; }
      const dirBtn = ev.target.closest('[data-slot-dir]');
      if (dirBtn) { setSlotDir(Number(dirBtn.dataset.slotDir), dirBtn.dataset.dir); return; }
      const useBtn = ev.target.closest('[data-use]');
      if (useBtn) useSlot(Number(useBtn.dataset.use));
    });
    $('reward-list').addEventListener('click', ev => {
      const btn = ev.target.closest('[data-reward-index]');
      if (btn) runCommand('PICK_REWARD', { index: Number(btn.dataset.rewardIndex) });
    });
    $('shop-list').addEventListener('click', ev => {
      const shopEvent = ev.target.closest('[data-shop-event]');
      if (shopEvent) { runCommand('APPLY_SHOP_EVENT', { eventId: shopEvent.dataset.shopEvent }); return; }
      const buy = ev.target.closest('[data-buy-offer]');
      if (buy) { runCommand('BUY_OFFER', { offerId: buy.dataset.buyOffer }); return; }
      const freeze = ev.target.closest('[data-freeze-offer]');
      if (freeze) runCommand(freeze.dataset.frozen === '1' ? 'UNFREEZE_OFFER' : 'FREEZE_OFFER', { offerId: freeze.dataset.freezeOffer });
    });
    $('log').addEventListener('click', ev => {
      if (ev.target.closest('[data-replay-refresh]')) { ui.replay.events = []; renderReplay(); return; }
      if (ev.target.closest('[data-replay-prev]')) { ui.replay.step = Math.max(0, (ui.replay.step || 0) - 1); renderReplay(); return; }
      if (ev.target.closest('[data-replay-next]')) { ui.replay.step = Math.min((ui.replay.events || []).length, (ui.replay.step || 0) + 1); renderReplay(); return; }
      if (ev.target.closest('[data-replay-copy]')) { copyReplayJson(); return; }
      if (ev.target.closest('[data-replay-play]')) { replayFromInput(); }
    });
    qsa('.log-tab').forEach(btn => btn.addEventListener('click', () => { qsa('.log-tab').forEach(x => x.classList.remove('active')); btn.classList.add('active'); ui.activeLogTab = btn.dataset.logTab; renderLog(); }));
    $('ap-modal').addEventListener('click', ev => {
      const choice = ev.target.closest('[data-ap-choice]');
      if (choice) { chooseAp(choice.dataset.apChoice); return; }
      if (ev.target.closest('[data-ap-close]')) closeApModal();
    });
    document.addEventListener('keydown', ev => {
      if (ev.ctrlKey && ev.key === '`') { toggleDebugPanel(); ev.preventDefault(); }
    });
    document.addEventListener('click', ev => {
      if (ev.target.closest('[data-debug-close]')) document.getElementById('ysbzs-debug')?.remove();
    });
    document.addEventListener('fullscreenchange', () => { updateFullscreenButton(); scaleApp(); });
    window.addEventListener('resize', scaleApp);
    updateFullscreenButton();
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
