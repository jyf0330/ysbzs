const test = require('node:test');
const assert = require('node:assert/strict');

const { createGameState, makeUnit, syncBoardUnits } = require('../src/core/state.cjs');
const battle = require('../src/core/battle.cjs');
const { createYSBZSUIAdapter } = require('../src/uiAdapter.cjs');

function eventCount(state, type) {
  return state.events.filter(e => e.type === type).length;
}

function firstHero(state) {
  return battle.living(state, 'hero')[0];
}

function resetSlot(unit, index = 0) {
  unit.actionSlotsUsed = unit.actionSlotsUsed || {};
  delete unit.actionSlotsUsed[index];
}

test('LB01 enemy Boss is a board target, can be hit by legal slot shape, and HP loss decides victory', () => {
  const state = createGameState({ gold: 10, activePets: ['pal_005'] });
  state.phase = 'player_turn';
  state.round = 1;
  state.units = state.units.filter(u => u.side === 'hero');

  const hero = firstHero(state);
  hero.position = { r: 6, c: 1 };
  state.leaders.enemy.hp = 1;
  state.leaders.enemy.maxHp = 1;
  state.leaders.enemy.position = { r: 6, c: 2 };
  battle.syncDerivedBoard(state);

  battle.setActionDirection(state, hero.id, 0, 'right');
  const ok = battle.useActionSlot(state, hero.id, 0, null);
  assert.equal(ok, true);
  assert.ok(state.leaders.enemy.elements['火'] >= 1);

  battle.endPlayerTurn(state);

  assert.equal(state.leaders.enemy.hp, 0);
  assert.equal(state.result.win, true);
  assert.equal(state.phase, 'battle_end');
});

test('LB02 player leader HP reaching zero is a loss condition', () => {
  const state = createGameState({ activePets: ['pal_005'] });
  const enemy = makeUnit(state, 'enemy', 'pal_001', { atk: 99, position: { r: 7, c: 1 } });
  state.units.push(enemy);
  state.leaders.player.hp = 3;
  state.leaders.player.maxHp = 3;
  state.leaders.player.position = { r: 7, c: 0 };
  battle.syncDerivedBoard(state);

  const dealt = battle.damageUnit(state, enemy, state.leaders.player, 99, { element: '风' });
  assert.ok(dealt > 0);
  assert.equal(state.leaders.player.hp, 0);
  assert.equal(state.result.win, false);
  assert.equal(state.phase, 'battle_end');
});

test('LB03 USE_SLOT rejects a clicked target cell that is outside current slot shape', () => {
  const state = createGameState({ activePets: ['pal_005'] });
  state.phase = 'player_turn';
  state.round = 1;
  state.units = state.units.filter(u => u.side === 'hero');

  const hero = firstHero(state);
  hero.position = { r: 6, c: 1 };
  state.leaders.enemy.position = { r: 1, c: 6 };
  battle.syncDerivedBoard(state);
  battle.setActionDirection(state, hero.id, 0, 'left');

  const before = state.leaders.enemy.elements['火'] || 0;
  const ok = battle.useActionSlot(state, hero.id, 0, { r: 1, c: 6 });
  assert.equal(ok, false);
  assert.equal(state.leaders.enemy.elements['火'] || 0, before);
  assert.equal(eventCount(state, 'USE_SLOT_BLOCKED'), 1);
});

test('LB04 TOGGLE_UNIT_ACTIVE removes benched units from heroes and board', () => {
  const adapter = createYSBZSUIAdapter({ gold: 12 });
  const inv = adapter.getViewModel().inventory.active[0];
  adapter.toggleUnitActive(inv.instanceId);

  const vm = adapter.getViewModel();
  assert.ok(vm.inventory.bench.some(x => x.instanceId === inv.instanceId));
  assert.equal(vm.heroes.some(h => h.id === inv.instanceId), false);
  assert.equal(vm.board.cells.some(c => c.unitId === inv.instanceId), false);
});

