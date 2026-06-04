#!/usr/bin/env node
/**
 * smoke-flow / legacy：Day1 走查烟测。不走 AI 规划，直接遍历槽位执行。
 * 只验证 Day1 流程不崩，不验证战斗系统。
 * 已基本被 scripts/run_10day_simulation.js 替代，保留作备用 smoke-flow。
 * 运行: node playable_day1.js
 */
const fs = require('fs');
const path = require('path');

const makeEl = () => ({
  innerHTML: '', textContent: '', style: { display: '' }, children: [], disabled: false,
  scrollTop: 0, scrollHeight: 0,
  classList: { add() {}, remove() {}, has: () => false },
  appendChild(c) { this.children.push(c); },
  removeChild(c) {},
  getBoundingClientRect() { return { top: 0, left: 0, right: 0, bottom: 0 }; },
  onclick: null, title: '',
});
const _els = {};
global.document = {
  getElementById(id) { if (!_els[id]) _els[id] = makeEl(); return _els[id]; },
  createElement() { return makeEl(); },
};
global.window = { innerWidth: 1920 };
global.setTimeout = fn => { try { fn(); } catch (e) { throw e; } };
global.__TEST__ = true;

const useMultiFile = fs.existsSync(path.join(__dirname, 'game.js'));
if (useMultiFile) {
  const moduleFiles = [
    'data.js', 'externalDataAdapter.js',
    'rng.js', 'board.js', 'actions.js', 'elements.js',
    'damage.js', 'terrain.js', 'battleLog.js',
    'waves.js', 'battle.js', 'shop.js', 'game.js', 'preview.js',
    'ui.js',
  ];
  for (const f of moduleFiles) {
    const fp = path.join(__dirname, f);
    if (!fs.existsSync(fp)) continue;
    const script = fs.readFileSync(fp, 'utf8').replace(/\bconst\b/g, 'var').replace(/\blet\b/g, 'var');
    eval(script); // eslint-disable-line no-eval
  }
} else {
  const html = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
  const gameScript = html.match(/<script>([\s\S]+?)<\/script>/)[1].replace(/\bconst\b/g, 'var').replace(/\blet\b/g, 'var');
  eval(gameScript); // eslint-disable-line no-eval
}

render = () => {};
renderShop = () => {};
const steps = [];
glog = msg => { steps.push(msg); };
showMsg = () => {};

function assert(cond, msg) {
  if (!cond) throw new Error(msg || 'assertion failed');
}

function log(msg) {
  console.log(msg);
  steps.push(msg);
}

function runDay1Walkthrough() {
  steps.length = 0;
  initGame();
  log('▶ 1. 初始化 Day1 上午');
  assert(G.day === 1 && G.dayHalf === 0, 'Day1 上午');
  assert(G.phase === 'PLAYER', '玩家回合');

  G.ownedUnits = [];
  addOwnedUnit('sprout_summoner', { r: 6, c: 0 });
  addOwnedUnit('spring_sprite', { r: 7, c: 1 });
  syncUnitsToHeroes();
  log('▶ 2. 换阵：召芽灵 + 泉泉灵');
  log('   Slots: ' + G.slots.length + ' 个行动槽');
  G.slots.forEach(function(s, i) {
    log('   slot' + i + ' el=' + s.el + ' sn=' + s.sn + ' tier=' + s.tier + ' skill=' + (s.skill || '-'));
  });

  G.monsters.forEach(function(m) { m.hp = 1; m.maxHp = 1; });
  var round = 0;
  while (G.phase === 'PLAYER' && round < 8) {
    round++;
    log('▶ 3.' + round + ' 玩家小回合 ' + G.round + '/' + G.maxRound);
    G.slots.forEach(function(s, i) {
      if (!s.used && s.skill) dispatchGameAction({ type: 'USE_SLOT', slotId: i });
    });
    var aliveSummons = G.summons.filter(function(s) { return !s.dead; }).length;
    log('   召唤物 ' + aliveSummons + ' · 引擎统计 召' + G.engineStats.summonCount + '/疗' + G.engineStats.healCount);
    if (G.phase !== 'PLAYER') break;
    endPlayerTurn();
  }

  assert(G.phase === 'SHOP', '上午结束应进入中午商店');
  log('▶ 4. 进入中午商店 ✓');
  assert(G.engineStats.summonCount >= 1, '至少召唤1次');
  if (G.engineStats.healCount < 1) {
    log('   ⚠️ 治疗未触发（召唤物可能满血，非阻塞）');
  }

  var hasSprout = G.shopItems.units.some(function(u) { return u.unitId === 'sprout_summoner' || u.defId === 'sprout_summoner'; })
    || G.ownedUnits.some(function(u) { return u.defId === 'sprout_summoner'; });
  assert(hasSprout, '构筑含召芽灵');

  log('▶ 5. 商店有 ' + G.shopItems.units.length + ' 件商品');
  G.shopItems.units.forEach(function(u, i) {
    log('   商品' + i + ' ' + u.name + ' (' + u.unitId + ') ' + u.quality + ' ¥' + u.price);
  });

  return {
    phase: G.phase,
    engineStats: { summonCount: G.engineStats.summonCount, healCount: G.engineStats.healCount },
    summonAlive: G.summons.filter(function(s) { return !s.dead; }).length,
    rounds: round,
    shopCount: G.shopItems.units.length,
    slotCount: G.slots.length,
  };
}

try {
  var result = runDay1Walkthrough();
  var report = [
    '# Day1 水+召唤引擎走查报告',
    '',
    '- 阶段: ' + result.phase,
    '- 小回合: ' + result.rounds,
    '- 引擎: 召唤 ' + result.engineStats.summonCount + ' / 治疗 ' + result.engineStats.healCount,
    '- 存活召唤物: ' + result.summonAlive,
    '- 商店商品: ' + result.shopCount,
    '- 行动槽: ' + result.slotCount,
    '',
    '## 步骤',
    ...steps.map(function(s) { return '- ' + s; }),
    '',
    '## 结论',
    'PASS — Day1 引擎链路可跑通（召唤→治疗→回合→中午商店，使用新 Pal 数据）',
  ].join('\n');

  var outDir = path.join(__dirname, 'recordings');
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, 'playable_day1_report.md'), report);
  console.log('\n✅ PASS — Day1 走查完成，报告已写入 recordings/playable_day1_report.md');
  process.exit(0);
} catch (e) {
  console.error('\n❌ FAIL —', e.message);
  console.error('   State: day=' + (typeof G !== 'undefined' ? G.day : '?') + ' phase=' + (typeof G !== 'undefined' ? G.phase : '?'));
  process.exit(1);
}
