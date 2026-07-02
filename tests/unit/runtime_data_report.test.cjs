const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const {
  DATA_TABLE_ORDER,
  buildRuntimeDataReport,
  collectSourceFiles
} = require('../../tools/build_runtime_data_report.cjs');

const root = path.resolve(__dirname, '../..');

test('runtime data report builds game data payload and HTML audit without writing files', () => {
  const { payload, html, mobileHtml, webDataJsonPath, webMobileHtmlPath } = buildRuntimeDataReport({ root, writeFiles: false });
  assert.equal(payload.schemaVersion, 'ysbzs.runtime-data.v1');
  assert.equal(payload.source.runtime.mode, 'workbook');
  assert.equal(payload.source.runtime.workbook, 'xlsx/ysbzs_master.xlsx');
  assert.equal(payload.source.runtime.persistedIntermediate, false);
  assert.equal(payload.data.meta.sourceType, 'workbook');
  assert.equal(payload.data.meta.sourcePackage, 'xlsx/ysbzs_master.xlsx');
  assert.equal(payload.data.meta.compatibilityBaseline, 'data/csv');
  assert.equal(payload.source.connectedTables.pets.format, 'xlsx-derived');
  assert.equal(payload.data.pets.length, 127);
  assert.equal(payload.data.waves.length, 134);
  assert.equal(payload.data.mechanisms.length, 61);
  assert.equal(payload.source.workbook, 'xlsx/ysbzs_master.xlsx');
  assert.ok(payload.source.filesByFormat.csv.count >= 31);
  assert.ok(payload.source.filesByFormat.json.count >= 1);
  assert.ok(payload.source.filesByFormat.yaml.count >= 1);
  assert.ok(payload.source.csvRows.some(row => row.csvFile === '27_shape_catalog.csv' && row.sourcePath.includes('ysbzs_master.xlsx')));
  assert.ok(payload.source.csvRows.some(row => row.csvFile === '28_quality_growth.csv' && row.format === 'xlsx-derived'));
  assert.ok(payload.source.csvRows.some(row => row.csvFile === '29_quality_upgrades.csv' && row.format === 'xlsx-derived'));
  assert.ok(payload.source.contentRows.length > 0);
  assert.ok(payload.source.contentRows.some(row => row.format === 'json' && row.sourcePath.endsWith('meta.json') && row.keyPath === 'source'));
  assert.ok(payload.source.contentRows.some(row => row.format === 'yaml' && row.sourcePath === 'yaml/wave_rules_20260609.yaml' && row.keyPath === 'version'));
  assert.ok(payload.source.contentRows.some(row => row.format === 'yaml' && row.keyPath === 'spawn_position_rules.default_enemy_spawn.mode'));
  assert.ok(payload.source.yamlRuntimeRules.enemySpawn);
  assert.ok(Array.isArray(payload.issues));
  assert.match(html, /元素背包史数据审核/);
  assert.match(html, /运行源/);
  assert.match(html, /workbook/);
  assert.match(html, /来源文件/);
  assert.match(html, /CSV\/总表派生表/);
  assert.match(html, /JSON\/YAML配置内容/);
  assert.match(html, /format-yaml/);
  assert.match(html, /format-json/);
  assert.match(mobileHtml, /元素背包史手机数据/);
  assert.match(mobileHtml, /CSV\/总表派生表/);
  assert.match(mobileHtml, /JSON\/YAML配置内容/);
  assert.match(mobileHtml, /完整字段/);
  assert.equal(path.relative(root, webDataJsonPath).replace(/\\/g, '/'), 'web/data/game_data.json');
  assert.equal(path.relative(root, webMobileHtmlPath).replace(/\\/g, '/'), 'web/data/mobile.html');
  for (const table of DATA_TABLE_ORDER) {
    assert.ok(Object.prototype.hasOwnProperty.call(payload.counts, table), `missing count for ${table}`);
  }
});

test('workbook runtime source matches csv compatibility source for current normalized tables', () => {
  const workbook = buildRuntimeDataReport({ root, sourceMode: 'workbook', writeFiles: false }).payload;
  const csv = buildRuntimeDataReport({ root, sourceMode: 'csv', writeFiles: false }).payload;
  for (const table of DATA_TABLE_ORDER) {
    assert.equal(workbook.counts[table], csv.counts[table], `${table} row count should match`);
  }
  assert.equal(csv.source.runtime.mode, 'csv');
  assert.equal(csv.source.connectedTables.pets.format, 'csv');
  assert.equal(workbook.data.pets.find(pet => pet.id === 'pal_001').name, csv.data.pets.find(pet => pet.id === 'pal_001').name);
  assert.doesNotMatch(JSON.stringify(workbook), /ysbzs-runtime-csv-|\/private\/var\/|\/var\/folders\//);
});

test('source inventory distinguishes connected csv, unconnected json, and yaml files', () => {
  const files = collectSourceFiles(root);
  const byPath = new Map(files.map(file => [file.path, file]));
  assert.equal(byPath.get('data/csv/01_pets.csv').format, 'csv');
  assert.equal(byPath.get('data/unconnected/web-external-data/external-data/meta.json').format, 'json');
  assert.equal(byPath.get('data/unconnected/config/ysbzs_v1_linked_rules.yaml').format, 'yaml');
  assert.equal(byPath.get('yaml/wave_rules_20260609.yaml').format, 'yaml');
});
