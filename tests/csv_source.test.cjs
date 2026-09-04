const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const crypto = require('crypto');
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
  const productCounts = new Map(storeRows.map(row => [row.shop_store_id, 0]));
  assert.equal(petRows.length, 369, 'Vanessa 231 items + 138 skills should map to 369 pets');
  assert.equal(storeRows.length, 30, 'only the first 30 Journey shops remain formal stores');
  assert.ok(storeIds.has('night_base'), 'shop store table should include night_base');
  for (const row of petRows) {
    const ids = String(row['商店池(自动)'] || '').split(/[,，、]/).map(x => x.trim()).filter(Boolean);
    assert.ok(ids.length >= 1, `${row['宠物ID']} should keep at least one source-derived shop_store_id`);
    assert.ok(ids.length <= 10, `${row['宠物ID']} should not receive synthetic source shops`);
    for (const id of ids) {
      assert.ok(storeIds.has(id), `${row['宠物ID']} references missing shop store ${id}`);
      productCounts.set(id, productCounts.get(id) + 1);
    }
  }
  for (const [storeId, count] of productCounts) assert.ok(count >= 8, `${storeId} should contain at least 8 pets`);
});

test('CSV02F 369 宠来源映射、13 类附魔与版本化本机来源锁完整导出', () => {
  const pets = parseCsv(fs.readFileSync(resolveCsvFile(csvDir, '01_pets.csv'), 'utf8'));
  const shapes = parseCsv(fs.readFileSync(resolveCsvFile(csvDir, '08_action_shapes.csv'), 'utf8'));
  const enchantments = parseCsv(fs.readFileSync(resolveCsvFile(csvDir, '32_enchantment_types.csv'), 'utf8'));
  const petEnchantments = parseCsv(fs.readFileSync(resolveCsvFile(csvDir, '33_pet_enchantments.csv'), 'utf8'));
  const objects = parseCsv(fs.readFileSync(resolveCsvFile(csvDir, '34_bazaar_objects.csv'), 'utf8'));
  const referenceSnapshots = parseCsv(fs.readFileSync(resolveCsvFile(csvDir, '66_bazaar_reference_snapshots.csv'), 'utf8'));
  const shopMapping = parseCsv(fs.readFileSync(resolveCsvFile(csvDir, '35_bazaar_shop_mapping.csv'), 'utf8'));
  const heroCatalog = parseCsv(fs.readFileSync(resolveCsvFile(csvDir, '41_hero_catalog.csv'), 'utf8'));
  const tagCatalog = parseCsv(fs.readFileSync(resolveCsvFile(csvDir, '42_bazaar_tag_catalog.csv'), 'utf8'));
  assert.equal(pets.length, 369);
  assert.equal(shapes.length, 369);
  assert.equal(enchantments.length, 13);
  assert.equal(petEnchantments.length, 369);
  assert.equal(objects.length, 369);
  assert.equal(shopMapping.length, 56, '41 merchant stalls + 15 trainer stalls');
  assert.deepEqual(heroCatalog, [{
    hero_id: 'hero_001',
    catalog_status: 'playable',
    source_archetype: 'vanessa_items',
    playable_pet_count: '138',
    reserved_record_count: '231',
    source_object_count: '369',
    note: '第一英雄只开放138个物品来源宠物；技能与商人包映射保留为内部记录。'
  }]);
  assert.ok(tagCatalog.length > 0, 'formal Bazaar build-tag catalog should be exported');
  assert.deepEqual(referenceSnapshots.map(row => row.source_snapshot_id), [
    'snapshot_the_bazaar_patch_18_0_boundary',
    'snapshot_vanessa_legacy_catalog_v1',
    'snapshot_vanessa_local_cache_24720155_398715e6',
    'snapshot_vanessa_local_cache_25079259_db8914ab',
  ]);
  const currentBoundary = referenceSnapshots[0];
  assert.equal(currentBoundary.snapshot_role, 'current_version_boundary');
  assert.equal(currentBoundary.game_patch, '18.0');
  assert.equal(currentBoundary.game_build, null);
  assert.equal(currentBoundary.steam_app_id, '1617400');
  assert.equal(currentBoundary.steam_announcement_gid, '1842846814441157');
  assert.equal(currentBoundary.published_at_utc, '2026-09-02T17:45:15Z');
  assert.equal(currentBoundary.raw_content_hash_subject, 'steam_newsitem.contents_utf8');
  assert.equal(currentBoundary.raw_content_sha256, 'c3d70877395c8fcd6b64f36a72cfd2ce46583f4b493588bd8e4e955ca6d71681');
  assert.equal(currentBoundary.record_count, '0');
  assert.equal(currentBoundary.license_status, 'unverified');
  assert.equal(currentBoundary.usage_scope, 'reference_only');
  assert.equal(currentBoundary.rule_verification_policy, 'boundary_only_no_catalog_binding');
  const legacySnapshot = referenceSnapshots[1];
  assert.equal(legacySnapshot.snapshot_role, 'legacy_catalog_binding');
  assert.equal(legacySnapshot.game_patch, null);
  assert.equal(legacySnapshot.game_build, null);
  assert.equal(legacySnapshot.official_api_url, null);
  assert.equal(legacySnapshot.official_announcement_url, null);
  assert.equal(legacySnapshot.record_count, '369');
  assert.equal(legacySnapshot.raw_content_hash_subject, 'canonical_csv_utf8:34_bazaar_objects:legacy_fields_v1');
  assert.equal(legacySnapshot.raw_content_sha256, '44d1f157bd4f27d4fe3cd12827f67a9b2cd8d64fbd2e03032c10fff1dd7c4cb9');
  assert.equal(legacySnapshot.license_status, 'unverified');
  assert.equal(legacySnapshot.usage_scope, 'reference_only');
  assert.equal(legacySnapshot.rule_verification_policy, 'per_record_required');
  const localCacheSnapshot = referenceSnapshots[2];
  assert.equal(localCacheSnapshot.snapshot_role, 'build_bound_catalog_candidate');
  assert.equal(localCacheSnapshot.source_kind, 'local_installed_server_cache');
  assert.equal(localCacheSnapshot.source_namespace, 'tempo_prod_cache_gamedata');
  assert.equal(localCacheSnapshot.hero_scope, 'vanessa');
  assert.equal(localCacheSnapshot.game_patch, null);
  assert.equal(
    localCacheSnapshot.game_build,
    'steam_build_24720155+steam_lastupdated_epoch_1787836957+client_1.0.11980-prod-macos-arm64-d75a8ee9+gamedata_etag_398715e6296f400e5d7aa829f8f8ed35',
  );
  assert.equal(localCacheSnapshot.steam_app_id, '1617400');
  assert.equal(localCacheSnapshot.steam_announcement_gid, null);
  assert.equal(localCacheSnapshot.published_at_utc, null);
  assert.equal(localCacheSnapshot.official_api_url, null);
  assert.equal(localCacheSnapshot.official_announcement_url, null);
  assert.equal(
    localCacheSnapshot.raw_content_hash_subject,
    'local_cache_GameData.db_raw_bytes:bytes=41197568:mtime_epoch=1788062922:manifest_observed_epoch=1788342470',
  );
  assert.equal(localCacheSnapshot.raw_content_sha256, '352c635cda5acf8af7ab91a81fa73a5d33c3e6beec19ffd9e29dbd17d8a89d31');
  assert.equal(localCacheSnapshot.record_count, '276');
  assert.equal(localCacheSnapshot.license_status, 'unverified');
  assert.equal(localCacheSnapshot.usage_scope, 'reference_only');
  assert.equal(
    localCacheSnapshot.rule_verification_policy,
    'identity_set_locked:item_id_set_sha256=ac97522afdae6d9f0174b4c695bc272252adcc6ad9aea924853712e43d6d9708;skill_id_set_sha256=66cacbf986415cf6218e98254274d4b58c528136186e7fc7b632d0b01588d81b;per_record_rule_semantics_and_live_trace_required',
  );
  assert.equal(localCacheSnapshot.catalog_status, 'reference_reserved');
  assert.equal(
    localCacheSnapshot.unresolved_fields,
    'game_patch,explicit_patch_build_binding,license_terms,merchant_package_identity',
  );
  const relockedLocalCacheSnapshot = referenceSnapshots[3];
  assert.equal(relockedLocalCacheSnapshot.snapshot_role, 'build_bound_catalog_candidate');
  assert.equal(relockedLocalCacheSnapshot.source_kind, 'local_installed_server_cache');
  assert.equal(relockedLocalCacheSnapshot.source_namespace, 'tempo_prod_cache_gamedata');
  assert.equal(relockedLocalCacheSnapshot.hero_scope, 'vanessa');
  assert.equal(relockedLocalCacheSnapshot.game_patch, null);
  assert.equal(
    relockedLocalCacheSnapshot.game_build,
    'steam_build_25079259+steam_lastupdated_epoch_1788421691+client_1.0.12221-prod-macos-arm64-adc9ca50+gamedata_etag_db8914ab78bb1832b18bb89e9f5d8113',
  );
  assert.equal(relockedLocalCacheSnapshot.steam_app_id, '1617400');
  assert.equal(relockedLocalCacheSnapshot.steam_announcement_gid, null);
  assert.equal(relockedLocalCacheSnapshot.published_at_utc, null);
  assert.equal(relockedLocalCacheSnapshot.official_api_url, null);
  assert.equal(relockedLocalCacheSnapshot.official_announcement_url, null);
  assert.equal(
    relockedLocalCacheSnapshot.raw_content_hash_subject,
    'local_cache_GameData.db_raw_bytes:bytes=41586688:mtime_epoch=1788411702:manifest_observed_epoch=1788445021',
  );
  assert.equal(relockedLocalCacheSnapshot.raw_content_sha256, '7d8df658ebce967edf59ab8d0c889fa266f56917b87336928694cdce54246ee9');
  assert.equal(relockedLocalCacheSnapshot.record_count, '278');
  assert.equal(relockedLocalCacheSnapshot.license_status, 'unverified');
  assert.equal(relockedLocalCacheSnapshot.usage_scope, 'reference_only');
  assert.equal(
    relockedLocalCacheSnapshot.rule_verification_policy,
    'identity_set_locked:item_id_set_sha256=b18e167f48956a4ef63dcb4a2ba265c05cc7c6aac87739a737c45acea35af7bd;skill_id_set_sha256=66cacbf986415cf6218e98254274d4b58c528136186e7fc7b632d0b01588d81b;per_record_rule_semantics_and_live_trace_required',
  );
  assert.equal(relockedLocalCacheSnapshot.catalog_status, 'reference_reserved');
  assert.equal(
    relockedLocalCacheSnapshot.unresolved_fields,
    'game_patch,explicit_patch_build_binding,license_terms,merchant_package_identity',
  );
  assert.ok(objects.every(row => row.source_snapshot_id === legacySnapshot.source_snapshot_id));
  assert.ok(objects.every(row => row.current_version_boundary_snapshot_id === currentBoundary.source_snapshot_id));
  assert.ok(objects.every(row => row.identity_confirmed === 'true'));
  assert.ok(objects.every(row => row.rule_verified === 'false'));
  assert.ok(objects.every(row => String(row.rule_unresolved_fields || '').trim()));
  assert.ok(objects.every(row => row.catalog_status === 'reference_reserved'));
  assert.ok(objects.every(row => !Object.hasOwn(row, 'source_status')));
  assert.equal(objects.filter(row => row.source_type === 'item').length, 138);
  assert.equal(objects.filter(row => row.source_type === 'merchant_package').length, 93);
  assert.equal(objects.filter(row => row.source_type === 'skill').length, 138);
  const legacyHashFields = [
    'object_id', 'object_no', 'source_type', 'source_slug', 'source_name', 'source_tier',
    'source_size', 'source_tags', 'source_relation_count', 'source_stall_ids',
    'local_shop_count', 'local_shop_ids', 'primary_enchant', 'pet_id', 'pet_name',
    'source_url', 'source_effect', 'design_note', 'owner_hero_id', 'build_tags',
    'tag_references',
  ];
  const escapeCsv = value => {
    const text = value == null ? '' : String(value);
    return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };
  const canonicalLegacy = `${legacyHashFields.join(',')}\n${objects.map(row => (
    legacyHashFields.map(field => escapeCsv(row[field])).join(',')
  )).join('\n')}\n`;
  assert.equal(
    crypto.createHash('sha256').update(canonicalLegacy, 'utf8').digest('hex'),
    legacySnapshot.raw_content_sha256,
  );
  const stallIds = new Set(shopMapping.map(row => row.stall_id));
  assert.ok(objects.every(row => String(row.source_stall_ids || '').trim()), 'every object keeps exact source stall ids');
  for (const row of objects) {
    const ids = String(row.source_stall_ids).split(/[,，、]/).map(value => value.trim()).filter(Boolean);
    assert.ok(ids.every(id => stallIds.has(id)), `${row.object_id} references a missing source stall`);
  }
  const packageRows = objects.filter(row => row.source_type === 'merchant_package');
  assert.ok(packageRows.every(row => /^https:\/\/bazaardb\.gg\/card\//.test(row.source_url)));
  assert.deepEqual(new Set(packageRows.map(row => row.source_size)), new Set(['Small', 'Medium', 'Large']));
  assert.ok(packageRows.every(row => Number(row.local_shop_count) >= 1 && Number(row.local_shop_count) <= 2));
  assert.equal(shopMapping.filter(row => row.catalog_status === 'playable').length, 37);
  assert.equal(shopMapping.filter(row => row.catalog_status === 'reserved').length, 19);
  assert.ok(shopMapping.filter(row => row.catalog_status === 'playable').every(row => Number(row.playable_item_count) > 0));
  assert.ok(shopMapping.filter(row => row.catalog_status === 'reserved').every(row => Number(row.playable_item_count) === 0));
  assert.equal(shopMapping.filter(row => row.encounter_status === 'playable').length, 56);
  assert.equal(shopMapping.filter(row => row.offer_mode === 'pet').length, 37);
  assert.equal(shopMapping.filter(row => row.offer_mode === 'training_service').length, 15);
  assert.equal(shopMapping.filter(row => row.offer_mode === 'merchant_service').length, 4);
  assert.ok(shopMapping.filter(row => row.offer_mode === 'pet').every(row => Number(row.playable_item_count) > 0));
  assert.ok(shopMapping.filter(row => row.offer_mode !== 'pet').every(row => Number(row.playable_item_count) === 0));
  assert.equal(shopMapping.filter(row => row.encounter_status === 'playable' && row.day1_status === '开放').length, 9);
  assert.equal(shopMapping.filter(row => row.encounter_status === 'playable' && row.day2_status === '开放').length, 10);
  assert.equal(shopMapping.filter(row => row.encounter_status === 'playable' && row.day3_status === '开放').length, 10);
  const day1Names = shopMapping.filter(row => row.encounter_status === 'playable' && row.day1_status === '开放').map(row => row.source_name).sort();
  assert.deepEqual(day1Names, ['Aila', 'Ande', 'Barkun', 'Curio', 'Jay Jay', 'Kina', 'Midsworth', 'Nufu', 'Valpak'].sort());
  const curio = shopMapping.find(row => row.source_slug === 'curio');
  assert.equal(Number(curio?.offer_slots), 10);
  assert.equal(Number(curio?.free_rerolls), 1);
  assert.equal(Number(curio?.source_object_count), 31, '30 bronze packages plus Curio silver package');
  assert.deepEqual(new Set(shapes.map(row => Number(row['命中格数']))), new Set([1, 2, 3]));
});

test('CSV02H 外部参考来源锁伪造快照、版本绑定或规则状态时 fail closed', () => {
  const code = String.raw`
from copy import deepcopy
from pathlib import Path
import sys
sys.path.insert(0, str(Path(sys.argv[1]) / 'tools'))
import export_master_to_csv as exporter

csv_dir = Path(sys.argv[2])
object_rows, object_headers = exporter.read_csv(csv_dir / '34_bazaar_objects.csv')
snapshot_rows, snapshot_headers = exporter.read_csv(csv_dir / '66_bazaar_reference_snapshots.csv')
base = {
    '34_bazaar_objects.csv': (object_rows, object_headers),
    '66_bazaar_reference_snapshots.csv': (snapshot_rows, snapshot_headers),
}
exporter.validate_bazaar_reference_source_lock(base)

def forged(mutator, expected):
    tables = deepcopy(base)
    mutator(tables)
    try:
        exporter.validate_bazaar_reference_source_lock(tables)
    except ValueError as exc:
        assert expected in str(exc), (expected, str(exc))
        return
    raise AssertionError(expected)

forged(lambda t: t['66_bazaar_reference_snapshots.csv'][0][0].__setitem__('raw_content_sha256', '0' * 64), 'SNAPSHOT_FIELDS_INVALID')
forged(lambda t: t['66_bazaar_reference_snapshots.csv'][0][2].__setitem__('game_patch', '18.0'), 'SNAPSHOT_FIELDS_INVALID')
forged(lambda t: t['66_bazaar_reference_snapshots.csv'][0][2].__setitem__('record_count', '277'), 'SNAPSHOT_FIELDS_INVALID')
forged(lambda t: t['66_bazaar_reference_snapshots.csv'][0][2].__setitem__('license_status', 'verified'), 'SNAPSHOT_FIELDS_INVALID')
forged(lambda t: t['66_bazaar_reference_snapshots.csv'][0][2].__setitem__('rule_verification_policy', t['66_bazaar_reference_snapshots.csv'][0][2]['rule_verification_policy'].replace(exporter.LOCAL_CACHE_ITEM_ID_SET_SHA256, '0' * 64)), 'LOCAL_ID_SET_LOCK_INVALID')
forged(lambda t: t['66_bazaar_reference_snapshots.csv'][0][2].__setitem__('rule_verification_policy', 'identity_set_locked:item_id_set_sha256=bad;skill_id_set_sha256=bad;per_record_rule_semantics_and_live_trace_required'), 'LOCAL_ID_SET_LOCK_INVALID')
forged(lambda t: t['66_bazaar_reference_snapshots.csv'][0][3].__setitem__('game_patch', '18.0'), 'SNAPSHOT_FIELDS_INVALID')
forged(lambda t: t['66_bazaar_reference_snapshots.csv'][0][3].__setitem__('game_build', t['66_bazaar_reference_snapshots.csv'][0][3]['game_build'].replace('db8914ab78bb1832b18bb89e9f5d8113', '00000000000000000000000000000000')), 'SNAPSHOT_FIELDS_INVALID')
forged(lambda t: t['66_bazaar_reference_snapshots.csv'][0][3].__setitem__('raw_content_sha256', '0' * 64), 'SNAPSHOT_FIELDS_INVALID')
forged(lambda t: t['66_bazaar_reference_snapshots.csv'][0][3].__setitem__('record_count', '276'), 'SNAPSHOT_FIELDS_INVALID')
forged(lambda t: t['66_bazaar_reference_snapshots.csv'][0][3].__setitem__('license_status', 'verified'), 'SNAPSHOT_FIELDS_INVALID')
forged(lambda t: t['66_bazaar_reference_snapshots.csv'][0][3].__setitem__('rule_verification_policy', t['66_bazaar_reference_snapshots.csv'][0][3]['rule_verification_policy'].replace(exporter.RELOCKED_LOCAL_CACHE_ITEM_ID_SET_SHA256, '0' * 64)), 'LOCAL_ID_SET_LOCK_INVALID')
forged(lambda t: t['66_bazaar_reference_snapshots.csv'][0].pop(), 'SNAPSHOT_IDENTITY_INVALID')
forged(lambda t: t['34_bazaar_objects.csv'][0][0].__setitem__('source_snapshot_id', exporter.CURRENT_VERSION_BOUNDARY_SNAPSHOT_ID), 'LEGACY_BINDING_INVALID')
forged(lambda t: t['34_bazaar_objects.csv'][0][0].__setitem__('rule_verified', 'true'), 'VERIFICATION_INVALID')
forged(lambda t: t['34_bazaar_objects.csv'][0][0].__setitem__('catalog_status', 'playable'), 'STATUS_INVALID')
forged(lambda t: t['34_bazaar_objects.csv'][0][0].__setitem__('rule_unresolved_fields', ''), 'UNRESOLVED_REQUIRED')
forged(lambda t: t['34_bazaar_objects.csv'][0][0].__setitem__('source_effect', 'forged'), 'LEGACY_CATALOG_HASH_INVALID')
`;
  execFileSync('python3', ['-c', code, root, csvDir], { cwd: root, stdio: 'pipe' });
});

test('CSV02G 第一英雄目录只开放 138 个物品映射，标签严格区分拥有与引用', () => {
  const pets = parseCsv(fs.readFileSync(resolveCsvFile(csvDir, '01_pets.csv'), 'utf8'));
  const shops = parseCsv(fs.readFileSync(resolveCsvFile(csvDir, '06_shop_rewards.csv'), 'utf8'));
  const objects = parseCsv(fs.readFileSync(resolveCsvFile(csvDir, '34_bazaar_objects.csv'), 'utf8'));
  const tags = parseCsv(fs.readFileSync(resolveCsvFile(csvDir, '42_bazaar_tag_catalog.csv'), 'utf8'));
  const playable = pets.filter(row => row.catalog_status === 'playable');
  const reserved = pets.filter(row => row.catalog_status === 'reserved');
  assert.equal(playable.length, 138);
  assert.equal(reserved.length, 231);
  assert.ok(playable.every(row => row.owner_hero_id === 'hero_001'));
  assert.ok(reserved.every(row => !row.owner_hero_id));
  const objectByPet = new Map(objects.map(row => [row.pet_id, row]));
  assert.ok(playable.every(row => objectByPet.get(row['宠物ID'])?.source_type === 'item'));
  assert.ok(reserved.every(row => ['skill', 'merchant_package'].includes(objectByPet.get(row['宠物ID'])?.source_type)));
  assert.equal(shops.filter(row => row.catalog_status === 'playable').length, 138);
  assert.equal(shops.filter(row => row.catalog_status === 'reserved').length, 231);
  assert.ok(shops.filter(row => row.catalog_status === 'reserved').every(row => row['商店状态'] === '保留'));
  const tagIds = new Set(tags.map(row => row.tag_id));
  for (const row of playable) {
    const buildTags = String(row.build_tags || '').split(/[,|]/).map(tag => tag.trim()).filter(Boolean);
    const references = String(row.tag_references || '').split(/[,|]/).map(tag => tag.trim()).filter(Boolean);
    assert.ok(buildTags.every(tag => tagIds.has(tag)), `${row['宠物ID']} has unknown build tag`);
    assert.ok(references.every(tag => tagIds.has(tag)), `${row['宠物ID']} has unknown tag reference`);
    assert.ok(buildTags.every(tag => !tag.endsWith('reference')), `${row['宠物ID']} leaks reference tag into build tags`);
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
assert visible == [
    'README', 'PETS', 'SHOP_STORES', 'WAVES', 'SHOP_ITEMS', 'MECHANICS_QUALITY',
    'SHAPES_TRIALS', 'BAZAAR_OBJECTS', 'BAZAAR_REFERENCE_SNAPSHOTS', 'SHOP_MAPPING', 'ENCHANTMENTS',
    'PET_ENCHANTMENTS', 'AUDIT', 'ATTRIBUTES_EFFECTS', 'PET_STAT_RULES', 'ROUTE',
    'HERO_CATALOG', 'TAG_CATALOG', 'HERO_SKILLS',
    'BZ_GAMEPLAY', 'BZ_HEROES', 'BZ_ITEMS', 'BZ_ITEM_EFFECTS', 'BZ_ITEM_SKILLS',
    'BZ_STALLS', 'BZ_STALL_OFFERS', 'BZ_EVENTS', 'BZ_EVENT_OPTIONS',
    'BZ_ENCOUNTERS', 'BZ_ENEMIES', 'BZ_REWARDS', 'BZ_SOURCE_SNAPSHOT',
    'BZ_ITEM_UPGRADES', 'BZ_ENCHANTMENTS', 'BZ_LEVEL_UP_CHOICES',
    'BZ_GHOST_SNAPSHOTS', 'BZ_LAST_CHANCE_CHOICES', 'BZ_HERO_SKILLS',
    'BZ_HERO_SKILL_LOADOUTS', 'BZ_HERO_SKILL_TRAINERS', 'BZ_HERO_SKILL_OFFERS',
    'BZ_ITEM_AURAS', 'BAZAAR_REFERENCE_MEMBERS',
], visible
assert not hidden, hidden
raw_csv_sheets = [name[:-4] for name in csv_files if name[:-4] in wb.sheetnames]
assert not raw_csv_sheets, raw_csv_sheets
assert 'shop_store_ids' in [cell.value for cell in wb['PETS'][1]], [cell.value for cell in wb['PETS'][1]]
assert 'source_object_id' in [cell.value for cell in wb['PETS'][1]], [cell.value for cell in wb['PETS'][1]]
assert 'attack_grid_count' in [cell.value for cell in wb['PETS'][1]], [cell.value for cell in wb['PETS'][1]]
assert 'primary_enchant' in [cell.value for cell in wb['PETS'][1]], [cell.value for cell in wb['PETS'][1]]
assert 'enemy_move_range' in [cell.value for cell in wb['PETS'][1]], [cell.value for cell in wb['PETS'][1]]
assert 'enemy_attack_count' in [cell.value for cell in wb['PETS'][1]], [cell.value for cell in wb['PETS'][1]]
assert 'skill_ids' in [cell.value for cell in wb['PETS'][1]], [cell.value for cell in wb['PETS'][1]]
assert 'def' in [cell.value for cell in wb['PETS'][1]], [cell.value for cell in wb['PETS'][1]]
assert 'shop_store_id' in [cell.value for cell in wb['SHOP_STORES'][1]], [cell.value for cell in wb['SHOP_STORES'][1]]
nonempty_rows = lambda sheet: sum(
    1 for row in wb[sheet].iter_rows(values_only=True)
    if any(value is not None and str(value).strip() != '' for value in row)
)
assert nonempty_rows('PETS') == 370, nonempty_rows('PETS')
assert nonempty_rows('SHOP_STORES') == 31, nonempty_rows('SHOP_STORES')
assert nonempty_rows('ENCHANTMENTS') == 14, nonempty_rows('ENCHANTMENTS')
assert nonempty_rows('PET_STAT_RULES') == 87, nonempty_rows('PET_STAT_RULES')
assert nonempty_rows('BAZAAR_REFERENCE_SNAPSHOTS') == 5, nonempty_rows('BAZAAR_REFERENCE_SNAPSHOTS')
marker_values = [str(row[1] or '') for row in wb['SHAPES_TRIALS'].iter_rows(min_col=1, max_col=2, values_only=True)]
assert '13_day7_beast_trial.csv' not in marker_values, marker_values
mechanic_markers = [str(row[1] or '') for row in wb['MECHANICS_QUALITY'].iter_rows(min_col=1, max_col=2, values_only=True)]
assert '31_battle_rules.csv' in mechanic_markers, mechanic_markers
assert '36_skill_catalog.csv' in marker_values, marker_values
assert '37_trait_catalog.csv' in marker_values, marker_values
assert '38_skill_combo_catalog.csv' in marker_values, marker_values
attribute_markers = [str(row[1] or '') for row in wb['ATTRIBUTES_EFFECTS'].iter_rows(min_col=1, max_col=2, values_only=True)]
assert '39_stat_catalog.csv' in attribute_markers, attribute_markers
assert '40_status_catalog.csv' in attribute_markers, attribute_markers
route_markers = [str(row[1]) for row in wb['ROUTE'].iter_rows(min_col=1, max_col=2, values_only=True) if row[0] == '#csv']
assert route_markers == ['24_node_schedule.csv', '25_node_pool.csv', '26_encounter_pool.csv'], route_markers
wb.close()
`;
  execFileSync('python3', ['-c', code, path.join(root, 'xlsx', 'ysbzs_master.xlsx'), ...allProgramCsvFiles()], { cwd: root, stdio: 'pipe' });
});

test('CSV08C 每只宠物拥有八个已注册的可排序技能', () => {
  const pets = parseCsv(fs.readFileSync(resolveCsvFile(csvDir, '01_pets.csv'), 'utf8'));
  const skills = parseCsv(fs.readFileSync(resolveCsvFile(csvDir, '36_skill_catalog.csv'), 'utf8'));
  const catalogIds = new Set(skills.map((row) => row.skill_id));
  assert.equal(skills.length, 8);
  for (const skill of skills) {
    const effects = JSON.parse(skill.effects_json);
    assert.deepEqual(effects.map((effect) => effect.type), ['physical_damage', 'apply_element_layer']);
    assert.equal(effects[1].layers, 1);
  }
  for (const pet of pets) {
    const ids = String(pet['技能序列'] || '').split(',').filter(Boolean);
    assert.equal(ids.length, 8, pet['宠物ID']);
    assert.equal(new Set(ids).size, 8, pet['宠物ID']);
    assert.ok(ids.every((id) => catalogIds.has(id)), pet['宠物ID']);
  }
});

test('CSV08D 每只宠物拥有已注册特性且技能组合引用有效标签', () => {
  const pets = parseCsv(fs.readFileSync(resolveCsvFile(csvDir, '01_pets.csv'), 'utf8'));
  const skills = parseCsv(fs.readFileSync(resolveCsvFile(csvDir, '36_skill_catalog.csv'), 'utf8'));
  const traits = parseCsv(fs.readFileSync(resolveCsvFile(csvDir, '37_trait_catalog.csv'), 'utf8'));
  const combos = parseCsv(fs.readFileSync(resolveCsvFile(csvDir, '38_skill_combo_catalog.csv'), 'utf8'));
  const traitIds = new Set(traits.map((row) => row.trait_id));
  const skillTags = new Set(skills.flatMap((row) => String(row.tags || '').split('|').filter(Boolean)));
  assert.equal(traits.length, 4);
  assert.equal(combos.length, 4);
  for (const trait of traits) {
    const effects = JSON.parse(trait.effects_json);
    assert.ok(effects.length > 0, trait.trait_id);
    assert.ok(effects.every((effect) => ['skill', 'combo'].includes(effect.hook)), trait.trait_id);
    assert.ok(effects.every((effect) => effect.type === 'modify_stat'), trait.trait_id);
    assert.ok(effects.every((effect) => effect.stat && effect.operation), trait.trait_id);
  }
  for (const combo of combos) {
    assert.equal(combo.match_type, 'tag_sequence');
    const pattern = JSON.parse(combo.pattern_json);
    assert.ok(pattern.length >= 2, combo.combo_id);
    assert.ok(pattern.every((tag) => skillTags.has(tag)), combo.combo_id);
    assert.ok(JSON.parse(combo.effects_json).length > 0, combo.combo_id);
  }
  for (const pet of pets) {
    const ids = String(pet['特性序列'] || '').split(',').filter(Boolean);
    assert.equal(ids.length, 1, pet['宠物ID']);
    assert.ok(traitIds.has(ids[0]), pet['宠物ID']);
  }
});

test('CSV08E 通用属性与状态目录支持几十种属性和白名单 modifier', () => {
  const stats = parseCsv(fs.readFileSync(resolveCsvFile(csvDir, '39_stat_catalog.csv'), 'utf8'));
  const statuses = parseCsv(fs.readFileSync(resolveCsvFile(csvDir, '40_status_catalog.csv'), 'utf8'));
  const statIds = new Set(stats.map((row) => row.stat_id));
  assert.ok(stats.length >= 40, `expected dozens of stats, got ${stats.length}`);
  assert.ok(['max_hp', 'atk', 'def', 'physical_power_permille', 'element_layer_bonus'].every((id) => statIds.has(id)));
  assert.ok(stats.every((row) => ['integer', 'permille'].includes(row.value_type)), 'typed stat values');
  assert.ok(stats.every((row) => Number.isFinite(Number(row.default_value))), 'numeric defaults');
  assert.ok(statuses.length >= 8);
  for (const status of statuses) {
    const effects = JSON.parse(status.effects_json);
    assert.ok(effects.length > 0, status.status_id);
    assert.ok(effects.every((effect) => effect.type === 'modify_stat'), status.status_id);
    assert.ok(effects.every((effect) => statIds.has(effect.stat)), status.status_id);
    assert.ok(effects.every((effect) => ['flat_add', 'flat_add_per_stack'].includes(effect.operation)), status.status_id);
  }
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
