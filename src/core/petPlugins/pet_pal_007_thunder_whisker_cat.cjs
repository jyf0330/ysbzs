const id = 'pet_pal_007_thunder_whisker_cat';
const ORTHOGONAL = Object.freeze([[1, 0], [-1, 0], [0, 1], [0, -1]]);

function afterElementApply(context = {}) {
  if (context.element !== '火' || !context.cell) return { terrainPatches: [] };
  const width = Math.max(0, Number(context.board?.width || 0));
  const height = Math.max(0, Number(context.board?.height || 0));
  const layers = Math.max(0, Number(context.params?.spread_layers ?? 1));
  const terrainPatches = ORTHOGONAL
    .map(([dx, dy]) => ({ x: Number(context.cell.x) + dx, y: Number(context.cell.y) + dy, element: '火', layers }))
    .filter(patch => patch.x >= 0 && patch.x < width && patch.y >= 0 && patch.y < height);
  return { terrainPatches };
}

module.exports = Object.freeze({ id, hooks: Object.freeze({ afterElementApply }) });
