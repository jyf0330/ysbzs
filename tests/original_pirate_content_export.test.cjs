const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');
const { spawnSync, execFileSync } = require('node:child_process');

const root = path.resolve(__dirname, '..');
const csvDir = path.join(root, 'data', 'csv');
const exporter = path.join(root, 'tools', 'export_original_pirate_content.py');
const masterExporter = path.join(root, 'tools', 'export_master_to_csv.py');
const workbook = path.join(root, 'xlsx', 'ysbzs_master.xlsx');
const domainFiles = [
  '44_bz_gameplay.csv', '45_bz_heroes.csv', '46_bz_items.csv',
  '47_bz_item_effects.csv', '48_bz_item_skills.csv', '49_bz_stalls.csv',
  '50_bz_stall_offers.csv', '51_bz_events.csv', '52_bz_event_options.csv',
  '53_bz_encounters.csv', '54_bz_enemies.csv', '55_bz_rewards.csv',
  '56_bz_source_snapshot.csv', '57_bz_item_upgrades.csv', '58_bz_enchantments.csv',
  '59_bz_level_up_choices.csv', '60_bz_ghost_snapshots.csv',
  '61_bz_last_chance_choices.csv', '62_bz_hero_skills.csv',
  '63_bz_hero_skill_loadouts.csv', '64_bz_hero_skill_trainers.csv',
  '65_bz_hero_skill_offers.csv',
  '66_bz_item_auras.csv',
];
const sheets = domainFiles.map((name) => `BZ_${name.replace(/^\d+_bz_|\.csv$/g, '').toUpperCase()}`);

function runExporter(dir, out, displayOut = '') {
  const args = [exporter, '--csv-dir', dir, '--out', out];
  if (displayOut) args.push('--display-out', displayOut);
  return spawnSync('python3', args, {
    cwd: root,
    encoding: 'utf8',
  });
}

function canonicalJson(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

const stableIdCompare = (left, right) => (left < right ? -1 : left > right ? 1 : 0);

function canonicalCombatBuild(build) {
  const result = structuredClone(build);
  if (result.heroSkills) result.heroSkills.sort((left, right) => (left.acquiredSeq - right.acquiredSeq)
    || stableIdCompare(left.instanceId, right.instanceId));
  result.itemInstances.sort((left, right) => stableIdCompare(left.instanceId, right.instanceId));
  result.board.placements.sort((left, right) => (left.startSlot - right.startSlot)
    || stableIdCompare(left.instanceId, right.instanceId));
  return result;
}

function expectedBuildHash(build) {
  return crypto.createHash('sha256').update(canonicalJson(canonicalCombatBuild(build))).digest('hex');
}

function expectedBundleHash(content) {
  const bundle = structuredClone(content.runtimeBundle);
  delete bundle.bundleHash;
  const items = structuredClone(content.items);
  for (const item of items) {
    if (item.tags) item.tags.sort();
    for (const profile of Object.values(item.qualityProfiles)) {
      for (const effect of profile.effects) {
        for (const condition of effect.trigger.conditions) {
          if (condition.type === 'source_item_has_any_tag' && Array.isArray(condition.params.tags)) {
            condition.params.tags.sort();
          }
        }
        if (['friendly_items_with_any_tag', 'random_friendly_item_with_any_tag'].includes(effect.target.type)
            && Array.isArray(effect.target.params.tags)) {
          effect.target.params.tags.sort();
        }
      }
      profile.effects.sort((left, right) => (left.priority - right.priority) || stableIdCompare(left.effectId, right.effectId));
      for (const aura of profile.auras) aura.target.params.tags.sort();
      profile.auras.sort((left, right) => (left.priority - right.priority) || stableIdCompare(left.auraId, right.auraId));
    }
  }
  items.sort((left, right) => stableIdCompare(left.itemId, right.itemId));
  bundle.generation.shop.templates.sort((left, right) => stableIdCompare(left.offerTemplateId, right.offerTemplateId));
  for (const layer of bundle.generation.shop.layers) layer.templateIds.sort();
  bundle.generation.shop.layers.sort((left, right) => left.fromRefreshIndex - right.fromRefreshIndex);
  for (const template of bundle.generation.battle.templates) {
    if (template.enemy) template.enemy = canonicalCombatBuild(template.enemy);
  }
  bundle.generation.battle.templates.sort((left, right) => stableIdCompare(left.encounterTemplateId, right.encounterTemplateId));
  bundle.generation.battle.ghostEncounters.sort((left, right) => stableIdCompare(left.encounterId, right.encounterId));
  for (const snapshot of bundle.generation.battle.ghostSnapshots) snapshot.build = canonicalCombatBuild(snapshot.build);
  bundle.generation.battle.ghostSnapshots.sort((left, right) => stableIdCompare(left.snapshotId, right.snapshotId));
  for (const layer of bundle.generation.battle.layers) {
    layer.pveTemplateIds.sort();
    layer.ghostEncounterIds.sort();
  }
  bundle.generation.battle.layers.sort((left, right) => left.fromDay - right.fromDay);
  bundle.scheduleConfig.hours.sort((left, right) => left.hour - right.hour);
  bundle.progressionRules.milestones.sort((left, right) => left.level - right.level);
  bundle.progressionRules.options.sort((left, right) => stableIdCompare(left.optionId, right.optionId));
  const catalogs = bundle.executableCatalogs;
  for (const hero of catalogs.heroes) {
    hero.heroSkillIds.sort();
    hero.startingHeroSkills.sort((left, right) => (left.acquiredSeq - right.acquiredSeq)
      || stableIdCompare(left.instanceId, right.instanceId));
  }
  catalogs.heroes.sort((left, right) => stableIdCompare(left.heroId, right.heroId));
  for (const skill of catalogs.itemSkills) {
    if (skill.triggerEvents) skill.triggerEvents.sort();
    skill.effectIds.sort();
    skill.auraIds.sort();
  }
  catalogs.itemSkills.sort((left, right) => stableIdCompare(left.itemSkillId, right.itemSkillId));
  for (const skill of catalogs.heroSkills) {
    for (const profile of Object.values(skill.qualityProfiles)) {
      profile.effects.sort((left, right) => stableIdCompare(left.effectId, right.effectId));
    }
  }
  catalogs.heroSkills.sort((left, right) => stableIdCompare(left.heroSkillId, right.heroSkillId));
  for (const trainer of catalogs.heroSkillTrainers) trainer.offerIds.sort();
  catalogs.heroSkillTrainers.sort((left, right) => stableIdCompare(left.trainerId, right.trainerId));
  catalogs.heroSkillOffers.sort((left, right) => stableIdCompare(left.offerId, right.offerId));
  for (const stall of catalogs.stalls) stall.shopTemplateIds.sort();
  catalogs.stalls.sort((left, right) => stableIdCompare(left.stallId, right.stallId));
  catalogs.upgrades.sort((left, right) => stableIdCompare(left.upgradeId, right.upgradeId));
  for (const enchantment of catalogs.enchantments) {
    enchantment.stallIds.sort();
    enchantment.profiles.sort((left, right) => stableIdCompare(left.itemId, right.itemId)
      || ['bronze', 'silver', 'gold', 'diamond'].indexOf(left.quality)
        - ['bronze', 'silver', 'gold', 'diamond'].indexOf(right.quality));
  }
  catalogs.enchantments.sort((left, right) => stableIdCompare(left.enchantmentId, right.enchantmentId));
  for (const event of catalogs.events) {
    event.hourSlots.sort((left, right) => left - right);
    event.optionIds.sort();
  }
  catalogs.events.sort((left, right) => stableIdCompare(left.eventId, right.eventId));
  catalogs.eventOptions.sort((left, right) => stableIdCompare(left.optionId, right.optionId));
  for (const reward of catalogs.rewards) reward.effects.sort((left, right) => stableIdCompare(canonicalJson(left), canonicalJson(right)));
  catalogs.rewards.sort((left, right) => stableIdCompare(left.rewardId, right.rewardId));
  return crypto.createHash('sha256').update(canonicalJson({
    items,
    runtimeBundle: bundle,
  })).digest('hex');
}

function validatePackageFile(file) {
  const code = `
import json, pathlib, sys
sys.path.insert(0, str(pathlib.Path(sys.argv[1]).parent))
from export_original_pirate_content import ExportError, validate_package
with open(sys.argv[2], encoding='utf-8') as stream:
    package = json.load(stream)
try:
    validate_package(package)
except ExportError as exc:
    print(str(exc), file=sys.stderr)
    raise SystemExit(1)
`;
  return spawnSync('python3', ['-c', code, exporter, file], { cwd: root, encoding: 'utf8' });
}

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
  if (field || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

function encodeCsv(rows) {
  const quote = (value) => {
    const text = String(value ?? '');
    return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };
  return `${rows.map((row) => row.map(quote).join(',')).join('\n')}\n`;
}

function mutateDomain(mutator) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'original-pirate-domains-'));
  for (const name of domainFiles) fs.copyFileSync(path.join(csvDir, name), path.join(dir, name));
  mutator(dir);
  return dir;
}

function mutateCell(dir, file, rowIndex, field, value) {
  const target = path.join(dir, file);
  const rows = parseCsv(fs.readFileSync(target, 'utf8').replace(/^\uFEFF/, ''));
  const column = rows[0].indexOf(field);
  assert.notEqual(column, -1, `${file}.${field}`);
  rows[rowIndex][column] = value;
  fs.writeFileSync(target, encodeCsv(rows), 'utf8');
}

function mutateColumn(dir, file, field, value) {
  const target = path.join(dir, file);
  const rows = parseCsv(fs.readFileSync(target, 'utf8').replace(/^\uFEFF/, ''));
  const column = rows[0].indexOf(field);
  assert.notEqual(column, -1, `${file}.${field}`);
  for (const row of rows.slice(1)) row[column] = value;
  fs.writeFileSync(target, encodeCsv(rows), 'utf8');
}

function mutateRowById(dir, file, idField, idValue, field, value) {
  const target = path.join(dir, file);
  const rows = parseCsv(fs.readFileSync(target, 'utf8').replace(/^\uFEFF/, ''));
  const idColumn = rows[0].indexOf(idField);
  const column = rows[0].indexOf(field);
  assert.notEqual(idColumn, -1, `${file}.${idField}`);
  assert.notEqual(column, -1, `${file}.${field}`);
  const row = rows.find((candidate, index) => index > 0 && candidate[idColumn] === idValue);
  assert.ok(row, `${file}.${idField}=${idValue}`);
  row[column] = value;
  fs.writeFileSync(target, encodeCsv(rows), 'utf8');
}

function appendTideglassBronzeDamage(dir, effectId, canCrit) {
  const effectPath = path.join(dir, '47_bz_item_effects.csv');
  const effectRows = parseCsv(fs.readFileSync(effectPath, 'utf8').replace(/^\uFEFF/, ''));
  const effectIdColumn = effectRows[0].indexOf('effect_id');
  const priorityColumn = effectRows[0].indexOf('priority');
  const canCritColumn = effectRows[0].indexOf('can_crit');
  const source = effectRows.find((row) => (
    row[effectIdColumn] === 'effect_tideglass_sidearm_bronze_shot'
  ));
  const extra = [...source];
  extra[effectIdColumn] = effectId;
  extra[priorityColumn] = '21';
  extra[canCritColumn] = canCrit ? 'true' : 'false';
  effectRows.push(extra);
  fs.writeFileSync(effectPath, encodeCsv(effectRows), 'utf8');

  const skillPath = path.join(dir, '48_bz_item_skills.csv');
  const skillRows = parseCsv(fs.readFileSync(skillPath, 'utf8').replace(/^\uFEFF/, ''));
  const skillIdColumn = skillRows[0].indexOf('item_skill_id');
  const effectIdsColumn = skillRows[0].indexOf('effect_ids');
  const skill = skillRows.find((row) => row[skillIdColumn] === 'skill_tideglass_sidearm');
  skill[effectIdsColumn] += `,${effectId}`;
  fs.writeFileSync(skillPath, encodeCsv(skillRows), 'utf8');
}

function appendInkwakeBronzePoison(dir) {
  const effectPath = path.join(dir, '47_bz_item_effects.csv');
  const effectRows = parseCsv(fs.readFileSync(effectPath, 'utf8').replace(/^\uFEFF/, ''));
  const effectIdColumn = effectRows[0].indexOf('effect_id');
  const priorityColumn = effectRows[0].indexOf('priority');
  const source = effectRows.find((row) => (
    row[effectIdColumn] === 'effect_inkwake_doser_bronze_poison'
  ));
  const extra = [...source];
  extra[effectIdColumn] = 'effect_inkwake_doser_bronze_second_poison';
  extra[priorityColumn] = '21';
  effectRows.push(extra);
  fs.writeFileSync(effectPath, encodeCsv(effectRows), 'utf8');

  const skillPath = path.join(dir, '48_bz_item_skills.csv');
  const skillRows = parseCsv(fs.readFileSync(skillPath, 'utf8').replace(/^\uFEFF/, ''));
  const skillIdColumn = skillRows[0].indexOf('item_skill_id');
  const effectIdsColumn = skillRows[0].indexOf('effect_ids');
  const skill = skillRows.find((row) => row[skillIdColumn] === 'skill_inkwake_doser');
  skill[effectIdsColumn] += ',effect_inkwake_doser_bronze_second_poison';
  fs.writeFileSync(skillPath, encodeCsv(skillRows), 'utf8');
}

function reverseDataRows(dir, file) {
  const target = path.join(dir, file);
  const rows = parseCsv(fs.readFileSync(target, 'utf8').replace(/^\uFEFF/, ''));
  fs.writeFileSync(target, encodeCsv([rows[0], ...rows.slice(1).reverse()]), 'utf8');
}

test('OPC01 workbook 的 23 个 original-pirate BZ 页与 CSV 可逐字重建', () => {
  const code = `
import csv, json, pathlib, sys
sys.path.insert(0, str(pathlib.Path(sys.argv[5]) / 'tools'))
from export_master_to_csv import read_sheet_rows
files = json.loads(sys.argv[2])
sheets = json.loads(sys.argv[3])
for filename, sheet in zip(files, sheets):
    with open(pathlib.Path(sys.argv[4]) / filename, encoding='utf-8-sig', newline='') as stream:
        rows = list(csv.reader(stream))
    actual = read_sheet_rows(pathlib.Path(sys.argv[1]), sheet)
    assert actual == rows, (sheet, len(actual), len(rows))
    assert not any(isinstance(value, str) and any(error in value for error in ['#REF!', '#DIV/0!', '#VALUE!', '#NAME?']) for row in actual for value in row), sheet
`;
  execFileSync('python3', ['-c', code, workbook, JSON.stringify(domainFiles), JSON.stringify(sheets), csvDir, root], {
    cwd: root,
    stdio: 'pipe',
  });
  execFileSync('python3', [masterExporter, '--check', '--original-pirate-only'], { cwd: root, stdio: 'pipe' });
});

