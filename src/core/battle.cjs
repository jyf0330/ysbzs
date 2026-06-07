const { pushEvent } = require('./events.cjs');
const { ensureBoard, getCell, syncBoardUnits, normalizePosition, makeUnit, positionFromWaveRule, BOARD_ROWS, BOARD_COLS, ELEMENTS, makeEmptyElements, makeEmptyElementCamps, makeEmptyTerrain } = require('./state.cjs');
const mech = require('./mechanics.cjs');
const { ACTIVE_ELEMENTS, fireDamage, explodeIfEnemyOnFire } = require('./elements.cjs');

function clone(value) { return JSON.parse(JSON.stringify(value)); }
function living(state, side) { return state.units.filter(u => u.side === side && u.alive && u.hp > 0); }
function leaders(state) { return state.leaders ? [state.leaders.player, state.leaders.enemy].filter(Boolean) : []; }
function livingLeader(state, camp) {
  const leader = state.leaders && state.leaders[camp];
  return leader && leader.alive !== false && leader.hp > 0 ? leader : null;
}
function getUnit(state, unitId) {
  return state.units.find(u => u.id === unitId || u.petId === unitId)
    || leaders(state).find(l => l.id === unitId)
    || null;
}
function waveRows(state, round = state.round) { return state.data.waves.filter(w => w.day === state.day && w.period === state.period && w.round === round); }
function sign(n) { return n === 0 ? 0 : n > 0 ? 1 : -1; }
function dirDelta(dir = 'right') {
  const d = String(dir || 'right').toLowerCase();
  if (['up', 'u', '↑', 'north', '上'].includes(d)) return { dr: -1, dc: 0 };
  if (['down', 'd', '↓', 'south', '下'].includes(d)) return { dr: 1, dc: 0 };
  if (['left', 'l', '←', 'west', '左'].includes(d)) return { dr: 0, dc: -1 };
  return { dr: 0, dc: 1 };
}
function inBoard(pos) { return pos && pos.r >= 0 && pos.c >= 0 && pos.r < BOARD_ROWS && pos.c < BOARD_COLS; }
function dist(a, b) { return Math.abs(a.r - b.r) + Math.abs(a.c - b.c); }

