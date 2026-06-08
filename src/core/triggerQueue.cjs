/** triggerQueue.cjs — 大巴扎式触发队列排序 */
function boardOrderIndex(pos = {}) { return Number(pos.r || 0) * 100 + Number(pos.c || 0); }
function triggerOrderRank(t = {}) {
  const map = { system: 10, hero_domain: 20, board_order: 30, pet: 40, action_slot: 50, element_packet: 60, relic: 70 };
  return map[t.sourceKind || t.objectType] || Number(t.orderRank || 50);
}
function sortTriggerQueue(queue = []) {
  return queue.slice().sort((a, b) =>
    (Number(b.priority || 0) - Number(a.priority || 0)) ||
    (triggerOrderRank(a) - triggerOrderRank(b)) ||
    (boardOrderIndex(a.position) - boardOrderIndex(b.position)) ||
    (Number(a.createdAt || 0) - Number(b.createdAt || 0)) ||
    String(a.id || a.triggerId || '').localeCompare(String(b.id || b.triggerId || ''))
  );
}
function enqueueTrigger(state, trigger) {
  if (!state.triggerQueue) state.triggerQueue = [];
  state.triggerQueue.push(trigger);
  return trigger;
}
function drainTriggerQueue(state, executor) {
  const ordered = sortTriggerQueue(state.triggerQueue || []);
  state.triggerQueue = [];
  const results = [];
  for (const t of ordered) results.push(executor ? executor(t) : t);
  return results;
}
module.exports = { boardOrderIndex, sortTriggerQueue, enqueueTrigger, drainTriggerQueue };
