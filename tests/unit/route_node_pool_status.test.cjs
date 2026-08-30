const assert = require('node:assert/strict');
const test = require('node:test');

const { loadGameData } = require('../../src/core/csvData.cjs');
const { createYSBZSUIAdapter } = require('../../src/uiAdapter.cjs');

test('active route node pool exposes the complete formal event/rest ecosystem', () => {
  const data = loadGameData();
  const activeNodes = data.nodePool.filter(node => node.status === '正式');
  const instantNodes = data.nodePool.filter(node => ['event', 'rest'].includes(node.nodeType));

  assert.ok(activeNodes.length > 0, 'route node pool should still expose active options');
	const formalEvents = instantNodes.filter(node => node.status === '正式' && node.nodeType === 'event');
	const formalRests = instantNodes.filter(node => node.status === '正式' && node.nodeType === 'rest');
	assert.equal(formalEvents.length, 16);
	assert.equal(formalRests.length, 10);
	for (const eventId of ['evt_role_summon','evt_role_tank','evt_upgrade_offer','evt_duplicate','evt_curse_gold','evt_shield_bless','evt_trap_bonus','evt_discount','evt_free_roll']) {
		assert.ok(formalEvents.some(node => node.eventId === eventId), `${eventId} should have a formal route node`);
	}
	assert.deepEqual(formalRests.map(node => Number(node.value)), [2,2,3,3,3,4,4,4,5,5]);
});

test('daily generation keeps every formal shop/reward/event/rest option executable', () => {
  const dayOne = createYSBZSUIAdapter({ day: 1, gold: 8, seed: 'route-node-status-day1-all' });
  const dayOneResult = dayOne.run('GENERATE_NODE_OPTIONS', { scheduleStep: 1, count: 6 });
	assert.deepEqual(
		dayOneResult.viewModel.dayRoute.options.filter(option => ['event', 'rest'].includes(option.nodeType)).map(option => option.nodeId).sort(),
		['node_event_discount', 'node_event_free_roll', 'node_rest_gold']
	);

	const laterInstantTypes = new Set();
	for (let day = 2; day <= 10; day += 1) {
    for (const scheduleStep of [1, 2, 4, 5]) {
      const adapter = createYSBZSUIAdapter({ day, gold: 8, seed: `route-node-status-d${day}-s${scheduleStep}` });
      const result = adapter.run('GENERATE_NODE_OPTIONS', { scheduleStep });
      const options = result.viewModel.dayRoute.options;

      assert.equal(options.length, 3, `day ${day} step ${scheduleStep} should still offer 3 choices`);
		assert.equal(options.every(option => ['shop', 'reward', 'event', 'rest'].includes(option.nodeType)), true, `day ${day} step ${scheduleStep} should expose only executable node types`);
		for (const option of options.filter(option => ['event', 'rest'].includes(option.nodeType))) laterInstantTypes.add(option.nodeType);
	}
  }
	assert.deepEqual([...laterInstantTypes].sort(), ['event', 'rest'], 'later-day formal events and rests should both appear in deterministic route samples');
});