test('OPC02 v32/v30 Burn成功响应、Ammo depletion、Crit成长、Heal/Cleanse、Poison、随机/集合/确定性目标与 Ghost 确定且 hash 兼容', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'original-pirate-output-'));
  const first = path.join(dir, 'first.json');
  const second = path.join(dir, 'second.json');
  const firstDisplay = path.join(dir, 'first.display.json');
  const secondDisplay = path.join(dir, 'second.display.json');
  assert.equal(runExporter(csvDir, first, firstDisplay).status, 0);
  assert.equal(runExporter(csvDir, second, secondDisplay).status, 0);
  assert.equal(fs.readFileSync(first, 'utf8'), fs.readFileSync(second, 'utf8'));
  assert.equal(fs.readFileSync(firstDisplay, 'utf8'), fs.readFileSync(secondDisplay, 'utf8'));
  const content = JSON.parse(fs.readFileSync(first, 'utf8'));
  const display = JSON.parse(fs.readFileSync(firstDisplay, 'utf8'));
  assert.deepEqual(Object.keys(content).sort(), [
    'contentRevision', 'contentSchema', 'gameplayId', 'items', 'qualityProfileSchema',
    'rulesVersion', 'runtimeBundle', 'schemaVersion', 'sourceRevision',
  ].sort());
  assert.equal(content.gameplayId, 'original_pirate');
  assert.equal(content.schemaVersion, 32);
  assert.equal(content.rulesVersion, 'ysbzs.original-pirate-rules.2026-09-04-v28');
  assert.equal(content.sourceRevision, 'original-pirate-bootstrap-source-2026-09-03-v29');
  assert.equal(content.contentRevision, 'original-pirate-bootstrap-content-2026-09-03-v29');
  assert.equal(content.items.length, 22);
  assert.equal(content.runtimeBundle.schemaVersion, 30);
  assert.equal(content.runtimeBundle.bundleRevision, 'original_pirate_bootstrap_bundle_v29');
  assert.deepEqual(Object.keys(content.runtimeBundle).sort(), [
    'battleRules', 'bundleHash', 'bundleRevision', 'contentRevision', 'executableCatalogs', 'generation', 'newRunTemplate',
    'progressionRules', 'rulesVersion', 'scheduleConfig', 'schema', 'schemaVersion', 'shopRules',
  ].sort());
  assert.deepEqual(content.runtimeBundle.battleRules, {
    ammoDepletionRules: {
      contractId: 'ysbzs.original-pirate-ammo-depletion.v1',
      triggerPolicy: 'current_item_use_positive_to_zero',
      evaluationPhase: 'after_ammo_spend_before_item_effects',
      snapshotPolicy: 'ammo_before_after_from_same_use',
      repeatPolicy: 'once_per_depleting_use',
      nonAmmoPolicy: 'not_eligible',
      reloadPolicy: 'later_reload_does_not_cancel',
      rngPolicy: 'never',
    },
    burnRules: {
      contractId: 'ysbzs.original-pirate-burn.v2',
      pulseIntervalTicks: 1,
      firstPulsePolicy: 'next_tick',
      pulsePhase: 'tick_start_before_item_progress',
      damagePerStack: 1,
      decayStacksPerPulse: 1,
      shieldPolicy: 'shield_first_consuming',
      resolutionOrder: 'simultaneous_sides_then_terminal',
      maxStacks: 1000000,
      stackOverflowPolicy: 'reject_advance',
    },
    critRules: {
      contractId: 'ysbzs.original-pirate-critical-damage.v3',
      chanceScaleBps: 10000,
      damageMultiplierBps: 20000,
      roundingMode: 'floor',
      rollScope: 'item_use',
      drawPolicy: 'once_if_eligible_damage_effect',
      growthStackingPolicy: 'additive_bps_per_effect',
      growthCapPolicy: 'effective_chance_capped_at_chance_scale',
      growthTimingPolicy: 'after_source_use_for_subsequent_uses',
      growthEligibleTargetPolicy: 'trigger_source_item_with_exactly_one_can_crit_item_ready_direct_damage',
      growthRngPolicy: 'never',
      successResponseEvidencePolicy: 'crit_resolve_is_critical_with_bound_committed_damage',
      successResponseSourcePolicy: 'another_same_owner_active_board_item',
      successResponseTimingPolicy: 'after_source_use_effects_in_item_response_phase',
      successResponseRepeatPolicy: 'once_per_qualifying_item_use',
      successResponseTerminalPolicy: 'skip_after_terminal',
      successResponseRngPolicy: 'never',
    },
    poisonRules: {
      contractId: 'ysbzs.original-pirate-poison.v2',
      pulseIntervalTicks: 10,
      firstPulsePolicy: 'after_full_interval',
      reapplySchedulePolicy: 'preserve_existing_due_tick',
      pulsePhase: 'tick_start_after_burn_terminal_before_item_progress',
      damagePerStack: 1,
      decayStacksPerPulse: 0,
      shieldPolicy: 'bypass_without_consuming',
      resolutionOrder: 'due_sides_snapshot_then_terminal',
      healCleansePolicy: 'delegated_to_heal_status_cleanse_rules',
      critPolicy: 'never',
      maxStacks: 1000000,
      stackOverflowPolicy: 'reject_advance',
    },
    healStatusCleanseRules: {
      contractId: 'ysbzs.original-pirate-heal-status-cleanse.v1',
      triggerPolicy: 'after_effective_heal',
      healBasis: 'applied_heal',
      cleanseScaleBps: 2500,
      roundingMode: 'floor_min_one_if_positive',
      statusTargets: ['burn', 'poison'],
      statusResolutionPolicy: 'independent_caps_from_same_snapshot',
      poisonSchedulePolicy: 'clear_due_if_zero_else_preserve',
      traceEmitPolicy: 'only_when_effective_heal_and_any_status_present',
      critPolicy: 'never',
      rngPolicy: 'never',
    },
    damageAuraRules: {
      contractId: 'ysbzs.original-pirate-damage-aura.v1',
      evaluationPolicy: 'per_damage_from_compiled_sources',
      targetSnapshotPolicy: 'battle_start_board',
      targetOrder: 'board_slot_then_instance_id',
      stackingPolicy: 'additive_per_source_effect',
      damagePhase: 'before_crit',
      sourceLifecyclePolicy: 'compiled_board_source_for_battle',
      overflowPolicy: 'reject_advance',
      rngPolicy: 'never',
    },
    terminalPressure: {
      enabled: true,
      startTick: 60,
      intervalTicks: 5,
      initialDamage: 1,
      incrementDamage: 1,
    },
  });
  const progression = content.runtimeBundle.progressionRules;
  assert.deepEqual(Object.keys(progression).sort(), [
    'enabled', 'milestones', 'options', 'schema', 'schemaVersion',
  ].sort());
  assert.deepEqual([progression.schema, progression.schemaVersion, progression.enabled], [
    'ysbzs.original-pirate-progression-rules.v1', 1, true,
  ]);
  assert.deepEqual(progression.milestones, [
    {
      milestoneId: 'milestone_level_2', level: 2, requiredXp: 4,
      optionIds: ['level_option_2_gold', 'level_option_2_item', 'level_option_2_upgrade'],
    },
    {
      milestoneId: 'milestone_level_3', level: 3, requiredXp: 8,
      optionIds: ['level_option_3_gold', 'level_option_3_item', 'level_option_3_upgrade'],
    },
    {
      milestoneId: 'milestone_level_4', level: 4, requiredXp: 12,
      optionIds: ['level_option_4_gold', 'level_option_4_item', 'level_option_4_upgrade'],
    },
  ]);
  const progressionOptionById = Object.fromEntries(progression.options.map((option) => [option.optionId, option]));
  assert.equal(progression.options.length, 9);
  assert.deepEqual(progressionOptionById.level_option_2_gold.effect, { type: 'change_gold', amount: 5 });
  assert.deepEqual(progressionOptionById.level_option_3_item.effect, {
    type: 'grant_item', itemId: 'item_storm_compass', quality: 'gold', quantity: 1, destination: 'stash',
  });
  assert.deepEqual(progressionOptionById.level_option_4_upgrade.effect, {
    type: 'upgrade_owned_item', targetRule: 'player_selected_owned_instance', steps: 1,
  });
  assert.deepEqual([...new Set(progression.options.map(({ effect }) => effect.type))].sort(), [
    'change_gold', 'grant_item', 'upgrade_owned_item',
  ]);
  assert.equal(content.runtimeBundle.newRunTemplate.phase, 'schedule');
  assert.equal(content.runtimeBundle.newRunTemplate.schemaVersion, 3);
  assert.deepEqual(content.runtimeBundle.newRunTemplate.activeNode, { nodeId: '', kind: '', rewardId: '' });
  assert.deepEqual(content.runtimeBundle.newRunTemplate.levelRewards, {
    pendingMilestoneIds: [], resolved: [],
  });
  assert.deepEqual(content.runtimeBundle.newRunTemplate.run.lastChance, {
    status: 'available', policyId: '', optionIds: [], selectedOptionId: '',
  });
  assert.equal('skillIds' in content.runtimeBundle.newRunTemplate.hero, false);
  assert.equal('ownedHeroSkills' in content.runtimeBundle.newRunTemplate, false);
  assert.deepEqual([
    content.runtimeBundle.scheduleConfig.schema,
    content.runtimeBundle.scheduleConfig.schemaVersion,
  ], ['ysbzs.original-pirate-schedule-config.v4', 4]);
  assert.equal(content.runtimeBundle.scheduleConfig.incomePayoutPolicy, 'day_advance');
  assert.deepEqual(content.runtimeBundle.scheduleConfig.hours.map(({ hour, kind }) => [hour, kind]), [
    [1, 'choice'], [2, 'choice'], [3, 'pve'], [4, 'choice'], [5, 'choice'], [6, 'ghost'],
  ]);
  assert.deepEqual(content.runtimeBundle.scheduleConfig.hours.map(({ completionXp }) => completionXp), [1, 1, 1, 1, 1, 1]);
  assert.equal(content.runtimeBundle.scheduleConfig.pveWinBonusXp, 2);
  assert.equal('prestigeLoss' in content.runtimeBundle.scheduleConfig, false);
  assert.deepEqual(content.runtimeBundle.scheduleConfig.prestigePolicy, {
    schema: 'ysbzs.original-pirate-prestige-policy.v1',
    schemaVersion: 1,
    affectedBattleKind: 'ghost',
    lossAmount: 6,
    drawAmount: 2,
  });
  assert.deepEqual(content.runtimeBundle.scheduleConfig.terminalRules, {
    winTarget: 10,
    lastChancePolicyId: 'last_chance_mistwake_v1',
  });
  assert.deepEqual(content.runtimeBundle.scheduleConfig.lastChanceRules, {
    schema: 'ysbzs.original-pirate-last-chance-rules.v1',
    schemaVersion: 1,
    policyId: 'last_chance_mistwake_v1',
    trigger: { battleKind: 'ghost', outcomes: ['draw', 'loss'], prestigeAtOrBelow: 0 },
    maxUsesPerRun: 1,
    options: [
      {
        optionId: 'last_chance_tidehold_ransom', restorePrestige: 10,
        cost: { type: 'spend_gold', amount: 12 },
      },
      {
        optionId: 'last_chance_cut_payroll', restorePrestige: 8,
        cost: { type: 'reduce_income', amount: 2 },
      },
      {
        optionId: 'last_chance_raise_torn_flag', restorePrestige: 6,
        cost: { type: 'none', amount: 0 },
      },
    ],
  });
  assert.equal('levelThresholds' in content.runtimeBundle.scheduleConfig, false);
  const generation = content.runtimeBundle.generation;
  assert.deepEqual([generation.schema, generation.schemaVersion, generation.algorithmId], [
    'ysbzs.original-pirate-generation.v1', 3, 'sha256-ranked-selection-v1',
  ]);
  assert.equal(generation.shop.offerCount, 3);
  assert.equal(generation.shop.templates.length, 33);
  assert.equal(generation.shop.layers.length, 11);
  assert.deepEqual(generation.shop.layers.at(-1), {
    fromRefreshIndex: 10,
    toRefreshIndex: null,
    templateIds: [
      'offer_refresh_10_tidescar_matchlock',
      'offer_refresh_10_patchwork_ram',
      'offer_refresh_10_storm_compass',
    ],
  });
  assert.equal(generation.shop.templates.some((template) => 'price' in template || 'frozen' in template), false);
  const generatedSource = generation.shop.templates.find(({ offerTemplateId }) => offerTemplateId === 'offer_initial_emberwake_lantern');
  assert.equal(content.items.find(({ itemId }) => itemId === generatedSource.itemId).qualityProfiles[generatedSource.quality].buyPrice, 3);
  assert.equal(generation.shop.templates.some(({ offerTemplateId }) => offerTemplateId === 'offer_initial_signal_flare'), false);
  assert.deepEqual(Object.keys(generation.battle).sort(), [
    'ghostEncounters', 'ghostSnapshots', 'layers', 'templates',
  ]);
  assert.equal(generation.battle.templates.length, 10);
  assert.equal(generation.battle.templates.every(({ rewardId }) => rewardId === 'reward_pve_patrol'), true);
  assert.equal(generation.battle.templates.every((template) => (
    assert.deepEqual(Object.keys(template).sort(), ['encounterTemplateId', 'enemy', 'rewardId']), true
  )), true);
  assert.equal(generation.battle.ghostEncounters.length, 10);
  assert.equal(generation.battle.ghostEncounters.every((encounter) => (
    assert.deepEqual(Object.keys(encounter).sort(), ['encounterId', 'rewardId', 'snapshotId']),
    encounter.rewardId === 'reward_ghost_skirmish'
  )), true);
  assert.equal(generation.battle.ghostSnapshots.length, 10);
  const ghostSnapshot = generation.battle.ghostSnapshots[0];
  assert.deepEqual(Object.keys(ghostSnapshot).sort(), [
    'build', 'buildHash', 'matchSource', 'opponentContentRevision', 'schema', 'schemaVersion', 'snapshotId',
  ].sort());
  assert.deepEqual([ghostSnapshot.schema, ghostSnapshot.schemaVersion, ghostSnapshot.matchSource], [
    'ysbzs.original-pirate-ghost-snapshot.v1', 2, 'offline_content',
  ]);
  assert.equal(ghostSnapshot.opponentContentRevision, content.contentRevision);
  assert.equal(ghostSnapshot.buildHash, expectedBuildHash(ghostSnapshot.build));
  assert.deepEqual(Object.keys(ghostSnapshot.build).sort(), ['board', 'hero', 'heroSkills', 'itemInstances']);
  assert.deepEqual(Object.keys(ghostSnapshot.build.hero).sort(), ['heroId', 'hp', 'level', 'maxHp']);
  assert.deepEqual(ghostSnapshot.build.itemInstances, [
    { instanceId: 'ghost_d01_emberwake', itemId: 'item_emberwake_lantern', quality: 'silver', enchantment: '' },
    { instanceId: 'ghost_d01_inkwake', itemId: 'item_inkwake_doser', quality: 'bronze', enchantment: '' },
  ]);
  assert.deepEqual(ghostSnapshot.build.board.placements, [
    { instanceId: 'ghost_d01_emberwake', itemId: 'item_emberwake_lantern', startSlot: 2 },
    { instanceId: 'ghost_d01_inkwake', itemId: 'item_inkwake_doser', startSlot: 3 },
  ]);
  assert.deepEqual(ghostSnapshot.build.heroSkills.map(({ heroSkillId, quality, sourceType, acquiredDay, acquiredSeq }) => ({
    heroSkillId, quality, sourceType, acquiredDay, acquiredSeq,
  })), [
    { heroSkillId: 'hero_skill_mist_salvo', quality: 'bronze', sourceType: 'offline_snapshot', acquiredDay: 1, acquiredSeq: 1 },
    { heroSkillId: 'hero_skill_tailwind_return', quality: 'bronze', sourceType: 'offline_snapshot', acquiredDay: 1, acquiredSeq: 2 },
  ]);
  assert.deepEqual(generation.battle.ghostSnapshots.at(-1).build.heroSkills.map(({ quality }) => quality), [
    'diamond', 'diamond',
  ]);
  assert.equal(generation.battle.ghostEncounters.find(({ encounterId }) => (
    encounterId === 'encounter_day_01_mirror_skiff'
  )).snapshotId, ghostSnapshot.snapshotId);
  assert.equal(generation.battle.layers.length, 10);
  assert.deepEqual(generation.battle.layers.at(-1), {
    fromDay: 10,
    toDay: null,
    pveTemplateIds: ['encounter_day_10_breakwater_patrol'],
    ghostEncounterIds: ['encounter_day_10_mirror_skiff'],
  });
  assert.equal('maxDay' in generation.battle || 'maxRefreshIndex' in generation.shop, false);
  const catalogs = content.runtimeBundle.executableCatalogs;
  assert.deepEqual(Object.keys(catalogs).sort(), [
    'enchantments', 'eventOptions', 'events', 'heroes', 'heroSkillOffers',
    'heroSkillTrainers', 'heroSkills', 'itemSkills', 'rewards', 'schema',
    'schemaVersion', 'stalls', 'upgrades',
  ].sort());
  assert.deepEqual([catalogs.schema, catalogs.schemaVersion], [
    'ysbzs.original-pirate-executable-catalogs.v1', 22,
  ]);
  assert.deepEqual([
    catalogs.heroes.length, catalogs.itemSkills.length, catalogs.heroSkills.length,
    catalogs.heroSkillTrainers.length, catalogs.heroSkillOffers.length, catalogs.stalls.length,
    catalogs.events.length, catalogs.eventOptions.length, catalogs.rewards.length,
    catalogs.upgrades.length, catalogs.enchantments.length,
  ], [1, 22, 2, 2, 7, 1, 4, 8, 8, 60, 3]);
  assert.deepEqual(Object.keys(catalogs.heroes[0]).sort(), [
    'heroId', 'heroSkillIds', 'startingHeroSkills',
  ]);
  assert.deepEqual(catalogs.heroes[0].heroSkillIds, [
    'hero_skill_mist_salvo', 'hero_skill_tailwind_return',
  ]);
  assert.deepEqual(catalogs.heroes[0].startingHeroSkills, [
    {
      instanceId: 'starter_hero_skill_mist_salvo', heroSkillId: 'hero_skill_mist_salvo',
      quality: 'bronze', sourceType: 'starting_loadout', sourceId: 'hero_mistwake_captain',
      acquiredDay: 1, acquiredSeq: 1,
    },
  ]);
  assert.deepEqual(catalogs.heroSkillTrainers, [
    {
      trainerId: 'trainer_mistwake_gunnery', heroId: 'hero_mistwake_captain',
      stallId: 'stall_mistwake', offerSlots: 1,
      offerIds: [
        'hero_skill_offer_mist_salvo_bronze_silver',
        'hero_skill_offer_mist_salvo_silver_gold',
        'hero_skill_offer_mist_salvo_gold_diamond',
      ],
    },
    {
      trainerId: 'trainer_mistwake_rigging', heroId: 'hero_mistwake_captain',
      stallId: 'stall_mistwake', offerSlots: 1,
      offerIds: [
        'hero_skill_offer_tailwind_return_learn_bronze',
        'hero_skill_offer_tailwind_return_bronze_silver',
        'hero_skill_offer_tailwind_return_silver_gold',
        'hero_skill_offer_tailwind_return_gold_diamond',
      ],
    },
  ]);
  const heroSkillOfferById = Object.fromEntries(
    catalogs.heroSkillOffers.map((offer) => [offer.offerId, offer]),
  );
  assert.deepEqual(heroSkillOfferById.hero_skill_offer_tailwind_return_learn_bronze, {
    offerId: 'hero_skill_offer_tailwind_return_learn_bronze',
    trainerId: 'trainer_mistwake_rigging', heroSkillId: 'hero_skill_tailwind_return',
    action: { type: 'learn', toQuality: 'bronze' },
    price: { currency: 'gold', amount: 5 }, availability: { fromDay: 1, toDay: 10 }, order: 1,
  });
  assert.deepEqual(heroSkillOfferById.hero_skill_offer_mist_salvo_gold_diamond, {
    offerId: 'hero_skill_offer_mist_salvo_gold_diamond',
    trainerId: 'trainer_mistwake_gunnery', heroSkillId: 'hero_skill_mist_salvo',
    action: {
      type: 'upgrade', upgradeId: 'hero_skill_upgrade_mist_salvo_gold_diamond',
      fromQuality: 'gold', toQuality: 'diamond',
    },
    price: { currency: 'gold', amount: 12 }, availability: { fromDay: 8, toDay: 10 }, order: 3,
  });
  assert.equal(catalogs.heroSkillOffers.filter(({ action }) => action.type === 'learn').length, 1);
  assert.equal(catalogs.heroSkillOffers.filter(({ action }) => action.type === 'upgrade').length, 6);
  const heroSkillById = Object.fromEntries(catalogs.heroSkills.map((skill) => [skill.heroSkillId, skill]));
  assert.deepEqual(Object.keys(heroSkillById.hero_skill_mist_salvo).sort(), [
    'heroId', 'heroSkillId', 'priority', 'qualityProfiles', 'reentrant', 'triggerEvent',
  ]);
  assert.deepEqual([
    heroSkillById.hero_skill_mist_salvo.heroId,
    heroSkillById.hero_skill_mist_salvo.priority,
    heroSkillById.hero_skill_mist_salvo.triggerEvent,
    heroSkillById.hero_skill_mist_salvo.reentrant,
  ], ['hero_mistwake_captain', 10, 'friendly_item_used', false]);
  assert.deepEqual(heroSkillById.hero_skill_mist_salvo.qualityProfiles, {
    bronze: { maxTriggersPerBattle: 1, effects: [{ effectId: 'hero_effect_mist_salvo_bronze_damage', targetType: 'opponent_hero', operationType: 'deal_damage', amount: 1, ticks: 0 }] },
    silver: { maxTriggersPerBattle: 2, effects: [{ effectId: 'hero_effect_mist_salvo_silver_damage', targetType: 'opponent_hero', operationType: 'deal_damage', amount: 1, ticks: 0 }] },
    gold: { maxTriggersPerBattle: 2, effects: [{ effectId: 'hero_effect_mist_salvo_gold_damage', targetType: 'opponent_hero', operationType: 'deal_damage', amount: 2, ticks: 0 }] },
    diamond: { maxTriggersPerBattle: 3, effects: [{ effectId: 'hero_effect_mist_salvo_diamond_damage', targetType: 'opponent_hero', operationType: 'deal_damage', amount: 2, ticks: 0 }] },
  });
  assert.deepEqual(Object.values(heroSkillById.hero_skill_tailwind_return.qualityProfiles).map((profile) => ({
    maxTriggersPerBattle: profile.maxTriggersPerBattle,
    ticks: profile.effects[0].ticks,
    amount: profile.effects[0].amount,
  })), [
    { maxTriggersPerBattle: 1, ticks: 1, amount: 0 },
    { maxTriggersPerBattle: 3, ticks: 2, amount: 0 },
    { maxTriggersPerBattle: 3, ticks: 1, amount: 0 },
    { maxTriggersPerBattle: 2, ticks: 1, amount: 0 },
  ]);
  const itemById = Object.fromEntries(content.items.map((item) => [item.itemId, item]));
  const allQualityProfiles = content.items.flatMap(({ qualityProfiles }) => Object.values(qualityProfiles));
  assert.equal(allQualityProfiles.length, 82);
  assert.equal(content.items.filter(({ itemId }) => itemId !== 'item_tideglass_sidearm')
    .every(({ qualityProfiles }) => Object.values(qualityProfiles)
      .every(({ critChanceBps }) => critChanceBps === 0)), true);
  const itemTagVocab = ['ammo', 'aquatic', 'burn', 'poison', 'relic', 'tool', 'vehicle', 'weapon'];
  assert.equal(content.items.every((item) => (
    assert.deepEqual(Object.keys(item).sort(), ['baseQuality', 'itemId', 'qualityProfiles', 'slotWidth', 'tags']),
    item.tags.length > 0 && new Set(item.tags).size === item.tags.length
      && item.tags.every((tag) => itemTagVocab.includes(tag))
      && item.tags.join(',') === [...item.tags].sort().join(',')
  )), true);
  assert.deepEqual(itemById.item_wake_echo_drum.tags, ['relic', 'weapon']);
  assert.deepEqual(itemById.item_saltwind_capstan.tags, ['tool', 'vehicle']);
  assert.deepEqual(itemById.item_tidefin_launcher.tags, ['ammo', 'aquatic']);
  assert.deepEqual(itemById.item_mistkelp_remedy_kit.tags, ['aquatic', 'tool']);
  assert.deepEqual(itemById.item_tidefold_bulwark.tags, ['relic', 'vehicle']);
  assert.deepEqual(itemById.item_homeglow_beacon.tags, ['relic', 'tool']);
  assert.deepEqual(itemById.item_tidescar_matchlock.tags, ['tool', 'weapon']);
  assert.equal(itemById.item_tidescar_matchlock.slotWidth, 2);
  assert.equal(itemById.item_tidescar_matchlock.baseQuality, 'bronze');
  assert.deepEqual(itemById.item_mistline_ratchet.tags, ['tool', 'weapon']);
  assert.equal(itemById.item_mistline_ratchet.slotWidth, 1);
  assert.equal(itemById.item_mistline_ratchet.baseQuality, 'bronze');
  const itemProfileStats = (item) => ['bronze', 'silver', 'gold', 'diamond'].map((quality) => {
    const profile = item.qualityProfiles[quality];
    return [profile.buyPrice, profile.sellPrice, profile.baseCooldownTicks,
      profile.ammo.enabled, profile.ammo.initial, profile.ammo.maximum];
  });
  assert.deepEqual(itemProfileStats(itemById.item_mistkelp_remedy_kit), [
    [4, 2, 7, false, 0, 0], [7, 3, 6, false, 0, 0],
    [10, 5, 5, false, 0, 0], [14, 7, 4, false, 0, 0],
  ]);
  assert.deepEqual(itemProfileStats(itemById.item_tidefold_bulwark), [
    [5, 2, 7, false, 0, 0], [8, 4, 6, false, 0, 0],
    [12, 6, 5, false, 0, 0], [17, 8, 4, false, 0, 0],
  ]);
  assert.deepEqual(itemProfileStats(itemById.item_homeglow_beacon), [
    [6, 3, 8, false, 0, 0], [9, 4, 7, false, 0, 0],
    [14, 7, 6, false, 0, 0], [19, 9, 5, false, 0, 0],
  ]);
  assert.deepEqual(itemProfileStats(itemById.item_tidescar_matchlock), [
    [5, 2, 7, false, 0, 0], [8, 4, 6, false, 0, 0],
    [12, 6, 5, false, 0, 0], [17, 8, 4, false, 0, 0],
  ]);
  assert.deepEqual(itemProfileStats(itemById.item_mistline_ratchet), [
    [4, 2, 7, false, 0, 0], [7, 3, 6, false, 0, 0],
    [11, 5, 5, false, 0, 0], [16, 8, 4, false, 0, 0],
  ]);
  assert.deepEqual(Object.keys(itemById.item_tidefin_launcher.qualityProfiles), [
    'bronze', 'diamond', 'gold', 'silver',
  ]);
  assert.deepEqual(
    ['bronze', 'silver', 'gold', 'diamond'].map((quality) => (
      itemById.item_tidefin_launcher.qualityProfiles[quality].ammo.enabled
    )),
    [true, true, true, true],
  );
  const profileEffectIds = content.items.flatMap(({ qualityProfiles }) => Object.values(qualityProfiles)
    .flatMap(({ effects }) => effects.map(({ effectId }) => effectId))).sort();
  const executableEffects = content.items.flatMap(({ qualityProfiles }) => Object.values(qualityProfiles)
    .flatMap(({ effects }) => effects));
  assert.equal(executableEffects.length, 160);
  const executableDamageEffects = executableEffects.filter(({ operation }) => operation.type === 'deal_damage');
  assert.equal(executableDamageEffects.every(({ operation }) => (
    typeof operation.params.canCrit === 'boolean'
  )), true);
  assert.equal(executableDamageEffects.filter(({ operation }) => operation.params.canCrit).length, 4);
  assert.equal(executableEffects.filter(({ operation }) => operation.type !== 'deal_damage')
    .every(({ operation }) => !Object.hasOwn(operation.params, 'canCrit')), true);
  assert.deepEqual([...new Set(executableEffects.map(({ operation }) => operation.type))].sort(), [
    'apply_burn', 'apply_poison', 'apply_status', 'charge', 'deal_damage', 'gain_crit_chance_for_fight',
    'gain_damage_for_fight', 'gain_shield', 'heal', 'reload',
  ]);
  assert.deepEqual([...new Set(executableEffects.map(({ target }) => target.type))].sort(), [
    'first_enemy_item', 'friendly_items_with_any_tag', 'left_adjacent_item', 'leftmost_friendly_item', 'owner_hero',
    'random_friendly_item_with_any_tag',
    'right_adjacent_item', 'rightmost_friendly_item', 'selected_enemy', 'self_item',
    'trigger_source_item',
  ]);
  assert.deepEqual([...new Set(executableEffects.filter(({ operation }) => operation.type === 'apply_status')
    .map(({ operation }) => operation.params.status))].sort(), ['freeze', 'haste', 'slow']);
  const reactiveEffects = executableEffects.filter(({ trigger }) => trigger.event === 'another_friendly_item_used');
  assert.equal(reactiveEffects.length, 28);
  assert.deepEqual([...new Set(reactiveEffects.map(({ operation }) => operation.type))].sort(), [
    'charge', 'deal_damage', 'gain_crit_chance_for_fight', 'gain_damage_for_fight', 'reload',
  ]);
  assert.equal(reactiveEffects.every(({ trigger }) => {
    const [first, second] = trigger.conditions;
    if (first.type === 'source_item_can_crit') {
      return trigger.conditions.length === 1 && Object.keys(first.params).length === 0;
    }
    return [1, 2].includes(trigger.conditions.length)
      && first.type === 'source_item_has_any_tag'
      && first.params.tags.length > 0
      && first.params.tags.join(',') === [...first.params.tags].sort().join(',')
      && (trigger.conditions.length === 1 || (
        second.type === 'source_item_adjacent_to_self'
        && Object.keys(second.params).length === 0
      ));
  }), true);
  assert.equal(reactiveEffects.filter(({ trigger }) => trigger.conditions.length === 2).length, 4);
  assert.equal(reactiveEffects.filter(({ trigger }) => (
    trigger.conditions[0].type === 'source_item_can_crit'
  )).length, 4);
  const burnResponseEffects = executableEffects.filter(({ trigger }) => (
    trigger.event === 'another_friendly_item_applied_burn'
  ));
  assert.equal(burnResponseEffects.length, 4);
  assert.equal(burnResponseEffects.every(({ trigger, target, operation }) => (
    trigger.conditions.length === 1
      && trigger.conditions[0].type === 'source_item_has_any_tag'
      && trigger.conditions[0].params.tags.length === 1
      && trigger.conditions[0].params.tags[0] === 'burn'
      && target.type === 'self_item' && Object.keys(target.params).length === 0
      && operation.type === 'charge' && operation.params.ticks > 0
  )), true);
  assert.equal(content.items.every(({ qualityProfiles }) => Object.values(qualityProfiles).every(({ effects }) => (
    effects.some(({ trigger }) => trigger.event === 'item_ready')
  ))), true);
  const tidescarProfiles = ['bronze', 'silver', 'gold', 'diamond'].map((quality) => (
    itemById.item_tidescar_matchlock.qualityProfiles[quality]
  ));
  assert.deepEqual(tidescarProfiles.map(({ effects }) => effects.map(({ priority, trigger, target, operation }) => ({
    priority,
    event: trigger.event,
    condition: trigger.conditions,
    target: target.type,
    operation: operation.type,
    amount: operation.params.amount,
  }))), [
    [
      { priority: 20, event: 'item_ready', condition: [{ type: 'always', params: {} }], target: 'selected_enemy', operation: 'deal_damage', amount: 4 },
      { priority: 30, event: 'another_friendly_item_used', condition: [{ type: 'source_item_has_any_tag', params: { tags: ['ammo'] } }], target: 'self_item', operation: 'gain_damage_for_fight', amount: 2 },
    ],
    [
      { priority: 20, event: 'item_ready', condition: [{ type: 'always', params: {} }], target: 'selected_enemy', operation: 'deal_damage', amount: 7 },
      { priority: 30, event: 'another_friendly_item_used', condition: [{ type: 'source_item_has_any_tag', params: { tags: ['ammo'] } }], target: 'self_item', operation: 'gain_damage_for_fight', amount: 3 },
    ],
    [
      { priority: 20, event: 'item_ready', condition: [{ type: 'always', params: {} }], target: 'selected_enemy', operation: 'deal_damage', amount: 11 },
      { priority: 30, event: 'another_friendly_item_used', condition: [{ type: 'source_item_has_any_tag', params: { tags: ['ammo'] } }], target: 'self_item', operation: 'gain_damage_for_fight', amount: 4 },
    ],
    [
      { priority: 20, event: 'item_ready', condition: [{ type: 'always', params: {} }], target: 'selected_enemy', operation: 'deal_damage', amount: 16 },
      { priority: 30, event: 'another_friendly_item_used', condition: [{ type: 'source_item_has_any_tag', params: { tags: ['ammo'] } }], target: 'self_item', operation: 'gain_damage_for_fight', amount: 6 },
    ],
  ]);
  const mistlineProfiles = ['bronze', 'silver', 'gold', 'diamond'].map((quality) => (
    itemById.item_mistline_ratchet.qualityProfiles[quality]
  ));
  assert.deepEqual(mistlineProfiles.map(({ effects }) => effects.map(({ priority, trigger, target, operation }) => ({
    priority,
    event: trigger.event,
    conditions: trigger.conditions,
    target: target.type,
    operation: operation.type,
    amount: operation.params.amount,
    ticks: operation.params.ticks,
  }))), [
    [
      { priority: 20, event: 'item_ready', conditions: [{ type: 'always', params: {} }], target: 'selected_enemy', operation: 'deal_damage', amount: 3, ticks: undefined },
      { priority: 30, event: 'another_friendly_item_used', conditions: [{ type: 'source_item_has_any_tag', params: { tags: ['ammo'] } }, { type: 'source_item_adjacent_to_self', params: {} }], target: 'self_item', operation: 'charge', amount: undefined, ticks: 1 },
    ],
    [
      { priority: 20, event: 'item_ready', conditions: [{ type: 'always', params: {} }], target: 'selected_enemy', operation: 'deal_damage', amount: 5, ticks: undefined },
      { priority: 30, event: 'another_friendly_item_used', conditions: [{ type: 'source_item_has_any_tag', params: { tags: ['ammo'] } }, { type: 'source_item_adjacent_to_self', params: {} }], target: 'self_item', operation: 'charge', amount: undefined, ticks: 1 },
    ],
    [
      { priority: 20, event: 'item_ready', conditions: [{ type: 'always', params: {} }], target: 'selected_enemy', operation: 'deal_damage', amount: 8, ticks: undefined },
      { priority: 30, event: 'another_friendly_item_used', conditions: [{ type: 'source_item_has_any_tag', params: { tags: ['ammo'] } }, { type: 'source_item_adjacent_to_self', params: {} }], target: 'self_item', operation: 'charge', amount: undefined, ticks: 2 },
    ],
    [
      { priority: 20, event: 'item_ready', conditions: [{ type: 'always', params: {} }], target: 'selected_enemy', operation: 'deal_damage', amount: 12, ticks: undefined },
      { priority: 30, event: 'another_friendly_item_used', conditions: [{ type: 'source_item_has_any_tag', params: { tags: ['ammo'] } }, { type: 'source_item_adjacent_to_self', params: {} }], target: 'self_item', operation: 'charge', amount: undefined, ticks: 2 },
    ],
  ]);
  const defensiveQualities = ['bronze', 'silver', 'gold', 'diamond'];
  assert.deepEqual(defensiveQualities.map((quality) => (
    itemById.item_mistkelp_remedy_kit.qualityProfiles[quality].effects.map(({ operation }) => operation.type)
  )), [['heal'], ['heal'], ['heal'], ['heal']]);
  assert.deepEqual(defensiveQualities.map((quality) => (
    itemById.item_tidefold_bulwark.qualityProfiles[quality].effects.map(({ operation }) => operation.type)
  )), [['gain_shield'], ['gain_shield'], ['gain_shield'], ['gain_shield']]);
  assert.deepEqual(defensiveQualities.map((quality) => (
    itemById.item_homeglow_beacon.qualityProfiles[quality].effects.map(({ priority, target, operation }) => ({
      priority, target: target.type, operation: operation.type, amount: operation.params.amount,
    }))
  )), [
    [{ priority: 20, target: 'owner_hero', operation: 'heal', amount: 3 }, { priority: 21, target: 'owner_hero', operation: 'gain_shield', amount: 4 }],
    [{ priority: 20, target: 'owner_hero', operation: 'heal', amount: 4 }, { priority: 21, target: 'owner_hero', operation: 'gain_shield', amount: 6 }],
    [{ priority: 20, target: 'owner_hero', operation: 'heal', amount: 6 }, { priority: 21, target: 'owner_hero', operation: 'gain_shield', amount: 9 }],
    [{ priority: 20, target: 'owner_hero', operation: 'heal', amount: 8 }, { priority: 21, target: 'owner_hero', operation: 'gain_shield', amount: 12 }],
  ]);
  const defensiveEffects = executableEffects.filter(({ operation }) => (
    ['heal', 'gain_shield'].includes(operation.type)
  ));
  assert.equal(defensiveEffects.length, 24);
  assert.equal(defensiveEffects.filter(({ trigger }) => trigger.event === 'item_ready').length, 20);
  assert.equal(defensiveEffects.every(({ trigger, target, operation }) => (
    ['item_ready', 'battle_start'].includes(trigger.event)
      && trigger.conditions.length === 1
      && ['always', 'source_item_ammo_depleted'].includes(trigger.conditions[0].type)
      && Object.keys(trigger.conditions[0].params).length === 0
      && target.type === 'owner_hero' && Object.keys(target.params).length === 0
      && Object.keys(operation.params).join(',') === 'amount' && operation.params.amount > 0
  )), true);
  assert.equal(defensiveEffects.filter(({ trigger }) => (
    trigger.conditions[0].type === 'source_item_ammo_depleted'
  )).length, 4);
  assert.equal(defensiveEffects.filter(({ trigger }) => trigger.event === 'battle_start')
    .every(({ operation }) => operation.type === 'gain_shield'), true);
  assert.equal(catalogs.itemSkills.every((skill) => (
    assert.deepEqual(Object.keys(skill).sort(), ['auraIds', 'effectIds', 'itemSkillId', 'triggerEvents']),
    skill.triggerEvents.join(',') === [...skill.triggerEvents].sort().join(',')
  )), true);
  assert.deepEqual(catalogs.itemSkills.find(({ itemSkillId }) => (
    itemSkillId === 'skill_wake_echo_drum'
  )).triggerEvents, ['another_friendly_item_applied_burn', 'another_friendly_item_used', 'item_ready']);
  assert.deepEqual(catalogs.itemSkills.find(({ itemSkillId }) => (
    itemSkillId === 'skill_tidescar_matchlock'
  )).triggerEvents, ['another_friendly_item_used', 'item_ready']);
  assert.deepEqual(catalogs.itemSkills.find(({ itemSkillId }) => (
    itemSkillId === 'skill_mistline_ratchet'
  )).triggerEvents, ['another_friendly_item_used', 'item_ready']);
  assert.deepEqual(catalogs.itemSkills.flatMap(({ effectIds }) => effectIds).sort(), profileEffectIds);
  const stall = catalogs.stalls[0];
  assert.deepEqual(Object.keys(stall).sort(), ['offerCount', 'shopTemplateIds', 'stallId']);
  assert.equal(stall.offerCount, generation.shop.offerCount);
  assert.deepEqual(stall.shopTemplateIds, generation.shop.templates.map(({ offerTemplateId }) => offerTemplateId).sort());
  assert.equal(generation.shop.layers.every(({ templateIds }) => templateIds.length === stall.offerCount
    && templateIds.every((templateId) => stall.shopTemplateIds.includes(templateId))), true);
  assert.equal(catalogs.upgrades.every((upgrade) => upgrade.stallId === 'stall_mistwake' && upgrade.price > 0), true);
  assert.equal(catalogs.upgrades.filter(({ itemId }) => [
    'item_wake_echo_drum', 'item_saltwind_capstan', 'item_tidefin_launcher',
  ].includes(itemId)).length, 9);
  assert.equal(catalogs.upgrades.filter(({ itemId }) => [
    'item_mistkelp_remedy_kit', 'item_tidefold_bulwark', 'item_homeglow_beacon',
  ].includes(itemId)).length, 9);
  assert.deepEqual(catalogs.upgrades.filter(({ itemId }) => itemId === 'item_tidescar_matchlock'), [
    { upgradeId: 'upgrade_tidescar_matchlock_bronze_silver', itemId: 'item_tidescar_matchlock', fromQuality: 'bronze', toQuality: 'silver', price: 4, stallId: 'stall_mistwake' },
    { upgradeId: 'upgrade_tidescar_matchlock_gold_diamond', itemId: 'item_tidescar_matchlock', fromQuality: 'gold', toQuality: 'diamond', price: 11, stallId: 'stall_mistwake' },
    { upgradeId: 'upgrade_tidescar_matchlock_silver_gold', itemId: 'item_tidescar_matchlock', fromQuality: 'silver', toQuality: 'gold', price: 7, stallId: 'stall_mistwake' },
  ]);
  assert.deepEqual(catalogs.upgrades.filter(({ itemId }) => itemId === 'item_mistline_ratchet'), [
    { upgradeId: 'upgrade_mistline_ratchet_bronze_silver', itemId: 'item_mistline_ratchet', fromQuality: 'bronze', toQuality: 'silver', price: 4, stallId: 'stall_mistwake' },
    { upgradeId: 'upgrade_mistline_ratchet_gold_diamond', itemId: 'item_mistline_ratchet', fromQuality: 'gold', toQuality: 'diamond', price: 10, stallId: 'stall_mistwake' },
    { upgradeId: 'upgrade_mistline_ratchet_silver_gold', itemId: 'item_mistline_ratchet', fromQuality: 'silver', toQuality: 'gold', price: 7, stallId: 'stall_mistwake' },
  ]);
  assert.deepEqual([...new Set(generation.shop.templates.filter(({ itemId }) => [
    'item_wake_echo_drum', 'item_saltwind_capstan', 'item_tidefin_launcher',
  ].includes(itemId)).map(({ itemId }) => itemId))].sort(), [
    'item_saltwind_capstan', 'item_tidefin_launcher', 'item_wake_echo_drum',
  ]);
  assert.deepEqual([...new Set(generation.shop.templates.filter(({ itemId }) => [
    'item_mistkelp_remedy_kit', 'item_tidefold_bulwark', 'item_homeglow_beacon',
  ].includes(itemId)).map(({ itemId }) => itemId))].sort(), [
    'item_homeglow_beacon', 'item_mistkelp_remedy_kit', 'item_tidefold_bulwark',
  ]);
  assert.deepEqual(generation.shop.templates.filter(({ itemId }) => [
    'item_mistkelp_remedy_kit', 'item_tidefold_bulwark', 'item_homeglow_beacon',
  ].includes(itemId)), [
    { offerTemplateId: 'offer_refresh_4_mistkelp_remedy_kit', itemId: 'item_mistkelp_remedy_kit', quality: 'bronze', enchantment: '' },
    { offerTemplateId: 'offer_refresh_5_tidefold_bulwark', itemId: 'item_tidefold_bulwark', quality: 'bronze', enchantment: '' },
    { offerTemplateId: 'offer_refresh_6_homeglow_beacon', itemId: 'item_homeglow_beacon', quality: 'bronze', enchantment: '' },
  ]);
  assert.deepEqual(generation.shop.templates.filter(({ itemId }) => itemId === 'item_tidescar_matchlock'), [
    { offerTemplateId: 'offer_refresh_10_tidescar_matchlock', itemId: 'item_tidescar_matchlock', quality: 'bronze', enchantment: '' },
  ]);
  assert.deepEqual(generation.shop.templates.filter(({ itemId }) => itemId === 'item_mistline_ratchet'), [
    { offerTemplateId: 'offer_refresh_1_mistline_ratchet', itemId: 'item_mistline_ratchet', quality: 'bronze', enchantment: '' },
  ]);
  assert.deepEqual(generation.shop.layers.find(({ fromRefreshIndex }) => fromRefreshIndex === 1).templateIds, [
    'offer_refresh_1_wake_echo_drum', 'offer_refresh_1_quadrant_linkage', 'offer_refresh_1_mistline_ratchet',
  ]);
  assert.deepEqual(generation.shop.templates.filter(({ itemId }) => itemId === 'item_abyss_bell'), [
    { offerTemplateId: 'offer_refresh_8_abyss_bell', itemId: 'item_abyss_bell', quality: 'diamond', enchantment: '' },
  ]);
  const defensiveUpgradePrices = Object.fromEntries(catalogs.upgrades.filter(({ itemId }) => [
    'item_mistkelp_remedy_kit', 'item_tidefold_bulwark', 'item_homeglow_beacon',
  ].includes(itemId)).map(({ upgradeId, price }) => [upgradeId, price]));
  assert.deepEqual(defensiveUpgradePrices, {
    upgrade_homeglow_beacon_bronze_silver: 5,
    upgrade_homeglow_beacon_gold_diamond: 12,
    upgrade_homeglow_beacon_silver_gold: 8,
    upgrade_mistkelp_remedy_kit_bronze_silver: 4,
    upgrade_mistkelp_remedy_kit_gold_diamond: 9,
    upgrade_mistkelp_remedy_kit_silver_gold: 6,
    upgrade_tidefold_bulwark_bronze_silver: 4,
    upgrade_tidefold_bulwark_gold_diamond: 11,
    upgrade_tidefold_bulwark_silver_gold: 7,
  });
  assert.deepEqual(catalogs.enchantments.map(({ enchantmentId }) => enchantmentId), [
    'enchant_breaker', 'enchant_reserve', 'enchant_tailwind',
  ]);
  const reserve = catalogs.enchantments.find(({ enchantmentId }) => enchantmentId === 'enchant_reserve');
  assert.equal(reserve.profiles.length, 12);
  assert.equal(reserve.profiles.every(({ ammoDelta, damageDelta, cooldownDeltaTicks }) => (
    ammoDelta === 1 && damageDelta === 0 && cooldownDeltaTicks === 0
  )), true);
  const tailwind = catalogs.enchantments.find(({ enchantmentId }) => enchantmentId === 'enchant_tailwind');
  const defenseItemIds = new Set([
    'item_mistkelp_remedy_kit', 'item_tidefold_bulwark', 'item_homeglow_beacon',
  ]);
  assert.equal(tailwind.profiles.filter(({ itemId }) => defenseItemIds.has(itemId)).length, 12);
  assert.equal(tailwind.profiles.filter(({ itemId }) => defenseItemIds.has(itemId)).every((profile) => (
    profile.cooldownDeltaTicks === -1 && profile.damageDelta === 0 && profile.ammoDelta === 0
  )), true);
  assert.equal(catalogs.enchantments.filter(({ enchantmentId }) => enchantmentId !== 'enchant_tailwind')
    .every(({ profiles }) => profiles.every(({ itemId }) => !defenseItemIds.has(itemId))), true);
  const tidescarTailwind = tailwind.profiles.filter(({ itemId }) => itemId === 'item_tidescar_matchlock');
  const breaker = catalogs.enchantments.find(({ enchantmentId }) => enchantmentId === 'enchant_breaker');
  const tidescarBreaker = breaker.profiles.filter(({ itemId }) => itemId === 'item_tidescar_matchlock');
  assert.deepEqual(tidescarTailwind.map(({ quality, price, cooldownDeltaTicks, damageDelta, ammoDelta }) => (
    [quality, price, cooldownDeltaTicks, damageDelta, ammoDelta]
  )), [
    ['bronze', 4, -1, 0, 0], ['silver', 6, -1, 0, 0],
    ['gold', 9, -1, 0, 0], ['diamond', 12, -1, 0, 0],
  ]);
  assert.deepEqual(tidescarBreaker.map(({ quality, price, cooldownDeltaTicks, damageDelta, ammoDelta }) => (
    [quality, price, cooldownDeltaTicks, damageDelta, ammoDelta]
  )), [
    ['bronze', 5, 0, 2, 0], ['silver', 7, 0, 3, 0],
    ['gold', 10, 0, 4, 0], ['diamond', 13, 0, 6, 0],
  ]);
  assert.equal(reserve.profiles.some(({ itemId }) => itemId === 'item_tidescar_matchlock'), false);
  const mistlineTailwind = tailwind.profiles.filter(({ itemId }) => itemId === 'item_mistline_ratchet');
  const mistlineBreaker = breaker.profiles.filter(({ itemId }) => itemId === 'item_mistline_ratchet');
  assert.deepEqual(mistlineTailwind.map(({ quality, price, cooldownDeltaTicks, damageDelta, ammoDelta }) => (
    [quality, price, cooldownDeltaTicks, damageDelta, ammoDelta]
  )), [
    ['bronze', 4, -1, 0, 0], ['silver', 6, -1, 0, 0],
    ['gold', 9, -1, 0, 0], ['diamond', 12, -1, 0, 0],
  ]);
  assert.deepEqual(mistlineBreaker.map(({ quality, price, cooldownDeltaTicks, damageDelta, ammoDelta }) => (
    [quality, price, cooldownDeltaTicks, damageDelta, ammoDelta]
  )), [
    ['bronze', 5, 0, 2, 0], ['silver', 7, 0, 3, 0],
    ['gold', 10, 0, 4, 0], ['diamond', 13, 0, 6, 0],
  ]);
  assert.equal(reserve.profiles.some(({ itemId }) => itemId === 'item_mistline_ratchet'), false);
  assert.equal(catalogs.eventOptions.every((option) => (
    assert.deepEqual(Object.keys(option).sort(), ['eventId', 'goldDelta', 'optionId', 'rewardId']), true
  )), true);
  const rewardById = Object.fromEntries(catalogs.rewards.map((reward) => [reward.rewardId, reward]));
  assert.equal(catalogs.rewards.some(({ effects }) => effects.some(({ type }) => type === 'record_level_reward')), false);
  assert.equal(catalogs.rewards.every(({ trigger }) => (
    trigger.scope === 'system' && trigger.event === 'REWARD_RESOLUTION'
  )), true);
  assert.deepEqual(rewardById.reward_signal_flare.effects[0], {
    type: 'grant_item', itemId: 'item_signal_flare', quality: 'silver', quantity: 1, destination: 'stash',
  });
  assert.equal('startSlot' in rewardById.reward_signal_flare.effects[0], false);
  assert.deepEqual(rewardById.reward_pve_patrol.effects[0], { type: 'change_gold', amount: 4 });
  assert.equal(content.runtimeBundle.bundleHash, expectedBundleHash(content));
  const identityReordered = structuredClone(content);
  for (const item of identityReordered.items) {
    item.tags.reverse();
    for (const profile of Object.values(item.qualityProfiles)) {
      for (const effect of profile.effects) {
        for (const condition of effect.trigger.conditions) {
          if (condition.type === 'source_item_has_any_tag') condition.params.tags.reverse();
        }
      }
    }
  }
  for (const skill of identityReordered.runtimeBundle.executableCatalogs.itemSkills) {
    skill.triggerEvents.reverse();
  }
  identityReordered.runtimeBundle.executableCatalogs.heroSkillTrainers.reverse();
  identityReordered.runtimeBundle.executableCatalogs.heroSkillOffers.reverse();
  for (const trainer of identityReordered.runtimeBundle.executableCatalogs.heroSkillTrainers) {
    trainer.offerIds.reverse();
  }
  for (const hero of identityReordered.runtimeBundle.executableCatalogs.heroes) {
    hero.startingHeroSkills.reverse();
  }
  assert.equal(expectedBundleHash(identityReordered), content.runtimeBundle.bundleHash);
  assert.equal(validatePackageFile(first).status, 0);

  assert.deepEqual(Object.keys(display).sort(), [
    'contentRevision', 'entries', 'gameplayId', 'schema', 'schemaVersion', 'sourceRevision',
  ].sort());
  assert.equal(display.schema, 'ysbzs.original-pirate-display-directory.v1');
  assert.equal(display.schemaVersion, 3);
  assert.equal(display.gameplayId, 'original_pirate');
  assert.equal(display.sourceRevision, 'original-pirate-bootstrap-source-2026-09-03-v29');
  assert.equal(display.contentRevision, 'original-pirate-bootstrap-content-2026-09-03-v29');
  assert.equal(display.entries.length, 121);
  assert.deepEqual(display.entries.find(({ displayId }) => displayId === 'items.item_brine_cannon'), {
    displayId: 'items.item_brine_cannon', domain: 'items', sourceId: 'item_brine_cannon',
    nameZh: '盐雾炮', descriptionZh: '',
  });
  assert.match(display.entries.find(({ displayId }) => displayId === 'events.event_driftwood_cache').descriptionZh, /潮线/);
  assert.match(display.entries.find(({ displayId }) => displayId === 'enchantments.enchant_tailwind').descriptionZh, /充能/);
  assert.deepEqual(display.entries.find(({ displayId }) => displayId === 'hero_skills.hero_skill_mist_salvo'), {
    displayId: 'hero_skills.hero_skill_mist_salvo', domain: 'hero_skills',
    sourceId: 'hero_skill_mist_salvo', nameZh: '雾线追炮',
    descriptionZh: '英雄被动：每当我方物品完成一次使用，雾航船长向敌方英雄追加追击炮火；每场触发次数与伤害由品质决定。',
  });
  assert.deepEqual(display.entries.find(({ displayId }) => (
    displayId === 'hero_skill_quality_profiles.hero_skill_mist_salvo.gold'
  )), {
    displayId: 'hero_skill_quality_profiles.hero_skill_mist_salvo.gold',
    domain: 'hero_skill_quality_profiles', sourceId: 'hero_skill_mist_salvo.gold',
    nameZh: '雾线追炮·黄金',
    descriptionZh: '每场战斗中，前两次我方物品使用后，每次对敌方英雄造成两点伤害。',
  });
  assert.deepEqual(display.entries.find(({ displayId }) => (
    displayId === 'hero_skill_trainers.trainer_mistwake_rigging'
  )), {
    displayId: 'hero_skill_trainers.trainer_mistwake_rigging',
    domain: 'hero_skill_trainers', sourceId: 'trainer_mistwake_rigging',
    nameZh: '回风索具席',
    descriptionZh: '在雾航补给舱内传授顺风回索，并提供与当前品质相邻的正式进阶。',
  });
  assert.match(display.entries.find(({ displayId }) => (
    displayId === 'hero_skill_offers.hero_skill_offer_tailwind_return_learn_bronze'
  )).descriptionZh, /学习青铜品质/);
  assert.equal(display.entries.filter(({ domain }) => domain === 'hero_skill_quality_profiles').length, 8);
  assert.equal(display.entries.some(({ domain }) => domain === 'skills'), false);
  assert.equal(display.entries.filter(({ domain }) => domain === 'item_skills').length, 22);
  assert.deepEqual(display.entries.find(({ displayId }) => displayId === 'items.item_tidefin_launcher'), {
    displayId: 'items.item_tidefin_launcher', domain: 'items', sourceId: 'item_tidefin_launcher',
    nameZh: '潮鳍投筒', descriptionZh: '',
  });
  assert.match(display.entries.find(({ displayId }) => (
    displayId === 'item_skills.skill_tidefin_launcher'
  )).descriptionZh, /水生标签.*补充弹药/);
  assert.deepEqual(display.entries.find(({ displayId }) => displayId === 'items.item_tidescar_matchlock'), {
    displayId: 'items.item_tidescar_matchlock', domain: 'items', sourceId: 'item_tidescar_matchlock',
    nameZh: '潮痕火绳枪', descriptionZh: '',
  });
  assert.match(display.entries.find(({ displayId }) => (
    displayId === 'item_skills.skill_tidescar_matchlock'
  )).descriptionZh, /弹药标签.*本场战斗增加伤害/);
  assert.deepEqual(display.entries.find(({ displayId }) => displayId === 'items.item_mistline_ratchet'), {
    displayId: 'items.item_mistline_ratchet', domain: 'items', sourceId: 'item_mistline_ratchet',
    nameZh: '雾索棘轮', descriptionZh: '',
  });
  assert.match(display.entries.find(({ displayId }) => (
    displayId === 'item_skills.skill_mistline_ratchet'
  )).descriptionZh, /相邻.*弹药标签.*推进充能/);
  assert.deepEqual(display.entries.find(({ displayId }) => displayId === 'items.item_mistkelp_remedy_kit'), {
    displayId: 'items.item_mistkelp_remedy_kit', domain: 'items', sourceId: 'item_mistkelp_remedy_kit',
    nameZh: '雾藻疗匣', descriptionZh: '',
  });
  assert.deepEqual(['item_mistkelp_remedy_kit', 'item_tidefold_bulwark', 'item_homeglow_beacon'].map((itemId) => (
    display.entries.find(({ displayId }) => displayId === `items.${itemId}`).nameZh
  )), ['雾藻疗匣', '叠潮护舷', '归辉航标']);
  assert.match(display.entries.find(({ displayId }) => (
    displayId === 'item_skills.skill_mistkelp_remedy_kit'
  )).descriptionZh, /恢复生命.*不会超过最大生命/);
  assert.match(display.entries.find(({ displayId }) => (
    displayId === 'item_skills.skill_tidefold_bulwark'
  )).descriptionZh, /护盾.*一比一抵挡直接伤害/);
  assert.match(display.entries.find(({ displayId }) => (
    displayId === 'item_skills.skill_homeglow_beacon'
  )).descriptionZh, /先.*恢复生命.*再.*护盾.*优先级/);
  assert.deepEqual(display.entries.find(({ displayId }) => displayId === 'level_up_options.level_option_2_upgrade'), {
    displayId: 'level_up_options.level_option_2_upgrade', domain: 'level_up_options',
    sourceId: 'level_option_2_upgrade', nameZh: '精调一件装备',
    descriptionZh: '选择一件自有且仍可升阶的物品，提升一个品质阶段。',
  });
  assert.deepEqual(display.entries.find(({ displayId }) => (
    displayId === 'last_chance_options.last_chance_raise_torn_flag'
  )), {
    displayId: 'last_chance_options.last_chance_raise_torn_flag', domain: 'last_chance_options',
    sourceId: 'last_chance_raise_torn_flag', nameZh: '残旗再举',
    descriptionZh: '不支付额外资源并恢复六点威望。',
  });
  assert.equal('displayDirectory' in content || 'display' in content, false);
  const source = fs.readFileSync(path.join(csvDir, '56_bz_source_snapshot.csv'), 'utf8');
  assert.match(source, /local_original/);
  assert.match(source, /原创本地内容/);
  const [effectHeaders, ...effectSourceRows] = parseCsv(
    fs.readFileSync(path.join(csvDir, '47_bz_item_effects.csv'), 'utf8').replace(/^\uFEFF/, ''),
  );
  const relationColumn = effectHeaders.indexOf('condition_source_relation');
  const itemColumn = effectHeaders.indexOf('item_id');
  const triggerColumn = effectHeaders.indexOf('trigger_event');
  const targetTagsColumn = effectHeaders.indexOf('target_tags');
  const targetExcludeSelfColumn = effectHeaders.indexOf('target_exclude_self');
  const targetCountColumn = effectHeaders.indexOf('target_count');
  const operationColumn = effectHeaders.indexOf('operation_type');
  const critChanceDeltaColumn = effectHeaders.indexOf('crit_chance_bps_delta');
  const canCritColumn = effectHeaders.indexOf('can_crit');
  assert.notEqual(relationColumn, -1);
  assert.notEqual(targetTagsColumn, -1);
  assert.notEqual(targetExcludeSelfColumn, -1);
  assert.notEqual(targetCountColumn, -1);
  assert.notEqual(critChanceDeltaColumn, -1);
  assert.notEqual(canCritColumn, -1);
  assert.equal(effectSourceRows.length, 160);
  assert.equal(effectSourceRows.filter((row) => row[relationColumn] === 'any').length, 156);
  assert.equal(effectSourceRows.filter((row) => row[targetTagsColumn] !== '').length, 8);
  assert.equal(effectSourceRows.filter((row) => row[targetExcludeSelfColumn] !== '').length, 4);
  assert.equal(effectSourceRows.filter((row) => row[targetCountColumn] !== '').length, 4);
  const sourceDamageEffects = effectSourceRows.filter((row) => row[operationColumn] === 'deal_damage');
  assert.equal(sourceDamageEffects.every((row) => ['true', 'false'].includes(row[canCritColumn])), true);
  assert.equal(sourceDamageEffects.filter((row) => row[canCritColumn] === 'true').length, 4);
  assert.equal(sourceDamageEffects.filter((row) => row[canCritColumn] === 'true')
    .every((row) => row[itemColumn] === 'item_tideglass_sidearm'), true);
  const sourceCritGrowthEffects = effectSourceRows.filter((row) => (
    row[operationColumn] === 'gain_crit_chance_for_fight'
  ));
  assert.deepEqual(sourceCritGrowthEffects.map((row) => row[critChanceDeltaColumn]), [
    '500', '750', '1000', '1250',
  ]);
  assert.equal(effectSourceRows.filter((row) => row[operationColumn] !== 'deal_damage')
    .every((row) => row[canCritColumn] === ''), true);
  const [itemHeaders, ...itemSourceRows] = parseCsv(
    fs.readFileSync(path.join(csvDir, '46_bz_items.csv'), 'utf8').replace(/^\uFEFF/, ''),
  );
  const itemIdColumn = itemHeaders.indexOf('item_id');
  const critChanceColumn = itemHeaders.indexOf('crit_chance_bps');
  assert.notEqual(critChanceColumn, -1);
  assert.equal(itemSourceRows.length, 82);
  assert.equal(itemSourceRows.filter((row) => row[itemIdColumn] !== 'item_tideglass_sidearm')
    .every((row) => row[critChanceColumn] === '0'), true);
  assert.deepEqual(itemSourceRows.filter((row) => row[itemIdColumn] === 'item_tideglass_sidearm')
    .map((row) => Number(row[critChanceColumn])), [2500, 4000, 5500, 7000]);
  const adjacentSourceRows = effectSourceRows.filter((row) => row[relationColumn] === 'adjacent');
  assert.equal(adjacentSourceRows.length, 4);
  assert.equal(adjacentSourceRows.every((row) => (
    row[itemColumn] === 'item_mistline_ratchet'
      && row[triggerColumn] === 'another_friendly_item_used'
  )), true);
});

