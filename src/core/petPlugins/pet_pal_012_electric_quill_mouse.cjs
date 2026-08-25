const id = 'pet_pal_012_electric_quill_mouse';

function projectElementSettlement(context = {}) {
  if (context.element !== '火') return { bonusDamage: 0 };
  const fireLayers = Math.max(0, Number(context.elements?.火 || 0));
  const lightningLayers = Math.max(0, Number(context.elements?.雷 || 0));
  const perPair = Math.max(0, Number(context.params?.per_pair ?? 2));
  return { bonusDamage: Math.min(fireLayers, lightningLayers) * perPair };
}

module.exports = Object.freeze({ id, hooks: Object.freeze({ projectElementSettlement }) });
