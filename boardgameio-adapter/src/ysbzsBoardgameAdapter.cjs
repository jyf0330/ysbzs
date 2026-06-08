'use strict';

/**
 * ysbzsBoardgameAdapter.cjs
 *
 * This is the only integration layer that may know both boardgame.io-style
 * concepts and the existing ysbzs reducer/uiAdapter model.
 *
 * Hard rule: do not edit upstream boardgame.io files.
 * Boardgame.io concepts are mapped as:
 *   G   -> ysbzs game state
 *   ctx -> day / round / phase / seed metadata
 *   moves -> public dispatchGameAction types
 *   plugins -> ysbzs elements / modifier / trigger / changeLog systems
 */

const path = require('path');
const ysbzsRoot = path.resolve(__dirname, '../../apps/ysbzs');
const { createGameState } = require(path.join(ysbzsRoot, 'src/core/state.cjs'));
const { dispatch } = require(path.join(ysbzsRoot, 'src/core/reducer.cjs'));

function createInitialG(options = {}) {
  return createGameState(options);
}

function moveDispatch(G, ctx, action) {
  if (!action || !action.type) throw new Error('boardgame adapter move requires action.type');
  dispatch(G, action);
  return G;
}

const YSBZSGame = {
  name: 'ysbzs',
  setup: () => createInitialG(),
  moves: {
    dispatchGameAction: moveDispatch,
    setupDay7FireTrial: (G, ctx) => moveDispatch(G, ctx, { type: 'SETUP_DAY7_FIRE_TRIAL' }),
    runDay7FireTurn1: (G, ctx) => moveDispatch(G, ctx, { type: 'RUN_DAY7_FIRE_TURN_1' }),
    runDay7FireTrialAll: (G, ctx) => moveDispatch(G, ctx, { type: 'RUN_DAY7_FIRE_TRIAL_ALL' })
  },
  turn: {
    moveLimit: 999
  },
  phases: {
    battle: { start: true, next: 'reward' },
    reward: { next: 'shop' },
    shop: { next: 'battle' }
  }
};

if (require.main === module) {
  const G = createInitialG({ gold: 30 });
  YSBZSGame.moves.setupDay7FireTrial(G, {});
  YSBZSGame.moves.runDay7FireTurn1(G, {});
  console.log('PASS adapter smoke: boardgame.io-style move -> ysbzs reducer');
  console.log(JSON.stringify({ phase: G.phase, day: G.day, round: G.round, day7Trial: G.day7Trial && G.day7Trial.scenario }, null, 2));
}

module.exports = { YSBZSGame, createInitialG, moveDispatch };
