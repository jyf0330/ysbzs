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
  assert.strictEqual(typeof game.context.G, 'object');
  assert.strictEqual(typeof game.context.render, 'function');
  assert.strictEqual(typeof game.context.renderShop, 'function');
  assert.strictEqual(typeof game.context.glog, 'function');
  assert.strictEqual(typeof game.context.showMsg, 'function');
  assert.strictEqual(typeof game.context.buildRunEndVM, 'function');
  assert.strictEqual(typeof game.context.recomputeCorePreview, 'function');
});

test('script extraction preserves declarations and supports script attributes', () => {
  const { extractGameScript } = require('../core/game-script-loader');
  const html = '<script data-main="true">const a = 1; let b = 2;</script>';
  const script = extractGameScript(html);
  assert.match(script, /const a = 1/);
  assert.match(script, /let b = 2/);
  assert.doesNotMatch(script, /\bvar a\b/);
  assert.doesNotMatch(script, /\bvar b\b/);
});

test('loader exports battle trace functions from VM sandbox', () => {
  const { loadYsbzsGame } = require('../core/game-script-loader');
  const game = loadYsbzsGame();
  // VM 沙箱必须能访问 battleTrace.js 导出的核心函数
  assert.strictEqual(typeof game.context.initBattleTrace, 'function', 'initBattleTrace should be exported');
  assert.strictEqual(typeof game.context.recordTrace, 'function', 'recordTrace should be exported');
  assert.strictEqual(typeof game.context.generateBattleTextReport, 'function', 'generateBattleTextReport should be exported');
  assert.strictEqual(typeof game.context.exportBattleTrace, 'function', 'exportBattleTrace should be exported');
});

test('battleTrace survives initGame and battle produces events', () => {
  const { loadYsbzsGame } = require('../core/game-script-loader');
  const game = loadYsbzsGame();
  game.context.initGame();
  const G = game.context.G;
  // initGame 后 battleTrace 数组存在
  assert.ok(Array.isArray(G.battleTrace), 'G.battleTrace should be an array');
  assert.strictEqual(G.battleTrace.length, 0, 'battleTrace should be empty after init');
  // 触发一次真实战斗入口
  if (typeof game.context.runAiBattleTurn_sync === 'function') {
    game.context.runAiBattleTurn_sync({ endTurn: true });
  } else if (typeof game.context.execAllHeroSlots === 'function') {
    game.context.execAllHeroSlots();
    if (typeof game.context.endPlayerTurn === 'function') game.context.endPlayerTurn();
  }
  // 战斗后应产生 trace 事件
  assert.ok(G.battleTrace.length > 0, 'battle after initGame should produce trace events (got ' + G.battleTrace.length + ')');
  // exportBattleTrace 输出合法 JSON
  const json = game.context.exportBattleTrace();
  const parsed = JSON.parse(json);
  assert.ok(Array.isArray(parsed));
  assert.strictEqual(parsed.length, G.battleTrace.length);
  // generateBattleTextReport 返回非空字符串
  const report = game.context.generateBattleTextReport(G.battleTrace);
  assert.strictEqual(typeof report, 'string');
  assert.ok(report.length > 0, 'text report should not be empty');
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

test('loader instances keep isolated game state', () => {
  const { loadYsbzsGame } = require('../core/game-script-loader');
  const first = loadYsbzsGame();
  const second = loadYsbzsGame();

  first.context.initGame();
  second.context.initGame();
  first.context.G.day = 7;
  first.context.G.gold = 99;

  assert.strictEqual(first.context.G.day, 7);
  assert.strictEqual(first.context.G.gold, 99);
  assert.strictEqual(second.context.G.day, 1);
  assert.notStrictEqual(first.context.G, second.context.G);
});

test('trace recorder stores steps and serializes jsonl', () => {
  const { TraceRecorder } = require('../core/trace-recorder');
  const recorder = new TraceRecorder('case-a');
  recorder.record({ step: 0, action: { type: 'USE_SLOT', slotId: 0 }, result: { phase: 'PLAYER' }, errors: [] });
  recorder.record({ step: 1, action: { type: 'END_PLAYER_TURN' }, result: { phase: 'MONSTER' }, errors: [] });
  const jsonl = recorder.toJSONL();
  const lines = jsonl.trim().split('\n').map(line => JSON.parse(line));
  assert.strictEqual(lines.length, 2);
  assert.strictEqual(lines[0].scenarioId, 'case-a');
  assert.strictEqual(lines[1].action.type, 'END_PLAYER_TURN');
});

test('report writer renders scenario verdict and metrics', () => {
  const { renderMarkdownReport } = require('../core/report-writer');
  const md = renderMarkdownReport({
    scenario: { id: 'case-a', agent: 'script-day1' },
    verdict: 'PASS',
    steps: [{}, {}],
    evaluatorResults: [{ name: 'GoalEvaluator', verdict: 'PASS', messages: ['phaseIs SHOP'] }],
    outputFiles: { trace: 'ai-eval/reports/case-a.trace.jsonl' },
  });
  assert.ok(md.includes('# Evaluation Report: case-a'));
  assert.ok(md.includes('Verdict: PASS'));
  assert.ok(md.includes('GoalEvaluator'));
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
