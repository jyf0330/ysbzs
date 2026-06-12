const { createGameState } = require('../core/state.cjs');
const dayRoute = require('../core/dayRoute.cjs');

function runFullDayScenario(opts = {}) {
  const state = createGameState({ day: opts.day || 1, period: opts.period || '上午', gold: opts.gold ?? 3, seed: opts.seed, battleId: opts.battleId });
  if (state.day === 1) {
    dayRoute.runDayRoute(state);
    return state;
  }
  state.phase = 'day_end';
  return state;
}

module.exports = { runFullDayScenario };
