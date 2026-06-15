/** explainTrace.cjs — 结构化事件转中文解释 */
function explainChange(change) {
  if (!change) return '';
  if (change.type === 'ADD_ELEMENT_PACKET') return `${change.source?.sourceName || change.source?.sourceUnitId || '来源'} 添加元素包，${change.path} ${change.from}→${change.to}。`;
  if (change.type === 'CONVERT_ELEMENT_PACKETS') return `元素包转换：${JSON.stringify(change.from)}→${JSON.stringify(change.to)}，保留来源与modifier。`;
  if (change.type === 'APPLY_ELEMENT_MODIFIERS') return `元素包modifier生效：${change.path} ${change.from}→${change.to}。`;
  if (change.type === 'TRIGGER_OBJECT_RESOLVE') return `触发物体：${change.source?.objectId || change.path || 'unknown'} ${change.from ?? ''}→${change.to ?? ''}${change.source?.unitId ? `，目标=${change.source.unitId}` : ''}。`;
  return `${change.type}: ${change.path || ''} ${change.from ?? ''}→${change.to ?? ''}`;
}
function buildTraceFromChanges(changes = []) { return changes.map(explainChange).filter(Boolean); }
module.exports = { explainChange, buildTraceFromChanges };
