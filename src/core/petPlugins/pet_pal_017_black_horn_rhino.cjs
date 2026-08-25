const id = 'pet_pal_017_black_horn_rhino';

function afterHit(context = {}) {
  if (context.element !== '火' || !context.targetCell || !context.direction) return { movement: null };
  const distance = Math.max(0, Number(context.params?.distance ?? 1));
  return {
    movement: {
      targetId: context.targetId,
      x: Number(context.targetCell.x) + Number(context.direction.x) * distance,
      y: Number(context.targetCell.y) + Number(context.direction.y) * distance,
      requiresEmptyCell: true,
      settlesElementNow: false
    }
  };
}

module.exports = Object.freeze({ id, hooks: Object.freeze({ afterHit }) });
