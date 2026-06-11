const test = require('node:test');
const assert = require('node:assert/strict');
const { createYSBZSUIAdapter, PUBLIC_COMMANDS } = require('../src/uiAdapter.cjs');
const battle = require('../src/core/battle.cjs');
const { createGameState, getCell, syncBoardUnits } = require('../src/core/state.cjs');

function hasEvent(result, type) { return result.events.some(e => e.type === type); }
function firstLegalMoveCell(vm, hero) {
  const range = Number(hero.moveRange ?? hero.ap ?? 1);
  return vm.board.cells.find(cell => {
    if (cell.unitId) return false;
    const d = Math.abs(cell.r - hero.position.r) + Math.abs(cell.c - hero.position.c);
    return d > 0 && d <= range;
  });
}
function adjacentStandForTarget(state, target) {
  const candidates = [
    { pos: { r: target.position.r, c: target.position.c - 1 }, dir: 'right' },
    { pos: { r: target.position.r, c: target.position.c + 1 }, dir: 'left' },
    { pos: { r: target.position.r - 1, c: target.position.c }, dir: 'down' },
    { pos: { r: target.position.r + 1, c: target.position.c }, dir: 'up' }
  ];
  return candidates.find(x => {
    if (x.pos.r < 0 || x.pos.c < 0 || x.pos.r >= state.board.rows || x.pos.c >= state.board.cols) return false;
    const cell = getCell(state, x.pos.r, x.pos.c);
    return cell && !cell.unitId;
  });
}

test('UI01 适配层只暴露统一公开命令集合', () => {
  for (const type of ['START_BATTLE','MOVE_HERO','SET_ACTION_DIRECTION','USE_SLOT','END_PLAYER_TURN','RUN_MONSTER_TURN','BUILD_PREVIEW','GET_CELL_DETAIL','RUN_BATTLE','ENTER_SHOP','SELL_UNIT','TOGGLE_UNIT_ACTIVE']) assert.ok(PUBLIC_COMMANDS.includes(type), type);
});

test('UI02 getViewModel 提供 UI 展示所需数据且不暴露核心引用', () => {
  const adapter = createYSBZSUIAdapter({ gold: 8 });
  const vm = adapter.getViewModel();
  assert.equal(vm.meta.pets, 127);
  assert.equal(vm.meta.shop, 127);
  assert.ok(vm.heroes.length >= 1);
  assert.ok(Array.isArray(vm.nextActions));
  vm.gold = 999;
  assert.notEqual(adapter.getViewModel().gold, 999);
});

test('UI03 开始战斗只通过适配层命令，返回事件和 ViewModel', () => {
  const adapter = createYSBZSUIAdapter({ gold: 8 });
  const result = adapter.runBattle();
  assert.equal(result.ok, true);
  assert.equal(result.command, 'RUN_BATTLE');
  assert.ok(hasEvent(result, 'BATTLE_START'));
  assert.ok(result.viewModel.result);
});

test('UI04 奖励候选和选择奖励接入适配层', () => {
  const adapter = createYSBZSUIAdapter({ gold: 8 });
  adapter.runBattle();
  const options = adapter.rewardOptions('reward_pT1', 3);
  assert.ok(hasEvent(options, 'REWARD_OPTIONS'));
  assert.equal(adapter.getViewModel().rewards.length, 3);
  const before = adapter.getViewModel().inventory;
  const picked = adapter.pickReward(0);
  assert.ok(hasEvent(picked, 'REWARD_PICK'));
  assert.ok(adapter.getViewModel().inventory.items.length >= before.items.length || adapter.getViewModel().inventory.active.length >= before.active.length);
});

