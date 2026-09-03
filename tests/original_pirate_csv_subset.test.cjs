const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const csvDir = path.join(root, 'data', 'csv');

function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (quoted) {
      if (char === '"' && text[index + 1] === '"') {
        field += '"';
        index += 1;
      } else if (char === '"') quoted = false;
      else field += char;
    } else if (char === '"') quoted = true;
    else if (char === ',') {
      row.push(field);
      field = '';
    } else if (char === '\n') {
      row.push(field.replace(/\r$/, ''));
      if (row.some((value) => value !== '')) rows.push(row);
      row = [];
      field = '';
    } else field += char;
  }
  if (field || row.length) rows.push([...row, field]);
  return rows;
}

function readCsv(filename) {
  const rows = parseCsv(fs.readFileSync(path.join(csvDir, filename), 'utf8').replace(/^\uFEFF/, ''));
  const headers = rows[0];
  return {
    headers,
    rows: rows.slice(1).map((values) => Object.fromEntries(headers.map((header, index) => (
      [header, values[index] ?? '']
    )))),
  };
}

test('OPCSV01 Ammo depletion、Crit v3、Heal/Cleanse、Poison v2、Burn source rules 与 operation-owned 参数严格落在 44/47', () => {
  const gameplay = readCsv('44_bz_gameplay.csv');
  const effects = readCsv('47_bz_item_effects.csv');
  assert.deepEqual(gameplay.rows.map((row) => ({
    schemaVersion: row.schema_version,
    runtimeSchemaVersion: row.runtime_schema_version,
    rulesVersion: row.rules_version,
    sourceRevision: row.source_revision,
    contentRevision: row.content_revision,
    bundleRevision: row.bundle_revision,
    critContract: row.crit_contract,
    critGrowthStackingPolicy: row.crit_growth_stacking_policy,
    critGrowthCapPolicy: row.crit_growth_cap_policy,
    critGrowthTimingPolicy: row.crit_growth_timing_policy,
    critGrowthEligibleTargetPolicy: row.crit_growth_eligible_target_policy,
    critGrowthRngPolicy: row.crit_growth_rng_policy,
    critSuccessResponseEvidencePolicy: row.crit_success_response_evidence_policy,
    critSuccessResponseSourcePolicy: row.crit_success_response_source_policy,
    critSuccessResponseTimingPolicy: row.crit_success_response_timing_policy,
    critSuccessResponseRepeatPolicy: row.crit_success_response_repeat_policy,
    critSuccessResponseTerminalPolicy: row.crit_success_response_terminal_policy,
    critSuccessResponseRngPolicy: row.crit_success_response_rng_policy,
    burnContract: row.burn_contract,
    pulseIntervalTicks: row.burn_pulse_interval_ticks,
    firstPulsePolicy: row.burn_first_pulse_policy,
    pulsePhase: row.burn_pulse_phase,
    damagePerStack: row.burn_damage_per_stack,
    decayStacksPerPulse: row.burn_decay_stacks_per_pulse,
    shieldPolicy: row.burn_shield_policy,
    resolutionOrder: row.burn_resolution_order,
    maxStacks: row.burn_max_stacks,
    stackOverflowPolicy: row.burn_stack_overflow_policy,
    poisonContract: row.poison_contract,
    poisonPulseIntervalTicks: row.poison_pulse_interval_ticks,
    poisonFirstPulsePolicy: row.poison_first_pulse_policy,
    poisonReapplySchedulePolicy: row.poison_reapply_schedule_policy,
    poisonPulsePhase: row.poison_pulse_phase,
    poisonDamagePerStack: row.poison_damage_per_stack,
    poisonDecayStacksPerPulse: row.poison_decay_stacks_per_pulse,
    poisonShieldPolicy: row.poison_shield_policy,
    poisonResolutionOrder: row.poison_resolution_order,
    poisonHealCleansePolicy: row.poison_heal_cleanse_policy,
    poisonCritPolicy: row.poison_crit_policy,
    poisonMaxStacks: row.poison_max_stacks,
    poisonStackOverflowPolicy: row.poison_stack_overflow_policy,
    healStatusCleanseContract: row.heal_status_cleanse_contract,
    healStatusCleanseTriggerPolicy: row.heal_status_cleanse_trigger_policy,
    healStatusCleanseHealBasis: row.heal_status_cleanse_heal_basis,
    healStatusCleanseScaleBps: row.heal_status_cleanse_scale_bps,
    healStatusCleanseRoundingMode: row.heal_status_cleanse_rounding_mode,
    healStatusCleanseStatusTargets: row.heal_status_cleanse_status_targets,
    healStatusCleanseStatusResolutionPolicy: row.heal_status_cleanse_status_resolution_policy,
    healStatusCleansePoisonSchedulePolicy: row.heal_status_cleanse_poison_schedule_policy,
    healStatusCleanseTraceEmitPolicy: row.heal_status_cleanse_trace_emit_policy,
    healStatusCleanseCritPolicy: row.heal_status_cleanse_crit_policy,
    healStatusCleanseRngPolicy: row.heal_status_cleanse_rng_policy,
    ammoDepletionContract: row.ammo_depletion_contract,
    ammoDepletionTriggerPolicy: row.ammo_depletion_trigger_policy,
    ammoDepletionEvaluationPhase: row.ammo_depletion_evaluation_phase,
    ammoDepletionSnapshotPolicy: row.ammo_depletion_snapshot_policy,
    ammoDepletionRepeatPolicy: row.ammo_depletion_repeat_policy,
    ammoDepletionNonAmmoPolicy: row.ammo_depletion_non_ammo_policy,
    ammoDepletionReloadPolicy: row.ammo_depletion_reload_policy,
    ammoDepletionRngPolicy: row.ammo_depletion_rng_policy,
  })), Array.from({ length: 6 }, () => ({
    schemaVersion: '30',
    runtimeSchemaVersion: '28',
    rulesVersion: 'ysbzs.original-pirate-rules.2026-09-04-v28',
    sourceRevision: 'original-pirate-bootstrap-source-2026-09-03-v29',
    contentRevision: 'original-pirate-bootstrap-content-2026-09-03-v29',
    bundleRevision: 'original_pirate_bootstrap_bundle_v29',
    critContract: 'ysbzs.original-pirate-critical-damage.v3',
    critGrowthStackingPolicy: 'additive_bps_per_effect',
    critGrowthCapPolicy: 'effective_chance_capped_at_chance_scale',
    critGrowthTimingPolicy: 'after_source_use_for_subsequent_uses',
    critGrowthEligibleTargetPolicy: 'trigger_source_item_with_exactly_one_can_crit_item_ready_direct_damage',
    critGrowthRngPolicy: 'never',
    critSuccessResponseEvidencePolicy: 'crit_resolve_is_critical_with_bound_committed_damage',
    critSuccessResponseSourcePolicy: 'another_same_owner_active_board_item',
    critSuccessResponseTimingPolicy: 'after_source_use_effects_in_item_response_phase',
    critSuccessResponseRepeatPolicy: 'once_per_qualifying_item_use',
    critSuccessResponseTerminalPolicy: 'skip_after_terminal',
    critSuccessResponseRngPolicy: 'never',
    burnContract: 'ysbzs.original-pirate-burn.v2',
    pulseIntervalTicks: '1',
    firstPulsePolicy: 'next_tick',
    pulsePhase: 'tick_start_before_item_progress',
    damagePerStack: '1',
    decayStacksPerPulse: '1',
    shieldPolicy: 'shield_first_consuming',
    resolutionOrder: 'simultaneous_sides_then_terminal',
    maxStacks: '1000000',
    stackOverflowPolicy: 'reject_advance',
    poisonContract: 'ysbzs.original-pirate-poison.v2',
    poisonPulseIntervalTicks: '10',
    poisonFirstPulsePolicy: 'after_full_interval',
    poisonReapplySchedulePolicy: 'preserve_existing_due_tick',
    poisonPulsePhase: 'tick_start_after_burn_terminal_before_item_progress',
    poisonDamagePerStack: '1',
    poisonDecayStacksPerPulse: '0',
    poisonShieldPolicy: 'bypass_without_consuming',
    poisonResolutionOrder: 'due_sides_snapshot_then_terminal',
    poisonHealCleansePolicy: 'delegated_to_heal_status_cleanse_rules',
    poisonCritPolicy: 'never',
    poisonMaxStacks: '1000000',
    poisonStackOverflowPolicy: 'reject_advance',
    healStatusCleanseContract: 'ysbzs.original-pirate-heal-status-cleanse.v1',
    healStatusCleanseTriggerPolicy: 'after_effective_heal',
    healStatusCleanseHealBasis: 'applied_heal',
    healStatusCleanseScaleBps: '2500',
    healStatusCleanseRoundingMode: 'floor_min_one_if_positive',
    healStatusCleanseStatusTargets: 'burn, poison',
    healStatusCleanseStatusResolutionPolicy: 'independent_caps_from_same_snapshot',
    healStatusCleansePoisonSchedulePolicy: 'clear_due_if_zero_else_preserve',
    healStatusCleanseTraceEmitPolicy: 'only_when_effective_heal_and_any_status_present',
    healStatusCleanseCritPolicy: 'never',
    healStatusCleanseRngPolicy: 'never',
    ammoDepletionContract: 'ysbzs.original-pirate-ammo-depletion.v1',
    ammoDepletionTriggerPolicy: 'current_item_use_positive_to_zero',
    ammoDepletionEvaluationPhase: 'after_ammo_spend_before_item_effects',
    ammoDepletionSnapshotPolicy: 'ammo_before_after_from_same_use',
    ammoDepletionRepeatPolicy: 'once_per_depleting_use',
    ammoDepletionNonAmmoPolicy: 'not_eligible',
    ammoDepletionReloadPolicy: 'later_reload_does_not_cancel',
    ammoDepletionRngPolicy: 'never',
  })));
  assert.equal(effects.headers.includes('stacks'), true);
  assert.equal(effects.headers.includes('crit_chance_bps_delta'), true);
  const burnRows = effects.rows.filter(({ operation_type: operationType }) => operationType === 'apply_burn');
  assert.deepEqual(burnRows.map(({ effect_id: effectId, stacks, amount, can_crit: canCrit, status, ticks }) => (
    [effectId, stacks, amount, canCrit, status, ticks]
  )), [
    ['effect_emberwake_lantern_bronze_burn', '3', '', '', '', ''],
    ['effect_emberwake_lantern_silver_burn', '5', '', '', '', ''],
    ['effect_emberwake_lantern_gold_burn', '8', '', '', '', ''],
    ['effect_emberwake_lantern_diamond_burn', '12', '', '', '', ''],
  ]);
  const poisonRows = effects.rows.filter(({ operation_type: operationType }) => operationType === 'apply_poison');
  assert.deepEqual(poisonRows.map(({ effect_id: effectId, stacks, amount, can_crit: canCrit, status, ticks }) => (
    [effectId, stacks, amount, canCrit, status, ticks]
  )), [
    ['effect_inkwake_doser_bronze_poison', '2', '', '', '', ''],
    ['effect_inkwake_doser_silver_poison', '3', '', '', '', ''],
    ['effect_inkwake_doser_gold_poison', '5', '', '', '', ''],
    ['effect_inkwake_doser_diamond_poison', '7', '', '', '', ''],
  ]);
  assert.equal(effects.rows.filter(({ operation_type: operationType }) => (
    !['apply_burn', 'apply_poison'].includes(operationType)
  ))
    .every(({ stacks }) => stacks === ''), true);
  assert.equal(effects.rows.filter(({ operation_type: operationType }) => (
    operationType !== 'gain_crit_chance_for_fight'
  )).every(({ crit_chance_bps_delta: delta }) => delta === ''), true);
});

