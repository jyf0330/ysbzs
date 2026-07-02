function createLifecycleModule(deps) {
  const { pushEvent, mech, clone, living, livingLeader } = deps;

  function playerPartyWiped(state) {
    return !living(state, 'hero').length;
  }

  function applyPlayerHeroLossPenalty(state, result, reason = 'battle_loss') {
    const leader = state.leaders?.player;
    if (!leader || leader.alive === false || Number(leader.hp || 0) <= 0) {
      if (result) result.gameOver = true;
      state.gameOver = state.gameOver || { reason: 'player_hero_dead', day: state.day, period: state.period, round: state.round };
      return { hpFrom: 0, hpTo: 0, gameOver: true };
    }
    const hpFrom = Number(leader.hp || 0);
    const penalty = 10;
    const hpTo = Math.max(0, hpFrom - penalty);
    leader.hp = hpTo;
    if (hpTo <= 0) {
      leader.alive = false;
      state.gameOver = { reason: 'player_hero_dead', day: state.day, period: state.period, round: state.round };
    }
    const gameOver = leader.alive === false;
    if (result) {
      result.defeatReason = reason;
      result.playerHeroHpFrom = hpFrom;
      result.playerHeroHpTo = hpTo;
      result.playerHeroHpPenalty = penalty;
      result.gameOver = gameOver;
    }
    pushEvent(state, 'BATTLE_FAIL_PENALTY', {
      defeatReason: reason,
      playerHeroHpFrom: hpFrom,
      playerHeroHpTo: hpTo,
      penalty,
      gameOver,
      text: gameOver
        ? `战斗失败：我方宠物全灭，玩家英雄HP ${hpFrom}→0，游戏结束。`
        : `战斗失败：我方宠物全灭，玩家英雄HP ${hpFrom}→${hpTo}。`
    });
    if (gameOver) pushEvent(state, 'GAME_OVER', { reason: 'player_hero_dead', text: '玩家英雄死亡，游戏结束。' });
    return { hpFrom, hpTo, gameOver };
  }

  function finishBattle(state, win, opts = {}) {
    if (state.phase === 'battle_end' && state.result) return state.result;
    const result = { win, code: win ? (state.round <= 5 ? 'WIN_FAST' : 'WIN') : 'LOSE', grade: win ? (state.round <= 5 ? 'S' : 'A') : 'D', gold: win ? (state.round <= 5 ? 6 : 4) : 1 };
    mech.battleEndMechanics(state, result);
    if (!win) {
      const reason = opts.reason || 'battle_loss';
      if (reason === 'party_wipe' || reason === 'player_hero_dead') {
        applyPlayerHeroLossPenalty(state, result, reason);
      } else {
        state.castleLine -= 1;
        state.economyMultiplier *= 0.9;
        result.defeatReason = reason;
        pushEvent(state, 'BATTLE_FAIL_PENALTY', { defeatReason: reason, text: '战斗失败：我方英雄防线-1，经济倍率x0.9。' });
      }
    }
    state.gold += result.gold;
    state.result = result;
    state.phase = 'battle_end';
    pushEvent(state, 'BATTLE_END', { result: result.code, grade: result.grade, gold: result.gold, text: `战斗结束：${result.code}，评级${result.grade}，金币+${result.gold}。` });
    const existingTrace = Array.isArray(state.battleTrace) ? state.battleTrace.slice() : [];
    const legacyTrace = state.events.filter(e => /BATTLE|ROUND|PLAYER|MONSTER|DAMAGE|ELEMENT|SPAWN|MOVE|DEAD/.test(e.type)).map(e => clone(e));
    const seen = new Set(existingTrace.map(e => e.eventId || `legacy_${e.step}_${e.type}`));
    state.battleTrace = existingTrace.concat(legacyTrace.filter(e => {
      const key = e.eventId || `legacy_${e.step}_${e.type}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    }));
    return result;
  }

  return { playerPartyWiped, finishBattle };
}

module.exports = { createLifecycleModule };
