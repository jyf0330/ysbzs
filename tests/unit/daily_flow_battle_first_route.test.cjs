const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const { data } = require('../../src/core/data.cjs');
const { MAX_ACTIVE_UNITS, MAX_BENCH_UNITS } = require('../../src/core/inventoryRules.cjs');
const { createGameState } = require('../../src/core/state.cjs');
const shopCore = require('../../src/core/shop.cjs');
const { createYSBZSUIAdapter } = require('../../src/uiAdapter.cjs');

const root = path.join(__dirname, '..', '..');
const read = p => fs.readFileSync(path.join(root, p), 'utf8');

function run(adapter, type, payload = {}) {
  const vm = adapter.getViewModel('p1');
  return adapter.run(Object.assign({
    type,
    playerId: 'p1',
    commandId: `daily_flow_${type}_${Math.random().toString(16).slice(2)}`,
    baseStateVersion: vm.stateVersion
  }, payload));
}
function resolveNode(adapter, preferredType = null) {
  let vm = run(adapter, 'GENERATE_NODE_OPTIONS').viewModel;
  const option = (preferredType ? vm.dayRoute.options.find(x => x.nodeType === preferredType) : null) || vm.dayRoute.options[0];
  assert.ok(option, 'node options should expose a selectable item');
  vm = run(adapter, 'PICK_NODE', { optionId: option.optionId }).viewModel;
  if (vm.phase === 'reward') vm = run(adapter, 'PICK_REWARD', { index: 0 }).viewModel;
  if (vm.phase === 'shop') vm = run(adapter, 'EXIT_SHOP').viewModel;
  return { vm, option };
}
function resolveShopWithBuySell(adapter) {
  let vm = run(adapter, 'GENERATE_NODE_OPTIONS').viewModel;
  const option = vm.dayRoute.options.find(x => x.nodeType === 'shop');
  assert.ok(option, '3-choice node set should include a shop for the shop route test');
  vm = run(adapter, 'PICK_NODE', { optionId: option.optionId }).viewModel;
  assert.equal(vm.phase, 'shop');
  const offer = vm.shop.offers.find(x => Number(x.price || 0) <= Number(vm.gold || 0));
  assert.ok(offer, 'shop should expose an affordable offer');
  const buy = run(adapter, 'BUY_OFFER', { offerId: offer.offerId });
  const buyEvent = buy.events.find(event => event.type === 'SHOP_BUY');
  assert.ok(buyEvent, 'shop purchase should emit a buy event');
  vm = buy.viewModel;
  const bought = vm.inventory.items.find(x => x.instanceId === buyEvent.inventory.instanceId);
  assert.ok(bought, 'bought shop item should be visible before selling');
  assert.equal(bought.active, true, 'purchase should default into an open active slot');
  vm = run(adapter, 'SELL_UNIT', { instanceId: bought.instanceId, petId: bought.petId }).viewModel;
  assert.equal(vm.phase, 'shop');
  vm = run(adapter, 'EXIT_SHOP').viewModel;
  assert.equal(vm.phase, 'node_resolved');
  return { vm, option };
}

test('daily route runtime runs two 3-choice events before each fixed battle', () => {
  for (const day of [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]) {
    const rows = createYSBZSUIAdapter({ day }).getViewModel('p1').dailyFlow.steps;
    assert.deepEqual(rows.map(row => row.kind), ['node_choice', 'node_choice', 'fixed_battle', 'node_choice', 'node_choice', 'fixed_battle']);
    assert.equal(rows.filter(row => row.kind === 'node_choice').length, 4);
    assert.ok(rows[2].encounterId, `day ${day} third step should point at an encounter`);
    assert.ok(rows[5].encounterId, `day ${day} sixth step should point at an encounter`);
  }
});

