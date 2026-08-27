const id = 'mech_element_pair_bonus';

function projectElementSettlement(context = {}) {
  const elementA = String(context.params?.element_a ?? context.element ?? '');
  const elementB = String(context.params?.element_b ?? '');
  if (!context.element || context.element !== elementA || !elementB) return { bonusDamage: 0 };
  const layersA = Math.max(0, Number(context.elements?.[elementA] || 0));
  const layersB = Math.max(0, Number(context.elements?.[elementB] || 0));
  const perPair = Math.max(0, Number(context.params?.per_pair ?? 1));
  return { bonusDamage: Math.min(layersA, layersB) * perPair };
}

module.exports = Object.freeze({ id, hooks: Object.freeze({ projectElementSettlement }) });