test('OPCSV02 烬航灯四品质、初始报价、升级、单铭刻与 Ghost 引用完整', () => {
  const items = readCsv('46_bz_items.csv').rows.filter(({ item_id: itemId }) => itemId === 'item_emberwake_lantern');
  assert.deepEqual(items.map(({ quality, buy_price: buy, sell_price: sell, cooldown_ticks: cooldown }) => (
    [quality, buy, sell, cooldown]
  )), [
    ['bronze', '3', '1', '9'], ['silver', '5', '2', '8'],
    ['gold', '8', '4', '7'], ['diamond', '12', '6', '6'],
  ]);
  assert.equal(items.every(({ tags }) => tags === 'burn, relic, tool'), true);
  const initialOffers = readCsv('50_bz_stall_offers.csv').rows.filter(({ refresh_index: refresh }) => refresh === '0');
  assert.equal(initialOffers.length, 3);
  assert.equal(initialOffers.some(({ offer_id: offerId }) => offerId === 'offer_initial_emberwake_lantern'), true);
  assert.equal(initialOffers.some(({ offer_id: offerId }) => offerId === 'offer_initial_signal_flare'), false);
  assert.equal(readCsv('57_bz_item_upgrades.csv').rows.filter(({ item_id: itemId }) => (
    itemId === 'item_emberwake_lantern'
  )).length, 3);
  const enchantments = readCsv('58_bz_enchantments.csv').rows.filter(({ item_id: itemId }) => (
    itemId === 'item_emberwake_lantern'
  ));
  assert.equal(enchantments.length, 4);
  assert.equal(enchantments.every(({ enchantment_id: enchantmentId }) => enchantmentId === 'enchant_tailwind'), true);
  assert.equal(readCsv('60_bz_ghost_snapshots.csv').rows.some(({ item_id: itemId }) => (
    itemId === 'item_emberwake_lantern'
  )), true);
});

