const { createGameState } = require('./core/state.cjs');
const { ensureMultiplayerState } = require('./core/multiplayerState.cjs');
const { normalizeCommandEnvelope, rejectedCommandResult } = require('./core/commandEnvelope.cjs');
const { stateHash } = require('./core/stateHash.cjs');
const { buildSaveDocument, applySaveToState } = require('./storage/saveCodec.cjs');

function clone(value) { return JSON.parse(JSON.stringify(value)); }
function cloneOrNull(value) { return value == null ? null : clone(value); }

function projectedCamp(unit = {}) {
  if (unit.camp) return unit.camp;
  if (unit.side === 'hero' || unit.side === 'hero_leader') return 'player';
  if (unit.side === 'enemy' || unit.side === 'boss') return 'enemy';
  return unit.side || null;
}

function projectedUnitDetail(unit) {
  if (!unit) return null;
  const detail = clone(unit);
  detail.camp = projectedCamp(unit);
  detail.elements = clone(unit.elements || {});
  return detail;
}

function buildProjectedCellDetails(viewModel) {
  const units = [
    ...(viewModel?.heroes || []),
    ...(viewModel?.enemies || []),
    viewModel?.leaders?.player,
    viewModel?.leaders?.enemy
  ].filter(Boolean);
  const unitsById = new Map(units.map(unit => [unit.id, unit]));
  const cells = viewModel?.board?.cells || [];
  return cells.map(cell => ({
    r: cell.r,
    c: cell.c,
    key: cell.key || `${cell.r},${cell.c}`,
    terrain: clone(cell.terrain || { modules: [] }),
    elements: clone(cell.elements || {}),
    unit: projectedUnitDetail(unitsById.get(cell.unitId)),
    preview: cloneOrNull(cell.preview),
    previews: clone(cell.previews || []),
    threat: cloneOrNull(cell.threat),
    teamRisk: cloneOrNull(cell.teamRisk)
  }));
}

function keyForCell(cell = {}) { return cell.key || `${cell.r},${cell.c}`; }

function stableSignature(value) {
  return JSON.stringify(value || null);
}

function buildCellDiffs(beforeCells = [], afterCells = []) {
  const beforeMap = new Map(beforeCells.map(cell => [keyForCell(cell), cell]));
  const afterMap = new Map(afterCells.map(cell => [keyForCell(cell), cell]));
  const keys = new Set([...beforeMap.keys(), ...afterMap.keys()]);
  return [...keys].sort((a, b) => {
    const [ar, ac] = a.split(',').map(Number);
    const [br, bc] = b.split(',').map(Number);
    return ar - br || ac - bc;
  }).map(key => {
    const before = beforeMap.get(key) || null;
    const after = afterMap.get(key) || null;
    if (stableSignature(before) === stableSignature(after)) return null;
    const source = after || before || {};
    return { r: source.r, c: source.c, key, before, after };
  }).filter(Boolean);
}

function unitsForDiff(viewModel) {
  return [
    ...(viewModel?.heroes || []),
    ...(viewModel?.enemies || []),
    viewModel?.leaders?.player,
    viewModel?.leaders?.enemy
  ].filter(Boolean).map(clone);
}

function buildUnitDiffs(beforeUnits = [], afterUnits = []) {
  const beforeMap = new Map(beforeUnits.map(unit => [unit.id, unit]));
  const afterMap = new Map(afterUnits.map(unit => [unit.id, unit]));
  const ids = new Set([...beforeMap.keys(), ...afterMap.keys()]);
  return [...ids].sort().map(id => {
    const before = beforeMap.get(id) || null;
    const after = afterMap.get(id) || null;
    if (stableSignature(before) === stableSignature(after)) return null;
    return { id, before, after };
  }).filter(Boolean);
}

function nextManualFlowCommandType(state, commands = []) {
  if (state.phase === 'init') return 'START_BATTLE';
  if (state.phase === 'player_turn' || state.phase === 'player') {
    if (!commands.some(command => command.type === 'RUN_PLAYER_ALL_OUT')) return 'RUN_PLAYER_ALL_OUT';
    return 'END_PLAYER_TURN';
  }
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

function buildMoveManualFlowPreview(adapter, command, result) {
  if (command.type !== 'MOVE_HERO' || result === false) return null;
  const preview = adapter.run({ type: 'PREVIEW_MANUAL_FLOW', playerId: command.playerId, battleId: command.battleId, commandId: `${command.commandId}:move-preview`, limit: 2 });
  return preview?.ok === true ? preview.result : null;
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
    const beforeViewModel = viewFor(command);
    const beforeCells = clone(beforeViewModel.board?.cells || []);
    const beforeCellDetails = buildProjectedCellDetails(beforeViewModel);
    const beforeUnits = unitsForDiff(beforeViewModel);
    for (let i = 0; i < limit; i++) {
      const type = nextManualFlowCommandType(state, commands);
      if (!type) break;
      const step = adapterRun({ type, playerId: command.playerId, previewOf: command.commandId });
      commands.push({ type, ok: step.ok !== false, accepted: step.accepted !== false, phase: step.viewModel?.phase || state.phase, round: step.viewModel?.round ?? state.round });
      stepResults.push(step);
      if (step.ok === false || step.accepted === false) break;
    }
    const projectedViewModel = viewFor(command);
    const cells = clone(projectedViewModel.board?.cells || []);
    const cellDetails = buildProjectedCellDetails(projectedViewModel);
    const afterUnits = unitsForDiff(projectedViewModel);
    const cellDiffs = buildCellDiffs(beforeCells, cells);
    const unitDiffs = buildUnitDiffs(beforeUnits, afterUnits);
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
      result: { commands, events, viewModel: clone(projectedViewModel), beforeCells, beforeCellDetails, cells, cellDetails, cellDiffs, unitDiffs, projectedStateHash: projectedHash, rolledBack: true },
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

module.exports = { buildMoveManualFlowPreview, runManualFlowPreviewTransaction };
