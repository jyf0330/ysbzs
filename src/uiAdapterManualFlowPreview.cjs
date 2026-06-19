const { createGameState } = require('./core/state.cjs');
const { ensureMultiplayerState } = require('./core/multiplayerState.cjs');
const { normalizeCommandEnvelope, rejectedCommandResult } = require('./core/commandEnvelope.cjs');
const { stateHash } = require('./core/stateHash.cjs');
const { buildSaveDocument, applySaveToState } = require('./storage/saveCodec.cjs');
const { createTimingLog } = require('./performanceTiming.cjs');

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

function unitSourceMap(beforeUnits = [], afterUnits = []) {
  const out = new Map();
  for (const unit of [...beforeUnits, ...afterUnits]) {
    if (unit?.id) out.set(unit.id, unit);
  }
  return out;
}

function sourceNameForDamage(event = {}, action = null, unitsById = new Map()) {
  const sourceId = event.sourceId || action?.unitId || null;
  const unit = sourceId ? unitsById.get(sourceId) : null;
  return unit?.displayName || unit?.name || event.sourceName || action?.unitName || sourceId || '系统';
}

function matchingActionForDamage(actions = [], event = {}) {
  for (let i = actions.length - 1; i >= 0; i--) {
    const action = actions[i];
    if (action.step > event.step) continue;
    if (event.sourceId && action.unitId !== event.sourceId) continue;
    if (Array.isArray(action.targetIds) && event.targetId && !action.targetIds.includes(event.targetId)) continue;
    return action;
  }
  return null;
}

function damageThreatFromEvent(event = {}, action = null, unitsById = new Map()) {
  const shieldDamage = Math.max(0, Number(event.shieldFrom ?? 0) - Number(event.shieldTo ?? 0));
  const hpDamage = Math.max(0, Number(event.hpFrom ?? 0) - Number(event.hpTo ?? 0));
  const finalDamage = Math.max(0, Number(event.final ?? event.damage ?? 0));
  const damage = finalDamage || hpDamage + shieldDamage;
  if (damage <= 0) return null;
  const enemyId = event.sourceId || action?.unitId || null;
  const enemyName = sourceNameForDamage(event, action, unitsById);
  return {
    enemyId,
    enemyName,
    unitId: enemyId,
    unitName: enemyName,
    targetId: event.targetId || null,
    damage,
    shieldDamage,
    hpDamage,
    raw: Number(event.raw ?? damage),
    final: damage,
    element: event.element ?? null,
    slotId: action?.slotId ?? null,
    slotLabel: action?.slotLabel || null,
    shapeId: action?.shapeId || null,
    shapeName: action?.shapeName || null,
    direction: action?.direction || null,
    cells: clone(action?.cells || []),
    actionEventId: action?.eventId || null,
    damageEventId: event.eventId || null,
    step: event.step ?? null
  };
}

function buildDamageThreatsByTarget(events = [], beforeUnits = [], afterUnits = []) {
  const unitsById = unitSourceMap(beforeUnits, afterUnits);
  const actions = [];
  const threatsByTarget = new Map();
  for (const event of events || []) {
    if (!event) continue;
    if (event.type === 'ENEMY_PET_ACTION') {
      actions.push(event);
      continue;
    }
    if (event.type !== 'DAMAGE' || !event.targetId) continue;
    const threat = damageThreatFromEvent(event, matchingActionForDamage(actions, event), unitsById);
    if (!threat) continue;
    const list = threatsByTarget.get(event.targetId) || [];
    list.push(threat);
    threatsByTarget.set(event.targetId, list);
  }
  return threatsByTarget;
}

