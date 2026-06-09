const SAVE_SCHEMA_VERSION = 1;
const SYSTEM_KEYS = new Set(['data', 'indexes', 'viewModel', 'dataSummary']);

function clone(value) {
  return value == null ? value : JSON.parse(JSON.stringify(value));
}

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === 'object') {
    const out = {};
    for (const k of Object.keys(value).sort()) out[k] = stable(value[k]);
    return out;
  }
  return value;
}

function checksum(value) {
  const str = JSON.stringify(stable(value));
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h.toString(16).padStart(8, '0');
}

function extractPlayableState(state) {
  const raw = clone(state || {});
  for (const key of SYSTEM_KEYS) delete raw[key];
  return raw;
}

function buildSaveDocument(state, opts = {}) {
  const payload = {
    schema: 'ysbzs.save',
    schemaVersion: SAVE_SCHEMA_VERSION,
    createdAt: opts.createdAt || null,
    gameVersion: opts.gameVersion || 'unknown',
    playerId: opts.playerId || 'p1',
    sessionId: opts.sessionId || null,
    state: extractPlayableState(state),
    viewStates: clone(opts.viewStates || {})
  };
  payload.checksum = checksum({ schema: payload.schema, schemaVersion: payload.schemaVersion, state: payload.state, viewStates: payload.viewStates });
  return payload;
}

function assertSaveDocument(doc) {
  if (!doc || typeof doc !== 'object') throw new Error('SAVE_INVALID: save document must be an object');
  if (doc.schema !== 'ysbzs.save') throw new Error('SAVE_INVALID_SCHEMA');
  if (Number(doc.schemaVersion) !== SAVE_SCHEMA_VERSION) throw new Error(`SAVE_UNSUPPORTED_VERSION:${doc.schemaVersion}`);
  if (!doc.state || typeof doc.state !== 'object') throw new Error('SAVE_MISSING_STATE');
  const expected = checksum({ schema: doc.schema, schemaVersion: doc.schemaVersion, state: doc.state, viewStates: doc.viewStates || {} });
  if (doc.checksum && doc.checksum !== expected) throw new Error('SAVE_CHECKSUM_MISMATCH');
  return true;
}

function applySaveToState(targetState, freshState, saveDoc) {
  assertSaveDocument(saveDoc);
  const playable = clone(saveDoc.state);
  for (const key of Object.keys(targetState)) delete targetState[key];
  Object.assign(targetState, freshState, playable, {
    data: freshState.data,
    indexes: freshState.indexes
  });
  return targetState;
}

module.exports = { SAVE_SCHEMA_VERSION, buildSaveDocument, assertSaveDocument, applySaveToState, extractPlayableState, checksum };
