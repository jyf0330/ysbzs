const test = require('node:test');
const assert = require('node:assert/strict');
const { createYSBZSUIAdapter } = require('../src/uiAdapter.cjs');

function hasEvent(result, type) { return result.events.some(e => e.type === type); }
function firstHero(adapter) { return adapter.getViewModel().heroes[0]; }
function firstEnemy(adapter) { return adapter.getViewModel().enemies[0]; }
function firstOffer(adapter) { return adapter.getViewModel().shop.offers[0]; }
function placeHeroToHit(adapter, hero, target) {
  const candidates = [
    { pos: { r: target.position.r, c: target.position.c - 1 }, dir: 'right' },
    { pos: { r: target.position.r, c: target.position.c + 1 }, dir: 'left' },
    { pos: { r: target.position.r - 1, c: target.position.c }, dir: 'down' },
    { pos: { r: target.position.r + 1, c: target.position.c }, dir: 'up' }
  ];
  const vm = adapter.getViewModel();
  const stand = candidates.find(x => x.pos.r >= 0 && x.pos.c >= 0 && x.pos.r < vm.board.rows && x.pos.c < vm.board.cols && !vm.board.cells.find(c => c.r === x.pos.r && c.c === x.pos.c)?.unitId);
  assert.ok(stand, '应该能找到一个可命中目标的空站位');
  adapter.moveHero(hero.id, stand.pos);
  adapter.setActionDirection(hero.id, 0, stand.dir);
  return stand;
}

test('OP01 原包式流程：开始战斗进入 player_turn 并生成棋盘/格子/预览/威胁字段', () => {
  const a = createYSBZSUIAdapter({ gold: 12 });
  const r = a.startBattle();
  assert.ok(hasEvent(r, 'BATTLE_START'));
  const vm = a.getViewModel();
  assert.equal(vm.phase, 'player_turn');
  assert.equal(vm.board.rows, 8);
  assert.equal(vm.board.cols, 8);
  assert.equal(vm.board.cells.length, 64);
  assert.ok(Array.isArray(vm.previewGrid));
  assert.ok(Array.isArray(vm.threatGrid));
  assert.ok(vm.heroes[0].slots.length >= 1);
  assert.ok(vm.nextActions.some(x => x.type === 'USE_SLOT'));
});

test('OP02 选英雄→点空格→MOVE_HERO 会真实改变位置并更新 ViewModel', () => {
  const a = createYSBZSUIAdapter({ gold: 12 });
  a.startBattle();
  const h = firstHero(a);
  const from = h.position;
  const vm0 = a.getViewModel();
  const target = vm0.board.cells.find(c => !c.unitId && Math.abs(c.r - from.r) + Math.abs(c.c - from.c) <= h.ap) || { r: from.r, c: Math.min(7, from.c + 1) };
  a.selectHero(h.id);
  a.selectCell(target.r, target.c);
  const r = a.moveHero(h.id, { r: target.r, c: target.c });
  assert.ok(hasEvent(r, 'MOVE_HERO'));
  const moved = a.getViewModel().heroes.find(x => x.id === h.id);
  assert.deepEqual(moved.position, { r: target.r, c: target.c });
  assert.ok(a.getViewModel().board.cells.some(c => c.unitId === h.id));
});

test('OP03 行动槽方向按钮会改变 slot.direction 和 previewGrid', () => {
  const a = createYSBZSUIAdapter({ gold: 12 });
  a.startBattle();
  const h = firstHero(a);
  a.selectHero(h.id);
  const r = a.setActionDirection(h.id, 0, 'right');
  assert.ok(hasEvent(r, 'SET_ACTION_DIRECTION'));
  const slot = a.getViewModel().heroes.find(x => x.id === h.id).slots[0];
  assert.equal(slot.direction, 'right');
  assert.ok(a.getViewModel().previewGrid.length >= 1);
});

test('OP04 USE_SLOT 是手动施放，不等同 RUN_BATTLE，一次只产生一次槽操作和元素变化', () => {
  const a = createYSBZSUIAdapter({ gold: 12 });
  a.startBattle();
  const h = firstHero(a);
  const enemy = firstEnemy(a);
  assert.ok(enemy, '第1回合应该有敌人');
  const beforeRound = a.getViewModel().round;
  a.selectHero(h.id);
  placeHeroToHit(a, h, enemy);
  const r = a.useSlot(h.id, 0, enemy.position);
  assert.ok(hasEvent(r, 'PLAYER_SELECT_SLOT'));
  assert.ok(hasEvent(r, 'APPLY_ELEMENT'));
  assert.equal(a.getViewModel().round, beforeRound, '手动施放不会自动跑完整战斗');
  assert.equal(a.getViewModel().phase, 'player_turn');
});

