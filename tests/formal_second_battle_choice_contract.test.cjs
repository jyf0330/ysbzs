const test = require('node:test');
const assert = require('node:assert/strict');
const { data, validateData } = require('../src/core/data.cjs');
const { createGameState } = require('../src/core/state.cjs');
const dayRoute = require('../src/core/dayRoute.cjs');

const REWARDS_BY_DAY = [
  ['reward_pT1', 'reward_pT2', 'reward_pT2'],
  ['reward_pT2', 'reward_pT2', 'reward_pT3'],
  ['reward_pT2', 'reward_pT3', 'reward_pT3'],
  ['reward_pT2', 'reward_pT3', 'reward_pT3'],
  ['reward_pT2', 'reward_pT3', 'reward_elite'],
  ['reward_pT3', 'reward_pT3', 'reward_elite'],
  ['reward_pT3', 'reward_elite', 'reward_pT4'],
  ['reward_pT3', 'reward_elite', 'reward_pT4'],
  ['reward_pT3', 'reward_elite', 'reward_pT4'],
  ['reward_pT3', 'reward_elite', 'reward_pT4']
];

const MECHANICS_BY_DAY = [
  [{ mech_shield_regen: 4 }, { mech_counter_damage: 4 }, { mech_grow_atk_each_round: 5 }],
  [{ mech_armor_flat: 4 }, { mech_grow_shield_each_round: 5 }, { mech_counter_damage: 6 }],
  [{ mech_shield_regen: 5 }, { mech_armor_flat: 5 }, { mech_grow_atk_each_round: 6 }],
  [{ mech_grow_shield_each_round: 5 }, { mech_counter_damage: 6 }, { mech_grow_atk_each_round: 6 }],
  [{ mech_shield_regen: 6 }, { mech_armor_flat: 6 }, { mech_death_explosion: 3, mech_counter_damage: 3 }],
  [{ mech_shield_regen: 6 }, { mech_counter_damage: 6 }, { mech_grow_atk_each_round: 6 }],
  [{ mech_armor_flat: 6 }, { mech_counter_damage: 6 }, { mech_grow_atk_each_round: 6 }],
  [{ mech_shield_regen: 6 }, { mech_counter_damage: 6 }, { mech_death_explosion: 3, mech_shield_regen: 3 }],
  [{ mech_armor_flat: 6 }, { mech_counter_damage: 3, mech_grow_atk_each_round: 3 }, { mech_death_explosion: 3, mech_shield_regen: 3 }],
  [{ mech_armor_flat: 6 }, { mech_counter_damage: 3, mech_grow_atk_each_round: 3 }, { mech_grow_atk_each_round: 6 }]
];

function encounterId(day, suffix) {
  return `enc_d${String(day).padStart(2, '0')}_evening_${suffix}`;
}

function waveId(day, suffix) {
  return `wave_d${String(day).padStart(2, '0')}_evening_choice_${suffix}`;
}

function expectedBand(day) {
  return ['a', 'b', 'c'].map((suffix, index) => ({
    encounterId: encounterId(day, suffix),
    waveId: waveId(day, suffix),
    rewardPoolId: REWARDS_BY_DAY[day - 1][index],
    mechanics: MECHANICS_BY_DAY[day - 1][index]
  }));
}

function secondBattleReadyState(day, seed = 'second-battle-contract') {
  const state = createGameState({ day, seed, gold: 20 });
  dayRoute.ensureDayRoute(state);
  state.dayRoute.nodeIndex = 5;
  state.dayRoute.battleIndex = 1;
  state.phase = 'node_resolved';
  return state;
}

function mechanicCounts(wave) {
  const petsById = new Map(data.pets.map(pet => [pet.id, pet]));
  const counts = {};
  for (const petId of wave.petPool) {
    const pet = petsById.get(petId);
    assert.ok(pet, petId);
    for (const mechanismId of pet.mechanics || []) {
      if (mechanismId === 'none') continue;
      counts[mechanismId] = Number(counts[mechanismId] || 0) + 1;
    }
  }
  return counts;
}

test('all ten step6 schedules are formal three-way battle choices with no fixed battle authority', () => {
  assert.equal(data.nodeSchedule.length, 60);
  assert.equal(data.encounterPool.length, 60);
  assert.equal(data.waves.length, 194);
  assert.equal(data.nodeSchedule.filter(row => row.kind === 'node_choice').length, 40);
  assert.equal(data.nodeSchedule.filter(row => row.kind === 'battle_choice').length, 20);
  assert.equal(data.nodeSchedule.filter(row => row.kind === 'fixed_battle').length, 0);

  for (let day = 1; day <= 10; day += 1) {
    const step = dayRoute.scheduleRows(secondBattleReadyState(day)).find(row => row.step === 6);
    assert.equal(step.kind, 'battle_choice', `Day${day} step6 kind`);
    assert.equal(step.encounterPoolId, `enc_pool_d${String(day).padStart(2, '0')}_evening`);
    assert.equal(step.choiceCount, 3);
  }
  assert.deepEqual(validateData().issues, []);
});

