// @ts-check

/**
 * @typedef {{r:number,c:number}} Position
 * @typedef {{id:string, side?:string, camp?:string, alive?:boolean, hp?:number, shield?:number, def?:number, name?:string, displayName?:string, position?:Position}} BattleUnit
 * @typedef {{selected?:Record<string, any>, teamPlacementPreview?:{activeUnitId?:string|null,movedUnitIds?:string[]}, units?:BattleUnit[], leaders?:{enemy?:BattleUnit}, board?:{cells:Array<Record<string, any>>}}} BattleState
 */

/**
 * Build preview, threat projection sync, and cell-detail helpers.
 *
 * @param {Record<string, any>} deps
 * @returns {{buildPreviewGrid:(state:BattleState,opts?:{unitId?:string,slotId?:any,cell?:Position})=>Array<Record<string, any>>,clearPreviewAndThreat:(state:BattleState)=>void,syncDerivedBoard:(state:BattleState)=>any,getCellDetail:(state:BattleState,r:number,c:number)=>Record<string, any>|null}}
 */
function createPreviewModule(deps) {
  const { clone, getUnit, living, getCell, ensureBoard, syncBoardUnits, unitCamp, ensureElements, ensureTerrain, fireDamage, parseSlotIndex, slotsForUnit, targetCellsForSlot, buildThreatGrid } = deps;

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

	function cloneProjectedUnit(unit) {
	  if (!unit) return null;
	  return {
	    hp: Math.max(0, Number(unit.hp || 0)),
	    shield: Math.max(0, Number(unit.shield || 0)),
	    def: Math.max(0, Number(unit.def || 0)),
	    alive: unit.alive !== false && Number(unit.hp || 0) > 0
	  };
	}

	function estimateDamageToProjectedUnit(unit, projectedUnits, rawDamage) {
	  if (!unit || rawDamage <= 0) return null;
	  const current = projectedUnits.get(unit.id) || cloneProjectedUnit(unit);
	  if (!current || !current.alive) return null;
	  const hpFrom = current.hp;
	  const shieldFrom = current.shield;
	  const rawAfterDef = Math.max(0, Number(rawDamage || 0) - current.def);
	  const shieldDamage = Math.min(shieldFrom, rawAfterDef);
	  const hpDamage = Math.max(0, rawAfterDef - shieldDamage);
	  current.shield = Math.max(0, shieldFrom - shieldDamage);
	  current.hp = Math.max(0, hpFrom - hpDamage);
	  current.alive = current.hp > 0;
	  projectedUnits.set(unit.id, current);
	  return {
	    raw: Number(rawDamage || 0),
	    final: shieldDamage + hpDamage,
	    shieldDamage,
	    hpDamage,
	    shieldFrom,
	    shieldTo: current.shield,
	    hpFrom,
	    hpTo: current.hp,
	    killed: hpFrom > 0 && current.hp <= 0
	  };
	}

	function settlementPreviewForCell(afterElements, element) {
	  const layers = Math.max(0, Number(afterElements?.[element] || 0));
	  if (layers < 3) return null;
	  return {
	    element,
	    layers,
	    rawDamage: fireDamage ? fireDamage(layers) : (layers * (layers + 1)) / 2,
	    formula: 'sum_1_to_n'
	  };
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

	function actorPreviewSlots(state, actor, opts, isActiveActor) {
	  const slots = slotsForUnit(state, actor);
	  const usable = slots.filter(slot => !slot.used && slot.canUse !== false);
	  const requestedSlot = isActiveActor && opts.unitId === actor.id && opts.slotId !== null && opts.slotId !== undefined ? parseSlotIndex(opts.slotId) : null;
	  const availableAp = Math.max(1, Number(usable[0]?.availableAp || actor.ap || 1));
	  const ordered = usable.slice().sort((a, b) => {
	    if (requestedSlot !== null) {
	      if (a.index === requestedSlot) return -1;
	      if (b.index === requestedSlot) return 1;
	    }
	    return a.index - b.index;
	  }).slice(0, availableAp).sort((a, b) => a.index - b.index);
	  const autoTarget = nearestEnemy(state, actor);
	  return ordered.map(slot => {
	    const direction = slot.direction || previewDirectionTo(actor, autoTarget, 'right');
	    return Object.assign({}, slot, { direction, autoTarget, isRequestedSlot: requestedSlot !== null && slot.index === requestedSlot });
	  });
	}

	/**
	 * @param {BattleState} state
	 * @param {{unitId?:string,slotId?:any,cell?:Position}=} opts
	 * @returns {Array<Record<string, any>>}
	 */
	function buildPreviewGrid(state, opts = {}) {
	  const { actors, activeUnitId, movedUnitIds } = previewActors(state, opts);
	  const projectedElements = new Map();
	  const projectedUnits = new Map();
	  const out = [];
	  actors.forEach((actor, order) => {
	    const isActiveActor = actor.id === activeUnitId;
	    const slots = actorPreviewSlots(state, actor, opts, isActiveActor);
	    for (const slot of slots) {
	      const cells = targetCellsForSlot(state, actor, slot, slot.isRequestedSlot ? (opts.cell || null) : null);
	      cells.forEach(p => {
	        const cell = getCell(state, p.r, p.c);
	        const target = cell && cell.unitId ? getUnit(state, cell.unitId) : null;
	        const key = `${p.r},${p.c}`;
	        const beforeElements = projectedElements.get(key) || Object.assign({}, cell?.elements || {});
	        const afterElements = addLayers(beforeElements, slot.element, slot.layers);
	        const targetCamp = target ? unitCamp(target) : null;
	        const actorCamp = unitCamp(actor);
	        const hitsEnemy = !!target && targetCamp !== actorCamp;
	        const friendlyFire = !!target && targetCamp === actorCamp && target.id !== actor.id;
	        const sameElementBefore = Number(beforeElements[slot.element] || 0);
	        const linkElements = Object.entries(beforeElements).filter(([el, n]) => el !== slot.element && Number(n) > 0).map(([el]) => el);
	        const settlement = target ? settlementPreviewForCell(afterElements, slot.element) : null;
	        const actionRawDamage = (hitsEnemy || friendlyFire) ? Math.max(0, Number(actor.atk ?? slot.layers ?? 0)) : 0;
	        const settlementDamage = settlement && (hitsEnemy || friendlyFire) ? estimateDamageToProjectedUnit(target, projectedUnits, settlement.rawDamage) : null;
	        const actionDamage = actionRawDamage > 0 ? estimateDamageToProjectedUnit(target, projectedUnits, actionRawDamage) : null;
	        const damageParts = [settlementDamage, actionDamage].filter(Boolean);
	        const totalDamage = damageParts.reduce((sum, part) => sum + Number(part.final || 0), 0);
	        const totalRawDamage = damageParts.reduce((sum, part) => sum + Number(part.raw || 0), 0);
	        const totalHpDamage = damageParts.reduce((sum, part) => sum + Number(part.hpDamage || 0), 0);
	        const totalShieldDamage = damageParts.reduce((sum, part) => sum + Number(part.shieldDamage || 0), 0);
	        const firstDamage = damageParts[0] || null;
	        const lastDamage = damageParts[damageParts.length - 1] || null;
	        const projectedAfterSettlement = Object.assign({}, afterElements);
	        if (settlement && (hitsEnemy || friendlyFire)) projectedAfterSettlement[settlement.element] = 0;
	        projectedElements.set(key, projectedAfterSettlement);
	        const triggersElementLink = sameElementBefore > 0 || linkElements.length > 0 || !!settlement;
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
	        projectedElements: projectedAfterSettlement,
	        projectedElementsBeforeSettle: afterElements,
	        targetId: target?.id || null,
	        targetName: target ? (target.displayName || target.name) : null,
	        hitEnemy: hitsEnemy,
	        hitAlly: friendlyFire,
	        friendlyFire,
	        predictedDamage: totalDamage,
	        predictedRawDamage: totalRawDamage,
	        predictedHpDamage: totalHpDamage,
	        predictedShieldDamage: totalShieldDamage,
	        predictedHpFrom: firstDamage ? firstDamage.hpFrom : null,
	        predictedHpTo: lastDamage ? lastDamage.hpTo : null,
	        predictedShieldFrom: firstDamage ? firstDamage.shieldFrom : null,
	        predictedShieldTo: lastDamage ? lastDamage.shieldTo : null,
	        predictedKill: damageParts.some(part => part.killed),
	        predictedActionDamage: actionDamage ? actionDamage.final : 0,
	        predictedActionRawDamage: actionDamage ? actionDamage.raw : 0,
	        predictedSettlementDamage: settlementDamage ? settlementDamage.final : 0,
	        predictedSettlementRawDamage: settlementDamage ? settlementDamage.raw : 0,
	        settlement,
	        triggersElementLink,
	        elementLinks: linkElements,
	        text: `${actor.name}${slot.label}${slot.element}${slot.layers}层 ${slot.direction} → R${p.r}C${p.c}${target ? ` ${target.displayName || target.name}` : ''}`
	        });
	      });
	    }
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
