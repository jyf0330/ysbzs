const { stateHash } = require('./stateHash.cjs');
const { DEFAULT_PLAYER_ID, ensureMultiplayerState, canPlayerControlUnit, inferTeamId } = require('./multiplayerState.cjs');
const { replayableCommand } = require('./replayCodec.cjs');

const SYSTEM_COMMANDS = new Set([
  'START_BATTLE', 'START_NEXT_ROUND', 'END_PLAYER_TURN', 'RUN_MONSTER_TURN',
  'RUN_PLAYER_ALL_OUT', 'AUTO_POSITION_HEROES',
  'REWARD_OPTIONS', 'PICK_REWARD', 'ENTER_SHOP', 'ROLL_SHOP', 'EXIT_SHOP',
  'EXPORT_BATTLE_TRACE', 'REPLAY_BATTLE_TRACE', 'EXPORT_REPLAY', 'BUILD_PREVIEW', 'GET_CELL_DETAIL', 'PREVIEW_MANUAL_FLOW'
]);
const DEBUG_OR_HOST_COMMANDS = new Set([
  'RUN_BATTLE', 'RUN_FULL_DAY', 'SETUP_DAY7_FIRE_TRIAL', 'RUN_DAY7_FIRE_TURN_1', 'RUN_DAY7_FIRE_TRIAL_ALL'
]);
const UNIT_COMMANDS = new Set(['MOVE_HERO', 'USE_SLOT', 'USE_ACTION_SLOT', 'SET_ACTION_DIRECTION', 'SET_SLOT_DIR', 'SELECT_UNIT', 'SELECT_HERO', 'SELL_UNIT', 'TOGGLE_UNIT_ACTIVE']);

