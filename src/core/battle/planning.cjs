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
  const { ELEMENTS, makeEmptyElements, clone, getUnit, living, getCell, normalizePosition, BOARD_ROWS, BOARD_COLS, sign, dist, unitCamp, sideForCamp, factionRules, combatTargets, terrainModules, hasTerrain, effectiveDamageFromLayers, effectiveMoveRange, actionDirs, canStandAt, allStandCells, slotsForUnit, targetCellsForSlot, targetsAtCells, syncBoardUnits, buildPreviewGrid, useActionSlot } = deps;
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
    const sandboxUnit = getUnit(sandbox, unit.id);
    if (!sandboxUnit) continue;
    sandboxUnit.position = { r: target.r, c: target.c };
    sandbox.teamPlacementPreview = sandbox.teamPlacementPreview || { activeUnitId: null, movedUnitIds: [] };
    sandbox.teamPlacementPreview.activeUnitId = unit.id;
    sandbox.teamPlacementPreview.movedUnitIds = teamUnitIds.slice();
    if (syncBoardUnits) syncBoardUnits(sandbox);
    let sandboxActionOk = false;
    let sandboxBoardCells = [];
    let sandboxUnits = [];
    let sandboxEvents = [];
    let cellDiffs = [];
    let unitDiffs = [];
    let previewGrid = [];
    if (!opts.summaryOnly) {
      const beforeUnits = snapshotSandboxUnits(sandbox);
      const beforeCells = snapshotSandboxCells(sandbox);
      const eventStart = Array.isArray(sandbox.events) ? sandbox.events.length : 0;
      const canSimulateAction = sandbox.phase === 'player_turn';
      sandboxActionOk = canSimulateAction && useActionSlot ? !!useActionSlot(sandbox, unit.id, 0, null, { ap: 1 }) : false;
      if (syncBoardUnits) syncBoardUnits(sandbox);
      sandboxBoardCells = snapshotSandboxCells(sandbox);
      sandboxUnits = snapshotSandboxUnits(sandbox);
      sandboxEvents = Array.isArray(sandbox.events) ? clone(sandbox.events.slice(eventStart)) : [];
      cellDiffs = buildCellDiffs(beforeCells, sandboxBoardCells);
      unitDiffs = buildUnitDiffs(beforeUnits, sandboxUnits);
      previewGrid = buildPreviewGrid ? buildPreviewGrid(sandbox, { unitId: unit.id }) : [];
    }
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
      previewGrid,
      teamRiskGrid,
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

  return { targetCellsForSlotFrom, firstLineDirection, pathToward, chooseEnemyAttackPlan, positionKey, cloneElementsFromCell, actionCandidateScore, generateActorCandidates, evaluateTeamChoices, buildPlayerAutoPlan, computeMonsterIntent, buildThreatGrid, buildTeamRiskGrid, buildMoveRiskGrid };
}

module.exports = { createPlanningModule };
