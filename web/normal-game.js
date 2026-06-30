import { createGameRuntime } from './js/runtime-client.js';

const $ = id => document.getElementById(id);
const params = new URLSearchParams(window.location.search || '');
const playerId = params.get('playerId') || 'p1';
const runtime = createGameRuntime({ playerId, mode: params.get('runtime') || 'http' });
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
const BATTLE_PHASES = new Set(['init', 'player_turn', 'monster_turn', 'round_end', 'battle_end']);

let vm = null;
let busy = false;
let commandNo = 1;
let manualScene = '';

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
    || vm?.dailyFlow?.autoAction
    || (vm?.nextActions || []).find(action => action.type === 'GENERATE_NODE_OPTIONS' || action.defaultPayload?.scheduleStep != null)
    || null;
}

function hasRouteChoices() {
  return !!((vm?.dayRoute?.options || []).length
    || (vm?.dayRoute?.battleOptions || []).length
    || (vm?.rewards || []).length
    || routeAction());
}

function sceneForPhase() {
  if (manualScene) return manualScene;
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

async function loadView() {
  const data = await runtime.view();
  vm = data.viewModel;
  render();
}

async function runCommand(type, payload = {}) {
  if (busy) return;
  setBusy(true);
  try {
    const data = await runtime.action(makeCommand(type, payload));
    vm = data.viewModel || vm;
    manualScene = '';
    render(data.events || []);
  } catch (err) {
    toast(err.message || String(err));
  } finally {
    setBusy(false);
    render();
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
    preview.summary || item.note || item.phaseLabel || item.role || item.element || '',
    pressure.summary ? `压力：${pressure.summary}` : '',
    item.price != null ? `价格 ${item.price} 金` : '',
    item.level ? `Lv${item.level}` : ''
  ].filter(Boolean).join(' · ') || '查看详情后选择。';
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
  if (action) items.push(choiceButton(action.label || '生成 3 选 1', action.type, action.defaultPayload || {}, '路线推进'));
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
    items.push('<article class="empty-card"><strong>等待路线</strong><p>当前没有 3 选 1 项，可以切到游戏界面继续战斗或进入商店。</p></article>');
  }
  $('route-choice-list').innerHTML = items.join('');
  renderRoster('route');
}

