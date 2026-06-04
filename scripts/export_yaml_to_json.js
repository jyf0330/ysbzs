// export_yaml_to_json.js
// 元素背包史 · YAML 源数据 → JSON 导出脚本
// 读取 external-data/source-yaml/ 下的 .yml/.yaml 文件
// 按相同相对路径输出到 external-data/generated-json/

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const SRC_DIR = path.resolve(__dirname, '..', 'external-data', 'source-yaml');
const OUT_DIR = path.resolve(__dirname, '..', 'external-data', 'generated-json');

const EXTENSIONS = new Set(['.yml', '.yaml']);

/** 递归收集所有 YAML 文件 */
function collectYamlFiles(dir, baseDir) {
  const results = [];
  if (!fs.existsSync(dir)) return results;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...collectYamlFiles(fullPath, baseDir));
    } else if (entry.isFile() && EXTENSIONS.has(path.extname(entry.name))) {
      const relPath = path.relative(baseDir, fullPath);
      results.push(relPath);
    }
  }
  return results;
}

/** 从 YAML 文件读取并解析 */
function loadYaml(relPath) {
  const srcPath = path.join(SRC_DIR, relPath);
  const raw = fs.readFileSync(srcPath, 'utf8');
  return yaml.load(raw);
}

/** 生成输出 JSON 路径（保持目录结构，仅改扩展名） */
function getOutPath(relYamlPath) {
  const baseName = path.basename(relYamlPath, path.extname(relYamlPath));
  const relDir = path.dirname(relYamlPath);
  return path.join(OUT_DIR, relDir, baseName + '.json');
}

/** 稳定化 JSON 输出：2 空格缩进、UTF-8、末尾换行 */
function formatJson(obj) {
  return JSON.stringify(obj, null, 2) + '\n';
}

// ================================================================
// 主流程
// ================================================================

let successCount = 0;
let failCount = 0;
const errors = [];

const yamlFiles = collectYamlFiles(SRC_DIR, SRC_DIR);

if (yamlFiles.length === 0) {
  console.log('[yaml-export] 在 external-data/source-yaml/ 下未找到 .yml/.yaml 文件。');
  console.log('[yaml-export] 请先创建 YAML 源数据文件。');
  process.exit(0);
}

console.log(`[yaml-export] 发现 ${yamlFiles.length} 个 YAML 文件，开始导出...`);

for (const relPath of yamlFiles.sort()) {
  const outPath = getOutPath(relPath);
  try {
    const data = loadYaml(relPath);
    if (data === undefined || data === null) {
      console.warn(`  ⚠  ${relPath} 为空，跳过`);
      continue;
    }

    // 确保输出目录存在
    const outDir = path.dirname(outPath);
    if (!fs.existsSync(outDir)) {
      fs.mkdirSync(outDir, { recursive: true });
    }

    fs.writeFileSync(outPath, formatJson(data), 'utf8');
    console.log(`  ✓ ${relPath} → ${path.relative(OUT_DIR, outPath)}`);
    successCount++;
  } catch (err) {
    console.error(`  ✗ ${relPath} 失败: ${err.message}`);
    failCount++;
    errors.push({ file: relPath, error: err.message });
  }
}

// ================================================================
// 汇总
// ================================================================

console.log('\n═══════════════════════════════════════');
console.log(`  成功: ${successCount}`);
console.log(`  失败: ${failCount}`);
console.log(`  输出: ${OUT_DIR}`);
console.log('═══════════════════════════════════════');

if (errors.length > 0) {
  console.error('\n失败文件:');
  for (const e of errors) {
    console.error(`  - ${e.file}: ${e.error}`);
  }
  process.exitCode = 1;
}
