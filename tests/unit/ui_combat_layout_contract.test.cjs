const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const root = path.join(__dirname, '..', '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');

function extractFunctionSource(js, name) {
  const start = js.indexOf(`function ${name}`);
  assert.notEqual(start, -1, `missing ${name}`);
  const braceStart = js.indexOf('{', start);
  assert.notEqual(braceStart, -1, `missing body for ${name}`);
  let depth = 0;
  for (let i = braceStart; i < js.length; i++) {
    if (js[i] === '{') depth++;
    if (js[i] === '}') {
      depth--;
      if (depth === 0) return js.slice(start, i + 1);
    }
  }
  assert.fail(`unterminated ${name}`);
}

function runThreatDetailText(js, threat) {
  const helperNames = ['threatDamageValue'];
  const helpers = helperNames
    .filter(name => js.includes(`function ${name}`))
    .map(name => extractFunctionSource(js, name));
  const source = `${helpers.join('\n')}\n${extractFunctionSource(js, 'threatDetailText')}\nresult = threatDetailText(threat);`;
  const sandbox = { threat, result: null };
  vm.runInNewContext(source, sandbox);
  return sandbox.result;
}

test('combat layout exposes full P0/P1/P2 interaction surfaces', () => {
  const html = read('web/index.html');
  const css = read('web/ux-app.css');

  assert.match(html, /href="daily-flow\.html"[\s\S]*>流程</, 'top shell needs an entry to the standalone daily flow page');
  assert.match(html, /id="active-pet-zone"/, 'left rail should split active pets into their own top zone');
  assert.match(html, /id="action-block-zone"/, 'left rail needs an independent 12 action-block zone');
  assert.match(html, /<h2>行动块<\/h2>/, 'left-bottom zone needs a visible action-block title');
  assert.match(html, /id="action-block-count"/, 'action-block zone should show 12-slot occupancy');
  assert.match(html, /id="slot-list" class="slot-list" aria-label="12 个行动块"/, 'slot list must be visible and dedicated to 12 action blocks');
  assert.doesNotMatch(html, /slot-list hidden-bridge/, 'slot list must not be hidden after action blocks move left-bottom');
  assert.match(html, /id="prep-open-btn"/, 'left panel needs a clear prep entry');
  assert.match(html, /id="fullscreen-btn"[\s\S]*>全屏</, 'top shell needs a visible game fullscreen button');
  assert.match(html, /<h2>上阵宠物<\/h2>[\s\S]*id="hero-count"[\s\S]*id="prep-open-btn"[\s\S]*>备战</, 'prep button belongs beside the active-pet title');
  assert.doesNotMatch(html, /打开备战台/, 'prep button copy should be direct');
  assert.doesNotMatch(html, /id="roster-list"/, 'bench roster must not live permanently in the left rail');
  assert.match(html, /id="prep-overlay"/, 'prep must be a large overlay, not a small list only');
  assert.match(html, /id="prep-filter"/, 'bench/backpack filter must be visible in prep');
  assert.match(html, /data-prep-drop-zone="active"/, 'active lineup needs a drag/drop target');
  assert.match(html, /data-prep-drop-zone="bench"/, 'bench backpack needs a drag/drop target');
  assert.match(html, /id="all-out-btn"/, 'right controls need 我方全部出击');
  assert.match(html, /id="full-run-btn"/, 'right controls need a complete Day1-Day10 run entry');
  assert.match(html, /id="auto-controls"/, 'auto actions should sit in a dedicated right-bottom cluster');
  assert.doesNotMatch(html, /id="exa"/, '自动战斗 should not be a player-facing primary button');
  assert.doesNotMatch(html, />自动战斗</, '自动战斗 copy should not compete with the two core automation choices');
  assert.match(html, /id="shop-phase-panel"/, 'shop/reward actions need a phase-gated wrapper');
  assert.match(css, /\.prep-overlay/, 'prep overlay needs dedicated layout styling');
  assert.match(css, /\.active-pet-zone/, 'left-top active pet zone needs dedicated styling');
  assert.match(css, /\.action-block-zone/, 'left-bottom action block zone needs dedicated styling');
  assert.match(css, /\.slot-list\{[^}]*grid-template-columns:repeat\(3,minmax\(0,1fr\)\)/s, '12 action blocks should form a compact 3-column grid');
  assert.match(css, /\.detail-stat-grid/, 'right detail should use a full stat grid');
  assert.match(css, /\.bottom-panel\{[^}]*margin-left:310px[^}]*margin-right:310px/s, 'event log should align to the center board column');
  assert.match(css, /body\[data-phase="player_turn"\]\s+\.shop-phase-panel/, 'shop panel should hide during combat phases');
  assert.doesNotMatch(css, /body\[data-phase="init"\]\s+\.shop-phase-panel/, 'Day1 init can expose node choices before combat');
});

