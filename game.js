/**
 * 元素背包史 · 核心协调层
 * 游戏状态、初始化、单位管理、UI 交互桥接、浏览器事件
 * 依赖：所有下层模块（rng/board/actions/elements/waves/battle/shop）
 * 加载顺序：须在所有下层模块之后加载
 */

// ========== GAME STATE ==========
let G;

// ========== INIT ==========
function initGame() {
  G = {
    phase: 'PLAYER', day: 1, dayHalf: 0, wave: 1, round: 1, maxRound: 2,
    hitCount: 0, gold: 8, savedCoins: 0,
    board: mkBoard(),
    heroes: {}, monsters: [], slots: [],
    ownedUnits: [], nextUnitId: 0,
    shopItems: { units: [], consumables: [] },
    shopFrozen: { units: new Set(), consumables: new Set() },
    shopTier: 1,
    playerCastle: { hp: 80, maxHp: 80, pos: { r: 7, c: 0 } },
    enemyCastle: { hp: 80, maxHp: 80, pos: { r: 0, c: 7 } },
    summons: [], _nextSummonId: 0,
    engineStats: { summonCount: 0, healCount: 0, chainCount: 0, perfectCount: 0 },
    growth: { summonTier: 0, healTier: 0, chainTier: 0 },
    lastSettle: null, runVictory: null, aiBattleStatus: null,
    elementCells: {}, explosionThreshold: 3, previewEvents: [],
    selHero: null, selSlot: null, selectedCell: null, prevCells: [], heroPrev: [],
    explPos: null, backpack: [], _bpCnt: 0, monWarn: [],
    coreSnapshot: null, coreVersion: 0, actionLog: [],
  };
  addOwnedUnit('fire_starter', { r: 6, c: 0 });
  addOwnedUnit('water_droplet', { r: 7, c: 1 });
  syncUnitsToHeroes();
  syncMaxRoundForPhase();
  spawnWaveForDay(1, 'morning');
  refreshUI();
  glog('🎮 游戏开始！第一波教学关卡。');
  glog('💡 提示：选中行动点→调整方向→点"使用"发动攻击。');
  glog('💡 点击英雄选中，再点空格移动位置。');
}

// ========== UNIT MANAGEMENT ==========
function addOwnedUnit(defId, pos) {
  const def = UNIT_DEFS[defId]; if (!def) return null;
  const lvl = def.levels[1];
  const unit = {
    instanceId: 'u_' + (G.nextUnitId++),
    defId: defId, level: 1,
    hp: lvl.hp, maxHp: lvl.hp,
    pos: pos || { r: 0, c: 0 },
    active: true,
  };
  G.ownedUnits.push(unit);
  return unit;
}

function getUnitByHeroId(hid) {
  const hero = G.heroes[hid];
  if (!hero || !hero.unitId) return null;
  return G.ownedUnits.find(u => u.instanceId === hero.unitId);
}

function syncHeroHPToUnits() {
  Object.values(G.heroes).forEach(h => {
    const u = getUnitByHeroId(h.id);
    if (u) u.hp = h.hp;
  });
}

function syncUnitsToHeroes() {
  var MAX_ACTIVE = 6;
  var active = G.ownedUnits.filter(u => u.active).slice(0, MAX_ACTIVE);
  G.heroes = {};
  G.slots = [];
  active.forEach((unit, ui) => {
    if (ui >= 2) return;
    var def = UNIT_DEFS[unit.defId];
    var lvlData = def.levels[unit.level];
    var hid = ui === 0 ? 'ha' : 'hb';
    unit.pos = unit.pos || { r: 6 + ui, c: 0 };
    G.heroes[hid] = {
      id: hid, name: def.name + (unit.level > 1 ? ' Lv' + unit.level : ''),
      hp: unit.hp, maxHp: unit.maxHp,
      pos: { r: unit.pos.r, c: unit.pos.c },
      unitId: unit.instanceId, _acted: false,
    };
    lvlData.slots.forEach((slotDef, si) => {
      G.slots.push({
        id: ui * 3 + si,
        el: slotDef.el || 'water', sn: slotDef.sn,
        tier: slotDef.tier, dir: slotDef.dir,
        hid: hid, used: false,
        skill: slotDef.skill || null,
        consumeLayers: !!slotDef.consumeLayers,
        bonusHp: slotDef.bonusHp || 0,
        count: slotDef.count || 1,
        layers: slotDef.layers,
        centerBonus: slotDef.centerBonus,
        conditional: slotDef.conditional,
      });
    });
  });
  var heroUnits = new Set(active.slice(0, 2));
  G.ownedUnits.forEach(u => { if (!heroUnits.has(u)) u.active = false; });
}

function mergeUnits(fromUnit, toUnit) {
  if (fromUnit.defId !== toUnit.defId) return false;
  if (toUnit.level >= 4) { showMsg('已是最高4级，无法继续合成！'); return false; }
  var oldLvl = toUnit.level;
  toUnit.level++;
  var def = UNIT_DEFS[toUnit.defId];
  var lvlData = def.levels[toUnit.level];
  toUnit.maxHp = lvlData.hp;
  toUnit.hp = Math.min(toUnit.hp + (lvlData.hp - def.levels[oldLvl].hp), lvlData.hp);
  G.ownedUnits = G.ownedUnits.filter(u => u.instanceId !== fromUnit.instanceId);
  var gradeNames = ['','青铜','白银','黄金','钻石'];
  glog('⬆️ ' + def.name + ' 合成升级！' + (gradeNames[oldLvl]||'Lv'+oldLvl) + '→' + (gradeNames[toUnit.level]||'Lv'+toUnit.level));
  addLevelupUnit();
  syncUnitsToHeroes();
  return true;
}

