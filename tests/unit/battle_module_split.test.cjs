const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createGameState } = require('../../src/core/state.cjs');
const battle = require('../../src/core/battle.cjs');

const root = path.resolve(__dirname, '..', '..');
const battleRoot = path.join(root, 'src/core/battle');

test('BM01 battle.cjs is split into explicit responsibility modules', () => {
  const modules = ['position.cjs', 'actions.cjs', 'planning.cjs', 'preview.cjs', 'resolution.cjs'];
  for (const file of modules) assert.equal(fs.existsSync(path.join(battleRoot, file)), true, `${file} should exist`);
  const mainLines = fs.readFileSync(path.join(root, 'src/core/battle.cjs'), 'utf8').split(/\r?\n/).length;
  assert.ok(mainLines < 520, `battle.cjs should stay below 520 lines after split, got ${mainLines}`);
});

test('BM02 split modules keep the old public battle API stable', () => {
  for (const name of [
    'moveHero', 'moveUnitGeneral', 'setActionDirection', 'useActionSlot',
    'buildPreviewGrid', 'buildThreatGrid', 'getCellDetail', 'syncDerivedBoard',
    'slotsForUnit', 'computeMonsterIntent', 'buildPlayerAutoPlan', 'damageUnit', 'settleElements'
  ]) {
    assert.equal(typeof battle[name], 'function', `${name} must remain exported`);
  }
});

test('BM03 split battle API can still run start -> move -> slot -> settle smoke flow', () => {
  const state = createGameState({ day: 1, period: '上午' });
  assert.equal(battle.startBattle(state), true);
  const hero = state.units.find(u => u.side === 'hero' && u.alive);
  assert.ok(hero, 'hero should exist');
  const from = { ...hero.position };
  const toCell = state.board.cells.find(c => !c.unitId && Math.abs(c.r - from.r) + Math.abs(c.c - from.c) <= (hero.moveRange || hero.ap || 14));
  assert.ok(toCell, 'there should be a legal empty move target');
  battle.moveHero(state, hero.id, { r: toCell.r, c: toCell.c });
  battle.setActionDirection(state, hero.id, 0, 'right');
  battle.useActionSlot(state, hero.id, 0, null);
  battle.settleElements(state);
  const events = state.events.map(e => e.type);
  assert.ok(events.includes('BATTLE_START'));
  assert.ok(events.some(t => ['MOVE_HERO', 'MOVE_HERO_BLOCKED'].includes(t)));
  assert.ok(events.some(t => ['PLAYER_SELECT_SLOT', 'USE_SLOT_BLOCKED'].includes(t)));
});
