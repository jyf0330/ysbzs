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
  [2, {
    poolId: 'enc_pool_d02_midday',
    encounters: [
      ['enc_d02_midday_a', 'wave_d02_enc_sustain', 'reward_pT1'],
      ['enc_d02_midday_b', 'wave_d02_enc_counter', 'reward_pT2'],
      ['enc_d02_midday_c', 'wave_d02_enc_growth', 'reward_pT2']
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
  [4, {
    poolId: 'enc_pool_d04_midday',
    encounters: [
      ['enc_d04_midday_a', 'wave_d04_enc_armor', 'reward_pT2'],
      ['enc_d04_midday_b', 'wave_d04_enc_shield_growth', 'reward_pT3'],
      ['enc_d04_midday_c', 'wave_d04_enc_combined', 'reward_pT3']
    ]
  }],
  [5, {
    poolId: 'enc_pool_d05_midday',
    encounters: [
      ['enc_d05_midday_a', 'wave_d05_enc_regen', 'reward_pT2'],
      ['enc_d05_midday_b', 'wave_d05_enc_counter', 'reward_pT3'],
      ['enc_d05_midday_c', 'wave_d05_enc_growth', 'reward_elite']
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
  [7, {
    poolId: 'enc_pool_d07_midday',
    encounters: [
      ['enc_d07_midday_a', 'wave_d07_enc_armor', 'reward_pT2'],
      ['enc_d07_midday_b', 'wave_d07_enc_opening_shield', 'reward_pT3'],
      ['enc_d07_midday_c', 'wave_d07_enc_growth', 'reward_elite']
    ]
  }],
  [8, {
    poolId: 'enc_pool_d08_midday',
    encounters: [
      ['enc_d08_midday_a', 'wave_d08_enc_regen', 'reward_pT2'],
      ['enc_d08_midday_b', 'wave_d08_enc_counter', 'reward_pT3'],
      ['enc_d08_midday_c', 'wave_d08_enc_bomb_growth', 'reward_pT4']
    ]
  }],
  [9, {
    poolId: 'enc_pool_d09_midday',
    encounters: [
      ['enc_d09_midday_a', 'wave_d09_enc_guard', 'reward_pT2'],
      ['enc_d09_midday_b', 'wave_d09_enc_decisive', 'reward_pT3'],
      ['enc_d09_midday_c', 'wave_d09_enc_ancestral', 'reward_pT4']
    ]
  }],
  [10, {
    poolId: 'enc_pool_d10_midday',
    encounters: [
      ['enc_d10_midday_a', 'wave_d10_enc_armor', 'reward_pT2'],
      ['enc_d10_midday_b', 'wave_d10_enc_counter', 'reward_pT3'],
      ['enc_d10_midday_c', 'wave_d10_enc_bomb_growth', 'reward_pT4']
    ]
  }]
]);

const EXPECTED_ENCOUNTERS = new Map(
  [...EXPECTED_BANDS.values()].flatMap(band => band.encounters.map(([encounterId, waveId, rewardPoolId]) => [encounterId, { waveId, rewardPoolId }]))
);

const EXPECTED_MECHANIC_PRESSURE = new Map([
  ['enc_d06_midday_c', {
    petPool: ['pal_029', 'pal_046', 'pal_061', 'pal_097', 'pal_101', 'pal_107'],
    mechanicPreview: '护甲减伤 / 三名反击 / 回合攻盾成长'
  }],
  ['enc_d09_midday_c', {
    petPool: ['pal_035', 'pal_054', 'pal_182', 'pal_186', 'pal_197', 'pal_241'],
    mechanicPreview: '三名死亡爆炸 / 回合攻盾成长 / 反击'
  }]
]);

const EXPECTED_FIRST_BATTLE_MECHANICS = new Map([
  ['enc_d02_midday_a', { preview: '三名护盾回复', counts: { mech_shield_regen: 3 } }],
  ['enc_d02_midday_b', { preview: '四名反击', counts: { mech_counter_damage: 4 } }],
  ['enc_d02_midday_c', { preview: '五名回合攻击成长', counts: { mech_grow_atk_each_round: 5 } }],
  ['enc_d04_midday_a', { preview: '四名护甲减伤', counts: { mech_armor_flat: 4 } }],
  ['enc_d04_midday_b', { preview: '五名回合护盾成长', counts: { mech_grow_shield_each_round: 5 } }],
  ['enc_d04_midday_c', { preview: '双护甲 / 双反击 / 回合攻盾成长', counts: { mech_armor_flat: 2, mech_counter_damage: 2, mech_grow_atk_each_round: 1, mech_grow_shield_each_round: 1 } }],
  ['enc_d05_midday_a', { preview: '四名护盾回复', counts: { mech_shield_regen: 4 } }],
  ['enc_d05_midday_b', { preview: '五名反击', counts: { mech_counter_damage: 5 } }],
  ['enc_d05_midday_c', { preview: '六名回合攻击成长', counts: { mech_grow_atk_each_round: 6 } }],
  ['enc_d07_midday_a', { preview: '四名护甲减伤', counts: { mech_armor_flat: 4 } }],
  ['enc_d07_midday_b', { preview: '五名开场护盾', counts: { mech_shield_flat: 5 } }],
  ['enc_d07_midday_c', { preview: '六名回合攻击成长', counts: { mech_grow_atk_each_round: 6 } }],
  ['enc_d08_midday_a', { preview: '五名护盾回复', counts: { mech_shield_regen: 5 } }],
  ['enc_d08_midday_b', { preview: '六名反击', counts: { mech_counter_damage: 6 } }],
  ['enc_d08_midday_c', { preview: '三名死亡爆炸 / 双回合护盾成长 / 回合攻击成长', counts: { mech_death_explosion: 3, mech_grow_shield_each_round: 2, mech_grow_atk_each_round: 1 } }],
  ['enc_d10_midday_a', { preview: '六名护甲减伤', counts: { mech_armor_flat: 6 } }],
  ['enc_d10_midday_b', { preview: '六名反击', counts: { mech_counter_damage: 6 } }],
  ['enc_d10_midday_c', { preview: '三名死亡爆炸 / 三名回合攻击成长', counts: { mech_death_explosion: 3, mech_grow_atk_each_round: 3 } }]
]);

function choiceReadyState(day = 1, seed = 'encounter-contract') {
  const state = createGameState({ day, seed, gold: 20 });
  dayRoute.ensureDayRoute(state);
  state.dayRoute.nodeIndex = 2;
  state.phase = 'node_resolved';
  return state;
}

test('all ten step3 routes expose distinct formal encounter, wave, mechanic, and reward bands', () => {
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
      assert.ok(encounter.mechanicPreview);
      assert.ok(encounter.rewardPreview);
    }
  }
  assert.deepEqual(validateData().issues, []);
});
test('each Run band has strictly increasing authoritative threat and stable choices', () => {
  const lowThreats = [];
  for (const [day, band] of EXPECTED_BANDS) {
    const first = dayRoute.generateBattleOptions(choiceReadyState(day, `stable-${day}`));
    const second = dayRoute.generateBattleOptions(choiceReadyState(day, `stable-${day}`));
    assert.deepEqual(first.map(option => option.encounterId), second.map(option => option.encounterId));
    const threatByWave = new Map(data.waves.map(wave => [wave.waveId, Number(wave.threat || 0)]));
    const threats = band.encounters.map(([, waveId]) => threatByWave.get(waveId));
    assert.ok(threats.every(Number.isFinite), `Day${day} threats should exist`);
    assert.ok(threats[0] < threats[1] && threats[1] < threats[2], `Day${day} threats should increase: ${threats}`);
    lowThreats.push(threats[0]);
  }
  assert.ok(lowThreats.every((value, index) => index === 0 || value > lowThreats[index - 1]), `low-risk curve should rise across all ten days: ${lowThreats}`);
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
      assert.equal(selected.choicePreview.mechanicPreview, selected.mechanicPreview);
      assert.equal(selected.pressurePreview.mechanicPreview, selected.mechanicPreview || '');
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

test('Day6 and Day9 high-risk routes expose exact mechanic pressure bands', () => {
  for (const [encounterId, expected] of EXPECTED_MECHANIC_PRESSURE) {
    const encounter = data.encounterPool.find(row => row.encounterId === encounterId);
    assert.ok(encounter, encounterId);
    assert.equal(encounter.mechanicPreview, expected.mechanicPreview);
    const wave = data.waves.find(row => row.waveId === encounter.waveId);
    assert.deepEqual(wave.petPool, expected.petPool);

    const midEncounter = data.encounterPool.find(row =>
      row.encounterPoolId === encounter.encounterPoolId && row.riskLabel === '中风险');
    const midWave = data.waves.find(row => row.waveId === midEncounter.waveId);
    assert.ok(Number(wave.threat) > Number(midWave.threat), `${encounterId} must exceed the same-day mid route`);

    const state = choiceReadyState(encounter.unlockDay, `mechanic-${encounterId}`);
    const selected = dayRoute.generateBattleOptions(state).find(option => option.encounterId === encounterId);
    assert.equal(selected.mechanicPreview, expected.mechanicPreview);
    assert.equal(selected.choicePreview.mechanicPreview, expected.mechanicPreview);
    assert.equal(selected.pressurePreview.mechanicPreview, expected.mechanicPreview);
  }
});

test('the six completed first-battle bands match their authored mechanic previews exactly', () => {
  const petsById = new Map(data.pets.map(pet => [pet.id, pet]));
  for (const [encounterId, expected] of EXPECTED_FIRST_BATTLE_MECHANICS) {
    const encounter = data.encounterPool.find(row => row.encounterId === encounterId);
    assert.ok(encounter, encounterId);
    assert.equal(encounter.mechanicPreview, expected.preview);
    const wave = data.waves.find(row => row.waveId === encounter.waveId);
    assert.ok(wave, encounter.waveId);
    const actual = {};
    for (const petId of wave.petPool) {
      const pet = petsById.get(petId);
      assert.ok(pet, petId);
      for (const mechanismId of pet.mechanics || []) {
        if (mechanismId === 'none') continue;
        actual[mechanismId] = Number(actual[mechanismId] || 0) + 1;
      }
    }
    assert.deepEqual(actual, expected.counts, encounterId);
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
