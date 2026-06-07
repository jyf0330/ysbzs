const test = require('node:test');
const assert = require('node:assert/strict');
const { createYSBZSUIAdapter } = require('../src/uiAdapter.cjs');

test('DAY7 fire trial is routed through uiAdapter and core state, not a standalone mock', () => {
  const a = createYSBZSUIAdapter({ gold: 30 });
  const setup = a.run('SETUP_DAY7_FIRE_TRIAL');
  assert.equal(setup.ok, true);
  assert.ok(setup.events.some(e => e.type === 'TRIAL_SETUP'));
  let vm = a.getViewModel();
  assert.equal(vm.day, 7);
  assert.equal(vm.board.rows, 8);
  assert.equal(vm.board.cols, 8);
  assert.equal(vm.leaders.enemy.position.r, 0);
  assert.equal(vm.leaders.enemy.position.c, 7);
  assert.ok(vm.day7Trial);
  assert.equal(vm.day7Trial.round1KillCount, 0);
  assert.equal(vm.enemies.length, 4);

  const run = a.run('RUN_DAY7_FIRE_TURN_1');
  assert.equal(run.ok, true);
  assert.ok(run.events.some(e => e.type === 'TRIAL_RESULT'));
  vm = a.getViewModel();
  assert.equal(vm.day7Trial.passedRound1Standard, true);
  assert.equal(vm.day7Trial.round1KillCount, 2);
  assert.ok(vm.day7Trial.round1Kills.includes('骑士蜂黄金复制体'));
  assert.ok(vm.day7Trial.round1Kills.includes('精灵龙黄金复制体'));
  assert.ok(vm.enemies.some(e => e.name === '皮皮鸡黄金复制体' && e.hp === 34 && e.shield === 20));
  assert.ok(vm.enemies.some(e => e.name === '棉悠悠黄金复制体' && e.hp === 60));
  assert.ok(vm.board.cells.some(c => c.elements && c.elements['火'] >= 4), 'should leave a real fire trap on board cells');
  assert.ok(vm.board.cells.some(c => c.elements && c.elements['水'] >= 1), 'should leave a real catalyst water cell on board cells');
  assert.ok(vm.battleTrace.some(e => /水汽催化/.test(e.text)), 'battleTrace should expose catalyst logic');
  assert.ok(vm.battleTrace.some(e => /火脉爆心/.test(e.text)), 'battleTrace should expose fire explosion logic');
});