function clone(v) { return JSON.parse(JSON.stringify(v)); }
function nextCommandId(state) {
  const n = Number(state.nextCommand || 1);
  state.nextCommand = n + 1;
  return `cmd_${String(n).padStart(6, '0')}`;
}
function flattenPayload(command) {
  if (!command || !command.payload || typeof command.payload !== 'object') return command;
  const out = Object.assign({}, command.payload, command);
  delete out.payload;
  return out;
}
function normalizeCommandEnvelope(raw, state, opts = {}) {
  const base = flattenPayload(clone(raw || {}));
  if (!base.type) throw new Error('command.type is required');
  ensureMultiplayerState(state, opts);
  base.commandId = base.commandId || nextCommandId(state);
  base.playerId = base.playerId || opts.playerId || DEFAULT_PLAYER_ID;
  base.battleId = base.battleId || state.battleId;
  if (typeof base.baseStateVersion === 'undefined' || base.baseStateVersion === null) base.baseStateVersion = state.stateVersion || 0;
  return base;
}
function allUnits(state) {
  return [state.leaders?.player, state.leaders?.enemy, ...(state.units || [])].filter(Boolean);
}
function findUnit(state, id) {
  if (!id) return null;
  return allUnits(state).find(u => u.id === id || u.petId === id || u.instanceId === id) || null;
}
function actorIdFromCommand(state, command) {
  return command.actorId || command.unitId || command.heroId || command.id || command.instanceId || null;
}
function validateCommandAuthority(state, command, opts = {}) {
  ensureMultiplayerState(state, { playerId: command.playerId });
  if (opts.strictVersion && Number(command.baseStateVersion) !== Number(state.stateVersion || 0)) {
    const err = new Error(`STATE_VERSION_MISMATCH: command based on ${command.baseStateVersion}, current ${state.stateVersion}`);
    err.code = 'STATE_VERSION_MISMATCH';
    throw err;
  }
  if (DEBUG_OR_HOST_COMMANDS.has(command.type)) {
    if ((state.mode || 'solo') !== 'solo' && !opts.allowDebugCommands) {
      const err = new Error(`DEBUG_COMMAND_FORBIDDEN: ${command.type} is not a player command in ${state.mode} mode`);
      err.code = 'DEBUG_COMMAND_FORBIDDEN';
      throw err;
    }
    return true;
  }
  if (SYSTEM_COMMANDS.has(command.type)) return true;
  if (command.type === 'SELECT_CELL' || command.type === 'SELECT_SLOT' || command.type === 'CLEAR_SELECTION') return true;
  if (command.type === 'FREEZE_OFFER' || command.type === 'UNFREEZE_OFFER' || command.type === 'BUY_OFFER' || command.type === 'APPLY_SHOP_EVENT') return true;
  if (!UNIT_COMMANDS.has(command.type)) return true;
  const unit = findUnit(state, actorIdFromCommand(state, command));
  if (!unit) return true; // 兼容旧命令：让核心自己返回 blocked，而不是在外壳提前炸掉。
  if (!canPlayerControlUnit(state, command.playerId, unit)) {
    const err = new Error(`FORBIDDEN_UNIT_CONTROL: ${command.playerId} cannot control ${unit.id}`);
    err.code = 'FORBIDDEN_UNIT_CONTROL';
    throw err;
  }
  return true;
}
function teamIdForCommand(state, command) {
  const unit = findUnit(state, actorIdFromCommand(state, command));
  if (unit) return unit.teamId || inferTeamId(unit);
  const p = state.players && state.players[command.playerId];
  return p ? p.teamId : null;
}
function annotateEvents(state, events, command) {
  state.battleTrace = Array.isArray(state.battleTrace) ? state.battleTrace : [];
  const teamId = teamIdForCommand(state, command);
  for (const event of events) {
    event.commandId = event.commandId || command.commandId;
    event.playerId = event.playerId || command.playerId;
    event.teamId = event.teamId || teamId;
    event.battleId = event.battleId || state.battleId;
    event.eventId = event.eventId || `${state.battleId}:${command.commandId}:${event.step}:${event.type}`;
    const existing = state.battleTrace.find(e => (e.eventId || `legacy_${e.step}_${e.type}`) === event.eventId);
    if (existing) {
      existing.commandId = existing.commandId || event.commandId;
      existing.playerId = existing.playerId || event.playerId;
      existing.teamId = existing.teamId || event.teamId;
      existing.battleId = existing.battleId || event.battleId;
      existing.seq = existing.seq || state.battleTrace.indexOf(existing) + 1;
      Object.assign(existing, clone(event), { seq: existing.seq });
      event.seq = existing.seq;
    } else {
      event.seq = event.seq || state.battleTrace.length + 1;
      state.battleTrace.push(clone(event));
    }
  }
  return events;
}
function commitAcceptedCommand(state, command, beforeHash, result, events) {
  const beforeVersion = Number(state.stateVersion || 0);
  state.stateVersion = beforeVersion + 1;
  if (state.rngState && Number.isFinite(Number(state.rngState.index))) state.rngState.index = Number(state.rngState.index) + 1;
  const afterHash = stateHash(state);
  state.commandLog = Array.isArray(state.commandLog) ? state.commandLog : [];
  const entry = {
    commandId: command.commandId,
    battleId: state.battleId,
    playerId: command.playerId,
    teamId: teamIdForCommand(state, command),
    type: command.type,
    baseStateVersion: command.baseStateVersion,
    beforeVersion,
    afterVersion: state.stateVersion,
    beforeHash,
    afterHash,
    accepted: true,
    command: replayableCommand(command),
    result: result === undefined ? true : clone(result),
    eventIds: (events || []).map(e => e.eventId).filter(Boolean)
  };
  state.commandLog.push(entry);
  return entry;
}
function rejectedCommandResult(state, command, err) {
  const beforeHash = stateHash(state);
  return {
    ok: false,
    accepted: false,
    error: { code: err.code || 'COMMAND_REJECTED', message: err.message || String(err) },
    command: command && command.type,
    commandEnvelope: command ? clone(command) : null,
    stateVersion: state.stateVersion || 0,
    stateHash: beforeHash,
    trace: { id: command ? `${state.battleId}:${command.commandId}:rejected` : `${state.battleId}:rejected`, commandId: command && command.commandId, events: [{ type: 'ACTION_REJECTED', reason: err.code || 'COMMAND_REJECTED', text: err.message || String(err) }] }
  };
}

module.exports = {
  normalizeCommandEnvelope,
  validateCommandAuthority,
  annotateEvents,
  commitAcceptedCommand,
  rejectedCommandResult,
  teamIdForCommand,
  actorIdFromCommand,
  findUnit,
  SYSTEM_COMMANDS,
  DEBUG_OR_HOST_COMMANDS
};
