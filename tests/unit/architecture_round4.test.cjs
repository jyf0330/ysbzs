const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { createYSBZSUIAdapter } = require('../../src/uiAdapter.cjs');
const { createServerAuthorityAdapter } = require('../../src/adapters/serverAuthorityAdapter.cjs');

function eventIds(list) { return (list || []).map(e => e.eventId).filter(Boolean); }

test('R401 browser server entry uses serverAuthorityAdapter strict shell', () => {
  const src = fs.readFileSync(path.join(__dirname, '..', '..', 'tools/run_ui_server.cjs'), 'utf8');
  assert.match(src, /createServerAuthorityAdapter/);
  assert.doesNotMatch(src, /createYSBZSUIAdapter/);
  assert.match(src, /strict version/);
});

test('R402 selected is per-player view state and does not mutate GameState/hash/version', () => {
  const adapter = createYSBZSUIAdapter({ gold: 8, battleId: 'round4_selected' });
  const before = adapter.getViewModel();
  const heroId = before.heroes[0].id;
  const selected = adapter.run({ type: 'SELECT_UNIT', unitId: heroId, playerId: 'p1', commandId: 'r402_a', baseStateVersion: before.stateVersion });
  assert.equal(selected.ephemeral, true);
  assert.equal(selected.stateVersion, before.stateVersion);
  assert.equal(selected.stateHash, before.stateHash);
  assert.equal(adapter.getViewModel('p1').selected.unitId, heroId);
  assert.equal(adapter.getStateSnapshot('p1').selected.unitId, null);

  adapter.run({ type: 'SELECT_CELL', playerId: 'p2', r: 2, c: 3, commandId: 'r402_b', baseStateVersion: before.stateVersion });
  assert.deepEqual(adapter.getViewModel('p2').selected.cell, { r: 2, c: 3 });
  assert.equal(adapter.getViewModel('p1').selected.unitId, heroId);
  assert.equal(adapter.getViewModel('p1').selected.cell, null);
});

test('R403 RUN_FULL_DAY does not duplicate battleTrace event ids', () => {
  const adapter = createYSBZSUIAdapter({ gold: 8, battleId: 'round4_fullday' });
  const result = adapter.run({ type: 'RUN_FULL_DAY', commandId: 'r403', baseStateVersion: 0, playerId: 'p1' });
  assert.equal(result.accepted, true);
  const trace = adapter.exportBattleTrace().result.events;
  const ids = eventIds(trace);
  assert.equal(new Set(ids).size, ids.length);
  assert.equal(result.events.length, ids.length);
});

test('R404 read-only commands do not consume authoritative stateVersion', () => {
  const adapter = createYSBZSUIAdapter({ gold: 8, battleId: 'round4_readonly' });
  adapter.startBattle();
  const before = adapter.getViewModel();
  const detail = adapter.getCellDetail(0, 0);
  const exported = adapter.exportBattleTrace();
  assert.equal(detail.readOnly, true);
  assert.equal(exported.readOnly, true);
  assert.equal(adapter.getViewModel().stateVersion, before.stateVersion);
});

test('R405 server authority still rejects stale mutation commands', () => {
  const server = createServerAuthorityAdapter({ gold: 8, battleId: 'round4_strict' });
  const first = server.validate({ type: 'START_BATTLE', commandId: 'r405_a', playerId: 'p1', baseStateVersion: 0 });
  assert.equal(first.accepted, true);
  const stale = server.validate({ type: 'END_PLAYER_TURN', commandId: 'r405_b', playerId: 'p1', baseStateVersion: 0 });
  assert.equal(stale.accepted, false);
  assert.equal(stale.error.code, 'STATE_VERSION_MISMATCH');
});

test('R406 roster loop: newly bought pet starts on bench, can be blocked by full roster, and sell refunds gold', () => {
  const adapter = createYSBZSUIAdapter({ gold: 999, battleId: 'round4_roster' });
  adapter.enterShop('night_base', 6);
  const offer = adapter.getViewModel().shop.offers.find(o => o.price <= adapter.getViewModel().gold);
  assert.ok(offer);
  const beforeGold = adapter.getViewModel().gold;
  adapter.buyOffer(offer.offerId);
  let vm = adapter.getViewModel();
  const bought = vm.inventory.bench.find(x => x.petId === offer.petId);
  assert.ok(bought);
  assert.equal(bought.active, false);
  assert.ok(vm.inventory.bench.some(x => x.petId === offer.petId));
  const blocked = adapter.toggleUnitActive(bought.instanceId || bought.petId);
  assert.equal(blocked.result, false);
  assert.ok(blocked.events.some(e => e.type === 'TOGGLE_UNIT_ACTIVE_BLOCKED'));
  const sold = adapter.sellUnit(bought.instanceId || bought.petId);
  assert.ok(sold.events.some(e => e.type === 'SELL_UNIT'));
  vm = adapter.getViewModel();
  assert.ok(vm.gold > beforeGold - offer.price);
  assert.equal(vm.inventory.items.some(x => x.instanceId === bought.instanceId), false);
});

test('R407 UI exposes prep, replay, debug, AP modal and shop event without hover detail surfaces', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', '..', 'web/index.html'), 'utf8');
  const js = fs.readFileSync(path.join(__dirname, '..', '..', 'web/ux-app.js'), 'utf8');
  assert.match(html, /prep-overlay/);
  assert.match(html, /prep-active-list/);
  assert.match(html, /prep-bench-list/);
  assert.match(html, /data-log-tab="replay"/);
  assert.match(html, /ap-modal/);
  assert.doesNotMatch(html, /tooltip/);
  assert.doesNotMatch(html, /cell-popup/);
  assert.match(js, /TOGGLE_UNIT_ACTIVE/);
  assert.match(js, /EXPORT_BATTLE_TRACE/);
  assert.match(js, /REPLAY_BATTLE_TRACE/);
  assert.match(js, /GET_CELL_DETAIL/);
  assert.match(js, /APPLY_SHOP_EVENT/);
  assert.match(js, /toggleDebugPanel/);
  assert.match(js, /data-ap-choice/);
  assert.doesNotMatch(js, /data-tip/);
  assert.doesNotMatch(js, /showTooltip|scheduleTooltip|hideTooltip|showCellPopup|hideCellPopup/);
});

test('R408 action-slot aiming clears stale board targets before release', () => {
  const js = fs.readFileSync(path.join(__dirname, '..', '..', 'web/js/main.js'), 'utf8');
  assert.match(js, /function clearSelectedActionTarget\(\)/);
  assert.match(js, /clearSelectedActionTarget\(\);\s*document\.body\.dataset\.lastSlotClick/s);
  assert.match(js, /clearSelectedActionTarget\(\);\s*await runCommand\('SET_ACTION_DIRECTION'/s);
  assert.match(js, /USE_SLOT'[\s\S]*cell:\s*ui\.selectedCell\s*\|\|\s*null/);
  assert.doesNotMatch(js, /cell:\s*ui\.selectedCell\s*\|\|\s*ui\.vm\.selected\?\.cell\s*\|\|\s*null/);
});
