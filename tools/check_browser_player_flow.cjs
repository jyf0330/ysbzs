#!/usr/bin/env node
const { spawn } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const root = path.resolve(__dirname, '..');
const port = Number(process.env.CHECK_BROWSER_PORT || 4196);
const base = `http://127.0.0.1:${port}`;

function sleep(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }
function assert(cond, msg) { if (!cond) throw new Error(msg); }
function loadPlaywright() {
  const candidates = [
    process.env.NODE_PATH,
    path.join(os.homedir(), '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules')
  ].filter(Boolean);
  try { return require('playwright'); } catch (_) {}
  for (const dir of candidates) {
    if (!fs.existsSync(dir)) continue;
    try {
      const resolved = require.resolve('playwright', { paths: [dir] });
      return require(resolved);
    } catch (_) {}
  }
  throw new Error('playwright is not available; install it locally or run inside Codex bundled runtime');
}
async function waitServer(child) {
  for (let i = 0; i < 80; i++) {
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
async function clickAndWait(page, selector) {
  const before = (await api('/api/view')).viewModel.events?.at(-1)?.step || 0;
  await page.click(selector);
  await page.waitForFunction(async ({ baseUrl, beforeStep }) => {
    const res = await fetch(`${baseUrl}/api/view`, { cache: 'no-store' });
    const data = await res.json();
    const evs = data.viewModel.events || [];
    return evs.some(e => Number(e.step || 0) > beforeStep);
  }, { baseUrl: base, beforeStep: before }, { timeout: 5000 }).catch(() => null);
}
async function waitForView(predicate, message, timeoutMs = 5000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const view = (await api('/api/view')).viewModel;
    if (predicate(view)) return view;
    await sleep(100);
  }
  throw new Error(message);
}
async function main() {
  const { chromium } = loadPlaywright();
  const child = spawn(process.execPath, ['tools/run_ui_server.cjs'], {
    cwd: root,
    env: Object.assign({}, process.env, { PORT: String(port) }),
    stdio: ['ignore', 'pipe', 'pipe']
  });
  child.stdout.resume();
  child.stderr.resume();
  let browser;
  try {
    await waitServer(child);
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
    await page.goto(base, { waitUntil: 'networkidle' });
    await page.waitForSelector('#board .cell');
    await page.waitForFunction(() => window.__YSBZS__ && window.__YSBZS__.lastViewModel && window.__YSBZS__.lastViewModel.leaders, null, { timeout: 8000 });

    let view = (await api('/api/view')).viewModel;
    assert(view.leaders.player.hp === 80 && view.leaders.enemy.hp === 80, 'leaders should start with real HP');
    assert((await page.textContent('#p-castle-txt')).trim() === '80/80', 'player leader HP must render in top bar');
    assert((await page.textContent('#e-castle-txt')).trim() === '80/80', 'enemy Boss HP must render in top bar');

    await clickAndWait(page, '#etb');
    view = (await api('/api/view')).viewModel;
    assert(view.phase === 'player_turn', 'clicking start button should enter player_turn');
    assert(view.events.some(e => e.type === 'BATTLE_START'), 'start click should write BATTLE_START');

    await clickAndWait(page, '.hero-card');
    view = (await api('/api/view')).viewModel;
    const heroId = view.selected.unitId;
    assert(heroId, 'hero card click should select a unit');

    await page.click('#board .cell[data-r="6"][data-c="3"]');
    view = await waitForView(v => {
      const hero = v.heroes.find(h => h.id === heroId);
      return hero && hero.position && hero.position.r === 6 && hero.position.c === 3;
    }, 'cell click with selected hero did not move through adapter');
    assert(view.heroes.find(h => h.id === heroId)?.position?.r === 6 && view.heroes.find(h => h.id === heroId)?.position?.c === 3, 'cell click with selected hero should move through adapter');

    await clickAndWait(page, '[data-slot="0"]');
    await clickAndWait(page, '[data-slot-dir="0"][data-dir="right"]');
    await page.click('#board .cell[data-r="6"][data-c="4"]');
    await page.waitForFunction(async ({ baseUrl }) => {
      const data = await fetch(`${baseUrl}/api/view`, { cache: 'no-store' }).then(r => r.json());
      return data.viewModel.selected?.cell?.r === 6 && data.viewModel.selected?.cell?.c === 4;
    }, { baseUrl: base }, { timeout: 5000 });
    await clickAndWait(page, '[data-use="0"]');
    view = (await api('/api/view')).viewModel;
    assert(view.events.some(e => e.type === 'SET_ACTION_DIRECTION'), 'direction button should update core state');
    assert(view.events.some(e => e.type === 'PLAYER_SELECT_SLOT'), 'use button should dispatch USE_SLOT');
    assert(await page.locator('#log').textContent(), 'event log should render after slot use');

    await clickAndWait(page, '#etb');
    view = (await api('/api/view')).viewModel;
    assert(view.events.some(e => e.type === 'PLAYER_TURN_END'), 'end turn button should update event log');
    assert(view.phase !== 'player_turn' || view.result, 'end turn should leave active player operation state or finish battle');

    await clickAndWait(page, '#exa');
    view = (await api('/api/view')).viewModel;
    assert(view.events.some(e => e.type === 'MONSTER_INTENT' || e.type === 'END_PLAYER_TURN_BLOCKED' || e.type === 'BATTLE_END'), 'auto battle button should round-trip through core events');
    assert((await page.textContent('#board')).includes('敌方Boss') || view.leaders.enemy.hp <= 0, 'board should render Boss/leader layer from ViewModel');

    console.log('PASS browser player flow: buttons -> uiAdapter -> core state/events -> ViewModel -> DOM');
  } finally {
    if (browser) await browser.close();
    child.kill('SIGTERM');
    await sleep(100);
    if (child.exitCode === null) child.kill('SIGKILL');
  }
}

main().catch(err => { console.error(err.stack || err.message || err); process.exit(1); });
