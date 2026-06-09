const test = require('node:test');
const assert = require('node:assert/strict');
const { createLocalPredictionAdapter, createServerAuthorityAdapter } = require('../src/adapters/index.cjs');

test('PA01 local prediction and server authority produce the same hash for the same commands', () => {
  const opts = { battleId: 'battle_pa01', seed: 'fixed_seed', gold: 8, day: 1, period: '上午' };
  const local = createLocalPredictionAdapter(opts);
  const server = createServerAuthorityAdapter(opts);
  let n = 1;
  function step(type, payload = {}) {
    const baseStateVersion = server.getViewModel().stateVersion;
    const command = Object.assign({
      type,
      commandId: `pa01_${String(n++).padStart(3, '0')}`,
      playerId: 'p1',
      battleId: opts.battleId,
      baseStateVersion
    }, payload);
    const predicted = local.predict(command);
    const official = server.validate(command);
    assert.equal(predicted.accepted, true, `${type} predicted accepted`);
    assert.equal(official.accepted, true, `${type} official accepted`);
    assert.equal(predicted.stateVersion, official.stateVersion, `${type} stateVersion`);
    assert.equal(predicted.stateHash, official.stateHash, `${type} stateHash`);
    assert.equal(local.confirm(official).confirmed, true, `${type} confirm`);
    return official;
  }

  step('START_BATTLE');
  const heroId = server.getViewModel().heroes[0].id;
  step('SELECT_UNIT', { unitId: heroId });
  step('SELECT_SLOT', { unitId: heroId, slotId: 0 });
  step('SET_ACTION_DIRECTION', { unitId: heroId, slotId: 0, dir: 'right' });
  step('END_PLAYER_TURN');
});

test('PA02 server authority rejects stale baseStateVersion', () => {
  const server = createServerAuthorityAdapter({ battleId: 'battle_pa02', seed: 'fixed_seed', gold: 8 });
  const first = server.validate({ type: 'START_BATTLE', commandId: 'pa02_001', playerId: 'p1', baseStateVersion: 0 });
  assert.equal(first.accepted, true);
  const stale = server.validate({ type: 'END_PLAYER_TURN', commandId: 'pa02_002', playerId: 'p1', baseStateVersion: 0 });
  assert.equal(stale.ok, false);
  assert.equal(stale.accepted, false);
  assert.equal(stale.error.code, 'STATE_VERSION_MISMATCH');
});

test('PA03 future coop/pvp fields prevent controlling another player team unit', () => {
  const server = createServerAuthorityAdapter({
    battleId: 'battle_pa03',
    seed: 'fixed_seed',
    mode: 'pvp',
    players: {
      p1: { id: 'p1', name: '玩家A', teamId: 'team_player' },
      p2: { id: 'p2', name: '玩家B', teamId: 'team_enemy' }
    },
    teams: {
      team_player: { id: 'team_player', side: 'player', type: 'human', playerIds: ['p1'] },
      team_enemy: { id: 'team_enemy', side: 'enemy', type: 'human', playerIds: ['p2'] }
    }
  });
  server.validate({ type: 'START_BATTLE', commandId: 'pa03_001', playerId: 'p1', baseStateVersion: 0 });
  const heroId = server.getViewModel().heroes[0].id;
  const bad = server.validate({ type: 'SELECT_UNIT', commandId: 'pa03_002', playerId: 'p2', unitId: heroId, baseStateVersion: 1 });
  assert.equal(bad.ok, false);
  assert.equal(bad.accepted, false);
  assert.equal(bad.error.code, 'FORBIDDEN_UNIT_CONTROL');
});

test('PA04 ViewModel exposes multiplayer-ready metadata and trace events include command ownership', () => {
  const server = createServerAuthorityAdapter({ battleId: 'battle_pa04', seed: 'fixed_seed', gold: 8 });
  const result = server.validate({ type: 'START_BATTLE', commandId: 'pa04_001', playerId: 'p1', baseStateVersion: 0 });
  const vm = server.getViewModel();
  assert.equal(vm.battleId, 'battle_pa04');
  assert.equal(vm.mode, 'solo');
  assert.equal(vm.players.p1.teamId, 'team_player');
  assert.equal(vm.localPrediction.ready, true);
  assert.ok(vm.stateHash);
  assert.equal(result.trace.events.every(e => e.commandId === 'pa04_001' && e.playerId === 'p1'), true);
});