test('daily flow public commands follow node -> node -> battle -> node -> node -> battle', () => {
  const adapter = createYSBZSUIAdapter({ day: 1, gold: 999, seed: 'daily-flow-node-node-battle' });
  let vm = adapter.getViewModel('p1');

  assert.equal(vm.dailyFlow.steps[0].kind, 'node_choice');
  assert.equal(vm.dailyFlow.steps[0].status, 'next');
  assert.equal(vm.dailyFlow.nextSchedule.kind, 'node_choice');

  ({ vm } = resolveNode(adapter));
  assert.equal(vm.dailyFlow.currentStep, 1);
  assert.equal(vm.dailyFlow.nextSchedule.kind, 'node_choice');
  assert.equal(vm.dailyFlow.steps[1].status, 'next');

  ({ vm } = resolveNode(adapter));
  assert.equal(vm.dailyFlow.currentStep, 2);
  assert.equal(vm.dailyFlow.nextSchedule.kind, 'fixed_battle');
  assert.equal(vm.dailyFlow.steps[2].status, 'next');

  vm = run(adapter, 'RUN_ROUTE_FIXED_BATTLE', { scheduleStep: 3 }).viewModel;
  assert.equal(vm.dailyFlow.currentStep, 3);
  assert.equal(vm.dailyFlow.nextSchedule.kind, 'node_choice');
  assert.equal(vm.dailyFlow.steps[3].status, 'next');

  ({ vm } = resolveNode(adapter));
  assert.equal(vm.dailyFlow.currentStep, 4);
  assert.equal(vm.dailyFlow.nextSchedule.kind, 'node_choice');
  assert.equal(vm.dailyFlow.steps[4].status, 'next');

  ({ vm } = resolveNode(adapter));
  assert.equal(vm.dailyFlow.currentStep, 5);
  assert.equal(vm.dailyFlow.nextSchedule.kind, 'fixed_battle');

  vm = run(adapter, 'RUN_ROUTE_FIXED_BATTLE', { scheduleStep: 6 }).viewModel;
  assert.equal(vm.phase, 'day_end');
  assert.equal(vm.dailyFlow.currentStep, 6);
});

test('daily flow exposes real next-day command after completing day 1 route', () => {
  const adapter = createYSBZSUIAdapter({ day: 1, gold: 999, seed: 'daily-flow-next-day' });
  let vm = adapter.getViewModel('p1');
  assert.equal(vm.day, 1);
  assert.equal(vm.dailyFlow.currentStep, 0);

  ({ vm } = resolveShopWithBuySell(adapter));
  ({ vm } = resolveNode(adapter));
  vm = run(adapter, 'RUN_ROUTE_FIXED_BATTLE', { scheduleStep: 3 }).viewModel;
  ({ vm } = resolveNode(adapter));
  ({ vm } = resolveNode(adapter));
  vm = run(adapter, 'RUN_ROUTE_FIXED_BATTLE', { scheduleStep: 6 }).viewModel;

  assert.equal(vm.day, 1);
  assert.equal(vm.phase, 'day_end');
  assert.equal(vm.dailyFlow.currentStep, 6);
  const nextDay = vm.nextActions.find(action => action.type === 'START_NEXT_DAY');
  assert.ok(nextDay, 'day_end should expose a public next-day action');
  assert.deepEqual(nextDay.defaultPayload, { day: 2 });

  vm = run(adapter, 'START_NEXT_DAY', nextDay.defaultPayload).viewModel;
  assert.equal(vm.day, 2);
  assert.equal(vm.phase, 'init');
  assert.equal(vm.dailyFlow.currentStep, 0);
  assert.equal(vm.dailyFlow.nextSchedule.kind, 'node_choice');
  assert.equal(vm.dayRouteRuns.length, 1);
  assert.equal(vm.dayRouteRuns[0].day, 1);
});

test('day 1 route shop is affordable in the default player economy', () => {
  const adapter = createYSBZSUIAdapter({ day: 1, seed: 'daily-flow-affordable-shop' });
  let vm = adapter.getViewModel('p1');
  assert.ok(vm.gold > 0, 'opening economy should leave the player with spendable gold before the first event');
  const activeBefore = vm.inventory.activeCount;

  vm = run(adapter, 'GENERATE_NODE_OPTIONS', { scheduleStep: 1 }).viewModel;
  const shopNode = vm.dayRoute.options.find(option => option.nodeType === 'shop');
  assert.ok(shopNode, 'default day 1 first 3-choice set should include a shop node');

  vm = run(adapter, 'PICK_NODE', { optionId: shopNode.optionId }).viewModel;
  assert.equal(vm.phase, 'shop');
  const affordable = vm.shop.offers.find(offer => Number(offer.price || 0) <= Number(vm.gold || 0));
  assert.ok(affordable, `shop should contain an affordable offer for ${vm.gold} gold`);

  const buy = run(adapter, 'BUY_OFFER', { offerId: affordable.offerId });
  const buyEvent = buy.events.find(event => event.type === 'SHOP_BUY');
  assert.ok(buyEvent, 'affordable purchase should emit SHOP_BUY');
  vm = buy.viewModel;
  const bought = vm.inventory.items.find(item => item.instanceId === buyEvent.inventory.instanceId);
  assert.ok(bought, 'affordable purchase should create a visible inventory entry');
  assert.equal(bought.active, activeBefore < vm.inventory.maxActive, 'purchase should go active while active slots are open');

  const goldAfterBuy = vm.gold;
  vm = run(adapter, 'SELL_UNIT', { instanceId: bought.instanceId, petId: bought.petId }).viewModel;
  assert.ok(vm.gold > goldAfterBuy, 'selling the bought unit should refund gold');
  vm = run(adapter, 'EXIT_SHOP').viewModel;
  assert.equal(vm.phase, 'node_resolved');
});

