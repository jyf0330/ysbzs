#!/usr/bin/env node
const { createGameState } = require('../src/core/state.cjs');
const battle = require('../src/core/battle.cjs');
const { makeUnitFromData } = require('../src/core/unitFactory.cjs');
const { generatePuzzleCandidates } = require('../src/core/puzzleGenerator.cjs');

function demoState() {
  const state = createGameState({ activePets: ['pal_005'], day: 99, period: '谜题', seed: 'generate-puzzles-demo' });
  const hero = state.units.find(u => u.side === 'hero');
  hero.id = 'hero_fire';
  hero.position = { r: 3, c: 3 };
  hero.moveRange = 0;
  hero.ap = 3;
  hero.actionApSpent = 0;
  hero.actionSlotsUsed = {};
  hero.hasAttacked = false;
  hero.shape = Object.assign({}, hero.shape, {
    slotCount: 1,
    slotElements: ['火']
  });
  state.units = [hero];
  state.units.push(makeUnitFromData(state, 'enemy', 'pal_001', {
    id: 'enemy_target',
    hp: 6,
    shield: 0,
    position: { r: 3, c: 4 },
    mechanics: ['none']
  }));
  state.phase = 'player_turn';
  state.round = 1;
  battle.syncDerivedBoard(state);
  return state;
}

const count = Number(process.argv[2] || 1);
const candidates = generatePuzzleCandidates({
  baseState: demoState,
  count,
  maxDepth: 1,
  requireUnique: true
});

console.log(JSON.stringify(candidates.map(item => ({
  puzzleId: item.puzzleId,
  summary: item.summary,
  solution: item.solve.solution
})), null, 2));