test('OPCSV03 墨航滴液器四品质、refresh 5 报价、升级与单铭刻完整，并进入 Day 1 正式 Ghost', () => {
  const items = readCsv('46_bz_items.csv').rows.filter(({ item_id: itemId }) => itemId === 'item_inkwake_doser');
  assert.deepEqual(items.map(({
    quality, buy_price: buy, sell_price: sell, cooldown_ticks: cooldown,
    crit_chance_bps: critChance,
  }) => [quality, buy, sell, cooldown, critChance]), [
    ['bronze', '2', '1', '10', '0'], ['silver', '4', '2', '9', '0'],
    ['gold', '7', '3', '8', '0'], ['diamond', '11', '5', '7', '0'],
  ]);
  assert.equal(items.every(({ tags }) => tags === 'poison, relic, tool'), true);
  const initialOffers = readCsv('50_bz_stall_offers.csv').rows.filter(({ refresh_index: refresh }) => refresh === '0');
  assert.equal(initialOffers.some(({ offer_id: offerId }) => offerId === 'offer_initial_emberwake_lantern'), true);
  assert.equal(initialOffers.some(({ offer_id: offerId }) => offerId === 'offer_initial_tideglass_sidearm'), true);
  const refreshFive = readCsv('50_bz_stall_offers.csv').rows.filter(({ refresh_index: refresh }) => refresh === '5');
  assert.deepEqual(refreshFive.map(({ offer_id: offerId }) => offerId), [
    'offer_refresh_5_inkwake_doser',
    'offer_refresh_5_tidefold_bulwark',
    'offer_refresh_5_crosswind_selector',
  ]);
  assert.equal(readCsv('57_bz_item_upgrades.csv').rows.filter(({ item_id: itemId }) => (
    itemId === 'item_inkwake_doser'
  )).length, 3);
  const enchantments = readCsv('58_bz_enchantments.csv').rows.filter(({ item_id: itemId }) => (
    itemId === 'item_inkwake_doser'
  ));
  assert.equal(enchantments.length, 4);
  assert.equal(enchantments.every(({ enchantment_id: enchantmentId }) => enchantmentId === 'enchant_tailwind'), true);
  const dayOneGhost = readCsv('60_bz_ghost_snapshots.csv').rows.filter(({ snapshot_id: snapshotId }) => (
    snapshotId === 'ghost_snapshot_day_01'
  ));
  assert.deepEqual(dayOneGhost.map(({
    instance_id: instanceId, item_id: itemId, quality, start_slot: startSlot,
  }) => [instanceId, itemId, quality, startSlot]), [
    ['ghost_d01_emberwake', 'item_emberwake_lantern', 'silver', '2'],
    ['ghost_d01_inkwake', 'item_inkwake_doser', 'bronze', '3'],
  ]);
  assert.equal(dayOneGhost.some(({ item_id: itemId }) => itemId === 'item_patchwork_ram'), false);
});