test('UI05 商店进入、刷新、冻结、解冻、购买全部走适配层', () => {
  const adapter = createYSBZSUIAdapter({ gold: 999 });
  const enter = adapter.enterShop('night_base', 6);
  assert.ok(hasEvent(enter, 'SHOP_ENTER'));
  assert.ok(hasEvent(enter, 'SHOP_ROLL'));
  const first = adapter.getViewModel().shop.offers[0];
  assert.ok(first.offerId);
  const frozen = adapter.freezeOffer(first.offerId);
  assert.ok(hasEvent(frozen, 'SHOP_FREEZE'));
  assert.equal(adapter.getViewModel().shop.offers[0].frozen, true);
  const unfrozen = adapter.unfreezeOffer(first.offerId);
  assert.ok(hasEvent(unfrozen, 'SHOP_UNFREEZE'));
  const roll = adapter.rollShop({ slots: 6 });
  assert.ok(hasEvent(roll, 'SHOP_ROLL'));
  const offer = adapter.getViewModel().shop.offers.find(o => o.price <= adapter.getViewModel().gold);
  assert.ok(offer);
  const buy = adapter.buyOffer(offer.offerId);
  assert.ok(hasEvent(buy, 'SHOP_BUY'));
});

test('UI06 商店事件和离店通过适配层', () => {
  const adapter = createYSBZSUIAdapter({ gold: 20 });
  adapter.enterShop('night_base', 6);
  const evt = adapter.getAvailableShopEvents()[0];
  assert.ok(evt.id);
  const applied = adapter.applyShopEvent(evt.id);
  assert.ok(hasEvent(applied, 'SHOP_EVENT_APPLY') || hasEvent(applied, 'SHOP_ROLL'));
  const exit = adapter.exitShop();
  assert.ok(hasEvent(exit, 'SHOP_EXIT'));
  assert.equal(adapter.getViewModel().phase, 'day_end');
});

test('UI07 runFullPlayerDayFlow 一次跑完战斗奖励商店闭环', () => {
  const adapter = createYSBZSUIAdapter({ gold: 8 });
  const vm = adapter.runFullPlayerDayFlow();
  const types = new Set(adapter.getEvents().map(e => e.type));
  for (const t of ['BATTLE_START','BATTLE_END','REWARD_OPTIONS','REWARD_PICK','SHOP_ENTER','SHOP_ROLL','SHOP_EXIT']) assert.ok(types.has(t), t);
  assert.equal(vm.phase, 'day_end');
  assert.ok(adapter.getTextReport('player').includes('全数据纯文字流程报告'));
  assert.ok(adapter.getTextReport('shop').includes('商店链路报告'));
});

test('UI08 未知 UI 命令会被拦截', () => {
  const adapter = createYSBZSUIAdapter();
  assert.throws(() => adapter.run('DIRECT_CORE_CALL'), /Unknown UI adapter command/);
});

test('UI09 UI 别名命令可用，但仍归一到公开 Command', () => {
  const adapter = createYSBZSUIAdapter({ gold: 8 });
  const result = adapter.run('enterShop', { poolId: 'night_base', slots: 3 });
  assert.equal(result.command, 'ENTER_SHOP');
  assert.ok(hasEvent(result, 'SHOP_ENTER'));
});

test('UI10 池查询和商品查询通过适配层', () => {
  const adapter = createYSBZSUIAdapter();
  assert.ok(adapter.getShopPools().includes('night_base'));
  assert.ok(adapter.getRewardPools().includes('reward_pT1'));
  assert.ok(adapter.getEnabledShopItems('night_base').length > 0);
  assert.equal(adapter.getDataSummary().validation, 10);
});

test('UI11 快照、变化、事件过滤和对象命令入口全部可用', () => {
  const adapter = createYSBZSUIAdapter({ gold: 8 });
  const enter = adapter.run({ type: 'ENTER_SHOP', poolId: 'night_base', slots: 3 });
  assert.ok(hasEvent(enter, 'SHOP_ENTER'));
  const snap = adapter.getStateSnapshot();
  assert.equal(snap.phase, 'shop');
  snap.gold = 999;
  assert.notEqual(adapter.getStateSnapshot().gold, 999);
  const shopEvents = adapter.getEvents({ type: 'SHOP_ENTER' });
  assert.equal(shopEvents.length, 1);
  const sinceEvents = adapter.getEvents({ sinceStep: 1 });
  assert.ok(sinceEvents.length >= shopEvents.length);
  assert.ok(Array.isArray(adapter.getChanges()));
});

