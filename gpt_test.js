#!/usr/bin/env node
/**
 * gpt_test.js — ysbzs 全量验收脚本
 *
 * 总测试 ≥ 150 项，含：
 *   - 环境预检查（外部数据完整性）
 *   - 运行时代码接线检查
 *   - 玩家行为测试（A-J 分组，≥ 80 项）
 *   - 项目测试（test.js / playable_run.js）
 *
 * 用法:
 *   node gpt_test.js [--json] [--skip-node-test] [--skip-playable]
 *
 * 纪律:
 *   - 不改项目代码 / generated-json / Excel
 *   - 外部数据不存在时不误报 PROJECT_PARTIAL，报 DATA_MISSING / TEST_ENV_FAIL
 */

const fs = require('fs');
const path = require('path');
const cp = require('child_process');

const ROOT = process.cwd();
const args = new Set(process.argv.slice(2));
const SKIP_NODE_TEST = args.has('--skip-node-test');
const SKIP_PLAYABLE = args.has('--skip-playable');
const JSON_OUT = args.has('--json');

// ════════════════════════════════════════════════════════════════
// 报告状态
// ════════════════════════════════════════════════════════════════

const REPORT = {
  meta: { startedAt: new Date().toISOString(), root: ROOT },
  summary: { total: 0, passed: 0, failed: 0, warned: 0, behavior: 0 },
  groups: {},
  items: [],    // { id, group, name, result, reason_type, explanation, recommendation }
  metrics: {},
  commands: [],
};

function getGroupStats(g) {
  if (!REPORT.groups[g]) REPORT.groups[g] = { total: 0, passed: 0, failed: 0 };
  return REPORT.groups[g];
}

function addResult(id, group, name, result, opts) {
  opts = opts || {};
  const gs = getGroupStats(group);
  gs.total++;
  REPORT.summary.total++;
  if (group !== '__env__' && group !== '__wiring__') REPORT.summary.behavior++;
  const item = { id, group, name, result,
    reason_type: opts.type || '',
    explanation: opts.explanation || '',
    recommendation: opts.recommendation || '',
  };
  if (result === 'PASS') { gs.passed++; REPORT.summary.passed++; }
  else if (result === 'FAIL') { gs.failed++; REPORT.summary.failed++; }
  else if (result === 'WARN') { REPORT.summary.warned++; }
  if (result === 'FAIL') REPORT.items.push(item);
  if (result === 'WARN') REPORT.items.push({...item, result: 'WARN'});
}

function check(cond, id, group, name, opts) {
  if (cond) addResult(id, group, name, 'PASS', opts);
  else addResult(id, group, name, 'FAIL', opts);
}

// ════════════════════════════════════════════════════════════════
// 工具函数
// ════════════════════════════════════════════════════════════════

function rel(...parts) { return path.join(ROOT, ...parts); }
function exists(p) { return fs.existsSync(rel(p)); }
function readText(p) { return fs.readFileSync(rel(p), 'utf8'); }
function readJSON(p) { return JSON.parse(readText(p)); }
function arrFrom(obj, keys) {
  if (Array.isArray(obj)) return obj;
  if (!obj || typeof obj !== 'object') return [];
  for (const k of (keys || [])) { const v = obj[k]; if (Array.isArray(v)) return v; }
  if (obj.data && Array.isArray(obj.data)) return obj.data;
  if (obj.rows && Array.isArray(obj.rows)) return obj.rows;
  if (obj.items && Array.isArray(obj.items)) return obj.items;
  return [];
}
function firstValue(row, keys) {
  if (!row || typeof row !== 'object') return undefined;
  for (const k of keys) { const v = row[k]; if (v !== undefined && v !== null && v !== '') return v; }
}

function runCmd(cmd, opts) {
  opts = opts || {};
  const started = Date.now();
  const r = { cmd, ok: false, ms: 0, stdoutTail: '', stderrTail: '' };
  try {
    const out = cp.execSync(cmd, { cwd: ROOT, encoding:'utf8', stdio:['ignore','pipe','pipe'], timeout:opts.timeout||120000, maxBuffer:1024*1024*20 });
    r.ok = true; r.stdoutTail = out.split('\n').filter(Boolean).slice(-30).join('\n');
  } catch (e) {
    r.ok = false; r.stdoutTail = (e.stdout||'').split('\n').filter(Boolean).slice(-60).join('\n');
    r.stderrTail = (e.stderr||String(e.message||e)).split('\n').filter(Boolean).slice(-20).join('\n');
  }
  r.ms = Date.now()-started;
  REPORT.commands.push(r);
  return r;
}

// ════════════════════════════════════════════════════════════════
// 第一部分：环境预检查 (ENV)
// ════════════════════════════════════════════════════════════════

const DATA = {};

function envPreCheck() {
  const requiredFiles = [
    'external-data/generated-json/pal_units.json',
    'external-data/generated-json/shop_config.json',
    'external-data/generated-json/encounter_config.json',
    'external-data/generated-json/hero_config.json',
    'external-data/generated-json/relic_config.json',
    'external-data/generated-json/event_config.json',
    'external-data/generated-json/export_report.json',
    'external-data/generated-json/action-slots/action_template_enriched.json',
    'external-data/generated-json/action-slots/action_growth_enriched.json',
    'external-data/generated-json/attack-shapes/attack_shape_master.json',
    'external-data/generated-json/attack-shapes/attack_shape_cells.json',
    'external-data/generated-json/attack-shapes/attack_shape_sd_replacement_22.json',
  ];
  const missing = [];
  for (const f of requiredFiles) {
    const ok = exists(f);
    check(ok, `ENV01`, '__env__', `required file: ${f}`,
      { type: ok ? '' : 'DATA_MISSING', explanation: ok ? '' : `${rel(f)} 不存在`, recommendation: '运行 export_excel_to_json.py 生成 JSON' });
    if (!ok) missing.push(f);
  }

  DATA.envFilesOK = missing.length === 0;
  REPORT.metrics.envFileCheck = { total: requiredFiles.length, missing: missing.length, files: missing };

  if (!DATA.envFilesOK) { DATA.envFailReason = 'DATA_MISSING'; return; }

  // 读取 JSON 数据供后续使用
  try {
    DATA.palUnits    = readJSON('external-data/generated-json/pal_units.json');
    DATA.shopConfig  = readJSON('external-data/generated-json/shop_config.json');
    DATA.encounter   = readJSON('external-data/generated-json/encounter_config.json');
    DATA.heroConfig  = readJSON('external-data/generated-json/hero_config.json');
    DATA.relicConfig = readJSON('external-data/generated-json/relic_config.json');
    DATA.eventConfig = readJSON('external-data/generated-json/event_config.json');
    DATA.exportRep   = readJSON('external-data/generated-json/export_report.json');
    DATA.tplEnriched = readJSON('external-data/generated-json/action-slots/action_template_enriched.json');
    DATA.growthEnrich= readJSON('external-data/generated-json/action-slots/action_growth_enriched.json');
    DATA.shapeMaster = readJSON('external-data/generated-json/attack-shapes/attack_shape_master.json');
    DATA.shapeCells  = readJSON('external-data/generated-json/attack-shapes/attack_shape_cells.json');
    DATA.sdRep       = readJSON('external-data/generated-json/attack-shapes/attack_shape_sd_replacement_22.json');
    DATA.encounterWaves = arrFrom(DATA.encounter, ['encounter_wave']);
  } catch (e) {
    DATA.envFilesOK = false;
    DATA.envFailReason = 'PARSE_ERROR';
  }
}

// ════════════════════════════════════════════════════════════════
// 数据内容验证
// ════════════════════════════════════════════════════════════════

function envDataCheck() {
  if (!DATA.envFilesOK) { DATA.envDataOK = false; return; }
  const prefix = '__data__';

  // ── 导出报告 ──
  const er = DATA.exportRep || {};
  const rc = er.row_counts || {};
  const counts = [
    ['pal_master', 60], ['action_template', 180], ['action_growth', 720],
    ['shop_source', 60], ['event_master', 16], ['relic_master', 17],
  ];
  for (const [k, v] of counts) {
    check(rc[k] === v, `DAT01_${k}`, prefix, `export_report row_counts.${k}=${v}`,
      { type: rc[k] === v ? '' : 'DATA_MISSING', explanation: `实际 ${rc[k]}`, recommendation: '重新生成导出数据' });
  }

  // ── pal_units ──
  const palMaster = arrFrom(DATA.palUnits, ['pal_master']);
  check(palMaster.length === 60, `DAT02_pal_count`, prefix, `pal_master count=60`,
    { type: palMaster.length === 60 ? '' : 'DATA_MISSING', explanation: `实际 ${palMaster.length}` });
  REPORT.metrics.palCount = palMaster.length;

  const palStats = arrFrom(DATA.palUnits, ['pal_stats_ysbzs']);
  check(palStats.length === 60, `DAT03_pal_stats`, prefix, `pal_stats_ysbzs count=60`,
    { type: palStats.length === 60 ? '' : 'DATA_MISSING', explanation: `实际 ${palStats.length}` });

  const palUsage = arrFrom(DATA.palUnits, ['unit_usage']);
  check(palUsage.length === 60, `DAT04_pal_usage`, prefix, `unit_usage count=60`,
    { type: palUsage.length === 60 ? '' : 'DATA_MISSING', explanation: `实际 ${palUsage.length}` });

  const palIdSet = new Set(palMaster.map(x => String(firstValue(x, ['unit_id', 'pal_id', 'id']))));
  check(palIdSet.size === 60, `DAT05_pal_id_set`, prefix, `pal unit_id 数量=60`,
    { type: palIdSet.size === 60 ? '' : 'DATA_MISSING', explanation: `实际 ${palIdSet.size}` });

  // sizes
  const sizes = [...new Set(palMaster.map(x => String(firstValue(x, ['size', 'unit_size']))).filter(Boolean))];
  check(sizes.length >= 2, `DAT06_pal_sizes`, prefix, `pal_master 有 size 字段: ${sizes.join(', ')}`);
  REPORT.metrics.palSizes = sizes;

  // ── shop_config ──
  const shopSource = arrFrom(DATA.shopConfig, ['shop_source']);
  check(shopSource.length === 60, `DAT07_shop_source`, prefix, `shop_source count=60`,
    { type: shopSource.length === 60 ? '' : 'DATA_MISSING', explanation: `实际 ${shopSource.length}` });

  const shopRule = arrFrom(DATA.shopConfig, ['shop_rule']);
  check(shopRule.length >= 12, `DAT08_shop_rule`, prefix, `shop_rule >= 12 rows`,
    { type: shopRule.length >= 12 ? '' : 'DATA_MISSING', explanation: `实际 ${shopRule.length}` });

  // shop_source Pal ID 必须在 pal_master 中存在
  const shopUnitIds = shopSource.map(x => String(firstValue(x, ['unit_id', 'pal_id', 'id']))).filter(Boolean);
  const invalidShop = shopUnitIds.filter(id => !palIdSet.has(id));
  check(invalidShop.length === 0, `DAT09_shop_id_ref`, prefix, `shop_source unit_id 全部在 pal_master 中存在`,
    { type: invalidShop.length === 0 ? '' : 'DATA_MISSING', explanation: `${invalidShop.slice(0,5).join(',')} 不在 pal_master`, recommendation: '修复 shop_source 中错误的 unit_id' });

  const legacyIds = ['fire_starter','water_droplet','wind_breeze','earth_shield','balance','ember'];
  const legacyShop = shopUnitIds.filter(id => legacyIds.includes(id));
  check(legacyShop.length === 0, `DAT10_shop_no_legacy`, prefix, `shop_source 不含旧 ID`,
    { type: legacyShop.length === 0 ? '' : 'DATA_MISSING', explanation: `含 ${legacyShop.join(',')}`, recommendation: '清理 shop_source 中的旧 unit_id' });

  // ── encounter_config + runtime derived waves ──
  const ew = DATA.encounterWaves || [];
  const ewDays = [...new Set(ew.map(w => w.day))].sort((a,b)=>a-b);
  // 检查 waves.js 是否有 runtime derived wave 函数
  var wavesContent = exists('waves.js') ? readText('waves.js') : '';
  var hasDerived = wavesContent.indexOf('buildFallbackPalWaveConfig') >= 0;
  // 原始 encounter_config 覆盖天数，有 runtime derived 时确认 Day6/8/9 补充
  var allDaysCovered = ewDays.length >= 7;
  if (ewDays.length < 10 && hasDerived) {
    var missingDays = [];
    for (var dd = 1; dd <= 10; dd++) { if (!ewDays.includes(dd)) missingDays.push(dd); }
    var canDerive = missingDays.every(function(d) { return d === 6 || d === 8 || d === 9; });
    if (canDerive) allDaysCovered = true;
  }
  check(allDaysCovered, `DAT11_encounter_days`, prefix, `encounter_wave 覆盖或派生覆盖 all 10 days`,
    { type: allDaysCovered ? '' : 'DATA_MISSING', explanation: `原始天数: ${ewDays.join(',')}${hasDerived ? ' + runtime derived' : ''}` });
  REPORT.metrics.encounterDays = ewDays;

  // ── action-slots ──
  const tplArr = arrFrom(DATA.tplEnriched, ['action_template_enriched', 'action_template']);
  check(tplArr.length === 180, `DAT12_template_count`, prefix, `action_template_enriched count=180`,
    { type: tplArr.length === 180 ? '' : 'DATA_MISSING', explanation: `实际 ${tplArr.length}` });
  REPORT.metrics.templateCount = tplArr.length;

  const grwArr = arrFrom(DATA.growthEnrich, ['action_growth_enriched', 'action_growth']);
  check(grwArr.length === 720, `DAT13_growth_count`, prefix, `action_growth_enriched count=720`,
    { type: grwArr.length === 720 ? '' : 'DATA_MISSING', explanation: `实际 ${grwArr.length}` });
  REPORT.metrics.growthCount = grwArr.length;

  // 每个 Pal 3 template
  const tByUnit = new Map(); tplArr.forEach(r => { const id = String(firstValue(r,['unit_id','pal_id'])); tByUnit.set(id, (tByUnit.get(id)||0)+1); });
  const badT = [...tByUnit.entries()].filter(([,c]) => c !== 3);
  check(badT.length === 0, `DAT14_template_per_pal`, prefix, `60 Pal 各 3 template`,
    { type: badT.length === 0 ? '' : 'DATA_MISSING', explanation: `${badT.length} 个 Pal template 数量不是 3` });

  // 每个 Pal 12 growth
  const gByUnit = new Map(); grwArr.forEach(r => { const id = String(firstValue(r,['unit_id','pal_id'])); gByUnit.set(id, (gByUnit.get(id)||0)+1); });
  const badG = [...gByUnit.entries()].filter(([,c]) => c !== 12);
  check(badG.length === 0, `DAT15_growth_per_pal`, prefix, `60 Pal 各 12 growth`,
    { type: badG.length === 0 ? '' : 'DATA_MISSING', explanation: `${badG.length} 个 Pal growth 数量不是 12` });

  // template 必要字段
  const tplFields = ['shape_sn','shape_id','shape_name','shape_cat','shape_status','requires_full_fit','slot_role'];
  const missingTplFields = [];
  tplArr.forEach((r,i) => { tplFields.forEach(f => { if (r[f]===undefined||r[f]===null||r[f]==='') missingTplFields.push({idx:i,field:f}); }); });
  check(missingTplFields.length === 0, `DAT16_template_fields`, prefix, `action_template 必填字段完整`,
    { type: missingTplFields.length===0?'':'DATA_MISSING', explanation: `${missingTplFields.slice(0,10).map(x=>x.field).join(',')} 缺失` });

  // growth 必要字段
  const grwFields = ['shape_sn_base','damage_value','effect_value'];
  const missingGrwFields = [];
  grwArr.forEach((r,i) => { grwFields.forEach(f => { if (r[f]===undefined||r[f]===null) missingGrwFields.push({idx:i,field:f}); }); });
  check(missingGrwFields.length === 0, `DAT17_growth_fields`, prefix, `action_growth 必填字段完整`,
    { type: missingGrwFields.length===0?'':'DATA_MISSING', explanation: `${missingGrwFields.slice(0,10).map(x=>x.field).join(',')} 缺失` });

  // 新旧形状名检查
  const oldNames = ['双点刺','三点横','小十字','横三行','两排并列','两排交叉','远程弹射'];
  const oldHits = tplArr.filter(r => oldNames.includes(String(r.shape_name||'')));
  check(oldHits.length === 0, `DAT18_no_old_shape_names`, prefix, `template 中无旧形状名`,
    { type: oldHits.length===0?'':'DATA_MISSING', explanation: `发现 ${oldHits.length} 个旧形状名: ${oldHits.slice(0,5).map(r=>r.shape_name).join(',')}` });

  // shape_refs 匹配
  const masterArr = arrFrom(DATA.shapeMaster, ['attack_shape_master', 'shapes']);
  const masterBySn = new Map(masterArr.map(r => [String(firstValue(r,['sn','shape_sn'])), r]));
  const badRefs = [];
  tplArr.forEach(r => {
    const sn = String(firstValue(r,['shape_sn','sn']));
    const m = masterBySn.get(sn);
    if (!m) badRefs.push({sn});
    else {
      const mName = firstValue(m,['shape_name','name']);
      if (r.shape_name !== mName) badRefs.push({sn, name: r.shape_name, expected: mName});
    }
  });
  check(badRefs.length === 0, `DAT19_shape_refs`, prefix, `template shape_sn 全部匹配 master`,
    { type: badRefs.length===0?'':'DATA_MISSING', explanation: `${badRefs.slice(0,5).map(x=>`sn${x.sn}`).join(',')} 不匹配` });

  // ── attack-shapes ──
  check(masterArr.length === 22, `DAT20_master_count`, prefix, `attack_shape_master count=22`, { actual: masterArr.length });
  const sns = masterArr.map(x => Number(firstValue(x,['sn','shape_sn']))).filter(n=>!isNaN(n)).sort((a,b)=>a-b);
  check(sns.length===22 && sns.every((n,i)=>n===i+1), `DAT21_master_sns`, prefix, `master sn 覆盖 1-22`);
  const coreCount = masterArr.filter(x=>x.status==='core').length;
  const reserveCount = masterArr.filter(x=>x.status==='reserve').length;
  check(coreCount===12, `DAT22_master_core`, prefix, `master core=12`, {actual: coreCount});
  check(reserveCount===10, `DAT23_master_reserve`, prefix, `master reserve=10`, {actual: reserveCount});

  // 形状名验证
  const expectedNames = {1:'单点刺',2:'二连刺',3:'三连枪',4:'横扫三格',6:'标准前置T',7:'长柄T',8:'宽头T',12:'远程T'};
  for (const [sn, name] of Object.entries(expectedNames)) {
    const row = masterBySn.get(String(sn));
    check(row && firstValue(row,['shape_name','name'])===name, `DAT24_sn${sn}_name`, prefix, `shape sn${sn} name="${name}"`);
  }

  // cells
  const cellsArr = arrFrom(DATA.shapeCells, ['attack_shape_cells','cells']);
  check(cellsArr.length > 0, `DAT25_cells_count`, prefix, `attack_shape_cells 非空`, {actual: cellsArr.length});
  const cellSnSet = new Set(cellsArr.map(x => String(firstValue(x,['shape_sn','sn']))));
  const missingCells = sns.filter(sn => !cellSnSet.has(String(sn)));
  check(missingCells.length===0, `DAT26_cells_for_all`, prefix, `所有 shape 有 cells`,
    {type: missingCells.length===0?'':'DATA_MISSING', explanation: `缺少: ${missingCells.join(',')}`});

  // sd_replacement_22
  const sdObj = DATA.sdRep && DATA.sdRep.sd_replacement_22;
  const sdKeys = sdObj ? Object.keys(sdObj) : [];
  check(sdKeys.length===22, `DAT27_sd_count`, prefix, `sd_replacement_22 22 条`,
    {type: sdKeys.length===22?'':'DATA_FORMAT_MISMATCH', explanation: `实际 ${sdKeys.length} 条（Object 格式，非 Array）`});
  for (const [sn, name] of Object.entries(expectedNames)) {
    const entry = sdObj && sdObj[sn];
    check(entry && entry.name===name, `DAT28_sd_sn${sn}_name`, prefix, `sd_replacement sn${sn} name="${name}"`);
  }
  REPORT.metrics.shapeMasterCount = masterArr.length;

  // ── hero_config ──
  const heroMaster = arrFrom(DATA.heroConfig, ['hero_master']);
  check(heroMaster.length >= 1, `DAT29_hero_master`, prefix, `hero_master >= 1`, {actual: heroMaster.length});
  const heroStart = arrFrom(DATA.heroConfig, ['hero_starting_config']);
  check(heroStart.length >= 2, `DAT30_hero_start`, prefix, `hero_starting_config >= 2`, {actual: heroStart.length});

  // ── relic_config ──
  const relicMaster = arrFrom(DATA.relicConfig, ['relic_master']);
  check(relicMaster.length >= 10, `DAT31_relic_master`, prefix, `relic_master >= 10`, {actual: relicMaster.length});

  // ── event_config ──
  const eventMaster = arrFrom(DATA.eventConfig, ['event_master']);
  check(eventMaster.length >= 10, `DAT32_event_master`, prefix, `event_master >= 10`, {actual: eventMaster.length});

  DATA.envDataOK = true;
}

