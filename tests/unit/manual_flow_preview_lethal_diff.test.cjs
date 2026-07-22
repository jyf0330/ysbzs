const test = require('node:test');
const assert = require('node:assert/strict');

const { createYSBZSUIAdapter } = require('../../src/uiAdapter.cjs');

function injuryFromUnitDiff(diff) {
  if (!diff?.before || !diff?.after) return null;
  const before = diff.before;
  const after = diff.after;
  const hpFrom = Math.max(0, Number(before.hp ?? 0));
  const hpTo = Math.max(0, Number(after.hp ?? hpFrom));
  const shieldFrom = Math.max(0, Number(before.shield ?? 0));
  const shieldTo = Math.max(0, Number(after.shield ?? shieldFrom));
  const hpDamage = Math.max(0, hpFrom - hpTo);
  const shieldDamage = Math.max(0, shieldFrom - shieldTo);
  const damage = hpDamage + shieldDamage;
  if (damage <= 0) return null;
  return { damage, hpDamage, shieldDamage, hpFrom, hpTo, shieldFrom, shieldTo };
}

function eventDamageForTarget(events, targetId) {
  return (events || [])
    .filter(event => event.type === 'DAMAGE' && event.targetId === targetId)
    .reduce((sum, event) => sum + Number(event.final || 0), 0);
}

function runVisibleAllOutFlow(adapter) {
  const events = [];
  let result = adapter.run('RUN_PLAYER_ALL_OUT');
  events.push(...(result.events || []));
  let vm = result.viewModel;
  if (vm.phase === 'player_turn') {
    result = adapter.run('END_PLAYER_TURN');
    events.push(...(result.events || []));
    vm = result.viewModel;
  }
  if (vm.phase === 'round_end') {
    result = adapter.run('START_NEXT_ROUND');
    events.push(...(result.events || []));
  }
  return events;
}

test('PREVIEW_MANUAL_FLOW 对全出击击杀目标也保留预计受伤 diff', () => {
  const adapter = createYSBZSUIAdapter({ gold: 8, seed: 'p1', battleId: 'lethal_preview_diff' });
  adapter.run('START_BATTLE');
  adapter.run('AUTO_POSITION_HEROES');
  const before = adapter.getViewModel();
  const previewTarget = (before.previewGrid || []).find(item => Number(item.predictedDamage || 0) > 0);
  assert.ok(previewTarget, '测试需要站位后有一个预计受伤目标');

  const preview = adapter.run('PREVIEW_MANUAL_FLOW', { limit: 2 });
  const diff = preview.result.unitDiffs.find(item => item.id === previewTarget.targetId);
  assert.ok(diff, '预演应返回被击杀目标的单位 diff');
  assert.ok(diff.after, '被击杀目标从 projected enemies 消失时也要提供 after，供前端计算预计受伤');
  assert.equal(diff.after.hp, 0);
  assert.equal(diff.after.alive, false);

  const predicted = injuryFromUnitDiff(diff);
  assert.ok(predicted, '前端 injuryFromUnitDiff 逻辑应能从 lethal diff 算出预计受伤');
  assert.equal(predicted.damage, 18);
  assert.equal(predicted.hpDamage, 18);

  const actualEvents = runVisibleAllOutFlow(adapter);
  assert.equal(eventDamageForTarget(actualEvents, previewTarget.targetId), predicted.damage);
});
