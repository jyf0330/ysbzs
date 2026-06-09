const { createYSBZSUIAdapter } = require('../uiAdapter.cjs');

function createLocalPredictionAdapter(options = {}) {
  const adapter = createYSBZSUIAdapter(Object.assign({ mode: options.mode || 'solo' }, options, { strictVersion: false }));
  return {
    kind: 'local_prediction',
    playerId: options.playerId || 'p1',
    run(command) {
      const result = adapter.run(command);
      return Object.assign({}, result, { predicted: true, authoritative: false });
    },
    predict(command) { return this.run(command); },
    confirm(authoritativeResult) {
      const local = adapter.getViewModel();
      return {
        ok: true,
        confirmed: !!authoritativeResult && authoritativeResult.stateHash === local.stateHash,
        localStateVersion: local.stateVersion,
        localStateHash: local.stateHash,
        authoritativeStateVersion: authoritativeResult && authoritativeResult.stateVersion,
        authoritativeStateHash: authoritativeResult && authoritativeResult.stateHash
      };
    },
    getViewModel(playerId) { return adapter.getViewModel(playerId); },
    getStateSnapshot(playerId) { return adapter.getStateSnapshot(playerId); },
    getTextReport(mode) { return adapter.getTextReport(mode); },
    exportSave(playerId, meta) { return adapter.exportSave(playerId, meta); },
    importSave(saveDoc, playerId) { return adapter.importSave(saveDoc, playerId); }
  };
}

module.exports = { createLocalPredictionAdapter };
