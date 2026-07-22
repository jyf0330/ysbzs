const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..', '..');
const runtimePath = path.join(root, 'web/js/runtime-client.js');
const serverPath = path.join(root, 'tools/run_ui_server.cjs');

function loadRuntimeClient() {
  const source = fs.readFileSync(runtimePath, 'utf8')
    .replace(/export const /g, 'const ')
    .replace(/export function /g, 'function ');
  const context = {
    module: { exports: {} },
    exports: {},
    URLSearchParams,
    URL,
    Date,
    JSON,
    String,
    Number,
    Object,
    Array,
    Set,
    Math,
    window: global.window
  };
  vm.runInNewContext(`${source}
module.exports = {
  createLocalRuntime,
  readLocalBattleOperationLog,
  recordLocalBattleOperation,
  clearLocalBattleOperationLog
};`, context, { filename: runtimePath });
  return context.module.exports;
}

function createStorage() {
  const values = new Map();
  return {
    getItem(key) {
      return values.has(key) ? values.get(key) : null;
    },
    setItem(key, value) {
      values.set(key, String(value));
    },
    removeItem(key) {
      values.delete(key);
    }
  };
}

async function withWindow(fn) {
  const previousWindow = global.window;
  const storage = createStorage();
  global.window = {
    localStorage: storage,
    location: { search: '?sessionId=recorder-session', pathname: '/' }
  };
  try {
    return await fn(storage);
  } finally {
    if (previousWindow === undefined) delete global.window;
    else global.window = previousWindow;
  }
}

test('local runtime records player battle commands to localStorage', async () => {
  await withWindow(async storage => {
    const runtimeClient = loadRuntimeClient();
    const runtime = runtimeClient.createLocalRuntime({
      playerId: 'p1',
      engine: {
        action(command) {
          return {
            ok: true,
            command: command.type,
            events: [
              { type: 'PLAYER_SELECT_SLOT', text: '捣蛋猫 出击', damage: 4 },
              { type: 'DAMAGE', targetId: 'enemy_1', damage: 4, hpTo: 6 }
            ],
            viewModel: {
              phase: 'player_turn',
              round: 1,
              battleId: 'battle_001',
              stateVersion: 8,
              stateHash: 'hash-after'
            }
          };
        },
        view() {
          return { ok: true, viewModel: { phase: 'player_turn', round: 1, stateVersion: 7 } };
        }
      }
    });

    await runtime.action({
      type: 'RUN_PLAYER_ALL_OUT',
      commandId: 'cmd_all_out_1',
      battleId: 'battle_001',
      baseStateVersion: 7,
      playerId: 'p1'
    });

    const entries = runtimeClient.readLocalBattleOperationLog(storage);
    assert.equal(entries.length, 1);
    assert.equal(entries[0].runtimeKind, 'local');
    assert.equal(entries[0].sessionId, 'recorder-session');
    assert.equal(entries[0].command.type, 'RUN_PLAYER_ALL_OUT');
    assert.equal(entries[0].command.commandId, 'cmd_all_out_1');
    assert.equal(entries[0].result.phase, 'player_turn');
    assert.equal(entries[0].result.stateVersion, 8);
    assert.deepEqual(entries[0].result.events.map(event => event.type), ['PLAYER_SELECT_SLOT', 'DAMAGE']);
  });
});

test('local battle recorder ignores non-battle route commands', async () => {
  await withWindow(async storage => {
    const runtimeClient = loadRuntimeClient();
    const runtime = runtimeClient.createLocalRuntime({
      playerId: 'p1',
      engine: {
        action(command) {
          return {
            ok: true,
            command: command.type,
            events: [{ type: 'NODE_OPTIONS' }],
            viewModel: { phase: 'node_choice', stateVersion: 2 }
          };
        }
      }
    });

    await runtime.action({ type: 'GENERATE_NODE_OPTIONS', commandId: 'cmd_route_1', playerId: 'p1' });

    assert.deepEqual(runtimeClient.readLocalBattleOperationLog(storage), []);
  });
});

test('local battle recorder can be cleared by debug tools', async () => {
  await withWindow(async storage => {
    const runtimeClient = loadRuntimeClient();
    runtimeClient.recordLocalBattleOperation({
      runtimeKind: 'local',
      playerId: 'p1',
      command: { type: 'MOVE_HERO', commandId: 'cmd_move_1' },
      result: { viewModel: { phase: 'player_turn' }, events: [] }
    }, { storage });

    assert.equal(runtimeClient.readLocalBattleOperationLog(storage).length, 1);
    runtimeClient.clearLocalBattleOperationLog(storage);
    assert.deepEqual(runtimeClient.readLocalBattleOperationLog(storage), []);
  });
});

test('local UI server appends http battle operations to JSONL files', () => {
  const server = fs.readFileSync(serverPath, 'utf8');

  assert.match(server, /BATTLE_OPERATION_LOG_DIR = path\.join\(root, 'output', 'battle-operation-logs'\)/);
  assert.match(server, /function appendBattleOperationLog/);
  assert.match(server, /fs\.appendFileSync\(file, `\$\{JSON\.stringify\(entry\)\}\\n`/);
  assert.match(server, /appendBattleOperationLog\(\{ sessionId: sess\.id, playerId, command: body, result \}\)/);
  assert.match(server, /appendBattleOperationLog\(\{ sessionId: sess\.id, playerId, command: body, error: err \}\)/);
});
