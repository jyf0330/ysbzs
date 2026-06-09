/**
 * mechanics.cjs — 机制注册表和执行引擎
 *
 * 机制状态分级：
 *   implemented  — 有真实处理代码
 *   data_only    — CSV/CSV中有定义，但无处理代码（仅数据配置）
 *   pending      — 已注册但未实现
 */

const MECHANIC_STATUS = Object.freeze({
  // ── 已实现 ──
  none: 'implemented',
  mech_shield_flat: 'implemented',           // battle_start: 固定护盾
  mech_armor_flat: 'implemented',           // before_damage: 固定减伤
  mech_damage_reduce_pct: 'implemented',    // before_damage: 百分比免伤
  mech_first_hit_immunity: 'implemented',   // before_damage: 首次免疫
  mech_damage_cap_per_round: 'implemented', // before_damage: 回合损血上限
  mech_shield_regen: 'implemented',         // round_start: 回合回盾
  mech_thorn_shield: 'implemented',         // after_hit: 荆棘反伤
  mech_element_barrier: 'implemented',      // before_damage: 元素屏障
  mech_last_stand_shield: 'implemented',    // after_damage: 濒死护盾
  mech_counter_damage: 'implemented',       // after_hit: 受击反伤
  mech_thorns_percent: 'implemented',       // after_hit: 百分比反伤
  mech_reflect_first_hit: 'implemented',    // after_hit: 首次反射
  mech_grow_atk_each_round: 'implemented',  // round_start: 每回合加攻
  mech_grow_shield_each_round: 'implemented', // round_start: 每回合加盾
  mech_rage_low_hp: 'implemented',          // after_damage: 低血狂怒
  mech_harden_when_hit: 'implemented',      // after_hit: 受击加防
  mech_soften_when_hit: 'implemented',      // after_hit: 受击减防
  mech_delayed_powerup: 'implemented',      // round_start: 延迟加攻
  mech_enrage_after_round: 'implemented',   // round_start: 回合后加攻
  mech_second_phase: 'implemented',         // after_damage: 二阶段
  mech_fire_ignite_bonus: 'implemented',    // settleElements: 火额外伤害
  mech_water_heal_on_layer: 'implemented',  // afterElementApply: 水回血
  mech_earth_shield_on_layer: 'implemented', // afterElementApply: 土加盾
  mech_wind_push_on_hit: 'implemented',     // 减AP
  mech_wind_slow_ap: 'implemented',         // 减AP
  mech_shop_discount_after_clear: 'implemented', // battle_end: 商店折扣
  mech_bonus_reward_under_round5: 'implemented', // battle_end: 快速奖励
  mech_curse_gold_loss: 'implemented',      // battle_end: 金币惩罚
  // ── 仅数据配置 ──
  mech_earth_block_cell: 'data_only',
  mech_guard_taunt: 'data_only',
  mech_on_hit_blast: 'data_only',
  mech_shield_break_explosion: 'data_only',
  mech_retaliate_summon: 'data_only',
  mech_revenge_buff: 'data_only',
  mech_counter_attack: 'data_only',
  mech_death_explosion: 'data_only',
  mech_self_destruct: 'data_only',
  mech_death_summon: 'data_only',
  mech_split_into_minions: 'data_only',
  mech_summon_on_empty_cell: 'data_only',
  mech_summon_wall: 'data_only',
  mech_summon_trap: 'data_only',
  mech_summon_when_hit: 'data_only',
  mech_summon_after_kill: 'data_only',
  mech_hatch_after_rounds: 'data_only',
  mech_copy_weak_self: 'data_only',
  mech_dirty_cell: 'data_only',
  mech_countdown_pressure: 'data_only',
  mech_castle_line_damage: 'data_only',
  mech_economy_decay_on_fail: 'data_only',
  mech_reduce_reward_if_alive: 'data_only',
  mech_trap_stack_trigger: 'data_only',
  mech_multi_element_bonus: 'data_only',
  mech_water_cleanse_debuff: 'data_only',
  mech_fire_cross_detonate_diamond: 'data_only',
  // ── V1 新机制（由 elementReactions.cjs / battle.cjs 处理）──
  mech_fire_core_domain: 'implemented',     // battle.cjs: settleElements 火引爆
  mech_fire_explosion_sum: 'implemented',   // elements.cjs: fireDamage Σ(1..N)
  mech_fire_trap: 'implemented',            // elements.cjs: 空格火≥3层→陷阱
  mech_water_catalyst_seed: 'implemented',  // elements.cjs: waterCatalyst
  mech_wind_gather_fire: 'implemented',     // elements.cjs: transferFire
  mech_move_free_field: 'implemented',      // player units use explicit moveRange
  mech_attack_lock_after_attack: 'implemented', // hasAttacked 标记
  mech_clone_no_element: 'implemented',     // trialEngine: 复制体无元素
  mech_beast_trial: 'implemented',          // trialEngine: 试炼规则
  mech_shield_max: 'implemented',            // trialEngine: 护盾重生
  // ── 已注册未实现 ──
  mech_score_formula: 'pending',
  mech_borrow_fire_spread: 'pending',
  mech_step_fire_stack: 'pending',
  mech_fire_execute_spread: 'pending',
  mech_high_fire_breath: 'pending',
  mech_hp_regen_5: 'pending',
  mech_regen_10: 'pending',
  mech_life_double_each_round: 'pending',
  mech_first_secondary_double: 'pending',
  mech_water_poison_domain: 'pending',
  mech_water_heal_seed: 'pending',
  mech_water_slow: 'pending',
  mech_water_line_control: 'pending',
  mech_water_drag: 'pending',
  mech_water_shield_domain: 'pending',
  mech_tide_overflow: 'pending',
  mech_wind_mark: 'pending',
  mech_wind_seed: 'pending',
  mech_charge_attack: 'pending',
  mech_support_shield: 'pending',
  mech_wind_push_control: 'pending',
  mech_summon_domain: 'pending',
  mech_wind_core_gather: 'pending',
  mech_trial_right_top_random: 'pending',
  mech_no_soil_v1: 'pending',
  mech_burn_frontline: 'pending',
  mech_counter_fire: 'pending',
  mech_bubble_shield: 'pending',
  mech_water_pressure: 'pending',
  mech_elite_reward_bonus: 'pending',
  mech_penalty_after_round10: 'pending',
  mech_summon_each_round: 'pending',
  mech_consume_layers_grow: 'pending',
  mech_scale_with_allies: 'pending',
  mech_summon: 'pending'
});

