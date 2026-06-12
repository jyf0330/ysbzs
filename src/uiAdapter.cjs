const { createGameState, makeUnit } = require('./core/state.cjs');
const { dispatch: coreDispatch } = require('./core/reducer.cjs');
const battle = require('./core/battle.cjs');
const shop = require('./core/shop.cjs');
const { renderPlayerReport, renderShopReport } = require('./render/textReport.cjs');
const { pushEvent } = require('./core/events.cjs');
const { applyBattleStart } = require('./core/mechanics.cjs');
const { ensureMultiplayerState } = require('./core/multiplayerState.cjs');
const { normalizeCommandEnvelope, validateCommandAuthority, annotateEvents, commitAcceptedCommand, rejectedCommandResult } = require('./core/commandEnvelope.cjs');
const { stateHash } = require('./core/stateHash.cjs');
const { buildSaveDocument, applySaveToState, assertSaveDocument } = require('./storage/saveCodec.cjs');
const { statusOfMechanic, activationBlockReason } = require('./core/mechanicGate.cjs');
const { canonicalEventLog } = require('./core/eventProjection.cjs');

const PUBLIC_COMMANDS = Object.freeze([
  'START_BATTLE',
  'START_NEXT_ROUND',
  'SELECT_HERO',
  'SELECT_UNIT',
  'SELECT_CELL',
  'SELECT_SLOT',
  'SET_ACTION_DIRECTION',
  'SET_SLOT_DIR',
  'MOVE_HERO',
  'USE_SLOT',
  'USE_ACTION_SLOT',
  'RUN_PLAYER_ALL_OUT',
  'END_PLAYER_TURN',
  'RUN_MONSTER_TURN',
  'BUILD_PREVIEW',
  'GET_CELL_DETAIL',
  'RUN_BATTLE',
  'REWARD_OPTIONS',
  'PICK_REWARD',
  'ENTER_SHOP',
  'ROLL_SHOP',
  'FREEZE_OFFER',
  'UNFREEZE_OFFER',
  'BUY_OFFER',
  'APPLY_SHOP_EVENT',
  'EXIT_SHOP',
  'RUN_FULL_DAY',
  'SELL_UNIT',
  'TOGGLE_UNIT_ACTIVE',
  'EXPORT_BATTLE_TRACE',
  'REPLAY_BATTLE_TRACE',
  'EXPORT_REPLAY',
  'SETUP_DAY7_FIRE_TRIAL',
  'RUN_DAY7_FIRE_TURN_1',
  'RUN_DAY7_FIRE_TRIAL_ALL'
]);

const ACTION_ALIASES = Object.freeze({
  runBattle: 'RUN_BATTLE',
  startBattle: 'START_BATTLE',
  startNextRound: 'START_NEXT_ROUND',
  rewardOptions: 'REWARD_OPTIONS',
  pickReward: 'PICK_REWARD',
  enterShop: 'ENTER_SHOP',
  rollShop: 'ROLL_SHOP',
  freezeOffer: 'FREEZE_OFFER',
  unfreezeOffer: 'UNFREEZE_OFFER',
  buyOffer: 'BUY_OFFER',
  applyShopEvent: 'APPLY_SHOP_EVENT',
  exitShop: 'EXIT_SHOP',
  runFullDay: 'RUN_FULL_DAY',
  runFullPlayerDayFlow: 'RUN_FULL_DAY',
  sellUnit: 'SELL_UNIT',
  toggleUnitActive: 'TOGGLE_UNIT_ACTIVE',
  useActionSlot: 'USE_ACTION_SLOT',
  runPlayerAllOut: 'RUN_PLAYER_ALL_OUT',
  useSlot: 'USE_SLOT',
  selectUnit: 'SELECT_UNIT',
  selectHero: 'SELECT_HERO',
  selectCell: 'SELECT_CELL',
  selectSlot: 'SELECT_SLOT',
  setSlotDir: 'SET_SLOT_DIR',
  setActionDirection: 'SET_ACTION_DIRECTION',
  moveHero: 'MOVE_HERO',
  endPlayerTurn: 'END_PLAYER_TURN',
  runMonsterTurn: 'RUN_MONSTER_TURN',
  buildPreview: 'BUILD_PREVIEW',
  getCellDetail: 'GET_CELL_DETAIL',
  exportBattleTrace: 'EXPORT_BATTLE_TRACE',
  replayBattleTrace: 'REPLAY_BATTLE_TRACE',
  exportReplay: 'EXPORT_REPLAY',
  setupDay7FireTrial: 'SETUP_DAY7_FIRE_TRIAL',
  runDay7FireTurn1: 'RUN_DAY7_FIRE_TURN_1',
  runDay7FireTrialAll: 'RUN_DAY7_FIRE_TRIAL_ALL'
});

const UI_SELECTION_COMMANDS = Object.freeze(['SELECT_HERO', 'SELECT_UNIT', 'SELECT_CELL', 'SELECT_SLOT']);
const READ_ONLY_COMMANDS = Object.freeze(['BUILD_PREVIEW', 'GET_CELL_DETAIL', 'EXPORT_BATTLE_TRACE', 'REPLAY_BATTLE_TRACE', 'EXPORT_REPLAY']);
const MAX_ACTIVE_UNITS = 4;

