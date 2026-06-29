const { stateHash } = require('./stateHash.cjs');
const { checksum } = require('../storage/saveCodec.cjs');

const REPLAY_SCHEMA = 'ysbzs.replay';
const REPLAY_SCHEMA_VERSION = 1;
const COMMAND_REPLAY_VERSION = 'ysbzs_replay_v3_command_stream';

const NON_REPLAY_COMMANDS = new Set([
  'EXPORT_BATTLE_TRACE',
  'REPLAY_BATTLE_TRACE',
  'EXPORT_REPLAY',
  'BUILD_PREVIEW',
  'GET_CELL_DETAIL',
  'PREVIEW_MANUAL_FLOW'
]);

const INITIAL_OPTION_KEYS = [
  'activePets',
  'battleId',
  'day',
  'enemyLeader',
  'gold',
  'maxRounds',
  'mode',
  'period',
  'playerId',
  'playerLeader',
  'playerName',
  'players',
  'seed',
  'teams',
  'turn'
];

const COMMAND_EXCLUDE_KEYS = new Set([
  'accepted',
  'authoritativeState',
  'defaultPayload',
  'error',
  'events',
  'flowCommand',
  'label',
  'manualFlowPreview',
  'ok',
  'pressurePreview',
  'readOnly',
  'result',
  'rolledBack',
  'stateHash',
  'stateVersion',
  'trace',
  'viewModel'
]);

function clone(value) {
  return value == null ? value : JSON.parse(JSON.stringify(value));
}

function jsonSafe(value, excludeKeys = new Set()) {
  if (value === null || ['string', 'number', 'boolean'].includes(typeof value)) return value;
  if (Array.isArray(value)) return value.map(item => jsonSafe(item, excludeKeys)).filter(item => typeof item !== 'undefined');
  if (value && typeof value === 'object') {
    const out = {};
    for (const key of Object.keys(value).sort()) {
      if (excludeKeys.has(key) || key === 'data' || key === 'indexes') continue;
      const v = value[key];
      if (typeof v === 'function' || typeof v === 'undefined') continue;
      const safe = jsonSafe(v, excludeKeys);
      if (typeof safe !== 'undefined') out[key] = safe;
    }
    return out;
  }
  return undefined;
}

function sanitizeInitialOptions(options = {}) {
  const out = {};
  for (const key of INITIAL_OPTION_KEYS) {
    if (typeof options[key] !== 'undefined') out[key] = jsonSafe(options[key]);
  }
  return out;
}

function replayableCommand(command = {}) {
  return jsonSafe(command, COMMAND_EXCLUDE_KEYS) || {};
}

function shouldRecordReplayCommand(command = {}) {
  return !!command.type && !NON_REPLAY_COMMANDS.has(command.type);
}

function ensureReplayLog(state) {
  if (!Array.isArray(state.replayLog)) state.replayLog = [];
  return state.replayLog;
}

function ensureDebugTimeline(state) {
  if (!Array.isArray(state.debugTimeline)) state.debugTimeline = [];
  return state.debugTimeline;
}

function appendReplayCommand(state, command, checkpoint = {}) {
  if (!state || !shouldRecordReplayCommand(command)) return null;
  const log = ensureReplayLog(state);
  const afterVersion = checkpoint.afterVersion ?? checkpoint.stateVersion ?? state.stateVersion ?? 0;
  const afterHash = checkpoint.afterHash || checkpoint.stateHash || null;
  const entry = {
    index: log.length + 1,
    command: replayableCommand(command),
    checkpoint: {
      stateVersion: afterVersion,
      stateHash: afterHash,
      beforeVersion: checkpoint.beforeVersion ?? null,
      beforeHash: checkpoint.beforeHash || null,
      afterVersion,
      afterHash,
      eventIds: Array.isArray(checkpoint.eventIds) ? checkpoint.eventIds.slice() : []
    }
  };
  log.push(entry);
  return entry;
}

