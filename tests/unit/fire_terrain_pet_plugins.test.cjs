const test = require('node:test');
const assert = require('node:assert/strict');
const { PET_PLUGINS } = require('../../src/core/petPlugins/registry.cjs');

test('first fire system registers seven independent executable pet plugins', () => {
  assert.equal(Object.keys(PET_PLUGINS).length, 7);
  assert.equal(PET_PLUGINS.pet_pal_005_red_tail_fox.hooks.projectElementSettlement({ element: '火', elements: { 火: 3 } }).bonusDamage, 3);
  assert.equal(PET_PLUGINS.pet_pal_012_electric_quill_mouse.hooks.projectElementSettlement({ element: '火', elements: { 火: 3, 雷: 2 } }).bonusDamage, 4);
  assert.equal(PET_PLUGINS.pet_pal_019_night_burrow_mole.hooks.projectElementSettlement({ element: '火', elements: { 火: 3 } }).bonusDamage, 5);
});

test('fire suppliers return terrain patches and never unit element mutations', () => {
  const cat = PET_PLUGINS.pet_pal_007_thunder_whisker_cat.hooks.afterElementApply({ element: '火', cell: { x: 0, y: 0 }, board: { width: 8, height: 7 } });
  const deer = PET_PLUGINS.pet_pal_009_fire_antler_deer.hooks.afterElementApply({ element: '火', cell: { x: 3, y: 2 } });
  assert.deepEqual(cat.terrainPatches, [{ x: 1, y: 0, element: '火', layers: 1 }, { x: 0, y: 1, element: '火', layers: 1 }]);
  assert.deepEqual(deer.terrainPatches, [{ x: 3, y: 2, element: '火', layers: 1 }]);
  assert.equal('unitPatches' in cat, false);
  assert.equal('unitPatches' in deer, false);
});

test('position, economy, and settlement helpers preserve unified settlement authority', () => {
  const rhino = PET_PLUGINS.pet_pal_017_black_horn_rhino.hooks.afterHit({ element: '火', targetId: 'e1', targetCell: { x: 2, y: 2 }, direction: { x: 1, y: 0 } });
  assert.deepEqual(rhino.movement, { targetId: 'e1', x: 3, y: 2, requiresEmptyCell: true, settlesElementNow: false });
  assert.equal(PET_PLUGINS.pet_pal_014_money_raccoon.hooks.battleEnd({ win: true, owner: { alive: true, hp: 1 } }).gold, 1);
  assert.equal(PET_PLUGINS.pet_pal_014_money_raccoon.hooks.battleEnd({ win: true, owner: { alive: false, hp: 0 } }).gold, 0);
});
