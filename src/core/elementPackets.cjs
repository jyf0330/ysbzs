/**
 * elementPackets.cjs — 元素包系统
 *
 * 元素层 = 聚合值 elements + 元素包 elementPackets。
 * 聚合值用于结算；元素包用于来源、转换、modifier、回放和战报。
 */
const { recordChange } = require('./changeLog.cjs');
const { applyReplacementEffects } = require('./replacementEffects.cjs');
function clone(v) { return JSON.parse(JSON.stringify(v)); }
const COMPAT_ELEMENTS = ['火', '水', '风', '土'];
function makeEmptyElements() { const o = {}; for (const el of COMPAT_ELEMENTS) o[el] = 0; return o; }

function nextPacketId(state) {
  const n = state.nextElementPacket || 1;
  state.nextElementPacket = n + 1;
  return `ep_${String(n).padStart(6, '0')}`;
}
function ensureElementPackets(holder) {
  if (!holder.elementPackets) holder.elementPackets = [];
  if (!holder.elements) holder.elements = makeEmptyElements(true);
  return holder.elementPackets;
}
function syncElementTotals(holder) {
  ensureElementPackets(holder);
  const totals = makeEmptyElements(true);
  for (const p of holder.elementPackets) {
    if (!p || p.amount <= 0 || !p.element) continue;
    totals[p.element] = (totals[p.element] || 0) + Number(p.amount || 0);
  }
  holder.elements = Object.assign(makeEmptyElements(true), holder.elements || {}, totals);
  // 清掉包里没有的主动元素，避免转换后旧风残留。
  for (const el of Object.keys(totals)) holder.elements[el] = totals[el] || 0;
  return holder.elements;
}
function legacyBackfillPackets(state, holder, source = {}) {
  ensureElementPackets(holder);
  if (holder.elementPackets.length) return holder.elementPackets;
  const els = holder.elements || {};
  for (const [element, amount] of Object.entries(els)) {
    if (!amount || amount <= 0) continue;
    holder.elementPackets.push({
      packetId: nextPacketId(state || {}),
      element,
      originalElement: element,
      amount: Number(amount),
      ownerSide: source.ownerSide || null,
      sourceUnitId: source.sourceUnitId || null,
      sourceName: source.sourceName || 'legacy_state',
      sourceActionId: source.sourceActionId || 'legacy_backfill',
      createdRound: state?.round || 0,
      modifiers: [],
      tags: ['legacy_backfill']
    });
  }
  return holder.elementPackets;
}
function addElementPacket(state, holder, element, amount, source = {}, options = {}) {
  if (!holder || !element || amount <= 0) return null;
  ensureElementPackets(holder);
  const before = Number((holder.elements || {})[element] || 0);
  const packet = {
    packetId: options.packetId || nextPacketId(state),
    element,
    originalElement: options.originalElement || element,
    amount: Number(amount),
    ownerSide: source.ownerSide || source.camp || null,
    sourceUnitId: source.unitId || source.sourceUnitId || null,
    sourceName: source.sourceName || source.name || null,
    sourceActionId: source.actionId || source.sourceActionId || null,
    sourceSkillId: source.skillId || source.sourceSkillId || null,
    createdRound: state?.round || 0,
    createdStep: state?.nextStep || 0,
    convertedBy: options.convertedBy || null,
    modifiers: clone(options.modifiers || []),
    tags: Array.from(new Set([...(source.tags || []), ...(options.tags || [])]))
  };
  holder.elementPackets.push(packet);
  syncElementTotals(holder);
  const after = Number(holder.elements[element] || 0);
  recordChange(state, {
    type: 'ADD_ELEMENT_PACKET',
    path: options.path || `holder.elements.${element}`,
    from: before,
    to: after,
    delta: Number(amount),
    source: { packetId: packet.packetId, ...source },
    reason: options.reason || 'add_element_packet',
    tags: ['element_packet', element]
  });
  return packet;
}
function consumeElementPackets(state, holder, element, amount, source = {}) {
  ensureElementPackets(holder);
  let remain = Number(amount || 0);
  let consumed = 0;
  const consumedPackets = [];
  const before = Number((holder.elements || {})[element] || 0);
  for (const packet of holder.elementPackets) {
    if (remain <= 0) break;
    if (packet.element !== element || packet.amount <= 0) continue;
    const take = Math.min(packet.amount, remain);
    packet.amount -= take;
    remain -= take;
    consumed += take;
    consumedPackets.push({ packetId: packet.packetId, amount: take, sourceUnitId: packet.sourceUnitId, sourceName: packet.sourceName });
  }
  holder.elementPackets = holder.elementPackets.filter(p => p.amount > 0);
  syncElementTotals(holder);
  const after = Number(holder.elements[element] || 0);
  if (consumed > 0) recordChange(state, {
    type: 'CONSUME_ELEMENT_PACKETS',
    path: `holder.elements.${element}`,
    from: before,
    to: after,
    delta: -consumed,
    source: { ...source, consumedPackets },
    reason: source.reason || 'consume_element_packets',
    tags: ['element_packet', 'consume', element]
  });
  return { consumed, consumedPackets };
}
function convertElementPackets(state, holder, fromElement, toElement, amount = Infinity, source = {}, options = {}) {
  ensureElementPackets(holder);
  let remain = amount === Infinity ? Infinity : Number(amount || 0);
  let converted = 0;
  const packetIds = [];
  const beforeFrom = Number((holder.elements || {})[fromElement] || 0);
  const beforeTo = Number((holder.elements || {})[toElement] || 0);
  for (const packet of holder.elementPackets) {
    if (remain <= 0) break;
    if (packet.element !== fromElement || packet.amount <= 0) continue;
    const take = remain === Infinity ? packet.amount : Math.min(packet.amount, remain);
    if (take < packet.amount) {
      const split = clone(packet);
      split.packetId = nextPacketId(state);
      split.amount = take;
      split.element = toElement;
      split.originalElement = split.originalElement || fromElement;
      split.convertedBy = source.unitId || source.sourceUnitId || source.name || source.sourceName || null;
      split.tags = Array.from(new Set([...(split.tags || []), 'converted', `${fromElement}_to_${toElement}`]));
      if (options.preserveModifiers === false) split.modifiers = [];
      packet.amount -= take;
      holder.elementPackets.push(split);
      packetIds.push(split.packetId);
    } else {
      packet.element = toElement;
      packet.originalElement = packet.originalElement || fromElement;
      packet.convertedBy = source.unitId || source.sourceUnitId || source.name || source.sourceName || null;
      packet.tags = Array.from(new Set([...(packet.tags || []), 'converted', `${fromElement}_to_${toElement}`]));
      if (options.preserveModifiers === false) packet.modifiers = [];
      packetIds.push(packet.packetId);
    }
    converted += take;
    if (remain !== Infinity) remain -= take;
  }
  syncElementTotals(holder);
  if (converted > 0) recordChange(state, {
    type: 'CONVERT_ELEMENT_PACKETS',
    path: `holder.elementPackets.${fromElement}->${toElement}`,
    from: { [fromElement]: beforeFrom, [toElement]: beforeTo },
    to: { [fromElement]: holder.elements[fromElement] || 0, [toElement]: holder.elements[toElement] || 0 },
    delta: converted,
    source: { ...source, packetIds, preserveModifiers: options.preserveModifiers !== false },
    reason: source.reason || 'convert_element_packets',
    tags: ['element_packet', 'convert', fromElement, toElement]
  });
  return { converted, packetIds };
}

