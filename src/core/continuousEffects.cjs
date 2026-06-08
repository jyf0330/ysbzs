/**
 * continuousEffects.cjs — Forge/MTG 风格 continuous effect 的轻量版。
 * 持续修饰 base -> final，不直接改一次性状态。
 */
const { computeModifiedValue } = require('./modifierEngine.cjs');
function relationMatches(sourcePos, targetPos, relation) {
  if (!sourcePos || !targetPos) return false;
  const dr = targetPos.r - sourcePos.r;
  const dc = targetPos.c - sourcePos.c;
  if (relation === 'adjacent') return Math.abs(dr) + Math.abs(dc) === 1;
  if (relation === 'left') return dr === 0 && dc === 1;
  if (relation === 'right') return dr === 0 && dc === -1;
  if (relation === 'front' || relation === 'up') return dr === -1 && dc === 0;
  if (relation === 'back' || relation === 'down') return dr === 1 && dc === 0;
  return relation === 'any';
}
function collectContinuousEffects(state, context = {}) {
  const out = [];
  for (const u of state.units || []) {
    if (!u.alive) continue;
    for (const eff of u.continuousEffects || []) out.push({ ...eff, sourceId: u.id, sourceName: u.displayName || u.name, sourcePosition: u.position });
    for (const mechId of u.mechanics || []) {
      if (mechId === 'mech_water_catalyst_seed') out.push({ id:'cont_water_adjacent_x2', sourceId:u.id, sourceName:u.name, relation:'adjacent', targetElement:'火', targetPath:'action.addElement.火', op:'multiply', value:2, priority:80, sourcePosition:u.position });
    }
  }
  for (const domain of state.leaders?.player?.domains || []) out.push({ ...domain, sourceId: domain.providerUnitId || 'leader_domain', sourceName: domain.name || domain.id, priority: Number(domain.priority || 100) });
  return out.filter(e => !context.targetPath || e.targetPath === context.targetPath || e.targetPath === context.stat);
}
function effectApplies(effect, context = {}) {
  if (effect.targetElement && context.element && effect.targetElement !== context.element) return false;
  if (effect.relation && effect.relation !== 'any' && !relationMatches(effect.sourcePosition, context.targetPosition || context.position, effect.relation)) return false;
  return true;
}
function applyContinuousEffects(state, base, context = {}) {
  const effects = collectContinuousEffects(state, context).filter(e => effectApplies(e, context)).map(e => ({ id:e.id, op:e.op, value:e.value, priority:e.priority, sourceId:e.sourceId, sourceName:e.sourceName }));
  return computeModifiedValue(base, effects, context);
}
module.exports = { collectContinuousEffects, applyContinuousEffects, relationMatches };
