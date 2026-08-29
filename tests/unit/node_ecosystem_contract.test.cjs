const test = require('node:test');
const assert = require('node:assert/strict');
const { data, validateData } = require('../../src/core/data.cjs');
const { MAX_BENCH_UNITS } = require('../../src/core/inventoryRules.cjs');
const { createGameState } = require('../../src/core/state.cjs');
const dayRoute = require('../../src/core/dayRoute.cjs');

const NODE_COUNTS = { shop: 29, reward: 10, event: 16, rest: 10 };

function formalNode(nodeId) {
  const node = data.nodePool.find(row => row.nodeId === nodeId && row.status === '正式');
  assert.ok(node, `missing formal node ${nodeId}`);
  return node;
}

function stateWithNode(nodeId, gold = 20) {
  const node = formalNode(nodeId);
  for (let seedIndex = 0; seedIndex < 500; seedIndex += 1) {
    const state = createGameState({ day: Number(node.unlockDay), gold, seed: `node-ecosystem-${nodeId}-${seedIndex}` });
    dayRoute.ensureDayRoute(state);
    const options = dayRoute.generateNodeOptions(state, { scheduleStep: 1 });
    const option = options && options.find(row => row.nodeId === nodeId);
    if (option) return { state, option, seedIndex };
  }
  assert.fail(`${nodeId} was not reachable across the fixed seed set`);
}

function stableSignature(day, seed) {
  const state = createGameState({ day, gold: 20, seed });
  dayRoute.ensureDayRoute(state);
  return dayRoute.generateNodeOptions(state, { scheduleStep: 1 }).map(row => row.nodeId);
}

test('all 65 authored route nodes are formal, seed-stable, readable, and reachable', () => {
  const formal = data.nodePool.filter(row => row.status === '正式');
  assert.equal(formal.length, 65);
  for (const [type, count] of Object.entries(NODE_COUNTS)) {
    assert.equal(formal.filter(row => row.nodeType === type).length, count, type);
  }
  assert.equal(data.nodePool.some(row => ['event', 'rest'].includes(row.nodeType) && row.status !== '正式'), false);
  for (let day = 1; day <= 10; day += 1) {
    const seed = `node-stability-${day}`;
    assert.deepEqual(stableSignature(day, seed), stableSignature(day, seed), `Day${day}`);
  }
  for (const node of formal) {
    const { option } = stateWithNode(node.nodeId);
    assert.equal(option.nodeId, node.nodeId);
    assert.ok(option.choicePreview.summary, node.nodeId);
    if (node.nodeType === 'event') {
      const event = data.events.find(row => row.id === node.eventId);
      assert.equal(option.choicePreview.costText, event.costText, node.nodeId);
      assert.equal(option.choicePreview.gainText, event.gainText, node.nodeId);
    }
    if (node.nodeType === 'rest') assert.equal(option.choicePreview.gainText, `金币+${node.value}`);
  }
  assert.deepEqual(validateData().issues, []);
});

test('all ten rests consume their authored 2/3/4/5 curve without healing', () => {
  const rests = data.nodePool.filter(row => row.nodeType === 'rest').sort((a, b) => Number(a.unlockDay) - Number(b.unlockDay));
  assert.deepEqual(rests.map(row => Number(row.value)), [2, 2, 3, 3, 3, 4, 4, 4, 5, 5]);
  for (const node of rests) {
    const { state, option } = stateWithNode(node.nodeId, 10);
    const heroHp = Number(state.leaders.player.hp);
    assert.equal(dayRoute.pickNode(state, option.optionId), true, node.nodeId);
    assert.equal(state.gold, 10 + Number(node.value), node.nodeId);
    assert.equal(Number(state.leaders.player.hp), heroHp, node.nodeId);
    assert.equal(state.dayRoute.history.at(-1).option.nodeId, node.nodeId);
  }
});

test('economy events charge exactly once and targeted events enter their authored shop', () => {
  for (const [nodeId, cost, field, value] of [
    ['node_event_discount', 1, 'nextDiscount', 50],
    ['node_d03_event_discount', 1, 'nextDiscount', 50],
    ['node_d05_event_free_roll', 0, 'freeRolls', 1],
    ['node_d10_event_discount', 1, 'nextDiscount', 50]
  ]) {
    const { state, option } = stateWithNode(nodeId, 20);
    const before = Number(state.shop[field] || 0);
    assert.equal(dayRoute.pickNode(state, option.optionId), true, nodeId);
    assert.equal(state.gold, 20 - cost, nodeId);
    assert.equal(Number(state.shop[field]), Math.max(before, value), nodeId);
  }

  for (const [nodeId, poolId, cost] of [
    ['node_d02_event_summon', 'role_召唤', 2],
    ['node_d04_event_wind', 'elem_雷', 1],
    ['node_d07_event_tank', 'role_坦克', 2],
    ['node_d08_event_wind', 'elem_雷', 1],
    ['node_d09_event_summon', 'role_召唤', 2]
  ]) {
    const { state, option } = stateWithNode(nodeId, 20);
    assert.equal(dayRoute.pickNode(state, option.optionId), true, nodeId);
    assert.equal(state.gold, 20 - cost, nodeId);
    assert.equal(state.phase, 'shop', nodeId);
    assert.equal(state.shop.activePool, poolId, nodeId);
    assert.equal(state.shop.activeStall.nodeId, nodeId, nodeId);
    assert.ok(state.shop.offers.length > 0, nodeId);
    assert.equal(state.dayRoute.history.at(-1).shopEffect.poolId, poolId, nodeId);
  }
});

