const { pushEvent } = require('./events.cjs');
const { deepClone: clone } = require('./utils.cjs');

function fail(code, message) {
  const error = new Error(`${code}: ${message}`);
  error.code = code;
  throw error;
}

function formalMilestones(state) {
  return (state.data?.runGrowth || [])
    .filter(row => row && row.status === '正式')
    .slice()
    .sort((a, b) => Number(a.targetLevel || 0) - Number(b.targetLevel || 0));
}

function formalChoices(state) {
  return (state.data?.growthChoices || [])
    .filter(row => row && row.status === '正式')
    .slice()
    .sort((a, b) => Number(a.targetLevel || 0) - Number(b.targetLevel || 0)
      || Number(a.displayOrder || 0) - Number(b.displayOrder || 0)
      || String(a.id).localeCompare(String(b.id)));
}

function validateCatalog(state) {
  const milestones = formalMilestones(state);
  const choices = formalChoices(state);
  const expectedLevels = [2, 3, 4];
  const expectedXp = [3, 8, 15];
  if (milestones.length !== expectedLevels.length) fail('GROWTH_DATA_INVALID', `expected 3 milestones, got ${milestones.length}`);
  for (let i = 0; i < milestones.length; i += 1) {
    if (Number(milestones[i].targetLevel) !== expectedLevels[i] || Number(milestones[i].cumulativeXp) !== expectedXp[i]) {
      fail('GROWTH_DATA_INVALID', `milestone ${i + 1} must be Lv${expectedLevels[i]} at ${expectedXp[i]} XP`);
    }
  }
  if (choices.length !== 9 || new Set(choices.map(row => row.id)).size !== choices.length) {
    fail('GROWTH_DATA_INVALID', 'expected 9 unique growth choices');
  }
  for (const level of expectedLevels) {
    const rows = choices.filter(row => Number(row.targetLevel) === level);
    if (rows.length !== 3 || new Set(rows.map(row => Number(row.displayOrder))).size !== 3) {
      fail('GROWTH_DATA_INVALID', `Lv${level} must have 3 uniquely ordered choices`);
    }
    for (const row of rows) {
      if (!row.id || !row.name || Number(row.displayOrder) < 1) fail('GROWTH_DATA_INVALID', `invalid choice ${row.id || '<missing>'}`);
      const fields = ['coinsDelta', 'freeRollsDelta', 'runHealthDelta', 'runMaxHealthDelta', 'roundApBonusDelta'];
      const values = fields.map(field => Number(row[field] || 0));
      if (values.some(value => !Number.isInteger(value) || value < 0) || !values.some(value => value > 0)) {
        fail('GROWTH_DATA_INVALID', `${row.id} must have a non-negative, non-empty integer effect`);
      }
    }
  }
  return { milestones, choices };
}

function publicChoice(row) {
  return {
    optionId: row.id,
    growthChoiceId: row.id,
    id: row.id,
    kind: 'growth',
    targetLevel: Number(row.targetLevel),
    name: row.name,
    title: row.name,
    description: row.description,
    desc: row.description,
    displayOrder: Number(row.displayOrder),
    coinsDelta: Number(row.coinsDelta || 0),
    freeRollsDelta: Number(row.freeRollsDelta || 0),
    runHealthDelta: Number(row.runHealthDelta || 0),
    runMaxHealthDelta: Number(row.runMaxHealthDelta || 0),
    roundApBonusDelta: Number(row.roundApBonusDelta || 0),
    source: row.source || 'GROWTH_CHOICES',
    note: row.note || ''
  };
}

function nextMilestone(state) {
  const { milestones } = validateCatalog(state);
  return milestones.find(row => Number(row.targetLevel) === Number(state.runLevel || 1) + 1) || null;
}

function refreshNextLevelXp(state) {
  const next = nextMilestone(state);
  state.nextLevelXp = next ? Number(next.cumulativeXp) : null;
  return state.nextLevelXp;
}

function awardEncounterXp(state, encounter, outcome, battleResult = null) {
  const { choices } = validateCatalog(state);
  const before = Number(state.runXp || 0);
  const delta = outcome?.win ? Math.max(0, Number(encounter?.xpReward || 0)) : 0;
  if (!Number.isInteger(delta) || delta > 3) fail('GROWTH_XP_INVALID', `${encounter?.encounterId || '<unknown>'}:${delta}`);
  const after = before + delta;
  state.runXp = after;
  const xp = {
    source: 'encounter',
    encounterId: encounter?.encounterId || null,
    before,
    delta,
    after
  };
  if (outcome) outcome.runXp = clone(xp);
  if (battleResult && typeof battleResult === 'object') battleResult.runXp = clone(xp);
  if (state.result && typeof state.result === 'object') state.result.runXp = clone(xp);

  const milestone = nextMilestone(state);
  if (delta > 0 && milestone && after >= Number(milestone.cumulativeXp)) {
    const targetLevel = Number(milestone.targetLevel);
    const options = choices.filter(row => Number(row.targetLevel) === targetLevel).map(publicChoice);
    state.pendingGrowth = {
      targetLevel,
      threshold: Number(milestone.cumulativeXp),
      sourceEncounterId: encounter?.encounterId || null,
      xp: clone(xp),
      resumePhase: null,
      routeReturnPhase: null
    };
    state.growthOptions = options;
  }
  refreshNextLevelXp(state);
  pushEvent(state, 'RUN_XP_SETTLE', {
    ...clone(xp),
    targetLevel: state.pendingGrowth?.targetLevel || null,
    text: delta > 0 ? `遭遇胜利经验：${before}+${delta}=${after} XP。` : `本场未获得经验：${before} XP。`
  });
  return xp;
}

