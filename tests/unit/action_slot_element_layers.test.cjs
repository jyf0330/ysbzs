const assert = require('assert');
const test = require('node:test');

const { createGameState, getCell, syncBoardUnits } = require('../../src/core/state.cjs');
const { makeUnitFromData } = require('../../src/core/unitFactory.cjs');
const { buildSaveDocument } = require('../../src/storage/saveCodec.cjs');
const battle = require('../../src/core/battle.cjs');

function catVsCatState() {
  const state = createGameState({ activePets: [] });
  state.phase = 'player_turn';
  const actor = makeUnitFromData(state, 'hero', 'pal_002', {
    id: 'hero_pal_002_element_layers',
    position: { r: 7, c: 0 },
    applyQualityProgression: false
  });
  const target = makeUnitFromData(state, 'enemy', 'pal_002', {
    id: 'enemy_pal_002_element_layers',
    position: { r: 7, c: 2 },
    applyQualityProgression: false
  });
  state.units.push(actor, target);
  syncBoardUnits(state);
  return { state, actor, target };
}

test('普通宠物三槽同格只累计 3 层元素，不把形状结算次数乘成 9', () => {
  const { state, actor } = catVsCatState();
  const slots = battle.slotsForUnit(state, actor);
  assert.deepEqual(slots.map(slot => slot.baseLayers), [1, 1, 1]);
  assert.deepEqual(slots.map(slot => slot.layers), [1, 1, 1]);

  for (let i = 0; i < 3; i += 1) {
    assert.equal(battle.useActionSlot(state, actor.id, i, null, { ap: 1 }), true);
  }

  const targetCell = getCell(state, 7, 2);
  assert.equal(targetCell.elements.无, 3);
});

test('捣蛋猫打捣蛋猫的行动预览只记录即时行动伤害，不提前混入回合末元素结算', () => {
  const { state, actor, target } = catVsCatState();

  const previews = battle.buildPreviewGrid(state, { unitId: actor.id })
    .filter(p => p.targetId === target.id);

  assert.deepEqual(previews.map(p => p.slotIndex), [0, 1, 2]);
  assert.deepEqual(previews.map(p => p.predictedDamage), [4, 4, 4]);
  assert.deepEqual(previews.map(p => p.predictedActionDamage), [4, 4, 4]);
  assert.deepEqual(previews.map(p => p.predictedSettlementDamage), [0, 0, 0]);
  assert.equal(previews[2].settlement, null);
  assert.deepEqual(previews.map(p => p.predictedHpTo), [21, 17, 13]);
});

test('保存文档不持久化棋盘预览和威胁派生字段', () => {
  const { state } = catVsCatState();
  battle.syncDerivedBoard(state);

  assert.ok(state.board.cells.some(cell => cell.preview || (Array.isArray(cell.previews) && cell.previews.length) || cell.threat), '测试需要先生成派生预览/威胁');

  const save = buildSaveDocument(state, { playerId: 'p1', gameVersion: 'unit-test' });
  for (const cell of save.state.board.cells) {
    assert.equal(Object.prototype.hasOwnProperty.call(cell, 'preview'), false);
    assert.equal(Object.prototype.hasOwnProperty.call(cell, 'previews'), false);
    assert.equal(Object.prototype.hasOwnProperty.call(cell, 'threat'), false);
  }
});
