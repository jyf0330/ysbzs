const test = require('node:test');
const assert = require('node:assert/strict');
const { createYSBZSUIAdapter } = require('../src/uiAdapter.cjs');
const { createServerAuthorityAdapter } = require('../src/adapters/serverAuthorityAdapter.cjs');
const { loadGameData, validateData } = require('../src/core/data.cjs');
const { verifyReplayDocument } = require('../src/core/replayCodec.cjs');

function formalAdapter(seed, extra = {}) {
  return createYSBZSUIAdapter({
    battleId: `start-choice-${seed}`,
    seed,
    gold: 16,
    requireStartChoice: true,
    ...extra
  });
}

function run(adapter, type, payload = {}) {
  const vm = adapter.getViewModel();
  return adapter.run({ type, playerId: 'p1', baseStateVersion: vm.stateVersion, ...payload });
}

test('formal workbook data exposes exactly three ordered and valid opening choices', () => {
  const data = loadGameData();
  const validation = validateData(data);
  assert.equal(validation.ok, true, validation.issues.join('\n'));
  assert.equal(validation.counts.startChoices, 3);
  assert.deepEqual(data.startChoices.map(row => row.id), [
    'start_trade_capital',
    'start_thunder_companion',
    'start_endurance_oath'
  ]);
  assert.deepEqual(data.startChoices.map(row => row.displayOrder), [1, 2, 3]);
  assert.deepEqual(data.startChoices.map(row => [row.coinsDelta, row.freeRollsDelta, row.petId || '', row.runHealthDelta, row.runMaxHealthDelta]), [
    [4, 1, '', 0, 0],
    [-2, 0, 'pal_007', 0, 0],
    [-2, 0, '', 4, 4]
  ]);
});

test('formal authority entry is start_choice and same seed preserves candidate order', () => {
  const first = formalAdapter('stable-candidates').getViewModel();
  const second = formalAdapter('stable-candidates').getViewModel();
  assert.equal(first.phase, 'start_choice');
  assert.deepEqual(first.startOptions, second.startOptions);
  assert.deepEqual(first.nextActions.map(action => action.type), ['CHOOSE_START', 'CHOOSE_START', 'CHOOSE_START']);
  assert.deepEqual(first.nextActions.map(action => action.defaultPayload.startChoiceId), [
    'start_trade_capital',
    'start_thunder_companion',
    'start_endurance_oath'
  ]);
  const server = createServerAuthorityAdapter({ seed: 'server-formal-entry', gold: 16 });
  assert.equal(server.getViewModel().phase, 'start_choice');
});

test('each opening applies a distinct authoritative future-consumable result', () => {
  const trade = formalAdapter('trade');
  const tradeResult = run(trade, 'CHOOSE_START', { startChoiceId: 'start_trade_capital' });
  assert.equal(tradeResult.accepted, true);
  assert.equal(tradeResult.viewModel.phase, 'route');
  assert.equal(tradeResult.viewModel.gold, 20);
  assert.equal(tradeResult.viewModel.shop.freeRolls, 1);
  assert.equal(tradeResult.viewModel.runStart.source, 'START_CHOICES');
  assert.ok(tradeResult.viewModel.nextActions.some(action => action.type === 'GENERATE_NODE_OPTIONS'));
  const entered = run(trade, 'ENTER_SHOP', { poolId: 'night_base', slots: 10 });
  assert.equal(entered.viewModel.shop.freeRolls, 1, 'automatic shop entry roll does not spend the opening free refresh');
  const refreshed = run(trade, 'ROLL_SHOP', { slots: 10 });
  assert.equal(refreshed.viewModel.shop.freeRolls, 0);
  assert.equal(refreshed.viewModel.shop.refreshState.lastRoll.usedFreeRoll, true);

  const companion = formalAdapter('companion');
  const companionResult = run(companion, 'CHOOSE_START', { startChoiceId: 'start_thunder_companion' });
  assert.equal(companionResult.viewModel.gold, 14);
  assert.equal(companionResult.viewModel.heroes.filter(unit => unit.petId === 'pal_007').length, 1);
  assert.equal(companionResult.viewModel.runStart.pet.petId, 'pal_007');
  assert.equal(companionResult.viewModel.runStart.pet.quality, '青铜');

  const endurance = formalAdapter('endurance');
  const enduranceResult = run(endurance, 'CHOOSE_START', { startChoiceId: 'start_endurance_oath' });
  assert.equal(enduranceResult.viewModel.gold, 14);
  assert.equal(enduranceResult.viewModel.runHealth, 24);
  assert.equal(enduranceResult.viewModel.runMaxHealth, 24);
  assert.equal(enduranceResult.viewModel.castleLine, 24);
});

