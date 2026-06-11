const { pushEvent } = require('./events.cjs');
const { buildWaveSpawnEntries } = require('./waveSpawn.cjs');
const { ensureBoard, getCell, syncBoardUnits, normalizePosition, makeUnit, positionFromWaveRule, BOARD_ROWS, BOARD_COLS, ELEMENTS, makeEmptyElements, makeEmptyElementCamps, makeEmptyTerrain } = require('./state.cjs');
const mech = require('./mechanics.cjs');
const elementRules = require('./elements.cjs');
const { ACTIVE_ELEMENTS, fireDamage, explodeIfEnemyOnFire } = elementRules;

const { createPositionModule } = require('./battle/position.cjs');
const { createActionsModule } = require('./battle/actions.cjs');
const { createPlanningModule } = require('./battle/planning.cjs');
const { createPreviewModule } = require('./battle/preview.cjs');
const { createResolutionModule } = require('./battle/resolution.cjs');

let boardUnitAt, canStandAt, allStandCells, moveHero, moveUnitGeneral;
let slotsForUnit, parseSlotIndex, targetCellsForSlot, targetsAtCells, unitsAtCells, setActionDirection, useActionSlot;
let targetCellsForSlotFrom, firstLineDirection, pathToward, chooseEnemyAttackPlan, positionKey, cloneElementsFromCell, actionCandidateScore, generateActorCandidates, evaluateTeamChoices, buildPlayerAutoPlan, computeMonsterIntent, buildThreatGrid;
let buildPreviewGrid, clearPreviewAndThreat, syncDerivedBoard, getCellDetail;
let applyElement, applyElementToCell, triggerTerrainOnEnter, damageUnit, settleElements;

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
    player: { leaderType: 'hero', terrainFormThreshold: 3, explosionThreshold: 3, showElementGeneration: true },
    enemy: { leaderType: 'boss', terrainFormThreshold: 99, explosionThreshold: 99, showElementGeneration: false }
  };
}
function factionRules(state, camp) {
  const rules = state.factionRules || defaultFactionRules();
  return (rules && rules[camp]) || defaultFactionRules()[camp] || defaultFactionRules().player;
}
function unitCamp(unit) { return unit?.camp || (unit?.side === 'hero' ? 'player' : 'enemy'); }
function opposingCamp(camp) { return camp === 'player' ? 'enemy' : 'player'; }
function sideForCamp(camp) { return camp === 'player' ? 'hero' : 'enemy'; }
function boardMaxDistance(state) {
  const rows = Number(state.board?.rows || BOARD_ROWS);
  const cols = Number(state.board?.cols || BOARD_COLS);
  return Math.max(0, rows - 1) + Math.max(0, cols - 1);
}
function effectiveMoveRange(state, unit) {
  if (!unit) return 0;
  const own = unit.moveRange ?? unit.moveAp;
  if (own !== undefined && own !== null && own !== '') return Math.max(0, Number(own));
  const rules = factionRules(state, unitCamp(unit));
  if (rules.moveRange !== undefined && rules.moveRange !== null && rules.moveRange !== '') return Math.max(0, Number(rules.moveRange));
  return Math.max(0, Number(unit.ap || 0));
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
  cell.elementPackets = [];
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
  // 兼容旧 terrain 模块，但不再清空元素包/聚合元素；元素包是事实来源，地形模块只是派生状态。
  pushEvent(state, 'TERRAIN_MODULE_ADD', { r: cell.r, c: cell.c, element, layers: amount, source, text: `R${cell.r}C${cell.c} 生成${element}地形模块 ${amount}层。` });
  return terrain;
}
function maybeFormTerrain(state, cell, actor) {
  if (!cell || hasTerrain(cell)) return false;
  const threshold = Number(factionRules(state, unitCamp(actor)).terrainFormThreshold || 3);
  for (const el of ELEMENTS) {
    const layers = cell.elements?.[el] || 0;
    if (layers >= threshold) {
      cell.elementStates = cell.elementStates || {};
      cell.elementStates[el] = {
        formed: true,
        trap: el === '火',
        threshold,
        layers,
        source: 'threshold_form',
        updatedRound: state.round || 0
      };
      addTerrainModule(state, cell, el, layers, actor, 'threshold_form');
      pushEvent(state, 'ELEMENT_FORMED', { r: cell.r, c: cell.c, element: el, layers, threshold, text: `R${cell.r}C${cell.c} ${el}${layers}层达到${threshold}层，形成${el === '火' ? '爆火陷阱候选' : '元素成型状态'}；元素包与来源保留。` });
      return true;
    }
  }
  return false;
}
function addElementToCell(state, actor, cell, element, layers, source = 'element_apply') {
  if (!cell) return { kind: 'blocked' };
  ensureTerrain(cell);
  const before = cell.elements[element] || 0;
  const wasTerrain = hasTerrain(cell);
  const result = elementRules.addElementToCell(state, actor, cell, element, layers, source, { tags: [source] });
  ensureElementCamps(cell)[element] = unitCamp(actor);
  if (wasTerrain) addTerrainModule(state, cell, element, result.layers || layers, actor, 'hit_formed_terrain');
  pushEvent(state, 'APPLY_ELEMENT_CELL', { actorId: actor.id, r: cell.r, c: cell.c, element, layers: result.layers || layers, from: before, to: cell.elements[element], packetId: result.packet && result.packet.packetId, text: `${actor.displayName || actor.name} 向 R${cell.r}C${cell.c} 施加${element}${result.layers || layers}层，${element}层 ${before}→${cell.elements[element]}。` });
  if (!wasTerrain && maybeFormTerrain(state, cell, actor)) return { kind: 'formed_terrain', from: before, to: cell.elements[element], packetId: result.packet && result.packet.packetId };
  return { kind: wasTerrain ? 'terrain_module_and_packet' : 'element', from: before, to: cell.elements[element], packetId: result.packet && result.packet.packetId, layers: result.layers || layers };
}
function spawnWave(state) {
  const rows = waveRows(state);
  let spawned = 0;
  for (const row of rows) {
    const entries = buildWaveSpawnEntries(state, row);
    for (let i = 0; i < entries.length; i += 1) {
      const { petId, quality, override } = entries[i];
      const position = positionFromWaveRule(state, row.positionRule, i + spawned);
      const unit = makeUnit(state, 'enemy', petId, Object.assign({}, override, { position, flags: { waveId: row.waveId, petPoolExpression: row.petPoolExpression, qualityFromWave: quality || null } }));
      state.units.push(unit);
      mech.applyBattleStart(state, unit);
      spawned += 1;
      const qualityText = quality ? `${quality}` : (unit.quality || '');
      pushEvent(state, 'SPAWN_ENEMY', { unitId: unit.id, waveId: row.waveId, petId, petPool: row.petPool, petPoolExpression: row.petPoolExpression, quality: quality || unit.quality, name: unit.name, hp: unit.hp, atk: unit.atk, position, text: `敌方Boss召唤 ${unit.displayName}${qualityText ? `(${qualityText})` : ''} HP${unit.hp}/攻${unit.atk}，位置 R${position.r}C${position.c}。` });
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
function startBattle(state) {
  state.phase = 'player_turn';
  state.round = 1;
  state.result = null;
  for (const u of state.units) { u.actionSlotsUsed = {}; u.actionApSpent = 0; }
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
  for (const u of state.units) if (u.alive) { u.actionSlotsUsed = {}; u.actionApSpent = 0; mech.applyRoundStart(state, u); }
  pushEvent(state, 'ROUND_START', { text: `第${state.day}天${state.period}第${state.round}回合开始。` });
  spawnWave(state);
  return true;
}

/**
 * 通用移动函数（无阵营限制），供 trialEngine 编排使用。
 * 不检查 phase、moveRange、AP、occupancy——调用方负责。
 */

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
    actor.actionApSpent = Math.max(0, Number(actor.actionApSpent || 0)) + 1;
    actor.hasAttacked = true;
  }
  return endPlayerTurn(state, { auto: true, skipMonster: true });
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
  {
    const existingTrace = Array.isArray(state.battleTrace) ? state.battleTrace.slice() : [];
    const legacyTrace = state.events.filter(e => /BATTLE|ROUND|PLAYER|MONSTER|DAMAGE|ELEMENT|SPAWN|MOVE|DEAD/.test(e.type)).map(e => clone(e));
    const seen = new Set(existingTrace.map(e => e.eventId || `legacy_${e.step}_${e.type}`));
    state.battleTrace = existingTrace.concat(legacyTrace.filter(e => {
      const key = e.eventId || `legacy_${e.step}_${e.type}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    }));
  }
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

({ boardUnitAt, canStandAt, allStandCells, moveHero, moveUnitGeneral } = createPositionModule({
  clone,
  getUnit,
  leaders,
  living,
  pushEvent,
  normalizePosition,
  getCell,
  syncBoardUnits,
  BOARD_ROWS,
  BOARD_COLS,
  inBoard,
  dist,
  effectiveMoveRange,
  syncDerivedBoard: (...args) => syncDerivedBoard(...args),
  startBattle: (...args) => startBattle(...args)
}));

({ applyElement, applyElementToCell, triggerTerrainOnEnter, damageUnit, settleElements } = createResolutionModule({
  pushEvent,
  mech,
  elementRules,
  fireDamage,
  explodeIfEnemyOnFire,
  clone,
  getCell,
  combatTargets,
  unitCamp,
  terrainModules,
  hasTerrain,
  ensureElements,
  weakenUnformedElements,
  addElementToCell,
  livingLeader,
  finishBattle: (...args) => finishBattle(...args),
  syncDerivedBoard: (...args) => syncDerivedBoard(...args)
}));


({ slotsForUnit, parseSlotIndex, targetCellsForSlot, targetsAtCells, unitsAtCells, setActionDirection, useActionSlot } = createActionsModule({
  pushEvent,
  mech,
  elementRules,
  explodeIfEnemyOnFire,
  clone,
  getUnit,
  leaders,
  living,
  opposingCamp,
  unitCamp,
  sideForCamp,
  actionDirs,
  dirDelta,
  inBoard,
  normalizePosition,
  getCell,
  combatTargets,
  applyElement: (...args) => applyElement(...args),
  applyElementToCell: (...args) => applyElementToCell(...args),
  damageUnit: (...args) => damageUnit(...args),
  syncDerivedBoard: (...args) => syncDerivedBoard(...args),
  startBattle: (...args) => startBattle(...args)
}));

({ targetCellsForSlotFrom, firstLineDirection, pathToward, chooseEnemyAttackPlan, positionKey, cloneElementsFromCell, actionCandidateScore, generateActorCandidates, evaluateTeamChoices, buildPlayerAutoPlan, computeMonsterIntent, buildThreatGrid } = createPlanningModule({
  ELEMENTS,
  makeEmptyElements,
  clone,
  getUnit,
  leaders,
  living,
  getCell,
  normalizePosition,
  BOARD_ROWS,
  BOARD_COLS,
  sign,
  dist,
  unitCamp,
  sideForCamp,
  factionRules,
  combatTargets,
  terrainModules,
  hasTerrain,
  effectiveDamageFromLayers,
  effectiveMoveRange,
  actionDirs,
  canStandAt: (...args) => canStandAt(...args),
  allStandCells: (...args) => allStandCells(...args),
  slotsForUnit: (...args) => slotsForUnit(...args),
  targetCellsForSlot: (...args) => targetCellsForSlot(...args),
  targetsAtCells: (...args) => targetsAtCells(...args)
}));

({ buildPreviewGrid, clearPreviewAndThreat, syncDerivedBoard, getCellDetail } = createPreviewModule({
  clone,
  getUnit,
  leaders,
  living,
  getCell,
  ensureBoard,
  syncBoardUnits,
  normalizePosition,
  unitCamp,
  makeEmptyElements,
  ensureElements,
  ensureTerrain,
  fireDamage,
  parseSlotIndex: (...args) => parseSlotIndex(...args),
  slotsForUnit: (...args) => slotsForUnit(...args),
  targetCellsForSlot: (...args) => targetCellsForSlot(...args),
  buildThreatGrid: (...args) => buildThreatGrid(...args)
}));

module.exports = { living, getUnit, waveRows, spawnWave, runPlayerTurn, runMonsterTurn, runBattle, damageUnit, settleElements, startBattle, startNextRound, endPlayerTurn, moveHero, moveUnitGeneral, setActionDirection, useActionSlot, buildPreviewGrid, buildThreatGrid, getCellDetail, syncDerivedBoard, slotsForUnit, computeMonsterIntent, finishBattle, buildPlayerAutoPlan, factionRules, effectiveMoveRange, boardMaxDistance };
