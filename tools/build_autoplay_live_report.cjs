#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');
const { createYSBZSUIAdapter } = require('../src/uiAdapter.cjs');

const DEFAULT_OUTPUT_DIR = path.join(__dirname, '..', 'outputs', 'autoplay-live-report-20260703');
const DEFAULT_AUTOPLAY_OPTIONS = Object.freeze({
  seed: 'autoplay-live-report',
  fromDay: 1,
  toDay: 10,
  gold: 999,
  playerLeader: { hp: 999, maxHp: 999 }
});

function clone(value) {
  return value == null ? value : JSON.parse(JSON.stringify(value));
}

function md(value) {
  return String(value ?? '').replace(/\|/g, '\\|').replace(/\n/g, ' ');
}

function parseArgs(argv = process.argv.slice(2)) {
  const options = {};
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--seed') options.seed = argv[++i];
    else if (arg === '--from-day') options.fromDay = Number(argv[++i]);
    else if (arg === '--to-day') options.toDay = Number(argv[++i]);
    else if (arg === '--gold') options.gold = Number(argv[++i]);
    else if (arg === '--hero-hp') {
      const hp = Number(argv[++i]);
      options.playerLeader = Object.assign({}, options.playerLeader || {}, { hp, maxHp: hp });
    } else if (arg === '--output-dir') options.outputDir = argv[++i];
    else if (arg === '--normal-start') {
      options.gold = undefined;
      options.playerLeader = undefined;
    } else if (arg === '--help' || arg === '-h') {
      options.help = true;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }
  return options;
}

function usage() {
  return [
    'Usage: node tools/build_autoplay_live_report.cjs [options]',
    '',
    'Options:',
    '  --seed <seed>          RNG seed, default autoplay-live-report',
    '  --from-day <n>         Start day, default 1',
    '  --to-day <n>           End day, default 10',
    '  --gold <n>             Starting gold, default 999',
    '  --hero-hp <n>          Player leader hp/maxHp, default 999',
    '  --normal-start         Use normal starting gold/hp instead of the 10-day verification setup',
    '  --output-dir <path>    Output directory',
    ''
  ].join('\n');
}

function normalizeOptions(raw = {}) {
  const merged = Object.assign({}, DEFAULT_AUTOPLAY_OPTIONS, raw);
  if (raw.gold === undefined && raw.playerLeader === undefined && raw.normalStart) {
    delete merged.gold;
    delete merged.playerLeader;
  }
  return {
    seed: merged.seed || DEFAULT_AUTOPLAY_OPTIONS.seed,
    fromDay: Number(merged.fromDay || DEFAULT_AUTOPLAY_OPTIONS.fromDay),
    toDay: Number(merged.toDay || DEFAULT_AUTOPLAY_OPTIONS.toDay),
    gold: merged.gold,
    playerLeader: merged.playerLeader ? clone(merged.playerLeader) : undefined,
    outputDir: merged.outputDir || DEFAULT_OUTPUT_DIR
  };
}

function inferEventDay(event, currentDay) {
  if (Number.isFinite(Number(event.day))) return Number(event.day);
  const text = event.text || '';
  const match = text.match(/第(\d+)天/);
  if (match) return Number(match[1]);
  return currentDay || null;
}

function groupEventsByDay(events) {
  const grouped = new Map();
  let currentDay = null;
  for (const event of events || []) {
    currentDay = inferEventDay(event, currentDay);
    const key = currentDay || 0;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key).push(event);
  }
  return grouped;
}

function eventText(event) {
  return event.text || event.type || 'UNKNOWN_EVENT';
}

function renderEventLine(event) {
  const round = Number.isFinite(Number(event.round)) && Number(event.round) > 0 ? ` R${event.round}` : '';
  return `- #${String(event.step ?? '?').padStart(3, '0')}${round} [${event.type || 'EVENT'}] ${eventText(event)}`;
}

