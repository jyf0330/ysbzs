import { createGameRuntime } from './js/runtime-client.js';

const $ = id => document.getElementById(id);
const BATTLE_DEBUG_SAVE_KEY = 'ysbzs.battleDebug.routeAfterTwoEvents';
const params = new URLSearchParams(window.location.search || '');
if (!params.get('runtime')) params.set('runtime', 'http');
if ((params.get('runtime') || 'http') === 'http' && !params.get('sessionId')) {
  params.set('sessionId', `battle-debug-${Date.now().toString(36)}`);
}
if (params.toString() !== new URLSearchParams(window.location.search || '').toString()) {
  const url = new URL(window.location.href);
  url.search = params.toString();
  window.history.replaceState(null, '', url);
}

const currentPlayerId = () => params.get('playerId') || 'p1';
const runtime = createGameRuntime({ playerId: currentPlayerId, mode: params.get('runtime') || 'http' });
const PHASE_TEXT = {
  init: '准备',
  node_choice: '路线选择',
  node_resolved: '节点完成',
  battle_choice: '遭遇选择',
  player_turn: '玩家回合',
  monster_turn: '敌方行动',
  round_end: '回合结算',
  battle_end: '战斗结束',
  shop: '商店',
  reward: '奖励',
  day_end: '当天结束'
};

let vm = null;
let busy = false;
let commandNo = 1;
let consoleErrors = 0;
let logLines = [];

window.addEventListener('error', () => { consoleErrors += 1; renderConsoleLabel(); });
window.addEventListener('unhandledrejection', () => { consoleErrors += 1; renderConsoleLabel(); });

