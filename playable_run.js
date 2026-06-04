#!/usr/bin/env node
/**
 * 10 天 Run 走查（纯逻辑）
 * 支持多文件模式（同 test.js）
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

const useMultiFile = fs.existsSync(path.join(__dirname, 'game.js'));
if (useMultiFile) {
  const moduleFiles = [
    'data.js', 'externalDataAdapter.js',
    'rng.js', 'board.js', 'actions.js', 'elements.js',
    'waves.js', 'battle.js', 'shop.js', 'game.js', 'preview.js',
    'ui.js',
        'damage.js', 'terrain.js', 'battleLog.js',
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

function clearBattleFast() {
  G.monsters.forEach(m => { m.hp = 1; m.maxHp = 1; m.dead = true; });
  G.round = G.maxRound + 1;
  finishMonsters();
}

/** 从商店购买 Pal（最简策略） */
function buyFromShop() {
  if (G.phase !== 'SHOP') return [];
  var bought = [];
  var units = G.shopItems.units || [];
  if (units.length === 0) return [];

  var qualMap = {'钻石':4,'黄金':3,'白银':2,'青铜':1};

  // 排序：quality 降序 > slotSize 升序 > price 升序
  units.sort(function(a, b) {
    var qa = qualMap[a.quality] || 1;
    var qb = qualMap[b.quality] || 1;
    if (qa !== qb) return qb - qa;
    var sa = a.slotSize || 999;
    var sb = b.slotSize || 999;
    if (sa !== sb) return sa - sb;
    return (a.cost || 999) - (b.cost || 999);
  });

  var maxBuy = 2;
  var attempts = 0;
  var idx = 0;
  while (attempts < maxBuy && idx < (G.shopItems.units || []).length && G.phase === 'SHOP') {
    var currentItems = G.shopItems.units || [];
    if (idx >= currentItems.length) break;
    var item = currentItems[idx];
    if (!item) { idx++; continue; }
    if (G.gold < item.cost) { idx++; continue; }

    var slotSize = item.slotSize || 1;
    var backpackUsed = 0;
    G.ownedUnits.forEach(function(u) {
      if (!u.active) backpackUsed += (u.slotSize || 1);
    });
    if (backpackUsed + slotSize > BACKPACK_CAPACITY) { idx++; continue; }

    var goldBefore = G.gold;
    buyUnit(item.id);
    var goldAfter = G.gold;
    if (goldAfter >= goldBefore) { idx++; continue; }

    bought.push({
      day: G.day, phase: G.dayHalf === 1 ? 'noon' : 'night',
      unitId: item.unitId || item.defId, name: item.name,
      price: item.cost, quality: item.quality,
      slotSize: slotSize, goldBefore: goldBefore, goldAfter: goldAfter,
    });
    attempts++;
  }
  return bought;
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
  var allPurchases = [];
  initGame();
  const castleStart = G.playerCastle.hp;
  log('▶ Run 开始 · 我方城堡 ' + castleStart + ' HP');
  log('▶ 初始单位: ' + G.ownedUnits.map(function(u) {
    var def = UNIT_DEFS[u.defId || u.unitId];
    return (def ? def.name : u.defId) + ' Lv' + (u.level || 1);
  }).join(', '));

  for (let targetDay = 1; targetDay <= 10; targetDay++) {
    while (G.day < targetDay && G.phase !== 'OVER') {
      if (G.phase === 'PLAYER') {
        log('  ⚔️ Day' + G.day + ' 战斗 · 怪物: ' + G.monsters.length + '只' +
          (G.monsters[0] ? ' (e.g. ' + G.monsters[0].name + ')' : ''));
        clearBattleFast();
      } else if (G.phase === 'SHOP') {
        var shopCount = G.shopItems.units.length;
        var buys = buyFromShop();
        allPurchases.push.apply(allPurchases, buys);
        var buyLog = buys.length > 0 ? '，购入 ' + buys.length + ' 只' : '';
        log('  🛒 Day' + G.day + ' 商店 · ' + shopCount + '件商品' + buyLog +
          (G.shopItems.units[0] ? ' (e.g. ' + G.shopItems.units[0].name + ')' : ''));
        closeShop();
      } else break;
    }
    if (G.phase === 'OVER') break;
    assert(G.day === targetDay, '应到达 Day' + targetDay);

    if (G.phase === 'PLAYER') {
      clearBattleFast();
    }
    if (G.phase === 'SHOP' && G.dayHalf === 1) {
      var buys = buyFromShop();
      allPurchases.push.apply(allPurchases, buys);
      closeShop();
      if (buys.length > 0) log('   → 中午商店购入 ' + buys.length + ' 只后进下午');
      else log('   → 中午商店后进下午');
    }
    if (G.phase === 'PLAYER' && G.dayHalf === 2) {
      if (G.day === 5) {
        var hasBoss5 = G.monsters.some(function(m) { return m.typeId === 'boss5'; });
        assert(hasBoss5, 'Day5 下午应有 boss5');
        log('  ⚔️ Day5 boss5 确认');
      }
      if (G.day === 10) {
        var hasBoss10 = G.monsters.some(function(m) { return m.typeId === 'boss10'; });
        assert(hasBoss10, 'Day10 下午应有 boss10');
        log('  ⚔️ Day10 boss10 确认');
      }
      clearBattleFast();
    }
    if (G.phase === 'SHOP' && G.dayHalf === 2) {
      if (G.day <= 10) {
        var buys = buyFromShop();
        allPurchases.push.apply(allPurchases, buys);
        closeShop();
      }
    }
  }

  assert(G.phase === 'OVER', 'Day10 最终战后应通关');

  // 最终阵容统计
  var activeUnits = G.ownedUnits.filter(function(u) { return u.active; });
  var backpackUnits = G.ownedUnits.filter(function(u) { return !u.active; });
  var activeCapacityUsed = 0;
  activeUnits.forEach(function(u) { activeCapacityUsed += (u.slotSize || 1); });
  var backpackCapacityUsed = 0;
  backpackUnits.forEach(function(u) { backpackCapacityUsed += (u.slotSize || 1); });
  var totalSpent = 0;
  allPurchases.forEach(function(p) { totalSpent += p.price; });

  return {
    day: G.day, phase: G.phase,
    playerCastleHp: G.playerCastle.hp,
    engineStats: { ...G.engineStats },
    ownedUnitCount: G.ownedUnits.length,
    monsterCount: G.monsters.length,
    gold: G.gold, totalSpent: totalSpent,
    totalPurchases: allPurchases.length, purchases: allPurchases,
    activeUnits: activeUnits, backpackUnits: backpackUnits,
    activeCapacityUsed: activeCapacityUsed, backpackCapacityUsed: backpackCapacityUsed,
  };
}

