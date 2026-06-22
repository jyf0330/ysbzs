const battle = require('./core/battle.cjs');
const { resolveShapeDefinition } = require('./core/battle/shapeCatalog.cjs');

function shapeVisualForVM(shapeId) {
  const def = resolveShapeDefinition(shapeId);
  if (!def) return null;
  return {
    shapeGroup: def.group,
    shapeGrid: def.grid.slice(),
    shapeOffsets: def.offsets.map(offset => ({ dr: offset.dr, dc: offset.dc })),
    settleCount: def.settleCount,
    shapeNote: def.note
  };
}

function slotsForVM(state, unit) {
  return battle.slotsForUnit(state, unit).map(slot => Object.assign({
    slotId: slot.slotId,
    index: slot.index,
    label: slot.label,
    element: slot.element,
    layers: slot.layers,
    baseLayers: slot.baseLayers,
    settleCount: slot.settleCount,
    shapeId: slot.shapeId,
    shapeName: slot.shapeName,
    hitCells: slot.hitCells,
    direction: slot.direction,
    used: slot.used,
    availableAp: slot.availableAp,
    canUse: slot.canUse
  }, shapeVisualForVM(slot.shapeId) || {}));
}

function shapeForVM(shape) {
  if (!shape) return null;
  return Object.assign({
    shapeId: shape.shapeId,
    shapeName: shape.shapeName,
    shapeClass: shape.shapeClass,
    hitCells: shape.hitCells,
    slotCount: shape.slotCount,
    slotElements: shape.slotElements,
    actionType: shape.actionType,
    skill: shape.skill,
    note: shape.note
  }, shapeVisualForVM(shape.shapeId) || {});
}

module.exports = { shapeForVM, slotsForVM };