function esc(value) {
  return String(value ?? '').replace(/[&<>'"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[ch]));
}
function phaseText(phase) { return PHASE_TEXT[phase] || phase || '-'; }
function addLog(text) {
  const line = `${String(logLines.length + 1).padStart(2, '0')} ${text}`;
  logLines = [...logLines.slice(-80), line];
  $('debug-log').textContent = logLines.join('\n') || '暂无命令。';
}
function toast(text, error = false) {
  const el = $('toast');
  el.textContent = text;
  el.style.borderLeftColor = error ? '#a84f3e' : '#557d4b';
  el.classList.remove('hidden');
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => el.classList.add('hidden'), 2600);
}
function setBusy(value) {
  busy = value;
  document.querySelectorAll('button').forEach(button => { button.disabled = value; });
}
function makeCommand(type, payload = {}) {
  return Object.assign({
    type,
    commandId: `battle_debug_${String(commandNo++).padStart(6, '0')}`,
    playerId: currentPlayerId(),
    battleId: vm?.battleId,
    baseStateVersion: vm?.stateVersion ?? 0
  }, payload);
}
function battlePageHref() {
  const url = new URL('index.html', window.location.href);
  for (const [key, value] of params.entries()) url.searchParams.set(key, value);
  return `${url.pathname}${url.search}${url.hash}`;
}
function isBattleEntryAction(action) {
  return action?.type === 'RUN_ROUTE_FIXED_BATTLE' || action?.type === 'PICK_BATTLE_ENCOUNTER';
}
function primaryRouteAction() {
  return vm?.dailyFlow?.primaryAction || vm?.dailyFlow?.actions?.primary || null;
}
function autoRouteAction() {
  return vm?.dailyFlow?.autoAction || vm?.dailyFlow?.actions?.auto || null;
}
function publicRouteAction(type) {
  return (vm?.nextActions || []).find(action => action?.type === type) || null;
}
function nextNodeGenerateAction() {
  return autoRouteAction() || publicRouteAction('GENERATE_NODE_OPTIONS');
}
function battleEntryAction() {
  const action = primaryRouteAction();
  if (isBattleEntryAction(action)) return action;
  return (vm?.nextActions || []).find(isBattleEntryAction) || null;
}
async function loadView() {
  const data = await runtime.view();
  vm = data.viewModel;
  render();
  return vm;
}
async function runCommand(type, payload = {}) {
  const data = await runtime.action(makeCommand(type, payload));
  vm = data.viewModel || vm;
  const suffix = data?.events?.length ? `，事件 ${data.events.length}` : '';
  addLog(`${type}${suffix} -> ${phaseText(vm?.phase)} ${routeLabel()}`);
  render(data.events || []);
  return data;
}
async function runRouteAction(action) {
  if (!action) throw new Error('没有可执行的路线动作。');
  const payload = Object.assign({}, action.defaultPayload || {});
  return runCommand(action.type, payload);
}
async function saveDebugSnapshot(label = '调试快照') {
  const data = await runtime.save();
  if (!data?.save) throw new Error('runtime.save 没有返回 save。');
  localStorage.setItem(BATTLE_DEBUG_SAVE_KEY, JSON.stringify({ label, savedAt: new Date().toISOString(), save: data.save }));
  $('save-label').textContent = `${label}已保存`;
  addLog(`SAVE ${label}`);
  return data.save;
}
async function loadDebugSnapshot() {
  const raw = localStorage.getItem(BATTLE_DEBUG_SAVE_KEY);
  if (!raw) {
    toast('没有本地调试快照。', true);
    return null;
  }
  const doc = JSON.parse(raw);
  const data = await runtime.load(doc.save || doc);
  vm = data.viewModel || vm;
  $('save-label').textContent = `${doc.label || '调试快照'}已读取`;
  addLog(`LOAD ${doc.label || '调试快照'}`);
  render();
  return data;
}
function firstNodeOption() {
  return (vm?.dayRoute?.options || [])[0] || null;
}
async function pickFirstNodeOption(stepLabel) {
  const option = firstNodeOption();
  if (!option?.optionId) throw new Error(`${stepLabel}没有可选节点。`);
  return runCommand('PICK_NODE', { optionId: option.optionId });
}
async function prepareRouteBattleDebugState() {
  if (busy) return null;
  setBusy(true);
  try {
    await loadView();
    updateStepState(1, 'current');
    await runRouteAction(nextNodeGenerateAction());
    updateStepState(1, 'done');
    updateStepState(2, 'current');
    await pickFirstNodeOption('第一个事件');
    updateStepState(2, 'done');
    updateStepState(3, 'current');
    await runRouteAction(nextNodeGenerateAction());
    updateStepState(3, 'done');
    updateStepState(4, 'current');
    await pickFirstNodeOption('第二个事件');
    updateStepState(4, 'done');
    updateStepState(5, 'current');
    const entry = battleEntryAction();
    if (!isBattleEntryAction(entry)) throw new Error('两个事件后没有进入固定战入口。');
    await saveDebugSnapshot('两事件后战斗入口');
    updateStepState(5, 'done');
    toast('已准备到第一场战斗入口。');
    render();
    return vm;
  } catch (err) {
    toast(err.message || String(err), true);
    addLog(`ERROR ${err.message || err}`);
    return null;
  } finally {
    setBusy(false);
    renderControls();
  }
}
async function enterBattleNode() {
  if (busy) return null;
  setBusy(true);
  try {
    const action = battleEntryAction();
    if (!isBattleEntryAction(action)) throw new Error('当前状态不是战斗入口。');
    updateStepState(6, 'current');
    await saveDebugSnapshot('两事件后战斗入口');
    updateStepState(6, 'done');
    toast('正在打开战斗页调试入口。');
    window.location.assign(battlePageHref());
    return vm;
  } catch (err) {
    toast(err.message || String(err), true);
    addLog(`ERROR ${err.message || err}`);
    return null;
  } finally {
    setBusy(false);
    renderControls();
  }
}
function newDebugSession() {
  const url = new URL(window.location.href);
  url.searchParams.set('runtime', params.get('runtime') || 'http');
  url.searchParams.set('sessionId', `battle-debug-${Date.now().toString(36)}`);
  if (params.get('playerId')) url.searchParams.set('playerId', params.get('playerId'));
  window.location.assign(url.toString());
}
function routeLabel() {
  const flow = vm?.dailyFlow || {};
  return `${flow.currentStep || vm?.dayRoute?.nodeIndex || 0}/${flow.totalSteps || 0}`;
}
function nextLabel() {
  if (vm?.phase === 'player_turn') return '战斗已开始';
  const entry = battleEntryAction();
  if (entry) return '打开战斗页调试';
  const auto = autoRouteAction();
  if (auto) return auto.label || auto.type;
  const option = firstNodeOption();
  if (option) return `选择 ${option.name || option.optionId}`;
  return phaseText(vm?.phase);
}
function renderStatus() {
  $('phase-label').textContent = phaseText(vm?.phase);
  $('day-label').textContent = `第${vm?.day || 1}天 ${vm?.period || ''}`.trim();
  $('route-label').textContent = routeLabel();
  $('next-label').textContent = nextLabel();
  $('session-label').textContent = params.get('sessionId') || 'local';
}
function renderChoices() {
  const options = vm?.dayRoute?.options || [];
  $('choice-count').textContent = `${options.length}项`;
  $('choice-list').innerHTML = options.map((option, index) => `<article class="choice-card">
    <strong>${esc(index + 1)}. ${esc(option.name || option.optionId)}</strong>
    <span>${esc(option.choicePreview?.kindLabel || option.nodeType || '节点')}</span>
    <p>${esc(option.choicePreview?.summary || option.note || '路线事件')}</p>
  </article>`).join('') || '<div class="choice-card"><strong>暂无 3 选 1</strong><p>点击准备按钮后会自动生成并选择前两个事件。</p></div>';
}
function renderRouteSummary() {
  const flow = vm?.dailyFlow || {};
  const history = vm?.dayRoute?.history || [];
  const picked = history
    .filter(item => item.kind === 'node_choice')
    .map(item => item.option?.name || item.option?.nodeId)
    .filter(Boolean);
  $('route-summary').innerHTML = [
    `<strong>目标：</strong>第 1 天 3选1 -> 3选1 -> 第一场战斗。`,
    `<strong>已选事件：</strong>${esc(picked.join(' / ') || '尚未选择')}`,
    `<strong>下一日程：</strong>${esc(flow.nextSchedule?.label || flow.nextSchedule?.phaseLabel || '-')}`
  ].join('<br>');
}
function renderBattleInfo() {
  const encounter = vm?.dayRoute?.currentEncounter || {};
  const entry = battleEntryAction();
  const inBattle = vm?.phase === 'player_turn' || vm?.phase === 'monster_turn' || vm?.phase === 'round_end';
  $('battle-label').textContent = inBattle ? '已进入' : entry ? '入口就绪' : '未就绪';
  $('encounter-label').textContent = encounter.name || encounter.phaseLabel || entry?.label || '-';
  $('encounter-summary').textContent = inBattle
    ? `当前 ${phaseText(vm?.phase)}，第 ${vm?.round || 1} 回合。`
    : entry
      ? '当前已处于固定战入口，打开主战斗页可继续调试棋盘和战斗按钮。'
      : '准备快照后可进入战斗页继续调试棋盘。';
}
function renderConsoleLabel() {
  $('console-label').textContent = `console: ${consoleErrors}`;
}
function renderControls() {
  const entry = battleEntryAction();
  $('prepare-route-btn').disabled = busy;
  $('enter-battle-btn').disabled = busy || !isBattleEntryAction(entry);
  $('load-save-btn').disabled = busy;
  $('refresh-btn').disabled = busy;
  $('new-session-btn').disabled = busy;
}
function updateStepState(step, state) {
  const el = document.querySelector(`[data-step="${step}"]`);
  if (!el) return;
  el.classList.remove('done', 'current');
  if (state) el.classList.add(state);
}
function render() {
  if (!vm) return;
  renderStatus();
  renderChoices();
  renderRouteSummary();
  renderBattleInfo();
  renderConsoleLabel();
  renderControls();
  const href = battlePageHref();
  $('battle-page-link').href = href;
  $('battle-page-link-secondary').href = href;
  window.__YSBZS_BATTLE_DEBUG__ = {
    vm,
    prepareRouteBattleDebugState,
    enterBattleNode,
    loadDebugSnapshot,
    battlePageHref,
    isBusy: () => busy
  };
}
function bind() {
  $('prepare-route-btn').addEventListener('click', prepareRouteBattleDebugState);
  $('enter-battle-btn').addEventListener('click', enterBattleNode);
  $('load-save-btn').addEventListener('click', loadDebugSnapshot);
  $('refresh-btn').addEventListener('click', loadView);
  $('new-session-btn').addEventListener('click', newDebugSession);
}

bind();
loadView().catch(err => {
  toast(err.message || String(err), true);
  addLog(`ERROR ${err.message || err}`);
});
