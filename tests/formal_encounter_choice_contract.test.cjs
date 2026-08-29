const test = require('node:test');
const assert = require('node:assert/strict');
const { data, validateData } = require('../src/core/data.cjs');
const { createGameState } = require('../src/core/state.cjs');
const dayRoute = require('../src/core/dayRoute.cjs');

const EXPECTED_BANDS = new Map([
  [1, {
    poolId: 'enc_pool_d01_midday',
    encounters: [
      ['enc_d01_midday_a', 'wave_d01_enc_scout', 'reward_pT1'],
      ['enc_d01_midday_b', 'wave_d01_enc_assault', 'reward_pT2'],
      ['enc_d01_midday_c', 'wave_d01_enc_guard', 'reward_pT2']
    ]
  }],
  [3, {
    poolId: 'enc_pool_d03_midday',
    encounters: [
      ['enc_d03_midday_a', 'wave_d03_enc_safe', 'reward_pT1'],
      ['enc_d03_midday_b', 'wave_d03_enc_assault', 'reward_pT2'],
      ['enc_d03_midday_c', 'wave_d03_enc_breaker', 'reward_pT3']
    ]
  }],
  [6, {
    poolId: 'enc_pool_d06_midday',
    encounters: [
      ['enc_d06_midday_a', 'wave_d06_enc_anchor', 'reward_pT2'],
      ['enc_d06_midday_b', 'wave_d06_enc_assault', 'reward_pT3'],
      ['enc_d06_midday_c', 'wave_d06_enc_elite', 'reward_elite']
    ]
  }],
  [9, {
    poolId: 'enc_pool_d09_midday',
    encounters: [
      ['enc_d09_midday_a', 'wave_d09_enc_guard', 'reward_pT2'],
      ['enc_d09_midday_b', 'wave_d09_enc_decisive', 'reward_pT3'],
      ['enc_d09_midday_c', 'wave_d09_enc_ancestral', 'reward_pT4']
    ]
  }]
]);

const EXPECTED_ENCOUNTERS = new Map(
  [...EXPECTED_BANDS.values()].flatMap(band => band.encounters.map(([encounterId, waveId, rewardPoolId]) => [encounterId, { waveId, rewardPoolId }]))
);

function choiceReadyState(day = 1, seed = 'encounter-contract') {
  const state = createGameState({ day, seed, gold: 20 });
  dayRoute.ensureDayRoute(state);
  state.dayRoute.nodeIndex = 2;
  state.phase = 'node_resolved';
  return state;
}

test('Day1/3/6/9 step3 formal data exposes distinct encounter, wave, and reward bands', () => {
  for (const [day, band] of EXPECTED_BANDS) {
    const step = dayRoute.scheduleRows(choiceReadyState(day)).find(row => row.step === 3);
    assert.equal(step.kind, 'battle_choice', `Day${day} step3 kind`);
    assert.equal(step.encounterPoolId, band.poolId, `Day${day} encounter pool`);
    assert.equal(step.choiceCount, 3, `Day${day} choice count`);

    const encounterIds = new Set(band.encounters.map(([encounterId]) => encounterId));
    const encounters = data.encounterPool.filter(row => encounterIds.has(row.encounterId));
    assert.equal(encounters.length, 3, `Day${day} encounter count`);
    assert.equal(new Set(encounters.map(row => row.waveId)).size, 3, `Day${day} wave identities`);
    for (const encounter of encounters) {
      const expected = EXPECTED_ENCOUNTERS.get(encounter.encounterId);
      assert.equal(encounter.waveId, expected.waveId);
      assert.equal(encounter.rewardPoolId, expected.rewardPoolId);
      assert.ok(encounter.riskLabel);
      assert.ok(encounter.enemyPreview);
      assert.ok(encounter.rewardPreview);
    }
  }
  assert.deepEqual(validateData().issues, []);
});
test('each Run band has strictly increasing authoritative threat and stable choices', () => {
  for (const [day, band] of EXPECTED_BANDS) {
    const first = dayRoute.generateBattleOptions(choiceReadyState(day, `stable-${day}`));
    const second = dayRoute.generateBattleOptions(choiceReadyState(day, `stable-${day}`));
    assert.deepEqual(first.map(option => option.encounterId), second.map(option => option.encounterId));
    const threatByWave = new Map(data.waves.map(wave => [wave.waveId, Number(wave.threat || 0)]));
    const threats = band.encounters.map(([, waveId]) => threatByWave.get(waveId));
    assert.ok(threats.every(Number.isFinite), `Day${day} threats should exist`);
    assert.ok(threats[0] < threats[1] && threats[1] < threats[2], `Day${day} threats should increase: ${threats}`);
  }
});

test('generated choices preserve preview fields and every selected encounter controls its spawn wave', () => {
  for (const [day, band] of EXPECTED_BANDS) {
    for (const [encounterId, waveId] of band.encounters) {
      const state = choiceReadyState(day, `spawn-${encounterId}`);
      const options = dayRoute.generateBattleOptions(state);
      assert.equal(options.length, 3);
      assert.equal(new Set(options.map(option => option.encounterId)).size, 3);
      assert.equal(new Set(options.map(option => option.waveId)).size, 3);
      const selected = options.find(option => option.encounterId === encounterId);
      assert.ok(selected);
      assert.equal(selected.choicePreview.waveId, selected.waveId);
      assert.equal(selected.choicePreview.enemyPreview, selected.enemyPreview);
      assert.equal(selected.pressurePreview.rewardPoolId, selected.rewardPoolId);

      assert.equal(dayRoute.pickBattleEncounter(state, selected.encounterId), true);
      assert.equal(state.dayRoute.currentEncounter.waveId, waveId);
      const spawnEvents = state.events.filter(event => event.type === 'SPAWN_ENEMY');
      const wave = data.waves.find(row => row.waveId === waveId);
      assert.equal(spawnEvents.length, wave.spawnCount, encounterId);
      assert.ok(spawnEvents.every(event => event.waveId === waveId));
      assert.ok(spawnEvents.every(event => wave.petPool.includes(event.petId)));
    }
  }
});

test('selected encounter reward pool is the base source for a normal win', () => {
  for (const [encounterId, expected] of EXPECTED_ENCOUNTERS) {
    const encounter = data.encounterPool.find(row => row.encounterId === encounterId);
    const state = choiceReadyState(encounter.unlockDay, `reward-${encounterId}`);
    state.dayRoute.battleIndex = 1;
    state.dayRoute.history.push({ kind: 'battle_choice', option: encounter });
    const outcome = dayRoute.recordBattleOutcome(state, encounter, { code: 'WIN', win: true, grade: 'A' }, state.gold, { kind: 'battle_choice' });
    assert.equal(outcome.waveId, expected.waveId);
    assert.equal(outcome.baseRewardPoolId, expected.rewardPoolId);
    assert.equal(outcome.rewardPoolId, expected.rewardPoolId);
    assert.equal(state.dayRoute.pendingRewards[0].rewardPoolId, expected.rewardPoolId);
  }
});