test('unknown and repeated selections reject atomically without changing hash', () => {
  const adapter = formalAdapter('atomic');
  const before = adapter.getViewModel();
  const unknown = run(adapter, 'CHOOSE_START', { startChoiceId: 'start_missing' });
  assert.equal(unknown.accepted, false);
  assert.equal(unknown.error.code, 'START_CHOICE_NOT_OFFERED');
  assert.equal(unknown.viewModel.stateHash, before.stateHash);
  assert.equal(unknown.viewModel.stateVersion, before.stateVersion);
  assert.equal(unknown.viewModel.phase, 'start_choice');

  const accepted = run(adapter, 'CHOOSE_START', { startChoiceId: 'start_trade_capital' });
  const selectedHash = accepted.viewModel.stateHash;
  const duplicate = run(adapter, 'CHOOSE_START', { startChoiceId: 'start_trade_capital' });
  assert.equal(duplicate.accepted, false);
  assert.equal(duplicate.error.code, 'START_CHOICE_PHASE_INVALID');
  assert.equal(duplicate.viewModel.stateHash, selectedHash);
  assert.equal(duplicate.viewModel.runStart.startChoiceId, 'start_trade_capital');
});

test('NEW_RUN clears the previous opening and returns to the formal choice gate', () => {
  const adapter = formalAdapter('new-run');
  const chosen = run(adapter, 'CHOOSE_START', { startChoiceId: 'start_thunder_companion' });
  assert.equal(chosen.viewModel.phase, 'route');
  assert.equal(chosen.viewModel.heroes.some(unit => unit.petId === 'pal_007'), true);
  const restarted = run(adapter, 'NEW_RUN', { seed: 'new-run-reseeded' });
  assert.equal(restarted.accepted, true);
  assert.equal(restarted.viewModel.phase, 'start_choice');
  assert.equal(restarted.viewModel.runStart, null);
  assert.equal(restarted.viewModel.gold, 16);
  assert.equal(restarted.viewModel.heroes.some(unit => unit.petId === 'pal_007'), false);
  assert.equal(restarted.viewModel.nextActions.filter(action => action.type === 'CHOOSE_START').length, 3);
  assert.equal(restarted.viewModel.commandLog.at(-1).type, 'NEW_RUN');
});

test('unselected and selected opening state survive save/load, command history, and replay', () => {
  const pending = formalAdapter('persistence');
  const pendingSave = pending.exportSave('p1', { createdAt: 'fixture' });
  const pendingLoaded = formalAdapter('persistence');
  const pendingImport = pendingLoaded.importSave(pendingSave);
  assert.equal(pendingImport.viewModel.phase, 'start_choice');
  assert.deepEqual(pendingImport.viewModel.startOptions, pending.getViewModel().startOptions);

  const selected = run(pendingLoaded, 'CHOOSE_START', { startChoiceId: 'start_endurance_oath' });
  assert.equal(selected.viewModel.commandLog.at(-1).type, 'CHOOSE_START');
  assert.equal(selected.viewModel.commandLog.at(-1).result.startChoiceId, 'start_endurance_oath');
  const selectedSave = pendingLoaded.exportSave('p1', { createdAt: 'fixture' });
  const selectedLoaded = formalAdapter('persistence');
  const selectedImport = selectedLoaded.importSave(selectedSave);
  assert.equal(selectedImport.viewModel.phase, 'route');
  assert.deepEqual(selectedImport.viewModel.runStart, selected.viewModel.runStart);
  assert.equal(selectedImport.viewModel.stateHash, selected.viewModel.stateHash);

  const exported = pendingLoaded.exportReplay().result;
  assert.deepEqual(exported.commandStream.map(entry => entry.command.type), ['CHOOSE_START']);
  assert.equal(exported.commandStream[0].command.startChoiceId, 'start_endurance_oath');
  const verified = verifyReplayDocument(exported, options => createYSBZSUIAdapter(options));
  assert.equal(verified.ok, true);
  assert.equal(verified.finalHash, selected.viewModel.stateHash);
});
