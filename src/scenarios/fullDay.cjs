const { createGameState } = require('../core/state.cjs');
const dayRoute = require('../core/dayRoute.cjs');

function clone(value) { return JSON.parse(JSON.stringify(value)); }

function runFullDayScenario(opts = {}) {
  const state = createGameState({ day: opts.day || 1, period: opts.period || '上午', gold: opts.gold ?? 3, seed: opts.seed, battleId: opts.battleId });
  dayRoute.runDayRoute(state);
  return state;
}

function resetRouteForDay(state, day) {
  state.day = day;
  state.period = '上午';
  state.round = 0;
  state.result = null;
  state.phase = 'init';
  state.dayRoute = { day, nodeIndex: 0, battleIndex: 0, options: [], battleOptions: [], currentEncounter: null, history: [], battleOutcomes: [], pendingRewards: [], claimedRewards: [] };
  state.rewards = [];
  state.shop.offers = [];
  state.shop.activePool = 'night_base';
  state.shop.activeStall = null;
  state.shop.refreshState = { freeRolls: state.shop.freeRolls || 0, nextDiscount: state.shop.nextDiscount || 0, targetedRestocks: [], effects: [], lastRoll: null };
}

function runDayRangeScenario(opts = {}) {
  const fromDay = Number(opts.fromDay || 1);
  const toDay = Number(opts.toDay || fromDay);
  const state = createGameState({ day: fromDay, period: '上午', gold: opts.gold ?? 3, seed: opts.seed, battleId: opts.battleId });
  state.dayRouteRuns = [];
  for (let day = fromDay; day <= toDay; day += 1) {
    resetRouteForDay(state, day);
    dayRoute.runDayRoute(state);
    state.dayRouteRuns.push({
      day,
      phase: state.phase,
      nodeIndex: state.dayRoute.nodeIndex,
      battleIndex: state.dayRoute.battleIndex,
      history: clone(state.dayRoute.history),
      battleOutcomes: clone(state.dayRoute.battleOutcomes),
      pendingRewards: clone(state.dayRoute.pendingRewards),
      claimedRewards: clone(state.dayRoute.claimedRewards)
    });
    if (state.phase !== 'day_end') break;
  }
  return state;
}

module.exports = { runFullDayScenario, runDayRangeScenario };