function clone(value) { return JSON.parse(JSON.stringify(value)); }
function commandText(command) { return typeof command === 'string' ? command : command.type; }
function nextAllOutSlot(vm, blocked = new Set()) {
  for (const hero of vm?.heroes || []) {
    for (let slotId = 0; slotId < (hero.slots || []).length; slotId++) {
      const slot = hero.slots[slotId];
      const key = `${hero.id}:${slotId}`;
      if (!blocked.has(key) && !slot.used && slot.canUse !== false) return { hero, slotId, key };
    }
  }
  return null;
}
function normalizeCommand(typeOrCommand, payload = {}) {
  if (typeof typeOrCommand === 'string') {
    const type = ACTION_ALIASES[typeOrCommand] || typeOrCommand;
    return Object.assign({ type }, payload || {});
  }
  if (!typeOrCommand || typeof typeOrCommand !== 'object') throw new Error('UI adapter command must be a string or object');
  const type = ACTION_ALIASES[typeOrCommand.type] || typeOrCommand.type;
  return Object.assign({}, typeOrCommand, { type });
}
function assertKnownCommand(command) {
  if (!PUBLIC_COMMANDS.includes(command.type)) throw new Error(`Unknown UI adapter command: ${command.type}`);
}
function dataSummary(state) {
  return {
    pets: state.data.pets.length,
    monsters: state.data.monsters.length,
    waves: state.data.waves.length,
    mechanisms: state.data.mechanisms.length,
    events: state.data.events.length,
    shop: state.data.shop.length,
    relics: state.data.relics.length,
    shapes: state.data.shapes.length,
    validation: state.data.validation.length
  };
}
function slotsForVM(state, unit) {
  return battle.slotsForUnit(state, unit).map(slot => ({
    slotId: slot.slotId,
    index: slot.index,
    label: slot.label,
    element: slot.element,
    layers: slot.layers,
    shapeId: slot.shapeId,
    shapeName: slot.shapeName,
    hitCells: slot.hitCells,
    direction: slot.direction,
    used: slot.used,
    canUse: slot.canUse
  }));
}
function stripUnit(state, unit) {
  return {
    id: unit.id,
    side: unit.side,
    camp: unit.camp || (unit.side === 'hero' ? 'player' : 'enemy'),
    petId: unit.petId,
    name: unit.name,
    displayName: unit.displayName || `${unit.side === 'hero' ? '我方' : '敌方'}${unit.name}`,
    element: unit.element,
    quality: unit.quality,
    bodySize: unit.bodySize,
    role: unit.role,
    hp: unit.hp,
    maxHp: unit.maxHp,
    atk: unit.atk,
    def: unit.def,
    shield: unit.shield,
    ap: unit.ap,
    actionApSpent: unit.actionApSpent || 0,
    availableAp: Math.max(0, Number(unit.ap || 0) - Number(unit.actionApSpent || 0)),
    moveRange: unit.moveRange ?? null,
    alive: unit.alive,
    position: unit.position || null,
    elements: Object.assign({ 火: 0, 水: 0, 风: 0, 土: 0 }, unit.elements || {}),
    mechanics: unit.mechanics || [],
    mechanicStatus: (unit.mechanics || []).map(id => ({ id, status: statusOfMechanic(id) })),
    shape: unit.shape ? {
      shapeId: unit.shape.shapeId,
      shapeName: unit.shape.shapeName,
      shapeClass: unit.shape.shapeClass,
      hitCells: unit.shape.hitCells,
      slotCount: unit.shape.slotCount,
      slotElements: unit.shape.slotElements,
      actionType: unit.shape.actionType,
      skill: unit.shape.skill,
      note: unit.shape.note
    } : null,
	    slots: ['hero', 'enemy'].includes(unit.side) ? slotsForVM(state, unit) : []
	  };
	}
function stripOffer(offer) {
  return {
    offerId: offer.offerId,
    id: offer.offerId,
    type: offer.type,
    petId: offer.petId,
    name: offer.name,
    element: offer.element,
    role: offer.role,
    poolTier: offer.poolTier,
    poolId: offer.poolId,
    price: offer.price,
    frozen: !!offer.frozen
  };
}
function stripReward(reward, index) { return Object.assign({ index }, reward); }
function makePlayerViewState() {
  return { selected: { unitId: null, slotId: null, cell: null, direction: 'right' }, recentUiEvents: [] };
}
function getPlayerViewState(viewStates, playerId = 'p1') {
  const id = playerId || 'p1';
  if (!viewStates.has(id)) viewStates.set(id, makePlayerViewState());
  return viewStates.get(id);
}
function selectedFromViewState(viewState) {
  return clone((viewState && viewState.selected) || { unitId: null, slotId: null, cell: null, direction: 'right' });
}
function makeUiEvent(state, command, type, payload = {}) {
  const viewSeq = Number(state.nextUiEvent || 1);
  state.nextUiEvent = viewSeq + 1;
  return Object.assign({
    eventId: `${state.battleId || 'battle'}:${command.commandId || 'ui'}:ui:${viewSeq}:${type}`,
    seq: viewSeq,
    step: `ui${viewSeq}`,
    battleId: state.battleId,
    commandId: command.commandId,
    playerId: command.playerId,
    teamId: state.players && state.players[command.playerId] ? state.players[command.playerId].teamId : null,
    phase: state.phase,
    round: state.round,
    type
  }, payload);
}
function rememberUiEvent(viewState, event) {
  viewState.recentUiEvents = Array.isArray(viewState.recentUiEvents) ? viewState.recentUiEvents : [];
  viewState.recentUiEvents.push(clone(event));
  if (viewState.recentUiEvents.length > 30) viewState.recentUiEvents.splice(0, viewState.recentUiEvents.length - 30);
}
function boardElementsForVM(state, cell) {
  const out = clone(cell.elements || {});
  const camps = cell.elementCamps || {};
  for (const el of Object.keys(out)) {
    const camp = camps[el];
    if (camp && battle.factionRules(state, camp).showElementGeneration === false) out[el] = 0;
  }
  return out;
}
function makeBoardVM(state, selected = {}) {
	  battle.syncDerivedBoard(state);
	  const aimingCell = selected.slotId !== null && selected.slotId !== undefined ? (selected.cell || undefined) : undefined;
	  const previewGrid = battle.buildPreviewGrid(state, {
	    unitId: selected.unitId || undefined,
	    slotId: selected.slotId,
	    cell: aimingCell
	  });
  const threatGrid = battle.buildThreatGrid(state);
  const riskUnitId = selected.unitId || state.teamPlacementPreview?.activeUnitId || state.units.find(u => u.side === 'hero' && u.alive !== false && u.hp > 0)?.id || null;
  const moveRiskGrid = riskUnitId ? battle.buildMoveRiskGrid(state, riskUnitId) : [];
  const movedUnitIds = Array.isArray(state.teamPlacementPreview?.movedUnitIds) ? state.teamPlacementPreview.movedUnitIds : [];
  const teamRiskGrid = battle.buildTeamRiskGrid(state, movedUnitIds.length ? movedUnitIds : null);
	  const previewMap = new Map(previewGrid.map(x => [`${x.r},${x.c}`, x]));
	  const previewGroups = new Map();
	  for (const p of previewGrid) {
	    const key = `${p.r},${p.c}`;
	    if (!previewGroups.has(key)) previewGroups.set(key, []);
	    previewGroups.get(key).push(p);
	  }
	  const threatMap = new Map(threatGrid.map(x => [`${x.r},${x.c}`, x]));
  const moveRiskMap = new Map(moveRiskGrid.map(x => [`${x.r},${x.c}`, x]));
  const teamRiskMap = new Map(teamRiskGrid.map(x => [`${x.r},${x.c}`, x]));
	  return {
    rows: state.board.rows,
    cols: state.board.cols,
    cells: state.board.cells.map(cell => ({
      r: cell.r,
      c: cell.c,
      key: cell.key,
      unitId: cell.unitId,
      unitSide: cell.unitSide,
      unitName: cell.unitName,
      terrain: clone(cell.terrain),
      elements: boardElementsForVM(state, cell),
	      preview: clone(previewMap.get(`${cell.r},${cell.c}`) || null),
	      previews: clone(previewGroups.get(`${cell.r},${cell.c}`) || []),
	      threat: clone(threatMap.get(`${cell.r},${cell.c}`) || null),
      moveRisk: clone(moveRiskMap.get(`${cell.r},${cell.c}`) || null),
      teamRisk: clone(teamRiskMap.get(`${cell.r},${cell.c}`) || null)
	    })),
    previewGrid,
    threatGrid,
    moveRiskGrid,
    teamRiskGrid
	  };
	}