test('OPC02A 四缆联动轮以正式逐品质效果覆盖四种确定性友方物品目标', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'original-pirate-targets-'));
  const output = path.join(dir, 'content.json');
  const displayOutput = path.join(dir, 'display.json');
  assert.equal(runExporter(csvDir, output, displayOutput).status, 0);
  const content = JSON.parse(fs.readFileSync(output, 'utf8'));
  const display = JSON.parse(fs.readFileSync(displayOutput, 'utf8'));
  assert.deepEqual([
    content.schemaVersion,
    content.runtimeBundle.schemaVersion,
    content.runtimeBundle.executableCatalogs.schemaVersion,
    content.rulesVersion,
  ], [32, 30, 22, 'ysbzs.original-pirate-rules.2026-09-04-v28']);
  const item = content.items.find(({ itemId }) => itemId === 'item_quadrant_linkage');
  assert.ok(item);
  assert.deepEqual([item.slotWidth, item.baseQuality, item.tags], [2, 'bronze', ['tool', 'vehicle']]);
  const qualities = ['bronze', 'silver', 'gold', 'diamond'];
  assert.deepEqual(qualities.map((quality) => {
    const profile = item.qualityProfiles[quality];
    return [profile.buyPrice, profile.sellPrice, profile.baseCooldownTicks,
      profile.ammo.enabled, profile.ammo.initial, profile.ammo.maximum];
  }), [
    [5, 2, 8, false, 0, 0],
    [8, 4, 7, false, 0, 0],
    [12, 6, 6, false, 0, 0],
    [17, 8, 5, false, 0, 0],
  ]);
  const targetOrder = [
    'left_adjacent_item', 'right_adjacent_item',
    'leftmost_friendly_item', 'rightmost_friendly_item',
  ];
  const chargeTicks = {
    bronze: [1, 1, 1, 1],
    silver: [1, 1, 2, 2],
    gold: [2, 2, 2, 2],
    diamond: [2, 2, 3, 3],
  };
  const damage = { bronze: 2, silver: 3, gold: 5, diamond: 7 };
  for (const quality of qualities) {
    const effects = item.qualityProfiles[quality].effects;
    assert.deepEqual(effects.map(({ priority }) => priority), [20, 30, 31, 32, 33]);
    assert.deepEqual(effects[0].target, { type: 'selected_enemy', params: {} });
    assert.deepEqual(effects[0].operation, {
      type: 'deal_damage', params: { amount: damage[quality], canCrit: false },
    });
    assert.deepEqual(effects.slice(1).map(({ trigger, target, operation }) => ({ trigger, target, operation })),
      targetOrder.map((target, index) => ({
        trigger: { event: 'item_ready', conditions: [{ type: 'always', params: {} }] },
        target: { type: target, params: {} },
        operation: { type: 'charge', params: { ticks: chargeTicks[quality][index] } },
      })));
  }
  assert.deepEqual(content.runtimeBundle.generation.shop.templates.filter(({ itemId }) => (
    itemId === 'item_quadrant_linkage'
  )), [{
    offerTemplateId: 'offer_refresh_1_quadrant_linkage',
    itemId: 'item_quadrant_linkage', quality: 'bronze', enchantment: '',
  }]);
  assert.deepEqual(content.runtimeBundle.executableCatalogs.upgrades.filter(({ itemId }) => (
    itemId === 'item_quadrant_linkage'
  )), [
    { upgradeId: 'upgrade_quadrant_linkage_bronze_silver', itemId: 'item_quadrant_linkage', fromQuality: 'bronze', toQuality: 'silver', price: 5, stallId: 'stall_mistwake' },
    { upgradeId: 'upgrade_quadrant_linkage_gold_diamond', itemId: 'item_quadrant_linkage', fromQuality: 'gold', toQuality: 'diamond', price: 11, stallId: 'stall_mistwake' },
    { upgradeId: 'upgrade_quadrant_linkage_silver_gold', itemId: 'item_quadrant_linkage', fromQuality: 'silver', toQuality: 'gold', price: 8, stallId: 'stall_mistwake' },
  ]);
  const enchantments = content.runtimeBundle.executableCatalogs.enchantments;
  assert.deepEqual(enchantments.filter(({ enchantmentId }) => ['enchant_tailwind', 'enchant_breaker'].includes(enchantmentId))
    .flatMap(({ enchantmentId, profiles }) => profiles.filter(({ itemId }) => itemId === 'item_quadrant_linkage')
      .map((profile) => [enchantmentId, profile.quality, profile.price,
        profile.cooldownDeltaTicks, profile.damageDelta, profile.ammoDelta])), [
    ['enchant_breaker', 'bronze', 5, 0, 2, 0],
    ['enchant_breaker', 'silver', 7, 0, 3, 0],
    ['enchant_breaker', 'gold', 10, 0, 4, 0],
    ['enchant_breaker', 'diamond', 13, 0, 6, 0],
    ['enchant_tailwind', 'bronze', 4, -1, 0, 0],
    ['enchant_tailwind', 'silver', 6, -1, 0, 0],
    ['enchant_tailwind', 'gold', 9, -1, 0, 0],
    ['enchant_tailwind', 'diamond', 12, -1, 0, 0],
  ]);
  assert.equal(enchantments.find(({ enchantmentId }) => enchantmentId === 'enchant_reserve')
    .profiles.some(({ itemId }) => itemId === 'item_quadrant_linkage'), false);
  assert.deepEqual(display.entries.find(({ displayId }) => displayId === 'items.item_quadrant_linkage'), {
    displayId: 'items.item_quadrant_linkage', domain: 'items', sourceId: 'item_quadrant_linkage',
    nameZh: '四缆联动轮', descriptionZh: '',
  });
  assert.match(display.entries.find(({ displayId }) => (
    displayId === 'item_skills.skill_quadrant_linkage'
  )).descriptionZh, /左邻.*右邻.*最左.*最右.*自身/);
});

test('OPC02B v32 继航校炮仪把响应伤害成长绑定到无参数动态触发源目标', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'original-pirate-trigger-source-'));
  const output = path.join(dir, 'content.json');
  const displayOutput = path.join(dir, 'display.json');
  assert.equal(runExporter(csvDir, output, displayOutput).status, 0);
  const content = JSON.parse(fs.readFileSync(output, 'utf8'));
  const display = JSON.parse(fs.readFileSync(displayOutput, 'utf8'));
  assert.deepEqual([
    content.schemaVersion,
    content.runtimeBundle.schemaVersion,
    content.runtimeBundle.executableCatalogs.schemaVersion,
    content.rulesVersion,
  ], [32, 30, 22, 'ysbzs.original-pirate-rules.2026-09-04-v28']);
  const item = content.items.find(({ itemId }) => itemId === 'item_followwake_calibrator');
  assert.ok(item);
  assert.deepEqual([item.slotWidth, item.baseQuality, item.tags], [1, 'bronze', ['relic', 'tool']]);
  const qualities = ['bronze', 'silver', 'gold', 'diamond'];
  const damage = { bronze: 1, silver: 2, gold: 3, diamond: 5 };
  const growth = { bronze: 1, silver: 2, gold: 3, diamond: 4 };
  assert.deepEqual(qualities.map((quality) => {
    const profile = item.qualityProfiles[quality];
    return [profile.buyPrice, profile.sellPrice, profile.baseCooldownTicks,
      profile.ammo.enabled, profile.ammo.initial, profile.ammo.maximum];
  }), [
    [4, 2, 9, false, 0, 0],
    [7, 3, 8, false, 0, 0],
    [11, 5, 7, false, 0, 0],
    [16, 8, 6, false, 0, 0],
  ]);
  for (const quality of qualities) {
    const effects = item.qualityProfiles[quality].effects;
    assert.deepEqual(effects.map(({ priority }) => priority), [20, 30, 40, 50]);
    assert.deepEqual(effects[0], {
      effectId: `effect_followwake_calibrator_${quality}_ready`, priority: 20,
      trigger: { event: 'item_ready', conditions: [{ type: 'always', params: {} }] },
      target: { type: 'selected_enemy', params: {} },
      operation: { type: 'deal_damage', params: { amount: damage[quality], canCrit: false } },
    });
    assert.deepEqual(effects[1], {
      effectId: `effect_followwake_calibrator_${quality}_response`, priority: 30,
      trigger: {
        event: 'another_friendly_item_used',
        conditions: [{ type: 'source_item_has_any_tag', params: { tags: ['weapon'] } }],
      },
      target: { type: 'trigger_source_item', params: {} },
      operation: { type: 'gain_damage_for_fight', params: { amount: growth[quality] } },
    });
    assert.deepEqual(effects[2].trigger, {
      event: 'another_friendly_item_used',
      conditions: [{ type: 'source_item_can_crit', params: {} }],
    });
    assert.deepEqual(effects[2].target, { type: 'trigger_source_item', params: {} });
  }
  assert.deepEqual(content.runtimeBundle.generation.shop.templates.filter(({ itemId }) => (
    itemId === 'item_followwake_calibrator'
  )), [{
    offerTemplateId: 'offer_refresh_2_followwake_calibrator',
    itemId: 'item_followwake_calibrator', quality: 'bronze', enchantment: '',
  }]);
  assert.deepEqual(content.runtimeBundle.generation.shop.layers.find(({ fromRefreshIndex }) => (
    fromRefreshIndex === 2
  )).templateIds, [
    'offer_refresh_2_saltwind_capstan',
    'offer_refresh_2_followwake_calibrator',
    'offer_refresh_2_reef_hook',
  ]);
  assert.deepEqual(content.runtimeBundle.executableCatalogs.upgrades.filter(({ itemId }) => (
    itemId === 'item_followwake_calibrator'
  )), [
    { upgradeId: 'upgrade_followwake_calibrator_bronze_silver', itemId: 'item_followwake_calibrator', fromQuality: 'bronze', toQuality: 'silver', price: 4, stallId: 'stall_mistwake' },
    { upgradeId: 'upgrade_followwake_calibrator_gold_diamond', itemId: 'item_followwake_calibrator', fromQuality: 'gold', toQuality: 'diamond', price: 10, stallId: 'stall_mistwake' },
    { upgradeId: 'upgrade_followwake_calibrator_silver_gold', itemId: 'item_followwake_calibrator', fromQuality: 'silver', toQuality: 'gold', price: 7, stallId: 'stall_mistwake' },
  ]);
  const enchantments = content.runtimeBundle.executableCatalogs.enchantments;
  assert.deepEqual(enchantments.filter(({ enchantmentId }) => ['enchant_tailwind', 'enchant_breaker'].includes(enchantmentId))
    .flatMap(({ enchantmentId, profiles }) => profiles.filter(({ itemId }) => itemId === 'item_followwake_calibrator')
      .map((profile) => [enchantmentId, profile.quality, profile.price,
        profile.cooldownDeltaTicks, profile.damageDelta, profile.ammoDelta])), [
    ['enchant_breaker', 'bronze', 5, 0, 2, 0],
    ['enchant_breaker', 'silver', 7, 0, 3, 0],
    ['enchant_breaker', 'gold', 10, 0, 4, 0],
    ['enchant_breaker', 'diamond', 13, 0, 6, 0],
    ['enchant_tailwind', 'bronze', 4, -1, 0, 0],
    ['enchant_tailwind', 'silver', 6, -1, 0, 0],
    ['enchant_tailwind', 'gold', 9, -1, 0, 0],
    ['enchant_tailwind', 'diamond', 12, -1, 0, 0],
  ]);
  assert.equal(enchantments.find(({ enchantmentId }) => enchantmentId === 'enchant_reserve')
    .profiles.some(({ itemId }) => itemId === 'item_followwake_calibrator'), false);
  assert.deepEqual(display.entries.find(({ displayId }) => displayId === 'items.item_followwake_calibrator'), {
    displayId: 'items.item_followwake_calibrator', domain: 'items', sourceId: 'item_followwake_calibrator',
    nameZh: '继航校炮仪', descriptionZh: '',
  });
  assert.match(display.entries.find(({ displayId }) => (
    displayId === 'item_skills.skill_followwake_calibrator'
  )).descriptionZh, /武器标签.*本次使用完成后.*可暴击.*本场暴击率.*后续使用/);
});

test('OPC02C 晨潮校时器逐品质只以战斗开始获得护盾并保留就绪伤害', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'original-pirate-battle-start-'));
  const output = path.join(dir, 'content.json');
  const displayOutput = path.join(dir, 'display.json');
  assert.equal(runExporter(csvDir, output, displayOutput).status, 0);
  const content = JSON.parse(fs.readFileSync(output, 'utf8'));
  const display = JSON.parse(fs.readFileSync(displayOutput, 'utf8'));
  assert.deepEqual([
    content.schemaVersion,
    content.runtimeBundle.schemaVersion,
    content.runtimeBundle.executableCatalogs.schemaVersion,
    content.rulesVersion,
  ], [32, 30, 22, 'ysbzs.original-pirate-rules.2026-09-04-v28']);
  const item = content.items.find(({ itemId }) => itemId === 'item_dawntide_timer');
  assert.ok(item);
  assert.deepEqual([item.slotWidth, item.baseQuality, item.tags], [1, 'bronze', ['relic', 'tool']]);
  const qualities = ['bronze', 'silver', 'gold', 'diamond'];
  const shield = { bronze: 3, silver: 5, gold: 8, diamond: 12 };
  const damage = { bronze: 2, silver: 3, gold: 5, diamond: 7 };
  assert.deepEqual(qualities.map((quality) => {
    const profile = item.qualityProfiles[quality];
    return [profile.buyPrice, profile.sellPrice, profile.baseCooldownTicks,
      profile.ammo.enabled, profile.ammo.initial, profile.ammo.maximum];
  }), [
    [4, 2, 9, false, 0, 0],
    [7, 3, 8, false, 0, 0],
    [11, 5, 7, false, 0, 0],
    [16, 8, 6, false, 0, 0],
  ]);
  for (const quality of qualities) {
    assert.deepEqual(item.qualityProfiles[quality].effects, [
      {
        effectId: `effect_dawntide_timer_${quality}_opening_shield`, priority: 10,
        trigger: { event: 'battle_start', conditions: [{ type: 'always', params: {} }] },
        target: { type: 'owner_hero', params: {} },
        operation: { type: 'gain_shield', params: { amount: shield[quality] } },
      },
      {
        effectId: `effect_dawntide_timer_${quality}_ready`, priority: 20,
        trigger: { event: 'item_ready', conditions: [{ type: 'always', params: {} }] },
        target: { type: 'selected_enemy', params: {} },
        operation: { type: 'deal_damage', params: { amount: damage[quality], canCrit: false } },
      },
    ]);
  }
  assert.deepEqual(content.runtimeBundle.executableCatalogs.itemSkills.find(({ itemSkillId }) => (
    itemSkillId === 'skill_dawntide_timer'
  )), {
    itemSkillId: 'skill_dawntide_timer', triggerEvents: ['battle_start', 'item_ready'],
    auraIds: [],
    effectIds: qualities.flatMap((quality) => [
      `effect_dawntide_timer_${quality}_opening_shield`,
      `effect_dawntide_timer_${quality}_ready`,
    ]).sort(),
  });
  assert.deepEqual(content.runtimeBundle.generation.shop.templates.filter(({ itemId }) => (
    itemId === 'item_dawntide_timer'
  )), [{
    offerTemplateId: 'offer_refresh_3_dawntide_timer',
    itemId: 'item_dawntide_timer', quality: 'bronze', enchantment: '',
  }]);
  assert.deepEqual(content.runtimeBundle.generation.shop.layers.find(({ fromRefreshIndex }) => (
    fromRefreshIndex === 3
  )).templateIds, [
    'offer_refresh_3_tidefin_launcher',
    'offer_refresh_3_patchwork_ram',
    'offer_refresh_3_dawntide_timer',
  ]);
  assert.deepEqual(content.runtimeBundle.executableCatalogs.upgrades.filter(({ itemId }) => (
    itemId === 'item_dawntide_timer'
  )), [
    { upgradeId: 'upgrade_dawntide_timer_bronze_silver', itemId: 'item_dawntide_timer', fromQuality: 'bronze', toQuality: 'silver', price: 4, stallId: 'stall_mistwake' },
    { upgradeId: 'upgrade_dawntide_timer_gold_diamond', itemId: 'item_dawntide_timer', fromQuality: 'gold', toQuality: 'diamond', price: 10, stallId: 'stall_mistwake' },
    { upgradeId: 'upgrade_dawntide_timer_silver_gold', itemId: 'item_dawntide_timer', fromQuality: 'silver', toQuality: 'gold', price: 7, stallId: 'stall_mistwake' },
  ]);
  const enchantments = content.runtimeBundle.executableCatalogs.enchantments;
  assert.deepEqual(enchantments.filter(({ enchantmentId }) => ['enchant_tailwind', 'enchant_breaker'].includes(enchantmentId))
    .flatMap(({ enchantmentId, profiles }) => profiles.filter(({ itemId }) => itemId === 'item_dawntide_timer')
      .map((profile) => [enchantmentId, profile.quality, profile.price,
        profile.cooldownDeltaTicks, profile.damageDelta, profile.ammoDelta])), [
    ['enchant_breaker', 'bronze', 5, 0, 2, 0],
    ['enchant_breaker', 'silver', 7, 0, 3, 0],
    ['enchant_breaker', 'gold', 10, 0, 4, 0],
    ['enchant_breaker', 'diamond', 13, 0, 6, 0],
    ['enchant_tailwind', 'bronze', 4, -1, 0, 0],
    ['enchant_tailwind', 'silver', 6, -1, 0, 0],
    ['enchant_tailwind', 'gold', 9, -1, 0, 0],
    ['enchant_tailwind', 'diamond', 12, -1, 0, 0],
  ]);
  assert.equal(enchantments.find(({ enchantmentId }) => enchantmentId === 'enchant_reserve')
    .profiles.some(({ itemId }) => itemId === 'item_dawntide_timer'), false);
  assert.deepEqual(display.entries.find(({ displayId }) => displayId === 'items.item_dawntide_timer'), {
    displayId: 'items.item_dawntide_timer', domain: 'items', sourceId: 'item_dawntide_timer',
    nameZh: '晨潮校时器', descriptionZh: '',
  });
  assert.match(display.entries.find(({ displayId }) => (
    displayId === 'item_skills.skill_dawntide_timer'
  )).descriptionZh, /战斗开始.*护盾.*就绪.*敌方船长/);
});

test('OPC02D 齐射传令台逐品质只为己方武器标签集合推进充能', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'original-pirate-friendly-tag-collection-'));
  const output = path.join(dir, 'content.json');
  const displayOutput = path.join(dir, 'display.json');
  assert.equal(runExporter(csvDir, output, displayOutput).status, 0);
  const content = JSON.parse(fs.readFileSync(output, 'utf8'));
  const display = JSON.parse(fs.readFileSync(displayOutput, 'utf8'));
  assert.deepEqual([
    content.schemaVersion,
    content.runtimeBundle.schemaVersion,
    content.runtimeBundle.executableCatalogs.schemaVersion,
    content.rulesVersion,
  ], [32, 30, 22, 'ysbzs.original-pirate-rules.2026-09-04-v28']);
  const item = content.items.find(({ itemId }) => itemId === 'item_broadside_signal_relay');
  assert.ok(item);
  assert.deepEqual([item.slotWidth, item.baseQuality, item.tags], [2, 'bronze', ['relic', 'tool']]);
  const qualities = ['bronze', 'silver', 'gold', 'diamond'];
  const ticks = { bronze: 1, silver: 1, gold: 1, diamond: 2 };
  assert.deepEqual(qualities.map((quality) => {
    const profile = item.qualityProfiles[quality];
    return [profile.buyPrice, profile.sellPrice, profile.baseCooldownTicks,
      profile.ammo.enabled, profile.ammo.initial, profile.ammo.maximum];
  }), [
    [4, 2, 9, false, 0, 0],
    [7, 3, 8, false, 0, 0],
    [11, 5, 7, false, 0, 0],
    [16, 8, 6, false, 0, 0],
  ]);
  for (const quality of qualities) {
    assert.deepEqual(item.qualityProfiles[quality].effects, [{
      effectId: `effect_broadside_signal_relay_${quality}_charge_weapons`, priority: 20,
      trigger: { event: 'item_ready', conditions: [{ type: 'always', params: {} }] },
      target: { type: 'friendly_items_with_any_tag', params: { tags: ['weapon'] } },
      operation: { type: 'charge', params: { ticks: ticks[quality] } },
    }]);
  }
  assert.deepEqual(content.runtimeBundle.executableCatalogs.itemSkills.find(({ itemSkillId }) => (
    itemSkillId === 'skill_broadside_signal_relay'
  )), {
    itemSkillId: 'skill_broadside_signal_relay', triggerEvents: ['item_ready'],
    auraIds: [],
    effectIds: qualities.map((quality) => (
      `effect_broadside_signal_relay_${quality}_charge_weapons`
    )).sort(),
  });
  assert.deepEqual(content.runtimeBundle.generation.shop.templates.filter(({ itemId }) => (
    itemId === 'item_broadside_signal_relay'
  )), [{
    offerTemplateId: 'offer_refresh_4_broadside_signal_relay',
    itemId: 'item_broadside_signal_relay', quality: 'bronze', enchantment: '',
  }]);
  assert.deepEqual(content.runtimeBundle.generation.shop.layers.find(({ fromRefreshIndex }) => (
    fromRefreshIndex === 4
  )).templateIds, [
    'offer_refresh_4_wake_echo_drum',
    'offer_refresh_4_mistkelp_remedy_kit',
    'offer_refresh_4_broadside_signal_relay',
  ]);
  assert.deepEqual(content.runtimeBundle.executableCatalogs.upgrades.filter(({ itemId }) => (
    itemId === 'item_broadside_signal_relay'
  )), [
    { upgradeId: 'upgrade_broadside_signal_relay_bronze_silver', itemId: 'item_broadside_signal_relay', fromQuality: 'bronze', toQuality: 'silver', price: 4, stallId: 'stall_mistwake' },
    { upgradeId: 'upgrade_broadside_signal_relay_gold_diamond', itemId: 'item_broadside_signal_relay', fromQuality: 'gold', toQuality: 'diamond', price: 10, stallId: 'stall_mistwake' },
    { upgradeId: 'upgrade_broadside_signal_relay_silver_gold', itemId: 'item_broadside_signal_relay', fromQuality: 'silver', toQuality: 'gold', price: 7, stallId: 'stall_mistwake' },
  ]);
  const enchantments = content.runtimeBundle.executableCatalogs.enchantments;
  assert.deepEqual(enchantments.find(({ enchantmentId }) => enchantmentId === 'enchant_tailwind')
    .profiles.filter(({ itemId }) => itemId === 'item_broadside_signal_relay')
    .map((profile) => [profile.quality, profile.price, profile.cooldownDeltaTicks,
      profile.damageDelta, profile.ammoDelta]), [
      ['bronze', 4, -1, 0, 0],
      ['silver', 6, -1, 0, 0],
      ['gold', 9, -1, 0, 0],
      ['diamond', 12, -1, 0, 0],
    ]);
  assert.equal(enchantments.filter(({ enchantmentId }) => enchantmentId !== 'enchant_tailwind')
    .some(({ profiles }) => profiles.some(({ itemId }) => itemId === 'item_broadside_signal_relay')), false);
  assert.deepEqual(display.entries.find(({ displayId }) => (
    displayId === 'items.item_broadside_signal_relay'
  )), {
    displayId: 'items.item_broadside_signal_relay', domain: 'items',
    sourceId: 'item_broadside_signal_relay', nameZh: '齐射传令台', descriptionZh: '',
  });
  assert.match(display.entries.find(({ displayId }) => (
    displayId === 'item_skills.skill_broadside_signal_relay'
  )).descriptionZh, /所有带武器标签的物品.*没有符合条件.*不生效/);
  assert.equal(validatePackageFile(output).status, 0);
});

test('OPC02E 侧风择发器逐品质随机选择一件非自身己方武器推进充能', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'original-pirate-random-friendly-item-'));
  const output = path.join(dir, 'content.json');
  const displayOutput = path.join(dir, 'display.json');
  assert.equal(runExporter(csvDir, output, displayOutput).status, 0);
  const content = JSON.parse(fs.readFileSync(output, 'utf8'));
  const display = JSON.parse(fs.readFileSync(displayOutput, 'utf8'));
  assert.deepEqual([
    content.schemaVersion,
    content.runtimeBundle.schemaVersion,
    content.runtimeBundle.executableCatalogs.schemaVersion,
    content.rulesVersion,
  ], [32, 30, 22, 'ysbzs.original-pirate-rules.2026-09-04-v28']);
  const item = content.items.find(({ itemId }) => itemId === 'item_crosswind_selector');
  assert.ok(item);
  assert.deepEqual([item.slotWidth, item.baseQuality, item.tags], [1, 'bronze', ['tool', 'weapon']]);
  const qualities = ['bronze', 'silver', 'gold', 'diamond'];
  const ticks = { bronze: 1, silver: 1, gold: 2, diamond: 2 };
  assert.deepEqual(qualities.map((quality) => {
    const profile = item.qualityProfiles[quality];
    return [profile.buyPrice, profile.sellPrice, profile.baseCooldownTicks,
      profile.ammo.enabled, profile.ammo.initial, profile.ammo.maximum];
  }), [
    [2, 1, 8, false, 0, 0],
    [5, 2, 7, false, 0, 0],
    [9, 4, 6, false, 0, 0],
    [14, 7, 5, false, 0, 0],
  ]);
  for (const quality of qualities) {
    assert.deepEqual(item.qualityProfiles[quality].effects, [{
      effectId: `effect_crosswind_selector_${quality}_charge_random_weapon`, priority: 20,
      trigger: { event: 'item_ready', conditions: [{ type: 'always', params: {} }] },
      target: {
        type: 'random_friendly_item_with_any_tag',
        params: { tags: ['weapon'], excludeSelf: true, count: 1 },
      },
      operation: { type: 'charge', params: { ticks: ticks[quality] } },
    }]);
  }
  assert.deepEqual(content.runtimeBundle.executableCatalogs.itemSkills.find(({ itemSkillId }) => (
    itemSkillId === 'skill_crosswind_selector'
  )), {
    itemSkillId: 'skill_crosswind_selector', triggerEvents: ['item_ready'],
    auraIds: [],
    effectIds: qualities.map((quality) => (
      `effect_crosswind_selector_${quality}_charge_random_weapon`
    )).sort(),
  });
  assert.deepEqual(content.runtimeBundle.generation.shop.templates.filter(({ itemId }) => (
    itemId === 'item_crosswind_selector'
  )), [{
    offerTemplateId: 'offer_refresh_5_crosswind_selector',
    itemId: 'item_crosswind_selector', quality: 'bronze', enchantment: '',
  }]);
  const refreshFiveLayer = content.runtimeBundle.generation.shop.layers.find(({ fromRefreshIndex }) => (
    fromRefreshIndex === 5
  ));
  assert.deepEqual([
    refreshFiveLayer.fromRefreshIndex, refreshFiveLayer.toRefreshIndex,
    refreshFiveLayer.templateIds.length,
  ], [5, 5, 3]);
  assert.deepEqual([...refreshFiveLayer.templateIds].sort(), [
    'offer_refresh_5_inkwake_doser',
    'offer_refresh_5_tidefold_bulwark',
    'offer_refresh_5_crosswind_selector',
  ].sort());
  assert.equal(content.runtimeBundle.newRunTemplate.economy.gold, 12);
  assert.equal(content.runtimeBundle.shopRules.refreshCost, 2);
  assert.equal(12 - 5 * content.runtimeBundle.shopRules.refreshCost - 2, 0);
  assert.deepEqual(content.runtimeBundle.executableCatalogs.upgrades.filter(({ itemId }) => (
    itemId === 'item_crosswind_selector'
  )), [
    { upgradeId: 'upgrade_crosswind_selector_bronze_silver', itemId: 'item_crosswind_selector', fromQuality: 'bronze', toQuality: 'silver', price: 3, stallId: 'stall_mistwake' },
    { upgradeId: 'upgrade_crosswind_selector_gold_diamond', itemId: 'item_crosswind_selector', fromQuality: 'gold', toQuality: 'diamond', price: 10, stallId: 'stall_mistwake' },
    { upgradeId: 'upgrade_crosswind_selector_silver_gold', itemId: 'item_crosswind_selector', fromQuality: 'silver', toQuality: 'gold', price: 6, stallId: 'stall_mistwake' },
  ]);
  const enchantments = content.runtimeBundle.executableCatalogs.enchantments;
  assert.deepEqual(enchantments.find(({ enchantmentId }) => enchantmentId === 'enchant_tailwind')
    .profiles.filter(({ itemId }) => itemId === 'item_crosswind_selector')
    .map((profile) => [profile.quality, profile.price, profile.cooldownDeltaTicks,
      profile.damageDelta, profile.ammoDelta]), [
      ['bronze', 4, -1, 0, 0],
      ['silver', 6, -1, 0, 0],
      ['gold', 9, -1, 0, 0],
      ['diamond', 12, -1, 0, 0],
    ]);
  assert.equal(enchantments.filter(({ enchantmentId }) => enchantmentId !== 'enchant_tailwind')
    .some(({ profiles }) => profiles.some(({ itemId }) => itemId === 'item_crosswind_selector')), false);
  assert.deepEqual(display.entries.find(({ displayId }) => (
    displayId === 'items.item_crosswind_selector'
  )), {
    displayId: 'items.item_crosswind_selector', domain: 'items',
    sourceId: 'item_crosswind_selector', nameZh: '侧风择发器', descriptionZh: '',
  });
  assert.match(display.entries.find(({ displayId }) => (
    displayId === 'item_skills.skill_crosswind_selector'
  )).descriptionZh, /随机选择一件.*除自身外.*武器标签.*没有符合条件.*不生效/);
  assert.equal(validatePackageFile(output).status, 0);
});

