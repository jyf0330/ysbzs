const test = require('node:test');
const assert = require('node:assert/strict');
const { createGameState, makeUnit, syncBoardUnits } = require('../../src/core/state.cjs');
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

function makePlanningState({ bossHp }) {
  const state = createGameState({ activePets: ['pal_005'], battleId: 'auto_position_boss_priority' });
  state.phase = 'player_turn';
  state.events = [];
  state.leaders.enemy.position = { r: 4, c: 5 };
  state.leaders.enemy.hp = bossHp;
  state.leaders.enemy.maxHp = Math.max(Number(state.leaders.enemy.maxHp || 0), bossHp);
  state.leaders.enemy.shield = 0;
  state.leaders.enemy.def = 0;
  state.leaders.enemy.alive = true;

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

  const minion = makeUnit(state, 'enemy', 'pal_001', {
    id: 'enemy_minion',
    hp: 20,
    atk: 1,
    def: 0,
    shield: 0,
    position: { r: 4, c: 3 },
    applyQualityProgression: false
  });
  minion.name = '小怪';
  minion.displayName = '小怪';
  state.units.push(minion);
  syncBoardUnits(state);
  return { state, actor, minion, boss: state.leaders.enemy };
}

test('智能站位在 Boss 打不死且小怪存活时不优先打 Boss', () => {
  const { state, minion } = makePlanningState({ bossHp: 100 });

  const plan = battle.buildPlayerPositionPlan(state);

  assert.equal(plan.directions[0].dir, 'left');
  assert.deepEqual(plan.directions[0].targets, [minion.id]);
  assert.equal(plan.bossDamage, 0);
});

test('智能站位在 Boss 可直接击杀时允许优先打 Boss', () => {
  const { state, boss } = makePlanningState({ bossHp: 10 });

  const plan = battle.buildPlayerPositionPlan(state);

  assert.equal(plan.directions[0].dir, 'right');
  assert.deepEqual(plan.directions[0].targets, [boss.id]);
  assert.equal(plan.kills, 1);
});
