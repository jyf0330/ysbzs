/**
 * moduleManifest.cjs — Vassal-style module / piece manifest and async command envelope.
 * Useful for export, async play-by-email style logs, and external tooling.
 */
const { collectEffectObjects } = require('./objectRegistry.cjs');
function buildModuleManifest(state, meta = {}) {
  return {
    moduleId: meta.moduleId || 'ysbzs_v1',
    title: meta.title || '元素背包史 V1',
    board: { rows: state.board?.rows || 8, cols: state.board?.cols || 8 },
    pieces: (state.units || []).map(u => ({ id:u.id, petId:u.petId, name:u.name, side:u.side, camp:u.camp, position:u.position, hp:u.hp, shield:u.shield, alive:u.alive !== false })),
    leaders: state.leaders || {},
    effectObjects: collectEffectObjects(state),
    dataVersion: meta.dataVersion || 'v1_2026_06_08',
    rulesVersion: meta.rulesVersion || 'boardgameio_showdown_forge_all7'
  };
}
function createAsyncCommand(state, action, meta = {}) {
  return {
    commandId: meta.commandId || `cmd_${String((state.inputLog || []).length + 1).padStart(6,'0')}`,
    playerId: meta.playerId || '0',
    turn: state.round || 0,
    phase: state.phase || 'unknown',
    action,
    createdAt: meta.createdAt || new Date(0).toISOString(),
    deterministic: true
  };
}
function applyAsyncCommand(state, command, dispatcher) {
  if (!dispatcher) throw new Error('applyAsyncCommand requires dispatcher');
  return dispatcher(state, command.action);
}
module.exports = { buildModuleManifest, createAsyncCommand, applyAsyncCommand };
