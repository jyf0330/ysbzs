function clone(value) { return JSON.parse(JSON.stringify(value)); }

function nextDaySchedule(state) {
  const route = state.dayRoute || { nodeIndex: 0 };
  return (state.data.nodeSchedule || [])
    .filter(x => x.day === state.day && x.status === '正式')
    .sort((a, b) => Number(a.step) - Number(b.step))
    .find(x => Number(x.step) === Number(route.nodeIndex || 0) + 1) || null;
}

function buildDailyFlowVM(state) {
  const route = state.dayRoute || { day: state.day || 1, nodeIndex: 0, history: [], pendingRewards: [], claimedRewards: [] };
  const currentStep = Number(route.nodeIndex || 0);
  const activeChoiceStep = Number(route.options?.[0]?.scheduleStep || route.battleOptions?.[0]?.scheduleStep || 0);
  const nextScheduleRow = nextDaySchedule(state);
  const nextStep = Number(nextScheduleRow?.step || 0);
  const schedule = (state.data.nodeSchedule || [])
    .filter(x => Number(x.day) === Number(state.day || route.day || 1) && x.status === '正式')
    .sort((a, b) => Number(a.step) - Number(b.step));
  const kindLabel = kind => ({ node_choice: '节点选择', battle_choice: '遭遇选择', fixed_battle: '固定战' }[kind] || kind || '流程');
  const steps = schedule.map(row => {
    const step = Number(row.step || 0);
    const status = route.terminal || step <= currentStep ? 'done' : activeChoiceStep === step ? 'current' : nextStep === step ? 'next' : 'pending';
    const history = (route.history || []).find(item => Number(item.option?.scheduleStep || item.option?.step || 0) === step) || null;
    return {
      step,
      id: row.id || row.scheduleId || row.schedule_id || `day${state.day}_step${step}`,
      kind: row.kind,
      kindLabel: kindLabel(row.kind),
      label: row.label || row.phaseLabel || kindLabel(row.kind),
      phaseLabel: row.phaseLabel || row.label || kindLabel(row.kind),
      note: row.note || '',
      status,
      pickedName: history?.option?.name || history?.option?.phaseLabel || null,
      encounterId: row.encounterId || null
    };
  });
  return {
    day: state.day || route.day || 1,
    period: state.period || '',
    currentStep,
    totalSteps: steps.length,
    nextSchedule: clone(nextScheduleRow),
    steps,
    history: clone(route.history || []),
    battleOutcomes: clone(route.battleOutcomes || []),
    pendingRewards: clone((route.pendingRewards || []).filter(x => x && !x.claimed)),
    claimedRewards: clone(route.claimedRewards || []),
    runs: clone(state.dayRouteRuns || []),
    terminal: route.terminal ? clone(route.terminal) : null
  };
}

module.exports = { nextDaySchedule, buildDailyFlowVM };
