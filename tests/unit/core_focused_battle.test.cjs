const test = require('node:test');
const assert = require('node:assert/strict');
const { createGameState } = require('../../src/core/state.cjs');
const battle = require('../../src/core/battle.cjs');
const { makeUnitFromData } = require('../../src/core/unitFactory.cjs');

function startState() {
  const state = createGameState({ day: 1, period: '上午', gold: 8 });
  battle.startBattle(state);
  if (!state.units.some(u => u.side === 'enemy' && u.alive)) {
    state.units.push(makeUnitFromData(state, 'enemy', 'pal_001', { id: 'focused_enemy', position: { r: 2, c: 6 } }));
    battle.syncDerivedBoard(state);
  }
  return state;
}

test('CB01 moveHero accepts legal empty cell and rejects occupied or out-of-range target', () => {
  const state = startState();
  const hero = state.units.find(u => u.side === 'hero' && u.alive);
  const empty = state.board.cells.find(c => !c.unitId && Math.abs(c.r - hero.position.r) + Math.abs(c.c - hero.position.c) <= Number(hero.moveRange || hero.ap || 1));
  assert.ok(empty);
  assert.equal(battle.moveHero(state, hero.id, { r: empty.r, c: empty.c }), true);
  const enemy = state.units.find(u => u.side === 'enemy' && u.alive);
  assert.equal(battle.moveHero(state, hero.id, enemy.position), false);
  hero.moveRange = 1;
  assert.equal(battle.moveHero(state, hero.id, { r: 7, c: 7 }), false);
});

test('CB02 action slot direction and use mutate AP and emit structured events through public API', () => {
  const state = startState();
  const hero = state.units.find(u => u.side === 'hero' && u.alive && battle.slotsForUnit(state, u).length);
  const enemy = state.units.find(u => u.side === 'enemy' && u.alive);
  assert.equal(battle.setActionDirection(state, hero.id, 0, 'right'), true);
  const beforeAp = Number(hero.actionApSpent || 0);
  const result = battle.useActionSlot(state, hero.id, 0, enemy.position, { ap: 2 });
  assert.equal(typeof result, 'boolean');
  assert.equal(Number(hero.actionApSpent || 0) >= beforeAp, true);
  assert.equal(state.events.some(e => ['PLAYER_SELECT_SLOT', 'USE_SLOT', 'USE_SLOT_BLOCKED'].includes(e.type)), true);
});

test('CB03 preview and AI intent return board-bounded cells with action context', () => {
  const state = startState();
  const hero = state.units.find(u => u.side === 'hero' && u.alive && battle.slotsForUnit(state, u).length);
  const enemy = state.units.find(u => u.side === 'enemy' && u.alive);
  battle.setActionDirection(state, hero.id, 0, 'right');
  const preview = battle.buildPreviewGrid(state, { unitId: hero.id, slotId: 0 });
  assert.equal(Array.isArray(preview), true);
  assert.ok(preview.every(c => c.r >= 0 && c.r < state.board.rows && c.c >= 0 && c.c < state.board.cols));
  const intent = battle.computeMonsterIntent(state, enemy);
  assert.ok(intent);
  assert.equal(intent.unitId, enemy.id);
  assert.ok(Array.isArray(intent.path));
  assert.ok(Array.isArray(intent.attackCells));
});

test('CB04 startNextRound clears attack movement lock but keeps same-round lock', () => {
  const state = startState();
  const hero = state.units.find(u => u.side === 'hero' && u.alive && battle.slotsForUnit(state, u).length);
  assert.ok(hero);

  hero.position = { r: 5, c: 2 };
  hero.moveRange = 3;
  hero.shape = Object.assign({}, hero.shape, {
    shapeId: '01',
    shapeName: '形状01',
    slotCount: 1,
    slotElements: ['风'],
    hitCells: 1,
    baseLayers: 1
  });
  battle.syncDerivedBoard(state);
  const moveTarget = state.board.cells.find(c => (
    !c.unitId
    && Math.abs(c.r - hero.position.r) + Math.abs(c.c - hero.position.c) <= hero.moveRange
    && !(c.r === 5 && c.c === 3)
  ));
  assert.ok(moveTarget);

  assert.equal(battle.setActionDirection(state, hero.id, 0, 'right'), true);
  assert.equal(battle.useActionSlot(state, hero.id, 0, { r: 5, c: 3 }, { ap: 1 }), true);
  assert.equal(hero.hasAttacked, true);
  assert.equal(battle.moveHero(state, hero.id, { r: moveTarget.r, c: moveTarget.c }), false);
  assert.match(state.events.at(-1).text, /位置锁定/);

  battle.startNextRound(state);

  assert.equal(hero.hasAttacked, false);
  assert.deepEqual(hero.actionSlotsUsed, {});
  assert.equal(hero.actionApSpent, 0);
  assert.equal(battle.moveHero(state, hero.id, { r: moveTarget.r, c: moveTarget.c }), true);
});
