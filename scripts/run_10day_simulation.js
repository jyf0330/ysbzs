/**
 * 元素背包史 · 10 天流程验收脚本 v3（稳定版）
 * 固定种子、可复现、跑 Day1–Day10
 * 运行: node scripts/run_10day_simulation.js
 *
 * 只验证当前代码是否能稳定跑完 10 天流程，
 * 不新增玩法机制，不重构大系统。
 */
const fs   = require('fs');
const path = require('path');

// ========== 健壮 DOM 桩 ==========
const makeEl = () => ({
  innerHTML:'', textContent:'', style:{display:''},
  children: [], disabled: false,
  scrollTop: 0, scrollHeight: 0,
  firstChild: null, lastChild: null,
  classList: { add(){}, remove(){}, has:()=>false, contains:()=>false },
  appendChild(c) { this.children.push(c); this.lastChild = c; if (!this.firstChild) this.firstChild = c; },
  removeChild(c) { const i = this.children.indexOf(c); if (i >= 0) this.children.splice(i,1); this.firstChild = this.children[0] || null; this.lastChild = this.children[this.children.length-1] || null; },
  getBoundingClientRect(){ return {top:0,left:0,right:0,bottom:0}; },
  setAttribute(){}, addEventListener(){}, removeEventListener(){},
  onclick: null, title: '',
  focus(){}, blur(){},
});
const _els = {};
global.document = {
  getElementById(id) { if (!_els[id]) _els[id] = makeEl(); return _els[id]; },
  createElement()    { return makeEl(); },
  createTextNode()   { return makeEl(); },
  documentElement: { requestFullscreen(){} },
  addEventListener(){},
  body: { appendChild(){} },
};
global.window = {
  innerWidth: 1920, innerHeight: 1080,
  addEventListener(){}, removeEventListener(){},
  localStorage: { getItem(){ return '0'; }, setItem(){} },
  location: { search: '' },
  requestAnimationFrame(){},
};
global.setTimeout = function(fn) { try { fn(); } catch(e) { console.error('[timeout]', e && e.message); } };
global.clearTimeout = function(){};
global.requestAnimationFrame = function(fn){ fn(0); };
global.__TEST__ = true;

// ========== 加载游戏模块 ==========
const ROOT = path.join(__dirname, '..');
const MODS = ['data.js','rng.js','board.js','actions.js','elements.js','waves.js','battle.js','shop.js','game.js','ui.js','damage.js','terrain.js','battleLog.js','preview.js'];
for (const f of MODS) {
  const fp = path.join(ROOT, f);
  if (!fs.existsSync(fp)) continue;
  // 用 var 替换 const/let 以支持重复 eval
  eval(fs.readFileSync(fp, 'utf8')
    .replace(/\bconst\b/g, 'var')
    .replace(/\blet\b/g, 'var'));
}

// ========== 重写 UI 粘合层 ==========
// glog（战斗日志）→ 只在 stderr 输出，不做 DOM
var _glogBuffer = globalThis._glogBuffer || [];
glog = function(msg) {
  if (msg && msg.length < 120) _glogBuffer.push(msg);
  if (msg) process.stderr.write(msg + '\n');
};
showMsg = function(){};
showRunEnd = function(){};
refreshUI = function(){ recomputeCorePreview(); };
render = function(){};
renderShop = function(){};
// 跳过 debug panel
scheduleDebugPanelUpdate = function(){};
isDebugMode = function(){ return false; };
buildRunEndVM = function(){ return {title:'',sections:[]}; };
buildDebugPanelVM = function(){ return {}; };

// ========== 固定种子 ==========
setRngSeed(20260603);

// ========== 数据收集 ==========
const dailyReports = [];
const previewCheckpoints = [];

