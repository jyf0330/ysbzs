/**
 * Legacy battle compatibility shell.
 * Runtime battle truth lives in src/core and is reached through original-ui-compat-adapter.js.
 * These names remain only so old ui.js/game.js references do not create a second combat engine.
 */
(function(ROOT){
  'use strict';
  function adapter(){ return ROOT.__YSBZS__ || null; }
  function command(type, payload){
    const api = adapter();
    if (api && typeof api.command === 'function') return api.command(type, payload || {});
    return Promise.resolve({ ok:false, legacyShell:true, type });
  }
  function log(text){
    if (typeof ROOT.glog === 'function') {
      try { ROOT.glog(text); } catch (_) {}
    }
  }
  function emptyReport(){
    return { chainSegments:0, advHits:0, totalDamage:0, killedCount:0, clearedWave:false, perfect:false };
  }
  function emptyPlan(){
    return { canRun:false, moves:[], actions:[], score:0, effectiveDamage:0, overflow:0, kills:0, summary:'legacy shell: core adapter owns battle planning' };
  }

  ROOT.damagePlayerCastle = function(){ log('我方英雄伤害由核心结算。'); return false; };
  ROOT.damageEnemyCastle = function(){ log('敌方Boss伤害由核心结算。'); return false; };
  ROOT.dealDmg = function(){ log('单位伤害由核心结算。'); return false; };
  ROOT.settleExplosions = function(){ return emptyReport(); };
  ROOT.settleDamage = ROOT.settleExplosions;
  ROOT.useSlot = function(idx){ return command('USE_SLOT', { slotId:idx }); };
  ROOT.commitPlayerActionsToElementField = function(G){ return G; };
  ROOT.checkAllDead = function(){ return false; };
  ROOT.checkGameOver = function(){ return false; };
  ROOT.endPlayerTurn = function(){ return command('END_PLAYER_TURN'); };
  ROOT.finishMonsters = function(){ return false; };
  ROOT.monsterAct = function(){ return false; };
  ROOT.nextMoveFromPos = function(pos){ return pos || null; };
  ROOT.nextMove = function(m){ return m && m.pos || null; };
  ROOT.simMonAct = function(){ return null; };
  ROOT.runMonsters = function(){ return false; };
  ROOT.runMonsterAbilityHook = function(){ return false; };
  ROOT.computeMonWarn = function(){ return []; };
  ROOT.runSummonActions = function(){ return false; };
  ROOT.execSummonFromCellSkill = function(){ return false; };
  ROOT.execHealSummonsSkill = function(){ return false; };
  ROOT.buildAiBattleTurnPlan = emptyPlan;
  ROOT.planAiBattleTurn = emptyPlan;
  ROOT.executeAiBattlePlan_sync = function(plan){ return plan || emptyPlan(); };
  ROOT.runAiBattleTurn_sync = function(){ return emptyPlan(); };
  ROOT.runAiBattleTurn_async = function(){ return command('RUN_BATTLE').then(() => emptyPlan()); };
  ROOT.runAiBattleTurn = function(){ return ROOT.runAiBattleTurn_async(); };
  ROOT.syncMaxRoundForPhase = function(){ return false; };
})(window);
