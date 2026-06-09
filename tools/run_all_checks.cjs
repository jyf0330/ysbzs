#!/usr/bin/env node
const { spawnSync } = require('child_process');

const steps = [
  ['core legacy tests', process.execPath, ['tests/run_all_tests.cjs']],
  ['unit tests', 'npm', ['run', 'test:unit']],
  ['ui adapter tests', 'npm', ['run', 'test:ui']],
  ['full coverage tests', 'npm', ['run', 'test:full']],
  ['player operation tests', 'npm', ['run', 'test:ops']],
  ['prediction authority tests', 'npm', ['run', 'test:prediction']],
  ['csv checks', 'npm', ['run', 'check:csv']],
  ['day7 checks', 'npm', ['run', 'check:day7']],
  ['dom isolation', 'npm', ['run', 'check:dom']],
  ['ui connected', 'npm', ['run', 'check:ui-connected']],
  ['strict browser flow', 'npm', ['run', 'check:browser']]
];

for (const [label, cmd, args] of steps) {
  console.log(`\n=== ${label} ===`);
  const r = spawnSync(cmd, args, { stdio: 'inherit', shell: process.platform === 'win32', timeout: label === 'strict browser flow' ? 150000 : 300000 });
  if (r.error) {
    console.error(r.error.message || String(r.error));
    process.exit(1);
  }
  if (r.status !== 0) process.exit(r.status || 1);
}
console.log('\nPASS all checks');
process.exit(0);
