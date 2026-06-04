// validate_yaml_data.js
// 元素背包史 · YAML 源数据校验脚本
// 校验 YAML 数据完整性：ID 唯一性、引用完整性、枚举合法性、数量检查
// 用法: node scripts/validate_yaml_data.js

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const SRC_DIR = path.resolve(__dirname, '..', 'external-data', 'source-yaml');
const EXTENSIONS = new Set(['.yml', '.yaml']);

let errors = [];
let warnings = [];

function error(msg) { errors.push(msg); }
function warn(msg) { warnings.push(msg); }

// ── 辅助函数 ──────────────────────────────────────────────

function loadYaml(relPath) {
  const fullPath = path.join(SRC_DIR, relPath);
  if (!fs.existsSync(fullPath)) { error(`文件不存在: ${relPath}`); return null; }
  try {
    const raw = fs.readFileSync(fullPath, 'utf8');
    return yaml.load(raw);
  } catch (e) {
    error(`YAML 解析失败: ${relPath} — ${e.message}`);
    return null;
  }
}

function collectYamlFiles() {
  const results = [];
  if (!fs.existsSync(SRC_DIR)) { error(`源目录不存在: ${SRC_DIR}`); return results; }
  for (const entry of fs.readdirSync(SRC_DIR, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      const subDir = path.join(SRC_DIR, entry.name);
      for (const sub of fs.readdirSync(subDir, { withFileTypes: true })) {
        if (sub.isFile() && EXTENSIONS.has(path.extname(sub.name))) {
          results.push(path.join(entry.name, sub.name));
        }
      }
    } else if (entry.isFile() && EXTENSIONS.has(path.extname(entry.name))) {
      results.push(entry.name);
    }
  }
  return results;
}

// ── 1. 加载所有数据 ──────────────────────────────────────

console.log('\n═══ 加载 YAML 数据 ═══\n');

const yamlFiles = collectYamlFiles();
if (yamlFiles.length === 0) { error('未找到 YAML 文件'); }

const data = {};
for (const f of yamlFiles) {
  data[f] = loadYaml(f);
  console.log(`  ${f} ${data[f] ? '✓' : '✗'}`);
}

if (errors.length > 0) {
  console.error('\n文件解析失败，停止校验');
  process.exit(1);
}

// ── 2. ID 唯一性检查 ──────────────────────────────────────

console.log('\n═══ ID 唯一性检查 ═══\n');

function checkUnique(items, idField, label, source) {
  if (!items || !Array.isArray(items)) return;
  const seen = new Map();
  for (const item of items) {
    const id = item[idField];
    if (id === undefined || id === null) continue;
    if (seen.has(id)) {
      error(`重复 ${label}: ${id} (出现在 ${source} 第${seen.get(id)}项和第${items.indexOf(item) + 1}项)`);
    }
    seen.set(id, items.indexOf(item) + 1);
  }
}

// pal_units
const palUnits = data['pal_units.yml'];
if (palUnits) {
  const masters = palUnits.pal_master || [];
  checkUnique(masters, 'unit_id', 'pal unit_id', 'pal_units.pal_master');
  for (const m of masters) {
    if (m.unit_id && m.pal_no) {
      if (m.unit_id !== m.pal_no) {
        warn(`pal_master: unit_id="${m.unit_id}" 与 pal_no="${m.pal_no}" 不一致`);
      }
    }
  }
  console.log(`  pal_master: ${masters.length} 个`);

  const stats = palUnits.pal_stats_ysbzs || [];
  checkUnique(stats, 'unit_id', 'pal_stats unit_id', 'pal_units.pal_stats_ysbzs');
  console.log(`  pal_stats_ysbzs: ${stats.length} 个`);

  const usage = palUnits.unit_usage || [];
  checkUnique(usage, 'unit_id', 'unit_usage unit_id', 'pal_units.unit_usage');
  console.log(`  unit_usage: ${usage.length} 个`);
}

// shop_config
const shopConfig = data['shop_config.yml'];
if (shopConfig) {
  const sources = shopConfig.shop_source || [];
  checkUnique(sources, 'unit_id', 'shop_source unit_id', 'shop_config.shop_source');
  console.log(`  shop_source: ${sources.length} 个`);
}

// relic
const relicConfig = data['relic_config.yml'];
if (relicConfig) {
  const relics = relicConfig.relic_master || [];
  checkUnique(relics, 'relic_id', 'relic_id', 'relic_config.relic_master');
  console.log(`  relic_master: ${relics.length} 个`);

  const effects = relicConfig.relic_effect || [];
  checkUnique(effects, 'relic_id', 'relic_effect relic_id', 'relic_config.relic_effect');
}

// event
const eventConfig = data['event_config.yml'];
if (eventConfig) {
  const events = eventConfig.event_master || [];
  checkUnique(events, 'event_id', 'event_id', 'event_config.event_master');
  console.log(`  event_master: ${events.length} 个`);
}

