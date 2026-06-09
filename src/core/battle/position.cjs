// @ts-check

/**
 * @typedef {{r:number,c:number}} Position
 * @typedef {{id:string, side?:string, alive?:boolean, hp?:number, position?:Position, moveRange?:number, ap?:number, hasAttacked?:boolean, name?:string, displayName?:string}} BattleUnit
 * @typedef {{phase?:string, selected?:{unitId?:string, cell?:Position}, units?:BattleUnit[], leaders?:{player?:BattleUnit, enemy?:BattleUnit}, board?:{cells?:Array<{r:number,c:number,unitId?:string|null}>}}} BattleState
 */

/**
 * Build the position and movement API from battle.cjs dependencies.
 *
 * @param {Record<string, any>} deps
 * @returns {{boardUnitAt:(state:BattleState,pos:Position)=>BattleUnit|null,canStandAt:(state:BattleState,actor:BattleUnit,pos:Position)=>boolean,allStandCells:(state:BattleState,actor:BattleUnit)=>Position[],moveHero:(state:BattleState,unitId?:string,to?:Position)=>boolean,moveUnitGeneral:(state:BattleState,unit:BattleUnit,to:Position)=>boolean}}
 */
function createPositionModule(deps) {
  const { clone, getUnit, living, leaders, pushEvent, normalizePosition, getCell, syncBoardUnits, BOARD_ROWS, BOARD_COLS, inBoard, dist, effectiveMoveRange, syncDerivedBoard, startBattle } = deps;
/**
 * @param {BattleState} state
 * @param {Position} pos
 * @returns {BattleUnit|null}
 */
function boardUnitAt(state, pos) {
  return (state.units || []).find(u => u.alive && u.position && u.position.r === pos.r && u.position.c === pos.c)
    || leaders(state).find(l => l.alive !== false && l.hp > 0 && l.position && l.position.r === pos.r && l.position.c === pos.c)
    || null;
}

/**
 * @param {BattleState} state
 * @param {BattleUnit} actor
 * @param {Position} pos
 * @returns {boolean}
 */
function canStandAt(state, actor, pos) {
  if (!inBoard(pos)) return false;
  const occ = boardUnitAt(state, pos);
  return !occ || occ.id === actor.id;
}

function allStandCells(state, actor) {
  const out = [];
  for (let r = 0; r < BOARD_ROWS; r++) for (let c = 0; c < BOARD_COLS; c++) {
    const p = { r, c };
    if (canStandAt(state, actor, p)) out.push(p);
  }
  return out;
}

/**
 * @param {BattleState} state
 * @param {string=} unitId
 * @param {Position=} to
 * @returns {boolean}
 */
function moveHero(state, unitId, to) {
  if (state.phase === 'init') startBattle(state);
  const unit = getUnit(state, unitId || state.selected?.unitId) || living(state, 'hero')[0];
  if (!unit || unit.side !== 'hero') { pushEvent(state, 'MOVE_HERO_BLOCKED', { text: '移动失败：未选择我方单位。' }); return false; }
  const target = normalizePosition(to || state.selected?.cell || unit.position);
  if (!inBoard(target)) { pushEvent(state, 'MOVE_HERO_BLOCKED', { unitId: unit.id, text: `移动失败：R${target.r}C${target.c} 超出棋盘。` }); return false; }
  const cell = getCell(state, target.r, target.c);
  if (cell && cell.unitId && cell.unitId !== unit.id) { pushEvent(state, 'MOVE_HERO_BLOCKED', { unitId: unit.id, text: `移动失败：R${target.r}C${target.c} 已被占用。` }); return false; }
  const from = clone(unit.position || { r: 0, c: 0 });
  // 攻击后锁定位置：如果 hasAttacked 为 true，禁止再次移动
  if (unit.hasAttacked) {
    pushEvent(state, 'MOVE_HERO_BLOCKED', { unitId: unit.id, text: `移动失败：${unit.displayName} 本回合已攻击，位置锁定。` });
    return false;
  }
  const d = dist(from, target);
  const moveRange = effectiveMoveRange(state, unit);
  if (d > moveRange) { pushEvent(state, 'MOVE_HERO_BLOCKED', { unitId: unit.id, from, to: target, moveRange, text: `移动失败：${unit.name} 移动力${moveRange}，距离${d}。` }); return false; }
  unit.position = target;
  pushEvent(state, 'MOVE_HERO', { unitId: unit.id, from, to: target, text: `${unit.displayName} 移动：R${from.r}C${from.c}→R${target.r}C${target.c}。` });
  syncDerivedBoard(state);
  return true;
}

function moveUnitGeneral(state, unit, to) {
  if (!unit || !to) return false;
  const from = { r: unit.position?.r ?? 0, c: unit.position?.c ?? 0 };
  unit.position = { r: to.r, c: to.c };
  syncBoardUnits(state);
  syncDerivedBoard(state);
  return true;
}

  return { boardUnitAt, canStandAt, allStandCells, moveHero, moveUnitGeneral };
}

module.exports = { createPositionModule };