test('OPC02F 随机单目标显式 canonical excludeSelf false 可经 CSV 导出并通过包校验', () => {
  const dir = mutateDomain((domainDir) => (
    mutateRowById(domainDir, '47_bz_item_effects.csv', 'effect_id',
      'effect_crosswind_selector_bronze_charge_random_weapon', 'target_exclude_self', 'false')
  ));
  const output = path.join(dir, 'exclude-self-false.json');
  assert.equal(runExporter(dir, output).status, 0);
  const content = JSON.parse(fs.readFileSync(output, 'utf8'));
  assert.equal(content.items.find(({ itemId }) => itemId === 'item_crosswind_selector')
    .qualityProfiles.bronze.effects[0].target.params.excludeSelf, false);
  assert.equal(validatePackageFile(output).status, 0);
});

test('OPC02G v32 潮镜短铳以品质暴击率和伤害效果资格共用唯一 Crit v3 合同', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'original-pirate-critical-damage-'));
  const output = path.join(dir, 'content.json');
  const displayOutput = path.join(dir, 'display.json');
  assert.equal(runExporter(csvDir, output, displayOutput).status, 0);
  const content = JSON.parse(fs.readFileSync(output, 'utf8'));
  const display = JSON.parse(fs.readFileSync(displayOutput, 'utf8'));
  assert.deepEqual([
    content.schemaVersion,
    content.runtimeBundle.schemaVersion,
    content.runtimeBundle.executableCatalogs.schemaVersion,
    content.rulesVersion,
  ], [32, 30, 22, 'ysbzs.original-pirate-rules.2026-09-04-v28']);
  assert.deepEqual(content.runtimeBundle.battleRules.critRules, {
    contractId: 'ysbzs.original-pirate-critical-damage.v3',
    chanceScaleBps: 10000,
    damageMultiplierBps: 20000,
    roundingMode: 'floor',
    rollScope: 'item_use',
    drawPolicy: 'once_if_eligible_damage_effect',
    growthStackingPolicy: 'additive_bps_per_effect',
    growthCapPolicy: 'effective_chance_capped_at_chance_scale',
    growthTimingPolicy: 'after_source_use_for_subsequent_uses',
    growthEligibleTargetPolicy: 'trigger_source_item_with_exactly_one_can_crit_item_ready_direct_damage',
    growthRngPolicy: 'never',
    successResponseEvidencePolicy: 'crit_resolve_is_critical_with_bound_committed_damage',
    successResponseSourcePolicy: 'another_same_owner_active_board_item',
    successResponseTimingPolicy: 'after_source_use_effects_in_item_response_phase',
    successResponseRepeatPolicy: 'once_per_qualifying_item_use',
    successResponseTerminalPolicy: 'skip_after_terminal',
    successResponseRngPolicy: 'never',
  });

  const item = content.items.find(({ itemId }) => itemId === 'item_tideglass_sidearm');
  assert.ok(item);
  assert.deepEqual([item.slotWidth, item.baseQuality, item.tags], [1, 'bronze', ['tool', 'weapon']]);
  const qualities = ['bronze', 'silver', 'gold', 'diamond'];
  const profiles = {
    bronze: [4, 2, 5, 2500, 2],
    silver: [7, 3, 4, 4000, 3],
    gold: [11, 5, 3, 5500, 5],
    diamond: [16, 8, 2, 7000, 7],
  };
  for (const quality of qualities) {
    const profile = item.qualityProfiles[quality];
    const [buyPrice, sellPrice, cooldown, critChanceBps, damage] = profiles[quality];
    assert.deepEqual([
      profile.buyPrice, profile.sellPrice, profile.baseCooldownTicks,
      profile.critChanceBps, profile.ammo.enabled, profile.ammo.initial, profile.ammo.maximum,
    ], [buyPrice, sellPrice, cooldown, critChanceBps, false, 0, 0]);
    assert.deepEqual(profile.effects, [{
      effectId: `effect_tideglass_sidearm_${quality}_shot`, priority: 20,
      trigger: { event: 'item_ready', conditions: [{ type: 'always', params: {} }] },
      target: { type: 'selected_enemy', params: {} },
      operation: { type: 'deal_damage', params: { amount: damage, canCrit: true } },
    }]);
  }
  assert.deepEqual(content.runtimeBundle.executableCatalogs.itemSkills.find(({ itemSkillId }) => (
    itemSkillId === 'skill_tideglass_sidearm'
  )), {
    itemSkillId: 'skill_tideglass_sidearm', triggerEvents: ['item_ready'],
    auraIds: [],
    effectIds: qualities.map((quality) => `effect_tideglass_sidearm_${quality}_shot`).sort(),
  });
  assert.deepEqual(content.runtimeBundle.generation.shop.templates.filter(({ itemId }) => (
    itemId === 'item_tideglass_sidearm'
  )), [{
    offerTemplateId: 'offer_initial_tideglass_sidearm',
    itemId: 'item_tideglass_sidearm', quality: 'bronze', enchantment: '',
  }]);
  assert.equal(content.runtimeBundle.generation.shop.templates.some(({ offerTemplateId }) => (
    offerTemplateId === 'offer_initial_patchwork_ram'
  )), false);
  assert.equal(content.runtimeBundle.newRunTemplate.economy.gold - 4, 8);

  assert.deepEqual(content.runtimeBundle.executableCatalogs.upgrades.filter(({ itemId }) => (
    itemId === 'item_tideglass_sidearm'
  )), [
    { upgradeId: 'upgrade_tideglass_sidearm_bronze_silver', itemId: 'item_tideglass_sidearm', fromQuality: 'bronze', toQuality: 'silver', price: 4, stallId: 'stall_mistwake' },
    { upgradeId: 'upgrade_tideglass_sidearm_gold_diamond', itemId: 'item_tideglass_sidearm', fromQuality: 'gold', toQuality: 'diamond', price: 10, stallId: 'stall_mistwake' },
    { upgradeId: 'upgrade_tideglass_sidearm_silver_gold', itemId: 'item_tideglass_sidearm', fromQuality: 'silver', toQuality: 'gold', price: 7, stallId: 'stall_mistwake' },
  ]);
  const enchantments = content.runtimeBundle.executableCatalogs.enchantments;
  assert.deepEqual(enchantments.filter(({ enchantmentId }) => (
    ['enchant_tailwind', 'enchant_breaker'].includes(enchantmentId)
  )).flatMap(({ enchantmentId, profiles: enchantmentProfiles }) => (
    enchantmentProfiles.filter(({ itemId }) => itemId === 'item_tideglass_sidearm')
      .map((profile) => [enchantmentId, profile.quality, profile.price,
        profile.cooldownDeltaTicks, profile.damageDelta, profile.ammoDelta])
  )), [
    ['enchant_breaker', 'bronze', 5, 0, 2, 0],
    ['enchant_breaker', 'silver', 7, 0, 3, 0],
    ['enchant_breaker', 'gold', 10, 0, 4, 0],
    ['enchant_breaker', 'diamond', 13, 0, 6, 0],
    ['enchant_tailwind', 'bronze', 4, -1, 0, 0],
    ['enchant_tailwind', 'silver', 6, -1, 0, 0],
    ['enchant_tailwind', 'gold', 9, -1, 0, 0],
    ['enchant_tailwind', 'diamond', 12, -1, 0, 0],
  ]);
  assert.equal(enchantments.find(({ enchantmentId }) => enchantmentId === 'enchant_reserve')
    .profiles.some(({ itemId }) => itemId === 'item_tideglass_sidearm'), false);
  assert.deepEqual(display.entries.find(({ displayId }) => (
    displayId === 'items.item_tideglass_sidearm'
  )), {
    displayId: 'items.item_tideglass_sidearm', domain: 'items',
    sourceId: 'item_tideglass_sidearm', nameZh: '潮镜短铳', descriptionZh: '',
  });
  assert.match(display.entries.find(({ displayId }) => (
    displayId === 'item_skills.skill_tideglass_sidearm'
  )).descriptionZh, /25%.*40%.*55%.*70%.*暴击.*两倍/);
  assert.equal(validatePackageFile(output).status, 0);
});

test('OPC02H Crit chance basis-points 满值 10000 可显式导出并通过包校验', () => {
  const dir = mutateDomain((domainDir) => (
    mutateCell(domainDir, '46_bz_items.csv', 74, 'crit_chance_bps', '10000')
  ));
  const output = path.join(dir, 'crit-full-scale.json');
  assert.equal(runExporter(dir, output).status, 0);
  const content = JSON.parse(fs.readFileSync(output, 'utf8'));
  assert.equal(content.items.find(({ itemId }) => itemId === 'item_tideglass_sidearm')
    .qualityProfiles.diamond.critChanceBps, 10000);
  assert.equal(validatePackageFile(output).status, 0);
});

test('OPC02I Crit 伤害倍率在合法范围内可随正式内容迁移', () => {
  const dir = mutateDomain((domainDir) => (
    mutateColumn(domainDir, '44_bz_gameplay.csv', 'damage_multiplier_bps', '15000')
  ));
  const output = path.join(dir, 'crit-multiplier-migration.json');
  assert.equal(runExporter(dir, output).status, 0);
  const content = JSON.parse(fs.readFileSync(output, 'utf8'));
  assert.equal(content.runtimeBundle.battleRules.critRules.damageMultiplierBps, 15000);
  assert.equal(validatePackageFile(output).status, 0);
});

test('OPC02J Crit authored damage 接受与 Godot 一致的最大安全整数', () => {
  const dir = mutateDomain((domainDir) => (
    mutateRowById(domainDir, '47_bz_item_effects.csv', 'effect_id',
      'effect_tideglass_sidearm_bronze_shot', 'amount', '922337203685477580')
  ));
  const output = path.join(dir, 'crit-damage-max.json');
  assert.equal(runExporter(dir, output).status, 0);
  const content = JSON.parse(fs.readFileSync(output, 'utf8'));
  assert.equal(content.items.find(({ itemId }) => itemId === 'item_tideglass_sidearm')
    .qualityProfiles.bronze.effects[0].operation.params.amount, 922337203685477580);
  assert.match(fs.readFileSync(output, 'utf8'), /"amount":922337203685477580/);
  assert.equal(validatePackageFile(output).status, 0);
});

test('OPC02K 0% profile 保留显式 eligible damage 并继续由运行时消费 draw', () => {
  const dir = mutateDomain((domainDir) => (
    mutateCell(domainDir, '46_bz_items.csv', 71, 'crit_chance_bps', '0')
  ));
  const output = path.join(dir, 'zero-percent-eligible-crit.json');
  assert.equal(runExporter(dir, output).status, 0);
  const content = JSON.parse(fs.readFileSync(output, 'utf8'));
  const profile = content.items.find(({ itemId }) => itemId === 'item_tideglass_sidearm')
    .qualityProfiles.bronze;
  assert.equal(profile.critChanceBps, 0);
  assert.equal(profile.effects.length, 1);
  assert.equal(profile.effects[0].operation.params.canCrit, true);
  assert.equal(validatePackageFile(output).status, 0);
});

test('OPC02L v32 烬航灯逐品质只以就绪效果向敌方英雄施加项目原创 Burn v2', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'original-pirate-burn-'));
  const output = path.join(dir, 'content.json');
  const displayOutput = path.join(dir, 'display.json');
  assert.equal(runExporter(csvDir, output, displayOutput).status, 0);
  const content = JSON.parse(fs.readFileSync(output, 'utf8'));
  const display = JSON.parse(fs.readFileSync(displayOutput, 'utf8'));
  assert.deepEqual([
    content.schemaVersion,
    content.runtimeBundle.schemaVersion,
    content.runtimeBundle.executableCatalogs.schemaVersion,
    content.rulesVersion,
  ], [32, 30, 22, 'ysbzs.original-pirate-rules.2026-09-04-v28']);
  assert.deepEqual(content.runtimeBundle.battleRules.burnRules, {
    contractId: 'ysbzs.original-pirate-burn.v2',
    pulseIntervalTicks: 1,
    firstPulsePolicy: 'next_tick',
    pulsePhase: 'tick_start_before_item_progress',
    damagePerStack: 1,
    decayStacksPerPulse: 1,
    shieldPolicy: 'shield_first_consuming',
    resolutionOrder: 'simultaneous_sides_then_terminal',
    maxStacks: 1000000,
    stackOverflowPolicy: 'reject_advance',
  });

  const item = content.items.find(({ itemId }) => itemId === 'item_emberwake_lantern');
  assert.ok(item);
  assert.deepEqual([item.slotWidth, item.baseQuality, item.tags], [1, 'bronze', ['burn', 'relic', 'tool']]);
  const profiles = {
    bronze: [3, 1, 9, 3],
    silver: [5, 2, 8, 5],
    gold: [8, 4, 7, 8],
    diamond: [12, 6, 6, 12],
  };
  for (const [quality, [buyPrice, sellPrice, cooldown, stacks]] of Object.entries(profiles)) {
    const profile = item.qualityProfiles[quality];
    assert.deepEqual([
      profile.buyPrice, profile.sellPrice, profile.baseCooldownTicks,
      profile.critChanceBps, profile.ammo.enabled, profile.ammo.initial, profile.ammo.maximum,
    ], [buyPrice, sellPrice, cooldown, 0, false, 0, 0]);
    assert.deepEqual(profile.effects, [{
      effectId: `effect_emberwake_lantern_${quality}_burn`, priority: 20,
      trigger: { event: 'item_ready', conditions: [{ type: 'always', params: {} }] },
      target: { type: 'selected_enemy', params: {} },
      operation: { type: 'apply_burn', params: { stacks } },
    }]);
  }
  assert.deepEqual(content.runtimeBundle.executableCatalogs.itemSkills.find(({ itemSkillId }) => (
    itemSkillId === 'skill_emberwake_lantern'
  )), {
    itemSkillId: 'skill_emberwake_lantern', triggerEvents: ['item_ready'],
    auraIds: [],
    effectIds: Object.keys(profiles).map((quality) => `effect_emberwake_lantern_${quality}_burn`).sort(),
  });
  assert.deepEqual(content.runtimeBundle.generation.shop.templates.filter(({ itemId }) => (
    itemId === 'item_emberwake_lantern'
  )), [{
    offerTemplateId: 'offer_initial_emberwake_lantern',
    itemId: 'item_emberwake_lantern', quality: 'bronze', enchantment: '',
  }]);
  assert.equal(content.runtimeBundle.generation.shop.templates.some(({ offerTemplateId }) => (
    offerTemplateId === 'offer_initial_signal_flare'
  )), false);
  assert.equal(content.runtimeBundle.newRunTemplate.economy.gold - 3, 9);
  assert.deepEqual(content.runtimeBundle.executableCatalogs.upgrades.filter(({ itemId }) => (
    itemId === 'item_emberwake_lantern'
  )), [
    { upgradeId: 'upgrade_emberwake_lantern_bronze_silver', itemId: 'item_emberwake_lantern', fromQuality: 'bronze', toQuality: 'silver', price: 4, stallId: 'stall_mistwake' },
    { upgradeId: 'upgrade_emberwake_lantern_gold_diamond', itemId: 'item_emberwake_lantern', fromQuality: 'gold', toQuality: 'diamond', price: 10, stallId: 'stall_mistwake' },
    { upgradeId: 'upgrade_emberwake_lantern_silver_gold', itemId: 'item_emberwake_lantern', fromQuality: 'silver', toQuality: 'gold', price: 7, stallId: 'stall_mistwake' },
  ]);
  const enchantments = content.runtimeBundle.executableCatalogs.enchantments;
  assert.deepEqual(enchantments.find(({ enchantmentId }) => enchantmentId === 'enchant_tailwind')
    .profiles.filter(({ itemId }) => itemId === 'item_emberwake_lantern')
    .map(({ quality, price, cooldownDeltaTicks, damageDelta, ammoDelta }) => (
      [quality, price, cooldownDeltaTicks, damageDelta, ammoDelta]
    )), [
    ['bronze', 4, -1, 0, 0], ['silver', 6, -1, 0, 0],
    ['gold', 9, -1, 0, 0], ['diamond', 12, -1, 0, 0],
  ]);
  assert.equal(enchantments.filter(({ enchantmentId }) => enchantmentId !== 'enchant_tailwind')
    .some(({ profiles: values }) => values.some(({ itemId }) => itemId === 'item_emberwake_lantern')), false);
  assert.equal(content.runtimeBundle.generation.battle.ghostSnapshots.some(({ build }) => (
    build.itemInstances.some(({ itemId }) => itemId === 'item_emberwake_lantern')
  )), true);
  assert.deepEqual(display.entries.find(({ displayId }) => displayId === 'items.item_emberwake_lantern'), {
    displayId: 'items.item_emberwake_lantern', domain: 'items',
    sourceId: 'item_emberwake_lantern', nameZh: '烬航灯', descriptionZh: '',
  });
  assert.match(display.entries.find(({ displayId }) => (
    displayId === 'item_skills.skill_emberwake_lantern'
  )).descriptionZh, /燃烧.*下一个.*时钟刻.*伤害.*减少一层.*不暴击/);
  assert.equal(content.items.flatMap(({ qualityProfiles }) => Object.values(qualityProfiles)).length, 82);
  assert.equal(content.items.flatMap(({ qualityProfiles }) => (
    Object.values(qualityProfiles).flatMap(({ effects }) => effects)
  )).length, 160);
  assert.equal(enchantments.flatMap(({ profiles: values }) => values).length, 148);
  assert.equal(validatePackageFile(output).status, 0);
});

test('OPC02M v32 墨航滴液器逐品质只以就绪效果向敌方英雄施加项目原创 Poison v2', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'original-pirate-poison-'));
  const output = path.join(dir, 'content.json');
  const displayOutput = path.join(dir, 'display.json');
  assert.equal(runExporter(csvDir, output, displayOutput).status, 0);
  const content = JSON.parse(fs.readFileSync(output, 'utf8'));
  const display = JSON.parse(fs.readFileSync(displayOutput, 'utf8'));
  assert.deepEqual([
    content.schemaVersion,
    content.runtimeBundle.schemaVersion,
    content.runtimeBundle.executableCatalogs.schemaVersion,
    content.rulesVersion,
  ], [32, 30, 22, 'ysbzs.original-pirate-rules.2026-09-04-v28']);
  assert.deepEqual(content.runtimeBundle.battleRules.poisonRules, {
    contractId: 'ysbzs.original-pirate-poison.v2',
    pulseIntervalTicks: 10,
    firstPulsePolicy: 'after_full_interval',
    reapplySchedulePolicy: 'preserve_existing_due_tick',
    pulsePhase: 'tick_start_after_burn_terminal_before_item_progress',
    damagePerStack: 1,
    decayStacksPerPulse: 0,
    shieldPolicy: 'bypass_without_consuming',
    resolutionOrder: 'due_sides_snapshot_then_terminal',
    healCleansePolicy: 'delegated_to_heal_status_cleanse_rules',
    critPolicy: 'never',
    maxStacks: 1000000,
    stackOverflowPolicy: 'reject_advance',
  });

  const item = content.items.find(({ itemId }) => itemId === 'item_inkwake_doser');
  assert.ok(item);
  assert.deepEqual([item.slotWidth, item.baseQuality, item.tags], [1, 'bronze', ['poison', 'relic', 'tool']]);
  const profiles = {
    bronze: [2, 1, 10, 2],
    silver: [4, 2, 9, 3],
    gold: [7, 3, 8, 5],
    diamond: [11, 5, 7, 7],
  };
  for (const [quality, [buyPrice, sellPrice, cooldown, stacks]] of Object.entries(profiles)) {
    const profile = item.qualityProfiles[quality];
    assert.deepEqual([
      profile.buyPrice, profile.sellPrice, profile.baseCooldownTicks,
      profile.critChanceBps, profile.ammo.enabled, profile.ammo.initial, profile.ammo.maximum,
    ], [buyPrice, sellPrice, cooldown, 0, false, 0, 0]);
    assert.deepEqual(profile.effects, [{
      effectId: `effect_inkwake_doser_${quality}_poison`, priority: 20,
      trigger: { event: 'item_ready', conditions: [{ type: 'always', params: {} }] },
      target: { type: 'selected_enemy', params: {} },
      operation: { type: 'apply_poison', params: { stacks } },
    }]);
  }
  assert.deepEqual(content.runtimeBundle.executableCatalogs.itemSkills.find(({ itemSkillId }) => (
    itemSkillId === 'skill_inkwake_doser'
  )), {
    itemSkillId: 'skill_inkwake_doser', triggerEvents: ['item_ready'],
    auraIds: [],
    effectIds: Object.keys(profiles).map((quality) => `effect_inkwake_doser_${quality}_poison`).sort(),
  });
  assert.deepEqual(content.runtimeBundle.generation.shop.templates.filter(({ itemId }) => (
    itemId === 'item_inkwake_doser'
  )), [{
    offerTemplateId: 'offer_refresh_5_inkwake_doser',
    itemId: 'item_inkwake_doser', quality: 'bronze', enchantment: '',
  }]);
  const refreshFiveLayer = content.runtimeBundle.generation.shop.layers.find(({ fromRefreshIndex }) => (
    fromRefreshIndex === 5
  ));
  assert.deepEqual(refreshFiveLayer.templateIds, [
    'offer_refresh_5_inkwake_doser',
    'offer_refresh_5_tidefold_bulwark',
    'offer_refresh_5_crosswind_selector',
  ]);
  assert.equal(content.runtimeBundle.newRunTemplate.economy.gold, 12);
  assert.equal(content.runtimeBundle.shopRules.refreshCost, 2);
  assert.equal(12 - 5 * content.runtimeBundle.shopRules.refreshCost - profiles.bronze[0], 0);
  assert.deepEqual(content.runtimeBundle.executableCatalogs.upgrades.filter(({ itemId }) => (
    itemId === 'item_inkwake_doser'
  )), [
    { upgradeId: 'upgrade_inkwake_doser_bronze_silver', itemId: 'item_inkwake_doser', fromQuality: 'bronze', toQuality: 'silver', price: 3, stallId: 'stall_mistwake' },
    { upgradeId: 'upgrade_inkwake_doser_gold_diamond', itemId: 'item_inkwake_doser', fromQuality: 'gold', toQuality: 'diamond', price: 9, stallId: 'stall_mistwake' },
    { upgradeId: 'upgrade_inkwake_doser_silver_gold', itemId: 'item_inkwake_doser', fromQuality: 'silver', toQuality: 'gold', price: 6, stallId: 'stall_mistwake' },
  ]);
  const enchantments = content.runtimeBundle.executableCatalogs.enchantments;
  assert.deepEqual(enchantments.find(({ enchantmentId }) => enchantmentId === 'enchant_tailwind')
    .profiles.filter(({ itemId }) => itemId === 'item_inkwake_doser')
    .map(({ quality, price, cooldownDeltaTicks, damageDelta, ammoDelta }) => (
      [quality, price, cooldownDeltaTicks, damageDelta, ammoDelta]
    )), [
    ['bronze', 4, -1, 0, 0], ['silver', 6, -1, 0, 0],
    ['gold', 9, -1, 0, 0], ['diamond', 12, -1, 0, 0],
  ]);
  assert.equal(enchantments.filter(({ enchantmentId }) => enchantmentId !== 'enchant_tailwind')
    .some(({ profiles: values }) => values.some(({ itemId }) => itemId === 'item_inkwake_doser')), false);
  assert.equal(content.runtimeBundle.generation.battle.ghostSnapshots.filter(({ build }) => (
    build.itemInstances.some(({ itemId }) => itemId === 'item_inkwake_doser')
  )).length, 1);
  assert.deepEqual(display.entries.find(({ displayId }) => displayId === 'items.item_inkwake_doser'), {
    displayId: 'items.item_inkwake_doser', domain: 'items',
    sourceId: 'item_inkwake_doser', nameZh: '墨航滴液器', descriptionZh: '',
  });
  assert.match(display.entries.find(({ displayId }) => (
    displayId === 'item_skills.skill_inkwake_doser'
  )).descriptionZh, /中毒.*完整间隔.*生命伤害.*不衰减.*不消耗护盾.*不暴击/);
  assert.equal(content.items.length, 22);
  assert.equal(content.items.flatMap(({ qualityProfiles }) => Object.values(qualityProfiles)).length, 82);
  assert.equal(content.items.flatMap(({ qualityProfiles }) => (
    Object.values(qualityProfiles).flatMap(({ effects }) => effects)
  )).length, 160);
  assert.equal(content.runtimeBundle.executableCatalogs.itemSkills.length, 22);
  assert.equal(content.runtimeBundle.executableCatalogs.upgrades.length, 60);
  assert.equal(enchantments.flatMap(({ profiles: values }) => values).length, 148);
  assert.equal(content.runtimeBundle.generation.shop.templates.length, 33);
  assert.equal(display.entries.length, 121);
  assert.equal(validatePackageFile(output).status, 0);
});

test('OPC02N v32 雾藻疗匣保留主动治疗并以独立 Aura 域为友方武器增加固定伤害', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'original-pirate-damage-aura-'));
  const output = path.join(dir, 'content.json');
  const displayOutput = path.join(dir, 'display.json');
  assert.equal(runExporter(csvDir, output, displayOutput).status, 0);
  const content = JSON.parse(fs.readFileSync(output, 'utf8'));
  const display = JSON.parse(fs.readFileSync(displayOutput, 'utf8'));
  assert.deepEqual([
    content.schemaVersion,
    content.runtimeBundle.schemaVersion,
    content.runtimeBundle.executableCatalogs.schemaVersion,
    content.rulesVersion,
  ], [32, 30, 22, 'ysbzs.original-pirate-rules.2026-09-04-v28']);
  assert.deepEqual(content.runtimeBundle.battleRules.damageAuraRules, {
    contractId: 'ysbzs.original-pirate-damage-aura.v1',
    evaluationPolicy: 'per_damage_from_compiled_sources',
    targetSnapshotPolicy: 'battle_start_board',
    targetOrder: 'board_slot_then_instance_id',
    stackingPolicy: 'additive_per_source_effect',
    damagePhase: 'before_crit',
    sourceLifecyclePolicy: 'compiled_board_source_for_battle',
    overflowPolicy: 'reject_advance',
    rngPolicy: 'never',
  });
  const item = content.items.find(({ itemId }) => itemId === 'item_mistkelp_remedy_kit');
  const qualities = ['bronze', 'silver', 'gold', 'diamond'];
  for (const [index, quality] of qualities.entries()) {
    const profile = item.qualityProfiles[quality];
    assert.deepEqual(profile.effects.map(({ operation }) => operation.type), ['heal']);
    assert.deepEqual(profile.auras, [{
      auraId: `aura_mistkelp_remedy_kit_${quality}_weapon_damage`,
      priority: 20,
      target: {
        type: 'friendly_items_with_any_tag',
        params: { tags: ['weapon'], excludeSelf: true },
      },
      operation: { type: 'grant_damage', params: { amount: index + 1 } },
    }]);
  }
  const itemSkill = content.runtimeBundle.executableCatalogs.itemSkills.find(({ itemSkillId }) => (
    itemSkillId === 'skill_mistkelp_remedy_kit'
  ));
  assert.deepEqual(itemSkill.auraIds, qualities.map((quality) => (
    `aura_mistkelp_remedy_kit_${quality}_weapon_damage`
  )).sort());
  assert.equal(content.items.flatMap(({ qualityProfiles }) => (
    Object.values(qualityProfiles).flatMap(({ auras }) => auras)
  )).length, 4);
  assert.deepEqual(content.runtimeBundle.generation.shop.templates.filter(({ itemId }) => (
    itemId === 'item_mistkelp_remedy_kit'
  )), [{
    offerTemplateId: 'offer_refresh_4_mistkelp_remedy_kit',
    itemId: 'item_mistkelp_remedy_kit', quality: 'bronze', enchantment: '',
  }]);
  assert.match(display.entries.find(({ displayId }) => (
    displayId === 'item_skills.skill_mistkelp_remedy_kit'
  )).descriptionZh, /恢复生命.*武器标签.*伤害加成/);
  assert.equal(validatePackageFile(output).status, 0);
});

test('OPC02O v32 继航校炮仪为真实可暴击触发源增加仅后续 USE 生效的本场暴击率', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'original-pirate-crit-growth-'));
  const output = path.join(dir, 'content.json');
  const displayOutput = path.join(dir, 'display.json');
  assert.equal(runExporter(csvDir, output, displayOutput).status, 0);
  const content = JSON.parse(fs.readFileSync(output, 'utf8'));
  assert.deepEqual([
    content.schemaVersion,
    content.runtimeBundle.schemaVersion,
    content.runtimeBundle.executableCatalogs.schemaVersion,
    content.rulesVersion,
  ], [32, 30, 22, 'ysbzs.original-pirate-rules.2026-09-04-v28']);
  assert.deepEqual(content.runtimeBundle.battleRules.critRules, {
    contractId: 'ysbzs.original-pirate-critical-damage.v3',
    chanceScaleBps: 10000,
    damageMultiplierBps: 20000,
    roundingMode: 'floor',
    rollScope: 'item_use',
    drawPolicy: 'once_if_eligible_damage_effect',
    growthStackingPolicy: 'additive_bps_per_effect',
    growthCapPolicy: 'effective_chance_capped_at_chance_scale',
    growthTimingPolicy: 'after_source_use_for_subsequent_uses',
    growthEligibleTargetPolicy: 'trigger_source_item_with_exactly_one_can_crit_item_ready_direct_damage',
    growthRngPolicy: 'never',
    successResponseEvidencePolicy: 'crit_resolve_is_critical_with_bound_committed_damage',
    successResponseSourcePolicy: 'another_same_owner_active_board_item',
    successResponseTimingPolicy: 'after_source_use_effects_in_item_response_phase',
    successResponseRepeatPolicy: 'once_per_qualifying_item_use',
    successResponseTerminalPolicy: 'skip_after_terminal',
    successResponseRngPolicy: 'never',
  });
  const item = content.items.find(({ itemId }) => itemId === 'item_followwake_calibrator');
  const qualities = ['bronze', 'silver', 'gold', 'diamond'];
  const deltas = { bronze: 500, silver: 750, gold: 1000, diamond: 1250 };
  for (const quality of qualities) {
    const growth = item.qualityProfiles[quality].effects.find(({ operation }) => (
      operation.type === 'gain_crit_chance_for_fight'
    ));
    assert.deepEqual(growth, {
      effectId: `effect_followwake_calibrator_${quality}_crit_response`,
      priority: 40,
      trigger: {
        event: 'another_friendly_item_used',
        conditions: [{ type: 'source_item_can_crit', params: {} }],
      },
      target: { type: 'trigger_source_item', params: {} },
      operation: {
        type: 'gain_crit_chance_for_fight',
        params: { critChanceBpsDelta: deltas[quality] },
      },
    });
  }
  assert.equal(content.items.flatMap(({ qualityProfiles }) => (
    Object.values(qualityProfiles).flatMap(({ effects }) => effects)
  )).length, 160);
  assert.equal(validatePackageFile(output).status, 0);
});

