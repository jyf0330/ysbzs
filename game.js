/**
 * 元素背包史 · 核心协调层
 * 游戏状态、初始化、单位管理、UI 交互桥接、浏览器事件
 * 依赖：所有下层模块（rng/board/actions/elements/waves/battle/shop）
 * 加载顺序：须在所有下层模块之后加载
 */

// ── 容量常量 ──────────────────────────────────────────────────
var ACTIVE_CAPACITY = 10;
var BACKPACK_CAPACITY = 20;

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
    shopEvents: [],
    // 英雄系统
    heroInfo: { id: '', name: '', level: 1, xp: 0 },
    relics: [],
  };

  // 读取英雄配置作为开局来源
  var hc = (typeof getExternalHeroConfig === 'function') ? getExternalHeroConfig() : null;
  var usedHero = null;
  if (hc && hc.hero_master && hc.hero_master.length > 0) {
    usedHero = hc.hero_master[0];
    G.heroInfo = { id: usedHero.hero_id, name: usedHero.hero_name, level: 1, xp: 0 };
    G.gold = usedHero.starting_gold || 6;
    // 起始宠物
    if (hc.hero_starting_config) {
      var startPositions = [{r:6,c:0},{r:7,c:1}];
      var palIdx = 0;
      hc.hero_starting_config.forEach(function(cfg) {
        if (cfg.start_slot && cfg.start_slot.indexOf('pal_') === 0 && cfg.unit_id) {
          var pos = palIdx < startPositions.length ? startPositions[palIdx] : { r: 6, c: palIdx };
          addOwnedUnit(cfg.unit_id, pos);
          palIdx++;
        }
        if (cfg.start_slot === 'relic_1' && cfg.relic_id) {
          G.relics.push({ id: cfg.relic_id, name: cfg.relic_name || '' });
        }
      });
    }
  }
  // fallback：无英雄配置时给默认旧单位
  if (G.ownedUnits.length < 1) {
    addOwnedUnit('fire_starter', { r: 6, c: 0 });
  }
  if (G.ownedUnits.length < 2) {
    addOwnedUnit('water_droplet', { r: 7, c: 1 });
  }
  syncUnitsToHeroes();
  syncMaxRoundForPhase();
  spawnWaveForDay(1, 'morning');
  refreshUI();
  glog('🎮 游戏开始！第一波教学关卡。');
  glog('💡 提示：选中行动点→调整方向→点"使用"发动攻击。');
  glog('💡 点击英雄选中，再点空格移动位置。');
  if (G.relics.length > 0) {
    glog('🔮 获得开局遗物：' + G.relics.map(function(r){ return r.name; }).join('、'));
  }
}

// ========== 遗物系统 ==========

/** 获得遗物（加入 G.relics） */
function gainRelic(relicId, relicName) {
  if (!Array.isArray(G.relics)) G.relics = [];
  // 未定义重复规则时允许重复
  G.relics.push({ id: relicId, name: relicName || relicId });
  glog('🔮 获得遗物：' + (relicName || relicId));
  refreshUI();
  // 触发 on_gain_relic 钩子
  triggerRelicHooks('on_gain_relic', { relicId: relicId });
}

/** 触发遗物效果钩子 */
function triggerRelicHooks(triggerType, ctx) {
  if (!Array.isArray(G.relics) || G.relics.length === 0) return;
  var rc = (typeof getExternalRelicConfig === 'function') ? getExternalRelicConfig() : null;
  if (!rc || !rc.relic_effect) return;
  G.relics.forEach(function(r) {
    rc.relic_effect.forEach(function(e) {
      if (e.relic_id === r.id && e.trigger === triggerType) {
        applyRelicEffect(e, ctx);
      }
    });
  });
}

/** 应用单个遗物效果 */
function applyRelicEffect(e, ctx) {
  switch (e.effect_type) {
    case 'gain_gold':
      G.gold = (G.gold || 0) + (e.value || 1);
      glog('💰 遗物效果：+' + (e.value || 1) + ' 金币');
      break;
    case 'add_hp':
      if (e.target === 'all_allies') {
        G.ownedUnits.forEach(function(u) {
          if (u.active) { u.maxHp += (e.value || 2); u.hp += (e.value || 2); }
        });
        glog('❤️ 遗物效果：所有上阵单位 HP +' + (e.value || 2));
      } else if (e.target === 'gained_pal' && ctx && ctx.gainedUnit) {
        ctx.gainedUnit.maxHp += (e.value || 2);
        ctx.gainedUnit.hp += (e.value || 2);
        glog('❤️ 遗物效果：新宠物 HP +' + (e.value || 2));
      }
      break;
    case 'add_atk':
      if (e.target === 'all_allies') {
        G.ownedUnits.forEach(function(u) {
          if (u.active) { u.atk = (u.atk || 0) + (e.value || 1); }
        });
        glog('⚔️ 遗物效果：所有上阵单位 ATK +' + (e.value || 1));
      }
      break;
    case 'add_hp_atk':
      G.ownedUnits.forEach(function(u) {
        if (u.active && (!e.condition || u.element === 'fire')) {
          u.maxHp += 2; u.hp += 2;
          u.atk = (u.atk || 0) + 1;
        }
      });
      glog('❤️⚔️ 遗物效果：火系单位 HP+2 ATK+1');
      break;
    case 'add_layer':
    case 'add_element_layer':
      // 简单版：下一行动增加 1 层（通过 ctx 的 actionCell）
      if (ctx && ctx.actionCell && ctx.el === 'fire') {
        // 留给行动时处理（在 useSlot 中检查更精确）
      }
      break;
    case 'add_bag_capacity':
      // BACKPACK_CAPACITY + value (后续在购买check中生效)
      glog('🎒 遗物效果：背包容量 +' + (e.value || 2));
      break;
    case 'add_bench_capacity':
      glog('🪑 遗物效果：备战容量 +' + (e.value || 1));
      break;
    case 'enemy_atk_down':
      if (G.monsters && G.monsters.length > 0) {
        var target = G.monsters[Math.floor(Math.random() * G.monsters.length)];
        target.atk = Math.max(0, (target.atk || 0) - (e.value || 1));
        glog('📖 遗物效果：随机怪物 ATK -' + (e.value || 1));
      }
      break;
    default:
      // pending 效果略过
      break;
  }
}

