#!/usr/bin/env node
const { spawn } = require('child_process');
const fs = require('fs');
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
async function api(pathname, body) {
  const res = await fetch(`${base}${pathname}`, {
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
  const root = path.resolve(__dirname, '..');
  const child = spawn(process.execPath, ['tools/run_ui_server.cjs'], {
    cwd: root,
    env: Object.assign({}, process.env, { PORT: String(port) }),
    stdio: ['ignore', 'pipe', 'pipe']
  });
  child.stdout.resume(); child.stderr.resume();
  try {
    await waitServer(child);
    const html = await fetch(`${base}/`).then(r => r.text());
    const mainScript = html.includes('src="js/main.js"') ? 'js/main.js' : 'ux-app.js';
    const js = await fetch(`${base}/${mainScript}`).then(r => r.text());
    const css = await fetch(`${base}/ux-app.css`).then(r => r.text());
    assert(html.includes('棋盘战斗交互重构版'), 'new UI shell title missing');
    assert(html.includes(mainScript) && html.includes('ux-app.css'), 'new UI assets not referenced');
    assert(html.includes('id="board"') && html.includes('id="slot-list"') && html.includes('id="hero-list"'), 'new UI stable DOM anchors missing');
    assert(html.includes('id="operation-rail"'), 'board operation context rail missing');
    assert(html.includes('id="cell-detail"') && html.includes('id="slot-action-panel"'), 'right-side detail/action panels missing');
    assert(!html.includes('id="cell-popup"') && !html.includes('id="tooltip"'), 'hover detail surfaces must be removed');
    assert(!html.includes('original-ui-compat-adapter.js') && !html.includes("loadScript('game.js')") && !html.includes('ui.js'), 'old UI bootstrap must be removed');
    assert(js.includes('/api/action') && js.includes('/api/view') && js.includes('/api/report'), 'new UI must use public API endpoints');
    assert(!/require\(|\.\/src|core\/|uiAdapter\.cjs/.test(js), 'web UI must not import core or adapter directly');
    assert(css.includes('.board-grid') && css.includes('.hero-card') && css.includes('.action-block'), 'new CSS must define rebuilt shell components');
    assert(js.includes('unit-token-name') && js.includes('unit-token-hp') && js.includes('boardUnitShortName'), 'board unit token must use short label plus hp bar/minor hp');
    assert(!js.includes('boardUnitVitals(unit)'), 'board unit token must not render full board-cell hp/atk stats');
    assert(!js.includes('hero-ap'), 'board unit token must not reserve board-cell footer for hero-only AP');
    assert(js.includes('renderOperationRail') && js.includes('op-chip') && !js.includes("opChip('目标'"), 'UI must expose board operation context without target details in the rail');
    assert(js.includes('slotShortName') && js.includes('compact-hero-main') && js.includes('slot-action-panel'), 'left unit cards must stay compact and move slot controls to the right panel');
    assert(css.includes('.unit-token-name') && css.includes('.unit-token-hp') && css.includes('.cell.hero-cell') && css.includes('.unit-token.is-active'), 'board unit token must style compact identity, hp bar, and selected states');
    assert(css.includes('.operation-rail') && css.includes('.op-chip.ready') && css.includes('.op-chip.armed'), 'operation rail must have readable mode states');
    assert(css.includes('.compact-hero-main') && css.includes('.action-block') && css.includes('.detail-card'), 'left action blocks and right detail panel must have readable information styles');
    assert(!css.includes('.cell-popup') && !css.includes('.tooltip') && !js.includes('data-tip'), 'hover detail styling and attributes must stay removed');
    for (const old of ['original-ui-compat-adapter.js','ui.js','game.js','battle.js','board.js','shop.js','actions.js','battleTrace.js']) {
      assert(!fs.existsSync(path.join(root, 'web', old)), `old UI file still exists: web/${old}`);
    }

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
    assert(data.summary.pets > 0 && data.summary.waves > 0 && data.summary.shop === data.summary.pets, 'summary should expose current single-source data counts');

    console.log('PASS rebuilt UI shell -> /api -> uiAdapter -> core -> ViewModel/TextReport');
  } finally {
    child.kill('SIGTERM');
    await sleep(100);
    if (child.exitCode === null) child.kill('SIGKILL');
  }
}
main().catch(err => { console.error(err.stack || err.message || err); process.exit(1); });