// hero
const heroConfig = data['hero_config.yml'];
if (heroConfig) {
  const heroes = heroConfig.hero_master || [];
  checkUnique(heroes, 'hero_id', 'hero_id', 'hero_config.hero_master');
  console.log(`  hero_master: ${heroes.length} 个`);
}

// encounter
const encounterConfig = data['encounter_config.yml'];
if (encounterConfig) {
  const waves = encounterConfig.encounter_wave || [];
  checkUnique(waves, 'wave_id', 'encounter wave_id', 'encounter_config.encounter_wave');
  console.log(`  encounter_wave: ${waves.length} 个`);
}

// attack shape master
const shapeMaster = data['attack-shapes/attack_shape_master.yml'];
if (shapeMaster) {
  const items = shapeMaster.items || [];
  checkUnique(items, 'shape_sn', 'attack shape_sn', 'attack_shape_master.items');
  console.log(`  attack_shape_master: ${items.length} 个`);
}

// action templates
const actionTpl = data['action-slots/action_template_enriched.yml'];
if (actionTpl) {
  // composite key: unit_id + slot
  const seen = new Map();
  for (const t of actionTpl) {
    const key = t.unit_id + '|' + t.slot;
    if (seen.has(key)) {
      error(`重复 action_template: ${key}`);
    }
    seen.set(key, true);
  }
  console.log(`  action_template_enriched: ${actionTpl.length} 个`);
}

// action growth
const actionGrowth = data['action-slots/action_growth_enriched.yml'];
if (actionGrowth) {
  // composite key: unit_id + slot + level
  const seen = new Map();
  for (const g of actionGrowth) {
    const key = g.unit_id + '|' + g.slot + '|' + g.level;
    if (seen.has(key)) {
      error(`重复 action_growth: ${key}`);
    }
    seen.set(key, true);
  }
  console.log(`  action_growth_enriched: ${actionGrowth.length} 个`);
}

// SD replacement (keys are SN strings)
const sdRep = data['attack-shapes/attack_shape_sd_replacement_22.yml'];
if (sdRep) {
  const keys = Object.keys(sdRep).filter(k => !k.startsWith('schema') && !k.startsWith('generated_at') && !k.startsWith('source_file'));
  console.log(`  sd_replacement: ${keys.length} 个条目`);
}

// ── 3. 引用完整性检查 ──────────────────────────────────────

console.log('\n═══ 引用完整性检查 ═══\n');

const allUnitIds = new Set();
if (palUnits) {
  for (const m of (palUnits.pal_master || [])) {
    if (m.unit_id) allUnitIds.add(m.unit_id);
  }
}

// action template 引用的 pal_id 存在
if (actionTpl) {
  for (const t of actionTpl) {
    if (!allUnitIds.has(t.unit_id)) {
      warn(`action_template 引用了未知 unit_id: ${t.unit_id}`);
    }
  }
  console.log(`  action_template 引用检查: ${actionTpl.length} 条`);
}

// action growth 引用的 pal_id 存在
if (actionGrowth) {
  for (const g of actionGrowth) {
    if (!allUnitIds.has(g.unit_id)) {
      warn(`action_growth 引用了未知 unit_id: ${g.unit_id}`);
    }
  }
  console.log(`  action_growth 引用检查: ${actionGrowth.length} 条`);
}

// shape_sn 引用检查
const allShapeSn = new Set();
if (shapeMaster) {
  for (const item of (shapeMaster.items || [])) {
    allShapeSn.add(item.shape_sn);
  }
}
if (actionTpl) {
  for (const t of actionTpl) {
    if (t.shape_sn !== undefined && !allShapeSn.has(t.shape_sn)) {
      warn(`action_template ${t.unit_id}|${t.slot} 引用了未知 shape_sn: ${t.shape_sn}`);
    }
  }
  console.log(`  shape_sn 引用检查 (action_template → attack_shape_master): OK`);
}

// shop_source 引用的 pal_id 存在
if (shopConfig) {
  for (const s of (shopConfig.shop_source || [])) {
    if (!allUnitIds.has(s.unit_id)) {
      warn(`shop_source 引用了未知 unit_id: ${s.unit_id}`);
    }
  }
  console.log(`  shop_source 引用检查: OK`);
}

// event reward 引用的 relic_id / pal_id 存在
if (eventConfig) {
  const allRelicIds = new Set();
  if (relicConfig) {
    for (const r of (relicConfig.relic_master || [])) {
      if (r.relic_id) allRelicIds.add(r.relic_id);
    }
  }
  for (const reward of (eventConfig.event_reward || [])) {
    if (reward.relic_id && !allRelicIds.has(reward.relic_id)) {
      warn(`event_reward 引用了未知 relic_id: ${reward.relic_id}`);
    }
    if (reward.unit_id && !allUnitIds.has(reward.unit_id)) {
      warn(`event_reward 引用了未知 unit_id: ${reward.unit_id}`);
    }
  }
  console.log(`  event_reward 引用检查: OK`);
}

