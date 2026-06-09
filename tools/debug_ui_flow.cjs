#!/usr/bin/env node
const { spawn } = require('child_process');
const path = require('path');
const port = Number(process.env.DEBUG_UI_PORT || 4199);
const base = `http://127.0.0.1:${port}`;
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
async function api(p, body) {
  const res = await fetch(`${base}${p}`, {
    method: body ? 'POST' : 'GET',
    headers: body ? { 'content-type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json();
  if (!res.ok || data.ok === false) throw new Error(data.error || String(res.status));
  return data;
}
async function main() {
  const child = spawn(process.execPath, ['tools/run_ui_server.cjs'], {
    cwd: path.resolve(__dirname, '..'),
    env: Object.assign({}, process.env, { PORT: String(port) }),
    stdio: 'ignore',
  });
  try {
    for (let i = 0; i < 60; i++) {
      try { const r = await fetch(`${base}/api/health`); if (r.ok) break; } catch (_) {}
      await sleep(100);
    }
    let vm = (await api('/api/view')).viewModel;
    console.log('boot phase', vm.phase);
    vm = (await api('/api/action', { type: 'START_BATTLE' })).viewModel;
    console.log('START_BATTLE ->', vm.phase, 'round', vm.round);
    try {
      const h = vm.heroes[0];
      const r = await api('/api/action', { type: 'USE_SLOT', unitId: h.id, slotId: 0 });
      console.log('USE_SLOT ->', r.viewModel.phase, r.events.map(e => e.type).join(','));
    } catch (e) { console.log('USE_SLOT FAIL', e.message); }
    try {
      const r = await api('/api/action', { type: 'END_PLAYER_TURN' });
      console.log('END_PLAYER_TURN ->', r.viewModel.phase, r.events.map(e => e.type).join(','));
    } catch (e) { console.log('END_PLAYER_TURN FAIL', e.message); }
    try {
      const r = await api('/api/action', { type: 'END_PLAYER_TURN' });
      console.log('END_PLAYER_TURN#2 ->', r.viewModel.phase);
    } catch (e) { console.log('END_PLAYER_TURN#2 FAIL', e.message); }
    try {
      const r = await api('/api/action', { type: 'RUN_MONSTER_TURN' });
      console.log('RUN_MONSTER_TURN ->', r.viewModel.phase, r.events.map(e => e.type).join(','));
    } catch (e) { console.log('RUN_MONSTER_TURN FAIL', e.message); }
    try {
      const r = await api('/api/action', { type: 'START_NEXT_ROUND' });
      console.log('START_NEXT_ROUND ->', r.viewModel.phase, 'round', r.viewModel.round);
    } catch (e) { console.log('START_NEXT_ROUND FAIL', e.message); }
  } finally {
    child.kill('SIGTERM');
  }
}
main().catch(err => { console.error(err); process.exit(1); });
