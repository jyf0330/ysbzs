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

/**
 * G.boardState — 统一棋盘格状态（唯一真实源）
 * 旧 G.board / G.elementCells / G.terrainCells 均标记为 DEPRECATED。
 *
 * 结构：
 *   cells["r,c"] = {
 *     row, col,
 *     unitLayer: { occupant: { id, type, hp } | null },  // type: 'hero'|'monster'|'summon'|'castle'
 *     terrainLayer: { terrainType: null, traps: [{id, element, layers, damage, apDelta, sourceId}] },
 *     elementLayer: { fire: 0, water: 0, wind: 0, earth: 0 },
 *     meta: { updatedAtTurn: 0 }
 *   }
 */
function initBoardState() {
  var state = {
    schema: 'ysbzs.board.v1',
    turn: 0,
    rows: 8, cols: 8,
    cells: {}
  };
  for (var r = 0; r < 8; r++) {
    for (var c = 0; c < 8; c++) {
      var key = r + ',' + c;
      state.cells[key] = {
        row: r, col: c,
        unitLayer: { occupant: null },
        terrainLayer: { terrainType: null, traps: [] },
        elementLayer: { fire: 0, water: 0, wind: 0, earth: 0 },
        meta: { updatedAtTurn: 0 }
      };
    }
  }
  if (typeof G !== 'undefined') G.boardState = state;
  return state;
}

/** 从旧结构重建 G.boardState（桥接兼容） */
function rebuildBoardState() {
  var bs = G.boardState || initBoardState();
  bs.turn = (G && G.round) || (G && G.day) || 0;

  // 清零（保留结构）
  Object.keys(bs.cells).forEach(function(key) {
    var c = bs.cells[key];
    c.unitLayer.occupant = null;
    c.terrainLayer.terrainType = null;
    c.terrainLayer.traps = [];
    c.elementLayer.fire = 0; c.elementLayer.water = 0; c.elementLayer.wind = 0; c.elementLayer.earth = 0;
    c.meta.updatedAtTurn = 0;
  });

  /* DEPRECATED */ if (!G) return bs;
  // 1. 元素层
  if (G.elementCells) {
    Object.keys(G.elementCells).forEach(function(key) {
      var cell = bs.cells[key]; if (!cell) return;
      var ed = G.elementCells[key];
      cell.elementLayer.fire = (ed.fire && ed.fire.layers) || 0;
      cell.elementLayer.water = (ed.water && ed.water.layers) || 0;
      cell.elementLayer.wind = (ed.wind && ed.wind.layers) || 0;
      cell.elementLayer.earth = (ed.earth && ed.earth.layers) || 0;
    });
  }
  // 2a. 地形陷阱层（从 G.terrainCells */
  if (G.terrainCells) {
    Object.keys(G.terrainCells).forEach(function(key) {
      var cell = bs.cells[key]; if (!cell) return;
      var td = G.terrainCells[key];
      ['fire','water','wind','earth'].forEach(function(el) {
        var l = td[el] || 0;
        if (l > 0) {
          cell.terrainLayer.traps.push({ id: 'trap_' + el + '_' + key, element: el, layers: l, damage: 0, apDelta: 0, sourceId: 'terrain_layer' });
          cell.terrainLayer.terrainType = 'element_trap';
        }
      });
    });
  }
  // 3. 单位层
  if (G.heroes) Object.values(G.heroes).forEach(function(h) {
    var cell = bs.cells[h.pos.r + ',' + h.pos.c]; if (cell) cell.unitLayer.occupant = { id: h.id, type: 'hero', hp: h.hp };
  });
  if (G.monsters) G.monsters.forEach(function(m) {
    if (m.dead) return;
    var cell = bs.cells[m.pos.r + ',' + m.pos.c]; if (cell) cell.unitLayer.occupant = { id: m.id, type: 'monster', hp: m.hp };
  });
  if (G.summons) G.summons.forEach(function(s) {
    if (s.dead) return;
    var cell = bs.cells[s.pos.r + ',' + s.pos.c]; if (cell) cell.unitLayer.occupant = { id: s.id, type: 'summon', hp: s.hp };
  });
  if (G.playerCastle && G.playerCastle.hp > 0) {
    var pk = G.playerCastle.pos.r + ',' + G.playerCastle.pos.c;
    if (bs.cells[pk]) bs.cells[pk].unitLayer.occupant = { id: 'playerCastle', type: 'castle', hp: G.playerCastle.hp };
  }
  if (G.enemyCastle && G.enemyCastle.hp > 0) {
    var ek = G.enemyCastle.pos.r + ',' + G.enemyCastle.pos.c;
    if (bs.cells[ek]) bs.cells[ek].unitLayer.occupant = { id: 'enemyCastle', type: 'castle', hp: G.enemyCastle.hp };
  }
  return bs;
}

