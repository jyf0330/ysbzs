#!/usr/bin/env node
'use strict';
const { Client } = require('boardgame.io/client');
const { YSBZSGame } = require('../src/YSBZSGame.cjs');
function assert(cond, msg) { if (!cond) throw new Error(msg); }
const client = Client({ game: YSBZSGame, numPlayers: 1, debug: false });
client.start();
let state = client.getState();
assert(state && state.G && state.ctx, 'Client must expose boardgame.io state');
client.moves.setupDay7FireTrial();
state = client.getState();
assert(state.G.day7Trial, 'Client move setupDay7FireTrial must update G');
client.moves.runDay7FireTurn1();
state = client.getState();
assert(state.G.day7Trial.scenario.passedRound1Standard, 'Client move runDay7FireTurn1 must pass round1 standard');
client.moves.runDay7FireTrialAll();
state = client.getState();
assert(state.G.day7Trial.scenario.status === 'trial_pass', 'Client move runDay7FireTrialAll must reach trial_pass');
assert(state.deltalog.some(e => e.action && e.action.payload && e.action.payload.type === 'runDay7FireTrialAll'), 'Client state deltalog must include boardgame.io move');
client.stop();
console.log('PASS boardgame.io Client: client.moves -> YSBZSGame.moves -> G update -> log');
console.log(JSON.stringify({ status: state.G.day7Trial.scenario.status, killedCloneCount: state.G.day7Trial.scenario.killedCloneCount, deltalog: state.deltalog.length }, null, 2));
