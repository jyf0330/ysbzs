#!/usr/bin/env node
'use strict';
const { InitializeGame, CreateGameReducer } = require('boardgame.io/internal');
const { YSBZSGame } = require('../src/YSBZSGame.cjs');

function makeMove(type, args = [], playerID = '0') {
  return { type: 'MAKE_MOVE', payload: { type, args, playerID } };
}
function assert(cond, msg) { if (!cond) throw new Error(msg); }

let state = InitializeGame({ game: YSBZSGame, numPlayers: 1, setupData: { gold: 30 } });
assert(state && state.G && state.ctx, 'boardgame.io InitializeGame must produce state with G/ctx');
assert(state.G.boardgameio && state.G.boardgameio.mounted, 'ysbzs state must be mounted inside boardgame.io G');
const reducer = CreateGameReducer({ game: YSBZSGame });
state = reducer(state, makeMove('setupDay7FireTrial'));
assert(state.G.day7Trial, 'setupDay7FireTrial must update G.day7Trial through boardgame.io reducer');
state = reducer(state, makeMove('runDay7FireTurn1'));
assert(state.G.day7Trial.scenario.round1KillCount >= 2, 'runDay7FireTurn1 must kill at least 2 clones');
assert(state.G.day7Trial.scenario.passedRound1Standard === true, 'round1 standard must pass');
state = reducer(state, makeMove('runDay7FireTrialAll'));
assert(state.G.day7Trial.scenario.status === 'trial_pass', 'runDay7FireTrialAll must reach trial_pass');
assert(Array.isArray(state.deltalog), 'boardgame.io state must contain deltalog array');
assert(state.deltalog.some(e => e.action && e.action.type === 'MAKE_MOVE' && e.action.payload.type === 'runDay7FireTrialAll'), 'boardgame.io deltalog must record real move');
console.log('PASS boardgame.io reducer: MAKE_MOVE -> YSBZSGame.moves -> ysbzs reducer/core -> boardgame.io G/log');
console.log(JSON.stringify({ ctx: { phase: state.ctx.phase, turn: state.ctx.turn, currentPlayer: state.ctx.currentPlayer, gameover: state.ctx.gameover }, summary: state.G.day7Trial.scenario, boardgameDeltalogCount: state.deltalog.length }, null, 2));
