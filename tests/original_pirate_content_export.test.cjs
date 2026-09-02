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
    for (const profile of Object.values(item.qualityProfiles)) {
      profile.effects.sort((left, right) => (left.priority - right.priority) || stableIdCompare(left.effectId, right.effectId));
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
  for (const skill of catalogs.itemSkills) skill.effectIds.sort();
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

function reverseDataRows(dir, file) {
  const target = path.join(dir, file);
  const rows = parseCsv(fs.readFileSync(target, 'utf8').replace(/^\uFEFF/, ''));
  fs.writeFileSync(target, encodeCsv([rows[0], ...rows.slice(1).reverse()]), 'utf8');
}

test('OPC01 workbook 的 22 个 original-pirate BZ 页与 CSV 可逐字重建', () => {
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

test('OPC02 v14/v12 英雄技能训练、Ghost 实例和既有规则确定且 hash 兼容', () => {
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
  assert.equal(content.schemaVersion, 14);
  assert.equal(content.rulesVersion, 'ysbzs.original-pirate-rules.2026-09-03-v10');
  assert.equal(content.sourceRevision, 'original-pirate-bootstrap-source-2026-09-03-v11');
  assert.equal(content.contentRevision, 'original-pirate-bootstrap-content-2026-09-03-v11');
  assert.equal(content.items.length, 6);
  assert.equal(content.runtimeBundle.schemaVersion, 12);
  assert.equal(content.runtimeBundle.bundleRevision, 'original_pirate_bootstrap_bundle_v11');
  assert.deepEqual(Object.keys(content.runtimeBundle).sort(), [
    'battleRules', 'bundleHash', 'bundleRevision', 'contentRevision', 'executableCatalogs', 'generation', 'newRunTemplate',
    'progressionRules', 'rulesVersion', 'scheduleConfig', 'schema', 'schemaVersion', 'shopRules',
  ].sort());
  assert.deepEqual(content.runtimeBundle.battleRules, {
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
      'offer_refresh_10_brine_cannon',
      'offer_refresh_10_patchwork_ram',
      'offer_refresh_10_storm_compass',
    ],
  });
  assert.equal(generation.shop.templates.some((template) => 'price' in template || 'frozen' in template), false);
  const generatedSource = generation.shop.templates.find(({ offerTemplateId }) => offerTemplateId === 'offer_initial_signal_flare');
  assert.equal(content.items.find(({ itemId }) => itemId === generatedSource.itemId).qualityProfiles[generatedSource.quality].buyPrice, 6);
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
    'ysbzs.original-pirate-executable-catalogs.v1', 5,
  ]);
  assert.deepEqual([
    catalogs.heroes.length, catalogs.itemSkills.length, catalogs.heroSkills.length,
    catalogs.heroSkillTrainers.length, catalogs.heroSkillOffers.length, catalogs.stalls.length,
    catalogs.events.length, catalogs.eventOptions.length, catalogs.rewards.length,
    catalogs.upgrades.length, catalogs.enchantments.length,
  ], [1, 6, 2, 2, 7, 1, 4, 8, 8, 12, 3]);
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
  const profileEffectIds = content.items.flatMap(({ qualityProfiles }) => Object.values(qualityProfiles)
    .flatMap(({ effects }) => effects.map(({ effectId }) => effectId))).sort();
  const executableEffects = content.items.flatMap(({ qualityProfiles }) => Object.values(qualityProfiles)
    .flatMap(({ effects }) => effects));
  assert.equal(executableEffects.length, 32);
  assert.deepEqual([...new Set(executableEffects.map(({ operation }) => operation.type))].sort(), [
    'apply_status', 'charge', 'deal_damage', 'reload',
  ]);
  assert.deepEqual([...new Set(executableEffects.map(({ target }) => target.type))].sort(), [
    'first_enemy_item', 'selected_enemy', 'self_item',
  ]);
  assert.deepEqual([...new Set(executableEffects.filter(({ operation }) => operation.type === 'apply_status')
    .map(({ operation }) => operation.params.status))].sort(), ['freeze', 'haste', 'slow']);
  assert.deepEqual(catalogs.itemSkills.flatMap(({ effectIds }) => effectIds).sort(), profileEffectIds);
  const stall = catalogs.stalls[0];
  assert.deepEqual(Object.keys(stall).sort(), ['offerCount', 'shopTemplateIds', 'stallId']);
  assert.equal(stall.offerCount, generation.shop.offerCount);
  assert.deepEqual(stall.shopTemplateIds, generation.shop.templates.map(({ offerTemplateId }) => offerTemplateId).sort());
  assert.equal(generation.shop.layers.every(({ templateIds }) => templateIds.length === stall.offerCount
    && templateIds.every((templateId) => stall.shopTemplateIds.includes(templateId))), true);
  assert.equal(catalogs.upgrades.every((upgrade) => upgrade.stallId === 'stall_mistwake' && upgrade.price > 0), true);
  assert.deepEqual(catalogs.enchantments.map(({ enchantmentId }) => enchantmentId), [
    'enchant_breaker', 'enchant_reserve', 'enchant_tailwind',
  ]);
  const reserve = catalogs.enchantments.find(({ enchantmentId }) => enchantmentId === 'enchant_reserve');
  assert.equal(reserve.profiles.length, 8);
  assert.equal(reserve.profiles.every(({ ammoDelta, damageDelta, cooldownDeltaTicks }) => (
    ammoDelta === 1 && damageDelta === 0 && cooldownDeltaTicks === 0
  )), true);
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
  assert.equal(display.sourceRevision, 'original-pirate-bootstrap-source-2026-09-03-v11');
  assert.equal(display.contentRevision, 'original-pirate-bootstrap-content-2026-09-03-v11');
  assert.equal(display.entries.length, 89);
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
  assert.equal(display.entries.filter(({ domain }) => domain === 'item_skills').length, 6);
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
});

