import { createGameRuntime } from './js/runtime-client.js';

const $ = id => document.getElementById(id);
const params = new URLSearchParams(window.location.search || '');
const playerId = params.get('playerId') || 'p1';
const runtime = createGameRuntime({ playerId, mode: params.get('runtime') || 'http' });
const NORMAL_GAME_SAVE_KEY = 'ysbzs.normalGame.save.v1';
const PHASE_TEXT = {
  init: '准备',
  node_choice: '3 选 1',
  node_resolved: '节点完成',
  battle_choice: '遭遇选择',
  reward: '奖励',
  shop: '商店',
  player_turn: '玩家回合',
  monster_turn: '敌方行动',
  round_end: '回合结算',
  battle_end: '战斗结束',
  day_end: '当天结束'
};
const BATTLE_PHASES = new Set(['player_turn', 'monster_turn', 'round_end', 'battle_end']);

let vm = null;
let busy = false;
let commandNo = 1;
let autoRouteInFlight = false;

function esc(value) {
  return String(value ?? '').replace(/[&<>'"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[ch]));
}

function cleanPayload(payload = {}) {
  const out = Object.assign({}, payload);
  delete out.option;
  delete out.reward;
  delete out.offer;
  delete out.shopEvent;
  delete out.unit;
  return out;
}

function makeCommand(type, payload = {}) {
  return Object.assign({
    type,
    commandId: `normal_${String(commandNo++).padStart(6, '0')}`,
    playerId,
    battleId: vm?.battleId,
    baseStateVersion: vm?.stateVersion ?? 0
  }, cleanPayload(payload));
}

function phaseText(phase) {
  return PHASE_TEXT[phase] || phase || '-';
}

function routeAction() {
  return vm?.dailyFlow?.primaryAction
    || (vm?.nextActions || []).find(action => action.type !== 'GENERATE_NODE_OPTIONS' && action.defaultPayload?.scheduleStep != null)
    || null;
}

function routeAutoAction() {
  if ((vm?.dayRoute?.options || []).length) return null;
  if (vm?.dailyFlow?.nextSchedule?.kind !== 'node_choice') return null;
  const action = vm?.dailyFlow?.autoAction
    || (vm?.nextActions || []).find(item => item.type === 'GENERATE_NODE_OPTIONS')
    || null;
  return action?.type === 'GENERATE_NODE_OPTIONS' ? action : null;
}

function hasRouteChoices() {
  return !!((vm?.dayRoute?.options || []).length
    || (vm?.dayRoute?.battleOptions || []).length
    || (vm?.rewards || []).length
    || routeAction());
}

function sceneForPhase() {
  if (vm?.phase === 'shop') return 'shop';
  if (BATTLE_PHASES.has(vm?.phase) && !hasRouteChoices()) return 'battle';
  return 'route';
}

function setScene(scene) {
  document.querySelector('.normal-shell')?.setAttribute('data-scene', scene);
  document.querySelectorAll('.scene').forEach(el => {
    el.dataset.active = el.dataset.sceneName === scene ? 'true' : 'false';
  });
}

function toast(text) {
  const el = $('toast');
  el.textContent = text;
  el.hidden = false;
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => { el.hidden = true; }, 2600);
}

function setBusy(value) {
  busy = value;
  document.querySelectorAll('button').forEach(btn => { btn.disabled = value; });
}

function setToolStatus(text) {
  const el = $('run-tool-status');
  if (el) el.textContent = text;
}

function seedValue() {
  return ($('seed-input')?.value || '').trim() || 'normal-seed-001';
}

function setSeedValue(seed) {
  const el = $('seed-input');
  if (el && seed) el.value = seed;
}

async function loadView() {
  const data = await runtime.view();
  vm = data.viewModel;
  render();
  await autoGenerateRouteChoices();
}

async function runCommand(type, payload = {}) {
  if (busy) return;
  setBusy(true);
  try {
    const data = await runtime.action(makeCommand(type, payload));
    vm = data.viewModel || vm;
    render(data.events || []);
    await autoGenerateRouteChoices();
  } catch (err) {
    toast(err.message || String(err));
  } finally {
    setBusy(false);
    render();
  }
}

async function saveRun() {
  const data = await runtime.save();
  if (!data?.save) throw new Error('SAVE_EMPTY');
  window.localStorage?.setItem(NORMAL_GAME_SAVE_KEY, JSON.stringify(data.save));
  setToolStatus(`已保存 v${data.save.state?.stateVersion ?? vm?.stateVersion ?? 0}`);
  return data.save;
}

function savedRunFromStorage() {
  const raw = window.localStorage?.getItem(NORMAL_GAME_SAVE_KEY);
  if (!raw) throw new Error('没有可读取的本局存档。');
  return JSON.parse(raw);
}

async function loadRun(saveDoc = savedRunFromStorage(), options = {}) {
  const data = await runtime.load(saveDoc);
  vm = data.viewModel || vm;
  render();
  await autoGenerateRouteChoices();
  if (!options.silent) setToolStatus(`已读取 v${vm?.stateVersion ?? 0}`);
  return data;
}

async function restartRunWithSeed(seed = seedValue(), options = {}) {
  setSeedValue(seed);
  const data = await runtime.action(makeCommand('NEW_GAME', {
    day: 1,
    period: '上午',
    gold: 8,
    seed
  }));
  vm = data.viewModel || vm;
  render(data.events || []);
  await autoGenerateRouteChoices();
  if (!options.silent) setToolStatus(`已用 seed ${seed} 重开`);
  return data;
}

async function autoGenerateRouteChoices() {
  const action = routeAutoAction();
  if (!action || autoRouteInFlight) return;
  autoRouteInFlight = true;
  setBusy(true);
  try {
    const data = await runtime.action(makeCommand(action.type, action.defaultPayload || {}));
    vm = data.viewModel || vm;
    render(data.events || []);
  } catch (err) {
    toast(err.message || String(err));
  } finally {
    autoRouteInFlight = false;
    setBusy(false);
    render();
  }
}

function routeChoiceSignature() {
  return (vm?.dayRoute?.options || []).map(option => ({
    optionId: option.optionId,
    nodeId: option.nodeId,
    name: option.name,
    nodeType: option.nodeType,
    preview: option.choicePreview?.summary || ''
  }));
}

async function runSeedRuleCheck() {
  const original = await runtime.save();
  const seed = seedValue();
  let passed = false;
  try {
    await restartRunWithSeed(seed, { silent: true });
    const firstHash = vm?.stateHash || '';
    const firstChoices = routeChoiceSignature();
    await restartRunWithSeed(seed, { silent: true });
    const secondHash = vm?.stateHash || '';
    const secondChoices = routeChoiceSignature();
    if (firstHash !== secondHash) throw new Error(`同 seed 初始 hash 不一致：${firstHash} != ${secondHash}`);
    if (JSON.stringify(firstChoices) !== JSON.stringify(secondChoices)) throw new Error('同 seed 的时间节点候选不一致。');
    if (firstChoices.length !== 3) throw new Error(`时间节点候选数量不是 3：${firstChoices.length}`);
    passed = true;
  } finally {
    if (original?.save) await loadRun(original.save, { silent: true });
    if (passed) setToolStatus(`规则自测通过：${seed}`);
  }
}

async function runSeedRuleCheckFromButton() {
  try {
    await runSeedRuleCheck();
  } catch (err) {
    setToolStatus(`规则自测失败：${err.message || String(err)}`);
    toast(err.message || String(err));
  }
}

function statusNextText() {
  if (vm?.phase === 'shop') return '商店整理';
  if (BATTLE_PHASES.has(vm?.phase) && !hasRouteChoices()) return '棋盘战斗';
  const action = routeAction();
  if (action) return action.label || phaseText(action.type);
  if ((vm?.dayRoute?.options || []).length) return '选择一个节点';
  if ((vm?.rewards || []).length) return '选择一个奖励';
  return phaseText(vm?.phase);
}

function renderStatus() {
  $('phase-label').textContent = phaseText(vm?.phase);
  $('day-label').textContent = vm?.day || 1;
  $('gold-label').textContent = vm?.gold ?? 0;
  $('next-label').textContent = statusNextText();
}

function previewText(item = {}) {
  const preview = item.choicePreview || {};
  const pressure = item.pressurePreview || {};
  return [
    preview.summary || item.note || item.phaseLabel || item.element || '',
    pressure.summary ? `压力：${pressure.summary}` : '',
    item.price != null ? `价格 ${item.price} 金` : '',
    item.quality ? `品质 ${item.quality}` : ''
  ].filter(Boolean).join(' · ') || '查看详情后选择。';
}

function offerCells(offer = {}) {
  const cells = Number(offer.attackCells || offer.cells || 0);
  if (cells > 0) return cells;
  return 1;
}

function statText(label, value) {
  return `<span><b>${esc(label)}</b>${esc(value ?? '-')}</span>`;
}

function bodySizeLabel(value) {
  const key = String(value || '').trim();
  if (key === '一格' || key === '1' || key === '小') return '小';
  if (key === '两格' || key === '二格' || key === '2' || key === '中') return '中';
  if (key === '三格' || key === '3' || key === '大') return '大';
  return key || '-';
}

function petSummaryLine(item = {}) {
  return [
    item.quality || '',
    item.element || '-',
    item.bodySize ? bodySizeLabel(item.bodySize) : '',
    item.attackCells || item.cells ? `攻击${offerCells(item)}格` : ''
  ].filter(Boolean).join(' · ');
}

function petDetailGrid(item = {}, options = {}) {
  const rows = [
    ['品质', item.quality || '-'],
    ['元素', item.element || '-'],
    ['HP', item.maxHp ? `${item.hp ?? item.maxHp}/${item.maxHp}` : (item.hp ?? '-')],
    ['攻击', item.atk ?? '-']
  ];
  if (item.def != null) rows.push(['防御', item.def]);
  if (item.shield != null) rows.push(['护盾', item.shield]);
  if (item.ap != null) rows.push(['行动', item.ap]);
  if (options.sellValue && item.sellValue != null) rows.push(['出售', `${item.sellValue}金`]);
  if (options.placement) rows.push(['状态', options.placement]);
  return `<dl class="pet-detail-grid">${rows.map(([label, value]) => `<div><dt>${esc(label)}</dt><dd>${esc(value)}</dd></div>`).join('')}</dl>`;
}

function petDetailNote(item = {}) {
  const parts = [
    item.shapeNote ? `攻击范围：${item.shapeNote}` : ''
  ].filter(Boolean);
  return parts.length ? `<p class="pet-detail-note">${esc(parts.join(' · '))}</p>` : '';
}

function attackRangeGrid(offer = {}) {
  const rows = 3;
  const cols = 4;
  const origin = { r: 1, c: 0 };
  const hits = new Set();
  const placeHit = (targetR, targetC) => {
    const r = Math.max(0, Math.min(rows - 1, targetR));
    const preferred = Math.max(1, Math.min(cols - 1, targetC));
    const candidates = [preferred, 1, 2, 3];
    for (const c of candidates) {
      const key = `${r},${c}`;
      if (!hits.has(key)) {
        hits.add(key);
        return;
      }
    }
  };
  const offsets = Array.isArray(offer.shapeOffsets) ? offer.shapeOffsets : [];
  for (const offset of offsets) {
    const r = origin.r + Number(offset.dr || 0);
    const c = origin.c + Number(offset.dc || 0);
    placeHit(r, c);
  }
  if (!hits.size) {
    for (let i = 1; i <= Math.min(cols - 1, offerCells(offer)); i += 1) hits.add(`${origin.r},${i}`);
  }
  const cells = [];
  for (let r = 0; r < rows; r += 1) {
    for (let c = 0; c < cols; c += 1) {
      const isOrigin = r === origin.r && c === origin.c;
      const isHit = hits.has(`${r},${c}`);
      cells.push(`<span class="${isOrigin ? 'origin' : isHit ? 'hit' : ''}">${isOrigin ? '●' : isHit ? '■' : ''}</span>`);
    }
  }
  return `<div class="shop-range-wrap">
    <div class="shop-range-grid" aria-label="${esc(offer.shapeNote || '攻击范围')} 3x4">${cells.join('')}</div>
    <small>攻击范围</small>
  </div>`;
}

function routeNodeTitle() {
  const schedule = vm?.dailyFlow?.nextSchedule;
  return `时间节点 ${schedule?.step || 1}`;
}

function routeNodeKicker() {
  const schedule = vm?.dailyFlow?.nextSchedule;
  if (!schedule) return '3 选 1';
  return `${schedule.label || '路线节点'} · 3 选 1`;
}

function choiceButton(label, type, payload = {}, subtitle = '', lockedReason = '') {
  const item = payload.option || payload.reward || payload.offer || payload.shopEvent || payload.unit || payload;
  return `<button class="choice-card" data-command="${esc(type)}" data-payload="${esc(JSON.stringify(payload))}" type="button"${lockedReason ? ` disabled title="${esc(lockedReason)}"` : ''}>
    <strong>${esc(label)}</strong>
    <span>${esc(subtitle || type)}</span>
    <p>${esc(previewText(item))}</p>
  </button>`;
}

function renderRouteScene() {
  const items = [];
  const action = routeAction();
  $('route-node-title').textContent = routeNodeTitle();
  $('route-node-kicker').textContent = routeNodeKicker();
  $('route-summary').textContent = vm?.dailyFlow?.nextSchedule?.note || '选择路线、遭遇或奖励。这里是战斗前决策界面。';
  if (action) items.push(choiceButton(action.label || '继续路线', action.type, action.defaultPayload || {}, '路线推进'));
  for (const option of vm?.dayRoute?.options || []) {
    items.push(choiceButton(option.name || option.nodeId, 'PICK_NODE', { optionId: option.optionId, option }, '节点'));
  }
  for (const option of vm?.dayRoute?.battleOptions || []) {
    items.push(choiceButton(option.name || option.encounterId, 'PICK_BATTLE_ENCOUNTER', { encounterId: option.encounterId, option }, '遭遇'));
  }
  (vm?.rewards || []).forEach((reward, index) => {
    items.push(choiceButton(reward.name || reward.petName || reward.relicName || `奖励 ${index + 1}`, 'PICK_REWARD', { index, reward }, '奖励'));
  });
  if (!items.length) {
    items.push('<article class="empty-card"><strong>读取节点中</strong><p>正在展开当前时间节点的 3 个候选。</p></article>');
  }
  $('route-choice-list').innerHTML = items.join('');
  renderRoster('route');
}

function rosterCard(item = {}, active = false) {
  const moveLabel = active ? '下阵' : '上阵';
  const canMove = active ? item.canMoveToBench !== false : item.canMoveToActive !== false;
  const reason = item.moveBlockedReason || (active ? '背包已满' : '上阵已满');
  const meta = petSummaryLine(item);
  return `<article class="roster-card ${active ? 'active' : 'bench'}">
    <header>
      <strong>${esc(item.name || item.petId)}</strong>
      <span>${esc(meta)}</span>
    </header>
    ${petDetailGrid(item, { sellValue: true, placement: active ? '上阵中' : '背包' })}
    ${petDetailNote(item)}
    <button type="button" data-command="TOGGLE_UNIT_ACTIVE" data-payload="${esc(JSON.stringify({ instanceId: item.instanceId, petId: item.petId, unit: item }))}"${canMove ? '' : ` disabled title="${esc(reason)}"`}>${moveLabel}</button>
  </article>`;
}

function renderRoster(prefix) {
  const inv = vm?.inventory || {};
  const active = inv.active || [];
  const bench = inv.bench || [];
  $(`${prefix}-roster-count`).textContent = `上阵 ${active.length}/${inv.maxActive || active.length || 0} · 背包 ${bench.length}/${inv.maxBench || bench.length || 0}`;
  $(`${prefix}-active-list`).innerHTML = active.map(item => rosterCard(item, true)).join('') || '<article class="empty-card"><strong>无上阵宠物</strong></article>';
  $(`${prefix}-bench-list`).innerHTML = bench.map(item => rosterCard(item, false)).join('') || '<article class="empty-card"><strong>背包为空</strong></article>';
}

function buyBlockedReason(offer = {}) {
  if (Number(vm?.gold || 0) < Number(offer.price || 0)) return `金币不足：需要 ${offer.price}，当前 ${vm?.gold || 0}`;
  if (offer.canBuy === false) return offer.buyBlockedReason || '没有上阵或背包空位';
  return '';
}

function shopOfferCard(offer = {}) {
  const placement = offer.buyPlacement === 'active' ? '进上阵' : offer.buyPlacement === 'bench' ? '进背包' : '无位置';
  const blockedReason = buyBlockedReason(offer);
  const payload = { offerId: offer.offerId };
  const attackCellsText = `攻击${esc(offerCells(offer))}格`;
  const meta = [
    offer.quality || '',
    offer.element || '-',
    offer.bodySize ? bodySizeLabel(offer.bodySize) : '',
    attackCellsText
  ].filter(Boolean).join(' · ');
  const stats = [
    statText('HP', offer.hp),
    statText('攻击', offer.atk),
    statText('防御', offer.def),
    statText('护盾', offer.shield),
    statText('行动', offer.ap)
  ].join('');
  return `<article class="shop-offer-card">
        <header class="shop-offer-head">
          <div>
            <strong>${esc(offer.name || offer.petId || '未知宠物')}</strong>
            <span>${esc(meta || offer.poolTier || '-')}</span>
          </div>
        </header>
    ${attackRangeGrid(offer)}
    <div class="shop-offer-stats">${stats}</div>
    ${petDetailNote(offer)}
    <footer class="shop-offer-footer">
      <span class="shop-offer-price">${esc(offer.price ?? '-')} 金 · ${esc(placement)}</span>
      <button type="button" data-command="BUY_OFFER" data-payload="${esc(JSON.stringify(payload))}"${blockedReason ? ` disabled title="${esc(blockedReason)}"` : ''}>购买</button>
    </footer>
  </article>`;
}

function refreshCostText(shop = {}) {
  const cost = Number(shop.refreshState?.nextRefreshCost ?? (Number(shop.freeRolls || 0) > 0 ? 0 : 2));
  return cost > 0 ? `${cost} 金` : '免费';
}

function renderShopScene() {
  const shop = vm?.shop || {};
  const capacity = Number(shop.activeStall?.slots || 10);
  const petOffers = (shop.offers || []).filter(offer => offer.type === 'pet');
  const used = petOffers.reduce((sum, offer) => sum + offerCells(offer), 0);
  $('shop-summary').textContent = shop.activeStall?.name
    ? `${shop.activeStall.name} · ${shop.activeStall.tags?.join(' / ') || '普通摊位'} · 攻击格 ${used}/${capacity}`
    : '当前未进入商店节点。';
  const items = [];
  const actions = [];
  for (const offer of petOffers) {
    items.push(shopOfferCard(offer));
  }
  if (vm?.phase === 'shop') {
    actions.push(choiceButton(`刷新商品 ${refreshCostText(shop)}`, 'ROLL_SHOP', { slots: capacity }, '商店操作'));
    actions.push(choiceButton('离开商店', 'EXIT_SHOP', {}, '继续路线'));
  }
  for (const unit of vm?.inventory?.items || []) {
    actions.push(choiceButton(`出售 ${unit.name || unit.petId}`, 'SELL_UNIT', { instanceId: unit.instanceId, petId: unit.petId, unit }, unit.active ? '上阵' : '背包'));
  }
  $('shop-choice-list').innerHTML = items.join('') || '<article class="empty-card"><strong>商店未开启</strong><p>进入商店后会刷新宠物。</p></article>';
  $('shop-action-list').innerHTML = actions.join('');
  renderRoster('shop');
}

function battlePageHref() {
  const url = new URL('index.html', window.location.href);
  url.searchParams.set('runtime', params.get('runtime') || 'http');
  url.searchParams.set('normalMode', '1');
  if (params.get('sessionId')) url.searchParams.set('sessionId', params.get('sessionId'));
  if (params.get('playerId')) url.searchParams.set('playerId', params.get('playerId'));
  return `${url.pathname}${url.search}${url.hash}`;
}

function applyFormalBattlePlayerMode(frame) {
  const doc = frame?.contentDocument;
  if (!doc || doc.getElementById('normal-player-hide-debug')) return;
  const style = doc.createElement('style');
  style.id = 'normal-player-hide-debug';
  style.textContent = `
    .brand-actions a,
    #new-game-btn,
    #day7-btn,
    #save-game-btn,
    #load-game-btn,
    #shop-phase-panel {
      display: none !important;
    }
    .brand-actions {
      right: 10px !important;
    }
    .board-actions {
      grid-template-columns: auto !important;
      justify-content: end !important;
    }
  `;
  doc.head.appendChild(style);
  doc.querySelectorAll('.log-tab').forEach(tab => {
    if (/回放|调试/.test(tab.textContent || '')) tab.style.display = 'none';
  });
}

function renderBattleScene(active = false) {
  const href = battlePageHref();
  const link = $('formal-battle-link');
  const frame = $('formal-battle-frame');
  link.href = href;
  if (!frame.dataset.playerModeBound) {
    frame.dataset.playerModeBound = 'true';
    frame.addEventListener('load', () => applyFormalBattlePlayerMode(frame));
  }
  if (active && frame.getAttribute('src') !== href) frame.setAttribute('src', href);
  if (active) applyFormalBattlePlayerMode(frame);
}

function render(events = []) {
  if (!vm) return;
  renderStatus();
  renderRouteScene();
  renderShopScene();
  const scene = sceneForPhase();
  renderBattleScene(scene === 'battle');
  setScene(scene);
  window.__YSBZS_NORMAL_GAME__ = { lastViewModel: vm, runCommand, loadView, sceneForPhase, saveRun, loadRun, restartRunWithSeed, runSeedRuleCheck };
}

function payloadFromButton(btn) {
  try { return JSON.parse(btn.dataset.payload || '{}'); }
  catch (_) { return {}; }
}

document.addEventListener('click', ev => {
  const commandBtn = ev.target.closest('[data-command]');
  if (commandBtn) {
    runCommand(commandBtn.dataset.command, payloadFromButton(commandBtn));
  }
});

loadView().catch(err => toast(err.message || String(err)));

setSeedValue(params.get('seed') || seedValue());
$('save-run-btn').addEventListener('click', () => saveRun().catch(err => toast(err.message || String(err))));
$('load-run-btn').addEventListener('click', () => loadRun().catch(err => toast(err.message || String(err))));
$('restart-run-btn').addEventListener('click', () => restartRunWithSeed().catch(err => toast(err.message || String(err))));
$('seed-check-btn').addEventListener('click', () => runSeedRuleCheckFromButton());
