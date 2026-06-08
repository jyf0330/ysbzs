/**
 * elements.cjs — 元素配置、元素包与反应规则统一入口
 *
 * 第一版启用元素：火、水、风；兼容保留土。
 * 系统默认四元素3层成型，默认元素伤害公式为 Σ(1..N)。
 */

const packets = require('./elementPackets.cjs');
const { recordChange } = require('./changeLog.cjs');
const { applyContinuousEffects } = require('./continuousEffects.cjs');
const { enqueueTrigger, drainTriggerQueue } = require('./triggerQueue.cjs');

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
function fireDamage(layers) { const n = Math.max(0, Number(layers || 0)); return (n * (n + 1)) / 2; }
function ensureCellElements(cell) {
  if (!cell.elements) cell.elements = makeEmptyElements(true);
  for (const el of COMPAT_ELEMENTS) if (typeof cell.elements[el] !== 'number') cell.elements[el] = 0;
  if (!cell.elementCamps) cell.elementCamps = makeEmptyElementCamps(true);
  return cell.elements;
}
function ensureHolderPackets(state, holder, source = {}) {
  packets.ensureElementPackets(holder);
  packets.legacyBackfillPackets(state, holder, source);
  packets.syncElementTotals(holder);
  return holder.elementPackets;
}
function applyContinuousLayerModifiers(state, actor, element, layers, cell, source = 'element_apply') {
  const base = Number(layers || 0);
  if (!state || base <= 0) return { amount: base, applied: [] };
  const result = applyContinuousEffects(state, base, {
    targetPath: `action.addElement.${element}`,
    stat: `action.addElement.${element}`,
    element,
    actorId: actor?.id || null,
    targetPosition: actor?.position || null,
    cellPosition: cell ? { r: cell.r, c: cell.c } : null,
    source
  });
  if (Number(result.final) !== base) recordChange(state, {
    type: 'APPLY_CONTINUOUS_EFFECTS',
    path: `action.addElement.${element}`,
    from: base,
    to: Number(result.final),
    delta: Number(result.final) - base,
    source: { actorId: actor?.id, actorName: actor?.displayName || actor?.name, applied: result.applied, source },
    reason: 'continuous_effects_before_add_element',
    tags: ['continuous_effect', 'element_packet']
  });
  return { amount: Number(result.final), applied: result.applied || [] };
}

function enqueueElementPacketTrigger(state, packet, cell, actor, element, source) {
  if (!state || !packet) return [];
  enqueueTrigger(state, {
    id: `trigger_${packet.packetId}`,
    trigger: 'after_add_element_packet',
    sourceKind: 'element_packet',
    objectType: 'element_packet',
    objectId: packet.packetId,
    element,
    amount: packet.amount,
    position: cell ? { r: cell.r, c: cell.c } : actor?.position || null,
    priority: 0,
    createdAt: state.nextStep || 0,
    source
  });
  return drainTriggerQueue(state, t => {
    recordChange(state, {
      type: 'TRIGGER_QUEUE_RESOLVE',
      path: `triggerQueue.${t.trigger}`,
      from: 'queued',
      to: 'resolved',
      delta: 0,
      source: { triggerId: t.id, objectId: t.objectId, element: t.element, amount: t.amount },
      reason: 'trigger_queue_after_add_element_packet',
      tags: ['trigger_queue', 'element_packet']
    });
    return t;
  });
}

