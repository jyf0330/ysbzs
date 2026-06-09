// @ts-check

/**
 * @typedef {{r:number,c:number}} Position
 * @typedef {{id:string, side?:string, camp?:string, alive?:boolean, hp?:number, ap?:number, actionApSpent?:number, actionSlotsUsed?:Record<string, boolean>, shape?:Record<string, any>, element?:string, position?:Position, displayName?:string}} BattleUnit
 * @typedef {{phase?:string, selected?:Record<string, any>, actionDirs:Record<string, string>, units?:BattleUnit[]}} BattleState
 * @typedef {{slotId:string,index:number,label:string,element:string,layers:number,shapeId:string|null,shapeName:string,hitCells:number,direction:string,used:boolean,availableAp:number,canUse:boolean}} ActionSlot
 */

/**
 * Build action-slot helpers from battle.cjs dependencies.
 *
 * @param {Record<string, any>} deps
 * @returns {{slotsForUnit:(state:BattleState,unit:BattleUnit)=>ActionSlot[],parseSlotIndex:(slotId:any)=>number,targetCellsForSlot:(state:BattleState,actor:BattleUnit,slot:ActionSlot,selectedCell?:Position|null)=>Position[],targetsAtCells:(state:BattleState,cells:Position[],camp?:string)=>BattleUnit[],unitsAtCells:(state:BattleState,cells:Position[],side?:string)=>BattleUnit[],setActionDirection:(state:BattleState,unitId?:string,slotId?:any,dir?:string)=>boolean,useActionSlot:(state:BattleState,unitId?:string,slotId?:any,targetCell?:Position|null,options?:{ap?:number})=>boolean}}
 */
