#!/usr/bin/env node
const assert = require('assert');

const tests = [];
function test(name, fn) {
  tests.push({ name, fn });
}

test('loader exposes ysbzs replay and action hooks', () => {
  const { loadYsbzsGame } = require('../core/game-script-loader');
  const game = loadYsbzsGame();
  assert.strictEqual(typeof game.context.initGame, 'function');
  assert.strictEqual(typeof game.context.dispatchGameAction, 'function');
  assert.strictEqual(typeof game.context.snapshotCoreStateForReplay, 'function');
  assert.strictEqual(typeof game.context.applyReplaySnapshot, 'function');
  assert.strictEqual(typeof game.context.buildReplayFinalResult, 'function');
});

test('loader starts a fresh game and computes a replay result', () => {
  const { loadYsbzsGame } = require('../core/game-script-loader');
  const game = loadYsbzsGame();
  game.context.initGame();
  const result = game.context.buildReplayFinalResult();
  assert.strictEqual(result.phase, 'PLAYER');
  assert.strictEqual(result.day, 1);
  assert.ok(result.hash);
});

async function main() {
  let pass = 0;
  let fail = 0;
  for (const t of tests) {
    try {
      await t.fn();
      pass++;
      console.log(`ok - ${t.name}`);
    } catch (e) {
      fail++;
      console.error(`not ok - ${t.name}`);
      console.error(e.stack || e.message);
    }
  }
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
}

main();
