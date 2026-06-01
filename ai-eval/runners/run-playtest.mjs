#!/usr/bin/env node
/**
 * ysbzs AI 自动试玩 runner
 *
 * 自动从 Day1 玩到结束（或10天通关），记录完整 trace.json。
 *
 * 用法: node ai-eval/runners/run-playtest.mjs [--seed=123]
 */

import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';
import { execSync } from 'child_process';

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const { loadYsbzsGame } = require('../core/game-script-loader');

// ─── 配置 ───
const ROOT = path.resolve(__dirname, '..', '..');
const MAX_ITERATIONS = 500;

const seed = (() => {
  const arg = process.argv.find(a => a.startsWith('--seed='));
  return arg ? parseInt(arg.split('=')[1], 10) : Math.floor(Math.random() * 1000000);
})();

const commitHash = (() => {
  try {
    return execSync('git rev-parse --short HEAD', { cwd: ROOT, encoding: 'utf8' }).trim();
  } catch { return 'unknown'; }
})();

const isoTimestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
const runId = `${isoTimestamp}_${commitHash}`;
const runDir = path.join(ROOT, 'reports', 'playtest', 'runs', runId);

// ─── 序列化工具 ───
function safeClone(obj) {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj !== 'object') return obj;
  if (obj instanceof Set) return [...obj].map(safeClone);
  if (Array.isArray(obj)) return obj.map(safeClone);
  if (obj instanceof Date) return obj.toISOString();
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    if (typeof v === 'function') continue;
    if (k === 'board' || k === 'elementCells' || k === 'slots') continue; // too large
    out[k] = safeClone(v);
  }
  return out;
}

// ─── Trace Recorder ───
class PlaytestTrace {
  constructor() {
    this.events = [];
    this.t0 = Date.now();
  }

  record(type, data = {}) {
    this.events.push({ ts: Date.now() - this.t0, type, data: safeClone(data) });
  }

  writeJSON(filepath) {
    fs.mkdirSync(path.dirname(filepath), { recursive: true });
    fs.writeFileSync(filepath, JSON.stringify(this.events, null, 2), 'utf8');
  }
}

// ─── 快照辅助 ───
function snapshotHeroes(G) {
  const heroes = {};
  for (const [id, h] of Object.entries(G.heroes || {})) {
    heroes[id] = { id, name: h.name, hp: h.hp, maxHp: h.maxHp, pos: { ...h.pos }, unitId: h.unitId, _acted: h._acted };
  }
  return heroes;
}

function snapshotMonsters(G) {
  return (G.monsters || []).map(m => ({
    id: m.id, typeId: m.typeId, name: m.name,
    hp: m.hp, maxHp: m.maxHp, atk: m.atk, pos: { ...m.pos }, dead: m.dead, gold: m.gold,
  }));
}

function snapshotShop(G) {
  return {
    units: (G.shopItems?.units || []).map(u => ({ id: u.id, defId: u.defId, cost: u.cost, frozen: u.frozen })),
    consumables: (G.shopItems?.consumables || []).map(c => ({ id: c.id, defId: c.defId, cost: c.cost })),
    gold: G.gold,
    shopTier: G.shopTier,
  };
}

function snapshotCastles(G) {
  return {
    player: { hp: G.playerCastle?.hp ?? 0, maxHp: G.playerCastle?.maxHp ?? 100 },
    enemy: { hp: G.enemyCastle?.hp ?? 0, maxHp: G.enemyCastle?.maxHp ?? 100 },
  };
}

// ─── 加载游戏 ───
console.log('🔧 ysbzs AI Auto-Playtest Runner');
console.log(`   Seed: ${seed} | Commit: ${commitHash}\n`);

const game = loadYsbzsGame({ rootDir: ROOT });
const ctx = game.context;

// 静默 UI
ctx.render = () => {};
ctx.renderShop = () => {};
ctx.showMsg = () => {};
ctx.glog = () => {};

// 通过 vm context 获取常量（用于商店 AI）
const UNIT_DEFS = ctx.UNIT_DEFS || {};
const EL = ctx.EL || {};
const SHOP_PRICE_CONFIG = ctx.SHOP_PRICE_CONFIG || {};

const trace = new PlaytestTrace();

// ─── 辅助 ───
function getPlayerElements(G) {
  const els = new Set();
  for (const s of G.slots || []) {
    if (s.el) els.add(s.el);
  }
  return els;
}

function lastSettleReport(G) {
  const ls = G.lastSettle;
  if (!ls) return null;
  return {
    chainSegments: ls.chainSegments,
    advHits: ls.advHits,
    totalDamage: ls.totalDamage,
    killedCount: ls.killedCount,
    clearedWave: ls.clearedWave,
    perfect: ls.perfect,
  };
}

