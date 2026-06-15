const { pushEvent } = require('./events.cjs');
const { recordChange } = require('./changeLog.cjs');
const { computeModifiedValue } = require('./modifierEngine.cjs');

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

function trapBonusFromEvent(event) {
  if (!event) return 0;
  if (!String(event.gainText || event.optionText || '').includes('陷阱伤害')) return 0;
  return Math.max(0, Number(event.value || 0));
}

function queueBattlePrepEffectFromEvent(state, event, meta = {}) {
  if (!event || event.layer !== 'pre_battle' || event.status !== '正式') return null;
  const shield = shieldAmountFromEvent(event);
  const trapBonus = trapBonusFromEvent(event);
  if (shield <= 0 && trapBonus <= 0) return null;
  const effect = {
    effectId: `prep_${state.day}_${state.nextStep || 0}_${event.id}`,
    eventId: event.id,
    name: event.name,
    source: meta.source || 'route_event',
    nodeId: meta.nodeId || null,
    type: shield > 0 ? 'shield' : 'trap_damage_bonus',
    shield: shield > 0 ? shield : 0,
    bonusDamage: trapBonus > 0 ? trapBonus : 0,
    status: 'pending',
    dayQueued: Number(state.day || 1),
    stepQueued: Number(state.nextStep || 0),
    usesRemaining: 1
  };
  ensureBattlePrepEffects(state).push(effect);
  pushEvent(state, 'BATTLE_PREP_EFFECT_QUEUE', {
    eventId: event.id,
    effect: clone(effect),
    text: effect.type === 'shield'
      ? `战前效果入队：${event.name}，下一场我方获得护盾+${shield}。`
      : `战前效果入队：${event.name}，下一场火陷阱伤害+${trapBonus}。`
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
    if (effect.type === 'trap_damage_bonus') {
      effect.status = 'active';
      effect.appliedAt = { day: Number(state.day || 1), period: state.period || '上午', round: Number(state.round || 0) };
      pushEvent(state, 'BATTLE_PREP_EFFECT_APPLY', {
        eventId: effect.eventId,
        effectId: effect.effectId,
        name: effect.name,
        effectType: effect.type,
        bonusDamage: Number(effect.bonusDamage || 0),
        text: `陷阱增伤：${effect.name} 已激活，下一次火陷阱伤害+${Number(effect.bonusDamage || 0)}。`
      });
      applied.push({ effect: clone(effect), targets: [] });
      continue;
    }
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

function applyTrapDamageBonus(state, baseDamage, meta = {}) {
  const effects = ensureBattlePrepEffects(state);
  const active = effects.filter(effect => effect.type === 'trap_damage_bonus' && ['active', 'pending'].includes(effect.status) && Number(effect.usesRemaining || 0) > 0);
  const modifiers = active
    .map(effect => ({
      id: `${effect.eventId}_trap_damage_add`,
      op: 'add',
      value: Number(effect.bonusDamage || 0),
      priority: 70,
      sourceId: effect.effectId
    }))
    .filter(modifier => Number(modifier.value || 0) > 0);
  const modified = computeModifiedValue(Number(baseDamage || 0), modifiers, {
    source: meta.source || null,
    r: meta.r ?? null,
    c: meta.c ?? null,
    unitId: meta.unitId || null
  });
  const effectById = new Map(active.map(effect => [effect.effectId, effect]));
  const modifierApplied = modified.applied.map(applied => {
    const effect = effectById.get(applied.sourceId) || null;
    return {
      ...applied,
      eventId: effect ? effect.eventId : null,
      effectId: applied.sourceId,
      name: effect ? effect.name : null
    };
  });
  const bonusDamage = Number(modified.final || 0) - Number(baseDamage || 0);
  if (bonusDamage <= 0) return { baseDamage: Number(baseDamage || 0), bonusDamage: 0, damage: Number(baseDamage || 0), effects: [], modifierApplied: [] };
  const consumed = active.map(effect => {
    effect.status = 'consumed';
    effect.usesRemaining = 0;
    effect.consumedAt = { day: Number(state.day || 1), period: state.period || '上午', round: Number(state.round || 0), source: meta.source || null };
    const applied = modifierApplied.filter(modifier => modifier.sourceId === effect.effectId);
    return { ...clone(effect), modifierApplied: clone(applied) };
  });
  for (const applied of modifierApplied) {
    recordChange(state, {
      type: 'APPLY_OUTER_BATTLE_MODIFIER',
      path: 'fire_trap.damage',
      from: applied.from,
      to: applied.to,
      delta: Number(applied.to || 0) - Number(applied.from || 0),
      source: {
        eventId: applied.eventId,
        effectId: applied.effectId,
        modifierId: applied.id,
        source: meta.source || null
      },
      reason: 'outer_trap_bonus_modifier',
      tags: ['outer', 'battle_modifier', 'fire_trap'],
      text: `外层战斗modifier：${applied.name || applied.id} 使火陷阱伤害 ${applied.from}→${applied.to}。`
    });
  }
  return {
    baseDamage: Number(baseDamage || 0),
    bonusDamage,
    damage: Number(modified.final || 0),
    effects: consumed,
    modifierApplied: clone(modifierApplied)
  };
}

module.exports = { ensureBattlePrepEffects, queueBattlePrepEffectFromEvent, applyBattlePrepEffects, applyTrapDamageBonus };
