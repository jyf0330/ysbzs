const EVENT_LEVEL = Object.freeze({
  INFO: 'info',
  WARNING: 'warning',
  ERROR: 'error',
  SUCCESS: 'success'
});

const EVENT_TYPES = Object.freeze({
  BATTLE_START: 'BATTLE_START',
  BATTLE_END: 'BATTLE_END',
  ROUND_START: 'ROUND_START',
  ROUND_CHANGE: 'ROUND_CHANGE',
  PHASE_CHANGE: 'PHASE_CHANGE',
  PLAYER_TURN_END: 'PLAYER_TURN_END',
  MONSTER_ACTION: 'MONSTER_ACTION',
  MOVE_HERO: 'MOVE_HERO',
  MOVE_HERO_BLOCKED: 'MOVE_HERO_BLOCKED',
  MOVE_UNIT: 'MOVE_UNIT',
  USE_SLOT: 'USE_SLOT',
  USE_SLOT_BLOCKED: 'USE_SLOT_BLOCKED',
  SET_ACTION_DIRECTION: 'SET_ACTION_DIRECTION',
  SELECT_UNIT: 'SELECT_UNIT',
  SELECT_CELL: 'SELECT_CELL',
  SELECT_SLOT: 'SELECT_SLOT',
  DAMAGE: 'DAMAGE',
  UNIT_DEAD: 'UNIT_DEAD',
  ELEMENT_ADD: 'ELEMENT_ADD',
  ELEMENT_CONSUME: 'ELEMENT_CONSUME',
  ELEMENT_CLEAR: 'ELEMENT_CLEAR',
  ELEMENT_SETTLE: 'ELEMENT_SETTLE',
  SHOP_ENTER: 'SHOP_ENTER',
  SHOP_EXIT: 'SHOP_EXIT',
  SHOP_ROLL: 'SHOP_ROLL',
  BUY_OFFER: 'BUY_OFFER',
  REWARD_PICK: 'REWARD_PICK',
  ACTION_REJECTED: 'ACTION_REJECTED'
});

function levelFromType(type) {
  const t = String(type || '');
  if (/BLOCKED|REJECTED|FAIL|ERROR/.test(t)) return EVENT_LEVEL.WARNING;
  if (/BATTLE_END|BUY|REWARD|WIN|PASS|SUCCESS/.test(t)) return EVENT_LEVEL.SUCCESS;
  return EVENT_LEVEL.INFO;
}

function ensureEvents(state) {
  if (!Array.isArray(state.events)) state.events = [];
  if (!Number.isFinite(Number(state.nextStep))) state.nextStep = 1;
  return state.events;
}

function pushEvent(state, type, payload = {}, level) {
  const list = ensureEvents(state);
  const step = Number(state.nextStep || 1);
  state.nextStep = step + 1;
  const evt = {
    step,
    seq: payload.seq || step,
    phase: state.phase,
    round: state.round || 0,
    type,
    level: level || payload.level || levelFromType(type),
    ...payload
  };
  if (!evt.eventId && state.battleId) evt.eventId = `${state.battleId}:event:${step}:${type}`;
  list.push(evt);
  return evt;
}

function filterEvents(stateOrEvents, opts = {}) {
  let list = Array.isArray(stateOrEvents) ? stateOrEvents : (stateOrEvents && stateOrEvents.events) || [];
  const { type, phase, round, level, sinceStep, untilStep, limit, offset, text } = opts;
  if (type) {
    const types = Array.isArray(type) ? type : [type];
    list = list.filter(e => types.includes(e.type));
  }
  if (phase) list = list.filter(e => e.phase === phase);
  if (typeof round !== 'undefined') list = list.filter(e => Number(e.round || 0) === Number(round));
  if (level) list = list.filter(e => e.level === level);
  if (typeof sinceStep !== 'undefined') list = list.filter(e => Number(e.step || 0) >= Number(sinceStep));
  if (typeof untilStep !== 'undefined') list = list.filter(e => Number(e.step || 0) <= Number(untilStep));
  if (text) list = list.filter(e => String(e.text || '').includes(String(text)));
  if (offset) list = list.slice(Number(offset));
  if (limit) list = list.slice(-Number(limit));
  return list;
}

function lastEvents(state, limit = 30, opts = {}) {
  return filterEvents(state, Object.assign({}, opts, { limit }));
}

function change(state, path, from, to, reason) {
  if (!Array.isArray(state.changes)) state.changes = [];
  const c = { path, from, to, reason };
  state.changes.push(c);
  return c;
}

module.exports = { pushEvent, change, filterEvents, lastEvents, EVENT_TYPES, EVENT_LEVEL, levelFromType };
