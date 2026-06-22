#!/usr/bin/env node
const { spawn } = require('child_process');
const fs = require('fs');
const net = require('net');
const path = require('path');
const { chromium } = require('playwright');

const root = path.resolve(__dirname, '..');
const outDir = path.join(root, 'output', 'playwright');
const videoTempDir = path.join(outDir, 'daily-flow-day1-day2-video-temp');
const evidenceDate = process.env.EVIDENCE_DATE || '2026-06-22';
const evidenceName = `daily-flow-${evidenceDate}-node-node-battle-day1-day2-with-cursor`;
const videoPath = path.join(outDir, `${evidenceName}.webm`);
const screenshotPath = path.join(outDir, `${evidenceName}.png`);
const reportPath = path.join(outDir, `${evidenceName}.json`);
const viewport = { width: 1280, height: 720 };
const playerId = process.env.PLAYER_ID || 'p1';
const sessionId = process.env.SESSION_ID || `${evidenceName}-${process.pid}`;

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function assert(cond, message) {
  if (!cond) throw new Error(message);
}

function nowIso() {
  return new Date().toISOString();
}

function resetDir(dir) {
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
}

function findFreePort(start = 4900) {
  return new Promise(resolve => {
    const tryPort = port => {
      const server = net.createServer();
      server.once('error', () => tryPort(port + 1));
      server.once('listening', () => server.close(() => resolve(port)));
      server.listen(port, '127.0.0.1');
    };
    tryPort(Number(process.env.CHECK_BROWSER_PORT || start));
  });
}

async function waitHttp(url, timeoutMs = 12000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    try {
      const res = await fetch(url, { cache: 'no-store' });
      if (res.ok) return res;
    } catch (_) {}
    await sleep(120);
  }
  throw new Error(`HTTP endpoint not ready: ${url}`);
}

function installCursorOverlayScript() {
  return `
(() => {
  const state = { x: 28, y: 28, down: false };
  function ensureCursor() {
    if (document.getElementById('ysbzs-record-cursor')) return;
    const style = document.createElement('style');
    style.id = 'ysbzs-record-cursor-style';
    style.textContent = [
      '#ysbzs-record-cursor{position:fixed;left:0;top:0;width:38px;height:38px;z-index:2147483647;pointer-events:none;transform:translate(28px,28px);transition:transform 90ms linear;filter:drop-shadow(0 2px 3px rgba(0,0,0,.55))}',
      '#ysbzs-record-cursor svg{display:block;width:38px;height:38px}',
      '#ysbzs-record-cursor.down svg{transform:scale(.9)}',
      '#ysbzs-record-cursor .ring{position:absolute;left:-11px;top:-11px;width:24px;height:24px;border:3px solid #d9432f;border-radius:50%;opacity:0;transform:scale(.4);transition:opacity 160ms ease,transform 160ms ease}',
      '#ysbzs-record-cursor.down .ring{opacity:.95;transform:scale(1)}'
    ].join('\\n');
    document.documentElement.appendChild(style);
    const cursor = document.createElement('div');
    cursor.id = 'ysbzs-record-cursor';
    cursor.setAttribute('aria-hidden', 'true');
    cursor.innerHTML = '<div class="ring"></div><svg viewBox="0 0 38 38" xmlns="http://www.w3.org/2000/svg"><path d="M4 3 L4 29 L12.5 21.5 L17.2 34 L24.4 31.1 L19.3 19.2 L30.5 19.2 Z" fill="#fff" stroke="#111" stroke-width="2.4" stroke-linejoin="round"/><path d="M8 8 L8 20.5 L12.1 16.6 L13.6 20.2 L16.6 19 L14.8 15.1 L20.3 15.1 Z" fill="#d9432f" opacity=".85"/></svg>';
    document.body.appendChild(cursor);
    moveCursor(state.x, state.y);
  }
  function moveCursor(x, y) {
    state.x = Number(x) || 0;
    state.y = Number(y) || 0;
    const cursor = document.getElementById('ysbzs-record-cursor');
    if (cursor) cursor.style.transform = 'translate(' + state.x + 'px,' + state.y + 'px)';
  }
  window.__YSBZS_RECORD_CURSOR__ = {
    move(x, y) { ensureCursor(); moveCursor(x, y); },
    down() { ensureCursor(); state.down = true; document.getElementById('ysbzs-record-cursor')?.classList.add('down'); },
    up() { ensureCursor(); state.down = false; document.getElementById('ysbzs-record-cursor')?.classList.remove('down'); },
    state() { return Object.assign({}, state, { present: !!document.getElementById('ysbzs-record-cursor') }); }
  };
  window.addEventListener('mousemove', ev => { ensureCursor(); moveCursor(ev.clientX, ev.clientY); }, true);
  window.addEventListener('mousedown', () => window.__YSBZS_RECORD_CURSOR__.down(), true);
  window.addEventListener('mouseup', () => window.__YSBZS_RECORD_CURSOR__.up(), true);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', ensureCursor, { once: true });
  else ensureCursor();
})();
`;
}

