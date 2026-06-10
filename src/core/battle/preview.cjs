// @ts-check

/**
 * @typedef {{r:number,c:number}} Position
 * @typedef {{id:string, side?:string, camp?:string, alive?:boolean, hp?:number, name?:string, displayName?:string, position?:Position}} BattleUnit
 * @typedef {{selected?:Record<string, any>, teamPlacementPreview?:{activeUnitId?:string|null,movedUnitIds?:string[]}, units?:BattleUnit[], leaders?:{enemy?:BattleUnit}, board?:{cells:Array<Record<string, any>>}}} BattleState
 */

/**
 * Build preview, threat projection sync, and cell-detail helpers.
 *
 * @param {Record<string, any>} deps
 * @returns {{buildPreviewGrid:(state:BattleState,opts?:{unitId?:string,slotId?:any,cell?:Position})=>Array<Record<string, any>>,clearPreviewAndThreat:(state:BattleState)=>void,syncDerivedBoard:(state:BattleState)=>any,getCellDetail:(state:BattleState,r:number,c:number)=>Record<string, any>|null}}
 */
function createPreviewModule(deps) {
  const { clone, getUnit, living, getCell, ensureBoard, syncBoardUnits, unitCamp, ensureElements, ensureTerrain, parseSlotIndex, slotsForUnit, targetCellsForSlot, buildThreatGrid } = deps;

	function ensureTeamPlacementPreview(state) {
	  state.teamPlacementPreview = state.teamPlacementPreview || { activeUnitId: null, movedUnitIds: [] };
	  const heroes = living(state, 'hero');
	  const heroIds = new Set(heroes.map(u => u.id));
	  state.teamPlacementPreview.movedUnitIds = (Array.isArray(state.teamPlacementPreview.movedUnitIds) ? state.teamPlacementPreview.movedUnitIds : []).filter(id => heroIds.has(id));
	  if (state.teamPlacementPreview.activeUnitId && !heroIds.has(state.teamPlacementPreview.activeUnitId)) state.teamPlacementPreview.activeUnitId = null;
	  return state.teamPlacementPreview;
	}

	function nearestEnemy(state, actor) {
	  const pos = actor.position;
	  if (!pos) return null;
	  const enemies = [
	    ...(state.units || []).filter(u => u.side === 'enemy' && u.alive !== false && Number(u.hp || 0) > 0),
	    state.leaders?.enemy
	  ].filter(u => u && u.alive !== false && Number(u.hp || 0) > 0 && u.position);
	  enemies.sort((a, b) => {
	    const da = Math.abs(a.position.r - pos.r) + Math.abs(a.position.c - pos.c);
	    const db = Math.abs(b.position.r - pos.r) + Math.abs(b.position.c - pos.c);
	    return da - db || String(a.id).localeCompare(String(b.id));
	  });
	  return enemies[0] || null;
	}

	function previewDirectionTo(actor, target, fallback) {
	  if (!actor?.position || !target?.position) return fallback || 'right';
	  const dr = target.position.r - actor.position.r;
	  const dc = target.position.c - actor.position.c;
	  if (Math.abs(dc) >= Math.abs(dr)) return dc >= 0 ? 'right' : 'left';
	  return dr >= 0 ? 'down' : 'up';
	}

	function addLayers(elements, element, layers) {
	  const out = Object.assign({}, elements || {});
	  out[element] = Math.max(0, Number(out[element] || 0)) + Math.max(0, Number(layers || 0));
	  return out;
	}

	function previewActors(state, opts = {}) {
	  const heroes = living(state, 'hero');
	  if (!heroes.length) return { actors: [], activeUnitId: null, movedUnitIds: [] };
	  const placement = ensureTeamPlacementPreview(state);
	  const movedUnitIds = placement.movedUnitIds.slice();
	  if (!movedUnitIds.length) {
	    const actor = heroes[0];
	    return { actors: [actor], activeUnitId: actor.id, movedUnitIds: [] };
	  }
	  const activeUnitId = movedUnitIds.includes(placement.activeUnitId) ? placement.activeUnitId : movedUnitIds[movedUnitIds.length - 1];
	  const actors = movedUnitIds.map(id => getUnit(state, id)).filter(Boolean);
	  return { actors, activeUnitId, movedUnitIds };
	}

	function actorPreviewSlot(state, actor, opts, isActiveActor) {
	  const slots = slotsForUnit(state, actor);
	  const requestedSlot = isActiveActor && opts.unitId === actor.id ? opts.slotId : null;
	  const slotIndex = parseSlotIndex(requestedSlot ?? 0);
	  const slot = slots[Math.max(0, Math.min(slots.length - 1, slotIndex))] || slots[0];
	  if (!slot) return null;
	  const autoTarget = nearestEnemy(state, actor);
	  const direction = slot.direction || previewDirectionTo(actor, autoTarget, 'right');
	  return Object.assign({}, slot, { direction, autoTarget });
	}

	/**
	 * @param {BattleState} state
	 * @param {{unitId?:string,slotId?:any,cell?:Position}=} opts
	 * @returns {Array<Record<string, any>>}
	 */
	function buildPreviewGrid(state, opts = {}) {
	  const { actors, activeUnitId, movedUnitIds } = previewActors(state, opts);
	  const projectedElements = new Map();
	  const out = [];
	  actors.forEach((actor, order) => {
	    const isActiveActor = actor.id === activeUnitId;
	    const slot = actorPreviewSlot(state, actor, opts, isActiveActor);
	    if (!slot) return;
	    const cells = targetCellsForSlot(state, actor, slot, isActiveActor ? (opts.cell || null) : null);
	    cells.forEach(p => {
	      const cell = getCell(state, p.r, p.c);
	      const target = cell && cell.unitId ? getUnit(state, cell.unitId) : null;
	      const key = `${p.r},${p.c}`;
	      const beforeElements = projectedElements.get(key) || Object.assign({}, cell?.elements || {});
	      const afterElements = addLayers(beforeElements, slot.element, slot.layers);
	      projectedElements.set(key, afterElements);
	      const targetCamp = target ? unitCamp(target) : null;
	      const actorCamp = unitCamp(actor);
	      const hitsEnemy = !!target && targetCamp !== actorCamp;
	      const friendlyFire = !!target && targetCamp === actorCamp && target.id !== actor.id;
	      const sameElementBefore = Number(beforeElements[slot.element] || 0);
	      const linkElements = Object.entries(beforeElements).filter(([el, n]) => el !== slot.element && Number(n) > 0).map(([el]) => el);
	      const triggersElementLink = sameElementBefore > 0 || linkElements.length > 0 || Number(afterElements[slot.element] || 0) >= 3;
	      out.push({
	        r: p.r,
	        c: p.c,
	        previewId: `${actor.id}:${slot.slotId}:${p.r},${p.c}`,
	        actorId: actor.id,
	        actorName: actor.displayName || actor.name,
	        order,
	        isActiveActor,
	        moved: movedUnitIds.includes(actor.id),
	        slotId: slot.slotId,
	        slotIndex: slot.index,
	        direction: slot.direction,
	        autoTargetId: slot.autoTarget?.id || null,
	        autoTargetName: slot.autoTarget ? (slot.autoTarget.displayName || slot.autoTarget.name) : null,
	        element: slot.element,
	        layers: slot.layers,
	        generatedElements: { [slot.element]: slot.layers },
	        projectedElements: afterElements,
	        targetId: target?.id || null,
	        targetName: target ? (target.displayName || target.name) : null,
	        hitEnemy: hitsEnemy,
	        hitAlly: friendlyFire,
	        friendlyFire,
	        predictedDamage: hitsEnemy ? slot.layers : 0,
	        triggersElementLink,
	        elementLinks: linkElements,
	        text: `${actor.name}${slot.label}${slot.element}${slot.layers}层 ${slot.direction} → R${p.r}C${p.c}${target ? ` ${target.displayName || target.name}` : ''}`
	      });
	    });
	  });
	  return out;
	}

	function clearPreviewAndThreat(state) {
	  ensureBoard(state);
	  for (const cell of state.board.cells) { cell.preview = null; cell.previews = []; cell.threat = null; }
	}

function syncDerivedBoard(state) {
  syncBoardUnits(state);
  clearPreviewAndThreat(state);
	  for (const p of buildPreviewGrid(state)) {
	    const cell = getCell(state, p.r, p.c);
	    if (cell) {
	      cell.previews = Array.isArray(cell.previews) ? cell.previews : [];
	      cell.previews.push(p);
	      if (!cell.preview || p.isActiveActor) cell.preview = p;
	    }
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