test('OPCSV04 伤害 Aura 独立域、规则合同与雾藻疗匣四品质绑定完整', () => {
  const gameplay = readCsv('44_bz_gameplay.csv').rows;
  assert.equal(gameplay.every((row) => (
    row.damage_aura_contract === 'ysbzs.original-pirate-damage-aura.v1'
      && row.damage_aura_evaluation_policy === 'per_damage_from_compiled_sources'
      && row.damage_aura_target_snapshot_policy === 'battle_start_board'
      && row.damage_aura_target_order === 'board_slot_then_instance_id'
      && row.damage_aura_stacking_policy === 'additive_per_source_effect'
      && row.damage_aura_damage_phase === 'before_crit'
      && row.damage_aura_source_lifecycle_policy === 'compiled_board_source_for_battle'
      && row.damage_aura_overflow_policy === 'reject_advance'
      && row.damage_aura_rng_policy === 'never'
  )), true);
  const auras = readCsv('66_bz_item_auras.csv');
  assert.deepEqual(auras.headers, [
    'aura_id', 'item_id', 'quality', 'item_skill_id', 'priority', 'target_type',
    'target_tags', 'target_exclude_self', 'operation_type', 'amount', 'catalog_status',
  ]);
  assert.deepEqual(auras.rows.map((row) => [
    row.aura_id, row.item_id, row.quality, row.item_skill_id, row.priority,
    row.target_type, row.target_tags, row.target_exclude_self,
    row.operation_type, row.amount, row.catalog_status,
  ]), [
    ['aura_mistkelp_remedy_kit_bronze_weapon_damage', 'item_mistkelp_remedy_kit', 'bronze', 'skill_mistkelp_remedy_kit', '20', 'friendly_items_with_any_tag', 'weapon', 'true', 'grant_damage', '1', 'formal'],
    ['aura_mistkelp_remedy_kit_silver_weapon_damage', 'item_mistkelp_remedy_kit', 'silver', 'skill_mistkelp_remedy_kit', '20', 'friendly_items_with_any_tag', 'weapon', 'true', 'grant_damage', '2', 'formal'],
    ['aura_mistkelp_remedy_kit_gold_weapon_damage', 'item_mistkelp_remedy_kit', 'gold', 'skill_mistkelp_remedy_kit', '20', 'friendly_items_with_any_tag', 'weapon', 'true', 'grant_damage', '3', 'formal'],
    ['aura_mistkelp_remedy_kit_diamond_weapon_damage', 'item_mistkelp_remedy_kit', 'diamond', 'skill_mistkelp_remedy_kit', '20', 'friendly_items_with_any_tag', 'weapon', 'true', 'grant_damage', '4', 'formal'],
  ]);
  const skill = readCsv('48_bz_item_skills.csv').rows.find(({ item_skill_id: id }) => (
    id === 'skill_mistkelp_remedy_kit'
  ));
  assert.equal(skill.aura_ids, auras.rows.map(({ aura_id: id }) => id).join(','));
  assert.match(skill.description_zh, /恢复生命.*武器.*伤害/);
});

