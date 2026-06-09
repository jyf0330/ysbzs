// @ts-check

/**
 * @typedef {{r:number,c:number}} Position
 * @typedef {{id:string, side?:string, camp?:string, position?:Position}} BattleUnit
 * @typedef {{selected?:Record<string, any>, board?:{cells:Array<Record<string, any>>}}} BattleState
 */

/**
 * Build preview, threat projection sync, and cell-detail helpers.
 *
 * @param {Record<string, any>} deps
 * @returns {{buildPreviewGrid:(state:BattleState,opts?:{unitId?:string,slotId?:any,cell?:Position})=>Array<Record<string, any>>,clearPreviewAndThreat:(state:BattleState)=>void,syncDerivedBoard:(state:BattleState)=>any,getCellDetail:(state:BattleState,r:number,c:number)=>Record<string, any>|null}}
 */
function createPreviewModule(deps) {
  const { clone, getUnit, living, getCell, ensureBoard, syncBoardUnits, unitCamp, ensureElements, ensureTerrain, parseSlotIndex, slotsForUnit, targetCellsForSlot, buildThreatGrid } = deps;

/**
 * @param {BattleState} state
 * @param {{unitId?:string,slotId?:any,cell?:Position}=} opts
 * @returns {Array<Record<string, any>>}
 */
function buildPreviewGrid(state, opts = {}) {
  const unitId = opts.unitId || state.selected?.unitId || living(state, 'hero')[0]?.id;
  const actor = getUnit(state, unitId) || living(state, 'hero')[0];
  if (!actor) return [];
  const slots = slotsForUnit(state, actor);
  const slotIndex = parseSlotIndex(opts.slotId ?? state.selected?.slotId ?? 0);
  const slot = slots[Math.max(0, Math.min(slots.length - 1, slotIndex))] || slots[0];
  if (!slot) return [];
  const cells = targetCellsForSlot(state, actor, slot, opts.cell || state.selected?.cell || null);
  return cells.map(p => {
    const cell = getCell(state, p.r, p.c);
    const target = cell && cell.unitId ? getUnit(state, cell.unitId) : null;
    return { r: p.r, c: p.c, actorId: actor.id, slotId: slot.slotId, direction: slot.direction, element: slot.element, layers: slot.layers, targetId: target?.id || null, predictedDamage: target && unitCamp(target) !== unitCamp(actor) ? slot.layers : 0, text: `${actor.name}${slot.label}${slot.element}${slot.layers}层 → R${p.r}C${p.c}${target ? ` ${target.displayName || target.name}` : ''}` };
  });
}

function clearPreviewAndThreat(state) {
  ensureBoard(state);
  for (const cell of state.board.cells) { cell.preview = null; cell.threat = null; }
}

function syncDerivedBoard(state) {
  syncBoardUnits(state);
  clearPreviewAndThreat(state);
  for (const p of buildPreviewGrid(state)) {
    const cell = getCell(state, p.r, p.c);
    if (cell) cell.preview = p;
  }
  for (const t of buildThreatGrid(state)) {
    const cell = getCell(state, t.r, t.c);
    if (cell) cell.threat = t;
  }
  return state.board;
}

function getCellDetail(state, r, c) {
  syncDerivedBoard(state);
  const cell = getCell(state, r, c);
  if (!cell) return null;
  const unit = cell.unitId ? getUnit(state, cell.unitId) : null;
  return { r: cell.r, c: cell.c, key: cell.key, terrain: clone(ensureTerrain(cell)), elements: clone(cell.elements), unit: unit ? { id: unit.id, name: unit.name, displayName: unit.displayName, side: unit.side, camp: unitCamp(unit), hp: unit.hp, maxHp: unit.maxHp, atk: unit.atk, shield: unit.shield, elements: clone(ensureElements(unit)) } : null, preview: clone(cell.preview), threat: clone(cell.threat) };
}

  return { buildPreviewGrid, clearPreviewAndThreat, syncDerivedBoard, getCellDetail };
}

module.exports = { createPreviewModule };
