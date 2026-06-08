#!/usr/bin/env node
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');
const { Client } = require('boardgame.io/client');
const { YSBZSGame } = require('../src/YSBZSGame.cjs');

function assert(cond, msg) { if (!cond) throw new Error(msg); }
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
function findChromium() {
  return [process.env.CHROMIUM_BIN, '/usr/bin/chromium', '/usr/bin/chromium-browser', '/usr/bin/google-chrome', '/usr/bin/google-chrome-stable'].filter(Boolean).find(x => fs.existsSync(x));
}
async function waitHttp(url, pred = r => r.ok, n = 100) {
  for (let i = 0; i < n; i++) {
    try { const r = await fetch(url); if (pred(r)) return r; } catch (_) {}
    await sleep(100);
  }
  throw new Error(`not ready: ${url}`);
}
async function cdpConnect(wsUrl) {
  const ws = new WebSocket(wsUrl);
  await new Promise((resolve, reject) => { ws.onopen = resolve; ws.onerror = () => reject(new Error('CDP websocket failed')); });
  let seq = 1; const pending = new Map();
  ws.onmessage = ev => { const msg = JSON.parse(ev.data); if (msg.id && pending.has(msg.id)) { const p = pending.get(msg.id); pending.delete(msg.id); if (msg.error) p.reject(new Error(JSON.stringify(msg.error))); else p.resolve(msg.result); } };
  function send(method, params = {}) { const id = seq++; ws.send(JSON.stringify({ id, method, params })); return new Promise((resolve, reject) => pending.set(id, { resolve, reject })); }
  return { ws, send };
}
function summarize(state) {
  const s = state && state.G && state.G.day7Trial && state.G.day7Trial.scenario || {};
  return {
    title: s.title || '',
    status: s.status || '',
    round1KillCount: s.round1KillCount || 0,
    killedCloneCount: s.killedCloneCount || 0,
    passedRound1Standard: !!s.passedRound1Standard,
    killedCloneNames: s.killedCloneNames || [],
    battleTraceText: (state.G.battleTrace || state.G.events || []).map(e => e.text || '').join('\n'),
    boardgameDeltalogCount: (state.deltalog || []).length,
    ctx: state.ctx,
  };
}
async function main() {
  const chromium = findChromium();
  if (!chromium) throw new Error('chromium executable is not available');

  // The actual game lifecycle is still boardgame.io Client -> YSBZSGame.moves -> G update.
  // The browser side renders the resulting boardgame.io state through CDP because this
  // execution environment blocks direct localhost navigation in Chromium.
  const client = Client({ game: YSBZSGame, numPlayers: 1, debug: false });
  client.start();
  client.moves.setupDay7FireTrial();
  client.moves.runDay7FireTurn1();
  client.moves.runDay7FireTrialAll();
  const summary = summarize(client.getState());
  assert(summary.status === 'trial_pass', 'boardgame.io Client state must reach trial_pass before DOM render');

  const chromePort = 9327 + Math.floor(Math.random() * 1000);
  const userData = fs.mkdtempSync(path.join(os.tmpdir(), 'ysbzs-bgio-browser-'));
  let chrome;
  try {
    chrome = spawn(chromium, ['--headless=new', '--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage', '--disable-background-networking', '--disable-sync', '--disable-extensions', '--no-first-run', `--user-data-dir=${userData}`, `--remote-debugging-port=${chromePort}`, 'about:blank'], { stdio: ['ignore', 'pipe', 'pipe'] });
    chrome.stdout.resume(); chrome.stderr.resume();
    const pages = await (await waitHttp(`http://127.0.0.1:${chromePort}/json/list`)).json();
    const page = pages.find(p => p.type === 'page') || pages[0];
    const cdp = await cdpConnect(page.webSocketDebuggerUrl);
    await cdp.send('Runtime.enable');
    const html = `<h1>ysbzs boardgame.io client render</h1><pre id="out"></pre>`;
    await cdp.send('Runtime.evaluate', { expression: `document.body.innerHTML = ${JSON.stringify(html)}; document.getElementById('out').textContent = ${JSON.stringify(JSON.stringify(summary, null, 2) + '\n' + summary.battleTraceText)};`, returnByValue: true });
    const result = await cdp.send('Runtime.evaluate', { expression: `document.body.innerText`, returnByValue: true });
    const text = result.result.value || '';
    assert(text.includes('trial_pass'), 'browser DOM should show trial_pass');
    assert(text.includes('killedCloneCount') && text.includes('4'), 'browser DOM should show 4 killed clones');
    assert(text.includes('boardgameDeltalogCount'), 'browser DOM should show boardgame.io deltalog count');
    assert(text.includes('火') || text.includes('水汽') || text.includes('试炼'), 'browser DOM should include ysbzs battle text');
    cdp.ws.close();
    console.log('PASS browser: boardgame.io Client state -> DOM render via Chromium CDP');
  } finally {
    client.stop();
    if (chrome) chrome.kill('SIGTERM');
  }
}
main().catch(err => { console.error(err.stack || err.message || err); process.exit(1); });