function snapshot() {
  return {
    day: G.day, dayHalf: G.dayHalf, phase: G.phase,
    round: G.round, maxRound: G.maxRound,
    gold: G.gold,
    ownedUnits: G.ownedUnits.map(u => ({
      defId: u.defId, level: u.level, active: u.active,
      hp: u.hp, maxHp: u.maxHp,
    })),
    playerCastleHp: G.playerCastle ? G.playerCastle.hp : 0,
    playerCastleMaxHp: G.playerCastle ? G.playerCastle.maxHp : 80,
    enemyCastleHp: G.enemyCastle ? G.enemyCastle.hp : 0,
    enemyCastleMaxHp: G.enemyCastle ? G.enemyCastle.maxHp : 80,
    monsterAlive: G.monsters.filter(m => !m.dead).length,
    summonAlive: (G.summons||[]).filter(s=>!s.dead).length,
    engineStats: { ...(G.engineStats||{}) },
    shopOps: [],
    battleStats: G.lastSettle ? {
      chainSegments: G.lastSettle.chainSegments || 0,
      advHits: G.lastSettle.advHits || 0,
      totalDamage: G.lastSettle.totalDamage || 0,
      killedCount: G.lastSettle.killedCount || 0,
      clearedWave: !!G.lastSettle.clearedWave,
      perfect: !!G.lastSettle.perfect,
    } : null,
  };
}

// ========== 扩展核心集（火伤害 + 召唤）==========
const FIRE_CORE = new Set([
  'fire_starter','ember','ember_seed','fire_blaze','boom_sprite',
  'forge_fire','dragon_flame','fire_demon',
]);
const SUMMON_CORE = new Set([
  'sprout_summoner','spring_sprite','fluff_speaker',
  'command_sprout','prime_sprout',
]);
const STRATEGIC = new Set([...FIRE_CORE, ...SUMMON_CORE]);

// 全局跟踪器
var track = {
  shopBuyCount: 0,          // 总购买次数
  shopSellCount: 0,         // 总出售次数
  shopRefreshCount: 0,      // 刷新次数
  shopWastedBuySell: 0,     // 同一商店阶段内买卖同一 defId 的次数
  shopMergeCount: 0,        // 合成次数
  shopFieldChangeCount: 0,  // 上阵调整次数

  chainTotal: 0,            // 总 chainCount（所有 segment）
  chainEffective: 0,        // 造成伤害的 chain segment
  chainKills: 0,            // 击杀数
  chainCastleDmg: 0,        // 城堡伤害次数
  chainAdvHits: 0,          // 克制次数

  summonTriggers: 0,        // 召唤触发次数
  summonTotal: 0,           // 总召唤物数量
  summonDamage: 0,          // 召唤物造成伤害

  castleDmgByFire: 0,       // 元素对敌方城堡伤害
  castleDmgByMonster: 0,    // 怪物对我方城堡伤害

  dungeonDay: 0,            // 当日有效数据缓存
};

// 在每个 SHOP 阶段开始时重置日跟踪
function resetDailyTrack() {
  track.dungeonDay = G.day;
}

// ========== 商店 AI v3（严格限购 + 保留金币 + 召唤上阵）==========
var TRACK_SHOP = { buy:0, sell:0, merge:0, refresh:0, wastePairs:0 };

function scoreItem(item) {
  var def = UNIT_DEFS[item.defId];
  if (!def) return -999;
  var ownedCnt = G.ownedUnits.filter(function(u){return u.defId===item.defId;}).length;
  var active = G.ownedUnits.filter(function(u){return u.active;});
  var hasSameActive = active.some(function(u){return u.defId===item.defId;});
  // 如果商店有 fire_demon 但钱不够，非合成高分一律扣分（存钱）
  var needReserve = (G.shopItems.units||[]).some(function(u){return u.defId==='fire_demon';}) && G.gold<8 && item.defId!=='fire_demon';
  var s=0;
  if (ownedCnt===0) s=5; else if (ownedCnt===1) s=15; else if (ownedCnt===2) s=20; else s=25;
  if (FIRE_CORE.has(item.defId)) s+=6;
  if (SUMMON_CORE.has(item.defId)) s+=6;
  if (item.defId==='fire_demon') s+=25;
  if (item.defId==='ember_seed'||item.defId==='breeze_sprite') s+=4;
  if (hasSameActive&&ownedCnt>=2) s-=12;
  if (!FIRE_CORE.has(item.defId)&&!SUMMON_CORE.has(item.defId)&&!hasSameActive) s-=8;
  if (ownedCnt>=3&&!FIRE_CORE.has(item.defId)&&!SUMMON_CORE.has(item.defId)) s-=15;
  if (item.defId==='wind_breeze'||item.defId==='pebble_guard'||item.defId==='bubble_sprite') s-=8;
  if (needReserve&&ownedCnt===0) s-=15;
  return s;
}

