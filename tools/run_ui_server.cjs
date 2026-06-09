#!/usr/bin/env node
const http = require('http');
const fs = require('fs');
const path = require('path');
const { createServerAuthorityAdapter } = require('../src/adapters/serverAuthorityAdapter.cjs');

const root = path.resolve(__dirname, '..');
const webRoot = path.join(root, 'web');
const sessions = new Map();
const DEFAULT_SESSION_ID = 'local';
function playerIdFromReq(req, url = new URL(req.url, 'http://localhost')) {
  return req.headers['x-player-id'] || url.searchParams.get('playerId') || 'p1';
}

function createAdapter(opts = {}) {
  return createServerAuthorityAdapter({ day: Number(opts.day || 1), period: opts.period || '上午', gold: Number(opts.gold ?? 8), playerId: opts.playerId || 'p1', allowDebugCommands: true });
}
function sessionIdFromReq(req, url = new URL(req.url, 'http://localhost')) {
  return req.headers['x-session-id'] || url.searchParams.get('sessionId') || DEFAULT_SESSION_ID;
}
function getSession(req, url) {
  const id = sessionIdFromReq(req, url);
  if (!sessions.has(id)) sessions.set(id, createAdapter({ playerId: req.headers['x-player-id'] || 'p1' }));
  return { id, adapter: sessions.get(id) };
}
function replaceSession(id, opts = {}) {
  const adapter = createAdapter(opts);
  sessions.set(id || DEFAULT_SESSION_ID, adapter);
  return adapter;
}

function send(res, status, content, type = 'application/json; charset=utf-8') {
  res.writeHead(status, { 'content-type': type, 'cache-control': 'no-store' });
  res.end(content);
}
function json(res, status, payload, sessionId) {
  if (sessionId) payload.sessionId = sessionId;
  send(res, status, JSON.stringify(payload, null, 2));
}
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
  send(res, 200, fs.readFileSync(full), type);
}
async function handleApi(req, res) {
  const url = new URL(req.url, 'http://localhost');
  const sessionId = sessionIdFromReq(req, url);
  try {
    if (req.method === 'GET' && url.pathname === '/api/health') return json(res, 200, { ok: true, status: 'ok', sessions: sessions.size }, sessionId);
    if (req.method === 'POST' && url.pathname === '/api/session/new') {
      const body = await readBody(req);
      const id = body.sessionId || sessionId || `session_${Date.now()}`;
      const playerId = body.playerId || playerIdFromReq(req, url);
      const adapter = replaceSession(id, Object.assign({}, body, { playerId }));
      return json(res, 200, { ok: true, viewModel: adapter.getViewModel(playerId) }, id);
    }
    const sess = getSession(req, url);
    const adapter = sess.adapter;
    const playerId = playerIdFromReq(req, url);
    if (req.method === 'GET' && url.pathname === '/api/view') return json(res, 200, { ok: true, viewModel: adapter.getViewModel(playerId) }, sess.id);
    if (req.method === 'GET' && url.pathname === '/api/state/snapshot') return json(res, 200, { ok: true, snapshot: adapter.getStateSnapshot(playerId) }, sess.id);
    if (req.method === 'GET' && url.pathname === '/api/report') return json(res, 200, { ok: true, report: adapter.getTextReport(url.searchParams.get('mode') || 'player') }, sess.id);
    if (req.method === 'GET' && url.pathname === '/api/data/summary') return json(res, 200, { ok: true, summary: adapter.getDataSummary(), shopPools: adapter.getShopPools(), rewardPools: adapter.getRewardPools() }, sess.id);
    if (req.method === 'GET' && url.pathname === '/api/save') return json(res, 200, { ok: true, save: adapter.exportSave(playerId, { sessionId: sess.id }) }, sess.id);
    if (req.method === 'POST' && url.pathname === '/api/load') {
      const body = await readBody(req);
      const save = body.save || body;
      const loaded = adapter.importSave(save, playerId);
      return json(res, 200, loaded, sess.id);
    }
    if (req.method === 'POST' && url.pathname === '/api/action') {
      const body = await readBody(req);
      if (!body.playerId) body.playerId = playerId;
      if (body.type === 'NEW_GAME') {
        const fresh = replaceSession(sess.id, Object.assign({}, body, { playerId }));
        return json(res, 200, { ok: true, command: 'NEW_GAME', viewModel: fresh.getViewModel(playerId) }, sess.id);
      }
      const result = adapter.run(body);
      return json(res, 200, result, sess.id);
    }
    return json(res, 404, { ok: false, error: `unknown api: ${req.method} ${url.pathname}` }, sessionId);
  } catch (err) {
    return json(res, 400, { ok: false, error: err.message || String(err) }, sessionId);
  }
}
const server = http.createServer((req, res) => {
  if (req.url.startsWith('/api/')) return handleApi(req, res);
  return staticFile(req, res);
});
const port = Number(process.env.PORT || process.argv[2] || 4173);
server.listen(port, '127.0.0.1', () => {
  console.log(`YSBZS UI connected: http://127.0.0.1:${port}`);
  console.log('New UI shell -> per-session /api/* -> serverAuthorityAdapter(strict version) -> core reducer/event log');
});
module.exports = { server, sessions, getSession, replaceSession };
