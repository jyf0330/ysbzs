const id = 'mech_element_layer_threshold_bonus';

function projectElementSettlement(context = {}) {
  const filter = String(context.params?.element ?? context.element ?? '');
  if (!context.element || context.element !== filter) return { bonusDamage: 0 };
  const layers = Math.max(0, Number(context.elements?.[context.element] || 0));
  const threshold = Math.max(1, Number(context.params?.threshold ?? 1));
  const bonus = Math.max(0, Number(context.params?.bonus ?? 0));
  return { bonusDamage: layers >= threshold ? bonus : 0 };
}

module.exports = Object.freeze({ id, hooks: Object.freeze({ projectElementSettlement }) });
