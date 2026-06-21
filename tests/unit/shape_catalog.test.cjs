const test = require('node:test');
const assert = require('node:assert/strict');

const {
  DEFAULT_SHAPE_SETTLE_COUNT,
  SHAPE_DEFINITIONS,
  normalizeShapeId,
  resolveShapeDefinition,
  shapeGroupFromBodySize,
  assignPetShapeToShapeRow,
  targetCellsForShape
} = require('../../src/core/battle/shapeCatalog.cjs');
const { createActionsModule } = require('../../src/core/battle/actions.cjs');
const { data, buildIndexes } = require('../../src/core/data.cjs');
const { makeUnitFromData } = require('../../src/core/unitFactory.cjs');

test('19 combat shapes are registered and all cells settle 3 times', () => {
  assert.equal(SHAPE_DEFINITIONS.length, 19);
  assert.deepEqual(SHAPE_DEFINITIONS.map(x => x.id), [
    '01', '02', '03', '04', '05', '06', '07', '08', '09', '10',
    '11', '12', '13', '14', '15', '16', '17', '18', '19'
  ]);
  assert.ok(SHAPE_DEFINITIONS.every(x => x.settleCount === DEFAULT_SHAPE_SETTLE_COUNT));
});

test('legacy shape ids are not accepted anymore', () => {
  assert.equal(normalizeShapeId('1'), '01');
  assert.equal(normalizeShapeId('S01'), '01');
  assert.equal(normalizeShapeId('shape_19'), '19');
  assert.equal(normalizeShapeId('A1'), null);
  assert.equal(normalizeShapeId('B1'), null);
  assert.equal(normalizeShapeId('T1'), null);
  assert.equal(normalizeShapeId('T2'), null);
  assert.equal(normalizeShapeId('C1'), null);
  assert.equal(resolveShapeDefinition('横扫三格'), null);
});

test('pet shape assignment replaces old source shape ids with 01-19 ids', () => {
  const small = assignPetShapeToShapeRow({ petId: 'pal_001', shapeId: 'A1', shapeName: '单点刺' }, { petId: 'pal_001', bodySize: '小型', role: '经济' });
  const medium = assignPetShapeToShapeRow({ petId: 'pal_005', shapeId: 'A1', shapeName: '单点刺' }, { petId: 'pal_005', bodySize: '中型', role: '输出' });
  const large = assignPetShapeToShapeRow({ petId: 'pal_011', shapeId: 'B1', shapeName: '横扫三格' }, { petId: 'pal_011', bodySize: '大型', role: '治疗' });

  assert.match(small.shapeId, /^0[1-4]$/);
  assert.match(medium.shapeId, /^(0[5-9]|1[0-2])$/);
  assert.match(large.shapeId, /^1[3-9]$/);
  assert.equal(small.sourceShapeId, undefined);
  assert.equal(large.sourceShapeId, undefined);
  assert.notEqual(small.shapeName, '单点刺');
  assert.notEqual(large.shapeName, '横扫三格');
});

test('every pet-created unit has exactly one new 01-19 shape', () => {
  const state = { data, indexes: buildIndexes(data), nextUnit: 1, board: { rows: 8, cols: 8 } };
  const seen = new Set();
  for (const pet of data.pets) {
    const unit = makeUnitFromData(state, 'hero', pet.id, { position: { r: 0, c: 0 } });
    assert.ok(unit.shape, pet.id);
    assert.match(unit.shape.shapeId, /^(0[1-9]|1[0-9])$/, pet.id);
    assert.ok(resolveShapeDefinition(unit.shape.shapeId), pet.id);
    assert.equal(resolveShapeDefinition(unit.shape.shapeId).group, shapeGroupFromBodySize(unit.bodySize), pet.id);
    assert.equal(unit.shape.settleCount, 3, pet.id);
    seen.add(unit.petId);
  }
  assert.equal(seen.size, data.pets.length);
});

