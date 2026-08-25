const id = 'pet_pal_019_night_burrow_mole';

function projectElementSettlement(context = {}) {
  if (context.element !== '火') return { bonusDamage: 0 };
  const fireLayers = Math.max(0, Number(context.elements?.火 || 0));
  const threshold = Math.max(1, Number(context.params?.threshold ?? 3));
  const bonus = Math.max(0, Number(context.params?.bonus ?? 5));
  return { bonusDamage: fireLayers >= threshold ? bonus : 0 };
}

module.exports = Object.freeze({ id, hooks: Object.freeze({ projectElementSettlement }) });