test('daily flow shop purchase uses active slots first, bench second, and blocks when all roster slots are full', () => {
  const openShop = (adapter) => {
    let vm = run(adapter, 'GENERATE_NODE_OPTIONS', { scheduleStep: 1 }).viewModel;
    const shopNode = vm.dayRoute.options.find(option => option.nodeType === 'shop');
    assert.ok(shopNode, 'route should expose a shop node');
    vm = run(adapter, 'PICK_NODE', { optionId: shopNode.optionId }).viewModel;
    assert.equal(vm.phase, 'shop');
    return vm;
  };
  const firstAffordable = vm => {
    const offer = vm.shop.offers.find(item => Number(item.price || 0) <= Number(vm.gold || 0));
    assert.ok(offer, 'shop should contain an affordable offer');
    return offer;
  };

  const activeAdapter = createYSBZSUIAdapter({ day: 1, gold: 999, seed: 'daily-flow-buy-active', activePets: ['pal_001', 'pal_002'] });
  let vm = openShop(activeAdapter);
  assert.equal(vm.inventory.activeCount, 2);
  let offer = firstAffordable(vm);
  let buy = run(activeAdapter, 'BUY_OFFER', { offerId: offer.offerId });
  let buyEvent = buy.events.find(event => event.type === 'SHOP_BUY');
  assert.equal(buyEvent.inventory.active, true);
  assert.equal(buy.viewModel.inventory.activeCount, 3);
  assert.equal(buy.viewModel.inventory.benchCount, 0);

  const benchAdapter = createYSBZSUIAdapter({ day: 1, gold: 999, seed: 'daily-flow-buy-bench', activePets: ['pal_001', 'pal_002', 'pal_003', 'pal_004'] });
  vm = openShop(benchAdapter);
  assert.equal(vm.inventory.activeCount, MAX_ACTIVE_UNITS);
  offer = firstAffordable(vm);
  buy = run(benchAdapter, 'BUY_OFFER', { offerId: offer.offerId });
  buyEvent = buy.events.find(event => event.type === 'SHOP_BUY');
  assert.equal(buyEvent.inventory.active, false);
  assert.equal(buy.viewModel.inventory.activeCount, MAX_ACTIVE_UNITS);
  assert.equal(buy.viewModel.inventory.benchCount, 1);

  const fullState = createGameState({ day: 1, gold: 999, seed: 'daily-flow-buy-blocked', activePets: ['pal_001', 'pal_002', 'pal_003', 'pal_004'] });
  for (let i = 0; i < MAX_BENCH_UNITS; i += 1) {
    fullState.inventory.push({ petId: `pal_block_${i}`, count: 1, level: 1, active: false, instanceId: `bench_block_${i}` });
  }
  shopCore.enterShop(fullState, 'night_base', 6);
  offer = fullState.shop.offers.find(item => Number(item.price || 0) <= Number(fullState.gold || 0));
  assert.ok(offer, 'full roster shop should still have a candidate offer');
  assert.equal(shopCore.buyOffer(fullState, offer.offerId), false);
  assert.ok(fullState.events.some(event => event.type === 'SHOP_BUY_BLOCKED' && /没有上阵或背包空位/.test(event.text || '')));
});

