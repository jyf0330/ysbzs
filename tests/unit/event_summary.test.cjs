const assert = require('node:assert/strict');
const test = require('node:test');

const { summarizeRiskChange } = require('../../src/core/battle/eventSummary.cjs');

test('movement risk summary calls HP loss injury', () => {
  assert.equal(
    summarizeRiskChange({ hpDamage: 0, shieldDamage: 0, damage: 0 }, { hpDamage: 7, shieldDamage: 0, damage: 7 }),
    '预计HP损失 0->7'
  );
});

test('movement risk summary does not call shield-only hits injury', () => {
  assert.equal(
    summarizeRiskChange({ hpDamage: 0, shieldDamage: 0, damage: 0 }, { hpDamage: 0, shieldDamage: 1, damage: 1 }),
    '预计护盾消耗 0->1'
  );
});

test('movement risk summary falls back to incoming hit when detailed split is absent', () => {
  assert.equal(
    summarizeRiskChange({ damage: 0 }, { damage: 1 }),
    '预计承受攻击 0->1'
  );
});

test('movement risk summary shows stable nonzero HP loss as an absolute value', () => {
  assert.equal(
    summarizeRiskChange({ hpDamage: 9, shieldDamage: 0, damage: 9 }, { hpDamage: 9, shieldDamage: 0, damage: 9 }),
    '预计HP损失 9'
  );
});