try {
  const result = runRunWalkthrough();
  var qualNames = {'钻石':'💎','黄金':'🥇','白银':'🥈','青铜':'🥉'};
  var squadDesc = result.activeUnits.map(function(u) {
    var def = UNIT_DEFS[u.defId || u.unitId];
    var name = def ? def.name : u.defId;
    var qual = qualNames[u.quality] || '';
    return name + ' Lv' + (u.level || 1) + qual;
  }).join(', ') || '（无人上阵）';
  var backpackDesc = result.backpackUnits.map(function(u) {
    var def = UNIT_DEFS[u.defId || u.unitId];
    return (def ? def.name : u.defId) + ' Lv' + (u.level || 1);
  }).join(', ') || '（空）';

  var reportLines = [
    '# 10 天 Run 走查报告',
    '',
    '- 终局: Day' + result.day + ' · ' + result.phase,
    '- 城堡 HP: ' + result.playerCastleHp + '（跨天保留）',
    '- 最终金币: ' + result.gold,
    '- 总消费: ' + result.totalSpent + '（购买 ' + result.totalPurchases + ' 次）',
    '- 持有单位: ' + result.ownedUnitCount,
    '- 上阵容量: ' + result.activeCapacityUsed + '/10',
    '- 背包容量: ' + result.backpackCapacityUsed + '/20',
    '- 上阵阵容: ' + squadDesc,
    '- 背包: ' + backpackDesc,
    '- 怪物数: ' + result.monsterCount,
    '- 引擎: 召' + result.engineStats.summonCount + ' / 疗' + result.engineStats.healCount,
    '',
    '## 购买记录',
    ...result.purchases.map(function(p) {
      return '- Day' + p.day + p.phase + '：' + p.name + '（' + p.quality + '）' + p.unitId + '💰' + p.price;
    }),
    result.purchases.length === 0 ? '（无购买）' : '',
    '',
    '## 步骤',
    ...steps.map(s => '- ' + s),
    '',
    '## 结论',
    'PASS — 10 天流程可跑通（使用新 Pal 数据，含购买逻辑）',
  ];
  var report = reportLines.join('\n');

  const outDir = path.join(__dirname, 'recordings');
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, 'playable_run_report.md'), report);
  console.log('\n✅ PASS — 10 天 Run 走查完成，报告已写入 recordings/playable_run_report.md');
  process.exit(0);
} catch (e) {
  console.error('\n❌ FAIL —', e.message);
  console.error('   Current state: day=' + G.day + ' dayHalf=' + G.dayHalf + ' phase=' + G.phase);
  process.exit(1);
}
