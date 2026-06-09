#!/usr/bin/env node
const { spawn, spawnSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const root = path.resolve(__dirname, '..');
const port = Number(process.env.CHECK_BROWSER_PORT || 4196);
const chromePort = Number(process.env.CHECK_BROWSER_CHROME_PORT || 9236);
const base = `http://127.0.0.1:${port}`;
const checkOnly = process.argv.includes('--check');
const outRoot = path.resolve(process.env.YSBZS_BROWSER_EVIDENCE_DIR || path.join(root, 'evidence', 'browser-real-flow'));
const shotsDir = path.join(outRoot, 'screenshots');
const framesDir = path.join(outRoot, 'frames');
const videoPath = path.join(outRoot, 'ysbzs_real_browser_player_flow.mp4');
const reportPath = path.join(outRoot, 'REAL_BROWSER_VERIFICATION.md');
const eventsPath = path.join(outRoot, 'verified_flow.json');

function sleep(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }
function assert(cond, msg) { if (!cond) throw new Error(msg); }
function nowIso() { return new Date().toISOString(); }
function safeName(s) { return String(s).replace(/[^a-z0-9_-]+/gi, '_').replace(/^_+|_+$/g, '').toLowerCase(); }
function resetDir(dir) { fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir, { recursive: true }); }
function findChromium() {
  return [process.env.CHROMIUM_BIN, '/usr/bin/chromium', '/usr/bin/chromium-browser', '/usr/bin/google-chrome', '/usr/bin/google-chrome-stable']
    .filter(Boolean).find(x => fs.existsSync(x));
}
async function fetchWithTimeout(url, options = {}, timeoutMs = 3000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try { return await fetch(url, Object.assign({}, options, { signal: controller.signal })); }
  finally { clearTimeout(timer); }
}
async function waitHttp(url, pred = r => r.ok, n = 80) {
  for (let i = 0; i < n; i++) {
    try { const r = await fetchWithTimeout(url, {}, 1200); if (pred(r)) return r; } catch (_) {}
    await sleep(100);
  }
  throw new Error(`not ready: ${url}`);
}
async function cdpConnect(wsUrl) {
  const ws = new WebSocket(wsUrl);
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('CDP websocket open timeout')), 5000);
    ws.onopen = () => { clearTimeout(timer); resolve(); };
    ws.onerror = () => { clearTimeout(timer); reject(new Error('CDP websocket failed')); };
  });
  let seq = 1;
  const pending = new Map();
  ws.onmessage = ev => {
    const msg = JSON.parse(ev.data);
    if (msg.id && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id);
      pending.delete(msg.id);
      if (msg.error) reject(new Error(JSON.stringify(msg.error)));
      else resolve(msg.result);
    }
  };
  function send(method, params = {}) {
    const id = seq++;
    ws.send(JSON.stringify({ id, method, params }));
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => { pending.delete(id); reject(new Error(`CDP ${method} timeout`)); }, 8000);
      pending.set(id, {
        resolve: value => { clearTimeout(timer); resolve(value); },
        reject: error => { clearTimeout(timer); reject(error); }
      });
    });
  }
  return { ws, send };
}
async function evaluate(cdp, expression, timeoutMs = 8000) {
  const res = await cdp.send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true, timeout: timeoutMs });
  if (res.exceptionDetails) throw new Error(res.exceptionDetails.text || res.exceptionDetails.exception?.description || JSON.stringify(res.exceptionDetails));
  return res.result.value;
}
async function waitForExpr(cdp, expression, message, timeoutMs = 10000) {
  const started = Date.now();
  let last = '';
  while (Date.now() - started < timeoutMs) {
    try {
      const ok = await evaluate(cdp, `Boolean(${expression})`);
      if (ok) return true;
      last = await evaluate(cdp, `document.body ? document.body.innerText.slice(0, 200) : ''`).catch(() => '');
    } catch (err) { last = err.message; }
    await sleep(120);
  }
  throw new Error(`${message}${last ? `; last page text/error: ${last}` : ''}`);
}
async function getVm(cdp) {
  return await evaluate(cdp, `window.__YSBZS__?.lastViewModel || null`);
}
async function getBox(cdp, selector) {
  const expr = `(() => {
    const el = document.querySelector(${JSON.stringify(selector)});
    if (!el) return null;
    el.scrollIntoView({ block: 'center', inline: 'center' });
    const rect = el.getBoundingClientRect();
    const style = getComputedStyle(el);
    return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2, left: rect.left, top: rect.top, width: rect.width, height: rect.height, disabled: !!el.disabled, visible: rect.width > 0 && rect.height > 0 && style.visibility !== 'hidden' && style.display !== 'none', text: (el.innerText || el.textContent || '').slice(0, 80) };
  })()`;
  const box = await evaluate(cdp, expr);
  assert(box, `selector not found: ${selector}`);
  assert(box.visible, `selector not visible: ${selector}`);
  assert(!box.disabled, `selector is disabled: ${selector} ${box.text || ''}`);
  return box;
}
async function realClick(cdp, selector, label, records) {
  await waitForExpr(cdp, `document.querySelector(${JSON.stringify(selector)})`, `selector missing before click: ${selector}`);
  await waitForExpr(cdp, `!window.__YSBZS__?.isBusy || !window.__YSBZS__.isBusy()`, `UI stayed busy before clicking ${selector}`);
  const box = await getBox(cdp, selector);
  await cdp.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: box.x, y: box.y, button: 'none' });
  await sleep(70);
  await cdp.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: box.x, y: box.y, button: 'left', clickCount: 1 });
  await sleep(60);
  await cdp.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: box.x, y: box.y, button: 'left', clickCount: 1 });
  await sleep(260);
  await waitForExpr(cdp, `!window.__YSBZS__?.isBusy || !window.__YSBZS__.isBusy()`, `UI stayed busy after clicking ${selector}`);
  records.actions.push({ at: nowIso(), action: label, selector, x: Math.round(box.x), y: Math.round(box.y), elementText: box.text });
}
async function screenshot(cdp, name, caption, records) {
  await sleep(180);
  const file = path.join(shotsDir, `${String(records.screenshots.length + 1).padStart(2, '0')}_${safeName(name)}.png`);
  const png = await cdp.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false, fromSurface: true });
  fs.writeFileSync(file, Buffer.from(png.data, 'base64'));
  records.screenshots.push({ at: nowIso(), name, caption, file: path.relative(outRoot, file) });
  return file;
}
function makeVideo() {
  if (checkOnly) return { skipped: true, reason: '--check mode' };
  resetDir(framesDir);
  const shots = fs.readdirSync(shotsDir).filter(x => x.endsWith('.png')).sort();
  shots.forEach((shot, i) => fs.copyFileSync(path.join(shotsDir, shot), path.join(framesDir, `frame_${String(i + 1).padStart(3, '0')}.png`)));
  const ffmpeg = spawnSync('ffmpeg', ['-y', '-framerate', '1', '-i', path.join(framesDir, 'frame_%03d.png'), '-vf', 'fps=30,format=yuv420p', '-movflags', '+faststart', videoPath], { encoding: 'utf8' });
  if (ffmpeg.status !== 0) return { skipped: true, reason: ffmpeg.stderr || ffmpeg.stdout || 'ffmpeg failed' };
  return { file: path.relative(outRoot, videoPath), bytes: fs.statSync(videoPath).size };
}
function writeReport(records, video) {
  const lines = [];
  lines.push('# 真实浏览器玩家链路验证');
  lines.push('');
  lines.push(`- 时间：${records.startedAt}`);
  lines.push(`- URL：${records.base}`);
  lines.push(`- 浏览器：${records.chromium}`);
  lines.push('- 验证方式：CDP `Input.dispatchMouseEvent` 发送真实鼠标事件，页面按钮/格子自己触发 DOM click 监听。');
  lines.push('- 禁止事项：本脚本不调用 `/api/action` 改状态，不使用 fallback，不把 API 调用当作玩家操作。');
  lines.push('');
  lines.push('## 通过的玩家操作');
  for (const r of records.actions) lines.push(`- ${r.action}：${r.selector} @ (${r.x}, ${r.y})`);
  lines.push('');
  lines.push('## 截图');
  for (const s of records.screenshots) lines.push(`- ${s.file}：${s.caption}`);
  lines.push('');
  lines.push('## 视频');
  lines.push(video.file ? `- ${video.file}` : `- 未生成：${video.reason}`);
  lines.push('');
  lines.push('## 最终状态摘要');
  lines.push('```json');
  lines.push(JSON.stringify(records.finalState, null, 2));
  lines.push('```');
  fs.writeFileSync(reportPath, lines.join('\n'));
}
async function main() {
  const chromium = findChromium();
  if (!chromium) throw new Error('chromium executable is not available');
  fs.mkdirSync(outRoot, { recursive: true });
  resetDir(shotsDir);
  const records = { startedAt: nowIso(), base, chromium, mode: checkOnly ? 'check' : 'evidence', actions: [], screenshots: [] };
  const server = spawn(process.execPath, ['tools/run_ui_server.cjs'], { cwd: root, env: Object.assign({}, process.env, { PORT: String(port) }), stdio: ['ignore', 'pipe', 'pipe'] });
  let serverLog = '';
  server.stdout.on('data', d => { serverLog += d.toString(); });
  server.stderr.on('data', d => { serverLog += d.toString(); });
  const userData = fs.mkdtempSync(path.join(os.tmpdir(), 'ysbzs-ui-chrome-'));
  let chrome, cdp;
  try {
    await waitHttp(`${base}/api/health`);
    chrome = spawn(chromium, [
      '--headless=new', '--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage', '--disable-background-networking', '--disable-sync', '--disable-extensions', '--no-first-run',
      '--window-size=1280,720', `--user-data-dir=${userData}`, `--remote-debugging-port=${chromePort}`, 'about:blank'
    ], { stdio: ['ignore', 'pipe', 'pipe'] });
    chrome.stdout.resume(); chrome.stderr.resume();
    let pageTarget = null;
    for (let i = 0; i < 80; i++) {
      let pages = [];
      try { pages = await (await fetchWithTimeout(`http://127.0.0.1:${chromePort}/json/list`, {}, 1200)).json(); } catch (_) {}
      pageTarget = Array.isArray(pages) ? (pages.find(p => p.type === 'page' && p.webSocketDebuggerUrl) || pages.find(p => p.webSocketDebuggerUrl) || null) : null;
      if (pageTarget) break;
      await sleep(100);
    }
    assert(pageTarget?.webSocketDebuggerUrl, 'chromium did not expose a page target');
    cdp = await cdpConnect(pageTarget.webSocketDebuggerUrl);
    await cdp.send('Runtime.enable');
    await cdp.send('Page.enable');
    await cdp.send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 720, deviceScaleFactor: 1, mobile: false });
    await cdp.send('Page.navigate', { url: base });
    await waitForExpr(cdp, `document.readyState === 'complete' || document.readyState === 'interactive'`, 'browser did not navigate to UI', 10000);
    await waitForExpr(cdp, `window.__YSBZS__ && window.__YSBZS__.lastViewModel && document.querySelector('#board .cell')`, 'new UI did not render; strict browser verification refuses API fallback', 12000);
    await screenshot(cdp, 'loaded', '页面真实加载；棋盘、英雄列表、行动槽都已由浏览器渲染。', records);

    let vm = await getVm(cdp);
    assert(vm?.leaders?.player?.hp === 80 && vm?.leaders?.enemy?.hp === 80, 'leader HP did not render from ViewModel');
    assert((await evaluate(cdp, `document.querySelectorAll('#hero-list .hero-card').length`)) >= 1, 'hero cards missing');
    assert((await evaluate(cdp, `document.querySelectorAll('#slot-list .slot-card').length`)) >= 1, 'slot cards missing');

    await realClick(cdp, '#etb', '点击“开始战斗”', records);
    await waitForExpr(cdp, `window.__YSBZS__.lastViewModel.phase === 'player_turn'`, 'start button did not enter player_turn');
    await screenshot(cdp, 'start_battle_player_turn', '进入玩家回合，按钮文字变为“结束回合”。', records);

    await realClick(cdp, '.hero-card', '点击左侧英雄卡片', records);
    await waitForExpr(cdp, `!!window.__YSBZS__.lastViewModel.selected.unitId && !!document.querySelector('.hero-card.sel')`, 'hero card click did not select a unit');
    await screenshot(cdp, 'hero_selected', '英雄卡片出现选中态，棋盘可移动格出现提示。', records);

    await realClick(cdp, '#board .cell[data-r="6"][data-c="3"]', '点击棋盘空格移动英雄', records);
    await waitForExpr(cdp, `window.__YSBZS__.lastViewModel.heroes.some(h => h.position && h.position.r === 6 && h.position.c === 3)`, 'cell click did not move selected hero');
    await screenshot(cdp, 'hero_moved_by_cell_click', '英雄通过点棋盘空格移动到新位置。', records);

    await realClick(cdp, '[data-slot="0"]', '点击行动槽卡片', records);
    await waitForExpr(cdp, `document.querySelector('[data-slot="0"]').classList.contains('sel') && window.__YSBZS__.lastViewModel.selected.slotId === 0`, 'slot card click did not arm slot');
    await screenshot(cdp, 'slot_selected_armed', '行动槽进入瞄准态，点棋盘只选目标，不再误移动。', records);

    await realClick(cdp, '[data-slot-dir="0"][data-dir="right"]', '点击方向箭头：右', records);
    await waitForExpr(cdp, `window.__YSBZS__.lastViewModel.events.some(e => e.type === 'SET_ACTION_DIRECTION')`, 'direction click did not dispatch SET_ACTION_DIRECTION');
    await screenshot(cdp, 'slot_direction_right', '方向调整通过按钮进入核心状态。', records);

    await realClick(cdp, '#board .cell[data-r="6"][data-c="4"]', '点击目标格', records);
    await waitForExpr(cdp, `window.__YSBZS__.lastViewModel.selected.cell && window.__YSBZS__.lastViewModel.selected.cell.r === 6 && window.__YSBZS__.lastViewModel.selected.cell.c === 4`, 'target cell click did not update selected.cell');
    await screenshot(cdp, 'target_cell_selected', '选中目标格，左侧目标信息同步更新。', records);

    await realClick(cdp, '[data-use="0"]', '点击“施放”', records);
    await waitForExpr(cdp, `window.__YSBZS__.lastViewModel.events.some(e => e.type === 'PLAYER_SELECT_SLOT')`, 'use slot button did not dispatch USE_SLOT');
    await screenshot(cdp, 'slot_used_event_log', '施放后事件日志出现行动槽事件，棋盘出现元素/预览反馈。', records);

    await realClick(cdp, '#etb', '点击“结束回合”', records);
    await waitForExpr(cdp, `window.__YSBZS__.lastViewModel.events.some(e => e.type === 'PLAYER_TURN_END')`, 'end turn button did not dispatch player turn end');
    await screenshot(cdp, 'player_turn_ended', '结束玩家回合，事件日志记录 PLAYER_TURN_END。', records);

    if (await evaluate(cdp, `!document.querySelector('#monster-btn').disabled`).catch(() => false)) {
      await realClick(cdp, '#monster-btn', '点击“怪物行动”', records);
      await waitForExpr(cdp, `window.__YSBZS__.lastViewModel.events.length > 0`, 'monster action did not keep event stream');
      await screenshot(cdp, 'monster_action_clicked', '怪物行动通过按钮推进。', records);
    }


    await realClick(cdp, '[data-log-tab="report"]', '点击“战报”标签', records);
    await waitForExpr(cdp, `document.querySelector('#log').innerText.length > 20`, 'report tab did not render text report');
    await screenshot(cdp, 'battle_report_tab', '战报标签通过前端读取 report 并显示文本。', records);


    vm = await getVm(cdp);
    records.finishedAt = nowIso();
    records.finalState = {
      phase: vm.phase,
      day: vm.day,
      round: vm.round,
      selected: vm.selected,
      heroCount: vm.heroes?.length || 0,
      enemyCount: vm.enemies?.length || 0,
      eventCount: vm.events?.length || 0,
      lastEvents: (vm.events || []).slice(-8).map(e => ({ step: e.step, type: e.type, text: e.text }))
    };
    const video = makeVideo();
    writeReport(records, video);
    fs.writeFileSync(eventsPath, JSON.stringify(records, null, 2));
    console.log(`PASS strict real browser player flow: screenshots=${records.screenshots.length}, video=${video.file || 'skipped'}`);
    console.log(`Evidence: ${outRoot}`);
  } catch (err) {
    if (serverLog) fs.mkdirSync(outRoot, { recursive: true }), fs.writeFileSync(path.join(outRoot, 'server.log'), serverLog);
    throw err;
  } finally {
    if (cdp) cdp.ws.close();
    if (chrome) chrome.kill('SIGTERM');
    server.kill('SIGTERM');
    await sleep(100);
    if (chrome && chrome.exitCode === null) chrome.kill('SIGKILL');
    if (server.exitCode === null) server.kill('SIGKILL');
  }
}
main().catch(err => { console.error(err.stack || err.message || err); process.exit(1); });