function addElementToCell(state, actor, cell, element, layers, source = 'element_apply', options = {}) {
  if (!cell || !element || layers <= 0) return { kind: 'blocked' };
  ensureCellElements(cell);
  ensureHolderPackets(state, cell, { sourceName: 'cell_legacy', sourceActionId: 'legacy_cell' });
  const cont = applyContinuousLayerModifiers(state, actor, element, layers, cell, source);
  const incoming = { element, amount: Number(cont.amount) };
  const modResult = packets.applyNextElementModifiers(state, cell, incoming, {
    unitId: actor?.id,
    sourceUnitId: actor?.id,
    sourceName: actor?.displayName || actor?.name,
    reason: source
  });
  const before = cell.elements[element] || 0;
  const packet = packets.addElementPacket(state, cell, element, modResult.amount, {
    unitId: actor?.id,
    sourceUnitId: actor?.id,
    sourceName: actor?.displayName || actor?.name || '系统',
    sourceActionId: source,
    ownerSide: actor?.camp || actor?.side || null,
    tags: options.tags || []
  }, {
    reason: source,
    modifiers: options.modifiers || [],
    tags: options.tags || [],
    path: `board.cell.${cell.r}.${cell.c}.elements.${element}`
  });
  cell.elementCamps[element] = actor?.camp || actor?.side || cell.elementCamps[element] || null;
  const after = cell.elements[element] || 0;
  const triggers = enqueueElementPacketTrigger(state, packet, cell, actor, element, source);
  return { kind: 'element_packet', packet, from: before, to: after, layers: modResult.amount, modifierApplied: [...(cont.applied || []), ...(modResult.applied || [])], triggers };
}
function addElementPacketToHolder(state, holder, element, layers, source = {}, options = {}) {
  ensureHolderPackets(state, holder, source);
  if (options.skipModifiers) {
    const packet = packets.addElementPacket(state, holder, element, Number(layers || 0), source, options);
    return { packet, amount: Number(layers || 0), modifierApplied: [] };
  }
  const incoming = { element, amount: Number(layers || 0) };
  const modResult = packets.applyNextElementModifiers(state, holder, incoming, source);
  const packet = packets.addElementPacket(state, holder, element, modResult.amount, source, options);
  return { packet, amount: modResult.amount, modifierApplied: modResult.applied };
}
function waterCatalyst(state, cell, baseLayers, source = {}) {
  if (!cell || baseLayers <= 0) return baseLayers;
  ensureCellElements(cell);
  ensureHolderPackets(state, cell, { sourceName: 'water_legacy', sourceActionId: 'water_catalyst_backfill' });
  const water = cell.elements.水 || 0;
  if (water <= 0) return baseLayers;
  const before = water;
  packets.consumeElementPackets(state, cell, '水', 1, { ...source, reason: 'water_catalyst' });
  const after = cell.elements.水 || 0;
  recordChange(state, { type: 'WATER_CATALYST', path: `board.cell.${cell.r}.${cell.c}.elements.水`, from: before, to: after, delta: -1, source, reason: `水汽催化：消耗1水，本次元素层+${baseLayers}→+${baseLayers * 2}`, tags: ['water_catalyst'] });
  return baseLayers * 2;
}
function transferFire(state, fromCell, toCell, amount, source = {}) {
  if (!fromCell || !toCell || amount <= 0) return 0;
  ensureCellElements(fromCell); ensureCellElements(toCell);
  ensureHolderPackets(state, fromCell, { sourceName: 'fire_legacy', sourceActionId: 'wind_gather_backfill' });
  ensureHolderPackets(state, toCell, { sourceName: 'fire_legacy', sourceActionId: 'wind_gather_backfill' });
  const movedInfo = packets.consumeElementPackets(state, fromCell, '火', amount, { ...source, reason: 'wind_gather_fire_consume' });
  const moved = movedInfo.consumed;
  if (moved <= 0) return 0;
  packets.addElementPacket(state, toCell, '火', moved, {
    sourceUnitId: source.unitId || source.sourceUnitId || null,
    sourceName: source.sourceName || '风聚火',
    sourceActionId: source.sourceActionId || 'wind_gather_fire',
    ownerSide: source.ownerSide || null,
    tags: ['wind_gather', 'transferred_fire']
  }, { reason: 'wind_gather_fire', tags: ['wind_gather', 'transferred_fire'], path: `board.cell.${toCell.r}.${toCell.c}.elements.火` });
  return moved;
}
function clearElement(state, holder, element, source = {}) {
  if (!holder) return 0;
  ensureHolderPackets(state, holder, source);
  const before = holder.elements?.[element] || 0;
  const out = packets.consumeElementPackets(state, holder, element, before, { ...source, reason: source.reason || 'clear_element' });
  holder.elements[element] = 0;
  return out.consumed;
}
function convertElementPackets(state, holder, fromElement, toElement, amount = Infinity, source = {}, options = {}) {
  return packets.convertElementPackets(state, holder, fromElement, toElement, amount, source, options);
}
function explodeIfEnemyOnFire(state, cell, sourceId, options = {}) {
  ensureCellElements(cell);
  const layers = cell.elements.火 || 0;
  if (layers < 3) return false;
  const target = (state.units || []).find(u => u.side === 'enemy' && u.alive && u.position && u.position.r === cell.r && u.position.c === cell.c);
  if (!target) return false;
  const dmg = fireDamage(layers);
  const before = layers;
  clearElement(state, cell, '火', { sourceUnitId: sourceId, reason: 'fire_explosion_clear' });
  return { target, damage: dmg, layersBefore: before, formula: 'sum_1_to_n', source: options.source || null };
}
module.exports = {
  ACTIVE_ELEMENTS,
  COMPAT_ELEMENTS,
  makeEmptyElements,
  makeEmptyElementCamps,
  isActive,
  fireDamage,
  ensureCellElements,
  ensureHolderPackets,
  addElementToCell,
  addElementPacketToHolder,
  waterCatalyst,
  transferFire,
  clearElement,
  convertElementPackets,
  explodeIfEnemyOnFire
};
