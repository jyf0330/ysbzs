/**
 * 元素背包史 · 棋盘模块
 * 空间规则底座：坐标合法性、占用查询、格子上有什么
 * 依赖：G（全局状态）
 */

// ── 城堡 ──────────────────────────────────────────────────────
function playerCastleAt(pos) {
  if (!G.playerCastle || G.playerCastle.hp <= 0) return false;
  return G.playerCastle.pos.r === pos.r && G.playerCastle.pos.c === pos.c;
}

function enemyCastleAt(pos) {
  if (!G.enemyCastle || G.enemyCastle.hp <= 0) return false;
  return G.enemyCastle.pos.r === pos.r && G.enemyCastle.pos.c === pos.c;
}

function castleAt(pos) {
  return playerCastleAt(pos) || enemyCastleAt(pos);
}

// ── 单位查询 ──────────────────────────────────────────────────
function monAt(pos) {
  return (G.monsters || []).find(m => !m.dead && m.pos.r === pos.r && m.pos.c === pos.c);
}

function heroAt(pos) {
  return Object.values(G.heroes || {}).find(h => h.pos.r === pos.r && h.pos.c === pos.c);
}

function summonAt(pos) {
  if (!G.summons) return undefined;
  return G.summons.find(s => !s.dead && s.pos.r === pos.r && s.pos.c === pos.c);
}

// ── 格子合法性 ────────────────────────────────────────────────
function cellFree(pos) {
  return !monAt(pos) && !heroAt(pos) && !summonAt(pos)
    && pos.r >= 0 && pos.r < 8 && pos.c >= 0 && pos.c < 8;
}

function boardRows() { return G && G.board ? G.board.length : 8; }

function boardCols() { return G && G.board && G.board[0] ? G.board[0].length : 8; }

function inBoard(pos) {
  return pos && pos.r >= 0 && pos.r < boardRows() && pos.c >= 0 && pos.c < boardCols();
}

// ── 棋盘构建 ──────────────────────────────────────────────────
function mkBoard() {
  const b = [];
  for (let r = 0; r < 8; r++) {
    b[r] = [];
    for (let c = 0; c < 8; c++) b[r][c] = { r, c, el: null, stk: 0 };
  }
  return b;
}

// ========== 统一棋盘格状态 G.boardState ==========
// Core-only: boardState 是核心层唯一棋盘格状态源；旧 G.board/elementCells/terrainCells/实体数组为兼容桥接。
function boardStateKey(pos) { return pos.r + ',' + pos.c; }

function emptyBoardStateCell(r, c) {
  return {
    row: r, col: c,
    unitLayer: { occupant: null },
    terrainLayer: { terrainType: null, traps: [] },
    elementLayer: { fire: 0, water: 0, wind: 0, earth: 0 },
    meta: { updatedAtTurn: 0 }
  };
}

function initBoardState(rows, cols) {
  rows = rows || boardRows();
  cols = cols || boardCols();
  G.boardState = { schema: 'ysbzs.board.v1', rows: rows, cols: cols, turn: G.coreVersion || 0, cells: {} };
  for (var r = 0; r < rows; r++) {
    for (var c = 0; c < cols; c++) G.boardState.cells[r + ',' + c] = emptyBoardStateCell(r, c);
  }
  return G.boardState;
}

function ensureBoardState() {
  // boardState 必须由 initGame / replay / debug repair 显式初始化。
  // 普通读格子不得偷偷创建空 boardState，避免生成与真实 G 脱节的快照。
  if (!G || !G.boardState || !G.boardState.cells) return null;
  return G.boardState;
}

function getBoardStateCell(pos) {
  if (!pos) return null;
  var bs = ensureBoardState();
  return bs && bs.cells ? (bs.cells[boardStateKey(pos)] || null) : null;
}

function cloneBoardStateOccupant(type, entity, extra) {
  // occupant 只做索引，不存 name/hp/maxHp 等实体快照。真实数据从 G.heroes/G.monsters/G.summons/castle 读取。
  extra = extra || {};
  if (!entity && !extra.id) return null;
  var id = extra.id || (entity && entity.id) || null;
  var occ = { type: type, id: id };
  if (extra.side) occ.side = extra.side;
  return occ;
}

function setBoardStateUnit(pos, occupant) {
  var cell = getBoardStateCell(pos);
  if (!cell) return false;
  cell.unitLayer.occupant = occupant || null;
  cell.meta.updatedAtTurn = G.coreVersion || 0;
  return true;
}

function clearBoardStateUnit(pos, expectedType, expectedId) {
  var cell = getBoardStateCell(pos);
  if (!cell) return false;
  var occ = cell.unitLayer.occupant;
  if (!occ) return true;
  if (expectedType && occ.type !== expectedType) return false;
  if (expectedId && occ.id !== expectedId) return false;
  cell.unitLayer.occupant = null;
  cell.meta.updatedAtTurn = G.coreVersion || 0;
  return true;
}