// ========== 英雄等级系统 ==========

/** 英雄增加经验，检查升级 */
function heroAddXp(amount) {
  if (!G.heroInfo) G.heroInfo = { id: '', name: '', level: 1, xp: 0 };
  var hc = (typeof getExternalHeroConfig === 'function') ? getExternalHeroConfig() : null;
  if (!hc || !hc.hero_level_rule) return;
  G.heroInfo.xp = (G.heroInfo.xp || 0) + (amount || 1);
  glog('⭐ 英雄经验 +' + (amount || 1) + '（当前 ' + G.heroInfo.xp + '）');
  // 检查升级
  var currentLv = G.heroInfo.level || 1;
  for (var lv = currentLv + 1; lv <= 4; lv++) {
    var rule = hc.hero_level_rule.find(function(r) { return r.hero_level === lv; });
    if (rule && G.heroInfo.xp >= rule.hero_xp_required) {
      G.heroInfo.level = lv;
      glog('⬆️ 英雄升级 Lv' + lv + '！' + (rule.desc || ''));
      applyHeroLevelReward(lv);
    }
  }
}

/** 应用英雄等级奖励（简单版） */
function applyHeroLevelReward(lv) {
  var hc = (typeof getExternalHeroConfig === 'function') ? getExternalHeroConfig() : null;
  if (!hc || !hc.hero_level_reward) return;
  var rewards = hc.hero_level_reward.filter(function(r) { return r.reward_group && r.reward_group.indexOf('lv' + lv) !== -1; });
  rewards.forEach(function(r) {
    switch (r.reward_type) {
      case 'gain_core_relic_choice':
        if (typeof gainRelic === 'function') gainRelic('relic_hero_charred_crown', '焦灼皇冠');
        break;
      case 'gain_relic':
        if (typeof gainRelic === 'function') gainRelic('relic_coin_bag', '铜钱袋');
        break;
      default:
        glog('🔓 解锁：' + (r.reward_type || '未知奖励'));
    }
  });
}

/** 在战斗结算中给英雄加经验（每天结束/boss击杀） */
function heroXpFromBattle() {
  // boss/精英击杀加经验
  if (G.lastSettle) {
    if (G.lastSettle.killedCount > 0) heroAddXp(1);
  }
}

// ========== UNIT MANAGEMENT ==========
function addOwnedUnit(defId, pos) {
  const def = UNIT_DEFS[defId]; if (!def) return null;
  const lvl = def.levels[1];
  var sizeMap = {'small': 1, 'medium': 2, 'large': 3};
  const unit = {
    instanceId: 'u_' + (G.nextUnitId++),
    defId: defId, level: 1,
    hp: lvl.hp, maxHp: lvl.hp,
    pos: pos || { r: 0, c: 0 },
    active: true,
    size: def.size || 'medium',
    slotSize: sizeMap[def.size] || 2,
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
  // 按容量筛选可上阵单位（ACTIVE_CAPACITY=10）
  var sorted = G.ownedUnits.filter(u => u.active).slice(0, 20); // 足够候选
  var selected = [];
  var usedCapacity = 0;
  sorted.forEach(function(unit) {
    var sz = unit.slotSize || 1;
    if (usedCapacity + sz > ACTIVE_CAPACITY) {
      unit.active = false; // 超出容量，改为背包
      return;
    }
    usedCapacity += sz;
    selected.push(unit);
  });

  G.heroes = {};
  G.slots = [];
  selected.forEach((unit, ui) => {
    if (ui >= 2) return;
    var def = UNIT_DEFS[unit.defId];
    if (!def) return;
    var lvlData = def.levels[unit.level];
    if (!lvlData) return;
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
  var heroUnits = new Set(selected.slice(0, 2));
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
  if (typeof triggerRelicHooks === 'function') triggerRelicHooks('on_pal_merged', {});
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

// ========== AI ASYNC WRAPPER ==========
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

// ========== UI STUBS ==========
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