// ─── 商店 AI ───
function aiShopDecision(G) {
  const gold = G.gold;
  const playerEls = getPlayerElements(G);

  const affordable = (G.shopItems?.units || [])
    .filter(item => item.cost <= gold)
    .map(item => {
      const def = UNIT_DEFS[item.defId];
      if (!def) return null;
      let el = null;
      // 从 slot 定义推断元素
      if (def.levels?.[1]?.slots?.length) {
        el = def.levels[1].slots[0].el || null;
      }
      return { item, def, el, cost: item.cost, tier: def.tier || 1 };
    })
    .filter(Boolean);

  if (affordable.length === 0) return null;

  // 排序: 元素协同优先 → 价格低优先 → tier高优先
  affordable.sort((a, b) => {
    const aSyn = a.el && playerEls.has(a.el) ? 0 : 1;
    const bSyn = b.el && playerEls.has(b.el) ? 0 : 1;
    if (aSyn !== bSyn) return aSyn - bSyn;
    if (a.cost !== b.cost) return a.cost - b.cost;
    return (b.tier || 1) - (a.tier || 1);
  });

  return affordable[0];
}

function phaseDescription(G) {
  if (G.dayHalf === 0) return 'Morning Battle';
  if (G.dayHalf === 1) return 'Midday Shop';
  if (G.dayHalf === 2) return 'Afternoon Battle';
  return `Night Shop (Day ${G.day})`;
}

// ═══════════════════════════════════════
// 主循环
// ═══════════════════════════════════════

let totalGoldEarned = 0;
let totalGoldSpent = 0;
let lastGold = 0;
let purchases = [];
let iteration = 0;
let prevDay = 1;
let prevDayHalf = 0;
let errorCount = 0;

