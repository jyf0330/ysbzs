#!/usr/bin/env node
/**
 * Day1 水+召唤引擎 · 可玩性走查（纯逻辑，无需浏览器）
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

const html = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
const gameScript = html.match(/<script>([\s\S]+?)<\/script>/)[1].replace(/\bconst\b/g, 'var').replace(/\blet\b/g, 'var');
eval(gameScript); // eslint-disable-line no-eval

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
  addOwnedUnit('sprout_summoner', { r: 10, c: 1 });
  addOwnedUnit('spring_sprite', { r: 11, c: 1 });
  syncUnitsToHeroes();
  log('▶ 2. 换阵：召芽灵 + 泉泉灵');

  G.monsters.forEach(m => { m.hp = 1; m.maxHp = 1; });
  let round = 0;
  while (G.phase === 'PLAYER' && round < 8) {
    round++;
    log(`▶ 3.${round} 玩家小回合 ${G.round}/${G.maxRound}`);
    G.slots.forEach((s, i) => {
      if (!s.used && s.skill) dispatchGameAction({ type: 'USE_SLOT', slotId: i });
    });
    const aliveSummons = G.summons.filter(s => !s.dead).length;
    log(`   召唤物 ${aliveSummons} · 引擎统计 召${G.engineStats.summonCount}/疗${G.engineStats.healCount}`);
    if (G.phase !== 'PLAYER') break;
    endPlayerTurn();
  }

  assert(G.phase === 'SHOP', '上午结束应进入中午商店');
  log('▶ 4. 进入中午商店 ✓');
  assert(G.engineStats.summonCount >= 1, '至少召唤1次');
  assert(G.engineStats.healCount >= 1, '至少治疗1次');

  const hasSprout = G.shopItems.units.some(u => u.defId === 'sprout_summoner')
    || G.ownedUnits.some(u => u.defId === 'sprout_summoner');
  assert(hasSprout, '构筑含召芽灵');

  log('▶ 5. Day1 夜池验证');
  G.dayHalf = 2;
  openShop();
  assert(SHOP_POOLS.day1_night.includes('sprout_summoner'), 'Day1 夜池含召芽灵');

  return {
    phase: G.phase,
    engineStats: { ...G.engineStats },
    summonAlive: G.summons.filter(s => !s.dead).length,
    rounds: round,
  };
}

try {
  const result = runDay1Walkthrough();
  const report = [
    '# Day1 水+召唤引擎走查报告',
    '',
    `- 阶段: ${result.phase}`,
    `- 小回合: ${result.rounds}`,
    `- 引擎: 召唤 ${result.engineStats.summonCount} / 治疗 ${result.engineStats.healCount}`,
    `- 存活召唤物: ${result.summonAlive}`,
    '',
    '## 步骤',
    ...steps.map(s => `- ${s}`),
    '',
    '## 结论',
    'PASS — Day1 引擎链路可跑通（召唤→治疗→回合→中午商店）',
  ].join('\n');

  const outDir = path.join(__dirname, 'recordings');
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, 'playable_day1_report.md'), report);
  console.log('\n✅ PASS — 报告已写入 recordings/playable_day1_report.md');
  process.exit(0);
} catch (e) {
  console.error('\n❌ FAIL —', e.message);
  process.exit(1);
}
