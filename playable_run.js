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
    'waves.js', 'battle.js', 'shop.js', 'game.js', 'ui.js',
    'damage.js', 'terrain.js', 'battleLog.js', 'preview.js',
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
        log('  🛒 Day' + G.day + ' 商店 · ' + shopCount + '件商品' +
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
      closeShop();
      log('   → 中午商店后进下午');
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
      if (G.day <= 10) closeShop();
    }
  }

  assert(G.phase === 'OVER', 'Day10 最终战后应通关');

  return {
    day: G.day,
    phase: G.phase,
    playerCastleHp: G.playerCastle.hp,
    engineStats: { ...G.engineStats },
    ownedUnitCount: G.ownedUnits.length,
    monsterCount: G.monsters.length,
  };
}

try {
  const result = runRunWalkthrough();
  const report = [
    '# 10 天 Run 走查报告',
    '',
    '- 终局: Day' + result.day + ' · ' + result.phase,
    '- 城堡 HP: ' + result.playerCastleHp + '（跨天保留）',
    '- 持有单位: ' + result.ownedUnitCount,
    '- 怪物数: ' + result.monsterCount,
    '- 引擎: 召' + result.engineStats.summonCount + ' / 疗' + result.engineStats.healCount,
    '',
    '## 步骤',
    ...steps.map(s => '- ' + s),
    '',
    '## 结论',
    'PASS — 10 天流程可跑通（使用新 Pal 数据）',
  ].join('\n');

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
