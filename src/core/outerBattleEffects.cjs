const { pushEvent } = require('./events.cjs');

function clone(value) { return JSON.parse(JSON.stringify(value)); }

function ensureBattlePrepEffects(state) {
  if (!Array.isArray(state.battlePrepEffects)) state.battlePrepEffects = [];
  return state.battlePrepEffects;
}

function shieldAmountFromEvent(event) {
  if (!event) return 0;
  if (!String(event.gainText || event.optionText || '').includes('护盾')) return 0;
  return Math.max(0, Number(event.value || 0));
}

function queueBattlePrepEffectFromEvent(state, event, meta = {}) {
  if (!event || event.layer !== 'pre_battle' || event.status !== '正式') return null;
  const shield = shieldAmountFromEvent(event);
  if (shield <= 0) return null;
  const effect = {
    effectId: `prep_${state.day}_${state.nextStep || 0}_${event.id}`,
    eventId: event.id,
    name: event.name,
    source: meta.source || 'route_event',
    nodeId: meta.nodeId || null,
    type: 'shield',
    shield,
    status: 'pending',
    dayQueued: Number(state.day || 1),
    stepQueued: Number(state.nextStep || 0),
    usesRemaining: 1
  };
  ensureBattlePrepEffects(state).push(effect);
  pushEvent(state, 'BATTLE_PREP_EFFECT_QUEUE', {
    eventId: event.id,
    effect: clone(effect),
    text: `战前效果入队：${event.name}，下一场我方获得护盾+${shield}。`
  });
  return effect;
}

function livingHeroTargets(state) {
  return (state.units || []).filter(u => u.side === 'hero' && u.alive !== false && Number(u.hp || 0) > 0);
}

function applyBattlePrepEffects(state) {
  const effects = ensureBattlePrepEffects(state);
  const applied = [];
  for (const effect of effects) {
    if (effect.status !== 'pending' || Number(effect.usesRemaining || 0) <= 0) continue;
    if (effect.type !== 'shield') continue;
    const shield = Math.max(0, Number(effect.shield || 0));
    const targets = livingHeroTargets(state).map(unit => {
      const shieldFrom = Number(unit.shield || 0);
      unit.shield = shieldFrom + shield;
      return {
        unitId: unit.id,
        name: unit.displayName || unit.name,
        shieldFrom,
        shieldTo: unit.shield
      };
    });
    effect.status = 'applied';
    effect.usesRemaining = 0;
    effect.appliedAt = { day: Number(state.day || 1), period: state.period || '上午', round: Number(state.round || 0) };
    const payload = {
      eventId: effect.eventId,
      effectId: effect.effectId,
      name: effect.name,
      effectType: effect.type,
      shield,
      targets,
      text: `战前护盾：${effect.name} 使 ${targets.map(x => x.name).join('、')} 获得护盾+${shield}。`
    };
    pushEvent(state, 'BATTLE_PREP_EFFECT_APPLY', payload);
    applied.push({ effect: clone(effect), targets });
  }
  return applied;
}

module.exports = { ensureBattlePrepEffects, queueBattlePrepEffectFromEvent, applyBattlePrepEffects };
