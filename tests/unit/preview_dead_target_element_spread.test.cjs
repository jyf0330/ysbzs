const test = require('node:test');
const assert = require('node:assert/strict');
const battle = require('../../src/core/battle.cjs');
const { createGameState, getCell, syncBoardUnits } = require('../../src/core/state.cjs');

function adjacentStandForTarget(state, target) {
  const candidates = [
    { pos: { r: target.position.r, c: target.position.c - 1 }, dir: 'right' },
    { pos: { r: target.position.r, c: target.position.c + 1 }, dir: 'left' },
    { pos: { r: target.position.r - 1, c: target.position.c }, dir: 'down' },
    { pos: { r: target.position.r + 1, c: target.position.c }, dir: 'up' }
  ];
  return candidates.find(x => {
    if (x.pos.r < 0 || x.pos.c < 0 || x.pos.r >= state.board.rows || x.pos.c >= state.board.cols) return false;
    const cell = getCell(state, x.pos.r, x.pos.c);
    return cell && !cell.unitId;
  });
}

test('preview only reports damage to living units and does not preview future elements', () => {
  const state = createGameState({ activePets: ['pal_005'], battleId: 'preview_dead_target_element_spread' });
  battle.startBattle(state);
  const actor = state.units.find(u => u.side === 'hero' && u.alive);
  const target = state.units.find(u => u.side === 'enemy' && u.alive);
  assert.ok(actor && target, 'test needs one hero and one enemy');

  for (const other of state.units.filter(u => u.side === 'enemy' && u.id !== target.id)) {
    other.alive = false;
    other.hp = 0;
    other.position = null;
  }

  const stand = adjacentStandForTarget(state, target);
  assert.ok(stand, 'test needs a legal adjacent stand cell');
  actor.position = stand.pos;
  actor.atk = 5;
  actor.ap = 3;
  actor.shape = Object.assign({}, actor.shape, {
    shapeId: '01',
    shapeName: '形状01',
    baseLayers: 1,
    settleCount: 1,
    hitCells: 1,
    slotCount: 3,
    slotElements: ['火', '水', '风']
  });
  target.hp = 3;
  target.shield = 0;
  target.def = 0;
  for (let i = 0; i < 3; i++) state.actionDirs[`${actor.id}:slot${i}`] = stand.dir;
  syncBoardUnits(state);

  const previews = battle.buildPreviewGrid(state, { unitId: actor.id })
    .filter(p => p.r === target.position.r && p.c === target.position.c);

  assert.deepEqual(previews.map(p => p.slotIndex), [0]);
  assert.equal(previews[0].hitEnemy, true, 'first attack should still hit the living enemy');
  assert.equal(previews[0].targetId, target.id);
  assert.equal(previews[0].predictedKill, true);
  assert.equal(previews[0].predictedHpTo, 0);

  assert.equal(previews.length, 1, 'later same-cell slots should not emit empty-cell element previews after the unit is dead');
  for (const preview of previews) {
    assert.equal(Object.prototype.hasOwnProperty.call(preview, 'generatedElements'), false);
    assert.equal(Object.prototype.hasOwnProperty.call(preview, 'projectedElements'), false);
    assert.equal(Object.prototype.hasOwnProperty.call(preview, 'projectedElementsBeforeSettle'), false);
  }
});

test('preview reports friendly and enemy unit injuries but skips empty cells', () => {
  const state = createGameState({ activePets: ['pal_005', 'pal_006'], battleId: 'preview_damage_only_units' });
  battle.startBattle(state);
  const heroes = state.units.filter(u => u.side === 'hero' && u.alive);
  const actor = heroes[0];
  const ally = heroes[1];
  assert.ok(actor && ally, 'test needs two hero units');

  for (const enemy of state.units.filter(u => u.side === 'enemy')) {
    enemy.alive = false;
    enemy.hp = 0;
    enemy.position = null;
  }

  actor.position = { r: 4, c: 4 };
  ally.position = { r: 4, c: 5 };
  actor.atk = 4;
  actor.ap = 1;
  actor.shape = Object.assign({}, actor.shape, {
    shapeId: '01',
    shapeName: '形状01',
    baseLayers: 1,
    settleCount: 1,
    hitCells: 2,
    slotCount: 1,
    slotElements: ['火']
  });
  ally.hp = 10;
  ally.shield = 1;
  ally.def = 0;
  state.actionDirs[`${actor.id}:slot0`] = 'right';
  syncBoardUnits(state);

  const previews = battle.buildPreviewGrid(state, { unitId: actor.id }).filter(p => p.actorId === actor.id);
  assert.equal(previews.length, 1, 'empty cells in the action area should not emit preview records');
  const hit = previews[0];
  assert.equal(hit.targetId, ally.id);
  assert.equal(hit.hitEnemy, false);
  assert.equal(hit.hitAlly, true);
  assert.equal(hit.predictedDamage, 4);
  assert.equal(hit.predictedShieldDamage, 1);
  assert.equal(hit.predictedHpDamage, 3);
  assert.equal(hit.predictedHpFrom, 10);
  assert.equal(hit.predictedHpTo, 7);
  assert.equal(Object.prototype.hasOwnProperty.call(hit, 'generatedElements'), false);
  assert.equal(Object.prototype.hasOwnProperty.call(hit, 'projectedElements'), false);
});
