import { createGameRuntime } from './js/runtime-client.js';

const $ = id => document.getElementById(id);
const runtime = createGameRuntime({ playerId: 'p1' });
const PHASE_TEXT = {
  init: '准备',
  node_choice: '节点选择',
  node_resolved: '节点结算',
  battle_choice: '遭遇选择',
  player_turn: '玩家回合',
  monster_turn: '怪物行动',
  round_end: '回合结算',
  battle_end: '战斗结束',
  shop: '商店',
  day_end: '当天结束'
};
const FLOW_TYPES = new Set([
  'GENERATE_NODE_OPTIONS',
  'PICK_NODE',
  'GENERATE_BATTLE_OPTIONS',
  'PICK_BATTLE_ENCOUNTER',
  'RUN_ROUTE_FIXED_BATTLE',
  'CLAIM_ROUTE_REWARD',
  'REWARD_OPTIONS',
  'PICK_REWARD',
  'ENTER_SHOP',
  'EXIT_SHOP',
  'RUN_BATTLE',
  'RUN_FULL_DAY',
  'RUN_FULL_RUN'
]);

let vm = null;
let busy = false;
let commandNo = 1;
let consoleErrors = 0;

window.addEventListener('error', () => { consoleErrors += 1; updateConsoleLabel(); });
window.addEventListener('unhandledrejection', () => { consoleErrors += 1; updateConsoleLabel(); });