function commandCheckpointFromLogEntry(entry = {}) {
  return {
    stateVersion: entry.afterVersion,
    stateHash: entry.afterHash,
    beforeVersion: entry.beforeVersion,
    beforeHash: entry.beforeHash,
    afterVersion: entry.afterVersion,
    afterHash: entry.afterHash,
    eventIds: entry.eventIds || []
  };
}

function appendDebugTimelineEntry(state, command, checkpoint = {}, opts = {}) {
  if (!state || !command || !command.type) return null;
  const timeline = ensureDebugTimeline(state);
  const afterVersion = checkpoint.afterVersion ?? checkpoint.stateVersion ?? state.stateVersion ?? 0;
  const afterHash = checkpoint.afterHash || checkpoint.stateHash || null;
  const accepted = opts.accepted !== false;
  const entry = {
    index: timeline.length + 1,
    commandId: command.commandId || null,
    type: command.type,
    kind: opts.kind || 'mutation',
    accepted,
    replayable: accepted && opts.recordCommandStream !== false && shouldRecordReplayCommand(command),
    beforeVersion: checkpoint.beforeVersion ?? null,
    beforeHash: checkpoint.beforeHash || null,
    afterVersion,
    afterHash,
    eventIds: Array.isArray(checkpoint.eventIds) ? checkpoint.eventIds.slice() : []
  };
  if (opts.error) entry.error = jsonSafe(opts.error) || { code: 'COMMAND_REJECTED', message: String(opts.error.message || opts.error) };
  timeline.push(entry);
  return entry;
}

function recordReplayResult(state, command, checkpoint = {}, opts = {}) {
  const timelineEntry = appendDebugTimelineEntry(state, command, checkpoint, opts);
  let commandEntry = null;
  if (timelineEntry && timelineEntry.replayable) commandEntry = appendReplayCommand(state, command, checkpoint);
  return { timelineEntry, commandEntry };
}

function replayChecksumPayload(replay) {
  return {
    schema: replay.schema,
    schemaVersion: replay.schemaVersion,
    replayVersion: replay.replayVersion,
    legacyReplayVersion: replay.legacyReplayVersion,
    dataVersion: replay.dataVersion,
    rulesVersion: replay.rulesVersion,
    initial: replay.initial,
    commandStream: replay.commandStream,
    debugTimeline: replay.debugTimeline,
    summary: replay.summary,
    final: {
      stateVersion: replay.final?.stateVersion ?? 0,
      stateHash: replay.final?.stateHash || null,
      phase: replay.final?.phase || null,
      round: replay.final?.round ?? null
    }
  };
}

function buildReplayDocument(state, options = {}) {
  const commandStream = clone(state.replayLog || []);
  const debugTimeline = clone(state.debugTimeline || []);
  const commandCheckpoints = commandStream.map(item => ({
    index: item.index,
    commandId: item.command && item.command.commandId,
    type: item.command && item.command.type,
    checkpoint: item.checkpoint
  }));
  const initialOptions = sanitizeInitialOptions(state.replayInitialOptions || options.initialOptions || {});
  const replay = {
    schema: REPLAY_SCHEMA,
    schemaVersion: REPLAY_SCHEMA_VERSION,
    replayVersion: COMMAND_REPLAY_VERSION,
    legacyReplayVersion: 'ysbzs_replay_v2_protocol',
    dataVersion: state.data?.meta?.generatedAt || state.data?.meta?.sourcePackage || 'unknown',
    rulesVersion: options.rulesVersion || 'fire_water_wind_v1',
    seed: options.seed || state.rngState?.seed || initialOptions.seed || null,
    day: state.day,
    period: state.period,
    result: clone(state.result || null),
    initial: {
      options: initialOptions,
      battleId: state.battleId || initialOptions.battleId || null,
      seed: options.seed || initialOptions.seed || state.rngState?.seed || null,
      day: initialOptions.day ?? state.day,
      period: initialOptions.period ?? state.period,
      stateHash: state.initialStateHash || null
    },
    commandStream,
    commandCheckpoints,
    debugTimeline,
    summary: {
      timelineEntries: debugTimeline.length,
      replayableCommands: commandStream.length,
      rejectedCommands: debugTimeline.filter(item => item && item.accepted === false).length,
      finalStateVersion: state.stateVersion || 0,
      finalStateHash: options.finalStateHash || stateHash(state)
    },
    final: {
      stateVersion: state.stateVersion || 0,
      stateHash: options.finalStateHash || stateHash(state),
      phase: state.phase,
      round: state.round,
      result: clone(state.result || null)
    },
    inputLog: clone(state.inputLog || []),
    changeLog: clone(state.changes || []),
    battleTrace: clone(state.battleTrace || []),
    finalSummary: {
      phase: state.phase,
      round: state.round,
      day: state.day,
      period: state.period,
      units: (state.units || []).map(u => ({
        id: u.id,
        petId: u.petId,
        name: u.name,
        hp: u.hp,
        shield: u.shield,
        alive: u.alive,
        position: clone(u.position || null)
      }))
    }
  };
  replay.checksum = checksum(replayChecksumPayload(replay));
  return replay;
}