test('UI12 非法命令形态会被拦截', () => {
  const adapter = createYSBZSUIAdapter();
  assert.throws(() => adapter.run(null), /must be a string or object/);
});

test('UI13 原包兼容命令 sell/toggle/select/slot/dir 全部通过适配层', () => {
  const adapter = createYSBZSUIAdapter({ gold: 8 });
  let result = adapter.run('SELECT_UNIT', { unitId: 'hero_compat' });
  assert.ok(hasEvent(result, 'SELECT_UNIT'));
  result = adapter.run('SELECT_CELL', { r: 2, c: 3 });
  assert.ok(hasEvent(result, 'SELECT_CELL'));
  result = adapter.run('USE_ACTION_SLOT', { slotId: 1 });
  assert.ok(hasEvent(result, 'USE_ACTION_SLOT'));
  result = adapter.run('SET_SLOT_DIR', { slotId: 1, dir: 'down' });
  assert.ok(hasEvent(result, 'SET_SLOT_DIR'));
  result = adapter.run('TOGGLE_UNIT_ACTIVE', { unitId: 'unit_pal_005' });
  assert.ok(hasEvent(result, 'TOGGLE_UNIT_ACTIVE'));
  const beforeGold = adapter.getViewModel().gold;
  result = adapter.run('SELL_UNIT', { petId: 'pal_005' });
  assert.ok(hasEvent(result, 'SELL_UNIT'));
  assert.ok(adapter.getViewModel().gold > beforeGold);
  result = adapter.run('SELL_UNIT', { petId: 'not_exists' });
  assert.ok(hasEvent(result, 'SELL_UNIT_BLOCKED'));
});

test('UI14 原包兼容门面方法 sellUnit/toggle/use/select/setDir 覆盖', () => {
  const adapter = createYSBZSUIAdapter({ gold: 8 });
  assert.ok(hasEvent(adapter.selectUnit('hero_1'), 'SELECT_UNIT'));
  assert.ok(hasEvent(adapter.selectCell(1, 2), 'SELECT_CELL'));
  assert.ok(hasEvent(adapter.useActionSlot(0), 'USE_ACTION_SLOT'));
  assert.ok(hasEvent(adapter.setSlotDir(0, 'left'), 'SET_SLOT_DIR'));
  assert.ok(hasEvent(adapter.toggleUnitActive('unit_pal_006'), 'TOGGLE_UNIT_ACTIVE'));
  assert.ok(hasEvent(adapter.sellUnit('unit_pal_006'), 'SELL_UNIT'));
  assert.ok(hasEvent(adapter.run('SELL_UNIT', {}), 'SELL_UNIT_BLOCKED'));
});


test('UI15 战斗追踪导出与回放门面不串命令', () => {
  const adapter = createYSBZSUIAdapter({ gold: 8 });
  adapter.runBattle();
  const exported = adapter.exportBattleTrace();
  assert.equal(exported.command, 'EXPORT_BATTLE_TRACE');
  assert.ok(Array.isArray(exported.result.events));
  const replay = adapter.replayBattleTrace(exported.result.events);
  assert.equal(replay.command, 'REPLAY_BATTLE_TRACE');
  assert.ok(replay.result.events.length >= exported.result.events.length);
  const pack = adapter.exportReplay();
  assert.equal(pack.command, 'EXPORT_REPLAY');
  assert.ok(pack.result.battleTrace.length >= exported.result.events.length);
});

