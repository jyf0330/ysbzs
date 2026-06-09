const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.join(__dirname, '..', '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');

test('combat layout exposes full P0/P1/P2 interaction surfaces', () => {
  const html = read('web/index.html');
  const css = read('web/ux-app.css');

  assert.match(html, /id="prep-open-btn"/, 'left panel needs a clear prep entry');
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
  assert.match(css, /\.bottom-panel\{[^}]*margin-left:310px[^}]*margin-right:310px/s, 'event log should align to the center board column');
  assert.match(css, /body\[data-phase="init"\]\s+\.shop-phase-panel/, 'shop panel should hide outside legal phases');
});

test('combat layout scripts implement delayed tooltip, inline AP, manual lock and drag prep', () => {
  for (const file of ['web/js/main.js', 'web/ux-app.js']) {
    const js = read(file);
    assert.match(js, /TOOLTIP_DELAY_MS/, `${file} should delay tooltip display`);
    assert.match(js, /tooltipTimer/, `${file} should cancel pending tooltip timers`);
    assert.match(js, /manualAutoLock/, `${file} should track manual operation lock`);
    assert.match(js, /RUN_FULL_DAY/, `${file} should keep full-day flow through the API`);
    assert.match(js, /runAllOut/, `${file} should expose 我方全部出击 flow`);
    assert.match(js, /data-ap-choice/, `${file} should render AP choices in detail area`);
    assert.match(js, /dragstart/, `${file} should support drag prep interactions`);
    assert.match(js, /drop/, `${file} should support drag/drop prep targets`);
    assert.match(js, /prepFilter/, `${file} should filter prep backpack roster`);
    assert.match(js, /slotShortName/, `${file} should render compact action-block names`);
    assert.doesNotMatch(js, /opChip\('目标'/, `${file} should not keep target details in the board-side rail`);
    assert.doesNotMatch(js, /boardUnitVitals\(unit\)/, `${file} board tokens should not render full unit stats`);
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