function assertReplayDocument(replay) {
  if (!replay || typeof replay !== 'object') throw new Error('REPLAY_INVALID: replay document must be an object');
  if (replay.schema !== REPLAY_SCHEMA) throw new Error('REPLAY_INVALID_SCHEMA');
  if (Number(replay.schemaVersion) !== REPLAY_SCHEMA_VERSION) throw new Error(`REPLAY_UNSUPPORTED_VERSION:${replay.schemaVersion}`);
  if (!Array.isArray(replay.commandStream)) throw new Error('REPLAY_MISSING_COMMAND_STREAM');
  const expected = checksum(replayChecksumPayload(replay));
  if (replay.checksum && replay.checksum !== expected) throw new Error('REPLAY_CHECKSUM_MISMATCH');
  return true;
}

function verifyReplayDocument(replay, createAdapter) {
  assertReplayDocument(replay);
  if (typeof createAdapter !== 'function') throw new Error('REPLAY_CREATE_ADAPTER_REQUIRED');
  const adapter = createAdapter(clone(replay.initial?.options || {}));
  const checkpoints = [];
  const initialHash = adapter.getViewModel().stateHash;
  for (const item of replay.commandStream || []) {
    const result = adapter.run(clone(item.command || {}));
    const expected = item.checkpoint || {};
    const actualVm = adapter.getViewModel();
    const expectedHash = expected.afterHash || expected.stateHash || null;
    const ok = result.accepted !== false && (!expectedHash || expectedHash === actualVm.stateHash);
    checkpoints.push({
      index: item.index,
      commandId: item.command && item.command.commandId,
      type: item.command && item.command.type,
      ok,
      expectedHash,
      actualHash: actualVm.stateHash,
      expectedVersion: expected.afterVersion ?? expected.stateVersion,
      actualVersion: actualVm.stateVersion,
      accepted: result.accepted !== false
    });
    if (!ok) {
      return { ok: false, initialHash, finalHash: actualVm.stateHash, finalVersion: actualVm.stateVersion, checkpoints };
    }
  }
  const finalVm = adapter.getViewModel();
  const finalMatches = !replay.final?.stateHash || replay.final.stateHash === finalVm.stateHash;
  return {
    ok: finalMatches,
    initialHash,
    finalHash: finalVm.stateHash,
    finalVersion: finalVm.stateVersion,
    checkpoints
  };
}

module.exports = {
  REPLAY_SCHEMA,
  REPLAY_SCHEMA_VERSION,
  COMMAND_REPLAY_VERSION,
  sanitizeInitialOptions,
  replayableCommand,
  shouldRecordReplayCommand,
  ensureReplayLog,
  ensureDebugTimeline,
  appendReplayCommand,
  appendDebugTimelineEntry,
  recordReplayResult,
  commandCheckpointFromLogEntry,
  buildReplayDocument,
  assertReplayDocument,
  verifyReplayDocument
};
