const test = require('node:test');
const assert = require('node:assert/strict');
const { data, validateData } = require('../src/core/data.cjs');
const { createGameState } = require('../src/core/state.cjs');
const dayRoute = require('../src/core/dayRoute.cjs');

const EXPECTED_ENCOUNTERS = new Map([
  ['enc_d01_midday_a', { waveId: 'wave_d01_enc_scout', rewardPoolId: 'reward_pT1' }],
  ['enc_d01_midday_b', { waveId: 'wave_d01_enc_assault', rewardPoolId: 'reward_pT2' }],
  ['enc_d01_midday_c', { waveId: 'wave_d01_enc_guard', rewardPoolId: 'reward_pT2' }]
]);

function choiceReadyState(seed = 'encounter-contract') {
  const state = createGameState({ day: 1, seed, gold: 20 });
  dayRoute.ensureDayRoute(state);
  state.dayRoute.nodeIndex = 2;
  state.phase = 'node_resolved';
  return state;
}

test('Day1 step3 formal data exposes three distinct encounter, wave, and reward contracts', () => {
  const step = dayRoute.scheduleRows(choiceReadyState()).find(row => row.step === 3);
  assert.equal(step.kind, 'battle_choice');
  assert.equal(step.encounterPoolId, 'enc_pool_d01_midday');
  assert.equal(step.choiceCount, 3);

  const encounters = data.encounterPool.filter(row => EXPECTED_ENCOUNTERS.has(row.encounterId));
  assert.equal(encounters.length, 3);
  assert.equal(new Set(encounters.map(row => row.waveId)).size, 3);
  for (const encounter of encounters) {
    const expected = EXPECTED_ENCOUNTERS.get(encounter.encounterId);
    assert.equal(encounter.waveId, expected.waveId);
    assert.equal(encounter.rewardPoolId, expected.rewardPoolId);
    assert.ok(encounter.riskLabel);
    assert.ok(encounter.enemyPreview);
    assert.ok(encounter.rewardPreview);
  }
  assert.deepEqual(validateData().issues, []);
});
test('generated choices preserve preview fields and selected encounter controls actual spawn wave', () => {
  const state = choiceReadyState();
  const options = dayRoute.generateBattleOptions(state);
  assert.equal(options.length, 3);
  assert.equal(new Set(options.map(option => option.encounterId)).size, 3);
  assert.equal(new Set(options.map(option => option.waveId)).size, 3);

  const selected = options.find(option => option.encounterId === 'enc_d01_midday_b');
  assert.ok(selected);
  assert.equal(selected.choicePreview.waveId, selected.waveId);
  assert.equal(selected.choicePreview.enemyPreview, selected.enemyPreview);
  assert.equal(selected.pressurePreview.rewardPoolId, selected.rewardPoolId);

  assert.equal(dayRoute.pickBattleEncounter(state, selected.encounterId), true);
  assert.equal(state.dayRoute.currentEncounter.waveId, selected.waveId);
  const spawnEvents = state.events.filter(event => event.type === 'SPAWN_ENEMY');
  assert.equal(spawnEvents.length, 4);
  assert.ok(spawnEvents.every(event => event.waveId === selected.waveId));
  const wave = data.waves.find(row => row.waveId === selected.waveId);
  assert.ok(spawnEvents.every(event => wave.petPool.includes(event.petId)));
});

test('selected encounter reward pool is the base source for a normal win', () => {
  for (const [encounterId, expected] of EXPECTED_ENCOUNTERS) {
    const state = choiceReadyState(`reward-${encounterId}`);
    const encounter = data.encounterPool.find(row => row.encounterId === encounterId);
    state.dayRoute.battleIndex = 1;
    state.dayRoute.history.push({ kind: 'battle_choice', option: encounter });
    const outcome = dayRoute.recordBattleOutcome(state, encounter, { code: 'WIN', win: true, grade: 'A' }, state.gold, { kind: 'battle_choice' });
    assert.equal(outcome.waveId, expected.waveId);
    assert.equal(outcome.baseRewardPoolId, expected.rewardPoolId);
    assert.equal(outcome.rewardPoolId, expected.rewardPoolId);
    assert.equal(state.dayRoute.pendingRewards[0].rewardPoolId, expected.rewardPoolId);
  }
});
