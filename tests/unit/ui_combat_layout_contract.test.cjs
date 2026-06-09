const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.join(__dirname, '..', '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');

test('combat layout exposes full P0/P1/P2 interaction surfaces', () => {
  const html = read('web/index.html');
  const css = read('web/ux-app.css');

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
  assert.match(css, /body\[data-phase="init"\]\s+\.shop-phase-panel/, 'shop panel should hide outside legal phases');
});

test('bottom event log is internally scrollable and follows newest content', () => {
  const css = read('web/ux-app.css');
  assert.match(css, /\.bottom-panel\{[^}]*grid-template-rows:minmax\(0,1fr\)/s, 'bottom panel must constrain the log row instead of clipping overflow');
  assert.match(css, /\.log-view\{[^}]*min-height:0/s, 'log view must allow internal scrolling inside the fixed footer');
  assert.match(css, /\.log-view\{[^}]*max-height:100%/s, 'log view must stay within the footer height');

  for (const file of ['web/js/main.js', 'web/ux-app.js']) {
    const js = read(file);
    assert.match(js, /function autoScrollLog/, `${file} should centralize bottom-log auto-scroll behavior`);
    assert.match(js, /log\.scrollTop\s*=\s*log\.scrollHeight/, `${file} should scroll the bottom log to newest content`);
    assert.match(js, /requestAnimationFrame\(.*autoScrollLog/s, `${file} should scroll after the browser lays out freshly rendered log content`);
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
    assert.match(js, /runAllOut/, `${file} should expose 我方全部出击 flow`);
    assert.match(js, /data-ap-choice/, `${file} should render AP choices in detail area`);
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
    assert.doesNotMatch(js, /opChip\('目标'/, `${file} should not keep target details in the board-side rail`);
    assert.doesNotMatch(js, /boardUnitVitals\(unit\)/, `${file} board tokens should not render full unit stats`);
    assert.doesNotMatch(js, /hero-action-row/, `${file} should not keep action blocks embedded in pet cards`);
  }
  assert.match(css, /\.fullscreen-btn/, 'fullscreen button needs a dedicated compact tool style');
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
