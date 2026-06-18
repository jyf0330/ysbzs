import * as AppConstants from './constants.js';
import * as Dom from './dom.js';
import { ui as sharedUi } from './state.js';
import * as ApiModule from './api.js';
import { createRenderCache } from './render-cache.js';
import { createGameRuntime } from './runtime-client.js';

  'use strict';

  const $ = (id) => document.getElementById(id);
  const qsa = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const DIR = { up: '↑', down: '↓', left: '←', right: '→' };
  const EL_CLASS = { '火': 'el-fire', '水': 'el-water', '风': 'el-wind', '土': 'el-earth' };
  const EL_ICON = { '火': '火', '水': '水', '风': '风', '土': '土' };
  const PHASE_TEXT = {
    init: '准备', player_turn: '玩家回合', monster_turn: '敌方宠物行动', round_end: '回合结算',
    battle_end: '战斗结束', shop: '商店', day_end: '当天结束', loading: '加载中',
    node_choice: '节点选择', node_resolved: '节点结算', battle_choice: '遭遇选择', reward: '奖励'
  };
  const MANUAL_LOCK_TYPES = new Set(['MOVE_HERO', 'USE_SLOT', 'AUTO_POSITION_HEROES']);

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
  const runtime = createGameRuntime({ playerId: () => ui.playerId });

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
  function nextAction(type) { return (ui.vm?.nextActions || []).find(a => a.type === type) || null; }
  function selectedHero() { return unitById(ui.selectedUnitId || ui.vm?.selected?.unitId) || null; }
  function teamRiskForUnit(unit) {
    if (!unit?.id) return null;
    const risks = ui.vm?.teamRiskGrid || ui.vm?.board?.teamRiskGrid || [];
    const direct = risks.find(risk => risk.unitId === unit.id);
    if (direct) return direct;
    return unit.position ? cellAt(unit.position.r, unit.position.c)?.teamRisk || null : null;
  }
  function primaryTeamRisk() {
    const risks = (ui.vm?.teamRiskGrid || ui.vm?.board?.teamRiskGrid || []).filter(risk => Number(risk.damage || 0) > 0);
    return risks.sort((a, b) => Number(!!b.lethal) - Number(!!a.lethal) || Number(b.damage || 0) - Number(a.damage || 0))[0] || null;
  }
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
  function clearSelectedActionTarget() {
    ui.selectedCell = null;
    ui.cellDetail = null;
  }
	  function unitPositionLocked(unit = {}) {
	    if (!unit) return false;
	    return !!unit.hasAttacked || (unit.slots || []).some(slot => slot && slot.used);
	  }
  function hasAutoPositionCandidates() {
    if (ui.vm?.phase !== 'player_turn') return false;
    const moved = new Set(ui.vm.teamPlacementPreview?.movedUnitIds || []);
    return (ui.vm.heroes || []).some(hero => {
      if (!hero?.position || moved.has(hero.id) || unitPositionLocked(hero)) return false;
      return (hero.slots || []).some(slot => !slot.used && slot.canUse !== false);
    });
  }

  async function api(path, body) {
    return runtime.request(path, body);
  }
  async function loadView() {
    const data = await runtime.view();
    ui.vm = data.viewModel;
    normalizeSelection();
    render();
  }
  async function report(mode = 'player') {
    const data = await runtime.report(mode);
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
      const data = await runtime.action(makeCommand(type, payload));
      ui.vm = data.viewModel || ui.vm;
      if (type === 'START_BATTLE') ui.prepOpen = false;
      if (!options.suppressToast && data.events && data.events.length) toast(data.events[data.events.length - 1].text || data.events[data.events.length - 1].type);
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
      const data = await runtime.save();
      localStorage.setItem('ysbzs.save.slot1', JSON.stringify(data.save));
      toast(`已保存：v${data.save?.state?.stateVersion ?? ui.vm?.stateVersion ?? 0}`);
      return data.save;
    } catch (err) { toast(err.message || String(err), true); }
  }
  async function loadGameFromStorage() {
    try {
      const raw = localStorage.getItem('ysbzs.save.slot1');
      if (!raw) { toast('没有找到本地存档。', true); return null; }
      const data = await runtime.load(JSON.parse(raw));
      ui.vm = data.viewModel || ui.vm;
      normalizeSelection();
      render();
      toast(`已读取：v${ui.vm?.stateVersion ?? 0}`);
      return data;
    } catch (err) { toast(err.message || String(err), true); }
  }
  function setBusy(busy) { qsa('button').forEach(btn => btn.disabled = !!busy && !btn.classList.contains('log-tab')); }
  function toast() {
    return;
  }
  function normalizeSelection() {
    const vm = ui.vm;
    if (!vm) return;
    if (!ui.selectedUnitId || !unitById(ui.selectedUnitId)) ui.selectedUnitId = vm.selected?.unitId || null;
    if (vm.selected?.cell && !ui.selectedCell) ui.selectedCell = vm.selected.cell;
    const info = selectedSlotInfo();
    if (info) { ui.selectedSlotGlobal = info.globalIndex; ui.selectedSlot = info.localIndex; }
    window.__YSBZS__ = { lastViewModel: vm, runCommand, loadView, makeCommand, saveGame, loadGameFromStorage, isBusy: () => ui.busy };
  }

  function routeProgressText(vm) {
    const route = vm.dayRoute || {};
    if (route.terminal) return `终局 ${route.terminal.status || ''}`.trim();
    if (vm.phase === 'player_turn' || vm.phase === 'monster_turn' || vm.phase === 'round_end' || vm.phase === 'battle_end') return `战斗 ${vm.round || 0}/${vm.maxRounds || '-'}`;
    if (route.currentEncounter) return route.currentEncounter.phaseLabel || route.currentEncounter.name || '遭遇';
    if ((route.battleOptions || []).length) return `遭遇 ${route.battleIndex || 0} · ${route.battleOptions.length}选1`;
    if ((route.options || []).length) return `节点 ${route.nodeIndex || 0} · ${route.options.length}选1`;
    if ((route.pendingRewards || []).length) return `奖励 ${route.pendingRewards.length}`;
    if (vm.shop?.activeStall) return vm.shop.activeStall.name || '摊位';
    return `节点 ${route.nodeIndex || 0}`;
  }
  function nextStepText(vm) {
    const route = vm.dayRoute || {};
    if (route.terminal) return vm.terminalSummary?.nextStepText || '查看终局报告';
    if ((route.options || []).length) return '选择节点';
    if ((route.battleOptions || []).length) return '选择遭遇';
    if ((vm.rewards || []).length || (route.pendingRewards || []).length) return '选择奖励';
    if (vm.phase === 'shop') return (vm.shop?.offers || []).length ? '购买/离店' : '离开商店';
    if (vm.phase === 'player_turn') return ui.slotArmed ? '瞄准施放' : '移动/行动';
    if (vm.phase === 'monster_turn' || vm.phase === 'round_end') return enemyFlowButtonText(vm.phase);
    const first = (vm.nextActions || []).find(a => a && a.label);
    return first ? first.label : phaseText(vm.phase);
  }
  function playerTurnButtonText(phase) {
    return phase === 'init' ? '开始战斗' : '结算并执行敌方宠物行动';
  }
  function enemyFlowButtonText(phase) {
    return phase === 'round_end' ? '进入下一回合（Boss召唤）' : '执行敌方宠物行动';
  }
  function buildCoreStatusText(vm) {
    const primary = vm.buildCore?.primaryTags || [];
    if (primary.length) return primary.slice(0, 3).map(x => x.label).join(' / ');
    return vm.buildCore?.summaryText || '尚未形成';
  }
  function renderStaticStatus(vm) {
    document.body.dataset.phase = vm.phase || 'init';
    $('game-shell').dataset.phase = vm.phase || 'init';
    $('phase-label').textContent = phaseText(vm.phase);
    $('day-label').textContent = `第${vm.day || 1}天 ${vm.period || ''}`.trim();
    $('route-progress-label').textContent = routeProgressText(vm);
    $('gold-label').textContent = vm.gold ?? 0;
    $('build-core-label').textContent = buildCoreStatusText(vm);
    $('build-core-label').title = vm.buildCore?.summaryText || '';
    $('next-step-label').textContent = nextStepText(vm);
    $('next-step-label').title = nextStepText(vm);
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
      moveRiskGrid: vm.moveRiskGrid,
      teamRiskGrid: vm.teamRiskGrid,
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
          board: vm.board,
          teamRiskGrid: vm.teamRiskGrid
        })) renderCellDetail();
    if (renderCache.shouldRender('slots', { heroes: vm.heroes, phase: vm.phase, selectedSlotGlobal: ui.selectedSlotGlobal, selectedSlot: ui.selectedSlot, slotArmed: ui.slotArmed, busy: ui.busy, apBySlot: ui.apBySlot })) renderSlots();
    renderActionPopover();
    renderControls();
    renderPrepOverlay();
    renderOperationRail();
    if (renderCache.shouldRender('rewards', { rewards: vm.rewards, dayRoute: vm.dayRoute, nextActions: vm.nextActions, busy: ui.busy })) renderRewards();
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
	    const threatMap = new Map((ui.vm.threatGrid || []).map(x => [`${x.r},${x.c}`, x]));
    const renderCells = board.cells;
    const unitForBoard = id => unitById(id);
    const previewSource = ui.vm.previewGrid || [];
    const teamRiskMap = new Map((ui.vm.teamRiskGrid || ui.vm.board?.teamRiskGrid || []).map(x => [`${x.r},${x.c}`, x]));
    const activePreviewUnitId = ui.vm.teamPlacementPreview?.activeUnitId || previewSource[0]?.actorId || null;
    const previewKeys = new Set(previewSource.map(x => `${x.r},${x.c}`));
    const previewMap = new Map(previewSource.map(x => [`${x.r},${x.c}`, x]));
    const previewGroups = new Map();
    for (const p of previewSource) {
      const pkey = `${p.r},${p.c}`;
      if (!previewGroups.has(pkey)) previewGroups.set(pkey, []);
      previewGroups.get(pkey).push(p);
    }
	    const actorPreviewMap = new Map();
	    for (const p of previewSource) if (!actorPreviewMap.has(p.actorId)) actorPreviewMap.set(p.actorId, p);

	    $('board').innerHTML = renderCells.map(cell => {
	      const key = `${cell.r},${cell.c}`;
      const teamRisk = (cell.teamRisk || teamRiskMap.get(key)) || null;
      const t = threatMap.get(key);
	      const unit = unitForBoard(cell.unitId);
      const hasIncomingHit = !!(unit && teamRisk?.damage > 0);
	      const previews = previewGroups.get(key) || (Array.isArray(cell.previews) ? cell.previews : (cell.preview ? [cell.preview] : []));
	      const currentPreviews = previews.filter(p => p.isActiveActor);
	      const hasCurrentPreview = currentPreviews.length > 0;
	      const hasEnemyHit = previews.some(p => p.hitEnemy);
	      const arrow = unit ? actorPreviewMap.get(unit.id) : null;
	      const classes = ['cell'];
	      if (selected && selected.r === cell.r && selected.c === cell.c) classes.push('selected');
	      if (moveTargets.has(key)) classes.push('move-target');
	      if (previewKeys.has(key)) classes.push('preview-hit');
	      if (hasCurrentPreview) classes.push('preview-current');
	      if (previews.length && !hasCurrentPreview) classes.push('preview-past');
	      if (hasEnemyHit) classes.push('enemy-hit');
	      if (t?.finalMove) classes.push('enemy-final-cell');
      if (hasIncomingHit) classes.push('team-risk');
	      if (cell.unitId && cell.unitId !== selectedH?.id) classes.push('blocked');
	      if (unit?.side === 'hero' || unit?.side === 'hero_leader') classes.push('hero-cell');
	      if (unit && unit.id === ui.selectedUnitId) classes.push('selected-unit');
	      if (unit && unit.id === activePreviewUnitId) classes.push('current-preview-unit');
	      const elements = Object.entries(cell.elements || {}).filter(([, n]) => Number(n) > 0)
	        .map(([el, n]) => `<span class="element-badge ${clsForEl(el)}">${esc(el)}${esc(n)}</span>`).join('');
	      const aria = unit ? `R${cell.r + 1}C${cell.c + 1} ${unit.displayName || boardUnitName(unit)} 生命 ${unit.hp}/${unit.maxHp} 攻击 ${unit.atk ?? 0}` : `R${cell.r + 1}C${cell.c + 1}`;
	      return `<button class="${classes.join(' ')}" data-r="${cell.r}" data-c="${cell.c}" type="button" aria-label="${esc(aria)}">
	        ${elements ? `<div class="element-stack">${elements}</div>` : ''}
	        ${arrow ? `<span class="preview-arrow ${arrow.isActiveActor ? 'active' : 'past'}">${esc(DIR[arrow.direction] || arrow.direction || '→')}</span>` : ''}
	        ${unit ? unitToken(unit, activePreviewUnitId) : '<span class="empty-dot">·</span>'}
	        ${previews.length ? previewBadge(previews) : ''}
        ${hasIncomingHit ? `<span class="team-risk-num">受${esc(teamRisk.damage)}${teamRisk.lethal ? ' KO' : ''}</span>` : ''}
	        ${t?.finalMove ? '<span class="enemy-final-num">终</span>' : ''}
	      </button>`;
	    }).join('');
	  }
	  function previewBadge(previews = []) {
	    const primary = previews.find(p => p.isActiveActor) || previews[0];
	    const damage = previews.reduce((sum, p) => sum + Number(p.predictedDamage || 0), 0);
	    const layersByEl = {};
	    previews.forEach(p => { if (p.element) layersByEl[p.element] = (layersByEl[p.element] || 0) + Number(p.layers || 0); });
	    const layerText = Object.entries(layersByEl).map(([el, n]) => `${el}${n}`).join('/');
	    const text = damage > 0 ? `伤${damage} ${layerText}` : layerText || `预${primary?.layers ?? '+'}`;
	    return `<span class="preview-num ${primary?.isActiveActor ? 'active' : 'past'}">${esc(text)}</span>`;
	  }
	  function unitToken(unit, activePreviewUnitId = null) {
	    const side = unit.side === 'hero' ? 'hero' : unit.side === 'boss' ? 'boss leader' : unit.side === 'hero_leader' ? 'hero leader' : 'enemy';
	    const name = boardUnitShortName(unit);
	    const active = unit.id === ui.selectedUnitId || unit.id === activePreviewUnitId ? ' is-active' : '';
	    return `<div class="unit-token ${side}${active}">
	      <span class="unit-stat-badge unit-stat-hp" aria-label="生命 ${esc(Math.max(0, unit.hp ?? 0))}">♥${esc(Math.max(0, unit.hp ?? 0))}</span>
	      <span class="unit-stat-badge unit-stat-atk" aria-label="攻击 ${esc(unit.atk ?? 0)}">⚔${esc(unit.atk ?? 0)}</span>
	      <span class="unit-token-name">${esc(name)}</span>
      <span class="unit-token-hp"><i style="width:${pct(unit.hp, unit.maxHp)}%"></i></span>
    </div>`;
	  }
  function legalMoveTargets(hero) {
    const set = new Set();
    if (!hero?.position || unitPositionLocked(hero) || ui.vm.phase !== 'player_turn' || ui.slotArmed) return set;
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
      ui.selectedCell = { r: Number(r), c: Number(c) };
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
  function waitForUiIdle(timeoutMs = 5000) {
    if (!ui.busy) return Promise.resolve();
    const startedAt = Date.now();
    return new Promise(resolve => {
      const tick = () => {
        if (!ui.busy || Date.now() - startedAt >= timeoutMs) resolve();
        else setTimeout(tick, 20);
      };
      tick();
    });
  }
  async function onCellClick(r, c) {
    ui.selectedCell = { r, c };
    const moveKey = `${r},${c}`;
    const cell = cellAt(r, c);
    const hero = selectedHero();
    const canMoveSelectedHero = ui.vm?.phase === 'player_turn' && hero && !ui.slotArmed && legalMoveTargets(hero).has(moveKey);
    if (canMoveSelectedHero) {
      await waitForUiIdle();
      await runCommand('MOVE_HERO', { unitId: hero.id, to: { r, c } });
      return;
    }
    if (ui.vm?.phase === 'player_turn' && unitPositionLocked(hero) && !ui.slotArmed && cell && !cell.unitId) {
      toast(`${hero.name} 本回合已行动，位置锁定。`, true);
      await fetchCellDetail(r, c);
      return;
    }
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
    await runCommand('SELECT_CELL', { r, c });
    await fetchCellDetail(r, c);
    if (ui.slotArmed) return;
    if (ui.vm?.phase === 'player_turn' && !hero && cell && !cell.unitId) {
      toast('先点棋盘上的英雄或左侧英雄卡，再点空格移动。');
      return;
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
	    const selectedCellUnit = c ? unitById(cellAt(c.r, c.c)?.unitId) : null;
	    const selectedUnitRisk = selectedCellUnit?.side === 'hero' ? teamRiskForUnit(selectedCellUnit) : null;
	    if (selectedUnitRisk) {
	      $('detail-summary').textContent = `${selectedUnitRisk.unitName || selectedCellUnit.displayName || selectedCellUnit.name} 受击预警`;
	      $('cell-detail').className = 'detail-card selected-detail';
	      $('cell-detail').innerHTML = renderTeamRiskPanel(selectedUnitRisk);
	      return;
	    }
	    if (hero && (!c || selectedCellUnit?.id === hero.id)) {
	      $('detail-summary').textContent = hero.name;
	      $('cell-detail').className = 'detail-card selected-detail';
	      $('cell-detail').innerHTML = renderUnitDetail(hero);
      return;
    }
	    if (!c) {
	      const risk = primaryTeamRisk();
	      if (risk) {
	        $('detail-summary').textContent = `${risk.unitName || '我方单位'} 受击预警`;
	        $('cell-detail').className = 'detail-card selected-detail';
	        $('cell-detail').innerHTML = renderTeamRiskPanel(risk);
	        return;
	      }
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
	    const previews = detail?.previews || cell?.previews || (detail?.preview || cell?.preview ? [detail?.preview || cell?.preview] : []);
	    const preview = previews.find(p => p?.isActiveActor) || previews[0] || null;
		    const threat = detail?.threat || cell?.threat;
		    const teamRisk = detail?.teamRisk || cell?.teamRisk || (unit?.side === 'hero' ? teamRiskForUnit(unit) : null);
		    if (unit?.side === 'hero' && teamRisk) {
		      $('detail-summary').textContent = `${teamRisk.unitName || unit.displayName || unit.name} 受击预警`;
		      $('cell-detail').className = 'detail-card selected-detail';
		      $('cell-detail').innerHTML = renderTeamRiskPanel(teamRisk);
		      return;
		    }
		    if (preview) {
		      const previewLines = previews.filter(Boolean).map(p => `${p.isActiveActor ? '当前' : '保留'} ${p.actorName || p.actorId} ${DIR[p.direction] || p.direction || '→'} ${p.hitEnemy ? `伤${p.predictedDamage}` : `铺${p.element}${p.layers}`}`).join('；');
		      parts.push(`<div class="detail-extra">⚡ ${esc(previewLines)}</div>`);
		    }
		    if (teamRisk) parts.push(`<div class="detail-extra threat">⚠ ${esc(teamRiskDetailText(teamRisk))}</div>`);
		    else if (threat) parts.push(`<div class="detail-extra threat">⚠ ${esc(threatDetailText(threat))}</div>`);
		    $('cell-detail').className = 'detail-card'; $('cell-detail').innerHTML = parts.join('\n');
		  }
	  function threatDetailText(threat) {
	    const hits = Array.isArray(threat?.hits) ? threat.hits : [];
	    const actionCount = threat.actionCount || (Array.isArray(threat.actionIndexes) ? threat.actionIndexes.length : hits.length) || 1;
	    const hitText = hits.map((hit, i) => {
	      const label = hit.slotLabel || (Array.isArray(threat.actionIndexes) ? `第${Number(threat.actionIndexes[i] ?? i) + 1}槽` : `第${i + 1}次`);
	      return `${label}${hit.targetName ? ` ${hit.targetName}` : ''} 伤${hit.damage ?? hit.raw ?? 0}${hit.lethal ? ' KO' : ''}`;
	    }).join(' / ');
		    const total = threat.totalDamage ?? threat.damage ?? threat.atk ?? 0;
		    return `${threat.unitName || '敌方宠物'} ${actionCount}次行动块${hitText ? `：${hitText}` : ''}；合计${total}${threat.lethal ? ' KO' : ''}`;
		  }
		  function teamRiskDetailText(teamRisk) {
		    const threats = Array.isArray(teamRisk?.threats) ? teamRisk.threats : [];
		    if (!threats.length) return `敌方宠物 0次行动块；合计${teamRisk?.damage ?? 0}${teamRisk?.lethal ? ' KO' : ''}`;
		    const threatsByEnemy = new Map();
		    threats.forEach((threat, i) => {
		      const key = threat.enemyId || threat.enemyName || `enemy_${i}`;
		      const group = threatsByEnemy.get(key) || { enemyName: threat.enemyName || '敌方宠物', threats: [] };
		      group.threats.push({ threat, index: i });
		      threatsByEnemy.set(key, group);
		    });
		    const groupText = Array.from(threatsByEnemy.values()).map(group => {
		      const hitText = group.threats.map(({ threat, index }) => {
		        const label = threat.slotLabel || `第${Number(threat.slotIndex ?? index) + 1}槽`;
		        const ko = teamRisk.lethal && index === threats.length - 1 ? ' KO' : '';
		        return `${label} ${teamRisk.unitName || '我方单位'} 伤${threat.damage ?? 0}${ko}`;
		      }).join(' / ');
		      const subtotal = group.threats.reduce((sum, item) => sum + Number(item.threat.damage || 0), 0);
		      return `${group.enemyName} ${group.threats.length}次行动块${hitText ? `：${hitText}` : ''}；小计${subtotal}`;
		    }).join('；');
		    return `${groupText}；合计${teamRisk.damage ?? 0}${teamRisk.lethal ? ' KO' : ''}`;
		  }
		  function renderTeamRiskPanel(teamRisk) {
		    return [
		      `<div class="detail-unit"><strong>${esc(teamRisk.unitName || '我方单位')}</strong><small>受击预警</small></div>`,
		      `<div class="detail-state-panel"><span><b>预计伤害</b>${esc(teamRisk.damage ?? 0)}</span><span><b>HP</b>${esc(teamRisk.hpFrom ?? '-')}→${esc(teamRisk.hpTo ?? '-')}</span><span><b>结果</b>${teamRisk.lethal ? 'KO' : '存活'}</span></div>`,
		      `<div class="detail-extra threat">⚠ ${esc(teamRiskDetailText(teamRisk))}</div>`
		    ].join('\n');
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
	  function elementLayerChips(elements = {}) {
	    return Object.entries(elements)
	      .filter(([, n]) => Number(n) > 0)
	      .map(([el, n]) => `<span class="popup-el ${clsForEl(el)}">${esc(EL_ICON[el] || el)}${esc(n)}</span>`)
	      .join(' ');
	  }
	  function renderElementLayerRow(label, elements = {}) {
	    const chips = elementLayerChips(elements);
	    return `<div class="detail-els">${esc(label)}：${chips || '<span class="dim">无</span>'}</div>`;
	  }
	  function renderUnitDetail(unit) {
	    const unitElements = unit.elementLayers || unit.elements || {};
	    const footCell = unit.position ? cellAt(unit.position.r, unit.position.c) : null;
	    const detailForFootCell = ui.cellDetail
	      && Number(ui.cellDetail.r) === Number(unit.position?.r)
	      && Number(ui.cellDetail.c) === Number(unit.position?.c)
	        ? ui.cellDetail
	        : null;
	    const footCellElements = detailForFootCell?.elements || footCell?.elements || {};
	    const slotList = (unit.slots || []).map((s, i) => `<span class="detail-slot-pill ${s.used ? 'used' : ''}">${esc(i + 1)}. ${esc(s.label || s.shapeName || '行动块')} · ${esc(s.element || '-')} ${esc(DIR[s.direction] || s.direction || '→')}</span>`).join('');
	    const activeSlot = selectedSlotInfo();
	    const facing = activeSlot?.hero?.id === unit.id ? activeSlot.slot.direction : (ui.vm?.selected?.direction || 'right');
		    const unitRisk = unit.side === 'hero' ? teamRiskForUnit(unit) : null;
		    const unitThreat = unit.position ? ((ui.cellDetail && Number(ui.cellDetail.r) === Number(unit.position.r) && Number(ui.cellDetail.c) === Number(unit.position.c) ? ui.cellDetail.threat : null) || cellAt(unit.position.r, unit.position.c)?.threat) : null;
	    return [
	      `<div class="detail-hero-head"><span class="detail-avatar ${clsForEl(unit.element)}">${esc(unitIcon(unit))}</span><div><strong>${esc(unit.displayName || unit.name)}</strong><small>${esc(unit.element || '-')} · ${esc(unit.quality || '普通')} · ${esc(unit.role || '-')}</small></div></div>`,
	      renderStatGrid(heroBattleStats(unit)),
	      `<div class="detail-skill-panel"><strong>技能 ${esc(skillName(unit))}</strong><span>${esc(skillDescription(unit))}</span></div>`,
	      `<div class="detail-state-panel"><span><b>当前状态</b>${unit.alive === false ? '退场' : '正常'}</span><span><b>面向方向</b>${esc(DIR[facing] || facing || '→')}</span><span><b>行动形状</b>${esc(slotPlanText(unit))}</span></div>`,
	      `<div class="detail-plan">${esc(compactMechanics(unit.mechanicStatus || []))}</div>`,
		      unitRisk ? `<div class="detail-extra threat">⚠ ${esc(teamRiskDetailText(unitRisk))}</div>` : (unitThreat ? `<div class="detail-extra threat">⚠ ${esc(threatDetailText(unitThreat))}</div>` : ''),
	      renderElementLayerRow('单位元素层', unitElements),
	      renderElementLayerRow('脚下元素层', footCellElements),
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
    clearSelectedActionTarget();
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
    clearSelectedActionTarget();
    await runCommand('SET_ACTION_DIRECTION', { unitId: info.hero.id, slotId: info.localIndex, dir });
  }
  async function useSlot(globalIndex) {
    const info = slotsFlat()[globalIndex] || selectedSlotInfo(); if (!info) return;
    ui.selectedUnitId = info.hero.id; ui.selectedSlotGlobal = info.globalIndex; ui.selectedSlot = info.localIndex; ui.slotArmed = false;
    await runCommand('USE_SLOT', { unitId: info.hero.id, slotId: info.localIndex, cell: ui.selectedCell || null, ap: ui.apBySlot[`${info.hero.id}:${info.localIndex}`] || 1 });
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
    $('etb').textContent = playerTurnButtonText(phase);
    $('etb').disabled = !(phase === 'init' || phase === 'player_turn') || ui.busy;
    $('monster-btn').textContent = enemyFlowButtonText(phase);
    $('monster-btn').disabled = !(phase === 'monster_turn' || phase === 'round_end') || ui.busy;
    const fullDayDisabled = ui.busy || ui.manualAutoLock || !['init','battle_end','day_end'].includes(phase);
    $('full-day-btn').disabled = fullDayDisabled;
    $('full-day-btn').title = ui.manualAutoLock ? '已手动移动或施放，本场完整自动流程已锁定。' : '';
	    if ($('all-out-btn')) {
	      const hasUsableSlot = slotsFlat().some(x => !x.slot.used && x.slot.canUse !== false);
	      $('all-out-btn').disabled = ui.busy || phase !== 'player_turn' || !hasUsableSlot;
	      $('all-out-btn').title = phase === 'player_turn' ? '按左侧行动块顺序释放，不移动、不重新摆位。' : '进入玩家回合后可用。';
	    }
    if ($('auto-position-btn')) {
      $('auto-position-btn').disabled = ui.busy || !hasAutoPositionCandidates();
      $('auto-position-btn').title = phase === 'player_turn' ? '移动未锁定宠物到预计伤害更高的位置，不自动出手。' : '进入玩家回合后可用。';
    }
    $('shop-btn').disabled = ui.busy || phase !== 'battle_end';
    $('day7-btn').disabled = ui.busy;
    $('new-game-btn').disabled = ui.busy;
    $('roll-shop-btn').disabled = phase !== 'shop' || ui.busy;
    $('exit-shop-btn').disabled = phase !== 'shop' || ui.busy;
    $('reward-btn').disabled = !(phase === 'battle_end' || isNext('REWARD_OPTIONS')) || ui.busy;
    $('node-options-btn').disabled = ui.busy || !isNext('GENERATE_NODE_OPTIONS');
    const fixedBattleAction = nextAction('RUN_ROUTE_FIXED_BATTLE');
    $('battle-options-btn').textContent = fixedBattleAction?.label || '生成遭遇';
    $('battle-options-btn').disabled = ui.busy || !(isNext('GENERATE_BATTLE_OPTIONS') || fixedBattleAction);
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
    if (phase === 'player_turn' && unitPositionLocked(hero)) return { label: '锁定', cls: 'target' };
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
      if (unitPositionLocked(hero)) return `${hero.name} 本回合已行动，位置锁定；可选择其他英雄或点行动槽继续。`;
      if (hero) return `${hero.name} 已选中：点空格移动；点敌人或Boss查看详情；点行动槽进入瞄准。`;
      return '点棋盘上的我方英雄或左侧英雄卡选中，再点空格移动。';
    }
    if (phase === 'monster_turn' || phase === 'round_end') return `点击“${enemyFlowButtonText(phase)}”继续推进。`;
    if (phase === 'battle_end') return '战斗结束，可以生成奖励或进入商店。';
    if (phase === 'shop') return '购买、冻结、刷新商品，然后离开商店。';
    return '可使用右侧按钮继续流程。';
  }
  function slotKey(info) {
    return `${info.hero.id}:${info.localIndex}`;
  }
  async function runAllOutCommand(type, payload = {}) {
    const data = await runtime.action(makeCommand(type, payload));
    ui.vm = data.viewModel || ui.vm;
    normalizeSelection();
    return data;
  }
  function nextUsableSlotInfo(blocked = new Set()) {
    return slotsFlat().find(x => {
      return !blocked.has(slotKey(x)) && !x.slot.used && x.slot.canUse !== false;
    }) || null;
  }
  async function runAllOut() {
    if (ui.vm?.phase !== 'player_turn') {
      toast('我方全部出击只能在玩家回合使用。', true);
      return;
    }
    if (!nextUsableSlotInfo()) {
      toast('没有可释放的行动块。', true);
      return;
    }
    let count = 0;
    ui.busy = true;
    setBusy(true);
    try {
      const result = await runAllOutCommand('RUN_PLAYER_ALL_OUT', { apBySlot: ui.apBySlot });
      count = Number(result?.result?.count || 0);
    } catch (err) {
      toast(err.message || String(err), true);
      document.body.classList.add('shake');
      setTimeout(() => document.body.classList.remove('shake'), 300);
    } finally {
      ui.busy = false;
      setBusy(false);
    }
    ui.slotArmed = false;
    renderCache.invalidate();
    render();
    toast(`我方全部出击：尝试释放 ${count} 个行动块。`);
  }

  function renderChoicePreview(option) {
    const preview = option.choicePreview || {};
    const tags = (preview.tags || []).filter(Boolean).slice(0, 3);
    const meta = [
      preview.kindLabel,
      preview.costText ? `成本 ${preview.costText}` : '',
      preview.gainText ? `收益 ${preview.gainText}` : ''
    ].filter(Boolean);
    const summary = preview.summary || option.note || option.phaseLabel || option.nodeType || '选择后继续推进路线';
    const tagHtml = tags.map(tag => `<span>${esc(tag)}</span>`).join('');
    return `<div class="choice-preview">
      <p>${esc(summary)}</p>
      <div class="choice-meta">${meta.map(x => `<span>${esc(x)}</span>`).join('')}${tagHtml}</div>
      ${renderBattlePressurePreview(option.pressurePreview)}
    </div>`;
  }
  function renderBattlePressurePreview(pressure) {
    if (!pressure) return '';
    const chips = [
      pressure.pressureTier,
      `${pressure.wavePeriod || '-'} ${pressure.waveRows || 0}波`,
      `敌量 ${pressure.totalSpawnCount || 0}`,
      `峰值 ${pressure.peakSpawnCount || 0}`,
      pressure.dominantQuality ? `主品质 ${pressure.dominantQuality}` : ''
    ].filter(Boolean);
    return `<div class="battle-pressure-preview">
      <strong>${esc(pressure.summary || '战前压力')}</strong>
      <p>威胁 ${esc(pressure.totalThreat || 0)} / 峰值 ${esc(pressure.peakThreat || 0)} · ${esc(pressure.rewardText || '胜利获得奖励')}</p>
      <div>${chips.map(x => `<span>${esc(x)}</span>`).join('')}</div>
    </div>`;
  }
  function renderRoutePendingRewards(route = {}) {
    const pending = (ui.vm.dayRoute?.pendingRewards || route?.pendingRewards || []).filter(x => x && !x.claimed);
    if (!pending.length) return '';
    return pending.map((reward, i) => `<button class="reward-card route-pending-reward" data-route-reward-id="${esc(reward.rewardId)}" data-route-reward-index="${i}" type="button"${ui.busy ? ' disabled' : ''}>
      <strong>路线战斗奖励</strong>
      <span>${esc(reward.rewardPoolId || '奖励池')}</span>
      <p>${esc(reward.phaseLabel || reward.encounterId || '遭遇')} · ${esc(reward.resultCode || 'WIN')} · ${esc(reward.grade || '-')}</p>
    </button>`).join('');
  }
  function renderFixedBattlePressure() {
    const pressure = nextAction('RUN_ROUTE_FIXED_BATTLE')?.defaultPayload?.pressurePreview;
    if (!pressure) return '';
    return `<section class="route-fixed-pressure"><div><strong>固定战预告</strong><span>${esc(pressure.name || pressure.phaseLabel || '路线战斗')}</span></div>${renderBattlePressurePreview(pressure)}</section>`;
  }

  function renderRewards() {
    const rewards = ui.vm.rewards || [];
    const route = ui.vm.dayRoute || {};
    const fixedPressureHtml = renderFixedBattlePressure();
    const routePendingHtml = renderRoutePendingRewards(route);
    const nodeHtml = (route.options || []).map(o => `<button class="reward-card route-choice" data-node-option="${esc(o.optionId)}" type="button"${ui.busy ? ' disabled' : ''}>
      <strong>${esc(o.name || o.nodeId)}</strong><span>${esc(o.choicePreview?.kindLabel || o.nodeType || '节点')}</span>${renderChoicePreview(o)}
    </button>`).join('');
    const battleHtml = (route.battleOptions || []).map(o => `<button class="reward-card route-choice" data-battle-option="${esc(o.encounterId)}" type="button"${ui.busy ? ' disabled' : ''}>
      <strong>${esc(o.name || o.encounterId)}</strong><span>${esc(o.choicePreview?.kindLabel || o.phaseLabel || '遭遇')}</span>${renderChoicePreview(o)}
    </button>`).join('');
    const rewardHtml = rewards.map((r, i) => `<button class="reward-card" data-reward-index="${i}" type="button"${ui.busy ? ' disabled' : ''}>
      <strong>${esc(r.name || r.petName || r.relicName || r.type || `奖励${i + 1}`)}</strong><span>选择</span>
    </button>`).join('');
    $('reward-list').innerHTML = fixedPressureHtml + routePendingHtml + nodeHtml + battleHtml + rewardHtml;
  }
  function renderShopStallSummary(shop = {}) {
    const stall = shop.activeStall || {};
    const tags = (stall.tags || []).filter(Boolean);
    const tagHtml = tags.map(tag => `<span>${esc(tag)}</span>`).join('');
    const pool = stall.shopPoolId || shop.activePool || 'night_base';
    const slots = Number(stall.slots || (shop.offers || []).length || 0);
    return `<section class="shop-stall-summary">
      <div><strong>${esc(stall.name || '夜市商人')}</strong><span>${esc(stall.note || '当前商店摊位')}</span></div>
      <div class="shop-stall-tags">${tagHtml || '<span>通用</span>'}</div>
      <p>池 ${esc(pool)} · 槽位 ${esc(slots)} · 规则 ${esc(stall.priceRule || '标准价格')}</p>
    </section>`;
  }
  function renderShopRefreshSummary(shop = {}) {
    const refresh = shop.refreshState || {};
    const freeRolls = Number(refresh.freeRolls ?? shop.freeRolls ?? 0);
    const nextDiscount = Number(refresh.nextDiscount ?? shop.nextDiscount ?? 0);
    const lastRoll = refresh.lastRoll || null;
    const targeted = (refresh.targetedRestocks || []).filter(Boolean);
    const chips = [
      `免费刷新 ${freeRolls}`,
      `下次折扣 ${nextDiscount}%`,
      lastRoll ? `最近 ${lastRoll.poolId || '-'} / ${lastRoll.cost || 0}金` : '最近 未刷新',
      `定向补货 ${targeted.length}`
    ];
    const targetedText = targeted.slice(-2).map(x => `${x.name || x.poolId}:${x.status || 'pending'}`).join(' / ');
    return `<section class="shop-refresh-summary">
      <div>${chips.map(x => `<span>${esc(x)}</span>`).join('')}</div>
      ${targetedText ? `<p>${esc(targetedText)}</p>` : ''}
    </section>`;
  }
  function renderShop() {
    const shop = ui.vm.shop || {};
    const offers = shop.offers || [];
    const events = shop.events || [];
    const stallHtml = renderShopStallSummary(shop);
    const refreshHtml = renderShopRefreshSummary(shop);
    const eventHtml = events.length ? `<div class="shop-event-list">${events.map(e => `<div class="shop-event-card"><div><strong>${esc(e.name)}</strong><span>${esc(e.optionText || '')} · ${esc(e.costText || '无成本')} → ${esc(e.gainText || '')}</span></div><button class="mini-btn" data-shop-event="${esc(e.id)}" type="button"${ui.busy || ui.vm.phase !== 'shop' ? ' disabled' : ''}>触发</button></div>`).join('')}</div>` : '';
    const offerHtml = offers.map(o => {
      const sourceHtml = o.restock?.name ? `<span class="offer-source">补货：${esc(o.restock.name)} / ${esc(o.restock.poolId || o.poolId || '-')}</span>` : '';
      return `<div class="offer-card${o.frozen ? ' frozen' : ''}">
      <div class="offer-main"><strong>${esc(o.name)}</strong><span class="${clsForEl(o.element)}">${esc(o.element || '-')} · ${esc(o.role || '-')} · ${esc(o.price)}金${o.frozen ? ' · 已冻结' : ''}</span>${sourceHtml}</div>
      <div class="offer-actions"><button class="mini-btn buy" data-buy-offer="${esc(o.offerId)}" type="button"${ui.busy || ui.vm.phase !== 'shop' || Number(o.price) > Number(ui.vm.gold || 0) ? ' disabled' : ''}>购买</button><button class="mini-btn freeze" data-freeze-offer="${esc(o.offerId)}" data-frozen="${o.frozen ? '1' : '0'}" type="button"${ui.busy || ui.vm.phase !== 'shop' ? ' disabled' : ''}>${o.frozen ? '解冻' : '冻结'}</button></div>
    </div>`;
    }).join('');
    $('shop-list').innerHTML = stallHtml + refreshHtml + eventHtml + offerHtml;
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
    const EVENT_LABEL = {
      BATTLE_START: '战斗开始', ROUND_START: '回合开始', ROUND_END: '回合结束',
      BATTLE_END: '战斗结束', SPAWN_ENEMY: '敌方召唤', HERO_MOVE: '英雄移动',
      HERO_ACTION: '英雄行动', ENEMY_ACTION: '敌方行动', DAMAGE: '伤害',
      HEAL: '治疗', DEATH: '阵亡', STATUS: '状态', TRAP: '陷阱',
      SKILL: '技能', BUFF: '增益', DEBUFF: '减益', PHASE: '阶段',
    };
    $('log').textContent = events.map(e => {
      const label = EVENT_LABEL[e.type] || e.type;
      return `${String(e.step || '').padStart(3, '0')} [${label}] ${e.text || ''}`;
    }).join('\n') || '暂无事件。';
    requestAnimationFrame(() => { $('log').scrollTop = 0; });
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
	    $('full-run-btn')?.addEventListener('click', () => runCommand('RUN_FULL_RUN', { fromDay: 1, toDay: 10, gold: Math.max(999, Number(ui.vm?.gold || 0)) }, { autoFlow: true }));
    $('auto-position-btn')?.addEventListener('click', () => runCommand('AUTO_POSITION_HEROES'));
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
    $('node-options-btn').addEventListener('click', () => runCommand('GENERATE_NODE_OPTIONS'));
    $('battle-options-btn').addEventListener('click', () => runCommand(isNext('RUN_ROUTE_FIXED_BATTLE') ? 'RUN_ROUTE_FIXED_BATTLE' : 'GENERATE_BATTLE_OPTIONS'));
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
      const routeReward = ev.target.closest('[data-route-reward-id]');
      if (routeReward) { runCommand('CLAIM_ROUTE_REWARD', { rewardId: routeReward.dataset.routeRewardId, rewardIndex: 0 }); return; }
      const node = ev.target.closest('[data-node-option]');
      if (node) { runCommand('PICK_NODE', { optionId: node.dataset.nodeOption }); return; }
      const battle = ev.target.closest('[data-battle-option]');
      if (battle) { runCommand('PICK_BATTLE_ENCOUNTER', { encounterId: battle.dataset.battleOption }); return; }
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
