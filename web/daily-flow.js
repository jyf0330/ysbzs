import { createGameRuntime } from './js/runtime-client.js';

const $ = id => document.getElementById(id);
const params = new URLSearchParams(window.location.search || '');
const currentPlayerId = () => params.get('playerId') || 'p1';
const runtime = createGameRuntime({ playerId: currentPlayerId, mode: params.get('runtime') || 'http' });
const PHASE_TEXT = {
  init: '准备',
  node_choice: '路线选择',
  node_resolved: '节点完成',
  battle_choice: '遭遇选择',
  player_turn: '玩家回合',
  monster_turn: '怪物行动',
  round_end: '回合结算',
  battle_end: '战斗结束',
  shop: '商店节点',
  reward: '奖励节点',
  day_end: '当天结束'
};
const ROUTE_BATTLE_ENTRY_COMMANDS = new Set(['RUN_' + 'ROUTE_FIXED_BATTLE', 'PICK_' + 'BATTLE_ENCOUNTER']);

let vm = null;
let busy = false;
let autoAdvanceTimer = null;
let autoAdvanceBlockedKey = null;
let autoAdvanceInFlight = false;
let commandNo = 1;
let consoleErrors = 0;

window.addEventListener('error', () => { consoleErrors += 1; updateConsoleLabel(); });
window.addEventListener('unhandledrejection', () => { consoleErrors += 1; updateConsoleLabel(); });

