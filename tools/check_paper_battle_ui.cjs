#!/usr/bin/env node
const { spawn } = require('child_process');
const path = require('path');
const port = Number(process.env.CHECK_PAPER_PORT || 4198);
const base = `http://127.0.0.1:${port}`;
const root = path.resolve(__dirname, '..');
const sleep = ms => new Promise(r => setTimeout(r, ms));
function assert(cond, msg) { if (!cond) throw new Error(msg); }
async function waitServer(child) {
  for (let i = 0; i < 80; i++) {
    if (child.exitCode !== null) throw new Error(`ui server exited early: ${child.exitCode}`);
    try { const res = await fetch(`${base}/api/health`); if (res.ok) return; } catch (_) {}
    await sleep(100);
  }
  throw new Error('server did not start');
}
async function api(pathname, body, sid = 'paper_check') {
  const res = await fetch(`${base}${pathname}`, {
    method: body ? 'POST' : 'GET',
    headers: body ? { 'content-type': 'application/json', 'x-session-id': sid, 'x-player-id': 'p1' } : { 'x-session-id': sid, 'x-player-id': 'p1' },
    body: body ? JSON.stringify(body) : undefined
  });
  const data = await res.json();
  if (!res.ok || data.ok === false) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}
async function main() {
  const child = spawn(process.execPath, ['tools/run_ui_server.cjs'], { cwd: root, env: { ...process.env, PORT: String(port) }, stdio: ['ignore','pipe','pipe'] });
  child.stdout.resume(); child.stderr.resume();
  try {
    await waitServer(child);
    const html = await fetch(`${base}/paper-battle.html`).then(r => r.text());
    const js = await fetch(`${base}/paper-battle.js`).then(r => r.text());
    const css = await fetch(`${base}/paper-battle.css`).then(r => r.text());
    assert(html.includes('paper-battle.js') && html.includes('paper-battle.css'), 'paper-battle page must reference assets');
    assert(html.includes('id="board"') && html.includes('id="slot-grid"') && html.includes('id="start-action"'), 'stable DOM anchors missing');
    assert(js.includes('/api/view') && js.includes('/api/action') && js.includes('SELECT_UNIT') && js.includes('USE_SLOT') && js.includes('RUN_PLAYER_ALL_OUT'), 'paper UI must use real API action flow');
    assert(!js.includes('YSBZS_STATIC') && !html.includes('static-vm.js'), 'paper UI must not depend on static ViewModel');
    assert(css.includes('.board') && css.includes('.slot-card') && css.includes('.event-log'), 'paper CSS must include board / shapes / event log styles');
    let view = await api('/api/session/new', { sessionId: 'paper_check', playerId: 'p1', day: 1, period: '上午', gold: 12 });
    assert(view.viewModel.phase === 'init', 'session starts at init');
    view = await api('/api/action', { type: 'SETUP_DAY7_FIRE_TRIAL', playerId: 'p1' });
    assert(view.viewModel.day7Trial && view.viewModel.phase === 'player_turn', 'day7 trial should be live');
    const hero = view.viewModel.heroes[0];
    view = await api('/api/action', { type: 'SELECT_UNIT', unitId: hero.id, playerId: 'p1' });
    assert(view.viewModel.selected.unitId === hero.id, 'select unit must update server-side view state');
    view = await api('/api/action', { type: 'SELECT_SLOT', unitId: hero.id, slotId: 0, playerId: 'p1' });
    assert(Number(view.viewModel.selected.slotId) === 0, 'select slot must update server-side view state');
    view = await api('/api/action', { type: 'SET_ACTION_DIRECTION', unitId: hero.id, slotId: 0, dir: 'right', playerId: 'p1' });
    assert(view.viewModel.events.some(e => e.type === 'SET_ACTION_DIRECTION'), 'set direction should return real event');
    view = await api('/api/action', { type: 'USE_SLOT', unitId: hero.id, slotId: 0, playerId: 'p1' });
    assert(view.viewModel.events.some(e => e.type === 'PLAYER_SELECT_SLOT' || e.type === 'USE_SLOT_BLOCKED'), 'use slot should reach reducer');
    view = await api('/api/action', { type: 'RUN_PLAYER_ALL_OUT', playerId: 'p1' });
    assert(view.viewModel.events.length > 0, 'start action should return updated battle events');
    console.log('PASS paper-battle.html -> live /api/view + /api/action flow');
  } finally {
    child.kill('SIGTERM'); await sleep(100); if (child.exitCode === null) child.kill('SIGKILL');
  }
}
main().catch(err => { console.error(err.stack || err.message || err); process.exit(1); });
