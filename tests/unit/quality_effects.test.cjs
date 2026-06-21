const test = require('node:test');
const assert = require('node:assert/strict');

const battle = require('../../src/core/battle.cjs');
const mechanics = require('../../src/core/mechanics.cjs');
const { createGameState } = require('../../src/core/state.cjs');
const { createUnit } = require('../../src/core/unitFactory.cjs');
const { handledQualityEffectIds, QUALITY_EFFECT_IDS } = require('../../src/core/battle/qualityEffects.cjs');

function makeRoundState() {
  return { data: { mechanisms: [] }, events: [], nextStep: 1, phase: 'player_turn', round: 1 };
}

function makeUnitWithQuality(qualityUpgrade, overrides = {}) {
  return createUnit(Object.assign({
    id: `unit_${qualityUpgrade.id}`,
    petId: `pet_${qualityUpgrade.id}`,
    side: 'hero',
    name: `测试${qualityUpgrade.id}`,
    quality: qualityUpgrade.quality === 'silver' ? '白银' : qualityUpgrade.quality === 'gold' ? '黄金' : '钻石',
    bodySize: '小型',
    maxHp: 20,
    hp: 20,
    atk: 5,
    ap: 3,
    shape: { shapeId: '01', slotElements: ['水', '水', '水'], baseLayers: 1 },
    position: { r: 0, c: 0 }
  }, overrides, {
    qualityUpgrade,
    qualityProgression: { quality: qualityUpgrade.quality, shapeSize: 1, upgradeId: qualityUpgrade.id }
  }));
}

test('quality effect table declares every S/G/D effect as handled', () => {
  assert.equal(QUALITY_EFFECT_IDS.length, 68);
  assert.deepEqual(handledQualityEffectIds(), QUALITY_EFFECT_IDS);
});

test('round start quality effects run for silver passive buffs', () => {
  const state = makeRoundState();
  const shieldUnit = makeUnitWithQuality({ id: 'S01', name: '护体', quality: 'silver' }, { shield: 0 });
  mechanics.applyRoundStart(state, shieldUnit);
  assert.equal(shieldUnit.shield, 15);
  assert.ok(state.events.some(e => e.type === 'QUALITY_SHIELD' && e.qualityEffectId === 'S01'));

  const healState = makeRoundState();
  const healUnit = makeUnitWithQuality({ id: 'S02', name: '自愈', quality: 'silver' }, { hp: 5, maxHp: 20 });
  mechanics.applyRoundStart(healState, healUnit);
  assert.equal(healUnit.hp, 20);

  const maxState = makeRoundState();
  const maxUnit = makeUnitWithQuality({ id: 'S03', name: '壮体', quality: 'silver' }, { hp: 10, maxHp: 20 });
  mechanics.applyRoundStart(maxState, maxUnit);
  assert.equal(maxUnit.maxHp, 30);
  assert.equal(maxUnit.hp, 20);
});

test('manual action applies gold core damage through useActionSlot', () => {
  const state = createGameState({ activePets: ['pal_001'], gold: 0 });
  state.phase = 'player_turn';
  state.round = 1;
  const hero = state.units.find(u => u.side === 'hero');
  hero.position = { r: 3, c: 3 };
  hero.element = '水';
  hero.atk = 5;
  hero.shape = { shapeId: '01', shapeName: '形状01', slotElements: ['水', '水', '水'], baseLayers: 1, slotCount: 3 };
  hero.qualityUpgrade = { id: 'G03', name: '金色核心格', quality: 'gold' };
  hero.qualityProgression = { quality: 'gold', shapeSize: 1, upgradeId: 'G03' };

  const enemy = createUnit({
    id: 'enemy_core', petId: 'enemy_core', side: 'enemy', name: '木桩', quality: '青铜', bodySize: '小型',
    maxHp: 20, hp: 20, atk: 0, ap: 1, applyQualityProgression: false,
    shape: { shapeId: '01' }, position: { r: 3, c: 4 }
  });
  state.units.push(enemy);
  battle.syncDerivedBoard(state);

  battle.useActionSlot(state, hero.id, 0, null, { ap: 1 });
  assert.equal(enemy.hp, 12);
  assert.ok(state.events.some(e => e.type === 'DAMAGE' && e.targetId === enemy.id && e.raw === 8));
});

test('diamond shape mutation changes target cells', () => {
  const state = createGameState({ activePets: ['pal_001'], gold: 0 });
  state.phase = 'player_turn';
  state.round = 1;
  const hero = state.units.find(u => u.side === 'hero');
  hero.position = { r: 3, c: 3 };
  hero.shape = { shapeId: '01', shapeName: '形状01', slotElements: ['水', '水', '水'], baseLayers: 1, slotCount: 3 };
  hero.qualityUpgrade = { id: 'D01', name: '末端延伸', quality: 'diamond' };
  hero.qualityProgression = { quality: 'diamond', shapeSize: 1, upgradeId: 'D01' };
  const slot = battle.slotsForUnit(state, hero)[0];
  const cells = battle.targetCellsForSlot(state, hero, slot);
  assert.deepEqual(cells, [{ r: 3, c: 4 }, { r: 3, c: 5 }]);
});
