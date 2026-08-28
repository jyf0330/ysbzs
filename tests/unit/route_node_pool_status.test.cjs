const assert = require('node:assert/strict');
const test = require('node:test');

const { loadGameData } = require('../../src/core/csvData.cjs');
const { createYSBZSUIAdapter } = require('../../src/uiAdapter.cjs');

test('active route node pool opens only the approved Day1 instant slice', () => {
  const data = loadGameData();
  const activeNodes = data.nodePool.filter(node => node.status === '正式');
  const instantNodes = data.nodePool.filter(node => ['event', 'rest'].includes(node.nodeType));

  assert.ok(activeNodes.length > 0, 'route node pool should still expose active options');
  assert.deepEqual(
    instantNodes.filter(node => node.status === '正式').map(node => node.nodeId).sort(),
    ['node_event_free_roll', 'node_rest_gold'],
    'only the approved free-roll event and gold rest should be active'
  );
  assert.equal(
    instantNodes.filter(node => !['node_event_free_roll', 'node_rest_gold'].includes(node.nodeId)).every(node => node.status !== '正式'),
    true,
    'later event/rest slices should remain disabled'
  );
});

test('Day1 generation exposes the approved event/rest while later days stay shop/reward only', () => {
  const dayOne = createYSBZSUIAdapter({ day: 1, gold: 8, seed: 'route-node-status-day1-all' });
  const dayOneResult = dayOne.run('GENERATE_NODE_OPTIONS', { scheduleStep: 1, count: 6 });
  assert.deepEqual(
    dayOneResult.viewModel.dayRoute.options.filter(option => ['event', 'rest'].includes(option.nodeType)).map(option => option.nodeId).sort(),
    ['node_event_free_roll', 'node_rest_gold']
  );

  for (let day = 2; day <= 10; day += 1) {
    for (const scheduleStep of [1, 2, 4, 5]) {
      const adapter = createYSBZSUIAdapter({ day, gold: 8, seed: `route-node-status-d${day}-s${scheduleStep}` });
      const result = adapter.run('GENERATE_NODE_OPTIONS', { scheduleStep });
      const options = result.viewModel.dayRoute.options;

      assert.equal(options.length, 3, `day ${day} step ${scheduleStep} should still offer 3 choices`);
      assert.equal(
        options.every(option => ['shop', 'reward'].includes(option.nodeType)),
        true,
        `day ${day} step ${scheduleStep} should keep later instant slices disabled`
      );
    }
  }
});
