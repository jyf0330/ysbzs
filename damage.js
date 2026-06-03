/**
 * 元素背包史 · 伤害公式模块
 * 统一入口：元素伤害、陷阱伤害、引爆伤害、怪物攻击、城堡伤害
 * 依赖：data.js（EL/ADV/TRAP_CONFIG）
 * 加载顺序：elements.js → damage.js（覆盖同名函数，作为权威源）
 */

// ========== 基础伤害公式 ==========

/**
 * 三角数伤害：层数 → 基础三角伤害
 * explDmg(1)=1, explDmg(2)=3, explDmg(3)=6, explDmg(4)=10
 */
function explDmg(stk) { return stk * (stk + 1) / 2; }
function calcElementLayerDamage(layers) { return layers * (layers + 1) / 2; }

/**
 * 统一元素伤害计算 — battle.js(实战) 和 ui.js(预览) 共用
 *
 * @param {number} layers - 元素层数
 * @param {string|null} targetEl - 目标的元素类型（用于克制判断），null 或无元素则无克制
 * @param {string} ourEl - 我方元素类型
 * @param {object} [opts]
 * @param {number} [opts.advHitBonus=0] - 克制增伤被动加值（风风灵）
 * @param {number} [opts.spaceBonus=0] - 空格引爆加值（火种灵）
 * @returns {{ damage: number, isAdv: boolean, baseDmg: number, totalBase: number }}
 */
function calcElementDamage(layers, targetEl, ourEl, opts) {
  opts = opts || {};
  const baseDmg = explDmg(layers);
  const totalBase = baseDmg + (opts.spaceBonus || 0);
  const isAdv = targetEl && ADV[ourEl] === targetEl;
  const mult = isAdv ? 2 : 1;
  const advBonus = isAdv ? (opts.advHitBonus || 0) : 0;
  const damage = totalBase * mult + advBonus;
  return { damage, isAdv, baseDmg, totalBase };
}

// ========== 陷阱伤害 ==========

/**
 * 地形陷阱伤害：输入陷阱层数，输出伤害
 * 当前与元素伤害同公式，后续可独立调整
 */
function calcTrapDamage(layers) {
  return explDmg(Math.max(0, Number(layers) || 0));
}

// ========== 未来扩展入口（预留）==========

function calcAttackDamage(attacker, target, context) {
  // 怪物攻击伤害（当前在 monsterAct 中内联计算）
  return attacker.atk || 1;
}
