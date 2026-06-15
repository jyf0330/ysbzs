const { createGameState } = require('../core/state.cjs');
const dayRoute = require('../core/dayRoute.cjs');
const { buildConstructionSummary } = require('../core/buildSummary.cjs');

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

function compactBuildCore(summary) {
  return {
    summaryText: summary.summaryText,
    primaryTags: (summary.primaryTags || []).map(x => ({ id: x.id, label: x.label, kind: x.kind, weight: x.weight }))
  };
}

function constructionSnapshot(state, before = null) {
  const summary = buildConstructionSummary(state);
  const inventoryCount = summary.inventory.totalCount;
  const relicCount = summary.relicCount;
  return {
    inventoryFrom: before ? before.inventoryCount : inventoryCount,
    inventoryCount,
    inventoryDelta: before ? inventoryCount - before.inventoryCount : 0,
    activeCount: summary.inventory.activeCount,
    benchCount: summary.inventory.benchCount,
    relicFrom: before ? before.relicCount : relicCount,
    relicCount,
    relicDelta: before ? relicCount - before.relicCount : 0,
    buildCore: compactBuildCore(summary)
  };
}

function runDayRangeScenario(opts = {}) {
  const fromDay = Number(opts.fromDay || 1);
  const toDay = Number(opts.toDay || fromDay);
  const state = createGameState({ day: fromDay, period: '上午', gold: opts.gold ?? 3, seed: opts.seed, battleId: opts.battleId });
  state.dayRouteRuns = [];
  for (let day = fromDay; day <= toDay; day += 1) {
    resetRouteForDay(state, day);
    const goldFrom = Number(state.gold || 0);
    const castleLineFrom = Number(state.castleLine || 0);
    const economyMultiplierFrom = Number(state.economyMultiplier || 1);
    const constructionFrom = constructionSnapshot(state);
    dayRoute.runDayRoute(state);
    const goldTo = Number(state.gold || 0);
    const castleLineTo = Number(state.castleLine || 0);
    const economyMultiplierTo = Number(state.economyMultiplier || 1);
    state.dayRouteRuns.push({
      day,
      phase: state.phase,
      nodeIndex: state.dayRoute.nodeIndex,
      battleIndex: state.dayRoute.battleIndex,
      economy: {
        goldFrom,
        goldTo,
        goldDelta: goldTo - goldFrom,
        castleLineFrom,
        castleLineTo,
        economyMultiplierFrom,
        economyMultiplierTo
      },
      construction: constructionSnapshot(state, constructionFrom),
      history: clone(state.dayRoute.history),
      battleOutcomes: clone(state.dayRoute.battleOutcomes),
      pendingRewards: clone(state.dayRoute.pendingRewards),
      claimedRewards: clone(state.dayRoute.claimedRewards),
      terminal: state.dayRoute.terminal ? clone(state.dayRoute.terminal) : null
    });
    if (state.phase !== 'day_end') break;
  }
  return state;
}

module.exports = { runFullDayScenario, runDayRangeScenario };
