let fs = null;
let path = null;
try {
  fs = require('fs');
  path = require('path');
} catch (_) {}

function nowMs() {
  const perf = typeof globalThis !== 'undefined' ? globalThis.performance : null;
  if (perf && typeof perf.now === 'function') return perf.now();
  if (typeof process !== 'undefined' && process.hrtime && typeof process.hrtime.bigint === 'function') {
    return Number(process.hrtime.bigint()) / 1e6;
  }
  return 0;
}

function roundMs(value) {
  return Math.round(Math.max(0, Number(value) || 0) * 1000) / 1000;
}

function safeLabel(label) {
  return String(label || 'timing').replace(/[^a-zA-Z0-9_.-]/g, '_');
}

function cloneJson(value) {
  return JSON.parse(JSON.stringify(value));
}

function canPersistToFile() {
  return !!(
    fs
    && path
    && typeof process !== 'undefined'
    && process.versions
    && process.versions.node
    && typeof fs.mkdirSync === 'function'
    && typeof fs.appendFileSync === 'function'
  );
}

function persistTimingToFile(label, result, options = {}) {
  if (!canPersistToFile()) return null;
  const rootDir = path.resolve(options.dir || process.env.YSBZS_TIMING_DIR || path.join(process.cwd(), '.ysbzs-performance'));
  fs.mkdirSync(rootDir, { recursive: true });
  const file = path.join(rootDir, `${safeLabel(label)}.jsonl`);
  const record = Object.assign({ persistedAt: new Date().toISOString() }, cloneJson(result));
  fs.appendFileSync(file, `${JSON.stringify(record)}\n`);
  return { kind: 'file', path: file };
}

function persistTimingToLocalStorage(label, result, options = {}) {
  const storage = typeof globalThis !== 'undefined' ? globalThis.localStorage : null;
  if (!storage || typeof storage.getItem !== 'function' || typeof storage.setItem !== 'function') return null;
  const key = options.storageKey || `ysbzs.timing.${safeLabel(label)}`;
  const limit = Math.max(1, Math.min(500, Number(options.limit || 200)));
  const record = Object.assign({ persistedAt: new Date().toISOString() }, cloneJson(result));
  let entries = [];
  try {
    entries = JSON.parse(storage.getItem(key) || '[]');
    if (!Array.isArray(entries)) entries = [];
  } catch (_) {
    entries = [];
  }
  entries.push(record);
  if (entries.length > limit) entries = entries.slice(entries.length - limit);
  storage.setItem(key, JSON.stringify(entries));
  return { kind: 'localStorage', key, count: entries.length };
}

function persistTimingResult(label, result, options = {}) {
  try {
    return persistTimingToFile(label, result, options) || persistTimingToLocalStorage(label, result, options) || null;
  } catch (_) {
    return null;
  }
}

function envFlag(name) {
  if (typeof process === 'undefined' || !process.env) return false;
  const value = String(process.env[name] || '').toLowerCase();
  return value === '1' || value === 'true' || value === 'yes' || value === 'on';
}

function shouldPersistTiming(options = {}) {
  return options.persistLocal === true || envFlag('YSBZS_TIMING_PERSIST');
}

function createTimingLog(label, options = {}) {
  const startedAt = nowMs();
  let lastAt = startedAt;
  const stages = [];

  function pushStage(name, started, ended, extra = {}) {
    const stage = Object.assign({
      name,
      ms: roundMs(ended - started),
      totalMs: roundMs(ended - startedAt)
    }, extra);
    stages.push(stage);
    lastAt = ended;
    return stage;
  }

  return {
    mark(name, extra = {}) {
      const ended = nowMs();
      return pushStage(name, lastAt, ended, extra);
    },
    measure(name, work, extra = {}) {
      const started = nowMs();
      try {
        return work();
      } finally {
        pushStage(name, started, nowMs(), extra);
      }
    },
    finish(extra = {}) {
      const ended = nowMs();
      const result = Object.assign({
        label,
        totalMs: roundMs(ended - startedAt),
        stages: stages.map(stage => Object.assign({}, stage))
      }, extra);
      if (shouldPersistTiming(options)) {
        const localPersistence = persistTimingResult(label, result, options);
        if (localPersistence) result.localPersistence = localPersistence;
      }
      return result;
    }
  };
}

module.exports = { createTimingLog };
