const { MECHANIC_STATUS } = require('./mechanics.cjs');

function statusOfMechanic(id) {
  return MECHANIC_STATUS[id || 'none'] || 'unknown';
}
function mechanicIdsForUnit(unit = {}) {
  return (unit.mechanics || []).filter(Boolean);
}
function unsupportedMechanicsForUnit(unit = {}, opts = {}) {
  const allowDataOnly = !!opts.allowDataOnly;
  return mechanicIdsForUnit(unit)
    .map(id => ({ id, status: statusOfMechanic(id) }))
    .filter(x => x.id !== 'none')
    .filter(x => x.status !== 'implemented')
    .filter(x => !(allowDataOnly && x.status === 'data_only'));
}
function auditPlayableUnits(state, opts = {}) {
  return (state.units || [])
    .filter(u => u && u.side === 'hero' && u.alive !== false && u.active !== false)
    .map(unit => ({ unitId: unit.id, petId: unit.petId, name: unit.displayName || unit.name, unsupported: unsupportedMechanicsForUnit(unit, opts) }))
    .filter(x => x.unsupported.length > 0);
}
function canActivateUnit(unit, opts = {}) {
  return unsupportedMechanicsForUnit(unit, opts).length === 0;
}
function activationBlockReason(unit, opts = {}) {
  const unsupported = unsupportedMechanicsForUnit(unit, opts);
  if (!unsupported.length) return null;
  return `机制未实装：${unsupported.map(x => `${x.id}(${x.status})`).join('、')}`;
}

module.exports = { statusOfMechanic, unsupportedMechanicsForUnit, auditPlayableUnits, canActivateUnit, activationBlockReason };