// ========== UI INTERACTION ==========
function selHero(id) {
  if (G.phase !== 'PLAYER') return;
  var wasSel = G.selHero === id;
  G.selHero = wasSel ? null : id;
  G.selSlot = null; G.prevCells = []; G.explPos = null; G.heroPrev = [];
  if (!wasSel && G.selHero) {
    var hero = G.heroes[id];
    if (hero) G.selectedCell = { r: hero.pos.r, c: hero.pos.c };
  } else if (wasSel) {
    G.selectedCell = null;
  }
  refreshUI();
}

function moveHero(r, c) {
  if (!G.selHero || G.phase !== 'PLAYER') return;
  var hero = G.heroes[G.selHero];
  if (hero._acted) { glog('⚠️ 该英雄已行动，本回合无法再移动！'); return; }
  if (heroAt({ r: r, c: c }) || monAt({ r: r, c: c }) || summonAt({ r: r, c: c }) || hasElementAt({ r: r, c: c }) || castleAt({ r: r, c: c })) {
    glog('⚠️ 目标格已占用！'); return;
  }
  glog('🚶 ' + hero.name + '移动到(' + r + ',' + c + ')');
  hero.pos = { r: r, c: c };
  refreshUI();
}

function selSlot(idx) {
  if (G.phase !== 'PLAYER') return;
  var s = G.slots[idx]; if (!s || s.used) return;
  G.selSlot = idx;
  updPreview();
  refreshUI();
}

function updPreview() {
  if (G.selSlot === null) { G.prevCells = []; return; }
  var s = G.slots[G.selSlot]; if (!s) return;
  var hero = G.heroes[s.hid]; if (!hero) return;
  G.prevCells = atkCells(hero.pos, s.sn, s.dir);
}

function setDir(idx, dir) {
  var s = G.slots[idx]; if (!s) return;
  s.dir = dir;
  updPreview();
  refreshUI();
}

function setHero(idx, hid) {
  var s = G.slots[idx]; if (!s) return;
  s.hid = hid;
  updPreview();
  refreshUI();
}

// ========== AI ASYNC WRAPPER (browser-specific) ==========
async function runAiBattleTurn_async(opts) {
  opts = opts || {};
  if (G.phase !== 'PLAYER') return buildAiBattleTurnPlan();
  var btn = document.getElementById('exa');
  if (btn) { btn.disabled = true; btn.classList.add('ai-busy'); }
  var plan = planAiBattleTurn();
  if (!plan.canRun) { if (btn) { btn.disabled = false; btn.classList.remove('ai-busy'); } return plan; }
  G.aiBattleStatus = { phase: 'executing', summary: plan.summary, moves: plan.moves.length, actions: plan.actions.length };
  G.actionLog.push({ type: 'AI_BATTLE', desc: plan.summary, moves: plan.moves.length, actions: plan.actions.length });
  render();
  for (var mi = 0; mi < plan.moves.length; mi++) {
    var m = plan.moves[mi];
    var hero = G.heroes[m.heroId];
    if (hero) hero.pos = { r: m.to.r, c: m.to.c };
    await new Promise(function(r) { setTimeout(r, 120); });
  }
  for (var ai = 0; ai < plan.actions.length; ai++) {
    var a = plan.actions[ai];
    var s = G.slots[a.slotId];
    if (!s || s.used || !G.heroes[s.hid]) continue;
    if (atkCells(G.heroes[s.hid].pos, s.sn, s.dir).length === 0) continue;
    s.used = true;
    await new Promise(function(r) { setTimeout(r, 80); });
  }
  glog('⚡ AI 战斗执行：移动' + plan.moves.length + '步，施放' + plan.actions.length + '个符文。');
  if (opts.endTurn !== false) endPlayerTurn();
  if (btn) { btn.disabled = false; btn.classList.remove('ai-busy'); }
  return plan;
}

function runAiBattleTurn() {
  if (typeof global !== 'undefined' && global.__TEST__) return runAiBattleTurn_sync();
  return runAiBattleTurn_async({ endTurn: true });
}

function execAllHeroSlots_sync() {
  var plan = buildAiBattleTurnPlan();
  executeAiBattlePlan_sync(plan);
  return plan;
}

async function execAllHeroSlots_async() {
  return runAiBattleTurn_async({ endTurn: true });
}

function execAllHeroSlots() {
  if (typeof global !== 'undefined' && global.__TEST__) return execAllHeroSlots_sync();
  return execAllHeroSlots_async();
}

// ========== BROWSER EVENTS ==========
function toggleFullscreen() {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen().catch(function() {});
  } else {
    document.exitFullscreen();
  }
}
if (typeof document !== 'undefined' && typeof document.addEventListener === 'function') {
  document.addEventListener('keydown', function(e) {
    if (e.key === 'F11') { e.preventDefault(); toggleFullscreen(); }
    if (e.key === 'd' || e.key === 'D') {
      try {
        var on = isDebugMode();
        localStorage.setItem('ysbzs_debug', on ? '0' : '1');
        scheduleDebugPanelUpdate();
      } catch (err) {}
    }
  });
}

// ========== UI STUBS (implemented in ui.js, overridden at load time) ==========
function glog() {}
function showMsg() {}
function showRunEnd() {}
function refreshUI() {}
function renderShop() {}
function render() {}
function scheduleDebugPanelUpdate() {}
function isDebugMode() { return false; }
function k(pos) { return pos.r + ',' + pos.c; }
function buildRunEndVM() { return { title: '', sections: [] }; }
function buildDebugPanelVM() { return {}; }
function pushReplayStep() {}