/** 校验 G.boardState 与旧结构一致性 */
function validateBoardState() {
  if (!G || !G.boardState) return ['G.boardState 未初始化'];
  var errors = [];
  var bs = G.boardState;
  if (bs.rows !== 8 || bs.cols !== 8) errors.push('boardState 尺寸非 8x8');
  if (Object.keys(bs.cells).length !== 64) errors.push('boardState 格子数非 64');
  Object.keys(bs.cells).forEach(function(key) {
    var cell = bs.cells[key];
    if (!cell || !cell.unitLayer) { errors.push(key + ' 缺少 unitLayer'); return; }
    var occ = cell.unitLayer.occupant;
    if (occ) {
      var match = false;
      if (occ.type === 'hero' && G.heroes) { var h = G.heroes[occ.id]; match = !!(h && h.hp > 0 && h.pos.r === cell.row && h.pos.c === cell.col); if (!match) errors.push(key + ' 英雄 ' + occ.id + ' 坐标/存活不一致'); }
      else if (occ.type === 'monster' && G.monsters) { var m = G.monsters.find(function(x){return x.id===occ.id;}); match = !!(m && !m.dead && m.pos.r === cell.row && m.pos.c === cell.col); if (!match) errors.push(key + ' 怪物 ' + occ.id + ' 坐标/存活不一致'); }
      else if (occ.type === 'summon' && G.summons) { var s = G.summons.find(function(x){return x.id===occ.id&&!x.dead;}); match = !!(s && s.pos.r === cell.row && s.pos.c === cell.col); if (!match) errors.push(key + ' 召唤物 ' + occ.id + ' 坐标/存活不一致'); }
      else if (occ.type === 'castle') match = true;
    }
  });
  return errors;
}

/** 断言 boardState 一致，失败抛异常 */
function assertBoardState(msg) {
  var errors = validateBoardState();
  if (errors.length > 0) {
    throw new Error('boardState 校验失败' + (msg ? ' (' + msg + ')' : '') + ': ' + errors.join('; '));
  }
}

/** 快捷读取格子 */
function getCellAt(pos) {
  if (!G || !G.boardState) return null;
  return G.boardState.cells[pos.r + ',' + pos.c] || null;
}

/** 写入单位层 */
function setCellUnit(pos, occupant) {
  var cell = getCellAt(pos); if (!cell) return;
  cell.unitLayer.occupant = occupant || null;
  cell.meta.updatedAtTurn = (G && G.round) || 0;
}

/** 写入元素层 */
function setCellElement(pos, el, layers) {
  var cell = getCellAt(pos); if (!cell) return;
  cell.elementLayer[el] = Math.max(0, layers);
  cell.meta.updatedAtTurn = (G && G.round) || 0;
}

/** 写入地形陷阱 */
function addCellTrap(pos, trap) {
  var cell = getCellAt(pos); if (!cell) return;
  cell.terrainLayer.terrainType = cell.terrainLayer.terrainType || 'element_trap';
  cell.terrainLayer.traps.push(trap);
  cell.meta.updatedAtTurn = (G && G.round) || 0;
}

/** 清空陷阱 */
function clearCellTraps(pos) {
  var cell = getCellAt(pos); if (!cell) return;
  cell.terrainLayer.traps = [];
  cell.terrainLayer.terrainType = null;
  cell.meta.updatedAtTurn = (G && G.round) || 0;
}

/** 导出 boardState 快照（可 JSON.stringify 用于调试/回放/AI评估） */
function exportBoardStateSnapshot() {
  if (!G || !G.boardState) return null;
  return JSON.parse(JSON.stringify(G.boardState));
}
