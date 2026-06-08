/**
 * battleEventProtocol.cjs — Pokémon Showdown 风格的轻量 battle event protocol。
 *
 * 结构化事件是事实；text 只是展示层。不要在 text 里反推规则。
 */
function clone(v) { return JSON.parse(JSON.stringify(v)); }
function nextBattleEventId(state) {
  const n = state.nextBattleEvent || 1;
  state.nextBattleEvent = n + 1;
  return `evt_${String(n).padStart(6, '0')}`;
}
function posToTarget(pos) {
  if (!pos || pos.r === undefined || pos.c === undefined) return null;
  return { type: 'cell', r: pos.r, c: pos.c };
}
function sourceToActor(source = {}) {
  if (!source) return null;
  const id = source.actorId || source.unitId || source.sourceUnitId || source.id || null;
  const name = source.actorName || source.sourceName || source.name || null;
  if (!id && !name) return null;
  return { id, name, side: source.ownerSide || source.side || source.camp || null };
}
function normalizeChange(change = {}) {
  return {
    path: change.path || null,
    from: change.from,
    to: change.to,
    delta: change.delta,
    damageType: change.damageType || null,
    element: change.element || (Array.isArray(change.tags) ? change.tags.find(t => ['火','水','风','土'].includes(t)) : null),
    packetId: change.source?.packetId || null,
    modifierId: change.source?.modifierId || null,
    source: change.source ? clone(change.source) : null,
    reason: change.reason || null,
    tags: change.tags || []
  };
}
function explainProtocolEvent(event) {
  const change = event.changes && event.changes[0];
  const actor = event.actor?.name || event.actor?.id || event.source?.sourceName || '系统';
  if (event.type === 'ADD_ELEMENT_PACKET' && change) {
    const element = event.payload?.element || change.element || '';
    const amount = event.payload?.amount ?? change.delta ?? '';
    return `${actor}添加${element}${amount}层，${change.path || ''} ${change.from}→${change.to}。`;
  }
  if (event.type === 'CONVERT_ELEMENT_PACKETS') {
    const p = event.payload || {};
    return `${actor}将${p.fromElement || ''}元素包转换为${p.toElement || ''}元素包，保留来源与modifier。`;
  }
  if (event.type === 'APPLY_ELEMENT_MODIFIERS' && change) {
    return `${actor}的元素包modifier生效：${change.path || ''} ${change.from}→${change.to}。`;
  }
  if (event.type === 'WATER_CATALYST') return event.reason || '水汽催化触发。';
  return event.text || `${event.type}${change ? ` ${change.path || ''} ${change.from ?? ''}→${change.to ?? ''}` : ''}`;
}
function createBattleEvent(state, input = {}) {
  const change = input.change || input;
  const type = input.type || change.type || 'EVENT';
  const payload = Object.assign({}, input.payload || {});
  if (type === 'ADD_ELEMENT_PACKET') {
    payload.element = payload.element || (change.tags || []).find(t => ['火','水','风','土'].includes(t));
    payload.amount = payload.amount ?? change.delta;
    payload.packetId = payload.packetId || change.source?.packetId || null;
  }
  if (type === 'CONVERT_ELEMENT_PACKETS') {
    const tags = change.tags || [];
    payload.fromElement = payload.fromElement || tags[2] || null;
    payload.toElement = payload.toElement || tags[3] || null;
    payload.packetIds = payload.packetIds || change.source?.packetIds || [];
    payload.preserveModifiers = change.source?.preserveModifiers !== false;
  }
  const event = {
    eventId: input.eventId || nextBattleEventId(state),
    kind: input.kind || 'change',
    type,
    step: state?.nextStep || change.step || 0,
    round: state?.round || change.round || 0,
    phase: state?.phase || change.phase || 'unknown',
    actor: input.actor || sourceToActor(change.source),
    target: input.target || (change.target || null),
    payload,
    changes: [normalizeChange(change)],
    source: change.source ? clone(change.source) : null,
    reason: change.reason || null,
    tags: change.tags || [],
    text: input.text || change.text || null
  };
  event.protocol = eventToProtocolLine(event);
  event.text = event.text || explainProtocolEvent(event);
  return event;
}
function eventToProtocolLine(event) {
  const parts = ['|'+event.type, `id=${event.eventId}`, `round=${event.round}`, `phase=${event.phase}`];
  if (event.actor?.id) parts.push(`actor=${event.actor.id}`);
  if (event.actor?.name) parts.push(`actorName=${event.actor.name}`);
  if (event.target?.type === 'cell') parts.push(`cell=${event.target.r},${event.target.c}`);
  if (event.payload?.element) parts.push(`element=${event.payload.element}`);
  if (event.payload?.amount !== undefined) parts.push(`amount=${event.payload.amount}`);
  if (event.payload?.packetId) parts.push(`packet=${event.payload.packetId}`);
  return parts.join('|');
}
function recordBattleEvent(state, eventInput) {
  if (!state) return null;
  if (!Array.isArray(state.battleTrace)) state.battleTrace = [];
  const event = createBattleEvent(state, eventInput);
  state.battleTrace.push(event);
  return event;
}
module.exports = { createBattleEvent, recordBattleEvent, eventToProtocolLine, explainProtocolEvent };
