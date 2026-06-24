const dayRoute = require('./core/dayRoute.cjs');

function clone(value) { return JSON.parse(JSON.stringify(value)); }
function unitSummary(unit) {
  if (!unit) return null;
  return {
    id: unit.id || null,
    petId: unit.petId || null,
    name: unit.name || unit.displayName || '',
    displayName: unit.displayName || unit.name || '',
    hp: unit.hp ?? null,
    maxHp: unit.maxHp ?? null,
    quality: unit.quality || null,
    role: unit.role || null,
    element: unit.element || null,
    position: unit.position ? clone(unit.position) : null
  };
}
function petName(state, petId) {
  if (!petId) return null;
  return state.indexes?.petsById?.get(petId)?.name
    || (state.data?.pets || []).find(pet => pet.id === petId)?.name
    || petId;
}
function encounterForSchedule(state, schedule) {
  if (!schedule?.encounterId) return null;
  return (state.data?.encounterPool || []).find(encounter => encounter.encounterId === schedule.encounterId) || null;
}
function openingWavePreview(state, schedule) {
  const encounter = encounterForSchedule(state, schedule) || {};
  const wavePeriod = encounter.wavePeriod || schedule?.wavePeriod || state.period || '上午';
  const rows = (state.data?.waves || [])
    .filter(row => Number(row.day) === Number(state.day || 1) && row.period === wavePeriod)
    .sort((a, b) => Number(a.round || 0) - Number(b.round || 0));
  if (!rows.length) return null;
  const round = Number(rows[0].round || 1);
  const firstRoundRows = rows.filter(row => Number(row.round || 1) === round);
  const petIds = [];
  for (const row of firstRoundRows) {
    for (const petId of (row.petPool && row.petPool.length ? row.petPool : [row.petId]).filter(Boolean)) {
      if (!petIds.includes(petId)) petIds.push(petId);
    }
  }
  const petNames = petIds.map(id => petName(state, id)).filter(Boolean);
  const spawnCount = firstRoundRows.reduce((sum, row) => sum + Number(row.spawnCount || row.count || 0), 0);
  const summonerName = state.leaders?.enemy?.displayName || state.leaders?.enemy?.name || '敌方Boss';
  return {
    wavePeriod,
    round,
    spawnCount,
    petIds,
    petNames,
    summonerName,
    summary: `${summonerName}第${round}回合召唤${spawnCount}只宠物：${petNames.join('、') || '未知宠物'}。`
  };
}
function buildOpeningVM(state, schedule) {
  const playerHero = unitSummary(state.leaders?.player);
  const enemyHero = unitSummary(state.leaders?.enemy);
  const playerPets = (state.units || []).filter(unit => unit.side === 'hero' && unit.alive !== false).map(unitSummary);
  const firstWave = openingWavePreview(state, schedule);
  const playerPetText = playerPets.map(unit => unit.name).join('、') || '暂无宠物';
  const heroName = playerHero?.name || '我方英雄';
  const enemyName = enemyHero?.name || '敌方Boss';
  return {
    playerHero,
    enemyHero,
    playerPets,
    firstWave,
    summary: `${heroName}带着${playerPetText}迎战${enemyName}。`
  };
}

function nextDaySchedule(state) {
  const route = state.dayRoute || { nodeIndex: 0 };
  return dayRoute.scheduleRows(state)
    .find(x => Number(x.step) === Number(route.nodeIndex || 0) + 1) || null;
}

function maxRouteDay(state) {
  const days = (state.data?.nodeSchedule || [])
    .filter(row => row.status === '正式')
    .map(row => Number(row.day || 0))
    .filter(day => Number.isFinite(day) && day > 0);
  return days.length ? Math.max(...days) : Number(state.day || 1);
}

function canAdvanceRoutePhase(state) {
  return ['init', 'node_resolved', 'battle_end'].includes(state?.phase);
}

function fixedBattleLabel(row = {}) {
  const phase = row.phaseLabel || row.label || '战斗';
  if (/终局/.test(`${phase}${row.label || ''}`)) return '进入终局战';
  return Number(row.step || 0) <= 3 ? '进入第一场战斗' : '进入第二场战斗';
}

function buildPrimaryAction(state, nextScheduleRow) {
  const currentDay = Number(state.day || 1);
  if (state.phase === 'day_end' && currentDay < maxRouteDay(state)) {
    return { type: 'START_NEXT_DAY', label: `进入第${currentDay + 1}天`, defaultPayload: { day: currentDay + 1 } };
  }
  if (state.dayRoute?.terminal) return null;
  if ((state.dayRoute?.options || []).length || (state.rewards || []).length || state.phase === 'shop') return null;
  if (!nextScheduleRow || nextScheduleRow.kind !== 'fixed_battle' || !canAdvanceRoutePhase(state)) return null;
  return { type: 'RUN_ROUTE_FIXED_BATTLE', label: fixedBattleLabel(nextScheduleRow), defaultPayload: { scheduleStep: Number(nextScheduleRow.step || 0) } };
}

