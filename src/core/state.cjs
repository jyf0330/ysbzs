const { loadGameData, buildIndexes } = require('./data.cjs');
const { applyBattleStart } = require('./mechanics.cjs');
const { ACTIVE_ELEMENTS, COMPAT_ELEMENTS, makeEmptyElements, makeEmptyElementCamps } = require('./elements.cjs');
const { makeUnitFromData } = require('./unitFactory.cjs');

const BOARD_ROWS = 8;
const BOARD_COLS = 8;
const ELEMENTS = COMPAT_ELEMENTS;  // 保留土兼容，但主流程走 ACTIVE_ELEMENTS

function cellKey(r, c) { return `${Number(r)},${Number(c)}`; }
function clone(value) { return JSON.parse(JSON.stringify(value)); }
function normalizePosition(position, fallback = { r: 0, c: 0 }) {
  if (!position) return clone(fallback);
  if (typeof position.r !== 'undefined' || typeof position.c !== 'undefined') return { r: Number(position.r ?? fallback.r), c: Number(position.c ?? fallback.c) };
  if (typeof position.row !== 'undefined' || typeof position.col !== 'undefined') return { r: Number(position.row ?? fallback.r), c: Number(position.col ?? fallback.c) };
  if (typeof position.x !== 'undefined' || typeof position.y !== 'undefined') return { r: Number(position.y ?? fallback.r), c: Number(position.x ?? fallback.c) };
  return clone(fallback);
}
function makeEmptyTerrain() { return { modules: [] }; }
function createBoard(rows = BOARD_ROWS, cols = BOARD_COLS) {
  const cells = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      cells.push({ r, c, key: cellKey(r, c), unitId: null, unitSide: null, unitName: null, terrain: makeEmptyTerrain(), elements: makeEmptyElements(), elementCamps: makeEmptyElementCamps(), preview: null, threat: null, logs: [] });
    }
  }
  return { rows, cols, cells };
}
function getCell(state, r, c) {
  ensureBoard(state);
  return state.board.cells.find(x => x.r === Number(r) && x.c === Number(c)) || null;
}
function clearUnitLayer(state) {
  ensureBoard(state);
  for (const cell of state.board.cells) {
    cell.unitId = null;
    cell.unitSide = null;
    cell.unitName = null;
    cell.leaderId = null;
  }
}
function leaderList(state) {
  return state && state.leaders ? [state.leaders.player, state.leaders.enemy].filter(Boolean) : [];
}
function syncBoardUnits(state) {
  ensureBoard(state);
  clearUnitLayer(state);
  for (const unit of state.units || []) {
    if (!unit.alive || !unit.position) continue;
    const p = normalizePosition(unit.position);
    if (p.r < 0 || p.c < 0 || p.r >= state.board.rows || p.c >= state.board.cols) continue;
    unit.position = p;
    const cell = getCell(state, p.r, p.c);
    if (cell) {
      cell.unitId = unit.id;
      cell.unitSide = unit.side;
      cell.unitName = unit.name;
    }
  }
  for (const leader of leaderList(state)) {
    if (!leader || leader.alive === false || !leader.position || leader.hp <= 0) continue;
    const p = normalizePosition(leader.position);
    if (p.r < 0 || p.c < 0 || p.r >= state.board.rows || p.c >= state.board.cols) continue;
    leader.position = p;
    const cell = getCell(state, p.r, p.c);
    if (cell && !cell.unitId) {
      cell.unitId = leader.id;
      cell.unitSide = leader.side;
      cell.unitName = leader.name;
      cell.leaderId = leader.id;
    }
  }
  return state.board;
}
function ensureBoard(state) {
  if (!state.board || !Array.isArray(state.board.cells)) state.board = createBoard();
  return state.board;
}
function isCellEmpty(state, r, c) {
  const cell = getCell(state, r, c);
  return !!cell && !cell.unitId;
}
function placeUnit(state, unit, position) {
  ensureBoard(state);
  const p = normalizePosition(position, unit.position || { r: 0, c: 0 });
  if (p.r < 0 || p.c < 0 || p.r >= state.board.rows || p.c >= state.board.cols) throw new Error(`position out of board: R${p.r}C${p.c}`);
  unit.position = p;
  syncBoardUnits(state);
  return p;
}
function defaultHeroPosition(index) {
  const rows = [5, 4, 6, 3, 2, 7, 1, 0];
  return { r: rows[index % rows.length], c: Math.floor(index / rows.length) + 1 };
}
function defaultEnemyPosition(state, index = 0) {
  return { r: (Number(state.round || 1) + index * 2) % BOARD_ROWS, c: BOARD_COLS - 2 + (index % 2) };
}
function positionFromWaveRule(state, rule, index = 0) {
  if (!rule) return defaultEnemyPosition(state, index);
  const text = String(rule);
  const m = text.match(/R\s*(\d+)\s*C\s*(\d+)/i);
  if (m) return { r: Math.max(0, Math.min(BOARD_ROWS - 1, Number(m[1]))), c: Math.max(0, Math.min(BOARD_COLS - 1, Number(m[2]))) };
  if (/right|右|enemy|城堡|后排/.test(text)) return defaultEnemyPosition(state, index);
  if (/top|上/.test(text)) return { r: 0, c: BOARD_COLS - 2 - (index % 2) };
  if (/bottom|下/.test(text)) return { r: BOARD_ROWS - 1, c: BOARD_COLS - 2 - (index % 2) };
  return defaultEnemyPosition(state, index);
}
function normalizeMechanics(list) {
  if (!list) return ['none'];
  if (Array.isArray(list)) return list.length ? list : ['none'];
  return String(list).split(',').map(x => x.trim()).filter(Boolean);
}
function makeLeader(side, overrides = {}) {
  const isPlayer = side === 'player';
  const hp = overrides.hp || 80;
  return {
    id: overrides.id || (isPlayer ? 'player_hero' : 'enemy_boss'),
    type: isPlayer ? 'hero' : 'boss',
    side: isPlayer ? 'hero_leader' : 'boss',
    camp: side,
    name: overrides.name || (isPlayer ? '我方英雄' : '敌方Boss'),
    displayName: overrides.displayName || (isPlayer ? '我方英雄' : '敌方Boss'),
    hp,
    maxHp: overrides.maxHp || hp,
    atk: overrides.atk || 0,
    def: overrides.def || 0,
    shield: overrides.shield || 0,
    element: overrides.element || null,
    elements: Object.assign(makeEmptyElements(), overrides.elements || {}),
    position: normalizePosition(overrides.position || (isPlayer ? { r: BOARD_ROWS - 1, c: 0 } : { r: 0, c: BOARD_COLS - 1 })),
    alive: overrides.alive !== false,
    flags: {},
    roundDamageTaken: 0,
    mechanics: normalizeMechanics(overrides.mechanics || ['none']),
    mechanicParams: overrides.mechanicParams || {}
  };
}
function makeUnit(state, side, petId, override = {}) {
  const pos = override.position && override.position.rule
    ? positionFromWaveRule(state, override.position.rule, override.position.index || 0)
    : override.position || (side === 'enemy' ? { r: 5, c: 3 } : null);

  // 通过 unitFactory 创建，确保字段统一
  const unit = makeUnitFromData(state, side, petId, Object.assign({}, override, {
    position: pos,
    mechanics: normalizeMechanics(override.mechanics || []),
    flags: { ...(override.flags || {}), legacyMakeUnit: true }
  }));
  return unit;
}
function initialPartyFromData(d) {
  const rows = d.initialSetup && Array.isArray(d.initialSetup.playerParty) ? d.initialSetup.playerParty : [];
  return rows.length ? rows : [
    { petId: 'pal_005', position: { r: 6, c: 1 } },
    { petId: 'pal_006', position: { r: 5, c: 1 } },
    { petId: 'pal_001', position: { r: 6, c: 2 } },
    { petId: 'pal_038', position: { r: 5, c: 2 } }
  ];
}
function createGameState(opts = {}) {
  const loadedData = opts.data || loadGameData(opts.dataOptions || {});
  const indexes = buildIndexes(loadedData);
  const state = {
    data: loadedData,
    indexes,
    phase: 'init',
    day: opts.day || 1,
    period: opts.period || '上午',
    round: 0,
    maxRounds: opts.maxRounds || 10,
    gold: opts.gold ?? 3,
    castleLine: 10,
    economyMultiplier: 1,
    leaders: {
      player: makeLeader('player', opts.playerLeader || {}),
      enemy: makeLeader('enemy', opts.enemyLeader || {})
    },
    factionRules: {
      player: { leaderType: 'hero', moveMode: 'infinite', terrainFormThreshold: 3, explosionThreshold: 3, showElementGeneration: true },
      enemy: { leaderType: 'boss', moveMode: 'stat_ap', terrainFormThreshold: 99, explosionThreshold: 99, showElementGeneration: false }
    },
    nextStep: 1,
    nextUnit: 1,
    events: [],
    changes: [],
    units: [],
    inventory: [],
    relics: [],
    shop: { offers: [], frozen: {}, rollCount: 0, freeRolls: 0, nextDiscount: 0, activePool: 'night_base' },
    rewards: [],
    result: null,
    selected: { unitId: null, slotId: null, cell: null, direction: 'right' },
    actionDirs: {},
    battleTrace: [],
    board: createBoard()
  };
  const active = opts.activePets ? opts.activePets.map((petId, i) => ({ petId, position: defaultHeroPosition(i), slot: i + 1 })) : initialPartyFromData(loadedData);
  for (let i = 0; i < active.length; i++) {
    const row = active[i];
    const pid = typeof row === 'string' ? row : row.petId;
    const position = typeof row === 'string' ? defaultHeroPosition(i) : (row.position || defaultHeroPosition(i));
    const u = makeUnit(state, 'hero', pid, { position });
    state.units.push(u);
    state.inventory.push({ petId: pid, count: 1, level: 1, active: true, instanceId: u.id, slot: row.slot || i + 1 });
  }
  for (const u of state.units) applyBattleStart(state, u);
  syncBoardUnits(state);
  return state;
}
module.exports = { createGameState, makeUnit, createBoard, ensureBoard, getCell, syncBoardUnits, placeUnit, isCellEmpty, normalizePosition, positionFromWaveRule, defaultEnemyPosition, cellKey, ELEMENTS, BOARD_ROWS, BOARD_COLS, makeEmptyElements, makeEmptyElementCamps, makeEmptyTerrain, makeLeader };
