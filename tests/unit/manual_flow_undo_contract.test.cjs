const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.join(__dirname, '..', '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');

test('manual enemy-flow buttons expose an undo path backed by runtime save/load', () => {
  const html = read('web/index.html');
  const css = read('web/ux-app.css');

  assert.match(html, /id="undo-flow-btn"/, 'right manual controls should expose a visible undo button');
  assert.match(css, /#undo-flow-btn/, 'undo button needs dedicated right-panel styling');

  for (const file of ['web/js/main.js', 'web/ux-app.js']) {
    const js = read(file);
    assert.match(js, /undoStack/, `${file} should keep a local undo stack for manual flow commands`);
    assert.match(js, /function runUndoableFlowCommand/, `${file} should route the two enemy-flow buttons through an undoable command helper`);
    assert.match(js, /function undoLastFlowAction/, `${file} should expose a single-step undo command`);
    assert.match(js, /runtime\.save\(\)/, `${file} should snapshot through the public runtime save API`);
    assert.match(js, /runtime\.load\(/, `${file} should restore through the public runtime load API`);
    assert.match(js, /END_PLAYER_TURN/, `${file} undoable flow should include player-turn settlement`);
    assert.match(js, /RUN_MONSTER_TURN/, `${file} undoable flow should include enemy pet action`);
    assert.match(js, /START_NEXT_ROUND/, `${file} undoable flow should include next-round spawn flow`);
    assert.match(js, /runUndoableFlowCommand\(ui\.vm\?\.phase === 'init' \? 'START_BATTLE' : 'END_PLAYER_TURN'/, `${file} etb should keep start battle direct but make settlement undoable`);
    assert.match(js, /runUndoableFlowCommand\(ui\.vm\?\.phase === 'round_end' \? 'START_NEXT_ROUND' : 'RUN_MONSTER_TURN'/, `${file} monster button should make enemy-flow operations undoable`);
  }
});

test('manual enemy-flow preview comes from transactional public command data', () => {
  for (const file of ['web/js/main.js', 'web/ux-app.js']) {
    const js = read(file);
    assert.match(js, /PREVIEW_MANUAL_FLOW/, `${file} should request a transactional manual-flow preview`);
    assert.match(js, /manualFlowPreview/, `${file} should cache the projected two-button preview result`);
    assert.match(js, /function normalizeManualFlowPreviewResult/, `${file} should normalize projected data before rendering`);
    assert.match(js, /cellByKey: indexByCell\(cells\)/, `${file} should index projected cells by board coordinate`);
    assert.match(js, /function indexById/, `${file} should index projected unit diffs by unit id`);
    assert.match(js, /unitDiffById: indexById\(unitDiffs\)/, `${file} should expose latest projected unit diffs for rendering`);
    assert.match(js, /function manualFlowPreviewKey/, `${file} should expose a stable render signature for projected data`);
    assert.match(js, /function teamRiskGridSource/, `${file} should centralize incoming-risk data source selection`);
    assert.match(js, /manualFlowPreviewVM\(\)/, `${file} should prefer the projected ViewModel over current-state risk data`);
    assert.doesNotMatch(js, /manualFlowPreview: ui\.manualFlowPreview/, `${file} render cache should use a stable preview key, not raw preview payloads`);
    assert.match(js, /refreshManualFlowPreview/, `${file} should refresh projected grid data after visible flow changes`);
    const riskBody = js.match(/function teamRiskForUnit\(unit\) \{([\s\S]*?)\n  \}/);
    assert.ok(riskBody, `${file} should expose teamRiskForUnit`);
    assert.match(riskBody[1], /const projected = manualFlowPreviewVM\(\)/, `${file} should know whether a transaction preview exists`);
    assert.match(riskBody[1], /if \(projected\) return projectedInjuryForUnit\(unit\);/, `${file} should render projected injury from unit diff once sandbox data exists`);
    assert.doesNotMatch(riskBody[1], /previewCellAt\(unit\.position\.r, unit\.position\.c\)\?\.teamRisk/, `${file} must not use projected teamRisk as final injury result`);
    const injuryBody = js.match(/function injuryFromUnitDiff\(diff, fallbackUnit = \{\}\) \{([\s\S]*?)\n  \}/);
    assert.ok(injuryBody, `${file} should expose injuryFromUnitDiff`);
    assert.match(injuryBody[1], /enemyIds: diff\.enemyIds \|\| \[\]/, `${file} should keep projected injury source ids from the unit diff`);
    assert.match(injuryBody[1], /threats: diff\.threats \|\| \[\]/, `${file} should keep projected injury source details from the unit diff`);
    assert.doesNotMatch(injuryBody[1], /enemyIds:\s*\[\]/, `${file} must not erase projected injury source ids`);
    assert.doesNotMatch(injuryBody[1], /threats:\s*\[\]/, `${file} must not erase projected injury source details`);
    const detailBody = js.match(/function renderCellDetail\(\) \{([\s\S]*?)\n  \}/);
    assert.ok(detailBody, `${file} should expose renderCellDetail`);
    assert.match(detailBody[1], /const detail = projectedDetail \|\| currentDetail;/, `${file} should let latest projected detail override current cell detail`);
    assert.match(detailBody[1], /const selectedCellUnit = c \? projectedCellUnit\(detail, selectedCell\) : null;/, `${file} should resolve selected unit from projected detail before current VM`);
    const boardBody = js.match(/function renderBoard\(\) \{([\s\S]*?)\n\t  \}/);
    assert.ok(boardBody, `${file} should expose renderBoard`);
    assert.match(boardBody[1], /const boardInjuries = projected \? projectedInjuries\(\) : teamRiskGridSource\(\);/, `${file} should render board injury badges from latest projected diffs`);
    assert.doesNotMatch(boardBody[1], /projectedCell\?\.teamRisk/, `${file} must not render projected injury badges from stale teamRisk`);
  }
});

test('manual enemy-flow preview avoids blocking refresh and per-cell read dispatches', () => {
  const previewSrc = read('src/uiAdapterManualFlowPreview.cjs');
  assert.match(previewSrc, /function buildProjectedCellDetails/, 'transaction preview should derive projected cell details in one pass');
  assert.doesNotMatch(previewSrc, /type:\s*'GET_CELL_DETAIL'/, 'transaction preview must not dispatch GET_CELL_DETAIL once per board cell');
  assert.doesNotMatch(previewSrc, /coreDispatch/, 'transaction preview should not depend on reducer dispatch for projected cell details');

  for (const file of ['web/js/main.js', 'web/ux-app.js']) {
    const js = read(file);
    assert.match(js, /manualFlowPreviewPending/, `${file} should deduplicate concurrent preview refreshes`);
    assert.match(js, /manualFlowPreviewSourceKey/, `${file} should cache preview results by current state key`);
    assert.match(js, /scheduleManualFlowPreviewWork/, `${file} should schedule local preview work outside the click task`);
    assert.match(js, /requestAnimationFrame/, `${file} should let the current state paint before starting local preview work`);
    assert.match(js, /if \(ui\.manualFlowPreview\?\.sourceKey === sourceKey\)/, `${file} should skip refresh when the current state already has a preview`);
    assert.doesNotMatch(js, /await refreshManualFlowPreview\(\)/, `${file} should not block player commands on preview refresh`);
  }
});
