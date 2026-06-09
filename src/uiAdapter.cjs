const { createGameState } = require('./core/state.cjs');
const { dispatch: coreDispatch } = require('./core/reducer.cjs');
const battle = require('./core/battle.cjs');
const shop = require('./core/shop.cjs');
const { renderPlayerReport, renderShopReport } = require('./render/textReport.cjs');
const { pushEvent } = require('./core/events.cjs');

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

function clone(value) { return JSON.parse(JSON.stringify(value)); }
function commandText(command) { return typeof command === 'string' ? command : command.type; }
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
    role: unit.role,
    hp: unit.hp,
    maxHp: unit.maxHp,
    atk: unit.atk,
    def: unit.def,
    shield: unit.shield,
    ap: unit.ap,
    alive: unit.alive,
    position: unit.position || null,
    elements: Object.assign({ 火: 0, 水: 0, 风: 0, 土: 0 }, unit.elements || {}),
    mechanics: unit.mechanics || [],
    shape: unit.shape ? {
      shapeId: unit.shape.shapeId,
      shapeName: unit.shape.shapeName,
      shapeClass: unit.shape.shapeClass,
      hitCells: unit.shape.hitCells,
      slotCount: unit.shape.slotCount,
      slotElements: unit.shape.slotElements
    } : null,
    slots: unit.side === 'hero' ? slotsForVM(state, unit) : []
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
function boardElementsForVM(state, cell) {
  const out = clone(cell.elements || {});
  const camps = cell.elementCamps || {};
  for (const el of Object.keys(out)) {
    const camp = camps[el];
    if (camp && battle.factionRules(state, camp).showElementGeneration === false) out[el] = 0;
  }
  return out;
}
function makeBoardVM(state) {
  battle.syncDerivedBoard(state);
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
      preview: clone(cell.preview),
      threat: clone(cell.threat)
    })),
    previewGrid: battle.buildPreviewGrid(state),
    threatGrid: battle.buildThreatGrid(state)
  };
}
function inventoryVM(state) {
  const items = (state.inventory || []).map(x => clone(x));
  return { items, active: items.filter(x => x.active !== false), bench: items.filter(x => x.active === false) };
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
  return state.events.slice(-n).map(e => ({ step: e.step, round: e.round, phase: e.phase, type: e.type, text: e.text || e.type }));
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
function createViewModel(state) {
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
    phase: state.phase,
    day: state.day,
    period: state.period,
    round: state.round,
    maxRounds: state.maxRounds,
    gold: state.gold,
    castleLine: state.castleLine,
    economyMultiplier: state.economyMultiplier,
    result: state.result ? clone(state.result) : null,
    selected: clone(state.selected || {}),
    leaders,
    heroes,
    enemies,
    board: makeBoardVM(state),
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
    previewGrid: battle.buildPreviewGrid(state),
    threatGrid: battle.buildThreatGrid(state),
    events: recentEvents(state),
    logs: logGroups(state),
    battleTrace: [...(state.battleTrace || []), ...(state.events || [])]
      .filter((e, i, arr) => arr.findIndex(x => (x.eventId || `legacy_${x.step}_${x.type}`) === (e.eventId || `legacy_${e.step}_${e.type}`)) === i)
      .filter(e => /BATTLE|ROUND|PLAYER|MONSTER|DAMAGE|ELEMENT|SPAWN|MOVE|DEAD|DAY7|TRIAL|PACKET|MODIFIER|REPLACEMENT|CONVERT|CATALYST/.test(e.type))
      .map(e => ({ ...clone(e), step: e.step, type: e.type, text: e.text || e.type, round: e.round, phase: e.phase })),
    day7Trial: state.day7Trial ? clone(state.day7Trial.scenario || state.day7Trial) : null,
    nextActions: nextActions(state)
  };
}
function findInventoryEntry(state, petIdOrInstanceId) {
  if (!petIdOrInstanceId) return null;
  return state.inventory.find(x => x.petId === petIdOrInstanceId || `unit_${x.petId}` === petIdOrInstanceId || x.instanceId === petIdOrInstanceId) || null;
}
function runCompatibilityCommand(state, command) {
  switch (command.type) {
    case 'SELL_UNIT': {
      const petId = command.petId || command.instanceId || command.unitId;
      const inv = findInventoryEntry(state, petId);
      if (!inv) { pushEvent(state, 'SELL_UNIT_BLOCKED', { text: `出售失败：找不到单位 ${petId || ''}。` }); return false; }
      const refund = Math.max(1, Number(inv.level || 1));
      const before = state.gold;
      state.gold += refund;
      inv.count = Math.max(0, Number(inv.count || 1) - 1);
      if (inv.count <= 0) state.inventory = state.inventory.filter(x => x !== inv);
      for (const u of state.units) if (u.id === inv.instanceId || u.petId === inv.petId) u.alive = false;
      battle.syncDerivedBoard(state);
      pushEvent(state, 'SELL_UNIT', { petId: inv.petId, goldFrom: before, goldTo: state.gold, text: `出售 ${inv.petId}，金币${before}→${state.gold}。` });
      return true;
    }
    case 'TOGGLE_UNIT_ACTIVE': {
      const id = command.petId || command.instanceId || command.unitId;
      const inv = findInventoryEntry(state, id);
      if (!inv) { pushEvent(state, 'TOGGLE_UNIT_ACTIVE_BLOCKED', { unitId: id, text: `切换失败：找不到 ${id || '未知单位'}。` }); return false; }
      inv.active = inv.active === false;
      const unit = findUnitForInventoryEntry(state, inv);
      if (unit) {
        unit.active = inv.active;
        unit.alive = inv.active;
        if (inv.active && !unit.position) unit.position = firstEmptyHeroCell(state);
      }
      battle.syncDerivedBoard(state);
      pushEvent(state, 'TOGGLE_UNIT_ACTIVE', { unitId: id, active: inv.active, text: `${inv.active ? '上阵' : '下阵'}：${id || inv.petId}。` });
      return true;
    }
    case 'USE_ACTION_SLOT': {
      pushEvent(state, 'USE_ACTION_SLOT', { slotId: command.slotId ?? command.index ?? 0, text: `UI兼容施放行动槽 ${Number(command.slotId ?? command.index ?? 0) + 1}。` });
      return coreDispatch(state, Object.assign({}, command, { type: 'USE_SLOT' }));
    }
    case 'SET_SLOT_DIR': {
      pushEvent(state, 'SET_SLOT_DIR', { slotId: command.slotId ?? command.index ?? 0, dir: command.dir || command.direction || 'right', text: `UI兼容方向按钮：槽 ${Number(command.slotId ?? command.index ?? 0) + 1} → ${command.dir || command.direction || 'right'}。` });
      return coreDispatch(state, Object.assign({}, command, { type: 'SET_ACTION_DIRECTION', dir: command.dir || command.direction }));
    }
    case 'SELECT_HERO':
    case 'SELECT_UNIT': {
      state.selected.unitId = command.unitId || command.heroId || command.id || null;
      pushEvent(state, 'SELECT_UNIT', { unitId: state.selected.unitId, text: `选择单位：${state.selected.unitId || '无'}。` });
      battle.syncDerivedBoard(state);
      return true;
    }
    case 'SELECT_CELL': {
      state.selected.cell = { r: Number(command.r ?? command.row ?? command.cell?.r ?? 0), c: Number(command.c ?? command.col ?? command.cell?.c ?? 0) };
      pushEvent(state, 'SELECT_CELL', { cell: state.selected.cell, text: `选择格子：R${state.selected.cell.r}C${state.selected.cell.c}。` });
      battle.syncDerivedBoard(state);
      return true;
    }
    case 'SELECT_SLOT': {
      state.selected.slotId = Number(command.slotId ?? command.index ?? 0);
      pushEvent(state, 'SELECT_SLOT', { slotId: state.selected.slotId, text: `选择行动槽：${state.selected.slotId + 1}。` });
      battle.syncDerivedBoard(state);
      return true;
    }
    default:
      return undefined;
  }
}
function createSnapshot(state) {
  const raw = clone(state);
  raw.indexes = { petsById: state.indexes.petsById.size, monstersByPetId: state.indexes.monstersByPetId.size, shopPools: state.indexes.shopPools.size, rewardPools: state.indexes.rewardPools.size };
  raw.dataSummary = dataSummary(state);
  raw.viewModel = createViewModel(state);
  return raw;
}
function createYSBZSUIAdapter(options = {}) {
  const state = createGameState(options);
  const adapter = {
    version: '2026-06-07-full-player-operation-adapter',
    publicCommands: PUBLIC_COMMANDS.slice(),
    run(typeOrCommand, payload = {}) {
      const command = normalizeCommand(typeOrCommand, payload);
      assertKnownCommand(command);
      const beforeStep = state.nextStep;
      let result;
      if (command.type === 'RUN_FULL_DAY') result = this.runFullPlayerDayFlow();
      else {
        const compatResult = runCompatibilityCommand(state, command);
        result = compatResult === undefined ? coreDispatch(state, command) : compatResult;
      }
      return { ok: true, command: commandText(command), result: result === undefined ? true : clone(result), events: state.events.filter(e => e.step >= beforeStep).map(e => ({ step: e.step, type: e.type, text: e.text || e.type, round: e.round, phase: e.phase })), viewModel: createViewModel(state) };
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
    runFullPlayerDayFlow() {
      if (state.phase === 'init') this.run('START_BATTLE');
      this.runBattle();
      this.rewardOptions('reward_pT1', 3);
      this.pickReward(0);
      this.enterShop('night_base', 6);
      const first = state.shop.offers[0];
      if (first) this.freezeOffer(first.offerId);
      this.rollShop({ slots: 6 });
      const affordable = state.shop.offers.find(o => o.price <= state.gold);
      if (affordable) this.buyOffer(affordable.offerId);
      const evt = shop.availableEvents(state)[0];
      if (evt) this.applyShopEvent(evt.id);
      this.exitShop();
      return this.getViewModel();
    },
    getViewModel() { return createViewModel(state); },
    getStateSnapshot() { return createSnapshot(state); },
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
    setupDay7FireTrial() { return this.run('SETUP_DAY7_FIRE_TRIAL'); },
    runDay7FireTurn1() { return this.run('RUN_DAY7_FIRE_TURN_1'); },
    runDay7FireTrialAll() { return this.run('RUN_DAY7_FIRE_TRIAL_ALL'); }
  };
  return adapter;
}
module.exports = { createYSBZSUIAdapter, createViewModel, PUBLIC_COMMANDS };
