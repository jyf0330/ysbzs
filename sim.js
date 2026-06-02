#!/usr/bin/env node
/**
 * 元素背包史 · 文字战斗模拟器
 * 使用 ai-eval VM loader + TraceRecorder
 * 运行：node sim.js [天数] [--trace=out.jsonl]
 */
const fs   = require('fs');
const path = require('path');
const { loadYsbzsGame } = require('./ai-eval/core/game-script-loader');
const { TraceRecorder } = require('./ai-eval/core/trace-recorder');

// ─── 参数解析 ───
let maxDays = 2;
let tracePath = null;
for (let i = 2; i < process.argv.length; i++) {
  if (process.argv[i].startsWith('--trace=')) {
    tracePath = process.argv[i].slice(8);
  } else {
    maxDays = parseInt(process.argv[i]) || 2;
  }
}

// ─── 加载游戏（VM sandbox） ───
const game = loadYsbzsGame({ rootDir: __dirname });
const ctx = game.context;

// 静默 UI
ctx.render = () => {};
ctx.renderShop = () => {};
ctx.showMsg = () => {};
ctx.glog = () => {};

const out = (...a) => process.stdout.write(a.join(' ') + '\n');
const recorder = new TraceRecorder('sim');

// ─── 初始化 ───
out('╔══════════════════════════════════╗');
out('║  元素背包史 · 文字战斗模拟器    ║');
out('╚══════════════════════════════════╝');
out('');

ctx.initGame();
out('');

// initGame 会创建新 G 对象，必须在 initGame 之后获取引用
const G = ctx.G;

// ─── 快照工具 ───
function snapHeroes() {
  const h = {};
  for (const [id, hero] of Object.entries(G.heroes || {})) {
    h[id] = { id, name: hero.name, hp: hero.hp, maxHp: hero.maxHp, pos: { ...hero.pos }, _acted: hero._acted };
  }
  return h;
}
function snapMonsters() {
  return (G.monsters || []).map(m => ({
    id: m.id, name: m.name, typeId: m.typeId,
    hp: m.hp, maxHp: m.maxHp, atk: m.atk,
    pos: { ...m.pos }, dead: m.dead, gold: m.gold,
  }));
}
function snapCastles() {
  return {
    player: { hp: G.playerCastle?.hp ?? 0, maxHp: G.playerCastle?.maxHp ?? 100 },
    enemy:  { hp: G.enemyCastle?.hp ?? 0,  maxHp: G.enemyCastle?.maxHp ?? 100 },
  };
}

recorder.record({
  step: 0, phase: 'INIT',
  action: { type: 'GAME_START' },
  result: { day: G.day, gold: G.gold, heroes: snapHeroes(), castles: snapCastles() },
});

// ─── 主循环 ───
let turn = 0;
let step = 1;

while (G.day <= maxDays && G.phase !== 'OVER') {
  turn++;

  if (G.phase === 'PLAYER') {
    out(`\n━━━ 第 ${turn} 回合 · D${G.day}${G.dayHalf ? '下午' : '早上'} R${G.round}/${G.maxRound} ━━━`);
    const heroes = Object.values(G.heroes).filter(h => h.hp > 0);
    heroes.forEach(h => out(`  🦸 ${h.name} HP=${h.hp}/${h.maxHp} (${h.pos.r},${h.pos.c}) ${h._acted ? '🔒' : ''}`));
    const alive = G.monsters.filter(m => !m.dead);
    out(`  👾 ${alive.length}只存活:`);
    alive.forEach(m => out(`     ${m.name} HP=${m.hp}/${m.maxHp} (${m.pos.r},${m.pos.c})`));

    const monstersBefore = alive.length;
    const castleHpBefore = G.playerCastle.hp;

    ctx.execAllHeroSlots();

    const slotsUsed = (G.slots || []).filter(s => s.used).map(s => ({
      id: s.id, el: s.el, sn: s.sn, tier: s.tier, dir: s.dir, hid: s.hid,
    }));
    recorder.record({
      step: step++, phase: 'PLAYER',
      action: { type: 'PLAYER_ACTIONS', slotsUsed },
      result: { heroes: snapHeroes(), monsters: snapMonsters() },
    });

    if (G.phase === 'PLAYER') ctx.endPlayerTurn();

    const monstersAfter = G.monsters.filter(m => !m.dead).length;
    const killed = monstersBefore - monstersAfter;
    const castleDmg = castleHpBefore - G.playerCastle.hp;

    recorder.record({
      step: step++, phase: 'SETTLE',
      action: { type: 'COMBAT_RESULT' },
      result: {
        monstersKilled: killed,
        castleDamageTaken: Math.max(0, castleDmg),
        heroes: snapHeroes(), monsters: snapMonsters(), castles: snapCastles(),
      },
    });

    out(`    → 击杀 ${killed} · 城堡 HP ${G.playerCastle.hp}`);
  }

  if (G.phase === 'SHOP') {
    out(`\n🏪 Day${G.day} 夜晚 · 金币: ${G.gold}`);
    recorder.record({
      step: step++, phase: 'SHOP',
      action: { type: 'SHOP_OPEN' },
      result: { gold: G.gold, day: G.day },
    });
    ctx.closeShop();
    recorder.record({
      step: step++, phase: 'SHOP',
      action: { type: 'SHOP_CLOSE' },
      result: { gold: G.gold, nextDay: G.day, nextPhase: G.phase },
    });
  }

  if (G.phase === 'OVER') { out(`\n💀 游戏结束！`); break; }
}

// ─── 结束 ───
out('');
out('════════════════════════════════════');
out(`模拟结束：Day ${G.day} · Phase ${G.phase} · 共 ${turn} 回合`);
const aliveHeroes = Object.values(G.heroes).filter(h => h.hp > 0);
out(`存活英雄: ${aliveHeroes.map(h => `${h.name} HP=${h.hp}`).join(', ') || '无'}`);

const result = G.runVictory === true ? 'VICTORY' : G.runVictory === false ? 'DEFEAT' : 'TIMEOUT';
recorder.record({
  step: step++, phase: 'OVER',
  action: { type: 'GAME_OVER' },
  result: {
    result, day: G.day, gold: G.gold,
    heroes: snapHeroes(), monsters: snapMonsters(), castles: snapCastles(),
  },
});

out(`\n结果: ${result} (${G.day > 10 ? '通关' : '未通关'})`);

// ─── 输出 trace ───
if (tracePath) {
  const dir = path.dirname(tracePath);
  if (dir && dir !== '.') fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(tracePath, recorder.toJSONL(), 'utf8');
  out(`\n📝 Trace 已写入: ${tracePath} (${recorder.steps.length} 步)`);
}
