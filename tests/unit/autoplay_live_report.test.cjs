const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {
  groupEventsByDay,
  renderAutoplayLiveReport,
  runAutoplayLiveReport,
  writeAutoplayLiveReport
} = require('../../tools/build_autoplay_live_report.cjs');

test('autoplay live report runs RUN_FULL_RUN and renders a day 1-10 transcript', () => {
  const run = runAutoplayLiveReport({
    seed: 'autoplay-report-test',
    fromDay: 1,
    toDay: 10,
    gold: 999,
    playerLeader: { hp: 999, maxHp: 999 }
  });

  assert.equal(run.commandResult.accepted, true);
  assert.equal(run.commandResult.command, 'RUN_FULL_RUN');
  assert.equal(run.finalViewModel.day, 10);
  assert.equal(run.finalViewModel.phase, 'day_end');
  assert.equal(run.finalViewModel.dayRouteRuns.length, 10);
  assert.ok(run.events.length > 100, 'live report should be backed by the actual event stream');
  assert.ok(run.events.some(event => event.type === 'NODE_PICK'));
  assert.ok(run.events.some(event => event.type === 'BATTLE_START'));
  assert.ok(run.events.some(event => event.type === 'RUN_TERMINAL'));
  const grouped = groupEventsByDay(run.events);
  assert.equal(grouped.get(1).some(event => /第2天/.test(event.text || '')), false, 'day 1 transcript must not swallow day 2 events');
  assert.ok(grouped.get(10).some(event => event.type === 'RUN_TERMINAL'), 'day 10 transcript should contain the terminal event');

  assert.match(run.markdown, /# 自动机器人实况全流程战报/);
  assert.match(run.markdown, /命令：RUN_FULL_RUN/);
  assert.match(run.markdown, /机器人验收配置/);
  assert.match(run.markdown, /## 第 1 天实况/);
  assert.match(run.markdown, /## 第 10 天实况/);
  assert.match(run.markdown, /选择节点/);
  assert.match(run.markdown, /终局/);
});

test('normal start evidence remains separate from the 10-day verification setup', () => {
  const run = runAutoplayLiveReport({
    seed: 'autoplay-report-normal-start',
    fromDay: 1,
    toDay: 10,
    normalStart: true
  });

  assert.equal(run.commandResult.accepted, true);
  assert.equal(run.finalViewModel.phase, 'game_over');
  assert.ok(run.finalViewModel.day < 10, 'normal current balance should not be mislabeled as a complete 10-day run');
  assert.match(run.markdown, /主角 HP：默认/);
});

test('autoplay live report groups events by inferred day and writes artifacts', () => {
  const grouped = groupEventsByDay([
    { step: 1, type: 'NODE_OPTIONS', text: '第1天节点1：宠物奖励。' },
    { step: 2, type: 'NODE_PICK', text: '选择节点：宠物奖励。' },
    { step: 3, type: 'BATTLE_START', day: 2, text: '第2天上午战斗开始。' }
  ]);
  assert.equal(grouped.get(1).length, 2);
  assert.equal(grouped.get(2).length, 1);

  const run = runAutoplayLiveReport({
    seed: 'autoplay-report-write',
    fromDay: 1,
    toDay: 10,
    gold: 999,
    playerLeader: { hp: 999, maxHp: 999 }
  });
  const rendered = renderAutoplayLiveReport(run);
  assert.equal(rendered, run.markdown);

  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ysbzs-autoplay-report-'));
  const files = writeAutoplayLiveReport(run, dir);
  assert.ok(fs.existsSync(files.markdownPath));
  assert.ok(fs.existsSync(files.jsonPath));
  assert.match(fs.readFileSync(files.markdownPath, 'utf8'), /自动机器人实况全流程战报/);
  const json = JSON.parse(fs.readFileSync(files.jsonPath, 'utf8'));
  assert.equal(json.commandResult.command, 'RUN_FULL_RUN');
  assert.ok(Array.isArray(json.events));
});
