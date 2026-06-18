// @ts-check

const ELEMENTS = ['火', '水', '风'];

function compactPositionLabel(pos) {
  if (!pos) return '未知';
  return `R${Number(pos.r) + 1}C${Number(pos.c) + 1}`;
}

function riskDamage(risk) {
  return Math.max(0, Number(risk?.damage || risk?.predictedDamage || 0));
}

function summarizeRiskChange(beforeRisk, afterRisk) {
  const before = riskDamage(beforeRisk);
  const after = riskDamage(afterRisk);
  if (before === after) return '';
  return `预计受伤 ${before}->${after}`;
}

function snapshotUnitDamage(units = []) {
  const map = new Map();
  for (const unit of units || []) {
    if (!unit || !unit.id) continue;
    map.set(unit.id, {
      name: unit.displayName || unit.name || unit.id,
      hp: Number(unit.hp || 0),
      shield: Number(unit.shield || 0)
    });
  }
  return map;
}

function summarizeUnitDamage(beforeMap, units = []) {
  const lines = [];
  for (const unit of units || []) {
    const before = beforeMap.get(unit.id);
    if (!before) continue;
    const hpLoss = Math.max(0, before.hp - Number(unit.hp || 0));
    const shieldLoss = Math.max(0, before.shield - Number(unit.shield || 0));
    const total = hpLoss + shieldLoss;
    if (total > 0) lines.push(`${before.name}受伤${total}`);
  }
  return lines;
}

function snapshotCellElements(cells = []) {
  const map = new Map();
  for (const cell of cells || []) {
    const key = `${cell.r},${cell.c}`;
    const elements = {};
    for (const el of ELEMENTS) elements[el] = Number(cell.elements?.[el] || 0);
    map.set(key, elements);
  }
  return map;
}

function summarizeElementIncreases(beforeMap, cells = []) {
  const lines = [];
  for (const cell of cells || []) {
    const before = beforeMap.get(`${cell.r},${cell.c}`) || {};
    for (const el of ELEMENTS) {
      const delta = Number(cell.elements?.[el] || 0) - Number(before[el] || 0);
      if (delta > 0) lines.push(`${compactPositionLabel(cell)} ${el}+${delta}`);
    }
  }
  return lines;
}

function joinClauses(clauses) {
  return clauses.filter(Boolean).join('，');
}

module.exports = {
  compactPositionLabel,
  joinClauses,
  snapshotCellElements,
  snapshotUnitDamage,
  summarizeElementIncreases,
  summarizeRiskChange,
  summarizeUnitDamage
};
