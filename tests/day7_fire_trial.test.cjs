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
  const enemiesBefore = new Map(vm.enemies.map(enemy => [enemy.name, { hp: enemy.hp, shield: enemy.shield }]));

  const run = a.run('RUN_DAY7_FIRE_TURN_1');
  assert.equal(run.ok, true);
  const resultEvent = run.events.find(e => e.type === 'TRIAL_RESULT');
  assert.ok(resultEvent);
  vm = a.getViewModel();
  assert.equal(typeof vm.day7Trial.passedRound1Standard, 'boolean');
  assert.match(resultEvent.text || '', /第1回合验收/);
  assert.ok(vm.day7Trial.round1KillCount > 0);
  assert.equal(vm.day7Trial.round1KillCount, vm.day7Trial.round1Kills.length);
  for (const name of vm.day7Trial.round1Kills) assert.ok(enemiesBefore.has(name), `round1 kill should come from setup enemies: ${name}`);
  assert.ok(vm.enemies.some(e => {
    const before = enemiesBefore.get(e.name);
    return before && (Number(e.hp || 0) < Number(before.hp || 0) || Number(e.shield || 0) < Number(before.shield || 0));
  }), 'round 1 should leave visible damage on at least one enemy');
  assert.ok(vm.board.cells.some(c => c.elements && c.elements['火'] >= 1), 'should leave a real fire trap on board cells');
  assert.ok(vm.board.cells.some(c => c.elements && c.elements['水'] >= 1), 'should leave a real catalyst water cell on board cells');
  assert.ok(vm.battleTrace.some(e => /水汽催化/.test(e.text)), 'battleTrace should expose catalyst logic');
  assert.ok(vm.battleTrace.some(e => /火脉爆心/.test(e.text)), 'battleTrace should expose fire explosion logic');
});
