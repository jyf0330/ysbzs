const test = require('node:test');
const assert = require('node:assert/strict');
const { createGameState } = require('../../src/core/state.cjs');
const battle = require('../../src/core/battle.cjs');
const { makeUnitFromData } = require('../../src/core/unitFactory.cjs');
const { solvePuzzle } = require('../../src/core/puzzleSolver.cjs');
const { generatePuzzleCandidates } = require('../../src/core/puzzleGenerator.cjs');

function exactState() {
  const state = createGameState({
    activePets: ['pal_005'],
    day: 99,
    period: '谜题',
    seed: 'puzzle-solver-test'
  });
  const hero = state.units.find(u => u.side === 'hero');
  hero.id = 'hero_fire';
  hero.position = { r: 3, c: 3 };
  hero.moveRange = 0;
  hero.ap = 1;
  hero.actionApSpent = 0;
  hero.actionSlotsUsed = {};
  hero.hasAttacked = false;
  hero.shape = Object.assign({}, hero.shape, {
    shapeId: '01',
    shapeName: '形状01',
    hitCells: 1,
    baseLayers: 1,
    slotCount: 1,
    slotElements: ['火']
  });

  state.units = [hero];
  const enemy = makeUnitFromData(state, 'enemy', 'pal_001', {
    id: 'enemy_target',
    hp: 6,
    shield: 0,
    position: { r: 3, c: 4 },
    mechanics: ['none']
  });
  state.units.push(enemy);
  state.phase = 'player_turn';
  state.round = 1;
  battle.syncDerivedBoard(state);
  return state;
}

test('PS01 exact solver finds the shortest reducer-backed action sequence', () => {
  const solved = solvePuzzle(exactState(), {
    maxDepth: 1,
    maxSolutions: 4,
    requireUnique: true
  });

  assert.equal(solved.status, 'solved');
  assert.equal(solved.shortestDepth, 1);
  assert.equal(solved.solutionCount, 1);
  assert.deepEqual(solved.solution.map(step => step.type), ['USE_ACTION_SLOT']);
  assert.equal(solved.finalState.units.find(u => u.id === 'enemy_target').alive, false);
  assert.ok(solved.solution[0].stateHash, 'each accepted step records a deterministic state hash');
});

test('PS02 exact solver distinguishes unsolved and non-unique candidate puzzles', () => {
  const unsolved = solvePuzzle(exactState(), {
    maxDepth: 0
  });
  assert.equal(unsolved.status, 'unsolved');

  const state = exactState();
  const hero = state.units.find(u => u.id === 'hero_fire');
  hero.ap = 4;
  battle.syncDerivedBoard(state);
  const nonUnique = solvePuzzle(state, {
    maxDepth: 1,
    maxSolutions: 4,
    requireUnique: true
  });
  assert.equal(nonUnique.status, 'non_unique');
  assert.equal(nonUnique.solutionCount > 1, true);
});

test('PS03 generator filters candidates through the exact solver', () => {
  const generated = generatePuzzleCandidates({
    baseState: exactState,
    maxDepth: 1,
    count: 2,
    requireUnique: true
  });

  assert.equal(generated.length, 2);
  for (const item of generated) {
    assert.equal(item.solve.status, 'solved');
    assert.equal(item.solve.solutionCount, 1);
    assert.ok(item.puzzleId.startsWith('generated_exact_'));
  }
});