test('daily flow is a standalone page using public API surfaces', () => {
  const index = read('web/index.html');
  const html = read('web/daily-flow.html');
  const css = read('web/daily-flow.css');
  const js = read('web/daily-flow.js');

  assert.match(index, /href="daily-flow\.html"/, 'battle shell should link to the daily flow page');
  assert.match(html, /<h1>每日流程<\/h1>/, 'daily flow page needs its own first-screen title');
  assert.match(html, /id="timeline"/, 'daily flow page should expose a timeline region');
  assert.match(html, /id="choice-list"/, 'daily flow page should expose current route choices');
  assert.match(html, /id="run-list"/, 'daily flow page should expose cross-day run summaries');
  assert.match(html, /src="daily-flow\.js"/, 'daily flow page should load its own script');
  assert.match(css, /\.flow-shell/, 'daily flow page needs dedicated shell styling');
  assert.match(css, /\.timeline/, 'daily flow timeline needs dedicated layout styling');
  assert.match(js, /createGameRuntime/, 'daily flow should use the public runtime client');
  assert.match(js, /runtime\.view\(\)/, 'daily flow must read /api/view through runtime');
  assert.match(js, /runtime\.action/, 'daily flow must mutate only through /api/action');
  assert.match(js, /dailyFlow/, 'daily flow script should render the ViewModel dailyFlow surface');
  assert.doesNotMatch(js, /querySelector\([^)]*src\/core|require\(|uiAdapter\.cjs/, 'daily flow page must not import core or adapter directly');
});

test('bottom event log is internally scrollable and follows newest content', () => {
  const css = read('web/ux-app.css');
  assert.match(css, /\.bottom-panel\{[^}]*grid-template-rows:minmax\(0,1fr\)/s, 'bottom panel must constrain the log row instead of clipping overflow');
  assert.match(css, /\.log-view\{[^}]*min-height:0/s, 'log view must allow internal scrolling inside the fixed footer');
  assert.match(css, /\.log-view\{[^}]*max-height:100%/s, 'log view must stay within the footer height');
  assert.match(css, /\.log-view\{[^}]*user-select:text/s, 'bottom event log should allow selecting and copying visible text');

  for (const file of ['web/js/main.js', 'web/ux-app.js']) {
    const js = read(file);
    assert.match(js, /function autoScrollLog/, `${file} should centralize bottom-log auto-scroll behavior`);
    assert.match(js, /log\.scrollTop\s*=\s*log\.scrollHeight/, `${file} should scroll the bottom log to newest content`);
    assert.match(js, /requestAnimationFrame\(.*autoScrollLog/s, `${file} should scroll after the browser lays out freshly rendered log content`);
  }
});

test('game UI keeps toast notifications fully hidden', () => {
  for (const file of ['web/js/main.js', 'web/ux-app.js']) {
    const js = read(file);
    const toastBody = js.match(/function toast\([^)]*\) \{([\s\S]*?)\n  \}/);
    assert.ok(toastBody, `${file} should keep a central toast function`);
    assert.match(toastBody[1], /^\s*return;/m, `${file} toast function should no-op before creating DOM`);
    assert.doesNotMatch(toastBody[1], /appendChild\(el\)/, `${file} toast function must not append hidden notifications`);
  }
});

test('action blocks sit lower and edit through a local popover instead of the right detail column', () => {
  const html = read('web/index.html');
  const css = read('web/ux-app.css');
  assert.match(html, /id="action-popover"/, 'left action blocks need a local floating edit popover');
  assert.doesNotMatch(html, /id="slot-action-panel"/, 'right column should not keep a permanent slot action adjustment panel');
  assert.doesNotMatch(html, /slot-action-zone/, 'right column should reserve space for details instead of slot controls');
  assert.doesNotMatch(css, /slot-action-panel|slot-action-zone/, 'old right-side slot action styles should be removed');
  assert.match(css, /\.active-pet-zone\{[^}]*flex:0 0 310px/s, 'active pets should get more vertical room and stop feeling compressed');
  assert.match(css, /\.slot-list\{[^}]*height:124px/s, '12 action blocks should move down into a readable left-bottom strip');
  assert.match(css, /\.action-block-zone\{[^}]*margin-top:auto/s, 'action block zone should sit lower in the left panel');
  assert.match(css, /\.detail-zone\{[^}]*flex:1 1 auto/s, 'right detail zone should flex to available space instead of overlapping controls');
  assert.match(css, /\.right-panel \.detail-card\{[^}]*flex:1 1 auto[^}]*min-height:0/s, 'right detail panel should scroll inside available space');
  assert.match(css, /\.action-popover/, 'action popover needs visible floating-panel styling');

  for (const file of ['web/js/main.js', 'web/ux-app.js']) {
    const js = read(file);
    assert.match(js, /function renderActionPopover/, `${file} should render the local action edit popover`);
    assert.match(js, /positionActionPopover/, `${file} should place the popover beside the selected action block`);
    assert.match(js, /id="action-popover-title"/, `${file} popover should expose action identity`);
    assert.doesNotMatch(js, /renderSlotAction/, `${file} should not render permanent right-side action controls`);
    assert.doesNotMatch(js, /slot-action-panel/, `${file} should not keep right-side slot adjustment code`);
  }
});

