const test = require('node:test');
const assert = require('node:assert/strict');
const {
  buildQualityMultiplierMap,
  computeWaveThreat,
  normalizeWaveRow,
  parsePetPoolCount,
  selectPetIdsForWave,
  pickQualityForWave
} = require('../../src/core/waveRules.cjs');

test('WB01 pool expressions support comma, tilde range, and dash range as formal syntax', () => {
  assert.deepEqual(parsePetPoolCount('1~5-2'), {
    raw: '1~5-2',
    poolPart: '1~5',
    petIds: ['pal_001', 'pal_002', 'pal_003', 'pal_004', 'pal_005'],
    count: 2,
    isPoolExpression: true
  });
  assert.deepEqual(parsePetPoolCount('1-5-2').petIds, ['pal_001', 'pal_002', 'pal_003', 'pal_004', 'pal_005']);
  assert.deepEqual(parsePetPoolCount('pal_001~pal_003-3').petIds, ['pal_001', 'pal_002', 'pal_003']);
});

test('WB02 pool sampling refills after exhaustion while avoiding duplicates inside each pass', () => {
  const row = { petPool: ['pal_001', 'pal_002'], spawnCount: 5 };
  let i = 0;
  const values = [0.1, 0.1, 0.1, 0.1, 0.1];
  const ids = selectPetIdsForWave(row, () => values[i++] ?? 0.1);
  assert.equal(ids.length, 5);
  assert.deepEqual(ids.slice(0, 2).sort(), ['pal_001', 'pal_002']);
  assert.deepEqual(ids.slice(2, 4).sort(), ['pal_001', 'pal_002']);
  assert.equal(['pal_001', 'pal_002'].includes(ids[4]), true);
});

test('WB03 quality is rolled independently for every spawned enemy', () => {
  const row = {
    hasQualityWeights: true,
    qualityWeights: { 青铜: 1, 白银: 1, 黄金: 0, 钻石: 0 }
  };
  const rolls = [0.2, 0.8, 0.2, 0.8];
  let i = 0;
  const qualities = Array.from({ length: 4 }, () => pickQualityForWave(row, () => rolls[i++]));
  assert.deepEqual(qualities, ['青铜', '白银', '青铜', '白银']);
});

test('WB04 threat uses monster template panel score when available, with pet score fallback', () => {
  const petsById = new Map([
    ['pal_001', { id: 'pal_001', score: 100 }],
    ['pal_002', { id: 'pal_002', score: 200 }],
    ['pal_003', { id: 'pal_003', score: 300 }]
  ]);
  const monstersByPetId = new Map([
    ['pal_001', { petId: 'pal_001', panelScore: 10 }],
    ['pal_002', { petId: 'pal_002', panelScore: 20 }]
  ]);
  const qualityMultiplierMap = buildQualityMultiplierMap([]);
  const weights = { 青铜: 1, 白银: 0, 黄金: 0, 钻石: 0 };
  assert.equal(computeWaveThreat(['pal_001', 'pal_002', 'pal_003'], 2, weights, petsById, qualityMultiplierMap, { monstersByPetId }), 220);

  const row = normalizeWaveRow({
    '波次ID': 'wave_template_score',
    '天数': '1',
    '时段': '上午',
    '回合': '1',
    '宠物池-数量': '1,2,3-2',
    '品质权重': '1,0,0,0'
  }, { petsById, monstersByPetId, qualityMultiplierMap });
  assert.equal(row.threat, 220);
  assert.equal(row.threatScoreSource, 'monster_panel_score_with_pet_fallback');
});
