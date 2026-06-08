/**
 * replacementEffects.cjs — Forge/MTG 风格 replacement effect 的轻量版。
 *
 * 事件真正执行前先改写事件；例如风转火、下个元素翻倍。
 */
const { recordChange } = require('./changeLog.cjs');
function clone(v) { return JSON.parse(JSON.stringify(v)); }
function collectReplacementEffects(holder, trigger) {
  const out = [];
  for (const packet of holder?.elementPackets || []) {
    for (const mod of packet.modifiers || []) {
      if (mod.trigger === trigger || mod.replacementTrigger === trigger) out.push({ sourceKind: 'element_packet', packet, modifier: mod, priority: Number(mod.priority || 0) });
    }
  }
  for (const eff of holder?.replacementEffects || []) {
    if (eff.trigger === trigger) out.push({ sourceKind: 'holder', effect: eff, priority: Number(eff.priority || 0) });
  }
  return out.sort((a,b)=>(b.priority-a.priority)||String(a.modifier?.id||a.effect?.id||'').localeCompare(String(b.modifier?.id||b.effect?.id||'')));
}
function applyReplacementEffects(state, holder, event, source = {}) {
  let current = clone(event);
  const applied = [];
  const effects = collectReplacementEffects(holder, event.trigger || event.type);
  for (const item of effects) {
    const mod = item.modifier || item.effect;
    if (!mod) continue;
    if (mod.effect === 'multiply_added_element') {
      const before = Number(current.amount || 0);
      current.amount = before * Number(mod.value || 1);
      applied.push({ id: mod.id, effect: mod.effect, from: before, to: current.amount, packetId: item.packet?.packetId || null });
      if (mod.consumeOnUse !== false && item.modifier) item.modifier._consumed = true;
    }
    if (mod.effect === 'replace_element' || mod.effect === 'convert_element') {
      const fromElement = mod.fromElement || current.element;
      if (!mod.fromElement || current.element === fromElement) {
        const before = current.element;
        current.element = mod.toElement || current.element;
        current.originalElement = current.originalElement || before;
        current.preserveModifiers = mod.preserveModifiers !== false;
        applied.push({ id: mod.id, effect: mod.effect, from: before, to: current.element, packetId: item.packet?.packetId || null });
      }
    }
  }
  for (const packet of holder?.elementPackets || []) packet.modifiers = (packet.modifiers || []).filter(m => !m._consumed);
  if (applied.length) recordChange(state, {
    type: 'APPLY_REPLACEMENT_EFFECTS',
    path: event.path || `incoming.${event.element || event.type}`,
    from: event,
    to: current,
    delta: (current.amount || 0) - (event.amount || 0),
    source: { ...source, applied },
    reason: 'replacement_effects_applied',
    tags: ['replacement_effect']
  });
  return { event: current, applied };
}
module.exports = { collectReplacementEffects, applyReplacementEffects };