async function main() {
  fs.mkdirSync(outDir, { recursive: true });
  resetDir(videoTempDir);
  const port = await findFreePort();
  const base = `http://127.0.0.1:${port}`;
  const pageUrl = `${base}/daily-flow.html?runtime=http&sessionId=${encodeURIComponent(sessionId)}&playerId=${encodeURIComponent(playerId)}&record=${encodeURIComponent(evidenceName)}`;
  const records = {
    startedAt: nowIso(),
    url: pageUrl,
    sessionId,
    viewport,
    actions: [],
    autoAdvances: [],
    consoleErrors: [],
    pageErrors: [],
    requestFailures: [],
    assertions: []
  };

  const server = spawn(process.execPath, ['tools/run_ui_server.cjs'], {
    cwd: root,
    env: Object.assign({}, process.env, { PORT: String(port) }),
    stdio: ['ignore', 'pipe', 'pipe']
  });
  let serverLog = '';
  server.stdout.on('data', chunk => { serverLog += chunk.toString(); });
  server.stderr.on('data', chunk => { serverLog += chunk.toString(); });

  let browser;
  let context;
  let page;
  let video;
  try {
    await waitHttp(`${base}/api/health`);
    browser = await chromium.launch({ headless: true });
    context = await browser.newContext({
      viewport,
      deviceScaleFactor: 1,
      recordVideo: { dir: videoTempDir, size: viewport }
    });
    page = await context.newPage();
    await page.addInitScript(installCursorOverlayScript());
    video = page.video();

    page.on('console', msg => {
      if (msg.type() === 'error') records.consoleErrors.push({ at: nowIso(), text: msg.text() });
    });
    page.on('pageerror', err => records.pageErrors.push({ at: nowIso(), message: err.message }));
    page.on('requestfailed', req => records.requestFailures.push({ at: nowIso(), url: req.url(), failure: req.failure()?.errorText || 'request failed' }));

    await page.goto(pageUrl, { waitUntil: 'domcontentloaded' });
    await waitIdle(page);
    await assertCursorVisible(page);
    await assertNoFreezeVisible(page, records);
    await moveMouse(page, 34, 34);
    await page.waitForTimeout(500);

    for (const day of [1, 2]) {
      await playDay(page, records, day);
      const vm = await getVm(page);
      assert(vm.day === day, `expected to finish day ${day}, got day ${vm.day}`);
      assert(vm.phase === 'day_end', `expected day ${day} to end at day_end, got ${vm.phase}`);
      assert(Number(vm.dailyFlow?.currentStep || 0) === 6, `expected day ${day} currentStep=6`);
      records.assertions.push(`Day${day} reached day_end at route progress 6/6`);
      if (day === 1) await clickCommand(page, records, 'START_NEXT_DAY', () => true, '点击进入第2天');
    }

    const finalVm = await getVm(page);
    const routeOrder = (finalVm.dailyFlow?.steps || []).map(step => step.kind);
    assert(routeOrder.join(',') === 'node_choice,node_choice,fixed_battle,node_choice,node_choice,fixed_battle', `unexpected final route order: ${routeOrder.join(',')}`);
    assert(records.actions.some(action => action.command === 'BUY_OFFER'), 'recording did not click a buy button');
    assert(records.actions.some(action => action.command === 'SELL_UNIT'), 'recording did not click a sell button');
    assert(records.actions.filter(action => action.command === 'RUN_ROUTE_FIXED_BATTLE').length === 4, 'recording should click four route battle buttons across two days');
    assert(records.actions.filter(action => action.command === 'GENERATE_NODE_OPTIONS').length === 0, 'recording should not click generated 3-choice buttons');
    assert(records.autoAdvances.filter(action => action.command === 'GENERATE_NODE_OPTIONS').length === 8, 'page should auto-expand eight 3-choice sets across two days');
    assert(records.actions.filter(action => action.command === 'PICK_NODE').length === 8, 'recording should pick eight 3-choice nodes across two days');
    await assertNoFreezeVisible(page, records);

    await moveToSelector(page, '#run-next-btn');
    await page.waitForTimeout(500);
    await page.screenshot({ path: screenshotPath, fullPage: false });

    records.finalState = {
      day: finalVm.day,
      phase: finalVm.phase,
      currentStep: finalVm.dailyFlow?.currentStep,
      totalSteps: finalVm.dailyFlow?.totalSteps,
      routeOrder,
      visibleCursor: await page.evaluate(() => window.__YSBZS_RECORD_CURSOR__?.state?.() || null),
      screenshot: path.relative(root, screenshotPath)
    };
    assert(!records.consoleErrors.length, `console errors: ${JSON.stringify(records.consoleErrors)}`);
    assert(!records.pageErrors.length, `page errors: ${JSON.stringify(records.pageErrors)}`);
    assert(!records.requestFailures.length, `request failures: ${JSON.stringify(records.requestFailures)}`);
    records.assertions.push('console/page/request errors are all 0');

    await context.close();
    context = null;
    const rawVideoPath = await video.path();
    fs.copyFileSync(rawVideoPath, videoPath);
    records.video = path.relative(root, videoPath);
    records.videoBytes = fs.statSync(videoPath).size;
    fs.writeFileSync(reportPath, JSON.stringify(records, null, 2));
    console.log(JSON.stringify({
      ok: true,
      video: path.relative(root, videoPath),
      screenshot: path.relative(root, screenshotPath),
      report: path.relative(root, reportPath),
      actions: records.actions.length,
      finalState: records.finalState
    }, null, 2));
  } catch (err) {
    records.error = err.stack || err.message || String(err);
    records.serverLog = serverLog.slice(-4000);
    try { fs.writeFileSync(reportPath, JSON.stringify(records, null, 2)); } catch (_) {}
    throw err;
  } finally {
    if (context) await context.close().catch(() => {});
    if (browser) await browser.close().catch(() => {});
    server.kill('SIGTERM');
  }
}

