#!/usr/bin/env node
const fs = require('fs');

function readJson(file) {
  if (!file) throw new Error('usage: node tools/inspect_state_diff.cjs before.json after.json');
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}
function isObj(v) { return v && typeof v === 'object' && !Array.isArray(v); }
function deepDiff(before, after, path = '') {
  const diffs = [];
  if (before === after) return diffs;
  if (Array.isArray(before) || Array.isArray(after)) {
    const a = Array.isArray(before) ? before : [];
    const b = Array.isArray(after) ? after : [];
    const n = Math.max(a.length, b.length);
    for (let i = 0; i < n; i++) diffs.push(...deepDiff(a[i], b[i], `${path}[${i}]`));
    return diffs;
  }
  if (isObj(before) && isObj(after)) {
    const keys = new Set([...Object.keys(before), ...Object.keys(after)]);
    for (const k of [...keys].sort()) diffs.push(...deepDiff(before[k], after[k], path ? `${path}.${k}` : k));
    return diffs;
  }
  diffs.push({ path: path || '$', from: before, to: after, reason: typeof before === typeof after ? 'value_change' : 'type_change' });
  return diffs;
}

try {
  const before = readJson(process.argv[2]);
  const after = readJson(process.argv[3]);
  const diffs = deepDiff(before, after);
  console.log(JSON.stringify({ ok: true, count: diffs.length, diffs }, null, 2));
  process.exit(0);
} catch (err) {
  console.error(err.message || String(err));
  process.exit(1);
}