function moveBoardStateUnit(from, to, occupant) {
  clearBoardStateUnit(from, occupant && occupant.type, occupant && occupant.id);
  setBoardStateUnit(to, occupant);
}

function setBoardStateElement(pos, el, layers) {
  var cell = getBoardStateCell(pos);
  if (!cell || !cell.elementLayer || !el) return false;
  cell.elementLayer[el] = Math.max(0, layers || 0);
  cell.meta.updatedAtTurn = G.coreVersion || 0;
  return true;
}

function clearBoardStateElement(pos, el) {
  var cell = getBoardStateCell(pos);
  if (!cell || !cell.elementLayer) return false;
  var elems = el ? [el] : ['fire', 'water', 'wind', 'earth'];
  elems.forEach(function(e) { cell.elementLayer[e] = 0; });
  cell.meta.updatedAtTurn = G.coreVersion || 0;
  return true;
}

function setBoardStateTerrainTraps(pos, traps) {
  var cell = getBoardStateCell(pos);
  if (!cell) return false;
  cell.terrainLayer.traps = (traps || []).filter(function(t) { return t && (t.layers || 0) > 0; });
  cell.meta.updatedAtTurn = G.coreVersion || 0;
  return true;
}

function addBoardStateTrap(pos, trap) {
  var cell = getBoardStateCell(pos);
  if (!cell || !trap || !trap.element || !(trap.layers > 0)) return false;
  cell.terrainLayer.traps.push({
    id: trap.id || ('trap_' + boardStateKey(pos) + '_' + trap.element + '_' + cell.terrainLayer.traps.length),
    element: trap.element,
    layers: trap.layers || 0,
    damage: trap.damage || 0,
    apDelta: trap.apDelta || 0,
    sourceId: trap.sourceId || null
  });
  cell.meta.updatedAtTurn = G.coreVersion || 0;
  return true;
}

function clearBoardStateTerrain(pos) { return setBoardStateTerrainTraps(pos, []); }

function syncBoardStateUnitsFromEntities() {
  // 正常运行期只同步单位层，不重建元素层/地形层，避免破坏战斗中的 boardState 写入。
  var bs = ensureBoardState();
  if (!bs || !bs.cells) return false;
  Object.keys(bs.cells).forEach(function(key) {
    bs.cells[key].unitLayer.occupant = null;
  });
  if (G.playerCastle && G.playerCastle.hp > 0) setBoardStateUnit(G.playerCastle.pos, cloneBoardStateOccupant('castle', G.playerCastle, { id: 'playerCastle', side: 'player' }));
  if (G.enemyCastle && G.enemyCastle.hp > 0) setBoardStateUnit(G.enemyCastle.pos, cloneBoardStateOccupant('castle', G.enemyCastle, { id: 'enemyCastle', side: 'enemy' }));
  Object.values(G.heroes || {}).forEach(function(h) {
    if (h && h.hp > 0) setBoardStateUnit(h.pos, cloneBoardStateOccupant('hero', h, { side: 'player' }));
  });
  (G.monsters || []).forEach(function(m) {
    if (m && !m.dead && m.hp > 0) setBoardStateUnit(m.pos, cloneBoardStateOccupant('monster', m, { side: 'enemy' }));
  });
  (G.summons || []).forEach(function(s) {
    if (s && !s.dead && s.hp > 0) setBoardStateUnit(s.pos, cloneBoardStateOccupant('summon', s, { side: 'player' }));
  });
  return true;
}

function syncBoardStateElementFromLegacy(pos) {
  var cell = getBoardStateCell(pos);
  if (!cell) return false;
  var key = boardStateKey(pos);
  var elData = G.elementCells ? G.elementCells[key] : null;
  ['fire', 'water', 'wind', 'earth'].forEach(function(el) {
    cell.elementLayer[el] = elData && elData[el] ? (elData[el].layers || 0) : 0;
  });
  if ((!elData || !Object.values(cell.elementLayer).some(Boolean)) && G.board && G.board[pos.r] && G.board[pos.r][pos.c]) {
    var bc = G.board[pos.r][pos.c];
    if (bc.el && bc.stk > 0) cell.elementLayer[bc.el] = bc.stk;
  }
  return true;
}

function legacyTrapMapToList(traps, pos) {
  var out = [];
  if (!traps) return out;
  ['fire', 'water', 'wind', 'earth'].forEach(function(el) {
    var layers = traps[el] || 0;
    if (layers > 0) out.push({ id: 'trap_' + boardStateKey(pos) + '_' + el, element: el, layers: layers, damage: 0, apDelta: 0, sourceId: null });
  });
  return out;
}

function syncBoardStateTerrainFromLegacy(pos) {
  var key = boardStateKey(pos);
  var traps = G.terrainCells ? G.terrainCells[key] : null;
  return setBoardStateTerrainTraps(pos, legacyTrapMapToList(traps, pos));
}

