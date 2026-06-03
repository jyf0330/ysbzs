/**
 * sync-tables.js — 表格同步工作流辅助脚本
 *
 * 配合 AI 同步流程使用，不作为自动执行引擎。
 * 提供 pending 变更单的扫描、校验、冲突检查、报告生成辅助。
 *
 * 用法：
 *   node scripts/sync-tables.js status   — 显示 pending 变更单摘要
 *   node scripts/sync-tables.js check    — 校验变更单格式 + 冲突检查
 *   node scripts/sync-tables.js report <file>  — 从变更单生成同步报告草稿
 */

const fs = require('fs');
const path = require('path');

const CHANGES_DIR = path.resolve(__dirname, '../docs/tables/_changes');
const PENDING_DIR = path.join(CHANGES_DIR, 'pending');
const ARCHIVE_DIR = path.join(CHANGES_DIR, 'archive');
const REPORTS_DIR = path.join(CHANGES_DIR, 'reports');

// ---------- Helpers ----------

function readMdFrontmatter(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const title = content.match(/^# 变更单[：:] ?(.+)$/m);
  // 匹配 `- **字段**：value` 格式，兼容全角/半角冒号
  const fieldRe = /^- \*\*(.+?)\*\*[：:] ?(.+)$/gm;
  const fields = {};
  let m;
  while ((m = fieldRe.exec(content)) !== null) {
    const k = m[1].trim();
    let v = m[2].trim().replace(/\*{2}/g, '');
    if (k === 'change_id') fields.changeId = v;
    if (k === 'created_at') fields.createdAt = v;
    if (k === '影响文件') fields.files = v;
    if (k === '变更等级') fields.level = v;
    if (k === '状态') fields.status = v;
  }
  return {
    file: filePath,
    title: title ? title[1].trim() : '(无标题)',
    changeId: fields.changeId || '(无 change_id)',
    createdAt: fields.createdAt || '(无 created_at)',
    files: fields.files ? fields.files.split(/[,，、]/).map(s => s.trim()).filter(Boolean) : [],
    level: fields.level || '(未分级)',
    status: fields.status || '(未知)',
  };
}

function nowMinute() {
  const d = new Date();
  const pad = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function nowMinuteFile() {
  const d = new Date();
  const pad = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}_${pad(d.getHours())}-${pad(d.getMinutes())}`;
}

function listPending() {
  if (!fs.existsSync(PENDING_DIR)) return [];
  return fs.readdirSync(PENDING_DIR)
    .filter(f => f.endsWith('.md'))
    .map(f => readMdFrontmatter(path.join(PENDING_DIR, f)));
}

// ---------- Commands ----------

function cmdStatus() {
  const pending = listPending();
  if (pending.length === 0) {
    console.log('📭 没有待同步的变更单');
    return;
  }

  console.log(`📋 待同步变更单（${pending.length} 个）：\n`);
  pending.forEach((c, i) => {
    console.log(`  ${i + 1}. [${c.level}] ${c.title}`);
    console.log(`     change_id：${c.changeId}`);
    console.log(`     created_at：${c.createdAt}`);
    console.log(`     影响：${c.files.join(', ') || '(未指定)'}`);
    console.log(`     状态：${c.status}`);
    console.log(`     文件：${path.relative(CHANGES_DIR, c.file)}`);
    console.log();
  });
}

function cmdCheck() {
  const pending = listPending();
  const errors = [];
  const conflicts = [];

  if (pending.length === 0) {
    console.log('✅ 没有待同步变更单，无需检查');
    return;
  }

  // 格式校验
  pending.forEach(c => {
    if (!c.title || c.title === '(无标题)') errors.push(`  ${c.file}：缺少标题`);
    if (!c.changeId || c.changeId === '(无 change_id)') errors.push(`  ${c.file}：缺少 change_id`);
    if (!c.createdAt || c.createdAt === '(无 created_at)') errors.push(`  ${c.file}：缺少 created_at`);
    if (!c.files.length) errors.push(`  ${c.file}：影响文件为空`);
    if (!['P0 紧急', 'P1 重要', 'P2 常规', 'P3 后续'].includes(c.level)) {
      errors.push(`  ${c.file}：无效变更等级 "${c.level}"`);
    }
    if (c.status !== 'pending') {
      errors.push(`  ${c.file}：状态不是 pending（当前：${c.status}）`);
    }

    // 检查引用文件是否存在
    c.files.forEach(f => {
      const resolved = path.resolve(__dirname, '../', f);
      if (!fs.existsSync(resolved)) {
        errors.push(`  ${c.file}：引用的文件 "${f}" 不存在`);
      }
    });
  });

  // 冲突检查：同一文件被多个变更单修改
  const fileMap = {};
  pending.forEach(c => {
    c.files.forEach(f => {
      if (!fileMap[f]) fileMap[f] = [];
      fileMap[f].push(c.file);
    });
  });
  Object.entries(fileMap).forEach(([file, sources]) => {
    if (sources.length > 1) {
      conflicts.push(`  "${file}" 被 ${sources.length} 个变更单同时修改：${sources.map(s => path.relative(CHANGES_DIR, s)).join(', ')}`);
    }
  });

  // 输出结果
  if (errors.length === 0 && conflicts.length === 0) {
    console.log('✅ 所有变更单格式正确，无冲突');
    return;
  }

  if (errors.length) {
    console.log('❌ 格式错误：\n');
    errors.forEach(e => console.log(e));
    console.log();
  }
  if (conflicts.length) {
    console.log('⚠️  冲突警告：\n');
    conflicts.forEach(c => console.log(c));
    console.log();
  }

  if (errors.length) process.exitCode = 1;
}

function cmdReport(targetFile) {
  if (!targetFile) {
    console.error('用法：node scripts/sync-tables.js report 变更单文件名');
    console.error('示例：node scripts/sync-tables.js report 2026-06-03-fix-planner-lv3-to-four-tiers.md');
    process.exit(1);
  }

  const pendingPath = path.join(PENDING_DIR, targetFile);
  if (!fs.existsSync(pendingPath)) {
    console.error(`文件不存在：${pendingPath}`);
    process.exit(1);
  }

  const c = readMdFrontmatter(pendingPath);
  const now = nowMinute();
  const fileNow = nowMinuteFile();
  const reportName = `${fileNow}_sync-report.md`;
  const reportPath = path.join(REPORTS_DIR, reportName);

  const report = `# 同步报告：${c.title}

## 基本信息

- **change_id**：${c.changeId}
- **created_at**：${c.createdAt}
- **generated_at**：${now}
- **影响文件**：${c.files.join(', ')}
- **变更等级**：${c.level}

## 同步内容

源自 \`pending/${path.basename(c.file)}\`。请按变更单更新对应文件后完成本报告。

## 同步状态

- [ ] 变更已应用到正式表格
- [ ] 旧口径已清理
- [ ] 无残留风险

## 变更前 diff

（AI 执行后填写）

## 变更后 diff

（AI 执行后填写）

## 残留风险

（AI 执行后填写）
`;

  fs.writeFileSync(reportPath, report, 'utf-8');
  console.log(`✅ 同步报告草稿已生成：${reportPath}`);
}

// ---------- Main ----------

const cmd = process.argv[2];
switch (cmd) {
  case 'status':
    cmdStatus();
    break;
  case 'check':
    cmdCheck();
    break;
  case 'report':
    cmdReport(process.argv[3]);
    break;
  default:
    console.log('用法：');
    console.log('  node scripts/sync-tables.js status   — 显示 pending 变更单摘要');
    console.log('  node scripts/sync-tables.js check    — 校验变更单格式 + 冲突检查');
    console.log('  node scripts/sync-tables.js report <file> — 从变更单生成报告草稿');
    process.exit(1);
}
