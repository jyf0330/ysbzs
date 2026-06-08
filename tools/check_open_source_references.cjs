#!/usr/bin/env node
/**
 * check_open_source_references.cjs — 校验脚本
 *
 * 验证：
 *   1. openSourceReferenceMap 包含 7/7 个来源
 *   2. 每个来源都有 urls 且不空
 *   3. 每个来源都有 mode
 *   4. 每个来源映射到至少一个 local module
 *   5. 4 个新模块可 require
 *   6. 模块 smoke test 能跑
 */

let pass = 0, fail = 0;
function assert(cond, msg) { if (cond) { pass++; } else { fail++; console.error('FAIL', msg); } }

// 1. 引用映射
const { listReferences, getReference } = require('../src/core/openSourceReferenceMap.cjs');
const refs = listReferences();
assert(refs.length === 7, `openSourceReferenceMap: 7/7 sources (got ${refs.length})`);
for (const r of refs) {
  assert(r.urls && Array.isArray(r.urls) && r.urls.length > 0, `reference ${r.id} has urls`);
  assert(r.urls.every(u => u.startsWith('http')), `reference ${r.id} urls start with http`);
  assert(r.mode && typeof r.mode === 'string', `reference ${r.id} has mode`);
  assert(r.local && r.local.length > 0, `reference ${r.id} maps to >=1 local module`);
}

// 2. 模块可 require
const modules = [
  { name: 'tacticalTargeting', path: '../src/core/tacticalTargeting.cjs' },
  { name: 'actionSpaceAnalyzer', path: '../src/core/actionSpaceAnalyzer.cjs' },
  { name: 'scenarioRunner', path: '../src/core/scenarioRunner.cjs' },
  { name: 'moduleManifest', path: '../src/core/moduleManifest.cjs' }
];
for (const m of modules) {
  try {
    const mod = require(m.path);
    assert(typeof mod === 'object' || typeof mod === 'function', `${m.name} require ok`);
  } catch (e) {
    assert(false, `${m.name} require: ${e.message}`);
  }
}

// 3. 模块 smoke test
try {
  const { listLegalTargets, buildTargetingPreview } = require('../src/core/tacticalTargeting.cjs');
  const mockState = { units: [{ id: 'u1', side: 'hero', alive: true, hp: 10, position: { r: 3, c: 3 } }] };
  const targets = listLegalTargets(mockState, mockState.units[0], { maxRange: 1, target: 'empty_cell' });
  assert(Array.isArray(targets), 'tacticalTargeting.listLegalTargets returns array');
} catch (e) {
  assert(false, 'tacticalTargeting smoke: ' + e.message);
}

try {
  const { actionSpaceReport } = require('../src/core/actionSpaceAnalyzer.cjs');
  const result = actionSpaceReport({ units: [], phase: 'player_turn' }, { side: 'hero' });
  assert(result.side === 'hero', 'actionSpaceAnalyzer returns correct side');
} catch (e) {
  assert(false, 'actionSpaceAnalyzer smoke: ' + e.message);
}

try {
  const { runScenario } = require('../src/core/scenarioRunner.cjs');
  const def = { state: {}, phase: 'init', actions: [], assertions: [{ path: 'phase', equals: 'init' }] };
  const out = runScenario(def);
  assert(out.ok === true, 'scenarioRunner.runScenario returns ok');
} catch (e) {
  assert(false, 'scenarioRunner smoke: ' + e.message);
}

try {
  const { buildModuleManifest } = require('../src/core/moduleManifest.cjs');
  const manifest = buildModuleManifest({ board: { rows: 8, cols: 8 }, units: [], leaders: {} });
  assert(manifest.moduleId === 'ysbzs_v1', 'moduleManifest has default moduleId');
  assert(manifest.board.rows === 8, 'moduleManifest has board dimensions');
} catch (e) {
  assert(false, 'moduleManifest smoke: ' + e.message);
}

// 4. 汇总
console.log(`\nPASS ${pass}/${pass + fail} checks`);
if (fail > 0) { console.error(`FAIL ${fail} checks`); process.exit(1); }
