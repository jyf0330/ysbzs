const { createGameState } = require('./core/state.cjs');
const { normalizeCommandEnvelope, rejectedCommandResult } = require('./core/commandEnvelope.cjs');
const { ensureMultiplayerState } = require('./core/multiplayerState.cjs');
const { stateHash } = require('./core/stateHash.cjs');
const { buildSaveDocument, applySaveToState } = require('./storage/saveCodec.cjs');
const { runDayRangeScenario } = require('./scenarios/fullDay.cjs');

function clone(value) { return JSON.parse(JSON.stringify(value)); }

function replaceStateContents(target, source, options = {}) {
  for (const key of Object.keys(target)) delete target[key];
  Object.assign(target, source);
  ensureMultiplayerState(target, options);
}

function runFullDayCommand(ctx) {
  const { state, command, options, adapterVersion, viewStatesToObject, restoreViewStates, runFullPlayerDayFlow, mapPublicEvents, createSnapshot, viewFor } = ctx;
  const rollbackSave = buildSaveDocument(state, { playerId: command.playerId, gameVersion: adapterVersion, viewStates: viewStatesToObject() });
  try {
    const beforeIds = new Set((state.battleTrace || []).map(e => e.eventId || `${e.step}:${e.type}`));
    const result = runFullPlayerDayFlow(command.playerId);
    const events = mapPublicEvents((state.battleTrace || []).filter(e => !beforeIds.has(e.eventId || `${e.step}:${e.type}`)));
    const hash = stateHash(state);
    return {
      ok: true,
      accepted: true,
      flowCommand: true,
      command: typeof command === 'string' ? command : command.type,
      commandEnvelope: clone(command),
      stateVersion: state.stateVersion || 0,
      stateHash: hash,
      result: clone(result),
      events,
      trace: { id: `${state.battleId}:${command.commandId}:flow`, commandId: command.commandId, events },
      authoritativeState: createSnapshot(command.playerId),
      viewModel: viewFor(command)
    };
  } catch (err) {
    applySaveToState(state, ensureMultiplayerState(createGameState(options), options), rollbackSave);
    restoreViewStates(rollbackSave.viewStates || {});
    const rejected = rejectedCommandResult(state, command, err);
    rejected.rolledBack = true;
    rejected.viewModel = viewFor(command);
    return rejected;
  }
}

function runFullRunFlow({ state, options, defaultPlayerId, getViewModel, opts = {} }) {
  const scenario = runDayRangeScenario({
    fromDay: Number(opts.fromDay || 1),
    toDay: Number(opts.toDay || 10),
    gold: opts.gold ?? Math.max(8, Number(state.gold || 0)),
    seed: opts.seed || options.seed,
    battleId: opts.battleId || state.battleId
  });
  replaceStateContents(state, scenario, options);
  return getViewModel(opts.playerId || defaultPlayerId);
}

function runFullRunCommand(ctx) {
  const { state, command, options, adapterVersion, viewStatesToObject, restoreViewStates, mapPublicEvents, createSnapshot, viewFor, runFullRunFlow: runFlow } = ctx;
  const rollbackSave = buildSaveDocument(state, { playerId: command.playerId, gameVersion: adapterVersion, viewStates: viewStatesToObject() });
  try {
    const result = runFlow({
      fromDay: command.fromDay,
      toDay: command.toDay,
      gold: command.gold,
      seed: command.seed,
      battleId: command.battleId,
      playerId: command.playerId
    });
    const events = mapPublicEvents(state.events || []);
    const hash = stateHash(state);
    return {
      ok: true,
      accepted: true,
      flowCommand: true,
      command: typeof command === 'string' ? command : command.type,
      commandEnvelope: clone(command),
      stateVersion: state.stateVersion || 0,
      stateHash: hash,
      result: { dayRouteRuns: clone(state.dayRouteRuns || []), terminal: clone(state.dayRoute?.terminal || null) },
      events,
      trace: { id: `${state.battleId}:${command.commandId}:full-run`, commandId: command.commandId, events },
      authoritativeState: createSnapshot(command.playerId),
      viewModel: result
    };
  } catch (err) {
    applySaveToState(state, ensureMultiplayerState(createGameState(options), options), rollbackSave);
    restoreViewStates(rollbackSave.viewStates || {});
    const rejected = rejectedCommandResult(state, command, err);
    rejected.rolledBack = true;
    rejected.viewModel = viewFor(command);
    return rejected;
  }
}

module.exports = { runFullDayCommand, runFullRunCommand, runFullRunFlow };
