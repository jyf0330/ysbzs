const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { createYSBZSUIAdapter } = require('../../src/uiAdapter.cjs');
const { createGameState } = require('../../src/core/state.cjs');
const { dispatch } = require('../../src/core/reducer.cjs');
const { assertSaveDocument } = require('../../src/storage/saveCodec.cjs');
const { createMemoryStorage } = require('../../src/storage/memoryStorage.cjs');
const { createFileStorage } = require('../../src/storage/fileStorage.cjs');
const { unsupportedMechanicsForUnit, auditPlayableUnits } = require('../../src/core/mechanicGate.cjs');
const { canonicalEventLog, eventsToText } = require('../../src/core/eventProjection.cjs');

function firstPreviewCell(adapter, unitId, slotId = 0) {
  const preview = adapter.buildPreview({ unitId, slotId }).result;
  assert.ok(Array.isArray(preview) && preview.length, 'preview must have at least one legal cell');
  return { r: preview[0].r, c: preview[0].c };
}

test('R501 save document exports/restores playable single-player state and per-player view state', () => {
  const a = createYSBZSUIAdapter({ gold: 8, battleId: 'round5_save_a' });
  a.startBattle();
  const heroId = a.getViewModel().heroes[0].id;
  a.run({ type: 'SELECT_UNIT', unitId: heroId, playerId: 'p1', commandId: 'r501_sel', baseStateVersion: a.getViewModel().stateVersion });
  a.run({ type: 'SELECT_CELL', r: 3, c: 3, playerId: 'p1', commandId: 'r501_cell', baseStateVersion: a.getViewModel().stateVersion });
  const save = a.exportSave('p1', { sessionId: 'unit_test' });
  assertSaveDocument(save);
  assert.equal(save.schema, 'ysbzs.save');
  assert.equal(save.state.data, undefined);
  assert.equal(save.state.indexes, undefined);

  const b = createYSBZSUIAdapter({ gold: 1, battleId: 'round5_save_b' });
  const loaded = b.importSave(save, 'p1');
  assert.equal(loaded.imported, true);
  assert.equal(loaded.viewModel.phase, a.getViewModel().phase);
  assert.equal(loaded.viewModel.stateVersion, a.getViewModel().stateVersion);
  assert.equal(loaded.viewModel.selected.unitId, heroId);
  assert.deepEqual(loaded.viewModel.selected.cell, { r: 3, c: 3 });
  assert.equal(b.getDataSummary().pets, a.getDataSummary().pets);
});

test('R502 save codecs reject tampered checksum and storage adapters round-trip documents', () => {
  const adapter = createYSBZSUIAdapter({ battleId: 'round5_storage' });
  adapter.startBattle();
  const save = adapter.exportSave('p1');
  const tampered = JSON.parse(JSON.stringify(save));
  tampered.state.gold += 99;
  assert.throws(() => assertSaveDocument(tampered), /SAVE_CHECKSUM_MISMATCH/);

  const mem = createMemoryStorage();
  mem.save('slotA', save);
  assert.equal(mem.list()[0], 'slotA');
  assert.deepEqual(mem.load('slotA'), save);

  const root = path.join(__dirname, '..', '..', '.tmp_round5_saves');
  fs.rmSync(root, { recursive: true, force: true });
  const file = createFileStorage(root);
  file.save('slotB', save);
  assert.deepEqual(file.load('slotB'), save);
  assert.equal(file.delete('slotB'), true);
  fs.rmSync(root, { recursive: true, force: true });
});

test('R503 core SELECT_* commands are no-op for authoritative GameState', () => {
  const state = createGameState({ battleId: 'round5_core_selected' });
  const before = JSON.stringify(state.selected);
  dispatch(state, { type: 'SELECT_UNIT', unitId: state.units[0].id });
  dispatch(state, { type: 'SELECT_CELL', r: 4, c: 4 });
  dispatch(state, { type: 'SELECT_SLOT', slotId: 2 });
  assert.equal(JSON.stringify(state.selected), before);
});

test('R504 AP allocation is consumed by USE_SLOT and affects available AP', () => {
  const adapter = createYSBZSUIAdapter({ gold: 8, battleId: 'round5_ap' });
  adapter.startBattle();
  let vm = adapter.getViewModel();
  const hero = vm.heroes.find(h => Number(h.ap || 0) >= 2) || vm.heroes[0];
  const cell = firstPreviewCell(adapter, hero.id, 0);
  const used = adapter.run({ type: 'USE_SLOT', unitId: hero.id, slotId: 0, cell, ap: 2, playerId: 'p1', commandId: 'r504_use', baseStateVersion: vm.stateVersion });
  assert.equal(used.accepted, true);
  assert.equal(used.result, true);
  vm = adapter.getViewModel();
  const afterHero = vm.heroes.find(h => h.id === hero.id);
  assert.equal(afterHero.actionApSpent, 2);
  assert.equal(afterHero.availableAp, Math.max(0, Number(afterHero.ap || 0) - 2));

  const cell2 = firstPreviewCell(adapter, hero.id, 1);
  const tooMuch = adapter.run({ type: 'USE_SLOT', unitId: hero.id, slotId: 1, cell: cell2, ap: Number(afterHero.availableAp || 0) + 1, playerId: 'p1', commandId: 'r504_block', baseStateVersion: vm.stateVersion });
  assert.equal(tooMuch.result, false);
  assert.ok(tooMuch.events.some(e => e.type === 'USE_SLOT_BLOCKED'));
});

test('R505 browser UI exposes save/load controls and server exposes save/load endpoints', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', '..', 'web/index.html'), 'utf8');
  const js = fs.readFileSync(path.join(__dirname, '..', '..', 'web/ux-app.js'), 'utf8');
  const server = fs.readFileSync(path.join(__dirname, '..', '..', 'tools/run_ui_server.cjs'), 'utf8');
  assert.match(html, /save-game-btn/);
  assert.match(html, /load-game-btn/);
  assert.match(js, /localStorage\.setItem\('ysbzs\.save\.slot1'/);
  assert.match(server, /\/api\/save/);
  assert.match(server, /\/api\/load/);
});


test('R506 mechanic gate identifies pending/data-only mechanics before pets become active rules content', () => {
  const defaultReport = auditPlayableUnits(createGameState());
  assert.deepEqual(defaultReport, []);

  const fake = { id: 'u_pending', petId: 'pal_001', name: '未实装宠', side: 'hero', alive: true, active: true, mechanics: ['mech_hp_regen_5', 'mech_shield_flat'] };
  const unsupported = unsupportedMechanicsForUnit(fake);
  assert.equal(unsupported.length, 1);
  assert.equal(unsupported[0].id, 'mech_hp_regen_5');
  const report = auditPlayableUnits({ units: [fake] });
  assert.equal(report.length, 1);
  assert.equal(report[0].unitId, 'u_pending');
});


test('R507 canonical event projection deduplicates battleTrace/state.events and produces report text', () => {
  const state = {
    battleTrace: [{ eventId: 'e1', seq: 1, type: 'BATTLE_START', text: 'start' }],
    events: [{ eventId: 'e1', seq: 1, type: 'BATTLE_START', text: 'start duplicate' }, { eventId: 'e2', seq: 2, type: 'DAMAGE_DEALT', text: 'hit' }]
  };
  const events = canonicalEventLog(state);
  assert.deepEqual(events.map(e => e.eventId), ['e1', 'e2']);
  assert.match(eventsToText(events), /DAMAGE_DEALT/);
});
