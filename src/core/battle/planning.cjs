// @ts-check

/**
 * @typedef {{r:number,c:number}} Position
 * @typedef {{id:string, side?:string, camp?:string, alive?:boolean, hp?:number, ap?:number, element?:string, position?:Position, actionSlotsUsed?:Record<string, boolean>}} BattleUnit
 * @typedef {{units?:BattleUnit[], leaders?:{player?:BattleUnit, enemy?:BattleUnit}, board?:{cells?:Array<Record<string, any>>}}} BattleState
 * @typedef {{from:Position,to:Position,path:Position[],dir:string,attackCells:Position[],willAttack:boolean}} EnemyAttackPlan
 */

/**
 * Build tactical planning, monster intent, threat-grid, and auto-plan helpers.
 *
 * @param {Record<string, any>} deps
 * @returns {Record<string, Function>}
 */
function createPlanningModule(deps) {
  const { ELEMENTS, makeEmptyElements, clone, getUnit, living, getCell, normalizePosition, BOARD_ROWS, BOARD_COLS, sign, dist, unitCamp, sideForCamp, factionRules, combatTargets, terrainModules, hasTerrain, effectiveDamageFromLayers, effectiveMoveRange, actionDirs, canStandAt, allStandCells, slotsForUnit, targetCellsForSlot, targetsAtCells, syncBoardUnits } = deps;
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

function positionKey(pos) { return `${pos.r},${pos.c}`; }

function cloneElementsFromCell(cell) { return Object.assign(makeEmptyElements(), cell?.elements || {}); }

function actionCandidateScore(state, actor, slot, cells, targets) {
  let effective = 0, raw = 0, kills = 0, bossDamage = 0, terrainValue = 0, weakenValue = 0;
  for (const t of targets) {
    const add = effectiveDamageFromLayers(slot.layers, t);
    raw += add;
    const eff = Math.min(Number(t.hp || 0), add);
    effective += eff;
    if (t.id === state.leaders?.enemy?.id) bossDamage += eff;
    if (eff >= Number(t.hp || 0)) kills++;
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
  return {
    effective,
    raw,
    overflow,
    kills,
    bossDamage,
    terrainValue,
    weakenValue,
    score: effective * 10 + kills * 30 + bossDamage * 8 + terrainValue * 2 + weakenValue * 3 - overflow * 3
  };
}

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
        const cells = targetCellsForSlotFrom(state, actor, slot, pos, dir);
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
          const remaining = Math.max(0, Number(target.hp || 0) - already);
          const raw = effectiveDamageFromLayers(action.layers, target);
          const eff = Math.min(remaining, raw);
          const over = Math.max(0, raw - eff);
          targetDamage.set(tid, already + raw);
          stats.effective += eff;
          stats.overflow += over;
          if (remaining > 0 && eff >= remaining) stats.kills += 1;
          if (tid === state.leaders?.enemy?.id) stats.bossDamage += eff;
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
  score += effectiveDamage * 10 + kills * 30 + bossDamage * 8 + terrainForms * 20 + terrainStacks * 6 + weakenBenefit * 3 - overflow * 4 - conflictPenalty * 80;
  return { score, effectiveDamage, overflow, kills, bossDamage, terrainForms, terrainStacks, weakenBenefit, conflictPenalty, actionStats };
}

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
  plan.sandbox = { beamWidth, evaluatedPlans, candidateCounts: candidateSets.map(x => x.candidates.length), scoring: { effectiveDamage: 10, kills: 30, bossDamage: 8, terrainForms: 20, terrainStacks: 6, weakenBenefit: 3, overflow: -4, conflict: -80 } };
  plan.summary = `全队沙盒规划：移动${plan.moves.length}步，施放${plan.actions.length}槽，有效伤害${plan.effectiveDamage}，Boss伤害${plan.bossDamage}，预估击杀${plan.kills}，地形成型${plan.terrainForms}，地形叠加${plan.terrainStacks}，削弱${plan.weakenBenefit}，溢出${plan.overflow}`;
  return plan;
}