test('daily flow roster keeps battles to four active pets while backpack capacity is larger', () => {
  assert.equal(MAX_ACTIVE_UNITS, 4);
  assert.ok(MAX_BENCH_UNITS > 8, 'backpack should not be capped at the old small 8-slot bench');

  const adapter = createYSBZSUIAdapter({
    day: 1,
    gold: 999,
    seed: 'daily-flow-roster-capacity',
    activePets: ['pal_001', 'pal_002', 'pal_003', 'pal_004', 'pal_005', 'pal_006']
  });
  let vm = adapter.getViewModel('p1');
  assert.equal(vm.inventory.activeCount, MAX_ACTIVE_UNITS);
  assert.equal(vm.inventory.benchCount, 2);
  assert.deepEqual(vm.heroes.map(hero => hero.petId), ['pal_001', 'pal_002', 'pal_003', 'pal_004']);

  vm = run(adapter, 'START_BATTLE').viewModel;
  assert.equal(vm.phase, 'player_turn');
  assert.equal(vm.heroes.length, MAX_ACTIVE_UNITS, 'battle should only expose active roster pets');
  assert.equal(vm.inventory.maxBench, MAX_BENCH_UNITS);

  const state = createGameState({ day: 1, gold: 999, seed: 'daily-flow-bench-more-than-eight', activePets: ['pal_001', 'pal_002', 'pal_003', 'pal_004'] });
  for (let i = 0; i < 8; i += 1) {
    state.inventory.push({ petId: `pal_block_${i}`, count: 1, level: 1, active: false, instanceId: `bench_block_${i}` });
  }
  shopCore.enterShop(state, 'night_base', 6);
  const offer = state.shop.offers.find(item => Number(item.price || 0) <= Number(state.gold || 0));
  assert.ok(offer, 'shop should contain an affordable offer');
  assert.notEqual(shopCore.buyOffer(state, offer.offerId), false, 'the ninth backpack pet should be allowed');
  assert.ok(state.inventory.filter(item => item.active === false).length >= 9);
});

test('daily flow inventory lets players manually move pets between active roster and backpack', () => {
  const adapter = createYSBZSUIAdapter({ day: 1, gold: 999, seed: 'daily-flow-manual-roster', activePets: ['pal_001', 'pal_002', 'pal_003', 'pal_004'] });
  let vm = run(adapter, 'GENERATE_NODE_OPTIONS', { scheduleStep: 1 }).viewModel;
  const shopNode = vm.dayRoute.options.find(option => option.nodeType === 'shop');
  assert.ok(shopNode, 'route should expose a shop node');
  vm = run(adapter, 'PICK_NODE', { optionId: shopNode.optionId }).viewModel;
  const offer = vm.shop.offers.find(item => Number(item.price || 0) <= Number(vm.gold || 0));
  assert.ok(offer, 'shop should contain an affordable offer');

  const buy = run(adapter, 'BUY_OFFER', { offerId: offer.offerId });
  const buyEvent = buy.events.find(event => event.type === 'SHOP_BUY');
  assert.ok(buyEvent, 'shop purchase should emit SHOP_BUY');
  vm = buy.viewModel;
  let benchPet = vm.inventory.items.find(item => item.instanceId === buyEvent.inventory.instanceId);
  assert.ok(benchPet, 'bought pet should be visible in inventory');
  assert.equal(benchPet.active, false, 'purchase should enter backpack when active roster is full');
  assert.equal(benchPet.canMoveToActive, false, 'bench pet should not be actionable when active roster is full');

  const blocked = run(adapter, 'TOGGLE_UNIT_ACTIVE', { instanceId: benchPet.instanceId });
  assert.ok(blocked.events.some(event => event.type === 'TOGGLE_UNIT_ACTIVE_BLOCKED' && /上场位已满/.test(event.text || '')));

  const activePet = blocked.viewModel.inventory.active[0];
  assert.ok(activePet?.instanceId, 'test needs an active pet to move down');
  assert.equal(activePet.canMoveToBench, true, 'active pet should be able to move into an open backpack slot');
  const down = run(adapter, 'TOGGLE_UNIT_ACTIVE', { instanceId: activePet.instanceId });
  const downEvent = down.events.find(event => event.type === 'TOGGLE_UNIT_ACTIVE');
  assert.equal(downEvent?.active, false);
  assert.match(downEvent?.text || '', /下阵/);
  vm = down.viewModel;
  assert.equal(vm.inventory.activeCount, MAX_ACTIVE_UNITS - 1);
  assert.equal(vm.inventory.benchCount, 2);

  benchPet = vm.inventory.items.find(item => item.instanceId === buyEvent.inventory.instanceId);
  assert.equal(benchPet.canMoveToActive, true, 'bench pet should become actionable after an active slot opens');
  const up = run(adapter, 'TOGGLE_UNIT_ACTIVE', { instanceId: benchPet.instanceId });
  const upEvent = up.events.find(event => event.type === 'TOGGLE_UNIT_ACTIVE');
  assert.equal(upEvent?.active, true);
  assert.match(upEvent?.text || '', /上阵/);
  assert.equal(up.viewModel.inventory.activeCount, MAX_ACTIVE_UNITS);
  assert.equal(up.viewModel.inventory.benchCount, 1);
});

