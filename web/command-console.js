import { createGameRuntime } from './js/runtime-client.js';

const $ = id => document.getElementById(id);
const params = new URLSearchParams(window.location.search || '');
if (!params.get('runtime')) params.set('runtime', 'http');
if ((params.get('runtime') || 'http') === 'http' && !params.get('sessionId')) {
  params.set('sessionId', `command-console-${Date.now().toString(36)}`);
}
if (params.toString() !== new URLSearchParams(window.location.search || '').toString()) {
  const url = new URL(window.location.href);
  url.search = params.toString();
  window.history.replaceState(null, '', url);
}

const COMMAND_TABLE = Object.freeze([
  { type: 'START_BATTLE', label: '开始战斗', category: '流程/战斗', aliases: ['startBattle'] },
  { type: 'START_NEXT_ROUND', label: '下一回合', category: '流程/战斗', aliases: ['startNextRound'] },
  { type: 'SELECT_HERO', label: '选择英雄', category: '选择/棋盘', aliases: ['selectHero'] },
  { type: 'SELECT_UNIT', label: '选择单位', category: '选择/棋盘', aliases: ['selectUnit'] },
  { type: 'SELECT_CELL', label: '选择格子', category: '选择/棋盘', aliases: ['selectCell'] },
  { type: 'SELECT_SLOT', label: '选择行动槽', category: '选择/棋盘', aliases: ['selectSlot'] },
  { type: 'CLEAR_SELECTION', label: '清除选择', category: '选择/棋盘', aliases: ['clearSelection'] },
  { type: 'SET_ACTION_DIRECTION', label: '调整行动槽方向', category: '选择/棋盘', aliases: ['setActionDirection'] },
  { type: 'SET_SLOT_DIR', label: '兼容方向命令', category: '选择/棋盘', aliases: ['setSlotDir'] },
  { type: 'MOVE_HERO', label: '移动英雄', category: '选择/棋盘', aliases: ['moveHero'] },
  { type: 'AUTO_POSITION_HEROES', label: '智能调整站位', category: '流程/战斗', aliases: ['autoPositionHeroes'] },
  { type: 'USE_SLOT', label: '施放行动槽', category: '选择/棋盘', aliases: ['useSlot'] },
  { type: 'USE_ACTION_SLOT', label: '兼容施放行动槽', category: '选择/棋盘', aliases: ['useActionSlot'] },
  { type: 'RUN_PLAYER_ALL_OUT', label: '我方全部出击', category: '流程/战斗', aliases: ['runPlayerAllOut'] },
  { type: 'END_PLAYER_TURN', label: '结束玩家回合', category: '流程/战斗', aliases: ['endPlayerTurn'] },
  { type: 'RUN_MONSTER_TURN', label: '怪物行动', category: '流程/战斗', aliases: ['runMonsterTurn'] },
  { type: 'BUILD_PREVIEW', label: '查看格子预览', category: '选择/棋盘', aliases: ['buildPreview'] },
  { type: 'GET_CELL_DETAIL', label: '格子详情', category: '选择/棋盘', aliases: ['getCellDetail'] },
  { type: 'PREVIEW_MANUAL_FLOW', label: '手动流程预览', category: '回放/调试', aliases: ['previewManualFlow'] },
  { type: 'RUN_BATTLE', label: '自动完成战斗', category: '流程/战斗', aliases: ['runBattle'] },
  { type: 'GENERATE_NODE_OPTIONS', label: '生成节点候选', category: '路线/奖励', aliases: ['generateNodeOptions'] },
  { type: 'PICK_NODE', label: '选择路线节点', category: '路线/奖励', aliases: ['pickNode'] },
  { type: 'GENERATE_BATTLE_OPTIONS', label: '生成中午遭遇', category: '路线/奖励', aliases: ['generateBattleOptions'] },
  { type: 'PICK_BATTLE_ENCOUNTER', label: '选择遭遇', category: '路线/奖励', aliases: ['pickBattleEncounter'] },
  { type: 'RUN_ROUTE_FIXED_BATTLE', label: '进入固定战', category: '路线/奖励', aliases: ['runRouteFixedBattle'] },
  { type: 'CLAIM_ROUTE_REWARD', label: '领取路线奖励', category: '路线/奖励', aliases: ['claimRouteReward'] },
  { type: 'START_NEXT_DAY', label: '进入下一天', category: '路线/奖励', aliases: ['startNextDay'] },
  { type: 'REWARD_OPTIONS', label: '生成奖励候选', category: '路线/奖励', aliases: ['rewardOptions'] },
  { type: 'PICK_REWARD', label: '选择奖励', category: '路线/奖励', aliases: ['pickReward'] },
  { type: 'ENTER_SHOP', label: '进入夜晚商店', category: '商店/队伍', aliases: ['enterShop'] },
  { type: 'ROLL_SHOP', label: '刷新商店', category: '商店/队伍', aliases: ['rollShop'] },
  { type: 'FREEZE_OFFER', label: '冻结商品', category: '商店/队伍', aliases: ['freezeOffer'] },
  { type: 'UNFREEZE_OFFER', label: '取消冻结商品', category: '商店/队伍', aliases: ['unfreezeOffer'] },
  { type: 'BUY_OFFER', label: '购买商品', category: '商店/队伍', aliases: ['buyOffer'] },
  { type: 'APPLY_SHOP_EVENT', label: '应用商店事件', category: '商店/队伍', aliases: ['applyShopEvent'] },
  { type: 'EXIT_SHOP', label: '离开商店', category: '商店/队伍', aliases: ['exitShop'] },
  { type: 'RUN_FULL_DAY', label: '一键完整流程', category: '流程/战斗', aliases: ['runFullDay', 'runFullPlayerDayFlow'] },
  { type: 'RUN_FULL_RUN', label: '一键完整Run', category: '流程/战斗', aliases: ['runFullRun'] },
  { type: 'SELL_UNIT', label: '出售宠物', category: '商店/队伍', aliases: ['sellUnit'] },
  { type: 'TOGGLE_UNIT_ACTIVE', label: '上阵/备战切换', category: '商店/队伍', aliases: ['toggleUnitActive'] },
  { type: 'EXPORT_BATTLE_TRACE', label: '导出战斗追踪', category: '回放/调试', aliases: ['exportBattleTrace'] },
  { type: 'REPLAY_BATTLE_TRACE', label: '回放战斗追踪', category: '回放/调试', aliases: ['replayBattleTrace'] },
  { type: 'EXPORT_REPLAY', label: '导出结构化回放', category: '回放/调试', aliases: ['exportReplay'] },
  { type: 'SETUP_DAY7_FIRE_TRIAL', label: '第7天火核心试炼', category: '回放/调试', aliases: ['setupDay7FireTrial'] },
  { type: 'RUN_DAY7_FIRE_TURN_1', label: '执行第7天第1回合', category: '回放/调试', aliases: ['runDay7FireTurn1'] },
  { type: 'RUN_DAY7_FIRE_TRIAL_ALL', label: '自动执行到试炼通过', category: '回放/调试', aliases: ['runDay7FireTrialAll'] }
]);

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

