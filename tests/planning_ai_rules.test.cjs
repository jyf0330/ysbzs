const test = require('node:test');
const assert = require('node:assert/strict');

const { createGameState, makeUnit, getCell } = require('../src/core/state.cjs');
const battle = require('../src/core/battle.cjs');
const { createViewModel } = require('../src/uiAdapter.cjs');

function keepOnlyHeroes(state) {
  state.units = state.units.filter(u => u.side === 'hero');
  return state.units;
}

function makeEnemyPet(state, overrides = {}) {
  const enemy = makeUnit(state, 'enemy', 'pal_001', Object.assign({
    id: 'enemy_pet_actor',
    hp: 30,
    atk: 4,
    ap: 3,
    position: { r: 0, c: 1 }
  }, overrides));
  enemy.name = overrides.name || '棉悠悠';
  enemy.displayName = `敌方${enemy.name}`;
  enemy.element = overrides.element ?? '火';
  enemy.shape = Object.assign({}, enemy.shape, {
    hitCells: overrides.hitCells ?? 1,
    baseLayers: 1,
    slotCount: overrides.slotCount ?? 3,
    slotElements: overrides.slotElements || [enemy.element, enemy.element, enemy.element],
    tags: overrides.tags || ['近战']
  });
  return enemy;
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

test('PA02 enemy pet attacks an in-range player pet before moving toward the player core', () => {
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
  assert.equal(intent.targetId, hero.id);
  assert.equal(intent.willAttack, true);
});

test('PA03 enemy pet movement does not enter terrain trap cells', () => {
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
  assert.equal(enemy.hp, 5);
  assert.deepEqual(enemy.position, { r: 0, c: 0 });
  assert.ok(!state.events.some(e => e.type === 'TERRAIN_TRIGGER' && e.unitId === enemy.id && e.r === 0 && e.c === 1));
});

test('PA04 enemy pet normal attack does not create default enemy element layers', () => {
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
  assert.equal(coreCell.elements[enemy.element], 0);
  assert.equal(coreCell.elementCamps[enemy.element], null);

  const vmCell = createViewModel(state).board.cells.find(c => c.r === 0 && c.c === 0);
  assert.equal(vmCell.elements[enemy.element], 0);
});

test('PA05 enemy pet spends AP on consecutive action blocks when already in range', () => {
  const state = createGameState({ activePets: ['pal_005'] });
  state.phase = 'monster_turn';
  state.round = 1;
  const hero = state.units.find(u => u.side === 'hero');
  hero.id = 'frontline_pet';
  hero.hp = 20;
  hero.maxHp = 20;
  hero.def = 0;
  hero.shield = 0;
  hero.position = { r: 0, c: 0 };
  state.leaders.player.position = { r: 7, c: 0 };
  const enemy = makeEnemyPet(state, { position: { r: 0, c: 1 }, atk: 4, ap: 3 });
  state.units.push(enemy);
  battle.syncDerivedBoard(state);

  const acted = battle.runMonsterTurn(state);

  assert.equal(acted, 3, '3 AP in range should produce three action-block attacks');
  assert.equal(hero.hp, 8, 'three ATK 4 action blocks should deal 12 total HP damage');
  assert.equal(state.events.filter(e => e.type === 'ENEMY_PET_ACTION').length, 3);
  assert.equal(state.events.filter(e => e.type === 'DAMAGE' && e.sourceId === enemy.id).length, 3);
});

test('PA06 enemy pet can move one step and keep attacking with remaining AP', () => {
  const state = createGameState({ activePets: [] });
  state.phase = 'monster_turn';
  state.round = 1;
  state.units = [];
  state.leaders.player.hp = 20;
  state.leaders.player.maxHp = 20;
  state.leaders.player.def = 0;
  state.leaders.player.shield = 0;
  state.leaders.player.position = { r: 0, c: 2 };
  const enemy = makeEnemyPet(state, { id: 'enemy_pet_runner', position: { r: 0, c: 0 }, atk: 4, ap: 3 });
  state.units.push(enemy);
  battle.syncDerivedBoard(state);

  const acted = battle.runMonsterTurn(state);

  assert.equal(acted, 3, 'one move plus two action blocks should consume 3 AP');
  assert.deepEqual(enemy.position, { r: 0, c: 1 });
  assert.equal(state.leaders.player.hp, 12);
  assert.equal(state.events.filter(e => e.type === 'ENEMY_PET_MOVE').length, 1);
  assert.equal(state.events.filter(e => e.type === 'ENEMY_PET_ACTION').length, 2);
});

test('PA07 enemy pet movement does not cross units, cores, element traps, or element cells', () => {
  const state = createGameState({ activePets: [] });
  state.phase = 'monster_turn';
  state.round = 1;
  state.units = [];
  state.leaders.player.hp = 20;
  state.leaders.player.position = { r: 0, c: 3 };
  const enemy = makeEnemyPet(state, { id: 'enemy_pet_blocked', position: { r: 0, c: 0 }, atk: 4, ap: 3 });
  state.units.push(enemy);
  const blockedCell = getCell(state, 0, 1);
  blockedCell.elements.火 = 1;
  battle.syncDerivedBoard(state);

  const acted = battle.runMonsterTurn(state);

  assert.equal(acted, 0);
  assert.deepEqual(enemy.position, { r: 0, c: 0 });
  assert.equal(state.leaders.player.hp, 20);
});

test('PA08 enemy pet normal attacks do direct damage and do not add default element layers', () => {
  const state = createGameState({ activePets: [] });
  state.phase = 'monster_turn';
  state.round = 1;
  state.units = [];
  state.leaders.player.hp = 20;
  state.leaders.player.position = { r: 0, c: 0 };
  const enemy = makeEnemyPet(state, { id: 'enemy_pet_no_element', position: { r: 0, c: 1 }, atk: 4, ap: 1, element: '火' });
  state.units.push(enemy);
  battle.syncDerivedBoard(state);

  battle.runMonsterTurn(state);

  const targetCell = getCell(state, 0, 0);
  assert.equal(state.leaders.player.hp, 16);
  assert.equal(targetCell.elements.火, 0);
  assert.equal(targetCell.elementCamps.火, null);
});

test('PA09 ViewModel previews enemy pet path, action blocks, total damage, and KO', () => {
  const state = createGameState({ activePets: ['pal_005'] });
  state.phase = 'player_turn';
  state.round = 1;
  const hero = state.units.find(u => u.side === 'hero');
  hero.id = 'preview_target_pet';
  hero.hp = 10;
  hero.maxHp = 10;
  hero.def = 0;
  hero.shield = 0;
  hero.position = { r: 0, c: 0 };
  state.leaders.player.position = { r: 7, c: 0 };
  const enemy = makeEnemyPet(state, { id: 'enemy_pet_preview', position: { r: 0, c: 1 }, atk: 4, ap: 3 });
  state.units.push(enemy);
  battle.syncDerivedBoard(state);

  const vm = createViewModel(state);
  const intent = vm.monsterIntents.find(x => x.unitId === enemy.id);
  const threat = vm.threatGrid.find(x => x.r === hero.position.r && x.c === hero.position.c && x.unitId === enemy.id);

  assert.ok(intent, 'ViewModel should expose enemy pet intent');
  assert.equal(intent.unitName, '敌方棉悠悠');
  assert.equal(intent.totalDamage, 12);
  assert.equal(intent.expectedKill, true);
  assert.equal(intent.actions.length, 3);
  assert.deepEqual(intent.actions.map(a => a.apCost), [1, 1, 1]);
  assert.ok(threat, 'threatGrid should mark the target cell');
  assert.equal(threat.damage, 12);
  assert.equal(threat.lethal, true);
  assert.equal(threat.hits.length, 3);
});
