#!/usr/bin/env node
const fs = require('fs');

function readEvents(file) {
  if (!file) throw new Error('usage: node tools/compare_replays.cjs replay-a.json replay-b.json');
  const json = JSON.parse(fs.readFileSync(file, 'utf8'));
  return Array.isArray(json) ? json : (json.events || json.trace?.events || json.battleTrace || []);
}
function comparable(e) {
  if (!e) return null;
  return {
    type: e.type,
    text: e.text || '',
    unitId: e.unitId || e.actorId || e.sourceId || null,
    targetId: e.targetId || null,
    r: e.r ?? e.cell?.r ?? e.to?.r ?? null,
    c: e.c ?? e.cell?.c ?? e.to?.c ?? null,
    amount: e.amount ?? e.damage ?? e.final ?? null
  };
}

try {
  const a = readEvents(process.argv[2]).map(comparable);
  const b = readEvents(process.argv[3]).map(comparable);
  const mismatches = [];
  const n = Math.max(a.length, b.length);
  for (let i = 0; i < n; i++) {
    if (JSON.stringify(a[i] || null) !== JSON.stringify(b[i] || null)) mismatches.push({ index: i, a: a[i] || null, b: b[i] || null });
  }
  if (mismatches.length) {
    console.log(JSON.stringify({ ok: false, count: mismatches.length, mismatches }, null, 2));
    process.exit(1);
  }
  console.log(JSON.stringify({ ok: true, message: 'PASS: event sequences are equivalent', length: a.length }, null, 2));
} catch (err) {
  console.error(err.message || String(err));
  process.exit(1);
}
