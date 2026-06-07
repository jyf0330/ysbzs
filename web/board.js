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
