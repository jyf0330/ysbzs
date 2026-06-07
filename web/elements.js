/**
 * Legacy element compatibility shell.
 * Element, terrain, trigger, and damage rules are owned by src/core/battle.cjs.
 * This file keeps old global names available without running a second rules engine.
 */
(function(ROOT){
  'use strict';
  const ELEMENTS = ['fire','water','wind','earth'];

  function defaultFactionRules() {
    return {
      player: { leaderType:'hero', moveMode:'infinite', terrainFormThreshold:3, explosionThreshold:3, showElementGeneration:true },
      enemy: { leaderType:'boss', moveMode:'stat_ap', terrainFormThreshold:99, explosionThreshold:99, showElementGeneration:false }
    };
  }
  function getFactionRule(side) {
    const rules = ROOT.G && ROOT.G.factionRules ? ROOT.G.factionRules : defaultFactionRules();
    return rules[side] || defaultFactionRules()[side] || defaultFactionRules().player;
  }
  function key(pos){ return pos ? `${pos.r},${pos.c}` : ''; }
  function vmCell(pos) {
    const cells = ROOT.G && ROOT.G.coreSnapshot && ROOT.G.coreSnapshot.viewModel && ROOT.G.coreSnapshot.viewModel.board && ROOT.G.coreSnapshot.viewModel.board.cells;
    return Array.isArray(cells) && pos ? cells.find(c => c.r === pos.r && c.c === pos.c) : null;
  }
  function ensureElementCellKey(k) {
    if (!ROOT.G) ROOT.G = {};
    if (!ROOT.G.elementCells) ROOT.G.elementCells = {};
    if (!ROOT.G.elementCells[k]) ROOT.G.elementCells[k] = {
      fire:{ layers:0, willExplode:false },
      water:{ layers:0, willExplode:false },
      wind:{ layers:0, willExplode:false },
      earth:{ layers:0, willExplode:false }
    };
    return ROOT.G.elementCells[k];
  }
  function ensureTerrainCellKey(k) {
    if (!ROOT.G) ROOT.G = {};
    if (!ROOT.G.terrainCells) ROOT.G.terrainCells = {};
    if (!ROOT.G.terrainCells[k]) ROOT.G.terrainCells[k] = { modules:[] };
    return ROOT.G.terrainCells[k];
  }
  function terrainAt(pos) {
    const cell = vmCell(pos);
    if (cell && cell.terrain && cell.terrain.modules && cell.terrain.modules.length) return cell.terrain;
    const tc = ROOT.G && ROOT.G.terrainCells && ROOT.G.terrainCells[key(pos)];
    return tc && tc.modules && tc.modules.length ? tc : null;
  }
  function topElementAt(pos) {
    const cell = vmCell(pos);
    if (cell && cell.elements) {
      for (const el of ['火','水','风','土']) if (Number(cell.elements[el] || 0) > 0) return { el, layers:cell.elements[el], pos };
    }
    const data = ROOT.G && ROOT.G.elementCells && ROOT.G.elementCells[key(pos)];
    if (!data) return null;
    for (const el of ELEMENTS) if (data[el] && data[el].layers > 0) return { el, layers:data[el].layers, pos };
    return null;
  }
  function hasTerrainAt(pos){ return !!terrainAt(pos); }
  function hasElementAt(pos){ return !!topElementAt(pos); }
  function clearUnformedElementsAt(pos){ if (ROOT.G && ROOT.G.elementCells) delete ROOT.G.elementCells[key(pos)]; return false; }
  function addTerrainModule(pos, el, layers, side, source){
    const tc = ensureTerrainCellKey(key(pos));
    tc.modules.push({ el, layers:Number(layers || 1), side:side || 'player', source:source || 'legacy_shell', damage:calcElementLayerDamage(layers || 1) });
    return tc;
  }
  function maybeFormTerrain(){ return false; }
  function applyElementLayersForSide(){ return { kind:'legacy_shell' }; }
  function weakenUnformedElementsAt(){ return false; }
  function triggerTerrainOnEnter(){ return false; }
  function addEl(){ return { kind:'legacy_shell' }; }
  function explDmg(stk){ return Number(stk || 0); }
  function calcElementLayerDamage(layers){ return Number(layers || 0); }
  function calcElementDamage(layers){ return { damage:Number(layers || 0), isAdv:false, multiplier:1, base:Number(layers || 0) }; }
  function explCells(){ return []; }
  function syncBoardElementFromElementCells(){ return false; }
  function clearElementAt(){ return false; }
  function addElementLayers(){ return { kind:'legacy_shell' }; }
  function doExplode(){ return false; }
  function recomputeGrowth(){ return ROOT.G && ROOT.G.growth || {}; }
  function calcHealAmount(){ return 0; }
  function calcHealAtkGain(){ return 0; }
  function getPassiveAura(){ return {}; }
  function getSpaceExplosionBonus(){ return 0; }
  function getHealAmpBonus(){ return 0; }
  function getCastleDamageReduce(){ return 0; }
  function hasCrossExplosion(){ return false; }
  function getAdvHitBonus(){ return 1; }
  function getOwnerDeathDrop(){ return null; }
  function chooseElementForSummon(){ return 'fire'; }
  function applySummonPassives(s){ return s; }
  function calcSproutSpawnParams(){ return {}; }
  function spawnSummon(){ return null; }
  function healSummon(){ return false; }
  function killSummon(){ return false; }
  function damageSummon(){ return false; }

  Object.assign(ROOT, {
    defaultFactionRules, getFactionRule, ensureElementCellKey, ensureTerrainCellKey,
    terrainAt, hasTerrainAt, clearUnformedElementsAt, addTerrainModule, maybeFormTerrain,
    applyElementLayersForSide, weakenUnformedElementsAt, triggerTerrainOnEnter, addEl,
    explDmg, calcElementLayerDamage, calcElementDamage, explCells, topElementAt,
    hasElementAt, syncBoardElementFromElementCells, clearElementAt, addElementLayers,
    doExplode, recomputeGrowth, calcHealAmount, calcHealAtkGain, getPassiveAura,
    getSpaceExplosionBonus, getHealAmpBonus, getCastleDamageReduce, hasCrossExplosion,
    getAdvHitBonus, getOwnerDeathDrop, chooseElementForSummon, applySummonPassives,
    calcSproutSpawnParams, spawnSummon, healSummon, killSummon, damageSummon
  });
})(window);
