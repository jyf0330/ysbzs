/** modifierEngine.cjs — 基础值 + 修饰器链 */
const { applyNextElementModifiers } = require('./elementPackets.cjs');
function computeModifiedValue(base, modifiers = [], context = {}) {
  let value = Number(base || 0);
  const applied = [];
  const ordered = modifiers.slice().sort((a, b) => (Number(b.priority || 0) - Number(a.priority || 0)) || String(a.id || '').localeCompare(String(b.id || '')));
  for (const m of ordered) {
    const before = value;
    if (m.op === 'add') value += Number(m.value || 0);
    else if (m.op === 'multiply') value *= Number(m.value || 1);
    else if (m.op === 'override') value = Number(m.value || value);
    else if (m.op === 'min') value = Math.min(value, Number(m.value || value));
    else if (m.op === 'max') value = Math.max(value, Number(m.value || value));
    if (before !== value) applied.push({ id: m.id, op: m.op, value: m.value, from: before, to: value, sourceId: m.sourceId, context });
  }
  return { base, final: value, applied };
}
function applyElementPacketModifiers(state, holder, incoming, source = {}) {
  return applyNextElementModifiers(state, holder, incoming, source);
}
module.exports = { computeModifiedValue, applyElementPacketModifiers };