const SUPPORTED_MECHANICS = new Set(Object.keys(MECHANIC_STATUS));

function getParam(unit, mech, key, fallback){ return (unit.mechanicParams && unit.mechanicParams[key] !== undefined) ? unit.mechanicParams[key] : (mech.defaultParams && mech.defaultParams[key] !== undefined ? mech.defaultParams[key] : fallback); }
function eachMechanic(unit, data, cb) { for (const id of (unit.mechanics || ['none'])) { const mech=data.mechanisms.find(m=>m.id===id); if (mech) cb(mech, id); } }
function applyBattleStart(state, unit){ eachMechanic(unit, state.data, (m,id)=>{ if(id==='mech_shield_flat'){ const shield=Number(getParam(unit,m,'shield',6)); unit.shield += shield; state.events.push({step:state.nextStep++, phase:state.phase, round:state.round, type:'MECHANIC_APPLIED', hook:'battle_start', mechanicId:id, unitId:unit.id, text:`${unit.name} 获得${shield}点开场护盾。`}); } }); }
function applyRoundStart(state, unit){ eachMechanic(unit, state.data, (m,id)=>{ if(id==='mech_shield_regen'||id==='mech_grow_shield_each_round'){ const shield=Number(getParam(unit,m,'shield', id==='mech_grow_shield_each_round'?2:3)); unit.shield += shield; state.events.push({step:state.nextStep++, phase:state.phase, round:state.round, type:'MECHANIC_APPLIED', hook:'round_start', mechanicId:id, unitId:unit.id, text:`${unit.name} 回合开始获得${shield}盾。`}); }
 if(id==='mech_grow_atk_each_round'||id==='mech_enrage_after_round'||id==='mech_delayed_powerup'){ const atk=Number(getParam(unit,m,'atk',1)); if(id==='mech_delayed_powerup' && state.round < Number(getParam(unit,m,'round',3))) return; unit.atk += atk; state.events.push({step:state.nextStep++, phase:state.phase, round:state.round, type:'MECHANIC_APPLIED', hook:'round_start', mechanicId:id, unitId:unit.id, text:`${unit.name} 攻击+${atk}。`}); }
 }); }
