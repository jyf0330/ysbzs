#!/usr/bin/env node
/**
 * check_open_source_references.cjs — 校验脚本
 *
 * 验证：
 *   1. openSourceReferenceMap 包含 7/7 个来源
 *   2. 每个来源都有 urls 且不空
 *   3. 每个来源都有 integrationLevel
 *   4. 每个来源映射到至少一个 ysbzs module
 *   5. 6 个新模块可 require
 *   6. 模块 smoke test 能跑
 */

let pass = 0, fail = 0;
function assert(cond, msg) { if (cond) { pass++; } else { fail++; console.error('FAIL', msg); } }

// 1. 引用映射
const { getReferenceMap, countReferences } = require('../src/core/openSourceReferenceMap.cjs');
const refs = getReferenceMap();
assert(countReferences() === 7, `openSourceReferenceMap: 7/7 sources (got ${countReferences()})`);
for (const r of refs) {
  assert(r.urls && Array.isArray(r.urls) && r.urls.length > 0, `reference ${r.id} has urls`);
  assert(r.urls.every(u => u.startsWith('http')), `reference ${r.id} urls start with http`);
  assert(r.integrationLevel && ['direct', 'design_reference'].includes(r.integrationLevel), `reference ${r.id} has valid integrationLevel`);
  assert(r.ysbzsModules && r.ysbzsModules.length > 0, `reference ${r.id} maps to >=1 ysbzs module`);
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
  const { getLegalMoves, getAttackCells } = require('../src/core/tacticalTargeting.cjs');
  const mockState = { units: [{ id: 'u1', side: 'hero', alive: true, hp: 10, position: { r: 3, c: 3 }, ap: 3 }] };
  const moves = getLegalMoves(mockState, mockState.units[0]);
  assert(Array.isArray(moves), 'tacticalTargeting.getLegalMoves returns array');
} catch (e) {
  assert(false, 'tacticalTargeting smoke: ' + e.message);
}

try {
  const { analyzeActionSpace } = require('../src/core/actionSpaceAnalyzer.cjs');
  const result = analyzeActionSpace({ units: [] }, 'hero');
  assert(result.side === 'hero', 'actionSpaceAnalyzer returns correct side');
} catch (e) {
  assert(false, 'actionSpaceAnalyzer smoke: ' + e.message);
}

try {
  const { runScenario } = require('../src/core/scenarioRunner.cjs');
  const result = runScenario({ scenarioId: 'nonexistent' });
  assert(result.scenarioId === 'nonexistent', 'scenarioRunner returns scenarioId');
} catch (e) {
  assert(false, 'scenarioRunner smoke: ' + e.message);
}

try {
  const { getManifest } = require('../src/core/moduleManifest.cjs');
  const m = getManifest();
  assert(m.activeElements.length === 3, 'moduleManifest has 3 active elements');
  assert(m.coreModules.length >= 10, 'moduleManifest has >=10 core modules');
} catch (e) {
  assert(false, 'moduleManifest smoke: ' + e.message);
}

// 4. 汇总
console.log(`\nPASS ${pass}/${pass + fail} checks`);
if (fail > 0) { console.error(`FAIL ${fail} checks`); process.exit(1); }
