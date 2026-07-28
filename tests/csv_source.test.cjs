const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');
const { parseCsv, loadSourceTablesFromCsv, loadGameData, csvSourceAvailable, resolveCsvFile } = require('../src/core/csvData.cjs');
const { validateData } = require('../src/core/data.cjs');
const { createGameState } = require('../src/core/state.cjs');

const root = path.resolve(__dirname, '..');
const csvDir = path.join(root, 'data', 'csv');
const normalizedTables = ['pets', 'monsters', 'waves', 'mechanisms', 'events', 'shop', 'shopStores', 'relics', 'shapes', 'validation'];
const runtimeRequiredTables = [
  ...normalizedTables,
  'initialSetup',
  'heroDomains',
  'elementReactions',
  'day7Trial',
  'qualityMultipliers',
  'trialQuestions',
  'trialActions',
  'victoryRules',
  'effectObjects',
  'triggers',
  'modifiers',
  'elementPacketRules',
  'elementConversions',
  'triggerOrderRules',
  'nodeSchedule',
  'nodePool',
  'encounterPool'
];

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

function allProgramCsvFiles() {
  return fs.readdirSync(csvDir).filter(name => name.endsWith('.csv')).sort();
}

test('CSV01 data/csv 真源目录存在且 01-09 表数量完整', () => {
  assert.equal(csvSourceAvailable(csvDir), true);
  const tables = loadSourceTablesFromCsv(csvDir);
  for (const key of runtimeRequiredTables) {
    assert.ok(Array.isArray(tables[key]), `${key} should load as rows`);
    assert.ok(tables[key].length > 0, `${key} should not be empty`);
  }
  assert.equal(tables.shapes.length, tables.pets.length, 'one action-shape row should exist per pet');
  assert.equal(tables.shop.length, tables.pets.length, 'one shop/reward row should exist per pet');
  assert.ok(tables.shopStores.length > 0, 'shop store table should list available commodity stores');
});

test('CSV02 程序优先从 CSV 重建 normalized data 并通过跨表校验', () => {
  const d = loadGameData({ csvDir });
  const tables = loadSourceTablesFromCsv(csvDir);
  assert.equal(d.meta.sourceType, 'csv');
  for (const key of normalizedTables) assert.equal(d[key].length, tables[key].length, key);
  const enabledInitialRows = tables.initialSetup.filter(row => String(row['启用'] || row['是否启用'] || '是').trim() !== '否');
  assert.equal(d.initialSetup.playerParty.length, enabledInitialRows.length);
  const v = validateData(d);
  assert.equal(v.ok, true, v.issues.join('\n'));
});

test('CSV02B 商店价格字段由导出链路标准化且同品质一致', () => {
  const rows = parseCsv(fs.readFileSync(resolveCsvFile(csvDir, '06_shop_rewards.csv'), 'utf8'));
  const pricesByQuality = new Map();
  for (const row of rows) {
    const quality = row['品质(自动)'];
    const defaultPrice = Number(row['默认价']);
    const overridePrice = Number(row['价格覆盖']);
    assert.ok(Number.isFinite(defaultPrice) && defaultPrice > 0, `${row['宠物ID']} default price`);
    assert.equal(overridePrice, defaultPrice, `${row['宠物ID']} override price should match exported default`);
    if (!pricesByQuality.has(quality)) pricesByQuality.set(quality, new Set());
    pricesByQuality.get(quality).add(defaultPrice);
  }
  for (const [quality, prices] of pricesByQuality) assert.equal(prices.size, 1, `${quality} should have one exported public price`);
});

test('CSV02D 宠物商品店字段必须能在商品店表中证明', () => {
  const petRows = parseCsv(fs.readFileSync(resolveCsvFile(csvDir, '06_shop_rewards.csv'), 'utf8'));
  const storeRows = parseCsv(fs.readFileSync(resolveCsvFile(csvDir, '30_shop_stores.csv'), 'utf8'));
  const storeIds = new Set(storeRows.map(row => row.shop_store_id).filter(Boolean));
  assert.ok(storeIds.has('night_base'), 'shop store table should include night_base');
  for (const row of petRows) {
    const ids = String(row['商店池(自动)'] || '').split(/[,，、]/).map(x => x.trim()).filter(Boolean);
    assert.ok(ids.length > 0, `${row['宠物ID']} should list shop_store_ids`);
    for (const id of ids) assert.ok(storeIds.has(id), `${row['宠物ID']} references missing shop store ${id}`);
  }
});

