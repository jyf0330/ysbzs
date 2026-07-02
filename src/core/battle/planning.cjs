// @ts-check

/**
 * @typedef {{r:number,c:number}} Position
 * @typedef {{id:string, side?:string, camp?:string, alive?:boolean, hp?:number, ap?:number, element?:string, position?:Position, actionSlotsUsed?:Record<string, boolean>}} BattleUnit
 * @typedef {{units?:BattleUnit[], leaders?:{player?:BattleUnit, enemy?:BattleUnit}, board?:{cells?:Array<Record<string, any>>}, teamPlacementPreview?:{movedUnitIds?:string[]}, events?:any[], phase?:string}} BattleState
 */

const { createEnemyAiModule } = require('./enemyAi.cjs');
const { createThreatModule } = require('./threat.cjs');

/**
 * Composes enemy AI, threat/risk grids, and player auto-planning into a single module.
 *
 * @param {Record<string, any>} deps
 * @returns {Record<string, Function>}
 */
function createPlanningModule(deps) {
  const { ELEMENTS, makeEmptyElements, clone, getUnit, living, getCell, normalizePosition, BOARD_ROWS, BOARD_COLS, sign, dist, unitCamp, sideForCamp, factionRules, combatTargets, terrainModules, hasTerrain, effectiveDamageFromLayers, effectiveMoveRange, actionDirs, canStandAt, allStandCells, slotsForUnit, targetCellsForSlot, targetsAtCells, syncBoardUnits, buildPreviewGrid, useActionSlot, moveHero } = deps;

  // ---- sub-modules ----

  const enemyAi = createEnemyAiModule(deps);
  const threat = createThreatModule(Object.assign({}, deps, {
    computeMonsterIntent: enemyAi.computeMonsterIntent
  }));

  // ---- player-side helpers ----

  function positionKey(pos) { return `${pos.r},${pos.c}`; }

  function cloneElementsFromCell(cell) { return Object.assign(makeEmptyElements(), cell?.elements || {}); }

  // ---- damage estimation (shared by player and enemy) ----

  function estimateHitDamage(actor, slot, target) {
    const actionRaw = Math.max(0, Number(actor?.atk ?? slot?.layers ?? 0));
    const layerRaw = Math.max(0, Number(effectiveDamageFromLayers(slot?.layers, target) || 0));
    const raw = Math.max(actionRaw, layerRaw);
    return Math.max(0, raw - Number(target?.def || 0));
  }

  function estimateDamageAllocation(target, damage, already = 0) {
    const shield = Math.max(0, Number(target?.shield || 0));
    const hp = Math.max(0, Number(target?.hp || 0));
    const applied = Math.max(0, Number(already || 0));
    const remainingShield = Math.max(0, shield - applied);
    const remainingHp = Math.max(0, hp - Math.max(0, applied - shield));
    const final = Math.max(0, Number(damage || 0));
    const shieldDamage = Math.min(remainingShield, final);
    const hpDamage = Math.min(remainingHp, Math.max(0, final - shieldDamage));
    const effective = shieldDamage + hpDamage;
    return {
      final,
      effective,
      overflow: Math.max(0, final - effective),
      hpDamage,
      shieldDamage,
      killed: remainingHp > 0 && hpDamage >= remainingHp
    };
  }

  // ---- candidate scoring ----

  function actionCandidateScore(state, actor, slot, cells, targets) {
    let effective = 0, raw = 0, kills = 0, bossDamage = 0, terrainValue = 0, weakenValue = 0;
    let bossKilled = false;
    for (const t of targets) {
      const add = estimateHitDamage(actor, slot, t);
      const allocation = estimateDamageAllocation(t, add);
      raw += allocation.final;
      const eff = allocation.effective;
      effective += eff;
      if (enemyAi.isEnemyLeaderTarget(state, t)) {
        bossDamage += eff;
        if (allocation.killed) bossKilled = true;
      }
      if (allocation.killed) kills++;
    }
    if (!targets.length) {
      for (const p of cells) {
        const cell = getCell(state, p.r, p.c);
        if (!cell) continue;
        if (hasTerrain(cell)) {
          terrainValue += 3;
          continue;
        }
        const before = cell.elements?.[slot.element] || 0;
        const pending = ELEMENTS.reduce((sum, el) => sum + Math.max(0, Number(cell.elements?.[el] || 0)), 0);
        const threshold = factionRules(state, unitCamp(actor)).terrainFormThreshold || 3;
        weakenValue += pending > 0 ? 1 : 0;
        terrainValue += before + slot.layers >= threshold ? 5 : 1;
      }
    }
    const overflow = Math.max(0, raw - effective);
    const nonlethalBossDeprioritized = enemyAi.hasLivingNonBossEnemies(state) && bossDamage > 0 && !bossKilled;
    const priorityEffective = Math.max(0, effective - (nonlethalBossDeprioritized ? bossDamage : 0));
    const bossPriorityDamage = nonlethalBossDeprioritized ? 0 : bossDamage;
    return {
      effective,
      raw,
      overflow,
      kills,
      bossDamage,
      terrainValue,
      weakenValue,
      score: priorityEffective * 10 + kills * 30 + bossPriorityDamage * 8 + terrainValue * 2 + weakenValue * 3 - overflow * 8
    };
  }

  // ---- actor candidate generation ----

  function generateActorCandidates(state, actor, limit = 10) {
    const start = normalizePosition(actor.position || { r: 0, c: 0 });
    const moveRange = effectiveMoveRange(state, actor);
    const standCells = allStandCells(state, actor).filter(p => dist(start, p) <= moveRange);
    const slots = slotsForUnit(state, actor).filter(slot => !slot.used && !actor.actionSlotsUsed?.[slot.index]);
    const out = [{ unitId: actor.id, pos: start, actions: [], rawScore: 0, moveCost: 0 }];
    for (const pos of standCells) {
      const actions = [];
      let rawScore = 0;
      for (const slot of slots) {
        let bestAction = null;
        for (const dir of actionDirs()) {
          const cells = enemyAi.targetCellsForSlotFrom(state, actor, slot, pos, dir);
          if (!cells.length) continue;
          const targets = targetsAtCells(state, cells, 'enemy');
          const metrics = actionCandidateScore(state, actor, slot, cells, targets);
          const score = metrics.score - dist(start, pos) * 0.05;
          if (!bestAction || score > bestAction.score) {
            bestAction = { slotIndex: slot.index, slotId: slot.slotId, dir, cells, targets: targets.map(t => t.id), element: slot.element, layers: slot.layers, score, rawScore: metrics.score, metrics };
          }
        }
        if (bestAction && bestAction.rawScore > 0) {
          actions.push(bestAction);
          rawScore += bestAction.score;
        }
      }
      if (actions.length) out.push({ unitId: actor.id, pos, actions, rawScore, moveCost: dist(start, pos) });
    }
    return out.sort((a, b) => b.rawScore - a.rawScore || a.moveCost - b.moveCost).slice(0, limit);
  }

  // ---- team evaluation ----

  function evaluateTeamChoices(state, choices) {
    const targetDamage = new Map();
    const cellElements = new Map();
    const terrainCounts = new Map();
    const occupied = new Set();
    const actionStats = new Map();
    let score = 0;
    let effectiveDamage = 0;
    let overflow = 0;
    let kills = 0;
    let bossDamage = 0;
    let terrainForms = 0;
    let terrainStacks = 0;
    let weakenBenefit = 0;
    let conflictPenalty = 0;
    let bossKilled = false;
    for (let ci = 0; ci < choices.length; ci++) {
      const choice = choices[ci];
      const actor = getUnit(state, choice.unitId);
      if (!actor) continue;
      const key = positionKey(choice.pos);
      if (occupied.has(key)) conflictPenalty += 1;
      occupied.add(key);
      score -= dist(normalizePosition(actor.position || choice.pos), choice.pos) * 0.05;
      for (let ai = 0; ai < choice.actions.length; ai++) {
        const action = choice.actions[ai];
        const stats = { effective: 0, overflow: 0, kills: 0, bossDamage: 0, terrainForms: 0, terrainStacks: 0, weakenBenefit: 0 };
        if (action.targets.length) {
          for (const tid of action.targets) {
            const target = getUnit(state, tid);
            if (!target) continue;
            const already = targetDamage.get(tid) || 0;
            const raw = estimateHitDamage(actor, action, target);
            const allocation = estimateDamageAllocation(target, raw, already);
            const eff = allocation.effective;
            const over = allocation.overflow;
            targetDamage.set(tid, already + allocation.final);
            stats.effective += eff;
            stats.overflow += over;
            if (allocation.killed) stats.kills += 1;
            if (enemyAi.isEnemyLeaderTarget(state, tid)) {
              stats.bossDamage += eff;
              if (allocation.killed) bossKilled = true;
            }
          }
        } else {
          for (const p of action.cells) {
            const cell = getCell(state, p.r, p.c);
            if (!cell) continue;
            const ckey = positionKey(p);
            const terrainCount = terrainCounts.has(ckey) ? terrainCounts.get(ckey) : terrainModules(cell).length;
            if (terrainCount > 0) {
              terrainCounts.set(ckey, terrainCount + 1);
              stats.terrainStacks += Number(action.layers || 1);
              continue;
            }
            const elements = cellElements.has(ckey) ? cellElements.get(ckey) : cloneElementsFromCell(cell);
            const hadPending = ELEMENTS.some(el => elements[el] > 0);
            if (hadPending) {
              for (const el of ELEMENTS) elements[el] = Math.max(0, elements[el] - 1);
              stats.weakenBenefit += 1;
            }
            elements[action.element] = (elements[action.element] || 0) + Number(action.layers || 1);
            if (elements[action.element] >= Number(factionRules(state, unitCamp(actor)).terrainFormThreshold || 3)) {
              terrainCounts.set(ckey, 1);
              for (const el of ELEMENTS) elements[el] = 0;
              stats.terrainForms += 1;
            }
            cellElements.set(ckey, elements);
          }
        }
        actionStats.set(`${ci}:${ai}`, stats);
        effectiveDamage += stats.effective;
        overflow += stats.overflow;
        kills += stats.kills;
        bossDamage += stats.bossDamage;
        terrainForms += stats.terrainForms;
        terrainStacks += stats.terrainStacks;
        weakenBenefit += stats.weakenBenefit;
      }
    }
    const nonlethalBossDeprioritized = enemyAi.hasLivingNonBossEnemies(state) && bossDamage > 0 && !bossKilled;
    const priorityEffectiveDamage = Math.max(0, effectiveDamage - (nonlethalBossDeprioritized ? bossDamage : 0));
    const bossPriorityDamage = nonlethalBossDeprioritized ? 0 : bossDamage;
    score += priorityEffectiveDamage * 10 + kills * 30 + bossPriorityDamage * 8 + terrainForms * 20 + terrainStacks * 6 + weakenBenefit * 3 - overflow * 8 - conflictPenalty * 80;
    return { score, effectiveDamage, overflow, kills, bossDamage, terrainForms, terrainStacks, weakenBenefit, conflictPenalty, actionStats };
  }

  // ---- player auto planning ----

  function buildPlayerAutoPlan(state) {
    const plan = { moves: [], actions: [], score: 0, effectiveDamage: 0, overflow: 0, kills: 0, bossDamage: 0, terrainForms: 0, terrainStacks: 0, weakenBenefit: 0, conflictPenalty: 0, sandbox: null, summary: '' };
    const heroes = living(state, 'hero');
    if (!combatTargets(state, 'enemy').length) { plan.summary = '全队规划：没有敌方目标，跳过施放'; return plan; }
    const candidateSets = heroes.map(actor => ({ actor, candidates: generateActorCandidates(state, actor, 10) }));
    let beams = [{ choices: [], evaluation: evaluateTeamChoices(state, []) }];
    let evaluatedPlans = 0;
    const beamWidth = 40;
    for (const set of candidateSets) {
      const next = [];
      for (const beam of beams) {
        for (const candidate of set.candidates) {
          const choices = beam.choices.concat(candidate);
          const evaluation = evaluateTeamChoices(state, choices);
          evaluatedPlans++;
          next.push({ choices, evaluation });
        }
      }
      beams = next.sort((a, b) => b.evaluation.score - a.evaluation.score).slice(0, beamWidth);
    }
    const best = beams[0] || { choices: [], evaluation: evaluateTeamChoices(state, []) };
    const evaluation = best.evaluation;
    for (let ci = 0; ci < best.choices.length; ci++) {
      const choice = best.choices[ci];
      const actor = getUnit(state, choice.unitId);
      if (!actor) continue;
      const start = normalizePosition(actor.position || choice.pos);
      if (choice.pos.r !== start.r || choice.pos.c !== start.c) plan.moves.push({ unitId: actor.id, from: start, to: choice.pos, reason: '全队沙盒收益最大化' });
      for (let ai = 0; ai < choice.actions.length; ai++) {
        const a = choice.actions[ai];
        const stats = evaluation.actionStats.get(`${ci}:${ai}`) || {};
        plan.actions.push({ unitId: actor.id, slotIndex: a.slotIndex, dir: a.dir, score: a.score, effective: stats.effective || 0, overflow: stats.overflow || 0, kills: stats.kills || 0, bossDamage: stats.bossDamage || 0, terrainForms: stats.terrainForms || 0, terrainStacks: stats.terrainStacks || 0, weakenBenefit: stats.weakenBenefit || 0, cells: a.cells, targets: a.targets });
      }
    }
    plan.score = evaluation.score;
    plan.effectiveDamage = evaluation.effectiveDamage;
    plan.overflow = evaluation.overflow;
    plan.kills = evaluation.kills;
    plan.bossDamage = evaluation.bossDamage;
    plan.terrainForms = evaluation.terrainForms;
    plan.terrainStacks = evaluation.terrainStacks;
    plan.weakenBenefit = evaluation.weakenBenefit;
    plan.conflictPenalty = evaluation.conflictPenalty;
    plan.sandbox = { beamWidth, evaluatedPlans, candidateCounts: candidateSets.map(x => x.candidates.length), scoring: { effectiveDamage: 10, kills: 30, bossDamage: 8, terrainForms: 20, terrainStacks: 6, weakenBenefit: 3, overflow: -8, conflict: -80 } };
    plan.summary = `全队沙盒规划：移动${plan.moves.length}步，施放${plan.actions.length}槽，有效伤害${plan.effectiveDamage}，Boss伤害${plan.bossDamage}，预估击杀${plan.kills}，地形成型${plan.terrainForms}，地形叠加${plan.terrainStacks}，削弱${plan.weakenBenefit}，溢出${plan.overflow}`;
    return plan;
  }

  function hasUsedActionSlot(unit) {
    return Object.values(unit?.actionSlotsUsed || {}).some(Boolean);
  }

  function buildPlayerPositionPlan(state) {
    const plan = { moves: [], directions: [], score: 0, effectiveDamage: 0, overflow: 0, kills: 0, bossDamage: 0, terrainForms: 0, terrainStacks: 0, weakenBenefit: 0, conflictPenalty: 0, sandbox: null, summary: '' };
    if (!combatTargets(state, 'enemy').length) { plan.summary = '智能站位：没有敌方目标，跳过。'; return plan; }
    const movedIds = new Set(Array.isArray(state.teamPlacementPreview?.movedUnitIds) ? state.teamPlacementPreview.movedUnitIds : []);
    const heroes = living(state, 'hero').filter(actor => !movedIds.has(actor.id) && !actor.hasAttacked && !hasUsedActionSlot(actor));
    if (!heroes.length) { plan.summary = '智能站位：没有可调整位置的我方宠物。'; return plan; }
    const candidateSets = heroes.map(actor => ({ actor, candidates: generateActorCandidates(state, actor, 10) }));
    let beams = [{ choices: [], evaluation: evaluateTeamChoices(state, []) }];
    let evaluatedPlans = 0;
    const beamWidth = 40;
    for (const set of candidateSets) {
      const next = [];
      for (const beam of beams) {
        for (const candidate of set.candidates) {
          const choices = beam.choices.concat(candidate);
          const evaluation = evaluateTeamChoices(state, choices);
          evaluatedPlans++;
          next.push({ choices, evaluation });
        }
      }
      beams = next.sort((a, b) => b.evaluation.score - a.evaluation.score).slice(0, beamWidth);
    }
    const best = beams[0] || { choices: [], evaluation: evaluateTeamChoices(state, []) };
    const evaluation = best.evaluation;
    for (const choice of best.choices) {
      const actor = getUnit(state, choice.unitId);
      if (!actor) continue;
      const start = normalizePosition(actor.position || choice.pos);
      if (choice.pos.r !== start.r || choice.pos.c !== start.c) plan.moves.push({ unitId: actor.id, from: start, to: choice.pos, reason: '智能站位最大化预计伤害' });
      for (const action of choice.actions) plan.directions.push({ unitId: actor.id, slotIndex: action.slotIndex, dir: action.dir, score: action.score, targets: action.targets, cells: action.cells });
    }
    plan.score = evaluation.score;
    plan.effectiveDamage = evaluation.effectiveDamage;
    plan.overflow = evaluation.overflow;
    plan.kills = evaluation.kills;
    plan.bossDamage = evaluation.bossDamage;
    plan.terrainForms = evaluation.terrainForms;
    plan.terrainStacks = evaluation.terrainStacks;
    plan.weakenBenefit = evaluation.weakenBenefit;
    plan.conflictPenalty = evaluation.conflictPenalty;
    plan.sandbox = { beamWidth, evaluatedPlans, candidateCounts: candidateSets.map(x => x.candidates.length), movedUnitIds: Array.from(movedIds), scoring: { effectiveDamage: 10, kills: 30, bossDamage: 8, terrainForms: 20, terrainStacks: 6, weakenBenefit: 3, overflow: -8, conflict: -80 } };
    plan.summary = `智能站位：移动${plan.moves.length}只，预计有效伤害${plan.effectiveDamage}，Boss伤害${plan.bossDamage}，预估击杀${plan.kills}。`;
    return plan;
  }

  return {
    // enemy AI (delegated)
    targetCellsForSlotFrom: enemyAi.targetCellsForSlotFrom,
    firstLineDirection: enemyAi.firstLineDirection,
    pathToward: enemyAi.pathToward,
    chooseEnemyAttackPlan: enemyAi.chooseEnemyAttackPlan,
    computeMonsterIntent: enemyAi.computeMonsterIntent,
    // threat/risk (delegated)
    buildThreatGrid: threat.buildThreatGrid,
    buildTeamRiskGrid: threat.buildTeamRiskGrid,
    buildMoveRiskGrid: threat.buildMoveRiskGrid,
    // player planning (own)
    positionKey, cloneElementsFromCell,
    actionCandidateScore, generateActorCandidates, evaluateTeamChoices,
    buildPlayerAutoPlan, buildPlayerPositionPlan
  };
}

module.exports = { createPlanningModule };
