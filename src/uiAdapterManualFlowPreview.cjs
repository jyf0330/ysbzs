const { createGameState } = require('./core/state.cjs');
const { dispatch: coreDispatch } = require('./core/reducer.cjs');
const { ensureMultiplayerState } = require('./core/multiplayerState.cjs');
const { normalizeCommandEnvelope, rejectedCommandResult } = require('./core/commandEnvelope.cjs');
const { stateHash } = require('./core/stateHash.cjs');
const { buildSaveDocument, applySaveToState } = require('./storage/saveCodec.cjs');

function clone(value) { return JSON.parse(JSON.stringify(value)); }

function nextManualFlowCommandType(state) {
  if (state.phase === 'init') return 'START_BATTLE';
  if (state.phase === 'player_turn' || state.phase === 'player') return 'END_PLAYER_TURN';
  if (state.phase === 'monster_turn') return 'RUN_MONSTER_TURN';
  if (state.phase === 'round_end' && Number(state.round || 0) < Number(state.maxRounds || 0)) return 'START_NEXT_ROUND';
  return null;
}

function captureFullSnapshotTransaction(ctx, playerId) {
  const { state, options, adapterVersion, viewStatesToObject } = ctx;
  return {
    save: buildSaveDocument(state, {
      playerId: playerId || options.playerId || 'p1',
      gameVersion: adapterVersion,
      viewStates: viewStatesToObject()
    }),
    stateVersion: state.stateVersion || 0,
    stateHash: stateHash(state)
  };
}

function restoreFullSnapshotTransaction(ctx, transaction) {
  const { state, options, restoreViewStates } = ctx;
  applySaveToState(state, ensureMultiplayerState(createGameState(options), options), transaction.save);
  restoreViewStates(transaction.save.viewStates || {});
}

function runManualFlowPreviewTransaction(ctx, rawCommand) {
  const { state, options, defaultPlayerId, adapterRun, viewFor, viewStateFor, maybeSnapshot, commandText } = ctx;
  const transaction = captureFullSnapshotTransaction(ctx, rawCommand.playerId || defaultPlayerId);
  let command = null;
  try {
    command = normalizeCommandEnvelope(rawCommand, state, { playerId: options.playerId, strictVersion: false });
    const limit = Math.max(1, Math.min(4, Number(command.limit || 2)));
    const commands = [];
    const stepResults = [];
    for (let i = 0; i < limit; i++) {
      const type = nextManualFlowCommandType(state);
      if (!type) break;
      const step = adapterRun({ type, playerId: command.playerId, previewOf: command.commandId });
      commands.push({ type, ok: step.ok !== false, accepted: step.accepted !== false, phase: step.viewModel?.phase || state.phase, round: step.viewModel?.round ?? state.round });
      stepResults.push(step);
      if (step.ok === false || step.accepted === false) break;
    }
    const projectedViewModel = viewFor(command);
    const cells = clone(projectedViewModel.board?.cells || []);
    const cellDetails = cells.map(cell => coreDispatch(state, { type: 'GET_CELL_DETAIL', r: cell.r, c: cell.c })).filter(Boolean).map(clone);
    const events = stepResults.flatMap(step => Array.isArray(step.events) ? step.events : []).map(clone);
    const projectedHash = stateHash(state);
    restoreFullSnapshotTransaction(ctx, transaction);
    const restoredViewState = viewStateFor(command);
    return {
      ok: true,
      accepted: true,
      readOnly: true,
      preview: true,
      command: commandText(command),
      commandEnvelope: clone(command),
      stateVersion: transaction.stateVersion,
      stateHash: transaction.stateHash,
      result: { commands, events, viewModel: clone(projectedViewModel), cells, cellDetails, projectedStateHash: projectedHash, rolledBack: true },
      events: [],
      trace: { id: `${state.battleId}:${command.commandId}:manual-flow-preview`, commandId: command.commandId, events: [] },
      authoritativeState: maybeSnapshot(command.playerId, restoredViewState),
      viewModel: viewFor(command)
    };
  } catch (err) {
    restoreFullSnapshotTransaction(ctx, transaction);
    const fallbackCommand = command || Object.assign({ type: rawCommand.type || 'PREVIEW_MANUAL_FLOW', playerId: rawCommand.playerId || defaultPlayerId, commandId: rawCommand.commandId || 'preview_manual_flow_failed' }, rawCommand);
    const rejected = rejectedCommandResult(state, fallbackCommand, err);
    rejected.rolledBack = true;
    rejected.viewModel = viewFor(fallbackCommand);
    return rejected;
  }
}

module.exports = { runManualFlowPreviewTransaction };