test('OPC03 缺关系、成长选项、品质、数量、target rule 或遭遇时整包拒绝', () => {
  const cases = [
    ['cooldown', (dir) => mutateCell(dir, '46_bz_items.csv', 1, 'cooldown_ticks', '')],
    ['quality', (dir) => mutateCell(dir, '46_bz_items.csv', 1, 'quality', '')],
    ['ammo', (dir) => mutateCell(dir, '46_bz_items.csv', 1, 'ammo_maximum', '')],
    ['price', (dir) => mutateCell(dir, '50_bz_stall_offers.csv', 1, 'price', '')],
    ['trigger', (dir) => mutateCell(dir, '47_bz_item_effects.csv', 1, 'trigger_event', '')],
    ['item-skill-cross-directory', (dir) => mutateCell(dir, '46_bz_items.csv', 1, 'item_skill_id', 'hero_skill_mist_salvo')],
    ['item-effect-cross-directory', (dir) => mutateCell(dir, '47_bz_item_effects.csv', 1, 'item_skill_id', 'hero_skill_mist_salvo')],
    ['effect', (dir) => mutateCell(dir, '47_bz_item_effects.csv', 1, 'amount', '')],
    ['status', (dir) => mutateCell(dir, '47_bz_item_effects.csv', 14, 'status', 'burn')],
    ['effect-target-operation', (dir) => mutateCell(dir, '47_bz_item_effects.csv', 6, 'target_type', 'first_enemy_item')],
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
    ['hero-skill-offer-item-collision', (dir) => mutateCell(dir, '65_bz_hero_skill_offers.csv', 1, 'offer_id', 'offer_initial_signal_flare')],
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
    ['ghost-snapshot-instance-duplicate', (dir) => mutateCell(dir, '60_bz_ghost_snapshots.csv', 2, 'instance_id', 'ghost_d01_ram')],
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

test('OPC05 22 域行重排不改变 canonical runtime、hash 或 display sidecar', () => {
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

test('OPC06 v14/v12 forged hero skill training、Ghost、catalog 或 hash 整包拒绝', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'original-pirate-v14-forgery-'));
  const baseline = path.join(dir, 'baseline.json');
  assert.equal(runExporter(csvDir, baseline).status, 0);
  const content = JSON.parse(fs.readFileSync(baseline, 'utf8'));
  assert.equal(validatePackageFile(baseline).status, 0);
  const cases = [
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
    ['terminal-pressure-missing-field', (value) => { delete value.runtimeBundle.battleRules.terminalPressure.intervalTicks; }],
    ['terminal-pressure-extra-field', (value) => { value.runtimeBundle.battleRules.terminalPressure.maxDamage = 99; }],
    ['terminal-pressure-enabled-string', (value) => { value.runtimeBundle.battleRules.terminalPressure.enabled = 'true'; }],
    ['terminal-pressure-disabled', (value) => { value.runtimeBundle.battleRules.terminalPressure.enabled = false; }],
    ['terminal-pressure-start-zero', (value) => { value.runtimeBundle.battleRules.terminalPressure.startTick = 0; }],
    ['terminal-pressure-interval-zero', (value) => { value.runtimeBundle.battleRules.terminalPressure.intervalTicks = 0; }],
    ['terminal-pressure-initial-zero', (value) => { value.runtimeBundle.battleRules.terminalPressure.initialDamage = 0; }],
    ['terminal-pressure-increment-negative', (value) => { value.runtimeBundle.battleRules.terminalPressure.incrementDamage = -1; }],
    ['extra-catalog-field', (value) => { value.runtimeBundle.executableCatalogs.auditText = 'not-runtime'; }],
    ['retired-skills-catalog', (value) => { value.runtimeBundle.executableCatalogs.skills = []; }],
    ['item-skill-extra-field', (value) => { value.runtimeBundle.executableCatalogs.itemSkills[0].heroId = 'hero_mistwake_captain'; }],
    ['hero-item-skill-cross-reference', (value) => {
      value.runtimeBundle.executableCatalogs.heroes[0].heroSkillIds[0] = 'skill_brine_cannon';
    }],
    ['hero-skill-extra-field', (value) => { value.runtimeBundle.executableCatalogs.heroSkills[0].sourceText = 'forged'; }],
    ['hero-skill-trigger', (value) => { value.runtimeBundle.executableCatalogs.heroSkills[0].triggerEvent = 'item_ready'; }],
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
    ['item-effect-extra-param', (value) => {
      value.items.find(({ itemId }) => itemId === 'item_signal_flare')
        .qualityProfiles.silver.effects.find(({ operation }) => operation.type === 'apply_status')
        .operation.params.amount = 1;
    }],
    ['item-effect-target-operation-mismatch', (value) => {
      value.items.find(({ itemId }) => itemId === 'item_brine_cannon')
        .qualityProfiles.bronze.effects[0].target.type = 'self_item';
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