function runShopAI() {
  var ops = [];
  // 统计是否有召唤源在库
  var hasSprout = G.ownedUnits.some(function(u){return u.defId==='sprout_summoner'||u.defId==='command_sprout';});
  var items = (G.shopItems.units||[]).map(function(it){return Object.assign({},it,{score:scoreItem(it)});});
  items.sort(function(a,b){return b.score-a.score;});
  var BUY_THRESHOLD=12;
  // 购买
  for (var i=0;i<items.length;i++) {
    var item=items[i];
    if (item.score<BUY_THRESHOLD||G.gold<item.cost) continue;
    var idx=G.shopItems.units.findIndex(function(u){return u.id===item.id;});
    if (idx===-1) continue;
    var bg=G.gold; buyUnit(item.id);
    if (G.gold<bg){ops.push('买'+item.defId+'('+(bg-G.gold)+'g)');TRACK_SHOP.buy++;}
  }
  // 有余钱刷新
  if (G.gold>=5&&!items.some(function(it){return it.score>=BUY_THRESHOLD;})) {
    var bg=G.gold; rollShop();
    if (G.gold<bg){ops.push('刷新');TRACK_SHOP.refresh++;}
    var n2=(G.shopItems.units||[]).map(function(it){return Object.assign({},it,{score:scoreItem(it)});});
    n2.sort(function(a,b){return b.score-a.score;});
    for (var j=0;j<n2.length;j++){var it2=n2[j];if(it2.score<BUY_THRESHOLD||G.gold<it2.cost)continue;var ix=G.shopItems.units.findIndex(function(u){return u.id===it2.id;});if(ix===-1)continue;var bg2=G.gold;buyUnit(it2.id);if(G.gold<bg2){ops.push('买'+it2.defId+'('+(bg2-G.gold)+'g)');TRACK_SHOP.buy++;}}
  }
  // 出售 — 仅备战>3且金币<4时
  if (G.gold<4){var ben=G.ownedUnits.filter(function(u){return!u.active;});while(ben.length>3&&G.gold<4){ben.sort(function(a,b){var ac=STRATEGIC.has(a.defId)?1:0,bc=STRATEGIC.has(b.defId)?1:0;return(a.level-b.level)||(ac-bc);});var ls=ben[0];if(STRATEGIC.has(ls.defId))break;var bg=G.gold;sellUnit(ls.instanceId);if(G.gold>bg){ops.push('卖'+ls.defId+'(+'+(G.gold-bg)+'g)');TRACK_SHOP.sell++;}ben=G.ownedUnits.filter(function(u){return!u.active;});}}
  // 上阵选择: fire_demon > 召芽 > 高等级核心
  var av=G.ownedUnits.slice(),fu=[];
  var fd=av.find(function(u){return u.defId==='fire_demon';});if(fd)fu.push(fd);
  if(!hasSprout){var sm=av.find(function(u){return u.defId==='sprout_summoner'&&fu.indexOf(u)===-1;});if(sm)fu.push(sm);}
  while(fu.length<2){var rm=av.filter(function(u){return fu.indexOf(u)===-1;});if(rm.length===0)break;rm.sort(function(a,b){var ac=STRATEGIC.has(a.defId)?3:0,bc=STRATEGIC.has(b.defId)?3:0;return(b.level+bc)-(a.level+ac);});fu.push(rm[0]);}
  G.ownedUnits.forEach(function(u){u.active=fu.indexOf(u)>=0&&fu.indexOf(u)<2;});
  syncUnitsToHeroes();
  return ops;
}

