#!/usr/bin/env node
const { spawn } = require('child_process');
const path = require('path');

const port = Number(process.env.CHECK_PUZZLE_PAGE_PORT || 4191);
const base = `http://127.0.0.1:${port}`;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function waitServer(child) {
  for (let i = 0; i < 60; i += 1) {
    if (child.exitCode !== null) throw new Error(`ui server exited early: ${child.exitCode}`);
    try {
      const res = await fetch(`${base}/api/health`);
      if (res.ok) return;
    } catch (_) {}
    await sleep(100);
  }
  throw new Error('ui server did not start');
}

async function text(pathname) {
  const res = await fetch(`${base}${pathname}`);
  assert(res.ok, `${pathname} returned ${res.status}`);
  return res.text();
}

async function main() {
  const root = path.resolve(__dirname, '..');
  const child = spawn(process.execPath, ['tools/run_ui_server.cjs'], {
    cwd: root,
    env: Object.assign({}, process.env, { PORT: String(port) }),
    stdio: ['ignore', 'pipe', 'pipe']
  });
  child.stdout.resume();
  child.stderr.resume();
  try {
    await waitServer(child);
    const html = await text('/puzzle-submission.html');
    const css = await text('/puzzle-submission.css');
    const js = await text('/js/puzzle-submission.js');
    const index = await text('/');

    assert(html.includes('玩家谜题投稿器'), 'submission page title missing');
    assert(html.includes('id="puzzle-board"'), 'board editor anchor missing');
    assert(html.includes('id="raw-intent"'), 'natural language input missing');
    assert(html.includes('id="export-output"'), 'export output missing');
    assert(index.includes('puzzle-submission.html'), 'main page should link to puzzle submission page');
    assert(css.includes('.puzzle-board') && css.includes('.export-output'), 'page styles missing board/export surfaces');
    assert(js.includes('PET_POOL') && js.includes('buildPuzzle') && js.includes('validatePuzzle'), 'page logic missing data builder or validator');
    assert(js.includes('readablePost') && js.includes('checkReport'), 'export renderers missing');
    assert(!js.includes("from '../src") && !js.includes("from './src") && !js.includes('/api/action') && !js.includes('/api/view'), 'submission page must not import core or mutate runtime state');
    assert(html.includes('data-kind="boss"') && html.includes('data-kind="fire_element"') && html.includes('data-kind="fire_trap"'), 'placement palette incomplete');
    console.log('PASS puzzle submission page static checks');
  } finally {
    child.kill('SIGTERM');
    await sleep(100);
    if (child.exitCode === null) child.kill('SIGKILL');
  }
}

main().catch((err) => {
  console.error(err.stack || err.message || err);
  process.exit(1);
});
