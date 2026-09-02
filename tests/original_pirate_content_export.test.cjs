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
  '47_bz_item_effects.csv', '48_bz_skills.csv', '49_bz_stalls.csv',
  '50_bz_stall_offers.csv', '51_bz_events.csv', '52_bz_event_options.csv',
  '53_bz_encounters.csv', '54_bz_enemies.csv', '55_bz_rewards.csv',
  '56_bz_source_snapshot.csv',
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
  bundle.generation.battle.templates.sort((left, right) => stableIdCompare(left.encounterTemplateId, right.encounterTemplateId));
  for (const layer of bundle.generation.battle.layers) {
    layer.pveTemplateIds.sort();
    layer.ghostTemplateIds.sort();
  }
  bundle.generation.battle.layers.sort((left, right) => left.fromDay - right.fromDay);
  bundle.scheduleConfig.hours.sort((left, right) => left.hour - right.hour);
  bundle.scheduleConfig.levelThresholds.sort((left, right) => left.level - right.level);
  const catalogs = bundle.executableCatalogs;
  for (const hero of catalogs.heroes) hero.skillIds.sort();
  catalogs.heroes.sort((left, right) => stableIdCompare(left.heroId, right.heroId));
  for (const skill of catalogs.skills) skill.effectIds.sort();
  catalogs.skills.sort((left, right) => stableIdCompare(left.skillId, right.skillId));
  for (const stall of catalogs.stalls) stall.shopTemplateIds.sort();
  catalogs.stalls.sort((left, right) => stableIdCompare(left.stallId, right.stallId));
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

function reverseDataRows(dir, file) {
  const target = path.join(dir, file);
  const rows = parseCsv(fs.readFileSync(target, 'utf8').replace(/^\uFEFF/, ''));
  fs.writeFileSync(target, encodeCsv([rows[0], ...rows.slice(1).reverse()]), 'utf8');
}