function computeMonsterIntent(state, unit) {
  const targets = combatTargets(state, 'player');
  if (!targets.length) return null;
  let bestChoice = null;
  for (const target of targets) {
    const attackPlan = chooseEnemyAttackPlan(state, unit, target);
    const raw = Math.max(0, Number(unit.atk || 0) - Number(target.def || 0));
    const shieldAbsorb = Math.min(Number(target.shield || 0), raw);
    const hpDamage = Math.max(0, raw - shieldAbsorb);
    const effective = attackPlan.willAttack ? Math.min(Number(target.hp || 0), hpDamage) : 0;
    const kill = attackPlan.willAttack && effective >= Number(target.hp || 0);
    const leaderBonus = target.id === state.leaders?.player?.id ? 50 : 0;
    const score = attackPlan.willAttack
      ? effective * 10 + (kill ? 80 : 0) + leaderBonus - attackPlan.path.length * 0.2
      : -dist(attackPlan.to, normalizePosition(target.position || { r: 0, c: 0 }));
    if (!bestChoice || score > bestChoice.score) bestChoice = { target, attackPlan, score, expectedDamage: effective, kill };
  }
  if (!bestChoice) return null;
  const { target, attackPlan } = bestChoice;
  const pos = normalizePosition(unit.position || { r: 0, c: BOARD_COLS - 1 });
  return {
    unitId: unit.id,
    targetId: target.id,
    targetName: target.name,
    from: pos,
    path: attackPlan.path,
    attackCells: attackPlan.attackCells,
    attackDirection: attackPlan.dir,
    willAttack: attackPlan.willAttack,
    score: bestChoice.score,
    expectedDamage: bestChoice.expectedDamage,
    expectedKill: bestChoice.kill,
    damage: unit.atk
  };
}

function buildThreatGrid(state) {
  const grid = [];
  for (const enemy of living(state, 'enemy')) {
    const intent = computeMonsterIntent(state, enemy);
    if (!intent) continue;
    for (const p of intent.path) grid.push({ r: p.r, c: p.c, type: 'move_path', unitId: enemy.id, threat: 1 });
    for (const p of intent.attackCells) grid.push({ r: p.r, c: p.c, type: 'attack', unitId: enemy.id, targetId: intent.targetId, damage: intent.damage, threat: intent.damage });
  }
  return grid;
}

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
    if (!intent || !intent.willAttack || !byId.has(intent.targetId)) continue;
    const target = getUnit(state, intent.targetId);
    const risk = byId.get(intent.targetId);
    if (!target || !risk) continue;
    const raw = Math.max(0, Number(enemy.atk || 0) - Number(target.def || 0));
    const absorbed = Math.min(risk.shieldTo, raw);
    const dealtToHp = Math.min(risk.hpTo, Math.max(0, raw - absorbed));
    risk.shieldTo -= absorbed;
    risk.hpTo -= dealtToHp;
    risk.damage += raw;
    risk.shieldDamage += absorbed;
    risk.hpDamage += dealtToHp;
    risk.lethal = risk.hpTo <= 0;
    risk.enemyIds.push(enemy.id);
    risk.threats.push({
      enemyId: enemy.id,
      enemyName: enemy.displayName || enemy.name,
      damage: raw,
      shieldDamage: absorbed,
      hpDamage: dealtToHp,
      attackDirection: intent.attackDirection,
      attackCells: clone(intent.attackCells || []),
      path: clone(intent.path || [])
    });
  }
  return Array.from(byId.values())
    .filter(risk => risk.threats.length > 0)
    .sort((a, b) => a.r - b.r || a.c - b.c || String(a.unitId).localeCompare(String(b.unitId)));
}

function buildMoveRiskGrid(state, unitId) {
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
    const sandboxUnit = getUnit(sandbox, unit.id);
    if (!sandboxUnit) continue;
    sandboxUnit.position = { r: target.r, c: target.c };
    if (syncBoardUnits) syncBoardUnits(sandbox);
    const teamRiskGrid = buildTeamRiskGrid(sandbox, teamUnitIds);
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
      teamRiskGrid
    });
  }
  return out;
}

  return { targetCellsForSlotFrom, firstLineDirection, pathToward, chooseEnemyAttackPlan, positionKey, cloneElementsFromCell, actionCandidateScore, generateActorCandidates, evaluateTeamChoices, buildPlayerAutoPlan, computeMonsterIntent, buildThreatGrid, buildTeamRiskGrid, buildMoveRiskGrid };
}

module.exports = { createPlanningModule };
