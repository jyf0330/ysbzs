const test = require('node:test');
const assert = require('node:assert/strict');
const {
  normalizePetIdToken,
  parsePetPoolCount,
  parseQualityWeights,
  buildQualityMultiplierMap,
  qualityExpectedMultiplier,
  computeWaveThreat,
  normalizeWaveRow
} = require('../../src/core/waveRules.cjs');
const { loadGameData, loadSourceTablesFromCsv } = require('../../src/core/csvData.cjs');
const { createGameState, makeUnit, positionFromWaveRule } = require('../../src/core/state.cjs');
const battle = require('../../src/core/battle.cjs');

test('wave rule parses short pet pool count into canonical pal ids', () => {
  assert.equal(normalizePetIdToken('1'), 'pal_001');
  assert.equal(normalizePetIdToken('pal-12'), 'pal_012');
  assert.deepEqual(parsePetPoolCount('1,2,3,4,5-2').petIds, ['pal_001', 'pal_002', 'pal_003', 'pal_004', 'pal_005']);
  assert.equal(parsePetPoolCount('1,2,3,4,5-2').count, 2);
  assert.deepEqual(parsePetPoolCount('1~3-2').petIds, ['pal_001', 'pal_002', 'pal_003']);
});

test('wave rule treats quality probability column as weights and normalizes expectation', () => {
  const tables = loadSourceTablesFromCsv();
  const mults = buildQualityMultiplierMap(tables.qualityMultipliers);
  const weights = parseQualityWeights('90,10,0,1');
  assert.deepEqual(weights, { 青铜: 90, 白银: 10, 黄金: 0, 钻石: 1 });
  const expected = qualityExpectedMultiplier(weights, mults);
  assert.ok(expected > 1 && expected < 1.1);
});

test('wave rule computes threat from pet average score, spawn count and expected quality multiplier', () => {
  const d = loadGameData({ cache: false });
  const petsById = new Map(d.pets.map(p => [p.id, p]));
  const mults = buildQualityMultiplierMap(d.qualityMultipliers);
  const weights = parseQualityWeights('90,10,0,0');
  const ids = ['pal_001', 'pal_002', 'pal_003', 'pal_004', 'pal_005'];
  const threat = computeWaveThreat(ids, 2, weights, petsById, mults);
  const avg = ids.reduce((sum, id) => sum + petsById.get(id).score, 0) / ids.length;
  assert.equal(threat, Math.round(avg * 2 * 1.05 * 10) / 10);
});

test('new wave row can keep 宠物ID column as pool expression and spawn multiple quality-scaled enemies', () => {
  const d = loadGameData({ cache: false });
  const petsById = new Map(d.pets.map(p => [p.id, p]));
  const qualityMultiplierMap = buildQualityMultiplierMap(d.qualityMultipliers);
  const wave = normalizeWaveRow({
    '波次ID': 'wave_test_pool',
    '天数': '1',
    '时段': '上午',
    '回合': '1',
    '宠物ID': '1,2,3,4,5-2',
    '概率': '0,0,100,0',
    '位置': 'right_entry'
  }, { petsById, qualityMultiplierMap });
  assert.equal(wave.petId, 'pal_001');
  assert.equal(wave.count, 2);
  const avg = ['pal_001', 'pal_002', 'pal_003', 'pal_004', 'pal_005'].reduce((sum, id) => sum + petsById.get(id).score, 0) / 5;
  assert.equal(wave.threat, Math.round(avg * 2 * 2 * 10) / 10);

  const state = createGameState({ data: Object.assign({}, d, { waves: [wave] }), activePets: ['pal_005'], seed: 'wave-test' });
  battle.startBattle(state);
  const enemies = state.units.filter(u => u.side === 'enemy');
  assert.equal(enemies.length, 2);
  assert.equal(new Set(enemies.map(u => u.petId)).size, 2, 'default sampling is without replacement while the pool is not exhausted');
  assert.ok(enemies.every(u => u.quality === '黄金'));
  assert.ok(state.events.filter(e => e.type === 'SPAWN_ENEMY').every(e => e.quality === '黄金'));
});

test('right_entry wave position is driven by seeded RNG instead of a fixed row', () => {
  const d = loadGameData({ cache: false });
  const wave = normalizeWaveRow({
    '波次ID': 'wave_test_right_entry',
    '天数': '1',
    '时段': '上午',
    '回合': '1',
    '宠物ID': 'pal_001',
    '宠物池-数量': 'pal_001',
    '位置': 'right_entry'
  }, { petsById: new Map(d.pets.map(p => [p.id, p])), qualityMultiplierMap: buildQualityMultiplierMap(d.qualityMultipliers) });
  const make = seed => {
    const state = createGameState({ data: Object.assign({}, d, { waves: [wave] }), activePets: ['pal_005'], seed });
    battle.startBattle(state);
    return state.units.find(u => u.side === 'enemy').position;
  };
  const a = make('right-entry-a');
  const b = make('right-entry-b');
  assert.notDeepEqual(a, b);
  for (const p of [a, b]) {
    assert.ok(p.r >= 0 && p.r < 8);
    assert.ok(p.c >= 5 && p.c <= 6);
  }
});

test('default enemy spawn reads yaml top-right expansion and uses an empty cell', () => {
  const d = loadGameData({ cache: false });
  assert.deepEqual(d.waveRules.enemySpawn.expansionSizes, [3, 4, 5]);
  const wave = normalizeWaveRow({
    '波次ID': 'wave_test_yaml_spawn_position',
    '天数': '1',
    '时段': '上午',
    '回合': '1',
    '宠物ID': 'pal_001',
    '宠物池-数量': 'pal_001'
  }, { petsById: new Map(d.pets.map(p => [p.id, p])), qualityMultiplierMap: buildQualityMultiplierMap(d.qualityMultipliers) });
  const state = createGameState({ data: Object.assign({}, d, { waves: [wave] }), activePets: ['pal_005'], seed: 'yaml-spawn-position' });
  state.round = 1;
  const reserved = { r: 3, c: 4 };
  for (let r = 0; r <= 3; r += 1) {
    for (let c = 4; c <= 7; c += 1) {
      if ((r === 0 && c === 7) || (r === reserved.r && c === reserved.c)) continue;
      state.units.push(makeUnit(state, 'enemy', 'pal_002', { position: { r, c } }));
    }
  }
  battle.spawnWave(state);
  const spawned = state.units.find(u => u.flags && u.flags.waveId === 'wave_test_yaml_spawn_position');
  assert.ok(spawned);
  assert.deepEqual(spawned.position, reserved);
});

test('default enemy spawn randomly chooses an empty top-right 3x3 cell by core seed', () => {
  const d = loadGameData({ cache: false });
  const pick = seed => {
    const state = createGameState({ data: d, activePets: ['pal_005'], seed });
    state.round = 1;
    return positionFromWaveRule(state, null, 0, { waveId: 'wave_seeded_3x3' });
  };
  const a1 = pick('spawn-a');
  const a2 = pick('spawn-a');
  const b = pick('spawn-b');
  assert.deepEqual(a1, a2, 'same core seed should produce stable spawn cell');
  assert.notDeepEqual(a1, b, 'different core seed should be able to pick another empty cell');
  for (const p of [a1, b]) {
    assert.ok(p.r >= 0 && p.r <= 2);
    assert.ok(p.c >= 5 && p.c <= 7);
    assert.notDeepEqual(p, { r: 0, c: 7 }, 'enemy boss occupies this cell, so spawned pets must choose another empty cell');
  }
});
