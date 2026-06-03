/**
 * 元素背包史 · 地形陷阱模块（独立系统）
 * 管：陷阱叠加、地形读取、踩入触发、AP变化、触发日志
 * 不管：UI中文显示、怪物寻路、元素引爆、英雄行动槽
 * 依赖：damage.js（calcTrapDamage）、data.js（TRAP_CONFIG/ELEMS）、board.js
 * 加载顺序：elements.js → battle.js → terrain.js（覆盖同名函数，作为权威源）
 */

// ========== 地形结构 ==========

/** 初始化单格地形结构 */
function ensureTerrain(pos) {
  if (!G.terrainCells) G.terrainCells = {};
  var key = pos.r + ',' + pos.c;
  if (!G.terrainCells[key]) G.terrainCells[key] = { fire:0, water:0, wind:0, earth:0 };
  return G.terrainCells[key];
}

/** 获取单格地形（无则返回空对象） */
function getTerrain(pos) {
  if (!G.terrainCells) return { fire:0, water:0, wind:0, earth:0 };
  return G.terrainCells[pos.r + ',' + pos.c] || { fire:0, water:0, wind:0, earth:0 };
}

/** 清除指定格的全部陷阱 */
function clearTerrain(pos) {
  var key = pos.r + ',' + pos.c;
  if (G.terrainCells && G.terrainCells[key]) G.terrainCells[key] = { fire:0, water:0, wind:0, earth:0 };
}

// ========== 陷阱操作 ==========

/** 向指定格添加元素陷阱（叠加，不覆盖） */
function addTrapLayers(pos, el, layers) {
  if (!layers || layers <= 0) return;
  var ter = ensureTerrain(pos);
  ter[el] = (ter[el] || 0) + layers;
}

/** 元素引爆结算后：将该格元素层转移到地形陷阱 */
function convertElementsToTrapsAfterExplosion(pos) {
  var key = pos.r + ',' + pos.c;
  var elData = G.elementCells[key];
  if (!elData) return;
  var changed = false;
  ELEMS.forEach(function(el) {
    var slot = elData[el];
    if (slot && slot.layers > 0) {
      addTrapLayers(pos, el, slot.layers);
      slot.layers = 0;
      slot.willExplode = false;
      changed = true;
    }
  });
  if (changed) syncBoardElementFromElementCells(pos);
}

// ========== 怪物踩入触发 ==========

/**
 * 怪物进入格子时触发地形陷阱
 * 仅 monster 类型触发；hero/summon 不触发
 * 多元素陷阱逐个结算
 * 触发后清空该格陷阱
 */
function resolveTerrainOnEnter(monster, pos) {
  if (!G.terrainCells) return;
  var key = pos.r + ',' + pos.c;
  var traps = G.terrainCells[key];
  if (!traps) return;

  ELEMS.forEach(function(el) {
    var layers = traps[el] || 0;
    if (layers <= 0) return;

    var dmg = calcTrapDamage(layers);
    var cfg = TRAP_CONFIG[el] || {};
    var apDelta = cfg.apDelta || 0;

    var oldHp = monster.hp;
    var oldAp = monster.ap !== undefined ? monster.ap : 3;

    monster.hp = Math.max(0, monster.hp - dmg);
    if (monster.ap !== undefined) monster.ap = Math.max(0, monster.ap + apDelta);

    // 构建结构化事件 → battleLog.js 负责格式化
    if (dmg > 0 || apDelta) {
      if (monster.hp <= 0) {
        monster.dead = true;
        glog(formatBattleEvent({ type: 'trap_kill', unitName: monster.name }));
      } else {
        var evt = buildTrapTriggerEvent(monster, pos, el, layers, dmg, oldHp, monster.hp, apDelta);
        glog(formatBattleEvent(evt));
      }
    }
  });

  // 触发后清空该格陷阱
  G.terrainCells[key] = { fire:0, water:0, wind:0, earth:0 };
}
