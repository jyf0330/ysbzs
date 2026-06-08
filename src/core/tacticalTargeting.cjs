/**
 * tacticalTargeting.cjs — OpenDuelyst-style tactical grid targeting helpers.
 *
 * Purpose: keep target selection as data/query logic instead of ad-hoc UI code.
 * This is intentionally lightweight: it does not replace battle.cjs, it gives
 * battle/UI/AI a common way to ask "what can this action target?".
 */
const { getCell, normalizePosition, BOARD_ROWS, BOARD_COLS } = require('./state.cjs');

function dist(a, b) { return Math.abs(Number(a.r) - Number(b.r)) + Math.abs(Number(a.c) - Number(b.c)); }
function inBoard(p, rows = BOARD_ROWS, cols = BOARD_COLS) { return p && p.r >= 0 && p.c >= 0 && p.r < rows && p.c < cols; }
function sameCamp(a, b) { return a && b && (a.camp || a.side) === (b.camp || b.side); }
function enemyOf(a, b) { return a && b && !sameCamp(a, b); }
function unitAt(state, p) {
  const cell = getCell(state, p.r, p.c);
  if (!cell || !cell.unitId) return null;
  return (state.units || []).find(u => u.id === cell.unitId) || null;
}
function lineCells(from, dir, range, includeBlocked = true) {
  const d = { right: [0, 1], left: [0, -1], down: [1, 0], up: [-1, 0] }[dir || 'right'] || [0, 1];
  const out = [];
  for (let i = 1; i <= Number(range || 1); i++) {
    const p = { r: from.r + d[0] * i, c: from.c + d[1] * i };
    if (!inBoard(p)) break;
    out.push(p);
    if (!includeBlocked) continue;
  }
  return out;
}
function areaCells(center, shape = 'single', radius = 1) {
  const out = [];
  if (shape === 'single') out.push(center);
  else if (shape === 'cross') {
    out.push(center, { r: center.r - 1, c: center.c }, { r: center.r + 1, c: center.c }, { r: center.r, c: center.c - 1 }, { r: center.r, c: center.c + 1 });
  } else if (shape === 'diamond') {
    for (let r = center.r - radius; r <= center.r + radius; r++) for (let c = center.c - radius; c <= center.c + radius; c++) if (Math.abs(r - center.r) + Math.abs(c - center.c) <= radius) out.push({ r, c });
  }
  return out.filter(inBoard);
}
function matchesTargetRule(state, actor, p, rule = {}) {
  const cell = getCell(state, p.r, p.c);
  if (!cell) return false;
  const targetUnit = unitAt(state, p);
  const target = rule.target || rule.targetType || 'any_cell';
  if (rule.maxRange != null && dist(normalizePosition(actor.position), p) > Number(rule.maxRange)) return false;
  if (target === 'empty_cell') return !targetUnit;
  if (target === 'enemy_unit') return !!targetUnit && enemyOf(actor, targetUnit);
  if (target === 'ally_unit') return !!targetUnit && sameCamp(actor, targetUnit);
  if (target === 'unit') return !!targetUnit;
  if (target === 'element_cell') return Object.values(cell.elements || {}).some(v => Number(v || 0) > 0);
  return true;
}
function listLegalTargets(state, actor, rule = {}) {
  if (!state || !actor) return [];
  const origin = normalizePosition(actor.position || { r: 0, c: 0 });
  let candidates = [];
  if (rule.pattern === 'line') candidates = lineCells(origin, rule.direction || 'right', rule.range || rule.maxRange || 1, true);
  else if (rule.pattern === 'area') candidates = areaCells(rule.center || origin, rule.shape || 'diamond', Number(rule.radius || 1));
  else {
    for (let r = 0; r < (state.board?.rows || BOARD_ROWS); r++) for (let c = 0; c < (state.board?.cols || BOARD_COLS); c++) candidates.push({ r, c });
  }
  return candidates.filter(p => matchesTargetRule(state, actor, p, rule)).map(p => {
    const u = unitAt(state, p);
    return { position: p, cell: getCell(state, p.r, p.c), unitId: u?.id || null, unitName: u?.name || null, distance: dist(origin, p) };
  });
}
function buildTargetingPreview(state, actor, rule = {}) {
  return listLegalTargets(state, actor, rule).map(t => ({ r: t.position.r, c: t.position.c, legal: true, unitId: t.unitId, unitName: t.unitName, distance: t.distance }));
}
module.exports = { dist, lineCells, areaCells, listLegalTargets, buildTargetingPreview, matchesTargetRule };
