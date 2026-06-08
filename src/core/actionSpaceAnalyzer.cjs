/** actionSpaceAnalyzer.cjs — TAG-inspired action-space / branching-factor report. */
const battle = require('./battle.cjs');
const { getCell, normalizePosition, BOARD_ROWS, BOARD_COLS } = require('./state.cjs');

function clone(v) { return JSON.parse(JSON.stringify(v)); }
function adjacentPositions(p) { return [{r:p.r-1,c:p.c},{r:p.r+1,c:p.c},{r:p.r,c:p.c-1},{r:p.r,c:p.c+1}].filter(x => x.r>=0&&x.c>=0&&x.r<BOARD_ROWS&&x.c<BOARD_COLS); }
function canStandAt(state, actor, p) {
  const cell = getCell(state, p.r, p.c);
  return !!cell && (!cell.unitId || cell.unitId === actor.id);
}
function listMoveActions(state, actor) {
  const p = normalizePosition(actor.position || { r:0, c:0 });
  return adjacentPositions(p).filter(x => canStandAt(state, actor, x)).map(to => ({ type:'MOVE_UNIT', unitId: actor.id, to }));
}
function listSlotActions(state, actor) {
  const slots = battle.slotsForUnit(state, actor) || [];
  const dirs = ['right','left','up','down'];
  const out = [];
  for (let slotIndex=0; slotIndex<slots.length; slotIndex++) for (const direction of dirs) out.push({ type:'USE_SLOT', unitId: actor.id, slotIndex, direction });
  return out;
}
function listLegalActions(state, opts = {}) {
  const side = opts.side || 'hero';
  const actors = (state.units || []).filter(u => u.side === side && u.alive && u.hp > 0);
  const actions = [];
  for (const actor of actors) {
    if (!actor.hasAttacked) actions.push(...listMoveActions(state, actor));
    actions.push(...listSlotActions(state, actor));
  }
  if (['player_turn','player'].includes(state.phase)) actions.push({ type:'END_PLAYER_TURN' });
  return actions;
}
function actionSpaceReport(state, opts = {}) {
  const actions = listLegalActions(state, opts);
  const byType = {};
  for (const a of actions) byType[a.type] = (byType[a.type] || 0) + 1;
  return { side: opts.side || 'hero', actionCount: actions.length, branchingFactor: actions.length, byType, sample: actions.slice(0, Number(opts.sample || 10)) };
}
function compareActionSpaces(states = [], opts = {}) {
  return states.map((s, i) => Object.assign({ index:i }, actionSpaceReport(s, opts)));
}
module.exports = { listLegalActions, actionSpaceReport, compareActionSpaces };