function beforeDamage(state, target, source, damage, ctx={}){ let final=Math.max(0, damage); const logs=[]; eachMechanic(target, state.data, (m,id)=>{ if(final<=0) return; if(id==='mech_armor_flat'){ const armor=Number(getParam(target,m,'armor',2)); final=Math.max(0, final-armor); logs.push(`${target.name} 护甲抵消${armor}。`); }
 if(id==='mech_damage_reduce_pct'){ const rate=Number(getParam(target,m,'rate',0.3)); const min=Number(getParam(target,m,'min_damage',1)); final=Math.max(min, Math.ceil(final*(1-rate))); logs.push(`${target.name} 百分比免伤，伤害降为${final}。`); }
 if(id==='mech_first_hit_immunity' && !target.flags.firstHitImmunityUsed){ target.flags.firstHitImmunityUsed=true; final=0; logs.push(`${target.name} 首次免疫，抵消本次伤害。`); }
 if(id==='mech_damage_cap_per_round'){ const cap=Number(getParam(target,m,'cap',8)); const used=target.roundDamageTaken||0; const allow=Math.max(0, cap-used); if(final>allow){ final=allow; logs.push(`${target.name} 本回合损血上限剩余${allow}。`); } }
 if(id==='mech_element_barrier' && ctx.element !== target.element){ const reduce=Number(getParam(target,m,'reduce',3)); final=Math.max(0, final-reduce); logs.push(`${target.name} 元素屏障抵消${reduce}。`); }
 });
 return { damage: final, logs };
}
function afterDamage(state, target, source, amount){ eachMechanic(target, state.data, (m,id)=>{ if(id==='mech_last_stand_shield' && !target.flags.lastStand && target.hp>0 && target.hp <= Math.ceil(target.maxHp*0.3)){ const shield=Number(getParam(target,m,'shield',8)); target.flags.lastStand=true; target.shield += shield; state.events.push({step:state.nextStep++, phase:state.phase, round:state.round, type:'MECHANIC_APPLIED', hook:'after_damage', mechanicId:id, unitId:target.id, text:`${target.name} 残血触发护盾+${shield}。`}); }
 if(id==='mech_rage_low_hp' && !target.flags.raged && target.hp>0 && target.hp <= Math.ceil(target.maxHp*0.5)){ target.flags.raged=true; target.atk += Number(getParam(target,m,'atk',2)); state.events.push({step:state.nextStep++, phase:state.phase, round:state.round, type:'MECHANIC_APPLIED', hook:'after_damage', mechanicId:id, unitId:target.id, text:`${target.name} 低血狂怒。`}); }
 if(id==='mech_second_phase' && !target.flags.phase2 && target.hp>0 && target.hp <= Math.ceil(target.maxHp*0.5)){ target.flags.phase2=true; target.atk += 1; target.shield += 3; state.events.push({step:state.nextStep++, phase:state.phase, round:state.round, type:'MECHANIC_APPLIED', hook:'after_damage', mechanicId:id, unitId:target.id, text:`${target.name} 进入第二阶段。`}); }
 }); }
function afterHit(state, target, source, amount){ eachMechanic(target, state.data, (m,id)=>{ if(!source || amount<=0) return; if(id==='mech_counter_damage'||id==='mech_thorn_shield'||id==='mech_thorns_percent'||id==='mech_reflect_first_hit'){ if(id==='mech_reflect_first_hit' && target.flags.reflectUsed) return; if(id==='mech_reflect_first_hit') target.flags.reflectUsed=true; const reflect=id==='mech_thorns_percent'?Math.ceil(amount*0.5):Number(getParam(target,m,'reflect',2)); source.hp=Math.max(0, source.hp-reflect); state.events.push({step:state.nextStep++, phase:state.phase, round:state.round, type:'MECHANIC_APPLIED', hook:'after_hit', mechanicId:id, unitId:target.id, targetId:source.id, text:`${target.name} 反伤${reflect}给${source.name}。`}); }
 if(id==='mech_harden_when_hit'){ target.def += 1; state.events.push({step:state.nextStep++, phase:state.phase, round:state.round, type:'MECHANIC_APPLIED', hook:'after_hit', mechanicId:id, unitId:target.id, text:`${target.name} 受击后防御+1。`}); }
 if(id==='mech_soften_when_hit'){ target.def = Math.max(0, target.def-1); state.events.push({step:state.nextStep++, phase:state.phase, round:state.round, type:'MECHANIC_APPLIED', hook:'after_hit', mechanicId:id, unitId:target.id, text:`${target.name} 受击后防御-1。`}); }
 }); }
function onDeath(state, unit, source){ eachMechanic(unit, state.data, (m,id)=>{ if(id==='mech_death_explosion'||id==='mech_self_destruct'||id==='mech_shield_break_explosion'){ state.events.push({step:state.nextStep++, phase:state.phase, round:state.round, type:'MECHANIC_APPLIED', hook:'on_death', mechanicId:id, unitId:unit.id, text:`${unit.name} 死亡爆发被记录，范围伤害进入事件流。`}); }
 if(id==='mech_death_summon'||id==='mech_split_into_minions'){ state.events.push({step:state.nextStep++, phase:state.phase, round:state.round, type:'MECHANIC_APPLIED', hook:'on_death', mechanicId:id, unitId:unit.id, text:`${unit.name} 死亡召唤/分裂被记录。`}); }
 }); }