function addElementPacketToHolder(state, holder, element, layers, source = {}, options = {}) {
  ensureElementPackets(holder);
  const incoming = { element, amount: Number(layers || 0) };
  const modResult = applyNextElementModifiers(state, holder, incoming, source);
  const packet = addElementPacket(state, holder, element, modResult.amount, source, options);
  return { packet, amount: modResult.amount, modifierApplied: modResult.applied };
}

function collectPacketModifiers(holder, trigger) {
  ensureElementPackets(holder);
  const out = [];
  for (const packet of holder.elementPackets) {
    for (const mod of packet.modifiers || []) {
      if (!trigger || mod.trigger === trigger) out.push({ packet, modifier: mod });
    }
  }
  return out;
}
function applyNextElementModifiers(state, holder, incoming, source = {}) {
  ensureElementPackets(holder);
  const replacement = applyReplacementEffects(state, holder, {
    type: 'ADD_ELEMENT_PACKET',
    trigger: 'before_next_add_element',
    element: incoming.element,
    amount: Number(incoming.amount || 0),
    path: `incoming.${incoming.element}.amount`
  }, source);
  const amount = Number(replacement.event.amount || 0);
  const applied = replacement.applied || [];
  // 保留旧事件类型，兼容现有测试/战报；实际计算已委托 replacementEffects。
  if (applied.length) recordChange(state, {
    type: 'APPLY_ELEMENT_MODIFIERS',
    path: `incoming.${incoming.element}.amount`,
    from: incoming.amount,
    to: amount,
    delta: amount - incoming.amount,
    source: { ...source, applied, replacementEngine: true },
    reason: 'packet_modifier_before_next_add_element',
    tags: ['modifier', 'element_packet']
  });
  return { amount, applied };
}
module.exports = { ensureElementPackets, syncElementTotals, legacyBackfillPackets, addElementPacket, addElementPacketToHolder, consumeElementPackets, convertElementPackets, collectPacketModifiers, applyNextElementModifiers };
