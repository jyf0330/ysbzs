const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const os = require('node:os');
const { execFileSync } = require('node:child_process');
const {
  buildRuntimeDatabase
} = require('../../tools/build_runtime_database.cjs');

const root = path.resolve(__dirname, '../..');

test('runtime database model normalizes identity, stats, references, and mobile HTML', () => {
  const result = buildRuntimeDatabase({ root, writeFiles: false });
  const { snapshot, rows, mobileHtml } = result;

  assert.equal(snapshot.schemaVersion, 'ysbzs.runtime-database.v1');
  assert.equal(snapshot.source.mode, 'workbook');
  assert.equal(rows.units.length, 127);
  assert.equal(rows.stat_profiles.filter(row => row.profile_kind === 'base_pet').length, 127);
  assert.equal(rows.stat_profiles.filter(row => row.profile_kind === 'monster_template').length, 34);
  assert.equal(rows.mechanisms.length, 61);
  assert.ok(rows.wave_rounds.length >= 134);
  assert.ok(rows.shop_items.length >= 127);

  const waveRoundFields = Object.keys(rows.wave_rounds[0]);
  assert.ok(waveRoundFields.includes('primary_unit_id'));
  assert.ok(!waveRoundFields.includes('name'));
  assert.ok(!waveRoundFields.includes('hp'));
  assert.ok(!waveRoundFields.includes('atk'));

  const shopItemFields = Object.keys(rows.shop_items[0]);
  assert.deepEqual(shopItemFields.filter(field => ['name', 'element', 'quality', 'role', 'tags'].includes(field)), []);
  assert.equal(rows.shop_items[0].ref_table, 'units');
  assert.equal(rows.shop_items[0].ref_id, 'pal_001');

  const unitNameField = rows.field_catalog.find(row => row.table_name === 'units' && row.field_name === 'name');
  assert.equal(unitNameField.field_role, 'owned');
  const shopRefField = rows.field_catalog.find(row => row.table_name === 'shop_items' && row.field_name === 'ref_id');
  assert.equal(shopRefField.field_role, 'reference');
  assert.equal(shopRefField.references_table, 'units');
  const waveRefField = rows.field_catalog.find(row => row.table_name === 'wave_rounds' && row.field_name === 'primary_unit_id');
  assert.equal(waveRefField.field_role, 'reference');

  assert.match(mobileHtml, /元素背包史数据库/);
  assert.match(mobileHtml, /下载 SQLite/);
  assert.match(mobileHtml, /字段定义/);
  assert.match(mobileHtml, /只看引用字段/);
  assert.match(mobileHtml, /stat_profiles/);
});

test('runtime database writes a queryable sqlite file', { skip: !fs.existsSync('/usr/bin/sqlite3') }, () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ysbzs-runtime-db-test-'));
  try {
    const dbPath = path.join(tmp, 'ysbzs.db');
    const result = buildRuntimeDatabase({
      root,
      dbPath,
      dbJsonPath: path.join(tmp, 'database.json'),
      reportMobileHtmlPath: path.join(tmp, 'database-mobile.html'),
      webDbPath: path.join(tmp, 'web', 'ysbzs.db'),
      webDbJsonPath: path.join(tmp, 'web', 'database.json'),
      webMobileHtmlPath: path.join(tmp, 'web', 'database-mobile.html')
    });
    assert.ok(fs.existsSync(result.dbPath));
    assert.ok(fs.statSync(result.dbPath).size > 0);
    const unitCount = execFileSync('sqlite3', [result.dbPath, 'select count(*) from units;'], { encoding: 'utf8' }).trim();
    const baseStats = execFileSync('sqlite3', [result.dbPath, "select count(*) from stat_profiles where profile_kind='base_pet';"], { encoding: 'utf8' }).trim();
    const waveColumns = execFileSync('sqlite3', [result.dbPath, "pragma table_info('wave_rounds');"], { encoding: 'utf8' });
    assert.equal(unitCount, '127');
    assert.equal(baseStats, '127');
    assert.match(waveColumns, /primary_unit_id/);
    assert.doesNotMatch(waveColumns, /\|name\|/);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});
