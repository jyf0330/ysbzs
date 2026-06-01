class TraceRecorder {
  constructor(scenarioId) {
    this.scenarioId = scenarioId;
    this.steps = [];
  }

  record(step) {
    this.steps.push({
      scenarioId: this.scenarioId,
      recordedAt: new Date().toISOString(),
      ...step,
    });
  }

  toJSONL() {
    return this.steps.map(step => JSON.stringify(step)).join('\n') + (this.steps.length ? '\n' : '');
  }
}

module.exports = { TraceRecorder };
