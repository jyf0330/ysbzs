#!/usr/bin/env node
const http = require('http');
const fs = require('fs');
const path = require('path');
const { createYSBZSUIAdapter } = require('../src/uiAdapter.cjs');

const root = path.resolve(__dirname, '..');
const webRoot = path.join(root, 'web');
let adapter = createYSBZSUIAdapter({ day: 1, period: '上午', gold: 8 });

function send(res, status, content, type = 'application/json; charset=utf-8') {
  res.writeHead(status, { 'content-type': type, 'cache-control': 'no-store' });
  res.end(content);
}
function json(res, status, payload) { send(res, status, JSON.stringify(payload, null, 2)); }
function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => { body += chunk; if (body.length > 1e6) reject(new Error('request body too large')); });
    req.on('end', () => {
      try { resolve(body ? JSON.parse(body) : {}); }
      catch (err) { reject(new Error('invalid json body')); }
    });
    req.on('error', reject);
  });
}
function staticFile(req, res) {
  const rawPath = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  const file = rawPath === '/' ? '/index.html' : rawPath;
  const full = path.normalize(path.join(webRoot, file));
  if (!full.startsWith(webRoot)) return send(res, 403, 'Forbidden', 'text/plain; charset=utf-8');
  if (!fs.existsSync(full) || !fs.statSync(full).isFile()) return send(res, 404, 'Not found', 'text/plain; charset=utf-8');
  const ext = path.extname(full);
  const type = ext === '.html' ? 'text/html; charset=utf-8' : ext === '.css' ? 'text/css; charset=utf-8' : ext === '.js' ? 'application/javascript; charset=utf-8' : ext === '.json' ? 'application/json; charset=utf-8' : 'text/plain; charset=utf-8';
  if (file === '/index.html') {
    // index.html 文件本身保持参考项目原样；运行时注入兼容适配层，避免改 HTML / ui.js。
    const html = fs.readFileSync(full, 'utf8');
    const injected = html.includes('original-ui-compat-adapter.js')
      ? html
      : html.replace('</body>', '<script src="original-ui-compat-adapter.js"></script>\n</body>');
    return send(res, 200, injected, type);
  }
  send(res, 200, fs.readFileSync(full), type);
}
async function handleApi(req, res) {
  const url = new URL(req.url, 'http://localhost');
  try {
    if (req.method === 'GET' && url.pathname === '/api/health') return json(res, 200, { ok: true, status: 'ok', adapter: adapter.version });
    if (req.method === 'GET' && url.pathname === '/api/view') return json(res, 200, { ok: true, viewModel: adapter.getViewModel() });
    if (req.method === 'GET' && url.pathname === '/api/state/snapshot') return json(res, 200, { ok: true, snapshot: adapter.getStateSnapshot() });
    if (req.method === 'GET' && url.pathname === '/api/report') return json(res, 200, { ok: true, report: adapter.getTextReport(url.searchParams.get('mode') || 'player') });
    if (req.method === 'GET' && url.pathname === '/api/data/summary') return json(res, 200, { ok: true, summary: adapter.getDataSummary(), shopPools: adapter.getShopPools(), rewardPools: adapter.getRewardPools() });
    if (req.method === 'POST' && url.pathname === '/api/session/new') {
      const body = await readBody(req);
      adapter = createYSBZSUIAdapter({ day: Number(body.day || 1), period: body.period || '上午', gold: Number(body.gold ?? 8) });
      return json(res, 200, { ok: true, viewModel: adapter.getViewModel() });
    }
    if (req.method === 'POST' && url.pathname === '/api/action') {
      const body = await readBody(req);
      if (body.type === 'NEW_GAME') {
        adapter = createYSBZSUIAdapter({ day: Number(body.day || 1), period: body.period || '上午', gold: Number(body.gold ?? 8) });
        return json(res, 200, { ok: true, command: 'NEW_GAME', viewModel: adapter.getViewModel() });
      }
      const result = adapter.run(body);
      return json(res, 200, result);
    }
    return json(res, 404, { ok: false, error: `unknown api: ${req.method} ${url.pathname}` });
  } catch (err) {
    return json(res, 400, { ok: false, error: err.message || String(err) });
  }
}
const server = http.createServer((req, res) => {
  if (req.url.startsWith('/api/')) return handleApi(req, res);
  return staticFile(req, res);
});
const port = Number(process.env.PORT || process.argv[2] || 4173);
server.listen(port, '127.0.0.1', () => {
  console.log(`YSBZS UI connected: http://127.0.0.1:${port}`);
  console.log('UI -> /api/* -> src/uiAdapter.cjs -> core reducer/event log');
});
module.exports = { server };