test('CSV02E 正式战斗重置次数由策划表声明为每5回合一次且开局为0', () => {
  const rows = parseCsv(fs.readFileSync(resolveCsvFile(csvDir, '31_battle_rules.csv'), 'utf8'));
  const byId = new Map(rows.map(row => [row.rule_id, row]));
  assert.equal(Number(byId.get('pet_reset_charge_interval')?.value), 5);
  assert.equal(Number(byId.get('pet_reset_initial_charges')?.value), 0);
  assert.equal(byId.get('pet_reset_charge_interval')?.status, '正式');
});

test('CSV02C 宠物重设计导出不保留旧表 44 占位值', () => {
  const checks = [
    ['01_pets.csv', ['副属']],
    ['02_monster_templates.csv', ['移动力', '攻击次数', '机制参数', '克制', '推荐日', '备注']],
    ['06_shop_rewards.csv', ['出现条件', '备注']],
  ];
  for (const [file, fields] of checks) {
    const rows = parseCsv(fs.readFileSync(resolveCsvFile(csvDir, file), 'utf8'));
    for (const row of rows) {
      const label = row['宠物ID'] || row['名称(自动)'] || file;
      for (const field of fields) {
        assert.notEqual(String(row[field] || '').trim(), '44', `${file} ${label} ${field}`);
      }
    }
  }
});

test('CSV03 改宠物 CSV 后，重新 loadGameData 会反映新数值', () => {
  const dir = tempCsvDir();
  const file = resolveCsvFile(dir, '01_pets.csv');
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
  const file = resolveCsvFile(dir, '10_initial_roster.csv');
  const rows = parseCsv(fs.readFileSync(file, 'utf8'));
  rows[0]['宠物ID'] = 'pal_001';
  rows[0]['品质覆盖'] = '黄金';
  rows[0]['行(1-8)'] = '1';
  rows[0]['列(1-8)'] = '8';
  writeCsv(file, rows);
  const d = loadGameData({ csvDir: dir });
  const s = createGameState({ data: d });
  const first = s.units.filter(u => u.side === 'hero')[0];
  assert.equal(first.petId, 'pal_001');
  assert.equal(first.quality, '黄金');
  assert.equal(first.qualityProgression.quality, 'gold');
  assert.deepEqual(first.position, { r: 0, c: 7 });
});

test('CSV05 多机制串和旧机制 ID 会自动归一化', () => {
  const dir = tempCsvDir();
  const file = resolveCsvFile(dir, '02_monster_templates.csv');
  const rows = parseCsv(fs.readFileSync(file, 'utf8'));
  rows[0]['机制ID'] = 'mech_opening_shield,mech_counter,mech_aura,REVIEW';
  writeCsv(file, rows);
  const d = loadGameData({ csvDir: dir });
  const m = d.monsters[0];
  assert.deepEqual(m.mechanics, ['mech_shield_flat', 'mech_counter_damage', 'mech_scale_with_allies']);
  assert.deepEqual(m.mechanicsOriginal, ['mech_opening_shield', 'mech_counter', 'mech_aura', 'REVIEW']);
});

test('CSV06 fallback JSON 路径和无 initialSetup 的默认阵容可用', () => {
  const d = loadGameData({ csvDir, cache: false });
  assert.ok(d.pets.length > 0);
  const stripped = JSON.parse(JSON.stringify(d));
  delete stripped.initialSetup;
  const s = createGameState({ data: stripped });
  const heroes = s.units.filter(u => u.side === 'hero');
  assert.ok(heroes.length > 0);
  assert.ok(d.pets.some(pet => pet.id === heroes[0].petId), 'fallback starter should reference a known pet');
});

test('CSV07 activePets 字符串覆盖初始阵容', () => {
  const d = loadGameData({ csvDir });
  const s = createGameState({ data: d, activePets: ['pal_001'] });
  const heroes = s.units.filter(u => u.side === 'hero');
  assert.equal(heroes.length, 1);
  assert.equal(heroes[0].petId, 'pal_001');
});

