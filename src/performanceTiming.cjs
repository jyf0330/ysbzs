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

function createTimingLog(label) {
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
      return Object.assign({
        label,
        totalMs: roundMs(ended - startedAt),
        stages: stages.map(stage => Object.assign({}, stage))
      }, extra);
    }
  };
}

module.exports = { createTimingLog };
