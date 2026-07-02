#!/usr/bin/env node
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');
const {
  TABLE_FILES,
  loadGameData,
  loadSourceTablesFromCsv,
  parseCsv,
  loadWaveRulesYaml
} = require('../src/core/csvData.cjs');
const { validateData } = require('../src/core/data.cjs');

const ROOT = path.resolve(__dirname, '..');
const DEFAULT_RUNTIME_JSON = path.join(ROOT, 'data', 'runtime', 'game_data.json');
const DEFAULT_REPORT_HTML = path.join(ROOT, 'reports', 'data', 'index.html');
const DEFAULT_REPORT_MOBILE_HTML = path.join(ROOT, 'reports', 'data', 'mobile.html');
const DEFAULT_WEB_DATA_JSON = path.join(ROOT, 'web', 'data', 'game_data.json');
const DEFAULT_WEB_REPORT_HTML = path.join(ROOT, 'web', 'data', 'index.html');
const DEFAULT_WEB_MOBILE_HTML = path.join(ROOT, 'web', 'data', 'mobile.html');
const DEFAULT_SOURCE_MODE = 'workbook';
const DATA_TABLE_ORDER = [
  'pets',
  'monsters',
  'waves',
  'mechanisms',
  'events',
  'shop',
  'shopStores',
  'relics',
  'shapes',
  'validation',
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
  'encounterPool',
  'waveRules'
];

const TABLE_LABELS = {
  pets: '宠物',
  monsters: '怪物模板',
  waves: '波次',
  mechanisms: '机制',
  events: '事件',
  shop: '商品',
  shopStores: '商品店',
  relics: '遗物',
  shapes: '行动形状',
  validation: '交叉校验',
  initialSetup: '开局配置',
  heroDomains: '英雄领域',
  elementReactions: '元素反应',
  day7Trial: '第7天试炼',
  qualityMultipliers: '品质倍率',
  trialQuestions: '试炼题库',
  trialActions: '试炼行动',
  victoryRules: '胜利规则',
  effectObjects: '效果对象',
  triggers: '触发器',
  modifiers: 'Modifier',
  elementPacketRules: '元素包规则',
  elementConversions: '元素转换',
  triggerOrderRules: '触发顺序',
  nodeSchedule: '路线日程',
  nodePool: '节点池',
  encounterPool: '遭遇池',
  waveRules: 'YAML波次规则'
};
const SOURCE_CONTENT_TABLE_KEY = 'sourceContent';
const SOURCE_CONTENT_TABLE_LABEL = 'JSON/YAML配置内容';
const SOURCE_CSV_TABLE_KEY = 'sourceCsv';
const SOURCE_CSV_TABLE_LABEL = 'CSV/总表派生表';

const ID_FIELDS = {
  pets: 'id',
  mechanisms: 'id',
  events: 'id',
  shopStores: 'id',
  relics: 'id',
  shapes: 'petId',
  nodeSchedule: 'id',
  nodePool: 'nodeId',
  encounterPool: 'encounterId',
  monsters: 'petId'
};

function rel(root, file) {
  return path.relative(root, file).replace(/\\/g, '/');
}

function ensureDir(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function walkFiles(dir, predicate, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const name of fs.readdirSync(dir).sort()) {
    const file = path.join(dir, name);
    const stat = fs.statSync(file);
    if (stat.isDirectory()) {
      walkFiles(file, predicate, out);
      continue;
    }
    if (!predicate || predicate(file)) out.push(file);
  }
  return out;
}

function formatOf(file) {
  const ext = path.extname(file).toLowerCase();
  if (ext === '.json') return 'json';
  if (ext === '.yaml' || ext === '.yml') return 'yaml';
  if (ext === '.csv') return 'csv';
  if (ext === '.xlsx') return 'xlsx';
  if (ext === '.md') return 'md';
  return ext.replace(/^\./, '') || 'file';
}

function fileSummary(root, file) {
  const stat = fs.statSync(file);
  const textLike = ['.json', '.yaml', '.yml', '.csv', '.md'].includes(path.extname(file).toLowerCase());
  let rows = null;
  let parseStatus = 'not_parsed';
  if (textLike) {
    const text = fs.readFileSync(file, 'utf8');
    rows = text.split(/\r?\n/).filter(Boolean).length;
    if (formatOf(file) === 'json') {
      try {
        JSON.parse(text);
        parseStatus = 'valid_json';
      } catch (err) {
        parseStatus = `invalid_json: ${err.message}`;
      }
    } else if (formatOf(file) === 'yaml') {
      parseStatus = 'yaml_text';
    } else if (formatOf(file) === 'csv') {
      parseStatus = 'csv_text';
    } else {
      parseStatus = 'text';
    }
  }
  return {
    path: rel(root, file),
    format: formatOf(file),
    bytes: stat.size,
    rows,
    parseStatus
  };
}

function scalarAuditValue(value) {
  if (value === null) return 'null';
  if (value === undefined) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return JSON.stringify(value);
}

function valueType(value) {
  if (Array.isArray(value)) return 'array';
  if (value === null) return 'null';
  return typeof value;
}

function flattenJsonAudit(value, sourcePath, rows, pathParts = []) {
  const keyPath = pathParts.join('.');
  if (Array.isArray(value)) {
    if (!value.length) {
      rows.push({ sourcePath, format: 'json', keyPath, value: '[]', valueType: 'array' });
      return;
    }
    value.forEach((item, index) => flattenJsonAudit(item, sourcePath, rows, pathParts.concat(`[${index}]`)));
    return;
  }
  if (value && typeof value === 'object') {
    const entries = Object.entries(value);
    if (!entries.length) {
      rows.push({ sourcePath, format: 'json', keyPath, value: '{}', valueType: 'object' });
      return;
    }
    for (const [key, val] of entries) flattenJsonAudit(val, sourcePath, rows, pathParts.concat(key));
    return;
  }
  rows.push({ sourcePath, format: 'json', keyPath, value: scalarAuditValue(value), valueType: valueType(value) });
}

