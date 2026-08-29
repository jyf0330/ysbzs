const { pushEvent } = require('./events.cjs');
const { makeUnit, syncBoardUnits } = require('./state.cjs');
const { applyBattleStart } = require('./mechanics.cjs');
const { shopPurchaseTarget } = require('./inventoryRules.cjs');
const { deepClone: clone } = require('./utils.cjs');

function fail(code, message) {
  const error = new Error(`${code}: ${message}`);
  error.code = code;
  throw error;
}

function formalChoices(state) {
  return (state.data?.startChoices || [])
    .filter(row => row && row.status === '正式')
    .slice()
    .sort((a, b) => Number(a.displayOrder || 0) - Number(b.displayOrder || 0) || String(a.id).localeCompare(String(b.id)));
}

function validateCatalog(state) {
  const rows = formalChoices(state);
  if (rows.length !== 3) fail('START_CHOICE_DATA_INVALID', `expected 3 formal choices, got ${rows.length}`);
  if (new Set(rows.map(row => row.id)).size !== rows.length) fail('START_CHOICE_DATA_INVALID', 'duplicate start choice id');
  if (new Set(rows.map(row => Number(row.displayOrder))).size !== rows.length) fail('START_CHOICE_DATA_INVALID', 'duplicate display order');
  for (const row of rows) {
    if (!row.id || !row.name || Number(row.displayOrder) < 1) fail('START_CHOICE_DATA_INVALID', `invalid row ${row.id || '<missing>'}`);
    for (const field of ['coinsDelta', 'freeRollsDelta', 'runHealthDelta', 'runMaxHealthDelta']) {
      if (!Number.isFinite(Number(row[field]))) fail('START_CHOICE_DATA_INVALID', `${row.id} invalid ${field}`);
    }
    if (row.petId && !state.indexes?.petsById?.has(row.petId)) fail('START_CHOICE_DATA_INVALID', `${row.id} unknown pet ${row.petId}`);
  }
  return rows;
}

function publicOptions(state) {
  return validateCatalog(state).map(row => ({
    optionId: row.id,
    startChoiceId: row.id,
    id: row.id,
    kind: 'start',
    name: row.name,
    title: row.name,
    description: row.description,
    desc: row.description,
    displayOrder: Number(row.displayOrder),
    coinsDelta: Number(row.coinsDelta || 0),
    freeRollsDelta: Number(row.freeRollsDelta || 0),
    petId: row.petId || '',
    petQuality: row.petQuality || '',
    runHealthDelta: Number(row.runHealthDelta || 0),
    runMaxHealthDelta: Number(row.runMaxHealthDelta || 0),
    source: row.source || 'START_CHOICES',
    note: row.note || ''
  }));
}

