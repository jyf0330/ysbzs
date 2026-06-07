const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { parseCsv, loadSourceTablesFromCsv, loadGameData, csvSourceAvailable } = require('../src/core/csvData.cjs');
const { validateData } = require('../src/core/data.cjs');
const { createGameState } = require('../src/core/state.cjs');

const root = path.resolve(__dirname, '..');
const csvDir = path.join(root, 'data', 'csv');
const expected = { pets:127, monsters:34, waves:134, mechanisms:61, events:32, shop:127, relics:40, shapes:127, validation:10 };

function writeCsv(file, rows) {
  const headers = Object.keys(rows[0] || {});
  const esc = v => {
    const s = v == null ? '' : String(v);
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  fs.writeFileSync(file, '\ufeff' + headers.join(',') + '\n' + rows.map(r => headers.map(h => esc(r[h])).join(',')).join('\n') + '\n', 'utf8');
}

function tempCsvDir() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ysbzs-csv-'));
  fs.cpSync(csvDir, dir, { recursive: true });
  return dir;
}

test('CSV01 data/csv 真源目录存在且 01-09 表数量完整', () => {
  assert.equal(csvSourceAvailable(csvDir), true);
  const tables = loadSourceTablesFromCsv(csvDir);
  assert.equal(tables.pets.length, expected.pets);
  assert.equal(tables.monsters.length, expected.monsters);
  assert.equal(tables.waves.length, expected.waves);
  assert.equal(tables.mechanisms.length, expected.mechanisms);
  assert.equal(tables.events.length, expected.events);
  assert.equal(tables.shop.length, expected.shop);
  assert.equal(tables.relics.length, expected.relics);
  assert.equal(tables.shapes.length, expected.shapes);
  assert.equal(tables.validation.length, expected.validation);
  assert.ok(tables.initialSetup.length >= 4);
});

test('CSV02 程序优先从 CSV 重建 normalized data 并通过跨表校验', () => {
  const d = loadGameData({ csvDir });
  assert.equal(d.meta.sourceType, 'csv');
  for (const [key, count] of Object.entries(expected)) assert.equal(d[key].length, count, key);
  const v = validateData(d);
  assert.equal(v.ok, true, v.issues.join('\n'));
});

test('CSV03 改宠物 CSV 后，重新 loadGameData 会反映新数值', () => {
  const dir = tempCsvDir();
  const file = path.join(dir, '01_宠物主表_好读版.csv');
  const rows = parseCsv(fs.readFileSync(file, 'utf8'));
  const target = rows.find(r => r['宠物ID'] === 'pal_005');
  assert.ok(target, 'pal_005 exists');
  target['HP'] = '77';
  target['攻'] = '9';
  writeCsv(file, rows);
  const d = loadGameData({ csvDir: dir });
  const pet = d.pets.find(p => p.id === 'pal_005');
  assert.equal(pet.hp, 77);
  assert.equal(pet.atk, 9);
});

test('CSV04 改初始阵容 CSV 后，新建状态会换我方开局宠物和站位', () => {
  const dir = tempCsvDir();
  const file = path.join(dir, '10_初始阵容.csv');
  const rows = parseCsv(fs.readFileSync(file, 'utf8'));
  rows[0]['宠物ID'] = 'pal_001';
  rows[0]['行(1-8)'] = '1';
  rows[0]['列(1-8)'] = '8';
  writeCsv(file, rows);
  const d = loadGameData({ csvDir: dir });
  const s = createGameState({ data: d });
  const first = s.units.filter(u => u.side === 'hero')[0];
  assert.equal(first.petId, 'pal_001');
  assert.deepEqual(first.position, { r: 0, c: 7 });
});

test('CSV05 多机制串和旧机制 ID 会自动归一化', () => {
  const dir = tempCsvDir();
  const file = path.join(dir, '02_怪物模板_好读版.csv');
  const rows = parseCsv(fs.readFileSync(file, 'utf8'));
  rows[0]['机制ID'] = 'mech_opening_shield,mech_counter,mech_aura';
  writeCsv(file, rows);
  const d = loadGameData({ csvDir: dir });
  const m = d.monsters[0];
  assert.deepEqual(m.mechanics, ['mech_shield_flat', 'mech_counter_damage', 'mech_scale_with_allies']);
  assert.deepEqual(m.mechanicsOriginal, ['mech_opening_shield', 'mech_counter', 'mech_aura']);
});

test('CSV06 fallback JSON 路径和无 initialSetup 的默认阵容可用', () => {
  const d = loadGameData({ preferCsv: false });
  assert.equal(d.pets.length, 127);
  const stripped = JSON.parse(JSON.stringify(d));
  delete stripped.initialSetup;
  const s = createGameState({ data: stripped });
  const heroes = s.units.filter(u => u.side === 'hero');
  assert.equal(heroes.length, 4);
  assert.equal(heroes[0].petId, 'pal_005');
});

test('CSV07 activePets 字符串覆盖初始阵容', () => {
  const d = loadGameData({ csvDir });
  const s = createGameState({ data: d, activePets: ['pal_001'] });
  const heroes = s.units.filter(u => u.side === 'hero');
  assert.equal(heroes.length, 1);
  assert.equal(heroes[0].petId, 'pal_001');
});
