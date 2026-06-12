const test = require('node:test');
const assert = require('node:assert/strict');
const { data, validateData, buildIndexes } = require('../src/core/data.cjs');
const { createGameState } = require('../src/core/state.cjs');
const battle = require('../src/core/battle.cjs');
const { createYSBZSUIAdapter, PUBLIC_COMMANDS } = require('../src/uiAdapter.cjs');
const { renderPlayerReport, renderShopReport } = require('../src/render/textReport.cjs');

function hasEvent(resultOrState, type) {
  const events = Array.isArray(resultOrState?.events) ? resultOrState.events : [];
  return events.some(e => e.type === type);
}

const expectedCounts = {
  pets: 127,
  monsters: 34,
  waves: 134,
  mechanisms: 61,
  events: 32,
  shop: 127,
  relics: 40,
  shapes: 127,
  validation: 10,
  nodeSchedule: 6,
  nodePool: 6,
  encounterPool: 4
};

test('FC01 当前 CSV 单源数据规模与波次规则表一致', () => {
  for (const [key, count] of Object.entries(expectedCounts)) assert.equal(data[key].length, count, key);
});

test('FC02 跨表引用全部可校验', () => {
  const v = validateData();
  assert.equal(v.ok, true, v.issues.join('\n'));
  assert.deepEqual(v.counts, expectedCounts);
});

test('FC03 宠物、商店、形状、波次索引全部连通', () => {
  const ix = buildIndexes();
  assert.equal(ix.petsById.size, expectedCounts.pets);
  for (const p of data.pets) {
    assert.ok(ix.shapesByPetId.has(p.id), `missing shape ${p.id}`);
    assert.ok(ix.shopByPetId.has(p.id), `missing shop ${p.id}`);
  }
  for (const w of data.waves) {
    const petPool = (w.petPool && w.petPool.length ? w.petPool : [w.petId]).filter(Boolean);
    assert.ok(petPool.length, `${w.waveId} pet pool`);
    for (const petId of petPool) assert.ok(ix.petsById.has(petId), `${w.waveId} pet ${petId}`);
  }
});

test('FC04 核心战斗能完整跑到胜负并产生结构化事件', () => {
  const s = createGameState({ day: 1, period: '上午', gold: 8 });
  const result = battle.runBattle(s);
  assert.ok(result.code === 'WIN_FAST' || result.code === 'WIN' || result.code === 'LOSE');
  assert.ok(s.events.some(e => e.type === 'BATTLE_START'));
  assert.ok(s.events.some(e => e.type === 'BATTLE_END'));
  assert.ok(s.events.every(e => typeof e.type === 'string' && typeof e.step === 'number'));
});

test('FC05 玩家手动链路：开始、选择、移动、调方向、施放、结束回合', () => {
  const adapter = createYSBZSUIAdapter({ day: 1, period: '上午', gold: 8 });
  let r = adapter.startBattle();
  assert.equal(r.viewModel.phase, 'player_turn');
  const hero = r.viewModel.heroes[0];
  r = adapter.selectUnit(hero.id);
  assert.ok(hasEvent(r, 'SELECT_UNIT'));
  r = adapter.moveHero(hero.id, { r: 6, c: 3 });
  assert.equal(r.viewModel.heroes.find(h => h.id === hero.id).position.c, 3);
  r = adapter.setActionDirection(hero.id, 0, 'right');
  assert.ok(hasEvent(r, 'SET_ACTION_DIRECTION'));
  r = adapter.useSlot(hero.id, 0, { r: 6, c: 4 });
  assert.ok(hasEvent(r, 'PLAYER_SELECT_SLOT'));
  r = adapter.endPlayerTurn();
  assert.ok(hasEvent(r, 'PLAYER_TURN_END') || hasEvent(r, 'END_PLAYER_TURN_BLOCKED'));
});

test('FC06 商店链路：进店、冻结、刷新、购买、离店', () => {
  const adapter = createYSBZSUIAdapter({ gold: 999 });
  let r = adapter.enterShop('night_base', 6);
  assert.ok(hasEvent(r, 'SHOP_ENTER'));
  const first = r.viewModel.shop.offers[0];
  assert.ok(first.offerId);
  assert.ok(hasEvent(adapter.freezeOffer(first.offerId), 'SHOP_FREEZE'));
  r = adapter.rollShop({ slots: 6 });
  assert.ok(hasEvent(r, 'SHOP_ROLL'));
  const offer = adapter.getViewModel().shop.offers.find(o => o.price <= adapter.getViewModel().gold);
  assert.ok(offer);
  assert.ok(hasEvent(adapter.buyOffer(offer.offerId), 'SHOP_BUY'));
  assert.ok(hasEvent(adapter.exitShop(), 'SHOP_EXIT'));
});

test('FC07 uiAdapter 公开命令、ViewModel、战报、回放全部可用', () => {
  for (const cmd of ['START_BATTLE','SELECT_UNIT','MOVE_HERO','SET_ACTION_DIRECTION','USE_SLOT','END_PLAYER_TURN','RUN_BATTLE','EXPORT_BATTLE_TRACE','REPLAY_BATTLE_TRACE','EXPORT_REPLAY']) assert.ok(PUBLIC_COMMANDS.includes(cmd), cmd);
  const adapter = createYSBZSUIAdapter({ gold: 8 });
  adapter.runBattle();
  const vm = adapter.getViewModel();
  assert.equal(vm.meta.pets, expectedCounts.pets);
  assert.ok(vm.board.cells.length > 0);
  assert.ok(adapter.getTextReport('player').includes('全数据纯文字流程报告'));
  const trace = adapter.exportBattleTrace();
  assert.ok(trace.result.events.length > 0);
  const replay = adapter.replayBattleTrace(trace.result.events);
  assert.equal(replay.command, 'REPLAY_BATTLE_TRACE');
  assert.ok(adapter.exportReplay().result.battleTrace.length > 0);
});

test('FC08 文本报告不依赖 DOM，能输出玩家与商店链路', () => {
  const adapter = createYSBZSUIAdapter({ gold: 20 });
  adapter.runBattle();
  adapter.enterShop('night_base', 6);
  const snap = adapter.getStateSnapshot();
  const player = renderPlayerReport(snap);
  const shop = renderShopReport(snap);
  assert.ok(player.includes('全数据纯文字流程报告'));
  assert.ok(shop.includes('商店链路报告'));
});

test('FC09 第7天火核心试炼通过 uiAdapter 接入核心状态', () => {
  const adapter = createYSBZSUIAdapter({ gold: 8 });
  let r = adapter.setupDay7FireTrial();
  assert.ok(r.viewModel.day7Trial);
  assert.ok(hasEvent(r, 'TRIAL_SETUP'));
  r = adapter.runDay7FireTurn1();
  assert.ok(r.viewModel.day7Trial.round1KillCount >= 0);
  assert.ok(Array.isArray(r.viewModel.day7Trial.round1Kills));
});