function renderNodeHistory(item, index) {
  const option = item.option || {};
  if (item.kind === 'fixed_battle') {
    const outcome = item.outcome || {};
    return `${index}. 固定战：${option.name || option.encounterId || '未知战斗'}，结果 ${outcome.resultCode || '-'} / ${outcome.grade || '-'}，金币 ${outcome.goldFrom ?? '?'}→${outcome.goldTo ?? '?'}，主角 HP ${outcome.playerHeroHpFrom ?? '?'}→${outcome.playerHeroHpTo ?? '?'}`;
  }
  if (option.nodeType === 'shop') {
    const stall = item.stall || {};
    return `${index}. 商店：${option.name || option.nodeId}，池 ${option.shopPoolId || stall.shopPoolId || '-'}，标签 ${(stall.tags || option.choicePreview?.tags || []).join('/') || '-'}`;
  }
  if (option.nodeType === 'reward') {
    return `${index}. 奖励：${option.name || option.nodeId}，池 ${option.rewardPoolId || '-'}，${option.choicePreview?.summary || ''}`.trim();
  }
  return `${index}. 节点：${option.name || option.nodeId || item.kind || '未知'}，类型 ${option.nodeType || item.kind || '-'}`;
}

function renderRunSummaryTable(runs) {
  const lines = [
    '| Day | 阶段 | 节点 | 战斗 | 金币 | 背包 | 遗物 | 构筑核心 |',
    '|---:|---|---:|---:|---|---|---|---|'
  ];
  for (const run of runs || []) {
    const economy = run.economy || {};
    const construction = run.construction || {};
    lines.push(`| ${run.day} | ${md(run.phase)} | ${run.nodeIndex ?? '-'} | ${run.battleIndex ?? '-'} | ${economy.goldFrom ?? '?'} -> ${economy.goldTo ?? '?'} | ${construction.inventoryFrom ?? '?'} -> ${construction.inventoryCount ?? '?'} | ${construction.relicFrom ?? '?'} -> ${construction.relicCount ?? '?'} | ${md(construction.buildCore?.summaryText || '尚未形成')} |`);
  }
  return lines.join('\n');
}

function renderAutoplayLiveReport(run) {
  const { options, commandResult, finalViewModel, events, textReport } = run;
  const grouped = groupEventsByDay(events);
  const runs = finalViewModel.dayRouteRuns || commandResult.result?.dayRouteRuns || [];
  const terminal = finalViewModel.dayRoute?.terminal || commandResult.result?.terminal || null;
  const lines = [];
  lines.push('# 自动机器人实况全流程战报');
  lines.push('');
  lines.push(`生成时间：${run.generatedAt}`);
  lines.push('');
  lines.push('## 运行配置');
  lines.push('');
  lines.push(`- 命令：RUN_FULL_RUN`);
  lines.push(`- Seed：${options.seed}`);
  lines.push(`- 天数：Day${options.fromDay} -> Day${options.toDay}`);
  lines.push(`- 初始金币：${options.gold ?? '默认'}`);
  lines.push(`- 主角 HP：${options.playerLeader ? `${options.playerLeader.hp}/${options.playerLeader.maxHp}` : '默认'}`);
  lines.push(`- 说明：这是自动机器人验收配置；用于确认流程能完整跑到 Day10，不等同于默认开局平衡结论。`);
  lines.push('');
  lines.push('## 执行结果');
  lines.push('');
  lines.push(`- accepted：${commandResult.accepted === false ? 'false' : 'true'}`);
  lines.push(`- 最终天数：Day${finalViewModel.day}`);
  lines.push(`- 最终阶段：${finalViewModel.phase}`);
  lines.push(`- 自动执行天数：${runs.length}`);
  lines.push(`- 事件数：${events.length}`);
  if (terminal) {
    lines.push(`- 终局：${terminal.name || terminal.kind || '-'}，${terminal.status || '-'}，${terminal.resultCode || '-'} / ${terminal.grade || '-'}`);
  }
  lines.push('');
  lines.push('## 每日摘要');
  lines.push('');
  lines.push(renderRunSummaryTable(runs));
  lines.push('');
  for (const runDay of runs) {
    const day = Number(runDay.day);
    const dayEvents = grouped.get(day) || [];
    lines.push(`## 第 ${day} 天实况`);
    lines.push('');
    const economy = runDay.economy || {};
    const construction = runDay.construction || {};
    lines.push(`- 当日结果：${runDay.phase}，节点 ${runDay.nodeIndex ?? '-'}，战斗 ${runDay.battleIndex ?? '-'}`);
    lines.push(`- 金币：${economy.goldFrom ?? '?'} -> ${economy.goldTo ?? '?'}，变化 ${economy.goldDelta ?? '?'}`);
    lines.push(`- 背包：${construction.inventoryFrom ?? '?'} -> ${construction.inventoryCount ?? '?'}，遗物：${construction.relicFrom ?? '?'} -> ${construction.relicCount ?? '?'}`);
    lines.push(`- 构筑核心：${construction.buildCore?.summaryText || '尚未形成'}`);
    if (runDay.terminal) lines.push(`- 当日终局：${runDay.terminal.name || runDay.terminal.kind}，${runDay.terminal.status || '-'}，${runDay.terminal.resultCode || '-'} / ${runDay.terminal.grade || '-'}`);
    lines.push('');
    lines.push('### 路线与关键结果');
    lines.push('');
    if ((runDay.history || []).length) {
      for (let i = 0; i < runDay.history.length; i += 1) lines.push(renderNodeHistory(runDay.history[i], i + 1));
    } else {
      lines.push('无路线历史。');
    }
    lines.push('');
    lines.push('### 机器人事件流水');
    lines.push('');
    if (dayEvents.length) {
      for (const event of dayEvents) lines.push(renderEventLine(event));
    } else {
      lines.push('无事件。');
    }
    lines.push('');
  }
  lines.push('## 原始玩家战报摘要');
  lines.push('');
  lines.push('```text');
  lines.push(textReport || '');
  lines.push('```');
  lines.push('');
  return lines.join('\n');
}

