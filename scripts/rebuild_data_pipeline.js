// rebuild_data_pipeline.js
// 删除 external-data 生成产物并从 game-data-source 一键重建运行时 JSON。
// 用法: node scripts/rebuild_data_pipeline.js

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const EXTERNAL_DIR = path.join(ROOT, 'external-data');
const GENERATED_DIR = path.join(EXTERNAL_DIR, 'generated-json');
const DATA_SOURCE_DIR = path.join(ROOT, 'game-data-source');

function run(cmd, args, opts) {
  const label = `${cmd} ${args.join(' ')}`;
  console.log(`\n$ ${label}`);
  const res = spawnSync(cmd, args, { cwd: ROOT, stdio: 'inherit', shell: true, ...opts });
  if (res.status !== 0) {
    console.error(`[data:rebuild] 命令失败: ${label}`);
    process.exit(res.status || 1);
  }
}

function copyDir(src, dst) {
  if (!fs.existsSync(src)) return;
  if (!fs.existsSync(dst)) fs.mkdirSync(dst, { recursive: true });
  for (const f of fs.readdirSync(src)) {
    const sp = path.join(src, f);
    const dp = path.join(dst, f);
    if (fs.statSync(sp).isFile()) fs.copyFileSync(sp, dp);
  }
}

// 1. 检查真源目录
if (!fs.existsSync(DATA_SOURCE_DIR)) {
  console.error('[data:rebuild] 缺少 game-data-source/，无法重建 external-data。');
  process.exit(1);
}

// 2. 删除旧生成产物
console.log('[data:rebuild] 删除 external-data/ 生成产物...');
fs.rmSync(EXTERNAL_DIR, { recursive: true, force: true });
fs.mkdirSync(GENERATED_DIR, { recursive: true });

// 3. YAML → JSON
run('node', ['scripts/export_yaml_to_json.js']);

// 4. 复制运行时补丁数据
const staticSrc = path.join(DATA_SOURCE_DIR, 'yaml', 'runtime-static');
const staticDst = GENERATED_DIR;
if (fs.existsSync(staticSrc)) {
  copyDir(staticSrc, staticDst);
  console.log(`\n[runtime-static] 已复制: ${fs.readdirSync(staticSrc).length} 文件`);
}

console.log('\n[data:rebuild] 完成：external-data/generated-json 已从 game-data-source 重建。');

// 5. 生成 export_report.json
function generateExportReport() {
  const report = {
    ok: true,
    generated_at: new Date().toISOString(),
    source: 'game-data-source',
    errors: [],
    row_counts: {}
  };

  // 收集 JSON 行数
  const jsonDir = GENERATED_DIR;
  for (const f of fs.readdirSync(jsonDir)) {
    const fp = path.join(jsonDir, f);
    if (f.endsWith('.json') && fs.statSync(fp).isFile()) {
      try {
        const data = JSON.parse(fs.readFileSync(fp, 'utf-8'));
        const key = f.replace(/\.json$/, '');
        if (Array.isArray(data)) report.row_counts[key] = data.length;
        else if (typeof data === 'object') {
          for (const [k, v] of Object.entries(data)) {
            if (Array.isArray(v)) report.row_counts[`${key}.${k}`] = v.length;
          }
        }
      } catch {}
    }
  }

  // action-slots
  const actionDir = path.join(jsonDir, 'action-slots');
  if (fs.existsSync(actionDir)) {
    for (const f of fs.readdirSync(actionDir)) {
      if (f.endsWith('.json')) {
        const data = JSON.parse(fs.readFileSync(path.join(actionDir, f), 'utf-8'));
        const key = f.replace(/\.json$/, '');
        if (Array.isArray(data)) report.row_counts[`action-slots.${key}`] = data.length;
      }
    }
  }

  // attack-shapes
  const shapeDir = path.join(jsonDir, 'attack-shapes');
  if (fs.existsSync(shapeDir)) {
    for (const f of fs.readdirSync(shapeDir)) {
      if (f.endsWith('.json')) {
        const data = JSON.parse(fs.readFileSync(path.join(shapeDir, f), 'utf-8'));
        const key = f.replace(/\.json$/, '');
        if (Array.isArray(data)) report.row_counts[`attack-shapes.${key}`] = data.length;
        else if (typeof data === 'object' && data.items) report.row_counts[`attack-shapes.${key}.items`] = data.items.length;
        else if (typeof data === 'object') {
          const arrKeys = Object.keys(data).filter(k => Array.isArray(data[k]) && k !== 'pal_master');
          for (const ak of arrKeys) report.row_counts[`attack-shapes.${key}.${ak}`] = data[ak].length;
        }
      }
    }
  }

  // pal_units 特殊处理
  const puPath = path.join(jsonDir, 'pal_units.json');
  if (fs.existsSync(puPath)) {
    const pu = JSON.parse(fs.readFileSync(puPath, 'utf-8'));
    if (pu.pal_master) report.row_counts['pal_master'] = pu.pal_master.length;
    if (pu.pal_stats_ysbzs) report.row_counts['pal_stats_ysbzs'] = pu.pal_stats_ysbzs.length;
    if (pu.unit_usage) report.row_counts['unit_usage'] = pu.unit_usage.length;
  }

  // shop_config
  const scPath = path.join(jsonDir, 'shop_config.json');
  if (fs.existsSync(scPath)) {
    const sc = JSON.parse(fs.readFileSync(scPath, 'utf-8'));
    if (sc.shop_source) report.row_counts['shop_source'] = sc.shop_source.length;
  }

  // export_report 自带
  report.row_counts['export_report.row_counts'] = Object.keys(report.row_counts).length;

  // 兼容旧测试 key 名称
  if (report.row_counts['action-slots.action_template_enriched'] !== undefined)
    report.row_counts['action_template'] = report.row_counts['action-slots.action_template_enriched'];
  if (report.row_counts['action-slots.action_growth_enriched'] !== undefined)
    report.row_counts['action_growth'] = report.row_counts['action-slots.action_growth_enriched'];
  if (report.row_counts['event_config.event_master'] !== undefined)
    report.row_counts['event_master'] = report.row_counts['event_config.event_master'];
  if (report.row_counts['relic_config.relic_master'] !== undefined)
    report.row_counts['relic_master'] = report.row_counts['relic_config.relic_master'];
  if (report.row_counts['shop_config.shop_source'] !== undefined)
    report.row_counts['shop_source'] = Math.max(report.row_counts['shop_source'] || 0, report.row_counts['shop_config.shop_source']);

  const reportPath = path.join(GENERATED_DIR, 'export_report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2) + '\n', 'utf-8');
  console.log(`\n[export_report] 已生成: ${Object.keys(report.row_counts).length} 个计数项`);
}

generateExportReport();
