const test = require('node:test');
const assert = require('node:assert/strict');
const { createYSBZSUIAdapter, createViewModel, PUBLIC_COMMANDS } = require('../src/uiAdapter.cjs');
const battle = require('../src/core/battle.cjs');
const dayRoute = require('../src/core/dayRoute.cjs');
const { dispatch } = require('../src/core/reducer.cjs');
const { createGameState, makeUnit, getCell, syncBoardUnits } = require('../src/core/state.cjs');

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
  for (const type of ['START_BATTLE','MOVE_HERO','AUTO_POSITION_HEROES','SET_ACTION_DIRECTION','USE_SLOT','RUN_PLAYER_ALL_OUT','END_PLAYER_TURN','RUN_MONSTER_TURN','BUILD_PREVIEW','GET_CELL_DETAIL','PREVIEW_MANUAL_FLOW','RUN_BATTLE','ENTER_SHOP','SELL_UNIT','TOGGLE_UNIT_ACTIVE','CLEAR_SELECTION']) assert.ok(PUBLIC_COMMANDS.includes(type), type);
  for (const type of ['GENERATE_NODE_OPTIONS','PICK_NODE','GENERATE_BATTLE_OPTIONS','PICK_BATTLE_ENCOUNTER','RUN_ROUTE_FIXED_BATTLE','CLAIM_ROUTE_REWARD','RUN_FULL_RUN']) assert.ok(PUBLIC_COMMANDS.includes(type), type);
});

test('UI01B CLEAR_SELECTION clears per-player unit, slot, and cell selection without changing game state', () => {
  const adapter = createYSBZSUIAdapter({ gold: 8, battleId: 'clear_selection' });
  const before = adapter.getViewModel();
  const heroId = before.heroes[0].id;
  adapter.run({ type: 'SELECT_UNIT', unitId: heroId, playerId: 'p1', commandId: 'clear_sel_1', baseStateVersion: before.stateVersion });
  adapter.run({ type: 'SELECT_SLOT', unitId: heroId, slotId: 0, playerId: 'p1', commandId: 'clear_sel_2', baseStateVersion: before.stateVersion });
  adapter.run({ type: 'SELECT_CELL', r: 2, c: 3, playerId: 'p1', commandId: 'clear_sel_3', baseStateVersion: before.stateVersion });

  const cleared = adapter.run({ type: 'CLEAR_SELECTION', playerId: 'p1', commandId: 'clear_sel_4', baseStateVersion: before.stateVersion });

  assert.equal(cleared.ephemeral, true);
  assert.equal(cleared.stateVersion, before.stateVersion);
  assert.equal(cleared.stateHash, before.stateHash);
  assert.deepEqual(adapter.getViewModel('p1').selected, { unitId: null, slotId: null, cell: null, direction: 'right' });
});

test('UI03C 智能调整站位只移动未移动宠物并提升预计伤害', () => {
  const state = createGameState({ activePets: ['pal_005'], battleId: 'auto_position_heroes' });
  battle.startBattle(state);
  const actor = state.units.find(u => u.side === 'hero' && u.alive);
  const target = state.units.find(u => u.side === 'enemy' && u.alive);
  assert.ok(actor && target, '需要我方和敌方单位');
  for (const other of state.units.filter(u => u.side === 'enemy' && u.id !== target.id)) {
    other.alive = false;
    other.hp = 0;
    other.position = null;
  }

  actor.position = { r: 5, c: 1 };
  actor.moveRange = 4;
  actor.atk = 5;
  actor.shape = Object.assign({}, actor.shape, { baseLayers: 1, hitCells: 1, slotCount: 1, slotElements: ['火'] });
  actor.actionSlotsUsed = {};
  actor.hasAttacked = false;
  target.position = { r: 5, c: 4 };
  target.hp = 20;
  target.shield = 0;
  target.def = 0;
  state.actionDirs[`${actor.id}:slot0`] = 'right';
  syncBoardUnits(state);

  const beforePreview = battle.buildPreviewGrid(state, { unitId: actor.id });
  assert.equal(beforePreview.some(p => p.targetId === target.id), false, '移动前不应命中目标');

  const result = dispatch(state, { type: 'AUTO_POSITION_HEROES' });
  assert.equal(result.ok, true);
  assert.equal(result.moves.length, 1);
  assert.deepEqual(actor.position, { r: 5, c: 3 });
  assert.equal(actor.hasAttacked, false, '智能站位不能自动出手');
  assert.deepEqual(actor.actionSlotsUsed, {}, '智能站位不能消耗行动槽');
  assert.ok(state.events.some(e => e.type === 'AUTO_POSITION_HEROES'));

  const afterPreview = battle.buildPreviewGrid(state, { unitId: actor.id });
  const hit = afterPreview.find(p => p.targetId === target.id);
  assert.ok(hit, '移动后应形成可命中的预计伤害');
  assert.equal(hit.predictedActionDamage, actor.atk);
});

test('UI02 getViewModel 提供 UI 展示所需数据且不暴露核心引用', () => {
  const adapter = createYSBZSUIAdapter({ gold: 8 });
  const vm = adapter.getViewModel();
  assert.equal(vm.meta.pets, 127);
  assert.equal(vm.meta.shop, 127);
  assert.ok(vm.heroes.length >= 1);
  assert.ok(Array.isArray(vm.nextActions));
  assert.ok(vm.dailyFlow, 'daily flow page should read a public ViewModel surface');
  assert.equal(vm.dailyFlow.day, 1);
  assert.equal(vm.dailyFlow.totalSteps, 6);
  assert.equal(vm.dailyFlow.steps[0].status, 'next');
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
  const allEvents = adapter.getEvents();
  assert.ok(allEvents.length > 30, 'RUN_BATTLE should produce enough events to catch truncated ViewModel output');
  assert.equal(result.viewModel.events.length, allEvents.length, 'ViewModel events should keep the full browser-visible history');
  assert.equal(result.viewModel.events[0].step, allEvents[0].step, 'browser event history should start from the first event');
});