test('LB05 player element reaches 3 layers, converts to terrain, and clears pending elements', () => {
  const state = createGameState({ activePets: ['pal_005'] });
  state.phase = 'player_turn';
  state.round = 1;
  state.units = state.units.filter(u => u.side === 'hero');
  const hero = firstHero(state);
  hero.position = { r: 6, c: 1 };
  hero.shape = Object.assign({}, hero.shape, { baseLayers: 3 });
  battle.syncDerivedBoard(state);
  battle.setActionDirection(state, hero.id, 0, 'right');

  resetSlot(hero, 0);
  assert.equal(battle.useActionSlot(state, hero.id, 0, null), true);

  const cell = state.board.cells.find(c => c.r === 6 && c.c === 2);
  assert.equal(cell.elements['火'], 0);
  assert.ok(cell.terrain.modules.some(m => m.element === '火' && m.layers === 3));
});

test('LB06 attacking a cell with unformed elements reduces all pending elements by one', () => {
  const state = createGameState({ activePets: ['pal_005'] });
  state.phase = 'player_turn';
  state.round = 1;
  state.units = state.units.filter(u => u.side === 'hero');
  const hero = firstHero(state);
  hero.position = { r: 6, c: 1 };
  battle.syncDerivedBoard(state);
  const cell = state.board.cells.find(c => c.r === 6 && c.c === 2);
  cell.elements['火'] = 2;
  cell.elements['水'] = 1;

  battle.setActionDirection(state, hero.id, 0, 'right');
  assert.equal(battle.useActionSlot(state, hero.id, 0, null), true);

  assert.equal(cell.elements['火'], 2);
  assert.equal(cell.elements['水'], 0);
});

test('LB07 enemy elements use 99 layer terrain threshold', () => {
  const state = createGameState({ activePets: [] });
  state.phase = 'monster_turn';
  state.round = 1;
  state.units = [];
  state.leaders.player.hp = 200;
  state.leaders.player.maxHp = 200;
  state.leaders.player.position = { r: 0, c: 0 };
  const enemy = makeUnit(state, 'enemy', 'pal_001', { id: 'enemy_element_99', hp: 5, atk: 0, ap: 0, position: { r: 0, c: 1 } });
  state.units.push(enemy);
  battle.syncDerivedBoard(state);

  for (let i = 0; i < 3; i += 1) battle.runMonsterTurn(state);
  const cell = state.board.cells.find(c => c.r === 0 && c.c === 0);
  assert.equal(cell.terrain.modules.length, 0);
  assert.equal(cell.elements[enemy.element], 3);

  for (let i = 3; i < 99; i += 1) battle.runMonsterTurn(state);
  assert.equal(cell.elements[enemy.element], 0);
  assert.ok(cell.terrain.modules.some(m => m.element === enemy.element && m.layers === 99));
});

test('LB08 hitting formed terrain adds another terrain module without restoring pending elements', () => {
  const state = createGameState({ activePets: ['pal_005'] });
  state.phase = 'player_turn';
  state.round = 1;
  state.units = state.units.filter(u => u.side === 'hero');
  const hero = firstHero(state);
  hero.position = { r: 6, c: 1 };
  hero.shape = Object.assign({}, hero.shape, { baseLayers: 3 });
  battle.syncDerivedBoard(state);
  battle.setActionDirection(state, hero.id, 0, 'right');
  assert.equal(battle.useActionSlot(state, hero.id, 0, null), true);
  resetSlot(hero, 0);
  assert.equal(battle.useActionSlot(state, hero.id, 0, null), true);

  const cell = state.board.cells.find(c => c.r === 6 && c.c === 2);
  assert.equal(cell.elements['火'], 0);
  assert.equal(cell.terrain.modules.filter(m => m.element === '火').length, 2);
});

test('LB09 element settlement is linear: 3 layers deal 3 damage, not triangular 6', () => {
  const state = createGameState({ activePets: ['pal_006'] });
  state.phase = 'player_turn';
  state.round = 1;
  const target = makeUnit(state, 'enemy', 'pal_001', { id: 'linear_target', hp: 10, position: { r: 1, c: 1 } });
  target.elements['火'] = 3;
  state.units.push(target);

  battle.settleElements(state);
  assert.equal(target.hp, 7);
  const damage = state.events.find(e => e.type === 'ELEMENT_SETTLE' && e.targetId === target.id);
  assert.equal(damage.damage, 3);
});