test('OPCSV05 继航校炮仪四品质 Crit growth 行仅使用动态触发源和独立 bps 参数', () => {
  const effects = readCsv('47_bz_item_effects.csv').rows.filter(({ operation_type: operationType }) => (
    operationType === 'gain_crit_chance_for_fight'
  ));
  assert.deepEqual(effects.map((row) => [
    row.effect_id, row.item_id, row.quality, row.priority, row.trigger_event,
    row.condition_type, row.condition_tags, row.condition_source_relation,
    row.target_type, row.amount, row.crit_chance_bps_delta,
  ]), [
    ['effect_followwake_calibrator_bronze_crit_response', 'item_followwake_calibrator', 'bronze', '40', 'another_friendly_item_used', 'source_item_can_crit', '', 'any', 'trigger_source_item', '', '500'],
    ['effect_followwake_calibrator_silver_crit_response', 'item_followwake_calibrator', 'silver', '40', 'another_friendly_item_used', 'source_item_can_crit', '', 'any', 'trigger_source_item', '', '750'],
    ['effect_followwake_calibrator_gold_crit_response', 'item_followwake_calibrator', 'gold', '40', 'another_friendly_item_used', 'source_item_can_crit', '', 'any', 'trigger_source_item', '', '1000'],
    ['effect_followwake_calibrator_diamond_crit_response', 'item_followwake_calibrator', 'diamond', '40', 'another_friendly_item_used', 'source_item_can_crit', '', 'any', 'trigger_source_item', '', '1250'],
  ]);
  const skill = readCsv('48_bz_item_skills.csv').rows.find(({ item_skill_id: itemSkillId }) => (
    itemSkillId === 'skill_followwake_calibrator'
  ));
  assert.match(skill.description_zh, /可暴击.*本场暴击率.*后续使用/);
  for (const { effect_id: effectId } of effects) assert.match(skill.effect_ids, new RegExp(effectId));
  const offer = readCsv('50_bz_stall_offers.csv').rows.find(({ offer_id: offerId }) => (
    offerId === 'offer_refresh_2_followwake_calibrator'
  ));
  assert.deepEqual([offer.refresh_index, offer.slot_order, offer.quality, offer.price], ['2', '2', 'bronze', '4']);
});