function esc(value) {
  return String(value ?? '').replace(/[&<>'"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[ch]));
}
function phaseText(phase) { return PHASE_TEXT[phase] || phase || '-'; }
function toast(text, error = false) {
  const el = $('toast');
  el.textContent = text;
  el.style.borderLeftColor = error ? '#a84f3e' : '#c8a050';
  el.classList.remove('hidden');
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => el.classList.add('hidden'), 2600);
}
function setBusy(value) {
  busy = value;
  document.querySelectorAll('button').forEach(btn => { btn.disabled = value; });
}
function makeCommand(type, payload = {}) {
  return Object.assign({
    type,
    commandId: `daily_${String(commandNo++).padStart(6, '0')}`,
    playerId: 'p1',
    battleId: vm?.battleId,
    baseStateVersion: vm?.stateVersion ?? 0
  }, payload);
}
async function loadView() {
  const data = await runtime.view();
  vm = data.viewModel;
  render();
  return vm;
}
async function runCommand(type, payload = {}) {
  if (busy) return null;
  setBusy(true);
  try {
    const data = await runtime.action(makeCommand(type, payload));
    vm = data.viewModel || vm;
    render(data.events || []);
    return data;
  } catch (err) {
    toast(err.message || String(err), true);
    return null;
  } finally {
    setBusy(false);
    renderControls();
  }
}
function buildCoreText() {
  const tags = vm?.buildCore?.primaryTags || [];
  if (tags.length) return tags.slice(0, 3).map(x => x.label).join(' / ');
  return vm?.buildCore?.summaryText || '尚未形成';
}
function nextAction(type) {
  return (vm?.nextActions || []).find(action => action.type === type) || null;
}
function nextFlowAction() {
  return (vm?.nextActions || []).find(action => FLOW_TYPES.has(action.type) && action.type !== 'RUN_FULL_DAY' && action.type !== 'RUN_FULL_RUN') || null;
}
function routeLabel() {
  const flow = vm?.dailyFlow || {};
  if (flow.terminal) return `终局 ${flow.terminal.status || ''}`.trim();
  if (['player_turn','monster_turn','round_end','battle_end'].includes(vm?.phase)) return `战斗 ${vm.round || 0}/${vm.maxRounds || '-'}`;
  return `${flow.currentStep || 0}/${flow.totalSteps || 0}`;
}
function nextLabel() {
  if (vm?.terminalSummary) return vm.terminalSummary.nextStepText || '查看终局报告';
  const action = nextFlowAction() || (vm?.nextActions || [])[0];
  return action?.label || phaseText(vm?.phase);
}
function statusLabel(status) {
  return { done: '已完成', current: '当前', next: '下一步', pending: '未到达' }[status] || status || '-';
}
function kindSummary(step) {
  if (step.pickedName) return `已选择：${step.pickedName}`;
  if (step.kind === 'node_choice') return '三选一成长、商人、奖励或事件节点。';
  if (step.kind === 'battle_choice') return '三选一遭遇，进入中午路线战斗。';
  if (step.kind === 'fixed_battle') return '固定路线战斗，结算当天压力。';
  return step.note || '路线步骤。';
}
function renderStatus() {
  $('phase-label').textContent = phaseText(vm?.phase);
  $('day-label').textContent = `第${vm?.day || 1}天 ${vm?.period || ''}`.trim();
  $('route-label').textContent = routeLabel();
  $('gold-label').textContent = vm?.gold ?? 0;
  $('build-label').textContent = buildCoreText();
  $('build-label').title = vm?.buildCore?.summaryText || '';
  $('next-label').textContent = nextLabel();
  $('flow-summary').textContent = `第${vm?.dailyFlow?.day || vm?.day || 1}天，${vm?.dailyFlow?.totalSteps || 0} 个路线步骤；当前：${nextLabel()}。`;
}
function renderTimeline() {
  const flow = vm?.dailyFlow || {};
  const steps = flow.steps || [];
  $('timeline-count').textContent = `${flow.currentStep || 0}/${flow.totalSteps || steps.length}`;
  $('timeline').innerHTML = steps.map(step => `<article class="step-card ${esc(step.status)}">
    <div class="step-top"><strong>${esc(step.step)}</strong><span>${esc(statusLabel(step.status))}</span></div>
    <h3>${esc(step.label || step.phaseLabel)}</h3>
    <p>${esc(step.note || step.kindLabel || '')}</p>
    <div class="picked">${esc(kindSummary(step))}</div>
  </article>`).join('') || '<div class="empty">当前日没有路线日程。</div>';
}
function choicePreview(option = {}) {
  const preview = option.choicePreview || {};
  const pressure = option.pressurePreview || {};
  const lines = [
    preview.summary || option.note || option.phaseLabel || option.name,
    pressure.summary ? `压力：${pressure.summary}` : '',
    preview.costText ? `成本：${preview.costText}` : '',
    preview.gainText ? `收益：${preview.gainText}` : ''
  ].filter(Boolean);
  return lines.join(' · ');
}
function actionButton(label, type, payload = {}, extra = '') {
  return `<button class="choice-card ${extra}" data-command="${esc(type)}" data-payload="${esc(JSON.stringify(payload))}" type="button"${busy ? ' disabled' : ''}>
    <strong>${esc(label)}</strong><span>${esc(type)}</span><p>${esc(choicePreview(payload.option || payload.reward || {}))}</p>
  </button>`;
}
function renderChoices() {
  const route = vm?.dayRoute || {};
  if (vm?.dailyFlow?.terminal) {
    $('choice-count').textContent = '0';
    $('choice-list').innerHTML = '<div class="empty">终局已结束，没有需要继续处理的路线选项。</div>';
    return;
  }
  const rewards = vm?.rewards || [];
  const pending = vm?.dailyFlow?.pendingRewards || route.pendingRewards || [];
  const items = [];
  for (const option of route.options || []) {
    items.push(actionButton(option.name || option.nodeId, 'PICK_NODE', { optionId: option.optionId, option }));
  }
  for (const option of route.battleOptions || []) {
    items.push(actionButton(option.name || option.encounterId, 'PICK_BATTLE_ENCOUNTER', { encounterId: option.encounterId, option }));
  }
  for (const reward of pending.filter(x => x && !x.claimed)) {
    items.push(actionButton(`领取 ${reward.rewardPoolId || '路线奖励'}`, 'CLAIM_ROUTE_REWARD', { rewardId: reward.rewardId, rewardIndex: 0, reward }));
  }
  rewards.forEach((reward, index) => {
    items.push(actionButton(reward.name || reward.petName || reward.relicName || `奖励${index + 1}`, 'PICK_REWARD', { index, reward }));
  });
  const fixed = nextAction('RUN_ROUTE_FIXED_BATTLE');
  if (fixed) items.unshift(actionButton(fixed.label || '进入固定战', 'RUN_ROUTE_FIXED_BATTLE', fixed.defaultPayload || {}, 'primary-action'));
  $('choice-count').textContent = String(items.length);
  $('choice-list').innerHTML = items.join('') || '<div class="empty">暂无选择项。可点击“执行下一步”推进到候选生成。</div>';
}
function renderHistory() {
  const history = vm?.dailyFlow?.history || [];
  $('history-count').textContent = String(history.length);
  $('history-list').innerHTML = history.map((item, index) => {
    const option = item.option || {};
    return `<article class="history-card"><span class="badge">${esc(index + 1)}</span><div><strong>${esc(option.name || option.phaseLabel || item.kind)}</strong><span>${esc(item.kind || '-')} · ${esc(option.choicePreview?.kindLabel || option.nodeType || option.encounterId || '')}</span></div></article>`;
  }).join('') || '<div class="empty">当天还没有路线历史。</div>';
}
function renderRuns() {
  const runs = vm?.dailyFlow?.runs || vm?.dayRouteRuns || [];
  $('run-count').textContent = `${runs.length}天`;
  $('run-list').innerHTML = runs.map(run => `<article class="run-card">
    <strong>D${esc(run.day)}</strong>
    <div><strong>${esc(run.terminal?.name || run.phase || '完成')}</strong><span>金币 ${esc(run.goldBefore ?? '-')} → ${esc(run.goldAfter ?? run.gold ?? '-')} · 历史 ${esc((run.history || []).length)}</span></div>
    <span class="badge">${esc(run.terminal?.status || 'done')}</span>
  </article>`).join('') || '<div class="empty">还没有跨天 Run 记录。点击“完整 Run”后会显示 Day1-Day10 摘要。</div>';
}
function renderLog(events = []) {
  const recent = events.length ? events : (vm?.events || []).slice(-24);
  $('flow-log').textContent = recent.map(e => `${String(e.step || '').padStart(3, '0')} [${e.type}] ${e.text || ''}`).join('\n') || '暂无记录。';
  $('flow-log').scrollTop = $('flow-log').scrollHeight;
}
function updateConsoleLabel() {
  $('console-label').textContent = `console: ${consoleErrors}`;
}
function renderControls() {
  const next = nextFlowAction();
  $('run-next-btn').disabled = busy || !next;
  $('run-next-btn').textContent = next ? next.label : '无下一步';
  $('full-day-btn').disabled = busy || !nextAction('RUN_FULL_DAY');
  $('full-run-btn').disabled = busy || !nextAction('RUN_FULL_RUN');
}
function render(events = []) {
  if (!vm) return;
  renderStatus();
  renderTimeline();
  renderChoices();
  renderHistory();
  renderRuns();
  renderLog(events);
  renderControls();
  updateConsoleLabel();
  window.__YSBZS_DAILY_FLOW__ = { lastViewModel: vm, runCommand, loadView };
}
function payloadFromButton(btn) {
  try { return JSON.parse(btn.dataset.payload || '{}'); }
  catch (_) { return {}; }
}
async function runNext() {
  const next = nextFlowAction();
  if (!next) return;
  const payload = Object.assign({}, next.defaultPayload || {});
  await runCommand(next.type, payload);
}

$('refresh-btn').addEventListener('click', () => loadView().catch(err => toast(err.message || String(err), true)));
$('new-day-btn').addEventListener('click', () => runCommand('NEW_GAME', { day: 1, period: '上午', gold: 8 }));
$('run-next-btn').addEventListener('click', runNext);
$('full-day-btn').addEventListener('click', () => runCommand('RUN_FULL_DAY'));
$('full-run-btn').addEventListener('click', () => runCommand('RUN_FULL_RUN', { fromDay: 1, toDay: 10, gold: Math.max(999, Number(vm?.gold || 0)) }));
$('choice-list').addEventListener('click', ev => {
  const btn = ev.target.closest('[data-command]');
  if (!btn) return;
  const payload = payloadFromButton(btn);
  delete payload.option;
  delete payload.reward;
  runCommand(btn.dataset.command, payload);
});

loadView().catch(err => toast(err.message || String(err), true));