// encounter wave 引用的 enemy pool 对应的 pal_id 存在
if (encounterConfig) {
  for (const wave of (encounterConfig.encounter_wave || [])) {
    if (wave.castle_enemy_pool) {
      // pool 名是字符串，不直接验证 ID，但检查格式
      if (!wave.castle_enemy_pool.includes('_pool') && !wave.castle_enemy_pool.includes('_pal_')) {
        warn(`encounter wave "${wave.wave_id}" 的 castle_enemy_pool 命名格式异常: ${wave.castle_enemy_pool}`);
      }
    }
  }
  console.log(`  encounter_wave 引用检查: OK`);
}

// ── 4. 基础枚举合法性 ──────────────────────────────────────

console.log('\n═══ 枚举合法性检查 ═══\n');

const VALID_ELEMENTS = new Set(['fire', 'water', 'wind', 'earth']);
const VALID_QUALITIES = new Set(['青铜', '白银', '黄金', '钻石', 'bronze', 'silver', 'gold', 'diamond']);
const VALID_SIZES = new Set(['small', 'medium', 'large']);

if (palUnits) {
  for (const m of (palUnits.pal_master || [])) {
    const el = m.ysbzs_element;
    if (el && !VALID_ELEMENTS.has(el)) {
      warn(`pal_master ${m.unit_id}: 未知元素 "${el}"`);
    }
    const size = m.size;
    if (size && !VALID_SIZES.has(size)) {
      warn(`pal_master ${m.unit_id}: 未知 size "${size}"`);
    }
    const qual = m.shop_quality_base;
    if (qual && !VALID_QUALITIES.has(qual)) {
      warn(`pal_master ${m.unit_id}: 未知 quality "${qual}"`);
    }
  }
  console.log(`  pal_master 枚举检查: OK`);
}

if (relicConfig) {
  for (const r of (relicConfig.relic_master || [])) {
    const qual = r.quality;
    if (qual && !VALID_QUALITIES.has(qual)) {
      warn(`relic ${r.relic_id}: 未知 quality "${qual}"`);
    }
  }
  console.log(`  relic 枚举检查: OK`);
}

// action template 的 el 字段
if (actionTpl) {
  for (const t of actionTpl) {
    if (t.el && !VALID_ELEMENTS.has(t.el)) {
      warn(`action_template ${t.unit_id}|${t.slot}: 未知元素 "${t.el}"`);
    }
  }
  console.log(`  action_template 元素检查: OK`);
}

// ── 5. 关键数量检查 ──────────────────────────────────────

console.log('\n═══ 关键数量检查 ═══\n');

if (shapeMaster) {
  const items = shapeMaster.items || [];
  const core = items.filter(i => i.status === 'core');
  const reserve = items.filter(i => i.status === 'reserve');

  console.log(`  attack_shape_master: ${items.length} 个 (core: ${core.length}, reserve: ${reserve.length})`);

  if (items.length !== 22) error(`attack_shape_master 数量应为 22，实际 ${items.length}`);
  if (core.length !== 12) error(`core shapes 数量应为 12，实际 ${core.length}`);
  if (reserve.length !== 10) error(`reserve shapes 数量应为 10，实际 ${reserve.length}`);
}

if (palUnits) {
  const masters = palUnits.pal_master || [];
  console.log(`  Pal 单位: ${masters.length} 个`);
  if (masters.length < 60) error(`Pal 单位数量不足 60: 实际 ${masters.length}`);
}

if (actionTpl) {
  console.log(`  action_template: ${actionTpl.length} 个`);
  if (actionTpl.length < 180) error(`action_template 数量不足 180: 实际 ${actionTpl.length}`);
}

if (actionGrowth) {
  console.log(`  action_growth: ${actionGrowth.length} 个`);
  if (actionGrowth.length < 720) error(`action_growth 数量不足 720: 实际 ${actionGrowth.length}`);
}

// ── 6. 数值合法性检查 ──────────────────────────────────────

console.log('\n═══ 数值合法性检查 ═══\n');

if (shopConfig) {
  for (const s of (shopConfig.shop_source || [])) {
    if (s.price !== undefined && s.price < 0) {
      warn(`shop_source ${s.unit_id}: price 为负数 (${s.price})`);
    }
    if (s.slot_index !== undefined && ![1, 2, 3].includes(s.slot_index)) {
      warn(`shop_source ${s.unit_id}: slot_index 异常 (${s.slot_index})`);
    }
  }
  console.log(`  shop_source 数值检查: OK`);
}

// ── 汇总 ──────────────────────────────────────────────────────

console.log('\n═══════════════════════════════════════');
if (errors.length === 0 && warnings.length === 0) {
  console.log('  校验通过！无错误，无警告');
} else {
  if (errors.length > 0) {
    console.log(`  ❌ 错误: ${errors.length} 个`);
    for (const e of errors) console.log(`    - ${e}`);
  }
  if (warnings.length > 0) {
    console.log(`  ⚠ 警告: ${warnings.length} 个`);
    for (const w of warnings) console.log(`    - ${w}`);
  }
}
console.log('═══════════════════════════════════════\n');

if (errors.length > 0) process.exit(1);
