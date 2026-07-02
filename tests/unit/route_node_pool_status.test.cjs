const assert = require('node:assert/strict');
const test = require('node:test');

const { loadGameData } = require('../../src/core/csvData.cjs');
const { createYSBZSUIAdapter } = require('../../src/uiAdapter.cjs');

test('active route node pool excludes instant nodes without enter or exit flow', () => {
  const data = loadGameData();
  const activeNodes = data.nodePool.filter(node => node.status === '正式');
  const disabledInstantNodes = data.nodePool.filter(node => ['event', 'rest'].includes(node.nodeType));

  assert.ok(activeNodes.length > 0, 'route node pool should still expose active options');
  assert.deepEqual(
    Array.from(new Set(activeNodes.map(node => node.nodeType))).sort(),
    ['reward', 'shop'],
    'active route nodes should be limited to enterable shop/reward surfaces'
  );
  assert.equal(
    disabledInstantNodes.every(node => node.status !== '正式'),
    true,
    'event/rest nodes should remain disabled until they have a player-facing flow'
  );
});

test('generated daily route choices only contain shop or reward nodes', () => {
  for (let day = 1; day <= 10; day += 1) {
    for (const scheduleStep of [1, 2, 4, 5]) {
      const adapter = createYSBZSUIAdapter({ day, gold: 8, seed: `route-node-status-d${day}-s${scheduleStep}` });
      const result = adapter.run('GENERATE_NODE_OPTIONS', { scheduleStep });
      const options = result.viewModel.dayRoute.options;

      assert.equal(options.length, 3, `day ${day} step ${scheduleStep} should still offer 3 choices`);
      assert.equal(
        options.every(option => ['shop', 'reward'].includes(option.nodeType)),
        true,
        `day ${day} step ${scheduleStep} should not include instant event/rest nodes`
      );
    }
  }
});