async function getVm(page) {
  return await page.evaluate(() => window.__YSBZS_DAILY_FLOW__?.lastViewModel || null);
}

async function waitIdle(page) {
  await page.waitForFunction(() => {
    const api = window.__YSBZS_DAILY_FLOW__;
    return !!api?.lastViewModel && (!api.isBusy || !api.isBusy());
  }, { timeout: 12000 });
}

async function assertCursorVisible(page) {
  const cursor = await page.evaluate(() => window.__YSBZS_RECORD_CURSOR__?.state?.() || null);
  assert(cursor?.present, 'record cursor overlay is not present');
}

async function assertNoFreezeVisible(page, records) {
  const visibleText = await page.locator('body').innerText();
  assert(!/冻结|解冻|FREEZE_OFFER|UNFREEZE_OFFER/.test(visibleText), 'freeze controls are visible on daily-flow page');
  records.assertions.push('no freeze/unfreeze controls visible');
}

async function moveMouse(page, x, y) {
  await page.mouse.move(x, y, { steps: 14 });
  await page.evaluate(({ x: nextX, y: nextY }) => window.__YSBZS_RECORD_CURSOR__?.move?.(nextX, nextY), { x, y });
  await page.waitForTimeout(100);
}

async function moveToSelector(page, selector) {
  const loc = page.locator(selector).first();
  await loc.scrollIntoViewIfNeeded();
  const box = await loc.boundingBox();
  if (!box) return;
  await moveMouse(page, box.x + box.width / 2, box.y + box.height / 2);
}

