/** scenarioRunner.cjs — XMage-style fixed-state scenario runner for regression tests. */
const assert = require('assert');
const { createGameState, makeUnit, syncBoardUnits } = require('./state.cjs');
const { dispatch } = require('./reducer.cjs');

function setupScenario(def = {}) {
  const state = createGameState(def.state || {});
  if (Array.isArray(def.units)) {
    state.units = [];
    for (const u of def.units) state.units.push(makeUnit(state, u.side || 'hero', u.petId, u));
    syncBoardUnits(state);
  }
  if (def.phase) state.phase = def.phase;
  if (def.round != null) state.round = def.round;
  return state;
}
function runScenario(def = {}) {
  const state = setupScenario(def);
  for (const action of def.actions || []) dispatch(state, action);
  const results = evaluateAssertions(state, def.assertions || []);
  return { state, results, ok: results.every(r => r.ok) };
}
function getPath(obj, path) {
  return String(path || '').split('.').filter(Boolean).reduce((cur, k) => cur == null ? undefined : cur[k], obj);
}
function evaluateAssertions(state, assertions = []) {
  return assertions.map((a, i) => {
    let actual;
    if (a.kind === 'event') actual = (state.events || []).some(e => e.type === a.type);
    else if (a.kind === 'change') actual = (state.changes || []).some(c => c.type === a.type);
    else if (a.kind === 'unitAlive') actual = !!(state.units || []).find(u => u.id === a.id && u.alive);
    else actual = getPath(state, a.path);
    let ok = true;
    if ('equals' in a) ok = actual === a.equals;
    else if ('gte' in a) ok = Number(actual) >= Number(a.gte);
    else if ('lte' in a) ok = Number(actual) <= Number(a.lte);
    else if ('truthy' in a) ok = !!actual === !!a.truthy;
    return { index:i, ok, actual, assertion:a };
  });
}
function assertScenario(def = {}) {
  const out = runScenario(def);
  for (const r of out.results) assert.ok(r.ok, `scenario assertion failed ${JSON.stringify(r.assertion)} actual=${JSON.stringify(r.actual)}`);
  return out.state;
}
module.exports = { setupScenario, runScenario, evaluateAssertions, assertScenario };
