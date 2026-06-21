const test = require('node:test');
const assert = require('node:assert/strict');

const { loadGameData } = require('../../src/core/csvData.cjs');
const { createGameState } = require('../../src/core/state.cjs');
const { applyRoundStart, statusOfMechanic } = (() => {
  const mechanics = require('../../src/core/mechanics.cjs');
  const gate = require('../../src/core/mechanicGate.cjs');
  return { applyRoundStart: mechanics.applyRoundStart, statusOfMechanic: gate.statusOfMechanic };
})();

test('REVIEW placeholder mechanics normalize to none and do not enter runtime gate', () => {
  const data = loadGameData({ cache: false });
  const reviewPet = data.pets.find(p => (p.mechanicsOriginal || []).includes('REVIEW'));
  assert.ok(reviewPet, 'fixture pet with REVIEW exists');
  assert.deepEqual(reviewPet.mechanics, ['none']);
  assert.equal(statusOfMechanic(reviewPet.mechanics[0]), 'implemented');
});

test('mech_scale_with_allies uses table params and buffs per living same-camp ally', () => {
  const data = loadGameData({ cache: false });
  const scaleMechanic = data.mechanisms.find(m => m.id === 'mech_scale_with_allies');
  assert.deepEqual(scaleMechanic.defaultParams, { atk_per_ally: 1, shield_per_ally: 1 });
  assert.equal(statusOfMechanic('mech_scale_with_allies'), 'implemented');

  const state = createGameState({ data, activePets: ['pal_072', 'pal_005', 'pal_006'] });
  state.phase = 'player';
  state.round = 1;
  const auraUnit = state.units.find(u => u.petId === 'pal_072');
  assert.deepEqual(auraUnit.mechanics, ['mech_scale_with_allies']);
  const beforeAtk = auraUnit.atk;
  const beforeShield = auraUnit.shield;

  applyRoundStart(state, auraUnit);

  assert.equal(auraUnit.atk, beforeAtk + 2);
  assert.equal(auraUnit.shield, beforeShield + 2);
  assert.ok(state.events.some(e => e.type === 'MECHANIC_APPLIED' && e.mechanicId === 'mech_scale_with_allies' && e.allyCount === 2));
});