function run() {
  ctx.initGame();
  const G = ctx.G;

  // 设置随机种子(如果游戏支持)
  if (typeof ctx.setSeed === 'function') ctx.setSeed(seed);

  trace.record('GAME_START', {
    seed,
    commit: commitHash,
    day: G.day,
    gold: G.gold,
    heroes: snapshotHeroes(G),
    castles: snapshotCastles(G),
  });

  lastGold = G.gold;

  console.log(`Day ${G.day} | ${phaseDescription(G)} | Gold: ${G.gold}`);

  while (G.phase !== 'OVER' && iteration < MAX_ITERATIONS) {
    iteration++;

    try {
      if (G.phase === 'PLAYER') {
        // ── 玩家/战斗回合 ──
        const round = G.round;
        const maxRound = G.maxRound;

        if (G.day !== prevDay) {
          console.log(`\nDay ${G.day} | ${phaseDescription(G)} | Gold: ${G.gold}`);
          prevDay = G.day;
          prevDayHalf = G.dayHalf;
          trace.record('DAY_START', { day: G.day, dayHalf: G.dayHalf, gold: G.gold });
        } else if (G.dayHalf !== prevDayHalf) {
          console.log(`  ${phaseDescription(G)} | Round ${round}/${maxRound}`);
          prevDayHalf = G.dayHalf;
          trace.record('DAY_START', { day: G.day, dayHalf: G.dayHalf, gold: G.gold });
        } else if (round === 1) {
          console.log(`  ${phaseDescription(G)} | Round ${round}/${maxRound}`);
        }

        console.log(`    Round ${round}/${maxRound}`);

        trace.record('ROUND_START', {
          day: G.day, dayHalf: G.dayHalf, round, maxRound,
          heroStates: snapshotHeroes(G),
          monsterStates: snapshotMonsters(G),
        });

        const monstersBefore = G.monsters.filter(m => !m.dead).length;
        const castleHpBefore = G.playerCastle.hp;
        const enemyCastleBefore = G.enemyCastle.hp;
        const heroesBefore = snapshotHeroes(G);

        // 一键执行所有英雄行动格
        ctx.execAllHeroSlots();

        // 记录行动
        const slotsUsed = (G.slots || []).filter(s => s.used).map(s => ({
          id: s.id, el: s.el, sn: s.sn, tier: s.tier, dir: s.dir, hid: s.hid,
        }));
        trace.record('PLAYER_ACTIONS', { slotsUsed, heroesBefore });

        // 结束玩家回合 → 触发怪物阶段
        ctx.endPlayerTurn();

        // 记录战斗结果
        const settle = lastSettleReport(G);
        const monstersAfter = G.monsters.filter(m => !m.dead).length;
        const killed = monstersBefore - monstersAfter;
        const castleDmg = castleHpBefore - G.playerCastle.hp;
        const enemyCastleDmg = G.enemyCastle.hp - enemyCastleBefore;

        trace.record('COMBAT_RESULT', {
          settle,
          monstersBefore,
          monstersAfter,
          monstersKilled: killed,
          castleDamageTaken: Math.max(0, castleDmg),
          enemyCastleDamageDone: Math.max(0, enemyCastleDmg),
          heroStates: snapshotHeroes(G),
          monsterStates: snapshotMonsters(G),
        });

        trace.record('MONSTER_PHASE_END', {
          roundCompleted: round,
          monstersRemaining: monstersAfter,
          phaseAfter: G.phase,
          castles: snapshotCastles(G),
        });

        console.log(`      → ${killed} killed | Castle HP: ${G.playerCastle.hp}`);

      } else if (G.phase === 'SHOP') {
        // ── 商店阶段 ──
        const goldBefore = G.gold;
        const incomeGained = goldBefore - lastGold;
        if (incomeGained > 0) totalGoldEarned += incomeGained;

        const shopLabel = G.dayHalf === 1 ? 'Midday' : 'Night';
        console.log(`  🛒 ${shopLabel} Shop | Gold: ${goldBefore} (+${incomeGained}) | Items: ${G.shopItems?.units?.length || 0}`);

        trace.record('SHOP_OPEN', {
          shop: snapshotShop(G),
          day: G.day,
          dayHalf: G.dayHalf,
          goldBefore,
          incomeGained,
        });

        const decision = aiShopDecision(G);
        if (decision) {
          const itemId = decision.item.id;
          ctx.buyUnit(itemId);

          totalGoldSpent += decision.cost;
          purchases.push({
            defId: decision.def.id,
            name: decision.def.name,
            cost: decision.cost,
            el: decision.el,
            day: G.day,
            dayHalf: G.dayHalf,
          });

          trace.record('SHOP_PURCHASE', {
            defId: decision.def.id,
            name: decision.def.name,
            cost: decision.cost,
            el: decision.el,
            goldBefore,
            goldAfter: G.gold,
          });

          console.log(`    ✅ 购买 ${decision.def.name} (${decision.cost}g) → Gold: ${G.gold}`);

          // 检查是否触发了合成
          const heroUnits = G.ownedUnits.filter(u => u.active);
          for (const u of heroUnits) {
            if (u.level >= 2) {
              trace.record('UNIT_UPGRADE', {
                instanceId: u.instanceId,
                defId: u.defId,
                newLevel: u.level,
              });
            }
          }
        } else {
          console.log(`    — 无购买 (最便宜物品 > ${G.gold}g)`);
        }

        lastGold = G.gold;
        ctx.closeShop();

        trace.record('SHOP_CLOSE', {
          goldAfter: G.gold,
          nextPhase: G.phase,
          nextDay: G.day,
          nextDayHalf: G.dayHalf,
        });

        if (G.phase !== 'OVER') {
          trace.record('DAY_START', {
            day: G.day,
            dayHalf: G.dayHalf,
            gold: G.gold,
            phase: G.phase,
          });
        }

      } else {
        // 意外阶段
        trace.record('UNEXPECTED_PHASE', { phase: G.phase });
        break;
      }

      // ── 每轮结束快照 ──
      if (G.phase !== 'OVER') {
        trace.record('HERO_STATE', { heroes: snapshotHeroes(G), slotsCount: (G.slots || []).length });
        trace.record('MONSTER_STATE', { monsters: snapshotMonsters(G) });
      }

    } catch (err) {
      errorCount++;
      trace.record('ERROR', { message: err.message, stack: err.stack, phase: G.phase, day: G.day, iteration });
      console.error(`  ❌ Error: ${err.message}`);
      // 尝试继续；如果 phase 是 OVER 就退出
      if (G.phase === 'OVER') break;
      if (errorCount > 5) {
        console.error('  ❌ Too many errors, aborting');
        break;
      }
    }
  }

  // ── 游戏结束 ──
  let result = 'UNKNOWN';
  let reason = '';
  if (iteration >= MAX_ITERATIONS) {
    result = 'TIMEOUT';
    reason = `Exceeded ${MAX_ITERATIONS} iterations`;
  } else if (G.runVictory === true) {
    result = 'VICTORY';
    reason = G.day > 10 ? 'Survived all 10 days' : 'Enemy castle destroyed';
  } else if (G.runVictory === false) {
    result = 'DEFEAT';
    const allHeroesDead = Object.values(G.heroes || {}).every(h => h.hp <= 0);
    if (allHeroesDead) reason = 'All heroes died';
    else if (G.playerCastle?.hp <= 0) reason = 'Player castle destroyed';
    else reason = 'Game over';
  }

  trace.record('GAME_OVER', {
    result,
    reason,
    day: G.day,
    dayHalf: G.dayHalf,
    gold: G.gold,
    heroes: snapshotHeroes(G),
    castles: snapshotCastles(G),
    engineStats: safeClone(G.engineStats),
    growth: safeClone(G.growth),
    monsters: snapshotMonsters(G),
    ownedUnitsCount: (G.ownedUnits || []).length,
  });

  console.log(`\n═══ GAME OVER ═══`);
  console.log(`  Result: ${result} (${reason})`);
  console.log(`  Reached: Day ${G.day} | ${phaseDescription(G)}`);
  console.log(`  Gold: ${G.gold} | Purchases: ${purchases.length}`);
  console.log(`  Errors: ${errorCount} | Iterations: ${iteration}`);

  // ── 计算指标 ──
  const metrics = {
    runId,
    timestamp: new Date().toISOString(),
    commit: commitHash,
    seed,
    result,
    reason,
    daysPlayed: G.day,
    finalDayHalf: G.dayHalf,
    finalPhase: G.phase,

    // 经济
    totalGoldEarned,
    totalGoldSpent,
    finalGold: G.gold,

    // 战斗
    totalRoundsPlayed: trace.events.filter(e => e.type === 'ROUND_START').length,
    totalMonstersKilled: trace.events
      .filter(e => e.type === 'COMBAT_RESULT')
      .reduce((sum, e) => sum + (e.data?.monstersKilled || 0), 0),
    totalCastleDamageTaken: trace.events
      .filter(e => e.type === 'COMBAT_RESULT')
      .reduce((sum, e) => sum + (e.data?.castleDamageTaken || 0), 0),
    totalEnemyCastleDamageDone: trace.events
      .filter(e => e.type === 'COMBAT_RESULT')
      .reduce((sum, e) => sum + (e.data?.enemyCastleDamageDone || 0), 0),

    // 商店
    purchases: purchases.map(p => p.name),
    purchaseDefIds: purchases.map(p => p.defId),
    totalPurchases: purchases.length,

    // 引擎
    engineStats: safeClone(G.engineStats),
    growth: safeClone(G.growth),

    // 最终状态
    playerCastleHp: G.playerCastle?.hp || 0,
    enemyCastleHp: G.enemyCastle?.hp || 0,
    heroCount: Object.values(G.heroes || {}).filter(h => h.hp > 0).length,
    ownedUnitsCount: (G.ownedUnits || []).length,

    // 运行信息
    wallClockMs: Date.now() - trace.t0,
    traceEventCount: trace.events.length,
    iterations: iteration,
    errorCount,
  };

  // ── 写入输出 ──
  fs.mkdirSync(runDir, { recursive: true });
  trace.writeJSON(path.join(runDir, 'trace.json'));
  fs.writeFileSync(path.join(runDir, 'summary.json'), JSON.stringify(metrics, null, 2), 'utf8');

  // ── 控制台摘要 ──
  console.log(`\n─────────────────────────────`);
  console.log(`📊 SUMMARY`);
  console.log(`  Result:     ${result} (Day ${G.day})`);
  console.log(`  Rounds:     ${metrics.totalRoundsPlayed}`);
  console.log(`  Gold:       earned ${totalGoldEarned} | spent ${totalGoldSpent} | final ${metrics.finalGold}`);
  console.log(`  Kills:      ${metrics.totalMonstersKilled}`);
  console.log(`  Castle DMG: taken ${metrics.totalCastleDamageTaken} | dealt ${metrics.totalEnemyCastleDamageDone}`);
  console.log(`  Purchases:  ${metrics.totalPurchases} → ${metrics.purchases.join(', ') || '(none)'}`);
  console.log(`  Engine:     Summon ${metrics.engineStats?.summonCount || 0} | Heal ${metrics.engineStats?.healCount || 0} | Chain ${metrics.engineStats?.chainSegments || 0}`);
  console.log(`  Errors:     ${errorCount}`);
  console.log(`  Wall time:  ${(metrics.wallClockMs / 1000).toFixed(1)}s`);
  console.log(`  Trace:      ${metrics.traceEventCount} events`);
  console.log(`  Output:     ${runDir}`);
  console.log(`─────────────────────────────\n`);

  return { metrics, runDir };
}

try {
  run();
  process.exit(0);
} catch (err) {
  console.error('❌ RUNNER ERROR:', err.message);
  console.error(err.stack);

  // 尝试写入错误信息
  try {
    fs.mkdirSync(runDir, { recursive: true });
    fs.writeFileSync(path.join(runDir, 'error.json'), JSON.stringify({
      message: err.message,
      stack: err.stack,
      timestamp: new Date().toISOString(),
    }, null, 2), 'utf8');
  } catch {}

  process.exit(1);
}
