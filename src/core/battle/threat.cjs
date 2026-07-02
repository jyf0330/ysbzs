// @ts-check

/**
 * @typedef {{r:number,c:number}} Position
 * @typedef {{id:string, side?:string, camp?:string, alive?:boolean, hp?:number, ap?:number, position?:Position, actionSlotsUsed?:Record<string, boolean>, displayName?:string, name?:string, atk?:number}} BattleUnit
 * @typedef {{units?:BattleUnit[], leaders?:{player?:BattleUnit, enemy?:BattleUnit}, board?:{cells?:Array<Record<string, any>>}, events?:any[], phase?:string, teamPlacementPreview?:{activeUnitId?:string|null, movedUnitIds?:string[]}}} BattleState
 */

/**
 * Threat/risk grids and sandbox utilities for planning.
 *
 * @param {Record<string, any>} deps
 * @returns {Record<string, Function>}
 */
function createThreatModule(deps) {
  const { clone, getUnit, living, normalizePosition, BOARD_ROWS, BOARD_COLS, computeMonsterIntent, buildPreviewGrid, useActionSlot, moveHero, syncBoardUnits, slotsForUnit, effectiveMoveRange, allStandCells, dist } = deps;

  // ---- threat grid ----

  function buildThreatGrid(state) {
    const byCell = new Map();
    function addCell(pos, patch) {
      const key = `${pos.r},${pos.c}`;
      const cur = byCell.get(key) || { r: pos.r, c: pos.c, type: patch.type || 'attack', damage: 0, threat: 0, hits: [], actionIndexes: [] };
      const beforeDamage = Number(cur.damage || 0);
      const beforeThreat = Number(cur.threat || 0);
      const beforeHits = Array.isArray(cur.hits) ? cur.hits.slice() : [];
      const beforeActionIndexes = Array.isArray(cur.actionIndexes) ? cur.actionIndexes.slice() : [];
      Object.assign(cur, patch);
      cur.damage = beforeDamage + Number(patch.damage || 0);
      cur.threat = beforeThreat + Number(patch.threat || patch.damage || 0);
      cur.hits = beforeHits.concat(Array.isArray(patch.hits) ? patch.hits : []);
      cur.actionIndexes = beforeActionIndexes;
      if (patch.actionIndex != null && !cur.actionIndexes.includes(patch.actionIndex)) cur.actionIndexes.push(patch.actionIndex);
      if (patch.lethal) cur.lethal = true;
      byCell.set(key, cur);
    }
    for (const enemy of living(state, 'enemy')) {
      const intent = computeMonsterIntent(state, enemy);
      if (!intent) continue;
      for (let i = 0; i < intent.path.length; i++) {
        const p = intent.path[i];
        addCell(p, { type: 'move_path', unitId: enemy.id, unitName: intent.unitName, threat: 1, finalMove: i === intent.path.length - 1 });
      }
      for (const action of intent.actions || []) {
        for (const p of action.attackCells || []) {
          const hits = (action.hits || []).filter(hit => hit.r === p.r && hit.c === p.c);
          const damage = hits.reduce((sum, hit) => sum + Number(hit.damage || 0), 0);
          addCell(p, {
            type: 'attack',
            unitId: enemy.id,
            unitName: intent.unitName,
            targetId: hits[0]?.targetId || null,
            damage,
            threat: damage || Number(enemy.atk || 0),
            lethal: hits.some(hit => hit.lethal),
            hits,
            actionIndex: action.slotIndex,
            actionLabel: action.slotLabel,
            actionCount: intent.actions.length,
            totalDamage: intent.totalDamage
          });
        }
      }
    }
    return Array.from(byCell.values()).sort((a, b) => a.r - b.r || a.c - b.c);
  }

  // ---- team risk grid ----

  function buildTeamRiskGrid(state, unitIds = null) {
    const requested = Array.isArray(unitIds) ? new Set(unitIds.filter(Boolean)) : null;
    const units = living(state, 'hero').filter(unit => !requested || requested.has(unit.id) || requested.has(unit.petId));
    if (!units.length) return [];
    const byId = new Map(units.map(unit => [unit.id, {
      r: normalizePosition(unit.position || { r: 0, c: 0 }).r,
      c: normalizePosition(unit.position || { r: 0, c: 0 }).c,
      unitId: unit.id,
      unitName: unit.displayName || unit.name,
      damage: 0,
      shieldDamage: 0,
      hpDamage: 0,
      shieldFrom: Math.max(0, Number(unit.shield || 0)),
      shieldTo: Math.max(0, Number(unit.shield || 0)),
      hpFrom: Math.max(0, Number(unit.hp || 0)),
      hpTo: Math.max(0, Number(unit.hp || 0)),
      lethal: false,
      enemyIds: [],
      threats: []
    }]));
    for (const enemy of living(state, 'enemy')) {
      const intent = computeMonsterIntent(state, enemy);
      if (!intent || !intent.willAttack) continue;
      for (const action of intent.actions || []) {
        for (const hit of action.hits || []) {
          if (!byId.has(hit.targetId)) continue;
          const risk = byId.get(hit.targetId);
          if (!risk) continue;
          const absorbed = Math.min(risk.shieldTo, Number(hit.raw || 0));
          const dealtToHp = Math.min(risk.hpTo, Math.max(0, Number(hit.raw || 0) - absorbed));
          risk.shieldTo -= absorbed;
          risk.hpTo -= dealtToHp;
          risk.damage += Number(hit.raw || 0);
          risk.shieldDamage += absorbed;
          risk.hpDamage += dealtToHp;
          risk.lethal = risk.hpTo <= 0;
          if (!risk.enemyIds.includes(enemy.id)) risk.enemyIds.push(enemy.id);
          risk.threats.push({
            enemyId: enemy.id,
            enemyName: enemy.displayName || enemy.name,
            slotIndex: action.slotIndex,
            slotLabel: action.slotLabel,
            damage: Number(hit.raw || 0),
            shieldDamage: absorbed,
            hpDamage: dealtToHp,
            attackDirection: action.direction,
            attackCells: clone(action.attackCells || []),
            path: clone(intent.path || [])
          });
        }
      }
    }
    return Array.from(byId.values())
      .filter(risk => risk.threats.length > 0)
      .sort((a, b) => a.r - b.r || a.c - b.c || String(a.unitId).localeCompare(String(b.unitId)));
  }

  // ---- sandbox utilities ----

  function stableClone(value) {
    return clone(value || {});
  }

  function snapshotSandboxUnit(unit) {
    if (!unit) return null;
    return {
      id: unit.id,
      petId: unit.petId || null,
      side: unit.side || null,
      camp: unit.camp || null,
      type: unit.type || null,
      name: unit.name || '',
      displayName: unit.displayName || unit.name || '',
      element: unit.element || null,
      hp: Math.max(0, Number(unit.hp || 0)),
      maxHp: Math.max(0, Number(unit.maxHp || unit.hp || 0)),
      shield: Math.max(0, Number(unit.shield || 0)),
      def: Math.max(0, Number(unit.def || 0)),
      atk: Math.max(0, Number(unit.atk || 0)),
      alive: unit.alive !== false && Number(unit.hp || 0) > 0,
      position: unit.position ? normalizePosition(unit.position) : null,
      actionSlotsUsed: stableClone(unit.actionSlotsUsed),
      actionApSpent: Math.max(0, Number(unit.actionApSpent || 0)),
      hasAttacked: !!unit.hasAttacked,
      shape: stableClone(unit.shape),
      elements: stableClone(unit.elements),
      mechanicStatus: Array.isArray(unit.mechanicStatus) ? clone(unit.mechanicStatus) : []
    };
  }

  function snapshotSandboxUnits(state) {
    const units = [];
    const seen = new Set();
    const push = unit => {
      const item = snapshotSandboxUnit(unit);
      if (!item || seen.has(item.id)) return;
      seen.add(item.id);
      units.push(item);
    };
    for (const unit of state.units || []) push(unit);
    push(state.leaders?.player);
    push(state.leaders?.enemy);
    return units;
  }

  function snapshotSandboxCell(cell) {
    return {
      r: Number(cell.r),
      c: Number(cell.c),
      key: cell.key || `${Number(cell.r)},${Number(cell.c)}`,
      unitId: cell.unitId || null,
      unitSide: cell.unitSide || null,
      unitName: cell.unitName || null,
      leaderId: cell.leaderId || null,
      elements: stableClone(cell.elements),
      elementCamps: stableClone(cell.elementCamps),
      terrain: stableClone(cell.terrain),
      preview: cell.preview ? clone(cell.preview) : null,
      previews: Array.isArray(cell.previews) ? clone(cell.previews) : [],
      threat: cell.threat ? clone(cell.threat) : null
    };
  }

  function snapshotSandboxCells(state) {
    return (state.board?.cells || []).map(snapshotSandboxCell);
  }

  function stableUnitSignature(unit) {
    return JSON.stringify({
      id: unit.id,
      side: unit.side,
      hp: unit.hp,
      maxHp: unit.maxHp,
      shield: unit.shield,
      alive: unit.alive,
      position: unit.position,
      actionSlotsUsed: unit.actionSlotsUsed,
      actionApSpent: unit.actionApSpent,
      hasAttacked: unit.hasAttacked,
      elements: unit.elements
    });
  }

  function stableCellSignature(cell) {
    return JSON.stringify({
      r: cell.r,
      c: cell.c,
      unitId: cell.unitId,
      unitSide: cell.unitSide,
      unitName: cell.unitName,
      leaderId: cell.leaderId,
      elements: cell.elements,
      elementCamps: cell.elementCamps,
      terrain: cell.terrain
    });
  }

  function buildUnitDiffs(beforeUnits, afterUnits) {
    const beforeMap = new Map(beforeUnits.map(unit => [unit.id, unit]));
    const afterMap = new Map(afterUnits.map(unit => [unit.id, unit]));
    const ids = new Set([...beforeMap.keys(), ...afterMap.keys()]);
    return [...ids].sort().map(id => {
      const before = beforeMap.get(id) || null;
      const after = afterMap.get(id) || null;
      if (stableUnitSignature(before || {}) === stableUnitSignature(after || {})) return null;
      return { id, before, after };
    }).filter(Boolean);
  }

  function buildCellDiffs(beforeCells, afterCells) {
    const keyFor = cell => cell.key || `${cell.r},${cell.c}`;
    const beforeMap = new Map(beforeCells.map(cell => [keyFor(cell), cell]));
    const afterMap = new Map(afterCells.map(cell => [keyFor(cell), cell]));
    const keys = new Set([...beforeMap.keys(), ...afterMap.keys()]);
    return [...keys].sort((a, b) => {
      const [ar, ac] = a.split(',').map(Number);
      const [br, bc] = b.split(',').map(Number);
      return ar - br || ac - bc;
    }).map(key => {
      const before = beforeMap.get(key) || null;
      const after = afterMap.get(key) || null;
      if (stableCellSignature(before || {}) === stableCellSignature(after || {})) return null;
      const source = after || before || {};
      return { r: source.r, c: source.c, key, before, after };
    }).filter(Boolean);
  }

  function nextPlayerAllOutAction(state, blocked) {
    for (const actor of living(state, 'hero')) {
      if (!actor || actor.alive === false || Number(actor.hp || 0) <= 0) continue;
      const slots = slotsForUnit(state, actor);
      for (const slot of slots) {
        const key = `${actor.id}:${slot.index}`;
        if (blocked.has(key)) continue;
        if (slot.used || actor.actionSlotsUsed?.[slot.index] || slot.canUse === false) continue;
        return { actor, slot, key };
      }
    }
    return null;
  }

  function runPlayerAllOutPreviewSandbox(state) {
    const result = { count: 0, attempts: [], guard: 0 };
    if (!useActionSlot || state.phase !== 'player_turn') return result;
    const blocked = new Set();
    while (state.phase === 'player_turn' && result.guard < 40) {
      result.guard += 1;
      const action = nextPlayerAllOutAction(state, blocked);
      if (!action) break;
      const ok = !!useActionSlot(state, action.actor.id, action.slot.index, null, { ap: 1 });
      result.attempts.push({
        unitId: action.actor.id,
        unitName: action.actor.displayName || action.actor.name,
        slotId: action.slot.index,
        accepted: ok
      });
      if (!ok) {
        blocked.add(action.key);
        continue;
      }
      result.count += 1;
    }
    return result;
  }

  // ---- move risk grid ----

  function buildMoveRiskGrid(state, unitId, opts = {}) {
    const unit = getUnit(state, unitId) || living(state, 'hero')[0];
    if (!unit || unit.side !== 'hero' || unit.alive === false || Number(unit.hp || 0) <= 0) return [];
    const start = normalizePosition(unit.position || { r: 0, c: 0 });
    const moveRange = effectiveMoveRange(state, unit);
    const targets = allStandCells(state, unit)
      .filter(pos => {
        const d = dist(start, pos);
        return d > 0 && d <= moveRange;
      })
      .sort((a, b) => a.r - b.r || a.c - b.c);
    const out = [];
    const movedUnitIds = Array.isArray(state.teamPlacementPreview?.movedUnitIds) ? state.teamPlacementPreview.movedUnitIds : [];
    const teamUnitIds = Array.from(new Set(movedUnitIds.concat(unit.id).filter(Boolean)));
    for (const target of targets) {
      const sandbox = clone(state);
      const eventStart = Array.isArray(sandbox.events) ? sandbox.events.length : 0;
      const movedOk = typeof moveHero === 'function' ? moveHero(sandbox, unit.id, { r: target.r, c: target.c }) : false;
      if (!movedOk) continue;
      const riskUnitIds = Array.from(new Set((Array.isArray(sandbox.teamPlacementPreview?.movedUnitIds)
        ? sandbox.teamPlacementPreview.movedUnitIds
        : teamUnitIds).concat(unit.id).filter(Boolean)));
      const teamRiskGrid = buildTeamRiskGrid(sandbox, riskUnitIds);
      let sandboxActionOk = false;
      let sandboxBoardCells = [];
      let sandboxUnits = [];
      let sandboxEvents = [];
      let cellDiffs = [];
      let unitDiffs = [];
      let previewGrid = [];
      if (!opts.summaryOnly) {
        previewGrid = buildPreviewGrid ? buildPreviewGrid(sandbox, { unitId: unit.id }) : [];
        const beforeUnits = snapshotSandboxUnits(sandbox);
        const beforeCells = snapshotSandboxCells(sandbox);
        const allOut = runPlayerAllOutPreviewSandbox(sandbox);
        sandboxActionOk = allOut.count > 0;
        if (syncBoardUnits) syncBoardUnits(sandbox);
        sandboxBoardCells = snapshotSandboxCells(sandbox);
        sandboxUnits = snapshotSandboxUnits(sandbox);
        sandboxEvents = Array.isArray(sandbox.events) ? clone(sandbox.events.slice(eventStart)) : [];
        cellDiffs = buildCellDiffs(beforeCells, sandboxBoardCells);
        unitDiffs = buildUnitDiffs(beforeUnits, sandboxUnits);
      }
      const currentRisk = teamRiskGrid.find(risk => risk.unitId === unit.id) || null;
      out.push({
        r: target.r,
        c: target.c,
        unitId: unit.id,
        unitName: unit.displayName || unit.name,
        damage: currentRisk?.damage || 0,
        shieldDamage: currentRisk?.shieldDamage || 0,
        hpDamage: currentRisk?.hpDamage || 0,
        shieldFrom: Math.max(0, Number(unit.shield || 0)),
        shieldTo: currentRisk?.shieldTo ?? Math.max(0, Number(unit.shield || 0)),
        hpFrom: Math.max(0, Number(unit.hp || 0)),
        hpTo: currentRisk?.hpTo ?? Math.max(0, Number(unit.hp || 0)),
        lethal: currentRisk?.lethal || false,
        enemyIds: currentRisk?.enemyIds || [],
        threats: currentRisk?.threats || [],
        previewGrid,
        teamRiskGrid,
        sandboxMoveOk: movedOk,
        sandboxActionOk,
        sandboxBoardCells,
        sandboxUnits,
        sandboxEvents,
        cellDiffs,
        unitDiffs
      });
    }
    return out;
  }

  return {
    buildThreatGrid, buildTeamRiskGrid, buildMoveRiskGrid,
    snapshotSandboxUnits, snapshotSandboxCells,
    buildUnitDiffs, buildCellDiffs,
    nextPlayerAllOutAction, runPlayerAllOutPreviewSandbox
  };
}

module.exports = { createThreatModule };