test('OPC01 workbook 的 13 个 BZ 页与 44..56 CSV 可逐字重建', () => {
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

test('OPC02 v5/v3 executable catalogs、generation 与独立中文 sidecar 确定且 hash 兼容', () => {
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
  assert.equal(content.schemaVersion, 5);
  assert.equal(content.rulesVersion, 'ysbzs.original-pirate-rules.2026-09-02-v1');
  assert.equal(content.sourceRevision, 'original-pirate-bootstrap-source-2026-09-02-v2');
  assert.equal(content.contentRevision, 'original-pirate-bootstrap-content-2026-09-02-v2');
  assert.equal(content.items.length, 6);
  assert.equal(content.runtimeBundle.schemaVersion, 3);
  assert.equal(content.runtimeBundle.bundleRevision, 'original_pirate_bootstrap_bundle_v2');
  assert.deepEqual(Object.keys(content.runtimeBundle).sort(), [
    'bundleHash', 'bundleRevision', 'contentRevision', 'executableCatalogs', 'generation', 'newRunTemplate',
    'rulesVersion', 'scheduleConfig', 'schema', 'schemaVersion', 'shopRules',
  ].sort());
  assert.equal(content.runtimeBundle.newRunTemplate.phase, 'schedule');
  assert.deepEqual(content.runtimeBundle.newRunTemplate.activeNode, { nodeId: '', kind: '', rewardId: '' });
  assert.equal('skillIds' in content.runtimeBundle.newRunTemplate.hero, false);
  assert.deepEqual(content.runtimeBundle.scheduleConfig.hours.map(({ hour, kind }) => [hour, kind]), [
    [1, 'choice'], [2, 'choice'], [3, 'pve'], [4, 'choice'], [5, 'choice'], [6, 'ghost'],
  ]);
  const generation = content.runtimeBundle.generation;
  assert.deepEqual([generation.schema, generation.schemaVersion, generation.algorithmId], [
    'ysbzs.original-pirate-generation.v1', 1, 'sha256-ranked-selection-v1',
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
  assert.equal(generation.battle.templates.length, 20);
  assert.equal(generation.battle.templates.every(({ rewardId }) => ['reward_pve_patrol', 'reward_ghost_skirmish'].includes(rewardId)), true);
  assert.equal(generation.battle.layers.length, 10);
  assert.deepEqual(generation.battle.layers.at(-1), {
    fromDay: 10,
    toDay: null,
    pveTemplateIds: ['encounter_day_10_breakwater_patrol'],
    ghostTemplateIds: ['encounter_day_10_mirror_skiff'],
  });
  assert.equal('maxDay' in generation.battle || 'maxRefreshIndex' in generation.shop, false);
  const catalogs = content.runtimeBundle.executableCatalogs;
  assert.deepEqual(Object.keys(catalogs).sort(), [
    'eventOptions', 'events', 'heroes', 'rewards', 'schema', 'schemaVersion', 'skills', 'stalls',
  ].sort());
  assert.deepEqual([catalogs.schema, catalogs.schemaVersion], [
    'ysbzs.original-pirate-executable-catalogs.v1', 1,
  ]);
  assert.deepEqual([
    catalogs.heroes.length, catalogs.skills.length, catalogs.stalls.length,
    catalogs.events.length, catalogs.eventOptions.length, catalogs.rewards.length,
  ], [1, 6, 1, 4, 8, 10]);
  assert.deepEqual(Object.keys(catalogs.heroes[0]).sort(), ['heroId', 'skillIds']);
  assert.deepEqual(catalogs.heroes[0].skillIds, ['skill_brine_cannon', 'skill_patchwork_ram']);
  const profileEffectIds = content.items.flatMap(({ qualityProfiles }) => Object.values(qualityProfiles)
    .flatMap(({ effects }) => effects.map(({ effectId }) => effectId))).sort();
  assert.deepEqual(catalogs.skills.flatMap(({ effectIds }) => effectIds).sort(), profileEffectIds);
  const stall = catalogs.stalls[0];
  assert.deepEqual(Object.keys(stall).sort(), ['offerCount', 'shopTemplateIds', 'stallId']);
  assert.equal(stall.offerCount, generation.shop.offerCount);
  assert.deepEqual(stall.shopTemplateIds, generation.shop.templates.map(({ offerTemplateId }) => offerTemplateId).sort());
  assert.equal(generation.shop.layers.every(({ templateIds }) => templateIds.length === stall.offerCount
    && templateIds.every((templateId) => stall.shopTemplateIds.includes(templateId))), true);
  assert.equal(catalogs.eventOptions.every((option) => (
    assert.deepEqual(Object.keys(option).sort(), ['eventId', 'goldDelta', 'optionId', 'rewardId']), true
  )), true);
  const rewardById = Object.fromEntries(catalogs.rewards.map((reward) => [reward.rewardId, reward]));
  assert.deepEqual(rewardById.reward_level_2.trigger, { scope: 'system', event: 'LEVEL_UP' });
  assert.equal(rewardById.reward_level_2.effects[0].type, 'record_level_reward');
  assert.deepEqual(rewardById.reward_signal_flare.effects[0], {
    type: 'grant_item', itemId: 'item_signal_flare', quality: 'silver', quantity: 1, destination: 'stash',
  });
  assert.equal('startSlot' in rewardById.reward_signal_flare.effects[0], false);
  assert.deepEqual(rewardById.reward_pve_patrol.effects[0], { type: 'change_gold', amount: 4 });
  assert.equal(content.runtimeBundle.bundleHash, expectedBundleHash(content));
  assert.equal(validatePackageFile(first).status, 0);

  assert.deepEqual(Object.keys(display).sort(), [
    'contentRevision', 'entries', 'gameplayId', 'schema', 'schemaVersion', 'sourceRevision',
  ].sort());
  assert.equal(display.schema, 'ysbzs.original-pirate-display-directory.v1');
  assert.equal(display.schemaVersion, 1);
  assert.equal(display.gameplayId, 'original_pirate');
  assert.equal(display.sourceRevision, 'original-pirate-bootstrap-source-2026-09-02-v2');
  assert.equal(display.contentRevision, 'original-pirate-bootstrap-content-2026-09-02-v2');
  assert.equal(display.entries.length, 58);
  assert.deepEqual(display.entries.find(({ displayId }) => displayId === 'items.item_brine_cannon'), {
    displayId: 'items.item_brine_cannon', domain: 'items', sourceId: 'item_brine_cannon',
    nameZh: '盐雾炮', descriptionZh: '',
  });
  assert.match(display.entries.find(({ displayId }) => displayId === 'events.event_driftwood_cache').descriptionZh, /潮线/);
  assert.equal('displayDirectory' in content || 'display' in content, false);
  const source = fs.readFileSync(path.join(csvDir, '56_bz_source_snapshot.csv'), 'utf8');
  assert.match(source, /local_original/);
  assert.match(source, /原创本地内容/);
});

test('OPC03 缺关系、冷却、品质、弹药、价格、trigger、effect 或遭遇时整包拒绝', () => {
  const cases = [
    ['cooldown', (dir) => mutateCell(dir, '46_bz_items.csv', 1, 'cooldown_ticks', '')],
    ['quality', (dir) => mutateCell(dir, '46_bz_items.csv', 1, 'quality', '')],
    ['ammo', (dir) => mutateCell(dir, '46_bz_items.csv', 1, 'ammo_maximum', '')],
    ['price', (dir) => mutateCell(dir, '50_bz_stall_offers.csv', 1, 'price', '')],
    ['trigger', (dir) => mutateCell(dir, '47_bz_item_effects.csv', 1, 'trigger_event', '')],
    ['effect', (dir) => mutateCell(dir, '47_bz_item_effects.csv', 1, 'amount', '')],
    ['encounter', (dir) => mutateCell(dir, '53_bz_encounters.csv', 1, 'enemy_id', '')],
    ['relation', (dir) => mutateCell(dir, '52_bz_event_options.csv', 1, 'reward_id', 'reward_missing')],
    ['level-reward-forged-as-event', (dir) => mutateCell(dir, '52_bz_event_options.csv', 1, 'reward_id', 'reward_level_2')],
    ['display-description', (dir) => mutateCell(dir, '51_bz_events.csv', 1, 'description_zh', '')],
    ['unsupported-enchantment', (dir) => mutateCell(dir, '50_bz_stall_offers.csv', 1, 'enchantment', 'fiery')],
    ['source-frozen', (dir) => mutateCell(dir, '50_bz_stall_offers.csv', 1, 'frozen', 'true')],
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

test('OPC05 13 域行重排不改变 canonical runtime、hash 或 display sidecar', () => {
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

test('OPC06 v5/v3 forged catalog、奖励、摊位、activeNode、battle reward 或 hash 整包拒绝', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'original-pirate-v5-forgery-'));
  const baseline = path.join(dir, 'baseline.json');
  assert.equal(runExporter(csvDir, baseline).status, 0);
  const content = JSON.parse(fs.readFileSync(baseline, 'utf8'));
  assert.equal(validatePackageFile(baseline).status, 0);
  const cases = [
    ['extra-catalog-field', (value) => { value.runtimeBundle.executableCatalogs.auditText = 'not-runtime'; }],
    ['level-reward-through-event', (value) => { value.runtimeBundle.executableCatalogs.eventOptions[0].rewardId = 'reward_level_2'; }],
    ['item-reward-board-slot', (value) => { value.runtimeBundle.executableCatalogs.rewards.find(({ rewardId }) => rewardId === 'reward_signal_flare').effects[0].startSlot = 4; }],
    ['level-reward-player-trigger', (value) => { value.runtimeBundle.executableCatalogs.rewards.find(({ rewardId }) => rewardId === 'reward_level_2').trigger.event = 'REWARD_RESOLUTION'; }],
    ['stall-template-missing', (value) => { value.runtimeBundle.executableCatalogs.stalls[0].shopTemplateIds.pop(); }],
    ['stall-offer-count-drift', (value) => { value.runtimeBundle.executableCatalogs.stalls[0].offerCount = 2; value.runtimeBundle.generation.shop.offerCount = 2; }],
    ['active-node-forged', (value) => { value.runtimeBundle.newRunTemplate.activeNode = { nodeId: 'event_driftwood_cache', kind: 'event', rewardId: '' }; }],
    ['battle-reward-unknown', (value) => { value.runtimeBundle.generation.battle.templates[0].rewardId = 'reward_missing'; }],
    ['hero-skill-double-authority', (value) => { value.runtimeBundle.newRunTemplate.hero.skillIds = ['skill_brine_cannon']; }],
    ['hash-forged', (value) => { value.runtimeBundle.bundleHash = '0'.repeat(64); }],
  ];
  for (const [name, mutate] of cases) {
    const forged = structuredClone(content);
    mutate(forged);
    const target = path.join(dir, `${name}.json`);
    fs.writeFileSync(target, `${canonicalJson(forged)}\n`, 'utf8');
    const result = validatePackageFile(target);
    assert.notEqual(result.status, 0, `${name} must fail closed`);
  }
});