// ========== 预览验收 ==========
function collectPrecision(label) {
  var stats = buildMonsterStats();
  var snap = G.monsters.filter(function(m) { return !m.dead; }).map(function(m) {
    return { id: m.id, name: m.name, hp: m.hp, pos: {r:m.pos.r,c:m.pos.c}, el: m.el };
  });
  return { label: label, stats: stats, snap: snap };
}

function verifyPrecision(cp) {
  var after = G.monsters.filter(function(m) { return !m.dead; }).map(function(m) { return {id:m.id, hp:m.hp}; });
  var diffs = [];
  for (var i = 0; i < cp.snap.length; i++) {
    var mb = cp.snap[i];
    var ma = null;
    for (var j = 0; j < after.length; j++) {
      if (after[j].id === mb.id) { ma = after[j]; break; }
    }
    if (ma) {
      var dmg = mb.hp - ma.hp;
      if (dmg > 0) {
        var key = mb.pos.r + ',' + mb.pos.c;
        var st = cp.stats[key];
        var previewDmg = st ? st.finalPreview.totalDamage : 0;
        diffs.push({ monster: mb.name, previewDmg: previewDmg, actualDmg: dmg, match: previewDmg === dmg });
      }
    } else {
      // 怪物被击杀
      var key = mb.pos.r + ',' + mb.pos.c;
      var st = cp.stats[key];
      var previewDmg = st ? st.finalPreview.totalDamage : 0;
      diffs.push({ monster: mb.name, previewDmg: previewDmg, actualDmg: mb.hp, match: previewDmg >= mb.hp });
    }
  }
  if (diffs.length > 0) {
    var allMatch = true;
    for (var k = 0; k < diffs.length; k++) { if (!diffs[k].match) { allMatch = false; break; } }
    previewCheckpoints.push({ label: cp.label, diffs: diffs, allMatch: allMatch });
  }
}

// ========== 覆盖 syncUnitsToHeroes：保存英雄战斗位置 ==========
var _origSync = syncUnitsToHeroes;
syncUnitsToHeroes = function() {
  // 按 unit.instanceId 保存当前战斗位置
  var sp = {};
  if (G && G.heroes) {
    for (var hh in G.heroes) { var uu = getUnitByHeroId(hh); if (uu) sp[uu.instanceId] = {r:G.heroes[hh].pos.r,c:G.heroes[hh].pos.c}; }
  }
  _origSync();
  // 恢复已知位置
  if (G && G.heroes && sp) {
    for (var hh2 in G.heroes) {
      var uu2 = getUnitByHeroId(hh2);
      if (uu2 && sp[uu2.instanceId]) { G.heroes[hh2].pos = sp[uu2.instanceId]; uu2.pos = sp[uu2.instanceId]; }
    }
  }
  // 新英雄无存档 → 复制任意有存档英雄的行列
  if (G && G.heroes) {
    var refPos = null;
    for (var hh3 in G.heroes) { var uu3 = getUnitByHeroId(hh3); if (uu3 && sp[uu3.instanceId]) { refPos = sp[uu3.instanceId]; break; } }
    if (refPos) {
      for (var hh4 in G.heroes) {
        var uu4 = getUnitByHeroId(hh4);
        if (uu4 && !sp[uu4.instanceId]) { G.heroes[hh4].pos = {r:refPos.r,c:refPos.c}; uu4.pos = {r:refPos.r,c:refPos.c}; }
      }
    }
  }
};

