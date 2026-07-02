const test = require('node:test');
const assert = require('node:assert/strict');

const { __test__ } = require('../../src/uiAdapterManualFlowPreview.cjs');

test('manual-flow injury source damage follows realized HP/shield delta, not overkill final', () => {
  const threat = __test__.damageThreatFromEvent({
    type: 'DAMAGE',
    sourceId: 'enemy_1',
    targetId: 'hero_1',
    raw: 11,
    final: 11,
    shieldFrom: 0,
    shieldTo: 0,
    hpFrom: 10,
    hpTo: 1,
    element: '风'
  }, {
    unitId: 'enemy_1',
    unitName: '捣蛋猫',
    slotId: 'slot_1',
    slotLabel: '第1槽',
    cells: [{ r: 1, c: 5 }]
  }, new Map([['enemy_1', { id: 'enemy_1', displayName: '捣蛋猫' }]]));

  assert.equal(threat.damage, 9);
  assert.equal(threat.hpDamage, 9);
  assert.equal(threat.raw, 11);
  assert.equal(threat.final, 9);
  assert.equal(threat.enemyName, '捣蛋猫');
});