test('daily flow opening exposes Sun Wukong versus Tiger Vanguard with two starter cats', () => {
  const adapter = createYSBZSUIAdapter({ day: 1, seed: 'daily-flow-opening-roster' });
  const vm = adapter.getViewModel('p1');
  const opening = vm.dailyFlow.opening;

  assert.equal(vm.leaders.player.name, '孙悟空');
  assert.equal(vm.leaders.enemy.name, '虎先锋');
  assert.equal(opening.playerHero.name, '孙悟空');
  assert.equal(opening.enemyHero.name, '虎先锋');
  assert.deepEqual(vm.heroes.map(hero => hero.name), ['捣蛋猫', '捣蛋猫']);
  assert.deepEqual(opening.playerPets.map(pet => pet.name), ['捣蛋猫', '捣蛋猫']);
  assert.ok(vm.nextActions.some(action => action.type === 'GENERATE_NODE_OPTIONS'));
  assert.equal(opening.firstWave.summonerName, '虎先锋');
  assert.equal(opening.firstWave.spawnCount, 2);
  assert.deepEqual(opening.firstWave.petNames, ['棉悠悠', '捣蛋猫']);
  assert.match(opening.summary, /孙悟空.*虎先锋/);
  assert.match(opening.firstWave.summary, /虎先锋.*召唤.*棉悠悠.*捣蛋猫/);
});