function teamPlacementPreviewVM(state, previewGrid = []) {
  const raw = state.teamPlacementPreview || { activeUnitId: null, movedUnitIds: [] };
  const movedUnitIds = Array.isArray(raw.movedUnitIds) ? raw.movedUnitIds.slice() : [];
  return {
    activeUnitId: raw.activeUnitId || previewGrid[0]?.actorId || null,
    movedUnitIds
  };
}

function inventoryVM(state) {
  const activeCount = (state.inventory || []).filter(x => x.active !== false).length;
  const items = (state.inventory || []).map((x, i) => {
    const pet = state.indexes?.petsById?.get(x.petId) || {};
    const unit = findUnitForInventoryEntry(state, x);
    return Object.assign({}, clone(x), {
      name: x.name || pet.name || x.petId,
      element: x.element || pet.element || '-',
      role: x.role || pet.role || pet.定位 || '-',
      quality: x.quality || pet.quality || '普通',
      hp: unit ? unit.hp : (pet.hp || null),
      maxHp: unit ? unit.maxHp : (pet.hp || null),
      atk: unit ? unit.atk : (pet.atk || null),
      instanceId: x.instanceId || null,
      active: x.active !== false,
      sellValue: Math.max(1, Number(x.level || 1)),
      mechanics: x.mechanics || pet.mechanics || [],
      mechanicStatus: (x.mechanics || pet.mechanics || []).map(id => ({ id, status: statusOfMechanic(id) })),
      canActivate: x.active !== false || activeCount < MAX_ACTIVE_UNITS,
      index: i
    });
  });
  return {
    items,
    active: items.filter(x => x.active !== false),
    bench: items.filter(x => x.active === false),
    activeCount: items.filter(x => x.active !== false).length,
    maxActive: MAX_ACTIVE_UNITS
  };
}
function inventoryEntryForUnit(state, unit) {
  return (state.inventory || []).find(x => x.instanceId === unit.id || x.petId === unit.petId) || null;
}
function isUnitVisibleInParty(state, unit) {
  const inv = inventoryEntryForUnit(state, unit);
  return unit.alive !== false && unit.active !== false && (!inv || inv.active !== false);
}
function findUnitForInventoryEntry(state, inv) {
  if (!inv) return null;
  return (state.units || []).find(u => u.id === inv.instanceId || u.petId === inv.petId) || null;
}
function firstEmptyHeroCell(state) {
  battle.syncDerivedBoard(state);
  const preferred = [
    { r: 6, c: 1 }, { r: 5, c: 1 }, { r: 6, c: 2 }, { r: 5, c: 2 },
    { r: 4, c: 1 }, { r: 7, c: 1 }, { r: 4, c: 2 }, { r: 7, c: 2 }
  ];
  const cells = preferred.concat(state.board.cells.map(c => ({ r: c.r, c: c.c })));
  for (const p of cells) {
    const cell = state.board.cells.find(c => c.r === p.r && c.c === p.c);
    if (cell && !cell.unitId) return p;
  }
  return { r: 7, c: 0 };
}
function recentEvents(state, n = 30) {
  return state.events.slice(-n).map(e => {
    const base = { step: e.step, round: e.round, phase: e.phase, type: e.type, text: e.text || e.type };
    // 附加数据字段（供 UI 展示/调试）
    if (e.displayName) base.displayName = e.displayName;
    if (e.element) base.element = e.element;
    if (e.side) base.side = e.side;
    if (e.from) base.from = e.from;
    if (e.to) base.to = e.to;
    if (e.apRemaining != null) base.apRemaining = e.apRemaining;
    if (e.moveRange != null) base.moveRange = e.moveRange;
    if (e.slotId != null) base.slotId = e.slotId;
    if (e.dir) base.dir = e.dir;
    if (e.slotElement) base.slotElement = e.slotElement;
    if (e.slotLayers != null) base.slotLayers = e.slotLayers;
    if (e.shapeName) base.shapeName = e.shapeName;
    if (e.actorId) base.actorId = e.actorId;
    return base;
  });
}
function logGroups(state) {
  return {
    player: state.events.filter(e => /PLAYER|SELECT|MOVE_HERO|USE_SLOT|ACTION_DIRECTION|ROUND|BATTLE/.test(e.type)).slice(-40).map(e => e.text || e.type),
    debug: state.events.slice(-80).map(e => `${e.step} ${e.type}: ${e.text || ''}`),
    shop: state.events.filter(e => /SHOP|REWARD|SELL|TOGGLE/.test(e.type)).slice(-40).map(e => e.text || e.type)
  };
}
function nextActions(state) {
  const out = [];
  if (state.phase === 'init') out.push({ type: 'START_BATTLE', label: '开始战斗' });
  if (state.phase === 'player_turn') {
    out.push({ type: 'MOVE_HERO', label: '移动英雄' });
    out.push({ type: 'SET_ACTION_DIRECTION', label: '调整行动槽方向' });
    out.push({ type: 'USE_SLOT', label: '施放行动槽' });
    out.push({ type: 'END_PLAYER_TURN', label: '结束玩家回合' });
    out.push({ type: 'BUILD_PREVIEW', label: '查看格子预览' });
  }
  if (state.phase === 'round_end' && state.round < state.maxRounds) out.push({ type: 'START_NEXT_ROUND', label: '下一回合' });
  if (state.phase === 'monster_turn') out.push({ type: 'RUN_MONSTER_TURN', label: '怪物行动' });
  if (state.phase === 'battle_end') out.push({ type: 'REWARD_OPTIONS', label: '生成奖励候选', defaultPayload: { poolId: 'reward_pT1', count: 3 } });
  if (state.rewards && state.rewards.length) for (let i = 0; i < state.rewards.length; i++) out.push({ type: 'PICK_REWARD', label: `选择奖励${i + 1}`, defaultPayload: { index: i } });
  if (state.phase !== 'shop' && state.phase !== 'day_end') out.push({ type: 'ENTER_SHOP', label: '进入夜晚商店', defaultPayload: { poolId: 'night_base', slots: 6 } });
  out.push({ type: 'RUN_BATTLE', label: '自动完成战斗' });
  out.push({ type: 'RUN_FULL_DAY', label: '一键完整流程' });
  out.push({ type: 'SETUP_DAY7_FIRE_TRIAL', label: '第7天火核心试炼' });
  if (state.day7Trial && !state.day7Trial.round1Executed) out.push({ type: 'RUN_DAY7_FIRE_TURN_1', label: '执行第7天第1回合' });
  if (state.day7Trial && state.day7Trial.status !== 'trial_pass') out.push({ type: 'RUN_DAY7_FIRE_TRIAL_ALL', label: '自动执行到试炼通过' });
  if (state.phase === 'shop') {
    out.push({ type: 'ROLL_SHOP', label: '刷新商店', defaultPayload: { slots: 6 } });
    for (const offer of state.shop.offers || []) {
      out.push({ type: offer.frozen ? 'UNFREEZE_OFFER' : 'FREEZE_OFFER', label: `${offer.frozen ? '解冻' : '冻结'} ${offer.name}`, defaultPayload: { offerId: offer.offerId } });
      out.push({ type: 'BUY_OFFER', label: `购买 ${offer.name}`, defaultPayload: { offerId: offer.offerId } });
    }
    for (const evt of shop.availableEvents(state)) out.push({ type: 'APPLY_SHOP_EVENT', label: `商店事件：${evt.name}`, defaultPayload: { eventId: evt.id } });
    out.push({ type: 'EXIT_SHOP', label: '离开商店' });
  }
  return out;
}
function buildViewModelForPlayer(state, playerId = 'p1', playerViewState = makePlayerViewState()) {
  const selected = selectedFromViewState(playerViewState);
  const board = makeBoardVM(state, selected);
  const heroes = state.units.filter(u => u.side === 'hero' && isUnitVisibleInParty(state, u)).map(u => stripUnit(state, u));
  const enemies = state.units.filter(u => u.side === 'enemy' && u.alive !== false && u.hp > 0).map(u => stripUnit(state, u));
  const leaders = {
    player: state.leaders?.player ? stripUnit(state, state.leaders.player) : null,
    enemy: state.leaders?.enemy ? stripUnit(state, state.leaders.enemy) : null
  };
  const offers = (state.shop.offers || []).map(stripOffer);
  const rewards = (state.rewards || []).map(stripReward);
  return {
    meta: dataSummary(state),
    battleId: state.battleId,
    mode: state.mode || 'solo',
    stateVersion: state.stateVersion || 0,
    stateHash: stateHash(state),
    players: clone(state.players || {}),
    teams: clone(state.teams || {}),
    turn: clone(state.turn || {}),
    localPrediction: { ready: true, serverAuthoritative: true, commandEnvelope: true },
    commandLog: clone((state.commandLog || []).slice(-20)),
    phase: state.phase,
    day: state.day,
    period: state.period,
    round: state.round,
    maxRounds: state.maxRounds,
    gold: state.gold,
    castleLine: state.castleLine,
    economyMultiplier: state.economyMultiplier,
    result: state.result ? clone(state.result) : null,
	    selected,
	    teamPlacementPreview: teamPlacementPreviewVM(state, board.previewGrid),
	    playerId,
    playerViewState: { selected, recentUiEvents: clone((playerViewState.recentUiEvents || []).slice(-10)) },
    leaders,
    heroes,
    enemies,
	    board,
    inventory: inventoryVM(state),
    relics: clone(state.relics),
    rewards,
    shop: {
      activePool: state.shop.activePool,
      rollCount: state.shop.rollCount,
      freeRolls: state.shop.freeRolls,
      nextDiscount: state.shop.nextDiscount,
      offers,
      events: shop.availableEvents(state).map(e => ({ id: e.id, name: e.name, optionText: e.optionText, costText: e.costText, gainText: e.gainText }))
    },
    monsterIntents: state.units.filter(u => u.side === 'enemy' && u.alive).map(u => battle.computeMonsterIntent(state, u)).filter(Boolean),
	    previewGrid: board.previewGrid,
    threatGrid: board.threatGrid,
    moveRiskGrid: board.moveRiskGrid,
    teamRiskGrid: board.teamRiskGrid,
    events: recentEvents(state),
    logs: logGroups(state),
    battleTrace: canonicalEventLog(state).map(e => ({ ...clone(e), step: e.step, type: e.type, text: e.text || e.type, round: e.round, phase: e.phase })),
    day7Trial: state.day7Trial ? clone(state.day7Trial.scenario || state.day7Trial) : null,
    nextActions: nextActions(state)
  };
}
function createViewModel(state, playerId = 'p1', playerViewState = makePlayerViewState()) { return buildViewModelForPlayer(state, playerId, playerViewState); }