function esc(value) {
  return String(value ?? '').replace(/[&<>'"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[ch]));
}
function phaseText(phase) { return PHASE_TEXT[phase] || phase || '-'; }
function battlePageHref() {
  const url = new URL('index.html', window.location.href);
  for (const [key, value] of params.entries()) url.searchParams.set(key, value);
  return `${url.pathname}${url.search}${url.hash}`;
}
function isBattlePhase(phase) {
  return ['init', 'player_turn', 'monster_turn', 'round_end', 'battle_end'].includes(phase);
}
function isRouteBattleEntryCommand(type) {
  return ROUTE_BATTLE_ENTRY_COMMANDS.has(type);
}
function toast(text, error = false) {
  const el = $('toast');
  el.textContent = text;
  el.style.borderLeftColor = error ? '#a84f3e' : '#2d7f73';
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
    playerId: currentPlayerId(),
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
    if (isRouteBattleEntryCommand(type) && vm?.phase === 'player_turn') {
      window.location.assign(battlePageHref());
    }
    return data;
  } catch (err) {
    toast(err.message || String(err), true);
    return null;
  } finally {
    setBusy(false);
    renderControls();
    scheduleAutoAdvance();
  }
}
function buildCoreText() {
  const tags = vm?.buildCore?.primaryTags || [];
  if (tags.length) return tags.slice(0, 3).map(x => x.label).join(' / ');
  return vm?.buildCore?.summaryText || '尚未形成';
}
function primaryRouteAction() {
  return vm?.dailyFlow?.primaryAction || vm?.dailyFlow?.actions?.primary || null;
}
function autoRouteAction() {
  if (!vm || busy || autoAdvanceInFlight || vm.dailyFlow?.terminal || vm.phase === 'day_end' || vm.phase === 'shop') return null;
  return vm?.dailyFlow?.autoAction || vm?.dailyFlow?.actions?.auto || null;
}
function publicRouteAction() {
  if (!vm || vm.dailyFlow?.terminal || vm.phase === 'shop') return null;
  return (vm?.nextActions || []).find(action => (
    action?.type === 'GENERATE_NODE_OPTIONS'
    || action?.defaultPayload?.scheduleStep != null
    || action?.defaultPayload?.day != null
  )) || null;
}
function routeActionForNext() {
  return primaryRouteAction() || autoRouteAction() || publicRouteAction();
}
function autoActionKey(action) {
  return action ? `${vm?.stateVersion || 0}:${action.type}:${JSON.stringify(action.defaultPayload || {})}` : '';
}
function scheduleAutoAdvance() {
  clearTimeout(autoAdvanceTimer);
  const action = autoRouteAction();
  if (!action) return;
  const key = autoActionKey(action);
  if (key && key === autoAdvanceBlockedKey) return;
  autoAdvanceTimer = setTimeout(() => runAutoAdvance(), 180);
}
async function runAutoAdvance() {
  const action = autoRouteAction();
  if (!action) return;
  const key = autoActionKey(action);
  if (key && key === autoAdvanceBlockedKey) return;
  autoAdvanceInFlight = true;
  const data = await runCommand(action.type, Object.assign({}, action.defaultPayload || {}));
  autoAdvanceInFlight = false;
  if (!data) autoAdvanceBlockedKey = key;
  else {
    autoAdvanceBlockedKey = null;
    scheduleAutoAdvance();
  }
}
function routeLabel() {
  const flow = vm?.dailyFlow || {};
  if (flow.terminal) return `终局 ${flow.terminal.status || ''}`.trim();
  return `${flow.currentStep || 0}/${flow.totalSteps || 0}`;
}
function nextLabel() {
  if (vm?.terminalSummary) return vm.terminalSummary.nextStepText || '查看终局报告';
  if ((vm?.dayRoute?.options || []).length) return '选择一个 3 选 1 节点';
  if ((vm?.rewards || []).length) return '选择一个奖励';
  if (vm?.phase === 'shop') return '处理商店节点';
  const action = primaryRouteAction();
  if (action) return action.label;
  const auto = autoRouteAction();
  if (auto) return auto.type === 'GENERATE_NODE_OPTIONS' ? '正在准备 3 选 1' : auto.label;
  return phaseText(vm?.phase);
}
function statusLabel(status) {
  return { done: '已完成', current: '当前', next: '下一步', pending: '未到达' }[status] || status || '-';
}
function kindSummary(step) {
  if (step.summary) return step.summary;
  if (step.pickedName) return `已选择：${step.pickedName}`;
  if (step.kind === 'node_choice') return '3 选 1，进入成长、商店、奖励或事件节点。';
  if (step.kind === 'battle_choice') return '三选一遭遇。';
  if (step.kind === 'fixed_battle') return Number(step.step || 0) <= 3 ? '第一场棋盘战斗，虎先锋首波召唤宠物。' : '第二场棋盘战斗。';
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
  $('flow-summary').textContent = `第${vm?.dailyFlow?.day || vm?.day || 1}天：3选1 → 3选1 → 战斗 → 3选1 → 3选1 → 战斗。当前：${nextLabel()}。`;
}
function renderOpening() {
  const opening = vm?.dailyFlow?.opening || {};
  const playerHero = opening.playerHero || vm?.leaders?.player || {};
  const enemyHero = opening.enemyHero || vm?.leaders?.enemy || {};
  const playerPets = opening.playerPets || vm?.heroes || [];
  const firstWave = opening.firstWave || {};
  const petText = playerPets.map(pet => pet.name || pet.displayName || pet.petId).filter(Boolean).join('、') || '暂无上场宠物';
  const wavePets = (firstWave.petNames || []).join('、') || '等待波次数据';
  $('opening-player-hero').textContent = playerHero.name || playerHero.displayName || '我方英雄';
  $('opening-player-pets').textContent = `携带宠物：${petText}`;
  $('opening-enemy-hero').textContent = enemyHero.name || enemyHero.displayName || '敌方英雄';
  $('opening-enemy-wave').textContent = firstWave.summonerName ? `${firstWave.summonerName}持续召唤宠物作战` : '等待敌方波次';
  $('opening-wave-label').textContent = firstWave.wavePeriod ? `${firstWave.wavePeriod} · 第${firstWave.round || 1}回合` : '首波';
  $('opening-summon-title').textContent = `${firstWave.summonerName || enemyHero.name || '敌方'}召唤 ${firstWave.spawnCount ?? '-'} 只`;
  $('opening-summon-summary').textContent = firstWave.summary || `召唤池：${wavePets}`;
}
function renderTimeline() {
  const flow = vm?.dailyFlow || {};
  const steps = flow.steps || [];
  $('timeline-count').textContent = `${flow.currentStep || 0}/${flow.totalSteps || steps.length}`;
  $('timeline').innerHTML = steps.map(step => `<article class="step-card ${esc(step.status)} ${esc(step.kind)}">
    <div class="step-top"><strong>${esc(step.step)}</strong><span>${esc(statusLabel(step.status))}</span></div>
    <h3>${esc(step.label || step.phaseLabel)}</h3>
    <p>${esc(step.note || step.kindLabel || '')}</p>
    <div class="picked">${esc(kindSummary(step))}</div>
  </article>`).join('') || '<div class="empty">当前日没有路线日程。</div>';
}
function choicePreview(item = {}) {
  if (item.offerId) return `${item.element || '-'} / ${item.role || '-'} · 价格 ${item.price ?? '-'} 金`;
  if (item.instanceId || item.petId) return `${item.element || '-'} / ${item.role || '-'} · Lv${item.level || 1} · 出售 ${item.sellValue || 1} 金`;
  if (item.eventId && item.optionText) return `${item.optionText} · ${item.costText || '无成本'} · ${item.gainText || ''}`;
  if (item.type === 'pet' || item.type === 'relic') return `${item.type === 'relic' ? '遗物' : '宠物'} · ${item.poolId || ''}`;
  const preview = item.choicePreview || {};
  const pressure = item.pressurePreview || {};
  const lines = [
    preview.summary || item.note || item.phaseLabel || item.name,
    pressure.summary ? `压力：${pressure.summary}` : '',
    preview.costText ? `成本：${preview.costText}` : '',
    preview.gainText ? `收益：${preview.gainText}` : ''
  ].filter(Boolean);
  return lines.join(' · ');
}
function actionButton(label, type, payload = {}, extra = '', subtitle = '', options = {}) {
  const item = payload.option || payload.reward || payload.offer || payload.shopEvent || payload.unit || payload;
  const disabled = busy || !!options.disabled;
  return `<button class="choice-card ${extra}" data-command="${esc(type)}" data-payload="${esc(JSON.stringify(payload))}" type="button"${disabled ? ' disabled' : ''}${options.disabledReason ? ` title="${esc(options.disabledReason)}"` : ''}>
    <strong>${esc(label)}</strong><span>${esc(subtitle)}</span><p>${esc(choicePreview(item))}</p>
  </button>`;
}
function buyDisabledReason(offer = {}) {
  if (Number(vm?.gold || 0) < Number(offer.price || 0)) return `金币不足：需要${offer.price ?? '-'}，当前${vm?.gold ?? 0}`;
  if (offer.canBuy === false) return offer.buyBlockedReason || '没有上阵或背包空位';
  return '';
}
function renderNodeChoices(items) {
  const route = vm?.dayRoute || {};
  for (const option of route.options || []) {
    items.push(actionButton(option.name || option.nodeId, 'PICK_NODE', { optionId: option.optionId, option }, 'node-choice', option.choicePreview?.kindLabel || '节点'));
  }
  for (const option of route.battleOptions || []) {
    items.push(actionButton(option.name || option.encounterId, 'PICK_BATTLE_ENCOUNTER', { encounterId: option.encounterId, option }, 'battle-choice', option.choicePreview?.kindLabel || '遭遇'));
  }
}
function renderRewardChoices(items) {
  (vm?.rewards || []).forEach((reward, index) => {
    items.push(actionButton(reward.name || reward.petName || reward.relicName || `奖励${index + 1}`, 'PICK_REWARD', { index, reward }, 'reward-choice', '奖励'));
  });
}
function renderShopChoices(items) {
  if (vm?.phase !== 'shop') return;
  const shop = vm?.shop || {};
  for (const offer of shop.offers || []) {
    const reason = buyDisabledReason(offer);
    const placement = offer.buyPlacement === 'active' ? '进上阵' : offer.buyPlacement === 'bench' ? '进背包' : '无位置';
    items.push(actionButton(`购买宠物 ${offer.name}`, 'BUY_OFFER', { offerId: offer.offerId, offer }, `shop-choice${reason ? ' locked-choice' : ''}`, `${offer.price ?? '-'} 金 · ${placement}`, { disabled: !!reason, disabledReason: reason }));
  }
  const inventory = vm?.inventory || {};
  const sellItems = [...(inventory.items || [])].sort((a, b) => Number(a.active === true) - Number(b.active === true));
  for (const unit of sellItems) {
    items.push(actionButton(`出售宠物 ${unit.name || unit.petId}`, 'SELL_UNIT', { instanceId: unit.instanceId, petId: unit.petId, unit }, 'sell-choice', unit.active ? '上阵' : '背包'));
  }
  items.push(actionButton('刷新商店', 'ROLL_SHOP', { slots: shop.activeStall?.slots || 6 }, '', '商店'));
  for (const shopEvent of shop.events || []) {
    items.push(actionButton(shopEvent.name, 'APPLY_SHOP_EVENT', { eventId: shopEvent.id, shopEvent }, 'event-choice', '商店事件'));
  }
  items.push(actionButton('离开商店节点', 'EXIT_SHOP', {}, 'primary-action', '继续路线'));
}
function renderChoices() {
  if (vm?.dailyFlow?.terminal) {
    $('choice-count').textContent = '0';
    $('choice-list').innerHTML = '<div class="empty">终局已结束，没有需要继续处理的路线选项。</div>';
    return;
  }
  const items = [];
  const action = primaryRouteAction();
  if (action) items.push(actionButton(action.label, action.type, action.defaultPayload || {}, 'primary-action', '路线'));
  renderNodeChoices(items);
  renderRewardChoices(items);
  renderShopChoices(items);
  $('choice-count').textContent = String(items.length);
  $('choice-list').innerHTML = items.join('') || '<div class="empty">正在进入下一段流程。</div>';
}
function inventoryCard(item = {}, active = false) {
  const id = item.instanceId || item.petId;
  const moveLabel = active ? '下阵' : '上阵';
  const canMove = active ? item.canMoveToBench === true : item.canMoveToActive === true;
  const moveReason = item.moveBlockedReason || (active ? '背包已满' : '上阵已满');
  const movePayload = esc(JSON.stringify({ instanceId: item.instanceId, petId: item.petId, unit: item }));
  const move = `<button class="inventory-move" data-command="TOGGLE_UNIT_ACTIVE" data-payload="${movePayload}" type="button"${busy || !canMove ? ' disabled' : ''}${!canMove ? ` title="${esc(moveReason)}"` : ''}>${moveLabel}</button>`;
  const sale = vm?.phase === 'shop'
    ? `<button class="inventory-sell" data-command="SELL_UNIT" data-payload="${esc(JSON.stringify({ instanceId: item.instanceId, petId: item.petId, unit: item }))}" type="button"${busy ? ' disabled' : ''}>出售</button>`
    : '';
  return `<article class="inventory-card ${active ? 'active' : 'bench'}">
    <strong>${esc(item.name || item.petId)}</strong>
    <span>${esc(item.element || '-')} / ${esc(item.role || '-')} · Lv${esc(item.level || 1)}</span>
    <p>${active ? '上阵' : '背包'} · 售${esc(item.sellValue || 1)}金</p>
    <div class="inventory-actions">${move}${sale}</div>
  </article>`;
}
function emptySlots(count) {
  return Array.from({ length: Math.max(0, count) }, () => '<div class="inventory-slot">空位</div>').join('');
}
function renderInventory() {
  const inv = vm?.inventory || { active: [], bench: [], activeCount: 0, benchCount: 0, maxActive: 4, maxBench: 8 };
  const active = inv.active || [];
  const bench = inv.bench || [];
  const maxActive = Number(inv.maxActive || active.length || 0);
  const maxBench = Number(inv.maxBench || bench.length || 0);
  $('inventory-count').textContent = `上阵 ${active.length}/${maxActive} · 背包 ${bench.length}/${maxBench}`;
  $('inventory-active-count').textContent = `${active.length}/${maxActive}`;
  $('inventory-bench-count').textContent = `${bench.length}/${maxBench}`;
  $('inventory-active-list').innerHTML = active.map(item => inventoryCard(item, true)).join('') + emptySlots(maxActive - active.length);
  $('inventory-bench-list').innerHTML = bench.map(item => inventoryCard(item, false)).join('') + emptySlots(maxBench - bench.length);
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
  </article>`).join('') || '<div class="empty">跨天摘要会在完整 Run 后显示；玩家日常主线先完成当天。</div>';
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
  const next = routeActionForNext();
  const inBattle = isBattlePhase(vm?.phase) && vm?.dailyFlow?.pendingBattle;
  const battleEntryReady = next && isRouteBattleEntryCommand(next.type);
  const href = battlePageHref();
  $('top-battle-link').href = href;
  $('battle-link').href = href;
  $('battle-link').textContent = inBattle ? '去棋盘继续战斗' : (battleEntryReady ? next.label : '进入战斗界面');
  $('battle-link').classList.toggle('battle-active', !!inBattle || !!battleEntryReady);
  $('run-next-btn').disabled = busy || (!next && !inBattle);
  $('run-next-btn').textContent = inBattle ? '去棋盘继续战斗' : (next ? next.label : nextLabel());
}
function render(events = []) {
  if (!vm) return;
  renderStatus();
  renderOpening();
  renderInventory();
  renderTimeline();
  renderChoices();
  renderHistory();
  renderRuns();
  renderLog(events);
  renderControls();
  updateConsoleLabel();
  window.__YSBZS_DAILY_FLOW__ = { lastViewModel: vm, runCommand, loadView, primaryRouteAction, autoRouteAction, publicRouteAction, routeActionForNext, isBusy: () => busy };
  scheduleAutoAdvance();
}
function payloadFromButton(btn) {
  try { return JSON.parse(btn.dataset.payload || '{}'); }
  catch (_) { return {}; }
}
async function runNext() {
  const next = routeActionForNext();
  if (!next && isBattlePhase(vm?.phase) && vm?.dailyFlow?.pendingBattle) {
    window.location.assign(battlePageHref());
    return;
  }
  if (!next) return;
  const payload = Object.assign({}, next.defaultPayload || {});
  await runCommand(next.type, payload);
}
async function runBattleEntry(ev) {
  const next = routeActionForNext();
  if (!next || !isRouteBattleEntryCommand(next.type)) return;
  ev.preventDefault();
  if (busy) return;
  const payload = Object.assign({}, next.defaultPayload || {});
  await runCommand(next.type, payload);
}

$('refresh-btn').addEventListener('click', () => loadView().catch(err => toast(err.message || String(err), true)));
$('run-next-btn').addEventListener('click', runNext);
$('battle-link').addEventListener('click', runBattleEntry);
$('top-battle-link').addEventListener('click', runBattleEntry);
$('choice-list').addEventListener('click', ev => {
  const btn = ev.target.closest('[data-command]');
  if (!btn) return;
  const payload = payloadFromButton(btn);
  delete payload.option;
  delete payload.reward;
  delete payload.offer;
  delete payload.shopEvent;
  delete payload.unit;
  runCommand(btn.dataset.command, payload);
});
$('inventory-panel').addEventListener('click', ev => {
  const btn = ev.target.closest('[data-command]');
  if (!btn) return;
  const payload = payloadFromButton(btn);
  delete payload.unit;
  runCommand(btn.dataset.command, payload);
});

loadView().catch(err => toast(err.message || String(err), true));