test('combat layout scripts keep info in right panel without hover detail popups', () => {
  const css = read('web/ux-app.css');
  const html = read('web/index.html');
  assert.doesNotMatch(html, /id="cell-popup"/, 'board detail popup should be removed; right panel owns details');
  assert.doesNotMatch(html, /id="tooltip"/, 'hover tooltip surface should be removed; right panel owns details');
  assert.doesNotMatch(css, /\.cell-popup/, 'cell popup styling should not remain');
  assert.doesNotMatch(css, /\.tooltip/, 'tooltip styling should not remain');
  assert.doesNotMatch(css, /\[data-tip\]/, 'hover affordance styling should not remain');
  for (const file of ['web/js/main.js', 'web/ux-app.js']) {
    const js = read(file);
    assert.doesNotMatch(js, /TOOLTIP_DELAY_MS/, `${file} should not keep delayed hover tooltip logic`);
    assert.doesNotMatch(js, /tooltipTimer/, `${file} should not keep hover tooltip timer state`);
    assert.doesNotMatch(js, /data-tip/, `${file} should not render hover tooltip attributes`);
    assert.doesNotMatch(js, /showCellPopup|hideCellPopup/, `${file} should not keep board hover popup functions`);
    assert.doesNotMatch(js, /showTooltip|scheduleTooltip|hideTooltip/, `${file} should not keep hover tooltip functions`);
    assert.doesNotMatch(js, /document\.addEventListener\('mousemove'/, `${file} should not bind document mousemove hover details`);
    assert.match(js, /manualAutoLock/, `${file} should track manual operation lock`);
    assert.match(js, /RUN_FULL_DAY/, `${file} should keep full-day flow through the API`);
    assert.match(js, /RUN_FULL_RUN/, `${file} should expose complete run flow through the API`);
    assert.match(js, /full-run-btn/, `${file} should bind the complete run button`);
    assert.match(js, /runAllOut/, `${file} should expose 我方全部出击 flow`);
    assert.match(js, /data-ap-choice/, `${file} should render AP choices in the action popover`);
    assert.match(js, /dragstart/, `${file} should support drag prep interactions`);
    assert.match(js, /drop/, `${file} should support drag/drop prep targets`);
    assert.match(js, /prepFilter/, `${file} should filter prep backpack roster`);
    assert.match(js, /slotShortName/, `${file} should render compact action-block names`);
    assert.match(js, /requestFullscreen/, `${file} should enter fullscreen through the browser Fullscreen API`);
    assert.match(js, /fullscreenchange/, `${file} should keep fullscreen button state in sync`);
    assert.match(js, /heroBattleStats/, `${file} should render complete hero combat stats in the active-pet zone`);
    assert.match(js, /renderActionBlockCard/, `${file} should render the independent left-bottom action blocks`);
    assert.match(js, /detail-stat-grid/, `${file} should render full right-side stat details`);
	    assert.match(js, /detail-skill-panel/, `${file} should render skill name and description in the detail panel`);
	    assert.match(js, /action-block-count/, `${file} should count the 12 action blocks`);
	    assert.match(js, /unit-stat-badge unit-stat-hp/, `${file} board tokens should render an in-cell HP numeric badge`);
	    assert.match(js, /unit-stat-badge unit-stat-atk/, `${file} board tokens should render an in-cell attack numeric badge`);
	    assert.match(js, /function threatDetailText/, `${file} should render detailed enemy pet threat previews`);
	    assert.match(js, /function teamRiskDetailText/, `${file} should render detailed incoming team risk previews`);
	    assert.match(js, /threatsByEnemy/, `${file} should group incoming team risk detail by enemy instead of labeling all threats as the first enemy`);
	    assert.match(js, /次行动块/, `${file} threat detail should show enemy action-block count`);
	    assert.match(js, /合计/, `${file} threat detail should show total incoming damage`);
	    assert.match(js, /function compactRiskDamageSeries/, `${file} should render incoming slot damage as a compact ordered damage series`);
	    assert.match(js, /function compactTeamRiskSourceLine/, `${file} should render each enemy source as enemyName(-3,-3) style text`);
	    assert.doesNotMatch(js, /第\$\{Number\(threat\.slotIndex/, `${file} should not expose verbose slot labels in player-facing incoming risk detail`);
	    assert.match(js, /受击预警/, `${file} should default the detail panel to incoming damage warnings`);
	    assert.match(js, /unitRisk \? `<div class="detail-extra threat">/, `${file} should embed incoming warnings inside full unit details`);
	    assert.doesNotMatch(js, /if \(unit\?\.side === 'hero' && teamRisk\)/, `${file} should not replace full hero details with a warning-only panel`);
	    assert.match(js, /footCellElements/, `${file} should distinguish the selected unit's own element layers from the foot cell element layer`);
	    assert.match(js, /脚下元素层/, `${file} should show ground element layers when a unit stands on water/fire/wind/earth stacks`);
	    assert.match(js, /enemy-final-cell/, `${file} should mark enemy final move cells instead of damage-labeling empty cells`);
	    assert.match(js, /enemy-final-num/, `${file} should render a compact final-position marker for enemy movement`);
	    assert.doesNotMatch(js, /\$\{t \? `<span class="threat-num">危/, `${file} should not render threat damage numbers on every empty threat cell`);
	    assert.doesNotMatch(js, /if \(threatKeys\.has\(key\)\) classes\.push\('threat-hit'\)/, `${file} should not draw enemy attack ranges on empty threat cells`);
	    assert.doesNotMatch(js, /classes\.push\('move-risk'\)/, `${file} should not flag empty movement cells as incoming-damage cells`);
	    assert.doesNotMatch(js, /classes\.push\('move-risk-lethal'\)/, `${file} should not flag empty movement cells as lethal incoming-damage cells`);
	    assert.doesNotMatch(js, /class="risk-num">受/, `${file} should not render incoming damage numbers on empty movement cells`);
	    assert.match(js, /KO/, `${file} should expose lethal incoming damage in visible copy`);
	    assert.doesNotMatch(js, /friendly-warning|误伤/, `${file} should not render friendly-fire UI because current rules do not support it`);
	    assert.doesNotMatch(js, /class="unit-token[^`]*\btitle="/, `${file} board unit token must not trigger native title hover text`);
	    assert.doesNotMatch(js, /opChip\('目标'/, `${file} should not keep target details in the board-side rail`);
	    assert.doesNotMatch(js, /boardUnitVitals\(unit\)/, `${file} board tokens should not render full unit stats`);
	    assert.doesNotMatch(js, /hero-action-row/, `${file} should not keep action blocks embedded in pet cards`);
	  }
	  assert.match(css, /\.fullscreen-btn/, 'fullscreen button needs a dedicated compact tool style');
	  assert.match(css, /\.unit-stat-badge/, 'board unit stat badges need dedicated positioning');
	  assert.match(css, /\.unit-stat-hp/, 'board unit HP badge needs dedicated styling');
	  assert.match(css, /\.unit-stat-atk/, 'board unit attack badge needs dedicated styling');
	  assert.match(css, /\.cell\.enemy-final-cell/, 'enemy final move cells need dedicated visible styling');
	  assert.match(css, /\.enemy-final-num/, 'enemy final move marker needs dedicated compact styling');
	  assert.doesNotMatch(css, /\.cell\.move-risk/, 'empty movement cells should not use damage-risk styling');
	  assert.doesNotMatch(css, /\.cell\.enemy-move-path:after/, 'enemy movement path should not draw every path cell when only the final cell is needed');
	  assert.doesNotMatch(css, /friendly-warning/, 'friendly-fire warning styles should not remain');
	});

test('empty attack threat detail shows attack threat instead of empty-cell hit damage', () => {
  const emptyAttackThreat = {
    unitName: '敌方翠叶鼠',
    type: 'attack',
    damage: 0,
    totalDamage: 0,
    threat: 9,
    atk: 9,
    hits: [],
    actionIndexes: [0],
    actionCount: 1
  };

  for (const file of ['web/js/main.js', 'web/ux-app.js']) {
    const text = runThreatDetailText(read(file), emptyAttackThreat);
    assert.equal(text, '敌方翠叶鼠 1次行动块；合计9', `${file} should use threat value for empty attack cells`);
  }
});

test('clicked cell threat detail stays on current GET_CELL_DETAIL when transaction preview exists', () => {
  for (const file of ['web/js/main.js', 'web/ux-app.js']) {
    const js = read(file);
    const body = js.match(/function renderCellDetail\(\) \{([\s\S]*?)\n\t  function threatDamageValue/);
    assert.ok(body, `${file} should keep renderCellDetail before threat formatting helpers`);
    assert.match(body[1], /const currentDetail = ui\.cellDetail/, `${file} should preserve the clicked cell detail separately from projected detail`);
    assert.match(
      body[1],
      /const threat = currentDetail\?\.threat \|\| cell\?\.threat \|\| detail\?\.threat/,
      `${file} should render current clicked threat before projected transaction threat`
    );
  }
});

test('publication docs include P2 in the current delivery scope', () => {
  const spec = read('docs/UI_COMBAT_LAYOUT_PUBLICATION_SPEC.md');
  const tasks = read('docs/UI_COMBAT_LAYOUT_TASKS.md');

  assert.doesNotMatch(spec, /拖拽、筛选和复杂背包管理拆到后续任务/);
  assert.match(spec, /完整备战拖拽/);
  assert.match(spec, /背包筛选/);
  assert.match(tasks, /完整备战拖拽/);
  assert.match(tasks, /背包筛选/);
  assert.match(tasks, /我方全部出击/);
});