test('UI16 棋盘预览按整队摆位累计，当前主体跟随刚移动宠物', () => {
  const adapter = createYSBZSUIAdapter({ gold: 8, battleId: 'team_preview_accumulate' });
  adapter.startBattle();

  const vm0 = adapter.getViewModel();
  const [first, second] = vm0.heroes;
  assert.ok(first && second, '需要至少两只上阵宠物验证累计预览');
  assert.deepEqual(new Set(vm0.previewGrid.map(x => x.actorId)), new Set([first.id]));
  assert.equal(vm0.teamPlacementPreview.activeUnitId, first.id);
  assert.deepEqual(vm0.teamPlacementPreview.movedUnitIds, []);

  const secondTarget = firstLegalMoveCell(vm0, second);
  assert.ok(secondTarget, '第二只宠物需要有可移动空格');
  adapter.selectCell(secondTarget.r, secondTarget.c);
  adapter.moveHero(second.id, { r: secondTarget.r, c: secondTarget.c });
  const vm1 = adapter.getViewModel();
  assert.equal(vm1.teamPlacementPreview.activeUnitId, second.id);
  assert.deepEqual(vm1.teamPlacementPreview.movedUnitIds, [second.id]);
  assert.deepEqual(new Set(vm1.previewGrid.map(x => x.actorId)), new Set([second.id]));
  assert.ok(vm1.previewGrid.every(x => x.isActiveActor === true));

  const firstAfterSecond = vm1.heroes.find(x => x.id === first.id);
  const firstTarget = firstLegalMoveCell(vm1, firstAfterSecond);
  assert.ok(firstTarget, '第一只宠物需要有可移动空格');
  adapter.selectCell(firstTarget.r, firstTarget.c);
  adapter.moveHero(first.id, { r: firstTarget.r, c: firstTarget.c });
  const vm2 = adapter.getViewModel();
  assert.equal(vm2.teamPlacementPreview.activeUnitId, first.id);
  assert.deepEqual(vm2.teamPlacementPreview.movedUnitIds, [second.id, first.id]);
  assert.deepEqual(new Set(vm2.previewGrid.map(x => x.actorId)), new Set([second.id, first.id]));
  assert.ok(vm2.previewGrid.some(x => x.actorId === first.id && x.isActiveActor === true));
  assert.ok(vm2.previewGrid.some(x => x.actorId === second.id && x.isActiveActor === false));
  assert.ok(vm2.board.cells.some(cell => Array.isArray(cell.previews) && cell.previews.some(p => p.actorId === second.id)));
  assert.ok(vm2.board.cells.some(cell => Array.isArray(cell.previews) && cell.previews.some(p => p.actorId === first.id)));
});

test('UI17 棋盘预览伤害按元素成型结算而不是本次层数', () => {
  const state = createGameState({ activePets: ['pal_005'], battleId: 'preview_damage_sandbox' });
  battle.startBattle(state);
  const actor = state.units.find(u => u.side === 'hero');
  const target = state.units.find(u => u.side === 'enemy' && u.alive);
  assert.ok(actor && target, '需要我方和敌方单位');
  const stand = adjacentStandForTarget(state, target);
  assert.ok(stand, '需要敌人旁边有可站位');

  actor.position = stand.pos;
  actor.element = '火';
  actor.shape = Object.assign({}, actor.shape, { baseLayers: 1, hitCells: 1, slotCount: 1, slotElements: ['火'] });
  target.shield = 2;
  target.def = 0;
  state.actionDirs[`${actor.id}:slot0`] = stand.dir;
  syncBoardUnits(state);
  const targetCell = getCell(state, target.position.r, target.position.c);
  targetCell.elements.火 = 2;
  targetCell.elementCamps.火 = 'player';

  const previews = battle.buildPreviewGrid(state, { unitId: actor.id, slotId: 0 });
  const hit = previews.find(p => p.targetId === target.id);
  assert.ok(hit, '预览需要命中目标');
  assert.equal(hit.projectedElementsBeforeSettle.火, 3);
  assert.equal(hit.projectedElements.火, 0);
  assert.equal(hit.settlement.layers, 3);
  assert.equal(hit.predictedDamage, 6, '火2+本次火1达到3层时，应预估Σ(1..3)=6点伤害');
  assert.equal(hit.predictedShieldDamage, 2);
  assert.equal(hit.predictedHpDamage, 4);
  assert.equal(hit.predictedShieldFrom, 2);
  assert.equal(hit.predictedShieldTo, 0);
  assert.equal(hit.predictedHpTo, target.hp - 4);
});