test('UI03B 我方全部出击通过公开批量命令逐个走核心 USE_SLOT', () => {
  const adapter = createYSBZSUIAdapter({ gold: 8 });
  adapter.startBattle();
  const result = adapter.runPlayerAllOut();
  assert.equal(result.ok, true);
  assert.equal(result.command, 'RUN_PLAYER_ALL_OUT');
  assert.ok(result.result.count > 1);
  assert.ok(result.events.filter(e => e.type === 'PLAYER_SELECT_SLOT').length > 1);
  const leftovers = result.viewModel.heroes
    .filter(h => h.alive !== false)
    .filter(h => Number(h.availableAp ?? h.ap ?? 0) > 0 || (h.slots || []).some(s => !s.used && s.canUse !== false));
  assert.deepEqual(leftovers, []);
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

test('UI06B 商店刷新控制状态进入 ViewModel', () => {
  const adapter = createYSBZSUIAdapter({ day: 1, gold: 20 });
  adapter.enterShop('night_base', 6);
  adapter.applyShopEvent('evt_free_roll');
  adapter.applyShopEvent('evt_discount');
  const applied = adapter.applyShopEvent('evt_shop_fire');
  assert.ok(hasEvent(applied, 'SHOP_TARGETED_RESTOCK'));
  const targetedEvent = applied.events.find(e => e.type === 'SHOP_TARGETED_RESTOCK');
  assert.equal(targetedEvent.restock.eventId, 'evt_shop_fire');
  assert.equal(targetedEvent.restock.poolId, 'elem_火');
  const vm = adapter.getViewModel();
  const vmTargetedEvent = vm.events.find(e => e.type === 'SHOP_TARGETED_RESTOCK');
  assert.equal(vmTargetedEvent.restock.eventId, 'evt_shop_fire');
  assert.equal(vmTargetedEvent.restock.poolId, 'elem_火');
  assert.equal(vm.shop.refreshState.freeRolls, 1);
  assert.equal(vm.shop.refreshState.nextDiscount, 0);
  assert.equal(vm.shop.refreshState.lastRoll.discountApplied, 50);
  assert.ok(vm.shop.refreshState.targetedRestocks.some(x => x.poolId === 'elem_火' && x.status === 'applied'));
  assert.equal(vm.shop.refreshState.lastRoll.poolId, 'elem_火');
  const restock = vm.shop.refreshState.targetedRestocks.find(x => x.eventId === 'evt_shop_fire');
  assert.ok(restock.offerIds.length > 0, 'targeted restock should record generated offer ids');
  const sourcedOffers = vm.shop.offers.filter(o => o.restock && o.restock.restockId === restock.restockId);
  assert.equal(sourcedOffers.length, restock.offerIds.length, 'ViewModel offers should keep restock provenance');
  assert.ok(sourcedOffers.every(o => o.restock.eventId === 'evt_shop_fire'));
  assert.ok(sourcedOffers.every(o => o.restock.name === '火元素补货'));
  assert.ok(sourcedOffers.every(o => o.restock.poolId === 'elem_火'));
  assert.ok(sourcedOffers.every(o => o.restock.tags.includes('火')));
  assert.match(adapter.getTextReport('shop'), /补货[:：]火元素补货/);
});

test('UI06C 购买定向补货商品会把来源写入背包和购买事件', () => {
  const adapter = createYSBZSUIAdapter({ day: 1, gold: 999 });
  adapter.enterShop('night_base', 6);
  adapter.applyShopEvent('evt_shop_fire');
  const offer = adapter.getViewModel().shop.offers.find(o => o.restock?.eventId === 'evt_shop_fire');
  assert.ok(offer, 'targeted restock should create a buyable sourced offer');
  const buy = adapter.buyOffer(offer.offerId);
  assert.ok(hasEvent(buy, 'SHOP_BUY'));
  const buyEvent = buy.events.find(e => e.type === 'SHOP_BUY');
  assert.equal(buyEvent.inventory.acquiredFrom.eventId, 'evt_shop_fire');
  assert.equal(buyEvent.inventory.acquiredFrom.name, '火元素补货');
  assert.equal(buyEvent.inventory.acquiredFrom.poolId, 'elem_火');
  assert.equal(buyEvent.inventory.acquiredFrom.type, 'restock_offer');
  const bought = adapter.getViewModel().inventory.items.find(x => x.instanceId === buyEvent.inventory.instanceId);
  assert.ok(bought, 'bought inventory entry should be visible in ViewModel inventory');
  assert.equal(bought.acquiredFrom.eventId, 'evt_shop_fire');
  assert.equal(bought.acquiredFrom.name, '火元素补货');
  assert.match(adapter.getTextReport('player'), /来源[:：]火元素补货/);
});

test('UI07 runFullPlayerDayFlow 一次跑完战斗奖励商店闭环', () => {
  const adapter = createYSBZSUIAdapter({ gold: 8 });
  const vm = adapter.runFullPlayerDayFlow();
  const types = new Set(adapter.getEvents().map(e => e.type));
  for (const t of ['NODE_OPTIONS','NODE_PICK','BATTLE_OPTIONS','BATTLE_PICK','BATTLE_START','BATTLE_END','FIXED_BATTLE_START']) assert.ok(types.has(t), t);
  assert.equal(types.has('REWARD_OPTIONS'), true);
  assert.equal(types.has('REWARD_PICK'), true);
  assert.equal(vm.phase, 'day_end');
  assert.ok(adapter.getTextReport('player').includes('全数据纯文字流程报告'));
  assert.ok(adapter.getTextReport('shop').includes('节点'));
});
test('UI07G RUN_FULL_RUN 通过公开命令跑到 Day10 终局并保留跨天成长', () => {
  const adapter = createYSBZSUIAdapter({ day: 1, gold: 999, seed: 'full_run_ui' });
  const before = adapter.getViewModel();
  assert.ok(before.nextActions.some(x => x.type === 'RUN_FULL_RUN'), 'full run should be exposed as a player action');
  const result = adapter.run('RUN_FULL_RUN', { fromDay: 1, toDay: 10, gold: 999 });
  assert.equal(result.accepted, true);
  assert.equal(result.viewModel.day, 10);
  assert.equal(result.viewModel.phase, 'day_end');
  assert.ok(result.viewModel.dayRoute.terminal, 'full run should end with terminal state');
  assert.equal(result.viewModel.dayRoute.terminal.kind, 'final_boss');
  assert.equal(result.viewModel.terminalSummary.nextStepText, '查看终局报告');
  assert.equal(result.viewModel.nextActions.some(x => ['PICK_REWARD', 'CLAIM_ROUTE_REWARD'].includes(x.type)), false, 'terminal run should not keep reward actions as next steps');
  assert.equal(result.viewModel.dayRouteRuns.length, 10);
  assert.ok(result.viewModel.dayRouteRuns[9].construction.buildCore.summaryText);
  assert.ok(adapter.getTextReport().includes('【跨天成长】'));
});

test('UI07B Day1 节点选择和中午遭遇选择通过适配层公开命令推进', () => {
  const adapter = createYSBZSUIAdapter({ day: 1, gold: 20, seed: 'route_ui_test' });
  const nodeOptions = adapter.generateNodeOptions();
  assert.ok(hasEvent(nodeOptions, 'NODE_OPTIONS'));
  assert.equal(nodeOptions.viewModel.dayRoute.options.length, 3);
  assert.equal(nodeOptions.viewModel.dailyFlow.steps[0].status, 'current');
  const firstNode = nodeOptions.viewModel.dayRoute.options[0];
  assert.equal(firstNode.choicePreview.kindLabel, '事件');
  assert.ok(firstNode.choicePreview.summary.includes('免费刷新'));
  assert.ok(firstNode.choicePreview.gainText.includes('免费刷新+1'));
  assert.equal(firstNode.choicePreview.costText, '无');
  assert.ok(firstNode.choicePreview.tags.includes('经济'));
  const pickedNode = adapter.pickNode(firstNode.optionId);
  assert.ok(hasEvent(pickedNode, 'NODE_PICK'));
  assert.equal(pickedNode.viewModel.dailyFlow.steps[0].status, 'done');
  const battleOptions = adapter.run('GENERATE_BATTLE_OPTIONS', { scheduleStep: 3 });
  assert.ok(hasEvent(battleOptions, 'BATTLE_OPTIONS'));
  assert.equal(battleOptions.viewModel.dayRoute.battleOptions.length, 3);
  const firstBattle = battleOptions.viewModel.dayRoute.battleOptions[0];
  assert.equal(firstBattle.choicePreview.kindLabel, '遭遇');
  assert.ok(firstBattle.choicePreview.summary.includes(firstBattle.phaseLabel));
  assert.ok(firstBattle.choicePreview.tags.includes('战斗压力'));
  const pickedBattle = adapter.pickBattleEncounter(battleOptions.viewModel.dayRoute.battleOptions[0].encounterId);
  assert.ok(hasEvent(pickedBattle, 'BATTLE_PICK'));
  assert.equal(pickedBattle.viewModel.dayRoute.currentEncounter.phaseLabel, '中午战');
});

test('UI07C 路线商店摊位身份进入 ViewModel', () => {
  const adapter = createYSBZSUIAdapter({ day: 1, gold: 999 });
  adapter.generateNodeOptions({ count: 6 });
  const picked = adapter.pickNode('node_shop_fire');
  assert.equal(picked.viewModel.phase, 'shop');
  assert.equal(picked.viewModel.shop.activeStall.nodeId, 'node_shop_fire');
  assert.equal(picked.viewModel.shop.activeStall.name, '火系补货商人');
  assert.deepEqual(picked.viewModel.shop.activeStall.tags, ['元素','火']);
  assert.ok(picked.viewModel.shop.offers.every(o => o.poolId === 'elem_火' && o.element === '火'));
});

test('UI07D 路线战斗 pending reward 进入玩家可领取动作', () => {
  const state = createGameState({ day: 1, gold: 20 });
  dayRoute.ensureDayRoute(state);
  state.dayRoute.history.push({ kind: 'battle_choice', option: { encounterId: 'enc_reward_ui', name: '奖励UI测试战', phaseLabel: '中午战' } });
  dayRoute.recordBattleOutcome(state, { encounterId: 'enc_reward_ui', name: '奖励UI测试战', phaseLabel: '中午战' }, { code: 'WIN', win: true, grade: 'A' }, state.gold, { kind: 'battle_choice' });

  const vm = createViewModel(state);
  const pending = vm.dayRoute.pendingRewards[0];
  assert.ok(pending, 'route battle should create a pending reward');
  assert.equal(pending.claimed, false);
  assert.ok(vm.nextActions.some(x => x.type === 'CLAIM_ROUTE_REWARD' && x.defaultPayload.rewardId === pending.rewardId));

  const claimResult = dispatch(state, { type: 'CLAIM_ROUTE_REWARD', rewardId: pending.rewardId, rewardIndex: 0 });
  assert.ok(claimResult.selectedReward);
  const claimedVm = createViewModel(state);
  assert.equal(claimedVm.dayRoute.pendingRewards.length, 0);
  assert.equal(claimedVm.dayRoute.claimedRewards.length, 1);
  assert.ok(claimedVm.dayRoute.claimedRewards[0].selectedReward);
  assert.equal(claimedVm.rewards.length, 0);
  assert.equal(claimedVm.nextActions.some(x => x.type === 'PICK_REWARD'), false);
  assert.ok(state.events.some(e => e.type === 'ROUTE_REWARD_CLAIM'));
});

test('UI07E 固定战和终局 Boss 通过公开路线命令进入', () => {
  const state = createGameState({ day: 10, gold: 999 });
  dayRoute.ensureDayRoute(state);
  state.dayRoute.nodeIndex = 5;
  state.phase = 'node_resolved';

  const beforeVm = createViewModel(state);
  const action = beforeVm.nextActions.find(x => x.type === 'RUN_ROUTE_FIXED_BATTLE');
  assert.ok(action, 'fixed battle should be exposed as a player route action');
  assert.match(action.label, /终局Boss战|固定战|终局战/);

  const result = dispatch(state, { type: 'RUN_ROUTE_FIXED_BATTLE' });
  assert.equal(result, true);
  assert.equal(state.phase, 'day_end');
  assert.ok(state.dayRoute.history.some(x => x.kind === 'fixed_battle' && x.option.encounterId === 'enc_d10_final_boss'));
  assert.ok(state.dayRoute.battleOutcomes.some(x => x.kind === 'fixed_battle' && x.encounterId === 'enc_d10_final_boss'));
  assert.ok(state.dayRoute.terminal && state.dayRoute.terminal.kind === 'final_boss');
  assert.ok(state.events.some(e => e.type === 'FIXED_BATTLE_START'));
  assert.ok(state.events.some(e => e.type === 'RUN_TERMINAL'));
});

test('UI07F 路线遭遇和固定战暴露战前压力预览', () => {
  const adapter = createYSBZSUIAdapter({ day: 6, gold: 20, seed: 'pressure-preview' });
  const optionsResult = adapter.run('GENERATE_BATTLE_OPTIONS', { scheduleStep: 3 });
  assert.ok(hasEvent(optionsResult, 'BATTLE_OPTIONS'));
  const firstBattle = optionsResult.viewModel.dayRoute.battleOptions[0];
  assert.ok(firstBattle.pressurePreview, 'battle option should expose pressure preview');
  assert.equal(firstBattle.pressurePreview.wavePeriod, firstBattle.wavePeriod);
  assert.equal(firstBattle.pressurePreview.pressureTier, '高压');
  assert.ok(firstBattle.pressurePreview.totalThreat > 0);
  assert.ok(firstBattle.pressurePreview.peakThreat > 0);
  assert.ok(firstBattle.pressurePreview.totalSpawnCount > 0);
  assert.match(firstBattle.pressurePreview.rewardText, /精英|奖励/);

  const state = createGameState({ day: 10, gold: 999 });
  dayRoute.ensureDayRoute(state);
  state.dayRoute.nodeIndex = 5;
  state.phase = 'node_resolved';
  const action = createViewModel(state).nextActions.find(x => x.type === 'RUN_ROUTE_FIXED_BATTLE');
  assert.ok(action.defaultPayload.pressurePreview, 'fixed battle action should carry pressure preview');
  assert.equal(action.defaultPayload.pressurePreview.pressureTier, '终局');
  assert.match(action.defaultPayload.pressurePreview.summary, /终局|Boss/);
  assert.ok(action.defaultPayload.pressurePreview.totalSpawnCount > 0);
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
  const blockedReward = adapter.run('claimRouteReward');
  assert.equal(blockedReward.command, 'CLAIM_ROUTE_REWARD');
  assert.ok(hasEvent(blockedReward, 'ROUTE_REWARD_BLOCKED'));
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
  const heroIds = new Set(vm0.heroes.map(x => x.id));
  assert.deepEqual(new Set(vm0.previewGrid.map(x => x.actorId)), heroIds, '未移动时预览应按当前全队占位模拟全部出击');
  assert.equal(vm0.teamPlacementPreview.activeUnitId, first.id);
  assert.deepEqual(vm0.teamPlacementPreview.movedUnitIds, []);

  const secondTarget = firstLegalMoveCell(vm0, second);
  assert.ok(secondTarget, '第二只宠物需要有可移动空格');
  adapter.selectCell(secondTarget.r, secondTarget.c);
  adapter.moveHero(second.id, { r: secondTarget.r, c: secondTarget.c });
  const vm1 = adapter.getViewModel();
  assert.equal(vm1.teamPlacementPreview.activeUnitId, second.id);
  assert.deepEqual(vm1.teamPlacementPreview.movedUnitIds, [second.id]);
  assert.deepEqual(new Set(vm1.previewGrid.map(x => x.actorId)), heroIds, '移动一只宠物后仍应按全队未来占位模拟全部出击');
  assert.ok(vm1.previewGrid.some(x => x.actorId === second.id && x.isActiveActor === true));
  assert.ok(vm1.previewGrid.some(x => x.actorId === first.id && x.isActiveActor === false));

  const firstAfterSecond = vm1.heroes.find(x => x.id === first.id);
  const firstTarget = firstLegalMoveCell(vm1, firstAfterSecond);
  assert.ok(firstTarget, '第一只宠物需要有可移动空格');
  adapter.selectCell(firstTarget.r, firstTarget.c);
  adapter.moveHero(first.id, { r: firstTarget.r, c: firstTarget.c });
  const vm2 = adapter.getViewModel();
  assert.equal(vm2.teamPlacementPreview.activeUnitId, first.id);
  assert.deepEqual(vm2.teamPlacementPreview.movedUnitIds, [second.id, first.id]);
  assert.deepEqual(new Set(vm2.previewGrid.map(x => x.actorId)), heroIds);
  assert.ok(vm2.previewGrid.some(x => x.actorId === first.id && x.isActiveActor === true));
  assert.ok(vm2.previewGrid.some(x => x.actorId === second.id && x.isActiveActor === false));
  assert.ok(vm2.board.cells.some(cell => Array.isArray(cell.previews) && cell.previews.some(p => p.actorId === second.id)));
  assert.ok(vm2.board.cells.some(cell => Array.isArray(cell.previews) && cell.previews.some(p => p.actorId === first.id)));
});

test('UI16B 棋盘预览不把我方行动结算成友方受伤', () => {
  const adapter = createYSBZSUIAdapter({ gold: 3, battleId: 'team_preview_no_friendly_damage' });
  adapter.setupDay7FireTrial();

  const vm = adapter.getViewModel();
  const heroIds = new Set(vm.heroes.map(hero => hero.id));
  const allyHits = vm.previewGrid.filter(p => heroIds.has(p.targetId));
  assert.equal(allyHits.length, 0, '我方全队预览不能把友方单位当成伤害目标');

  const allyDamageCells = vm.board.cells.filter(cell =>
    (cell.previews || []).some(p => heroIds.has(p.targetId) || p.hitAlly || p.friendlyFire || Number(p.predictedDamage || 0) > 0 && heroIds.has(p.targetId))
  );
  assert.equal(allyDamageCells.length, 0, '友方所在格不能显示由我方行动生成的伤害预览');
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
  assert.equal(hit.predictedSettlementDamage, 6, '火2+本次火1达到3层时，应预估Σ(1..3)=6点元素伤害');
  assert.equal(hit.predictedActionDamage, actor.atk, '命中敌人时还应预估普通行动伤害');
  assert.equal(hit.predictedDamage, 8, '总预览伤害应包含元素结算和普通行动伤害');
  assert.equal(hit.predictedShieldDamage, 2);
  assert.equal(hit.predictedHpDamage, 6);
  assert.equal(hit.predictedShieldFrom, 2);
  assert.equal(hit.predictedShieldTo, 0);
  assert.equal(hit.predictedHpTo, target.hp - 6);
});

test('UI17B 棋盘预览汇总即将结算的未用行动槽和普通行动伤害', () => {
  const state = createGameState({ activePets: ['pal_005'], battleId: 'resolution_preview_all_slots' });
  battle.startBattle(state);
  const actor = state.units.find(u => u.side === 'hero' && u.alive);
  const target = state.units.find(u => u.side === 'enemy' && u.alive);
  assert.ok(actor && target, '需要我方和敌方单位');
  const stand = adjacentStandForTarget(state, target);
  assert.ok(stand, '需要敌人旁边有可站位');

  actor.position = stand.pos;
  actor.atk = 5;
  actor.shape = Object.assign({}, actor.shape, {
    baseLayers: 1,
    hitCells: 1,
    slotCount: 3,
    slotElements: ['火', '水', '风']
  });
  target.shield = 1;
  target.def = 0;
  target.hp = 20;
  for (const i of [0, 1, 2]) state.actionDirs[`${actor.id}:slot${i}`] = stand.dir;
  syncBoardUnits(state);

  const previews = battle.buildPreviewGrid(state, { unitId: actor.id });
  const hits = previews.filter(p => p.targetId === target.id);
  assert.deepEqual(hits.map(p => p.slotIndex), [0, 1, 2], '预览应覆盖所有即将可结算的未用行动槽');
  assert.deepEqual(hits.map(p => p.element), ['火', '水', '风']);
  assert.deepEqual(hits.map(p => p.predictedRawDamage), [5, 5, 5], '每个命中槽都应预估普通行动伤害');
  assert.deepEqual(hits.map(p => p.predictedDamage), [5, 5, 5]);
  assert.deepEqual(hits.map(p => p.predictedShieldDamage), [1, 0, 0]);
  assert.deepEqual(hits.map(p => p.predictedHpDamage), [4, 5, 5]);
  assert.deepEqual(hits.map(p => p.predictedHpTo), [16, 11, 6]);
});

test('UI18 可落点风险预览按每个落点模拟敌方伤害', () => {
  const state = createGameState({ activePets: ['pal_005'], battleId: 'move_target_risk_preview' });
  battle.startBattle(state);
  const hero = state.units.find(u => u.side === 'hero' && u.alive);
  const enemy = state.units.find(u => u.side === 'enemy' && u.alive);
  assert.ok(hero && enemy, '需要我方和敌方单位');
  for (const other of state.units.filter(u => u.side === 'enemy' && u.id !== enemy.id)) {
    other.alive = false;
    other.hp = 0;
    other.position = null;
  }

  hero.position = { r: 5, c: 1 };
  hero.moveRange = 4;
  hero.ap = 4;
  hero.def = 0;
  hero.shield = 2;
  hero.hp = 30;
  enemy.position = { r: 5, c: 4 };
  enemy.ap = 1;
  enemy.atk = 7;
  enemy.shape = Object.assign({}, enemy.shape, { hitCells: 1, slotCount: 1, slotElements: [enemy.element || '火'], baseLayers: 1 });
  state.actionDirs[`${enemy.id}:slot0`] = 'left';
  syncBoardUnits(state);

  const riskGrid = battle.buildMoveRiskGrid(state, hero.id);
  const risky = riskGrid.find(x => x.r === 5 && x.c === 3);
  assert.ok(risky, 'R5C3 应该被敌人从右向左命中');
  assert.equal(risky.damage, 7);
  assert.equal(risky.shieldDamage, 2);
  assert.equal(risky.hpDamage, 5);
  assert.deepEqual(risky.enemyIds, [enemy.id]);

  const adapter = createYSBZSUIAdapter({ gold: 8, battleId: 'move_target_risk_vm' });
  adapter.startBattle();
  const vm = adapter.getViewModel();
  assert.ok(Array.isArray(vm.moveRiskGrid), 'ViewModel 需要暴露 moveRiskGrid');
  assert.ok(vm.board.cells.every(cell => Object.prototype.hasOwnProperty.call(cell, 'moveRisk')), '棋盘格需要携带 moveRisk 字段');
});

test('UI19 累计风险会随后续宠物站位变化重算形状内所有命中单位', () => {
  const state = createGameState({ activePets: ['pal_005', 'pal_006'], battleId: 'team_risk_recompute' });
  battle.startBattle(state);
  const [first, second] = state.units.filter(u => u.side === 'hero' && u.alive);
  const enemy = state.units.find(u => u.side === 'enemy' && u.alive);
  assert.ok(first && second && enemy, '需要两只我方和一只敌方单位');
  for (const other of state.units.filter(u => u.side === 'enemy' && u.id !== enemy.id)) {
    other.alive = false;
    other.hp = 0;
    other.position = null;
  }

  first.position = { r: 5, c: 1 };
  first.moveRange = 4;
  first.def = 0;
  first.shield = 10;
  first.hp = 30;
  second.position = { r: 7, c: 1 };
  second.moveRange = 4;
  second.def = 0;
  second.shield = 0;
  second.hp = 30;
  enemy.position = { r: 5, c: 4 };
  enemy.ap = 1;
  enemy.atk = 7;
  enemy.shape = Object.assign({}, enemy.shape, { hitCells: 4, slotCount: 1, slotElements: [enemy.element || '火'], baseLayers: 1 });
  state.actionDirs[`${enemy.id}:slot0`] = 'left';
  state.teamPlacementPreview = { activeUnitId: first.id, movedUnitIds: [first.id] };
  syncBoardUnits(state);

  const before = battle.buildTeamRiskGrid(state, [first.id]);
  assert.equal(before.length, 1);
  assert.equal(before[0].unitId, first.id);
  assert.equal(before[0].damage, 7);

  second.position = { r: 5, c: 3 };
  state.teamPlacementPreview = { activeUnitId: second.id, movedUnitIds: [first.id, second.id] };
  syncBoardUnits(state);
  const after = battle.buildTeamRiskGrid(state, [first.id, second.id]);
  assert.ok(after.some(x => x.unitId === second.id), '第二只移动到更近命中线上后应成为受击目标');
  assert.ok(after.some(x => x.unitId === first.id), '敌方攻击形状覆盖到第一只时仍应保留受击风险');

  const moveRisks = battle.buildMoveRiskGrid(state, second.id);
  const candidate = moveRisks.find(x => x.r === 5 && x.c === 2);
  assert.ok(candidate, '候选落点需要携带整队风险预览');
  assert.ok(Array.isArray(candidate.teamRiskGrid));
});

test('UI20 候选落点沙盒同时重算我方打敌方预览', () => {
  const state = createGameState({ activePets: ['pal_005'], battleId: 'sandbox_team_placement_preview' });
  battle.startBattle(state);
  const actor = state.units.find(u => u.side === 'hero' && u.alive);
  const target = state.units.find(u => u.side === 'enemy' && u.alive);
  assert.ok(actor && target, '需要我方和敌方单位');
  for (const other of state.units.filter(u => u.side === 'enemy' && u.id !== target.id)) {
    other.alive = false;
    other.hp = 0;
    other.position = null;
  }

  actor.position = { r: 5, c: 1 };
  actor.moveRange = 4;
  actor.shape = Object.assign({}, actor.shape, { baseLayers: 1, hitCells: 1, slotCount: 1, slotElements: ['火'] });
  target.position = { r: 5, c: 4 };
  target.shield = 0;
  target.def = 0;
  state.actionDirs[`${actor.id}:slot0`] = 'right';
  syncBoardUnits(state);
  const targetCell = getCell(state, target.position.r, target.position.c);
  targetCell.elements.火 = 2;
  targetCell.elementCamps.火 = 'player';

  const actual = battle.buildPreviewGrid(state, { unitId: actor.id, slotId: 0 });
  assert.ok(!actual.some(p => p.targetId === target.id), '真实站位当前不应命中敌人');

  const candidates = battle.buildMoveRiskGrid(state, actor.id);
  const candidate = candidates.find(x => x.r === 5 && x.c === 3);
  assert.ok(candidate, 'R5C3 应是合法候选落点');
  assert.ok(Array.isArray(candidate.previewGrid), '候选落点需要携带沙盒 previewGrid');
  const hit = candidate.previewGrid.find(p => p.targetId === target.id);
  assert.ok(hit, '候选落点沙盒应命中敌人');
  assert.equal(hit.predictedSettlementDamage, 6);
  assert.equal(hit.predictedActionDamage, actor.atk);
  assert.equal(hit.predictedDamage, 8);
  assert.equal(hit.direction, 'right');
});

test('UI21 候选落点返回真实行动后的沙盒棋盘与单位结果', () => {
  const state = createGameState({ activePets: ['pal_005'], battleId: 'full_board_sandbox_preview' });
  battle.startBattle(state);
  const actor = state.units.find(u => u.side === 'hero' && u.alive);
  const target = state.units.find(u => u.side === 'enemy' && u.alive);
  assert.ok(actor && target, '需要我方和敌方单位');
  for (const other of state.units.filter(u => u.side === 'enemy' && u.id !== target.id)) {
    other.alive = false;
    other.hp = 0;
    other.position = null;
  }

  actor.position = { r: 5, c: 1 };
  actor.moveRange = 4;
  actor.shape = Object.assign({}, actor.shape, { baseLayers: 1, hitCells: 1, slotCount: 1, slotElements: ['火'] });
  target.position = { r: 5, c: 4 };
  target.hp = 20;
  target.shield = 0;
  target.def = 0;
  state.actionDirs[`${actor.id}:slot0`] = 'right';
  syncBoardUnits(state);
  const targetCell = getCell(state, target.position.r, target.position.c);
  targetCell.elements.火 = 3;
  targetCell.elementCamps.火 = 'player';
  const targetHpBefore = target.hp;

  const candidates = battle.buildMoveRiskGrid(state, actor.id);
  const candidate = candidates.find(x => x.r === 5 && x.c === 3);
  assert.ok(candidate, 'R5C3 应是合法候选落点');
  assert.equal(candidate.sandboxActionOk, true, '候选沙盒应真实执行第 1 行动槽');
  assert.ok(Array.isArray(candidate.sandboxBoardCells), '候选落点需要携带沙盒后的棋盘格');
  assert.ok(Array.isArray(candidate.sandboxUnits), '候选落点需要携带沙盒后的单位');
  assert.ok(Array.isArray(candidate.sandboxEvents), '候选落点需要携带沙盒事件');
  assert.ok(candidate.sandboxEvents.some(evt => evt.type === 'MOVE_HERO'), '候选沙盒必须先走正式 MOVE_HERO 链路，而不是直接改 position');
  assert.ok(Array.isArray(candidate.cellDiffs), '候选落点需要携带棋盘差异');
  assert.ok(Array.isArray(candidate.unitDiffs), '候选落点需要携带单位差异');

  const sandboxTarget = candidate.sandboxUnits.find(u => u.id === target.id);
  assert.ok(sandboxTarget, '沙盒单位结果需要包含目标敌人');
  assert.ok(sandboxTarget.hp < targetHpBefore, '真实行动沙盒需要扣除敌方 HP');
  const sandboxTargetCell = candidate.sandboxBoardCells.find(c => c.r === target.position.r && c.c === target.position.c);
  assert.ok(sandboxTargetCell, '沙盒棋盘需要包含目标格');
  assert.equal(sandboxTargetCell.elements.火, 0, '真实行动沙盒引爆后目标格火层应被清空');
  assert.ok(candidate.unitDiffs.some(diff => diff.id === target.id && diff.after.hp < diff.before.hp), '单位 diff 需要记录目标 HP 变化');
  assert.ok(candidate.cellDiffs.some(diff => diff.r === target.position.r && diff.c === target.position.c), '棋盘 diff 需要记录目标格变化');
  assert.ok(candidate.sandboxEvents.some(evt => evt.type === 'FIRE_EXPLODE_AFTER_ATTACK'), '沙盒事件需要保留真实结算事件');
});

test('UI22 未移动前伤害预览直接显示敌方宠物 AP 累计伤害', () => {
  const state = createGameState({ activePets: ['pal_005'], battleId: 'enemy_pet_baseline_damage_preview' });
  battle.startBattle(state);
  const hero = state.units.find(u => u.side === 'hero' && u.alive);
  const enemy = state.units.find(u => u.side === 'enemy' && u.alive);
  assert.ok(hero && enemy, '需要我方和敌方单位');
  for (const other of state.units.filter(u => u.side === 'enemy' && u.id !== enemy.id)) {
    other.alive = false;
    other.hp = 0;
    other.position = null;
  }

  hero.position = { r: 5, c: 3 };
  hero.def = 0;
  hero.shield = 0;
  hero.hp = 30;
  enemy.position = { r: 5, c: 4 };
  enemy.ap = 3;
  enemy.atk = 7;
  enemy.actionSlotsUsed = {};
  enemy.shape = Object.assign({}, enemy.shape, {
    hitCells: 1,
    slotCount: 3,
    slotElements: [enemy.element || '火', enemy.element || '火', enemy.element || '火'],
    baseLayers: 1
  });
  for (let i = 0; i < 3; i++) state.actionDirs[`${enemy.id}:slot${i}`] = 'left';
  syncBoardUnits(state);

  const vm = createViewModel(state);
  const risk = vm.teamRiskGrid.find(x => x.unitId === hero.id);
  assert.ok(risk, 'ViewModel 未移动前也应暴露我方单位受击预览');
  assert.equal(risk.damage, 21);
  assert.equal(risk.threats.length, 3);
  const cell = vm.board.cells.find(x => x.r === hero.position.r && x.c === hero.position.c);
  assert.equal(cell.teamRisk.damage, 21);
});

test('UI22C 手动流程预览走真实按钮命令并回滚当前局面', () => {
  const options = { activePets: ['pal_005'], battleId: 'manual_flow_preview_transaction' };
  const adapter = createYSBZSUIAdapter(options);
  adapter.run('START_BATTLE');
  adapter.run('SELECT_CELL', { r: 5, c: 3 });
  const before = adapter.getViewModel();
  const beforeSnapshot = adapter.getStateSnapshot();

  const preview = adapter.run('PREVIEW_MANUAL_FLOW', { limit: 2 });
  assert.equal(preview.ok, true);
  assert.equal(preview.readOnly, true);
  assert.equal(preview.result.rolledBack, true);
  assert.deepEqual(preview.result.commands.map(command => command.type), ['RUN_PLAYER_ALL_OUT', 'END_PLAYER_TURN']);

  const afterPreview = adapter.getViewModel();
  assert.equal(afterPreview.stateHash, before.stateHash, '预览结束后当前 stateHash 必须回到预览前');
  assert.equal(afterPreview.stateVersion, before.stateVersion, '预览结束后当前 stateVersion 必须回到预览前');
  assert.equal(afterPreview.phase, before.phase, '预览不能改变玩家当前阶段');
  const afterSnapshot = adapter.getStateSnapshot();
  assert.equal(afterSnapshot.nextCommand, beforeSnapshot.nextCommand, '预览不能消耗真实命令序号');
  assert.equal(afterSnapshot.commandLog.length, beforeSnapshot.commandLog.length, '预览不能写入真实 commandLog');
  assert.equal(afterSnapshot.events.length, beforeSnapshot.events.length, '预览不能写入真实事件流');
  assert.deepEqual(afterPreview.selected, before.selected, '预览不能改变显示层选中状态');

  const replay = createYSBZSUIAdapter(options);
  replay.run('START_BATTLE');
  replay.run('RUN_PLAYER_ALL_OUT');
  replay.run('END_PLAYER_TURN');
  const realAfterTwoButtons = replay.getViewModel();
  const projected = preview.result.viewModel;

  assert.equal(projected.phase, realAfterTwoButtons.phase);
  assert.equal(projected.round, realAfterTwoButtons.round);
  assert.deepEqual(projected.heroes.map(unit => ({ id: unit.id, hp: unit.hp, shield: unit.shield, alive: unit.alive, position: unit.position })), realAfterTwoButtons.heroes.map(unit => ({ id: unit.id, hp: unit.hp, shield: unit.shield, alive: unit.alive, position: unit.position })));
  assert.deepEqual(projected.enemies.map(unit => ({ id: unit.id, hp: unit.hp, shield: unit.shield, alive: unit.alive, position: unit.position })), realAfterTwoButtons.enemies.map(unit => ({ id: unit.id, hp: unit.hp, shield: unit.shield, alive: unit.alive, position: unit.position })));
  assert.equal(preview.result.cells.length, realAfterTwoButtons.board.cells.length, '预览需要带回全格子数据');
  assert.equal(preview.result.cellDetails.length, realAfterTwoButtons.board.cells.length, '预览需要带回每个格子的详情数据');
  assert.equal(preview.result.beforeCells.length, before.board.cells.length, '预览需要先记录执行前全格子数据');
  assert.equal(preview.result.beforeCellDetails.length, before.board.cells.length, '预览需要先记录执行前每个格子的详情数据');
  assert.ok(Array.isArray(preview.result.cellDiffs), '预览需要返回执行前后棋盘 diff');
  assert.ok(Array.isArray(preview.result.unitDiffs), '预览需要返回执行前后单位 diff');
  assert.ok(preview.result.cellDiffs.length > 0, '真实沙盒执行后应产生可渲染格子差异');
  assert.ok(preview.result.unitDiffs.length > 0, '真实沙盒执行后应产生可渲染单位差异');
  const projectedHero = projected.heroes.find(unit => unit.position);
  const projectedHeroDetail = preview.result.cellDetails.find(detail => detail.unit?.id === projectedHero.id);
  assert.ok(projectedHeroDetail, '预演详情必须能按单位 id 找到投影后的我方宠物详情');
  assert.equal(projectedHeroDetail.unit.quality, projectedHero.quality, '预演详情不能丢失品质字段，否则右侧优化版小标题会退化');
  assert.equal(projectedHeroDetail.unit.role, projectedHero.role, '预演详情不能丢失定位字段');
  assert.equal(projectedHeroDetail.unit.element, projectedHero.element, '预演详情不能丢失元素字段');
  assert.deepEqual(projectedHeroDetail.unit.shape, projectedHero.shape, '预演详情必须保留行动形状/技能字段');
  assert.deepEqual(projectedHeroDetail.unit.slots, projectedHero.slots, '预演详情必须保留行动块列表');
  assert.ok((projectedHeroDetail.unit.slots || []).length > 0, '预演详情里的宠物必须还有行动块用于右侧优化版展示');
  assert.ok(preview.result.events.some(event => event.type === 'PLAYER_TURN_END'), '预览事件必须来自正式结束回合命令');
});

test('UI22D 移动后的可渲染受伤信息来自沙盒全格子 diff 而不是 moveHero 单体风险', () => {
  const adapter = createYSBZSUIAdapter({ activePets: ['pal_005'], battleId: 'move_simulation_diff_preview' });
  adapter.run('START_BATTLE');
  const beforeMove = adapter.getViewModel();
  const hero = beforeMove.heroes.find(unit => unit.position);
  const targetCell = firstLegalMoveCell(beforeMove, hero);
  assert.ok(hero && targetCell, '需要一个可移动我方宠物和合法落点');

  const move = adapter.run('MOVE_HERO', { unitId: hero.id, to: { r: targetCell.r, c: targetCell.c } });
  assert.equal(move.ok, true);
  assert.ok(move.manualFlowPreview, 'MOVE_HERO 返回需要直接携带移动后的沙盒投影，避免前端延迟一拍显示');
  assert.deepEqual(move.manualFlowPreview.commands.map(command => command.type), ['RUN_PLAYER_ALL_OUT', 'END_PLAYER_TURN']);
  assert.ok(move.manualFlowPreview.cellDiffs.length > 0, '移动响应里的沙盒投影需要有全格子 diff');
  const moveEvent = move.events.find(event => event.type === 'MOVE_HERO');
  assert.ok(moveEvent, '移动应产生 MOVE_HERO 事件');
  assert.equal(Object.prototype.hasOwnProperty.call(moveEvent, 'riskBefore'), false, '移动核心不再记录单体 beforeRisk');
  assert.equal(Object.prototype.hasOwnProperty.call(moveEvent, 'riskAfter'), false, '移动核心不再记录单体 afterRisk');
  assert.doesNotMatch(moveEvent.text || '', /预计HP损失|预计护盾消耗|预计承受攻击/, '移动事件不再用单体风险变化当作受伤显示来源');

  const afterMove = adapter.getViewModel();
  const preview = adapter.run('PREVIEW_MANUAL_FLOW', { limit: 2 });
  assert.equal(preview.ok, true);
  assert.deepEqual(preview.result.commands.map(command => command.type), ['RUN_PLAYER_ALL_OUT', 'END_PLAYER_TURN']);
  assert.equal(preview.result.beforeCells.length, afterMove.board.cells.length);
  assert.equal(preview.result.cells.length, afterMove.board.cells.length);
  assert.ok(preview.result.events.some(event => event.type === 'RUN_PLAYER_ALL_OUT' || event.type === 'PLAYER_SELECT_SLOT'), '沙盒必须先执行我方全部行动');
  assert.ok(preview.result.events.some(event => event.type === 'ENEMY_PET_ACTION' || event.type === 'MONSTER_INTENT'), '沙盒必须执行敌方行动');
  assert.ok(preview.result.cellDiffs.length > 0, '执行前后全格子 diff 应提供给前端渲染');
  assert.ok(preview.result.unitDiffs.length > 0, '执行前后单位 diff 应提供给前端渲染');
});

test('UI22B 移动风险必须来自真实敌方宠物行动意图', () => {
  const state = createGameState({ activePets: [], battleId: 'reachable_main_threat_risk' });
  state.phase = 'player_turn';
  state.round = 1;
  state.units = [];
  state.leaders.player.position = { r: 7, c: 0 };
  state.leaders.enemy.position = { r: 0, c: 7 };
  const hero = makeUnit(state, 'hero', 'pal_038', {
    id: 'hero_wind_risk',
    hp: 10,
    maxHp: 10,
    def: 0,
    shield: 0,
    position: { r: 2, c: 5 }
  });
  const cat = makeUnit(state, 'enemy', 'pal_002', { id: 'enemy_cat_risk', position: { r: 1, c: 7 } });
  const sheep = makeUnit(state, 'enemy', 'pal_001', { id: 'enemy_sheep_risk', position: { r: 0, c: 6 } });
  state.units.push(hero, cat, sheep);
  syncBoardUnits(state);

  let risk = battle.buildTeamRiskGrid(state, [hero.id]).find(x => x.unitId === hero.id);
  assert.ok(risk, 'R2C5 应有受击预警');
  assert.equal(risk.damage, 7);
  assert.equal(risk.hpDamage, 7);
  assert.deepEqual(risk.enemyIds, [cat.id, sheep.id]);
  assert.equal(risk.threats.length, 3);
  assert.equal(risk.riskMode, undefined);

  hero.position = { r: 2, c: 6 };
  syncBoardUnits(state);
  risk = battle.buildTeamRiskGrid(state, [hero.id]).find(x => x.unitId === hero.id);
  assert.ok(risk, 'R2C6 应有受击预警');
  assert.equal(risk.damage, 8);
  assert.equal(risk.hpDamage, 8);
  assert.deepEqual(risk.enemyIds, [cat.id, sheep.id]);
  assert.equal(risk.threats.length, 4);
  assert.equal(risk.riskMode, undefined);
});

test('UI23 敌方移动路径预览标记最终落点且空格攻击范围不承载伤害对象', () => {
  const state = createGameState({ activePets: ['pal_005'], battleId: 'enemy_pet_final_move_preview' });
  battle.startBattle(state);
  const hero = state.units.find(u => u.side === 'hero' && u.alive);
  const enemy = state.units.find(u => u.side === 'enemy' && u.alive);
  assert.ok(hero && enemy, '需要我方和敌方单位');
  for (const other of state.units.filter(u => u.side === 'enemy' && u.id !== enemy.id)) {
    other.alive = false;
    other.hp = 0;
    other.position = null;
  }
  hero.position = { r: 5, c: 2 };
  enemy.position = { r: 5, c: 6 };
  enemy.ap = 3;
  enemy.atk = 3;
  enemy.shape = Object.assign({}, enemy.shape, { hitCells: 3, slotCount: 3, baseLayers: 1 });
  for (let i = 0; i < 3; i++) state.actionDirs[`${enemy.id}:slot${i}`] = 'left';
  syncBoardUnits(state);

  const vm = createViewModel(state);
  const movePath = vm.threatGrid.filter(x => x.type === 'move_path');
  assert.ok(movePath.length > 0, '默认战斗应暴露敌方预计移动路径');
  const finalMoves = movePath.filter(x => x.finalMove);
  assert.ok(finalMoves.length > 0, '敌方移动路径需要标记最终落点');
  const attackEmptyCells = vm.board.cells.filter(cell => !cell.unitId && cell.threat?.type === 'attack');
  assert.ok(attackEmptyCells.length > 0, '测试需要覆盖空格攻击范围');
  assert.ok(attackEmptyCells.every(cell => Number(cell.threat.damage || 0) === 0 && !(cell.teamRisk && cell.teamRisk.damage)), '空格攻击范围不应承载受伤单位伤害');
});

test('UI24 玩家移动事件只显示位移，受伤显示交给沙盒预览 diff', () => {
  const state = createGameState({ activePets: ['pal_005'], battleId: 'compact_move_event_log' });
  battle.startBattle(state);
  const hero = state.units.find(u => u.side === 'hero' && u.alive);
  const enemy = state.units.find(u => u.side === 'enemy' && u.alive);
  assert.ok(hero && enemy, '需要我方和敌方单位');
  for (const other of state.units.filter(u => u.side === 'enemy' && u.id !== enemy.id)) {
    other.alive = false;
    other.hp = 0;
    other.position = null;
  }

  hero.position = { r: 5, c: 0 };
  hero.moveRange = 4;
  hero.def = 0;
  hero.shield = 0;
  enemy.position = { r: 5, c: 4 };
  enemy.ap = 1;
  enemy.atk = 7;
  enemy.shape = Object.assign({}, enemy.shape, { hitCells: 2, slotCount: 1, baseLayers: 1 });
  state.actionDirs[`${enemy.id}:slot0`] = 'left';
  syncBoardUnits(state);

  assert.equal(battle.moveHero(state, hero.id, { r: 5, c: 2 }), true);
  const event = state.events.find(e => e.type === 'MOVE_HERO');
  assert.ok(event, '移动事件需要存在');
  assert.match(event.text, /R6C1->R6C3/);
  assert.doesNotMatch(event.text, /预计HP损失|预计护盾消耗|预计承受攻击/);
  assert.equal(Object.prototype.hasOwnProperty.call(event, 'riskBefore'), false);
  assert.equal(Object.prototype.hasOwnProperty.call(event, 'riskAfter'), false);
  assert.doesNotMatch(event.text, /本次影响|火0\/水0\/风0|无威胁|第\d+行第\d+列/);
});

test('UI25 施放行动槽日志同时显示怪物受伤和本次元素增加', () => {
  const state = createGameState({ activePets: ['pal_005'], battleId: 'compact_action_event_log' });
  battle.startBattle(state);
  const actor = state.units.find(u => u.side === 'hero' && u.alive);
  const target = state.units.find(u => u.side === 'enemy' && u.alive);
  assert.ok(actor && target, '需要我方和敌方单位');
  for (const other of state.units.filter(u => u.side === 'enemy' && u.id !== target.id)) {
    other.alive = false;
    other.hp = 0;
    other.position = null;
  }

  actor.position = { r: 5, c: 3 };
  actor.shape = Object.assign({}, actor.shape, { shapeName: '二格线', baseLayers: 1, hitCells: 2, slotCount: 1, slotElements: ['火'] });
  target.position = { r: 5, c: 4 };
  target.hp = 20;
  target.shield = 0;
  target.def = 0;
  state.actionDirs[`${actor.id}:slot0`] = 'right';
  syncBoardUnits(state);
  const targetCell = getCell(state, target.position.r, target.position.c);
  targetCell.elements.火 = 3;
  targetCell.elementCamps.火 = 'player';

  assert.equal(battle.useActionSlot(state, actor.id, 0, null), true);
  const event = state.events.find(e => e.type === 'PLAYER_SELECT_SLOT');
  assert.ok(event, '施放事件需要存在');
  assert.match(event.text, /二格线\/火1层\/AP1/);
  const expectedDamage = Number(actor.atk || 0) + 6;
  assert.match(event.text, new RegExp(`${target.displayName || target.name}受火伤${expectedDamage}`));
  assert.match(event.text, /元素增加：R6C5 火\+1，R6C6 火\+1/);
  assert.deepEqual(event.damageSummary, [`${target.displayName || target.name}受火伤${expectedDamage}`]);
  assert.deepEqual(event.elementIncreases, ['R6C5 火+1', 'R6C6 火+1']);
  assert.doesNotMatch(event.text, /本次影响|火0\/水0\/风0|无威胁|第\d+行第\d+列/);
});

test('UI26 空格施放日志只显示元素增加并忽略元素减少', () => {
  const state = createGameState({ activePets: ['pal_005'], battleId: 'compact_element_increase_log' });
  battle.startBattle(state);
  const actor = state.units.find(u => u.side === 'hero' && u.alive);
  assert.ok(actor, '需要我方单位');
  for (const enemy of state.units.filter(u => u.side === 'enemy')) {
    enemy.alive = false;
    enemy.hp = 0;
    enemy.position = null;
  }

  actor.position = { r: 5, c: 3 };
  actor.shape = Object.assign({}, actor.shape, { shapeName: '二格线', baseLayers: 1, hitCells: 2, slotCount: 1, slotElements: ['火'] });
  state.actionDirs[`${actor.id}:slot0`] = 'right';
  syncBoardUnits(state);
  const firstCell = getCell(state, 5, 4);
  firstCell.elements.水 = 1;
  firstCell.elementCamps.水 = 'enemy';

  assert.equal(battle.useActionSlot(state, actor.id, 0, null), true);
  const event = state.events.find(e => e.type === 'PLAYER_SELECT_SLOT');
  assert.ok(event, '施放事件需要存在');
  assert.match(event.text, /作用2格/);
  assert.match(event.text, /元素增加：R6C5 火\+1，R6C6 火\+1/);
  assert.deepEqual(event.elementIncreases, ['R6C5 火+1', 'R6C6 火+1']);
  assert.doesNotMatch(event.text, /水-1|减少|本次影响|火0\/水0\/风0|无威胁|第\d+行第\d+列/);
});

test('UI27 命中敌人的行动槽同时造成行动伤害并铺完整作用格元素', () => {
  const state = createGameState({ activePets: ['pal_038'], battleId: 'action_damage_element_spread' });
  battle.startBattle(state);
  const actor = state.units.find(u => u.side === 'hero' && u.alive);
  const target = state.units.find(u => u.side === 'enemy' && u.alive);
  assert.ok(actor && target, '需要我方和敌方单位');
  for (const other of state.units.filter(u => u.side === 'enemy' && u.id !== target.id)) {
    other.alive = false;
    other.hp = 0;
    other.position = null;
  }

  actor.position = { r: 5, c: 2 };
  actor.atk = 17;
  actor.shape = Object.assign({}, actor.shape, { shapeName: '四格线', baseLayers: 1, hitCells: 4, slotCount: 1, slotElements: ['风'] });
  target.position = { r: 5, c: 6 };
  target.hp = 30;
  target.shield = 0;
  target.def = 0;
  state.actionDirs[`${actor.id}:slot0`] = 'right';
  syncBoardUnits(state);

  assert.equal(battle.useActionSlot(state, actor.id, 0, { r: 5, c: 5 }), true);
  const event = state.events.find(e => e.type === 'PLAYER_SELECT_SLOT');
  assert.ok(event, '施放事件需要存在');
  assert.equal(target.hp, 13);
  assert.match(event.text, /四格线\/风1层\/AP1/);
  assert.match(event.text, new RegExp(`${target.displayName || target.name}受风伤17`));
  assert.match(event.text, /元素增加：R6C4 风\+1，R6C5 风\+1，R6C6 风\+1，R6C7 风\+1/);
  assert.deepEqual(event.damageSummary, [`${target.displayName || target.name}受风伤17`]);
  assert.deepEqual(event.elementIncreases, ['R6C4 风+1', 'R6C5 风+1', 'R6C6 风+1', 'R6C7 风+1']);
  for (const c of [3, 4, 5, 6]) {
    assert.equal(getCell(state, 5, c).elements.风, 1, `R6C${c + 1} 应铺风1层`);
  }
});