test('shape offsets match the provided default-right diagrams', () => {
  const start = { r: 3, c: 3 };
  const inBoard = p => p.r >= 0 && p.c >= 0 && p.r < 8 && p.c < 8;

  assert.deepEqual(targetCellsForShape(start, '01', 'right', inBoard), [{ r: 3, c: 4 }]);
  assert.deepEqual(targetCellsForShape(start, '04', 'right', inBoard), [{ r: 3, c: 7 }]);
  assert.deepEqual(targetCellsForShape(start, '05', 'right', inBoard), [{ r: 3, c: 4 }, { r: 3, c: 5 }]);
  assert.deepEqual(targetCellsForShape(start, '09', 'right', inBoard), [{ r: 2, c: 4 }, { r: 4, c: 4 }]);
  assert.deepEqual(targetCellsForShape(start, '13', 'right', inBoard), [{ r: 2, c: 4 }, { r: 3, c: 4 }, { r: 4, c: 4 }]);
  assert.deepEqual(targetCellsForShape(start, '15', 'right', inBoard), [{ r: 3, c: 4 }, { r: 3, c: 5 }, { r: 3, c: 6 }]);
  assert.deepEqual(targetCellsForShape(start, '17', 'right', inBoard), [{ r: 2, c: 3 }, { r: 3, c: 4 }, { r: 4, c: 3 }]);
  assert.deepEqual(targetCellsForShape(start, '18', 'right', inBoard), [{ r: 2, c: 3 }, { r: 2, c: 4 }, { r: 3, c: 4 }]);
  assert.deepEqual(targetCellsForShape(start, '19', 'right', inBoard), [{ r: 2, c: 4 }, { r: 2, c: 5 }, { r: 3, c: 5 }]);
});

test('shape offsets rotate from the default-right orientation', () => {
  const start = { r: 3, c: 3 };
  const inBoard = p => p.r >= 0 && p.c >= 0 && p.r < 8 && p.c < 8;

  assert.deepEqual(targetCellsForShape(start, '15', 'up', inBoard), [{ r: 2, c: 3 }, { r: 1, c: 3 }, { r: 0, c: 3 }]);
  assert.deepEqual(targetCellsForShape(start, '15', 'left', inBoard), [{ r: 3, c: 2 }, { r: 3, c: 1 }, { r: 3, c: 0 }]);
  assert.deepEqual(targetCellsForShape(start, '13', 'down', inBoard), [{ r: 4, c: 4 }, { r: 4, c: 3 }, { r: 4, c: 2 }]);
});

test('actions module uses shape catalog cells and default settle count', () => {
  const deps = {
    pushEvent() {},
    mech: {},
    elementRules: {},
    explodeIfEnemyOnFire() { return null; },
    clone: v => JSON.parse(JSON.stringify(v)),
    getUnit() { return null; },
    living() { return []; },
    opposingCamp() { return 'enemy'; },
    unitCamp() { return 'player'; },
    sideForCamp() { return 'enemy'; },
    actionDirs() { return ['right', 'left', 'up', 'down']; },
    dirDelta(dir = 'right') {
      if (dir === 'up') return { dr: -1, dc: 0 };
      if (dir === 'down') return { dr: 1, dc: 0 };
      if (dir === 'left') return { dr: 0, dc: -1 };
      return { dr: 0, dc: 1 };
    },
    inBoard: p => p.r >= 0 && p.c >= 0 && p.r < 8 && p.c < 8,
    normalizePosition: p => ({ r: Number(p.r), c: Number(p.c) }),
    getCell() { return null; },
    combatTargets() { return []; },
    applyElement() {},
    applyElementToCell() {},
    damageUnit() {},
    syncDerivedBoard() {},
    startBattle() {}
  };
  const actions = createActionsModule(deps);
  const state = { actionDirs: {}, phase: 'player_turn' };
  const actor = {
    id: 'hero_shape_test',
    side: 'hero',
    alive: true,
    hp: 10,
    ap: 3,
    element: '火',
    position: { r: 3, c: 3 },
    shape: { shapeId: '17', baseLayers: 1, slotCount: 3 }
  };
  const slot = actions.slotsForUnit(state, actor)[0];

  assert.equal(slot.shapeId, '17');
  assert.equal(slot.hitCells, 3);
  assert.equal(slot.baseLayers, 1);
  assert.equal(slot.settleCount, 3);
  assert.equal(slot.layers, 3);
  assert.deepEqual(actions.targetCellsForSlot(state, actor, slot), [{ r: 2, c: 3 }, { r: 3, c: 4 }, { r: 4, c: 3 }]);
  assert.deepEqual(actions.targetCellsForSlot(state, actor, slot, { r: 3, c: 4 }), [{ r: 2, c: 3 }, { r: 3, c: 4 }, { r: 4, c: 3 }]);
  assert.deepEqual(actions.targetCellsForSlot(state, actor, slot, { r: 0, c: 0 }), []);
});
