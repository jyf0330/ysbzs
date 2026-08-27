const test = require('node:test');
const assert = require('node:assert/strict');
const { PET_PLUGINS } = require('../../src/core/petPlugins/registry.cjs');

test('first fire system registers five reusable parameterized mechanic plugins', () => {
  assert.equal(Object.keys(PET_PLUGINS).length, 5);
  assert.equal(PET_PLUGINS.mech_element_pair_bonus.hooks.projectElementSettlement({ element: '火', elements: { 火: 3, 雷: 2 }, params: { element_a: '火', element_b: '雷', per_pair: 2 } }).bonusDamage, 4);
  assert.equal(PET_PLUGINS.mech_element_pair_bonus.hooks.projectElementSettlement({ element: '火', elements: { 火: 3, 雷: 2 } }).bonusDamage, 0);
  assert.equal(PET_PLUGINS.mech_element_layer_threshold_bonus.hooks.projectElementSettlement({ element: '火', elements: { 火: 3 }, params: { element: '火', threshold: 3, bonus: 5 } }).bonusDamage, 5);
  assert.equal(PET_PLUGINS.mech_element_layer_threshold_bonus.hooks.projectElementSettlement({ element: '火', elements: { 火: 2 }, params: { element: '火', threshold: 3, bonus: 5 } }).bonusDamage, 0);
});

test('fire suppliers return terrain patches and never unit element mutations', () => {
  const cat = PET_PLUGINS.mech_element_spread_adjacent.hooks.afterElementApply({ element: '火', cell: { x: 0, y: 0 }, board: { width: 8, height: 7 }, params: { element: '火', spread_layers: 1 } });
  const deer = PET_PLUGINS.mech_element_apply_bonus.hooks.afterElementApply({ element: '火', cell: { x: 3, y: 2 }, params: { element: '火', bonus_layers: 1 } });
  assert.deepEqual(cat.terrainPatches, [{ x: 1, y: 0, element: '火', layers: 1 }, { x: 0, y: 1, element: '火', layers: 1 }]);
  assert.deepEqual(deer.terrainPatches, [{ x: 3, y: 2, element: '火', layers: 1 }]);
  assert.equal('unitPatches' in cat, false);
  assert.equal('unitPatches' in deer, false);
  const foreignElement = PET_PLUGINS.mech_element_spread_adjacent.hooks.afterElementApply({ element: '水', cell: { x: 0, y: 0 }, board: { width: 8, height: 7 }, params: { element: '火' } });
  assert.deepEqual(foreignElement.terrainPatches, []);
});

test('economy helper preserves unified settlement authority', () => {
  assert.equal(PET_PLUGINS.mech_win_gold_bonus.hooks.battleEnd({ win: true, owner: { alive: true, hp: 1 }, params: { gold: 1 } }).gold, 1);
  assert.equal(PET_PLUGINS.mech_win_gold_bonus.hooks.battleEnd({ win: true, owner: { alive: false, hp: 0 }, params: { gold: 1 } }).gold, 0);
  assert.equal(PET_PLUGINS.mech_win_gold_bonus.hooks.battleEnd({ win: false, owner: { alive: true, hp: 1 }, params: { gold: 1 } }).gold, 0);
});
