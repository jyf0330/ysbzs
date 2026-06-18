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

/**
 * @param {Array<Record<string, any>>} [events]
 * @param {(unitId?: string) => Record<string, any>|null} [getUnit]
 * @returns {string[]}
 */
function summarizeDamageEvents(events = [], getUnit = () => null) {
  const totals = new Map();
  for (const event of events || []) {
    if (!event || event.type !== 'DAMAGE') continue;
    const amount = Math.max(0, Number(event.final || 0));
    if (amount <= 0) continue;
    const target = getUnit(event.targetId) || {};
    const key = `${event.targetId || 'unknown'}:${event.element || ''}`;
    const current = totals.get(key) || {
      name: target.displayName || target.name || event.targetName || event.targetId || '目标',
      element: event.element || '',
      amount: 0
    };
    current.amount += amount;
    totals.set(key, current);
  }
  return Array.from(totals.values()).map(item => `${item.name}受${item.element || ''}伤${item.amount}`);
}

/**
 * @param {Array<Record<string, any>>} [events]
 * @returns {string[]}
 */
function summarizeElementIncreaseEvents(events = []) {
  const totals = new Map();
  for (const event of events || []) {
    if (!event || event.type !== 'APPLY_ELEMENT_CELL') continue;
    const delta = Math.max(0, Number(event.to || 0) - Number(event.from || 0));
    if (delta <= 0 || !ELEMENTS.includes(event.element)) continue;
    const key = `${event.r},${event.c}:${event.element}`;
    const current = totals.get(key) || { r: Number(event.r), c: Number(event.c), element: event.element, amount: 0 };
    current.amount += delta;
    totals.set(key, current);
  }
  return Array.from(totals.values()).map(item => `${compactPositionLabel(item)} ${item.element}+${item.amount}`);
}

function joinClauses(clauses) {
  return clauses.filter(Boolean).join('，');
}

module.exports = {
  compactPositionLabel,
  joinClauses,
  summarizeDamageEvents,
  summarizeElementIncreaseEvents,
  summarizeRiskChange,
};
