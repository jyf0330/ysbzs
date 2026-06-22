const test = require('node:test');
const assert = require('node:assert/strict');
const { createGameState, makeUnit, syncBoardUnits } = require('../../src/core/state.cjs');
const { dispatch } = require('../../src/core/reducer.cjs');
const battle = require('../../src/core/battle.cjs');

function configureSingleCellSlot(unit, element = '火') {
  unit.shape = Object.assign({}, unit.shape, {
    shapeId: '01',
    shapeName: '形状01',
    baseLayers: 1,
    settleCount: 1,
    hitCells: 1,
    slotCount: 1,
    slotElements: [element]
  });
}

test('智能站位避免把高行动伤害浪费在低血目标上', () => {
  const state = createGameState({ activePets: ['pal_005'], battleId: 'auto_position_overkill' });
  state.phase = 'player_turn';
  state.events = [];
  state.leaders.enemy.alive = false;
  state.leaders.enemy.hp = 0;
  state.leaders.enemy.position = null;

  const actor = state.units.find(unit => unit.side === 'hero' && unit.alive);
  assert.ok(actor, '需要一个我方单位');
  actor.position = { r: 4, c: 4 };
  actor.moveRange = 0;
  actor.atk = 10;
  actor.def = 0;
  actor.shield = 0;
  actor.actionSlotsUsed = {};
  actor.hasAttacked = false;
  configureSingleCellSlot(actor);

  const lowHpEnemy = makeUnit(state, 'enemy', 'pal_001', {
    id: 'enemy_low_hp',
    hp: 1,
    atk: 1,
    def: 0,
    shield: 0,
    position: { r: 4, c: 5 },
    applyQualityProgression: false
  });
  lowHpEnemy.name = '低血目标';
  lowHpEnemy.displayName = '低血目标';

  const sturdyEnemy = makeUnit(state, 'enemy', 'pal_002', {
    id: 'enemy_sturdy',
    hp: 20,
    atk: 1,
    def: 0,
    shield: 0,
    position: { r: 4, c: 3 },
    applyQualityProgression: false
  });
  sturdyEnemy.name = '高血目标';
  sturdyEnemy.displayName = '高血目标';

  state.units.push(lowHpEnemy, sturdyEnemy);
  syncBoardUnits(state);

  const plan = battle.buildPlayerPositionPlan(state);
  assert.equal(plan.directions[0].dir, 'left');
  assert.deepEqual(plan.directions[0].targets, [sturdyEnemy.id]);
  assert.equal(plan.effectiveDamage, 10);
  assert.equal(plan.overflow, 0);

  const result = dispatch(state, { type: 'AUTO_POSITION_HEROES' });
  assert.equal(result.ok, true);
  assert.equal(state.actionDirs[`${actor.id}:slot0`], 'left');
  assert.equal(result.plan.effectiveDamage, 10);
  assert.equal(result.plan.overflow, 0);
});
