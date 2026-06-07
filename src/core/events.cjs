function pushEvent(state, type, payload = {}) { const evt = { step: state.nextStep++, phase: state.phase, round: state.round || 0, type, ...payload }; state.events.push(evt); return evt; }
function change(state, path, from, to, reason) { const c = { path, from, to, reason }; state.changes.push(c); return c; }
module.exports = { pushEvent, change };
