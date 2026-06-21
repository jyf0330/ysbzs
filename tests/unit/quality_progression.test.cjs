const test = require('node:test');
const assert = require('node:assert/strict');

const {
  QUALITY_GROWTH_RULES,
  SILVER_BUFFS,
  GOLD_UPGRADES,
  DIAMOND_MUTATIONS,
  normalizeQuality,
  getQualityStatBonus,
  getQualityUpgradePool,
  pickDeterministicUpgrade,
  applyQualityProgressionToUnit
} = require('../../src/core/qualityProgression.cjs');
const { createUnit } = require('../../src/core/unitFactory.cjs');

test('quality growth rules keep the intended size curve', () => {
  assert.equal(QUALITY_GROWTH_RULES.silver.statBonusByShapeSize[1].hpBonus, 4);
  assert.equal(QUALITY_GROWTH_RULES.silver.statBonusByShapeSize[2].hpBonus, 5);
  assert.equal(QUALITY_GROWTH_RULES.silver.statBonusByShapeSize[3].hpBonus, 6);
  assert.equal(QUALITY_GROWTH_RULES.gold.statBonusByShapeSize[1].attackBonus, 2);
  assert.equal(QUALITY_GROWTH_RULES.diamond.statBonusByShapeSize[3].hpBonus, 18);
});

test('quality aliases accept Chinese labels from CSV', () => {
  assert.equal(normalizeQuality('青铜'), 'bronze');
  assert.equal(normalizeQuality('白银'), 'silver');
  assert.equal(normalizeQuality('黄金'), 'gold');
  assert.equal(normalizeQuality('钻石'), 'diamond');
  assert.deepEqual(getQualityStatBonus('黄金', 2), { hpBonus: 10, attackBonus: 2 });
});

test('upgrade pools are limited by shape size', () => {
  assert.equal(SILVER_BUFFS.length, 8);
  assert.equal(GOLD_UPGRADES.length, 30);
  assert.equal(DIAMOND_MUTATIONS.length, 30);
  assert.ok(getQualityUpgradePool('gold', 1).some(x => x.id === 'G17'));
  assert.ok(!getQualityUpgradePool('gold', 3).some(x => x.id === 'G17'));
  assert.ok(getQualityUpgradePool('diamond', 1).some(x => x.id === 'D16'));
  assert.ok(!getQualityUpgradePool('diamond', 3).some(x => x.id === 'D16'));
});

test('deterministic upgrade selection is stable for the same seed', () => {
  const a = pickDeterministicUpgrade('黄金', 2, 'pal_001:hero');
  const b = pickDeterministicUpgrade('黄金', 2, 'pal_001:hero');
  assert.ok(a);
  assert.equal(a.id, b.id);
});

test('createUnit applies quality progression once', () => {
  const unit = createUnit({
    id: 'hero_test_gold',
    petId: 'pal_test_gold',
    side: 'hero',
    name: '测试黄金',
    quality: '黄金',
    bodySize: '小型',
    maxHp: 20,
    hp: 20,
    atk: 5,
    ap: 3,
    shape: { hitCells: 1 },
    position: { r: 0, c: 0 }
  });

  assert.equal(unit.quality, '黄金');
  assert.equal(unit.maxHp, 28);
  assert.equal(unit.hp, 28);
  assert.equal(unit.atk, 7);
  assert.ok(unit.qualityUpgrade);
  assert.equal(unit.qualityProgression.shapeSize, 1);
  assert.equal(unit.flags.qualityProgressionApplied, true);

  applyQualityProgressionToUnit(unit);
  assert.equal(unit.maxHp, 28);
  assert.equal(unit.hp, 28);
  assert.equal(unit.atk, 7);
});

test('progression can be disabled for legacy or controlled tests', () => {
  const unit = createUnit({
    id: 'hero_test_raw',
    petId: 'pal_test_raw',
    side: 'hero',
    name: '测试原始',
    quality: '钻石',
    bodySize: '大型',
    maxHp: 20,
    hp: 20,
    atk: 5,
    ap: 3,
    shape: { hitCells: 3 },
    applyQualityProgression: false,
    position: { r: 0, c: 0 }
  });

  assert.equal(unit.hp, 20);
  assert.equal(unit.atk, 5);
  assert.equal(unit.qualityProgression, undefined);
});
