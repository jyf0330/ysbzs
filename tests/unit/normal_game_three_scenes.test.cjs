const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.join(__dirname, '..', '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');

test('normal game page splits route shop and battle into three scenes', () => {
  const html = read('web/normal-game.html');
  const css = read('web/normal-game.css');
  const js = read('web/normal-game.js');
  const runToolsHtml = html.match(/<section class="run-tools"[\s\S]*?<\/section>/)?.[0] || '';

  assert.match(html, /<title>元素背包史 · 正常游戏<\/title>/, 'page should have its own normal-game title');
  assert.match(html, /id="route-scene"/, 'page needs a 3-choice route scene');
  assert.match(html, /id="route-node-title"/, 'route scene should expose the current time-node title');
  assert.match(html, /id="route-node-kicker"/, 'route scene should expose the current time-node subtitle');
  assert.match(html, /id="shop-scene"/, 'page needs a shop scene');
  assert.match(html, /id="shop-action-list"/, 'shop scene should separate operations from pet goods');
  assert.match(html, /id="battle-scene"/, 'page needs a battle scene');
  assert.match(html, /id="route-active-list"/, 'route scene should expose active lineup');
  assert.match(html, /id="route-bench-list"/, 'route scene should expose bench roster');
  assert.match(html, /id="shop-active-list"/, 'shop scene should expose active lineup');
  assert.match(html, /id="shop-bench-list"/, 'shop scene should expose bench roster');
  assert.match(html, /id="seed-input"/, 'normal page should expose a seed input for repeatable run checks');
  assert.match(html, /id="save-run-btn"/, 'normal page should expose save current run');
  assert.match(html, /id="load-run-btn"/, 'normal page should expose load saved run');
  assert.match(html, /id="restart-run-btn"/, 'normal page should expose restart current run with seed');
  assert.match(html, /id="seed-check-btn"/, 'normal page should expose a seeded rule check entry');
  assert.match(html, /class="advanced-tools"/, 'debug and repeatability tools should live behind a collapsed menu');
  assert.match(html, /id="advanced-tools-toggle"/, 'normal page should expose only one advanced menu button');
  assert.ok(html.indexOf('id="advanced-tools-toggle"') < html.indexOf('id="seed-input"'), 'seed controls should be behind the menu summary');
  assert.match(runToolsHtml, /id="save-run-btn"[\s\S]*id="load-run-btn"[\s\S]*<details class="advanced-tools"/, 'top-level run tools should be save, load, and menu');
  assert.ok(runToolsHtml.indexOf('<details class="advanced-tools"') < runToolsHtml.indexOf('id="restart-run-btn"'), 'restart should be inside the advanced menu');
  assert.ok(runToolsHtml.indexOf('<details class="advanced-tools"') < runToolsHtml.indexOf('id="seed-check-btn"'), 'rule check should be inside the advanced menu');
  assert.match(html, /src="js\/local-engine\.js"/, 'page should support local runtime');
  assert.ok(html.indexOf('src="js/local-engine.js"') < html.indexOf('src="normal-game.js"'), 'local engine must load before page module');
  assert.doesNotMatch(html, /data-jump-scene/, 'normal player page should not expose manual scene-jump controls');
  assert.doesNotMatch(html, /id="enter-shop-btn"|id="roll-shop-btn"|id="exit-shop-btn"/, 'normal player page should not expose console-style shop buttons');
  assert.doesNotMatch(html, /id="start-battle-btn"|id="route-return-btn"/, 'normal player page should not expose console-style battle routing buttons');

  assert.match(css, /\.normal-shell/, 'normal page should have its own style namespace');
  assert.match(css, /\.scene\[data-active="true"\]/, 'scenes should use an explicit active state');
  assert.match(css, /\.roster-board/, 'route/shop roster areas need dedicated layout');
  assert.match(css, /\.run-tools/, 'normal page should style player save/load/restart tools');
  assert.match(css, /\.advanced-tools/, 'normal page should style the collapsed advanced menu');
  assert.match(css, /\.advanced-tools\[open\]/, 'advanced menu should have an explicit open state');
  assert.match(css, /\.formal-battle-frame/, 'battle scene should style the embedded formal battle page');
  assert.doesNotMatch(css, /\.scene-tabs|\.shop-toolbar/, 'normal player styles should not include console control bars');

  assert.match(js, /createGameRuntime/, 'normal page should use shared runtime client');
  assert.match(js, /runtime\.view\(\)/, 'normal page should read through /api/view');
  assert.match(js, /runtime\.action/, 'normal page should mutate only through /api/action');
  assert.match(js, /runtime\.save\(\)/, 'normal page should save through runtime save');
  assert.match(js, /runtime\.load\(/, 'normal page should load through runtime load');
  assert.match(js, /NORMAL_GAME_SAVE_KEY/, 'normal page should use a dedicated local save key');
  assert.match(js, /function restartRunWithSeed/, 'normal page should restart the current run with a seed');
  assert.match(js, /function runSeedRuleCheck/, 'normal page should provide a seed-based rule check');
  assert.match(js, /makeCommand\('NEW_GAME'/, 'restart should use the public runtime NEW_GAME session path');
  assert.match(js, /function sceneForPhase/, 'normal page should route ViewModel phase into scenes');
  assert.match(js, /function autoGenerateRouteChoices/, 'normal page should auto-open current time-node choices');
  assert.match(js, /await autoGenerateRouteChoices/, 'normal page should show choices without a manual generate-node click');
  assert.match(js, /function routeNodeTitle/, 'normal page should derive the route title from dailyFlow.nextSchedule');
  assert.doesNotMatch(js, /const BATTLE_PHASES = new Set\(\['init'/, 'initial init phase should stay on time-node 1, not battle');
  assert.match(js, /时间节点 \$\{schedule\?\.step \|\| 1\}/, 'route scene should render 时间节点 1 as the initial title');
  assert.doesNotMatch(js, /manualScene|data-jump-scene|enter-shop-btn|start-battle-btn|route-return-btn/, 'normal player page should not keep debug scene controls');
  assert.doesNotMatch(js, /items\.push\(choiceButton\(action\.label \|\| '生成 3 选 1'/, 'GENERATE_NODE_OPTIONS should not be rendered as a player choice');
  assert.match(js, /function renderRouteScene/, 'normal page should render the 3-choice scene');
  assert.match(js, /function renderShopScene/, 'normal page should render the shop scene');
  assert.match(js, /function shopOfferCard/, 'shop scene should render pet offers as detail cards');
  assert.match(js, /function offerCells/, 'shop scene should account for pet attack cells');
  assert.match(js, /function bodySizeLabel/, 'shop cards should map internal body-size values to public labels');
  assert.match(js, /function attackRangeGrid/, 'shop pet cards should render a compact attack-range grid');
  assert.match(js, /const rows = 3/, 'shop attack-range grid should use three rows');
  assert.match(js, /const cols = 4/, 'shop attack-range grid should use four columns');
  assert.match(js, /origin = \{ r: 1, c: 0 \}/, 'shop attack-range grid should place the pet at row 2 column 1');
  assert.doesNotMatch(js, /超出/, 'shop attack-range grid should keep every attack cell inside the 3x4 preview');
  assert.match(js, /function refreshCostText/, 'shop scene should render the next refresh cost');
  assert.match(js, /petOffers = \(shop\.offers \|\| \[\]\)\.filter\(offer => offer\.type === 'pet'\)/, 'shop goods grid should only render pet offers');
  assert.match(js, /攻击\$\{esc\(offerCells\(offer\)\)\}格/, 'shop cards should read attack cells from the public offer ViewModel');
  assert.match(js, /bodySizeLabel\(offer\.bodySize\)/, 'shop cards should display public body size labels');
  assert.doesNotMatch(js, /item\.role|offer\.role/, 'normal player page must not display internal pet role/positioning');
  assert.match(js, /offer\.hp/, 'shop cards should display offer HP');
  assert.match(js, /offer\.atk/, 'shop cards should display offer attack');
  assert.match(js, /offer\.def/, 'shop cards should display offer defense');
  assert.match(css, /\.shop-offer-card/, 'shop offers need a dedicated card layout');
  assert.match(css, /\.shop-range-grid/, 'shop cards should style the attack-range mini grid');
  assert.match(css, /\.shop-offer-stats/, 'shop offers should style stat details');
  assert.match(html, /id="formal-battle-frame"/, 'normal battle scene should embed the formal battle page');
  assert.match(html, /id="formal-battle-link"[\s\S]*hidden/, 'formal battle direct link should exist but stay hidden for normal players');
  assert.match(js, /function battlePageHref/, 'normal battle scene should build a formal battle page href');
  assert.match(js, /new URL\('index\.html'/, 'battle handoff should target the formal battle page');
  assert.match(js, /formal-battle-frame/, 'normal page should mount the formal battle page iframe');
  assert.match(js, /formal-battle-link/, 'normal page should keep a direct formal battle link');
  assert.match(js, /function applyFormalBattlePlayerMode/, 'normal flow should hide debug-only controls inside the embedded formal battle page');
  assert.match(js, /normal-player-hide-debug/, 'embedded battle page should receive a stable injected style id');
  assert.match(js, /shop-phase-panel/, 'normal mode should hide formal-page manual route/shop debug controls');
  assert.match(js, /new-game-btn/, 'normal mode should hide formal-page new-day debug controls');
  assert.match(js, /day7-btn/, 'normal mode should hide formal-page day7 debug controls');
  assert.match(js, /回放\|调试/, 'normal mode should hide replay and debug log tabs');
  assert.doesNotMatch(html, /id="battle-board"/, 'normal page should not ship a second lightweight battle board');
  assert.doesNotMatch(js, /function onBattleCellClick|function boardUnitSide|MOVE_HERO/, 'normal page should not duplicate formal battle interactions');
  assert.match(js, /TOGGLE_UNIT_ACTIVE/, 'route/shop roster should expose public active roster toggles');
  assert.match(js, /上阵/, 'roster cards should show an active action');
  assert.match(js, /下阵/, 'roster cards should show a bench action');
  assert.match(js, /PICK_NODE/, 'route scene should support node 3-choice picks');
  assert.match(js, /BUY_OFFER/, 'shop scene should support buying offers');
  assert.doesNotMatch(js, /APPLY_SHOP_EVENT/, 'normal shop goods should not show shop events as sellable entries');
  assert.doesNotMatch(js, /RUN_PLAYER_ALL_OUT|AUTO_POSITION_HEROES/, 'normal page should not duplicate formal battle action buttons');
  assert.doesNotMatch(js, /require\(|src\/core|uiAdapter\.cjs|dispatch\(/, 'normal page must not import core or adapter directly');
});

test('normal game loaded battle state can still move the selected pet through public commands', () => {
  const { createYSBZSUIAdapter } = require('../../src/uiAdapter.cjs');
  const adapter = createYSBZSUIAdapter({ day: 1, gold: 8, seed: 'normal-loaded-positioning', activePets: ['pal_002', 'pal_013'] });
  adapter.startBattle();
  const saved = adapter.exportSave('p1', { sessionId: 'normal-loaded-positioning-save' });
  const loaded = createYSBZSUIAdapter({ day: 1, gold: 1, seed: 'other-seed' });
  loaded.importSave(saved, 'p1');
  const vm = loaded.getViewModel('p1');
  const hero = vm.heroes[0];
  const empty = vm.board.cells.find(cell => !cell.unitId && Math.abs(cell.r - hero.position.r) + Math.abs(cell.c - hero.position.c) <= Number(hero.moveRange || hero.ap || 1));

  assert.ok(hero, 'loaded battle should expose an active player pet');
  assert.ok(empty, 'loaded battle should expose a legal empty move target');

  loaded.run({ type: 'SELECT_UNIT', unitId: hero.id, playerId: 'p1' });
  const moved = loaded.run({ type: 'MOVE_HERO', unitId: hero.id, r: empty.r, c: empty.c, playerId: 'p1' });
  const movedHero = moved.viewModel.heroes.find(unit => unit.id === hero.id);

  assert.deepEqual(movedHero.position, { r: empty.r, c: empty.c }, 'loaded battle should move the selected pet after save/load restore');
});

test('normal game seeded save contract is deterministic and server new-game accepts seed', () => {
  const { createYSBZSUIAdapter } = require('../../src/uiAdapter.cjs');
  const server = read('tools/run_ui_server.cjs');
  assert.match(server, /seed:\s*opts\.seed/, '4173 server sessions should pass seed into the adapter');

  function firstRouteChoiceNames(seed) {
    const adapter = createYSBZSUIAdapter({ day: 1, gold: 8, seed });
    const first = adapter.generateNodeOptions({ scheduleStep: 1 }).viewModel.dayRoute.options;
    return first.map(option => option.name || option.nodeId);
  }

  assert.deepEqual(firstRouteChoiceNames('normal-seed-check'), firstRouteChoiceNames('normal-seed-check'), 'same seed should expose the same first node choices');

  const adapter = createYSBZSUIAdapter({ day: 1, gold: 8, seed: 'normal-save-load' });
  adapter.generateNodeOptions({ scheduleStep: 1 });
  adapter.pickNode(adapter.getViewModel().dayRoute.options[0].optionId);
  const savedHash = adapter.getViewModel().stateHash;
  const save = adapter.exportSave('p1', { sessionId: 'normal-save-load-test' });
  const fresh = createYSBZSUIAdapter({ day: 1, gold: 1, seed: 'other-seed' });
  const loaded = fresh.importSave(save, 'p1');
  assert.equal(loaded.viewModel.stateHash, savedHash, 'loaded run should restore the exact saved hash');
});

test('normal game shop offers expose pet details through the public ViewModel', () => {
  const { createYSBZSUIAdapter } = require('../../src/uiAdapter.cjs');
  const adapter = createYSBZSUIAdapter({ day: 1, gold: 8, seed: 'normal-shop-details' });

  adapter.enterShop('night_base', 10);
  const offers = adapter.getViewModel().shop.offers;
  const offer = offers[0];
  const totalCells = offers.reduce((sum, item) => sum + Number(item.attackCells || item.cells || 1), 0);

  assert.ok(offer, 'shop should expose at least one offer');
  assert.equal(adapter.getViewModel().shop.activeStall.slots, 10, 'shop slots should mean total pet attack cells');
  assert.ok(totalCells <= 10, `shop offers should fit within 10 attack cells, got ${totalCells}`);
  assert.ok(offers.every(item => item.type === 'pet'), 'shop should only expose pet offers as goods');
  assert.ok(offer.quality, 'offer should expose quality');
  assert.ok(offer.bodySize, 'offer should expose body size');
  assert.equal(typeof offer.attackCells, 'number', 'offer should expose attack cell count');
  assert.equal(offer.cells, offer.attackCells, 'offer cells should alias attack cell count');
  assert.ok(Array.isArray(offer.shapeOffsets), 'offer should expose attack-range offsets');
  assert.ok(offer.shapeOffsets.length >= offer.attackCells, 'offer should expose at least attack-cell offsets');
  assert.ok(Array.isArray(offer.shapeGrid), 'offer should expose the source shape grid');
  assert.equal(offer.price, offer.attackCells * 2, 'offer price should be tied to attack cell count');
  assert.equal(typeof offer.hp, 'number', 'offer should expose HP');
  assert.equal(typeof offer.atk, 'number', 'offer should expose attack');
  assert.equal(typeof offer.def, 'number', 'offer should expose defense');
  assert.equal(typeof offer.shield, 'number', 'offer should expose shield');
  assert.equal(typeof offer.ap, 'number', 'offer should expose action points');
  assert.equal(typeof offer.price, 'number', 'offer should still expose price');
});

test('normal game shop ViewModel exposes paid refresh cost sequence', () => {
  const { createYSBZSUIAdapter } = require('../../src/uiAdapter.cjs');
  const adapter = createYSBZSUIAdapter({ day: 1, gold: 100, seed: 'normal-shop-refresh-cost' });

  adapter.enterShop('night_base', 10);
  assert.equal(adapter.getViewModel().shop.refreshState.nextRefreshCost, 2, 'first paid refresh should cost 2');

  for (const expected of [2, 4, 8, 16]) {
    const before = adapter.getViewModel().gold;
    adapter.rollShop({ slots: 10 });
    const vm = adapter.getViewModel();
    assert.equal(vm.shop.refreshState.lastRoll.cost, expected);
    assert.equal(before - vm.gold, expected);
  }

  assert.equal(adapter.getViewModel().shop.refreshState.paidRefreshes, 4);
  assert.equal(adapter.getViewModel().shop.refreshState.nextRefreshCost, 32);
});