function stripYamlComment(line) {
  let quote = null;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if ((ch === '"' || ch === "'") && line[i - 1] !== '\\') {
      quote = quote === ch ? null : quote || ch;
      continue;
    }
    if (ch === '#' && !quote && (i === 0 || /\s/.test(line[i - 1]))) return line.slice(0, i);
  }
  return line;
}

function normalizeYamlAuditScalar(raw) {
  const value = String(raw || '').trim();
  if (!value) return '';
  if (value === 'true' || value === 'false') return value;
  if (value === 'null' || value === '~') return 'null';
  return value.replace(/^["']|["']$/g, '');
}

function yamlPath(stack) {
  return stack.map(item => item.key).filter(Boolean).join('.');
}

function parseYamlAuditRows(text, sourcePath) {
  const rows = [];
  const stack = [];
  for (const rawLine of String(text || '').split(/\r?\n/)) {
    const withoutComment = stripYamlComment(rawLine).replace(/\s+$/, '');
    if (!withoutComment.trim()) continue;
    const indent = (withoutComment.match(/^\s*/) || [''])[0].length;
    const trimmed = withoutComment.trim();
    while (stack.length && indent <= stack[stack.length - 1].indent) stack.pop();
    if (trimmed.startsWith('- ')) {
      const parentPath = yamlPath(stack);
      const item = trimmed.slice(2).trim();
      if (!item) {
        rows.push({ sourcePath, format: 'yaml', keyPath: `${parentPath}[]`, value: '', valueType: 'array_item' });
        continue;
      }
      const pair = item.match(/^([^:]+):\s*(.*)$/);
      if (pair) {
        const key = pair[1].trim();
        const value = normalizeYamlAuditScalar(pair[2]);
        rows.push({ sourcePath, format: 'yaml', keyPath: `${parentPath}[].${key}`, value, valueType: 'array_object_field' });
      } else {
        rows.push({ sourcePath, format: 'yaml', keyPath: `${parentPath}[]`, value: normalizeYamlAuditScalar(item), valueType: 'array_item' });
      }
      continue;
    }
    const pair = trimmed.match(/^([^:]+):\s*(.*)$/);
    if (!pair) {
      rows.push({ sourcePath, format: 'yaml', keyPath: yamlPath(stack), value: trimmed, valueType: 'text' });
      continue;
    }
    const key = pair[1].trim().replace(/^["']|["']$/g, '');
    const rawValue = pair[2];
    const nextPath = yamlPath(stack.concat({ indent, key }));
    if (rawValue.trim() === '') {
      rows.push({ sourcePath, format: 'yaml', keyPath: nextPath, value: '{}', valueType: 'object' });
      stack.push({ indent, key });
      continue;
    }
    rows.push({ sourcePath, format: 'yaml', keyPath: nextPath, value: normalizeYamlAuditScalar(rawValue), valueType: 'scalar' });
  }
  return rows;
}

function collectSourceContentRows(root, files) {
  const rows = [];
  for (const file of files) {
    if (file.format !== 'json' && file.format !== 'yaml') continue;
    const abs = path.join(root, file.path);
    if (!fs.existsSync(abs)) continue;
    const text = fs.readFileSync(abs, 'utf8');
    if (file.format === 'json') {
      try {
        flattenJsonAudit(JSON.parse(text), file.path, rows);
      } catch (err) {
        rows.push({ sourcePath: file.path, format: 'json', keyPath: '', value: err.message, valueType: 'parse_error' });
      }
      continue;
    }
    rows.push(...parseYamlAuditRows(text, file.path));
  }
  return rows;
}

function collectCsvContentRows(root, csvDir, sourceMode) {
  if (!fs.existsSync(csvDir)) return [];
  const rows = [];
  const files = fs.readdirSync(csvDir).filter(name => /\.csv$/i.test(name)).sort();
  for (const filename of files) {
    const filePath = path.join(csvDir, filename);
    const sourcePath = sourceMode === 'workbook' ? `xlsx/ysbzs_master.xlsx -> ${filename}` : `data/csv/${filename}`;
    const parsed = parseCsv(fs.readFileSync(filePath, 'utf8'));
    parsed.forEach((row, index) => {
      rows.push(Object.assign({
        sourcePath,
        format: sourceMode === 'workbook' ? 'xlsx-derived' : 'csv',
        csvFile: filename,
        rowNumber: index + 1
      }, row));
    });
  }
  return rows;
}

function collectSourceFiles(root) {
  const files = [];
  const addExisting = file => {
    if (fs.existsSync(file)) files.push(file);
  };
  addExisting(path.join(root, 'xlsx', 'ysbzs_master.xlsx'));
  walkFiles(path.join(root, 'data', 'csv'), file => /\.(csv)$/i.test(file), files);
  walkFiles(path.join(root, 'data', 'unconnected'), file => /\.(json|ya?ml|csv|xlsx|md)$/i.test(file), files);
  walkFiles(path.join(root, 'yaml'), file => /\.(ya?ml)$/i.test(file), files);
  const seen = new Set();
  return files
    .filter(file => {
      const key = rel(root, file);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) => rel(root, a).localeCompare(rel(root, b)))
    .map(file => fileSummary(root, file));
}

function arrayify(value) {
  if (Array.isArray(value)) return value;
  if (!value || typeof value !== 'object') return [];
  return Object.entries(value).map(([key, val]) => {
    if (val && typeof val === 'object' && !Array.isArray(val)) return Object.assign({ key }, val);
    return { key, value: val };
  });
}

function tableRows(data, key) {
  return arrayify(data[key]);
}

function countRows(data) {
  const counts = {};
  for (const key of DATA_TABLE_ORDER) counts[key] = tableRows(data, key).length;
  return counts;
}

function makeSet(rows, field) {
  return new Set(rows.map(row => row && row[field]).filter(Boolean));
}

function mechanicIds(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value.filter(id => id && id !== 'none');
  return String(value).split(/[,，、;；|/]+/).map(x => x.trim()).filter(x => x && x !== 'none');
}

function addIssue(issues, severity, table, rowKey, message, field = '') {
  issues.push({ severity, table, rowKey: rowKey || '', field, message });
}

function validateRuntimeData(data) {
  const issues = [];
  const validation = validateData(data);
  if (!validation.ok) {
    for (const msg of validation.issues || []) addIssue(issues, 'error', 'normalized', '', msg);
  }
  const pets = tableRows(data, 'pets');
  const mechanisms = tableRows(data, 'mechanisms');
  const shapes = tableRows(data, 'shapes');
  const shopStores = tableRows(data, 'shopStores');
  const petIds = makeSet(pets, 'id');
  const mechanicSet = makeSet(mechanisms, 'id');
  const shapePetIds = makeSet(shapes, 'petId');
  const shopStoreIds = makeSet(shopStores, 'id');

  for (const key of DATA_TABLE_ORDER) {
    const rows = tableRows(data, key);
    const idField = ID_FIELDS[key];
    if (!idField) continue;
    const seen = new Map();
    rows.forEach((row, index) => {
      const id = row && row[idField];
      if (!id) {
        addIssue(issues, 'warn', key, `#${index + 1}`, `缺少主键字段 ${idField}`, idField);
        return;
      }
      if (seen.has(id)) addIssue(issues, 'error', key, id, `主键重复：${idField}=${id}`, idField);
      seen.set(id, true);
    });
  }

  for (const pet of pets) {
    if (!shapePetIds.has(pet.id)) addIssue(issues, 'warn', 'pets', pet.id, '宠物没有对应 action shape 行', 'shape');
    for (const mech of mechanicIds(pet.mechanics)) {
      if (!mechanicSet.has(mech)) addIssue(issues, 'error', 'pets', pet.id, `机制不存在：${mech}`, 'mechanics');
    }
    if (!pet.name) addIssue(issues, 'error', 'pets', pet.id, '缺少名称', 'name');
    if (Number(pet.hp) <= 0) addIssue(issues, 'error', 'pets', pet.id, 'HP 必须大于 0', 'hp');
    if (Number(pet.atk) < 0) addIssue(issues, 'error', 'pets', pet.id, '攻击不能为负数', 'atk');
    if (Number(pet.score) >= 250) addIssue(issues, 'warn', 'pets', pet.id, `效果分偏高：${pet.score}`, 'score');
  }

  for (const shape of shapes) {
    if (!petIds.has(shape.petId)) addIssue(issues, 'error', 'shapes', shape.petId, `形状引用不存在宠物：${shape.petId}`, 'petId');
    for (const mech of mechanicIds(shape.mechanics)) {
      if (!mechanicSet.has(mech)) addIssue(issues, 'error', 'shapes', shape.petId, `形状机制不存在：${mech}`, 'mechanics');
    }
  }

  for (const monster of tableRows(data, 'monsters')) {
    if (!petIds.has(monster.petId)) addIssue(issues, 'error', 'monsters', monster.petId, `怪物模板引用不存在宠物：${monster.petId}`, 'petId');
    for (const mech of mechanicIds(monster.mechanics)) {
      if (!mechanicSet.has(mech)) addIssue(issues, 'error', 'monsters', monster.petId, `怪物机制不存在：${mech}`, 'mechanics');
    }
  }

  for (const wave of tableRows(data, 'waves')) {
    for (const id of [wave.petId, ...(wave.petPool || [])].filter(Boolean)) {
      if (!petIds.has(id)) addIssue(issues, 'error', 'waves', wave.waveId, `波次引用不存在宠物：${id}`, 'petId');
    }
  }

  for (const shop of tableRows(data, 'shop')) {
    if (!petIds.has(shop.petId)) addIssue(issues, 'error', 'shop', shop.petId, `商品引用不存在宠物：${shop.petId}`, 'petId');
    for (const storeId of shop.shopPools || []) {
      if (!shopStoreIds.has(storeId)) addIssue(issues, 'warn', 'shop', shop.petId, `商品池没有对应商品店定义：${storeId}`, 'shopPools');
    }
  }

  for (const event of tableRows(data, 'events')) {
    if (event.petId && !petIds.has(event.petId)) addIssue(issues, 'error', 'events', event.id, `事件引用不存在宠物：${event.petId}`, 'petId');
    for (const mech of mechanicIds(event.mechanics)) {
      if (!mechanicSet.has(mech)) addIssue(issues, 'error', 'events', event.id, `事件机制不存在：${mech}`, 'mechanics');
    }
  }

  for (const relic of tableRows(data, 'relics')) {
    if (relic.petId && !petIds.has(relic.petId)) addIssue(issues, 'warn', 'relics', relic.id, `遗物关联宠物不存在：${relic.petId}`, 'petId');
    for (const mech of mechanicIds(relic.mechanics)) {
      if (!mechanicSet.has(mech)) addIssue(issues, 'error', 'relics', relic.id, `遗物机制不存在：${mech}`, 'mechanics');
    }
  }

  const setupParty = data.initialSetup && data.initialSetup.playerParty ? data.initialSetup.playerParty : [];
  for (const slot of setupParty) {
    if (slot.petId && !petIds.has(slot.petId)) addIssue(issues, 'error', 'initialSetup', slot.slot || slot.petId, `开局阵容宠物不存在：${slot.petId}`, 'petId');
  }

  return issues;
}

function sourceSummary(files) {
  const out = {};
  for (const file of files) {
    out[file.format] = out[file.format] || { count: 0, bytes: 0 };
    out[file.format].count += 1;
    out[file.format].bytes += file.bytes;
  }
  return out;
}

function sourceTablesSummary(root, csvDir, sourceMode) {
  const tables = loadSourceTablesFromCsv(csvDir);
  return Object.fromEntries(Object.entries(TABLE_FILES).map(([key, filename]) => [
    key,
    {
      file: sourceMode === 'workbook' ? `xlsx/ysbzs_master.xlsx -> ${filename}` : `data/csv/${filename}`,
      rows: (tables[key] || []).length,
      format: sourceMode === 'workbook' ? 'xlsx-derived' : 'csv'
    }
  ]));
}

function materializeRuntimeCsvSource(root, sourceMode = DEFAULT_SOURCE_MODE) {
  if (sourceMode === 'csv') {
    return {
      csvDir: path.join(root, 'data', 'csv'),
      runtimeSource: {
        mode: 'csv',
        workbook: fs.existsSync(path.join(root, 'xlsx', 'ysbzs_master.xlsx')) ? 'xlsx/ysbzs_master.xlsx' : null,
        csvDir: 'data/csv',
        persistedIntermediate: true
      },
      cleanup: () => {}
    };
  }
  if (sourceMode !== 'workbook') throw new Error(`unknown runtime data source mode: ${sourceMode}`);
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ysbzs-runtime-csv-'));
  execFileSync('python3', [
    path.join(root, 'tools', 'export_master_to_csv.py'),
    '--master',
    path.join(root, 'xlsx', 'ysbzs_master.xlsx'),
    '--baseline-dir',
    path.join(root, 'data', 'csv'),
    '--out-dir',
    tmpDir
  ], { cwd: root, stdio: 'pipe' });
  return {
    csvDir: tmpDir,
    runtimeSource: {
      mode: 'workbook',
      workbook: 'xlsx/ysbzs_master.xlsx',
      compatibilityBaseline: 'data/csv',
      persistedIntermediate: false
    },
    cleanup: () => fs.rmSync(tmpDir, { recursive: true, force: true })
  };
}

function buildRuntimePayload({ root = ROOT, sourceMode = DEFAULT_SOURCE_MODE } = {}) {
  const source = materializeRuntimeCsvSource(root, sourceMode);
  let rawData;
  let connectedTables;
  let csvRows;
  try {
    rawData = loadGameData({ csvDir: source.csvDir, cache: false });
    connectedTables = sourceTablesSummary(root, source.csvDir, source.runtimeSource.mode);
    csvRows = collectCsvContentRows(root, source.csvDir, source.runtimeSource.mode);
  } finally {
    source.cleanup();
  }
  const data = JSON.parse(JSON.stringify(rawData));
  if (data.meta) {
    data.meta.sourceType = source.runtimeSource.mode;
    data.meta.sourcePackage = source.runtimeSource.mode === 'workbook' ? source.runtimeSource.workbook : 'data/csv/*.csv';
    data.meta.csvDir = source.runtimeSource.mode === 'workbook' ? 'generated from xlsx/ysbzs_master.xlsx' : rel(root, path.join(root, 'data', 'csv'));
    data.meta.sourceWorkbook = source.runtimeSource.workbook || null;
    data.meta.compatibilityBaseline = source.runtimeSource.compatibilityBaseline || null;
    data.meta.persistedIntermediate = source.runtimeSource.persistedIntermediate;
  }
  const files = collectSourceFiles(root);
  const sourceContentRows = collectSourceContentRows(root, files);
  const waveRulesPath = path.join(root, 'yaml', 'wave_rules_20260609.yaml');
  const payload = {
    schemaVersion: 'ysbzs.runtime-data.v1',
    generatedAt: data.meta && data.meta.generatedAt ? data.meta.generatedAt : new Date().toISOString().slice(0, 10),
    source: {
      runtime: source.runtimeSource,
      workbook: fs.existsSync(path.join(root, 'xlsx', 'ysbzs_master.xlsx')) ? 'xlsx/ysbzs_master.xlsx' : null,
      connectedTables,
      filesByFormat: sourceSummary(files),
      files,
      csvRows,
      contentRows: sourceContentRows,
      yamlRuntimeRules: fs.existsSync(waveRulesPath) ? loadWaveRulesYaml(waveRulesPath) : {}
    },
    counts: countRows(data),
    data
  };
  payload.issues = validateRuntimeData(data);
  payload.issueCounts = payload.issues.reduce((acc, issue) => {
    acc[issue.severity] = (acc[issue.severity] || 0) + 1;
    return acc;
  }, {});
  return payload;
}

function htmlEscape(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function renderHtml(payload) {
  const appJson = appPayloadJson(payload);
  return `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>元素背包史数据审核</title>
<style>
:root{color-scheme:light;--bg:#f6f7f9;--panel:#fff;--line:#d8dde6;--ink:#18202c;--muted:#667085;--accent:#2663eb;--bad:#b42318;--warn:#b54708;--ok:#087443}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--ink);font:14px/1.45 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
header{padding:18px 24px 12px;background:var(--panel);border-bottom:1px solid var(--line);position:sticky;top:0;z-index:4}
h1{font-size:22px;margin:0 0 10px}
.summary{display:flex;flex-wrap:wrap;gap:8px}
.chip{border:1px solid var(--line);background:#fff;border-radius:6px;padding:5px 8px;color:var(--muted)}
.chip strong{color:var(--ink)}
.layout{display:grid;grid-template-columns:250px 1fr;min-height:calc(100vh - 93px)}
nav{border-right:1px solid var(--line);background:#fff;padding:12px;position:sticky;top:93px;height:calc(100vh - 93px);overflow:auto}
main{padding:16px 18px 40px;min-width:0}
button{font:inherit}
.nav-btn{width:100%;border:0;background:transparent;border-radius:6px;padding:8px 9px;text-align:left;display:flex;justify-content:space-between;gap:8px;cursor:pointer}
.nav-btn:hover,.nav-btn.active{background:#eef3ff;color:#174ea6}
.toolbar{display:flex;gap:10px;align-items:center;margin-bottom:12px;flex-wrap:wrap}
input,select{border:1px solid var(--line);border-radius:6px;background:#fff;padding:8px 9px;min-height:34px}
input{min-width:260px}
.panel{background:var(--panel);border:1px solid var(--line);border-radius:8px;overflow:hidden}
.panel-head{padding:12px 14px;border-bottom:1px solid var(--line);display:flex;justify-content:space-between;gap:12px;align-items:center}
.panel-title{font-size:17px;font-weight:700}
.panel-sub{color:var(--muted);font-size:12px}
.table-wrap{overflow:auto;max-height:68vh}
table{border-collapse:collapse;width:100%;min-width:780px}
th,td{border-bottom:1px solid #edf0f5;padding:8px 10px;text-align:left;vertical-align:top;white-space:nowrap}
th{position:sticky;top:0;background:#f9fafb;z-index:1;color:#475467}
tr:hover td{background:#fbfdff}
td code{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:12px}
.severity-error{color:var(--bad);font-weight:700}
.severity-warn{color:var(--warn);font-weight:700}
.severity-info{color:var(--accent);font-weight:700}
.format{display:inline-block;border-radius:5px;padding:2px 6px;background:#eef2f6;color:#344054;font-size:12px}
.format-json{background:#e9f8ef;color:#067647}
.format-yaml{background:#fff4e5;color:#b54708}
.format-csv{background:#eef4ff;color:#175cd3}
.format-xlsx{background:#f4f3ff;color:#5925dc}
details{white-space:normal}
pre{margin:8px 0 0;white-space:pre-wrap;max-width:900px;color:#344054;font-size:12px}
.empty{padding:22px;color:var(--muted)}
@media (max-width:860px){.layout{grid-template-columns:1fr}nav{position:static;height:auto;border-right:0;border-bottom:1px solid var(--line)}header{position:static}.table-wrap{max-height:none}}
</style>
</head>
<body>
<header>
  <h1>元素背包史数据审核</h1>
  <div class="summary" id="summary"></div>
</header>
<div class="layout">
  <nav id="nav"></nav>
  <main>
    <div class="toolbar">
      <input id="search" type="search" placeholder="搜索 ID、名称、机制、路径">
      <select id="issueFilter">
        <option value="all">全部行</option>
        <option value="issues">只看异常</option>
      </select>
      <select id="formatFilter">
        <option value="all">全部来源格式</option>
        <option value="xlsx">XLSX</option>
        <option value="csv">CSV</option>
        <option value="json">JSON</option>
        <option value="yaml">YAML</option>
      </select>
    </div>
    <section class="panel">
      <div class="panel-head">
        <div>
          <div class="panel-title" id="panelTitle"></div>
          <div class="panel-sub" id="panelSub"></div>
        </div>
      </div>
      <div class="table-wrap" id="table"></div>
    </section>
  </main>
</div>
<script id="app-data" type="application/json">${appJson}</script>
<script>
const app = JSON.parse(document.getElementById('app-data').textContent);
const labels = ${JSON.stringify(TABLE_LABELS)};
const order = ${JSON.stringify(DATA_TABLE_ORDER)};
let current = 'issues';

function rowsFor(key) {
  if (key === 'issues') return app.issues || [];
  if (key === 'sources') return app.source.files || [];
  if (key === '${SOURCE_CSV_TABLE_KEY}') return app.source.csvRows || [];
  if (key === '${SOURCE_CONTENT_TABLE_KEY}') return app.source.contentRows || [];
  const value = app.data[key];
  if (Array.isArray(value)) return value;
  if (value && typeof value === 'object') return Object.entries(value).map(([key, val]) => (val && typeof val === 'object' && !Array.isArray(val)) ? Object.assign({ key }, val) : { key, value: val });
  return [];
}
function scalar(v) {
  if (v == null) return '';
  if (Array.isArray(v)) return v.join(', ');
  if (typeof v === 'object') return JSON.stringify(v);
  return String(v);
}
function columnsFor(rows) {
  const priority = ['severity','table','rowKey','field','message','path','sourcePath','format','csvFile','rowNumber','keyPath','value','valueType','rows','parseStatus','id','petId','waveId','name','element','quality','role','hp','atk','shield','ap','mechanics','shapeId','status','note'];
  const keys = new Set();
  rows.slice(0, 120).forEach(row => Object.keys(row || {}).forEach(k => keys.add(k)));
  return [...priority.filter(k => keys.has(k)), ...[...keys].filter(k => !priority.includes(k)).slice(0, 18)];
}
function rowHasIssue(key, row) {
  if (key === 'issues') return true;
  const id = row.id || row.petId || row.waveId || row.nodeId || row.encounterId || row.key || row.name;
  return (app.issues || []).some(issue => issue.table === key && (!id || issue.rowKey === id));
}
function renderSummary() {
  const source = app.source.filesByFormat || {};
  const totalTables = order.filter(k => rowsFor(k).length).length;
  document.getElementById('summary').innerHTML = [
    ['生成日期', app.generatedAt],
    ['运行源', app.source.runtime ? app.source.runtime.mode : 'unknown'],
    ['表', totalTables],
    ['error', app.issueCounts.error || 0],
    ['warn', app.issueCounts.warn || 0],
    ['xlsx', source.xlsx ? source.xlsx.count : 0],
    ['csv', source.csv ? source.csv.count : 0],
    ['json', source.json ? source.json.count : 0],
    ['yaml', source.yaml ? source.yaml.count : 0]
  ].map(([k,v]) => '<span class="chip">' + k + ' <strong>' + v + '</strong></span>').join('');
}
function renderNav() {
  const items = [['issues','异常'], ['sources','来源文件'], ['${SOURCE_CSV_TABLE_KEY}','${SOURCE_CSV_TABLE_LABEL}'], ['${SOURCE_CONTENT_TABLE_KEY}','${SOURCE_CONTENT_TABLE_LABEL}']].concat(order.map(k => [k, labels[k] || k]));
  document.getElementById('nav').innerHTML = items.map(([key,label]) => {
    const count = rowsFor(key).length;
    return '<button class="nav-btn ' + (key === current ? 'active' : '') + '" data-key="' + key + '"><span>' + label + '</span><span>' + count + '</span></button>';
  }).join('');
  document.querySelectorAll('.nav-btn').forEach(btn => btn.onclick = () => { current = btn.dataset.key; render(); });
}
function renderTable() {
  const search = document.getElementById('search').value.trim().toLowerCase();
  const issueFilter = document.getElementById('issueFilter').value;
  const formatFilter = document.getElementById('formatFilter').value;
  let rows = rowsFor(current).map((row, index) => Object.assign({ __index: index + 1 }, row));
  if (issueFilter === 'issues') rows = rows.filter(row => rowHasIssue(current, row));
  if (formatFilter !== 'all' && current === 'sources') rows = rows.filter(row => row.format === formatFilter);
  if (formatFilter !== 'all' && current === '${SOURCE_CSV_TABLE_KEY}') rows = rows.filter(row => row.format === formatFilter || (formatFilter === 'xlsx' && row.format === 'xlsx-derived'));
  if (formatFilter !== 'all' && current === '${SOURCE_CONTENT_TABLE_KEY}') rows = rows.filter(row => row.format === formatFilter);
  if (search) rows = rows.filter(row => JSON.stringify(row).toLowerCase().includes(search));
  const cols = columnsFor(rows);
  document.getElementById('panelTitle').textContent = current === 'issues' ? '异常' : current === 'sources' ? '来源文件' : current === '${SOURCE_CSV_TABLE_KEY}' ? '${SOURCE_CSV_TABLE_LABEL}' : current === '${SOURCE_CONTENT_TABLE_KEY}' ? '${SOURCE_CONTENT_TABLE_LABEL}' : (labels[current] || current);
  document.getElementById('panelSub').textContent = rows.length + ' 行；当前筛选来自 runtime JSON 审核视图';
  if (!rows.length) {
    document.getElementById('table').innerHTML = '<div class="empty">没有匹配行。</div>';
    return;
  }
  const head = '<thead><tr>' + cols.map(c => '<th>' + c + '</th>').join('') + '<th>完整行</th></tr></thead>';
  const body = rows.map(row => {
    const cells = cols.map(c => {
      const value = scalar(row[c]);
      if (c === 'severity') return '<td class="severity-' + value + '">' + value + '</td>';
      if (c === 'format') return '<td><span class="format format-' + value + '">' + value + '</span></td>';
      return '<td>' + (value.length > 80 ? '<code>' + html(value.slice(0, 77) + '...') + '</code>' : html(value)) + '</td>';
    }).join('');
    return '<tr>' + cells + '<td><details><summary>JSON</summary><pre>' + html(JSON.stringify(row, null, 2)) + '</pre></details></td></tr>';
  }).join('');
  document.getElementById('table').innerHTML = '<table>' + head + '<tbody>' + body + '</tbody></table>';
}
function html(value) {
  return String(value == null ? '' : value).replace(/[&<>"]/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[ch]));
}
function render() {
  renderSummary();
  renderNav();
  renderTable();
}
document.getElementById('search').oninput = renderTable;
document.getElementById('issueFilter').onchange = renderTable;
document.getElementById('formatFilter').onchange = renderTable;
render();
</script>
</body>
</html>
`;
}

function appPayloadJson(payload) {
  return JSON.stringify({
    generatedAt: payload.generatedAt,
    counts: payload.counts,
    issues: payload.issues,
    issueCounts: payload.issueCounts,
    source: payload.source,
    data: payload.data
  }).replace(/</g, '\\u003c');
}

function renderMobileHtml(payload) {
  const appJson = appPayloadJson(payload);
  return `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>元素背包史手机数据</title>
<style>
:root{color-scheme:light;--bg:#f4f6f8;--panel:#fff;--ink:#111827;--muted:#6b7280;--line:#d6dce5;--accent:#1d4ed8;--accent-soft:#e8f0ff;--warn:#a15c07;--bad:#b42318;--green:#087443}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--ink);font:15px/1.45 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
header{position:sticky;top:0;z-index:5;background:rgba(255,255,255,.96);border-bottom:1px solid var(--line);padding:12px 14px 10px;backdrop-filter:blur(10px)}
h1{font-size:19px;margin:0 0 8px;letter-spacing:0}
.summary{display:flex;gap:6px;overflow-x:auto;padding-bottom:2px}
.chip{flex:0 0 auto;border:1px solid var(--line);border-radius:7px;background:#fff;padding:5px 8px;color:var(--muted);font-size:12px}
.chip strong{color:var(--ink);font-size:13px}
.controls{display:grid;grid-template-columns:1fr 1fr;gap:8px;padding:10px 12px;background:#eef2f6;border-bottom:1px solid var(--line);position:sticky;top:75px;z-index:4}
.controls input{grid-column:1/-1}
input,select{width:100%;min-height:42px;border:1px solid var(--line);border-radius:8px;background:#fff;padding:8px 10px;font:inherit;color:var(--ink)}
main{padding:10px 10px 70px}
.list-head{display:flex;align-items:center;justify-content:space-between;gap:10px;margin:2px 2px 10px;color:var(--muted);font-size:13px}
.pill{border-radius:999px;background:var(--accent-soft);color:var(--accent);padding:3px 8px;font-weight:650}
.card{background:var(--panel);border:1px solid var(--line);border-radius:8px;margin-bottom:9px;overflow:hidden}
.card-main{padding:10px 11px}
.card-top{display:flex;justify-content:space-between;gap:10px;align-items:flex-start;margin-bottom:7px}
.title{font-weight:750;min-width:0;overflow-wrap:anywhere}
.meta{color:var(--muted);font-size:12px;white-space:nowrap}
.kv{display:grid;grid-template-columns:minmax(72px,35%) 1fr;gap:4px 8px;font-size:13px}
.key{color:var(--muted)}
.val{overflow-wrap:anywhere}
.format{display:inline-block;border-radius:5px;padding:2px 6px;background:#eef2f6;color:#344054;font-size:12px}
.format-json{background:#e9f8ef;color:#067647}
.format-yaml{background:#fff4e5;color:#a15c07}
.format-csv{background:#eef4ff;color:#175cd3}
.format-xlsx,.format-xlsx-derived{background:#f4f3ff;color:#5925dc}
.severity-error{color:var(--bad);font-weight:750}
.severity-warn{color:var(--warn);font-weight:750}
details{border-top:1px solid #edf0f5}
summary{padding:9px 11px;color:var(--accent);font-weight:650;cursor:pointer}
pre{margin:0;padding:0 11px 11px;white-space:pre-wrap;overflow-wrap:anywhere;font:12px/1.45 ui-monospace,SFMono-Regular,Menlo,monospace;color:#374151}
.empty{padding:28px 12px;color:var(--muted);text-align:center}
@media (min-width:760px){body{max-width:760px;margin:0 auto;border-left:1px solid var(--line);border-right:1px solid var(--line)}.controls{top:75px}.card-main{padding:12px 14px}.kv{grid-template-columns:150px 1fr}}
</style>
</head>
<body>
<header>
  <h1>元素背包史手机数据</h1>
  <div class="summary" id="summary"></div>
</header>
<section class="controls">
  <input id="search" type="search" placeholder="搜索 ID、名称、字段、值、来源">
  <select id="tableSelect"></select>
  <select id="filterSelect">
    <option value="all">全部</option>
    <option value="issues">只看异常</option>
    <option value="json">JSON</option>
    <option value="yaml">YAML</option>
    <option value="csv">CSV</option>
    <option value="xlsx">XLSX/总表派生</option>
  </select>
</section>
<main>
  <div class="list-head"><span id="listTitle"></span><span class="pill" id="rowCount"></span></div>
  <div id="list"></div>
</main>
<script id="app-data" type="application/json">${appJson}</script>
<script>
const app = JSON.parse(document.getElementById('app-data').textContent);
const labels = ${JSON.stringify(TABLE_LABELS)};
const order = ${JSON.stringify(DATA_TABLE_ORDER)};
const sourceCsvKey = '${SOURCE_CSV_TABLE_KEY}';
const sourceContentKey = '${SOURCE_CONTENT_TABLE_KEY}';
const tableItems = [['issues','异常'], ['sources','来源文件'], [sourceCsvKey,'CSV/总表派生表'], [sourceContentKey,'JSON/YAML配置内容']].concat(order.map(k => [k, labels[k] || k]));

function rowsFor(key) {
  if (key === 'issues') return app.issues || [];
  if (key === 'sources') return app.source.files || [];
  if (key === sourceCsvKey) return app.source.csvRows || [];
  if (key === sourceContentKey) return app.source.contentRows || [];
  const value = app.data[key];
  if (Array.isArray(value)) return value;
  if (value && typeof value === 'object') return Object.entries(value).map(([key, val]) => (val && typeof val === 'object' && !Array.isArray(val)) ? Object.assign({ key }, val) : { key, value: val });
  return [];
}
function html(value) {
  return String(value == null ? '' : value).replace(/[&<>"]/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[ch]));
}
function scalar(value) {
  if (value == null) return '';
  if (Array.isArray(value)) return value.join(', ');
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}
function keyFor(row) {
  return row.id || row.petId || row.waveId || row.nodeId || row.encounterId || row.csvFile || row.path || row.sourcePath || row.keyPath || row.name || row.message || '';
}
function titleFor(key, row) {
  if (key === 'issues') return row.rowKey ? row.table + ' / ' + row.rowKey : row.message;
  if (key === 'sources') return row.path;
  if (key === sourceCsvKey) return row.csvFile + ' #' + row.rowNumber;
  if (key === sourceContentKey) return row.keyPath || row.sourcePath;
  return row.name || row.id || row.petId || row.waveId || row.nodeId || row.encounterId || row.key || keyFor(row) || '(无标题)';
}
function fieldPriority(key, row) {
  if (key === 'issues') return ['severity','table','rowKey','field','message'];
  if (key === 'sources') return ['format','path','rows','parseStatus','bytes'];
  if (key === sourceCsvKey) return ['format','sourcePath','csvFile','rowNumber','宠物ID','名称','机制ID','shape_id','quality','note'];
  if (key === sourceContentKey) return ['format','sourcePath','keyPath','value','valueType'];
  return ['id','petId','waveId','name','element','quality','role','hp','atk','shield','ap','mechanics','shapeId','status','note'];
}
function compactFields(key, row) {
  const priority = fieldPriority(key, row);
  const keys = [];
  for (const item of priority) if (Object.prototype.hasOwnProperty.call(row, item)) keys.push(item);
  for (const item of Object.keys(row)) {
    if (item.startsWith('__') || keys.includes(item)) continue;
    keys.push(item);
    if (keys.length >= 8) break;
  }
  return keys.slice(0, 8);
}
function rowHasIssue(key, row) {
  if (key === 'issues') return true;
  const id = keyFor(row);
  return (app.issues || []).some(issue => issue.table === key && (!id || issue.rowKey === id));
}
function passesFilter(key, row, filter) {
  if (filter === 'all') return true;
  if (filter === 'issues') return rowHasIssue(key, row);
  if (filter === 'xlsx') return row.format === 'xlsx' || row.format === 'xlsx-derived';
  return row.format === filter;
}
function renderSummary() {
  const source = app.source.filesByFormat || {};
  const values = [
    ['运行源', app.source.runtime ? app.source.runtime.mode : 'unknown'],
    ['表', order.filter(k => rowsFor(k).length).length],
    ['error', app.issueCounts.error || 0],
    ['warn', app.issueCounts.warn || 0],
    ['csv行', (app.source.csvRows || []).length],
    ['配置行', (app.source.contentRows || []).length],
    ['json', source.json ? source.json.count : 0],
    ['yaml', source.yaml ? source.yaml.count : 0]
  ];
  document.getElementById('summary').innerHTML = values.map(([k,v]) => '<span class="chip">' + k + ' <strong>' + v + '</strong></span>').join('');
}
function renderOptions() {
  const select = document.getElementById('tableSelect');
  select.innerHTML = tableItems.map(([key,label]) => '<option value="' + key + '">' + label + ' · ' + rowsFor(key).length + '</option>').join('');
}
function renderList() {
  const tableKey = document.getElementById('tableSelect').value || 'issues';
  const query = document.getElementById('search').value.trim().toLowerCase();
  const filter = document.getElementById('filterSelect').value;
  let rows = rowsFor(tableKey).map((row, index) => Object.assign({ __index: index + 1 }, row));
  rows = rows.filter(row => passesFilter(tableKey, row, filter));
  if (query) rows = rows.filter(row => JSON.stringify(row).toLowerCase().includes(query));
  document.getElementById('listTitle').textContent = tableItems.find(item => item[0] === tableKey)?.[1] || tableKey;
  document.getElementById('rowCount').textContent = rows.length + ' 行';
  if (!rows.length) {
    document.getElementById('list').innerHTML = '<div class="empty">没有匹配数据。</div>';
    return;
  }
  document.getElementById('list').innerHTML = rows.slice(0, 300).map(row => {
    const fields = compactFields(tableKey, row);
    const meta = row.format ? '<span class="format format-' + html(row.format) + '">' + html(row.format) + '</span>' : '#' + row.__index;
    const body = fields.map(k => '<div class="key">' + html(k) + '</div><div class="val ' + (k === 'severity' ? 'severity-' + html(row[k]) : '') + '">' + html(scalar(row[k])) + '</div>').join('');
    return '<article class="card"><div class="card-main"><div class="card-top"><div class="title">' + html(titleFor(tableKey, row)) + '</div><div class="meta">' + meta + '</div></div><div class="kv">' + body + '</div></div><details><summary>完整字段</summary><pre>' + html(JSON.stringify(row, null, 2)) + '</pre></details></article>';
  }).join('') + (rows.length > 300 ? '<div class="empty">已显示前 300 行，请继续搜索缩小范围。</div>' : '');
}
function render() {
  renderSummary();
  renderOptions();
  renderList();
}
document.getElementById('search').oninput = renderList;
document.getElementById('tableSelect').onchange = renderList;
document.getElementById('filterSelect').onchange = renderList;
render();
</script>
</body>
</html>
`;
}

function buildRuntimeDataReport(options = {}) {
  const root = options.root || ROOT;
  const runtimeJsonPath = options.runtimeJsonPath || DEFAULT_RUNTIME_JSON;
  const reportHtmlPath = options.reportHtmlPath || DEFAULT_REPORT_HTML;
  const reportMobileHtmlPath = options.reportMobileHtmlPath || DEFAULT_REPORT_MOBILE_HTML;
  const webDataJsonPath = options.webDataJsonPath || DEFAULT_WEB_DATA_JSON;
  const webReportHtmlPath = options.webReportHtmlPath || DEFAULT_WEB_REPORT_HTML;
  const webMobileHtmlPath = options.webMobileHtmlPath || DEFAULT_WEB_MOBILE_HTML;
  const sourceMode = options.sourceMode || DEFAULT_SOURCE_MODE;
  const payload = buildRuntimePayload({ root, sourceMode });
  const html = renderHtml(payload);
  const mobileHtml = renderMobileHtml(payload);
  if (options.writeFiles !== false) {
    const jsonText = `${JSON.stringify(payload, null, 2)}\n`;
    for (const filePath of [runtimeJsonPath, webDataJsonPath]) {
      ensureDir(filePath);
      fs.writeFileSync(filePath, jsonText);
    }
    for (const [filePath, text] of [
      [reportHtmlPath, html],
      [reportMobileHtmlPath, mobileHtml],
      [webReportHtmlPath, html],
      [webMobileHtmlPath, mobileHtml]
    ]) {
      ensureDir(filePath);
      fs.writeFileSync(filePath, text);
    }
  }
  return {
    payload,
    html,
    mobileHtml,
    runtimeJsonPath,
    reportHtmlPath,
    reportMobileHtmlPath,
    webDataJsonPath,
    webReportHtmlPath,
    webMobileHtmlPath
  };
}

function parseArgs(argv) {
  const out = { sourceMode: DEFAULT_SOURCE_MODE };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--source') {
      out.sourceMode = argv[i + 1] || DEFAULT_SOURCE_MODE;
      i += 1;
      continue;
    }
    if (arg === '--csv') {
      out.sourceMode = 'csv';
      continue;
    }
    if (arg === '--workbook') {
      out.sourceMode = 'workbook';
      continue;
    }
    if (arg === '--help' || arg === '-h') {
      out.help = true;
      continue;
    }
    throw new Error(`unknown argument: ${arg}`);
  }
  return out;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log('Usage: node tools/build_runtime_data_report.cjs [--source workbook|csv] [--workbook] [--csv]');
    console.log('Default source: workbook. Workbook mode writes no persisted intermediate CSV.');
    return;
  }
  const result = buildRuntimeDataReport({ sourceMode: args.sourceMode });
  console.log(`runtime JSON: ${rel(ROOT, result.runtimeJsonPath)}`);
  console.log(`HTML report: ${rel(ROOT, result.reportHtmlPath)}`);
  console.log(`mobile report: ${rel(ROOT, result.reportMobileHtmlPath)}`);
  console.log(`public web data: ${rel(ROOT, result.webDataJsonPath)}`);
  console.log(`public web mobile: ${rel(ROOT, result.webMobileHtmlPath)}`);
  console.log(`source: ${result.payload.source.runtime.mode}`);
  console.log(`tables: ${Object.keys(result.payload.counts).length}`);
  console.log(`issues: ${JSON.stringify(result.payload.issueCounts)}`);
}

if (require.main === module) main();

module.exports = {
  DATA_TABLE_ORDER,
  TABLE_LABELS,
  buildRuntimePayload,
  buildRuntimeDataReport,
  collectSourceFiles,
  collectSourceContentRows,
  collectCsvContentRows,
  materializeRuntimeCsvSource,
  validateRuntimeData,
  renderHtml,
  renderMobileHtml
};
