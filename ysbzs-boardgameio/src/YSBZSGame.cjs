'use strict';

/**
 * Real boardgame.io Game wrapper for ysbzs.
 *
 * Hard boundary:
 * - upstream/boardgame.io-main is unmodified.
 * - apps/ysbzs remains the rules kernel.
 * - this app is the only boardgame.io integration shell.
 *
 * Mapping:
 * - boardgame.io G  = ysbzs state
 * - boardgame.io ctx = lifecycle metadata managed by boardgame.io
 * - boardgame.io moves = public ysbzs actions dispatched into reducer
 */
const path = require('path');
const ysbzsRoot = path.resolve(__dirname, '../../ysbzs');
const { createGameState } = require(path.join(ysbzsRoot, 'src/core/state.cjs'));
const { dispatch } = require(path.join(ysbzsRoot, 'src/core/reducer.cjs'));
const { buildIndexes } = require(path.join(ysbzsRoot, 'src/core/data.cjs'));

function sanitizeForBoardgameIO(value) {
  return JSON.parse(JSON.stringify(value));
}

function makeInitialState(setupData = {}) {
  return sanitizeForBoardgameIO(createGameState(Object.assign({ gold: 30 }, setupData || {})));
}

function hydrateForYSBZS(G) {
  if (G && G.data) {
    const indexes = buildIndexes(G.data);
    G.data.index = indexes;
    G.indexes = indexes;
  }
  return G;
}

function dispatchIntoYSBZS(G, action) {
  if (!action || !action.type) throw new Error('YSBZSGame move requires action.type');
  const working = sanitizeForBoardgameIO(G);
  hydrateForYSBZS(working);
  dispatch(working, action);
  return sanitizeForBoardgameIO(working);
}

function getDay7Summary(G) {
  const scenario = G.day7Trial && G.day7Trial.scenario;
  return {
    title: scenario && scenario.title,
    status: scenario && scenario.status,
    round1KillCount: scenario && scenario.round1KillCount,
    killedCloneCount: scenario && scenario.killedCloneCount,
    passedRound1Standard: scenario && scenario.passedRound1Standard,
    remainingEnemies: scenario && scenario.remainingEnemies,
    stateID: G._stateID,
  };
}

const YSBZSGame = {
  name: 'ysbzs',

  setup: ({ ctx }, setupData) => {
    const G = makeInitialState(setupData);
    G.boardgameio = {
      mounted: true,
      source: 'apps/ysbzs-boardgameio/src/YSBZSGame.cjs',
      note: 'This state is owned by boardgame.io G and mutated only via boardgame.io moves.'
    };
    return sanitizeForBoardgameIO(G);
  },

  moves: {
    dispatchGameAction: ({ G }, action) => dispatchIntoYSBZS(G, action),
    setupDay7FireTrial: ({ G }) => dispatchIntoYSBZS(G, { type: 'SETUP_DAY7_FIRE_TRIAL' }),
    runDay7FireTurn1: ({ G }) => dispatchIntoYSBZS(G, { type: 'RUN_DAY7_FIRE_TURN_1' }),
    runDay7FireRound: ({ G }, round = null) => dispatchIntoYSBZS(G, { type: 'RUN_DAY7_FIRE_ROUND', round }),
    runDay7FireTrialAll: ({ G }) => dispatchIntoYSBZS(G, { type: 'RUN_DAY7_FIRE_TRIAL_ALL' }),
    getDay7Summary: ({ G }) => {
      G.boardgameio.lastSummary = getDay7Summary(G);
      return G;
    },
  },

  turn: {
    moveLimit: 999,
  },

  phases: {
    battle: {
      start: true,
      moves: {
        dispatchGameAction: ({ G }, action) => dispatchIntoYSBZS(G, action),
        setupDay7FireTrial: ({ G }) => dispatchIntoYSBZS(G, { type: 'SETUP_DAY7_FIRE_TRIAL' }),
        runDay7FireTurn1: ({ G }) => dispatchIntoYSBZS(G, { type: 'RUN_DAY7_FIRE_TURN_1' }),
        runDay7FireRound: ({ G }, round = null) => dispatchIntoYSBZS(G, { type: 'RUN_DAY7_FIRE_ROUND', round }),
        runDay7FireTrialAll: ({ G }) => dispatchIntoYSBZS(G, { type: 'RUN_DAY7_FIRE_TRIAL_ALL' }),
        getDay7Summary: ({ G }) => {
          G.boardgameio.lastSummary = getDay7Summary(G);
          return G;
        },
      },
      next: 'reward',
    },
    reward: { next: 'shop' },
    shop: { next: 'battle' },
  },

  endIf: ({ G }) => {
    const status = G.day7Trial && G.day7Trial.scenario && G.day7Trial.scenario.status;
    if (status === 'direct_win' || status === 'trial_pass') return { winner: '0', status };
    if (status === 'trial_fail') return { winner: '1', status };
  },
};

module.exports = { YSBZSGame, makeInitialState, dispatchIntoYSBZS, getDay7Summary, sanitizeForBoardgameIO, hydrateForYSBZS };
