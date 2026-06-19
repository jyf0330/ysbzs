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

test('UI03A event log renders the full browser-visible history from the first event', () => {
  for (const file of ['web/js/main.js', 'web/ux-app.js']) {
    const main = read(file);
    assert.doesNotMatch(main, /events\.slice\(-22\)/, `${file} should not truncate the event tab to the newest 22 rows`);
    assert.match(main, /events\.map\(e =>/, `${file} should render every ViewModel event row`);
    assert.match(main, /scrollTop = 0/, `${file} should keep the event tab positioned at the first event`);
  }
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
  assert.match(main, /terminalSummary\?\.nextStepText/, 'terminal next-step copy should come from ViewModel terminal summary');
  assert.match(main, /if \(route\.terminal\) return vm\.terminalSummary\?\.nextStepText \|\| '查看终局报告';/, 'terminal copy must win over reward and shop next steps');
  assert.match(main, /vm\.buildCore\?\.summaryText/, 'build core label should read ViewModel buildCore');
  assert.match(css, /\.status-pill\.build-core/, 'build core pill needs compact readable styling');
  assert.match(css, /\.status-pill\.next-step/, 'next-step pill needs compact readable styling');
  assert.match(css, /\.status-pill\.next-step strong\{[^}]*white-space:normal/, 'terminal next-step copy must be allowed to show without ellipsis truncation');
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

test('UI03D shop panel renders stall identity and refresh economy status', () => {
  const main = read('web/js/main.js');
  const css = read('web/ux-app.css');

  assert.match(main, /function renderShopStallSummary\(/, 'shop panel should use a dedicated stall summary renderer');
  assert.match(main, /function renderShopRefreshSummary\(/, 'shop panel should use a dedicated refresh summary renderer');
  assert.match(main, /activeStall/, 'shop panel should read ViewModel activeStall');
  assert.match(main, /refreshState/, 'shop panel should read ViewModel refreshState');
  assert.match(main, /class="shop-stall-summary"/, 'shop panel should render stall identity block');
  assert.match(main, /class="shop-refresh-summary"/, 'shop panel should render refresh economy block');
  assert.match(css, /\.shop-stall-summary/, 'stall summary needs explicit styling');
  assert.match(css, /\.shop-refresh-summary/, 'refresh summary needs explicit styling');
  assert.match(main, /offer-source/, 'targeted restock offers should show their source on offer cards');
  assert.match(main, /o\.restock\?\.name/, 'offer cards should read restock provenance from ViewModel');
  assert.match(css, /\.offer-source/, 'offer provenance needs compact readable styling');
});

test('UI03E reward panel renders claimable route battle rewards', () => {
  const main = read('web/js/main.js');
  const css = read('web/ux-app.css');

  assert.match(main, /function renderRoutePendingRewards\(/, 'reward panel should use a dedicated route pending reward renderer');
  assert.match(main, /dayRoute\?\.pendingRewards/, 'reward panel should read ViewModel dayRoute pendingRewards');
  assert.match(main, /route-pending-reward/, 'reward panel should render route pending reward cards');
  assert.match(main, /data-route-reward-id/, 'route reward card should expose a player-clickable reward id');
  assert.match(main, /CLAIM_ROUTE_REWARD/, 'browser click path should dispatch the public route reward claim command');
  assert.match(css, /\.route-pending-reward/, 'route pending reward cards need explicit styling');
});

test('UI03F fixed route battle is exposed through the encounter button', () => {
  const main = read('web/js/main.js');

  assert.match(main, /RUN_ROUTE_FIXED_BATTLE/, 'browser controls should know the public fixed route battle command');
  assert.match(main, /isNext\('RUN_ROUTE_FIXED_BATTLE'\)/, 'encounter button should enable on fixed route battle nextAction');
  assert.match(main, /runCommand\(isNext\('RUN_ROUTE_FIXED_BATTLE'\)\s*\?\s*'RUN_ROUTE_FIXED_BATTLE'\s*:\s*'GENERATE_BATTLE_OPTIONS'/, 'encounter button should dispatch fixed route battle instead of generic RUN_BATTLE');
});

test('UI03G battle cards render route pressure preview', () => {
  const main = read('web/js/main.js');
  const css = read('web/ux-app.css');

  assert.match(main, /function renderBattlePressurePreview\(/, 'browser should use a dedicated pressure preview renderer');
  assert.match(main, /pressurePreview/, 'route cards should read ViewModel pressurePreview');
  assert.match(main, /class="battle-pressure-preview"/, 'route cards should include a pressure preview block');
  assert.match(main, /route-fixed-pressure/, 'fixed battle nextAction should render a visible pressure block');
  assert.match(css, /\.battle-pressure-preview/, 'pressure preview needs explicit readable styling');
  assert.match(css, /\.route-fixed-pressure/, 'fixed battle pressure block needs explicit styling');
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

test('UI05B acted heroes do not keep move-target affordances', () => {
  const main = read('web/js/main.js');
  assert.match(main, /function unitPositionLocked\(unit = \{\}\)/, 'UI should have one browser-side lock predicate');
  assert.match(main, /if \(!unit\) return false;/, 'UI lock predicate should tolerate no selected hero');
  assert.match(main, /\(unit\.slots \|\| \[\]\)\.some\(slot => slot && slot\.used\)/, 'slot usage should lock movement even when hasAttacked is not projected');
  const moveBody = main.match(/function legalMoveTargets\(hero\) \{([\s\S]*?)\n  \}/);
  assert.ok(moveBody, 'legalMoveTargets should exist');
  assert.match(moveBody[1], /unitPositionLocked\(hero\)/, 'acted heroes should not expose legal move targets');
  assert.match(main, /位置锁定/, 'hint text should explain attack-lock movement state');
  const clickBody = main.match(/async function onCellClick\(r, c\) \{([\s\S]*?)\n  \}\n\n\s*function renderCellDetail/);
  assert.ok(clickBody, 'onCellClick should exist');
  assert.match(clickBody[1], /本回合已行动，位置锁定/, 'clicking empty cells after acting should explain the lock');
});

test('UI05C clicking enemy pets or outside the board clears the current pet selection', () => {
  const main = read('web/js/main.js');
  assert.match(main, /async function clearCurrentPetSelection\(/, 'browser should have a shared clear-selection helper');
  assert.match(main, /runCommand\('CLEAR_SELECTION'/, 'clear helper must sync through the public UI selection command');

  const clickBody = main.match(/async function onCellClick\(r, c\) \{([\s\S]*?)\n  \}\n\n\s*function renderCellDetail/);
  assert.ok(clickBody, 'onCellClick should exist');
  assert.match(clickBody[1], /const isEnemyUnit = unit\?\.side === 'enemy'/, 'click handler should identify enemy pet cells');
  assert.match(clickBody[1], /if \(isEnemyUnit\) \{[\s\S]*?await clearCurrentPetSelection\(\{ preserveCell: true \}\)/, 'enemy pet clicks should clear current pet selection while preserving the clicked detail');
  assert.ok(
    clickBody[1].indexOf('await clearCurrentPetSelection({ preserveCell: true })') < clickBody[1].indexOf("SELECT_CELL"),
    'enemy/non-hero cell clicks should clear stale unit selection before selecting the cell'
  );

  const eventBindingBody = main.match(/\$\('fullscreen-btn'\)[\s\S]*?\n  function scaleApp/);
  assert.ok(eventBindingBody, 'event binding section should exist');
  assert.match(eventBindingBody[0], /document\.addEventListener\('click', async ev => \{[\s\S]*?clearCurrentPetSelection\(\)/, 'document outside clicks should clear current pet selection');
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