async function clickLocator(page, records, locator, actionLabel, command = null) {
  await waitIdle(page);
  const loc = locator.first();
  await loc.waitFor({ state: 'visible', timeout: 8000 });
  await loc.scrollIntoViewIfNeeded();
  await page.waitForTimeout(120);
  const box = await loc.boundingBox();
  assert(box && box.width > 0 && box.height > 0, `button has no clickable box: ${actionLabel}`);
  const disabled = await loc.evaluate(el => !!el.disabled);
  assert(!disabled, `button is disabled: ${actionLabel}`);
  const text = (await loc.innerText()).replace(/\s+/g, ' ').trim();
  const x = box.x + box.width / 2;
  const y = box.y + box.height / 2;
  await moveMouse(page, x, y);
  await page.evaluate(() => window.__YSBZS_RECORD_CURSOR__?.down?.());
  await page.mouse.down();
  await page.waitForTimeout(90);
  await page.mouse.up();
  await page.evaluate(() => window.__YSBZS_RECORD_CURSOR__?.up?.());
  records.actions.push({
    at: nowIso(),
    action: actionLabel,
    command,
    text,
    x: Math.round(x),
    y: Math.round(y)
  });
  await page.waitForTimeout(360);
  await waitIdle(page);
  await page.waitForTimeout(220);
}

async function commandMetas(page, command) {
  return await page.locator(`button[data-command="${command}"]`).evaluateAll(nodes => nodes.map((el, index) => {
    let payload = {};
    try { payload = JSON.parse(el.dataset.payload || '{}'); } catch (_) {}
    return {
      index,
      text: (el.innerText || el.textContent || '').replace(/\s+/g, ' ').trim(),
      disabled: !!el.disabled,
      payload
    };
  }));
}

async function clickCommand(page, records, command, predicate, actionLabel) {
  await waitIdle(page);
  const metas = await commandMetas(page, command);
  const meta = metas.find(item => !item.disabled && (!predicate || predicate(item)));
  assert(meta, `missing enabled command button: ${command} for ${actionLabel}`);
  await clickLocator(page, records, page.locator(`button[data-command="${command}"]`).nth(meta.index), actionLabel || meta.text || command, command);
  return meta;
}

async function clickRunNext(page, records, expectedKind, actionLabel) {
  const vm = await getVm(page);
  assert(vm?.dailyFlow?.nextSchedule?.kind === expectedKind, `expected next schedule ${expectedKind}, got ${vm?.dailyFlow?.nextSchedule?.kind}`);
  await clickLocator(page, records, page.locator('#run-next-btn'), actionLabel, expectedKind === 'node_choice' ? 'GENERATE_NODE_OPTIONS' : 'RUN_ROUTE_FIXED_BATTLE');
}

async function playDay(page, records, expectedDay) {
  for (const step of [1, 2, 3, 4, 5, 6]) {
    const vm = await getVm(page);
    assert(vm.day === expectedDay, `expected day ${expectedDay} before step ${step}, got ${vm.day}`);
    assert((vm.dailyFlow?.steps || []).map(row => row.kind).join(',') === 'node_choice,node_choice,fixed_battle,node_choice,node_choice,fixed_battle', `day ${expectedDay} route order changed`);
    if ([1, 2, 4, 5].includes(step)) {
      await resolveNodeChoice(page, records, expectedDay, step);
    } else {
      await clickRunNext(page, records, 'fixed_battle', `第${expectedDay}天 第${step}步：进入棋盘战斗并结算`);
    }
    await assertNoFreezeVisible(page, records);
  }
}