test('OPC02P v32 潮鳍投筒在同次 USE 正弹药归零时获得品质护盾', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'original-pirate-ammo-depletion-'));
  const output = path.join(dir, 'content.json');
  const displayOutput = path.join(dir, 'display.json');
  assert.equal(runExporter(csvDir, output, displayOutput).status, 0);
  const content = JSON.parse(fs.readFileSync(output, 'utf8'));
  const display = JSON.parse(fs.readFileSync(displayOutput, 'utf8'));
  assert.deepEqual([
    content.schemaVersion,
    content.runtimeBundle.schemaVersion,
    content.runtimeBundle.executableCatalogs.schemaVersion,
    content.rulesVersion,
  ], [32, 30, 22, 'ysbzs.original-pirate-rules.2026-09-04-v28']);
  assert.deepEqual(content.runtimeBundle.battleRules.ammoDepletionRules, {
    contractId: 'ysbzs.original-pirate-ammo-depletion.v1',
    triggerPolicy: 'current_item_use_positive_to_zero',
    evaluationPhase: 'after_ammo_spend_before_item_effects',
    snapshotPolicy: 'ammo_before_after_from_same_use',
    repeatPolicy: 'once_per_depleting_use',
    nonAmmoPolicy: 'not_eligible',
    reloadPolicy: 'later_reload_does_not_cancel',
    rngPolicy: 'never',
  });
  const item = content.items.find(({ itemId }) => itemId === 'item_tidefin_launcher');
  const amounts = { bronze: 2, silver: 3, gold: 5, diamond: 7 };
  for (const quality of ['bronze', 'silver', 'gold', 'diamond']) {
    const profile = item.qualityProfiles[quality];
    const depletion = profile.effects.find(({ trigger }) => (
      trigger.conditions[0].type === 'source_item_ammo_depleted'
    ));
    assert.deepEqual(depletion, {
      effectId: `effect_tidefin_launcher_${quality}_depleted_shield`,
      priority: 10,
      trigger: {
        event: 'item_ready',
        conditions: [{ type: 'source_item_ammo_depleted', params: {} }],
      },
      target: { type: 'owner_hero', params: {} },
      operation: { type: 'gain_shield', params: { amount: amounts[quality] } },
    });
    assert.equal(profile.ammo.enabled, true);
    assert.deepEqual(profile.effects.map(({ priority }) => priority), [10, 20, 30]);
  }
  const itemSkill = content.runtimeBundle.executableCatalogs.itemSkills.find(({ itemSkillId }) => (
    itemSkillId === 'skill_tidefin_launcher'
  ));
  assert.equal(itemSkill.effectIds.filter((effectId) => effectId.endsWith('_depleted_shield')).length, 4);
  assert.deepEqual(content.runtimeBundle.generation.shop.templates.find(({ offerTemplateId }) => (
    offerTemplateId === 'offer_refresh_3_tidefin_launcher'
  )), {
    offerTemplateId: 'offer_refresh_3_tidefin_launcher',
    itemId: 'item_tidefin_launcher', quality: 'bronze', enchantment: '',
  });
  assert.match(display.entries.find(({ displayId }) => (
    displayId === 'item_skills.skill_tidefin_launcher'
  )).descriptionZh, /弹药耗尽.*护盾/);
  assert.equal(validatePackageFile(output).status, 0);
});

test('OPC02Q v32 尾潮回响鼓以另一件燃烧物品的成功施加结果推进自身', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'original-pirate-burn-response-'));
  const output = path.join(dir, 'content.json');
  const displayOutput = path.join(dir, 'display.json');
  assert.equal(runExporter(csvDir, output, displayOutput).status, 0);
  const content = JSON.parse(fs.readFileSync(output, 'utf8'));
  const display = JSON.parse(fs.readFileSync(displayOutput, 'utf8'));
  const item = content.items.find(({ itemId }) => itemId === 'item_wake_echo_drum');
  const ticksByQuality = { bronze: 1, silver: 1, gold: 2, diamond: 2 };
  for (const [quality, ticks] of Object.entries(ticksByQuality)) {
    const effect = item.qualityProfiles[quality].effects.find(({ trigger }) => (
      trigger.event === 'another_friendly_item_applied_burn'
    ));
    assert.deepEqual(effect, {
      effectId: `effect_wake_echo_drum_${quality}_burn_response_charge`,
      priority: 40,
      trigger: {
        event: 'another_friendly_item_applied_burn',
        conditions: [{ type: 'source_item_has_any_tag', params: { tags: ['burn'] } }],
      },
      target: { type: 'self_item', params: {} },
      operation: { type: 'charge', params: { ticks } },
    });
  }
  const skill = content.runtimeBundle.executableCatalogs.itemSkills.find(({ itemSkillId }) => (
    itemSkillId === 'skill_wake_echo_drum'
  ));
  assert.deepEqual(skill.triggerEvents, [
    'another_friendly_item_applied_burn', 'another_friendly_item_used', 'item_ready',
  ]);
  assert.equal(skill.effectIds.filter((effectId) => effectId.endsWith('_burn_response_charge')).length, 4);
  assert.match(display.entries.find(({ displayId }) => (
    displayId === 'item_skills.skill_wake_echo_drum'
  )).descriptionZh, /另一件.*燃烧.*成功施加.*自身.*充能/);
  assert.equal(validatePackageFile(output).status, 0);
});

test('OPC02R v32 继航校炮仪在另一件友方物品成功暴击后推进自身', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'original-pirate-crit-success-response-'));
  const output = path.join(dir, 'content.json');
  const displayOutput = path.join(dir, 'display.json');
  assert.equal(runExporter(csvDir, output, displayOutput).status, 0);
  const content = JSON.parse(fs.readFileSync(output, 'utf8'));
  const display = JSON.parse(fs.readFileSync(displayOutput, 'utf8'));
  assert.deepEqual([
    content.schemaVersion,
    content.runtimeBundle.schemaVersion,
    content.runtimeBundle.executableCatalogs.schemaVersion,
    content.rulesVersion,
  ], [32, 30, 22, 'ysbzs.original-pirate-rules.2026-09-04-v28']);
  assert.deepEqual(content.runtimeBundle.battleRules.critRules, {
    contractId: 'ysbzs.original-pirate-critical-damage.v3',
    chanceScaleBps: 10000,
    damageMultiplierBps: 20000,
    roundingMode: 'floor',
    rollScope: 'item_use',
    drawPolicy: 'once_if_eligible_damage_effect',
    growthStackingPolicy: 'additive_bps_per_effect',
    growthCapPolicy: 'effective_chance_capped_at_chance_scale',
    growthTimingPolicy: 'after_source_use_for_subsequent_uses',
    growthEligibleTargetPolicy: 'trigger_source_item_with_exactly_one_can_crit_item_ready_direct_damage',
    growthRngPolicy: 'never',
    successResponseEvidencePolicy: 'crit_resolve_is_critical_with_bound_committed_damage',
    successResponseSourcePolicy: 'another_same_owner_active_board_item',
    successResponseTimingPolicy: 'after_source_use_effects_in_item_response_phase',
    successResponseRepeatPolicy: 'once_per_qualifying_item_use',
    successResponseTerminalPolicy: 'skip_after_terminal',
    successResponseRngPolicy: 'never',
  });
  const item = content.items.find(({ itemId }) => itemId === 'item_followwake_calibrator');
  const ticksByQuality = { bronze: 1, silver: 1, gold: 2, diamond: 2 };
  for (const [quality, ticks] of Object.entries(ticksByQuality)) {
    const effect = item.qualityProfiles[quality].effects.find(({ trigger }) => (
      trigger.event === 'another_friendly_item_crit'
    ));
    assert.deepEqual(effect, {
      effectId: `effect_followwake_calibrator_${quality}_crit_success_charge`,
      priority: 50,
      trigger: {
        event: 'another_friendly_item_crit',
        conditions: [{ type: 'always', params: {} }],
      },
      target: { type: 'self_item', params: {} },
      operation: { type: 'charge', params: { ticks } },
    });
  }
  const skill = content.runtimeBundle.executableCatalogs.itemSkills.find(({ itemSkillId }) => (
    itemSkillId === 'skill_followwake_calibrator'
  ));
  assert.deepEqual(skill.triggerEvents, [
    'another_friendly_item_crit', 'another_friendly_item_used', 'item_ready',
  ]);
  assert.equal(skill.effectIds.filter((effectId) => effectId.endsWith('_crit_success_charge')).length, 4);
  assert.match(display.entries.find(({ displayId }) => (
    displayId === 'item_skills.skill_followwake_calibrator'
  )).descriptionZh, /另一件友方物品.*成功暴击.*自身.*充能/);
  assert.equal(content.items.flatMap(({ qualityProfiles }) => (
    Object.values(qualityProfiles).flatMap(({ effects }) => effects)
  )).length, 160);
  assert.equal(validatePackageFile(output).status, 0);
});