test('CSV08 策划总表可无损导出全部程序 CSV', () => {
  const outDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ysbzs-master-export-'));
  execFileSync('python3', [
    path.join(root, 'tools', 'export_master_to_csv.py'),
    '--master', path.join(root, 'xlsx', 'ysbzs_master.xlsx'),
    '--baseline-dir', csvDir,
    '--out-dir', outDir
  ], { cwd: root, stdio: 'pipe' });
  for (const name of allProgramCsvFiles()) {
    const expectedCsv = fs.readFileSync(path.join(csvDir, name), 'utf8');
    const actualCsv = fs.readFileSync(path.join(outDir, name), 'utf8');
    assert.equal(actualCsv, expectedCsv, name);
  }
});

test('CSV08B 总表必须保持少量策划域表，不允许隐藏同名程序 CSV sheet', () => {
  const code = `
from openpyxl import load_workbook
import sys
wb = load_workbook(sys.argv[1], read_only=True, data_only=True)
csv_files = sys.argv[2:]
visible = [ws.title for ws in wb.worksheets if ws.sheet_state == 'visible']
hidden = [ws.title for ws in wb.worksheets if ws.sheet_state != 'visible']
assert visible == ['README', 'PETS', 'SHOP_STORES', 'WAVES', 'SHOP_ITEMS', 'MECHANICS_QUALITY', 'SHAPES_TRIALS'], visible
assert not hidden, hidden
raw_csv_sheets = [name[:-4] for name in csv_files if name[:-4] in wb.sheetnames]
assert not raw_csv_sheets, raw_csv_sheets
assert 'shop_store_ids' in [cell.value for cell in wb['PETS'][1]], [cell.value for cell in wb['PETS'][1]]
assert 'enemy_move_range' in [cell.value for cell in wb['PETS'][1]], [cell.value for cell in wb['PETS'][1]]
assert 'enemy_attack_count' in [cell.value for cell in wb['PETS'][1]], [cell.value for cell in wb['PETS'][1]]
assert 'shop_store_id' in [cell.value for cell in wb['SHOP_STORES'][1]], [cell.value for cell in wb['SHOP_STORES'][1]]
marker_values = [str(row[1] or '') for row in wb['SHAPES_TRIALS'].iter_rows(min_col=1, max_col=2, values_only=True)]
assert '13_day7_beast_trial.csv' not in marker_values, marker_values
mechanic_markers = [str(row[1] or '') for row in wb['MECHANICS_QUALITY'].iter_rows(min_col=1, max_col=2, values_only=True)]
assert '31_battle_rules.csv' in mechanic_markers, mechanic_markers
wb.close()
`;
  execFileSync('python3', ['-c', code, path.join(root, 'xlsx', 'ysbzs_master.xlsx'), ...allProgramCsvFiles()], { cwd: root, stdio: 'pipe' });
});

test('CSV09 策划好读版 workbook 可从当前 CSV 重建', () => {
  const outFile = path.join(os.tmpdir(), `ysbzs-readable-${Date.now()}.xlsx`);
  execFileSync('python3', [
    path.join(root, 'tools', 'build_readable_workbook.py'),
    '--target', outFile
  ], { cwd: root, stdio: 'pipe' });
  assert.ok(fs.existsSync(outFile), 'readable workbook generated');
  assert.ok(fs.statSync(outFile).size > 10000, 'readable workbook has content');
  const sourceTables = loadSourceTablesFromCsv(csvDir);
  const rowChecks = {
    '01_宠物主表_好读版': sourceTables.pets.length + 1,
    '03_怪物波次_好读版': sourceTables.waves.length + 1,
    '06_商店奖励池_好读版': sourceTables.shop.length + 1,
    '27_新19战斗形状目录': parseCsv(fs.readFileSync(resolveCsvFile(csvDir, '27_shape_catalog.csv'), 'utf8')).length + 1,
    '28_品质成长数值表': parseCsv(fs.readFileSync(resolveCsvFile(csvDir, '28_quality_growth.csv'), 'utf8')).length + 1,
    '29_品质升级质变表': parseCsv(fs.readFileSync(resolveCsvFile(csvDir, '29_quality_upgrades.csv'), 'utf8')).length + 1,
  };
  execFileSync('python3', ['-c', `
from openpyxl import load_workbook
import sys
import json
wb = load_workbook(sys.argv[1], read_only=True, data_only=True)
checks = json.loads(sys.argv[2])
for sheet, rows in checks.items():
    assert sheet in wb.sheetnames, sheet
    assert wb[sheet].max_row == rows, (sheet, wb[sheet].max_row)
wb.close()
`, outFile, JSON.stringify(rowChecks)], { cwd: root, stdio: 'pipe' });
});
