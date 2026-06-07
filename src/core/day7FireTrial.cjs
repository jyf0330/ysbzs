const { setupTrial, runTrialRound, trialSummary, fireDamage, loadTrialConfig } = require('./trialEngine.cjs');

const DAY7_TRIAL_ID = 'day7_fire_trial_v1';

function setupDay7FireTrial(state) {
  return setupTrial(state, DAY7_TRIAL_ID);
}
function runDay7FireTurn1(state) {
  return runTrialRound(state, DAY7_TRIAL_ID, 1);
}
function scenarioSummary(state) {
  return trialSummary(state, DAY7_TRIAL_ID);
}

module.exports = { setupDay7FireTrial, runDay7FireTurn1, scenarioSummary, fireDamage, loadDay7Config: () => loadTrialConfig(DAY7_TRIAL_ID) };
