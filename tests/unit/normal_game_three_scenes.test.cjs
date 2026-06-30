const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.join(__dirname, '..', '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');

test('normal game page splits route shop and battle into three scenes', () => {
  const html = read('web/normal-game.html');
  const css = read('web/normal-game.css');
  const js = read('web/normal-game.js');

  assert.match(html, /<title>元素背包史 · 正常游戏<\/title>/, 'page should have its own normal-game title');
  assert.match(html, /id="route-scene"/, 'page needs a 3-choice route scene');
  assert.match(html, /id="shop-scene"/, 'page needs a shop scene');
  assert.match(html, /id="battle-scene"/, 'page needs a battle scene');
  assert.match(html, /id="route-active-list"/, 'route scene should expose active lineup');
  assert.match(html, /id="route-bench-list"/, 'route scene should expose bench roster');
  assert.match(html, /id="shop-active-list"/, 'shop scene should expose active lineup');
  assert.match(html, /id="shop-bench-list"/, 'shop scene should expose bench roster');
  assert.match(html, /src="js\/local-engine\.js"/, 'page should support local runtime');
  assert.ok(html.indexOf('src="js/local-engine.js"') < html.indexOf('src="normal-game.js"'), 'local engine must load before page module');

  assert.match(css, /\.normal-shell/, 'normal page should have its own style namespace');
  assert.match(css, /\.scene\[data-active="true"\]/, 'scenes should use an explicit active state');
  assert.match(css, /\.roster-board/, 'route/shop roster areas need dedicated layout');
  assert.match(css, /\.battle-board/, 'battle scene needs a dedicated board layout');

  assert.match(js, /createGameRuntime/, 'normal page should use shared runtime client');
  assert.match(js, /runtime\.view\(\)/, 'normal page should read through /api/view');
  assert.match(js, /runtime\.action/, 'normal page should mutate only through /api/action');
  assert.match(js, /function sceneForPhase/, 'normal page should route ViewModel phase into scenes');
  assert.match(js, /function renderRouteScene/, 'normal page should render the 3-choice scene');
  assert.match(js, /function renderShopScene/, 'normal page should render the shop scene');
  assert.match(js, /function renderBattleScene/, 'normal page should render the battle scene');
  assert.match(js, /TOGGLE_UNIT_ACTIVE/, 'route/shop roster should expose public active roster toggles');
  assert.match(js, /上阵/, 'roster cards should show an active action');
  assert.match(js, /下阵/, 'roster cards should show a bench action');
  assert.match(js, /PICK_NODE/, 'route scene should support node 3-choice picks');
  assert.match(js, /BUY_OFFER/, 'shop scene should support buying offers');
  assert.match(js, /RUN_PLAYER_ALL_OUT/, 'battle scene should support the normal player action flow');
  assert.doesNotMatch(js, /require\(|src\/core|uiAdapter\.cjs|dispatch\(/, 'normal page must not import core or adapter directly');
});