test('OP05 END_PLAYER_TURN 统一结算并进入 round_end/monster_turn/battle_end 之一', () => {
  const a = createYSBZSUIAdapter({ gold: 12 });
  a.startBattle();
  const h = firstHero(a);
  const enemy = firstEnemy(a);
  placeHeroToHit(a, h, enemy);
  a.useSlot(h.id, 0, enemy.position);
  const r = a.endPlayerTurn();
  assert.ok(hasEvent(r, 'PLAYER_TURN_END'));
  assert.ok(['round_end', 'monster_turn', 'battle_end'].includes(a.getViewModel().phase));
});

test('OP06 START_NEXT_ROUND 能从 round_end 推进到下一玩家回合', () => {
  const a = createYSBZSUIAdapter({ gold: 12 });
  a.startBattle();
  const before = a.getViewModel().round;
  a.endPlayerTurn();
  const r = a.startNextRound();
  assert.ok(hasEvent(r, 'ROUND_START'));
  assert.ok(a.getViewModel().round >= before + 1);
  assert.equal(a.getViewModel().phase, 'player_turn');
});

test('OP07 GET_CELL_DETAIL 返回单位层/元素层/预览层/威胁层', () => {
  const a = createYSBZSUIAdapter({ gold: 12 });
  a.startBattle();
  const h = firstHero(a);
  const r = a.getCellDetail(h.position.r, h.position.c);
  assert.equal(r.ok, true);
  assert.ok(r.result.unit);
  assert.ok(r.result.elements);
  assert.ok(Object.prototype.hasOwnProperty.call(r.result, 'preview'));
  assert.ok(Object.prototype.hasOwnProperty.call(r.result, 'threat'));
});

test('OP08 怪物威胁/攻击路线在 ViewModel 暴露', () => {
  const a = createYSBZSUIAdapter({ gold: 12 });
  a.startBattle();
  const vm = a.getViewModel();
  assert.ok(Array.isArray(vm.monsterIntents));
  assert.ok(vm.monsterIntents.length >= 1);
  assert.ok(vm.monsterIntents[0].targetId);
  assert.ok(Array.isArray(vm.monsterIntents[0].path));
});

test('OP09 阵容上阵/下阵/出售影响 inventory active/bench/gold', () => {
  const a = createYSBZSUIAdapter({ gold: 12 });
  const inv = a.getViewModel().inventory.active[0];
  const toggled = a.toggleUnitActive(inv.instanceId);
  assert.ok(hasEvent(toggled, 'TOGGLE_UNIT_ACTIVE'));
  assert.ok(a.getViewModel().inventory.bench.some(x => x.instanceId === inv.instanceId));
  const beforeGold = a.getViewModel().gold;
  const sold = a.sellUnit(inv.instanceId);
  assert.ok(hasEvent(sold, 'SELL_UNIT'));
  assert.ok(a.getViewModel().gold > beforeGold);
});

test('OP10 battleTrace 可导出，可用 replay 命令读取', () => {
  const a = createYSBZSUIAdapter({ gold: 12 });
  a.runBattle();
  const exported = a.exportBattleTrace();
  assert.ok(hasEvent(exported, 'BATTLE_START') || exported.result.events.length > 0);
  assert.ok(exported.result.events.length > 0);
  const replay = a.replayBattleTrace(exported.result.events);
  assert.equal(replay.result.replayed, true);
});

test('OP11 商店仍能和细颗粒战斗流程连续工作', () => {
  const a = createYSBZSUIAdapter({ gold: 30 });
  a.startBattle();
  a.runBattle();
  a.rewardOptions('reward_pT1', 3);
  a.pickReward(0);
  a.enterShop('night_base', 6);
  const offer = firstOffer(a);
  assert.ok(offer);
  a.freezeOffer(offer.offerId);
  assert.equal(a.getViewModel().shop.offers.find(o => o.offerId === offer.offerId).frozen, true);
  a.unfreezeOffer(offer.offerId);
  a.buyOffer(offer.offerId);
  assert.ok(a.getEvents({ type: 'SHOP_BUY' }).length >= 1);
});

test('OP12 snapshot 只读隔离：改快照不会污染真实状态', () => {
  const a = createYSBZSUIAdapter({ gold: 12 });
  const snap = a.getStateSnapshot();
  snap.gold = 9999;
  snap.viewModel.gold = 9999;
  assert.notEqual(a.getViewModel().gold, 9999);
  assert.ok(snap.viewModel.board.cells.length === 64);
});
