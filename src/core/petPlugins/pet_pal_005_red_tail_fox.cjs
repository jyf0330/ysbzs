const id = 'pet_pal_005_red_tail_fox';

function projectElementSettlement(context = {}) {
  if (context.element !== '火') return { bonusDamage: 0 };
  const fireLayers = Math.max(0, Number(context.elements?.火 || 0));
  const perLayer = Math.max(0, Number(context.params?.per_layer ?? 1));
  return { bonusDamage: fireLayers * perLayer };
}

module.exports = Object.freeze({ id, hooks: Object.freeze({ projectElementSettlement }) });