function createActionsModule(deps) {
  const { pushEvent, mech, elementRules, explodeIfEnemyOnFire, clone, getUnit, living, opposingCamp, unitCamp, sideForCamp, actionDirs, dirDelta, inBoard, normalizePosition, getCell, combatTargets, applyElement, applyElementToCell, damageUnit, syncDerivedBoard, startBattle } = deps;
function unitApMax(unit) { return Math.max(1, Number(unit?.ap || 1)); }
function unitApSpent(unit) { return Math.max(0, Number(unit?.actionApSpent || 0)); }
function unitApAvailable(unit) { return Math.max(0, unitApMax(unit) - unitApSpent(unit)); }
/**
 * @param {BattleState} state
 * @param {BattleUnit} unit
 * @returns {ActionSlot[]}
 */
function slotsForUnit(state, unit) {
  const shape = unit.shape || {};
  const elements = (shape.slotElements && shape.slotElements.length ? shape.slotElements : [unit.element, unit.element, unit.element]).slice(0, shape.slotCount || 3);
  return elements.map((element, i) => {
    const slotId = `${unit.id}:slot${i}`;
    const availableAp = unitApAvailable(unit);
    return { slotId, index: i, label: `第${i + 1}槽`, element, layers: Number(shape.baseLayers || 1), shapeId: shape.shapeId || null, shapeName: shape.shapeName || '单点', hitCells: Number(shape.hitCells || 1), direction: state.actionDirs[slotId] || state.actionDirs[i] || state.selected?.direction || 'right', used: !!unit.actionSlotsUsed?.[i], apSpent: unitApSpent(unit), availableAp, canUse: !unit.actionSlotsUsed?.[i] && availableAp > 0 && unit.alive && unit.side === 'hero' && state.phase === 'player_turn' };
  });
}

function parseSlotIndex(slotId) {
  if (typeof slotId === 'number') return slotId;
  const m = String(slotId || '').match(/slot(\d+)/);
  if (m) return Number(m[1]);
  const n = Number(slotId);
  return Number.isFinite(n) ? n : 0;
}

function targetCellsForSlot(state, actor, slot, selectedCell = null) {
  const start = normalizePosition(actor.position || { r: 0, c: 0 });
  const d = dirDelta(slot.direction);
  const out = [];
  for (let i = 1; i <= Math.max(1, slot.hitCells || 1); i++) {
    const p = { r: start.r + d.dr * i, c: start.c + d.dc * i };
    if (inBoard(p)) out.push(p);
  }
  if (selectedCell) {
    const p = normalizePosition(selectedCell);
    return out.some(cell => cell.r === p.r && cell.c === p.c) ? out : [];
  }
  return out;
}

function targetsAtCells(state, cells, camp = 'enemy') {
  const keys = new Set(cells.map(p => `${p.r},${p.c}`));
  return combatTargets(state, camp).filter(u => u.position && keys.has(`${u.position.r},${u.position.c}`));
}

function unitsAtCells(state, cells, side = 'enemy') {
  return targetsAtCells(state, cells, side === 'hero' ? 'player' : 'enemy').filter(u => state.units.includes(u));
}

function setActionDirection(state, unitId, slotId, dir) {
  const unit = getUnit(state, unitId || state.selected?.unitId) || living(state, 'hero')[0];
  const idx = parseSlotIndex(slotId ?? state.selected?.slotId ?? 0);
  const key = unit ? `${unit.id}:slot${idx}` : String(idx);
  state.actionDirs[key] = dir || 'right';
  pushEvent(state, 'SET_ACTION_DIRECTION', { unitId: unit?.id, slotId: idx, dir: dir || 'right', text: `${unit?.displayName || '单位'} 第${idx + 1}槽方向设为 ${dir || 'right'}。` });
  syncDerivedBoard(state);
  return true;
}

/**
 * @param {BattleState} state
 * @param {string=} unitId
 * @param {any=} slotId
 * @param {Position|null=} targetCell
 * @param {{ap?:number}=} options
 * @returns {boolean}
 */
function useActionSlot(state, unitId, slotId, targetCell = null, options = {}) {
  if (state.phase === 'init') startBattle(state);
  if (state.phase !== 'player_turn') { pushEvent(state, 'USE_SLOT_BLOCKED', { text: `当前阶段 ${state.phase} 不能手动施放行动槽。` }); return false; }
  const actor = getUnit(state, unitId || state.selected?.unitId) || living(state, 'hero')[0];
  if (!actor || actor.side !== 'hero' || !actor.alive) { pushEvent(state, 'USE_SLOT_BLOCKED', { text: '施放失败：未选择可行动我方单位。' }); return false; }
  const idx = parseSlotIndex(slotId ?? state.selected?.slotId ?? 0);
  const slots = slotsForUnit(state, actor);
  const slot = slots[idx];
  if (!slot) { pushEvent(state, 'USE_SLOT_BLOCKED', { unitId: actor.id, text: `施放失败：不存在第${idx + 1}槽。` }); return false; }
  if (actor.actionSlotsUsed?.[idx]) { pushEvent(state, 'USE_SLOT_BLOCKED', { unitId: actor.id, slotId: idx, text: `${actor.displayName} 第${idx + 1}槽已经使用。` }); return false; }
  const cells = targetCellsForSlot(state, actor, slot, targetCell || state.selected?.cell || null);
  if (!cells.length) { pushEvent(state, 'USE_SLOT_BLOCKED', { unitId: actor.id, slotId: idx, text: `${actor.displayName} 第${idx + 1}槽没有合法目标格。` }); return false; }
  const targetCamp = opposingCamp(unitCamp(actor));
  const requestedAp = Math.max(1, Number(options.ap || 1));
  const availableAp = unitApAvailable(actor);
  if (requestedAp > availableAp) { pushEvent(state, 'USE_SLOT_BLOCKED', { unitId: actor.id, slotId: idx, requestedAp, availableAp, text: `施放失败：${actor.displayName} AP不足（需要${requestedAp}，剩余${availableAp}）。` }); return false; }
  const apUsed = requestedAp;
  const effectiveLayers = Math.max(1, Number(slot.layers || 1)) * apUsed;
  const targets = targetsAtCells(state, cells, targetCamp);
  pushEvent(state, 'PLAYER_SELECT_SLOT', { actorId: actor.id, slot: idx + 1, shapeId: slot.shapeId, shapeName: slot.shapeName, element: slot.element, cells, apUsed, baseLayers: slot.layers, effectiveLayers, text: `玩家施放 ${actor.displayName} 第${idx + 1}槽：${slot.shapeName}/${slot.element}/${effectiveLayers}层（AP${apUsed}），命中 ${targets.length ? targets.map(t => t.displayName).join('、') : cells.map(p => `R${p.r}C${p.c}`).join('、')}。` });
  const appliedSlot = Object.assign({}, slot, { layers: effectiveLayers, apUsed, baseLayers: slot.layers });
  if (targets.length) for (const t of targets) applyElement(state, actor, t, slot.element, effectiveLayers, { slot: appliedSlot, apUsed });
  else for (const p of cells) { const cell = getCell(state, p.r, p.c); if (cell) applyElementToCell(state, actor, cell, slot.element, effectiveLayers); }
  // 添加元素后检查火引爆
  for (const p of cells) {
    const cell = getCell(state, p.r, p.c);
    if (!cell) continue;
    if (slot.element === '火') {
      const result = explodeIfEnemyOnFire(state, cell, actor.id);
      if (result) {
        pushEvent(state, 'FIRE_EXPLODE_AFTER_ATTACK', {
          r: cell.r, c: cell.c, layers: result.layersBefore, damage: result.damage,
          targetId: result.target.id,
          text: `R${cell.r}C${cell.c} 火${result.layersBefore}层引爆，对 ${result.target.displayName || result.target.name} 造成${result.damage}点火爆伤害。`
        });
        damageUnit(state, actor, result.target, result.damage, { element: '火', sourceType: 'fire_explosion' });
        elementRules.clearElement(state, result.target, '火', { reason: 'fire_explosion_clear_unit_status' });
        cell.elements.火 = 0;
      } else if ((cell.elements.火 || 0) >= 3) {
        pushEvent(state, 'FIRE_TRAP_READY', {
          r: cell.r, c: cell.c, layers: cell.elements.火,
          text: `R${cell.r}C${cell.c} 火${cell.elements.火}层，形成空格爆火陷阱。`
        });
      }
    }
  }
  actor.actionSlotsUsed = actor.actionSlotsUsed || {};
  actor.actionSlotsUsed[idx] = true;
  actor.actionApSpent = unitApSpent(actor) + apUsed;
  actor.hasAttacked = true;  // 攻击后锁定位置
  syncDerivedBoard(state);
  return true;
}

  return { slotsForUnit, parseSlotIndex, targetCellsForSlot, targetsAtCells, unitsAtCells, setActionDirection, useActionSlot };
}

module.exports = { createActionsModule };