test('OPCSV06 潮鳍投筒四品质弹药耗尽效果与 refresh 3 正式报价完整', () => {
  const effects = readCsv('47_bz_item_effects.csv').rows.filter(({ condition_type: conditionType }) => (
    conditionType === 'source_item_ammo_depleted'
  ));
  assert.deepEqual(effects.map((row) => [
    row.effect_id, row.item_id, row.quality, row.priority, row.trigger_event,
    row.condition_type, row.condition_tags, row.condition_source_relation,
    row.target_type, row.target_tags, row.target_exclude_self, row.target_count,
    row.operation_type, row.amount, row.crit_chance_bps_delta, row.stacks,
    row.can_crit, row.status, row.ticks,
  ]), [
    ['effect_tidefin_launcher_bronze_depleted_shield', 'item_tidefin_launcher', 'bronze', '10', 'item_ready', 'source_item_ammo_depleted', '', 'any', 'owner_hero', '', '', '', 'gain_shield', '2', '', '', '', '', ''],
    ['effect_tidefin_launcher_silver_depleted_shield', 'item_tidefin_launcher', 'silver', '10', 'item_ready', 'source_item_ammo_depleted', '', 'any', 'owner_hero', '', '', '', 'gain_shield', '3', '', '', '', '', ''],
    ['effect_tidefin_launcher_gold_depleted_shield', 'item_tidefin_launcher', 'gold', '10', 'item_ready', 'source_item_ammo_depleted', '', 'any', 'owner_hero', '', '', '', 'gain_shield', '5', '', '', '', '', ''],
    ['effect_tidefin_launcher_diamond_depleted_shield', 'item_tidefin_launcher', 'diamond', '10', 'item_ready', 'source_item_ammo_depleted', '', 'any', 'owner_hero', '', '', '', 'gain_shield', '7', '', '', '', '', ''],
  ]);
  const skill = readCsv('48_bz_item_skills.csv').rows.find(({ item_skill_id: itemSkillId }) => (
    itemSkillId === 'skill_tidefin_launcher'
  ));
  assert.match(skill.description_zh, /弹药耗尽.*护盾/);
  for (const { effect_id: effectId } of effects) assert.match(skill.effect_ids, new RegExp(effectId));
  const offer = readCsv('50_bz_stall_offers.csv').rows.find(({ offer_id: offerId }) => (
    offerId === 'offer_refresh_3_tidefin_launcher'
  ));
  assert.deepEqual([offer.refresh_index, offer.slot_order, offer.quality, offer.price], ['3', '1', 'bronze', '3']);
});

