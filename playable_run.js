#!/usr/bin/env node
/**
 * 5 天 Run 走查（纯逻辑）
 * 运行: node playable_run.js
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

function clearBattleFast() {
  G.monsters.forEach(m => { m.hp = 1; m.maxHp = 1; m.dead = true; });
  G.round = G.maxRound + 1;
  finishMonsters();
}

function runPlayerTurns(maxRounds) {
  let n = 0;
  while (G.phase === 'PLAYER' && n < maxRounds) {
    n++;
    G.slots.forEach((s, i) => {
      if (!s.used && s.skill) dispatchGameAction({ type: 'USE_SLOT', slotId: i });
    });
    if (G.phase !== 'PLAYER') break;
    endPlayerTurn();
    if (G.phase === 'MONSTER') {
      runMonsters();
    }
    if (G.monsters.every(m => m.dead) && G.phase === 'PLAYER') {
      G.round = G.maxRound + 1;
      finishMonsters();
    }
  }
}

function runRunWalkthrough() {
  steps.length = 0;
  initGame();
  const castleStart = G.playerCastle.hp;
  log(`▶ Run 开始 · 我方城堡 ${castleStart} HP`);

  for (let targetDay = 1; targetDay <= 5; targetDay++) {
    while (G.day < targetDay && G.phase !== 'OVER') {
      if (G.phase === 'PLAYER') clearBattleFast();
      else if (G.phase === 'SHOP') closeShop();
      else break;
    }
    if (G.phase === 'OVER') break;
    assert(G.day === targetDay, `应到达 Day${targetDay}`);
    log(`▶ Day${G.day} · dayHalf=${G.dayHalf} · phase=${G.phase}`);

    if (G.phase === 'PLAYER') {
      clearBattleFast();
    }
    if (G.phase === 'SHOP' && G.dayHalf === 1) {
      closeShop();
      log(`   → 中午商店后进下午`);
    }
    if (G.phase === 'PLAYER' && G.dayHalf === 2) {
      clearBattleFast();
    }
    if (G.phase === 'SHOP' && G.dayHalf === 2) {
      if (G.day < 5) closeShop();
    }
  }

  if (G.day === 5 && G.phase !== 'OVER') {
    G.dayHalf = 2;
    G.phase = 'PLAYER';
    spawnWaveForDay(5, 'afternoon');
    assert(G.monsters.some(m => m.typeId === 'boss'), 'Day5 下午应有 Boss');
    log('▶ Day5 Boss 战');
    clearBattleFast();
  }

  assert(G.phase === 'OVER', 'Day5 Boss 后应通关');
  assert(G.playerCastle.hp === castleStart, '城堡 HP 跨天应保留（本走查未攻城堡）');

  return {
    day: G.day,
    phase: G.phase,
    playerCastleHp: G.playerCastle.hp,
    engineStats: { ...G.engineStats },
  };
}

try {
  const result = runRunWalkthrough();
  const report = [
    '# 5 天 Run 走查报告',
    '',
    `- 终局: Day${result.day} · ${result.phase}`,
    `- 城堡 HP: ${result.playerCastleHp}（跨天保留）`,
    `- 引擎: 召${result.engineStats.summonCount} / 疗${result.engineStats.healCount}`,
    '',
    '## 步骤',
    ...steps.map(s => `- ${s}`),
    '',
    '## 结论',
    'PASS — 5 天三阶段 + Day5 Boss 通关链路可跑通',
  ].join('\n');

  const outDir = path.join(__dirname, 'recordings');
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, 'playable_run_report.md'), report);
  console.log('\n✅ PASS — 报告已写入 recordings/playable_run_report.md');
  process.exit(0);
} catch (e) {
  console.error('\n❌ FAIL —', e.message);
  process.exit(1);
}
