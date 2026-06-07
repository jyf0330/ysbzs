/**
 * elements.cjs — 元素配置与反应规则
 *
 * 第一版启用元素：火、水、风
 * 兼容保留元素：土（旧存档/旧表）
 */

const ACTIVE_ELEMENTS = Object.freeze(['火', '水', '风']);
const COMPAT_ELEMENTS = Object.freeze(['火', '水', '风', '土']);

function makeEmptyElements(compat = false) {
  const els = compat ? COMPAT_ELEMENTS : ACTIVE_ELEMENTS;
  const o = {};
  for (const el of els) o[el] = 0;
  return o;
}

function makeEmptyElementCamps(compat = false) {
  const els = compat ? COMPAT_ELEMENTS : ACTIVE_ELEMENTS;
  const o = {};
  for (const el of els) o[el] = null;
  return o;
}

function isActive(el) { return ACTIVE_ELEMENTS.includes(el); }

function fireDamage(layers) {
  const n = Math.max(0, Number(layers || 0));
  return (n * (n + 1)) / 2; // Σ(1..N)
}

/**
 * 检查格子是否有敌方单位，触发火引爆
 * @returns {boolean} 是否触发了引爆
 */
function explodeIfEnemyOnFire(state, cell, sourceId) {
  const layers = cell.elements.火 || 0;
  if (layers < 3) return false;

  // 找该格上的敌方存活单位
  const target = (state.units || []).find(
    u => u.side === 'enemy' && u.alive && u.position &&
         u.position.r === cell.r && u.position.c === cell.c
  );

  if (!target) {
    // 无单位 → 空格爆火陷阱（不引爆，保持火层）
    return false;
  }

  // 引爆
  const dmg = fireDamage(layers);
  const before = cell.elements.火;
  cell.elements.火 = 0;

  return { target, damage: dmg, layersBefore: before };
}

/**
 * 水催化：同格有水层时，消耗1水，使本次添加层数翻倍
 * @returns {number} 催化后的层数（不变则返回原值）
 */
function waterCatalyst(state, cell, baseLayers) {
  if (!cell || baseLayers <= 0) return baseLayers;
  const water = cell.elements.水 || 0;
  if (water <= 0) return baseLayers;
  cell.elements.水 -= 1;
  return baseLayers * 2;
}

/**
 * 风聚火：把来源格的火层搬运到目标格
 * @returns {number} 实际搬运的层数
 */
function transferFire(state, fromCell, toCell, amount) {
  if (!fromCell || !toCell || amount <= 0) return 0;
  const available = fromCell.elements.火 || 0;
  const moved = Math.min(amount, available);
  if (moved <= 0) return 0;
  fromCell.elements.火 -= moved;
  toCell.elements.火 += moved;
  return moved;
}

module.exports = {
  ACTIVE_ELEMENTS,
  COMPAT_ELEMENTS,
  makeEmptyElements,
  makeEmptyElementCamps,
  isActive,
  fireDamage,
  explodeIfEnemyOnFire,
  waterCatalyst,
  transferFire
};