test('OPCSV07 尾潮回响鼓四品质只在另一件燃烧物品成功施加 Burn 后推进自身', () => {
  const effects = readCsv('47_bz_item_effects.csv').rows.filter(({ trigger_event: triggerEvent }) => (
    triggerEvent === 'another_friendly_item_applied_burn'
  ));
  assert.deepEqual(effects.map((row) => [
    row.effect_id, row.item_id, row.quality, row.item_skill_id, row.priority,
    row.trigger_event, row.condition_type, row.condition_tags,
    row.condition_source_relation, row.target_type, row.target_tags,
    row.target_exclude_self, row.target_count, row.operation_type, row.amount,
    row.crit_chance_bps_delta, row.stacks, row.can_crit, row.status, row.ticks,
  ]), [
    ['effect_wake_echo_drum_bronze_burn_response_charge', 'item_wake_echo_drum', 'bronze', 'skill_wake_echo_drum', '40', 'another_friendly_item_applied_burn', 'source_item_has_any_tag', 'burn', 'any', 'self_item', '', '', '', 'charge', '', '', '', '', '', '1'],
    ['effect_wake_echo_drum_silver_burn_response_charge', 'item_wake_echo_drum', 'silver', 'skill_wake_echo_drum', '40', 'another_friendly_item_applied_burn', 'source_item_has_any_tag', 'burn', 'any', 'self_item', '', '', '', 'charge', '', '', '', '', '', '1'],
    ['effect_wake_echo_drum_gold_burn_response_charge', 'item_wake_echo_drum', 'gold', 'skill_wake_echo_drum', '40', 'another_friendly_item_applied_burn', 'source_item_has_any_tag', 'burn', 'any', 'self_item', '', '', '', 'charge', '', '', '', '', '', '2'],
    ['effect_wake_echo_drum_diamond_burn_response_charge', 'item_wake_echo_drum', 'diamond', 'skill_wake_echo_drum', '40', 'another_friendly_item_applied_burn', 'source_item_has_any_tag', 'burn', 'any', 'self_item', '', '', '', 'charge', '', '', '', '', '', '2'],
  ]);
  const skill = readCsv('48_bz_item_skills.csv').rows.find(({ item_skill_id: itemSkillId }) => (
    itemSkillId === 'skill_wake_echo_drum'
  ));
  assert.equal(skill.trigger_events, 'another_friendly_item_applied_burn, another_friendly_item_used, item_ready');
  assert.match(skill.description_zh, /另一件.*燃烧.*成功施加.*自身.*充能/);
  for (const { effect_id: effectId } of effects) assert.match(skill.effect_ids, new RegExp(effectId));
});

