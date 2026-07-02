const test = require('node:test');
const assert = require('node:assert/strict');

const { loadGameData } = require('../../src/core/data.cjs');
const { createYSBZSUIAdapter } = require('../../src/uiAdapter.cjs');

function nodeChoiceIds(seed, payload = {}) {
  const adapter = createYSBZSUIAdapter({ day: 1, gold: 999, seed });
  const result = adapter.generateNodeOptions(Object.assign({ scheduleStep: 1 }, payload));
  assert.equal(result.accepted, true);
  return result.viewModel.dayRoute.options.map(option => option.nodeId);
}

test('route node options are stable for the same seed and vary across seeds', () => {
  assert.deepEqual(
    nodeChoiceIds('route-seed-a'),
    nodeChoiceIds('route-seed-a'),
    'same seed should reproduce the same node 3-choice options'
  );
  assert.notDeepEqual(
    nodeChoiceIds('route-seed-a'),
    nodeChoiceIds('route-seed-b'),
    'different seeds should be able to produce different node 3-choice options'
  );
});

function dataWithBattleChoice() {
  const data = loadGameData();
  data.nodeSchedule = (data.nodeSchedule || []).concat([{
    id: 'seeded_battle_choice_schedule',
    day: 99,
    step: 1,
    kind: 'battle_choice',
    label: 'Seeded Battle Choice',
    phaseLabel: '测试遭遇',
    encounterPoolId: 'enc_pool_seeded_route_test',
    choiceCount: 3,
    status: '正式'
  }]);
  data.encounterPool = (data.encounterPool || []).concat([
    { encounterId: 'enc_seeded_a', encounterPoolId: 'enc_pool_seeded_route_test', name: 'Seeded A', weight: 100, unlockDay: 1, wavePeriod: '上午', battleIndex: 1, phaseLabel: '测试遭遇', status: '正式' },
    { encounterId: 'enc_seeded_b', encounterPoolId: 'enc_pool_seeded_route_test', name: 'Seeded B', weight: 90, unlockDay: 1, wavePeriod: '上午', battleIndex: 1, phaseLabel: '测试遭遇', status: '正式' },
    { encounterId: 'enc_seeded_c', encounterPoolId: 'enc_pool_seeded_route_test', name: 'Seeded C', weight: 80, unlockDay: 1, wavePeriod: '上午', battleIndex: 1, phaseLabel: '测试遭遇', status: '正式' },
    { encounterId: 'enc_seeded_d', encounterPoolId: 'enc_pool_seeded_route_test', name: 'Seeded D', weight: 70, unlockDay: 1, wavePeriod: '上午', battleIndex: 1, phaseLabel: '测试遭遇', status: '正式' },
    { encounterId: 'enc_seeded_e', encounterPoolId: 'enc_pool_seeded_route_test', name: 'Seeded E', weight: 60, unlockDay: 1, wavePeriod: '上午', battleIndex: 1, phaseLabel: '测试遭遇', status: '正式' }
  ]);
  return data;
}

function encounterChoiceIds(seed) {
  const adapter = createYSBZSUIAdapter({ day: 99, gold: 999, seed, data: dataWithBattleChoice() });
  const result = adapter.generateBattleOptions({ scheduleStep: 1 });
  assert.equal(result.accepted, true);
  return result.viewModel.dayRoute.battleOptions.map(option => option.encounterId);
}

test('route encounter options use the same seeded sampling contract', () => {
  assert.deepEqual(
    encounterChoiceIds('encounter-seed-a'),
    encounterChoiceIds('encounter-seed-a'),
    'same seed should reproduce the same encounter 3-choice options'
  );
  assert.notDeepEqual(
    encounterChoiceIds('encounter-seed-a'),
    encounterChoiceIds('encounter-seed-b'),
    'different seeds should be able to produce different encounter 3-choice options'
  );
});
