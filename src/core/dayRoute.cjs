const battle = require('./battle.cjs');
const shop = require('./shop.cjs');
const { pushEvent } = require('./events.cjs');
const { syncBoardUnits } = require('./state.cjs');

function clone(value) { return JSON.parse(JSON.stringify(value)); }
function activeRows(rows, day) {
  return (rows || []).filter(x => x.status === '正式' && Number(x.unlockDay || 1) <= Number(day || 1));
}
function ensureDayRoute(state) {
  if (!state.dayRoute) {
    state.dayRoute = { day: state.day || 1, nodeIndex: 0, battleIndex: 0, options: [], battleOptions: [], currentEncounter: null, history: [] };
  }
  if (!Array.isArray(state.dayRoute.options)) state.dayRoute.options = [];
  if (!Array.isArray(state.dayRoute.battleOptions)) state.dayRoute.battleOptions = [];
  if (!Array.isArray(state.dayRoute.history)) state.dayRoute.history = [];
  return state.dayRoute;
}
function scheduleRows(state) {
  return (state.data.nodeSchedule || [])
    .filter(x => x.day === state.day && x.status === '正式')
    .sort((a, b) => Number(a.step) - Number(b.step));
}
function scheduleAt(state, step) {
  return scheduleRows(state).find(x => Number(x.step) === Number(step)) || null;
}
function nextSchedule(state) {
  const route = ensureDayRoute(state);
  return scheduleAt(state, Number(route.nodeIndex || 0) + 1);
}
function firstN(rows, count) {
  return rows.slice().sort((a, b) => Number(b.weight || 0) - Number(a.weight || 0) || String(a.nodeId || a.encounterId).localeCompare(String(b.nodeId || b.encounterId))).slice(0, count);
}
function generateNodeOptions(state, opts = {}) {
  const route = ensureDayRoute(state);
  const schedule = opts.scheduleStep ? scheduleAt(state, opts.scheduleStep) : nextSchedule(state);
  if (!schedule || schedule.kind !== 'node_choice') {
    pushEvent(state, 'NODE_OPTIONS_BLOCKED', { text: '当前没有可生成的普通节点 3 选 1。' });
    return false;
  }
  const count = Number(opts.count || schedule.choiceCount || 3);
  const candidates = activeRows(state.data.nodePool, state.day).filter(x => x.nodePoolId === schedule.poolId);
  const options = firstN(candidates, count).map((node, index) => ({
    optionId: `node_${schedule.step}_${index + 1}_${node.nodeId}`,
    scheduleId: schedule.id,
    scheduleStep: schedule.step,
    nodeId: node.nodeId,
    nodeType: node.nodeType,
    name: node.name,
    shopPoolId: node.shopPoolId || null,
    rewardPoolId: node.rewardPoolId || null,
    eventId: node.eventId || null,
    slots: node.slots || null,
    value: node.value || null
  }));
  route.options = options;
  state.phase = 'node_choice';
  pushEvent(state, 'NODE_OPTIONS', { scheduleStep: schedule.step, options: clone(options), text: `第${state.day}天节点${schedule.step}：${options.map(x => x.name).join(' / ')}。` });
  return options;
}
function optionByRef(options, ref) {
  if (ref === undefined || ref === null) return options[0] || null;
  if (typeof ref === 'number') return options[ref] || null;
  return options.find(x => x.optionId === ref || x.nodeId === ref || x.encounterId === ref) || null;
}
function pickNode(state, ref) {
  const route = ensureDayRoute(state);
  const option = optionByRef(route.options, ref);
  if (!option) {
    pushEvent(state, 'NODE_PICK_BLOCKED', { text: '节点选择失败：候选不存在。' });
    return false;
  }
  route.nodeIndex = Number(option.scheduleStep || route.nodeIndex + 1);
  route.history.push({ kind: 'node', option: clone(option) });
  route.options = [];
  pushEvent(state, 'NODE_PICK', { nodeId: option.nodeId, nodeType: option.nodeType, scheduleStep: route.nodeIndex, text: `选择节点：${option.name}。` });
  if (option.nodeType === 'shop') {
    const ok = shop.enterShop(state, option.shopPoolId || 'night_base', Number(option.slots || 6));
    if (ok !== false) state.shop.routeReturnPhase = 'node_resolved';
    return ok;
  }
  if (option.nodeType === 'reward') { shop.rewardOptions(state, option.rewardPoolId || 'reward_pT1', Number(option.slots || 3)); state.phase = 'reward'; return true; }
  if (option.nodeType === 'event') return applyRouteEvent(state, option);
  if (option.nodeType === 'rest') {
    const before = state.gold;
    state.gold += Number(option.value || 1);
    state.phase = 'node_resolved';
    pushEvent(state, 'NODE_REST', { goldFrom: before, goldTo: state.gold, text: `${option.name}：金币${before}→${state.gold}。` });
    return true;
  }
  state.phase = 'node_resolved';
  return true;
}
function applyRouteEvent(state, option) {
  const event = (state.data.events || []).find(e => e.id === option.eventId);
  if (!event) {
    state.phase = 'node_resolved';
    pushEvent(state, 'NODE_EVENT_APPLY', { nodeId: option.nodeId, text: `${option.name}：事件占位已结算。` });
    return true;
  }
  const before = state.gold;
  if (String(event.gainText || '').includes('免费刷新')) state.shop.freeRolls += Number(event.value || option.value || 1);
  if (String(event.gainText || '').includes('折扣')) state.shop.nextDiscount = Math.max(state.shop.nextDiscount || 0, Number(event.value || option.value || 50));
  state.phase = 'node_resolved';
  pushEvent(state, 'NODE_EVENT_APPLY', { eventId: event.id, nodeId: option.nodeId, goldFrom: before, goldTo: state.gold, text: `节点事件【${event.name}】：${event.optionText || event.gainText || '已结算'}。` });
  return true;
}
function generateBattleOptions(state, opts = {}) {
  const route = ensureDayRoute(state);
  const schedule = opts.scheduleStep ? scheduleAt(state, opts.scheduleStep) : nextSchedule(state);
  if (!schedule || schedule.kind !== 'battle_choice') {
    pushEvent(state, 'BATTLE_OPTIONS_BLOCKED', { text: '当前没有可生成的遭遇 3 选 1。' });
    return false;
  }
  const count = Number(opts.count || schedule.choiceCount || 3);
  const candidates = activeRows(state.data.encounterPool, state.day).filter(x => x.encounterPoolId === schedule.encounterPoolId);
  const options = firstN(candidates, count).map((enc, index) => ({
    optionId: `enc_${schedule.step}_${index + 1}_${enc.encounterId}`,
    scheduleId: schedule.id,
    scheduleStep: schedule.step,
    encounterId: enc.encounterId,
    name: enc.name,
    wavePeriod: enc.wavePeriod || '上午',
    battleIndex: enc.battleIndex || 1,
    phaseLabel: enc.phaseLabel || schedule.phaseLabel || '战斗'
  }));
  route.battleOptions = options;
  state.phase = 'battle_choice';
  pushEvent(state, 'BATTLE_OPTIONS', { scheduleStep: schedule.step, options: clone(options), text: `${schedule.phaseLabel || '遭遇'}：${options.map(x => x.name).join(' / ')}。` });
  return options;
}
function pickBattleEncounter(state, ref) {
  const route = ensureDayRoute(state);
  const option = optionByRef(route.battleOptions, ref);
  if (!option) {
    pushEvent(state, 'BATTLE_PICK_BLOCKED', { text: '遭遇选择失败：候选不存在。' });
    return false;
  }
  route.nodeIndex = Number(option.scheduleStep || route.nodeIndex + 1);
  route.battleIndex += 1;
  route.currentEncounter = clone(option);
  route.history.push({ kind: 'battle_choice', option: clone(option) });
  route.battleOptions = [];
  pushEvent(state, 'BATTLE_PICK', { encounterId: option.encounterId, scheduleStep: route.nodeIndex, text: `选择${option.phaseLabel}：${option.name}。` });
  return runEncounterBattle(state, option);
}
function runFixedBattle(state, opts = {}) {
  const route = ensureDayRoute(state);
  const schedule = opts.scheduleStep ? scheduleAt(state, opts.scheduleStep) : nextSchedule(state);
  if (!schedule || schedule.kind !== 'fixed_battle') {
    pushEvent(state, 'FIXED_BATTLE_BLOCKED', { text: '当前没有可进入的固定战。' });
    return false;
  }
  const encounter = (state.data.encounterPool || []).find(x => x.encounterId === schedule.encounterId) || {
    encounterId: schedule.encounterId,
    name: schedule.label,
    wavePeriod: '下午',
    battleIndex: Number(route.battleIndex || 0) + 1,
    phaseLabel: schedule.phaseLabel || '晚上战'
  };
  route.nodeIndex = Number(schedule.step);
  route.battleIndex += 1;
  route.currentEncounter = clone(encounter);
  route.history.push({ kind: 'fixed_battle', option: clone(encounter) });
  pushEvent(state, 'FIXED_BATTLE_START', { encounterId: encounter.encounterId, scheduleStep: route.nodeIndex, text: `进入${encounter.phaseLabel || schedule.phaseLabel || '固定战'}：${encounter.name || encounter.encounterId}。` });
  runEncounterBattle(state, encounter);
  state.phase = 'day_end';
  pushEvent(state, 'DAY_ROUTE_END', { day: state.day, text: `第${state.day}天路线结束。` });
  return true;
}
function runEncounterBattle(state, encounter) {
  resetBattlefield(state);
  state.period = encounter.wavePeriod || '上午';
  state.round = 0;
  state.result = null;
  state.phase = 'init';
  battle.runBattle(state);
  return true;
}
function resetBattlefield(state) {
  state.units = (state.units || []).filter(u => u.side === 'hero' || u.side === 'hero_leader');
  for (const leader of [state.leaders?.player, state.leaders?.enemy].filter(Boolean)) {
    leader.hp = leader.maxHp || leader.hp || 80;
    leader.alive = true;
    leader.shield = 0;
    leader.roundDamageTaken = 0;
  }
  for (const unit of state.units || []) {
    unit.alive = unit.alive !== false;
    unit.hp = Math.max(1, Number(unit.hp || unit.maxHp || 1));
    unit.actionSlotsUsed = {};
    unit.actionApSpent = 0;
    unit.roundDamageTaken = 0;
  }
  syncBoardUnits(state);
}
function runDayRoute(state) {
  ensureDayRoute(state);
  let guard = 0;
  while (state.phase !== 'day_end' && guard++ < 20) {
    const schedule = nextSchedule(state);
    if (!schedule) { state.phase = 'day_end'; break; }
    if (schedule.kind === 'node_choice') {
      const options = generateNodeOptions(state);
      if (!options) return false;
      pickNode(state, options[0].optionId);
      if (state.phase === 'shop') { shop.exitShop(state); state.phase = 'node_resolved'; }
      if (state.phase === 'reward' && state.rewards.length) shop.pickReward(state, 0);
      if (state.phase !== 'day_end' && state.phase !== 'battle_end') state.phase = 'node_resolved';
      continue;
    }
    if (schedule.kind === 'battle_choice') {
      const options = generateBattleOptions(state);
      if (!options) return false;
      pickBattleEncounter(state, options[0].encounterId);
      continue;
    }
    if (schedule.kind === 'fixed_battle') return runFixedBattle(state);
  }
  return state.phase === 'day_end';
}

module.exports = { ensureDayRoute, generateNodeOptions, pickNode, generateBattleOptions, pickBattleEncounter, runFixedBattle, runDayRoute };
