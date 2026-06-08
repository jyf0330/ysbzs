/**
 * tacticalTargeting.cjs — 棋盘目标选择/战术预览模块
 *
 * 参考：OpenDuelyst（棋盘单位+技能目标选择）
 * 定位：给定 state、单位、行动槽，计算合法目标格。
 * 约定：不修改 state，只返回预览数据。
 */

const { getCell } = require('./state.cjs');
const BOARD_ROWS = 8, BOARD_COLS = 8;

function clone(v) { return JSON.parse(JSON.stringify(v)); }
function inBoard(p) { return p && p.r >= 0 && p.c >= 0 && p.r < BOARD_ROWS && p.c < BOARD_COLS; }
function posKey(p) { return `${p.r},${p.c}`; }

/**
 * 获取可移动格：单位周围不重叠的合法空格
 * @param {object} state
 * @param {object} unit
 * @param {number} [range] 移动范围（默认 = unit.ap，或无限移动时全盘）
 * @returns {object[]} [{r, c}]
 */
function getLegalMoves(state, unit, range) {
  if (!unit || !unit.alive || !unit.position) return [];
  const pos = unit.position;
  const maxRange = range !== undefined ? range : (unit.ap || 3);
  const occupied = new Set();
  for (const u of (state.units || [])) {
    if (u.alive && u.position) occupied.add(posKey(u.position));
  }
  if (state.leaders) {
    for (const l of Object.values(state.leaders)) {
      if (l && l.alive !== false && l.position) occupied.add(posKey(l.position));
    }
  }
  const results = [];
  for (let r = Math.max(0, pos.r - maxRange); r <= Math.min(BOARD_ROWS - 1, pos.r + maxRange); r++) {
    for (let c = Math.max(0, pos.c - maxRange); c <= Math.min(BOARD_COLS - 1, pos.c + maxRange); c++) {
      if (r === pos.r && c === pos.c) continue;
      const dist = Math.abs(r - pos.r) + Math.abs(c - pos.c);
      if (dist > maxRange) continue;
      const key = `${r},${c}`;
      if (occupied.has(key)) continue;
      results.push({ r, c });
    }
  }
  return results;
}

/**
 * 根据形状 ID 或 hitCells 计算攻击覆盖格
 * @param {object} unit - 攻击单位
 * @param {object} slot - 行动槽 { direction, hitCells, shapeId }
 * @param {object} targetCell - 目标格
 * @returns {object[]} 覆盖格子
 */
function getAttackCells(unit, slot, targetCell) {
  if (!unit || !slot || !targetCell) return [];
  const start = unit.position;
  if (!start) return [];
  const shapeId = slot.shapeId || '';
  const hitCells = slot.hitCells || 1;
  const dir = slot.direction || 'right';
  const delta = { up: { dr: -1, dc: 0 }, down: { dr: 1, dc: 0 }, left: { dr: 0, dc: -1 }, right: { dr: 0, dc: 1 } };
  const d = delta[dir] || { dr: 0, dc: 1 };

  // 直线 N 格
  const cells = [];
  for (let i = 1; i <= hitCells; i++) {
    const p = { r: start.r + d.dr * i, c: start.c + d.dc * i };
    if (inBoard(p)) cells.push(p);
  }
  // 如果 targetCell 不在覆盖内返回空
  if (!cells.some(c => c.r === targetCell.r && c.c === targetCell.c)) return [];
  return cells;
}

/**
 * 获取技能/行动槽的可选目标格列表（不修改 state）
 * @param {object} state
 * @param {object} unit
 * @param {object} slot
 * @returns {object[]} legalTargets
 */
function getLegalTargets(state, unit, slot) {
  if (!unit || !unit.alive || !slot || !unit.position) return [];
  const start = unit.position;
  const hitCells = slot.hitCells || 1;
  const dir = slot.direction || 'right';
  const delta = { up: { dr: -1, dc: 0 }, down: { dr: 1, dc: 0 }, left: { dr: 0, dc: -1 }, right: { dr: 0, dc: 1 } };
  const d = delta[dir] || { dr: 0, dc: 1 };
  const results = [];

  // 计算覆盖范围内的格子
  for (let step = 1; step <= hitCells; step++) {
    const cell = { r: start.r + d.dr * step, c: start.c + d.dc * step };
    if (!inBoard(cell)) break;
    const cells = [];
    for (let i = 1; i <= hitCells; i++) {
      const p = { r: start.r + d.dr * i, c: start.c + d.dc * i };
      if (inBoard(p)) cells.push(p);
    }
    if (!cells.length) continue;
    const targetUnitIds = [];
    const elementPreview = [];
    for (const p of cells) {
      const c = getCell(state, p.r, p.c);
      if (!c) continue;
      if (c.unitId) targetUnitIds.push(c.unitId);
      if (slot.element) elementPreview.push({ cell: p, element: slot.element, amount: slot.layers || 1 });
    }
    const fireLayers = (() => {
      const cell = getCell(state, cell.r, cell.c);
      return cell ? (cell.elements?.火 || 0) : 0;
    })();
    const warnings = [];
    if (fireLayers >= 3) warnings.push('fire_explosion_risk');
    results.push({ cell, hitCells: cells, targetUnitIds, elementPreview, warnings });
  }
  return results;
}

/**
 * 完整战术预览
 * @returns {object} { actorId, actionSlotId, legalMoves, legalTargets, buildTime }
 */
function buildTacticalPreview(state, unit, slot) {
  const t0 = Date.now();
  return {
    actorId: unit?.id || null,
    actionSlotId: (slot && (slot.slotId !== undefined ? slot.slotId : slot.index)) || null,
    legalMoves: getLegalMoves(state, unit),
    legalTargets: getLegalTargets(state, unit, slot),
    buildTime: Date.now() - t0
  };
}

module.exports = { getLegalMoves, getAttackCells, getLegalTargets, buildTacticalPreview };