// ========== 主循环 ==========
function run() {
  console.log('=== 10 天流程验收 ===\n');

  initGame();
  console.log('init: D' + G.day + 'h' + G.dayHalf + 'r' + G.round + ' p=' + G.phase + ' gold=' + G.gold);
  console.log('heroes: ' + Object.keys(G.heroes).length + ' slots: ' + G.slots.length + '\n');

  var safety = 0;
  while (G.day <= 10 && G.phase !== 'OVER' && safety < 500) {
    safety++;
    if (safety % 100 === 0) console.error('  [' + safety + '] D' + G.day + 'h' + G.dayHalf + 'r' + G.round + ' ' + G.phase);

    if (G.phase === 'PLAYER') {
      var plan = buildAiBattleTurnPlan();
      if (plan.canRun) {
        // 模拟浏览器流程：先移动，再逐个 useSlot 更新元素场，再结算
        // 1) 移动英雄
        for (var mi = 0; mi < plan.moves.length; mi++) {
          var mv = plan.moves[mi];
          if (G.heroes[mv.heroId]) G.heroes[mv.heroId].pos = { r: mv.to.r, c: mv.to.c };
        }
        // 2) 逐个执行行动槽（useSlot 会正确累加元素层、标记 used）
        for (var ai = 0; ai < plan.actions.length; ai++) {
          var act = plan.actions[ai];
          var slot = G.slots[act.slotId];
          if (!slot || slot.used) continue;
          useSlot(act.slotId);
        }
        // 3) 收集预览检查点（此时元素场已正确填充）
        var needCp = previewCheckpoints.length < 5;
        if (needCp) var cp = collectPrecision('D' + G.day + 'h' + G.dayHalf + 'r' + G.round);
        // 4) 终止回合（useSlot 已提交所有 action，覆盖 commit 避免重复添加）
        var _origCommit = commitPlayerActionsToElementField;
        commitPlayerActionsToElementField = function(){};
        endPlayerTurn();
        commitPlayerActionsToElementField = _origCommit;
        // 5) 验证预览
        if (needCp) verifyPrecision(cp);
      } else {
        endPlayerTurn();
      }
    } else if (G.phase === 'SHOP') {
      // 在 closeShop 重置城堡前记录
      var _ehp = G.enemyCastle ? G.enemyCastle.hp : 0;
      var _php = G.playerCastle ? G.playerCastle.hp : 0;
      var ops = runShopAI();
      dailyReports.push(Object.assign({}, snapshot(), { shopOps: ops, castleHpBeforeReset: {enemy:_ehp, player:_php} }));
      closeShop();
      if (safety % 20 === 0 || G.day <= 2) {
        console.log('  Shop D' + G.day + 'h' + G.dayHalf + ' gold=' + G.gold);
      }
    } else if (G.phase === 'MONSTER') {
      // 不应到达（setTimeout 同步处理怪物回合）
      G.phase = 'PLAYER';
    }
  }

  // 最终快照
  dailyReports.push(Object.assign({}, snapshot(), { shopOps: [] }));

  // 写报告
  var report = buildReport();
  var rp = path.join(ROOT, 'docs', 'reports', '10day_simulation_report.md');
  var rd = path.dirname(rp);
  if (!fs.existsSync(rd)) fs.mkdirSync(rd, { recursive: true });
  fs.writeFileSync(rp, report, 'utf8');
  console.log('\n报告已写入: ' + rp);

  // 摘要
  var du = G.ownedUnits.filter(function(u) { return u.level >= 4; });
  console.log('\n=== 摘要 ===');
  var completed = G.day > 10 || (G.phase === 'OVER' && G.day >= 10);
  console.log('完成: ' + (completed ? '✅' : '❌'));
  console.log('Day: ' + G.day + '/10, gold: ' + G.gold);
  console.log('城堡: 我方' + (G.playerCastle ? G.playerCastle.hp : 0) + ' 敌方' + (G.enemyCastle ? G.enemyCastle.hp : 0));
  console.log('英雄: ' + G.ownedUnits.length + '个, 钻石: ' + du.length + '个');
  du.forEach(function(u) {
    console.log('  💎 ' + ((UNIT_DEFS[u.defId]||{}).name || u.defId) + ' Lv4 HP' + u.hp + '/' + u.maxHp);
  });
  if (previewCheckpoints.length > 0) {
    var allOk = previewCheckpoints.every(function(p) { return p.allMatch; });
    console.log('预览检查点: ' + previewCheckpoints.length + '个 ' + (allOk ? '全部一致 ✅' : '有差异 ❌'));
  } else {
    console.log('预览检查点: 无');
  }
}

