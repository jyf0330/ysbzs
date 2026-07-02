const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.join(__dirname, '..', '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');

test('combat attack animation is driven by public action events in browser UI only', () => {
  const js = read('web/js/main.js');
  const css = read('web/ux-app.css');

  assert.match(js, /COMBAT_FX_EVENT_TYPES = new Set\(\['PLAYER_SELECT_SLOT', 'ENEMY_PET_ACTION', 'DAMAGE', 'UNIT_DEAD'\]\)/);
  assert.match(js, /function combatFxSteps\(events = \[\]\)/);
  assert.match(js, /const COMBAT_FX_SETTLE_MS = 900/);
  assert.match(js, /targetCellsById/, 'damage animation should fall back to public hit cells when a dead target is gone from the final board');
  assert.match(js, /function playCombatFxFromEvents\(events = \[\]\)/);
  assert.match(js, /function startCombatFxFromEvents\(events = \[\]\)/);
  assert.match(js, /function shouldDelayBattleResultForCombatFx\(data = \{\}\)/);
  assert.match(js, /async function revealBattleResultAfterCombatFx\(previousVm, finalVm, events = \[\]\)/);
  assert.match(js, /await revealBattleResultAfterCombatFx\(previousVm, ui\.vm, data\.events \|\| \[\]\)/);
  assert.match(js, /await revealBattleResultAfterCombatFx\(previousVm, ui\.vm, events\)/);
  assert.match(js, /startCombatFxFromEvents\(data\.events \|\| \[\]\)/);
  assert.match(js, /results\.flatMap\(data => data\?\.events \|\| \[\]\)/);
  assert.match(js, /await playCombatFxFromEvents\(events\)/, 'battle result reveal must wait for combat animation to finish');
  assert.match(js, /prefersReducedMotion/);
  assert.match(js, /data-unit-id="\$\{esc\(unit\.id\)\}"/);
  assert.doesNotMatch(js, /document\.querySelector\(['"`]src\/core/);

  assert.match(css, /\.cell\.combat-fx-cast/);
  assert.match(css, /\.cell\.combat-fx-hit/);
  assert.match(css, /\.combat-damage-pop/);
  assert.match(css, /@keyframes combat-pop/);
});