test('daily flow ViewModel owns route primary and auto actions consumed by the page', () => {
  const adapter = createYSBZSUIAdapter({ day: 1, gold: 999, seed: 'daily-flow-vm-actions' });
  let vm = adapter.getViewModel('p1');

  assert.equal(vm.dailyFlow.primaryAction, null);
  assert.equal(vm.dailyFlow.autoAction?.type, 'GENERATE_NODE_OPTIONS');
  assert.deepEqual(vm.dailyFlow.autoAction.defaultPayload, { scheduleStep: 1 });
  assert.match(vm.dailyFlow.steps[0].summary, /3 选 1/);

  ({ vm } = resolveNode(adapter));
  ({ vm } = resolveNode(adapter));
  assert.equal(vm.dailyFlow.nextSchedule.kind, 'fixed_battle');
  assert.equal(vm.dailyFlow.primaryAction?.type, 'RUN_ROUTE_FIXED_BATTLE');
  assert.deepEqual(vm.dailyFlow.primaryAction.defaultPayload, { scheduleStep: 3 });
  assert.equal(vm.dailyFlow.autoAction, null);

  const js = read('web/daily-flow.js');
  assert.match(js, /vm\?\.dailyFlow\?\.primaryAction/, 'page should consume primaryAction from ViewModel');
  assert.match(js, /vm\?\.dailyFlow\?\.autoAction/, 'page should consume autoAction from ViewModel');
  assert.match(js, /function routeActionForNext\(/, 'page next button should use a single ViewModel action selector');
  assert.match(js, /primaryRouteAction\(\)\s*\|\|\s*autoRouteAction\(\)/, 'page next button should fall back to autoAction when no primaryAction exists');
  assert.match(js, /vm\?\.nextActions/, 'page next button should fall back to public nextActions when older dailyFlow action fields are missing');
  assert.doesNotMatch(js, /function fixedBattleAction/, 'page must not re-derive fixed battle actions');
  assert.doesNotMatch(js, /function nodeOptionsAction/, 'page must not re-derive node option actions');
  assert.doesNotMatch(js, /schedule\.kind\s*===\s*'fixed_battle'/, 'route kind decisions belong in ViewModel');
});

test('day 1 opening wave is Tiger Vanguard summoning starter pets, not extra heroes', () => {
  const firstWave = data.waves.find(row => row.day === 1 && row.period === '上午' && row.round === 1);
  assert.ok(firstWave, 'day 1 morning round 1 wave should exist');
  assert.deepEqual(firstWave.petPool, ['pal_001', 'pal_002']);
  assert.equal(firstWave.spawnCount, 2);

  const adapter = createYSBZSUIAdapter({ day: 1, seed: 'daily-flow-opening-wave' });
  let vm = adapter.getViewModel('p1');
  ({ vm } = resolveNode(adapter));
  ({ vm } = resolveNode(adapter));
  vm = run(adapter, 'RUN_ROUTE_FIXED_BATTLE', { scheduleStep: 3 }).viewModel;
  const firstSpawns = vm.events.filter(event => event.type === 'SPAWN_ENEMY').slice(0, 2);

  assert.equal(firstSpawns.length, 2);
  assert.ok(firstSpawns.every(event => ['pal_001', 'pal_002'].includes(event.petId)), 'opening summon should only use starter pet ids');
  assert.ok(firstSpawns.every(event => /虎先锋召唤/.test(event.text || '')), 'spawn text should name the enemy hero as summoner');
  assert.ok(firstSpawns.every(event => event.name !== '虎先锋' && event.name !== '孙悟空'), 'spawned units should stay pet units, not heroes');
});

test('daily flow page keeps player buttons on public runtime and hides one-click debug run buttons', () => {
  const html = read('web/daily-flow.html');
  const js = read('web/daily-flow.js');
  const runtimeClient = read('web/js/runtime-client.js');

  assert.match(html, /id="opening-panel"/, 'daily flow page should reserve a visible opening battlefield panel');
  assert.match(js, /function renderOpening\(/, 'daily flow page should render the opening battlefield from ViewModel');
  assert.match(js, /dailyFlow\?\.opening/, 'daily flow page should read opening info from the public dailyFlow surface');
  assert.match(js, /createGameRuntime/, 'daily flow page should use the public runtime client');
  assert.match(js, /mode:\s*params\.get\('runtime'\)\s*\|\|\s*'http'/, 'daily flow server page should default to HTTP runtime');
  assert.match(html, /src="js\/local-engine\.js"/, 'daily flow page should load the local engine for runtime=local browser checks');
  assert.ok(html.indexOf('src="js/local-engine.js"') < html.indexOf('src="daily-flow.js"'), 'daily flow local engine must load before the page module');
  assert.match(js, /runtime\.view\(\)/, 'daily flow page should read /api/view through runtime');
  assert.match(js, /runtime\.action/, 'daily flow page should mutate only through /api/action');
  assert.match(runtimeClient, /x-session-id/, 'runtime client should preserve session-scoped daily flow links');
  assert.match(js, /dailyFlow/, 'daily flow page should render the public dailyFlow surface');
  assert.match(js, /vm\?\.dailyFlow\?\.primaryAction/, 'daily flow page should read primary route actions from ViewModel');
  assert.match(js, /vm\?\.dailyFlow\?\.autoAction/, 'daily flow page should read auto route actions from ViewModel');
  assert.doesNotMatch(js, /RUN_ROUTE_FIXED_BATTLE/, 'daily flow page should not hardcode route battle commands');
  assert.doesNotMatch(js, /START_NEXT_DAY/, 'daily flow page should not hardcode next-day route commands');
  assert.match(js, /SELL_UNIT/, 'daily flow shop should expose selling through a public action');
  assert.match(js, /购买宠物/, 'daily flow shop should label buy actions as pet purchases');
  assert.match(js, /出售宠物/, 'daily flow shop should label sell actions as pet sales');
  assert.match(js, /TOGGLE_UNIT_ACTIVE/, 'daily flow inventory should expose active/backpack switching through a public action');
  assert.match(js, /上阵/, 'daily flow inventory should show an active-roster action');
  assert.match(js, /下阵/, 'daily flow inventory should show a move-to-backpack action');
  assert.match(html, /id="inventory-panel"/, 'daily flow page should show inventory on the flow page');
  assert.match(html, /id="inventory-active-list"/, 'daily flow page should reserve an active roster area');
  assert.match(html, /id="inventory-bench-list"/, 'daily flow page should reserve a backpack area');
  assert.match(js, /function renderInventory\(/, 'daily flow page should render active and backpack inventory');
  assert.doesNotMatch(js, /FREEZE_OFFER|UNFREEZE_OFFER|冻结|解冻/, 'daily flow shop should not expose freeze controls');
  assert.doesNotMatch(html, /full-day-btn|full-run-btn/, 'one-click debug run buttons should not be primary player controls');
  assert.doesNotMatch(js, /RUN_FULL_DAY|RUN_FULL_RUN/, 'daily flow player page should not dispatch one-click debug run commands');
  assert.doesNotMatch(js, /querySelector\([^)]*src\/core|require\(|uiAdapter\.cjs/, 'daily flow page must not import core or adapter directly');
});
