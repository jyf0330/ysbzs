const test = require('node:test');
const assert = require('node:assert/strict');
const { createYSBZSUIAdapter } = require('../../src/uiAdapter.cjs');
const { COMMAND_REPLAY_VERSION, assertReplayDocument, verifyReplayDocument } = require('../../src/core/replayCodec.cjs');

function run(adapter, type, payload = {}) {
  const vm = adapter.getViewModel();
  return adapter.run(Object.assign({
    type,
    playerId: 'p1',
    baseStateVersion: vm.stateVersion
  }, payload));
}

test('replay command stream rebuilds the same state hash from public commands', () => {
  const adapter = createYSBZSUIAdapter({
    battleId: 'replay_command_stream_public_flow',
    seed: 'replay_command_stream_public_flow',
    gold: 8,
    activePets: ['pal_005']
  });

  const started = run(adapter, 'START_BATTLE');
  assert.equal(started.accepted, true);
  const hero = started.viewModel.heroes[0];
  assert.ok(hero && hero.id, 'replay fixture needs a controllable hero');

  const selected = run(adapter, 'SELECT_UNIT', { unitId: hero.id });
  assert.equal(selected.ephemeral, true);
  run(adapter, 'SELECT_CELL', { r: hero.position.r, c: hero.position.c });
  const used = run(adapter, 'USE_ACTION_SLOT', { slotId: 0 });
  assert.equal(used.accepted, true);

  const exported = adapter.exportReplay();
  const replay = exported.result;
  assert.equal(replay.schema, 'ysbzs.replay');
  assert.equal(replay.replayVersion, 'ysbzs_replay_v3_command_stream');
  assert.ok(replay.checksum);
  assertReplayDocument(replay);
  assert.deepEqual(replay.commandStream.map(item => item.command.type), [
    'START_BATTLE',
    'SELECT_UNIT',
    'SELECT_CELL',
    'USE_ACTION_SLOT'
  ]);
  assert.ok(replay.commandStream.every(item => item.checkpoint && item.checkpoint.afterHash), 'every replay command needs a checkpoint hash');
  assert.equal(replay.final.stateHash, exported.viewModel.stateHash);

  const verified = verifyReplayDocument(replay, options => createYSBZSUIAdapter(options));
  assert.equal(verified.ok, true);
  assert.equal(verified.finalHash, exported.viewModel.stateHash);
  assert.equal(verified.finalVersion, exported.viewModel.stateVersion);

  const tampered = JSON.parse(JSON.stringify(replay));
  tampered.commandStream[0].command.type = 'RUN_BATTLE';
  assert.throws(() => assertReplayDocument(tampered), /REPLAY_CHECKSUM_MISMATCH/);
});

test('mutating command log keeps replayable command payload and checkpoints', () => {
  const adapter = createYSBZSUIAdapter({ battleId: 'replay_command_log_payload', seed: 'replay_command_log_payload' });
  const result = run(adapter, 'START_BATTLE', { commandId: 'replay_start' });
  assert.equal(result.accepted, true);

  const snapshot = adapter.getStateSnapshot();
  const entry = snapshot.commandLog.find(item => item.commandId === 'replay_start');
  assert.ok(entry, 'accepted mutating command should be in commandLog');
  assert.equal(entry.command.type, 'START_BATTLE');
  assert.equal(entry.command.commandId, 'replay_start');
  assert.equal(entry.beforeVersion, 0);
  assert.equal(entry.afterVersion, 1);
  assert.ok(entry.beforeHash);
  assert.ok(entry.afterHash);
});

test('macro flow commands are checkpointed as replayable inputs', () => {
  const adapter = createYSBZSUIAdapter({
    battleId: 'replay_full_run_macro',
    seed: 'replay_full_run_macro',
    gold: 999
  });
  const result = run(adapter, 'RUN_FULL_RUN', {
    commandId: 'replay_full_run',
    fromDay: 1,
    toDay: 2,
    gold: 999
  });
  assert.equal(result.accepted, true);
  assert.equal(result.stateVersion, 1);

  const exported = adapter.exportReplay();
  const replay = exported.result;
  assert.deepEqual(replay.commandStream.map(item => item.command.type), ['RUN_FULL_RUN']);
  assert.equal(replay.commandStream[0].checkpoint.afterHash, exported.viewModel.stateHash);

  const verified = verifyReplayDocument(replay, options => createYSBZSUIAdapter(options));
  assert.equal(verified.ok, true);
  assert.equal(verified.finalHash, exported.viewModel.stateHash);
  assert.equal(verified.finalVersion, exported.viewModel.stateVersion);
});

test('replay document uses one current version name and keeps legacy version explicit', () => {
  const adapter = createYSBZSUIAdapter({
    battleId: 'replay_version_contract',
    seed: 'replay_version_contract'
  });
  run(adapter, 'START_BATTLE');

  const replay = adapter.exportReplay().result;
  assert.equal(replay.replayVersion, COMMAND_REPLAY_VERSION);
  assert.equal(replay.legacyReplayVersion, 'ysbzs_replay_v2_protocol');
  assert.equal(replay.commandReplayVersion, undefined);
  assertReplayDocument(replay);
});

test('replay debug timeline records rejected commands without polluting deterministic command stream', () => {
  const adapter = createYSBZSUIAdapter({
    battleId: 'replay_rejected_timeline',
    seed: 'replay_rejected_timeline',
    strictVersion: true
  });
  run(adapter, 'START_BATTLE', { commandId: 'timeline_start' });
  const before = adapter.getViewModel();
  const rejected = adapter.run({
    type: 'END_PLAYER_TURN',
    playerId: 'p1',
    commandId: 'timeline_stale_reject',
    baseStateVersion: 0
  });
  assert.equal(rejected.accepted, false);
  assert.equal(rejected.viewModel.stateVersion, before.stateVersion);

  const replay = adapter.exportReplay().result;
  assert.deepEqual(replay.commandStream.map(item => item.command.commandId), ['timeline_start']);
  const rejectedTimeline = replay.debugTimeline.find(item => item.commandId === 'timeline_stale_reject');
  assert.ok(rejectedTimeline, 'rejected command should be present in debug timeline');
  assert.equal(rejectedTimeline.accepted, false);
  assert.equal(rejectedTimeline.error.code, 'STATE_VERSION_MISMATCH');
  assert.equal(rejectedTimeline.beforeVersion, before.stateVersion);
  assert.equal(rejectedTimeline.afterVersion, before.stateVersion);
  assert.equal(rejectedTimeline.beforeHash, rejectedTimeline.afterHash);
  assert.equal(replay.summary.rejectedCommands, 1);
  assertReplayDocument(replay);
});
