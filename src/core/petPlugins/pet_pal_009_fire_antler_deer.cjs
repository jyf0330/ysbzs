const id = 'pet_pal_009_fire_antler_deer';

function afterElementApply(context = {}) {
  if (context.element !== '火' || !context.cell) return { terrainPatches: [] };
  const layers = Math.max(0, Number(context.params?.bonus_layers ?? 1));
  return { terrainPatches: [{ x: Number(context.cell.x), y: Number(context.cell.y), element: '火', layers }] };
}

module.exports = Object.freeze({ id, hooks: Object.freeze({ afterElementApply }) });
