// rebuild_data_pipeline.js
// 删除 external-data 生成产物并从 game-data-source 一键重建运行时 JSON。

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const EXTERNAL_DIR = path.join(ROOT, 'external-data');
const GENERATED_DIR = path.join(EXTERNAL_DIR, 'generated-json');
const DATA_SOURCE_DIR = path.join(ROOT, 'game-data-source');

function run(cmd, args) {
  console.log(`\n$ ${cmd} ${args.join(' ')}`);
  const res = spawnSync(cmd, args, { cwd: ROOT, stdio: 'inherit', shell: process.platform === 'win32' });
  if (res.status !== 0) process.exit(res.status || 1);
}

if (!fs.existsSync(DATA_SOURCE_DIR)) {
  console.error('[data:rebuild] 缺少 game-data-source/，无法重建 external-data。');
  process.exit(1);
}

fs.rmSync(EXTERNAL_DIR, { recursive: true, force: true });
fs.mkdirSync(GENERATED_DIR, { recursive: true });

run('python3', ['scripts/export_yaml_to_json.py']);
run('python3', ['scripts/build_runtime_from_data_source_tables.py']);

console.log('\n[data:rebuild] 完成：external-data/generated-json 已从 game-data-source 重建。');