function defaultFactionRules() {
  return {
    player: { leaderType: 'hero', moveMode: 'infinite', terrainFormThreshold: 3, explosionThreshold: 3, showElementGeneration: true },
    enemy: { leaderType: 'boss', moveMode: 'stat_ap', terrainFormThreshold: 99, explosionThreshold: 99, showElementGeneration: false }
  };
}
function factionRules(state, camp) {
  const rules = state.factionRules || defaultFactionRules();
  return (rules && rules[camp]) || defaultFactionRules()[camp] || defaultFactionRules().player;
}
function unitCamp(unit) { return unit?.camp || (unit?.side === 'hero' ? 'player' : 'enemy'); }
function opposingCamp(camp) { return camp === 'player' ? 'enemy' : 'player'; }
function sideForCamp(camp) { return camp === 'player' ? 'hero' : 'enemy'; }
function hasInfiniteMove(state, unit) { return factionRules(state, unitCamp(unit)).moveMode === 'infinite'; }
function boardUnitAt(state, pos) {
  return (state.units || []).find(u => u.alive && u.position && u.position.r === pos.r && u.position.c === pos.c)
    || leaders(state).find(l => l.alive !== false && l.hp > 0 && l.position && l.position.r === pos.r && l.position.c === pos.c)
    || null;
}
function canStandAt(state, actor, pos) {
  if (!inBoard(pos)) return false;
  const occ = boardUnitAt(state, pos);
  return !occ || occ.id === actor.id;
}
function allStandCells(state, actor) {
  const out = [];
  for (let r = 0; r < BOARD_ROWS; r++) for (let c = 0; c < BOARD_COLS; c++) {
    const p = { r, c };
    if (canStandAt(state, actor, p)) out.push(p);
  }
  return out;
}
function actionDirs() { return ['right', 'left', 'up', 'down']; }
function effectiveDamageFromLayers(layers, target) {
  return Math.max(0, Number(layers || 0));
}
function combatTargets(state, camp) {
  const side = sideForCamp(camp);
  const out = living(state, side).slice();
  const leader = livingLeader(state, camp);
  if (leader) out.push(leader);
  return out;
}
function ensureElements(obj) {
  if (!obj.elements) obj.elements = makeEmptyElements();
  for (const el of ELEMENTS) if (typeof obj.elements[el] !== 'number') obj.elements[el] = 0;
  return obj.elements;
}
function ensureTerrain(cell) {
  if (!cell.terrain || !Array.isArray(cell.terrain.modules)) cell.terrain = makeEmptyTerrain();
  return cell.terrain;
}
function ensureElementCamps(cell) {
  if (!cell.elementCamps) cell.elementCamps = makeEmptyElementCamps();
  for (const el of ELEMENTS) if (typeof cell.elementCamps[el] === 'undefined') cell.elementCamps[el] = null;
  return cell.elementCamps;
}
function terrainModules(cell) {
  return ensureTerrain(cell).modules;
}
function hasTerrain(cell) {
  return terrainModules(cell).length > 0;
}
function clearCellElements(cell) {
  const camps = ensureElementCamps(cell);
  for (const el of ELEMENTS) {
    cell.elements[el] = 0;
    camps[el] = null;
  }
}
function weakenUnformedElements(state, cell, amount = 1, source = 'attack') {
  if (!cell || hasTerrain(cell)) return false;
  let changed = false;
  for (const el of ELEMENTS) {
    const before = cell.elements?.[el] || 0;
    if (before > 0) {
      cell.elements[el] = Math.max(0, before - amount);
      if (cell.elements[el] === 0) ensureElementCamps(cell)[el] = null;
      changed = true;
    }
  }
  if (changed) pushEvent(state, 'ELEMENT_WEAKEN', { r: cell.r, c: cell.c, amount, source, text: `${source}打散 R${cell.r}C${cell.c} 未成型元素：所有元素-${amount}。` });
  return changed;
}
function addTerrainModule(state, cell, element, layers, actor, source = 'element_form') {
  const amount = Math.max(1, Number(layers || 1));
  const terrain = ensureTerrain(cell);
  terrain.modules.push({
    element,
    layers: amount,
    camp: unitCamp(actor),
    source,
    damage: amount
  });
  clearCellElements(cell);
  pushEvent(state, 'TERRAIN_MODULE_ADD', { r: cell.r, c: cell.c, element, layers: amount, source, text: `R${cell.r}C${cell.c} 生成${element}地形模块 ${amount}层。` });
  return terrain;
}
function maybeFormTerrain(state, cell, actor) {
  if (!cell || hasTerrain(cell)) return false;
  const threshold = Number(factionRules(state, unitCamp(actor)).terrainFormThreshold || 3);
  for (const el of ELEMENTS) {
    const layers = cell.elements?.[el] || 0;
    if (layers >= threshold) {
      addTerrainModule(state, cell, el, layers, actor, 'threshold_form');
      return true;
    }
  }
  return false;
}
function addElementToCell(state, actor, cell, element, layers, source = 'element_apply') {
  if (!cell) return { kind: 'blocked' };
  ensureTerrain(cell);
  if (hasTerrain(cell)) {
    addTerrainModule(state, cell, element, layers, actor, 'hit_formed_terrain');
    return { kind: 'terrain_module' };
  }
  const before = cell.elements[element] || 0;
  cell.elements[element] = before + layers;
  ensureElementCamps(cell)[element] = unitCamp(actor);
  pushEvent(state, 'APPLY_ELEMENT_CELL', { actorId: actor.id, r: cell.r, c: cell.c, element, layers, from: before, to: cell.elements[element], text: `${actor.displayName || actor.name} 向 R${cell.r}C${cell.c} 施加${element}${layers}层，${element}层 ${before}→${cell.elements[element]}。` });
  if (maybeFormTerrain(state, cell, actor)) return { kind: 'formed_terrain' };
  return { kind: 'element', from: before, to: cell.elements[element] };
}
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
  const standCells = hasInfiniteMove(state, actor) ? allStandCells(state, actor) : allStandCells(state, actor).filter(p => dist(start, p) <= Number(actor.ap || 0));
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
function slotsForUnit(state, unit) {
  const shape = unit.shape || {};
  const elements = (shape.slotElements && shape.slotElements.length ? shape.slotElements : [unit.element, unit.element, unit.element]).slice(0, shape.slotCount || 3);
  return elements.map((element, i) => {
    const slotId = `${unit.id}:slot${i}`;
    return { slotId, index: i, label: `第${i + 1}槽`, element, layers: Number(shape.baseLayers || 1), shapeId: shape.shapeId || null, shapeName: shape.shapeName || '单点', hitCells: Number(shape.hitCells || 1), direction: state.actionDirs[slotId] || state.actionDirs[i] || state.selected?.direction || 'right', used: !!unit.actionSlotsUsed?.[i], canUse: !unit.actionSlotsUsed?.[i] && unit.alive && unit.side === 'hero' && state.phase === 'player_turn' };
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
function spawnWave(state) {
  const rows = waveRows(state);
  let spawned = 0;
  for (const row of rows) {
    for (let i = 0; i < row.count; i++) {
      const position = positionFromWaveRule(state, row.positionRule, i + spawned);
      const unit = makeUnit(state, 'enemy', row.petId, { hp: row.hp, atk: row.atk, def: row.def, shield: row.shield, ap: row.ap, position });
      state.units.push(unit);
      mech.applyBattleStart(state, unit);
      spawned++;
      pushEvent(state, 'SPAWN_ENEMY', { unitId: unit.id, petId: row.petId, name: unit.name, hp: unit.hp, atk: unit.atk, position, text: `敌方Boss召唤 ${unit.displayName} HP${unit.hp}/攻${unit.atk}，位置 R${position.r}C${position.c}。` });
    }
  }
  syncDerivedBoard(state);
  return spawned;
}
function chooseTargets(state, actor) {
  const enemies = living(state, 'enemy');
  if (!enemies.length) return [];
  const shape = actor.shape || { hitCells: 1 };
  const n = Math.max(1, Number(shape.hitCells || 1));
  return enemies.slice(0, n);
}
function applyElement(state, actor, target, element, layers, ctx = {}) {
  ensureElements(target);
  if (target.position) {
    const cell = getCell(state, target.position.r, target.position.c);
    if (cell) weakenUnformedElements(state, cell, 1, actor.displayName || actor.name);
  }
  const before = target.elements[element] || 0;
  target.elements[element] = before + layers;
  if (target.position) {
    const cell = getCell(state, target.position.r, target.position.c);
    if (cell) {
      ensureTerrain(cell);
      if (hasTerrain(cell)) {
        addTerrainModule(state, cell, element, layers, actor, 'hit_formed_terrain');
      } else {
        cell.elements[element] = target.elements[element];
        ensureElementCamps(cell)[element] = unitCamp(actor);
        maybeFormTerrain(state, cell, actor);
      }
    }
  }
  pushEvent(state, 'APPLY_ELEMENT', { actorId: actor.id, targetId: target.id, element, layers, from: before, to: target.elements[element], text: `${actor.displayName || actor.name} 给 ${target.displayName || target.name} 叠${element}${layers}层，${element}层 ${before}→${target.elements[element]}。` });
  mech.afterElementApply(state, actor, target, element, layers);
}
function applyElementToCell(state, actor, cell, element, layers) {
  weakenUnformedElements(state, cell, 1, actor.displayName || actor.name);
  return addElementToCell(state, actor, cell, element, layers);
}
function triggerTerrainOnEnter(state, unit, cell) {
  if (!unit || !cell || !hasTerrain(cell)) return false;
  let triggered = false;
  for (const mod of terrainModules(cell)) {
    if (!mod || mod.camp === unitCamp(unit)) continue;
    const damage = Math.max(0, Number(mod.damage ?? mod.layers ?? 0));
    const apDelta = Number(mod.apDelta ?? (mod.element === '风' ? -Number(mod.layers || 1) : 0));
    const apFrom = unit.ap;
    if (apDelta) unit.ap = Math.max(0, Number(unit.ap || 0) + apDelta);
    pushEvent(state, 'TERRAIN_TRIGGER', { unitId: unit.id, r: cell.r, c: cell.c, element: mod.element, layers: mod.layers, damage, apFrom, apTo: unit.ap, text: `${unit.displayName || unit.name} 踩入 R${cell.r}C${cell.c}，触发${mod.element}地形：伤害${damage}${apDelta ? `，AP${apFrom}→${unit.ap}` : ''}。` });
    if (damage > 0) damageUnit(state, null, unit, damage, { element: mod.element, terrain: true });
    triggered = true;
    if (!unit.alive || unit.hp <= 0) break;
  }
  return triggered;
}
function startBattle(state) {
  state.phase = 'player_turn';
  state.round = 1;
  state.result = null;
  for (const u of state.units) u.actionSlotsUsed = {};
  pushEvent(state, 'BATTLE_START', { day: state.day, period: state.period, text: `第${state.day}天${state.period}战斗开始。进入玩家回合。` });
  pushEvent(state, 'ROUND_START', { text: `第${state.day}天${state.period}第${state.round}回合开始。` });
  for (const u of state.units) if (u.alive) mech.applyRoundStart(state, u);
  spawnWave(state);
  return true;
}
function startNextRound(state) {
  if (state.phase === 'init') return startBattle(state);
  state.round += 1;
  state.phase = 'player_turn';
  for (const u of state.units) if (u.alive) { u.actionSlotsUsed = {}; mech.applyRoundStart(state, u); }
  pushEvent(state, 'ROUND_START', { text: `第${state.day}天${state.period}第${state.round}回合开始。` });
  spawnWave(state);
  return true;
}
function moveHero(state, unitId, to) {
  if (state.phase === 'init') startBattle(state);
  const unit = getUnit(state, unitId || state.selected?.unitId) || living(state, 'hero')[0];
  if (!unit || unit.side !== 'hero') { pushEvent(state, 'MOVE_HERO_BLOCKED', { text: '移动失败：未选择我方单位。' }); return false; }
  const target = normalizePosition(to || state.selected?.cell || unit.position);
  if (!inBoard(target)) { pushEvent(state, 'MOVE_HERO_BLOCKED', { unitId: unit.id, text: `移动失败：R${target.r}C${target.c} 超出棋盘。` }); return false; }
  const cell = getCell(state, target.r, target.c);
  if (cell && cell.unitId && cell.unitId !== unit.id) { pushEvent(state, 'MOVE_HERO_BLOCKED', { unitId: unit.id, text: `移动失败：R${target.r}C${target.c} 已被占用。` }); return false; }
  const from = clone(unit.position || { r: 0, c: 0 });
  // 攻击后锁定位置：如果 hasAttacked 为 true，禁止再次移动
  if (unit.hasAttacked) {
    pushEvent(state, 'MOVE_HERO_BLOCKED', { unitId: unit.id, text: `移动失败：${unit.displayName} 本回合已攻击，位置锁定。` });
    return false;
  }
  const d = dist(from, target);
  if (!hasInfiniteMove(state, unit) && d > Number(unit.ap || 3)) { pushEvent(state, 'MOVE_HERO_BLOCKED', { unitId: unit.id, from, to: target, text: `移动失败：${unit.name} AP${unit.ap}，距离${d}。` }); return false; }
  unit.position = target;
  state.selected.unitId = unit.id;
  state.selected.cell = target;
  pushEvent(state, 'MOVE_HERO', { unitId: unit.id, from, to: target, text: `${unit.displayName} 移动：R${from.r}C${from.c}→R${target.r}C${target.c}。` });
  syncDerivedBoard(state);
  return true;
}
function setActionDirection(state, unitId, slotId, dir) {
  const unit = getUnit(state, unitId || state.selected?.unitId) || living(state, 'hero')[0];
  const idx = parseSlotIndex(slotId ?? state.selected?.slotId ?? 0);
  const key = unit ? `${unit.id}:slot${idx}` : String(idx);
  state.actionDirs[key] = dir || 'right';
  state.selected.unitId = unit?.id || state.selected.unitId;
  state.selected.slotId = idx;
  state.selected.direction = dir || 'right';
  pushEvent(state, 'SET_ACTION_DIRECTION', { unitId: unit?.id, slotId: idx, dir: dir || 'right', text: `${unit?.displayName || '单位'} 第${idx + 1}槽方向设为 ${dir || 'right'}。` });
  syncDerivedBoard(state);
  return true;
}
function useActionSlot(state, unitId, slotId, targetCell = null) {
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
  const targets = targetsAtCells(state, cells, targetCamp);
  pushEvent(state, 'PLAYER_SELECT_SLOT', { actorId: actor.id, slot: idx + 1, shapeId: slot.shapeId, shapeName: slot.shapeName, element: slot.element, cells, text: `玩家施放 ${actor.displayName} 第${idx + 1}槽：${slot.shapeName}/${slot.element}/${slot.layers}层，命中 ${targets.length ? targets.map(t => t.displayName).join('、') : cells.map(p => `R${p.r}C${p.c}`).join('、')}。` });
  if (targets.length) for (const t of targets) applyElement(state, actor, t, slot.element, slot.layers, { slot });
  else for (const p of cells) { const cell = getCell(state, p.r, p.c); if (cell) applyElementToCell(state, actor, cell, slot.element, slot.layers); }
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
  actor.hasAttacked = true;  // 攻击后锁定位置
  state.selected.unitId = actor.id;
  state.selected.slotId = idx;
  syncDerivedBoard(state);
  return true;
}
function runPlayerTurn(state) {
  state.phase = 'player_turn';
  pushEvent(state, 'PLAYER_TURN_START', { text: `玩家行动开始：${living(state, 'hero').map(x => x.name).join('、')}。` });
  const plan = buildPlayerAutoPlan(state);
  pushEvent(state, 'PLAYER_AUTO_PLAN', { plan, text: plan.summary });
  for (const m of plan.moves) {
    const actor = getUnit(state, m.unitId);
    if (!actor || !actor.alive) continue;
    const from = clone(actor.position || { r: 0, c: 0 });
    actor.position = normalizePosition(m.to);
    pushEvent(state, 'MOVE_HERO', { unitId: actor.id, from, to: actor.position, reason: m.reason, text: `${actor.displayName} 移动：R${from.r}C${from.c}→R${actor.position.r}C${actor.position.c}（${m.reason}）。` });
  }
  for (const a of plan.actions) {
    const actor = getUnit(state, a.unitId);
    if (!actor || !actor.alive) continue;
    const slots = slotsForUnit(state, actor);
    const slot = slots.find(x => x.index === a.slotIndex) || slots[0];
    if (!slot || actor.actionSlotsUsed?.[slot.index]) continue;
    const key = `${actor.id}:slot${slot.index}`;
    state.actionDirs[key] = a.dir || slot.direction || 'right';
    const cells = targetCellsForSlot(state, actor, Object.assign({}, slot, { direction: state.actionDirs[key] }), null);
    const targets = targetsAtCells(state, cells, 'enemy');
    pushEvent(state, 'PLAYER_SELECT_SLOT', { actorId: actor.id, slot: slot.index + 1, shapeId: slot.shapeId, shapeName: slot.shapeName, element: slot.element, cells, score: a.score, effective: a.effective, overflow: a.overflow, text: `玩家选择 ${actor.name} 第${slot.index + 1}槽：${slot.shapeName} / ${slot.element} / ${state.actionDirs[key]}，命中 ${targets.length ? targets.map(t => t.name).join('、') : cells.map(p => `R${p.r}C${p.c}`).join('、')}，有效${a.effective || 0}/溢出${a.overflow || 0}。` });
    if (targets.length) for (const t of targets) applyElement(state, actor, t, slot.element, slot.layers, { slot });
    else for (const p of cells) { const cell = getCell(state, p.r, p.c); if (cell) applyElementToCell(state, actor, cell, slot.element, slot.layers); }
    actor.actionSlotsUsed = actor.actionSlotsUsed || {};
    actor.actionSlotsUsed[slot.index] = true;
    actor.hasAttacked = true;
  }
  return endPlayerTurn(state, { auto: true, skipMonster: true });
}
function damageUnit(state, source, target, amount, ctx = {}) {
  if (!target || target.alive === false || target.hp <= 0 || amount <= 0) return 0;
  ensureElements(target);
  const calc = mech.beforeDamage(state, target, source, amount, ctx);
  let final = Math.max(0, calc.damage - (target.def || 0));
  const shieldBefore = target.shield;
  const hpBefore = target.hp;
  const shieldAbsorb = Math.min(target.shield, final);
  target.shield -= shieldAbsorb;
  final -= shieldAbsorb;
  if (final > 0) { target.hp = Math.max(0, target.hp - final); target.roundDamageTaken = (target.roundDamageTaken || 0) + final; }
  pushEvent(state, 'DAMAGE', { sourceId: source?.id, targetId: target.id, element: ctx.element, raw: amount, final: shieldAbsorb + final, shieldFrom: shieldBefore, shieldTo: target.shield, hpFrom: hpBefore, hpTo: target.hp, logs: calc.logs, text: `${source?.displayName || source?.name || '系统'} 对 ${target.displayName || target.name} 造成${ctx.element || ''}伤害：原始${amount}→有效${shieldAbsorb + final}，盾${shieldBefore}→${target.shield}，HP${hpBefore}→${target.hp}。` });
  if (hpBefore !== target.hp) mech.afterDamage(state, target, source, final);
  if (source && shieldAbsorb + final > 0) mech.afterHit(state, target, source, shieldAbsorb + final);
  if (target.hp <= 0 && target.alive) {
    target.alive = false;
    pushEvent(state, 'UNIT_DEAD', { unitId: target.id, name: target.name, text: `${target.displayName || target.name} HP${hpBefore}→0，死亡。` });
    mech.onDeath(state, target, source);
    if (target.id === state.leaders?.enemy?.id) finishBattle(state, true);
    if (target.id === state.leaders?.player?.id) finishBattle(state, false);
  }
  syncDerivedBoard(state);
  return shieldAbsorb + final;
}
function settleElements(state) {
  // 新规则：火≥3层 → 引爆 Σ(1..N) → 清零；空格火≥3层保留为陷阱
  // 水/风不在此处统一结算（由领域/催化/聚合触发）
  for (const target of [...combatTargets(state, 'enemy'), ...combatTargets(state, 'player')]) {
    if (!target.alive || !target.position) continue;
    const cell = getCell(state, target.position.r, target.position.c);
    if (!cell) continue;
    const fireLayers = cell.elements.火 || 0;
    if (fireLayers < 3) continue;

    // 火引爆（敌方格/英雄格）
    const result = explodeIfEnemyOnFire(state, cell, 'system_settle');
    if (result) {
      pushEvent(state, 'ELEMENT_SETTLE', {
        targetId: target.id, element: '火', layers: result.layersBefore,
        damage: result.damage,
        text: `${target.displayName || target.name} 所在格火${result.layersBefore}层引爆，火爆伤害=${result.damage}。`
      });
      damageUnit(state, null, target, result.damage, { element: '火', sourceType: 'fire_explosion' });
      cell.elements.火 = 0;
    } else {
      // 空格火≥3层，不引爆，保留为爆火陷阱
      pushEvent(state, 'ELEMENT_SETTLE', {
        r: cell.r, c: cell.c, layers: fireLayers,
        text: `R${cell.r}C${cell.c} 火${fireLayers}层，形成空格爆火陷阱。`
      });
    }
    if (state.phase === 'battle_end') break;
  }
  syncDerivedBoard(state);
}
function runMonsterTurn(state) {
  state.phase = 'monster_turn';
  for (const u of state.units) u.roundDamageTaken = 0;
  let acted = 0;
  for (const unit of living(state, 'enemy')) {
    mech.applyRoundStart(state, unit);
    const intent = computeMonsterIntent(state, unit);
    if (!intent) break;
    pushEvent(state, 'MONSTER_INTENT', { unitId: unit.id, targetId: intent.targetId, path: intent.path, text: `${unit.displayName || unit.name} 锁定 ${intent.targetName}，路径 ${intent.path.map(p => `R${p.r}C${p.c}`).join('→') || '原地'}${intent.willAttack ? '，准备攻击。' : '。'}` });
    if (intent.path.length) {
      const from = clone(unit.position);
      const walked = [];
      for (const step of intent.path) {
        unit.position = normalizePosition(step);
        walked.push(clone(unit.position));
        const cell = getCell(state, unit.position.r, unit.position.c);
        triggerTerrainOnEnter(state, unit, cell);
        if (!unit.alive || unit.hp <= 0) break;
      }
      pushEvent(state, 'MONSTER_MOVE', { unitId: unit.id, from, to: clone(unit.position), path: walked, text: `${unit.displayName || unit.name} 移动：R${from.r}C${from.c}→R${unit.position.r}C${unit.position.c}。` });
    }
    if (!unit.alive || unit.hp <= 0) continue;
    const target = getUnit(state, intent.targetId);
    if (target && intent.attackCells && intent.attackCells.some(p => p.r === target.position.r && p.c === target.position.c)) {
      damageUnit(state, unit, target, unit.atk, { element: unit.element, attack: true, direction: intent.attackDirection });
      for (const p of intent.attackCells) {
        const cell = getCell(state, p.r, p.c);
        if (cell) addElementToCell(state, unit, cell, unit.element, 1, 'enemy_attack');
      }
      acted++;
    }
    if (state.phase === 'battle_end') break;
  }
  syncDerivedBoard(state);
  return acted;
}
function endPlayerTurn(state, opts = {}) {
  if (!['player_turn', 'player'].includes(state.phase) && !opts.force) { pushEvent(state, 'END_PLAYER_TURN_BLOCKED', { text: `当前阶段 ${state.phase} 不能结束玩家回合。` }); return false; }
  pushEvent(state, 'PLAYER_TURN_END', { text: '玩家点击结束行动，进入元素统一结算。' });
  settleElements(state);
  if (state.phase === 'battle_end') return true;
  if (livingLeader(state, 'enemy') === null) return finishBattle(state, true);
  if (!living(state, 'enemy').length) {
    state.phase = 'round_end';
    pushEvent(state, 'ROUND_CLEAR', { text: `第${state.round}回合怪物清空。` });
    return true;
  }
  if (!opts.skipMonster) runMonsterTurn(state);
  if (state.phase === 'battle_end') return true;
  if (!living(state, 'hero').length || livingLeader(state, 'player') === null) return finishBattle(state, false);
  state.phase = 'round_end';
  return true;
}
function runRound(state) {
  if (state.phase === 'init' || state.round === 0) startBattle(state);
  else if (state.phase !== 'player_turn') startNextRound(state);
  runPlayerTurn(state);
  if (livingLeader(state, 'enemy') === null) return true;
  runMonsterTurn(state);
  return false;
}
function finishBattle(state, win) {
  if (state.phase === 'battle_end' && state.result) return state.result;
  const result = { win, code: win ? (state.round <= 5 ? 'WIN_FAST' : 'WIN') : 'LOSE', grade: win ? (state.round <= 5 ? 'S' : 'A') : 'D', gold: win ? (state.round <= 5 ? 6 : 4) : 1 };
  mech.battleEndMechanics(state, result);
  if (!win) { state.castleLine -= 1; state.economyMultiplier *= 0.9; pushEvent(state, 'BATTLE_FAIL_PENALTY', { text: '战斗失败：我方英雄防线-1，经济倍率x0.9。' }); }
  state.gold += result.gold;
  state.result = result;
  state.phase = 'battle_end';
  pushEvent(state, 'BATTLE_END', { result: result.code, grade: result.grade, gold: result.gold, text: `战斗结束：${result.code}，评级${result.grade}，金币+${result.gold}。` });
  state.battleTrace = state.events.filter(e => /BATTLE|ROUND|PLAYER|MONSTER|DAMAGE|ELEMENT|SPAWN|MOVE|DEAD/.test(e.type)).map(e => clone(e));
  return result;
}
function runBattle(state) {
  if (state.phase !== 'init') {
    // 自动战斗从当前状态继续，不清空玩家已做的细颗粒操作。
    if (state.phase === 'player_turn') endPlayerTurn(state);
  }
  if (state.round === 0 || state.phase === 'init') startBattle(state);
  let cleared = livingLeader(state, 'enemy') === null;
  while (state.round <= state.maxRounds) {
    if (state.phase !== 'player_turn') startNextRound(state);
    runPlayerTurn(state);
    if (state.phase === 'battle_end') return state.result;
    if (livingLeader(state, 'enemy') === null) { cleared = true; break; }
    runMonsterTurn(state);
    if (state.phase === 'battle_end') return state.result;
    if (!living(state, 'hero').length || livingLeader(state, 'player') === null) { cleared = false; break; }
    if (state.round >= state.maxRounds) break;
    state.phase = 'round_end';
  }
  return finishBattle(state, cleared);
}
module.exports = { living, getUnit, waveRows, spawnWave, runPlayerTurn, runMonsterTurn, runBattle, damageUnit, settleElements, startBattle, startNextRound, endPlayerTurn, moveHero, setActionDirection, useActionSlot, buildPreviewGrid, buildThreatGrid, getCellDetail, syncDerivedBoard, slotsForUnit, computeMonsterIntent, finishBattle, buildPlayerAutoPlan, factionRules };