function buildAutoAction(state, nextScheduleRow) {
  if (!nextScheduleRow || state.dayRoute?.terminal || state.phase === 'day_end' || state.phase === 'shop') return null;
  if ((state.dayRoute?.options || []).length || (state.dayRoute?.battleOptions || []).length) return null;
  if ((state.rewards || []).length === 1) {
    return { type: 'PICK_REWARD', label: '自动领取唯一奖励', defaultPayload: { index: 0 } };
  }
  if (nextScheduleRow.kind === 'node_choice' && canAdvanceRoutePhase(state)) {
    return { type: 'GENERATE_NODE_OPTIONS', label: '展开 3 选 1', defaultPayload: { scheduleStep: Number(nextScheduleRow.step || 0) } };
  }
  return null;
}

function stepSummary(row = {}, pickedName = null) {
  if (pickedName) return `已选择：${pickedName}`;
  if (row.kind === 'node_choice') return '3 选 1，进入成长、商店、奖励或事件节点。';
  if (row.kind === 'battle_choice') return '三选一遭遇。';
  if (row.kind === 'fixed_battle') return Number(row.step || 0) <= 3 ? '第一场棋盘战斗，虎先锋首波召唤宠物。' : '第二场棋盘战斗。';
  return row.note || '路线步骤。';
}

function buildDailyFlowVM(state) {
  const route = state.dayRoute || { day: state.day || 1, nodeIndex: 0, history: [], pendingRewards: [], claimedRewards: [] };
  const currentStep = Number(route.nodeIndex || 0);
  const activeBattleStep = Number(route.pendingBattle?.scheduleStep || 0);
  const activeChoiceStep = Number(route.options?.[0]?.scheduleStep || route.battleOptions?.[0]?.scheduleStep || 0);
  const nextScheduleRow = nextDaySchedule(state);
  const nextStep = Number(nextScheduleRow?.step || 0);
  const schedule = dayRoute.scheduleRows(state);
  const kindLabel = kind => ({ node_choice: '节点选择', battle_choice: '遭遇选择', fixed_battle: '固定战' }[kind] || kind || '流程');
  const steps = schedule.map(row => {
    const step = Number(row.step || 0);
    const status = route.terminal
      ? 'done'
      : (activeBattleStep === step ? 'current' : (step <= currentStep ? 'done' : activeChoiceStep === step ? 'current' : nextStep === step ? 'next' : 'pending'));
    const history = (route.history || []).find(item => Number(item.option?.scheduleStep || item.option?.step || 0) === step) || null;
    const pickedName = history?.option?.name || history?.option?.phaseLabel || null;
    return {
      step,
      id: row.id || row.scheduleId || row.schedule_id || `day${state.day}_step${step}`,
      kind: row.kind,
      kindLabel: kindLabel(row.kind),
      label: row.label || row.phaseLabel || kindLabel(row.kind),
      phaseLabel: row.phaseLabel || row.label || kindLabel(row.kind),
      note: row.note || '',
      status,
      pickedName,
      summary: stepSummary(row, pickedName),
      encounterId: row.encounterId || null
    };
  });
  const primaryAction = buildPrimaryAction(state, nextScheduleRow);
  const autoAction = buildAutoAction(state, nextScheduleRow);
  return {
    day: state.day || route.day || 1,
    period: state.period || '',
    currentStep,
    totalSteps: steps.length,
    nextSchedule: clone(nextScheduleRow),
    primaryAction: primaryAction ? clone(primaryAction) : null,
    autoAction: autoAction ? clone(autoAction) : null,
    actions: { primary: primaryAction ? clone(primaryAction) : null, auto: autoAction ? clone(autoAction) : null },
    opening: buildOpeningVM(state, nextScheduleRow || schedule.find(row => row.kind === 'fixed_battle') || null),
    steps,
    history: clone(route.history || []),
    battleOutcomes: clone(route.battleOutcomes || []),
    pendingRewards: clone((route.pendingRewards || []).filter(x => x && !x.claimed)),
    claimedRewards: clone(route.claimedRewards || []),
    pendingBattle: route.pendingBattle ? clone(route.pendingBattle) : null,
    runs: clone(state.dayRouteRuns || []),
    terminal: route.terminal ? clone(route.terminal) : null
  };
}

module.exports = { nextDaySchedule, buildDailyFlowVM };
