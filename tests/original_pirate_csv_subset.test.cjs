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

test('OPCSV01 Burn v1 source rules 与独立 stacks 列严格落在 44/47', () => {
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
  })), Array.from({ length: 6 }, () => ({
    schemaVersion: '23',
    runtimeSchemaVersion: '21',
    rulesVersion: 'ysbzs.original-pirate-rules.2026-09-03-v21',
    sourceRevision: 'original-pirate-bootstrap-source-2026-09-03-v22',
    contentRevision: 'original-pirate-bootstrap-content-2026-09-03-v22',
    bundleRevision: 'original_pirate_bootstrap_bundle_v22',
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
  assert.equal(effects.rows.filter(({ operation_type: operationType }) => operationType !== 'apply_burn')
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
