const test = require('node:test');
const assert = require('node:assert/strict');

const { createGameState, makeUnit, getCell } = require('../src/core/state.cjs');
const battle = require('../src/core/battle.cjs');
const { createViewModel } = require('../src/uiAdapter.cjs');

function keepOnlyHeroes(state) {
  state.units = state.units.filter(u => u.side === 'hero');
  return state.units;
}

test('PA01 player auto plan kills multiple low HP targets before sending spare damage to Boss', () => {
  const state = createGameState({ activePets: ['pal_005', 'pal_006', 'pal_001', 'pal_022'] });
  state.phase = 'player_turn';
  state.round = 1;
  const heroes = keepOnlyHeroes(state);
  heroes.forEach((hero, i) => {
    hero.position = { r: 7 - i, c: 0 };
    hero.shape = Object.assign({}, hero.shape, { hitCells: 1, baseLayers: 1, slotCount: 1, slotElements: [hero.element] });
  });
  state.units.push(
    makeUnit(state, 'enemy', 'pal_001', { id: 'enemy_low_1', hp: 1, position: { r: 6, c: 4 } }),
    makeUnit(state, 'enemy', 'pal_006', { id: 'enemy_low_2', hp: 1, position: { r: 5, c: 4 } })
  );
  state.leaders.enemy.hp = 80;
  state.leaders.enemy.position = { r: 4, c: 4 };
  battle.syncDerivedBoard(state);

  const plan = battle.buildPlayerAutoPlan(state);
  const targets = plan.actions.flatMap(a => a.targets);
  assert.ok(targets.includes('enemy_low_1'));
  assert.ok(targets.includes('enemy_low_2'));
  assert.ok(targets.includes('enemy_boss'));
  assert.equal(plan.overflow, 0);
});

test('PA02 enemy intent chooses a lethal player leader hit over the nearest pet', () => {
  const state = createGameState({ activePets: ['pal_005'] });
  state.phase = 'monster_turn';
  state.round = 1;
  const hero = state.units.find(u => u.side === 'hero');
  hero.id = 'near_hero';
  hero.hp = 20;
  hero.maxHp = 20;
  hero.position = { r: 1, c: 0 };
  state.leaders.player.hp = 1;
  state.leaders.player.maxHp = 1;
  state.leaders.player.position = { r: 0, c: 4 };
  const enemy = makeUnit(state, 'enemy', 'pal_001', { id: 'enemy_picker', hp: 10, atk: 2, ap: 3, position: { r: 0, c: 0 } });
  enemy.shape = Object.assign({}, enemy.shape, { hitCells: 1, baseLayers: 1, slotCount: 1, slotElements: [enemy.element] });
  state.units.push(enemy);
  battle.syncDerivedBoard(state);

  const intent = battle.computeMonsterIntent(state, enemy);
  assert.equal(intent.targetId, state.leaders.player.id);
  assert.equal(intent.willAttack, true);
});

test('PA03 enemy movement triggers terrain modules step by step', () => {
  const state = createGameState({ activePets: [] });
  state.phase = 'monster_turn';
  state.round = 1;
  state.units = [];
  state.leaders.player.hp = 20;
  state.leaders.player.position = { r: 0, c: 4 };
  const enemy = makeUnit(state, 'enemy', 'pal_001', { id: 'enemy_runner', hp: 5, atk: 1, ap: 3, position: { r: 0, c: 0 } });
  enemy.shape = Object.assign({}, enemy.shape, { hitCells: 1, baseLayers: 1, slotCount: 1, slotElements: [enemy.element] });
  state.units.push(enemy);
  const trap = getCell(state, 0, 1);
  trap.terrain.modules.push({ element: '火', layers: 2, camp: 'player', source: 'test_trap', damage: 2 });
  battle.syncDerivedBoard(state);

  battle.runMonsterTurn(state);
  assert.equal(enemy.hp, 3);
  assert.ok(state.events.some(e => e.type === 'TERRAIN_TRIGGER' && e.unitId === enemy.id && e.r === 0 && e.c === 1));
});

test('PA04 enemy attack keeps enemy element in core but hides it from default ViewModel board cells', () => {
  const state = createGameState({ activePets: [] });
  state.phase = 'monster_turn';
  state.round = 1;
  state.units = [];
  state.leaders.player.hp = 20;
  state.leaders.player.position = { r: 0, c: 0 };
  const enemy = makeUnit(state, 'enemy', 'pal_001', { id: 'enemy_caster', hp: 5, atk: 1, ap: 0, position: { r: 0, c: 1 } });
  enemy.shape = Object.assign({}, enemy.shape, { hitCells: 1, baseLayers: 1, slotCount: 1, slotElements: [enemy.element] });
  state.units.push(enemy);
  battle.syncDerivedBoard(state);

  battle.runMonsterTurn(state);
  const coreCell = getCell(state, 0, 0);
  assert.equal(coreCell.elements[enemy.element], 1);
  assert.equal(coreCell.elementCamps[enemy.element], 'enemy');

  const vmCell = createViewModel(state).board.cells.find(c => c.r === 0 && c.c === 0);
  assert.equal(vmCell.elements[enemy.element], 0);
});
