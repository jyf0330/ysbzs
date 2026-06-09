const BATTLE_EVENT_RE = /BATTLE|ROUND|PLAYER|MONSTER|DAMAGE|ELEMENT|SPAWN|MOVE|DEAD|DAY7|TRIAL|PACKET|MODIFIER|REPLACEMENT|CONVERT|CATALYST|SHOP|REWARD|SELL|TOGGLE|USE_SLOT|ACTION/;

function clone(value) { return value == null ? value : JSON.parse(JSON.stringify(value)); }
function eventKey(event) { return event && (event.eventId || `legacy_${event.step}_${event.type}_${event.text || ''}`); }
function uniqueEvents(events = []) {
  const seen = new Set();
  const out = [];
  for (const event of events || []) {
    if (!event) continue;
    const key = eventKey(event);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(clone(event));
  }
  return out;
}
function canonicalEventLog(state, opts = {}) {
  const includeStateEvents = opts.includeStateEvents !== false;
  const raw = [...((state && state.battleTrace) || [])];
  if (includeStateEvents) raw.push(...((state && state.events) || []));
  let list = uniqueEvents(raw);
  if (opts.battleOnly !== false) list = list.filter(e => BATTLE_EVENT_RE.test(e.type || ''));
  return list.map((e, i) => Object.assign({ seq: e.seq || i + 1 }, e, { text: e.text || e.type }));
}
function eventsToText(events = []) {
  return events.map((e, i) => `${String(e.seq || i + 1).padStart(3, '0')} [${e.type}] ${e.text || e.type}`).join('\n');
}
module.exports = { BATTLE_EVENT_RE, eventKey, uniqueEvents, canonicalEventLog, eventsToText };
