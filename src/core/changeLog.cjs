/**
 * changeLog.cjs — 结构化变化记录 / 回放基础
 *
 * 事实用结构化 change 保存；中文战报只是展示层。
 */
const { recordBattleEvent } = require('./battleEventProtocol.cjs');
const { buildReplayDocument } = require('./replayCodec.cjs');
function clone(v) { return JSON.parse(JSON.stringify(v)); }
function ensureLogs(state) {
  if (!state.changes) state.changes = [];
  if (!state.changeLog) state.changeLog = state.changes;
  if (!state.inputLog) state.inputLog = [];
  return state.changeLog;
}
function recordChange(state, change) {
  ensureLogs(state);
  const evt = {
    changeId: change.changeId || `chg_${String(state.nextChange || state.changes.length + 1).padStart(5, '0')}`,
    step: state.nextStep || 0,
    round: state.round || 0,
    phase: state.phase || 'unknown',
    type: change.type || 'CHANGE',
    path: change.path || null,
    from: change.from,
    to: change.to,
    delta: change.delta,
    source: change.source || null,
    reason: change.reason || null,
    tags: change.tags || []
  };
  state.nextChange = (state.nextChange || state.changes.length + 1) + 1;
  state.changes.push(evt);
  if (state.changeLog !== state.changes) state.changeLog.push(evt);
  // Pokémon Showdown 思想：结构化 change 同步生成 battleTrace 协议事件，中文 text 只是展示。
  if (change.recordBattleTrace !== false) recordBattleEvent(state, { type: evt.type, change: evt, text: change.text });
  return evt;
}
function recordInput(state, input) {
  ensureLogs(state);
  const evt = {
    inputId: input.inputId || `inp_${String(state.inputLog.length + 1).padStart(5, '0')}`,
    round: state.round || 0,
    phase: state.phase || 'unknown',
    type: input.type || 'INPUT',
    payload: clone(input.payload || input)
  };
  state.inputLog.push(evt);
  return evt;
}
function buildReplay(state, options = {}) {
  ensureLogs(state);
  return buildReplayDocument(state, options);
}
module.exports = { ensureLogs, recordChange, recordInput, buildReplay };
