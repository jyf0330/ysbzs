const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.join(__dirname, '..', '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');

test('battle debug page prepares a saved route state and opens the battle page entry', () => {
  const html = read('web/battle-debug.html');
  const js = read('web/battle-debug.js');
  const css = read('web/battle-debug.css');

  assert.match(html, /<title>元素背包史 · 战斗调试<\/title>/, 'debug page should have a clear document title');
  assert.match(html, /id="prepare-route-btn"/, 'debug page should expose one-click route preparation');
  assert.match(html, /id="enter-battle-btn"/, 'debug page should expose battle-node entry');
  assert.match(html, /id="battle-page-link"/, 'debug page should expose a link to the battle page');
  assert.match(html, /src="js\/local-engine\.js"/, 'debug page should load local engine for runtime=local checks');
  assert.ok(html.indexOf('src="js/local-engine.js"') < html.indexOf('src="battle-debug.js"'), 'local engine must load before page module');

  assert.match(js, /createGameRuntime/, 'debug page should use the shared runtime client');
  assert.match(js, /mode:\s*params\.get\('runtime'\)\s*\|\|\s*'http'/, 'debug page should default to HTTP runtime on 4173');
  assert.match(js, /runtime\.view\(\)/, 'debug page should read state through /api/view');
  assert.match(js, /runtime\.action/, 'debug page should mutate only through /api/action');
  assert.match(js, /runtime\.save\(\)/, 'debug page should persist the prepared debug state via runtime save');
  assert.match(js, /runtime\.load\(/, 'debug page should restore saved debug state via runtime load');
  assert.match(js, /BATTLE_DEBUG_SAVE_KEY/, 'debug page should use a dedicated local debug save key');
  assert.match(js, /function prepareRouteBattleDebugState/, 'debug page should implement a reusable setup flow');
  assert.match(js, /function runRouteAction/, 'debug page should execute route actions from ViewModel');
  assert.match(js, /vm\?\.dailyFlow\?\.primaryAction/, 'debug page should consume primaryAction from ViewModel');
  assert.match(js, /vm\?\.dailyFlow\?\.autoAction/, 'debug page should consume autoAction from ViewModel');
  assert.match(js, /GENERATE_NODE_OPTIONS/, 'debug setup should generate the two 3-choice events through public commands');
  assert.match(js, /PICK_NODE/, 'debug setup should choose two event nodes through public commands');
  assert.match(js, /isBattleEntryAction\(action\)/, 'battle entry should be gated by route battle entry action detection');
  assert.match(js, /battlePageHref\(\)/, 'battle page link should preserve runtime/session query params');
  assert.match(js, /window\.location\.assign\(battlePageHref\(\)\)/, 'entry button should open the battle page instead of resolving the fixed battle');
  assert.doesNotMatch(js, /require\(|src\/core|uiAdapter\.cjs|createGameState|dispatch\(/, 'debug page must not bypass runtime with core imports');
  assert.match(css, /\.debug-shell/, 'debug page should have its own stylesheet namespace');
});