// ========== 报告构建 ==========
function gl(level) {
  return ['','青铜','白银','黄金','钻石'][level] || 'Lv' + level;
}

function buildReport() {
  var L = [];
  L.push('# 10 天流程验收报告\n');
  L.push('> **种子:** `' + getRngSeed() + '`');
  L.push('> **城堡 HP 初始:** ' + (dailyReports[0] ? dailyReports[0].playerCastleHp : 'N/A'));
  L.push('> **最终状态:** ' + G.phase + ' | Day ' + G.day + '\n');

  // 一、概要
  L.push('## 一、概要\n');
  var ran10 = G.day > 10 || (G.phase === 'OVER' && G.day >= 10);
  L.push('| 项目 | 值 |');
  L.push('|------|-----|');
  L.push('| 是否跑完 10 天 | ' + (ran10 ? '✅' : '❌') + ' |');
  L.push('| 最终金币 | ' + G.gold + ' |');
  L.push('| 我方城堡 HP | ' + (G.playerCastle ? G.playerCastle.hp : 0) + '/' + (G.playerCastle ? G.playerCastle.maxHp : 80) + ' |');
  L.push('| 敌方城堡 HP | ' + (G.enemyCastle ? G.enemyCastle.hp : 0) + '/' + (G.enemyCastle ? G.enemyCastle.maxHp : 80) + ' |');
  L.push('| 英雄总数 | ' + G.ownedUnits.length + ' |');
  L.push('| 钻石英雄 | ' + G.ownedUnits.filter(function(u){return u.level>=4}).length + ' |');
  L.push('| 引擎统计 | 召' + (G.engineStats.summonCount||0) + ' 疗' + (G.engineStats.healCount||0) + ' 连' + (G.engineStats.chainCount||0) + ' 完美' + (G.engineStats.perfectCount||0) + ' |');
  var pcOk = previewCheckpoints.length > 0 && previewCheckpoints.every(function(p){return p.allMatch;});
  L.push('| 预览一致性 | ' + (previewCheckpoints.length > 0 ? (pcOk ? '✅ 一致' : '❌ 差异') : '—') + ' |');
  L.push('');

  // 二、每日明细
  L.push('## 二、每日明细\n');
  L.push('| 天数 | 时间 | 战斗场次 | 金币 | 我方阵容 | 英雄阶级 | 金币变化 | 商店购买 | 怪物存活 | 城堡HP | 召唤触发 | 钻石英雄 | 风险备注 |');
  L.push('|:----:|:----:|:--------:|:----:|:---------|:---------|:--------:|:---------|:--------:|:-------:|:--------:|:--------:|:---------|');
  for (var i = 0; i < dailyReports.length; i++) {
    var r = dailyReports[i];
    var halfStr = r.dayHalf === 1 ? '中午' : (r.dayHalf === 2 ? '下午' : (r.dayHalf === 0 ? '上午' : 'h' + r.dayHalf));
    var roster = r.ownedUnits.filter(function(u){return u.active;}).map(function(u){
      return ((UNIT_DEFS[u.defId]||{}).name || u.defId) + gl(u.level);
    }).join(', ');
    var grades = [...new Set(r.ownedUnits.filter(function(u){return u.active;}).map(function(u){return gl(u.level);}))].join(', ');
    var goldChange = r.gold >= 0 ? '+' + r.gold : '' + r.gold;
    var shopStr = (r.shopOps||[]).join('; ') || '—';
    var es = r.engineStats || {};
    var hasSummon = (es.summonCount || 0) > 0;
    var hasDiamond = r.ownedUnits.some(function(u){return u.level>=4;});
    var risk = '';
    if (r.phase === 'OVER') risk = '结束';
    else if (r.playerCastleHp <= 0) risk = '城堡被毁';
    else if (r.playerCastleHp <= 20) risk = '城堡危险';
    else risk = '—';
    L.push('| ' + r.day + ' | ' + halfStr + ' | r' + r.round + '/' + r.maxRound + ' | ' + r.gold + ' | ' + (roster||'—') + ' | ' + (grades||'—') + ' | ' + goldChange + ' | ' + shopStr + ' | ' + r.monsterAlive + ' | ' + r.playerCastleHp + ' | ' + (hasSummon?'✅':'—') + ' | ' + (hasDiamond?'✅':'—') + ' | ' + risk + ' |');
  }
  L.push('');

  // 三、钻石阶验收
  L.push('## 三、钻石阶验收\n');
  var du = G.ownedUnits.filter(function(u){return u.level >= 4;});
  if (du.length > 0) {
    L.push('✅ **' + du.length + ' 个钻石英雄**\n');
    for (var d = 0; d < du.length; d++) {
      var u = du[d];
      var def = UNIT_DEFS[u.defId];
      var lv = def ? def.levels[4] : null;
      L.push('### ' + (def ? def.name : u.defId) + '\n');
      L.push('- **等级:** Lv4（钻石）');
      L.push('- **HP:** ' + u.hp + '/' + u.maxHp + '（规格 HP=' + (lv ? lv.hp : '?') + '）');
      L.push('- **主动槽:** ' + (lv ? lv.slots.length : '?') + ' 个');
      if (lv && lv.slots) {
        for (var si = 0; si < lv.slots.length; si++) {
          var s = lv.slots[si];
          var sn = (SD[s.sn]||{}).name || s.sn;
          L.push('  - 槽' + (si+1) + ': ' + (EL[s.el]||s.el) + ' ' + sn + ' tier' + s.tier + (s.layers ? ' layers=' + s.layers : '') + (s.skill ? ' skill=' + s.skill : ''));
        }
      }
      L.push('- **grade:** ' + (def ? (def.grade || '无') : '?'));
      L.push('- **出售返还:** ' + u.level + ' 金币');
      // passive 数组边界
      if (def && def.passive) {
        var checked = false;
        for (var pk in def.passive) {
          if (Array.isArray(def.passive[pk]) && def.passive[pk].length > 0) {
            var arr = def.passive[pk];
            var idx = Math.min(3, arr.length - 1);
            L.push('- **passive `' + pk + '`:** [' + arr.join(',') + '] len=' + arr.length + ' idx=' + idx + ' ' + (idx < arr.length ? '✅' : '❌'));
            checked = true;
          }
        }
        if (!checked) L.push('- **passive:** 无可检查数组');
      }
      L.push('');
    }
  } else {
    L.push('❌ **未出现钻石英雄**\n');
    var counter = {};
    G.ownedUnits.forEach(function(unit) {
      var k = ((UNIT_DEFS[unit.defId]||{}).name || unit.defId) + ' Lv' + unit.level;
      counter[k] = (counter[k]||0) + 1;
    });
    for (var ck in counter) L.push('- ' + ck + ' ×' + counter[ck]);
    L.push('');
    var maxLv = G.ownedUnits.length > 0 ? Math.max.apply(null, G.ownedUnits.map(function(u){return u.level;})) : 0;
    L.push('> 原因分析：最高等级为 Lv' + maxLv + '，需同名合成 3 次到钻石。');
    L.push('> 商店优先买同名英雄，但 10 天内可能未收集到足够数量。\n');
  }

  // 四、预览 vs 实战一致性
  L.push('## 四、预览 vs 实战一致性\n');
  if (previewCheckpoints.length > 0) {
    var allOk = previewCheckpoints.every(function(p){return p.allMatch;});
    L.push('检查点数: ' + previewCheckpoints.length + ' | 全部一致: ' + (allOk ? '✅' : '❌') + '\n');
    L.push('| 局面 | 怪物 | 预览伤害 | 实际伤害 | 一致 |');
    L.push('|------|------|:--------:|:--------:|:----:|');
    for (var pi = 0; pi < previewCheckpoints.length; pi++) {
      var cp = previewCheckpoints[pi];
      for (var di = 0; di < cp.diffs.length; di++) {
        var d = cp.diffs[di];
        L.push('| ' + cp.label + ' | ' + d.monster + ' | ' + d.previewDmg + ' | ' + d.actualDmg + ' | ' + (d.match ? '✅' : '❌') + ' |');
      }
    }
    L.push('');
  } else {
    L.push('（战斗过程中未收集到检查点）\n');
  }
  L.push('');

  // 五、最终阵容
  L.push('## 五、最终阵容\n');
  for (var ui = 0; ui < G.ownedUnits.length; ui++) {
    var uu = G.ownedUnits[ui];
    var dd = UNIT_DEFS[uu.defId];
    L.push('- **' + (dd ? dd.name : uu.defId) + '** [' + gl(uu.level) + '] ' + (uu.active ? '⚔️ 上阵' : '💤 备战') + ' HP' + uu.hp + '/' + uu.maxHp + ' ' + (dd ? dd.element : '?'));
  }
  L.push('');

  // 六、风险备注
  L.push('## 六、风险备注\n');
  if (G.phase === 'OVER' && G.day < 10 && !G.runVictory) L.push('- ❌ 游戏提前失败（英雄全倒或城堡被毁）\n');
  if (G.phase === 'OVER' && G.runVictory) L.push('- ✅ 胜利通关\n');
  if (G.phase === 'OVER' && !G.runVictory && G.day >= 10) L.push('- ⏹ 游戏在 Day10 结束时结束（非胜利判定）\n');
  if ((G.playerCastle ? G.playerCastle.hp : 0) <= 0) L.push('- ⚠️ 我方城堡被毁\n');
  if ((G.enemyCastle ? G.enemyCastle.hp : 0) <= 0) L.push('- ✅ 击破敌方城堡\n');
  if (G.ownedUnits.filter(function(u){return u.level>=4}).length === 0) L.push('- ⚠️ 未达成钻石阶（需更多同名合成）\n');
  if (previewCheckpoints.some(function(p){return !p.allMatch;})) L.push('- ❌ 预览伤害 ≠ 实战伤害\n');
  else if (previewCheckpoints.length > 0) L.push('- ✅ 预览 = 实战一致\n');
  L.push('');

  // 七、结论与建议
  L.push('## 七、结论与建议\n');
  var completed = G.day > 10 || (G.phase === 'OVER' && G.day >= 10 && G.runVictory);
  var diamondOk = G.ownedUnits.some(function(u){return u.level >= 4;});
  var pvOk = previewCheckpoints.length > 0 && previewCheckpoints.every(function(p){return p.allMatch;});

  if (completed) L.push('✅ **10 天流程跑通**\n');
  else if (G.day >= 10) L.push('⚠️ **Day10 已到达**\n');
  else L.push('❌ **未完整跑完 Day10**（第 ' + G.day + ' 天终止）\n');

  if (diamondOk) L.push('✅ **钻石阶验收通过**\n');
  else L.push('⚠️ **钻石阶未覆盖**（10 天内未合成出钻石英雄）\n');

  if (pvOk && previewCheckpoints.length > 0) L.push('✅ **预览 ≈ 实战一致**\n');
  else if (previewCheckpoints.length === 0) L.push('⚠️ **预览一致性未验证**\n');
  else L.push('❌ **预览 ≠ 实战**\n');

  if (completed && diamondOk && pvOk) L.push('🏁 **综合结论：建议进入下一阶段**\n');
  else L.push('📋 **综合结论：修复上述问题后再进入下一阶段**\n');

  return L.join('\n');
}

// ========== 执行 ==========
run();