function runAutoplayLiveReport(rawOptions = {}) {
  const options = normalizeOptions(rawOptions);
  const adapterOptions = {
    day: options.fromDay,
    seed: options.seed,
    gold: options.gold,
    playerLeader: options.playerLeader
  };
  const adapter = createYSBZSUIAdapter(adapterOptions);
  const commandPayload = {
    fromDay: options.fromDay,
    toDay: options.toDay,
    seed: options.seed,
    gold: options.gold,
    playerLeader: options.playerLeader
  };
  const commandResult = adapter.run('RUN_FULL_RUN', commandPayload);
  const finalViewModel = commandResult.viewModel || adapter.getViewModel();
  const events = adapter.getEvents();
  const textReport = adapter.getTextReport('player');
  const generatedAt = new Date().toISOString();
  const run = {
    generatedAt,
    options: clone(options),
    command: clone(commandPayload),
    commandResult: clone(commandResult),
    finalViewModel: clone(finalViewModel),
    events: clone(events),
    textReport
  };
  run.markdown = renderAutoplayLiveReport(run);
  return run;
}

function writeAutoplayLiveReport(run, outputDir = DEFAULT_OUTPUT_DIR) {
  fs.mkdirSync(outputDir, { recursive: true });
  const markdownPath = path.join(outputDir, 'autoplay_live_report.md');
  const jsonPath = path.join(outputDir, 'autoplay_live_report.json');
  fs.writeFileSync(markdownPath, run.markdown, 'utf8');
  fs.writeFileSync(jsonPath, JSON.stringify({
    generatedAt: run.generatedAt,
    options: run.options,
    command: run.command,
    commandResult: run.commandResult,
    finalViewModel: run.finalViewModel,
    events: run.events
  }, null, 2), 'utf8');
  return { outputDir, markdownPath, jsonPath };
}

function main() {
  const args = parseArgs();
  if (args.help) {
    process.stdout.write(usage());
    return;
  }
  const normalStart = process.argv.includes('--normal-start');
  const run = runAutoplayLiveReport(Object.assign({}, args, { normalStart }));
  const files = writeAutoplayLiveReport(run, run.options.outputDir);
  process.stdout.write(`Wrote autoplay live report: ${files.outputDir}\n`);
  process.stdout.write(`Result: day=${run.finalViewModel.day}, phase=${run.finalViewModel.phase}, events=${run.events.length}\n`);
  if (run.finalViewModel.dayRoute?.terminal) {
    const terminal = run.finalViewModel.dayRoute.terminal;
    process.stdout.write(`Terminal: ${terminal.name || terminal.kind} ${terminal.status || ''} ${terminal.resultCode || ''}/${terminal.grade || ''}\n`);
  }
}

if (require.main === module) main();

module.exports = {
  DEFAULT_AUTOPLAY_OPTIONS,
  DEFAULT_OUTPUT_DIR,
  groupEventsByDay,
  normalizeOptions,
  renderAutoplayLiveReport,
  runAutoplayLiveReport,
  writeAutoplayLiveReport
};