function findInventoryEntry(state, petIdOrInstanceId) {
  if (!petIdOrInstanceId) return null;
  return state.inventory.find(x => x.instanceId === petIdOrInstanceId)
    || state.inventory.find(x => x.petId === petIdOrInstanceId && x.active === false)
    || state.inventory.find(x => x.petId === petIdOrInstanceId || `unit_${x.petId}` === petIdOrInstanceId)
    || null;
}
function runCompatibilityCommand(state, command, viewState = makePlayerViewState()) {
  switch (command.type) {
    case 'SELL_UNIT': {
      const petId = command.petId || command.instanceId || command.unitId;
      const inv = findInventoryEntry(state, petId);
      if (!inv) { pushEvent(state, 'SELL_UNIT_BLOCKED', { text: `出售失败：找不到单位 ${petId || ''}。` }); return false; }
      const refund = Math.max(1, Number(inv.level || 1));
      const before = state.gold;
      state.gold += refund;
      inv.count = Math.max(0, Number(inv.count || 1) - 1);
      const unit = findUnitForInventoryEntry(state, inv);
      if (unit) { unit.alive = false; unit.active = false; unit.position = null; }
      if (inv.count <= 0) state.inventory = state.inventory.filter(x => x !== inv);
      battle.syncDerivedBoard(state);
      pushEvent(state, 'SELL_UNIT', { petId: inv.petId, instanceId: inv.instanceId || null, refund, goldFrom: before, goldTo: state.gold, text: `出售 ${inv.petId}，金币${before}→${state.gold}。` });
      return true;
    }
    case 'TOGGLE_UNIT_ACTIVE': {
      const id = command.petId || command.instanceId || command.unitId;
      const inv = findInventoryEntry(state, id);
      if (!inv) { pushEvent(state, 'TOGGLE_UNIT_ACTIVE_BLOCKED', { unitId: id, text: `切换失败：找不到 ${id || '未知单位'}。` }); return false; }
      const currentlyActive = inv.active !== false;
      if (!currentlyActive) {
        const activeCount = (state.inventory || []).filter(x => x !== inv && x.active !== false).length;
        if (activeCount >= MAX_ACTIVE_UNITS) {
          pushEvent(state, 'TOGGLE_UNIT_ACTIVE_BLOCKED', { unitId: id, maxActive: MAX_ACTIVE_UNITS, text: `上阵失败：上场位已满 ${MAX_ACTIVE_UNITS}/${MAX_ACTIVE_UNITS}。` });
          return false;
        }
        let unit = findUnitForInventoryEntry(state, inv);
        if (!unit) unit = makeUnit(state, 'hero', inv.petId, { position: firstEmptyHeroCell(state) });
        const blockReason = activationBlockReason(unit);
        if (blockReason) {
          pushEvent(state, 'TOGGLE_UNIT_ACTIVE_BLOCKED', { unitId: id, petId: inv.petId, reason: blockReason, text: `上阵失败：${unit.displayName || unit.name} ${blockReason}。` });
          return false;
        }
        inv.active = true;
        if (!state.units.includes(unit)) {
          applyBattleStart(state, unit);
          state.units.push(unit);
          inv.instanceId = unit.id;
        }
        unit.active = true;
        unit.alive = true;
        if (!unit.position) unit.position = firstEmptyHeroCell(state);
        inv.slot = inv.slot || activeCount + 1;
      } else {
        inv.active = false;
        const unit = findUnitForInventoryEntry(state, inv);
        if (unit) { unit.active = false; unit.alive = false; unit.position = null; }
        if (viewState.selected && (viewState.selected.unitId === inv.instanceId || viewState.selected.unitId === id)) viewState.selected.unitId = null;
      }
      battle.syncDerivedBoard(state);
      pushEvent(state, 'TOGGLE_UNIT_ACTIVE', { unitId: id, active: inv.active !== false, text: `${inv.active !== false ? '上阵' : '下阵'}：${id || inv.petId}。` });
      return true;
    }
    case 'USE_ACTION_SLOT': {
      const unitId = command.unitId || command.heroId || viewState.selected?.unitId || null;
      pushEvent(state, 'USE_ACTION_SLOT', { slotId: command.slotId ?? command.index ?? 0, unitId, text: `UI兼容施放行动槽 ${Number(command.slotId ?? command.index ?? 0) + 1}。` });
      return coreDispatch(state, Object.assign({}, command, { type: 'USE_SLOT', unitId }));
    }
    case 'SET_SLOT_DIR': {
      const unitId = command.unitId || command.heroId || viewState.selected?.unitId || null;
      const dir = command.dir || command.direction || 'right';
      pushEvent(state, 'SET_SLOT_DIR', { slotId: command.slotId ?? command.index ?? 0, unitId, dir, text: `UI兼容方向按钮：槽 ${Number(command.slotId ?? command.index ?? 0) + 1} → ${dir}。` });
      return coreDispatch(state, Object.assign({}, command, { type: 'SET_ACTION_DIRECTION', unitId, dir }));
    }
    default:
      return undefined;
  }
}

