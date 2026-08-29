const test = require('node:test');
const assert = require('node:assert/strict');

const { createGameState } = require('../src/core/state.cjs');
const { loadGameData } = require('../src/core/data.cjs');
const { createYSBZSUIAdapter } = require('../src/uiAdapter.cjs');
const { buildSaveDocument } = require('../src/storage/saveCodec.cjs');
const dayRoute = require('../src/core/dayRoute.cjs');
const runGrowth = require('../src/core/runGrowth.cjs');
const battle = require('../src/core/battle.cjs');
const { dispatch } = require('../src/core/reducer.cjs');

function preparePendingGrowth(choiceSeed = 'growth-contract') {
  const state = createGameState({ seed: choiceSeed, day: 1, gold: 10 });
  dayRoute.ensureDayRoute(state);
  state.dayRoute.history.push({ kind: 'battle_choice', option: { encounterId: 'enc_d01_midday_b' } });
  const encounter = state.data.encounterPool.find(row => row.encounterId === 'enc_d01_midday_b');
  state.runXp = 1;
  const battleResult = { code: 'WIN', win: true, grade: 'A' };
  dayRoute.recordBattleOutcome(state, encounter, battleResult, state.gold, { kind: 'battle_choice' });
  state.phase = 'battle_end';
  state.dayRoute.postBattleReturnPhase = 'node_resolved';
  state.result = battleResult;
  return state;
}

function importedAdapter(state) {
  const adapter = createYSBZSUIAdapter({ seed: state.rngState.seed, day: state.day, gold: state.gold });
  adapter.importSave(buildSaveDocument(state, { playerId: 'p1', gameVersion: adapter.version }));
  return adapter;
}

function run(adapter, type, payload = {}) {
  const vm = adapter.getViewModel();
  return adapter.run({ type, playerId: 'p1', baseStateVersion: vm.stateVersion, ...payload });
}

test('formal growth data has 3 milestones, 9 choices, and 60 authored encounter XP values', () => {
  const data = loadGameData();
  assert.deepEqual(data.runGrowth.map(row => [row.targetLevel, row.cumulativeXp]), [[2, 3], [3, 8], [4, 15]]);
  assert.equal(data.growthChoices.length, 9);
  for (const level of [2, 3, 4]) {
    assert.deepEqual(data.growthChoices.filter(row => row.targetLevel === level).map(row => row.displayOrder), [1, 2, 3]);
  }
  assert.equal(data.encounterPool.length, 60);
  assert.deepEqual(Object.fromEntries([1, 2, 3].map(xp => [xp, data.encounterPool.filter(row => row.xpReward === xp).length])), { 1: 20, 2: 20, 3: 20 });
  assert.doesNotThrow(() => runGrowth.validateCatalog(createGameState({ data })));
});

test('risk cards project the exact authored 1/2/3 XP rather than deriving it in UI', () => {
  const state = createGameState({ day: 1, seed: 'growth-preview' });
  const options = dayRoute.generateBattleOptions(state, { scheduleStep: 3 });
  assert.deepEqual(options.map(option => option.xpReward).sort(), [1, 2, 3]);
  assert.deepEqual(options.map(option => option.choicePreview.xpReward).sort(), [1, 2, 3]);
  assert.deepEqual(options.map(option => option.pressurePreview.xpReward).sort(), [1, 2, 3]);
  for (const option of options) assert.match(option.choicePreview.gainText, new RegExp(`\\+${option.xpReward} XP`));
});

test('victory grants authored XP while loss and draw grant zero', () => {
  const data = loadGameData();
  for (const [risk, expected] of [['低风险', 1], ['中风险', 2], ['高风险', 3]]) {
    const state = createGameState({ data });
    const encounter = data.encounterPool.find(row => row.riskLabel === risk);
    const outcome = { win: true };
    const result = { win: true, code: 'WIN' };
    const xp = runGrowth.awardEncounterXp(state, encounter, outcome, result);
    assert.equal(xp.delta, expected);
    assert.equal(outcome.runXp.delta, expected);
    assert.equal(result.runXp.delta, expected);
  }
  for (const result of [{ win: false, code: 'LOSE' }, { win: false, code: 'DRAW' }]) {
    const state = createGameState({ data });
    const encounter = data.encounterPool.find(row => row.riskLabel === '高风险');
    assert.equal(runGrowth.awardEncounterXp(state, encounter, result, result).delta, 0);
    assert.equal(state.runXp, 0);
  }
});

test('low, medium, and high risk route battles settle 1/2/3 XP through the real battle lifecycle', () => {
  for (const expected of [1, 2, 3]) {
    const state = createGameState({ day: 1, seed: `growth-real-win-${expected}`, gold: 20 });
    const options = dayRoute.generateBattleOptions(state, { scheduleStep: 3 });
    const option = options.find(row => row.xpReward === expected);
    dayRoute.pickBattleEncounter(state, option.encounterId);
    state.leaders.enemy.hp = 0;
    state.leaders.enemy.alive = false;
    const result = dispatch(state, { type: 'RUN_BATTLE' });
    assert.equal(result.win, true);
    assert.equal(result.runXp.delta, expected);
    assert.equal(state.runXp, expected);
    assert.equal(state.dayRoute.battleOutcomes[0].runXp.delta, expected);
    assert.equal(state.phase, 'battle_end');
  }
});

