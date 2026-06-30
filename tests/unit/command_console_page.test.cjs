const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const { PUBLIC_COMMANDS } = require('../../src/uiAdapterCommands.cjs');

const root = path.join(__dirname, '..', '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');

test('command console exposes current public commands through the shared runtime only', () => {
  const html = read('web/command-console.html');
  const js = read('web/command-console.js');
  const css = read('web/command-console.css');

  assert.match(html, /<title>元素背包史 · 命令控制台<\/title>/, 'console page should have a clear document title');
  assert.match(html, /id="command-list"/, 'console page should expose the command table');
  assert.match(html, /id="current-actions"/, 'console page should expose current ViewModel actions');
  assert.match(html, /id="payload-input"/, 'console page should expose editable payload JSON');
  assert.match(html, /id="run-command-btn"/, 'console page should expose an explicit run button');
  assert.match(html, /src="js\/local-engine\.js"/, 'console page should support runtime=local');
  assert.ok(html.indexOf('src="js/local-engine.js"') < html.indexOf('src="command-console.js"'), 'local engine must load before page module');

  assert.match(js, /createGameRuntime/, 'console page should use the shared runtime client');
  assert.match(js, /params\.set\('runtime', 'http'\)/, 'console page should default to HTTP runtime on 4173');
  assert.match(js, /runtime\.view\(\)/, 'console page should read state through /api/view');
  assert.match(js, /runtime\.action\(command\)/, 'console page should mutate only through /api/action');
  assert.match(js, /vm\?\.nextActions/, 'console page should render current public next actions from the ViewModel');
  assert.match(js, /baseStateVersion:\s*vm\?\.stateVersion/, 'console page should send the visible state version in the command envelope');
  assert.match(js, /EXPORT_REPLAY/, 'console page should retain replay export access');
  assert.doesNotMatch(js, /require\(|src\/core|uiAdapter\.cjs|createGameState|dispatch\(/, 'console page must not bypass runtime with core imports');
  assert.match(css, /\.console-shell/, 'console page should have its own stylesheet namespace');

  for (const command of PUBLIC_COMMANDS) {
    assert.match(js, new RegExp(`type: '${command}'`), `console command table should include ${command}`);
  }
});