function createSnapshot(state, playerId = 'p1', viewState = makePlayerViewState()) {
  const raw = clone(state);
  raw.indexes = { petsById: state.indexes.petsById.size, monstersByPetId: state.indexes.monstersByPetId.size, shopPools: state.indexes.shopPools.size, rewardPools: state.indexes.rewardPools.size };
  raw.dataSummary = dataSummary(state);
  raw.viewModel = buildViewModelForPlayer(state, playerId, viewState);
  return raw;
}
function mapPublicEvents(events) {
  return (events || []).map(e => ({
    eventId: e.eventId,
    seq: e.seq,
    step: e.step,
    type: e.type,
    text: e.text || e.type,
    round: e.round,
    phase: e.phase,
    commandId: e.commandId,
    playerId: e.playerId,
    teamId: e.teamId
  }));
}
function runSelectionCommand(state, command, viewState) {
  viewState.selected = viewState.selected || { unitId: null, slotId: null, cell: null, direction: 'right' };
  let event;
  if (command.type === 'SELECT_HERO' || command.type === 'SELECT_UNIT') {
    viewState.selected.unitId = command.unitId || command.heroId || command.id || null;
    viewState.selected.slotId = null;
    event = makeUiEvent(state, command, 'SELECT_UNIT', { unitId: viewState.selected.unitId, text: `选择单位：${viewState.selected.unitId || '无'}。` });
  } else if (command.type === 'SELECT_CELL') {
    viewState.selected.cell = { r: Number(command.r ?? command.row ?? command.cell?.r ?? 0), c: Number(command.c ?? command.col ?? command.cell?.c ?? 0) };
    event = makeUiEvent(state, command, 'SELECT_CELL', { cell: clone(viewState.selected.cell), text: `选择格子：R${viewState.selected.cell.r}C${viewState.selected.cell.c}。` });
  } else if (command.type === 'SELECT_SLOT') {
    if (command.unitId || command.heroId) viewState.selected.unitId = command.unitId || command.heroId;
    viewState.selected.slotId = Number(command.slotId ?? command.index ?? 0);
    event = makeUiEvent(state, command, 'SELECT_SLOT', { slotId: viewState.selected.slotId, unitId: viewState.selected.unitId, text: `选择行动槽：${viewState.selected.slotId + 1}。` });
  }
  if (event) rememberUiEvent(viewState, event);
  return event ? [event] : [];
}

