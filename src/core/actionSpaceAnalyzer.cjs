/**
 * actionSpaceAnalyzer.cjs — 动作空间统计/平衡分析模块
 *
 * 参考：TabletopGames / TAG（action space, branching factor, AI 测试）
 * 定位：扫描 state 下玩家/AI 有哪些合法动作。
 * 约定：不修改 state。
 */

const { getLegalMoves, getLegalTargets } = require('./tacticalTargeting.cjs');

function living(state, side) {
  return (state.units || []).filter(u => u.side === side && u.alive && u.hp > 0);
}

/**
 * 分析给阵营的动作空间
 * @param {object} state
 * @param {string} side - 'hero' | 'enemy'
 * @returns {object}
 */
function analyzeActionSpace(state, side) {
  const units = living(state, side);
  let legalMoveCount = 0;
  let legalAttackCount = 0;
  let legalSlotUseCount = 0;
  const byUnit = [];

  for (const unit of units) {
    const moves = getLegalMoves(state, unit);
    const slotCount = (unit.shape && unit.shape.slotCount) || 3;
    let attacks = 0;
    let slots = 0;
    for (let i = 0; i < slotCount; i++) {
      const slot = { hitCells: unit.shape?.hitCells || 1, direction: 'right', element: unit.element || '火', layers: unit.shape?.baseLayers || 1, index: i };
      const targets = getLegalTargets(state, unit, slot);
      if (targets.length > 0) {
        attacks += targets.length;
        slots++;
      }
    }
    legalMoveCount += moves.length;
    legalAttackCount += attacks;
    legalSlotUseCount += slots;
    byUnit.push({ unitId: unit.id || unit.petId, name: unit.name, moves: moves.length, attacks, slots });
  }

  return {
    side,
    unitCount: units.length,
    legalMoveCount,
    legalAttackCount,
    legalSlotUseCount,
    estimatedBranchingFactor: legalMoveCount + legalAttackCount + legalSlotUseCount,
    byUnit
  };
}

/**
 * 分析两个阵营的动作空间并对比
 */
function analyzeMatchup(state) {
  return {
    player: analyzeActionSpace(state, 'hero'),
    enemy: analyzeActionSpace(state, 'enemy'),
    totalUnits: (state.units || []).filter(u => u.alive).length
  };
}

module.exports = { analyzeActionSpace, analyzeMatchup };
