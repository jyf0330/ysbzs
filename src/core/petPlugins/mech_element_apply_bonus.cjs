const id = 'mech_element_apply_bonus';

function afterElementApply(context = {}) {
  const filter = String(context.params?.element ?? '');
  if ((filter && context.element !== filter) || !context.cell) return { terrainPatches: [] };
  const layers = Math.max(0, Number(context.params?.bonus_layers ?? 1));
  const element = String(context.element);
  return { terrainPatches: [{ x: Number(context.cell.x), y: Number(context.cell.y), element, layers }] };
}

module.exports = Object.freeze({ id, hooks: Object.freeze({ afterElementApply }) });