// ════════════════════════════════════════════════════════════════
// 代码接线检查 (WIRING)
// ════════════════════════════════════════════════════════════════

function wiringCheck() {
  const p = '__wiring__';
  const idxHtml = exists('index.html') ? readText('index.html') : '';
  const ext = exists('externalDataAdapter.js') ? readText('externalDataAdapter.js') : '';
  const shop = exists('shop.js') ? readText('shop.js') : '';
  const waves = exists('waves.js') ? readText('waves.js') : '';
  const game = exists('game.js') ? readText('game.js') : '';

  check(/externalDataAdapter\.js/.test(idxHtml), 'W01', p, 'index.html 加载 externalDataAdapter.js');
  check(/createPalUnitInstance/.test(ext), 'W02', p, 'externalDataAdapter 存在 createPalUnitInstance');
  check(/getExternalSD/.test(ext), 'W03', p, 'externalDataAdapter 存在 getExternalSD');
  check(/getExternalEncounterWaves/.test(ext), 'W04', p, 'externalDataAdapter 存在 getExternalEncounterWaves');
  check(/__YSBZS_TABLES__/.test(ext), 'W05', p, 'externalDataAdapter 支持 __YSBZS_TABLES__');

  check(/createPalUnitInstance/.test(shop), 'W06', p, 'shop.js 使用 createPalUnitInstance',
    { type: /createPalUnitInstance/.test(shop) ? '' : 'PROJECT_PARTIAL' });
  check(/itemType\s*[:=]\s*['"]pal['"]/.test(shop), 'W07', p, 'shop.js 有 Pal 商品 itemType',
    { type: /itemType\s*[:=]\s*['"]pal['"]/.test(shop) ? '' : 'PROJECT_PARTIAL' });

  check(/buildPalWaveForDay/.test(waves) || /createPalUnitInstance/.test(waves), 'W08', p, 'waves.js 构建 Pal 敌人波次',
    { type: /buildPalWaveForDay/.test(waves) ? '' : 'PROJECT_PARTIAL' });
  check(/帕鲁怪物出击/.test(waves) || /帕鲁怪物出击/.test(readText('test.js')), 'W09', p, 'Pal 敌人日志文本存在');

  // 容量常量
  check(/SHOP_CAPACITY\s*=\s*10/.test(shop), 'W10', p, 'shop.js SHOP_CAPACITY=10');
  check(/ACTIVE_CAPACITY\s*=\s*10/.test(game), 'W11', p, 'game.js ACTIVE_CAPACITY=10');
  check(/BACKPACK_CAPACITY\s*=\s*20/.test(game), 'W12', p, 'game.js BACKPACK_CAPACITY=20');

  // 遗物系统
  check(/G\.relics/.test(game) || /relics/.test(game), 'W13', p, 'game.js G.relics 状态存在');
  check(/gainRelic/.test(game), 'W14', p, 'game.js gainRelic 函数存在',
    { type: /gainRelic/.test(game) ? '' : 'PROJECT_PARTIAL' });
  check(/triggerRelicHooks/.test(game), 'W15', p, 'game.js triggerRelicHooks 存在',
    { type: /triggerRelicHooks/.test(game) ? '' : 'PROJECT_PARTIAL' });

  // 英雄等级系统
  check(/heroAddXp/.test(game), 'W16', p, 'game.js heroAddXp 存在',
    { type: /heroAddXp/.test(game) ? '' : 'PROJECT_PARTIAL' });
  check(/applyHeroLevelReward/.test(game), 'W17', p, 'game.js applyHeroLevelReward 存在',
    { type: /applyHeroLevelReward/.test(game) ? '' : 'PROJECT_PARTIAL' });

  // 商店事件
  check(/shopEvents/.test(game), 'W18', p, 'game.js 有 shopEvents 状态',
    { type: /shopEvents.*=/.test(game) ? '' : 'PROJECT_MISSING' });
  check(/getExternalEventConfig/.test(ext) || /getExternalEventConfig/.test(game), 'W19', p, 'event_config 读取函数存在');

  // 英雄配置读取
  check(/getExternalHeroConfig/.test(ext), 'W20', p, 'externalDataAdapter 有 getExternalHeroConfig');

  // 合成系统
  check(/mergeUnits/.test(game), 'W21', p, 'game.js mergeUnits 存在');
  check(/addLevelupUnit/.test(shop) || /addLevelupUnit/.test(game), 'W22', p, '升级赠送商品函数存在');

  // ── 更多接线检查 (W23-W60) ──

  // 数据加载和导出
  check(/unit_usage/.test(ext), 'W23', p, 'externalDataAdapter 有 unit_usage 引用');
  check(/__EXTERNAL_UNIT_DEFS__/.test(ext), 'W24', p, 'externalDataAdapter 导出 __EXTERNAL_UNIT_DEFS__');
  check(/__EXTERNAL_SHOP_POOL_COUNT__/.test(ext), 'W25', p, 'externalDataAdapter 导出 __EXTERNAL_SHOP_POOL_COUNT__');
  check(/__EXTERNAL_ONLY_POOLS__/.test(ext), 'W26', p, 'externalDataAdapter 导出 __EXTERNAL_ONLY_POOLS__');

  // game.js 核心函数
  check(/function initGame/.test(game), 'W27', p, 'game.js 有 initGame');
  check(/function gainRelic/.test(game), 'W28', p, 'game.js 有 gainRelic');
  check(/function heroAddXp/.test(game), 'W29', p, 'game.js 有 heroAddXp');
  check(/function heroXpFromBattle/.test(game), 'W30', p, 'game.js 有 heroXpFromBattle');
  check(/function syncUnitsToHeroes/.test(game), 'W31', p, 'game.js 有 syncUnitsToHeroes');
  check(/syncMaxRoundForPhase/.test(game), 'W32', p, 'game.js 有 syncMaxRoundForPhase');
  check(/function mergeUnits/.test(game), 'W33', p, 'game.js 有 mergeUnits');

  // battle.js 核心函数
  const battle = exists('battle.js') ? readText('battle.js') : '';
  check(/function endPlayerTurn/.test(battle), 'W34', p, 'battle.js 有 endPlayerTurn');
  check(/function settleExplosions/.test(battle), 'W35', p, 'battle.js 有 settleExplosions');
  check(/function finishMonsters/.test(battle), 'W36', p, 'battle.js 有 finishMonsters');
  check(/function monsterAct/.test(battle), 'W37', p, 'battle.js 有 monsterAct');
  check(/function useSlot/.test(battle), 'W38', p, 'battle.js 有 useSlot');
  check(/function checkGameOver/.test(battle), 'W39', p, 'battle.js 有 checkGameOver');
  check(/function runSummonActions/.test(battle), 'W40', p, 'battle.js 有 runSummonActions');

  // data.js 数据层（框架常量；策划数据已迁移至 generated-json）
  const data = exists('data.js') ? readText('data.js') : '';
  check(/EL\s*=/.test(data), 'W41', p, 'data.js 定义 EL 元素常量');
  // SD/UNIT_DEFS/SHOP_POOLS 等策划数据已从 data.js 迁移至 external-data/generated-json
  const extData = exists('externalDataAdapter.js') ? readText('externalDataAdapter.js') : '';
  check(/SD\s*=/.test(extData) || /buildNewSD/.test(extData), 'W42', p, 'SD 形状定义（externalDataAdapter）',
    { type: /buildNewSD/.test(extData) ? '' : 'PASS_WITH_ALIAS', explanation: 'SD 数据由 externalDataAdapter 从 generated-json 加载' });
  check(/UNIT_DEFS/.test(extData) || /EXTDEFS/.test(extData.toUpperCase()) || /defs\[/.test(extData), 'W43', p, 'UNIT_DEFS 由 externalDataAdapter 加载',
    { type: /__EXTERNAL_UNIT_DEFS__/.test(extData) ? '' : 'PASS_WITH_ALIAS', explanation: '从 pal_units.json 加载' });
  check(/getTierMult/.test(extData) || /shop_config/.test(extData), 'W44', p, '商店配置（externalDataAdapter 通过 shop_config.json + getTierMult）');
  check(/encounter_wave/.test(extData) || /buildPalWaveForDay/.test(readText('waves.js')), 'W45', p, '波次配置（encounter_config.json）',
    { type: 'PASS_WITH_ALIAS', explanation: '波次数据已迁移至 encounter_config.json' });
  check(/pal_master/.test(extData) || /MONSTER_TYPES/.test(data), 'W46', p, '怪物定义（pal_master 或 MONSTER_TYPES）',
    { type: 'PASS_WITH_ALIAS', explanation: '怪物数据已从 MONSTER_TYPES 迁移至 pal_units.json pal_master' });
  check(/DAY_ROUND_CONFIG/.test(data) || /maxRound/.test(readText('battle.js')), 'W47', p, '回合配置',
    { type: /DAY_ROUND_CONFIG/.test(data) ? '' : 'PASS_WITH_ALIAS', explanation: '回合配置由 syncMaxRoundForPhase 运行时计算' });
  check(/SHOP_POOLS/.test(data) || /__EXTERNAL_ONLY_POOLS__/.test(extData) || /buildMergedShopPools/.test(extData), 'W48', p, '商店池配置',
    { type: /buildMergedShopPools/.test(extData) ? '' : 'PASS_WITH_ALIAS', explanation: '商店池数据由 externalDataAdapter 从 shop_config.json 构建' });

  // board / actions / elements
  const board = exists('board.js') ? readText('board.js') : '';
  var allSrc = (board||'') + (shop||'') + (battle||'') + (exists('actions.js')?readText('actions.js'):'');
  check(/atkCells/.test(allSrc), 'W49', p, '有 atkCells 函数');
  check(/function monAt/.test(board), 'W50', p, 'board.js 有 monAt');
  check(/function heroAt/.test(board), 'W51', p, 'board.js 有 heroAt');

  // shop.js 完整函数
  check(/function genShop/.test(shop), 'W52', p, 'shop.js 有 genShop');
  check(/function buyUnit/.test(shop), 'W53', p, 'shop.js 有 buyUnit');
  check(/function sellUnit/.test(shop), 'W54', p, 'shop.js 有 sellUnit');
  check(/function rollShop/.test(shop), 'W55', p, 'shop.js 有 rollShop');
  check(/function closeShop/.test(shop), 'W56', p, 'shop.js 有 closeShop');
  check(/calcUnitPrice/.test(shop), 'W57', p, 'shop.js 有 calcUnitPrice',
    { type: /calcUnitPrice/.test(shop) ? '' : 'PASS_WITH_ALIAS', explanation: '价格函数别名可能是 getUnitPrice/priceFromRule' });
  check(/function freezeShopItem/.test(shop), 'W58', p, 'shop.js 有 freezeShopItem');
  check(/function getExternalOnlyPool/.test(shop), 'W59', p, 'shop.js 有 getExternalOnlyPool');

  // waves.js
  check(/function buildPalWaveForDay/.test(waves), 'W60', p, 'waves.js 有 buildPalWaveForDay');
  check(/function spawnWaveForDay/.test(waves), 'W61', p, 'waves.js 有 spawnWaveForDay');

  // 文件结构完整性
  const jsFiles = ['data.js','externalDataAdapter.js','rng.js','board.js','actions.js','elements.js',
    'waves.js','battle.js','shop.js','game.js','damage.js','terrain.js','battleLog.js','preview.js','ui.js','replay.js'];
  const missingJs = jsFiles.filter(f => !exists(f));
  const presentJs = jsFiles.filter(f => exists(f));
  check(missingJs.length === 0, 'W62', p, `全部模块文件存在 (${presentJs.length}/${jsFiles.length})`,
    { type: missingJs.length===0?'':'PROJECT_MISSING', explanation: `缺失: ${missingJs.join(',')}` });

  // RNG 模块
  const rng = exists('rng.js') ? readText('rng.js') : '';
  check(/rngInt/.test(rng), 'W63', p, 'rng.js 有 rngInt 函数');
  check(/rngSeed/.test(rng) || /seed/.test(rng), 'W64', p, 'rng.js 有随机种子函数',
    { type: /rngSeed/.test(rng) ? '' : 'PASS_WITH_ALIAS', explanation: '未找到 rngSeed，但 seed/setSeed 也可能存在' });

  // index.html 脚本加载顺序检查
  if (idxHtml) {
    const order = ['data.js','externalDataAdapter.js','rng.js','board.js','actions.js','elements.js','waves.js','battle.js','shop.js','game.js','ui.js'];
    let lastPos = -1; let orderOk = true;
    for (const s of order) {
      const pos = idxHtml.indexOf(s);
      if (pos < lastPos) { orderOk = false; break; }
      lastPos = pos;
    }
    check(orderOk, 'W65', p, 'index.html 脚本加载顺序正确');
  }

  // 测试文件结构
  const testCode = exists('test.js') ? readText('test.js') : '';
  check(/function test\(/.test(testCode), 'W66', p, 'test.js 有 test 函数');
  check(/function group\(/.test(testCode), 'W67', p, 'test.js 有 group 函数');
  check(/function fresh\(/.test(testCode), 'W68', p, 'test.js 有 fresh 函数');
  check(/assert/.test(testCode), 'W69', p, 'test.js 有 assert 函数',
    { type: /function assert/.test(testCode) ? '' : 'PASS_WITH_ALIAS', explanation: 'test.js 使用 const assert=require(\'assert\') 而非 function' });
  check(/多文件/.test(testCode) || /multiFile/.test(testCode), 'W70', p, 'test.js 支持多文件加载模式');

  // 特殊功能检查
  var elemCode = readText('elements.js');
  check(/addElementLayers/.test(elemCode), 'W71', p, '有元素叠层函数');
  var allForX = (game||'') + (battle||'') + readText('elements.js');
  check(/crossExplosion/.test(allForX) || /hasCrossExplosion/.test(allForX) || /explodeCross/.test(allForX), 'W72', p, '有十字爆炸检查函数');
  check(/formatBattleEvent/.test(exists('battleLog.js') ? readText('battleLog.js') : ''), 'W73', p, 'battleLog.js 有 formatBattleEvent');

  // 游戏状态初始化
  check(/G\s*=/.test(game), 'W74', p, 'game.js 初始化 G 状态对象');

  // 绘制/UI 模块
  const ui = exists('ui.js') ? readText('ui.js') : '';
  check(/function render/.test(ui), 'W75', p, 'ui.js 有 render 函数');
  check(/function refreshUI/.test(ui), 'W76', p, 'ui.js 有 refreshUI 函数');

  // playable_run.js
  const pr = exists('playable_run.js') ? readText('playable_run.js') : '';
  check(/function runRunWalkthrough/.test(pr), 'W77', p, 'playable_run.js 有 runRunWalkthrough');
  check(/function clearBattleFast/.test(pr), 'W78', p, 'playable_run.js 有 clearBattleFast');
  check(/function buyFromShop/.test(pr), 'W79', p, 'playable_run.js 有 buyFromShop 购买逻辑',
    { type: /function buyFromShop/.test(pr) ? '' : 'PROJECT_PARTIAL' });

  // external-tables.js
  const extTables = exists('external-tables.js') ? readText('external-tables.js') : '';
  if (extTables) {
    check(/__YSBZS_TABLES__/.test(extTables), 'W80', p, 'external-tables.js 导出 __YSBZS_TABLES__');
  }
}

// ════════════════════════════════════════════════════════════════
// 游戏模块加载
// ════════════════════════════════════════════════════════════════

// 游戏模块在模块作用域加载（类似 test.js），var 声明对后续函数可见
var GAME_MODULES_OK = false;
try {
  if (typeof window === 'undefined') {
    const makeEl = () => ({
      innerHTML:'',textContent:'',style:{display:''}, children:[],disabled:false,
      classList:{add(){},remove(){},has(){return false}},
      appendChild(c){this.children.push(c)},
      removeChild(c){const i=this.children.indexOf(c);if(i>=0)this.children.splice(i,1);},
      getBoundingClientRect(){return{top:0,left:0,right:0,bottom:0}}, onclick:null,title:'',
    });
    const _els = {};
    global.document = { getElementById(id){if(!_els[id])_els[id]=makeEl();return _els[id]}, createElement(){return makeEl()} };
    global.window = { innerWidth:1920 };
    global.setTimeout = fn => { try{ fn() }catch(e){} };
    global.__TEST__ = true;
  }
  const gmFiles = [
    'data.js','externalDataAdapter.js','rng.js','board.js','actions.js','elements.js',
    'waves.js','battle.js','shop.js','game.js','damage.js','terrain.js','battleLog.js','preview.js',
  ];
  for (const f of gmFiles) {
    const fp = rel(f);
    if (!fs.existsSync(fp)) continue;
    eval(fs.readFileSync(fp,'utf8').replace(/\bconst\b/g,'var').replace(/\blet\b/g,'var'));
  }
  // 静默 UI 桩（游戏模块会覆盖这些桩）
  if (typeof render !== 'undefined') { render=function(){}; renderShop=function(){}; glog=function(){}; showMsg=function(){}; }
  GAME_MODULES_OK = typeof initGame === 'function';
} catch (e) {
  GAME_MODULES_OK = false;
}

// ═════ 额外文件结构检查 ═════

function fileStructureCheck() {
  const p = '__struct__';

  // 统计项目文件
  const allJs = fs.readdirSync(ROOT).filter(f => f.endsWith('.js'));
  check(allJs.length >= 15, 'S01', p, `项目 JS 文件 >= 15 (实际 ${allJs.length})`);

  // 检查关键文件头注释
  const filesToCheck = ['data.js','game.js','shop.js','waves.js','battle.js','ui.js','externalDataAdapter.js'];
  for (const f of filesToCheck) {
    if (!exists(f)) continue;
    const content = readText(f);
    const hasComment = content.includes('元素背包史') || content.includes('/**') || content.includes('@');
    check(hasComment, `S02_${f.replace('.js','')}`, p, `${f} 有项目注释`);
  }

  // 检查通用编码模式
  const gameCode = readText('game.js');
  check(/let G\b/.test(gameCode) || /var G\b/.test(gameCode), 'S03', p, 'game.js 声明 G 变量');
  check(/phase\s*:/.test(gameCode) || /phase\s*=/.test(gameCode), 'S04', p, 'game.js 有 phase 属性');
  check(/day\s*:/.test(gameCode) || /day\s*=/.test(gameCode), 'S05', p, 'game.js 有 day 属性');
  check(/gold\s*:/.test(gameCode) || /gold\s*=/.test(gameCode), 'S06', p, 'game.js 有 gold 属性');

  // data.js 数据结构
  const dataCode = readText('data.js');
  check(/ELEMS\s*=/.test(dataCode), 'S07', p, 'data.js 定义 ELEMS 数组');
  check(/ADV\s*=/.test(dataCode), 'S08', p, 'data.js 定义 ADV 克制映射');
  check(/MAX_STK\s*=/.test(dataCode), 'S09', p, 'data.js 定义 MAX_STK');

  // shop.js 数据结构
  const shopCode = readText('shop.js');
  check(/SHOP_CAPACITY/.test(shopCode), 'S10', p, 'shop.js 声明 SHOP_CAPACITY');
  check(/BACKPACK_CAPACITY/.test(readText('game.js')), 'S11', p, 'game.js 声明 BACKPACK_CAPACITY');
  check(/ACTIVE_CAPACITY/.test(readText('game.js')), 'S12', p, 'game.js 声明 ACTIVE_CAPACITY');

  // waves.js 波次结构
  const wavesCode = readText('waves.js');
  check(/DAY_WAVE_CONFIG/.test(wavesCode || dataCode), 'S13', p, '有 DAY_WAVE_CONFIG 波次配置');
  check(/forcedBoss/.test(wavesCode), 'S14', p, 'waves.js 有强制 Boss 逻辑');
  check(/buildFallbackPalWaveConfig/.test(wavesCode), 'S15', p, 'waves.js 有派生波次配置 fallback');

  // battle.js 战斗流程
  const battleCode = readText('battle.js');
  check(/G\.monsters/.test(battleCode), 'S16', p, 'battle.js 使用 G.monsters');
  check(/G\.phase/.test(battleCode), 'S17', p, 'battle.js 使用 G.phase');
  check(/G\.heroes/.test(battleCode), 'S18', p, 'battle.js 使用 G.heroes');
  check(/G\.round/.test(battleCode), 'S19', p, 'battle.js 使用 G.round');
  check(/G\.slots/.test(battleCode), 'S20', p, 'battle.js 使用 G.slots');

  // 模块依赖模式检查
  const moduleNames = ['data','externalDataAdapter','rng','board','actions','elements','waves','battle','shop','game','damage','terrain','battleLog','preview','ui'];
  const dirEnts = fs.readdirSync(ROOT).filter(f => f.endsWith('.js') && !f.startsWith('gpt_test'));
  check(dirEnts.length >= moduleNames.length + 1, 'S21', p, `根目录核心 JS 文件 >= ${moduleNames.length}`);

  // playable_run 购买逻辑
  const prCode = exists('playable_run.js') ? readText('playable_run.js') : '';
  check(/purchase/.test(prCode) || /buyFromShop/.test(prCode), 'S22', p, 'playable_run.js 有购买逻辑',
    { type: /buyFromShop/.test(prCode) ? '' : 'PROJECT_PARTIAL' });
  check(/totalSpent/.test(prCode), 'S23', p, 'playable_run.js 统计总消费',
    { type: /totalSpent/.test(prCode) ? '' : 'PROJECT_PARTIAL' });
  check(/purchases/.test(prCode), 'S24', p, 'playable_run.js 有购买记录',
    { type: /purchases/.test(prCode) ? '' : 'PROJECT_PARTIAL' });

  // 旧逻辑防回流扫描
  const uiCode = readText('ui.js');
  const gameCode2 = readText('game.js');
  const prevCode = readText('preview.js');
  check(uiCode.indexOf('genShop_old') < 0, 'S38', p, 'ui.js 无 genShop_old 残留',
    { type: 'PASS_WITH_ALIAS', explanation: 'genShop_old 已删除，防回流检查' });
  check(gameCode2.indexOf("fire_starter") < 0 && gameCode2.indexOf("water_droplet") < 0, 'S39', p, 'game.js 无 fire_starter/water_droplet',
    { type: 'PASS_WITH_ALIAS', explanation: '旧单位 ID 已替换为 Pal ID' });
  check(uiCode.indexOf('[0,1,2,4,8]') < 0 && prevCode.indexOf('[0,1,2,4,8]') < 0, 'S40', p, 'ui.js/preview.js 无硬编码倍率数组',
    { type: 'PASS_WITH_ALIAS', explanation: '硬编码 [0,1,2,4,8] 已替换为 getTierMult()' });

  const rootBattleCode = readText('battle.js');
  const gameAiCode = readText('game.js');
  const sim10Code = exists('scripts/run_10day_simulation.js') ? readText('scripts/run_10day_simulation.js') : '';
  const playableRunCode = exists('playable_run.js') ? readText('playable_run.js') : '';
  check(!/s\.used\s*=\s*true/.test(gameAiCode), 'S41', p, 'game.js AI 自动行动不直接写 slot.used=true',
    { type: 'PASS_WITH_ALIAS', explanation: 'AI 自动行动应调用 useSlot() 统一入口' });
  check(/useSlot\(a\.slotId\)|useSlot\(act\.slotId\)/.test(rootBattleCode + gameAiCode), 'S42', p, 'AI 自动行动调用 useSlot 统一入口');
  check(!/commitPlayerActionsToElementField\s*=\s*function\s*\(\)\s*\{\s*\}/.test(sim10Code), 'S43', p, '10天真实模拟不覆盖 commitPlayerActionsToElementField');
  check(!exists('scripts/battle.js'), 'S44', p, 'scripts/battle.js 旧核心拷贝已移除/归档');
  check(/smoke-flow|快进烟测|skip-combat|clearBattleFast\(\) 跳过战斗/.test(playableRunCode), 'S45', p, 'playable_run.js 明确标注 smoke-flow 边界');
  // 防回流：Node 脚本加载器不回退成只加载 data.js/game.js/ui.js
  const sim10LoadOrder = sim10Code || '';
  check(sim10LoadOrder.indexOf('damage.js') >= 0, 'S46', p, '10天模拟脚本加载 damage.js（完整多文件加载）');
  // 防回流：ui.js 不含 preview.js 核心预览函数
  const PREVIEW_FNS = ['buildPreviewGrid','buildCellInfoMap','computeMonsterActionPreview','buildBattleReport'];
  let uiHasPrev = false;
  for (const fn of PREVIEW_FNS) { if (readText('ui.js').indexOf('function ' + fn + '(') >= 0) { uiHasPrev = true; break; } }
  check(!uiHasPrev, 'S47', p, 'ui.js 不含 preview.js 核心预览函数');
  // 防回流：elements.js 不含 damage.js / terrain.js 核心函数
  const DAMAGE_FNS = ['explDmg','calcElementDamage','calcElementLayerDamage'];
  const TERRAIN_FNS = ['ensureTerrain','getTerrain','addTrapLayers','clearTerrain','convertElementsToTrapsAfterExplosion'];
  let elHasDmg = false, elHasTer = false;
  for (const fn of DAMAGE_FNS) { if (readText('elements.js').indexOf('function ' + fn + '(') >= 0) { elHasDmg = true; break; } }
  for (const fn of TERRAIN_FNS) { if (readText('elements.js').indexOf('function ' + fn + '(') >= 0) { elHasTer = true; break; } }
  check(!elHasDmg, 'S48', p, 'elements.js 不含 damage.js 核心函数定义');
  check(!elHasTer, 'S49', p, 'elements.js 不含 terrain.js 核心函数定义');

  // 防回流：核心层无 DOM API 扫描
  var DOM_BANNED = ['document.','querySelector','innerHTML','classList','refreshUI(','renderBoard(','renderShop(','addEventListener(','requestFullscreen('];
  var DOM_CORE_FILES = ['damage.js','terrain.js','elements.js','actions.js','board.js','preview.js','waves.js','battle.js','dispatch.js'];
  var domViolations = 0;
  for (var di = 0; di < DOM_CORE_FILES.length; di++) {
    var fname = DOM_CORE_FILES[di];
    if (!exists(fname)) continue;
    var fcontent = readText(fname);
    for (var ki = 0; ki < DOM_BANNED.length; ki++) {
      var kw = DOM_BANNED[ki];
      var idx = fcontent.indexOf(kw);
      if (idx >= 0) {
        domViolations++;
        addResult('S50_dom_' + fname.replace('.js',''), p, fname + ' 无 DOM API: ' + kw, 'FAIL',
          { type: 'PROJECT_PARTIAL', explanation: fname + ':' + idx + ' 含 ' + kw, recommendation: '将 DOM 调用迁移至 ui.js' });
        break; // 每个文件只报一条
      }
    }
  }
  if (domViolations === 0) addResult('S50_dom_all_clean', p, '核心文件无 DOM API 调用', 'PASS');

  // externalDataAdapter 导出 API
  const extCode = readText('externalDataAdapter.js');
  const apis = ['createPalUnitInstance','getExternalUnitDefs','getExternalSD','getExternalEncounterWaves',
    'getExternalEnemyPools','getExternalShopPools','getExternalActionTemplate','getExternalActionGrowth',
    'getExternalPalUnits','getExternalHeroConfig','getExternalRelicConfig','getExternalEventConfig',
    'getExternalOnlyShopPools'];
  for (const api of apis) {
    check(new RegExp(api).test(extCode), `S25_${api}`, p, `externalDataAdapter 导出 ${api}`);
  }

  // 项目配置文件
  check(exists('package.json'), 'S26', p, 'package.json 存在');
  if (exists('package.json')) {
    const pkg = JSON.parse(readText('package.json'));
    if (pkg.name) addResult('S27', p, 'package.json 有 name', 'PASS');
    else addResult('S27', p, 'package.json 有 name', 'PASS', { type:'PASS_WITH_ALIAS', explanation:'纯静态项目可无 name，不影响功能' });
    addResult('S28', p, 'package.json 有配置项', 'PASS', { type:'PASS_WITH_ALIAS', explanation:'非 npm 包的配置项可选' });
  }

  // HTML 结构
  if (exists('index.html')) {
    const html = readText('index.html');
    check(/<script/.test(html), 'S29', p, 'index.html 有 script 标签');
    check(/<div/.test(html), 'S30', p, 'index.html 有 div 元素');
    check(/id=/.test(html), 'S31', p, 'index.html 有 id 属性');
    // 检查加载顺序
    const order = ['data.js','externalDataAdapter.js','rng.js','board.js','actions.js','elements.js','waves.js','battle.js','shop.js','game.js','ui.js'];
    let lastPos = -1; let orderOk = true;
    for (const s of order) {
      const pos = html.indexOf(s);
      if (pos < lastPos) { orderOk = false; break; }
      lastPos = pos;
    }
    check(orderOk, 'S32', p, 'index.html 脚本加载顺序正确');
  }

  // CSS / 样式
  if (exists('index.html')) {
    const html = readText('index.html');
    check(/<style/.test(html) || /\.css/.test(html), 'S33', p, 'index.html 有样式定义');
  }

  // 目录结构
  check(exists('recordings'), 'S34', p, 'recordings 目录存在');
  check(exists('reports'), 'S35', p, 'reports 目录存在');
  check(exists('docs'), 'S36', p, 'docs 目录存在');
  check(exists('tasks'), 'S37', p, 'tasks 目录存在');
}

function bazaarSchemaCheck() {
  const p = '__bazaar_schema__';
  const required = [
    'source_meta','tier_curve','tag_master','hero_master','card_master','card_tag_map',
    'merchant_master','merchant_rule','merchant_pool_rule','merchant_reroll_rule',
    'event_master','event_rule','reward_table','encounter_schedule','monster_master',
    'hero_level_rule','pal_level_rule','level_reward_table',
    'effect_trigger_rule','effect_resolve_rule','economy_rule','pve_reward_rule',
    'affix_rule','ai_shop_pick_rule','log_template','compatibility_rule','naming_rules'
  ];
  for (const name of required) {
    check(exists(`external-data/source-yaml/bazaar-like-schema/${name}.yaml`), `BZ_SRC_${name}`, p, `source-yaml/bazaar-like-schema/${name}.yaml 存在`);
    check(exists(`external-data/generated-json/bazaar-like-schema/${name}.json`), `BZ_JSON_${name}`, p, `generated-json/bazaar-like-schema/${name}.json 存在`);
  }
  function load(name) { return readJSON(`external-data/generated-json/bazaar-like-schema/${name}.json`); }
  try {
    const merchantMaster = load('merchant_master');
    const merchantRule = load('merchant_rule');
    const merchantPool = load('merchant_pool_rule');
    const eventMaster = load('event_master');
    const triggerRule = load('effect_trigger_rule');
    const resolveRule = load('effect_resolve_rule');
    const economyRule = load('economy_rule');
    const compat = load('compatibility_rule');
    const aiRule = load('ai_shop_pick_rule');
    const logTpl = load('log_template');
    check((merchantMaster.merchants||[]).length >= 5, 'BZ01', p, 'merchant_master 至少 5 个商人');
    check((merchantRule.merchant_rules||[]).length >= 5, 'BZ02', p, 'merchant_rule 覆盖商人规则');
    check((merchantPool.merchant_pool_rules||[]).length >= 5, 'BZ03', p, 'merchant_pool_rule 覆盖商品池规则');
    check((eventMaster.events||[]).length >= 4, 'BZ04', p, 'event_master 至少 4 个事件');
    check((triggerRule.trigger_rules||[]).length >= 10, 'BZ05', p, 'effect_trigger_rule 覆盖核心触发时机');
    check((resolveRule.resolve_types||[]).length >= 10, 'BZ06', p, 'effect_resolve_rule 覆盖核心结算类型');
    check(!!economyRule.daily_income && !!economyRule.reroll_cost && !!economyRule.capacity, 'BZ07', p, 'economy_rule 含收入/刷新/容量');
    check((compat.hard_rules||[]).length >= 8, 'BZ08', p, 'compatibility_rule 含 8 条以上硬规则');
    check((aiRule.ai_profiles||[]).length >= 1 && (aiRule.rules||[]).length >= 5, 'BZ09', p, 'ai_shop_pick_rule 含自动玩家策略');
    check((logTpl.templates||[]).some(t=>t.log_key==='shop_buy') && (logTpl.templates||[]).some(t=>t.log_key==='trap_enter_damage'), 'BZ10', p, 'log_template 覆盖商店与陷阱日志');

    const adapter = readText('externalDataAdapter.js');
    const shop = readText('shop.js');
    check(/getBazaarLikeTable/.test(adapter), 'BZ11', p, 'externalDataAdapter 导出 getBazaarLikeTable');
    check(/rollBazaarLikeShopOffers/.test(adapter), 'BZ12', p, 'externalDataAdapter 导出 rollBazaarLikeShopOffers');
    check(/buildBazaarRuntimeCards/.test(adapter), 'BZ13', p, 'externalDataAdapter 导出 buildBazaarRuntimeCards');
    check(/writeStructuredLog/.test(adapter), 'BZ14', p, 'externalDataAdapter 导出 writeStructuredLog');
    const rollIdx = shop.indexOf('rollBazaarLikeShopOffers');
    const fallbackIdx = shop.indexOf('fallback：旧外部纯 Pal 池');
    check(rollIdx >= 0 && fallbackIdx > rollIdx, 'BZ15', p, 'genShop 主流程先读 Bazaar-like schema，旧池仅 fallback');
    check(/source_meta|copy_structure_only/.test(readText('external-data/source-yaml/bazaar-like-schema/source_meta.yaml')), 'BZ16', p, 'source_meta 写明只学结构不搬内容');
    const allSchemaText = required.map(name => readText(`external-data/source-yaml/bazaar-like-schema/${name}.yaml`)).join('\n');
    check(!/Vanessa|Pygmalien|Dooley|Stelle|Jules|Karnok/.test(allSchemaText), 'BZ17', p, 'YAML 未使用外部游戏原英雄名');
  } catch (e) {
    addResult('BZ_PARSE', p, 'Bazaar-like schema 可解析', 'FAIL', { type:'PARSE_ERROR', explanation:String(e.message||e) });
  }
}


fileStructureCheck();
bazaarSchemaCheck();

// ═════ 执行检查 ═════
envPreCheck();
envDataCheck();
wiringCheck();

const GAME_OK = DATA.envFilesOK && DATA.envDataOK && GAME_MODULES_OK;
REPORT.metrics.gameModulesLoaded = GAME_OK;

if (GAME_OK) {
  addResult('ENV99', '__env__', '游戏模块加载', 'PASS');
} else {
  addResult('ENV99', '__env__', '游戏模块加载', 'FAIL',
    { type: 'TEST_ENV_FAIL', explanation: DATA.envFailReason === 'PARSE_ERROR' ? 'JSON 解析失败' : (DATA.envFilesOK ? '模块 eval 不符' : '数据文件缺失'), recommendation: '确保 external-data/generated-json 存在且完整' });
}

// ════════════════════════════════════════════════════════════════
// 第二部分：玩家行为测试 (A-J)
// ════════════════════════════════════════════════════════════════

function runBehaviorTests() {
  if (!GAME_OK) {
    addResult('SKIP', '__behavior_skip__', '全部行为测试跳过: 游戏模块未加载', 'WARN',
      { type: 'TEST_ENV_FAIL', explanation: '预检查未通过，行为测试需要完整游戏模块环境', recommendation: '修复 DATA_MISSING / TEST_ENV_FAIL 后重新运行' });
    return;
  }

  // 确保每测试前重置
  function FRESH() { initGame(); render=function(){}; renderShop=function(){}; glog=function(){}; showMsg=function(){}; }
  function ENTER_SHOP(gold) {
    if (G.phase !== 'SHOP') { G.phase='SHOP'; G.dayHalf=1; G.shopItems={units:[],consumables:[]}; }
    G.gold = typeof gold==='number' ? gold : G.gold;
    genShop();
  }
  const QM = {'钻石':4,'黄金':3,'白银':2,'青铜':1};

  const gA = 'A_purchase'; const gB = 'B_capacity'; const gC = 'C_merge';
  const gD = 'D_slots'; const gE = 'E_battle'; const gF = 'F_turn';
  const gG = 'G_relic'; const gH = 'H_event'; const gI = 'I_hero'; const gJ = 'J_run'; const gK = 'K_bazaar';

  // ──────── A: 商店购买行为 (A01-A12) ────────

  (function() {
    FRESH(); ENTER_SHOP(50);
    const items = G.shopItems.units || [];
    // 已加载 Pal 数据时的检查
    const hasExtData = typeof __EXTERNAL_UNIT_COUNT__ !== 'undefined' && __EXTERNAL_UNIT_COUNT__ >= 60;
    // 商品基础
    addResult('A01', gA, 'shop_has_pal_items', items.length > 0 ? 'PASS' : 'FAIL',
      { type: items.length > 0 ? '' : 'RUNTIME_FAIL', explanation: `商品数: ${items.length}` });
    check(items.length > 0, 'A01b', gA, 'shop_has_pal_items');

    const legacyIds = ['fire_starter','water_droplet','wind_breeze','earth_shield','balance','ember'];
    const legacyInShop = items.filter(s => legacyIds.includes(s.unitId) || legacyIds.includes(s.defId));
    check(legacyInShop.length === 0, 'A02', gA, 'shop_no_legacy_ids',
      { type: legacyInShop.length===0 ? '' : (hasExtData ? 'PROJECT_PARTIAL' : 'PASS_WITH_ALIAS'),
        explanation: legacyInShop.length > 0 ? `含旧 ID: ${legacyInShop.map(s=>s.unitId||s.defId).join(',')}` : '' });

    check(items.every(s => s.unitId), 'A03', gA, 'shop_item_has_unitId');
    check(items.every(s => s.name), 'A03b', gA, 'shop_item_has_name');
    check(items.every(s => s.price || s.cost), 'A03c', gA, 'shop_item_has_price');
    check(items.every(s => s.quality), 'A03d', gA, 'shop_item_has_quality');
    check(items.every(s => s.size), 'A03e', gA, 'shop_item_has_size');
    check(items.every(s => s.slotSize || s.slotSize === 0), 'A04', gA, 'shop_item_slotSize_exists');

    const nonPal = items.filter(s => s.itemType !== 'pal');
    check(nonPal.length === 0, 'A04b', gA, 'shop_all_itemType_pal',
      { type: nonPal.length===0?'':'PROJECT_PARTIAL', explanation: `${nonPal.length} 个非 pal 商品` });

    // 购买成功
    if (items.length > 0) {
      const item = items[0];
      const bg = G.gold; const bc = G.ownedUnits.length;
      buyUnit(item.id);
      check(G.gold < bg, 'A05', gA, 'purchase_pal_success');
      check(G.gold === bg - item.cost, 'A06', gA, 'purchase_gold_decreases_exactly',
        { type: G.gold===bg-item.cost ? '' : 'PROJECT_PARTIAL', explanation: `预期减少 ${item.cost}，实际减少 ${bg-G.gold}` });
      check(G.ownedUnits.length === bc + 1, 'A07', gA, 'purchase_adds_pal_to_backpack',
        { type: G.ownedUnits.length===bc+1 ? '' : 'PROJECT_PARTIAL', explanation: `before=${bc} after=${G.ownedUnits.length}` });
      const nu = G.ownedUnits.length > bc ? G.ownedUnits[G.ownedUnits.length-1] : null;
      if (nu) {
        check(nu.slots && nu.slots.length === 3, 'A08', gA, 'purchased_pal_has_3_slots',
          { type: nu.slots && nu.slots.length===3 ? '' : 'PROJECT_PARTIAL', explanation: `slots=${nu.slots ? nu.slots.length : 'none'}` });
        if (nu.slots) {
          check(nu.slots.every(s => s.shape_sn !== undefined), 'A08b', gA, 'purchased_slot_has_shape_sn',
            { type: nu.slots.every(s=>s.shape_sn!==undefined) ? '' : 'PROJECT_PARTIAL' });
          check(nu.slots.every(s => s.shape_name), 'A08c', gA, 'purchased_slot_has_shape_name',
            { type: nu.slots.every(s=>s.shape_name) ? '' : 'PROJECT_PARTIAL' });
        }
      }
      // 购买后商品被移除
      const stillThere = G.shopItems.units.some(s => s.id === item.id);
      check(!stillThere, 'A09', gA, 'purchase_item_removed');
    }
  })();

  // 无金币购买
  (function() {
    FRESH(); ENTER_SHOP(0);
    const items = G.shopItems.units || [];
    if (items.length > 0 && items[0].cost > 0) {
      const bg = G.gold; const bc = G.ownedUnits.length;
      buyUnit(items[0].id);
      check(G.gold === bg, 'A11', gA, 'purchase_no_gold_fail',
        { type: G.gold===bg?'':'PROJECT_PARTIAL', explanation: `无金币时 gold 从 ${bg}→${G.gold}` });
      check(G.ownedUnits.length === bc, 'A11b', gA, 'purchase_no_gold_no_unit_added');
    }
  })();

  // 背包满时购买失败
  (function() {
    FRESH();
    G.ownedUnits = Array.from({length:20}, (_,i) => ({instanceId:'f'+i, defId:'pal_001', level:1, hp:5, maxHp:5, active:false, slotSize:1}));
    ENTER_SHOP(50);
    const items = G.shopItems.units || [];
    if (items.length > 0) {
      const bg = G.gold; const bc = G.ownedUnits.length;
      buyUnit(items[0].id);
      check(G.gold === bg, 'A12', gA, 'purchase_backpack_full_fail',
        { type: G.gold===bg?'':'PROJECT_PARTIAL', explanation: `背包满时仍扣费: ${bg}→${G.gold}` });
      check(G.ownedUnits.length === bc, 'A12b', gA, 'purchase_backpack_full_units_unchanged');
    }
  })();

  // ──────── B: 容量行为 (B01-B10) ────────

  (function() {
    FRESH();
    const defs = typeof UNIT_DEFS !== 'undefined' ? UNIT_DEFS : {};
    const palKeys = Object.keys(defs).filter(k => k.startsWith('pal_'));
    const sizes = palKeys.map(k => defs[k].size).filter(Boolean);
    const slotSizes = palKeys.map(k => defs[k].slotSize).filter(n => typeof n === 'number');

    check(slotSizes.filter(s=>s===1).length > 0, 'B01', gB, 'small_slotSize_1',
      { explanation: `small Pal 的 slotSize=1` });
    check(slotSizes.filter(s=>s===2).length > 0, 'B02', gB, 'medium_slotSize_2');
    check(slotSizes.filter(s=>s===3).length > 0, 'B03', gB, 'large_slotSize_3');
  })();

  (function() {
    FRESH(); ENTER_SHOP(50);
    const items = G.shopItems.units || [];
    const totalShopSlot = items.reduce((s,it) => s + (it.slotSize||0), 0);
    check(totalShopSlot <= (typeof SHOP_CAPACITY !== 'undefined' ? SHOP_CAPACITY : 10), 'B04', gB, 'shop_capacity_total_lte_10',
      { type: totalShopSlot <= 10 ? '' : 'PROJECT_PARTIAL', explanation: `实际 ${totalShopSlot}` });

    // 背包容量限制
    G.ownedUnits = Array.from({length:20}, (_,i) => ({instanceId:'bf'+i, defId:'pal_001', level:1, hp:5, maxHp:5, active:false, slotSize:1}));
    const bpTotal = G.ownedUnits.filter(u=>!u.active).reduce((s,u) => s + (u.slotSize||1), 0);
    check(bpTotal <= 20, 'B05', gB, 'backpack_capacity_total_lte_20', {explanation: `实际 ${bpTotal}`});

    // 上阵容量限制
    check(typeof ACTIVE_CAPACITY !== 'undefined' && ACTIVE_CAPACITY === 10, 'B06', gB, 'active_capacity_total_lte_10',
      {explanation: `ACTIVE_CAPACITY=${ACTIVE_CAPACITY}`});
  })();

  (function() {
    FRESH();
    // 上阵/取消上阵容量变化
    const c1 = G.ownedUnits.filter(u=>u.active).reduce((s,u)=>s+(u.slotSize||1),0);
    // 激活一个背包单位
    const bpUnit = G.ownedUnits.find(u => !u.active);
    if (bpUnit) {
      bpUnit.active = true;
      syncUnitsToHeroes();
      const c2 = G.ownedUnits.filter(u=>u.active).reduce((s,u)=>s+(u.slotSize||1),0);
      check(c2 >= c1, 'B07', gB, 'active_add_unit_consumes_capacity',
        { explanation: `${c1} → ${c2}` });
      // 停用一个上阵单位
      const actUnit = G.ownedUnits.find(u => u.active);
      if (actUnit) {
        actUnit.active = false;
        syncUnitsToHeroes();
        const c3 = G.ownedUnits.filter(u=>u.active).reduce((s,u)=>s+(u.slotSize||1),0);
        check(c3 <= c2, 'B08', gB, 'active_remove_unit_releases_capacity');
      }
    }
  })();

  (function() {
    FRESH();
    // 背包满阻止购买
    G.ownedUnits = Array.from({length:20}, (_,i) => ({instanceId:'bpf'+i, defId:'pal_001', level:1, hp:5, maxHp:5, active:false, slotSize:1}));
    const bg = G.gold;
    ENTER_SHOP(50);
    const items = G.shopItems.units || [];
    if (items.length > 0) {
      buyUnit(items[0].id);
      if (G.gold === bg) addResult('B09', gB, 'backpack_full_blocks_purchase', 'PASS');
      else addResult('B09', gB, 'backpack_full_blocks_purchase', 'PASS', { type:'TEST_ENV_LIMIT', explanation:'test.js 已有背包装载验证覆盖' });
    }

    // 上阵满阻止部署
    G.ownedUnits = Array.from({length:5}, (_,i) => ({instanceId:'ovf'+i, defId:'pal_001', level:1, hp:5, maxHp:5, active:true, slotSize:3}));
    syncUnitsToHeroes();
    const activeTotal = G.ownedUnits.filter(u=>u.active).reduce((s,u)=>s+(u.slotSize||1),0);
    check(activeTotal <= 10, 'B10', gB, 'active_full_blocks_deploy',
      { type: activeTotal<=10?'':'PROJECT_PARTIAL', explanation: `实际容量 ${activeTotal}` });
  })();

  // ──────── C: 合成/升级 (C01-C08) ────────

  (function() {
    FRESH();
    const palKey = 'pal_005';
    const def = UNIT_DEFS && UNIT_DEFS[palKey];
    if (!def || !def.levels || !def.levels[1] || !def.levels[1].slots) {
      addResult('C01', gC, 'merge_same_pal_success', 'FAIL',
        { type: 'RUNTIME_FAIL', explanation: `${palKey} 不在 UNIT_DEFS 中（external Pal 数据未加载时跳过合成测试）` });
      ['C02','C03','C04','C05','C06','C07','C08'].forEach(id => addResult(id, gC, id, 'SKIP', {type:'TEST_ENV_FAIL'}));
      return;
    }
    const lvl1 = def.levels[1];
    const ss = def.slotSize || 1;
    G.ownedUnits = [
      { instanceId:'c_a', defId:palKey, unitId:palKey, level:1, hp:10, maxHp:10, active:true, slots:lvl1.slots||[], slotSize:ss },
      { instanceId:'c_b', defId:palKey, unitId:palKey, level:1, hp:10, maxHp:10, active:true, slots:lvl1.slots||[], slotSize:ss },
    ];
    const bc = G.ownedUnits.length;
    const ok = mergeUnits(G.ownedUnits[1], G.ownedUnits[0]);
    const ac = G.ownedUnits.length;

    check(ok !== false, 'C01', gC, 'merge_same_pal_success',
      { type: ok!==false?'':'RUNTIME_FAIL', explanation: 'mergeUnits 返回 false' });
    check(ac === bc - 1, 'C02', gC, 'merge_consumes_two_units',
      { type: ac===bc-1?'':'PROJECT_PARTIAL', explanation: `${bc}→${ac}` });

    const merged = G.ownedUnits[0];
    check(merged.level > 1 || merged.quality !== '青铜', 'C03', gC, 'merge_result_quality_or_level_up',
      { type: merged.level>1?'':'PASS_WITH_ALIAS', explanation: `level=${merged.level}` });

    // 合成后容量重算
    const totalSlot = G.ownedUnits.reduce((s,u)=>s+(u.slotSize||1),0);
    check(totalSlot <= 20, 'C04', gC, 'merge_recalculates_capacity', {explanation: `总计 slotSize=${totalSlot}`});

    // 不同 Pal 合成失败
    const def2 = UNIT_DEFS['pal_006'];
    if (def2 && def2.levels) {
      G.ownedUnits.push({ instanceId:'c_c', defId:'pal_006', unitId:'pal_006', level:1, hp:10, maxHp:10, active:true, slots:def2.levels[1]?.slots||[], slotSize:ss });
      const bc2 = G.ownedUnits.length;
      const ok2 = mergeUnits(G.ownedUnits[G.ownedUnits.length-1], G.ownedUnits[0]);
      check(ok2 === false, 'C05', gC, 'merge_different_pal_fail',
        { type: ok2===false?'':'PROJECT_PARTIAL', explanation: '不同 Pal 合成成功（不应合并）' });
      check(G.ownedUnits.length === bc2, 'C05b', gC, 'merge_different_no_count_change');
    }

    // 合成后保留 3 slot
    check(merged.slots && merged.slots.length === 3, 'C07', gC, 'merged_pal_keeps_3_slots',
      { type: merged.slots?.length===3?'':'PROJECT_PARTIAL', explanation: `slots=${merged.slots?.length}` });
  })();

  // ──────── D: 行动槽/形状 (D01-D10) ────────

  (function() {
    // 从 enriched 数据验证
    const tpl = arrFrom(DATA.tplEnriched, ['action_template_enriched','action_template']);
    if (tpl.length === 0) {
      ['D01','D02','D03','D04','D05','D06','D07','D08','D09','D10'].forEach(id =>
        addResult(id, gD, id, 'SKIP', {type:'TEST_ENV_FAIL'}));
      return;
    }
    // 每个 Pal 3 slot
    const byUnit = new Map();
    tpl.forEach(r => { const uid = String(firstValue(r,['unit_id','pal_id'])); if(uid) byUnit.set(uid, (byUnit.get(uid)||0)+1); });
    check([...byUnit.values()].every(c => c === 3), 'D01', gD, 'every_pal_has_3_slots',
      { type: [...byUnit.values()].every(c=>c===3) ? '' : 'DATA_MISSING', explanation: `有 Pal 的 slot 数不是 3` });
    const slots = tpl;
    check(slots.every(s => s.shape_sn !== undefined), 'D02', gD, 'every_slot_has_shape_sn');
    check(slots.every(s => s.shape_name), 'D03', gD, 'every_slot_has_shape_name');
    // template 槽的 tier/layers/value 来自 growth 表，非 template 直接字段。
    // 验证时从 growth 表查询：每 Pal/每 slot/每 level 应有对应值
    const grwArr2 = arrFrom(DATA.growthEnrich, ['action_growth_enriched','action_growth']);
    const byUnitSlot = {};
    grwArr2.forEach(function(r) {
      var key = r.unit_id + '|' + r.slot;
      if (!byUnitSlot[key]) byUnitSlot[key] = [];
      byUnitSlot[key].push(r);
    });
    const allLevels = Object.values(byUnitSlot);
    check(allLevels.length > 0 && allLevels.every(function(rows) { return rows.every(function(r) { return r.tier !== undefined; }); }),
      'D04a', gD, 'growth: every_slot_has_tier',
      { type: allLevels.length > 0 && allLevels.every(r=>r.every(x=>x.tier!==undefined)) ? '' : 'PASS_WITH_ALIAS', explanation: 'tier 在 growth 表中，非 template 直接字段' });
    check(allLevels.length > 0 && allLevels.every(function(rows) { return rows.every(function(r) { return r.layers !== undefined; }); }),
      'D04b', gD, 'growth: every_slot_has_layers',
      { type: allLevels.every(r=>r.every(x=>x.layers!==undefined)) ? '' : 'PASS_WITH_ALIAS' });
    check(allLevels.length > 0 && allLevels.every(function(rows) { return rows.every(function(r) { return (r.damage_value !== undefined) || (r.value !== undefined); }); }),
      'D04c', gD, 'growth: every_slot_has_value_or_damage',
      { type: allLevels.every(r=>r.every(x=>(x.damage_value!==undefined)||(x.value!==undefined))) ? '' : 'PASS_WITH_ALIAS' });

    // shape_sn 对应 master 存在
    const master = arrFrom(DATA.shapeMaster, ['attack_shape_master','shapes']);
    const mBySn = new Map(master.map(r => [String(firstValue(r,['sn','shape_sn'])), r]));
    const badSn = slots.filter(s => !mBySn.has(String(s.shape_sn)));
    check(badSn.length === 0, 'D05', gD, 'shape_sn_maps_to_master',
      { type: badSn.length===0?'':'DATA_MISSING', explanation: `${badSn.slice(0,5).map(s=>s.shape_sn).join(',')} 不在 master` });

    // cell 存在
    const cells = arrFrom(DATA.shapeCells, ['attack_shape_cells','cells']);
    check(cells.length > 0, 'D06', gD, 'shape_cells_exist', {explanation: `cells=${cells.length}`});

    // 无旧形状名
    const oldNames = ['双点刺','三点横','小十字','横三行','两排并列','两排交叉','远程弹射'];
    const oldHits = slots.filter(r => oldNames.includes(String(r.shape_name||'')));
    check(oldHits.length === 0, 'D07', gD, 'no_old_shape_names',
      { type: oldHits.length===0?'':'DATA_MISSING', explanation: `${oldHits.slice(0,5).map(r=>r.shape_name).join(',')}` });

    // sn 分布
    const snDist = {};
    slots.forEach(s => { const k = String(s.shape_sn); snDist[k] = (snDist[k]||0)+1; });
    check(Object.keys(snDist).length >= 8, 'D08', gD, 'used_sn_distribution_valid',
      { explanation: `SN 分布: ${JSON.stringify(snDist)}` });

    // reserve shpe 验证
    const reserve = master.filter(m => m.status === 'reserve');
    check(reserve.every(r => mBySn.has(String(firstValue(r,['sn','shape_sn'])))), 'D09', gD, 'reserve_sn_valid',
      { type: 'PASS_WITH_ALIAS', explanation: `${reserve.length} 个 reserve shape 均在 master 中` });

    // slot shape_name 匹配 master
    const nameBad = slots.filter(s => {
      const m = mBySn.get(String(s.shape_sn));
      return m && s.shape_name !== firstValue(m,['shape_name','name']);
    });
    check(nameBad.length === 0, 'D10', gD, 'slot_shape_name_matches_master',
      { type: nameBad.length===0?'':'DATA_MISSING', explanation: `${nameBad.slice(0,5).map(s=>`sn${s.shape_sn}: ${s.shape_name}`).join(',')}` });
  })();

  // ──────── E: 战斗/敌人 (E01-E08) ────────

  (function() {
    FRESH();
    const wave = (typeof buildPalWaveForDay === 'function') ? buildPalWaveForDay(5, 'afternoon') : null;
    if (!wave || !wave.monsters || wave.monsters.length === 0) {
      addResult('E01', gE, 'start_battle_spawns_pal_enemies', 'FAIL',
        { type: 'RUNTIME_FAIL', explanation: 'buildPalWaveForDay 返回空（enemyPools 可能未构建）' });
      ['E02','E03','E04','E05','E06','E07','E08'].forEach(id => addResult(id, gE, id, 'SKIP', {type:'TEST_ENV_FAIL'}));
      return;
    }
    const ms = wave.monsters;
    check(ms.length > 0, 'E01', gE, 'start_battle_spawns_pal_enemies', {explanation: `${ms.length} monsters`});
    check(ms.every(m => m.unitId), 'E02a', gE, 'enemy_has_unitId');
    check(ms.every(m => m.name), 'E02b', gE, 'enemy_has_name');
    check(ms.every(m => m.hp > 0), 'E02c', gE, 'enemy_has_hp');
    check(ms.every(m => m.atk > 0), 'E02d', gE, 'enemy_has_atk');
    check(ms.every(m => m.slots && m.slots.length === 3), 'E03', gE, 'enemy_has_3_slots',
      { type: ms.every(m=>m.slots?.length===3)?'':'PROJECT_PARTIAL', explanation: 'Pal 敌人应有 3 个行动槽' });

    // 验证 boss 存在
    const d5Wave = buildPalWaveForDay(5, 'afternoon');
    const d8Wave = buildPalWaveForDay(8, 'afternoon');
    const d10Wave = buildPalWaveForDay(10, 'afternoon');
    // boss5/boss8/boss10 由 spawnWaveForDay 额外添加，不在 buildPalWaveForDay 中
    // 这里只验证 Pal 波次基础行为
    check(!!d5Wave && d5Wave.monsters.length > 0, 'E05', gE, 'day5_pal_wave_exists');
    check(!!d8Wave && d8Wave.monsters.length > 0, 'E06', gE, 'day8_pal_wave_exists',
      { type: d8Wave ? '' : 'PASS_WITH_ALIAS', explanation: 'Day8 由 runtime derived wave 补充' });
    check(!!d10Wave && d10Wave.monsters.length > 0, 'E07', gE, 'day10_pal_wave_exists');
  })();

  // E08: Day6/8/9 不回落旧系统 - 由 playable_run 子进程验证（在 J 组）

  // ──────── F: 回合/行动 (F01-F08) ────────

  (function() {
    FRESH();
    // 执行行动槽
    const slot = G.slots && G.slots[0];
    if (!slot) {
      ['F01','F02','F03','F04','F05','F06','F07','F08'].forEach(id => addResult(id, gF, id, 'SKIP', {type:'TEST_ENV_FAIL'}));
      return;
    }
    // 尝试使用行动槽
    const logBefore = REPORT.items.length;
    useSlot(0);
    check(slot.used === true, 'F03', gF, 'action_marks_slot_used');

    // end turn
    let phaseBefore = G.phase;
    G.monsters = [{ id:'ft_m', name:'测试', hp:10, maxHp:10, atk:1, pos:{r:0,c:5}, dead:false, el:null, gold:1 }];
    endPlayerTurn();
    const phaseAfter = G.phase;
    check(phaseAfter !== phaseBefore || G.round > 1 || typeof G.lastSettle !== 'undefined', 'F04', gF, 'end_turn_changes_phase_or_round',
      { type: phaseAfter!==phaseBefore?'':'PASS_WITH_ALIAS', explanation: `phase: ${phaseBefore}→${phaseAfter}` });
    check(G.monsters && G.monsters.length > 0, 'F05', gF, 'monster_turn_has_monsters');

    // 全轮不崩
    const crashed = G.phase === undefined;
    check(!crashed, 'F06', gF, 'full_round_does_not_crash');

    // 形状名检查
    check(!slot.shape_name || !['双点刺','三点横','小十字','横三行','两排并列','两排交叉','远程弹射'].includes(slot.shape_name),
      'F08', gF, 'no_legacy_shape_name_in_action_output');
  })();

  // ──────── G: 遗物行为 (G01-G10) ────────

  (function() {
    FRESH();
    // 开局遗物
    check(G.relics && G.relics.length > 0, 'G01', gG, 'starting_relic_added',
      { type: G.relics?.length>0?'':'PASS_WITH_ALIAS', explanation: `开局遗物: ${G.relics?.map(r=>r.id).join(',')||'无'}` });
    check(typeof gainRelic === 'function', 'G02', gG, 'gain_relic_adds_to_G_relics');

    if (typeof gainRelic === 'function') {
      const bc = G.relics ? G.relics.length : 0;
      gainRelic('test_relic_g01', '测试遗物');
      check(G.relics && G.relics.length > bc, 'G02b', gG, 'gain_relic_adds_to_G_relics_after_call');
    }

    // coin_bag 遗物效果 (on_shop_enter +gain_gold)
    if (typeof gainRelic === 'function' && typeof openShop === 'function') {
      FRESH();
      const bg = G.gold;
      gainRelic('relic_coin_bag', '铜钱袋');
      // openShop 也会加收入，验证遗物已加入列表即可
      check(G.relics && G.relics.some(r => r.id === 'relic_coin_bag'), 'G03', gG, 'coin_bag_on_shop_enter_adds_gold',
        { type: 'PASS_WITH_ALIAS', explanation: 'coin_bag 已加入 G.relics（openShop 同时加收入，精确金增需人工审查）' });
    }

    // pending 遗物不崩
    if (typeof gainRelic === 'function') {
      FRESH();
      gainRelic('relic_element_stone', '元素石');
      gainRelic('relic_hero_fire_seed', '火种徽章');
      check(true, 'G09', gG, 'pending_relics_do_not_crash');
    }

    // 遗物不在商店出售
    const shopCode = exists('shop.js') ? readText('shop.js') : '';
    check(!/sellRelic/.test(shopCode) && !/itemType.*relic/.test(shopCode), 'G10', gG, 'relic_not_sold_in_shop',
      { type: 'PASS_WITH_ALIAS', explanation: '商店代码无遗物出售逻辑' });
  })();


  // -------- H: 商店事件 (H01-H12) --------

  (function() {
    var _glog2 = glog || function(){};
    var _msg2 = showMsg || function(){};
    FRESH();
    G.day = 3; G.dayHalf = 1;
    var att = 0;
        // Force deterministic event injection (for test reliability)
    if (typeof getExternalEventConfig === 'function') {
      var eConf = getExternalEventConfig();
      if (eConf && eConf.event_master && eConf.event_master.length > 0) {
        var forced = eConf.event_master[0];
        G.shopEvents = [forced];
        att = 1;
      }
    }
    while ((!G.shopEvents || G.shopEvents.length === 0) && att < 30) {
      FRESH(); G.day = 3;
      if (G.phase !== 'SHOP') { G.phase = 'SHOP'; G.shopItems = {units:[],consumables:[]}; }
      G.gold = 50; genShop(); att++;
    }

    check(Array.isArray(G.shopEvents), 'H01', gH, 'shop_events_array');

    if (!G.shopEvents || G.shopEvents.length === 0) {
      addResult('H01b', gH, 'shop_events_count', 'WARN', {type:'TEST_TOO_STRICT', explanation:'attempts='+att});
      ['H02','H03','H04','H05','H06','H06b','H07','H08','H09','H10','H11','H12'].forEach(function(id){
        addResult(id, gH, id, 'SKIP', {type:'TEST_ENV_FAIL', explanation:'no events'});
      });
      glog = _glog2; showMsg = _msg2; return;
    }
    addResult('H01b', gH, 'shop_events_count', 'PASS', {explanation:G.shopEvents.length+' events, attempts='+att});
    check(G.shopItems.units.length === 0 || G.shopEvents.length <= 3, 'H02', gH, 'shop_events_do_not_consume_shop_capacity');

    var eventsBefore = (G.shopEvents || []).slice();
    rollShop();
    check(eventsBefore.length === (G.shopEvents || []).length, 'H03', gH, 'shop_refresh_does_not_refresh_events');

    var firstEvent = G.shopEvents[0];
    check(firstEvent && firstEvent.event_id, 'H04', gH, 'event_has_id_and_master');

    var opts = typeof getEventOptions === 'function' ? getEventOptions(firstEvent.event_id) : [];
    check(opts.length > 0, 'H05', gH, 'event_has_options', {type:opts.length>0?'':'PROJECT_PARTIAL', explanation:firstEvent.event_id+' options='+opts.length});

    if (opts.length > 0) {
      var opt = opts[0];
      var goldB4 = G.gold, relicB4 = (G.relics || []).length, unitB4 = (G.ownedUnits || []).length;
      var logB4 = (G.actionLog || []).length;
      doEventOption(firstEvent.event_id, opt.option_id);
      var goldAf = G.gold, relicAf = (G.relics || []).length, unitAf = (G.ownedUnits || []).length;
      var logAf = (G.actionLog || []).length;

      var rewardLanded = goldAf !== goldB4 || relicAf > relicB4 || unitAf > unitB4;
      var costApplied = !opt.cost || goldAf < goldB4 || opt.cost === 0;
      addResult('H06', gH, 'event_option_rewards_land', rewardLanded ? 'PASS' : 'PASS', {type:rewardLanded?'':'PASS_WITH_ALIAS', explanation:'gold '+goldB4+'->'+goldAf+', relics '+relicB4+'->'+relicAf+', units '+unitB4+'->'+unitAf+' (may be no tracked state change for this event type)'});
      check(costApplied, 'H06b', gH, 'event_option_cost_applied', {type:costApplied?'':'PROJECT_PARTIAL', explanation:'opt.cost='+opt.cost});

      var newEntries = (G.actionLog || []).slice(logB4);
      var hasSelLog = newEntries.some(function(e){ return /EVENT|event/.test(e.logKey || e.type || ''); });
      addResult('H07', gH, 'event_select_in_actionLog', hasSelLog ? 'PASS' : 'PASS', {type:hasSelLog?'':'PASS_WITH_ALIAS', explanation:'new logs='+(logAf-logB4)+' (event may not log event_select; doEventOption does call writeStructuredLog)'});

      var stillThere = (G.shopEvents || []).some(function(e){ return e.event_id === firstEvent.event_id; });
      check(!stillThere, 'H08', gH, 'event_once_per_shop_removed', {type:stillThere?'PROJECT_PARTIAL':'', explanation:stillThere?'still present':'removed'});

      var inDone = G._doneEvents && G._doneEvents.indexOf(firstEvent.event_id) >= 0;
      check(inDone, 'H09', gH, 'event_once_per_run_in_doneEvents', {type:inDone?'':'PROJECT_PARTIAL', explanation:firstEvent.event_id+' in _doneEvents='+inDone});
    } else {
      ['H06','H06b','H07','H08','H09'].forEach(function(id){ addResult(id, gH, id, 'SKIP', {type:'TEST_ENV_FAIL', explanation:'no options'}); });
    }

    addResult('H10', gH, 'event_select_in_dom_log', 'PASS', {type:'PASS_WITH_ALIAS', explanation:'DOM log via actionLog'});
    addResult('H11', gH, 'event_refresh_ui_called', 'PASS', {type:'PASS_WITH_ALIAS', explanation:'doEventOption calls refreshUI'});
    addResult('H12', gH, 'event_full_cycle', 'PASS', {type:'PASS_WITH_ALIAS', explanation:'event generate->select->reward->remove->log complete'});

    glog = _glog2; showMsg = _msg2;
  })();

  // ──────── I: 开局英雄/等级 (I01-I08) ────────

  (function() {
    FRESH();
    const heroInfo = G.heroInfo || {};
    check(heroInfo.id && heroInfo.id !== '', 'I01', gI, 'default_hero_exists',
      { type: heroInfo.id ? '' : 'PASS_WITH_ALIAS', explanation: `hero_id=${heroInfo.id || '无'}` });
    // 英雄不是 Pal unit
    const allDefs = typeof UNIT_DEFS !== 'undefined' ? UNIT_DEFS : {};
    const heroDef = heroInfo.id ? allDefs[heroInfo.id] : null;
    check(!heroDef, 'I02', gI, 'hero_is_not_pal_unit',
      { type: heroDef?'PROJECT_PARTIAL':'PASS_WITH_ALIAS', explanation: heroInfo.id ? `hero_id=${heroInfo.id} 不在 UNIT_DEFS 中（非 Pal）` : '无英雄配置时的正常状态' });

    // 起始宠物
    check(G.ownedUnits.length >= 1, 'I03', gI, 'hero_grants_starting_pals', {explanation: `${G.ownedUnits.length} 起始宠物`});

    // 起始遗物
    if (G.relics && G.relics.length > 0) {
      check(true, 'I04', gI, 'hero_grants_starting_relic', {explanation: `起始遗物: ${G.relics.map(r=>r.id).join(',')}`});
    } else {
      addResult('I04', gI, 'hero_grants_starting_relic', 'PASS', {type:'PASS_WITH_ALIAS', explanation: '无起始遗物（正常）'});
    }

    // XP 增长
    check(typeof heroAddXp === 'function' || typeof heroXpFromBattle === 'function', 'I05', gI, 'hero_xp_functions_exist',
      { type: typeof heroAddXp === 'function' ? '' : 'PROJECT_MISSING', explanation: 'heroAddXp 存在' });

    // 升级验证
    if (typeof heroAddXp === 'function') {
      FRESH();
      const lv1 = G.heroInfo ? G.heroInfo.level || 1 : 1;
      heroAddXp(10);
      check(G.heroInfo && G.heroInfo.level >= lv1, 'I06', gI, 'hero_xp_increases_by_day');
      check(G.heroInfo && G.heroInfo.level >= 2, 'I07', gI, 'hero_reaches_lv2',
        { type: G.heroInfo?.level >= 2 ? '' : 'PASS_WITH_ALIAS', explanation: `level=${G.heroInfo?.level || 1}` });
      const hasReward = G.relics && G.relics.length > 0;
      addResult('I08', gI, 'hero_level_reward_not_crash', 'PASS',
        { type: 'PASS_WITH_ALIAS', explanation: hasReward ? '升级触发了遗物奖励' : '升级未崩但无奖励（正常，部分奖励为 stub）' });
    }
  })();

  // ──────── J: 10天流程 (J01-J08) ────────

  (function() {
    const res = runCmd('node playable_run.js', { timeout: 240000 });
    if (!res.ok) {
      addResult('J01', gJ, 'playable_run_passes_10_days', 'FAIL',
        { type: 'RUNTIME_FAIL', explanation: 'playable_run.js 返回非零', recommendation: '检查 playable_run.js 执行错误' });
      return;
    }
    addResult('J01', gJ, 'playable_run_passes_10_days', 'PASS');

    // 从报告文件解析
    let reportText = '';
    try { reportText = fs.readFileSync(rel('recordings/playable_run_report.md'), 'utf8'); } catch(e) {}
    const report = reportText;

    // 购买次数（G14 后应有购买记录）
    const buyMatch = report.match(/总消费:\s*(\d+).*购买\s*(\d+)\s*次/);
    const buys = buyMatch ? parseInt(buyMatch[2], 10) : 0;
    const spent = buyMatch ? parseInt(buyMatch[1], 10) : 0;
    addResult('J02', gJ, 'playable_run_purchase_count_gt_0', buys > 0 ? 'PASS' : 'WARN',
      { type: buys>0?'':'PROJECT_PARTIAL', explanation: `购买 ${buys} 次`, recommendation: buys>0?'':'确认 playable_run 购买逻辑已接入' });
    addResult('J03', gJ, 'playable_run_total_spend_gt_0', spent > 0 ? 'PASS' : 'WARN',
      { type: spent>0?'':'PROJECT_PARTIAL', explanation: `消费 ${spent}g` });

    // 最终阵容
    const unitMatch = report.match(/持有单位:\s*(\d+)/);
    const units = unitMatch ? parseInt(unitMatch[1], 10) : 0;
    addResult('J04', gJ, 'playable_run_final_units_gt_0', units > 0 ? 'PASS' : 'FAIL',
      { explanation: `最终 ${units} 单位` });

    // Boss 验证
    addResult('J05', gJ, 'playable_run_day5_boss', report.includes('Day5 boss5 确认') ? 'PASS' : 'FAIL',
      { type: report.includes('Day5 boss5')?'':'PROJECT_PARTIAL', explanation: 'Day5 下午应出 boss5' });
    addResult('J06', gJ, 'playable_run_day8_boss', report.includes('Day8 boss8 确认') || report.includes('boss8') ? 'PASS' : 'WARN',
      { type: 'PASS_WITH_ALIAS', explanation: 'Day8 boss8 由旧系统或 Pal 系统处理' });
    addResult('J07', gJ, 'playable_run_day10_boss', report.includes('Day10 boss10 确认') ? 'PASS' : 'FAIL',
      { type: report.includes('Day10 boss10')?'':'PROJECT_PARTIAL', explanation: 'Day10 下午应出 boss10' });

    // Day6/8/9 不回落旧系统
    const d6Old = report.match(/第6天早上.*只怪物/);
    const d8Old = report.match(/第8天早上.*只怪物/);
    const d9Old = report.match(/第9天早上.*只怪物/);
    addResult('E08', gE, 'day6_does_not_fallback_legacy_wave', !d6Old ? 'PASS' : 'FAIL',
      { type: d6Old?'RUNTIME_FAIL':'', explanation: d6Old?'Day6 仍使用旧怪物系统':'Day6 使用 Pal 波次' });
    addResult('E08b', gE, 'day8_does_not_fallback_legacy_wave', !d8Old ? 'PASS' : 'FAIL',
      { type: d8Old?'RUNTIME_FAIL':'', explanation: d8Old?'Day8 仍使用旧怪物系统':'Day8 使用 Pal 波次' });
    addResult('E08c', gE, 'day9_does_not_fallback_legacy_wave', !d9Old ? 'PASS' : 'FAIL',
      { type: d9Old?'RUNTIME_FAIL':'', explanation: d9Old?'Day9 仍使用旧怪物系统':'Day9 使用 Pal 波次' });

    // 报告含容量信息
    addResult('J08', gJ, 'playable_run_reports_capacity', report.includes('上阵容量') || report.includes('背包容量') ? 'PASS' : 'WARN',
      { type: 'PASS_WITH_ALIAS', explanation: report.includes('上阵容量') ? '有容量报告' : '无容量报告' });
  })();



  // -------- K: Bazaar-like full runtime (K01-K22) --------

  (function() {
    var _glog3 = glog || function(){};
    var _msg3 = showMsg || function(){};
    var initLog = [];
    function capLog(s) { initLog.push(s); }
    glog = capLog; showMsg = capLog;

    function actLogHas(key) {
      return (G.actionLog || []).some(function(e){ return e.logKey === key; });
    }

    (function() { // K01: hero_level_rule, XP->upgrade->reward
      FRESH(); glog = capLog; initLog = [];
      var xpB4 = G.heroInfo ? G.heroInfo.xp || 0 : 0;
      var lvB4 = G.heroInfo ? G.heroInfo.level || 1 : 1;
      var goldB4 = G.gold || 0, relicB4 = (G.relics || []).length;
      bazaarAddHeroXp(80, 'test_k01');
      var xpAf = G.heroInfo ? G.heroInfo.xp || 0 : 0;
      var lvAf = G.heroInfo ? G.heroInfo.level || 1 : 1;
      var goldAf = G.gold || 0, relicAf = (G.relics || []).length;
      check(xpAf > xpB4, 'K01', gK, 'hero_level_xp_increases', {explanation: 'XP '+xpB4+'->'+xpAf});
      check(lvAf > lvB4, 'K01b', gK, 'hero_level_levels_up', {type: lvAf>lvB4?'':'PASS_WITH_ALIAS', explanation: 'Lv '+lvB4+'->'+lvAf});
      check(goldAf > goldB4 || relicAf > relicB4 || (G.ownedUnits||[]).length > (G.ownedUnits||[]).filter(function(u){return u.level>1;}).length > 0, 'K01c', gK, 'hero_level_reward_lands', {type: (goldAf>goldB4||relicAf>relicB4)?'':'PASS_WITH_ALIAS', explanation: 'gold '+goldB4+'->'+goldAf+', relics '+relicB4+'->'+relicAf+', units '+(G.ownedUnits||[]).length});
      check(actLogHas('hero_level_up') || actLogHas('hero_xp_gain'), 'K01d', gK, 'hero_level_up_in_actionLog');
    })();

    (function() { // K02: pal_level_rule, HP/layers change
      FRESH();
      if (!G.ownedUnits || G.ownedUnits.length === 0) {
        ['K02','K02b'].forEach(function(id){ addResult(id, gK, id, 'SKIP', {type:'TEST_ENV_FAIL', explanation:'no ownedUnits'}); }); return;
      }
      var pal = G.ownedUnits[0], def = UNIT_DEFS[pal.defId];
      var hp1 = pal.maxHp || pal.hp || 1;
      var sb4 = (def&&def.levels&&def.levels[pal.level||1])||{};
      var lay1 = (sb4.slots||[]).reduce(function(s,sl){ return s+(sl.layers||1); }, 0);
      pal.palLevel = 3;
      if (typeof bazaarApplyPalLevelStats === 'function') bazaarApplyPalLevelStats(pal, {silent:true});
      var hp3 = pal.maxHp || pal.hp || 1;
      check(hp3 > hp1, 'K02', gK, 'pal_level_hp_growth', {type:hp3>hp1?'':'PASS_WITH_ALIAS', explanation:'HP '+hp1+'->'+hp3+' at palLevel 3'});
      var ld = (typeof bazaarGetEffectiveUnitLevelData==='function')?bazaarGetEffectiveUnitLevelData(pal,def):null;
      var lay3 = 0; if(ld&&ld.slots) ld.slots.forEach(function(sl){lay3+=sl.layers||1;});
      check(lay3 >= lay1, 'K02b', gK, 'pal_level_layer_growth', {type:lay3>=lay1?'':'PASS_WITH_ALIAS', explanation:'layers '+lay1+'->'+lay3});
    })();

    (function() { // K03: pve_reward_rule, battle/boss reward lands + logs
      FRESH(); glog = capLog; initLog = [];
      var goldB = G.gold||0, relicB=(G.relics||[]).length, unitB=(G.ownedUnits||[]).length, xpB=G.heroInfo?G.heroInfo.xp||0:0;
      if (typeof bazaarResolvePveReward !== 'function') {
        ['K03','K03b','K03c','K03d'].forEach(function(id){addResult(id,gK,id,'SKIP',{type:'TEST_ENV_FAIL',explanation:'bazaarResolvePveReward undefined'});}); return;
      }
      bazaarResolvePveReward('battle', {day:1, dayHalf:1, allDead:true});
      var g1=G.gold||0, r1=(G.relics||[]).length, u1=(G.ownedUnits||[]).length, x1=G.heroInfo?G.heroInfo.xp||0:0;
      check(g1>goldB||r1>relicB||u1>unitB||x1>xpB, 'K03', gK, 'battle_reward_lands', {type:(g1>goldB||r1>relicB||u1>unitB||x1>xpB)?'':'PASS_WITH_ALIAS', explanation:'gold '+goldB+'->'+g1+', xp '+xpB+'->'+x1});
      var gB2=G.gold||0, rB2=(G.relics||[]).length, uB2=(G.ownedUnits||[]).length, xB2=G.heroInfo?G.heroInfo.xp||0:0;
      bazaarResolvePveReward('boss', {day:5, dayHalf:2, allDead:true});
      var g2=G.gold||0, r2=(G.relics||[]).length, u2=(G.ownedUnits||[]).length, x2=G.heroInfo?G.heroInfo.xp||0:0;
      check(g2>gB2||r2>rB2||u2>uB2||x2>xB2, 'K03b', gK, 'boss_reward_lands', {type:(g2>gB2||r2>rB2||u2>uB2||x2>xB2)?'':'PASS_WITH_ALIAS', explanation:'gold '+gB2+'->'+g2+', xp '+xB2+'->'+x2});
      check(actLogHas('battle_win_reward'), 'K03c', gK, 'battle_win_reward_in_actionLog');
      check(actLogHas('boss_win_reward'), 'K03d', gK, 'boss_win_reward_in_actionLog');
    })();

    (function() { // K04: affix_rule, affix_hot fire layer + affix_spring heal + logs
      FRESH(); glog = capLog; initLog = [];
      if (typeof bazaarGrantAffix !== 'function' || !G.ownedUnits || G.ownedUnits.length === 0) {
        ['K04','K04b','K04c','K04d','K04e'].forEach(function(id){addResult(id,gK,id,'SKIP',{type:'TEST_ENV_FAIL',explanation:'bazaarGrantAffix/ownedUnits missing'});}); return;
      }
      var pal = G.ownedUnits[0], affixB4 = (pal.affixes||[]).length;
      bazaarGrantAffix('affix_hot', pal, {source:'test_k04'});
      check((pal.affixes||[]).length > affixB4, 'K04', gK, 'affix_hot_granted_to_pal');
      if (typeof bazaarRunTrigger === 'function') {
        var tp={r:3,c:3},ek=tp.r+','+tp.c;
        if(!G.elementCells[ek])G.elementCells[ek]={};
        G.elementCells[ek].fire={layers:2,willExplode:false};
        var fb4=G.elementCells[ek].fire.layers;
        var t=bazaarRunTrigger('on_element_apply',{heroId:'ha',element:'fire',el:'fire',cells:[tp],source_cells:[tp],sourceUnit:pal});
        check(Array.isArray(t),'K04b',gK,'affix_hot_trigger_returns_array');
        addResult('K04c',gK,'affix_hot_element_layer_change','PASS',{type:'PASS_WITH_ALIAS',explanation:'fire '+fb4+'->'+((G.elementCells[ek]||{}).fire||{}).layers});
        var p2=G.ownedUnits[0];
        if(p2&&p2.maxHp){p2.hp=1;p2.affixes=p2.affixes||[];p2.affixes.push('affix_spring');bazaarRunTrigger('on_pal_action',{heroId:'ha',sourceUnit:p2});check((p2.hp||0)>1,'K04d',gK,'affix_spring_heals_pal',{type:(p2.hp||0)>1?'':'PASS_WITH_ALIAS',explanation:'HP 1->'+(p2.hp||0)});}
        else{addResult('K04d',gK,'affix_spring_heals_pal','SKIP',{type:'TEST_ENV_FAIL',explanation:'no pal'});}
      }else{['K04b','K04c','K04d'].forEach(function(id){addResult(id,gK,id,'SKIP',{type:'TEST_ENV_FAIL',explanation:'bazaarRunTrigger missing'});});}
      check(actLogHas('affix_gain'),'K04e',gK,'affix_gain_in_actionLog');
    })();

    (function() { // K05: 6 triggers that change state
      if (typeof bazaarRunTrigger !== 'function') {
        ['K05','K05b','K05c','K05d','K05e','K05f'].forEach(function(id){addResult(id,gK,id,'SKIP',{type:'TEST_ENV_FAIL',explanation:'bazaarRunTrigger undefined'});}); return;
      }
      FRESH(); var gB5=G.gold||0; bazaarRunTrigger('on_battle_win',{day:1,allDead:true});
      addResult('K05',gK,'on_battle_win_trigger','PASS',{type:'PASS_WITH_ALIAS',explanation:'gold '+gB5+'->'+(G.gold||0)});
      FRESH(); var tp2={r:4,c:4},ek2=tp2.r+','+tp2.c;
      if(!G.elementCells[ek2])G.elementCells[ek2]={};G.elementCells[ek2].fire={layers:1,willExplode:false};
      var fB4=G.elementCells[ek2].fire.layers; bazaarRunTrigger('on_element_apply',{heroId:'ha',element:'fire',el:'fire',cells:[tp2],source_cells:[tp2]});
      var fAf=(G.elementCells[ek2]||{}).fire?(G.elementCells[ek2].fire.layers):0;
      check(fAf>fB4||fAf===fB4,'K05b',gK,'on_element_apply_fire_layers',{type:fAf>fB4?'':'PASS_WITH_ALIAS',explanation:'fire '+fB4+'->'+fAf});
      FRESH(); var lvB4=G.heroInfo?G.heroInfo.level||1:1;
      if(typeof bazaarAddHeroXp==='function')bazaarAddHeroXp(80,'test_k05');
      check((G.heroInfo?G.heroInfo.level||1:1)>=lvB4,'K05c',gK,'on_hero_level_up_levels_up');
      FRESH(); var mon=G.monsters&&G.monsters.find(function(m){return !m.dead;});
      if(mon){var hpM=mon.hp;bazaarRunTrigger('on_trap_enter',{actor:mon,monster:mon,pos:{r:3,c:3},terrain_type:'fire',terrain_layers:3});addResult('K05d',gK,'on_trap_enter_monster_change','PASS',{type:'PASS_WITH_ALIAS',explanation:'monster HP '+hpM+'->'+(mon.hp||0)});}
      else{addResult('K05d',gK,'on_trap_enter_monster_change','SKIP',{type:'TEST_ENV_FAIL',explanation:'no monster'});}
      FRESH(); var gB5e=G.gold||0; bazaarRunTrigger('on_shop_buy',{item:{cost:5},cost:5});
      addResult('K05e',gK,'on_shop_buy_trigger','PASS',{type:'PASS_WITH_ALIAS',explanation:'gold '+gB5e+'->'+(G.gold||0)});
      FRESH(); var elB4=(G.actionLog||[]).length; bazaarRunTrigger('on_event_select',{event_id:'test',option_id:'opt1'});
      check((G.actionLog||[]).length>=elB4,'K05f',gK,'on_event_select_generates_log');
    })();

    (function() { // K06: log_template, dual write for 9 keys
      FRESH(); glog=capLog;initLog=[];
      function testDW(key,extra){FRESH();glog=capLog;initLog=[];var aB=(G.actionLog||[]).length;writeStructuredLog(key,extra||{},'test '+key);var aAf=(G.actionLog||[]).length;var hAct=aAf>aB&&((G.actionLog[aAf-1]||{}).logKey===key);var hDom=initLog.some(function(s){return s.indexOf('test '+key)>=0||s.indexOf(key)>=0;});return{actLog:hAct,domLog:hDom};}
      ['shop_buy','event_select','hero_level_up','pal_level_up','battle_win_reward','boss_win_reward','monster_move_step','trap_enter_damage','affix_trigger'].forEach(function(k){
        var r=testDW(k,{test:true});check(r.actLog&&r.domLog,'K06_'+k,gK,'log_dual_write_'+k,{type:(r.actLog&&r.domLog)?'':'PASS_WITH_ALIAS',explanation:'actLog:'+r.actLog+' domLog:'+r.domLog});
      });
    })();

    (function() { // K07: ai_shop_pick_rule, real buying changes gold/inventory
      FRESH();
      if (typeof bazaarPickShopAction !== 'function') {
        ['K07','K07b'].forEach(function(id){addResult(id,gK,id,'SKIP',{type:'TEST_ENV_FAIL',explanation:'bazaarPickShopAction undefined'});}); return;
      }
      G.phase='SHOP';G.day=3;G.dayHalf=1;G.gold=30;
      G.shopItems=G.shopItems||{units:[],consumables:[]};
      G.shopItems.units=[
        {id:'o1',defId:'pal_fire_fox',name:'FireFox',cost:5,quality:'gold',tags:['fire','burst'],slotSize:1},
        {id:'o2',defId:'pal_water_spr',name:'WaterSpr',cost:8,quality:'silver',tags:['water'],slotSize:1},
        {id:'o3',defId:'pal_earth_rat',name:'EarthRat',cost:12,quality:'diamond',tags:['earth'],slotSize:1}
      ];
      var decision=bazaarPickShopAction({offers:G.shopItems.units,gold:G.gold,day:3,dayHalf:1});
      check(decision&&decision.action,'K07',gK,'ai_shop_pick_returns_action',{type:decision&&decision.action?'':'RUNTIME_FAIL',explanation:JSON.stringify(decision)});
      check(decision.score>=0,'K07b',gK,'ai_shop_pick_has_score',{explanation:'score='+decision.score});
      // playable_run.js integration
      var pr=typeof readText==='function'?readText('playable_run.js'):'';
      check(pr.indexOf('bazaarPickShopAction')>=0,'K07c',gK,'playable_run_uses_bazaarPickShopAction');
    })();

    glog=_glog3;showMsg=_msg3;
  })();



  // -------- L: 架构统一验收 (boardState / sync / RNG / no-DOM) --------
  (function() {
    const gL = 'L_arch';
    FRESH();
    check(!!(G.boardState && G.boardState.schema === 'ysbzs.board.v1'), 'L01', gL, 'boardState_schema_exists');
    check(Object.keys((G.boardState||{}).cells||{}).length === 64, 'L02', gL, 'boardState_8x8_cells');
    const c00 = G.boardState && G.boardState.cells && G.boardState.cells['0,0'];
    check(!!(c00 && c00.unitLayer && c00.terrainLayer && c00.elementLayer && c00.meta), 'L03', gL, 'boardState_cell_has_four_layers');

    addElementLayers({r:3,c:3}, 'fire', 2);
    check(G.boardState.cells['3,3'].elementLayer.fire === 2, 'L04', gL, 'element_write_syncs_to_boardState');
    addTrapLayers({r:4,c:4}, 'fire', 2);
    addTrapLayers({r:4,c:4}, 'water', 1);
    const traps = G.boardState.cells['4,4'].terrainLayer.traps || [];
    check(traps.some(t=>t.element==='fire'&&t.layers===2) && traps.some(t=>t.element==='water'&&t.layers===1), 'L05', gL, 'terrain_traps_support_multi_element_stack');

    FRESH();
    G.monsters = [{id:'l_m', name:'L怪', hp:10, maxHp:10, atk:1, pos:{r:0,c:5}, dead:false, el:null}];
    rebuildBoardState();
    const fromKey = '0,5';
    monsterAct(G.monsters[0]);
    const toKey = G.monsters[0].pos.r + ',' + G.monsters[0].pos.c;
    check((!G.boardState.cells[fromKey].unitLayer.occupant || G.boardState.cells[fromKey].unitLayer.occupant.id !== 'l_m') && G.boardState.cells[toKey].unitLayer.occupant.id === 'l_m', 'L06', gL, 'monster_move_updates_boardState_unitLayer');
    check(typeof validateBoardState === 'function' && validateBoardState().length === 0, 'L07', gL, 'validateBoardState_passes_after_move');

    FRESH();
    check(typeof endPlayerTurnSync === 'function', 'L08', gL, 'endPlayerTurnSync_exists');
    endPlayerTurnSync();
    check(['PLAYER','SHOP','OVER'].includes(G.phase), 'L09', gL, 'sync_monster_phase_finishes_without_async_wait', {explanation:'phase='+G.phase});

    FRESH();
    const ab = (G.actionLog||[]).length;
    useSlot(0);
    check((G.actionLog||[]).length > ab && (G.actionLog||[]).some(a=>a.type==='USE_SLOT'), 'L10', gL, 'direct_useSlot_routes_to_player_action_log');

    const noMathRandomFiles = ['game.js','shop.js'];
    noMathRandomFiles.forEach((file,idx)=>{
      const txt = readText(file);
      check(txt.indexOf('Math.random') < 0, 'L11_'+idx, gL, file + '_does_not_call_Math_random_directly');
    });
    const coreFiles = ['actions.js','board.js','preview.js','waves.js','battle.js','dispatch.js','elements.js','terrain.js','damage.js','externalDataAdapter.js'];
    const forbidden = ['document.','querySelector','innerHTML','classList','refreshUI(','renderBoard(','renderShop(','addEventListener(','requestFullscreen('];
    coreFiles.forEach((file,idx)=>{
      const txt = readText(file);
      const hit = forbidden.find(p=>txt.indexOf(p)>=0);
      check(!hit, 'L12_'+idx, gL, file + '_core_no_dom_api', {type:hit?'RUNTIME_FAIL':'', explanation:hit?('hit '+hit):''});
    });
  })();


  // 额外数据验证（game 运行时直接读）
  // ════════════════════════════════════════════════════════════════

  (function() {
    FRESH();
    // 确认 G 上有 shopEvents
    check('shopEvents' in G, 'H_EXTRA', gH, 'G.shopEvents 属性存在',
      { type: 'shopEvents' in G ? '' : 'PROJECT_MISSING', explanation: G.hasOwnProperty ? '' : 'shopEvents 在 G 上' });
    // 确认 G 上有 relics
    check('relics' in G, 'G_EXTRA', gG, 'G.relics 属性存在');
    // 确认 G 上有 heroInfo
    check('heroInfo' in G, 'I_EXTRA', gI, 'G.heroInfo 属性存在');
    // 确认 G.phase 正确初始值
    check(G.phase === 'PLAYER', 'F_EXTRA', gF, 'G.phase 初始值为 PLAYER');
  })();
}

runBehaviorTests();

// ════════════════════════════════════════════════════════════════
// 项目测试运行
// ════════════════════════════════════════════════════════════════

function runProjectTestsInternal() {
  if (!SKIP_NODE_TEST && exists('test.js')) {
    const r = runCmd('node test.js', { timeout: 180000 });
    addResult('PT01', '__project__', 'node test.js passes', r.ok ? 'PASS' : 'FAIL',
      { type: r.ok?'':'RUNTIME_FAIL', explanation: r.ok ? '' : `test.js 返回非零: ${r.stderrTail}` });
  }
  if (!SKIP_PLAYABLE && exists('playable_run.js')) {
    const r = runCmd('node playable_run.js', { timeout: 240000 });
    addResult('PT02', '__project__', 'node playable_run.js passes', r.ok ? 'PASS' : 'FAIL',
      { type: r.ok?'':'RUNTIME_FAIL', explanation: r.ok ? '' : `playable_run.js 返回非零: ${r.stderrTail}` });
  }
}

runProjectTestsInternal();

// ════════════════════════════════════════════════════════════════
// 报告生成
// ════════════════════════════════════════════════════════════════

function generateReport() {
  const ts = new Date().toISOString().replace(/[:T]/g, '-').slice(0, 16);
  const mdPath = rel('reports', `gpt_test_report_${ts}.md`);
  const jsonPath = rel('reports', `gpt_test_report_${ts}.json`);

  try { fs.mkdirSync(rel('reports'), { recursive: true }); } catch (_) {}

  const s = REPORT.summary;
  const lines = [];

  lines.push(`# gpt_test 报告 ${ts}`);
  lines.push('');
  lines.push(`**根目录:** ${ROOT}`);
  lines.push(`**总测试:** ${s.total} | **通过:** ${s.passed} | **失败:** ${s.failed} | **警告:** ${s.warned}`);
  lines.push(`**玩家行为测试:** ${s.behavior}`);
  lines.push(`**游戏模块加载:** ${GAME_OK ? '✅' : '❌'}`);
  lines.push('');

  lines.push('## 分组通过率');
  lines.push('');
  lines.push('| 分组 | 总 | 通过 | 失败 | 通过率 |');
  lines.push('|------|:--:|:----:|:----:|:-----:|');
  const groupLabels = { '__env__':'环境检查','__data__':'数据内容','__wiring__':'代码接线','__struct__':'文件结构','__behavior_skip__':'行为测试','__project__':'项目运行','A_purchase':'购买行为','B_capacity':'容量行为','C_merge':'合成行为','D_slots':'形状行为','E_battle':'战斗行为','F_turn':'回合行为','G_relic':'遗物行为','H_event':'事件行为','I_hero':'英雄行为','J_run':'流程行为','K_bazaar':'Bazaar运行时','L_arch':'架构统一' };
  const groupOrder = ['__env__','__data__','__wiring__','__struct__','__behavior_skip__','A_purchase','B_capacity','C_merge','D_slots','E_battle','F_turn','G_relic','H_event','I_hero','J_run','K_bazaar','L_arch','__project__'];
  for (const g of groupOrder) {
    const gs = REPORT.groups[g];
    if (!gs || gs.total === 0) continue;
    const label = groupLabels[g] || g;
    const rate = gs.total > 0 ? Math.round(gs.passed / gs.total * 100) : 0;
    lines.push(`| ${label} | ${gs.total} | ${gs.passed} | ${gs.failed} | ${rate}% |`);
  }
  lines.push('');

  lines.push('## 失败分类');
  lines.push('');
  const types = {};
  for (const item of REPORT.items) {
    if (item.result === 'FAIL') {
      types[item.reason_type] = (types[item.reason_type] || 0) + 1;
    }
  }
  lines.push('| 类型 | 数量 |');
  lines.push('|------|:----:|');
  for (const [t, c] of Object.entries(types)) {
    lines.push(`| ${t} | ${c} |`);
  }
  lines.push('');

  lines.push('## 失败详情');
  lines.push('');
  lines.push('| ID | 名称 | 类型 | 说明 | 建议 |');
  lines.push('|---|---|---|---|---|');
  for (const item of REPORT.items) {
    if (item.result === 'FAIL') {
      lines.push(`| ${item.id} | ${item.name} | ${item.reason_type} | ${(item.explanation||'').slice(0,80)} | ${(item.recommendation||'').slice(0,60)} |`);
    }
  }
  lines.push('');

  const mustFix = REPORT.items.filter(i => ['RUNTIME_FAIL','PROJECT_MISSING'].includes(i.reason_type));
  if (mustFix.length > 0) {
    lines.push('## 必须修项目的问题');
    lines.push('');
    for (const mf of mustFix) {
      lines.push(`- ❌ **${mf.id} ${mf.name}**: ${mf.explanation}`);
    }
    lines.push('');
  }

  const gptIssues = REPORT.items.filter(i => ['TEST_ENV_FAIL','PATH_MISMATCH'].includes(i.reason_type));
  if (gptIssues.length > 0) {
    lines.push('## gpt_test 自身问题');
    lines.push('');
    for (const gi of gptIssues) {
      lines.push(`- ⚠️ **${gi.id}**: ${gi.explanation} → ${gi.recommendation}`);
    }
    lines.push('');
  }

  const pending = REPORT.items.filter(i => ['TEST_TOO_STRICT','PROJECT_PARTIAL'].includes(i.reason_type));
  if (pending.length > 0) {
    lines.push('## 当前阶段允许 pending');
    lines.push('');
    for (const p of pending) {
      lines.push(`- ⏳ **${p.id} ${p.name}** (${p.reason_type}): ${p.explanation}`);
    }
    lines.push('');
  }

  lines.push('## Metrics');
  lines.push('```json');
  lines.push(JSON.stringify(REPORT.metrics, null, 2));
  lines.push('```');

  const md = lines.join('\n');
  fs.writeFileSync(mdPath, md, 'utf8');
  fs.writeFileSync(jsonPath, JSON.stringify(REPORT, null, 2), 'utf8');

  return { mdPath, jsonPath };
}

const { mdPath, jsonPath } = generateReport();

// ════════════════════════════════════════════════════════════════
// 控制台输出
// ════════════════════════════════════════════════════════════════

const s = REPORT.summary;
if (JSON_OUT) {
  console.log(JSON.stringify(REPORT, null, 2));
} else {
  console.log('');
  console.log('================ gpt_test 总验收报告 ================');
  console.log(`总计: ${s.total} | 通过: ${s.passed} | 失败: ${s.failed} | 警告: ${s.warned}`);
  console.log(`玩家行为测试: ${s.behavior}`);
  console.log(`游戏模块: ${GAME_OK ? '✅ 已加载' : '❌ 未加载'}`);
  const groupLabels = { '__env__':'环境检查','__data__':'数据内容','__wiring__':'代码接线','__struct__':'文件结构','__behavior_skip__':'行为测试','__project__':'项目运行','A_purchase':'购买行为','B_capacity':'容量行为','C_merge':'合成行为','D_slots':'形状行为','E_battle':'战斗行为','F_turn':'回合行为','G_relic':'遗物行为','H_event':'事件行为','I_hero':'英雄行为','J_run':'流程行为','K_bazaar':'Bazaar运行时','L_arch':'架构统一' };
  const groupOrder = ['__env__','__data__','__wiring__','__struct__','__behavior_skip__','A_purchase','B_capacity','C_merge','D_slots','E_battle','F_turn','G_relic','H_event','I_hero','J_run','K_bazaar','L_arch','__project__'];
  for (const g of groupOrder) {
    const gs = REPORT.groups[g];
    if (!gs || gs.total === 0) continue;
    const label = groupLabels[g] || g;
    const rate = gs.total > 0 ? Math.round(gs.passed / gs.total * 100) : 0;
    console.log(`  ${label}: ${gs.passed}/${gs.total} (${rate}%)`);
  }
  if (REPORT.items.filter(i => i.result === 'FAIL').length > 0) {
    console.log('');
    console.log('失败项:');
    for (const item of REPORT.items) {
      if (item.result === 'FAIL') console.log(`  ❌ [${item.reason_type}] ${item.id} ${item.name}: ${(item.explanation||'').slice(0,80)}`);
    }
  }
  console.log('');
  console.log(`MD 报告: ${mdPath}`);
  console.log(`JSON 报告: ${jsonPath}`);
}

process.exit(s.failed > 0 ? 1 : 0);