function afterElementApply(state, caster, target, element, layers){ eachMechanic(caster, state.data, (m,id)=>{ if(id==='mech_water_heal_on_layer' && element==='水'){ caster.hp=Math.min(caster.maxHp, caster.hp+layers); state.events.push({step:state.nextStep++, phase:state.phase, round:state.round, type:'MECHANIC_APPLIED', hook:'after_element_apply', mechanicId:id, unitId:caster.id, text:`${caster.name} 施加水层后回复${layers}。`}); }
 if(id==='mech_earth_shield_on_layer' && element==='土'){ caster.shield+=layers; state.events.push({step:state.nextStep++, phase:state.phase, round:state.round, type:'MECHANIC_APPLIED', hook:'after_element_apply', mechanicId:id, unitId:caster.id, text:`${caster.name} 施加土层后护盾+${layers}。`}); }
 if(['mech_summon_on_empty_cell','mech_summon_trap','mech_dirty_cell','mech_earth_block_cell'].includes(id)){ state.events.push({step:state.nextStep++, phase:state.phase, round:state.round, type:'MECHANIC_APPLIED', hook:'after_element_apply', mechanicId:id, unitId:caster.id, text:`${caster.name} 触发${m.name}，已写入事件流。`}); }
 }); }
function battleEndMechanics(state, result){ for (const u of state.units){ if(!u.alive) continue; eachMechanic(u,state.data,(m,id)=>{ if(id==='mech_shop_discount_after_clear' && result.win){ state.shop.nextDiscount = Math.max(state.shop.nextDiscount || 0, 50); state.events.push({step:state.nextStep++, phase:state.phase, round:state.round, type:'MECHANIC_APPLIED', hook:'battle_end', mechanicId:id, unitId:u.id, text:`${u.name} 让下一商店获得50%折扣。`}); }
 if(id==='mech_bonus_reward_under_round5' && result.win && state.round<=5){ result.gold += 1; state.events.push({step:state.nextStep++, phase:state.phase, round:state.round, type:'MECHANIC_APPLIED', hook:'battle_end', mechanicId:id, unitId:u.id, text:`${u.name} 触发快速奖励+1金币。`}); }
 if(id==='mech_curse_gold_loss'){ result.gold = Math.max(0,result.gold-1); }
 }); }
}

/**
 * 从 CSV 11_英雄领域 读取领域配置，应用到 state.heroDomains
 * 格式：{ domainId: { provider, target, trigger, effectId, params, persistent, effectText } }
 */
function applyHeroDomainsFromCsv(state) {
  const rows = (state.data && state.data.heroDomains) || [];
  if (!rows.length) return;
  const domainMap = {};
  for (const row of rows) {
    if (!row['领域ID']) continue;
    let params = {};
    try { params = JSON.parse(row['参数'] || '{}'); } catch (_) {}
    domainMap[row['领域ID']] = {
      providerPetId: row['提供者宠物ID'],
      providerName: row['提供者名称'],
      target: row['挂接到'],
      trigger: row['触发'],
      effectId: row['效果ID'],
      params,
      persistent: row['是否持续'] === '是',
      text: row['说明']
    };
  }
  // 在 state 中记录
  state.heroDomains = Object.assign(state.heroDomains || {}, domainMap);
}

/**
 * 根据上场的宠物列表，把对应领域效果写入英雄的 mechanics
 */
function syncHeroDomainsToLeaders(state) {
  const domainMap = state.heroDomains || {};
  const petIdsOnField = (state.units || []).filter(u => u.alive).map(u => u.petId);
  const playerMechanics = new Set(state.leaders.player?.mechanics || []);
  const enemyMechanics = new Set(state.leaders.enemy?.mechanics || []);

  for (const domain of Object.values(domainMap)) {
    if (!domain || !domain.providerPetId) continue;
    const isOnField = domain.providerPetId === 'enemy_beast_master' || petIdsOnField.includes(domain.providerPetId);
    if (!isOnField && domain.persistent) continue; // 持续领域不离场则不消失
    if (!isOnField) continue;
    const mechSet = domain.target === 'enemy_hero' ? enemyMechanics : playerMechanics;
    mechSet.add(domain.effectId);
  }

  if (state.leaders.player) state.leaders.player.mechanics = [...playerMechanics];
  if (state.leaders.enemy) state.leaders.enemy.mechanics = [...enemyMechanics];
}

/**
 * 检查英雄领域是否包含某效果
 */
function hasHeroDomain(state, side, effectId) {
  const leaders = side === 'hero' ? state.leaders?.player : state.leaders?.enemy;
  if (!leaders || !leaders.mechanics) return false;
  return leaders.mechanics.includes(effectId);
}

module.exports = {
  SUPPORTED_MECHANICS, MECHANIC_STATUS,
  applyBattleStart, applyRoundStart, beforeDamage, afterDamage, afterHit, onDeath,
  afterElementApply, battleEndMechanics,
  applyHeroDomainsFromCsv, syncHeroDomainsToLeaders, hasHeroDomain
};
