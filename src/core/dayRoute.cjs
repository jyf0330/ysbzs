const battle = require('./battle.cjs');
const shop = require('./shop.cjs');
const { pushEvent } = require('./events.cjs');
const { syncBoardUnits } = require('./state.cjs');
const { queueBattlePrepEffectFromEvent } = require('./outerBattleEffects.cjs');
const { queueOuterRunEffectFromEvent, applyRouteBattleOutcomeEffects } = require('./outerRunEffects.cjs');

function clone(value) { return JSON.parse(JSON.stringify(value)); }
function activeRows(rows, day) {
  return (rows || []).filter(x => x.status === '正式' && Number(x.unlockDay || 1) <= Number(day || 1));
}
function ensureDayRoute(state) {
  if (!state.dayRoute) {
    state.dayRoute = { day: state.day || 1, nodeIndex: 0, battleIndex: 0, options: [], battleOptions: [], currentEncounter: null, history: [], battleOutcomes: [], pendingRewards: [], claimedRewards: [] };
  }
  if (!Array.isArray(state.dayRoute.options)) state.dayRoute.options = [];
  if (!Array.isArray(state.dayRoute.battleOptions)) state.dayRoute.battleOptions = [];
  if (!Array.isArray(state.dayRoute.history)) state.dayRoute.history = [];
  if (!Array.isArray(state.dayRoute.battleOutcomes)) state.dayRoute.battleOutcomes = [];
  if (!Array.isArray(state.dayRoute.pendingRewards)) state.dayRoute.pendingRewards = [];
  if (!Array.isArray(state.dayRoute.claimedRewards)) state.dayRoute.claimedRewards = [];
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
function publicTierLabel(poolId) {
  const tier = String(poolId || '').replace(/^reward_/, '').replace(/^tier_/, '');
  return { pT1: '青铜', pT2: '白银', pT3: '黄金', pT4: '钻石', elite: '精英' }[tier] || tier || null;
}
function eventForNode(state, node) {
  return (state.data.events || []).find(e => e.id === node.eventId) || null;
}
function eventTags(event) {
  if (!event) return [];
  const text = `${event.group || ''}${event.name || ''}${event.gainText || ''}${event.optionText || ''}`;
  const tags = [];
  if (/经济|刷新|折扣|金币/.test(text)) tags.push('经济');
  if (/补货|商店|商品/.test(text)) tags.push('商店');
  if (/复制|升阶|升级/.test(text)) tags.push('构筑');
  if (/护盾|陷阱|战前/.test(text)) tags.push('战斗准备');
  if (/诅咒|风险|折损/.test(text)) tags.push('风险');
  return tags;
}
function nodeKindLabel(type) {
  return { shop: '摊位', reward: '奖励', event: '事件', rest: '休整' }[type] || '节点';
}
function buildNodeChoicePreview(state, node) {
  const event = eventForNode(state, node);
  if (node.nodeType === 'shop') {
    const tags = shop.stallTags(node.shopPoolId || 'night_base');
    return {
      kindLabel: '摊位',
      summary: `${node.name}：${tags.join('/')}商品倾向，${Number(node.slots || 6)}个商品位。`,
      costText: '进店免费',
      gainText: `${Number(node.slots || 6)}个候选`,
      tags
    };
  }
  if (node.nodeType === 'reward') {
    const tier = publicTierLabel(node.rewardPoolId);
    return {
      kindLabel: '奖励',
      summary: `${node.name}：从${tier || node.rewardPoolId || '奖励'}池中选择构筑补强。`,
      costText: '无',
      gainText: `${Number(node.slots || 3)}选1`,
      tags: ['构筑', tier].filter(Boolean)
    };
  }
  if (node.nodeType === 'event') {
    return {
      kindLabel: '事件',
      summary: `${node.name}：${event?.optionText || node.note || '结算一次外层事件'}。`,
      costText: event?.costText || '无',
      gainText: event?.gainText || node.note || '已结算',
      tags: eventTags(event)
    };
  }
  if (node.nodeType === 'rest') {
    return {
      kindLabel: '休整',
      summary: `${node.name}：跳过构筑选择，直接补给。`,
      costText: '无',
      gainText: `金币+${Number(node.value || 1)}`,
      tags: ['经济', '安全']
    };
  }
  return {
    kindLabel: nodeKindLabel(node.nodeType),
    summary: node.note || node.name || '节点选择',
    costText: '无',
    gainText: node.value != null ? String(node.value) : '',
    tags: []
  };
}
function buildBattleChoicePreview(enc, schedule) {
  const label = enc.phaseLabel || schedule.phaseLabel || '战斗';
  const pressure = isPressureEncounter(enc);
  return {
    kindLabel: pressure ? '高压遭遇' : '遭遇',
    summary: `${label}：${enc.name || enc.encounterId}，将进入元素棋盘战斗。`,
    costText: '消耗战斗机会',
    gainText: pressure ? '高压力 / 高奖励' : '胜利获得路线奖励',
    tags: ['战斗压力', pressure ? '精英/Boss' : '常规战'].filter(Boolean)
  };
}
function round1(n) { return Math.round(Number(n || 0) * 10) / 10; }
function waveThreat(row) { return Number(row?.threat ?? row?.threatComputed ?? row?.threatManual ?? 0) || 0; }
function dominantQuality(rows) {
  const totals = {};
  for (const row of rows || []) for (const [q, v] of Object.entries(row.qualityWeights || {})) totals[q] = (totals[q] || 0) + Number(v || 0);
  return Object.entries(totals).sort((a, b) => Number(b[1]) - Number(a[1]))[0]?.[0] || null;
}
function previewRewardPoolId(state, encounter) {
  if (isPressureEncounter(encounter)) return 'reward_elite';
  return Number(state.day || 1) >= 3 ? 'reward_pT2' : 'reward_pT1';
}
function buildBattlePressurePreview(state, encounter = {}, schedule = {}) {
  const wavePeriod = encounter.wavePeriod || schedule.wavePeriod || state.period || '上午';
  const rows = (state.data.waves || []).filter(w => Number(w.day) === Number(state.day || encounter.unlockDay || 1) && w.period === wavePeriod);
  const threats = rows.map(waveThreat);
  const totalThreat = round1(threats.reduce((sum, n) => sum + n, 0));
  const totalSpawnCount = rows.reduce((sum, row) => sum + Number(row.spawnCount || 0), 0);
  const pressureTier = isTerminalEncounter(state, encounter) ? '终局' : (isPressureEncounter(encounter) ? '高压' : '常规');
  const rewardPoolId = previewRewardPoolId(state, encounter);
  const rewardLabel = publicTierLabel(rewardPoolId) || rewardPoolId;
  const phaseLabel = encounter.phaseLabel || schedule.phaseLabel || '战斗';
  return {
    encounterId: encounter.encounterId || schedule.encounterId || null,
    name: encounter.name || schedule.label || encounter.encounterId || '路线战斗',
    phaseLabel,
    wavePeriod,
    battleIndex: Number(encounter.battleIndex || schedule.battleIndex || 1),
    pressureTier,
    roundCount: new Set(rows.map(x => x.round)).size,
    waveRows: rows.length,
    totalThreat,
    peakThreat: round1(Math.max(0, ...threats)),
    totalSpawnCount,
    peakSpawnCount: Math.max(0, ...rows.map(x => Number(x.spawnCount || 0))),
    dominantQuality: dominantQuality(rows),
    rewardPoolId,
    rewardText: `${pressureTier === '常规' ? '胜利预期' : '高压胜利预期'}：${rewardLabel}奖励`,
    summary: `${phaseLabel} · ${pressureTier} · ${wavePeriod}${rows.length ? ` ${rows.length}波` : ''} · 威胁${totalThreat}`
  };
}
function fixedEncounterForSchedule(state, schedule) {
  if (!schedule) return null;
  return (state.data.encounterPool || []).find(x => x.encounterId === schedule.encounterId) || {
    encounterId: schedule.encounterId,
    name: schedule.label,
    wavePeriod: '下午',
    battleIndex: Number(ensureDayRoute(state).battleIndex || 0) + 1,
    phaseLabel: schedule.phaseLabel || '固定战',
    note: schedule.note || ''
  };
}
function fixedBattlePressurePreview(state, schedule) {
  const encounter = fixedEncounterForSchedule(state, schedule);
  return encounter ? buildBattlePressurePreview(state, encounter, schedule) : null;
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
    value: node.value || null,
    choicePreview: buildNodeChoicePreview(state, node)
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
    const ok = shop.enterShop(state, option.shopPoolId || 'night_base', Number(option.slots || 6), { stall: option });
    if (ok !== false) {
      state.shop.routeReturnPhase = 'node_resolved';
      const historyItem = route.history[route.history.length - 1];
      if (historyItem) historyItem.stall = clone(state.shop.activeStall);
    }
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
  const route = ensureDayRoute(state);
  const event = (state.data.events || []).find(e => e.id === option.eventId);
  if (!event) {
    state.phase = 'node_resolved';
    pushEvent(state, 'NODE_EVENT_APPLY', { nodeId: option.nodeId, text: `${option.name}：事件占位已结算。` });
    return true;
  }
  const before = state.gold;
  const constructionEffect = shop.applyConstructionEvent(state, event, 'route_event', { nodeId: option.nodeId });
  if (!constructionEffect) shop.applyShopEventModifiers(state, event, 'route_event');
  const prepEffect = queueBattlePrepEffectFromEvent(state, event, { source: 'route_event', nodeId: option.nodeId });
  const runEffect = queueOuterRunEffectFromEvent(state, event, { source: 'route_event', nodeId: option.nodeId });
  if (constructionEffect) {
    const historyItem = route.history[route.history.length - 1];
    if (historyItem) historyItem.constructionEffect = clone(constructionEffect);
  }
  if (prepEffect) {
    const historyItem = route.history[route.history.length - 1];
    if (historyItem) historyItem.prepEffect = clone(prepEffect);
  }
  if (runEffect) {
    const historyItem = route.history[route.history.length - 1];
    if (historyItem) historyItem.runEffect = clone(runEffect);
  }
  state.phase = 'node_resolved';
  pushEvent(state, 'NODE_EVENT_APPLY', { eventId: event.id, nodeId: option.nodeId, goldFrom: before, goldTo: state.gold, constructionEffect: constructionEffect ? clone(constructionEffect) : null, prepEffect: prepEffect ? clone(prepEffect) : null, runEffect: runEffect ? clone(runEffect) : null, text: `节点事件【${event.name}】：${event.optionText || event.gainText || '已结算'}。` });
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
    phaseLabel: enc.phaseLabel || schedule.phaseLabel || '战斗',
    choicePreview: buildBattleChoicePreview(enc, schedule),
    pressurePreview: buildBattlePressurePreview(state, enc, schedule)
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
  return runEncounterBattle(state, option, { kind: 'battle_choice' });
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
  const outcome = runEncounterBattle(state, encounter, { kind: 'fixed_battle' });
  if (isTerminalEncounter(state, encounter)) markRunTerminal(state, encounter, outcome);
  claimAvailableRouteRewards(state);
  state.phase = 'day_end';
  pushEvent(state, 'DAY_ROUTE_END', { day: state.day, text: `第${state.day}天路线结束。` });
  return true;
}
function dayExprAllows(expr, day) {
  if (!expr) return true;
  const range = String(expr).match(/D(\d+)\s*-\s*D(\d+)/);
  if (range) return Number(day || 1) >= Number(range[1]) && Number(day || 1) <= Number(range[2]);
  const single = String(expr).match(/D(\d+)/);
  return single ? Number(day || 1) === Number(single[1]) : true;
}
function isPressureEncounter(encounter) {
  return /精英|Boss|终局/.test(`${encounter?.name || ''}${encounter?.phaseLabel || ''}${encounter?.note || ''}`);
}
function isTerminalEncounter(state, encounter) {
  return Number(state.day || 1) >= 10 && /Boss|终局/.test(`${encounter?.name || ''}${encounter?.phaseLabel || ''}${encounter?.note || ''}`);
}
function markRunTerminal(state, encounter, outcome) {
  const route = ensureDayRoute(state);
  const terminal = {
    day: Number(state.day || 1),
    kind: 'final_boss',
    status: outcome && outcome.win ? 'victory' : 'defeat',
    encounterId: encounter.encounterId || null,
    name: encounter.name || encounter.encounterId || '终局战',
    resultCode: outcome ? outcome.resultCode : 'UNKNOWN',
    grade: outcome ? outcome.grade : '-',
    battleIndex: outcome ? outcome.battleIndex : Number(route.battleIndex || 0)
  };
  route.terminal = terminal;
  pushEvent(state, 'RUN_TERMINAL', {
    terminal: clone(terminal),
    text: `外层终局：第${terminal.day}天${terminal.name} ${terminal.status}，结果=${terminal.resultCode}，评级=${terminal.grade}。`
  });
  return terminal;
}
function baseRewardPoolForOutcome(state, result) {
  if (!result || result.code === 'LOSE') return 'reward_none';
  if (result.code === 'WIN_FAST') return 'reward_fast_clear';
  return Number(state.day || 1) >= 3 ? 'reward_pT2' : 'reward_pT1';
}
function postBattleEventsForOutcome(state, encounter, result, baseRewardPoolId, source = {}) {
  if (result && result.code === 'LOSE') {
    const event = (state.data.events || []).find(e => e.id === 'evt_battle_fail' && e.layer === 'post_battle' && e.status === '正式' && dayExprAllows(e.dayExpr, state.day));
    if (!event) return { rewardPoolId: baseRewardPoolId, events: [] };
    return {
      rewardPoolId: event.rewardPoolId || baseRewardPoolId,
      events: [{
        eventId: event.id,
        name: event.name,
        rewardPoolFrom: baseRewardPoolId,
        rewardPoolTo: event.rewardPoolId || baseRewardPoolId,
        condition: 'battle_loss',
        encounterId: encounter.encounterId || null,
        castleLineFrom: Number.isFinite(Number(source.castleLineFrom)) ? Number(source.castleLineFrom) : Number(state.castleLine || 0),
        castleLineTo: Number(state.castleLine || 0),
        economyMultiplierFrom: Number.isFinite(Number(source.economyMultiplierFrom)) ? Number(source.economyMultiplierFrom) : Number(state.economyMultiplier || 1),
        economyMultiplierTo: Number(state.economyMultiplier || 1)
      }]
    };
  }
  if (result && result.code === 'WIN_FAST') {
    const event = (state.data.events || []).find(e => e.id === 'evt_battle_bonus' && e.layer === 'post_battle' && e.status === '正式' && dayExprAllows(e.dayExpr, state.day));
    if (!event) return { rewardPoolId: baseRewardPoolId, events: [] };
    const rewardPoolId = event.rewardPoolId || baseRewardPoolId;
    return {
      rewardPoolId,
      events: [{
        eventId: event.id,
        name: event.name,
        rewardPoolFrom: baseRewardPoolId,
        rewardPoolTo: rewardPoolId,
        condition: 'fast_clear_win',
        encounterId: encounter.encounterId || null,
        grade: result.grade || null
      }]
    };
  }
  if (!result?.win || !isPressureEncounter(encounter)) return { rewardPoolId: baseRewardPoolId, events: [] };
  const event = (state.data.events || []).find(e => e.id === 'evt_elite_reward' && e.layer === 'post_battle' && e.status === '正式' && dayExprAllows(e.dayExpr, state.day));
  if (!event) return { rewardPoolId: baseRewardPoolId, events: [] };
  const rewardPoolId = event.rewardPoolId || baseRewardPoolId;
  return {
    rewardPoolId,
    events: [{
      eventId: event.id,
      name: event.name,
      rewardPoolFrom: baseRewardPoolId,
      rewardPoolTo: rewardPoolId,
      condition: 'pressure_win',
      encounterId: encounter.encounterId || null
    }]
  };
}
function recordBattleOutcome(state, encounter, result, beforeGold, source = {}) {
  const route = ensureDayRoute(state);
  const baseRewardPoolId = baseRewardPoolForOutcome(state, result);
  const postBattle = postBattleEventsForOutcome(state, encounter, result, baseRewardPoolId, source);
  const rewardPoolId = postBattle.rewardPoolId;
  const outcome = {
    day: state.day,
    battleIndex: route.battleIndex,
    kind: source.kind || 'battle',
    encounterId: encounter.encounterId,
    name: encounter.name || encounter.encounterId,
    phaseLabel: encounter.phaseLabel || '战斗',
    resultCode: result?.code || 'UNKNOWN',
    grade: result?.grade || '-',
    win: !!result?.win,
    goldFrom: beforeGold,
    goldTo: state.gold,
    goldBaseDelta: Number(state.gold || 0) - Number(beforeGold || 0),
    goldDelta: Number(state.gold || 0) - Number(beforeGold || 0),
    baseRewardPoolId,
    rewardPoolId,
    rewardEligible: !!result?.win,
    postBattleEvents: clone(postBattle.events),
    runEffects: []
  };
  const runEffectResult = applyRouteBattleOutcomeEffects(state, outcome, beforeGold);
  outcome.goldBaseDelta = runEffectResult.goldBaseDelta;
  outcome.goldDelta = runEffectResult.goldDelta;
  outcome.goldTo = state.gold;
  outcome.runEffects = runEffectResult.consumed;
  route.battleOutcomes.push(outcome);
  const historyItem = route.history[route.history.length - 1];
  if (historyItem && (historyItem.kind === 'battle_choice' || historyItem.kind === 'fixed_battle')) historyItem.outcome = clone(outcome);
  if (outcome.rewardEligible) {
    route.pendingRewards.push({
      rewardId: `route_reward_${outcome.day}_${outcome.battleIndex}`,
      day: outcome.day,
      battleIndex: outcome.battleIndex,
      encounterId: outcome.encounterId,
      rewardPoolId,
      resultCode: outcome.resultCode,
      grade: outcome.grade,
      claimed: false
    });
  }
  for (const event of outcome.postBattleEvents) {
    const text = event.eventId === 'evt_battle_fail'
      ? `失败惩罚：${outcome.name} 未清场，防线 ${event.castleLineFrom}→${event.castleLineTo}，经济倍率 ${event.economyMultiplierFrom}→${event.economyMultiplierTo}。`
      : (event.eventId === 'evt_battle_bonus'
        ? `五回合高奖：${outcome.name} 快速清场，奖励池 ${event.rewardPoolFrom}→${event.rewardPoolTo}。`
        : `精英奖励：${outcome.name} 胜利，奖励池 ${event.rewardPoolFrom}→${event.rewardPoolTo}。`);
    pushEvent(state, 'ROUTE_POST_BATTLE_EVENT_APPLY', {
      eventId: event.eventId,
      encounterId: outcome.encounterId,
      rewardPoolFrom: event.rewardPoolFrom,
      rewardPoolTo: event.rewardPoolTo,
      event: clone(event),
      text
    });
  }
  const effectText = outcome.runEffects.length ? `，奖励折损${outcome.goldBaseDelta}→${outcome.goldDelta}` : '';
  const postBattleText = outcome.postBattleEvents.length ? `，${outcome.postBattleEvents.map(x => x.name).join('、')}` : '';
  pushEvent(state, 'ROUTE_BATTLE_OUTCOME', { outcome: clone(outcome), runEffects: clone(outcome.runEffects), postBattleEvents: clone(outcome.postBattleEvents), text: `${outcome.phaseLabel}结算：${outcome.resultCode}，金币${outcome.goldFrom}→${outcome.goldTo}${effectText}${postBattleText}，奖励池=${rewardPoolId}。` });
  return outcome;
}
function pendingRewardIndex(route, ref) {
  if (!route.pendingRewards.length) return -1;
  if (ref === undefined || ref === null) return route.pendingRewards.findIndex(x => !x.claimed);
  if (typeof ref === 'number') return ref;
  return route.pendingRewards.findIndex(x => x.rewardId === ref || x.encounterId === ref);
}
function claimRouteReward(state, ref, opts = {}) {
  const route = ensureDayRoute(state);
  const idx = pendingRewardIndex(route, ref);
  const pending = idx >= 0 ? route.pendingRewards[idx] : null;
  if (!pending || pending.claimed) {
    pushEvent(state, 'ROUTE_REWARD_BLOCKED', { text: '没有可领取的路线战斗奖励。' });
    return false;
  }
  const rewardOptions = shop.rewardOptions(state, pending.rewardPoolId, Number(opts.count || 3));
  const requestedIndex = Number(opts.rewardIndex || 0);
  const rewardIndex = rewardOptions[requestedIndex] ? requestedIndex : 0;
  const selected = rewardOptions[rewardIndex] || null;
  if (!selected) {
    pushEvent(state, 'ROUTE_REWARD_BLOCKED', { rewardId: pending.rewardId, rewardPoolId: pending.rewardPoolId, text: `路线奖励池为空：${pending.rewardPoolId}。` });
    return false;
  }
  if (shop.pickReward(state, rewardIndex) === false) {
    pushEvent(state, 'ROUTE_REWARD_BLOCKED', { rewardId: pending.rewardId, text: '路线奖励领取失败：候选不存在。' });
    return false;
  }
  state.rewards = [];
  const claimed = {
    ...clone(pending),
    claimed: true,
    selectedReward: clone(selected)
  };
  route.pendingRewards.splice(idx, 1);
  route.claimedRewards.push(claimed);
  const historyItem = route.history.slice().reverse().find(x => x?.outcome?.battleIndex === claimed.battleIndex)
    || route.history.slice().reverse().find(x => x.kind === 'battle_choice' || x.kind === 'fixed_battle');
  if (historyItem) historyItem.claimedReward = clone(claimed);
  if (state.phase === 'battle_end' || state.phase === 'reward') state.phase = 'node_resolved';
  pushEvent(state, 'ROUTE_REWARD_CLAIM', { reward: clone(claimed), text: `路线奖励：${pending.rewardPoolId} 领取 ${selected.name}。` });
  return claimed;
}
function claimAvailableRouteRewards(state) {
  let claimed = 0;
  while ((ensureDayRoute(state).pendingRewards || []).some(x => !x.claimed)) {
    if (!claimRouteReward(state, undefined, { rewardIndex: 0 })) break;
    claimed += 1;
  }
  return claimed;
}
function runEncounterBattle(state, encounter, source = {}) {
  resetBattlefield(state);
  state.period = encounter.wavePeriod || '上午';
  state.round = 0;
  state.result = null;
  state.phase = 'init';
  const beforeGold = Number(state.gold || 0);
  const castleLineFrom = Number(state.castleLine || 0);
  const economyMultiplierFrom = Number(state.economyMultiplier || 1);
  const result = battle.runBattle(state);
  return recordBattleOutcome(state, encounter, result, beforeGold, Object.assign({}, source, { castleLineFrom, economyMultiplierFrom }));
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
      const option = options[(Number(schedule.step || 1) - 1) % options.length] || options[0];
      pickNode(state, option.optionId);
      if (state.phase === 'shop') { shop.exitShop(state); state.phase = 'node_resolved'; }
      if (state.phase === 'reward' && state.rewards.length) shop.pickReward(state, 0);
      if (state.phase !== 'day_end' && state.phase !== 'battle_end') state.phase = 'node_resolved';
      continue;
    }
    if (schedule.kind === 'battle_choice') {
      const options = generateBattleOptions(state);
      if (!options) return false;
      pickBattleEncounter(state, options[0].encounterId);
      claimAvailableRouteRewards(state);
      continue;
    }
    if (schedule.kind === 'fixed_battle') return runFixedBattle(state);
  }
  return state.phase === 'day_end';
}

module.exports = { ensureDayRoute, generateNodeOptions, pickNode, generateBattleOptions, pickBattleEncounter, runFixedBattle, runDayRoute, recordBattleOutcome, claimRouteReward, buildBattlePressurePreview, fixedBattlePressurePreview };
