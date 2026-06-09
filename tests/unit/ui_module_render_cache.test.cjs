const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..', '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');

test('UI01 browser app boots through an ES module entry instead of the old script tag', () => {
  const html = read('web/index.html');
  assert.match(html, /<script\s+type="module"\s+src="js\/main\.js"><\/script>/);
  assert.doesNotMatch(html, /<script\s+src="ux-app\.js"><\/script>/);
});

test('UI02 app logic is split into focused ES modules', () => {
  const required = [
    'web/js/main.js',
    'web/js/constants.js',
    'web/js/dom.js',
    'web/js/state.js',
    'web/js/api.js',
    'web/js/render-cache.js'
  ];
  for (const file of required) assert.equal(fs.existsSync(path.join(root, file)), true, `${file} should exist`);
  const main = read('web/js/main.js');
  for (const moduleName of ['./constants.js', './dom.js', './state.js', './api.js', './render-cache.js']) {
    assert.match(main, new RegExp(`from ['"]${moduleName.replace('.', '\\.')}['"]`));
  }
});

test('UI03 render cache prevents unchanged sections from doing full DOM rebuild work', () => {
  const cacheSrc = read('web/js/render-cache.js');
  assert.match(cacheSrc, /export function createRenderCache/);
  assert.match(cacheSrc, /shouldRender/);
  const main = read('web/js/main.js');
  assert.match(main, /renderCache\.shouldRender\('heroes'/);
  assert.match(main, /renderCache\.shouldRender\('board'/);
  assert.match(main, /renderCache\.shouldRender\('slots'/);
  assert.match(main, /renderStaticStatus\(vm\)/);
});
