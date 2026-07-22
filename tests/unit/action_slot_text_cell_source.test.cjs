const test = require('node:test');
const assert = require('node:assert/strict');

const { createGameState, syncBoardUnits } = require('../../src/core/state.cjs');
const { makeUnitFromData } = require('../../src/core/unitFactory.cjs');
const battle = require('../../src/core/battle.cjs');

function emptyCellActionState() {
  const state = createGameState({ activePets: [] });
  state.phase = 'player_turn';
  const actor = makeUnitFromData(state, 'hero', 'pal_002', {
    id: 'hero_action_text_cell_source',
    position: { r: 6, c: 3 },
    applyQualityProgression: false
  });
  actor.shape = Object.assign({}, actor.shape, {
    shapeId: '02',
    shapeName: '形状02',
    slotCount: 1,
    slotElements: ['风'],
    baseLayers: 1,
    settleCount: 3
  });
  state.units.push(actor);
  syncBoardUnits(state);
  return { state, actor };
}

test('行动槽铺元素战报文本和 summary 使用同一个玩家坐标', () => {
  const { state, actor } = emptyCellActionState();
  assert.equal(battle.setActionDirection(state, actor.id, 0, 'right'), true);

  const beforeEventCount = state.events.length;
  assert.equal(battle.useActionSlot(state, actor.id, 0, null, { ap: 1 }), true);
  const events = state.events.slice(beforeEventCount);
  const apply = events.find(event => event.type === 'APPLY_ELEMENT_CELL');
  const slot = events.find(event => event.type === 'PLAYER_SELECT_SLOT');

  assert.ok(apply);
  assert.ok(slot);
  assert.equal(apply.r, 6);
  assert.equal(apply.c, 5);
  assert.match(apply.text, /R7C6/);
  assert.doesNotMatch(apply.text, /R6C5/);
  assert.deepEqual(slot.elementIncreases, ['R7C6 风+1']);
  assert.match(slot.text, /元素增加：R7C6 风\+1/);
});

test('敌人生成战报文本显示玩家坐标但 payload 保留内部坐标', () => {
  const state = createGameState({ activePets: [] });
  battle.startBattle(state);
  const spawn = state.events.find(event => event.type === 'SPAWN_ENEMY' && event.position);

  assert.ok(spawn);
  assert.equal(typeof spawn.position.r, 'number');
  assert.equal(typeof spawn.position.c, 'number');
  assert.match(spawn.text, new RegExp(`R${spawn.position.r + 1}C${spawn.position.c + 1}`));
});
