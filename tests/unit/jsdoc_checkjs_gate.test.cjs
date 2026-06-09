const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..', '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');

test('JD01 package exposes a checkJs validation script', () => {
  const pkg = JSON.parse(read('package.json'));
  assert.match(pkg.scripts['check:jsdoc'] || '', /checkJs|--checkJs/);
});

test('JD02 focused core battle modules opt into @ts-check and define public JSDoc contracts', () => {
  for (const file of [
    'src/core/battle/position.cjs',
    'src/core/battle/actions.cjs',
    'src/core/battle/preview.cjs',
    'src/core/battle/planning.cjs'
  ]) {
    const src = read(file);
    assert.match(src, /\/\/ @ts-check/, `${file} should opt into checkJs`);
    assert.match(src, /@param/, `${file} should document input contracts`);
    assert.match(src, /@returns?/, `${file} should document return contracts`);
  }
});
