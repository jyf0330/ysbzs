#!/usr/bin/env node
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const root = path.resolve(__dirname, '..');
const port = Number(process.env.CHECK_BATTLE_UI_RESPONSIVENESS_PORT || 4336);
const base = `http://127.0.0.1:${port}`;
const outDir = path.resolve(process.env.YSBZS_BROWSER_EVIDENCE_DIR || path.join(root, 'output/playwright/battle-ui-responsiveness'));
const reportPath = path.join(outDir, 'battle_ui_responsiveness.json');
const screenshotPath = path.join(outDir, 'battle_ui_responsiveness_final.png');
const maxStepMs = Number(process.env.YSBZS_RESPONSIVENESS_MAX_STEP_MS || 500);
const p95StepMs = Number(process.env.YSBZS_RESPONSIVENESS_P95_STEP_MS || 250);

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
async function measure(page, name, action, predicate, predicateArg = undefined) {
  const start = Date.now();
  await action();
  await page.waitForFunction(predicate, predicateArg, { timeout: 10000 });
  const ms = Date.now() - start;
  return { name, ms };
}
function percentile(values, p) {
  const sorted = values.slice().sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1));
  return sorted[idx] || 0;
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
  page.on('console', msg => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });
  page.on('pageerror', err => pageErrors.push(err.stack || err.message || String(err)));
  page.on('request', req => {
    const url = new URL(req.url());
    if (/^\/api\/(view|action|report|save|load)(\/|$|\?)/.test(url.pathname + url.search)) {
      apiRequests.push({ method: req.method(), url: req.url() });
    }
  });

  const steps = [];
  try {
    await waitServer(server);
    await page.goto(base, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForFunction(() => window.__YSBZS__?.lastViewModel && document.querySelector('#board .cell'), null, { timeout: 30000 });
    assert(await page.evaluate(() => Boolean(window.__YSBZS_LOCAL_ENGINE__)), 'local runtime was not initialized');

    steps.push(await measure(page, 'start battle', () => page.click('#etb'), () => window.__YSBZS__.lastViewModel.phase === 'player_turn'));
    steps.push(await measure(page, 'select hero cell', () => page.click('#board .cell.hero-cell'), () => Boolean(window.__YSBZS__.lastViewModel.selected.unitId)));
    steps.push(await measure(page, 'move hero', () => page.click('#board .cell[data-r="6"][data-c="3"]'), () => window.__YSBZS__.lastViewModel.heroes.some(h => h.position && h.position.r === 6 && h.position.c === 3)));
    steps.push(await measure(page, 'open action block', () => page.click('#slot-list [data-slot="0"]'), () => Boolean(document.querySelector('#action-popover:not(.hidden)'))));
    steps.push(await measure(page, 'select target cell', () => page.click('#board .cell[data-r="6"][data-c="4"]'), () => window.__YSBZS__.lastViewModel.selected.cell?.r === 6 && window.__YSBZS__.lastViewModel.selected.cell?.c === 4));
    steps.push(await measure(page, 'use action block', () => page.click('#action-popover [data-use="0"]'), () => window.__YSBZS__.lastViewModel.events.some(e => e.type === 'PLAYER_SELECT_SLOT' || e.type === 'USE_SLOT_BLOCKED')));
    steps.push(await measure(page, 'save game', () => page.click('#save-game-btn'), () => Boolean(localStorage.getItem('ysbzs.save.slot1'))));
    const savedVersion = await page.evaluate(() => JSON.parse(localStorage.getItem('ysbzs.save.slot1')).state.stateVersion);
    steps.push(await measure(page, 'load game', () => page.click('#load-game-btn'), version => window.__YSBZS__.lastViewModel.stateVersion === version, savedVersion));
    steps.push(await measure(page, 'open report tab', () => page.click('[data-log-tab="report"]'), () => (document.querySelector('#log')?.innerText || '').length > 20));

    const durations = steps.map(s => s.ms);
    const max = Math.max(...durations);
    const p95 = percentile(durations, 95);
    const finalState = await page.evaluate(() => ({
      phase: window.__YSBZS__.lastViewModel.phase,
      stateVersion: window.__YSBZS__.lastViewModel.stateVersion,
      events: window.__YSBZS__.lastViewModel.events.length,
      selected: window.__YSBZS__.lastViewModel.selected
    }));
    await page.screenshot({ path: screenshotPath, fullPage: false });
    const report = {
      ok: true,
      url: base,
      thresholds: { maxStepMs, p95StepMs },
      summary: { max, p95, count: steps.length },
      steps,
      apiRequests,
      consoleErrors,
      pageErrors,
      finalState,
      screenshot: path.relative(root, screenshotPath)
    };
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

    assert(consoleErrors.length === 0, `console errors: ${consoleErrors.join('\n')}`);
    assert(pageErrors.length === 0, `page errors: ${pageErrors.join('\n')}`);
    assert(apiRequests.length === 0, `pure singleplayer responsiveness flow called HTTP API endpoints: ${JSON.stringify(apiRequests)}`);
    assert(max <= maxStepMs, `max step ${max}ms exceeds ${maxStepMs}ms: ${JSON.stringify(steps)}`);
    assert(p95 <= p95StepMs, `p95 step ${p95}ms exceeds ${p95StepMs}ms: ${JSON.stringify(steps)}`);
    console.log(`PASS battle UI responsiveness: max=${max}ms p95=${p95}ms report=${reportPath}`);
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