function chooseStart(state, requestedId) {
  if (state.phase !== 'start_choice') fail('START_CHOICE_PHASE_INVALID', `current phase is ${state.phase}`);
  if (state.runStart) fail('START_CHOICE_ALREADY_SELECTED', `already selected ${state.runStart.startChoiceId}`);
  const rows = validateCatalog(state);
  const offeredIds = new Set((state.startOptions || []).map(row => row.startChoiceId || row.optionId || row.id));
  const id = String(requestedId || '').trim();
  const choice = rows.find(row => row.id === id);
  if (!choice || !offeredIds.has(id)) fail('START_CHOICE_NOT_OFFERED', id || '<empty>');

  const coinsFrom = Number(state.gold || 0);
  const freeRollsFrom = Number(state.shop?.freeRolls || 0);
  const runMaxHealthFrom = Number(state.runMaxHealth ?? state.castleLine ?? 20);
  const runHealthFrom = Number(state.runHealth ?? state.castleLine ?? runMaxHealthFrom);
  const coinsTo = coinsFrom + Number(choice.coinsDelta || 0);
  const freeRollsTo = freeRollsFrom + Number(choice.freeRollsDelta || 0);
  const runMaxHealthTo = runMaxHealthFrom + Number(choice.runMaxHealthDelta || 0);
  const runHealthTo = runHealthFrom + Number(choice.runHealthDelta || 0);
  if (coinsTo < 0 || freeRollsTo < 0 || runMaxHealthTo < 1 || runHealthTo < 0 || runHealthTo > runMaxHealthTo) {
    fail('START_CHOICE_RESULT_INVALID', id);
  }
  if (choice.petId && (state.inventory || []).some(item => item.petId === choice.petId)) {
    fail('START_CHOICE_DUPLICATE_PET', choice.petId);
  }

  let preparedUnit = null;
  let preparedTarget = null;
  let nextUnitTo = Number(state.nextUnit || 1);
  if (choice.petId) {
    preparedTarget = shopPurchaseTarget(state, choice.petId);
    if (!preparedTarget.ok || preparedTarget.placement !== 'active') fail('START_CHOICE_ROSTER_BLOCKED', preparedTarget.reason || choice.petId);
    const preparationState = Object.assign({}, state, { nextUnit: nextUnitTo });
    preparedUnit = makeUnit(preparationState, 'hero', choice.petId, {
      position: preparedTarget.position,
      quality: choice.petQuality || undefined,
      flags: { acquiredFrom: 'START_CHOICES', startChoiceId: id }
    });
    nextUnitTo = Number(preparationState.nextUnit || nextUnitTo + 1);
  }

  state.gold = coinsTo;
  state.shop.freeRolls = freeRollsTo;
  if (state.shop.refreshState) {
    state.shop.refreshState.freeRolls = freeRollsTo;
    state.shop.refreshState.nextRefreshCost = freeRollsTo > 0 ? 0 : Number(state.shop.refreshState.nextPaidRefreshCost || 2);
  }
  state.runMaxHealth = runMaxHealthTo;
  state.runHealth = runHealthTo;
  state.castleLine = runHealthTo;
  if (preparedUnit) {
    state.nextUnit = nextUnitTo;
    applyBattleStart(state, preparedUnit);
    state.units.push(preparedUnit);
    state.inventory.push({
      petId: choice.petId,
      count: 1,
      active: true,
      instanceId: preparedUnit.id,
      slot: preparedTarget.slot,
      quality: preparedUnit.quality,
      acquiredFrom: { type: 'start_choice', startChoiceId: id, source: choice.source || 'START_CHOICES' }
    });
    syncBoardUnits(state);
  }

  const result = {
    schema: 'ysbzs.start-choice-result.v1',
    startChoiceId: id,
    name: choice.name,
    source: choice.source || 'START_CHOICES',
    phaseFrom: 'start_choice',
    phaseTo: 'route',
    resources: {
      coins: { before: coinsFrom, delta: Number(choice.coinsDelta || 0), after: coinsTo },
      freeRolls: { before: freeRollsFrom, delta: Number(choice.freeRollsDelta || 0), after: freeRollsTo },
      runHealth: { before: runHealthFrom, delta: Number(choice.runHealthDelta || 0), after: runHealthTo },
      runMaxHealth: { before: runMaxHealthFrom, delta: Number(choice.runMaxHealthDelta || 0), after: runMaxHealthTo }
    },
    pet: preparedUnit ? { petId: choice.petId, quality: preparedUnit.quality, instanceId: preparedUnit.id, slot: preparedTarget.slot } : null
  };
  state.runStart = clone(result);
  state.dayRoute = state.dayRoute || { day: state.day || 1, nodeIndex: 0, battleIndex: 0, options: [], battleOptions: [], currentEncounter: null, history: [] };
  state.dayRoute.history = Array.isArray(state.dayRoute.history) ? state.dayRoute.history : [];
  state.dayRoute.history.push({ kind: 'start_choice', startChoiceId: id, result: clone(result) });
  state.phase = 'route';
  state.result = clone(result);
  pushEvent(state, 'START_CHOICE_APPLY', { ...clone(result), text: `选择开局【${choice.name}】。` });
  return result;
}

function newRun(state, command = {}) {
  const { createGameState } = require('./state.cjs');
  const initial = { ...(state.replayInitialOptions || {}) };
  const protocol = {
    stateVersion: Number(state.stateVersion || 0),
    nextCommand: Number(state.nextCommand || 1),
    commandLog: clone(state.commandLog || []),
    replayLog: clone(state.replayLog || []),
    debugTimeline: clone(state.debugTimeline || []),
    replayInitialOptions: { ...initial, requireStartChoice: true, seed: command.seed || initial.seed },
    initialStateHash: state.initialStateHash || null
  };
  const fresh = createGameState({
    ...initial,
    data: state.data,
    battleId: state.battleId || initial.battleId,
    mode: state.mode || initial.mode,
    players: state.players || initial.players,
    teams: state.teams || initial.teams,
    seed: command.seed || initial.seed || state.rngState?.seed,
    requireStartChoice: true
  });
  for (const key of Object.keys(state)) delete state[key];
  Object.assign(state, fresh, protocol);
  pushEvent(state, 'NEW_RUN', { seed: state.rngState?.seed || null, phaseTo: 'start_choice', text: '重新开局：进入开局构筑选择。' });
  return { schema: 'ysbzs.new-run-result.v1', phaseTo: 'start_choice', startOptions: clone(state.startOptions || []) };
}

module.exports = { formalChoices, validateCatalog, publicOptions, chooseStart, newRun };
