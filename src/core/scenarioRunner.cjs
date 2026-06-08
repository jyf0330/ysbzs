/**
 * scenarioRunner.cjs — 固定局面回归测试/预设场景执行器
 *
 * 参考：XMage（固定局面、预设动作、断言结果）
 * 定位：从 fixture/配置创建固定局面，执行动作，校验结果。
 * 约定：不替代战斗引擎，只调用现有 reducer/battle/elementPackets。
 */

const { dispatch } = require('./reducer.cjs');
const { createGameState } = require('./state.cjs');
const { loadGameData } = require('./csvData.cjs');
const { pushEvent } = require('./events.cjs');
const { setupTrial, runTrialRound } = require('./trialEngine.cjs');

function clone(v) { return JSON.parse(JSON.stringify(v)); }

/**
 * 创建固定局面
 * @param {object} opts
 * @param {string} [opts.scenarioId] - 场景 ID
 * @param {number} [opts.seed] - 随机种子
 * @param {object} [opts.initialState] - 自定义初始状态
 * @returns {object} { state, scenarioId, startTime }
 */
function createScenario(opts = {}) {
  const data = loadGameData();
  const state = opts.initialState || createGameState({ gold: 30 });
  state._scenarioId = opts.scenarioId || 'custom';
  state._seed = opts.seed || 42;
  state._startTime = Date.now();
  return { state, scenarioId: state._scenarioId, startTime: state._startTime };
}

/**
 * 执行一组动作序列
 * @param {object} state
 * @param {object[]} actions - [{ type, ...payload }]
 * @returns {object} { events, unitChanges, success }
 */
function executeActions(state, actions) {
  const events = [];
  for (const action of actions) {
    try {
      const result = dispatch(state, action);
      pushEvent(state, 'SCENARIO_ACTION', { type: action.type, result, text: `场景执行: ${action.type}` });
      events.push({ type: action.type, result, ok: true });
    } catch (e) {
      events.push({ type: action.type, error: e.message, ok: false });
    }
  }
  return { events };
}

/**
 * 校验场景结果
 * @param {object} state
 * @param {object} assertions
 * @param {string[]} [assertions.killedUnitIds] - 必须死亡的 ID
 * @param {number} [assertions.minKillCount] - 最低击杀数
 * @param {number} [assertions.round] - 期望回合
 * @param {boolean} [assertions.trialPass] - 期望试炼通过
 * @returns {object} { pass, fails, details }
 */
function verifyScenario(state, assertions) {
  if (!assertions) return { pass: true, fails: [], details: 'no assertions' };
  const fails = [];
  if (assertions.killedUnitIds) {
    for (const uid of assertions.killedUnitIds) {
      const unit = (state.units || []).find(u => u.id === uid);
      if (unit && unit.alive) fails.push(`expected ${uid} to be dead`);
    }
  }
  if (assertions.minKillCount !== undefined) {
    const killed = (state.units || []).filter(u => !u.alive).length;
    if (killed < assertions.minKillCount) fails.push(`expected min kills ${assertions.minKillCount}, got ${killed}`);
  }
  if (assertions.round !== undefined && state.round !== assertions.round) {
    fails.push(`expected round ${assertions.round}, got ${state.round}`);
  }
  if (assertions.trialPass !== undefined) {
    const passed = state.day7Trial?.victory?.trialPass === true;
    if (passed !== assertions.trialPass) fails.push(`expected trialPass=${assertions.trialPass}`);
  }
  return { pass: fails.length === 0, fails, details: fails.join('; ') || 'all ok' };
}

/**
 * 运行完整场景（创建 + 执行 + 校验）
 */
function runScenario(opts = {}) {
  const { state } = opts.scenarioId === 'day7_fire_trial_v1'
    ? (setupTrial(createGameState({ gold: 30 }), 'day7_fire_trial_v1'), { state: createGameState() })
    : createScenario(opts);
  // 试炼场景
  if (opts.scenarioId === 'day7_fire_trial_v1') {
    setupTrial(state, 'day7_fire_trial_v1');
    runTrialRound(state, 'day7_fire_trial_v1', 1);
  }
  // 自定义动作序列
  if (opts.actions) executeActions(state, opts.actions);
  const verify = opts.assertions ? verifyScenario(state, opts.assertions) : { pass: true, fails: [], details: 'no assertions' };
  return { scenarioId: opts.scenarioId || 'custom', verify, events: state.events ? state.events.slice(-20) : [] };
}

module.exports = { createScenario, executeActions, verifyScenario, runScenario };
