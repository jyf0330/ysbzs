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

test('OPCSV01 Heal/Cleanse、Poison v2、Burn source rules 与 operation-owned stacks 严格落在 44/47', () => {
  const gameplay = readCsv('44_bz_gameplay.csv');
  const effects = readCsv('47_bz_item_effects.csv');
  assert.deepEqual(gameplay.rows.map((row) => ({
    schemaVersion: row.schema_version,
    runtimeSchemaVersion: row.runtime_schema_version,
    rulesVersion: row.rules_version,
    sourceRevision: row.source_revision,
    contentRevision: row.content_revision,
    bundleRevision: row.bundle_revision,
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
  })), Array.from({ length: 6 }, () => ({
    schemaVersion: '25',
    runtimeSchemaVersion: '23',
    rulesVersion: 'ysbzs.original-pirate-rules.2026-09-03-v23',
    sourceRevision: 'original-pirate-bootstrap-source-2026-09-03-v24',
    contentRevision: 'original-pirate-bootstrap-content-2026-09-03-v24',
    bundleRevision: 'original_pirate_bootstrap_bundle_v24',
    burnContract: 'ysbzs.original-pirate-burn.v1',
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
  })));
  assert.equal(effects.headers.includes('stacks'), true);
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
    ['ghost_d01_emberwake', 'item_emberwake_lantern', 'gold', '2'],
    ['ghost_d01_inkwake', 'item_inkwake_doser', 'bronze', '3'],
  ]);
  assert.equal(dayOneGhost.some(({ item_id: itemId }) => itemId === 'item_patchwork_ram'), false);
});