function repairBoardStateFromLegacy() {
  // 仅用于 initGame / replay load / debug repair。正常战斗流程不得依赖它修正状态。
  // 修复版：不破坏性替换 G.boardState 对象；仅在缺失或尺寸变化时初始化结构，然后重填内容。
  var rows = boardRows(), cols = boardCols();
  if (!G.boardState || !G.boardState.cells || G.boardState.rows !== rows || G.boardState.cols !== cols) {
    initBoardState(rows, cols);
  }
  var bs = G.boardState;
  Object.keys(bs.cells).forEach(function(key) {
    var cell = bs.cells[key];
    cell.unitLayer.occupant = null;
    cell.terrainLayer.terrainType = null;
    cell.terrainLayer.traps = [];
    ['fire', 'water', 'wind', 'earth'].forEach(function(el) { cell.elementLayer[el] = 0; });
    cell.meta.updatedAtTurn = G.coreVersion || 0;
  });
  for (var key in bs.cells) {
    var parts = key.split(',').map(Number);
    var pos = { r: parts[0], c: parts[1] };
    syncBoardStateElementFromLegacy(pos);
    syncBoardStateTerrainFromLegacy(pos);
  }
  syncBoardStateUnitsFromEntities();
  return bs;
}

function rebuildBoardState() { return repairBoardStateFromLegacy(); }

function boardStateLayerTrapsToLegacy(cell) {
  var out = { fire: 0, water: 0, wind: 0, earth: 0 };
  ((cell && cell.terrainLayer && cell.terrainLayer.traps) || []).forEach(function(t) {
    if (out[t.element] != null) out[t.element] += t.layers || 0;
  });
  return out;
}

function validateBoardState() {
  var errors = [];
  if (!G || !G.boardState || !G.boardState.cells) return ['missing boardState'];
  var bs = G.boardState;
  var expectedCells = (bs.rows || 0) * (bs.cols || 0);
  if (Object.keys(bs.cells).length !== expectedCells) errors.push('cell count mismatch');
  Object.keys(bs.cells).forEach(function(key) {
    var cell = bs.cells[key];
    if (!cell.unitLayer) errors.push(key + ': missing unitLayer');
    if (!cell.terrainLayer) errors.push(key + ': missing terrainLayer');
    if (!cell.elementLayer) errors.push(key + ': missing elementLayer');
    if (!cell.meta) errors.push(key + ': missing meta');
  });
  function expectOcc(pos, type, id) {
    var cell = getBoardStateCell(pos);
    if (!cell) { errors.push(type + ':' + id + ' outside board'); return; }
    var occ = cell.unitLayer.occupant;
    if (!occ || occ.type !== type || (id && occ.id !== id)) errors.push('unit mismatch ' + type + ':' + id + ' @ ' + boardStateKey(pos));
  }
  if (G.playerCastle && G.playerCastle.hp > 0) expectOcc(G.playerCastle.pos, 'castle', 'playerCastle');
  if (G.enemyCastle && G.enemyCastle.hp > 0) expectOcc(G.enemyCastle.pos, 'castle', 'enemyCastle');
  Object.values(G.heroes || {}).forEach(function(h) { if (h && h.hp > 0) expectOcc(h.pos, 'hero', h.id); });
  (G.monsters || []).forEach(function(m) { if (m && !m.dead && m.hp > 0) expectOcc(m.pos, 'monster', m.id); });
  (G.summons || []).forEach(function(s) { if (s && !s.dead && s.hp > 0) expectOcc(s.pos, 'summon', s.id); });
  Object.keys(G.elementCells || {}).forEach(function(key) {
    var cell = bs.cells[key];
    if (!cell) return;
    ['fire', 'water', 'wind', 'earth'].forEach(function(el) {
      var a = ((G.elementCells[key] && G.elementCells[key][el]) ? G.elementCells[key][el].layers : 0) || 0;
      var b = (cell.elementLayer && cell.elementLayer[el]) || 0;
      if (a !== b) errors.push('element mismatch ' + key + ':' + el + ' legacy=' + a + ' boardState=' + b);
    });
  });
  Object.keys(G.terrainCells || {}).forEach(function(key) {
    var cell = bs.cells[key];
    if (!cell) return;
    var b = boardStateLayerTrapsToLegacy(cell);
    ['fire', 'water', 'wind', 'earth'].forEach(function(el) {
      var a = ((G.terrainCells[key] && G.terrainCells[key][el]) || 0);
      if (a !== b[el]) errors.push('terrain mismatch ' + key + ':' + el + ' legacy=' + a + ' boardState=' + b[el]);
    });
  });
  return errors;
}

function assertBoardStateValid(label) {
  var errors = validateBoardState();
  if (errors.length) throw new Error((label || 'boardState') + ': ' + errors.join('; '));
  return true;
}

function assertBoardState(label) { return assertBoardStateValid(label); }

function exportBoardStateSnapshot() {
  if (!ensureBoardState()) return null;
  return JSON.parse(JSON.stringify(G.boardState));
}

// 兼容旧名：仅保留只读 getCellAt，写入统一使用 setBoardStateUnit/setBoardStateElement/addBoardStateTrap。
function getCellAt(pos) { return getBoardStateCell(pos); }
