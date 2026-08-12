const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const { parseCsv, loadGameData, normalizeSourceTables, loadSourceTablesFromCsv } = require('../../src/core/csvData.cjs');

const root = path.resolve(__dirname, '../..');
const csvDir = path.join(root, 'data', 'csv');
const statFields = ['HP', '攻', '防', '盾', '行动'];

test('369 pets expose complete numeric base stats from planner data', () => {
  const rows = parseCsv(fs.readFileSync(path.join(csvDir, '01_pets.csv'), 'utf8'));
  assert.equal(rows.length, 369);
  for (const row of rows) {
    for (const field of statFields) {
      assert.notEqual(String(row[field] ?? '').trim(), '', `${row['宠物ID']} missing ${field}`);
      assert.ok(Number.isFinite(Number(row[field])), `${row['宠物ID']} ${field} must be numeric`);
    }
  }
  assert.ok(rows.every(row => Number(row['防']) === 0), 'base defense is explicitly data-owned and currently zero');
});

test('missing pet base stats fail closed instead of receiving code defaults', () => {
  const tables = loadSourceTablesFromCsv(csvDir);
  const broken = structuredClone(tables);
  broken.pets[0]['HP'] = '';
  assert.throws(
    () => normalizeSourceTables(broken, { sourceType: 'test' }),
    /pal_001.*HP|HP.*pal_001/,
  );
});

test('production pet loaders contain no numeric pet-panel fallbacks', () => {
  const targets = [
    'src/core/csvData.cjs',
    'src/core/unitFactory.cjs',
    'src/core/waveSpawn.cjs',
  ];
  const forbidden = [
    /toNum\(row\['(?:HP|攻|防|盾|行动)'\],\s*-?\d+/,
    /(?:base|pet)\.(?:hp|atk|def|shield|ap)[^\n]*?(?:\?\?|\|\|)\s*-?\d+/,
    /override\.(?:hp|atk|def|shield|ap)[^\n]*?(?:\?\?|\|\|)\s*-?\d+/,
  ];
  for (const relative of targets) {
    const source = fs.readFileSync(path.join(root, relative), 'utf8');
    for (const pattern of forbidden) assert.doesNotMatch(source, pattern, `${relative} contains ${pattern}`);
  }
});

test('normalized runtime preserves all five planner-owned base stats', () => {
  const data = loadGameData({ csvDir, cache: false });
  assert.equal(data.pets.length, 369);
  for (const pet of data.pets) {
    for (const field of ['hp', 'atk', 'def', 'shield', 'ap']) {
      assert.ok(Number.isFinite(pet[field]), `${pet.id} normalized ${field}`);
    }
  }
});