function viewStatesToObject(viewStates) {
  const out = {};
  for (const [playerId, viewState] of viewStates.entries()) out[playerId] = clone(viewState);
  return out;
}
function restoreViewStates(viewStates, raw) {
  viewStates.clear();
  const obj = raw && typeof raw === 'object' ? raw : {};
  for (const [playerId, viewState] of Object.entries(obj)) viewStates.set(playerId, Object.assign(makePlayerViewState(), clone(viewState)));
}

function createYSBZSUIAdapter(options = {}) {
  const state = ensureMultiplayerState(createGameState(options), options);
  const viewStates = new Map();
  const defaultPlayerId = options.playerId || 'p1';
  function viewStateFor(commandOrPlayerId) {
    const playerId = typeof commandOrPlayerId === 'string' ? commandOrPlayerId : (commandOrPlayerId && commandOrPlayerId.playerId) || defaultPlayerId;
    return getPlayerViewState(viewStates, playerId);
  }
  function viewFor(commandOrPlayerId) {
    const playerId = typeof commandOrPlayerId === 'string' ? commandOrPlayerId : (commandOrPlayerId && commandOrPlayerId.playerId) || defaultPlayerId;
    return buildViewModelForPlayer(state, playerId, viewStateFor(playerId));
  }
  const adapter = {
    version: '2026-06-09-command-envelope-local-prediction-ready-round4',
    publicCommands: PUBLIC_COMMANDS.slice(),
    run(typeOrCommand, payload = {}) {
      const normalized = normalizeCommand(typeOrCommand, payload);
      assertKnownCommand(normalized);
      const command = normalizeCommandEnvelope(normalized, state, { playerId: options.playerId, strictVersion: false });
      const viewState = viewStateFor(command);
      try {
        validateCommandAuthority(state, command, { strictVersion: !!options.strictVersion, allowDebugCommands: !!options.allowDebugCommands });
      } catch (err) {
        const rejected = rejectedCommandResult(state, command, err);
        rejected.viewModel = viewFor(command);
        return rejected;
      }

      if (UI_SELECTION_COMMANDS.includes(command.type)) {
        const events = mapPublicEvents(runSelectionCommand(state, command, viewState));
        const hash = stateHash(state);
        return {
          ok: true,
          accepted: true,
          ephemeral: true,
          command: commandText(command),
          commandEnvelope: clone(command),
          stateVersion: state.stateVersion || 0,
          stateHash: hash,
          result: true,
          events,
          trace: { id: `${state.battleId}:${command.commandId}:ui`, commandId: command.commandId, events },
          authoritativeState: createSnapshot(state, command.playerId, viewState),
          viewModel: viewFor(command)
        };
      }

      if (READ_ONLY_COMMANDS.includes(command.type)) {
        const beforeHash = stateHash(state);
        const result = coreDispatch(state, command);
        return {
          ok: true,
          accepted: true,
          readOnly: true,
          command: commandText(command),
          commandEnvelope: clone(command),
          stateVersion: state.stateVersion || 0,
          stateHash: beforeHash,
          result: result === undefined ? true : clone(result),
          events: [],
          trace: { id: `${state.battleId}:${command.commandId}:read`, commandId: command.commandId, events: [] },
          authoritativeState: createSnapshot(state, command.playerId, viewState),
          viewModel: viewFor(command)
        };
      }

      if (command.type === 'RUN_PLAYER_ALL_OUT') {
        const rollbackSave = buildSaveDocument(state, { playerId: command.playerId, gameVersion: adapter.version, viewStates: viewStatesToObject(viewStates) });
        try {
          const beforeStep = state.nextStep;
          const beforeHash = stateHash(state);
          const blocked = new Set();
          const attempts = [];
          let count = 0;
          let guard = 0;
          while (state.phase === 'player_turn' && guard < 40) {
            guard++;
            const info = nextAllOutSlot(viewFor(command), blocked);
            if (!info) break;
            const requestedAp = Number(command.apBySlot?.[info.key] || 1);
            const result = coreDispatch(state, {
              type: 'USE_SLOT',
              commandId: `${command.commandId || 'all_out'}_${String(guard).padStart(2, '0')}`,
              playerId: command.playerId,
              battleId: command.battleId,
              unitId: info.hero.id,
              slotId: info.slotId,
              cell: null,
              ap: Math.max(1, requestedAp)
            });
            attempts.push({ unitId: info.hero.id, unitName: info.hero.name, slotId: info.slotId, accepted: result !== false });
            if (result === false) {
              blocked.add(info.key);
            } else {
              count++;
            }
          }
          const events = state.events.filter(e => e.step >= beforeStep);
          annotateEvents(state, events, command);
          const logEntry = commitAcceptedCommand(state, command, beforeHash, { count, attempts, guard }, events);
          const mappedEvents = mapPublicEvents(events);
          return {
            ok: true,
            accepted: true,
            flowCommand: true,
            command: commandText(command),
            commandEnvelope: clone(command),
            stateVersion: state.stateVersion,
            stateHash: logEntry.afterHash,
            result: { count, attempts, guard },
            events: mappedEvents,
            trace: { id: `${state.battleId}:${command.commandId}:all-out`, commandId: command.commandId, events: mappedEvents },
            authoritativeState: createSnapshot(state, command.playerId, viewState),
            viewModel: viewFor(command)
          };
        } catch (err) {
          applySaveToState(state, ensureMultiplayerState(createGameState(options), options), rollbackSave);
          restoreViewStates(viewStates, rollbackSave.viewStates || {});
          const rejected = rejectedCommandResult(state, command, err);
          rejected.rolledBack = true;
          rejected.viewModel = viewFor(command);
          return rejected;
        }
      }

      if (command.type === 'RUN_FULL_DAY') {
        const rollbackSave = buildSaveDocument(state, { playerId: command.playerId, gameVersion: adapter.version, viewStates: viewStatesToObject(viewStates) });
        try {
          const beforeIds = new Set((state.battleTrace || []).map(e => e.eventId || `${e.step}:${e.type}`));
          const result = this.runFullPlayerDayFlow(command.playerId);
          const events = mapPublicEvents((state.battleTrace || []).filter(e => !beforeIds.has(e.eventId || `${e.step}:${e.type}`)));
          const hash = stateHash(state);
          return {
            ok: true,
            accepted: true,
            flowCommand: true,
            command: commandText(command),
            commandEnvelope: clone(command),
            stateVersion: state.stateVersion || 0,
            stateHash: hash,
            result: clone(result),
            events,
            trace: { id: `${state.battleId}:${command.commandId}:flow`, commandId: command.commandId, events },
            authoritativeState: createSnapshot(state, command.playerId, viewState),
            viewModel: viewFor(command)
          };
        } catch (err) {
          applySaveToState(state, ensureMultiplayerState(createGameState(options), options), rollbackSave);
          restoreViewStates(viewStates, rollbackSave.viewStates || {});
          const rejected = rejectedCommandResult(state, command, err);
          rejected.rolledBack = true;
          rejected.viewModel = viewFor(command);
          return rejected;
        }
      }

      const rollbackSave = buildSaveDocument(state, { playerId: command.playerId, gameVersion: adapter.version, viewStates: viewStatesToObject(viewStates) });
      try {
        const beforeStep = state.nextStep;
        const beforeHash = stateHash(state);
        let result;
        const compatResult = runCompatibilityCommand(state, command, viewState);
        result = compatResult === undefined ? coreDispatch(state, command) : compatResult;
        const events = state.events.filter(e => e.step >= beforeStep);
        annotateEvents(state, events, command);
        const logEntry = commitAcceptedCommand(state, command, beforeHash, result, events);
        const mappedEvents = mapPublicEvents(events);
        return {
          ok: true,
          accepted: true,
          command: commandText(command),
          commandEnvelope: clone(command),
          stateVersion: state.stateVersion,
          stateHash: logEntry.afterHash,
          result: result === undefined ? true : clone(result),
          events: mappedEvents,
          trace: { id: `${state.battleId}:${command.commandId}`, commandId: command.commandId, events: mappedEvents },
          authoritativeState: createSnapshot(state, command.playerId, viewState),
          viewModel: viewFor(command)
        };
      } catch (err) {
        applySaveToState(state, ensureMultiplayerState(createGameState(options), options), rollbackSave);
        restoreViewStates(viewStates, rollbackSave.viewStates || {});
        const rejected = rejectedCommandResult(state, command, err);
        rejected.rolledBack = true;
        rejected.viewModel = viewFor(command);
        return rejected;
      }
    },
    startBattle() { return this.run('START_BATTLE'); },
    startNextRound() { return this.run('START_NEXT_ROUND'); },
    moveHero(unitId, to) { return this.run('MOVE_HERO', { unitId, to }); },
    setActionDirection(unitId, slotId, dir) { return this.run('SET_ACTION_DIRECTION', { unitId, slotId, dir }); },
    setSlotDir(slotId, dir) { return this.run('SET_SLOT_DIR', { slotId, dir }); },
    useSlot(unitId, slotId, cell) { return this.run('USE_SLOT', { unitId, slotId, cell }); },
    useActionSlot(slotId) { return this.run('USE_ACTION_SLOT', { slotId }); },
    endPlayerTurn() { return this.run('END_PLAYER_TURN'); },
    runMonsterTurn() { return this.run('RUN_MONSTER_TURN'); },
    buildPreview(payload = {}) { return this.run('BUILD_PREVIEW', payload); },
    getCellDetail(r, c) { return this.run('GET_CELL_DETAIL', { r, c }); },
    exportBattleTrace() { return this.run('EXPORT_BATTLE_TRACE'); },
    replayBattleTrace(events) { return this.run('REPLAY_BATTLE_TRACE', { events }); },
    runBattle() { return this.run('RUN_BATTLE'); },
    runPlayerAllOut(apBySlot = {}) { return this.run('RUN_PLAYER_ALL_OUT', { apBySlot }); },
    rewardOptions(poolId = 'reward_pT1', count = 3) { return this.run('REWARD_OPTIONS', { poolId, count }); },
    pickReward(index = 0) { return this.run('PICK_REWARD', { index }); },
    enterShop(poolId = 'night_base', slots = 6) { return this.run('ENTER_SHOP', { poolId, slots }); },
    rollShop(options = {}) { return this.run('ROLL_SHOP', options); },
    freezeOffer(offerId) { return this.run('FREEZE_OFFER', { offerId }); },
    unfreezeOffer(offerId) { return this.run('UNFREEZE_OFFER', { offerId }); },
    buyOffer(offerId) { return this.run('BUY_OFFER', { offerId }); },
    applyShopEvent(eventId) { return this.run('APPLY_SHOP_EVENT', { eventId }); },
    exitShop() { return this.run('EXIT_SHOP'); },
    runFullDay() { return this.run('RUN_FULL_DAY'); },
    sellUnit(instanceId) { return this.run('SELL_UNIT', { instanceId }); },
    toggleUnitActive(instanceId) { return this.run('TOGGLE_UNIT_ACTIVE', { instanceId }); },
    selectUnit(unitId) { return this.run('SELECT_UNIT', { unitId }); },
    selectHero(heroId) { return this.run('SELECT_HERO', { heroId }); },
    selectCell(r, c) { return this.run('SELECT_CELL', { r, c }); },
    selectSlot(slotId) { return this.run('SELECT_SLOT', { slotId }); },
    runFullPlayerDayFlow(playerId = defaultPlayerId) {
      if (state.phase === 'init') this.run({ type: 'START_BATTLE', playerId });
      this.run({ type: 'RUN_BATTLE', playerId });
      this.run({ type: 'REWARD_OPTIONS', playerId, poolId: 'reward_pT1', count: 3 });
      this.run({ type: 'PICK_REWARD', playerId, index: 0 });
      this.run({ type: 'ENTER_SHOP', playerId, poolId: 'night_base', slots: 6 });
      const first = state.shop.offers[0];
      if (first) this.run({ type: 'FREEZE_OFFER', playerId, offerId: first.offerId });
      this.run({ type: 'ROLL_SHOP', playerId, slots: 6 });
      const affordable = state.shop.offers.find(o => o.price <= state.gold);
      if (affordable) this.run({ type: 'BUY_OFFER', playerId, offerId: affordable.offerId });
      const evt = shop.availableEvents(state)[0];
      if (evt) this.run({ type: 'APPLY_SHOP_EVENT', playerId, eventId: evt.id });
      this.run({ type: 'EXIT_SHOP', playerId });
      return this.getViewModel(playerId);
    },
    getViewModel(playerId = defaultPlayerId) { return viewFor(playerId); },
    getStateSnapshot(playerId = defaultPlayerId) { return createSnapshot(state, playerId, viewStateFor(playerId)); },
    getEvents(filter = {}) { return state.events.filter(e => !filter.type || e.type === filter.type).filter(e => !filter.sinceStep || e.step >= filter.sinceStep).map(e => clone(e)); },
    getChanges() { return clone(state.changes); },
    getReplay() { return this.run('EXPORT_REPLAY'); },
    exportReplay() { return this.run('EXPORT_REPLAY'); },
    getTextReport(mode = 'player') { if (mode === 'shop') return renderShopReport(state); if (mode === 'debug') return JSON.stringify(this.getStateSnapshot(), null, 2); return renderPlayerReport(state); },
    getDataSummary() { return dataSummary(state); },
    getShopPools() { return Array.from(state.indexes.shopPools.keys()).sort(); },
    getRewardPools() { return Array.from(state.indexes.rewardPools.keys()).sort(); },
    getAvailableShopEvents() { return shop.availableEvents(state).map(e => clone(e)); },
    getEnabledShopItems(poolId = 'night_base') { return shop.enabledShopItems(state, poolId).map(i => clone(i)); },
    getPlayerViewState(playerId = defaultPlayerId) { return clone(viewStateFor(playerId)); },
    exportSave(playerId = defaultPlayerId, meta = {}) {
      return buildSaveDocument(state, Object.assign({}, meta, { playerId, gameVersion: adapter.version, viewStates: viewStatesToObject(viewStates) }));
    },
    importSave(saveDoc, playerId = defaultPlayerId) {
      assertSaveDocument(saveDoc);
      const fresh = ensureMultiplayerState(createGameState(options), options);
      applySaveToState(state, fresh, saveDoc);
      restoreViewStates(viewStates, saveDoc.viewStates || {});
      viewStateFor(playerId);
      return { ok: true, accepted: true, imported: true, stateVersion: state.stateVersion || 0, stateHash: stateHash(state), viewModel: viewFor(playerId) };
    },
    setupDay7FireTrial() { return this.run('SETUP_DAY7_FIRE_TRIAL'); },
    runDay7FireTurn1() { return this.run('RUN_DAY7_FIRE_TURN_1'); },
    runDay7FireTrialAll() { return this.run('RUN_DAY7_FIRE_TRIAL_ALL'); }
  };
  return adapter;
}

module.exports = { createYSBZSUIAdapter, createViewModel, buildViewModelForPlayer, PUBLIC_COMMANDS };
