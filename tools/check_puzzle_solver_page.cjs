#!/usr/bin/env node
const { spawn } = require('child_process');
const path = require('path');

const port = Number(process.env.CHECK_PUZZLE_SOLVER_PAGE_PORT || 4192);
const base = `http://127.0.0.1:${port}`;

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

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

async function text(pathname) {
  const res = await fetch(`${base}${pathname}`);
  assert(res.ok, `${pathname} returned ${res.status}`);
  return res.text();
}

async function json(pathname) {
  const res = await fetch(`${base}${pathname}`);
  assert(res.ok, `${pathname} returned ${res.status}`);
  return res.json();
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
    const html = await text('/puzzle-solver.html');
    const css = await text('/puzzle-solver.css');
    const js = await text('/js/puzzle-solver.js');
    const index = await text('/');
    const api = await json('/api/puzzle/solve-demo?count=1');

    assert(html.includes('谜题求解器实验台'), 'solver page title missing');
    assert(html.includes('id="solver-board"'), 'board anchor missing');
    assert(html.includes('id="solve-btn"'), 'solve button missing');
    assert(html.includes('id="proof-output"'), 'proof output missing');
    assert(html.includes('src="js/puzzle-solver.js"') && !html.includes('type="module" src="js/puzzle-solver.js"'), 'solver page should support file:// loading');
    assert(css.includes('.solver-board') && css.includes('aspect-ratio: 1'), 'board layout styles missing');
    assert(js.includes('/api/puzzle/solve-demo') && js.includes('stateHash') && js.includes('renderBoard'), 'solver page logic missing API/hash/board rendering');
    assert(index.includes('puzzle-solver.html'), 'main page should link to puzzle solver page');
    assert(api.ok === true && api.candidates && api.candidates[0], 'solver API should return a candidate');
    assert(api.candidates[0].solve.status === 'solved', 'solver API candidate should be solved');
    assert(api.candidates[0].solve.solutionCount === 1, 'solver API candidate should be unique');
    console.log('PASS puzzle solver page static/API checks');
  } finally {
    child.kill('SIGTERM');
    await sleep(100);
    if (child.exitCode === null) child.kill('SIGKILL');
  }
}

main().catch(err => {
  console.error(err.stack || err.message || err);
  process.exit(1);
});