test('OPCSV08 继航校炮仪四品质只在另一件友方物品成功暴击后推进自身', () => {
  const gameplay = readCsv('44_bz_gameplay.csv').rows;
  assert.equal(gameplay.every((row) => (
    row.schema_version === '30'
      && row.runtime_schema_version === '28'
      && row.rules_version === 'ysbzs.original-pirate-rules.2026-09-04-v28'
      && row.source_revision === 'original-pirate-bootstrap-source-2026-09-03-v29'
      && row.content_revision === 'original-pirate-bootstrap-content-2026-09-03-v29'
      && row.bundle_revision === 'original_pirate_bootstrap_bundle_v29'
      && row.crit_contract === 'ysbzs.original-pirate-critical-damage.v3'
      && row.crit_success_response_evidence_policy === 'crit_resolve_is_critical_with_bound_committed_damage'
      && row.crit_success_response_source_policy === 'another_same_owner_active_board_item'
      && row.crit_success_response_timing_policy === 'after_source_use_effects_in_item_response_phase'
      && row.crit_success_response_repeat_policy === 'once_per_qualifying_item_use'
      && row.crit_success_response_terminal_policy === 'skip_after_terminal'
      && row.crit_success_response_rng_policy === 'never'
  )), true);
  const effects = readCsv('47_bz_item_effects.csv').rows.filter(({ trigger_event: triggerEvent }) => (
    triggerEvent === 'another_friendly_item_crit'
  ));
  assert.deepEqual(effects.map((row) => [
    row.effect_id, row.item_id, row.quality, row.item_skill_id, row.priority,
    row.trigger_event, row.condition_type, row.condition_tags,
    row.condition_source_relation, row.target_type, row.target_tags,
    row.target_exclude_self, row.target_count, row.operation_type, row.amount,
    row.crit_chance_bps_delta, row.stacks, row.can_crit, row.status, row.ticks,
  ]), [
    ['effect_followwake_calibrator_bronze_crit_success_charge', 'item_followwake_calibrator', 'bronze', 'skill_followwake_calibrator', '50', 'another_friendly_item_crit', 'always', '', 'any', 'self_item', '', '', '', 'charge', '', '', '', '', '', '1'],
    ['effect_followwake_calibrator_silver_crit_success_charge', 'item_followwake_calibrator', 'silver', 'skill_followwake_calibrator', '50', 'another_friendly_item_crit', 'always', '', 'any', 'self_item', '', '', '', 'charge', '', '', '', '', '', '1'],
    ['effect_followwake_calibrator_gold_crit_success_charge', 'item_followwake_calibrator', 'gold', 'skill_followwake_calibrator', '50', 'another_friendly_item_crit', 'always', '', 'any', 'self_item', '', '', '', 'charge', '', '', '', '', '', '2'],
    ['effect_followwake_calibrator_diamond_crit_success_charge', 'item_followwake_calibrator', 'diamond', 'skill_followwake_calibrator', '50', 'another_friendly_item_crit', 'always', '', 'any', 'self_item', '', '', '', 'charge', '', '', '', '', '', '2'],
  ]);
  const skill = readCsv('48_bz_item_skills.csv').rows.find(({ item_skill_id: itemSkillId }) => (
    itemSkillId === 'skill_followwake_calibrator'
  ));
  assert.equal(skill.trigger_events, 'another_friendly_item_crit, another_friendly_item_used, item_ready');
  assert.match(skill.description_zh, /另一件友方物品.*成功暴击.*自身.*充能/);
  for (const { effect_id: effectId } of effects) assert.match(skill.effect_ids, new RegExp(effectId));
  const offer = readCsv('50_bz_stall_offers.csv').rows.find(({ offer_id: offerId }) => (
    offerId === 'offer_refresh_2_followwake_calibrator'
  ));
  assert.deepEqual([offer.refresh_index, offer.slot_order, offer.quality, offer.price], ['2', '2', 'bronze', '4']);
});
