const { createYSBZSUIAdapter } = require('../uiAdapter.cjs');

function createServerAuthorityAdapter(options = {}) {
  const adapter = createYSBZSUIAdapter(Object.assign({ mode: options.mode || 'solo' }, options, { strictVersion: true }));
  return {
    kind: 'server_authority',
    run(command) {
      const result = adapter.run(command);
      return Object.assign({}, result, { predicted: false, authoritative: true });
    },
    validate(command) { return this.run(command); },
    getViewModel(playerId) { return adapter.getViewModel(playerId); },
    getStateSnapshot(playerId) { return adapter.getStateSnapshot(playerId); },
    getTextReport(mode) { return adapter.getTextReport(mode); },
    getDataSummary() { return adapter.getDataSummary(); },
    getShopPools() { return adapter.getShopPools(); },
    getRewardPools() { return adapter.getRewardPools(); },
    getAvailableShopEvents() { return adapter.getAvailableShopEvents(); },
    getEnabledShopItems(poolId) { return adapter.getEnabledShopItems(poolId); },
    getEvents(filter) { return adapter.getEvents(filter); },
    getReplay() { return adapter.getReplay(); },
    exportReplay() { return adapter.exportReplay(); },
    exportSave(playerId, meta) { return adapter.exportSave(playerId, meta); },
    importSave(saveDoc, playerId) { return adapter.importSave(saveDoc, playerId); }
  };
}

module.exports = { createServerAuthorityAdapter };