function rosterCard(item = {}, active = false) {
  const moveLabel = active ? '下阵' : '上阵';
  const canMove = active ? item.canMoveToBench !== false : item.canMoveToActive !== false;
  const reason = item.moveBlockedReason || (active ? '背包已满' : '上阵已满');
  return `<article class="roster-card ${active ? 'active' : 'bench'}">
    <strong>${esc(item.name || item.petId)}</strong>
    <span>${esc(item.element || '-')} / ${esc(item.role || '-')} · Lv${esc(item.level || 1)}</span>
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

function renderShopScene() {
  const shop = vm?.shop || {};
  $('shop-summary').textContent = shop.activeStall?.name
    ? `${shop.activeStall.name} · ${shop.activeStall.tags?.join(' / ') || '普通摊位'}`
    : '当前未在商店，可手动进入夜晚商店。';
  const items = [];
  for (const offer of shop.offers || []) {
    const placement = offer.buyPlacement === 'active' ? '进上阵' : offer.buyPlacement === 'bench' ? '进背包' : '无位置';
    items.push(choiceButton(`购买 ${offer.name || offer.petId}`, 'BUY_OFFER', { offerId: offer.offerId, offer }, `${offer.price ?? '-'} 金 · ${placement}`, buyBlockedReason(offer)));
  }
  for (const shopEvent of shop.events || []) {
    items.push(choiceButton(shopEvent.name, 'APPLY_SHOP_EVENT', { eventId: shopEvent.id, shopEvent }, '商店事件'));
  }
  for (const unit of vm?.inventory?.items || []) {
    items.push(choiceButton(`出售 ${unit.name || unit.petId}`, 'SELL_UNIT', { instanceId: unit.instanceId, petId: unit.petId, unit }, unit.active ? '上阵' : '背包'));
  }
  $('shop-choice-list').innerHTML = items.join('') || '<article class="empty-card"><strong>商店未开启</strong><p>点击进入商店后会刷新商品。</p></article>';
  renderRoster('shop');
}

function unitChip(unit = {}) {
  const hp = unit.hp != null ? `HP ${unit.hp}/${unit.maxHp || unit.hp}` : '';
  return `<article class="unit-chip"><strong>${esc(unit.displayName || unit.name || unit.id)}</strong><span>${esc(hp)} · 攻 ${esc(unit.atk ?? '-')}</span></article>`;
}

function renderBattleScene(events = []) {
  const cells = vm?.board?.cells || [];
  const heroUnits = [vm?.leaders?.player, ...(vm?.heroes || [])].filter(Boolean);
  const rawEnemyUnits = [vm?.leaders?.enemy, ...(vm?.enemies || [])].filter(Boolean);
  const enemyUnits = rawEnemyUnits.length ? rawEnemyUnits : cells
    .filter(cell => cell.unitSide === 'enemy' && cell.unitId)
    .map(cell => ({ id: cell.unitId, displayName: cell.unitName, side: 'enemy' }));
  const unitById = new Map([...heroUnits, ...enemyUnits].map(unit => [unit.id, unit]));
  $('battle-hero-list').innerHTML = heroUnits.map(unitChip).join('') || '<article class="empty-card"><strong>暂无我方单位</strong></article>';
  $('battle-enemy-list').innerHTML = enemyUnits.map(unitChip).join('') || '<article class="empty-card"><strong>暂无敌方单位</strong></article>';
  const byKey = new Map(cells.map(cell => [`${cell.r},${cell.c}`, cell]));
  const out = [];
  for (let r = 0; r < 8; r += 1) {
    for (let c = 0; c < 8; c += 1) {
      const cell = byKey.get(`${r},${c}`) || { r, c };
      const unit = cell.unit || cell.occupant || unitById.get(cell.unitId) || (cell.unitId ? {
        id: cell.unitId,
        displayName: cell.unitName,
        side: cell.unitSide
      } : null);
      const side = unit?.side === 'enemy' || cell.unitSide === 'enemy' ? 'enemy' : unit ? 'hero' : '';
      out.push(`<div class="board-cell ${unit ? 'has-unit' : ''} ${side}">
        <span class="cell-pos">${r},${c}</span>
        ${unit ? `<span class="cell-unit">${esc(unit.displayName || unit.name || unit.id)}<br>HP ${esc(unit.hp ?? '-')}</span>` : ''}
      </div>`);
    }
  }
  $('battle-board').innerHTML = out.join('');
  const recent = events.length ? events : (vm?.events || []).slice(-12);
  $('battle-log').textContent = recent.map(event => `[${event.type}] ${event.text || ''}`).join('\n') || '暂无战斗记录。';
  $('start-battle-btn').disabled = busy || vm?.phase !== 'init';
  $('auto-position-btn').disabled = busy || vm?.phase !== 'player_turn';
  $('all-out-btn').disabled = busy || vm?.phase !== 'player_turn';
}

function render(events = []) {
  if (!vm) return;
  renderStatus();
  renderRouteScene();
  renderShopScene();
  renderBattleScene(events);
  setScene(sceneForPhase());
  window.__YSBZS_NORMAL_GAME__ = { lastViewModel: vm, runCommand, loadView, sceneForPhase };
}

function payloadFromButton(btn) {
  try { return JSON.parse(btn.dataset.payload || '{}'); }
  catch (_) { return {}; }
}

document.addEventListener('click', ev => {
  const sceneBtn = ev.target.closest('[data-jump-scene]');
  if (sceneBtn) {
    manualScene = sceneBtn.dataset.jumpScene || '';
    render();
    return;
  }
  const commandBtn = ev.target.closest('[data-command]');
  if (commandBtn) {
    runCommand(commandBtn.dataset.command, payloadFromButton(commandBtn));
  }
});

$('enter-shop-btn').addEventListener('click', () => runCommand('ENTER_SHOP', { poolId: 'night_base', slots: 6 }));
$('roll-shop-btn').addEventListener('click', () => runCommand('ROLL_SHOP', { slots: vm?.shop?.activeStall?.slots || 6 }));
$('exit-shop-btn').addEventListener('click', () => runCommand('EXIT_SHOP'));
$('start-battle-btn').addEventListener('click', () => runCommand('START_BATTLE'));
$('auto-position-btn').addEventListener('click', () => runCommand('AUTO_POSITION_HEROES'));
$('all-out-btn').addEventListener('click', () => runCommand('RUN_PLAYER_ALL_OUT'));
$('route-return-btn').addEventListener('click', () => { manualScene = 'route'; render(); });

loadView().catch(err => toast(err.message || String(err)));