function attachUnitDiffSources(unitDiffs = [], events = [], beforeUnits = [], afterUnits = []) {
  const threatsByTarget = buildDamageThreatsByTarget(events, beforeUnits, afterUnits);
  return unitDiffs.map(diff => {
    const threats = threatsByTarget.get(diff.id) || [];
    const enemyIds = [...new Set(threats.map(threat => threat.enemyId).filter(Boolean))];
    return Object.assign({}, diff, { enemyIds, threats });
  });
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

function shouldPersistTiming(options = {}, command = {}) {
  return command.persistTiming === true || options.persistTiming === true;
}

function runManualFlowPreviewTransaction(ctx, rawCommand) {
  const { state, options, defaultPlayerId, adapterRun, viewFor, viewStateFor, maybeSnapshot, commandText } = ctx;
  const timing = createTimingLog('PREVIEW_MANUAL_FLOW', { persistLocal: shouldPersistTiming(options, rawCommand) });
  const transaction = timing.measure('capture_snapshot', () => captureFullSnapshotTransaction(ctx, rawCommand.playerId || defaultPlayerId));
  let command = null;
  try {
    command = timing.measure('normalize_command', () => normalizeCommandEnvelope(rawCommand, state, { playerId: options.playerId, strictVersion: false }));
    const limit = Math.max(1, Math.min(4, Number(command.limit || 2)));
    const commands = [];
    const stepResults = [];
    const beforeViewModel = timing.measure('capture_before_view_model', () => viewFor(command));
    const beforeCells = timing.measure('clone_before_cells', () => clone(beforeViewModel.board?.cells || []));
    const beforeCellDetails = timing.measure('build_before_cell_details', () => buildProjectedCellDetails(beforeViewModel));
    const beforeUnits = timing.measure('capture_before_units', () => unitsForDiff(beforeViewModel));
    for (let i = 0; i < limit; i++) {
      const type = timing.measure(`select_next_command_${i + 1}`, () => nextManualFlowCommandType(state, commands), { step: i + 1 });
      if (!type) break;
      const step = timing.measure(`sandbox_command_${type}`, () => adapterRun({ type, playerId: command.playerId, previewOf: command.commandId }), { step: i + 1 });
      commands.push({ type, ok: step.ok !== false, accepted: step.accepted !== false, phase: step.viewModel?.phase || state.phase, round: step.viewModel?.round ?? state.round });
      stepResults.push(step);
      if (step.ok === false || step.accepted === false) break;
    }
    const projectedViewModel = timing.measure('capture_projected_view_model', () => viewFor(command));
    const cells = timing.measure('clone_after_cells', () => clone(projectedViewModel.board?.cells || []));
    const cellDetails = timing.measure('build_after_cell_details', () => buildProjectedCellDetails(projectedViewModel));
    const afterUnits = timing.measure('capture_after_units', () => unitsForDiff(projectedViewModel));
    const cellDiffs = timing.measure('build_cell_diffs', () => buildCellDiffs(beforeCells, cells));
    const events = timing.measure('collect_events', () => stepResults.flatMap(step => Array.isArray(step.events) ? step.events : []).map(clone));
    const rawUnitDiffs = timing.measure('build_unit_diffs', () => buildUnitDiffs(beforeUnits, afterUnits));
    const unitDiffs = timing.measure('attach_unit_diff_sources', () => attachUnitDiffSources(rawUnitDiffs, events, beforeUnits, afterUnits));
    const projectedHash = timing.measure('hash_projected_state', () => stateHash(state));
    timing.measure('restore_snapshot', () => restoreFullSnapshotTransaction(ctx, transaction));
    const restoredViewState = timing.measure('capture_restored_view_state', () => viewStateFor(command));
    const authoritativeState = timing.measure('capture_authoritative_state', () => maybeSnapshot(command.playerId, restoredViewState));
    const restoredViewModel = timing.measure('capture_restored_view_model', () => viewFor(command));
    const timingResult = timing.finish({
      battleId: state.battleId || null,
      commandId: command.commandId || rawCommand.commandId || null,
      playerId: command.playerId || rawCommand.playerId || defaultPlayerId || null,
      phaseBefore: beforeViewModel.phase || state.phase || null,
      phaseAfter: projectedViewModel.phase || null,
      roundBefore: beforeViewModel.round ?? state.round ?? null,
      roundAfter: projectedViewModel.round ?? null,
      stateVersion: transaction.stateVersion,
      stateHash: transaction.stateHash,
      projectedStateHash: projectedHash,
      commandCount: commands.length,
      cellDiffCount: cellDiffs.length,
      unitDiffCount: unitDiffs.length
    });
    return {
      ok: true,
      accepted: true,
      readOnly: true,
      preview: true,
      command: commandText(command),
      commandEnvelope: clone(command),
      stateVersion: transaction.stateVersion,
      stateHash: transaction.stateHash,
      result: { commands, events, viewModel: clone(projectedViewModel), beforeCells, beforeCellDetails, cells, cellDetails, cellDiffs, unitDiffs, projectedStateHash: projectedHash, rolledBack: true, timing: timingResult },
      events: [],
      trace: { id: `${state.battleId}:${command.commandId}:manual-flow-preview`, commandId: command.commandId, events: [] },
      authoritativeState,
      viewModel: restoredViewModel
    };
  } catch (err) {
    timing.measure('restore_snapshot', () => restoreFullSnapshotTransaction(ctx, transaction));
    const fallbackCommand = command || Object.assign({ type: rawCommand.type || 'PREVIEW_MANUAL_FLOW', playerId: rawCommand.playerId || defaultPlayerId, commandId: rawCommand.commandId || 'preview_manual_flow_failed' }, rawCommand);
    const rejected = rejectedCommandResult(state, fallbackCommand, err);
    rejected.rolledBack = true;
    rejected.timing = timing.finish({
      battleId: state.battleId || null,
      commandId: fallbackCommand.commandId || null,
      playerId: fallbackCommand.playerId || null,
      phaseBefore: state.phase || null,
      roundBefore: state.round ?? null,
      stateVersion: transaction.stateVersion,
      stateHash: transaction.stateHash,
      error: err.message || String(err)
    });
    rejected.viewModel = viewFor(fallbackCommand);
    return rejected;
  }
}

module.exports = { buildMoveManualFlowPreview, runManualFlowPreviewTransaction };
