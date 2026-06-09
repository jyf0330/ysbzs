// @ts-check

/**
 * @typedef {{r:number,c:number}} Position
 * @typedef {{id:string, side?:string, camp?:string, alive?:boolean, hp?:number, ap?:number, actionApSpent?:number, actionSlotsUsed?:Record<string, boolean>, shape?:Record<string, any>, element?:string, position?:Position, displayName?:string}} BattleUnit
 * @typedef {{r:number,c:number,unitId?:string|null,elements?:Record<string, number>,preview?:Record<string, any>|null,threat?:Record<string, any>|null}} BattleCell
 * @typedef {{phase?:string, selected?:Record<string, any>, actionDirs:Record<string, string>, units?:BattleUnit[], board?:{cells?:BattleCell[]}}} BattleState
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
  syncDerivedBoard(state);
  // 同步后收集受影响格子
  const allCells = state.board?.cells || [];
  const previewCells = allCells.filter(c => c.preview && c.preview.actorId === unit?.id);
  const threatCells = allCells.filter(c => c.threat);
  const uniqueKeys = new Set();
  for (const c of previewCells) uniqueKeys.add(`${c.r},${c.c}`);
  for (const c of threatCells) uniqueKeys.add(`${c.r},${c.c}`);
  const affected = [...uniqueKeys].map(k => { const [r, c] = k.split(',').map(Number); return allCells.find(x => x.r === r && x.c === c); }).filter(Boolean);
  const cellLines = []; let seq = 1;
  for (const c of affected) {
    const u = c.unitId ? (getUnit(state, c.unitId) || null) : null;
    const unitStr = u ? `${u.displayName || u.name} HP${u.hp}/${u.maxHp}${u.shield ? `/盾${u.shield}` : ''}` : '空格';
    const els = Object.entries(c.elements || {}).filter(([, n]) => Number(n) > 0).map(([el, n]) => `${el}${n}`).join('/') || '火0/水0/风0';
    const pr = c.preview ? (c.preview.predictedDamage > 0 ? `，预计受到${c.preview.predictedDamage}点${c.preview.element}伤害` : `，预计铺${c.preview.element}${c.preview.layers}层`) : '';
    const th = c.threat ? `${c.threat.damage ? `，受到${c.threat.damage}点威胁` : '，有威胁'}` : '，无威胁';
    cellLines.push(`${seq}）第${c.r + 1}行第${c.c + 1}列：${unitStr}，${els}${pr}${th}`);
    seq++;
  }
  const cellDetail = cellLines.length ? `\n影响${affected.length}格：\n${cellLines.join('\n')}` : '';
  const slots = unit ? slotsForUnit(state, unit) : [];
  const slot = slots[idx];
  pushEvent(state, 'SET_ACTION_DIRECTION', { unitId: unit?.id, displayName: unit?.displayName, element: unit?.element, slotId: idx, dir: dir || 'right', slotElement: slot?.element, slotLayers: slot?.layers, shapeId: slot?.shapeId, shapeName: slot?.shapeName, text: `${unit?.displayName || '单位'} 第${idx + 1}槽方向改为${dir || 'right'}。${cellDetail}` });
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
  const appliedSlot = Object.assign({}, slot, { layers: effectiveLayers, apUsed, baseLayers: slot.layers });
  // 先执行槽效果
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
  // 执行后构建详细事件文本
  const allCells = state.board?.cells || [];
  const affected = allCells.filter(c => cells.some(p => p.r === c.r && p.c === c.c) || c.preview || c.threat);
  const cellLines = [];
  let seq = 1;
  for (const targetPos of cells) {
    const c = allCells.find(x => x.r === targetPos.r && x.c === targetPos.c);
    if (!c) continue;
    const u = c.unitId ? (getUnit(state, c.unitId) || null) : null;
    const unitStr = u ? `${u.displayName || u.name} HP${u.hp}/${u.maxHp}${u.shield ? `/盾${u.shield}` : ''}` : '空格';
    const els = Object.entries(c.elements || {}).filter(([, n]) => Number(n) > 0).map(([el, n]) => `${el}${n}`).join('/') || '火0/水0/风0';
    const pr = c.preview ? (c.preview.predictedDamage > 0 ? `，预计受到${c.preview.predictedDamage}点${c.preview.element}伤害` : `，预计铺${c.preview.element}${c.preview.layers}层`) : '';
    const th = c.threat ? `${c.threat.damage ? `，受到${c.threat.damage}点威胁` : '，有威胁'}` : '，无威胁';
    cellLines.push(`${seq}）第${c.r + 1}行第${c.c + 1}列：${unitStr}，${els}${pr}${th}`);
    seq++;
  }
  const cellDetail = cellLines.length ? `\n本次影响${affected.length}格：\n${cellLines.join('\n')}` : '';
  pushEvent(state, 'PLAYER_SELECT_SLOT', { actorId: actor.id, slot: idx + 1, shapeId: slot.shapeId, shapeName: slot.shapeName, element: slot.element, cells, apUsed, baseLayers: slot.layers, effectiveLayers, text: `${actor.displayName} 施放第${idx + 1}槽：${slot.shapeName}/${slot.element}/${effectiveLayers}层（AP${apUsed}）。${cellDetail}` });
  return true;
}

  return { slotsForUnit, parseSlotIndex, targetCellsForSlot, targetsAtCells, unitsAtCells, setActionDirection, useActionSlot };
}

module.exports = { createActionsModule };
