const test = require('node:test');
const assert = require('node:assert/strict');

const { createUnit, makeUnitFromData } = require('../../src/core/unitFactory.cjs');
const { getQualityStatBonus, getQualityUpgradePool } = require('../../src/core/qualityProgression.cjs');
const { data, buildIndexes } = require('../../src/core/data.cjs');
const { createGameState } = require('../../src/core/state.cjs');

test('unit factory connects silver gold and diamond quality tiers', () => {
  const cases = [
    { quality: '白银', bodySize: '小型', shapeId: '01', hp: 20, atk: 5, expectHp: 24, expectAtk: 6, expectPool: 'silver' },
    { quality: '黄金', bodySize: '中型', shapeId: '05', hp: 20, atk: 5, expectHp: 30, expectAtk: 7, expectPool: 'gold' },
    { quality: '钻石', bodySize: '大型', shapeId: '13', hp: 20, atk: 5, expectHp: 38, expectAtk: 8, expectPool: 'diamond' }
  ];

  for (const item of cases) {
    const unit = createUnit({
      id: `hero_${item.expectPool}`,
      petId: `pal_${item.expectPool}`,
      side: 'hero',
      name: `测试${item.quality}`,
      quality: item.quality,
      bodySize: item.bodySize,
      maxHp: item.hp,
      hp: item.hp,
      atk: item.atk,
      ap: 3,
      shape: { shapeId: item.shapeId },
      position: { r: 0, c: 0 }
    });

    assert.equal(unit.qualityProgression.quality, item.expectPool);
    assert.equal(unit.qualityUpgrade.quality, item.expectPool);
    assert.equal(unit.maxHp, item.expectHp);
    assert.equal(unit.hp, item.expectHp);
    assert.equal(unit.atk, item.expectAtk);
    assert.ok(getQualityUpgradePool(item.quality, unit.qualityProgression.shapeSize).some(x => x.id === unit.qualityUpgrade.id));
  }
});

test('makeUnitFromData connects all quality overrides through unit factory', () => {
  const state = { data, indexes: buildIndexes(data), nextUnit: 1, board: { rows: 8, cols: 8 } };
  const silver = makeUnitFromData(state, 'hero', 'pal_001', { quality: '白银', position: { r: 0, c: 0 } });
  const gold = makeUnitFromData(state, 'hero', 'pal_001', { quality: '黄金', position: { r: 0, c: 0 } });
  const diamond = makeUnitFromData(state, 'hero', 'pal_001', { quality: '钻石', position: { r: 0, c: 0 } });

  assert.equal(silver.qualityProgression.quality, 'silver');
  assert.equal(gold.qualityProgression.quality, 'gold');
  assert.equal(diamond.qualityProgression.quality, 'diamond');
  assert.ok(/^S/.test(silver.qualityUpgrade.id));
  assert.ok(/^G/.test(gold.qualityUpgrade.id));
  assert.ok(/^D/.test(diamond.qualityUpgrade.id));
});

test('createGameState applies structured initial roster quality overrides', () => {
  const customData = JSON.parse(JSON.stringify(data));
  customData.initialSetup = {
    playerParty: [
      { slot: 1, petId: 'pal_072', quality: '黄金', position: { r: 6, c: 1 } },
      { slot: 2, petId: 'pal_005', quality: '白银', position: { r: 5, c: 1 } },
      { slot: 3, petId: 'pal_006', quality: '白银', position: { r: 6, c: 2 } },
      { slot: 4, petId: 'pal_038', quality: '白银', position: { r: 5, c: 2 } }
    ]
  };
  const state = createGameState({ data: customData });
  const heroes = state.units.filter(u => u.side === 'hero');
  const byPet = new Map(heroes.map(u => [u.petId, u]));

  assert.equal(byPet.get('pal_072').quality, '黄金');
  assert.equal(byPet.get('pal_072').qualityProgression.quality, 'gold');
  const pal072Base = data.pets.find(p => p.id === 'pal_072');
  const pal072Shape = data.shapes.find(s => s.petId === 'pal_072');
  const pal072GoldBonus = getQualityStatBonus('黄金', pal072Shape.hitCells);
  assert.equal(byPet.get('pal_072').hp, pal072Base.hp + pal072GoldBonus.hpBonus);
  assert.equal(byPet.get('pal_072').atk, pal072Base.atk + pal072GoldBonus.attackBonus);
  assert.deepEqual(byPet.get('pal_072').mechanics, ['mech_scale_with_allies']);

  assert.equal(byPet.get('pal_005').quality, '白银');
  assert.equal(byPet.get('pal_006').quality, '白银');
  assert.equal(byPet.get('pal_038').quality, '白银');
  assert.equal(state.inventory.find(x => x.petId === 'pal_072').quality, '黄金');
});