test('second-battle bands preserve exact waves, rewards, mechanics, and authored threat parity', () => {
  const firstBattleHighByDay = new Map();
  const lowThreats = [];
  for (let day = 1; day <= 10; day += 1) {
    const firstHigh = data.encounterPool.find(row => row.encounterPoolId === `enc_pool_d${String(day).padStart(2, '0')}_midday` && row.riskLabel === '高风险');
    firstBattleHighByDay.set(day, Number(data.waves.find(row => row.waveId === firstHigh.waveId).threat));

    const threats = [];
    for (const expected of expectedBand(day)) {
      const encounter = data.encounterPool.find(row => row.encounterId === expected.encounterId);
      assert.ok(encounter, expected.encounterId);
      assert.equal(encounter.waveId, expected.waveId);
      assert.equal(encounter.rewardPoolId, expected.rewardPoolId);
      const wave = data.waves.find(row => row.waveId === expected.waveId);
      assert.ok(wave, expected.waveId);
      assert.deepEqual(mechanicCounts(wave), expected.mechanics, expected.encounterId);
      assert.equal(wave.threat, wave.threatManual, `${wave.waveId} manual threat parity`);
      assert.equal(wave.threat, wave.threatComputed, `${wave.waveId} runtime threat parity`);
      assert.equal(wave.threatScoreSource, 'pet_score_with_monster_panel_fallback');
      threats.push(Number(wave.threat));
    }
    assert.ok(threats[0] < threats[1] && threats[1] < threats[2], `Day${day}: ${threats}`);
    assert.ok(threats[0] > firstBattleHighByDay.get(day), `Day${day} second low ${threats[0]} > first high ${firstBattleHighByDay.get(day)}`);
    lowThreats.push(threats[0]);
  }
  assert.ok(lowThreats.every((value, index) => index === 0 || value > lowThreats[index - 1]), `${lowThreats}`);
});

test('every selected second-battle encounter controls its spawn wave and explicit normal-win reward', () => {
  for (let day = 1; day <= 10; day += 1) {
    for (const expected of expectedBand(day)) {
      const state = secondBattleReadyState(day, `second-spawn-${expected.encounterId}`);
      const options = dayRoute.generateBattleOptions(state);
      assert.equal(options.length, 3);
      assert.equal(new Set(options.map(option => option.encounterId)).size, 3);
      assert.equal(new Set(options.map(option => option.waveId)).size, 3);
      const selected = options.find(option => option.encounterId === expected.encounterId);
      assert.ok(selected, expected.encounterId);
      assert.equal(dayRoute.pickBattleEncounter(state, selected.encounterId), true);
      assert.equal(state.dayRoute.currentEncounter.waveId, expected.waveId);
      const wave = data.waves.find(row => row.waveId === expected.waveId);
      const spawns = state.events.filter(event => event.type === 'SPAWN_ENEMY');
      assert.equal(spawns.length, wave.spawnCount, expected.encounterId);
      assert.ok(spawns.every(event => event.waveId === expected.waveId));
      assert.ok(spawns.every(event => wave.petPool.includes(event.petId)));

      const outcome = dayRoute.recordBattleOutcome(
        state,
        selected,
        { code: 'WIN', win: true, grade: 'A' },
        state.gold,
        { kind: 'battle_choice' }
      );
      assert.equal(outcome.baseRewardPoolId, expected.rewardPoolId);
      assert.equal(outcome.rewardPoolId, expected.rewardPoolId);
      assert.deepEqual(outcome.postBattleEvents, []);
    }
  }
});

test('all Day10 second-battle choices propagate terminal authority into the pending battle', () => {
  for (const expected of expectedBand(10)) {
    const state = secondBattleReadyState(10, `terminal-${expected.encounterId}`);
    const selected = dayRoute.generateBattleOptions(state).find(option => option.encounterId === expected.encounterId);
    assert.equal(dayRoute.pickBattleEncounter(state, expected.encounterId), true);
    assert.equal(state.dayRoute.pendingBattle.source.terminal, true, expected.encounterId);
    assert.equal(state.dayRoute.history.at(-1).kind, 'battle_choice');
    assert.equal(state.dayRoute.history.at(-1).option.encounterId, expected.encounterId);
    assert.equal(selected.phaseLabel, '终局战');
  }
});