test('post-battle continue opens level_up, rejects stale choices atomically, and restores route reward', () => {
  const adapter = importedAdapter(preparePendingGrowth());
  const battleEnd = adapter.getViewModel();
  assert.equal(battleEnd.phase, 'battle_end');
  assert.equal(battleEnd.runXp, 3);
  assert.equal(battleEnd.pendingGrowth.targetLevel, 2);
  assert.deepEqual(battleEnd.nextActions.map(action => action.type), ['CONTINUE_AFTER_BATTLE']);

  const opened = run(adapter, 'CONTINUE_AFTER_BATTLE');
  assert.equal(opened.viewModel.phase, 'level_up');
  assert.equal(opened.viewModel.growthOptions.length, 3);
  assert.deepEqual(opened.viewModel.nextActions.map(action => action.type), ['CHOOSE_GROWTH', 'CHOOSE_GROWTH', 'CHOOSE_GROWTH']);
  const beforeReject = opened.viewModel.stateHash;
  const rejected = run(adapter, 'CHOOSE_GROWTH', { growthChoiceId: 'growth_l3_trade' });
  assert.equal(rejected.accepted, false);
  assert.equal(rejected.error.code, 'GROWTH_CHOICE_NOT_OFFERED');
  assert.equal(rejected.viewModel.stateHash, beforeReject);
  assert.equal(rejected.viewModel.stateVersion, opened.viewModel.stateVersion);

  const chosen = run(adapter, 'CHOOSE_GROWTH', { growthChoiceId: 'growth_l2_vitality' });
  assert.equal(chosen.viewModel.phase, 'route_reward');
  assert.equal(chosen.viewModel.runLevel, 2);
  assert.equal(chosen.viewModel.runHealth, 24);
  assert.equal(chosen.viewModel.runMaxHealth, 24);
  assert.equal(chosen.viewModel.growthHistory.length, 1);
  assert.deepEqual(chosen.viewModel.nextActions.map(action => action.type), ['CLAIM_ROUTE_REWARD']);
  const claimed = run(adapter, 'CLAIM_ROUTE_REWARD', { rewardIndex: 0 });
  assert.equal(claimed.viewModel.phase, 'node_resolved');
  assert.equal(claimed.viewModel.dayRoute.pendingRewards.length, 0);
});

test('three growth families mutate only authoritative long-term resources and AP applies every later round', () => {
  const tactics = preparePendingGrowth('growth-tactics');
  runGrowth.enterLevelUp(tactics, 'node_resolved', 'node_resolved');
  runGrowth.chooseGrowth(tactics, 'growth_l2_tactics');
  assert.equal(tactics.roundApBonus, 1);
  battle.startBattle(tactics);
  const hero = tactics.units.find(unit => unit.side === 'hero');
  assert.equal(battle.slotsForUnit(tactics, hero)[0].availableAp, hero.ap + 1);
  hero.actionApSpent = hero.ap;
  assert.equal(battle.slotsForUnit(tactics, hero)[0].availableAp, 1);
  battle.startNextRound(tactics);
  assert.equal(battle.slotsForUnit(tactics, hero)[0].availableAp, hero.ap + 1);

  const trade = preparePendingGrowth('growth-trade');
  runGrowth.enterLevelUp(trade, 'node_resolved', 'node_resolved');
  const goldFrom = trade.gold;
  runGrowth.chooseGrowth(trade, 'growth_l2_trade');
  assert.equal(trade.gold, goldFrom + 4);
  assert.equal(trade.shop.freeRolls, 1);
  assert.equal(trade.shop.refreshState.nextRefreshCost, 0);
});

test('pending and selected growth survive save/load with identical hash and option order', () => {
  const pendingAdapter = importedAdapter(preparePendingGrowth('growth-save'));
  run(pendingAdapter, 'CONTINUE_AFTER_BATTLE');
  const pendingVm = pendingAdapter.getViewModel();
  const pendingSave = pendingAdapter.exportSave('p1', { createdAt: 'fixture' });
  const pendingLoaded = createYSBZSUIAdapter({ seed: 'growth-save' });
  const pendingImport = pendingLoaded.importSave(pendingSave);
  assert.equal(pendingImport.viewModel.stateHash, pendingVm.stateHash);
  assert.deepEqual(pendingImport.viewModel.growthOptions, pendingVm.growthOptions);

  run(pendingLoaded, 'CHOOSE_GROWTH', { growthChoiceId: 'growth_l2_trade' });
  const selectedVm = pendingLoaded.getViewModel();
  const selectedSave = pendingLoaded.exportSave('p1', { createdAt: 'fixture' });
  const selectedLoaded = createYSBZSUIAdapter({ seed: 'growth-save' });
  const selectedImport = selectedLoaded.importSave(selectedSave);
  assert.equal(selectedImport.viewModel.stateHash, selectedVm.stateHash);
  assert.deepEqual(selectedImport.viewModel.growthHistory, selectedVm.growthHistory);
  assert.equal(selectedImport.viewModel.roundApBonus, 0);
});