test('OPC03 缺 Crit成功响应、Ammo depletion、Crit成长、Aura、Heal/Cleanse、Poison/Burn、随机/集合目标或正式 Ghost 字段时源数据拒绝', () => {
  const cases = [
    ['ammo-depletion-contract', (dir) => mutateColumn(dir, '44_bz_gameplay.csv', 'ammo_depletion_contract', 'ysbzs.original-pirate-ammo-depletion.v2')],
    ['ammo-depletion-trigger-policy', (dir) => mutateColumn(dir, '44_bz_gameplay.csv', 'ammo_depletion_trigger_policy', 'ammo_is_zero')],
    ['ammo-depletion-evaluation-phase', (dir) => mutateColumn(dir, '44_bz_gameplay.csv', 'ammo_depletion_evaluation_phase', 'after_item_effects')],
    ['ammo-depletion-snapshot-policy', (dir) => mutateColumn(dir, '44_bz_gameplay.csv', 'ammo_depletion_snapshot_policy', 'current_ammo_only')],
    ['ammo-depletion-repeat-policy', (dir) => mutateColumn(dir, '44_bz_gameplay.csv', 'ammo_depletion_repeat_policy', 'once_per_battle')],
    ['ammo-depletion-non-ammo-policy', (dir) => mutateColumn(dir, '44_bz_gameplay.csv', 'ammo_depletion_non_ammo_policy', 'treat_as_zero')],
    ['ammo-depletion-reload-policy', (dir) => mutateColumn(dir, '44_bz_gameplay.csv', 'ammo_depletion_reload_policy', 'cancel_if_reloaded')],
    ['ammo-depletion-rng-policy', (dir) => mutateColumn(dir, '44_bz_gameplay.csv', 'ammo_depletion_rng_policy', 'draw_once')],
    ['ammo-depletion-trigger-forged', (dir) => mutateRowById(dir, '47_bz_item_effects.csv', 'effect_id', 'effect_tidefin_launcher_bronze_depleted_shield', 'trigger_event', 'another_friendly_item_used')],
    ['ammo-depletion-condition-tags-forged', (dir) => mutateRowById(dir, '47_bz_item_effects.csv', 'effect_id', 'effect_tidefin_launcher_bronze_depleted_shield', 'condition_tags', 'ammo')],
    ['ammo-depletion-relation-forged', (dir) => mutateRowById(dir, '47_bz_item_effects.csv', 'effect_id', 'effect_tidefin_launcher_bronze_depleted_shield', 'condition_source_relation', 'adjacent')],
    ['ammo-depletion-target-forged', (dir) => mutateRowById(dir, '47_bz_item_effects.csv', 'effect_id', 'effect_tidefin_launcher_bronze_depleted_shield', 'target_type', 'self_item')],
    ['ammo-depletion-operation-forged', (dir) => mutateRowById(dir, '47_bz_item_effects.csv', 'effect_id', 'effect_tidefin_launcher_bronze_depleted_shield', 'operation_type', 'heal')],
    ['ammo-depletion-amount-zero', (dir) => mutateRowById(dir, '47_bz_item_effects.csv', 'effect_id', 'effect_tidefin_launcher_bronze_depleted_shield', 'amount', '0')],
    ['ammo-depletion-extra-param', (dir) => mutateRowById(dir, '47_bz_item_effects.csv', 'effect_id', 'effect_tidefin_launcher_bronze_depleted_shield', 'ticks', '1')],
    ['ammo-depletion-non-ammo-profile', (dir) => mutateRowById(dir, '46_bz_items.csv', 'item_id', 'item_tidefin_launcher', 'ammo_enabled', 'false')],
    ['ammo-depletion-directory-missing', (dir) => mutateRowById(dir, '48_bz_item_skills.csv', 'item_skill_id', 'skill_tidefin_launcher', 'effect_ids', 'effect_tidefin_launcher_bronze_ready')],
    ['damage-aura-contract', (dir) => mutateColumn(dir, '44_bz_gameplay.csv', 'damage_aura_contract', 'ysbzs.original-pirate-damage-aura.v2')],
    ['damage-aura-evaluation', (dir) => mutateColumn(dir, '44_bz_gameplay.csv', 'damage_aura_evaluation_policy', 'battle_start_once')],
    ['damage-aura-target-snapshot', (dir) => mutateColumn(dir, '44_bz_gameplay.csv', 'damage_aura_target_snapshot_policy', 'live_board')],
    ['damage-aura-target-order', (dir) => mutateColumn(dir, '44_bz_gameplay.csv', 'damage_aura_target_order', 'instance_id')],
    ['damage-aura-stacking', (dir) => mutateColumn(dir, '44_bz_gameplay.csv', 'damage_aura_stacking_policy', 'highest_only')],
    ['damage-aura-phase', (dir) => mutateColumn(dir, '44_bz_gameplay.csv', 'damage_aura_damage_phase', 'after_crit')],
    ['damage-aura-lifecycle', (dir) => mutateColumn(dir, '44_bz_gameplay.csv', 'damage_aura_source_lifecycle_policy', 'live_source')],
    ['damage-aura-overflow', (dir) => mutateColumn(dir, '44_bz_gameplay.csv', 'damage_aura_overflow_policy', 'clamp')],
    ['damage-aura-rng', (dir) => mutateColumn(dir, '44_bz_gameplay.csv', 'damage_aura_rng_policy', 'draw_once')],
    ['damage-aura-id-duplicate', (dir) => mutateCell(dir, '66_bz_item_auras.csv', 2, 'aura_id', 'aura_mistkelp_remedy_kit_bronze_weapon_damage')],
    ['damage-aura-item-unknown', (dir) => mutateCell(dir, '66_bz_item_auras.csv', 1, 'item_id', 'item_missing')],
    ['damage-aura-quality-unknown', (dir) => mutateCell(dir, '66_bz_item_auras.csv', 1, 'quality', 'mythic')],
    ['damage-aura-skill-mismatch', (dir) => mutateCell(dir, '66_bz_item_auras.csv', 1, 'item_skill_id', 'skill_reef_hook')],
    ['damage-aura-priority-negative', (dir) => mutateCell(dir, '66_bz_item_auras.csv', 1, 'priority', '-1')],
    ['damage-aura-target-alias', (dir) => mutateCell(dir, '66_bz_item_auras.csv', 1, 'target_type', 'all_friendly_items')],
    ['damage-aura-tags-missing', (dir) => mutateCell(dir, '66_bz_item_auras.csv', 1, 'target_tags', '')],
    ['damage-aura-tags-unknown', (dir) => mutateCell(dir, '66_bz_item_auras.csv', 1, 'target_tags', 'cannon')],
    ['damage-aura-tags-duplicate', (dir) => mutateCell(dir, '66_bz_item_auras.csv', 1, 'target_tags', 'weapon, weapon')],
    ['damage-aura-exclude-self-missing', (dir) => mutateCell(dir, '66_bz_item_auras.csv', 1, 'target_exclude_self', '')],
    ['damage-aura-exclude-self-false', (dir) => mutateCell(dir, '66_bz_item_auras.csv', 1, 'target_exclude_self', 'false')],
    ['damage-aura-operation-alias', (dir) => mutateCell(dir, '66_bz_item_auras.csv', 1, 'operation_type', 'gain_damage_for_fight')],
    ['damage-aura-amount-zero', (dir) => mutateCell(dir, '66_bz_item_auras.csv', 1, 'amount', '0')],
    ['damage-aura-amount-over-safe-max', (dir) => mutateCell(dir, '66_bz_item_auras.csv', 1, 'amount', '922337203685477581')],
    ['damage-aura-directory-missing', (dir) => mutateRowById(dir, '48_bz_item_skills.csv', 'item_skill_id', 'skill_mistkelp_remedy_kit', 'aura_ids', 'aura_mistkelp_remedy_kit_silver_weapon_damage')],
    ['heal-cleanse-contract', (dir) => mutateColumn(dir, '44_bz_gameplay.csv', 'heal_status_cleanse_contract', 'ysbzs.original-pirate-heal-status-cleanse.v2')],
    ['heal-cleanse-trigger', (dir) => mutateColumn(dir, '44_bz_gameplay.csv', 'heal_status_cleanse_trigger_policy', 'after_authored_heal')],
    ['heal-cleanse-basis', (dir) => mutateColumn(dir, '44_bz_gameplay.csv', 'heal_status_cleanse_heal_basis', 'authored_heal')],
    ['heal-cleanse-scale', (dir) => mutateColumn(dir, '44_bz_gameplay.csv', 'heal_status_cleanse_scale_bps', '2499')],
    ['heal-cleanse-rounding', (dir) => mutateColumn(dir, '44_bz_gameplay.csv', 'heal_status_cleanse_rounding_mode', 'floor')],
    ['heal-cleanse-targets', (dir) => mutateColumn(dir, '44_bz_gameplay.csv', 'heal_status_cleanse_status_targets', 'burn')],
    ['heal-cleanse-target-order', (dir) => mutateColumn(dir, '44_bz_gameplay.csv', 'heal_status_cleanse_status_targets', 'poison, burn')],
    ['heal-cleanse-resolution', (dir) => mutateColumn(dir, '44_bz_gameplay.csv', 'heal_status_cleanse_status_resolution_policy', 'sequential')],
    ['heal-cleanse-poison-schedule', (dir) => mutateColumn(dir, '44_bz_gameplay.csv', 'heal_status_cleanse_poison_schedule_policy', 'always_clear_due')],
    ['heal-cleanse-trace-emit', (dir) => mutateColumn(dir, '44_bz_gameplay.csv', 'heal_status_cleanse_trace_emit_policy', 'always')],
    ['heal-cleanse-crit', (dir) => mutateColumn(dir, '44_bz_gameplay.csv', 'heal_status_cleanse_crit_policy', 'profile')],
    ['heal-cleanse-rng', (dir) => mutateColumn(dir, '44_bz_gameplay.csv', 'heal_status_cleanse_rng_policy', 'draw_once')],
    ['poison-contract', (dir) => mutateColumn(dir, '44_bz_gameplay.csv', 'poison_contract', 'ysbzs.original-pirate-poison.v1')],
    ['poison-pulse-interval', (dir) => mutateColumn(dir, '44_bz_gameplay.csv', 'poison_pulse_interval_ticks', '9')],
    ['poison-first-pulse', (dir) => mutateColumn(dir, '44_bz_gameplay.csv', 'poison_first_pulse_policy', 'next_tick')],
    ['poison-reapply-schedule', (dir) => mutateColumn(dir, '44_bz_gameplay.csv', 'poison_reapply_schedule_policy', 'restart_full_interval')],
    ['poison-pulse-phase', (dir) => mutateColumn(dir, '44_bz_gameplay.csv', 'poison_pulse_phase', 'tick_end')],
    ['poison-damage-per-stack', (dir) => mutateColumn(dir, '44_bz_gameplay.csv', 'poison_damage_per_stack', '2')],
    ['poison-decay', (dir) => mutateColumn(dir, '44_bz_gameplay.csv', 'poison_decay_stacks_per_pulse', '1')],
    ['poison-shield-policy', (dir) => mutateColumn(dir, '44_bz_gameplay.csv', 'poison_shield_policy', 'shield_first_consuming')],
    ['poison-resolution-order', (dir) => mutateColumn(dir, '44_bz_gameplay.csv', 'poison_resolution_order', 'player_then_enemy')],
    ['poison-heal-cleanse', (dir) => mutateColumn(dir, '44_bz_gameplay.csv', 'poison_heal_cleanse_policy', 'none')],
    ['poison-crit-policy', (dir) => mutateColumn(dir, '44_bz_gameplay.csv', 'poison_crit_policy', 'profile')],
    ['poison-max-stacks', (dir) => mutateColumn(dir, '44_bz_gameplay.csv', 'poison_max_stacks', '999999')],
    ['poison-overflow-policy', (dir) => mutateColumn(dir, '44_bz_gameplay.csv', 'poison_stack_overflow_policy', 'clamp')],
    ['poison-stacks-missing', (dir) => mutateRowById(dir, '47_bz_item_effects.csv', 'effect_id', 'effect_inkwake_doser_bronze_poison', 'stacks', '')],
    ['poison-stacks-zero', (dir) => mutateRowById(dir, '47_bz_item_effects.csv', 'effect_id', 'effect_inkwake_doser_bronze_poison', 'stacks', '0')],
    ['poison-stacks-over-max', (dir) => mutateRowById(dir, '47_bz_item_effects.csv', 'effect_id', 'effect_inkwake_doser_bronze_poison', 'stacks', '1000001')],
    ['poison-stacks-not-integer', (dir) => mutateRowById(dir, '47_bz_item_effects.csv', 'effect_id', 'effect_inkwake_doser_bronze_poison', 'stacks', '2.5')],
    ['poison-amount-forged', (dir) => mutateRowById(dir, '47_bz_item_effects.csv', 'effect_id', 'effect_inkwake_doser_bronze_poison', 'amount', '2')],
    ['poison-can-crit-forged', (dir) => mutateRowById(dir, '47_bz_item_effects.csv', 'effect_id', 'effect_inkwake_doser_bronze_poison', 'can_crit', 'false')],
    ['poison-ticks-forged', (dir) => mutateRowById(dir, '47_bz_item_effects.csv', 'effect_id', 'effect_inkwake_doser_bronze_poison', 'ticks', '10')],
    ['poison-trigger-forged', (dir) => mutateRowById(dir, '47_bz_item_effects.csv', 'effect_id', 'effect_inkwake_doser_bronze_poison', 'trigger_event', 'battle_start')],
    ['poison-condition-forged', (dir) => mutateRowById(dir, '47_bz_item_effects.csv', 'effect_id', 'effect_inkwake_doser_bronze_poison', 'condition_type', 'source_item_has_any_tag')],
    ['poison-relation-forged', (dir) => mutateRowById(dir, '47_bz_item_effects.csv', 'effect_id', 'effect_inkwake_doser_bronze_poison', 'condition_source_relation', 'adjacent')],
    ['poison-target-forged', (dir) => mutateRowById(dir, '47_bz_item_effects.csv', 'effect_id', 'effect_inkwake_doser_bronze_poison', 'target_type', 'owner_hero')],
    ['poison-operation-forged', (dir) => mutateRowById(dir, '47_bz_item_effects.csv', 'effect_id', 'effect_inkwake_doser_bronze_poison', 'operation_type', 'deal_damage')],
    ['poison-profile-crit-forged', (dir) => mutateRowById(dir, '46_bz_items.csv', 'item_id', 'item_inkwake_doser', 'crit_chance_bps', '1')],
    ['poison-profile-second-effect-forged', (dir) => appendInkwakeBronzePoison(dir)],
    ['burn-contract', (dir) => mutateColumn(dir, '44_bz_gameplay.csv', 'burn_contract', 'ysbzs.original-pirate-burn.v1')],
    ['burn-pulse-interval', (dir) => mutateColumn(dir, '44_bz_gameplay.csv', 'burn_pulse_interval_ticks', '2')],
    ['burn-first-pulse', (dir) => mutateColumn(dir, '44_bz_gameplay.csv', 'burn_first_pulse_policy', 'same_tick')],
    ['burn-pulse-phase', (dir) => mutateColumn(dir, '44_bz_gameplay.csv', 'burn_pulse_phase', 'tick_end')],
    ['burn-damage-per-stack', (dir) => mutateColumn(dir, '44_bz_gameplay.csv', 'burn_damage_per_stack', '2')],
    ['burn-decay', (dir) => mutateColumn(dir, '44_bz_gameplay.csv', 'burn_decay_stacks_per_pulse', '2')],
    ['burn-shield-policy', (dir) => mutateColumn(dir, '44_bz_gameplay.csv', 'burn_shield_policy', 'bypass')],
    ['burn-resolution-order', (dir) => mutateColumn(dir, '44_bz_gameplay.csv', 'burn_resolution_order', 'player_then_enemy')],
    ['burn-max-stacks', (dir) => mutateColumn(dir, '44_bz_gameplay.csv', 'burn_max_stacks', '999999')],
    ['burn-overflow-policy', (dir) => mutateColumn(dir, '44_bz_gameplay.csv', 'burn_stack_overflow_policy', 'clamp')],
    ['burn-stacks-missing', (dir) => mutateRowById(dir, '47_bz_item_effects.csv', 'effect_id', 'effect_emberwake_lantern_bronze_burn', 'stacks', '')],
    ['burn-stacks-zero', (dir) => mutateRowById(dir, '47_bz_item_effects.csv', 'effect_id', 'effect_emberwake_lantern_bronze_burn', 'stacks', '0')],
    ['burn-stacks-over-max', (dir) => mutateRowById(dir, '47_bz_item_effects.csv', 'effect_id', 'effect_emberwake_lantern_bronze_burn', 'stacks', '1000001')],
    ['burn-stacks-not-integer', (dir) => mutateRowById(dir, '47_bz_item_effects.csv', 'effect_id', 'effect_emberwake_lantern_bronze_burn', 'stacks', '3.5')],
    ['burn-amount-forged', (dir) => mutateRowById(dir, '47_bz_item_effects.csv', 'effect_id', 'effect_emberwake_lantern_bronze_burn', 'amount', '3')],
    ['burn-can-crit-forged', (dir) => mutateRowById(dir, '47_bz_item_effects.csv', 'effect_id', 'effect_emberwake_lantern_bronze_burn', 'can_crit', 'false')],
    ['burn-trigger-forged', (dir) => mutateRowById(dir, '47_bz_item_effects.csv', 'effect_id', 'effect_emberwake_lantern_bronze_burn', 'trigger_event', 'battle_start')],
    ['burn-condition-forged', (dir) => mutateRowById(dir, '47_bz_item_effects.csv', 'effect_id', 'effect_emberwake_lantern_bronze_burn', 'condition_type', 'source_item_has_any_tag')],
    ['burn-relation-forged', (dir) => mutateRowById(dir, '47_bz_item_effects.csv', 'effect_id', 'effect_emberwake_lantern_bronze_burn', 'condition_source_relation', 'adjacent')],
    ['burn-target-forged', (dir) => mutateRowById(dir, '47_bz_item_effects.csv', 'effect_id', 'effect_emberwake_lantern_bronze_burn', 'target_type', 'owner_hero')],
    ['burn-operation-forged', (dir) => mutateRowById(dir, '47_bz_item_effects.csv', 'effect_id', 'effect_emberwake_lantern_bronze_burn', 'operation_type', 'deal_damage')],
    ['burn-response-condition-forged', (dir) => mutateRowById(dir, '47_bz_item_effects.csv', 'effect_id', 'effect_wake_echo_drum_bronze_burn_response_charge', 'condition_type', 'always')],
    ['burn-response-tag-forged', (dir) => mutateRowById(dir, '47_bz_item_effects.csv', 'effect_id', 'effect_wake_echo_drum_bronze_burn_response_charge', 'condition_tags', 'weapon')],
    ['burn-response-relation-forged', (dir) => mutateRowById(dir, '47_bz_item_effects.csv', 'effect_id', 'effect_wake_echo_drum_bronze_burn_response_charge', 'condition_source_relation', 'adjacent')],
    ['burn-response-target-forged', (dir) => mutateRowById(dir, '47_bz_item_effects.csv', 'effect_id', 'effect_wake_echo_drum_bronze_burn_response_charge', 'target_type', 'trigger_source_item')],
    ['burn-response-operation-forged', (dir) => mutateRowById(dir, '47_bz_item_effects.csv', 'effect_id', 'effect_wake_echo_drum_bronze_burn_response_charge', 'operation_type', 'reload')],
    ['burn-response-ticks-zero', (dir) => mutateRowById(dir, '47_bz_item_effects.csv', 'effect_id', 'effect_wake_echo_drum_bronze_burn_response_charge', 'ticks', '0')],
    ['burn-response-directory-missing', (dir) => mutateRowById(dir, '48_bz_item_skills.csv', 'item_skill_id', 'skill_wake_echo_drum', 'effect_ids', 'effect_wake_echo_drum_bronze_ready')],
    ['crit-contract', (dir) => mutateColumn(dir, '44_bz_gameplay.csv', 'crit_contract', 'ysbzs.original-pirate-critical-damage.v1')],
    ['crit-scale', (dir) => mutateColumn(dir, '44_bz_gameplay.csv', 'chance_scale_bps', '1000')],
    ['crit-multiplier-at-scale', (dir) => mutateColumn(dir, '44_bz_gameplay.csv', 'damage_multiplier_bps', '10000')],
    ['crit-multiplier-over-cap', (dir) => mutateColumn(dir, '44_bz_gameplay.csv', 'damage_multiplier_bps', '100001')],
    ['crit-rounding', (dir) => mutateColumn(dir, '44_bz_gameplay.csv', 'rounding_mode', 'ceil')],
    ['crit-roll-scope', (dir) => mutateColumn(dir, '44_bz_gameplay.csv', 'roll_scope', 'damage_effect')],
    ['crit-draw-policy', (dir) => mutateColumn(dir, '44_bz_gameplay.csv', 'draw_policy', 'per_damage_effect')],
    ['crit-growth-stacking', (dir) => mutateColumn(dir, '44_bz_gameplay.csv', 'crit_growth_stacking_policy', 'highest_only')],
    ['crit-growth-cap', (dir) => mutateColumn(dir, '44_bz_gameplay.csv', 'crit_growth_cap_policy', 'clamp_authored_delta')],
    ['crit-growth-timing', (dir) => mutateColumn(dir, '44_bz_gameplay.csv', 'crit_growth_timing_policy', 'include_current_use')],
    ['crit-growth-eligible-target', (dir) => mutateColumn(dir, '44_bz_gameplay.csv', 'crit_growth_eligible_target_policy', 'any_weapon')],
    ['crit-growth-rng', (dir) => mutateColumn(dir, '44_bz_gameplay.csv', 'crit_growth_rng_policy', 'draw_once')],
    ['crit-success-evidence', (dir) => mutateColumn(dir, '44_bz_gameplay.csv', 'crit_success_response_evidence_policy', 'crit_flag_only')],
    ['crit-success-source', (dir) => mutateColumn(dir, '44_bz_gameplay.csv', 'crit_success_response_source_policy', 'any_friendly_item')],
    ['crit-success-timing', (dir) => mutateColumn(dir, '44_bz_gameplay.csv', 'crit_success_response_timing_policy', 'during_damage')],
    ['crit-success-repeat', (dir) => mutateColumn(dir, '44_bz_gameplay.csv', 'crit_success_response_repeat_policy', 'per_damage_effect')],
    ['crit-success-terminal', (dir) => mutateColumn(dir, '44_bz_gameplay.csv', 'crit_success_response_terminal_policy', 'trigger_after_terminal')],
    ['crit-success-rng', (dir) => mutateColumn(dir, '44_bz_gameplay.csv', 'crit_success_response_rng_policy', 'draw_once')],
    ['crit-success-condition-forged', (dir) => mutateRowById(dir, '47_bz_item_effects.csv', 'effect_id', 'effect_followwake_calibrator_bronze_crit_success_charge', 'condition_type', 'source_item_can_crit')],
    ['crit-success-condition-tags-forged', (dir) => mutateRowById(dir, '47_bz_item_effects.csv', 'effect_id', 'effect_followwake_calibrator_bronze_crit_success_charge', 'condition_tags', 'weapon')],
    ['crit-success-relation-forged', (dir) => mutateRowById(dir, '47_bz_item_effects.csv', 'effect_id', 'effect_followwake_calibrator_bronze_crit_success_charge', 'condition_source_relation', 'adjacent')],
    ['crit-success-target-forged', (dir) => mutateRowById(dir, '47_bz_item_effects.csv', 'effect_id', 'effect_followwake_calibrator_bronze_crit_success_charge', 'target_type', 'trigger_source_item')],
    ['crit-success-operation-forged', (dir) => mutateRowById(dir, '47_bz_item_effects.csv', 'effect_id', 'effect_followwake_calibrator_bronze_crit_success_charge', 'operation_type', 'reload')],
    ['crit-success-ticks-zero', (dir) => mutateRowById(dir, '47_bz_item_effects.csv', 'effect_id', 'effect_followwake_calibrator_bronze_crit_success_charge', 'ticks', '0')],
    ['crit-success-extra-param', (dir) => mutateRowById(dir, '47_bz_item_effects.csv', 'effect_id', 'effect_followwake_calibrator_bronze_crit_success_charge', 'amount', '1')],
    ['crit-success-trigger-alias', (dir) => mutateRowById(dir, '47_bz_item_effects.csv', 'effect_id', 'effect_followwake_calibrator_bronze_crit_success_charge', 'trigger_event', 'friendly_item_critted')],
    ['crit-success-directory-trigger-missing', (dir) => mutateRowById(dir, '48_bz_item_skills.csv', 'item_skill_id', 'skill_followwake_calibrator', 'trigger_events', 'another_friendly_item_used, item_ready')],
    ['crit-growth-delta-missing', (dir) => mutateRowById(dir, '47_bz_item_effects.csv', 'effect_id', 'effect_followwake_calibrator_bronze_crit_response', 'crit_chance_bps_delta', '')],
    ['crit-growth-delta-zero', (dir) => mutateRowById(dir, '47_bz_item_effects.csv', 'effect_id', 'effect_followwake_calibrator_bronze_crit_response', 'crit_chance_bps_delta', '0')],
    ['crit-growth-delta-over-scale', (dir) => mutateRowById(dir, '47_bz_item_effects.csv', 'effect_id', 'effect_followwake_calibrator_bronze_crit_response', 'crit_chance_bps_delta', '10001')],
    ['crit-growth-delta-not-integer', (dir) => mutateRowById(dir, '47_bz_item_effects.csv', 'effect_id', 'effect_followwake_calibrator_bronze_crit_response', 'crit_chance_bps_delta', '5%')],
    ['crit-growth-amount-forged', (dir) => mutateRowById(dir, '47_bz_item_effects.csv', 'effect_id', 'effect_followwake_calibrator_bronze_crit_response', 'amount', '500')],
    ['crit-growth-condition-alias', (dir) => mutateRowById(dir, '47_bz_item_effects.csv', 'effect_id', 'effect_followwake_calibrator_bronze_crit_response', 'condition_type', 'source_item_has_any_tag')],
    ['crit-growth-condition-tags-forged', (dir) => mutateRowById(dir, '47_bz_item_effects.csv', 'effect_id', 'effect_followwake_calibrator_bronze_crit_response', 'condition_tags', 'weapon')],
    ['crit-growth-relation-forged', (dir) => mutateRowById(dir, '47_bz_item_effects.csv', 'effect_id', 'effect_followwake_calibrator_bronze_crit_response', 'condition_source_relation', 'adjacent')],
    ['crit-growth-trigger-forged', (dir) => mutateRowById(dir, '47_bz_item_effects.csv', 'effect_id', 'effect_followwake_calibrator_bronze_crit_response', 'trigger_event', 'item_ready')],
    ['crit-growth-target-forged', (dir) => mutateRowById(dir, '47_bz_item_effects.csv', 'effect_id', 'effect_followwake_calibrator_bronze_crit_response', 'target_type', 'self_item')],
    ['crit-growth-operation-forged', (dir) => mutateRowById(dir, '47_bz_item_effects.csv', 'effect_id', 'effect_followwake_calibrator_bronze_crit_response', 'operation_type', 'gain_damage_for_fight')],
    ['crit-growth-directory-missing', (dir) => mutateRowById(dir, '48_bz_item_skills.csv', 'item_skill_id', 'skill_followwake_calibrator', 'effect_ids', 'effect_followwake_calibrator_bronze_ready')],
    ['crit-chance-missing', (dir) => mutateCell(dir, '46_bz_items.csv', 71, 'crit_chance_bps', '')],
    ['crit-chance-negative', (dir) => mutateCell(dir, '46_bz_items.csv', 71, 'crit_chance_bps', '-1')],
    ['crit-chance-over-scale', (dir) => mutateCell(dir, '46_bz_items.csv', 74, 'crit_chance_bps', '10001')],
    ['crit-chance-not-integer', (dir) => mutateCell(dir, '46_bz_items.csv', 71, 'crit_chance_bps', '25%')],
    ['crit-profile-positive-without-eligible-effect', (dir) => mutateCell(dir, '47_bz_item_effects.csv', 137, 'can_crit', 'false')],
    ['crit-effect-flag-missing', (dir) => mutateCell(dir, '47_bz_item_effects.csv', 137, 'can_crit', '')],
    ['crit-effect-flag-noncanonical', (dir) => mutateCell(dir, '47_bz_item_effects.csv', 137, 'can_crit', 'True')],
    ['crit-effect-damage-over-safe-max', (dir) => mutateCell(dir, '47_bz_item_effects.csv', 137, 'amount', '922337203685477581')],
    ['crit-profile-second-noneligible-damage', (dir) => appendTideglassBronzeDamage(
      dir, 'effect_tideglass_sidearm_bronze_second_damage', false,
    )],
    ['crit-profile-second-eligible-damage', (dir) => appendTideglassBronzeDamage(
      dir, 'effect_tideglass_sidearm_bronze_second_crit', true,
    )],
    ['crit-flag-on-nondamage', (dir) => mutateCell(dir, '47_bz_item_effects.csv', 6, 'can_crit', 'false')],
    ['cooldown', (dir) => mutateCell(dir, '46_bz_items.csv', 1, 'cooldown_ticks', '')],
    ['item-tags-missing', (dir) => mutateCell(dir, '46_bz_items.csv', 1, 'tags', '')],
    ['item-tags-unknown', (dir) => mutateCell(dir, '46_bz_items.csv', 1, 'tags', 'weapon, cannon')],
    ['item-tags-duplicate', (dir) => mutateCell(dir, '46_bz_items.csv', 1, 'tags', 'weapon, weapon')],
    ['quality', (dir) => mutateCell(dir, '46_bz_items.csv', 1, 'quality', '')],
    ['ammo', (dir) => mutateCell(dir, '46_bz_items.csv', 1, 'ammo_maximum', '')],
    ['price', (dir) => mutateCell(dir, '50_bz_stall_offers.csv', 1, 'price', '')],
    ['trigger', (dir) => mutateCell(dir, '47_bz_item_effects.csv', 1, 'trigger_event', '')],
    ['source-relation-missing', (dir) => mutateCell(dir, '47_bz_item_effects.csv', 1, 'condition_source_relation', '')],
    ['source-relation-unknown', (dir) => mutateCell(dir, '47_bz_item_effects.csv', 34, 'condition_source_relation', 'nearby')],
    ['source-relation-ready-adjacent', (dir) => mutateCell(dir, '47_bz_item_effects.csv', 1, 'condition_source_relation', 'adjacent')],
    ['source-relation-adjacent-illegal-condition', (dir) => mutateCell(dir, '47_bz_item_effects.csv', 86, 'condition_type', 'always')],
    ['response-condition-tags-missing', (dir) => mutateCell(dir, '47_bz_item_effects.csv', 34, 'condition_tags', '')],
    ['response-condition-tags-duplicate', (dir) => mutateCell(dir, '47_bz_item_effects.csv', 34, 'condition_tags', 'weapon, weapon')],
    ['response-condition-type', (dir) => mutateCell(dir, '47_bz_item_effects.csv', 34, 'condition_type', 'always')],
    ['response-operation', (dir) => mutateCell(dir, '47_bz_item_effects.csv', 34, 'operation_type', 'apply_status')],
    ['damage-growth-target', (dir) => mutateCell(dir, '47_bz_item_effects.csv', 78, 'target_type', 'selected_enemy')],
    ['damage-growth-trigger', (dir) => mutateCell(dir, '47_bz_item_effects.csv', 78, 'trigger_event', 'item_ready')],
    ['damage-growth-condition', (dir) => mutateCell(dir, '47_bz_item_effects.csv', 78, 'condition_type', 'always')],
    ['damage-growth-condition-tags-missing', (dir) => mutateCell(dir, '47_bz_item_effects.csv', 78, 'condition_tags', '')],
    ['damage-growth-condition-tags-unknown', (dir) => mutateCell(dir, '47_bz_item_effects.csv', 78, 'condition_tags', 'powder')],
    ['damage-growth-amount-zero', (dir) => mutateCell(dir, '47_bz_item_effects.csv', 78, 'amount', '0')],
    ['damage-growth-extra-ticks', (dir) => mutateCell(dir, '47_bz_item_effects.csv', 78, 'ticks', '1')],
    ['damage-growth-active-damage-required', (dir) => {
      mutateCell(dir, '47_bz_item_effects.csv', 77, 'target_type', 'self_item');
      mutateCell(dir, '47_bz_item_effects.csv', 77, 'operation_type', 'charge');
      mutateCell(dir, '47_bz_item_effects.csv', 77, 'amount', '');
      mutateCell(dir, '47_bz_item_effects.csv', 77, 'ticks', '1');
    }],
    ['item-skill-trigger-coverage', (dir) => mutateCell(dir, '48_bz_item_skills.csv', 7, 'trigger_events', 'item_ready')],
    ['item-ready-effect-required', (dir) => {
      mutateCell(dir, '47_bz_item_effects.csv', 33, 'trigger_event', 'another_friendly_item_used');
      mutateCell(dir, '47_bz_item_effects.csv', 33, 'condition_type', 'source_item_has_any_tag');
      mutateCell(dir, '47_bz_item_effects.csv', 33, 'condition_tags', 'weapon');
    }],
    ['item-skill-cross-directory', (dir) => mutateCell(dir, '46_bz_items.csv', 1, 'item_skill_id', 'hero_skill_mist_salvo')],
    ['item-effect-cross-directory', (dir) => mutateCell(dir, '47_bz_item_effects.csv', 1, 'item_skill_id', 'hero_skill_mist_salvo')],
    ['effect', (dir) => mutateCell(dir, '47_bz_item_effects.csv', 1, 'amount', '')],
    ['status', (dir) => mutateCell(dir, '47_bz_item_effects.csv', 14, 'status', 'burn')],
    ['effect-target-operation', (dir) => mutateCell(dir, '47_bz_item_effects.csv', 6, 'target_type', 'first_enemy_item')],
    ['deterministic-target-unknown', (dir) => mutateCell(dir, '47_bz_item_effects.csv', 94, 'target_type', 'nearest_friendly_item')],
    ['deterministic-target-operation', (dir) => mutateCell(dir, '47_bz_item_effects.csv', 94, 'operation_type', 'deal_damage')],
    ['deterministic-target-trigger', (dir) => {
      mutateCell(dir, '47_bz_item_effects.csv', 94, 'trigger_event', 'another_friendly_item_used');
      mutateCell(dir, '47_bz_item_effects.csv', 94, 'condition_type', 'source_item_has_any_tag');
      mutateCell(dir, '47_bz_item_effects.csv', 94, 'condition_tags', 'tool');
    }],
    ['collection-target-tags-missing', (dir) => (
      mutateCell(dir, '47_bz_item_effects.csv', 129, 'target_tags', '')
    )],
    ['collection-target-tags-unknown', (dir) => (
      mutateCell(dir, '47_bz_item_effects.csv', 129, 'target_tags', 'powder')
    )],
    ['collection-target-tags-duplicate', (dir) => (
      mutateCell(dir, '47_bz_item_effects.csv', 129, 'target_tags', 'weapon, weapon')
    )],
    ['collection-target-tags-on-static', (dir) => (
      mutateCell(dir, '47_bz_item_effects.csv', 1, 'target_tags', 'weapon')
    )],
    ['collection-target-alias', (dir) => (
      mutateCell(dir, '47_bz_item_effects.csv', 129, 'target_type', 'all_friendly_items')
    )],
    ['collection-target-operation', (dir) => (
      mutateCell(dir, '47_bz_item_effects.csv', 129, 'operation_type', 'reload')
    )],
    ['collection-target-trigger', (dir) => (
      mutateCell(dir, '47_bz_item_effects.csv', 129, 'trigger_event', 'battle_start')
    )],
    ['collection-target-condition', (dir) => {
      mutateCell(dir, '47_bz_item_effects.csv', 129, 'condition_type', 'source_item_has_any_tag');
      mutateCell(dir, '47_bz_item_effects.csv', 129, 'condition_tags', 'weapon');
    }],
    ['collection-target-adjacency', (dir) => (
      mutateCell(dir, '47_bz_item_effects.csv', 129, 'condition_source_relation', 'adjacent')
    )],
    ['random-target-tags-missing', (dir) => (
      mutateCell(dir, '47_bz_item_effects.csv', 133, 'target_tags', '')
    )],
    ['random-target-tags-unknown', (dir) => (
      mutateCell(dir, '47_bz_item_effects.csv', 133, 'target_tags', 'powder')
    )],
    ['random-target-tags-duplicate', (dir) => (
      mutateCell(dir, '47_bz_item_effects.csv', 133, 'target_tags', 'weapon, weapon')
    )],
    ['random-target-tags-unsorted', (dir) => (
      mutateCell(dir, '47_bz_item_effects.csv', 133, 'target_tags', 'weapon, tool')
    )],
    ['random-target-exclude-self-missing', (dir) => (
      mutateCell(dir, '47_bz_item_effects.csv', 133, 'target_exclude_self', '')
    )],
    ['random-target-exclude-self-zero', (dir) => (
      mutateCell(dir, '47_bz_item_effects.csv', 133, 'target_exclude_self', '0')
    )],
    ['random-target-exclude-self-one', (dir) => (
      mutateCell(dir, '47_bz_item_effects.csv', 133, 'target_exclude_self', '1')
    )],
    ['random-target-exclude-self-noncanonical-string', (dir) => (
      mutateCell(dir, '47_bz_item_effects.csv', 133, 'target_exclude_self', 'False')
    )],
    ['random-target-count-missing', (dir) => (
      mutateCell(dir, '47_bz_item_effects.csv', 133, 'target_count', '')
    )],
    ['random-target-count-zero', (dir) => (
      mutateCell(dir, '47_bz_item_effects.csv', 133, 'target_count', '0')
    )],
    ['random-target-count-more-than-one', (dir) => (
      mutateCell(dir, '47_bz_item_effects.csv', 133, 'target_count', '2')
    )],
    ['random-target-count-not-integer', (dir) => (
      mutateCell(dir, '47_bz_item_effects.csv', 133, 'target_count', 'true')
    )],
    ['random-target-alias', (dir) => (
      mutateCell(dir, '47_bz_item_effects.csv', 133, 'target_type', 'random_friendly_weapon')
    )],
    ['random-target-operation', (dir) => (
      mutateCell(dir, '47_bz_item_effects.csv', 133, 'operation_type', 'reload')
    )],
    ['random-target-trigger', (dir) => (
      mutateCell(dir, '47_bz_item_effects.csv', 133, 'trigger_event', 'battle_start')
    )],
    ['random-target-condition', (dir) => {
      mutateCell(dir, '47_bz_item_effects.csv', 133, 'condition_type', 'source_item_has_any_tag');
      mutateCell(dir, '47_bz_item_effects.csv', 133, 'condition_tags', 'weapon');
    }],
    ['random-target-adjacency', (dir) => (
      mutateCell(dir, '47_bz_item_effects.csv', 133, 'condition_source_relation', 'adjacent')
    )],
    ['collection-target-random-param-forbidden', (dir) => (
      mutateCell(dir, '47_bz_item_effects.csv', 129, 'target_exclude_self', 'true')
    )],
    ['static-target-random-count-forbidden', (dir) => (
      mutateCell(dir, '47_bz_item_effects.csv', 1, 'target_count', '1')
    )],
    ['trigger-source-target-ready-forbidden', (dir) => {
      mutateCell(dir, '47_bz_item_effects.csv', 114, 'trigger_event', 'item_ready');
      mutateCell(dir, '47_bz_item_effects.csv', 114, 'condition_type', 'always');
      mutateCell(dir, '47_bz_item_effects.csv', 114, 'condition_tags', '');
    }],
    ['trigger-source-target-operation-forbidden', (dir) => {
      mutateCell(dir, '47_bz_item_effects.csv', 114, 'operation_type', 'charge');
      mutateCell(dir, '47_bz_item_effects.csv', 114, 'amount', '');
      mutateCell(dir, '47_bz_item_effects.csv', 114, 'ticks', '1');
    }],
    ['trigger-source-target-ready-damage-forbidden', (dir) => (
      mutateCell(dir, '47_bz_item_effects.csv', 113, 'target_type', 'trigger_source_item')
    )],
    ['battle-start-condition-forbidden', (dir) => {
      mutateCell(dir, '47_bz_item_effects.csv', 121, 'condition_type', 'source_item_has_any_tag');
      mutateCell(dir, '47_bz_item_effects.csv', 121, 'condition_tags', 'tool');
    }],
    ['battle-start-adjacency-forbidden', (dir) => (
      mutateCell(dir, '47_bz_item_effects.csv', 121, 'condition_source_relation', 'adjacent')
    )],
    ['battle-start-target-forbidden', (dir) => (
      mutateCell(dir, '47_bz_item_effects.csv', 121, 'target_type', 'self_item')
    )],
    ['battle-start-operation-forbidden', (dir) => (
      mutateCell(dir, '47_bz_item_effects.csv', 121, 'operation_type', 'heal')
    )],
    ['battle-start-extra-param-forbidden', (dir) => (
      mutateCell(dir, '47_bz_item_effects.csv', 121, 'ticks', '1')
    )],
    ['battle-start-amount-zero', (dir) => (
      mutateCell(dir, '47_bz_item_effects.csv', 121, 'amount', '0')
    )],
    ['battle-start-ready-damage-forbidden', (dir) => (
      mutateCell(dir, '47_bz_item_effects.csv', 1, 'trigger_event', 'battle_start')
    )],
    ['battle-start-collection-forbidden', (dir) => (
      mutateCell(dir, '47_bz_item_effects.csv', 121, 'target_type', 'all_friendly_items')
    )],
    ['defense-effect-target', (dir) => mutateCell(dir, '47_bz_item_effects.csv', 61, 'target_type', 'self_item')],
    ['defense-effect-amount-zero', (dir) => mutateCell(dir, '47_bz_item_effects.csv', 61, 'amount', '0')],
    ['defense-effect-extra-ticks', (dir) => mutateCell(dir, '47_bz_item_effects.csv', 61, 'ticks', '1')],
    ['defense-effect-operation', (dir) => mutateCell(dir, '47_bz_item_effects.csv', 61, 'operation_type', 'restore_health')],
    ['defense-effect-reactive-forbidden', (dir) => {
      mutateCell(dir, '47_bz_item_effects.csv', 61, 'trigger_event', 'another_friendly_item_used');
      mutateCell(dir, '47_bz_item_effects.csv', 61, 'condition_type', 'source_item_has_any_tag');
      mutateCell(dir, '47_bz_item_effects.csv', 61, 'condition_tags', 'tool');
    }],
    ['encounter', (dir) => mutateCell(dir, '53_bz_encounters.csv', 1, 'enemy_id', '')],
    ['ghost-encounter-enemy-mixed', (dir) => mutateCell(dir, '53_bz_encounters.csv', 2, 'enemy_id', 'enemy_breakwater_raider')],
    ['ghost-encounter-snapshot-missing', (dir) => mutateCell(dir, '53_bz_encounters.csv', 2, 'snapshot_id', '')],
    ['pve-encounter-snapshot-mixed', (dir) => mutateCell(dir, '53_bz_encounters.csv', 1, 'snapshot_id', 'ghost_snapshot_day_01')],
    ['ghost-snapshot-schema', (dir) => mutateCell(dir, '60_bz_ghost_snapshots.csv', 1, 'schema_version', '1')],
    ['ghost-snapshot-source', (dir) => mutateCell(dir, '60_bz_ghost_snapshots.csv', 1, 'match_source', 'fixture')],
    ['ghost-snapshot-content-revision', (dir) => mutateCell(dir, '60_bz_ghost_snapshots.csv', 1, 'opponent_content_revision', 'stale')],
    ['ghost-snapshot-hero-unknown', (dir) => mutateCell(dir, '60_bz_ghost_snapshots.csv', 1, 'hero_id', 'hero_missing')],
    ['ghost-snapshot-hero-level', (dir) => mutateCell(dir, '60_bz_ghost_snapshots.csv', 1, 'hero_level', '0')],
    ['hero-skill-trigger', (dir) => mutateCell(dir, '62_bz_hero_skills.csv', 1, 'trigger_event', 'item_ready')],
    ['hero-skill-battle-start-forbidden', (dir) => mutateCell(dir, '62_bz_hero_skills.csv', 1, 'trigger_event', 'battle_start')],
    ['hero-skill-reentrant', (dir) => mutateCell(dir, '62_bz_hero_skills.csv', 1, 'reentrant', 'true')],
    ['hero-skill-owner-drift', (dir) => mutateCell(dir, '62_bz_hero_skills.csv', 1, 'hero_id', 'hero_missing')],
    ['hero-skill-effect-description', (dir) => mutateCell(dir, '62_bz_hero_skills.csv', 1, 'effect_description_zh', '')],
    ['hero-skill-quality-missing', (dir) => {
      const target = path.join(dir, '62_bz_hero_skills.csv');
      const rows = parseCsv(fs.readFileSync(target, 'utf8'));
      rows.splice(4, 1);
      fs.writeFileSync(target, encodeCsv(rows));
    }],
    ['hero-skill-target-operation', (dir) => mutateCell(dir, '62_bz_hero_skills.csv', 1, 'target_type', 'source_item')],
    ['hero-skill-effect-params', (dir) => mutateCell(dir, '62_bz_hero_skills.csv', 1, 'ticks', '1')],
    ['hero-skill-loadout-unknown', (dir) => mutateCell(dir, '63_bz_hero_skill_loadouts.csv', 1, 'hero_skill_id', 'skill_brine_cannon')],
    ['hero-skill-loadout-quality', (dir) => mutateCell(dir, '63_bz_hero_skill_loadouts.csv', 1, 'quality', 'silver')],
    ['hero-skill-loadout-order', (dir) => mutateCell(dir, '63_bz_hero_skill_loadouts.csv', 3, 'acquired_seq', '1')],
    ['hero-skill-loadout-instance-duplicate', (dir) => mutateCell(dir, '63_bz_hero_skill_loadouts.csv', 3, 'instance_id', 'ghost_d01_hero_skill_mist_salvo')],
    ['hero-skill-loadout-source', (dir) => mutateCell(dir, '63_bz_hero_skill_loadouts.csv', 2, 'source_type', 'starting_loadout')],
    ['ghost-hero-skill-day', (dir) => mutateCell(dir, '63_bz_hero_skill_loadouts.csv', 2, 'acquired_day', '2')],
    ['ghost-hero-skill-quality-band', (dir) => mutateCell(dir, '63_bz_hero_skill_loadouts.csv', 2, 'quality', 'silver')],
    ['hero-skill-trainer-owner', (dir) => mutateCell(dir, '64_bz_hero_skill_trainers.csv', 1, 'hero_id', 'hero_missing')],
    ['hero-skill-trainer-stall', (dir) => mutateCell(dir, '64_bz_hero_skill_trainers.csv', 1, 'stall_id', 'stall_missing')],
    ['hero-skill-trainer-slots', (dir) => mutateCell(dir, '64_bz_hero_skill_trainers.csv', 1, 'offer_slots', '4')],
    ['hero-skill-offer-item-collision', (dir) => mutateCell(dir, '65_bz_hero_skill_offers.csv', 1, 'offer_id', 'offer_initial_emberwake_lantern')],
    ['hero-skill-offer-trainer', (dir) => mutateCell(dir, '65_bz_hero_skill_offers.csv', 1, 'trainer_id', 'trainer_missing')],
    ['hero-skill-offer-skill', (dir) => mutateCell(dir, '65_bz_hero_skill_offers.csv', 1, 'hero_skill_id', 'hero_skill_missing')],
    ['hero-skill-offer-action', (dir) => mutateCell(dir, '65_bz_hero_skill_offers.csv', 4, 'action_type', 'purchase')],
    ['hero-skill-offer-learn-upgrade-id', (dir) => mutateCell(dir, '65_bz_hero_skill_offers.csv', 4, 'upgrade_id', 'forged_upgrade')],
    ['hero-skill-upgrade-item-collision', (dir) => mutateCell(dir, '65_bz_hero_skill_offers.csv', 1, 'upgrade_id', 'upgrade_brine_cannon_bronze_silver')],
    ['hero-skill-offer-nonadjacent', (dir) => mutateCell(dir, '65_bz_hero_skill_offers.csv', 1, 'to_quality', 'gold')],
    ['hero-skill-offer-currency', (dir) => mutateCell(dir, '65_bz_hero_skill_offers.csv', 1, 'price_currency', 'gems')],
    ['hero-skill-offer-price', (dir) => mutateCell(dir, '65_bz_hero_skill_offers.csv', 1, 'price_amount', '0')],
    ['hero-skill-offer-window-order', (dir) => mutateCell(dir, '65_bz_hero_skill_offers.csv', 1, 'to_day', '1')],
    ['hero-skill-offer-beyond-day10', (dir) => mutateCell(dir, '65_bz_hero_skill_offers.csv', 1, 'to_day', '11')],
    ['hero-skill-offer-order', (dir) => mutateCell(dir, '65_bz_hero_skill_offers.csv', 2, 'offer_order', '1')],
    ['hero-skill-learn-path-missing', (dir) => {
      const target = path.join(dir, '65_bz_hero_skill_offers.csv');
      const rows = parseCsv(fs.readFileSync(target, 'utf8'));
      rows.splice(4, 1);
      fs.writeFileSync(target, encodeCsv(rows));
    }],
    ['ghost-snapshot-item', (dir) => mutateCell(dir, '60_bz_ghost_snapshots.csv', 1, 'item_id', 'item_missing')],
    ['ghost-snapshot-instance-duplicate', (dir) => mutateCell(dir, '60_bz_ghost_snapshots.csv', 2, 'instance_id', 'ghost_d01_emberwake')],
    ['relation', (dir) => mutateCell(dir, '52_bz_event_options.csv', 1, 'reward_id', 'reward_missing')],
    ['retired-level-placeholder-as-event', (dir) => mutateCell(dir, '52_bz_event_options.csv', 1, 'reward_id', 'reward_level_2')],
    ['display-description', (dir) => mutateCell(dir, '51_bz_events.csv', 1, 'description_zh', '')],
    ['upgrade-transition', (dir) => mutateCell(dir, '57_bz_item_upgrades.csv', 1, 'to_quality', 'gold')],
    ['enchantment-noop', (dir) => {
      mutateCell(dir, '58_bz_enchantments.csv', 1, 'cooldown_delta_ticks', '0');
    }],
    ['enchantment-ammo-incompatible', (dir) => {
      mutateCell(dir, '58_bz_enchantments.csv', 1, 'item_id', 'item_patchwork_ram');
      mutateCell(dir, '58_bz_enchantments.csv', 1, 'ammo_delta', '1');
    }],
    ['unsupported-enchantment', (dir) => mutateCell(dir, '50_bz_stall_offers.csv', 1, 'enchantment', 'fiery')],
    ['source-frozen', (dir) => mutateCell(dir, '50_bz_stall_offers.csv', 1, 'frozen', 'true')],
    ['terminal-pressure-enabled', (dir) => mutateColumn(dir, '44_bz_gameplay.csv', 'terminal_pressure_enabled', 'yes')],
    ['terminal-pressure-disabled', (dir) => mutateColumn(dir, '44_bz_gameplay.csv', 'terminal_pressure_enabled', 'false')],
    ['terminal-pressure-start', (dir) => mutateColumn(dir, '44_bz_gameplay.csv', 'terminal_pressure_start_tick', '0')],
    ['terminal-pressure-interval', (dir) => mutateColumn(dir, '44_bz_gameplay.csv', 'terminal_pressure_interval_ticks', '')],
    ['terminal-pressure-initial', (dir) => mutateColumn(dir, '44_bz_gameplay.csv', 'terminal_pressure_initial_damage', '0')],
    ['terminal-pressure-increment', (dir) => mutateColumn(dir, '44_bz_gameplay.csv', 'terminal_pressure_increment_damage', '-1')],
    ['old-source-content-schema', (dir) => mutateColumn(dir, '44_bz_gameplay.csv', 'schema_version', '25')],
    ['old-source-runtime-schema', (dir) => mutateColumn(dir, '44_bz_gameplay.csv', 'runtime_schema_version', '23')],
    ['income-policy', (dir) => mutateColumn(dir, '44_bz_gameplay.csv', 'income_payout_policy', 'hour_complete')],
    ['prestige-scope', (dir) => mutateColumn(dir, '44_bz_gameplay.csv', 'prestige_battle_kind', 'pve')],
    ['last-chance-policy-link', (dir) => mutateColumn(dir, '44_bz_gameplay.csv', 'last_chance_policy_id', 'last_chance_missing')],
    ['progression-disabled', (dir) => mutateColumn(dir, '59_bz_level_up_choices.csv', 'enabled', 'false')],
    ['progression-option-duplicate', (dir) => mutateCell(dir, '59_bz_level_up_choices.csv', 2, 'option_id', 'level_option_2_gold')],
    ['progression-order-duplicate', (dir) => mutateCell(dir, '59_bz_level_up_choices.csv', 2, 'option_order', '1')],
    ['progression-gold-zero', (dir) => mutateCell(dir, '59_bz_level_up_choices.csv', 1, 'amount', '0')],
    ['progression-item-unknown', (dir) => mutateCell(dir, '59_bz_level_up_choices.csv', 2, 'item_id', 'item_missing')],
    ['progression-item-quality', (dir) => mutateCell(dir, '59_bz_level_up_choices.csv', 2, 'quality', 'bronze')],
    ['progression-upgrade-target', (dir) => mutateCell(dir, '59_bz_level_up_choices.csv', 3, 'target_rule', 'first_owned_item')],
    ['progression-upgrade-steps', (dir) => mutateCell(dir, '59_bz_level_up_choices.csv', 3, 'amount', '2')],
    ['progression-threshold-drift', (dir) => mutateCell(dir, '59_bz_level_up_choices.csv', 2, 'required_xp', '5')],
    ['progression-milestone-missing', (dir) => {
      const target = path.join(dir, '59_bz_level_up_choices.csv');
      const rows = parseCsv(fs.readFileSync(target, 'utf8'));
      const milestoneColumn = rows[0].indexOf('milestone_id');
      fs.writeFileSync(target, encodeCsv(rows.filter((row, index) => (
        index === 0 || row[milestoneColumn] !== 'milestone_level_4'
      ))));
    }],
    ['last-chance-schema', (dir) => mutateCell(dir, '61_bz_last_chance_choices.csv', 1, 'schema_version', '2')],
    ['last-chance-trigger-kind', (dir) => mutateCell(dir, '61_bz_last_chance_choices.csv', 1, 'trigger_battle_kind', 'pve')],
    ['last-chance-trigger-outcome', (dir) => mutateCell(dir, '61_bz_last_chance_choices.csv', 1, 'trigger_outcomes', 'loss,win')],
    ['last-chance-trigger-threshold', (dir) => mutateCell(dir, '61_bz_last_chance_choices.csv', 1, 'trigger_prestige_at_or_below', '1')],
    ['last-chance-option-duplicate', (dir) => mutateCell(dir, '61_bz_last_chance_choices.csv', 2, 'option_id', 'last_chance_tidehold_ransom')],
    ['last-chance-order-duplicate', (dir) => mutateCell(dir, '61_bz_last_chance_choices.csv', 2, 'option_order', '1')],
    ['last-chance-restore-zero', (dir) => mutateCell(dir, '61_bz_last_chance_choices.csv', 1, 'restore_prestige', '0')],
    ['last-chance-cost-type', (dir) => mutateCell(dir, '61_bz_last_chance_choices.csv', 1, 'cost_type', 'remove_item')],
    ['last-chance-paid-cost-zero', (dir) => mutateCell(dir, '61_bz_last_chance_choices.csv', 1, 'cost_amount', '0')],
    ['last-chance-fallback-cost', (dir) => mutateCell(dir, '61_bz_last_chance_choices.csv', 3, 'cost_amount', '1')],
    ['last-chance-fallback-missing', (dir) => {
      mutateCell(dir, '61_bz_last_chance_choices.csv', 3, 'cost_type', 'spend_gold');
      mutateCell(dir, '61_bz_last_chance_choices.csv', 3, 'cost_amount', '1');
    }],
  ];
  for (const [name, mutation] of cases) {
    const dir = mutateDomain(mutation);
    const out = path.join(dir, `${name}.json`);
    const displayOut = path.join(dir, `${name}.display.json`);
    const result = runExporter(dir, out, displayOut);
    assert.notEqual(result.status, 0, `${name} should fail closed`);
    assert.equal(fs.existsSync(out), false, `${name} must not leave a package`);
    assert.equal(fs.existsSync(displayOut), false, `${name} must not leave a display sidecar`);
  }
});

test('OPC04 缺任一声明刷新层或日程战斗槽时整包拒绝', () => {
  const refreshDir = mutateDomain((dir) => {
    const target = path.join(dir, '50_bz_stall_offers.csv');
    const rows = parseCsv(fs.readFileSync(target, 'utf8'));
    const refreshColumn = rows[0].indexOf('refresh_index');
    fs.writeFileSync(target, encodeCsv(rows.filter((row, index) => index === 0 || row[refreshColumn] !== '10')));
  });
  const refreshOut = path.join(refreshDir, 'package.json');
  assert.notEqual(runExporter(refreshDir, refreshOut).status, 0);
  assert.equal(fs.existsSync(refreshOut), false);

  const refreshGapDir = mutateDomain((dir) => {
    const target = path.join(dir, '50_bz_stall_offers.csv');
    const rows = parseCsv(fs.readFileSync(target, 'utf8'));
    const refreshColumn = rows[0].indexOf('refresh_index');
    fs.writeFileSync(target, encodeCsv(rows.filter((row, index) => index === 0 || row[refreshColumn] !== '5')));
  });
  const refreshGapOut = path.join(refreshGapDir, 'package.json');
  assert.notEqual(runExporter(refreshGapDir, refreshGapOut).status, 0);
  assert.equal(fs.existsSync(refreshGapOut), false);

  const battleDir = mutateDomain((dir) => {
    const target = path.join(dir, '53_bz_encounters.csv');
    const rows = parseCsv(fs.readFileSync(target, 'utf8'));
    rows.pop();
    fs.writeFileSync(target, encodeCsv(rows));
  });
  const battleOut = path.join(battleDir, 'package.json');
  assert.notEqual(runExporter(battleDir, battleOut).status, 0);
  assert.equal(fs.existsSync(battleOut), false);
});

test('OPC05 23 域行重排不改变 canonical runtime、hash 或 display sidecar', () => {
  const baselineDir = fs.mkdtempSync(path.join(os.tmpdir(), 'original-pirate-canonical-baseline-'));
  const baselineOut = path.join(baselineDir, 'content.json');
  const baselineDisplay = path.join(baselineDir, 'display.json');
  assert.equal(runExporter(csvDir, baselineOut, baselineDisplay).status, 0);

  const reorderedDir = mutateDomain((dir) => {
    for (const file of domainFiles) reverseDataRows(dir, file);
  });
  const reorderedOut = path.join(reorderedDir, 'content.json');
  const reorderedDisplay = path.join(reorderedDir, 'display.json');
  assert.equal(runExporter(reorderedDir, reorderedOut, reorderedDisplay).status, 0);
  assert.equal(fs.readFileSync(reorderedOut, 'utf8'), fs.readFileSync(baselineOut, 'utf8'));
  assert.equal(fs.readFileSync(reorderedDisplay, 'utf8'), fs.readFileSync(baselineDisplay, 'utf8'));
});

test('OPC05B starter 与 Ghost 允许非空合法英雄技能子集', () => {
  const subsetDir = mutateDomain((dir) => {
    const target = path.join(dir, '63_bz_hero_skill_loadouts.csv');
    const rows = parseCsv(fs.readFileSync(target, 'utf8'));
    const kindColumn = rows[0].indexOf('loadout_kind');
    const skillColumn = rows[0].indexOf('hero_skill_id');
    fs.writeFileSync(target, encodeCsv(rows.filter((row, index) => (
      index === 0 || row[kindColumn] !== 'ghost_snapshot'
        || row[skillColumn] !== 'hero_skill_tailwind_return'
    ))));
  });
  const out = path.join(subsetDir, 'subset.json');
  assert.equal(runExporter(subsetDir, out).status, 0);
  const content = JSON.parse(fs.readFileSync(out, 'utf8'));
  assert.equal(content.runtimeBundle.executableCatalogs.heroes[0].startingHeroSkills.length, 1);
  assert.equal(content.runtimeBundle.generation.battle.ghostSnapshots.every(({ build }) => (
    build.heroSkills.length === 1 && build.heroSkills[0].heroSkillId === 'hero_skill_mist_salvo'
  )), true);
  assert.equal(validatePackageFile(out).status, 0);
});

test('OPC05C validator fixture 接受英雄技能复用 owner_hero 防御操作 exact 五字段', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'original-pirate-hero-defense-fixture-'));
  const baseline = path.join(dir, 'baseline.json');
  const target = path.join(dir, 'hero-defense.json');
  assert.equal(runExporter(csvDir, baseline).status, 0);
  const content = JSON.parse(fs.readFileSync(baseline, 'utf8'));
  const [healEffect] = content.runtimeBundle.executableCatalogs.heroSkills
    .find(({ heroSkillId }) => heroSkillId === 'hero_skill_mist_salvo')
    .qualityProfiles.bronze.effects;
  Object.assign(healEffect, {
    targetType: 'owner_hero', operationType: 'heal', amount: 1, ticks: 0,
  });
  const [shieldEffect] = content.runtimeBundle.executableCatalogs.heroSkills
    .find(({ heroSkillId }) => heroSkillId === 'hero_skill_tailwind_return')
    .qualityProfiles.bronze.effects;
  Object.assign(shieldEffect, {
    targetType: 'owner_hero', operationType: 'gain_shield', amount: 2, ticks: 0,
  });
  content.runtimeBundle.bundleHash = expectedBundleHash(content);
  fs.writeFileSync(target, `${canonicalJson(content)}\n`, 'utf8');
  assert.equal(validatePackageFile(target).status, 0);
});

test('OPC05D gain_damage_for_fight 可复用 canonical 物品标签条件', () => {
  const sourceDir = mutateDomain((dir) => {
    mutateRowById(dir, '47_bz_item_effects.csv', 'effect_id',
      'effect_tidescar_matchlock_bronze_growth', 'condition_tags', 'tool');
  });
  const out = path.join(sourceDir, 'generic-growth-tag.json');
  assert.equal(runExporter(sourceDir, out).status, 0);
  const content = JSON.parse(fs.readFileSync(out, 'utf8'));
  const effect = content.items.find(({ itemId }) => itemId === 'item_tidescar_matchlock')
    .qualityProfiles.bronze.effects.find(({ operation }) => operation.type === 'gain_damage_for_fight');
  assert.deepEqual(effect.trigger.conditions, [
    { type: 'source_item_has_any_tag', params: { tags: ['tool'] } },
  ]);
  assert.equal(validatePackageFile(out).status, 0);
});

