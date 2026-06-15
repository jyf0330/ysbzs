const { pushEvent } = require('./events.cjs');

function clone(value) { return JSON.parse(JSON.stringify(value)); }

function ensureOuterRunEffects(state) {
  if (!Array.isArray(state.outerRunEffects)) state.outerRunEffects = [];
  return state.outerRunEffects;
}

function goldGainFromEvent(event) {
  if (!event) return 0;
  if (!String(event.gainText || event.optionText || '').includes('金币')) return 0;
  return Math.max(0, Number(event.value || 0));
}

function rewardMultiplierFromEvent(event) {
  if (!event) return 100;
  const match = String(event.costText || event.optionText || '').match(/奖励\s*-\s*(\d+)%/);
  return match ? Math.max(0, 100 - Number(match[1])) : 100;
}

function queueOuterRunEffectFromEvent(state, event, meta = {}) {
  if (!event || event.layer !== 'event' || event.status !== '正式') return null;
  const immediateGold = goldGainFromEvent(event);
  const multiplier = rewardMultiplierFromEvent(event);
  if (immediateGold <= 0 || multiplier >= 100) return null;
  const beforeGold = Number(state.gold || 0);
  state.gold = beforeGold + immediateGold;
  const effect = {
    effectId: `run_${state.day}_${state.nextStep || 0}_${event.id}`,
    eventId: event.id,
    name: event.name,
    source: meta.source || 'route_event',
    nodeId: meta.nodeId || null,
    type: 'reward_gold_multiplier',
    multiplier,
    immediateGold,
    status: 'pending',
    dayQueued: Number(state.day || 1),
    stepQueued: Number(state.nextStep || 0),
    usesRemaining: 1
  };
  ensureOuterRunEffects(state).push(effect);
  pushEvent(state, 'OUTER_RUN_EFFECT_QUEUE', {
    eventId: event.id,
    effect: clone(effect),
    goldFrom: beforeGold,
    goldTo: state.gold,
    text: `外层风险：${event.name} 立刻金币+${immediateGold}，下一场战斗奖励按${multiplier}%结算。`
  });
  return effect;
}

function applyRouteBattleOutcomeEffects(state, outcome, beforeGold) {
  const effects = ensureOuterRunEffects(state);
  const active = effects.filter(effect => effect.type === 'reward_gold_multiplier' && ['pending', 'active'].includes(effect.status) && Number(effect.usesRemaining || 0) > 0);
  const goldBaseDelta = Math.max(0, Number(state.gold || 0) - Number(beforeGold || 0));
  if (!active.length) return { goldBaseDelta, goldDelta: goldBaseDelta, consumed: [] };
  let goldDelta = goldBaseDelta;
  const consumed = [];
  for (const effect of active) {
    const from = goldDelta;
    goldDelta = Math.max(0, Math.floor(goldDelta * Number(effect.multiplier || 100) / 100));
    effect.status = 'consumed';
    effect.usesRemaining = 0;
    effect.consumedAt = { day: Number(state.day || 1), period: state.period || '上午', round: Number(state.round || 0), battleIndex: outcome.battleIndex };
    const record = { ...clone(effect), goldDeltaFrom: from, goldDeltaTo: goldDelta };
    consumed.push(record);
    pushEvent(state, 'OUTER_RUN_EFFECT_CONSUME', {
      eventId: effect.eventId,
      effectId: effect.effectId,
      outcome: { day: outcome.day, battleIndex: outcome.battleIndex, encounterId: outcome.encounterId },
      goldDeltaFrom: from,
      goldDeltaTo: goldDelta,
      text: `奖励折损：${effect.name} 使战斗金币${from}→${goldDelta}。`
    });
  }
  state.gold = Number(beforeGold || 0) + goldDelta;
  return { goldBaseDelta, goldDelta, consumed };
}

module.exports = { ensureOuterRunEffects, queueOuterRunEffectFromEvent, applyRouteBattleOutcomeEffects };