async function resolveNodeChoice(page, records, day, step) {
  await waitForAutoNodeOptions(page, records, day, step);
  const preferShop = !records.actions.some(action => action.command === 'BUY_OFFER' && action.day === day);
  let meta = await clickCommand(
    page,
    records,
    'PICK_NODE',
    item => preferShop && item.payload?.option?.nodeType === 'shop',
    `第${day}天 第${step}步：选择商店节点`
  ).catch(async () => clickCommand(page, records, 'PICK_NODE', () => true, `第${day}天 第${step}步：选择 3 选 1 节点`));
  records.actions[records.actions.length - 1].day = day;
  records.actions[records.actions.length - 1].routeStep = step;
  records.actions[records.actions.length - 1].nodeType = meta.payload?.option?.nodeType || null;
  await resolveEnteredNode(page, records, day, step);
}

async function waitForAutoNodeOptions(page, records, day, step) {
  await page.waitForFunction(() => {
    const vm = window.__YSBZS_DAILY_FLOW__?.lastViewModel;
    return (vm?.dayRoute?.options || []).length === 3 && (!window.__YSBZS_DAILY_FLOW__?.isBusy || !window.__YSBZS_DAILY_FLOW__.isBusy());
  }, { timeout: 10000 });
  const vm = await getVm(page);
  const optionNames = (vm.dayRoute?.options || []).map(option => option.name || option.nodeId);
  records.autoAdvances.push({
    at: nowIso(),
    day,
    routeStep: step,
    command: 'GENERATE_NODE_OPTIONS',
    optionNames
  });
}

async function resolveEnteredNode(page, records, day, step) {
  let vm = await getVm(page);
  if (vm.phase === 'shop') {
    await handleShop(page, records, day, step);
    return;
  }
  if ((vm.rewards || []).length || vm.phase === 'reward') {
    await clickCommand(page, records, 'PICK_REWARD', () => true, `第${day}天 第${step}步：选择奖励`);
    return;
  }
  vm = await getVm(page);
  assert(['node_resolved', 'battle_end', 'init', 'node_choice'].includes(vm.phase), `unexpected phase after node choice: ${vm.phase}`);
}

async function handleShop(page, records, day, step) {
  await assertNoFreezeVisible(page, records);
  const vmBeforeBuy = await getVm(page);
  const affordable = item => {
    const price = Number(item.payload?.offer?.price ?? item.payload?.price ?? 0);
    return price <= Number(vmBeforeBuy.gold || 0);
  };
  await clickCommand(page, records, 'BUY_OFFER', affordable, `第${day}天 第${step}步：购买宠物`);
  records.actions[records.actions.length - 1].day = day;
  records.actions[records.actions.length - 1].routeStep = step;
  await page.waitForFunction(() => (window.__YSBZS_DAILY_FLOW__?.lastViewModel?.inventory?.items || []).some(item => item.active === false), { timeout: 8000 });
  await clickCommand(page, records, 'SELL_UNIT', item => item.payload?.unit?.active === false, `第${day}天 第${step}步：出售刚买入的背包宠物`);
  records.actions[records.actions.length - 1].day = day;
  records.actions[records.actions.length - 1].routeStep = step;
  await clickCommand(page, records, 'EXIT_SHOP', () => true, `第${day}天 第${step}步：离开商店节点`);
  records.actions[records.actions.length - 1].day = day;
  records.actions[records.actions.length - 1].routeStep = step;
}

main().catch(err => {
  console.error(err.stack || err.message || String(err));
  process.exit(1);
});
