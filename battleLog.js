/**
 * 元素背包史 · 战斗日志模块
 * 管：结构化事件 → 中文日志文案
 * 不管：核心结算逻辑、UI 渲染、DOM 操作
 * 依赖：data.js（TRAP_CONFIG/EL）
 * 加载顺序：... → battle.js → battleLog.js（覆盖同名函数作为权威源）
 */

// ========== 结构化事件构建 ==========

/** 构建陷阱触发事件 */
function buildTrapTriggerEvent(monster, pos, el, layers, dmg, oldHp, newHp, apDelta) {
  return {
    type: 'trap_trigger',
    unitId: monster.id || monster.name,
    unitName: monster.name,
    pos: { r: pos.r, c: pos.c },
    element: el,
    layers: layers,
    damage: dmg,
    oldHp: oldHp,
    newHp: newHp,
    apDelta: apDelta || 0,
    killed: monster.hp <= 0,
  };
}

// ========== 事件 → 中文格式化 ==========

/** 格式化任意战斗事件为中文日志字符串 */
function formatBattleEvent(event) {
  if (!event) return '';
  switch (event.type) {
    case 'trap_trigger': return formatTrapTrigger(event);
    case 'trap_kill': return formatTrapKill(event);
    default: return event.type + ' ' + JSON.stringify(event);
  }
}

/** 格式化陷阱触发 */
function formatTrapTrigger(event) {
  var cfg = (typeof getTrapConfig === "function" ? getTrapConfig() : {})[event.element] || {};
  var name = cfg.name || event.element + '陷阱';
  var hpChange = '';
  if (event.oldHp !== undefined && event.newHp !== undefined) {
    hpChange = '，HP ' + event.oldHp + '→' + event.newHp;
  }
  var apChange = '';
  if (event.apDelta) {
    var newAp = Math.max(0, (event.oldAp || 3) + event.apDelta);
    apChange = '，AP ' + (event.oldAp || 3) + '→' + newAp;
  }
  return '🔥 ' + event.unitName + ' 踩中' + name + event.layers + '！' + hpChange + apChange;
}

/** 格式化陷阱击杀 */
function formatTrapKill(event) {
  return '💀 ' + event.unitName + ' 被陷阱击杀！';
}
