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

test('UI03B top status bar exposes outer route progress, build core, and next step', () => {
  const html = read('web/index.html');
  const main = read('web/js/main.js');
  const css = read('web/ux-app.css');

  assert.match(html, /id="route-progress-label"/, 'top status should expose route progress');
  assert.match(html, /id="build-core-label"/, 'top status should expose build core');
  assert.match(html, /id="next-step-label"/, 'top status should expose next step');
  assert.match(main, /function routeProgressText\(vm\)/, 'renderStaticStatus should use a dedicated route progress helper');
  assert.match(main, /function nextStepText\(vm\)/, 'renderStaticStatus should use a dedicated next-step helper');
  assert.match(main, /vm\.buildCore\?\.summaryText/, 'build core label should read ViewModel buildCore');
  assert.match(css, /\.status-pill\.build-core/, 'build core pill needs compact readable styling');
  assert.match(css, /\.status-pill\.next-step/, 'next-step pill needs compact readable styling');
});

test('UI03C route option cards render structured choice consequence previews', () => {
  const main = read('web/js/main.js');
  const css = read('web/ux-app.css');

  assert.match(main, /battle_choice:\s*'遭遇选择'/, 'battle choice phase should render as player-readable Chinese');
  assert.match(main, /function renderChoicePreview\(option\)/, 'route cards should use a dedicated choice preview renderer');
  assert.match(main, /choicePreview/, 'route card renderer should read ViewModel choicePreview');
  assert.match(main, /class="choice-preview"/, 'route cards should include a consequence preview block');
  assert.match(main, /class="choice-meta"/, 'route cards should show compact tags/cost/gain metadata');
  assert.match(css, /\.choice-preview/, 'choice preview block needs explicit readable styling');
  assert.match(css, /\.choice-meta/, 'choice preview metadata needs explicit readable styling');
});

test('UI04 all-out flow rechecks the current ViewModel until no usable slots remain', () => {
  const main = read('web/js/main.js');
  assert.match(main, /function nextUsableSlotInfo\(/, 'all-out should use a helper that reads the latest slot state');
  assert.match(main, /function runAllOutCommand\(/, 'all-out should batch browser-triggered dispatches without full re-rendering every intermediate selection');
  assert.match(main, /function waitForUiIdle\(/, 'board movement should be able to wait out an in-flight selection command');
  assert.match(main, /RUN_PLAYER_ALL_OUT/, 'all-out should dispatch a single public batch command from the browser button');
  assert.match(main, /nextUsableSlotInfo\(\)/, 'all-out should find the next action block from the latest ViewModel each iteration');
  const runAllOutBody = main.match(/async function runAllOut\(\) \{([\s\S]*?)\n  \}/);
  assert.ok(runAllOutBody, 'runAllOut should exist');
  assert.doesNotMatch(runAllOutBody[1], /const order = slotsFlat\(\)/, 'all-out must not rely on a one-time slot snapshot');
  assert.doesNotMatch(runAllOutBody[1], /while \(ui\.vm\?\.phase === 'player_turn'/, 'all-out should not perform many browser network round trips in one click');
  assert.doesNotMatch(runAllOutBody[1], /runCommand\('SELECT_SLOT'/, 'all-out should not spend a full render cycle on every intermediate slot selection');
  assert.doesNotMatch(runAllOutBody[1], /attempted\.add/, 'all-out must not skip a slot before confirming the browser command succeeded');
});

test('UI05 board click moves selected hero before hover preview can turn the target into a sandbox unit', () => {
  const main = read('web/js/main.js');
  const clickBody = main.match(/async function onCellClick\(r, c\) \{([\s\S]*?)\n  \}\n\n\s*function renderCellDetail/);
  assert.ok(clickBody, 'onCellClick should exist');
  assert.match(clickBody[1], /const moveKey = `\$\{r\},\$\{c\}`/, 'click handler should key the clicked cell before async detail work');
  assert.match(clickBody[1], /const canMoveSelectedHero = .*legalMoveTargets\(hero\)\.has\(moveKey\)/, 'click handler should trust legal move targets instead of hovered sandbox occupancy');
  assert.match(clickBody[1], /await waitForUiIdle\(\)/, 'movement click should wait for an in-flight hero selection command instead of being swallowed by busy state');
  assert.ok(
    clickBody[1].indexOf('MOVE_HERO') < clickBody[1].indexOf("SELECT_CELL"),
    'MOVE_HERO should run before SELECT_CELL/GET_CELL_DETAIL so hover preview cannot swallow the movement click'
  );
  assert.ok(
    clickBody[1].indexOf('const canMoveSelectedHero') < clickBody[1].indexOf('const isHeroUnit'),
    'legal movement should be checked before hero-unit detection because hover previews can render the target as a sandbox hero'
  );
});

test('UI06 board hover preview is disabled so only clicks change the board interaction state', () => {
  const main = read('web/js/main.js');
  const css = read('web/ux-app.css');
  const eventBindingBody = main.match(/\$\('fullscreen-btn'\)[\s\S]*?\n  function scaleApp/);
  assert.ok(eventBindingBody, 'event binding section should exist');
  assert.doesNotMatch(eventBindingBody[0], /\$\('board'\)\.addEventListener\('mouseover'/, 'board should not update previews on hover');
  assert.doesNotMatch(eventBindingBody[0], /\$\('board'\)\.addEventListener\('mouseleave'/, 'board should not clear/re-render hover state on mouse leave');
  assert.doesNotMatch(main, /const hoverRisk =/, 'renderBoard should not derive sandbox previews from hover state');
  assert.doesNotMatch(main, /sandboxBoardCells/, 'renderBoard should not swap board cells from hover sandbox data');
  assert.doesNotMatch(css, /\.cell:hover/, 'board cells should not have CSS hover highlighting');
  assert.doesNotMatch(css, /hover-move-target/, 'unused hover move target styling should stay removed');
  assert.match(css, /button:not\(\.cell\):hover/, 'global button hover should exclude board cells');
  assert.doesNotMatch(css, /button:hover\{filter:brightness/, 'generic button hover should not affect board cells');
});
