#!/usr/bin/env node
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const root = path.resolve(__dirname, '..');
const port = Number(process.env.CHECK_PURE_SINGLEPLAYER_PORT || 4328);
const base = `http://127.0.0.1:${port}`;
const outDir = path.resolve(process.env.YSBZS_BROWSER_EVIDENCE_DIR || path.join(root, 'output/playwright/pure-singleplayer'));
const reportPath = path.join(outDir, 'pure_singleplayer_browser_evidence.json');

function sleep(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }
function assert(cond, msg) { if (!cond) throw new Error(msg); }
async function waitServer(child) {
  for (let i = 0; i < 80; i += 1) {
    if (child.exitCode !== null) throw new Error(`ui server exited early: ${child.exitCode}`);
    try {
      const res = await fetch(`${base}/api/health`);
      if (res.ok) return;
    } catch (_) {}
    await sleep(100);
  }
  throw new Error('ui server did not start');
}
async function screenshot(page, name, shots) {
  const file = path.join(outDir, `${String(shots.length + 1).padStart(2, '0')}_${name}.png`);
  await page.screenshot({ path: file, fullPage: false });
  shots.push(file);
}
async function vm(page) {
  return await page.evaluate(() => window.__YSBZS__?.lastViewModel || null);
}
async function main() {
  fs.rmSync(outDir, { recursive: true, force: true });
  fs.mkdirSync(outDir, { recursive: true });

  const server = spawn(process.execPath, ['tools/run_ui_server.cjs'], {
    cwd: root,
    env: Object.assign({}, process.env, { PORT: String(port) }),
    stdio: ['ignore', 'pipe', 'pipe']
  });
  let serverLog = '';
  server.stdout.on('data', d => { serverLog += d.toString(); });
  server.stderr.on('data', d => { serverLog += d.toString(); });

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const consoleErrors = [];
  const pageErrors = [];
  const apiRequests = [];
  const shots = [];
  page.on('console', msg => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });
  page.on('pageerror', err => pageErrors.push(err.stack || err.message || String(err)));
  page.on('request', req => {
    const url = new URL(req.url());
    if (/^\/api\/(view|action|report|save|load)(\/|$|\?)/.test(url.pathname + url.search)) {
      apiRequests.push({ method: req.method(), url: req.url() });
    }
  });

  try {
    await waitServer(server);
    await page.goto(base, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForFunction(() => window.__YSBZS__?.lastViewModel && document.querySelector('#board .cell'), null, { timeout: 30000 });
    assert(await page.evaluate(() => Boolean(window.__YSBZS_LOCAL_ENGINE__)), 'local engine was not initialized');
    assert(await page.evaluate(() => Boolean(window.__YSBZS_LOCAL_ENGINE_BUNDLE__)), 'local engine bundle metadata missing');
    assert((await vm(page)).phase === 'init', 'initial ViewModel phase should be init');
    await screenshot(page, 'loaded_local_runtime', shots);

    await page.click('#etb');
    await page.waitForFunction(() => window.__YSBZS__?.lastViewModel?.phase === 'player_turn', null, { timeout: 10000 });
    await screenshot(page, 'player_turn', shots);

    await page.click('#board .cell.hero-cell');
    await page.waitForFunction(() => Boolean(window.__YSBZS__?.lastViewModel?.selected?.unitId), null, { timeout: 10000 });
    await page.click('#board .cell[data-r="6"][data-c="3"]');
    await page.waitForFunction(() => window.__YSBZS__.lastViewModel.heroes.some(h => h.position && h.position.r === 6 && h.position.c === 3), null, { timeout: 10000 });
    await screenshot(page, 'hero_moved', shots);

    await page.click('#slot-list [data-slot="0"]');
    await page.waitForSelector('#action-popover:not(.hidden)', { timeout: 10000 });
    await page.click('#board .cell[data-r="6"][data-c="4"]');
    await page.click('#action-popover [data-use="0"]');
    await page.waitForFunction(() => window.__YSBZS__.lastViewModel.events.some(e => e.type === 'PLAYER_SELECT_SLOT' || e.type === 'USE_SLOT_BLOCKED'), null, { timeout: 10000 });
    await screenshot(page, 'slot_action', shots);

    await page.click('#save-game-btn');
    await page.waitForFunction(() => Boolean(localStorage.getItem('ysbzs.save.slot1')), null, { timeout: 10000 });
    const savedVersion = await page.evaluate(() => JSON.parse(localStorage.getItem('ysbzs.save.slot1')).state.stateVersion);
    await page.click('#load-game-btn');
    await page.waitForFunction(version => window.__YSBZS__.lastViewModel.stateVersion === version, savedVersion, { timeout: 10000 });
    await screenshot(page, 'load_restored', shots);

    await page.click('[data-log-tab="report"]');
    await page.waitForFunction(() => document.querySelector('#log')?.innerText.length > 20, null, { timeout: 10000 });
    await screenshot(page, 'report_tab', shots);

    assert(consoleErrors.length === 0, `console errors: ${consoleErrors.join('\n')}`);
    assert(pageErrors.length === 0, `page errors: ${pageErrors.join('\n')}`);
    assert(apiRequests.length === 0, `pure singleplayer page called HTTP API endpoints: ${JSON.stringify(apiRequests)}`);

    const finalVm = await vm(page);
    fs.writeFileSync(reportPath, JSON.stringify({
      ok: true,
      url: base,
      localEngine: await page.evaluate(() => window.__YSBZS_LOCAL_ENGINE_BUNDLE__),
      apiRequests,
      consoleErrors,
      pageErrors,
      screenshots: shots.map(file => path.relative(root, file)),
      finalState: {
        phase: finalVm.phase,
        stateVersion: finalVm.stateVersion,
        events: finalVm.events.length,
        selected: finalVm.selected
      }
    }, null, 2));
    console.log(`PASS pure singleplayer browser flow: ${reportPath}`);
  } catch (err) {
    fs.writeFileSync(path.join(outDir, 'server.log'), serverLog);
    throw err;
  } finally {
    await browser.close().catch(() => {});
    server.kill('SIGTERM');
    await sleep(100);
    if (server.exitCode === null) server.kill('SIGKILL');
  }
}

main().catch(err => { console.error(err.stack || err.message || err); process.exit(1); });
