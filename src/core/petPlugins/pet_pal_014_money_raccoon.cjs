const id = 'pet_pal_014_money_raccoon';

function battleEnd(context = {}) {
  const alive = context.owner?.alive !== false && Number(context.owner?.hp || 0) > 0;
  if (!context.win || !alive) return { gold: 0 };
  return { gold: Math.max(0, Number(context.params?.gold ?? 1)) };
}

module.exports = Object.freeze({ id, hooks: Object.freeze({ battleEnd }) });
