const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.join(__dirname, '..', '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');

test('main page hub links every major page as a town entry', () => {
  const html = read('web/main.html');
  const css = read('web/main.css');

  assert.match(html, /<title>元素背包史 · 主入口<\/title>/, 'main hub should have a clear document title');
  assert.match(html, /点哪个镇，就进哪个页面/, 'main hub should explain the town-entry model');

  for (const file of [
    'normal-game.html',
    'index.html',
    'daily-flow.html',
    'paper-battle.html',
    'battle-debug.html',
    'command-console.html',
    'puzzle-solver.html',
    'puzzle-submission.html'
  ]) {
    assert.match(html, new RegExp(`href="${file.replace('.', '\\.')}`), `main hub should link ${file}`);
  }

  for (const town of ['桃源镇', '演武场', '驿站', '纸上演武棚', '军机府', '命令阁', '解谜楼', '投稿铺']) {
    assert.match(html, new RegExp(town), `main hub should label town ${town}`);
  }

  assert.match(css, /\.town-grid/, 'main hub should style town entries');
  assert.match(css, /@media \(max-width:640px\)/, 'main hub should have a mobile layout');
  assert.doesNotMatch(html, /src="js\/local-engine\.js"|type="module"/, 'main hub should be a static navigator and not load game runtime directly');
});