const currentPlayerId = () => params.get('playerId') || 'p1';
const runtime = createGameRuntime({ playerId: currentPlayerId, mode: params.get('runtime') || 'http' });

let vm = null;
let busy = false;
let commandNo = 1;
let selectedCommand = null;
let activeTab = 'events';
let consoleErrors = 0;
let pageLog = [];

window.addEventListener('error', () => { consoleErrors += 1; renderInspect(); });
window.addEventListener('unhandledrejection', () => { consoleErrors += 1; renderInspect(); });

function esc(value) {
  return String(value ?? '').replace(/[&<>'"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[ch]));
}
function phaseText(phase) { return PHASE_TEXT[phase] || phase || '-'; }
function pretty(value) { return JSON.stringify(value, null, 2); }
function toast(text, error = false) {
  const el = $('toast');
  el.textContent = text;
  el.style.borderLeftColor = error ? '#874042' : '#587b45';
  el.classList.remove('hidden');
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => el.classList.add('hidden'), 2800);
}
function setBusy(value) {
  busy = value;
  document.querySelectorAll('button').forEach(button => { button.disabled = value; });
  renderControls();
}
function addPageLog(item) {
  pageLog = [item, ...pageLog].slice(0, 40);
}
function metaFor(type) {
  return COMMAND_TABLE.find(item => item.type === type) || { type, label: type, category: '未知', aliases: [] };
}
function makeCommand(type, payload = {}) {
  return Object.assign({
    type,
    commandId: `console_${String(commandNo++).padStart(6, '0')}`,
    playerId: currentPlayerId(),
    battleId: vm?.battleId,
    baseStateVersion: vm?.stateVersion ?? 0
  }, payload);
}
function syncLinks() {
  const battle = new URL('index.html', window.location.href);
  const debug = new URL('battle-debug.html', window.location.href);
  for (const [key, value] of params.entries()) {
    battle.searchParams.set(key, value);
    debug.searchParams.set(key, value);
  }
  $('battle-page-link').href = `${battle.pathname}${battle.search}`;
  $('debug-page-link').href = `${debug.pathname}${debug.search}`;
}
function categories() {
  return [...new Set(COMMAND_TABLE.map(item => item.category))];
}
function buildDefaultPayload(actionOrMeta) {
  if (actionOrMeta?.defaultPayload) return actionOrMeta.defaultPayload;
  switch (actionOrMeta?.type) {
    case 'ENTER_SHOP': return { poolId: 'night_base', slots: 10 };
    case 'ROLL_SHOP': return { slots: vm?.shop?.activeStall?.slots || 10 };
    case 'REWARD_OPTIONS': return { poolId: 'reward_pT1', count: 3 };
    case 'RUN_FULL_RUN': return { fromDay: 1, toDay: 10, gold: Math.max(8, Number(vm?.gold || 0)) };
    case 'GET_CELL_DETAIL':
    case 'SELECT_CELL': return { r: 0, c: 0 };
    case 'SET_ACTION_DIRECTION':
    case 'SET_SLOT_DIR': return { slotId: 0, dir: 'right' };
    case 'SELECT_SLOT':
    case 'USE_SLOT':
    case 'USE_ACTION_SLOT': return { slotId: 0 };
    case 'REPLAY_BATTLE_TRACE': return { events: [] };
    default: return {};
  }
}
function selectCommand(actionOrMeta) {
  const meta = metaFor(actionOrMeta.type);
  selectedCommand = Object.assign({}, meta, {
    label: actionOrMeta.label || meta.label,
    defaultPayload: buildDefaultPayload(actionOrMeta)
  });
  $('command-type').value = selectedCommand.type;
  $('payload-input').value = pretty(selectedCommand.defaultPayload || {});
  $('selected-command-label').textContent = `${selectedCommand.category} · ${selectedCommand.label}`;
  renderCommandList();
}
async function loadView() {
  const data = await runtime.view();
  vm = data.viewModel || data;
  render();
  return vm;
}
async function runSelectedCommand() {
  if (busy) return;
  const type = $('command-type').value.trim();
  if (!type) {
    toast('先选择或输入命令类型。', true);
    return;
  }
  let payload;
  try {
    payload = JSON.parse($('payload-input').value || '{}');
  } catch (err) {
    toast(`payload JSON 无效：${err.message || err}`, true);
    return;
  }
  setBusy(true);
  try {
    const command = makeCommand(type, payload);
    const data = await runtime.action(command);
    vm = data.viewModel || vm;
    const ok = data.ok !== false && data.accepted !== false && !data.error;
    $('result-label').textContent = ok ? '已执行' : '被拒绝';
    $('result-output').textContent = pretty({
      command,
      accepted: data.accepted,
      error: data.error,
      phase: vm?.phase,
      stateVersion: vm?.stateVersion,
      stateHash: vm?.stateHash,
      events: data.events || data.result?.events || []
    });
    addPageLog({ command: type, ok, phase: vm?.phase, stateVersion: vm?.stateVersion, error: data.error || null });
    toast(ok ? `已执行 ${type}` : `${type} 被拒绝`, !ok);
    render();
  } catch (err) {
    $('result-label').textContent = '执行失败';
    $('result-output').textContent = String(err.stack || err.message || err);
    addPageLog({ command: type, ok: false, error: err.message || String(err) });
    toast(err.message || String(err), true);
  } finally {
    setBusy(false);
  }
}
async function exportReplay() {
  selectCommand(metaFor('EXPORT_REPLAY'));
  await runSelectedCommand();
}
async function copyPayload() {
  const text = $('payload-input').value || '{}';
  try {
    await navigator.clipboard.writeText(text);
    toast('已复制 payload。');
  } catch {
    $('payload-input').focus();
    $('payload-input').select();
    document.execCommand('copy');
    toast('已复制 payload。');
  }
}
function newSession() {
  const url = new URL(window.location.href);
  url.searchParams.set('runtime', params.get('runtime') || 'http');
  url.searchParams.set('sessionId', `command-console-${Date.now().toString(36)}`);
  if (params.get('playerId')) url.searchParams.set('playerId', params.get('playerId'));
  window.location.assign(url.toString());
}
function renderStatus() {
  $('phase-label').textContent = phaseText(vm?.phase);
  $('round-label').textContent = vm?.round ? `第${vm.round}回合` : '-';
  $('gold-label').textContent = vm?.gold ?? '-';
  $('version-label').textContent = vm?.stateVersion ?? '-';
  $('hash-label').textContent = vm?.stateHash || '-';
  $('session-label').textContent = params.get('sessionId') || 'local';
}
function renderCategoryFilter() {
  const select = $('category-filter');
  if (select.dataset.ready === '1') return;
  select.innerHTML = '<option value="all">全部分类</option>' + categories().map(category => `<option value="${esc(category)}">${esc(category)}</option>`).join('');
  select.dataset.ready = '1';
}
function filteredCommands() {
  const q = $('command-search').value.trim().toLowerCase();
  const category = $('category-filter').value;
  return COMMAND_TABLE.filter(item => {
    const categoryOk = category === 'all' || item.category === category;
    if (!categoryOk) return false;
    if (!q) return true;
    return [item.type, item.label, item.category, ...(item.aliases || [])].join(' ').toLowerCase().includes(q);
  });
}
function renderCurrentActions() {
  const actions = vm?.nextActions || [];
  $('current-actions').innerHTML = actions.length
    ? actions.map(action => `<button data-action-type="${esc(action.type)}" type="button">${esc(action.label || action.type)}</button>`).join('')
    : '<span>当前状态没有 ViewModel nextActions。</span>';
}
function renderCommandList() {
  const commands = filteredCommands();
  $('command-count').textContent = `${commands.length}/${COMMAND_TABLE.length}`;
  $('command-list').innerHTML = commands.map(item => {
    const selected = item.type === selectedCommand?.type ? ' selected' : '';
    const aliases = item.aliases?.length ? `alias: ${item.aliases.join(', ')}` : '无 alias';
    return `<button class="command-row${selected}" data-command-type="${esc(item.type)}" type="button">
      <span><strong>${esc(item.type)}</strong><span>${esc(item.label)} · ${esc(aliases)}</span></span>
      <i class="badge">${esc(item.category)}</i>
    </button>`;
  }).join('');
}
function renderInspect() {
  $('console-label').textContent = `console: ${consoleErrors}`;
  let payload;
  if (activeTab === 'events') {
    payload = {
      pageLog,
      recentEvents: vm?.events?.slice(-20) || [],
      nextActions: vm?.nextActions || []
    };
  } else if (activeTab === 'commands') {
    payload = {
      commandLog: vm?.commandLog || [],
      playerViewState: vm?.playerViewState || null
    };
  } else {
    payload = vm || {};
  }
  $('inspect-output').textContent = pretty(payload);
}
function renderControls() {
  $('run-command-btn').disabled = busy;
  $('copy-payload-btn').disabled = busy;
  $('export-replay-btn').disabled = busy;
  $('refresh-btn').disabled = busy;
  $('new-session-btn').disabled = busy;
}
function render() {
  if (!vm) return;
  syncLinks();
  renderStatus();
  renderCategoryFilter();
  renderCurrentActions();
  renderCommandList();
  renderInspect();
  renderControls();
  window.__YSBZS_COMMAND_CONSOLE__ = {
    vm,
    commandTable: COMMAND_TABLE,
    selectCommand,
    runSelectedCommand,
    loadView
  };
}
function bind() {
  $('command-search').addEventListener('input', renderCommandList);
  $('category-filter').addEventListener('change', renderCommandList);
  $('refresh-btn').addEventListener('click', loadView);
  $('new-session-btn').addEventListener('click', newSession);
  $('run-command-btn').addEventListener('click', runSelectedCommand);
  $('copy-payload-btn').addEventListener('click', copyPayload);
  $('export-replay-btn').addEventListener('click', exportReplay);
  $('current-actions').addEventListener('click', ev => {
    const btn = ev.target.closest('[data-action-type]');
    if (!btn) return;
    const action = (vm?.nextActions || []).find(item => item.type === btn.dataset.actionType);
    if (action) selectCommand(action);
  });
  $('command-list').addEventListener('click', ev => {
    const btn = ev.target.closest('[data-command-type]');
    if (!btn) return;
    selectCommand(metaFor(btn.dataset.commandType));
  });
  document.querySelector('.inspect-tabs').addEventListener('click', ev => {
    const btn = ev.target.closest('[data-tab]');
    if (!btn) return;
    activeTab = btn.dataset.tab;
    document.querySelectorAll('.inspect-tabs button').forEach(item => item.classList.toggle('active', item === btn));
    renderInspect();
  });
}

bind();
loadView().catch(err => {
  $('result-label').textContent = '初始化失败';
  $('result-output').textContent = String(err.stack || err.message || err);
  toast(err.message || String(err), true);
});
