#!/usr/bin/env node
const { spawn } = require('child_process');
const path = require('path');
const port = Number(process.env.CHECK_UI_PORT || 4184);
const base = `http://127.0.0.1:${port}`;
function sleep(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }
async function waitServer(child) {
  for (let i = 0; i < 60; i++) {
    if (child.exitCode !== null) throw new Error(`ui server exited early: ${child.exitCode}`);
    try { const res = await fetch(`${base}/api/health`); if (res.ok) return; } catch (_) {}
    await sleep(100);
  }
  throw new Error('ui server did not start');
}
async function api(path, body) {
  const res = await fetch(`${base}${path}`, {
    method: body ? 'POST' : 'GET',
    headers: body ? { 'content-type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined
  });
  const data = await res.json();
  if (!res.ok || data.ok === false) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}
function assert(cond, msg) { if (!cond) throw new Error(msg); }
async function main() {
  const child = spawn(process.execPath, ['tools/run_ui_server.cjs'], {
    cwd: path.resolve(__dirname, '..'),
    env: Object.assign({}, process.env, { PORT: String(port) }),
    stdio: ['ignore', 'pipe', 'pipe']
  });
  child.stdout.resume(); child.stderr.resume();
  try {
    await waitServer(child);
    const html = await fetch(`${base}/`).then(r => r.text());
    const bridge = await fetch(`${base}/original-ui-compat-adapter.js`).then(r => r.text());
    assert(html.includes('元素背包史'), 'index.html not served');
    assert(html.includes('id="board"') && html.includes('id="asl"') && html.includes('id="scat"'), 'original project UI shell ids missing');
    assert(html.includes('original-ui-compat-adapter.js'), 'compat adapter must be injected at runtime');
    assert(html.includes("loadScript('game.js')") || html.includes('loadScript("game.js")'), 'original game.js bootstrap should remain in original HTML');
    assert(bridge.includes('/api/action'), 'compat adapter must call API action endpoint');
    assert(bridge.includes('/api/view') && bridge.includes('/api/report'), 'compat adapter must read ViewModel and report endpoints');
    assert(!/require\(|\.\/src|core\/|uiAdapter\.cjs/.test(bridge), 'web UI must not import core or adapter directly');

    let view = await api('/api/session/new', { day: 1, period: '上午', gold: 12 });
    assert(view.viewModel.phase === 'init', 'new session should start at init');
    assert(view.viewModel.heroes.length > 0, 'viewModel must expose heroes');

    view = await api('/api/action', { type: 'RUN_BATTLE' });
    assert(view.viewModel.phase === 'battle_end', 'RUN_BATTLE should end battle phase');
    assert(view.events.some(e => e.type === 'BATTLE_END'), 'battle action must return BATTLE_END event');

    view = await api('/api/action', { type: 'REWARD_OPTIONS', poolId: 'reward_pT1', count: 3 });
    assert(view.viewModel.rewards.length >= 1, 'reward options should be visible to UI');
    await api('/api/action', { type: 'PICK_REWARD', index: 0 });

    view = await api('/api/action', { type: 'ENTER_SHOP', poolId: 'night_base', slots: 6 });
    assert(view.viewModel.phase === 'shop', 'enter shop should set shop phase');
    assert(view.viewModel.shop.offers.length > 0, 'shop offers should be visible to UI');
    const first = view.viewModel.shop.offers[0];
    view = await api('/api/action', { type: 'FREEZE_OFFER', offerId: first.offerId });
    assert(view.viewModel.shop.offers.find(o => o.offerId === first.offerId).frozen === true, 'freeze should update UI offer state');
    view = await api('/api/action', { type: 'ROLL_SHOP', slots: 6 });
    assert(view.viewModel.shop.offers.some(o => o.offerId === first.offerId && o.frozen), 'frozen offer should survive roll');
    const buyable = view.viewModel.shop.offers.find(o => o.price <= view.viewModel.gold);
    if (buyable) {
      const goldBefore = view.viewModel.gold;
      view = await api('/api/action', { type: 'BUY_OFFER', offerId: buyable.offerId });
      assert(view.viewModel.gold <= goldBefore, 'buy should not increase gold');
      assert(view.events.some(e => e.type === 'SHOP_BUY'), 'buy action must return SHOP_BUY event');
    }
    const shopReport = await api('/api/report?mode=shop');
    assert(shopReport.report.includes('商店'), 'shop report should mention 商店');
    const playerReport = await api('/api/report?mode=player');
    assert(playerReport.report.includes('玩家操作行为'), 'player report should include player behavior section');
    const data = await api('/api/data/summary');
    assert(data.summary.pets === 127 && data.summary.shop === 127, 'summary should expose full data counts');

    console.log('PASS original project UI shell unchanged + runtime compat adapter -> API -> uiAdapter -> core -> ViewModel/TextReport');
  } finally {
    child.kill('SIGTERM');
    await sleep(100);
    if (child.exitCode === null) child.kill('SIGKILL');
  }
}
main().catch(err => { console.error(err.stack || err.message || err); process.exit(1); });