function enterLevelUp(state, resumePhase, routeReturnPhase) {
  if (!state.pendingGrowth || !(state.growthOptions || []).length) return false;
  state.pendingGrowth.resumePhase = resumePhase;
  state.pendingGrowth.routeReturnPhase = routeReturnPhase;
  state.phase = 'level_up';
  pushEvent(state, 'GROWTH_CHOICE_OPEN', {
    targetLevel: state.pendingGrowth.targetLevel,
    threshold: state.pendingGrowth.threshold,
    options: clone(state.growthOptions),
    resumePhase,
    text: `达到 Lv${state.pendingGrowth.targetLevel}：选择一项本局成长。`
  });
  return true;
}

function resource(before, delta) {
  return { before, delta, after: before + delta };
}

function chooseGrowth(state, requestedId) {
  if (state.phase !== 'level_up' || !state.pendingGrowth) fail('GROWTH_PHASE_INVALID', `current phase is ${state.phase}`);
  const { choices } = validateCatalog(state);
  const id = String(requestedId || '').trim();
  const targetLevel = Number(state.pendingGrowth.targetLevel || 0);
  const offered = new Set((state.growthOptions || []).map(row => row.growthChoiceId || row.optionId || row.id));
  const choice = choices.find(row => row.id === id && Number(row.targetLevel) === targetLevel);
  if (!choice || !offered.has(id)) fail('GROWTH_CHOICE_NOT_OFFERED', id || '<empty>');
  if ((state.growthHistory || []).some(item => item.growthChoiceId === id || Number(item.targetLevel) === targetLevel)) {
    fail('GROWTH_CHOICE_ALREADY_SELECTED', id);
  }

  const effects = {
    coins: resource(Number(state.gold || 0), Number(choice.coinsDelta || 0)),
    freeRolls: resource(Number(state.shop?.freeRolls || 0), Number(choice.freeRollsDelta || 0)),
    runHealth: resource(Number(state.runHealth || 0), Number(choice.runHealthDelta || 0)),
    runMaxHealth: resource(Number(state.runMaxHealth || 0), Number(choice.runMaxHealthDelta || 0)),
    roundApBonus: resource(Number(state.roundApBonus || 0), Number(choice.roundApBonusDelta || 0))
  };
  if (effects.coins.after < 0 || effects.freeRolls.after < 0 || effects.runMaxHealth.after < 1
    || effects.runHealth.after < 0 || effects.runHealth.after > effects.runMaxHealth.after
    || effects.roundApBonus.after < 0 || effects.roundApBonus.after > 3) {
    fail('GROWTH_RESULT_INVALID', id);
  }

  const phaseFrom = state.phase;
  const phaseTo = state.pendingGrowth.resumePhase || 'node_resolved';
  const routeReturnPhase = state.pendingGrowth.routeReturnPhase || phaseTo;
  state.gold = effects.coins.after;
  state.shop.freeRolls = effects.freeRolls.after;
  if (state.shop.refreshState) {
    state.shop.refreshState.freeRolls = effects.freeRolls.after;
    state.shop.refreshState.nextRefreshCost = effects.freeRolls.after > 0 ? 0 : Number(state.shop.refreshState.nextPaidRefreshCost || 2);
  }
  state.runHealth = effects.runHealth.after;
  state.runMaxHealth = effects.runMaxHealth.after;
  state.castleLine = effects.runHealth.after;
  state.roundApBonus = effects.roundApBonus.after;
  state.runLevel = targetLevel;

  const result = {
    schema: 'ysbzs.growth-choice-result.v1',
    growthChoiceId: id,
    targetLevel,
    name: choice.name,
    source: choice.source || 'GROWTH_CHOICES',
    xp: clone(state.pendingGrowth.xp || null),
    effects,
    phaseFrom,
    phaseTo,
    routeReturnPhase
  };
  state.growthHistory = Array.isArray(state.growthHistory) ? state.growthHistory : [];
  state.growthHistory.push(clone(result));
  state.pendingGrowth = null;
  state.growthOptions = [];
  refreshNextLevelXp(state);
  state.phase = phaseTo;
  state.result = clone(result);
  pushEvent(state, 'GROWTH_CHOICE_APPLY', { ...clone(result), text: `Lv${targetLevel} 选择【${choice.name}】，恢复阶段 ${phaseTo}。` });
  return result;
}

module.exports = {
  formalMilestones,
  formalChoices,
  validateCatalog,
  publicChoice,
  nextMilestone,
  refreshNextLevelXp,
  awardEncounterXp,
  enterLevelUp,
  chooseGrowth
};