test('OPC06 v32/v30 forged Crit/Burn成功响应、Ammo depletion、Heal/Cleanse、Poison/Burn/Crit、随机/集合/开场触发或 hash 整包拒绝', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'original-pirate-v32-forgery-'));
  const baseline = path.join(dir, 'baseline.json');
  assert.equal(runExporter(csvDir, baseline).status, 0);
  const content = JSON.parse(fs.readFileSync(baseline, 'utf8'));
  assert.equal(validatePackageFile(baseline).status, 0);
  const cases = [
    ['old-root-schema', (value) => { value.schemaVersion = 29; }],
    ['old-runtime-schema', (value) => { value.runtimeBundle.schemaVersion = 27; }],
    ['old-executable-catalog-schema', (value) => { value.runtimeBundle.executableCatalogs.schemaVersion = 19; }],
    ['old-rules-version', (value) => {
      value.rulesVersion = 'ysbzs.original-pirate-rules.2026-09-03-v25';
      value.runtimeBundle.rulesVersion = value.rulesVersion;
    }],
    ['progression-rules-missing', (value) => { delete value.runtimeBundle.progressionRules; }],
    ['progression-rules-extra-field', (value) => { value.runtimeBundle.progressionRules.fallback = []; }],
    ['progression-disabled', (value) => { value.runtimeBundle.progressionRules.enabled = false; }],
    ['progression-milestone-duplicate', (value) => {
      value.runtimeBundle.progressionRules.milestones[1].milestoneId = value.runtimeBundle.progressionRules.milestones[0].milestoneId;
    }],
    ['progression-option-duplicate', (value) => {
      value.runtimeBundle.progressionRules.options[1].optionId = value.runtimeBundle.progressionRules.options[0].optionId;
    }],
    ['progression-option-milestone-unknown', (value) => {
      value.runtimeBundle.progressionRules.options[0].milestoneId = 'milestone_missing';
    }],
    ['progression-milestone-option-missing', (value) => {
      value.runtimeBundle.progressionRules.milestones[0].optionIds.pop();
    }],
    ['progression-gold-zero', (value) => {
      value.runtimeBundle.progressionRules.options.find(({ effect }) => effect.type === 'change_gold').effect.amount = 0;
    }],
    ['progression-item-unknown', (value) => {
      value.runtimeBundle.progressionRules.options.find(({ effect }) => effect.type === 'grant_item').effect.itemId = 'item_missing';
    }],
    ['progression-item-quality', (value) => {
      value.runtimeBundle.progressionRules.options.find(({ effect }) => effect.type === 'grant_item').effect.quality = 'mythic';
    }],
    ['progression-item-quantity-zero', (value) => {
      value.runtimeBundle.progressionRules.options.find(({ effect }) => effect.type === 'grant_item').effect.quantity = 0;
    }],
    ['progression-upgrade-target', (value) => {
      value.runtimeBundle.progressionRules.options.find(({ effect }) => effect.type === 'upgrade_owned_item').effect.targetRule = 'first_owned_item';
    }],
    ['progression-upgrade-steps', (value) => {
      value.runtimeBundle.progressionRules.options.find(({ effect }) => effect.type === 'upgrade_owned_item').effect.steps = 2;
    }],
    ['progression-effect-extra-field', (value) => {
      value.runtimeBundle.progressionRules.options[0].effect.formula = 'forged';
    }],
    ['progression-effect-missing-field', (value) => {
      delete value.runtimeBundle.progressionRules.options.find(({ effect }) => effect.type === 'change_gold').effect.amount;
    }],
    ['schedule-level-threshold-double-authority', (value) => { value.runtimeBundle.scheduleConfig.levelThresholds = []; }],
    ['schedule-income-policy-forged', (value) => { value.runtimeBundle.scheduleConfig.incomePayoutPolicy = 'hour_complete'; }],
    ['prestige-policy-old-pve-field', (value) => { value.runtimeBundle.scheduleConfig.prestigePolicy.pveLoss = 4; }],
    ['prestige-policy-schema', (value) => { value.runtimeBundle.scheduleConfig.prestigePolicy.schemaVersion = 2; }],
    ['prestige-policy-scope', (value) => { value.runtimeBundle.scheduleConfig.prestigePolicy.affectedBattleKind = 'pve'; }],
    ['prestige-policy-loss-zero', (value) => { value.runtimeBundle.scheduleConfig.prestigePolicy.lossAmount = 0; }],
    ['prestige-loss-double-authority', (value) => {
      value.runtimeBundle.scheduleConfig.prestigeLoss = { pveLoss: 0, pveDraw: 0, ghostLoss: 6, ghostDraw: 2 };
    }],
    ['last-chance-rules-missing', (value) => { delete value.runtimeBundle.scheduleConfig.lastChanceRules; }],
    ['last-chance-rules-extra-field', (value) => { value.runtimeBundle.scheduleConfig.lastChanceRules.fallback = true; }],
    ['last-chance-schema', (value) => { value.runtimeBundle.scheduleConfig.lastChanceRules.schemaVersion = 2; }],
    ['last-chance-policy-link', (value) => { value.runtimeBundle.scheduleConfig.terminalRules.lastChancePolicyId = 'last_chance_missing'; }],
    ['last-chance-max-uses', (value) => { value.runtimeBundle.scheduleConfig.lastChanceRules.maxUsesPerRun = 2; }],
    ['last-chance-trigger-extra-field', (value) => { value.runtimeBundle.scheduleConfig.lastChanceRules.trigger.hour = 6; }],
    ['last-chance-trigger-kind', (value) => { value.runtimeBundle.scheduleConfig.lastChanceRules.trigger.battleKind = 'pve'; }],
    ['last-chance-trigger-outcomes', (value) => { value.runtimeBundle.scheduleConfig.lastChanceRules.trigger.outcomes = ['loss']; }],
    ['last-chance-trigger-threshold', (value) => { value.runtimeBundle.scheduleConfig.lastChanceRules.trigger.prestigeAtOrBelow = 1; }],
    ['last-chance-option-count', (value) => { value.runtimeBundle.scheduleConfig.lastChanceRules.options.pop(); }],
    ['last-chance-option-extra-field', (value) => { value.runtimeBundle.scheduleConfig.lastChanceRules.options[0].title = 'forged'; }],
    ['last-chance-option-duplicate', (value) => {
      value.runtimeBundle.scheduleConfig.lastChanceRules.options[1].optionId = value.runtimeBundle.scheduleConfig.lastChanceRules.options[0].optionId;
    }],
    ['last-chance-restore-zero', (value) => { value.runtimeBundle.scheduleConfig.lastChanceRules.options[0].restorePrestige = 0; }],
    ['last-chance-restore-over-start', (value) => { value.runtimeBundle.scheduleConfig.lastChanceRules.options[0].restorePrestige = 21; }],
    ['last-chance-cost-extra-field', (value) => { value.runtimeBundle.scheduleConfig.lastChanceRules.options[0].cost.currency = 'gold'; }],
    ['last-chance-cost-type', (value) => { value.runtimeBundle.scheduleConfig.lastChanceRules.options[0].cost.type = 'remove_item'; }],
    ['last-chance-paid-cost-zero', (value) => { value.runtimeBundle.scheduleConfig.lastChanceRules.options[0].cost.amount = 0; }],
    ['last-chance-fallback-cost', (value) => { value.runtimeBundle.scheduleConfig.lastChanceRules.options[2].cost.amount = 1; }],
    ['last-chance-fallback-missing', (value) => {
      value.runtimeBundle.scheduleConfig.lastChanceRules.options[2].cost = { type: 'spend_gold', amount: 1 };
    }],
    ['last-chance-fallback-duplicate', (value) => {
      value.runtimeBundle.scheduleConfig.lastChanceRules.options[1].cost = { type: 'none', amount: 0 };
    }],
    ['new-run-level-rewards-missing', (value) => { delete value.runtimeBundle.newRunTemplate.levelRewards; }],
    ['new-run-level-rewards-extra-field', (value) => { value.runtimeBundle.newRunTemplate.levelRewards.pendingOptionIds = []; }],
    ['new-run-level-rewards-prepopulated', (value) => {
      value.runtimeBundle.newRunTemplate.levelRewards.pendingMilestoneIds = ['milestone_level_2'];
    }],
    ['new-run-last-chance-boolean', (value) => { value.runtimeBundle.newRunTemplate.run.lastChance = false; }],
    ['new-run-last-chance-extra-field', (value) => { value.runtimeBundle.newRunTemplate.run.lastChance.usedCount = 0; }],
    ['new-run-last-chance-prepopulated', (value) => {
      value.runtimeBundle.newRunTemplate.run.lastChance.policyId = 'last_chance_mistwake_v1';
    }],
    ['battle-rules-missing', (value) => { delete value.runtimeBundle.battleRules; }],
    ['battle-rules-extra-field', (value) => { value.runtimeBundle.battleRules.formula = 'forged'; }],
    ['ammo-depletion-rules-missing', (value) => { delete value.runtimeBundle.battleRules.ammoDepletionRules; }],
    ['ammo-depletion-rules-extra-field', (value) => { value.runtimeBundle.battleRules.ammoDepletionRules.amount = 2; }],
    ['ammo-depletion-rules-contract', (value) => { value.runtimeBundle.battleRules.ammoDepletionRules.contractId = 'ysbzs.original-pirate-ammo-depletion.v2'; }],
    ['ammo-depletion-rules-trigger', (value) => { value.runtimeBundle.battleRules.ammoDepletionRules.triggerPolicy = 'ammo_is_zero'; }],
    ['ammo-depletion-rules-phase', (value) => { value.runtimeBundle.battleRules.ammoDepletionRules.evaluationPhase = 'after_item_effects'; }],
    ['ammo-depletion-rules-snapshot', (value) => { value.runtimeBundle.battleRules.ammoDepletionRules.snapshotPolicy = 'current_ammo_only'; }],
    ['ammo-depletion-rules-repeat', (value) => { value.runtimeBundle.battleRules.ammoDepletionRules.repeatPolicy = 'once_per_battle'; }],
    ['ammo-depletion-rules-non-ammo', (value) => { value.runtimeBundle.battleRules.ammoDepletionRules.nonAmmoPolicy = 'treat_as_zero'; }],
    ['ammo-depletion-rules-reload', (value) => { value.runtimeBundle.battleRules.ammoDepletionRules.reloadPolicy = 'cancel_if_reloaded'; }],
    ['ammo-depletion-rules-rng', (value) => { value.runtimeBundle.battleRules.ammoDepletionRules.rngPolicy = 'draw_once'; }],
    ['damage-aura-rules-missing', (value) => { delete value.runtimeBundle.battleRules.damageAuraRules; }],
    ['damage-aura-rules-extra-field', (value) => { value.runtimeBundle.battleRules.damageAuraRules.rounding = 'floor'; }],
    ['damage-aura-rules-phase', (value) => { value.runtimeBundle.battleRules.damageAuraRules.damagePhase = 'after_crit'; }],
    ['damage-aura-object-extra-field', (value) => {
      value.items.find(({ itemId }) => itemId === 'item_mistkelp_remedy_kit')
        .qualityProfiles.bronze.auras[0].source = 'forged';
    }],
    ['damage-aura-target-alias', (value) => {
      value.items.find(({ itemId }) => itemId === 'item_mistkelp_remedy_kit')
        .qualityProfiles.bronze.auras[0].target.type = 'all_friendly_items';
    }],
    ['damage-aura-target-extra-param', (value) => {
      value.items.find(({ itemId }) => itemId === 'item_mistkelp_remedy_kit')
        .qualityProfiles.bronze.auras[0].target.params.count = 1;
    }],
    ['damage-aura-exclude-self-false', (value) => {
      value.items.find(({ itemId }) => itemId === 'item_mistkelp_remedy_kit')
        .qualityProfiles.bronze.auras[0].target.params.excludeSelf = false;
    }],
    ['damage-aura-operation-alias', (value) => {
      value.items.find(({ itemId }) => itemId === 'item_mistkelp_remedy_kit')
        .qualityProfiles.bronze.auras[0].operation.type = 'gain_damage_for_fight';
    }],
    ['damage-aura-amount-zero', (value) => {
      value.items.find(({ itemId }) => itemId === 'item_mistkelp_remedy_kit')
        .qualityProfiles.bronze.auras[0].operation.params.amount = 0;
    }],
    ['damage-aura-skill-reference-missing', (value) => {
      value.runtimeBundle.executableCatalogs.itemSkills.find(({ itemSkillId }) => (
        itemSkillId === 'skill_mistkelp_remedy_kit'
      )).auraIds.pop();
    }],
    ['terminal-pressure-missing-field', (value) => { delete value.runtimeBundle.battleRules.terminalPressure.intervalTicks; }],
    ['terminal-pressure-extra-field', (value) => { value.runtimeBundle.battleRules.terminalPressure.maxDamage = 99; }],
    ['terminal-pressure-enabled-string', (value) => { value.runtimeBundle.battleRules.terminalPressure.enabled = 'true'; }],
    ['terminal-pressure-disabled', (value) => { value.runtimeBundle.battleRules.terminalPressure.enabled = false; }],
    ['terminal-pressure-start-zero', (value) => { value.runtimeBundle.battleRules.terminalPressure.startTick = 0; }],
    ['terminal-pressure-interval-zero', (value) => { value.runtimeBundle.battleRules.terminalPressure.intervalTicks = 0; }],
    ['terminal-pressure-initial-zero', (value) => { value.runtimeBundle.battleRules.terminalPressure.initialDamage = 0; }],
    ['terminal-pressure-increment-negative', (value) => { value.runtimeBundle.battleRules.terminalPressure.incrementDamage = -1; }],
    ['heal-cleanse-rules-missing', (value) => { delete value.runtimeBundle.battleRules.healStatusCleanseRules; }],
    ['heal-cleanse-rules-extra-field', (value) => { value.runtimeBundle.battleRules.healStatusCleanseRules.source = 'forged'; }],
    ['heal-cleanse-rules-contract', (value) => { value.runtimeBundle.battleRules.healStatusCleanseRules.contractId = 'ysbzs.original-pirate-heal-status-cleanse.v2'; }],
    ['heal-cleanse-rules-trigger', (value) => { value.runtimeBundle.battleRules.healStatusCleanseRules.triggerPolicy = 'after_authored_heal'; }],
    ['heal-cleanse-rules-basis', (value) => { value.runtimeBundle.battleRules.healStatusCleanseRules.healBasis = 'authored_heal'; }],
    ['heal-cleanse-rules-scale', (value) => { value.runtimeBundle.battleRules.healStatusCleanseRules.cleanseScaleBps = 2499; }],
    ['heal-cleanse-rules-scale-bool', (value) => { value.runtimeBundle.battleRules.healStatusCleanseRules.cleanseScaleBps = true; }],
    ['heal-cleanse-rules-rounding', (value) => { value.runtimeBundle.battleRules.healStatusCleanseRules.roundingMode = 'floor'; }],
    ['heal-cleanse-rules-targets', (value) => { value.runtimeBundle.battleRules.healStatusCleanseRules.statusTargets = ['burn']; }],
    ['heal-cleanse-rules-target-order', (value) => { value.runtimeBundle.battleRules.healStatusCleanseRules.statusTargets = ['poison', 'burn']; }],
    ['heal-cleanse-rules-resolution', (value) => { value.runtimeBundle.battleRules.healStatusCleanseRules.statusResolutionPolicy = 'sequential'; }],
    ['heal-cleanse-rules-poison-schedule', (value) => { value.runtimeBundle.battleRules.healStatusCleanseRules.poisonSchedulePolicy = 'always_clear_due'; }],
    ['heal-cleanse-rules-trace-emit', (value) => { value.runtimeBundle.battleRules.healStatusCleanseRules.traceEmitPolicy = 'always'; }],
    ['heal-cleanse-rules-crit', (value) => { value.runtimeBundle.battleRules.healStatusCleanseRules.critPolicy = 'profile'; }],
    ['heal-cleanse-rules-rng', (value) => { value.runtimeBundle.battleRules.healStatusCleanseRules.rngPolicy = 'draw_once'; }],
    ['poison-rules-missing', (value) => { delete value.runtimeBundle.battleRules.poisonRules; }],
    ['poison-rules-extra-field', (value) => { value.runtimeBundle.battleRules.poisonRules.source = 'forged'; }],
    ['poison-rules-contract', (value) => { value.runtimeBundle.battleRules.poisonRules.contractId = 'ysbzs.original-pirate-poison.v1'; }],
    ['poison-rules-pulse-interval', (value) => { value.runtimeBundle.battleRules.poisonRules.pulseIntervalTicks = 9; }],
    ['poison-rules-pulse-interval-bool', (value) => { value.runtimeBundle.battleRules.poisonRules.pulseIntervalTicks = true; }],
    ['poison-rules-first-pulse', (value) => { value.runtimeBundle.battleRules.poisonRules.firstPulsePolicy = 'next_tick'; }],
    ['poison-rules-reapply-schedule', (value) => { value.runtimeBundle.battleRules.poisonRules.reapplySchedulePolicy = 'restart_full_interval'; }],
    ['poison-rules-pulse-phase', (value) => { value.runtimeBundle.battleRules.poisonRules.pulsePhase = 'tick_end'; }],
    ['poison-rules-damage-per-stack', (value) => { value.runtimeBundle.battleRules.poisonRules.damagePerStack = 2; }],
    ['poison-rules-decay', (value) => { value.runtimeBundle.battleRules.poisonRules.decayStacksPerPulse = 1; }],
    ['poison-rules-shield-policy', (value) => { value.runtimeBundle.battleRules.poisonRules.shieldPolicy = 'shield_first_consuming'; }],
    ['poison-rules-resolution-order', (value) => { value.runtimeBundle.battleRules.poisonRules.resolutionOrder = 'player_then_enemy'; }],
    ['poison-rules-heal-cleanse', (value) => { value.runtimeBundle.battleRules.poisonRules.healCleansePolicy = 'none'; }],
    ['poison-rules-crit', (value) => { value.runtimeBundle.battleRules.poisonRules.critPolicy = 'profile'; }],
    ['poison-rules-max-stacks', (value) => { value.runtimeBundle.battleRules.poisonRules.maxStacks = 999999; }],
    ['poison-rules-overflow-policy', (value) => { value.runtimeBundle.battleRules.poisonRules.stackOverflowPolicy = 'clamp'; }],
    ['burn-rules-missing', (value) => { delete value.runtimeBundle.battleRules.burnRules; }],
    ['burn-rules-extra-field', (value) => { value.runtimeBundle.battleRules.burnRules.source = 'forged'; }],
    ['burn-rules-contract', (value) => { value.runtimeBundle.battleRules.burnRules.contractId = 'ysbzs.original-pirate-burn.v1'; }],
    ['burn-rules-pulse-interval', (value) => { value.runtimeBundle.battleRules.burnRules.pulseIntervalTicks = 2; }],
    ['burn-rules-pulse-interval-bool', (value) => { value.runtimeBundle.battleRules.burnRules.pulseIntervalTicks = true; }],
    ['burn-rules-first-pulse', (value) => { value.runtimeBundle.battleRules.burnRules.firstPulsePolicy = 'same_tick'; }],
    ['burn-rules-pulse-phase', (value) => { value.runtimeBundle.battleRules.burnRules.pulsePhase = 'tick_end'; }],
    ['burn-rules-damage-per-stack', (value) => { value.runtimeBundle.battleRules.burnRules.damagePerStack = 2; }],
    ['burn-rules-decay', (value) => { value.runtimeBundle.battleRules.burnRules.decayStacksPerPulse = 2; }],
    ['burn-rules-shield-policy', (value) => { value.runtimeBundle.battleRules.burnRules.shieldPolicy = 'bypass'; }],
    ['burn-rules-resolution-order', (value) => { value.runtimeBundle.battleRules.burnRules.resolutionOrder = 'player_then_enemy'; }],
    ['burn-rules-max-stacks', (value) => { value.runtimeBundle.battleRules.burnRules.maxStacks = 999999; }],
    ['burn-rules-overflow-policy', (value) => { value.runtimeBundle.battleRules.burnRules.stackOverflowPolicy = 'clamp'; }],
    ['crit-rules-missing', (value) => { delete value.runtimeBundle.battleRules.critRules; }],
    ['crit-rules-extra-field', (value) => { value.runtimeBundle.battleRules.critRules.seed = 'forged'; }],
    ['crit-rules-contract', (value) => { value.runtimeBundle.battleRules.critRules.contractId = 'ysbzs.original-pirate-critical-damage.v1'; }],
    ['crit-rules-scale', (value) => { value.runtimeBundle.battleRules.critRules.chanceScaleBps = 1000; }],
    ['crit-rules-multiplier-at-scale', (value) => { value.runtimeBundle.battleRules.critRules.damageMultiplierBps = 10000; }],
    ['crit-rules-multiplier-over-cap', (value) => { value.runtimeBundle.battleRules.critRules.damageMultiplierBps = 100001; }],
    ['crit-rules-rounding', (value) => { value.runtimeBundle.battleRules.critRules.roundingMode = 'ceil'; }],
    ['crit-rules-scope', (value) => { value.runtimeBundle.battleRules.critRules.rollScope = 'damage_effect'; }],
    ['crit-rules-draw-policy', (value) => { value.runtimeBundle.battleRules.critRules.drawPolicy = 'per_damage_effect'; }],
    ['crit-rules-growth-stacking', (value) => { value.runtimeBundle.battleRules.critRules.growthStackingPolicy = 'highest_only'; }],
    ['crit-rules-growth-cap', (value) => { value.runtimeBundle.battleRules.critRules.growthCapPolicy = 'clamp_authored_delta'; }],
    ['crit-rules-growth-timing', (value) => { value.runtimeBundle.battleRules.critRules.growthTimingPolicy = 'include_current_use'; }],
    ['crit-rules-growth-eligible-target', (value) => { value.runtimeBundle.battleRules.critRules.growthEligibleTargetPolicy = 'any_weapon'; }],
    ['crit-rules-growth-rng', (value) => { value.runtimeBundle.battleRules.critRules.growthRngPolicy = 'draw_once'; }],
    ['crit-rules-success-evidence', (value) => { value.runtimeBundle.battleRules.critRules.successResponseEvidencePolicy = 'crit_flag_only'; }],
    ['crit-rules-success-source', (value) => { value.runtimeBundle.battleRules.critRules.successResponseSourcePolicy = 'any_friendly_item'; }],
    ['crit-rules-success-timing', (value) => { value.runtimeBundle.battleRules.critRules.successResponseTimingPolicy = 'during_damage'; }],
    ['crit-rules-success-repeat', (value) => { value.runtimeBundle.battleRules.critRules.successResponseRepeatPolicy = 'per_damage_effect'; }],
    ['crit-rules-success-terminal', (value) => { value.runtimeBundle.battleRules.critRules.successResponseTerminalPolicy = 'trigger_after_terminal'; }],
    ['crit-rules-success-rng', (value) => { value.runtimeBundle.battleRules.critRules.successResponseRngPolicy = 'draw_once'; }],
    ['extra-catalog-field', (value) => { value.runtimeBundle.executableCatalogs.auditText = 'not-runtime'; }],
    ['retired-skills-catalog', (value) => { value.runtimeBundle.executableCatalogs.skills = []; }],
    ['item-skill-extra-field', (value) => { value.runtimeBundle.executableCatalogs.itemSkills[0].heroId = 'hero_mistwake_captain'; }],
    ['item-skill-old-trigger-field', (value) => {
      const skill = value.runtimeBundle.executableCatalogs.itemSkills[0];
      skill.triggerEvent = skill.triggerEvents[0];
      delete skill.triggerEvents;
    }],
    ['item-skill-trigger-events-unsorted', (value) => {
      value.runtimeBundle.executableCatalogs.itemSkills
        .find(({ itemSkillId }) => itemSkillId === 'skill_wake_echo_drum').triggerEvents.reverse();
    }],
    ['item-skill-trigger-coverage', (value) => {
      value.runtimeBundle.executableCatalogs.itemSkills
        .find(({ itemSkillId }) => itemSkillId === 'skill_wake_echo_drum').triggerEvents = ['item_ready'];
    }],
    ['hero-item-skill-cross-reference', (value) => {
      value.runtimeBundle.executableCatalogs.heroes[0].heroSkillIds[0] = 'skill_brine_cannon';
    }],
    ['hero-skill-extra-field', (value) => { value.runtimeBundle.executableCatalogs.heroSkills[0].sourceText = 'forged'; }],
    ['hero-skill-trigger', (value) => { value.runtimeBundle.executableCatalogs.heroSkills[0].triggerEvent = 'item_ready'; }],
    ['hero-skill-battle-start-forbidden', (value) => {
      value.runtimeBundle.executableCatalogs.heroSkills[0].triggerEvent = 'battle_start';
    }],
    ['hero-skill-reentrant', (value) => { value.runtimeBundle.executableCatalogs.heroSkills[0].reentrant = true; }],
    ['hero-skill-profile-missing', (value) => { delete value.runtimeBundle.executableCatalogs.heroSkills[0].qualityProfiles.diamond; }],
    ['hero-skill-profile-unknown', (value) => {
      value.runtimeBundle.executableCatalogs.heroSkills[0].qualityProfiles.mythic = structuredClone(
        value.runtimeBundle.executableCatalogs.heroSkills[0].qualityProfiles.diamond,
      );
    }],
    ['hero-skill-profile-extra-field', (value) => { value.runtimeBundle.executableCatalogs.heroSkills[0].qualityProfiles.bronze.cooldown = 1; }],
    ['hero-skill-effect-target', (value) => {
      value.runtimeBundle.executableCatalogs.heroSkills[0].qualityProfiles.bronze.effects[0].targetType = 'source_item';
    }],
    ['hero-skill-effect-forged-ticks', (value) => {
      value.runtimeBundle.executableCatalogs.heroSkills[0].qualityProfiles.bronze.effects[0].ticks = 1;
    }],
    ['hero-skill-defense-target', (value) => {
      const effect = value.runtimeBundle.executableCatalogs.heroSkills[0].qualityProfiles.bronze.effects[0];
      Object.assign(effect, {
        targetType: 'source_item', operationType: 'heal', amount: 1, ticks: 0,
      });
    }],
    ['hero-skill-defense-ticks', (value) => {
      const effect = value.runtimeBundle.executableCatalogs.heroSkills[0].qualityProfiles.bronze.effects[0];
      Object.assign(effect, {
        targetType: 'owner_hero', operationType: 'gain_shield', amount: 1, ticks: 1,
      });
    }],
    ['starting-hero-skill-source', (value) => {
      value.runtimeBundle.executableCatalogs.heroes[0].startingHeroSkills[0].sourceType = 'offline_snapshot';
    }],
    ['starting-hero-skill-order', (value) => {
      value.runtimeBundle.executableCatalogs.heroes[0].startingHeroSkills[0].acquiredSeq = 2;
    }],
    ['starting-hero-skill-empty', (value) => {
      value.runtimeBundle.executableCatalogs.heroes[0].startingHeroSkills = [];
    }],
    ['hero-skill-trainer-extra-field', (value) => {
      value.runtimeBundle.executableCatalogs.heroSkillTrainers[0].sourceType = 'hero_skill_trainer';
    }],
    ['hero-skill-trainer-stall', (value) => {
      value.runtimeBundle.executableCatalogs.heroSkillTrainers[0].stallId = 'stall_missing';
    }],
    ['hero-skill-trainer-offer-order', (value) => {
      value.runtimeBundle.executableCatalogs.heroSkillTrainers[0].offerIds.reverse();
    }],
    ['hero-skill-offer-extra-field', (value) => {
      value.runtimeBundle.executableCatalogs.heroSkillOffers[0].sourceType = 'hero_skill_trainer';
    }],
    ['hero-skill-learn-action-extra-field', (value) => {
      value.runtimeBundle.executableCatalogs.heroSkillOffers
        .find(({ action }) => action.type === 'learn').action.fromQuality = '';
    }],
    ['hero-skill-upgrade-transition', (value) => {
      value.runtimeBundle.executableCatalogs.heroSkillOffers
        .find(({ action }) => action.type === 'upgrade').action.toQuality = 'diamond';
    }],
    ['hero-skill-upgrade-item-collision', (value) => {
      value.runtimeBundle.executableCatalogs.heroSkillOffers
        .find(({ action }) => action.type === 'upgrade').action.upgradeId =
          value.runtimeBundle.executableCatalogs.upgrades[0].upgradeId;
    }],
    ['hero-skill-offer-price-currency', (value) => {
      value.runtimeBundle.executableCatalogs.heroSkillOffers[0].price.currency = 'gems';
    }],
    ['hero-skill-offer-window-beyond-maximum-day', (value) => {
      value.runtimeBundle.executableCatalogs.heroSkillOffers[0].availability.toDay = 11;
    }],
    ['hero-skill-offer-order-duplicate', (value) => {
      const offers = value.runtimeBundle.executableCatalogs.heroSkillOffers
        .filter(({ trainerId }) => trainerId === 'trainer_mistwake_gunnery');
      offers[1].order = offers[0].order;
    }],
    ['retired-level-placeholder-through-event', (value) => { value.runtimeBundle.executableCatalogs.eventOptions[0].rewardId = 'reward_level_2'; }],
    ['item-reward-board-slot', (value) => { value.runtimeBundle.executableCatalogs.rewards.find(({ rewardId }) => rewardId === 'reward_signal_flare').effects[0].startSlot = 4; }],
    ['reward-level-trigger', (value) => { value.runtimeBundle.executableCatalogs.rewards[0].trigger.event = 'LEVEL_UP'; }],
    ['stall-template-missing', (value) => { value.runtimeBundle.executableCatalogs.stalls[0].shopTemplateIds.pop(); }],
    ['stall-offer-count-drift', (value) => { value.runtimeBundle.executableCatalogs.stalls[0].offerCount = 2; value.runtimeBundle.generation.shop.offerCount = 2; }],
    ['upgrade-price-forged', (value) => { value.runtimeBundle.executableCatalogs.upgrades[0].price = 0; }],
    ['upgrade-transition-forged', (value) => { value.runtimeBundle.executableCatalogs.upgrades[0].toQuality = 'diamond'; }],
    ['enchantment-profile-extra-field', (value) => { value.runtimeBundle.executableCatalogs.enchantments[0].profiles[0].formula = 'forged'; }],
    ['enchantment-profile-noop', (value) => {
      Object.assign(value.runtimeBundle.executableCatalogs.enchantments[0].profiles[0], {
        cooldownDeltaTicks: 0, damageDelta: 0, ammoDelta: 0,
      });
    }],
    ['item-profile-extra-field', (value) => {
      value.items.find(({ itemId }) => itemId === 'item_brine_cannon').qualityProfiles.bronze.formula = 'forged';
    }],
    ['ammo-depletion-condition-params', (value) => {
      value.items.find(({ itemId }) => itemId === 'item_tidefin_launcher')
        .qualityProfiles.bronze.effects.find(({ trigger }) => (
          trigger.conditions[0].type === 'source_item_ammo_depleted'
        )).trigger.conditions[0].params = { threshold: 0 };
    }],
    ['ammo-depletion-trigger', (value) => {
      value.items.find(({ itemId }) => itemId === 'item_tidefin_launcher')
        .qualityProfiles.bronze.effects.find(({ trigger }) => (
          trigger.conditions[0].type === 'source_item_ammo_depleted'
        )).trigger.event = 'another_friendly_item_used';
    }],
    ['ammo-depletion-target', (value) => {
      value.items.find(({ itemId }) => itemId === 'item_tidefin_launcher')
        .qualityProfiles.bronze.effects.find(({ trigger }) => (
          trigger.conditions[0].type === 'source_item_ammo_depleted'
        )).target.type = 'self_item';
    }],
    ['ammo-depletion-operation', (value) => {
      value.items.find(({ itemId }) => itemId === 'item_tidefin_launcher')
        .qualityProfiles.bronze.effects.find(({ trigger }) => (
          trigger.conditions[0].type === 'source_item_ammo_depleted'
        )).operation.type = 'heal';
    }],
    ['ammo-depletion-profile-disabled', (value) => {
      value.items.find(({ itemId }) => itemId === 'item_tidefin_launcher')
        .qualityProfiles.bronze.ammo = { enabled: false, initial: 0, maximum: 0 };
    }],
    ['ammo-depletion-profile-empty-capacity', (value) => {
      value.items.find(({ itemId }) => itemId === 'item_tidefin_launcher')
        .qualityProfiles.bronze.ammo = { enabled: true, initial: 0, maximum: 0 };
    }],
    ['item-profile-crit-missing', (value) => {
      delete value.items.find(({ itemId }) => itemId === 'item_tideglass_sidearm')
        .qualityProfiles.bronze.critChanceBps;
    }],
    ['item-profile-crit-over-scale', (value) => {
      value.items.find(({ itemId }) => itemId === 'item_tideglass_sidearm')
        .qualityProfiles.bronze.critChanceBps = 10001;
    }],
    ['item-profile-positive-without-crit-effect', (value) => {
      value.items.find(({ itemId }) => itemId === 'item_tideglass_sidearm')
        .qualityProfiles.bronze.effects[0].operation.params.canCrit = false;
    }],
    ['item-damage-can-crit-missing', (value) => {
      delete value.items.find(({ itemId }) => itemId === 'item_tideglass_sidearm')
        .qualityProfiles.bronze.effects[0].operation.params.canCrit;
    }],
    ['item-damage-can-crit-not-bool', (value) => {
      value.items.find(({ itemId }) => itemId === 'item_tideglass_sidearm')
        .qualityProfiles.bronze.effects[0].operation.params.canCrit = 'true';
    }],
    ['item-crit-damage-over-safe-max', (value) => {
      value.items.find(({ itemId }) => itemId === 'item_tideglass_sidearm')
        .qualityProfiles.bronze.effects[0].operation.params.amount = 922337203685477600;
    }],
    ['item-profile-second-noneligible-damage', (value) => {
      const profile = value.items.find(({ itemId }) => itemId === 'item_tideglass_sidearm')
        .qualityProfiles.bronze;
      const extra = structuredClone(profile.effects[0]);
      extra.effectId = 'effect_tideglass_sidearm_bronze_second_damage';
      extra.priority = 21;
      extra.operation.params.canCrit = false;
      profile.effects.push(extra);
      value.runtimeBundle.executableCatalogs.itemSkills
        .find(({ itemSkillId }) => itemSkillId === 'skill_tideglass_sidearm')
        .effectIds.push(extra.effectId);
    }],
    ['item-profile-second-eligible-damage', (value) => {
      const profile = value.items.find(({ itemId }) => itemId === 'item_tideglass_sidearm')
        .qualityProfiles.bronze;
      const extra = structuredClone(profile.effects[0]);
      extra.effectId = 'effect_tideglass_sidearm_bronze_second_crit';
      extra.priority = 21;
      profile.effects.push(extra);
      value.runtimeBundle.executableCatalogs.itemSkills
        .find(({ itemSkillId }) => itemSkillId === 'skill_tideglass_sidearm')
        .effectIds.push(extra.effectId);
    }],
    ['crit-effect-trigger-forged', (value) => {
      value.items.find(({ itemId }) => itemId === 'item_tideglass_sidearm')
        .qualityProfiles.bronze.effects[0].trigger = {
          event: 'another_friendly_item_used',
          conditions: [{ type: 'source_item_has_any_tag', params: { tags: ['weapon'] } }],
        };
    }],
    ['item-tags-missing', (value) => { delete value.items[0].tags; }],
    ['item-tags-extra', (value) => { value.items[0].tagText = 'weapon'; }],
    ['item-tags-unknown', (value) => { value.items[0].tags = ['cannon']; }],
    ['item-tags-duplicate', (value) => { value.items[0].tags = ['weapon', 'weapon']; }],
    ['item-tags-unsorted', (value) => { value.items[0].tags.reverse(); }],
    ['reactive-condition-tags-unsorted', (value) => {
      const effect = value.items.find(({ itemId }) => itemId === 'item_wake_echo_drum')
        .qualityProfiles.bronze.effects.find(({ trigger }) => trigger.event === 'another_friendly_item_used');
      effect.trigger.conditions[0].params.tags.reverse();
    }],
    ['reactive-condition-type', (value) => {
      const effect = value.items.find(({ itemId }) => itemId === 'item_wake_echo_drum')
        .qualityProfiles.bronze.effects.find(({ trigger }) => trigger.event === 'another_friendly_item_used');
      effect.trigger.conditions[0] = { type: 'always', params: {} };
    }],
    ['adjacent-condition-reordered', (value) => {
      const effect = value.items.find(({ itemId }) => itemId === 'item_mistline_ratchet')
        .qualityProfiles.bronze.effects.find(({ trigger }) => trigger.event === 'another_friendly_item_used');
      effect.trigger.conditions.reverse();
    }],
    ['adjacent-condition-duplicate', (value) => {
      const effect = value.items.find(({ itemId }) => itemId === 'item_mistline_ratchet')
        .qualityProfiles.bronze.effects.find(({ trigger }) => trigger.event === 'another_friendly_item_used');
      effect.trigger.conditions.push({ type: 'source_item_adjacent_to_self', params: {} });
    }],
    ['adjacent-condition-params-forged', (value) => {
      const effect = value.items.find(({ itemId }) => itemId === 'item_mistline_ratchet')
        .qualityProfiles.bronze.effects.find(({ trigger }) => trigger.event === 'another_friendly_item_used');
      effect.trigger.conditions[1].params = { maximumGap: 1 };
    }],
    ['adjacent-condition-tag-duplicated', (value) => {
      const effect = value.items.find(({ itemId }) => itemId === 'item_mistline_ratchet')
        .qualityProfiles.bronze.effects.find(({ trigger }) => trigger.event === 'another_friendly_item_used');
      effect.trigger.conditions[0].params.tags.push('ammo');
    }],
    ['reactive-operation-unsupported', (value) => {
      const effect = value.items.find(({ itemId }) => itemId === 'item_wake_echo_drum')
        .qualityProfiles.bronze.effects.find(({ trigger }) => trigger.event === 'another_friendly_item_used');
      effect.operation = { type: 'apply_status', params: { status: 'haste', ticks: 1 } };
    }],
    ['damage-growth-target', (value) => {
      value.items.find(({ itemId }) => itemId === 'item_tidescar_matchlock')
        .qualityProfiles.bronze.effects.find(({ operation }) => operation.type === 'gain_damage_for_fight')
        .target.type = 'selected_enemy';
    }],
    ['damage-growth-trigger', (value) => {
      const effect = value.items.find(({ itemId }) => itemId === 'item_tidescar_matchlock')
        .qualityProfiles.bronze.effects.find(({ operation }) => operation.type === 'gain_damage_for_fight');
      effect.trigger = { event: 'item_ready', conditions: [{ type: 'always', params: {} }] };
    }],
    ['damage-growth-condition', (value) => {
      const effect = value.items.find(({ itemId }) => itemId === 'item_tidescar_matchlock')
        .qualityProfiles.bronze.effects.find(({ operation }) => operation.type === 'gain_damage_for_fight');
      effect.trigger.conditions = [{ type: 'always', params: {} }];
    }],
    ['damage-growth-amount-zero', (value) => {
      value.items.find(({ itemId }) => itemId === 'item_tidescar_matchlock')
        .qualityProfiles.bronze.effects.find(({ operation }) => operation.type === 'gain_damage_for_fight')
        .operation.params.amount = 0;
    }],
    ['damage-growth-extra-param', (value) => {
      value.items.find(({ itemId }) => itemId === 'item_tidescar_matchlock')
        .qualityProfiles.bronze.effects.find(({ operation }) => operation.type === 'gain_damage_for_fight')
        .operation.params.ticks = 1;
    }],
    ['damage-growth-active-damage-required', (value) => {
      const ready = value.items.find(({ itemId }) => itemId === 'item_tidescar_matchlock')
        .qualityProfiles.bronze.effects.find(({ trigger }) => trigger.event === 'item_ready');
      ready.target.type = 'self_item';
      ready.operation = { type: 'charge', params: { ticks: 1 } };
    }],
    ['crit-growth-condition-params', (value) => {
      value.items.find(({ itemId }) => itemId === 'item_followwake_calibrator')
        .qualityProfiles.bronze.effects.find(({ operation }) => operation.type === 'gain_crit_chance_for_fight')
        .trigger.conditions[0].params.tags = ['weapon'];
    }],
    ['crit-growth-condition-alias', (value) => {
      value.items.find(({ itemId }) => itemId === 'item_followwake_calibrator')
        .qualityProfiles.bronze.effects.find(({ operation }) => operation.type === 'gain_crit_chance_for_fight')
        .trigger.conditions[0] = { type: 'source_item_has_any_tag', params: { tags: ['weapon'] } };
    }],
    ['crit-growth-trigger', (value) => {
      const effect = value.items.find(({ itemId }) => itemId === 'item_followwake_calibrator')
        .qualityProfiles.bronze.effects.find(({ operation }) => operation.type === 'gain_crit_chance_for_fight');
      effect.trigger = { event: 'item_ready', conditions: [{ type: 'always', params: {} }] };
    }],
    ['crit-growth-target', (value) => {
      value.items.find(({ itemId }) => itemId === 'item_followwake_calibrator')
        .qualityProfiles.bronze.effects.find(({ operation }) => operation.type === 'gain_crit_chance_for_fight')
        .target.type = 'self_item';
    }],
    ['crit-growth-delta-zero', (value) => {
      value.items.find(({ itemId }) => itemId === 'item_followwake_calibrator')
        .qualityProfiles.bronze.effects.find(({ operation }) => operation.type === 'gain_crit_chance_for_fight')
        .operation.params.critChanceBpsDelta = 0;
    }],
    ['crit-growth-delta-over-scale', (value) => {
      value.items.find(({ itemId }) => itemId === 'item_followwake_calibrator')
        .qualityProfiles.bronze.effects.find(({ operation }) => operation.type === 'gain_crit_chance_for_fight')
        .operation.params.critChanceBpsDelta = 10001;
    }],
    ['crit-growth-delta-bool', (value) => {
      value.items.find(({ itemId }) => itemId === 'item_followwake_calibrator')
        .qualityProfiles.bronze.effects.find(({ operation }) => operation.type === 'gain_crit_chance_for_fight')
        .operation.params.critChanceBpsDelta = true;
    }],
    ['crit-growth-extra-param', (value) => {
      value.items.find(({ itemId }) => itemId === 'item_followwake_calibrator')
        .qualityProfiles.bronze.effects.find(({ operation }) => operation.type === 'gain_crit_chance_for_fight')
        .operation.params.amount = 500;
    }],
    ['crit-growth-directory-missing', (value) => {
      value.runtimeBundle.executableCatalogs.itemSkills.find(({ itemSkillId }) => (
        itemSkillId === 'skill_followwake_calibrator'
      )).effectIds = ['effect_followwake_calibrator_bronze_ready'];
    }],
    ['crit-success-condition-forged', (value) => {
      value.items.find(({ itemId }) => itemId === 'item_followwake_calibrator')
        .qualityProfiles.bronze.effects.find(({ trigger }) => (
          trigger.event === 'another_friendly_item_crit'
        )).trigger.conditions = [{ type: 'source_item_can_crit', params: {} }];
    }],
    ['crit-success-target-forged', (value) => {
      value.items.find(({ itemId }) => itemId === 'item_followwake_calibrator')
        .qualityProfiles.bronze.effects.find(({ trigger }) => (
          trigger.event === 'another_friendly_item_crit'
        )).target.type = 'trigger_source_item';
    }],
    ['crit-success-target-params-forged', (value) => {
      value.items.find(({ itemId }) => itemId === 'item_followwake_calibrator')
        .qualityProfiles.bronze.effects.find(({ trigger }) => (
          trigger.event === 'another_friendly_item_crit'
        )).target.params = { fallback: 'self_item' };
    }],
    ['crit-success-operation-forged', (value) => {
      value.items.find(({ itemId }) => itemId === 'item_followwake_calibrator')
        .qualityProfiles.bronze.effects.find(({ trigger }) => (
          trigger.event === 'another_friendly_item_crit'
        )).operation = { type: 'reload', params: { amount: 1 } };
    }],
    ['crit-success-ticks-zero', (value) => {
      value.items.find(({ itemId }) => itemId === 'item_followwake_calibrator')
        .qualityProfiles.bronze.effects.find(({ trigger }) => (
          trigger.event === 'another_friendly_item_crit'
        )).operation.params.ticks = 0;
    }],
    ['crit-success-trigger-alias', (value) => {
      value.items.find(({ itemId }) => itemId === 'item_followwake_calibrator')
        .qualityProfiles.bronze.effects.find(({ trigger }) => (
          trigger.event === 'another_friendly_item_crit'
        )).trigger.event = 'friendly_item_critted';
    }],
    ['crit-success-directory-trigger-missing', (value) => {
      value.runtimeBundle.executableCatalogs.itemSkills.find(({ itemSkillId }) => (
        itemSkillId === 'skill_followwake_calibrator'
      )).triggerEvents = ['another_friendly_item_used', 'item_ready'];
    }],
    ['poison-operation-extra-param', (value) => {
      value.items.find(({ itemId }) => itemId === 'item_inkwake_doser')
        .qualityProfiles.bronze.effects[0].operation.params.amount = 2;
    }],
    ['poison-operation-stacks-zero', (value) => {
      value.items.find(({ itemId }) => itemId === 'item_inkwake_doser')
        .qualityProfiles.bronze.effects[0].operation.params.stacks = 0;
    }],
    ['poison-operation-stacks-over-max', (value) => {
      value.items.find(({ itemId }) => itemId === 'item_inkwake_doser')
        .qualityProfiles.bronze.effects[0].operation.params.stacks = 1000001;
    }],
    ['poison-operation-stacks-bool', (value) => {
      value.items.find(({ itemId }) => itemId === 'item_inkwake_doser')
        .qualityProfiles.bronze.effects[0].operation.params.stacks = true;
    }],
    ['poison-operation-trigger', (value) => {
      value.items.find(({ itemId }) => itemId === 'item_inkwake_doser')
        .qualityProfiles.bronze.effects[0].trigger = {
          event: 'another_friendly_item_used',
          conditions: [{ type: 'source_item_has_any_tag', params: { tags: ['tool'] } }],
        };
    }],
    ['poison-operation-target', (value) => {
      value.items.find(({ itemId }) => itemId === 'item_inkwake_doser')
        .qualityProfiles.bronze.effects[0].target.type = 'owner_hero';
    }],
    ['poison-profile-crit-forbidden', (value) => {
      value.items.find(({ itemId }) => itemId === 'item_inkwake_doser')
        .qualityProfiles.bronze.critChanceBps = 1;
    }],
    ['poison-profile-second-effect-forbidden', (value) => {
      const profile = value.items.find(({ itemId }) => itemId === 'item_inkwake_doser')
        .qualityProfiles.bronze;
      const extra = structuredClone(profile.effects[0]);
      extra.effectId = 'effect_inkwake_doser_bronze_second_poison';
      extra.priority = 21;
      profile.effects.push(extra);
      value.runtimeBundle.executableCatalogs.itemSkills
        .find(({ itemSkillId }) => itemSkillId === 'skill_inkwake_doser')
        .effectIds.push(extra.effectId);
    }],
    ['poison-operation-hero-skill-forbidden', (value) => {
      const effect = value.runtimeBundle.executableCatalogs.heroSkills[0]
        .qualityProfiles.bronze.effects[0];
      Object.assign(effect, {
        targetType: 'opponent_hero', operationType: 'apply_poison', amount: 2, ticks: 0,
      });
    }],
    ['burn-operation-extra-param', (value) => {
      value.items.find(({ itemId }) => itemId === 'item_emberwake_lantern')
        .qualityProfiles.bronze.effects[0].operation.params.amount = 3;
    }],
    ['burn-operation-stacks-zero', (value) => {
      value.items.find(({ itemId }) => itemId === 'item_emberwake_lantern')
        .qualityProfiles.bronze.effects[0].operation.params.stacks = 0;
    }],
    ['burn-operation-stacks-over-max', (value) => {
      value.items.find(({ itemId }) => itemId === 'item_emberwake_lantern')
        .qualityProfiles.bronze.effects[0].operation.params.stacks = 1000001;
    }],
    ['burn-operation-stacks-bool', (value) => {
      value.items.find(({ itemId }) => itemId === 'item_emberwake_lantern')
        .qualityProfiles.bronze.effects[0].operation.params.stacks = true;
    }],
    ['burn-operation-trigger', (value) => {
      value.items.find(({ itemId }) => itemId === 'item_emberwake_lantern')
        .qualityProfiles.bronze.effects[0].trigger = {
          event: 'another_friendly_item_used',
          conditions: [{ type: 'source_item_has_any_tag', params: { tags: ['tool'] } }],
        };
    }],
    ['burn-operation-target', (value) => {
      value.items.find(({ itemId }) => itemId === 'item_emberwake_lantern')
        .qualityProfiles.bronze.effects[0].target.type = 'owner_hero';
    }],
    ['burn-operation-hero-skill-forbidden', (value) => {
      const effect = value.runtimeBundle.executableCatalogs.heroSkills[0]
        .qualityProfiles.bronze.effects[0];
      Object.assign(effect, {
        targetType: 'opponent_hero', operationType: 'apply_burn', amount: 3, ticks: 0,
      });
    }],
    ['burn-response-condition-forged', (value) => {
      value.items.find(({ itemId }) => itemId === 'item_wake_echo_drum')
        .qualityProfiles.bronze.effects.find(({ trigger }) => (
          trigger.event === 'another_friendly_item_applied_burn'
        )).trigger.conditions = [{ type: 'always', params: {} }];
    }],
    ['burn-response-tag-forged', (value) => {
      value.items.find(({ itemId }) => itemId === 'item_wake_echo_drum')
        .qualityProfiles.bronze.effects.find(({ trigger }) => (
          trigger.event === 'another_friendly_item_applied_burn'
        )).trigger.conditions[0].params.tags = ['weapon'];
    }],
    ['burn-response-adjacency-forged', (value) => {
      value.items.find(({ itemId }) => itemId === 'item_wake_echo_drum')
        .qualityProfiles.bronze.effects.find(({ trigger }) => (
          trigger.event === 'another_friendly_item_applied_burn'
        )).trigger.conditions.push({ type: 'source_item_adjacent_to_self', params: {} });
    }],
    ['burn-response-target-forged', (value) => {
      value.items.find(({ itemId }) => itemId === 'item_wake_echo_drum')
        .qualityProfiles.bronze.effects.find(({ trigger }) => (
          trigger.event === 'another_friendly_item_applied_burn'
        )).target.type = 'trigger_source_item';
    }],
    ['burn-response-operation-forged', (value) => {
      value.items.find(({ itemId }) => itemId === 'item_wake_echo_drum')
        .qualityProfiles.bronze.effects.find(({ trigger }) => (
          trigger.event === 'another_friendly_item_applied_burn'
        )).operation.type = 'reload';
    }],
    ['burn-response-ticks-zero', (value) => {
      value.items.find(({ itemId }) => itemId === 'item_wake_echo_drum')
        .qualityProfiles.bronze.effects.find(({ trigger }) => (
          trigger.event === 'another_friendly_item_applied_burn'
        )).operation.params.ticks = 0;
    }],
    ['item-ready-effect-required', (value) => {
      const profile = value.items.find(({ itemId }) => itemId === 'item_wake_echo_drum').qualityProfiles.bronze;
      const effect = profile.effects.find(({ trigger }) => trigger.event === 'item_ready');
      effect.trigger = {
        event: 'another_friendly_item_used',
        conditions: [{ type: 'source_item_has_any_tag', params: { tags: ['weapon'] } }],
      };
    }],
    ['item-effect-extra-param', (value) => {
      value.items.find(({ itemId }) => itemId === 'item_signal_flare')
        .qualityProfiles.silver.effects.find(({ operation }) => operation.type === 'apply_status')
        .operation.params.amount = 1;
    }],
    ['item-effect-target-operation-mismatch', (value) => {
      value.items.find(({ itemId }) => itemId === 'item_brine_cannon')
        .qualityProfiles.bronze.effects[0].target.type = 'self_item';
    }],
    ['deterministic-target-unknown', (value) => {
      value.items.find(({ itemId }) => itemId === 'item_quadrant_linkage')
        .qualityProfiles.bronze.effects.find(({ priority }) => priority === 30)
        .target.type = 'nearest_friendly_item';
    }],
    ['deterministic-target-extra-param', (value) => {
      value.items.find(({ itemId }) => itemId === 'item_quadrant_linkage')
        .qualityProfiles.bronze.effects.find(({ priority }) => priority === 30)
        .target.params.excludeSelf = false;
    }],
    ['deterministic-target-operation-mismatch', (value) => {
      value.items.find(({ itemId }) => itemId === 'item_quadrant_linkage')
        .qualityProfiles.bronze.effects.find(({ priority }) => priority === 30)
        .operation = { type: 'deal_damage', params: { amount: 1 } };
    }],
    ['deterministic-target-trigger-mismatch', (value) => {
      value.items.find(({ itemId }) => itemId === 'item_quadrant_linkage')
        .qualityProfiles.bronze.effects.find(({ priority }) => priority === 30)
        .trigger = {
          event: 'another_friendly_item_used',
          conditions: [{ type: 'source_item_has_any_tag', params: { tags: ['tool'] } }],
        };
    }],
    ['collection-target-tags-missing', (value) => {
      delete value.items.find(({ itemId }) => itemId === 'item_broadside_signal_relay')
        .qualityProfiles.bronze.effects[0].target.params.tags;
    }],
    ['collection-target-tags-empty', (value) => {
      value.items.find(({ itemId }) => itemId === 'item_broadside_signal_relay')
        .qualityProfiles.bronze.effects[0].target.params.tags = [];
    }],
    ['collection-target-tags-unknown', (value) => {
      value.items.find(({ itemId }) => itemId === 'item_broadside_signal_relay')
        .qualityProfiles.bronze.effects[0].target.params.tags = ['powder'];
    }],
    ['collection-target-tags-duplicate', (value) => {
      value.items.find(({ itemId }) => itemId === 'item_broadside_signal_relay')
        .qualityProfiles.bronze.effects[0].target.params.tags = ['weapon', 'weapon'];
    }],
    ['collection-target-tags-unsorted', (value) => {
      value.items.find(({ itemId }) => itemId === 'item_broadside_signal_relay')
        .qualityProfiles.bronze.effects[0].target.params.tags = ['weapon', 'tool'];
    }],
    ['collection-target-extra-param', (value) => {
      value.items.find(({ itemId }) => itemId === 'item_broadside_signal_relay')
        .qualityProfiles.bronze.effects[0].target.params.fallback = 'self_item';
    }],
    ['collection-target-alias', (value) => {
      value.items.find(({ itemId }) => itemId === 'item_broadside_signal_relay')
        .qualityProfiles.bronze.effects[0].target.type = 'all_friendly_items';
    }],
    ['collection-target-operation-mismatch', (value) => {
      value.items.find(({ itemId }) => itemId === 'item_broadside_signal_relay')
        .qualityProfiles.bronze.effects[0].operation = { type: 'reload', params: { amount: 1 } };
    }],
    ['collection-target-trigger-mismatch', (value) => {
      value.items.find(({ itemId }) => itemId === 'item_broadside_signal_relay')
        .qualityProfiles.bronze.effects[0].trigger = {
          event: 'another_friendly_item_used',
          conditions: [{ type: 'source_item_has_any_tag', params: { tags: ['weapon'] } }],
        };
    }],
    ['random-target-tags-missing', (value) => {
      delete value.items.find(({ itemId }) => itemId === 'item_crosswind_selector')
        .qualityProfiles.bronze.effects[0].target.params.tags;
    }],
    ['random-target-tags-empty', (value) => {
      value.items.find(({ itemId }) => itemId === 'item_crosswind_selector')
        .qualityProfiles.bronze.effects[0].target.params.tags = [];
    }],
    ['random-target-tags-unknown', (value) => {
      value.items.find(({ itemId }) => itemId === 'item_crosswind_selector')
        .qualityProfiles.bronze.effects[0].target.params.tags = ['powder'];
    }],
    ['random-target-tags-duplicate', (value) => {
      value.items.find(({ itemId }) => itemId === 'item_crosswind_selector')
        .qualityProfiles.bronze.effects[0].target.params.tags = ['weapon', 'weapon'];
    }],
    ['random-target-tags-unsorted', (value) => {
      value.items.find(({ itemId }) => itemId === 'item_crosswind_selector')
        .qualityProfiles.bronze.effects[0].target.params.tags = ['weapon', 'tool'];
    }],
    ['random-target-exclude-self-missing', (value) => {
      delete value.items.find(({ itemId }) => itemId === 'item_crosswind_selector')
        .qualityProfiles.bronze.effects[0].target.params.excludeSelf;
    }],
    ['random-target-exclude-self-zero', (value) => {
      value.items.find(({ itemId }) => itemId === 'item_crosswind_selector')
        .qualityProfiles.bronze.effects[0].target.params.excludeSelf = 0;
    }],
    ['random-target-exclude-self-one', (value) => {
      value.items.find(({ itemId }) => itemId === 'item_crosswind_selector')
        .qualityProfiles.bronze.effects[0].target.params.excludeSelf = 1;
    }],
    ['random-target-exclude-self-not-bool', (value) => {
      value.items.find(({ itemId }) => itemId === 'item_crosswind_selector')
        .qualityProfiles.bronze.effects[0].target.params.excludeSelf = 'true';
    }],
    ['random-target-exclude-self-empty', (value) => {
      value.items.find(({ itemId }) => itemId === 'item_crosswind_selector')
        .qualityProfiles.bronze.effects[0].target.params.excludeSelf = '';
    }],
    ['random-target-count-missing', (value) => {
      delete value.items.find(({ itemId }) => itemId === 'item_crosswind_selector')
        .qualityProfiles.bronze.effects[0].target.params.count;
    }],
    ['random-target-count-zero', (value) => {
      value.items.find(({ itemId }) => itemId === 'item_crosswind_selector')
        .qualityProfiles.bronze.effects[0].target.params.count = 0;
    }],
    ['random-target-count-more-than-one', (value) => {
      value.items.find(({ itemId }) => itemId === 'item_crosswind_selector')
        .qualityProfiles.bronze.effects[0].target.params.count = 2;
    }],
    ['random-target-count-bool', (value) => {
      value.items.find(({ itemId }) => itemId === 'item_crosswind_selector')
        .qualityProfiles.bronze.effects[0].target.params.count = true;
    }],
    ['random-target-extra-param', (value) => {
      value.items.find(({ itemId }) => itemId === 'item_crosswind_selector')
        .qualityProfiles.bronze.effects[0].target.params.seed = 'forged';
    }],
    ['random-target-alias', (value) => {
      value.items.find(({ itemId }) => itemId === 'item_crosswind_selector')
        .qualityProfiles.bronze.effects[0].target.type = 'random_friendly_weapon';
    }],
    ['random-target-operation-mismatch', (value) => {
      value.items.find(({ itemId }) => itemId === 'item_crosswind_selector')
        .qualityProfiles.bronze.effects[0].operation = { type: 'reload', params: { amount: 1 } };
    }],
    ['random-target-trigger-mismatch', (value) => {
      value.items.find(({ itemId }) => itemId === 'item_crosswind_selector')
        .qualityProfiles.bronze.effects[0].trigger = {
          event: 'another_friendly_item_used',
          conditions: [{ type: 'source_item_has_any_tag', params: { tags: ['weapon'] } }],
        };
    }],
    ['static-target-tags-forbidden', (value) => {
      value.items.find(({ itemId }) => itemId === 'item_brine_cannon')
        .qualityProfiles.bronze.effects[0].target.params = { tags: ['weapon'] };
    }],
    ['trigger-source-target-extra-param', (value) => {
      value.items.find(({ itemId }) => itemId === 'item_followwake_calibrator')
        .qualityProfiles.bronze.effects.find(({ priority }) => priority === 30)
        .target.params.fallback = 'self_item';
    }],
    ['trigger-source-target-ready-forbidden', (value) => {
      value.items.find(({ itemId }) => itemId === 'item_followwake_calibrator')
        .qualityProfiles.bronze.effects.find(({ priority }) => priority === 30)
        .trigger = { event: 'item_ready', conditions: [{ type: 'always', params: {} }] };
    }],
    ['trigger-source-target-operation-forbidden', (value) => {
      value.items.find(({ itemId }) => itemId === 'item_followwake_calibrator')
        .qualityProfiles.bronze.effects.find(({ priority }) => priority === 30)
        .operation = { type: 'charge', params: { ticks: 1 } };
    }],
    ['trigger-source-target-ready-damage-forbidden', (value) => {
      value.items.find(({ itemId }) => itemId === 'item_followwake_calibrator')
        .qualityProfiles.bronze.effects.find(({ priority }) => priority === 20)
        .target.type = 'trigger_source_item';
    }],
    ['battle-start-condition-forbidden', (value) => {
      value.items.find(({ itemId }) => itemId === 'item_dawntide_timer')
        .qualityProfiles.bronze.effects.find(({ trigger }) => trigger.event === 'battle_start')
        .trigger.conditions = [{ type: 'source_item_has_any_tag', params: { tags: ['tool'] } }];
    }],
    ['battle-start-adjacency-forbidden', (value) => {
      value.items.find(({ itemId }) => itemId === 'item_dawntide_timer')
        .qualityProfiles.bronze.effects.find(({ trigger }) => trigger.event === 'battle_start')
        .trigger.conditions.push({ type: 'source_item_adjacent_to_self', params: {} });
    }],
    ['battle-start-target-param-forbidden', (value) => {
      value.items.find(({ itemId }) => itemId === 'item_dawntide_timer')
        .qualityProfiles.bronze.effects.find(({ trigger }) => trigger.event === 'battle_start')
        .target.params.scope = 'all';
    }],
    ['battle-start-target-forbidden', (value) => {
      value.items.find(({ itemId }) => itemId === 'item_dawntide_timer')
        .qualityProfiles.bronze.effects.find(({ trigger }) => trigger.event === 'battle_start')
        .target.type = 'self_item';
    }],
    ['battle-start-operation-forbidden', (value) => {
      value.items.find(({ itemId }) => itemId === 'item_dawntide_timer')
        .qualityProfiles.bronze.effects.find(({ trigger }) => trigger.event === 'battle_start')
        .operation.type = 'heal';
    }],
    ['battle-start-extra-param-forbidden', (value) => {
      value.items.find(({ itemId }) => itemId === 'item_dawntide_timer')
        .qualityProfiles.bronze.effects.find(({ trigger }) => trigger.event === 'battle_start')
        .operation.params.ticks = 1;
    }],
    ['battle-start-ready-damage-forbidden', (value) => {
      value.items.find(({ itemId }) => itemId === 'item_brine_cannon')
        .qualityProfiles.bronze.effects[0].trigger.event = 'battle_start';
    }],
    ['battle-start-collection-forbidden', (value) => {
      value.items.find(({ itemId }) => itemId === 'item_dawntide_timer')
        .qualityProfiles.bronze.effects.find(({ trigger }) => trigger.event === 'battle_start')
        .target.type = 'all_friendly_items';
    }],
    ['defense-effect-target-operation-mismatch', (value) => {
      value.items.find(({ itemId }) => itemId === 'item_mistkelp_remedy_kit')
        .qualityProfiles.bronze.effects[0].target.type = 'self_item';
    }],
    ['defense-effect-amount-zero', (value) => {
      value.items.find(({ itemId }) => itemId === 'item_tidefold_bulwark')
        .qualityProfiles.bronze.effects[0].operation.params.amount = 0;
    }],
    ['defense-effect-extra-param', (value) => {
      value.items.find(({ itemId }) => itemId === 'item_mistkelp_remedy_kit')
        .qualityProfiles.bronze.effects[0].operation.params.ticks = 1;
    }],
    ['defense-effect-reactive-forbidden', (value) => {
      const effect = value.items.find(({ itemId }) => itemId === 'item_mistkelp_remedy_kit')
        .qualityProfiles.bronze.effects[0];
      effect.trigger = {
        event: 'another_friendly_item_used',
        conditions: [{ type: 'source_item_has_any_tag', params: { tags: ['tool'] } }],
      };
    }],
    ['owner-hero-damage-forbidden', (value) => {
      value.items.find(({ itemId }) => itemId === 'item_brine_cannon')
        .qualityProfiles.bronze.effects[0].target.type = 'owner_hero';
    }],
    ['active-node-forged', (value) => { value.runtimeBundle.newRunTemplate.activeNode = { nodeId: 'event_driftwood_cache', kind: 'event', rewardId: '' }; }],
    ['battle-reward-unknown', (value) => { value.runtimeBundle.generation.battle.templates[0].rewardId = 'reward_missing'; }],
    ['ghost-snapshots-missing', (value) => { delete value.runtimeBundle.generation.battle.ghostSnapshots; }],
    ['ghost-snapshot-extra-field', (value) => { value.runtimeBundle.generation.battle.ghostSnapshots[0].capturedAt = 'forged'; }],
    ['ghost-snapshot-source-forged', (value) => { value.runtimeBundle.generation.battle.ghostSnapshots[0].matchSource = 'fixture'; }],
    ['ghost-snapshot-revision-forged', (value) => { value.runtimeBundle.generation.battle.ghostSnapshots[0].opponentContentRevision = 'stale'; }],
    ['ghost-snapshot-build-extra-field', (value) => { value.runtimeBundle.generation.battle.ghostSnapshots[0].build.stash = []; }],
    ['ghost-snapshot-build-hash-forged', (value) => { value.runtimeBundle.generation.battle.ghostSnapshots[0].buildHash = '0'.repeat(64); }],
    ['ghost-snapshot-hero-extra-field', (value) => {
      const snapshot = value.runtimeBundle.generation.battle.ghostSnapshots[0];
      snapshot.build.hero.prestige = 20;
      snapshot.buildHash = expectedBuildHash(snapshot.build);
    }],
    ['ghost-snapshot-hero-unknown', (value) => {
      const snapshot = value.runtimeBundle.generation.battle.ghostSnapshots[0];
      snapshot.build.hero.heroId = 'hero_missing';
      snapshot.buildHash = expectedBuildHash(snapshot.build);
    }],
    ['ghost-snapshot-hero-level-zero', (value) => {
      const snapshot = value.runtimeBundle.generation.battle.ghostSnapshots[0];
      snapshot.build.hero.level = 0;
      snapshot.buildHash = expectedBuildHash(snapshot.build);
    }],
    ['ghost-snapshot-hero-skill-unknown', (value) => {
      const snapshot = value.runtimeBundle.generation.battle.ghostSnapshots[0];
      snapshot.build.heroSkills[0].heroSkillId = 'skill_missing';
      snapshot.buildHash = expectedBuildHash(snapshot.build);
    }],
    ['ghost-snapshot-hero-skills-unsorted', (value) => {
      const snapshot = value.runtimeBundle.generation.battle.ghostSnapshots[0];
      snapshot.build.heroSkills.reverse();
      snapshot.buildHash = expectedBuildHash(snapshot.build);
    }],
    ['ghost-snapshot-hero-skill-quality', (value) => {
      const snapshot = value.runtimeBundle.generation.battle.ghostSnapshots[0];
      snapshot.build.heroSkills[0].quality = 'silver';
      snapshot.buildHash = expectedBuildHash(snapshot.build);
    }],
    ['ghost-snapshot-hero-skill-source', (value) => {
      const snapshot = value.runtimeBundle.generation.battle.ghostSnapshots[0];
      snapshot.build.heroSkills[0].sourceId = 'ghost_snapshot_day_02';
      snapshot.buildHash = expectedBuildHash(snapshot.build);
    }],
    ['ghost-encounter-mixed-authority', (value) => {
      value.runtimeBundle.generation.battle.ghostEncounters[0].enemy = structuredClone(
        value.runtimeBundle.generation.battle.templates[0].enemy,
      );
    }],
    ['ghost-encounter-snapshot-unknown', (value) => {
      value.runtimeBundle.generation.battle.ghostEncounters[0].snapshotId = 'ghost_snapshot_missing';
    }],
    ['ghost-encounter-snapshot-reused', (value) => {
      value.runtimeBundle.generation.battle.ghostEncounters[1].snapshotId = value.runtimeBundle.generation.battle.ghostEncounters[0].snapshotId;
    }],
    ['ghost-layer-uses-pve-template', (value) => {
      value.runtimeBundle.generation.battle.layers[0].ghostEncounterIds = [value.runtimeBundle.generation.battle.layers[0].pveTemplateIds[0]];
    }],
    ['hero-skill-old-field-double-authority', (value) => { value.runtimeBundle.newRunTemplate.hero.skillIds = ['skill_brine_cannon']; }],
    ['hero-skill-template-double-authority', (value) => { value.runtimeBundle.newRunTemplate.ownedHeroSkills = []; }],
    ['hash-forged', (value) => { value.runtimeBundle.bundleHash = '0'.repeat(64); }],
  ];
  for (const [name, mutate] of cases) {
    const forged = structuredClone(content);
    mutate(forged);
    if (!['hash-forged', 'progression-rules-missing', 'ghost-snapshots-missing'].includes(name)) {
      forged.runtimeBundle.bundleHash = expectedBundleHash(forged);
    }
    const target = path.join(dir, `${name}.json`);
    fs.writeFileSync(target, `${canonicalJson(forged)}\n`, 'utf8');
    const result = validatePackageFile(target);
    assert.notEqual(result.status, 0, `${name} must fail closed`);
  }
});