test('construction events succeed with legal targets and reject atomically otherwise', () => {
  let setup = stateWithNode('node_d03_event_duplicate', 20);
  const duplicateBefore = setup.state.inventory.length;
  assert.equal(dayRoute.pickNode(setup.state, setup.option.optionId), true);
  assert.equal(setup.state.gold, 16);
  assert.equal(setup.state.inventory.length, duplicateBefore + 1);
  assert.equal(setup.state.dayRoute.history.at(-1).constructionEffect.type, 'duplicate_pet');

  setup = stateWithNode('node_d04_event_upgrade', 20);
  const qualityBefore = setup.state.inventory[0].quality;
  assert.equal(dayRoute.pickNode(setup.state, setup.option.optionId), true);
  assert.equal(setup.state.gold, 14);
  assert.notEqual(setup.state.inventory[0].quality, qualityBefore);
  assert.equal(setup.state.dayRoute.history.at(-1).constructionEffect.type, 'upgrade_pet');

  setup = stateWithNode('node_event_discount', 0);
  const insufficientBefore = {
    gold: setup.state.gold,
    nodeIndex: setup.state.dayRoute.nodeIndex,
    history: structuredClone(setup.state.dayRoute.history),
    options: structuredClone(setup.state.dayRoute.options),
    inventory: structuredClone(setup.state.inventory)
  };
  assert.equal(dayRoute.pickNode(setup.state, setup.option.optionId), false);
  assert.equal(setup.state.gold, insufficientBefore.gold);
  assert.equal(setup.state.dayRoute.nodeIndex, insufficientBefore.nodeIndex);
  assert.deepEqual(setup.state.dayRoute.history, insufficientBefore.history);
  assert.deepEqual(setup.state.dayRoute.options, insufficientBefore.options);
  assert.deepEqual(setup.state.inventory, insufficientBefore.inventory);
  assert.ok(setup.state.events.some(event => event.type === 'NODE_EVENT_BLOCKED' && event.code === 'insufficient_coins'));

  setup = stateWithNode('node_d04_event_upgrade', 20);
  for (const item of setup.state.inventory) item.quality = '钻石';
  const upgradeBefore = JSON.stringify({ gold: setup.state.gold, route: setup.state.dayRoute, inventory: setup.state.inventory });
  assert.equal(dayRoute.pickNode(setup.state, setup.option.optionId), false);
  assert.equal(JSON.stringify({ gold: setup.state.gold, route: setup.state.dayRoute, inventory: setup.state.inventory }), upgradeBefore);

  setup = stateWithNode('node_d03_event_duplicate', 20);
  const targetPetId = setup.state.inventory[0].petId;
  for (let index = 0; index < MAX_BENCH_UNITS; index += 1) {
    setup.state.inventory.push({ petId: `full_${index}_${targetPetId}`, count: 1, active: false, instanceId: `full_${index}` });
  }
  const fullBefore = JSON.stringify({ gold: setup.state.gold, route: setup.state.dayRoute, inventory: setup.state.inventory });
  assert.equal(dayRoute.pickNode(setup.state, setup.option.optionId), false);
  assert.equal(JSON.stringify({ gold: setup.state.gold, route: setup.state.dayRoute, inventory: setup.state.inventory }), fullBefore);
  assert.ok(setup.state.events.some(event => event.type === 'NODE_EVENT_BLOCKED' && event.code === 'bench_full'));
});

test('route prep and risk events queue one authoritative future effect', () => {
  for (const [nodeId, eventId, cost, field, type] of [
    ['node_d04_event_shield', 'evt_shield_bless', 2, 'battlePrepEffects', 'shield'],
    ['node_d05_event_trap', 'evt_trap_bonus', 2, 'battlePrepEffects', 'trap_damage_bonus'],
    ['node_d06_event_curse_gold', 'evt_curse_gold', -4, 'outerRunEffects', 'reward_gold_multiplier']
  ]) {
    const { state, option } = stateWithNode(nodeId, 20);
    assert.equal(dayRoute.pickNode(state, option.optionId), true, nodeId);
    assert.equal(state.gold, 20 - cost, nodeId);
    const effect = state[field].find(row => row.eventId === eventId);
    assert.ok(effect, nodeId);
    assert.equal(effect.type, type, nodeId);
    assert.equal(effect.status, 'pending', nodeId);
    assert.equal(effect.usesRemaining, 1, nodeId);
    assert.equal(state.dayRoute.history.at(-1)[field === 'battlePrepEffects' ? 'prepEffect' : 'runEffect'].eventId, eventId);
  }
});
