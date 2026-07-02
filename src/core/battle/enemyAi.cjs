// @ts-check

/**
 * @typedef {{r:number,c:number}} Position
 * @typedef {{id:string, side?:string, camp?:string, alive?:boolean, hp?:number, ap?:number, element?:string, position?:Position, actionSlotsUsed?:Record<string, boolean>}} BattleUnit
 * @typedef {{units?:BattleUnit[], leaders?:{player?:BattleUnit, enemy?:BattleUnit}, board?:{cells?:Array<Record<string, any>>}}} BattleState
 * @typedef {{from:Position,to:Position,path:Position[],dir:string,attackCells:Position[],willAttack:boolean}} EnemyAttackPlan
 */

/**
 * Enemy AI: attack planning, pet turn logic, monster intent computation.
 *
 * @param {Record<string, any>} deps
 * @returns {Record<string, Function>}
 */
function createEnemyAiModule(deps) {
  const { ELEMENTS, makeEmptyElements, clone, getUnit, living, getCell, normalizePosition, BOARD_ROWS, BOARD_COLS, sign, dist, unitCamp, sideForCamp, factionRules, combatTargets, hasTerrain, effectiveDamageFromLayers, effectiveMoveRange, actionDirs, canStandAt, slotsForUnit, targetCellsForSlot, targetsAtCells, syncBoardUnits, estimateHitDamage, estimateDamageAllocation } = deps;

  // ---- position / path helpers ----

  /**
   * @param {BattleState} state
   * @param {BattleUnit} actor
   * @param {Record<string, any>} slot
   * @param {Position} fromPos
   * @param {string} dir
   * @returns {Position[]}
   */
  function targetCellsForSlotFrom(state, actor, slot, fromPos, dir) {
    const savedPos = actor.position;
    const savedDir = slot.direction;
    actor.position = normalizePosition(fromPos);
    slot.direction = dir || slot.direction || 'right';
    const cells = targetCellsForSlot(state, actor, slot, null);
    actor.position = savedPos;
    slot.direction = savedDir;
    return cells;
  }

  function firstLineDirection(from, to, maxRange) {
    if (from.r === to.r) {
      const dc = to.c - from.c;
      if (dc > 0 && dc <= maxRange) return 'right';
      if (dc < 0 && -dc <= maxRange) return 'left';
    }
    if (from.c === to.c) {
      const dr = to.r - from.r;
      if (dr > 0 && dr <= maxRange) return 'down';
      if (dr < 0 && -dr <= maxRange) return 'up';
    }
    return null;
  }

  function pathToward(state, actor, target, maxSteps) {
    const path = [];
    let cur = normalizePosition(actor.position || { r: 0, c: 0 });
    for (let i = 0; i < maxSteps; i++) {
      if (cur.r === target.r && cur.c === target.c) break;
      const candidates = [];
      if (cur.c !== target.c) candidates.push({ r: cur.r, c: cur.c + sign(target.c - cur.c) });
      if (cur.r !== target.r) candidates.push({ r: cur.r + sign(target.r - cur.r), c: cur.c });
      const next = candidates.find(p => canStandAt(state, actor, p));
      if (!next) break;
      cur = next;
      path.push({ r: cur.r, c: cur.c });
    }
    return path;
  }

  // ---- enemy attack planning ----

  /**
   * @param {BattleState} state
   * @param {BattleUnit} enemy
   * @param {BattleUnit} target
   * @returns {EnemyAttackPlan}
   */
  function chooseEnemyAttackPlan(state, enemy, target) {
    const pos = normalizePosition(enemy.position || { r: 0, c: BOARD_COLS - 1 });
    const tp = normalizePosition(target.position || { r: 0, c: 0 });
    const slot = slotsForUnit(state, enemy)[0] || { hitCells: 1, layers: 1, element: enemy.element, direction: 'left' };
    const maxRange = Math.max(1, Number(slot.hitCells || 1));
    const ap = Math.max(0, Number(enemy.ap || 1));
    let best = null;
    const candidates = [];
    for (let r = 0; r < BOARD_ROWS; r++) for (let c = 0; c < BOARD_COLS; c++) {
      const p = { r, c };
      if (dist(pos, p) > ap) continue;
      if (!canStandAt(state, enemy, p)) continue;
      const dir = firstLineDirection(p, tp, maxRange);
      if (!dir) continue;
      candidates.push({ pos: p, dir, d: dist(pos, p), targetD: dist(p, tp) });
    }
    candidates.sort((a, b) => a.d - b.d || a.targetD - b.targetD);
    if (candidates.length) best = candidates[0];
    if (!best) {
      const path = pathToward(state, enemy, tp, Math.min(ap, Math.max(0, dist(pos, tp) - 1)));
      const end = path.length ? path[path.length - 1] : pos;
      const dir = firstLineDirection(end, tp, maxRange) || firstLineDirection(pos, tp, maxRange) || 'left';
      return { from: pos, to: end, path, dir, attackCells: targetCellsForSlotFrom(state, enemy, slot, end, dir), willAttack: false };
    }
    const path = pathToward(state, enemy, best.pos, Math.min(ap, dist(pos, best.pos)));
    const end = path.length ? path[path.length - 1] : pos;
    const attackCells = targetCellsForSlotFrom(state, enemy, slot, end, best.dir);
    const hit = attackCells.some(p => p.r === tp.r && p.c === tp.c);
    return { from: pos, to: end, path, dir: best.dir, attackCells, willAttack: hit };
  }

  // ---- enemy helpers ----

  function enemyLeaderId(state) {
    return state.leaders?.enemy?.id || null;
  }

  function isEnemyLeaderTarget(state, targetOrId) {
    const id = typeof targetOrId === 'string' ? targetOrId : targetOrId?.id;
    return !!id && id === enemyLeaderId(state);
  }

  function hasLivingNonBossEnemies(state) {
    const bossId = enemyLeaderId(state);
    return living(state, 'enemy').some(target => target.id !== bossId);
  }

  function cellHasElementOrTerrain(state, pos) {
    const cell = getCell(state, pos.r, pos.c);
    if (!cell) return true;
    if (hasTerrain(cell)) return true;
    return ELEMENTS.some(el => Number(cell.elements?.[el] || 0) > 0);
  }

  function canEnemyEnterCell(state, enemy, pos) {
    if (!pos || pos.r < 0 || pos.c < 0 || pos.r >= BOARD_ROWS || pos.c >= BOARD_COLS) return false;
    if (!canStandAt(state, enemy, pos)) return false;
    const cur = normalizePosition(enemy.position || { r: 0, c: 0 });
    if (cur.r === pos.r && cur.c === pos.c) return true;
    return !cellHasElementOrTerrain(state, pos);
  }

  // ---- damage preview (enemy side) ----

  function previewDirectDamage(attacker, target) {
    const raw = Math.max(0, Number(attacker.atk || 0) - Number(target.def || 0));
    const shieldDamage = Math.min(Number(target.shield || 0), raw);
    const hpDamage = Math.min(Number(target.hp || 0), Math.max(0, raw - shieldDamage));
    return {
      raw,
      damage: raw,
      shieldDamage,
      hpDamage,
      hpFrom: Math.max(0, Number(target.hp || 0)),
      hpTo: Math.max(0, Number(target.hp || 0) - hpDamage),
      lethal: hpDamage >= Number(target.hp || 0)
    };
  }

  function applyPreviewDamage(target, hit) {
    if (!target || target.alive === false || Number(target.hp || 0) <= 0) return;
    const shieldAbsorb = Math.min(Number(target.shield || 0), Number(hit.raw || 0));
    target.shield = Math.max(0, Number(target.shield || 0) - shieldAbsorb);
    const hpDamage = Math.min(Number(target.hp || 0), Math.max(0, Number(hit.raw || 0) - shieldAbsorb));
    target.hp = Math.max(0, Number(target.hp || 0) - hpDamage);
    if (target.hp <= 0) target.alive = false;
  }

  function actionTargetsForCells(state, cells) {
    return targetsAtCells(state, cells, 'player')
      .filter(target => target && target.alive !== false && Number(target.hp || 0) > 0);
  }

  function scoreEnemyHits(state, hits) {
    return hits.reduce((sum, hit) => {
      const target = getUnit(state, hit.targetId);
      const leaderBonus = target && target.id === state.leaders?.player?.id ? 50 : 0;
      return sum + hit.damage * 10 + (hit.lethal ? 80 : 0) + leaderBonus;
    }, 0);
  }

  // ---- enemy pet turn ----

  function chooseEnemyPetAction(state, enemy, usedSlots) {
    const slots = slotsForUnit(state, enemy).filter(slot => !usedSlots.has(slot.index));
    const pos = normalizePosition(enemy.position || { r: 0, c: 0 });
    for (const slot of slots.sort((a, b) => a.index - b.index)) {
      let best = null;
      for (const dir of actionDirs()) {
        const cells = targetCellsForSlotFrom(state, enemy, slot, pos, dir);
        if (!cells.length) continue;
        const targets = actionTargetsForCells(state, cells);
        if (!targets.length) continue;
        const hits = targets.map(target => {
          const damage = previewDirectDamage(enemy, target);
          return Object.assign({
            targetId: target.id,
            targetName: target.displayName || target.name,
            r: target.position.r,
            c: target.position.c
          }, damage);
        }).filter(hit => hit.damage > 0);
        if (!hits.length) continue;
        const score = scoreEnemyHits(state, hits);
        const candidate = {
          type: 'attack',
          apCost: 1,
          slotIndex: slot.index,
          slotId: slot.slotId,
          slotLabel: slot.label,
          shapeId: slot.shapeId,
          shapeName: slot.shapeName,
          direction: dir,
          attackCells: cells,
          targetIds: hits.map(hit => hit.targetId),
          hits,
          damage: hits.reduce((sum, hit) => sum + hit.damage, 0),
          hpDamage: hits.reduce((sum, hit) => sum + hit.hpDamage, 0),
          lethal: hits.some(hit => hit.lethal),
          score
        };
        if (!best || candidate.score > best.score) best = candidate;
      }
      if (best) return best;
    }
    return null;
  }

  function canAttackAfterStep(state, enemy, step, usedSlots) {
    const saved = enemy.position;
    enemy.position = normalizePosition(step);
    const action = chooseEnemyPetAction(state, enemy, usedSlots);
    enemy.position = saved;
    return !!action;
  }

  function chooseEnemyPetMove(state, enemy, usedSlots) {
    const pos = normalizePosition(enemy.position || { r: 0, c: 0 });
    const targets = combatTargets(state, 'player')
      .filter(target => target && target.position && target.alive !== false && Number(target.hp || 0) > 0);
    if (!targets.length) return null;
    const steps = [
      { r: pos.r, c: pos.c - 1 },
      { r: pos.r, c: pos.c + 1 },
      { r: pos.r - 1, c: pos.c },
      { r: pos.r + 1, c: pos.c }
    ];
    let best = null;
    for (const target of targets) {
      const targetPos = normalizePosition(target.position);
      const currentD = dist(pos, targetPos);
      for (const step of steps) {
        if (!canEnemyEnterCell(state, enemy, step)) continue;
        const d = dist(step, targetPos);
        if (d >= currentD) continue;
        const afterAttack = canAttackAfterStep(state, enemy, step, usedSlots);
        const leaderBonus = target.id === state.leaders?.player?.id ? 2 : 0;
        const score = (afterAttack ? 100 : 0) + leaderBonus - d;
        const candidate = { type: 'move', apCost: 1, from: pos, to: step, targetId: target.id, targetName: target.displayName || target.name, score };
        if (!best || candidate.score > best.score) best = candidate;
      }
    }
    return best;
  }

  // ---- full pet turn planning ----

  function planEnemyPetTurn(state, unit) {
    const sandbox = clone(state);
    const enemy = getUnit(sandbox, unit.id);
    if (!enemy || enemy.alive === false || Number(enemy.hp || 0) <= 0) return null;
    const apMax = Math.max(0, Number(enemy.ap || 0));
    const usedSlots = new Set(Object.entries(enemy.actionSlotsUsed || {}).filter(([, used]) => used).map(([idx]) => Number(idx)));
    const actions = [];
    const path = [];
    const steps = [];
    let apRemaining = apMax;
    while (apRemaining > 0) {
      const action = chooseEnemyPetAction(sandbox, enemy, usedSlots);
      if (action) {
        action.sequence = steps.length + 1;
        action.apBefore = apRemaining;
        action.apAfter = apRemaining - 1;
        usedSlots.add(action.slotIndex);
        for (const hit of action.hits) applyPreviewDamage(getUnit(sandbox, hit.targetId), hit);
        actions.push(action);
        steps.push(action);
        apRemaining -= 1;
        continue;
      }
      const move = chooseEnemyPetMove(sandbox, enemy, usedSlots);
      if (!move) break;
      move.sequence = steps.length + 1;
      move.apBefore = apRemaining;
      move.apAfter = apRemaining - 1;
      enemy.position = normalizePosition(move.to);
      path.push(clone(enemy.position));
      if (syncBoardUnits) syncBoardUnits(sandbox);
      steps.push(move);
      apRemaining -= 1;
    }
    const firstHit = actions.flatMap(action => action.hits)[0] || null;
    const fallbackTarget = combatTargets(sandbox, 'player')[0] || null;
    const target = firstHit ? getUnit(state, firstHit.targetId) : fallbackTarget;
    const totalDamage = actions.reduce((sum, action) => sum + action.damage, 0);
    const totalHpDamage = actions.reduce((sum, action) => sum + action.hpDamage, 0);
    return {
      unitId: unit.id,
      unitName: unit.displayName || unit.name,
      petId: unit.petId || null,
      targetId: firstHit?.targetId || target?.id || null,
      targetName: firstHit?.targetName || target?.displayName || target?.name || null,
      from: normalizePosition(unit.position || { r: 0, c: BOARD_COLS - 1 }),
      path,
      steps,
      actions,
      attackCells: actions.flatMap(action => action.attackCells),
      attackDirection: actions[0]?.direction || null,
      willAttack: actions.length > 0,
      ap: apMax,
      apSpent: steps.reduce((sum, step) => sum + Number(step.apCost || 0), 0),
      apRemaining,
      totalDamage,
      expectedDamage: totalHpDamage,
      expectedKill: actions.some(action => action.lethal),
      damage: Number(unit.atk || 0)
    };
  }

  function computeMonsterIntent(state, unit) {
    return planEnemyPetTurn(state, unit);
  }

  return {
    targetCellsForSlotFrom, firstLineDirection, pathToward,
    chooseEnemyAttackPlan,
    enemyLeaderId, isEnemyLeaderTarget, hasLivingNonBossEnemies,
    chooseEnemyPetAction, chooseEnemyPetMove, planEnemyPetTurn, computeMonsterIntent
  };
}

module.exports = { createEnemyAiModule };
