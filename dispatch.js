/**
 * dispatch.js — 统一玩家操作入口
 *
 * 所有玩家按钮/交互都走 dispatchGameAction(action, payload)。
 * 每个 action 注册一个 handler，handler 只改 G + 返回 Result 纯数据。
 * UI 层根据 Result 做局部或全量刷新。
 */

(function() {
  var g = (typeof globalThis !== 'undefined') ? globalThis : window;
  if (g.__DISPATCH_LOADED__) return;
  g.__DISPATCH_LOADED__ = true;

  function snapshotShop() {
    return {
      gold: G.gold,
      shopUnits: (G.shopItems && G.shopItems.units || []).map(function(u) { return u.id; }),
      ownedCount: (G.ownedUnits || []).length,
      doneEvents: (G._doneEvents || []).slice(),
      shopEvents: (G.shopEvents || []).map(function(e) { return e.event_id; })
    };
  }
  function diffGold(before) {
    return { from: before.gold, to: G.gold, delta: G.gold - before.gold };
  }
  function diffShop(before) {
    return {
      gold: diffGold(before),
      shopItemsRemoved: before.shopUnits.filter(function(id) { return !(G.shopItems && G.shopItems.units || []).some(function(u) { return u.id === id; }); }),
      shopItemsAdded: (G.shopItems && G.shopItems.units || []).filter(function(u) { return before.shopUnits.indexOf(u.id) < 0; }).map(function(u) { return { id: u.id, defId: u.defId, name: u.name, cost: u.cost }; }),
      ownedUnitsDelta: (G.ownedUnits || []).length - before.ownedCount,
      doneEvents: (G._doneEvents || []).filter(function(e) { return before.doneEvents.indexOf(e) < 0; }),
      shopEventsConsumed: before.shopEvents.filter(function(id) { return !(G.shopEvents || []).some(function(e) { return e.event_id === id; }); })
    };
  }

  var handlers = {};

  function register(action, handler) {
    if (handlers[action]) throw new Error('dispatch: duplicate handler for ' + action);
    handlers[action] = handler;
  }

  function dispatchGameAction(action, payload) {
    var originalAction = action;
    if (typeof action === 'object' && action !== null) {
      payload = Object.assign({}, action);
      action = payload.type || payload.action;
      delete payload.type;
      delete payload.action;
    }
    payload = payload || {};
    var handler = handlers[action];
    if (!handler) {
      return {
        ok: false, action: action, payload: payload,
        stateChanges: {}, logs: [],
        errors: [{ code: 'UNKNOWN_ACTION', message: action }],
        refresh: { scope: 'none' }
      };
    }
    var prevDispatching = G && G.__dispatching;
    if (G) G.__dispatching = true;
    try {
      var result = handler(payload);
      if (!result) result = {};
      if (result.ok === undefined) result.ok = true;
      result.action = action;
      result.payload = payload;
      if (!result.stateChanges) result.stateChanges = {};
      if (!result.logs) result.logs = [];
      if (!result.errors) result.errors = [];
      if (!result.refresh) result.refresh = { scope: 'none' };
      if (typeof pushReplayStep === 'function' && action !== 'END_TURN') pushReplayStep(typeof originalAction === 'object' ? originalAction : Object.assign({type: action}, payload));
      if (typeof recomputeCorePreview === 'function') recomputeCorePreview();
      if (typeof onCoreStateChange === 'function') onCoreStateChange(result.refresh && result.refresh.changedKeys || [action]);
      return result;
    } catch (e) {
      return {
        ok: false, action: action, payload: payload,
        stateChanges: {}, logs: [],
        errors: [{ code: 'HANDLER_ERROR', message: String(e.message || e) }],
        refresh: { scope: 'none' }
      };
    } finally {
      if (G) G.__dispatching = prevDispatching;
    }
  }

  // ========= SELECT_HERO / SELECT_CELL =========
  register('SELECT_HERO', function(payload) {
    if (G.phase !== 'PLAYER') return { ok: false, errors: [{ code: 'WRONG_PHASE' }] };
    var heroId = payload.heroId;
    var wasSel = G.selHero === heroId;
    if (!heroId || !G.heroes || !G.heroes[heroId]) return { ok: false, errors: [{ code: 'HERO_NOT_FOUND' }] };
    G.selHero = wasSel ? null : heroId;
    G.selSlot = null;
    G.prevCells = [];
    G.explPos = null;
    G.heroPrev = [];
    if (!wasSel && G.selHero) {
      var hero = G.heroes[heroId];
      G.selectedCell = hero ? { r: hero.pos.r, c: hero.pos.c } : null;
    } else {
      G.selectedCell = null;
    }
    return { ok: true, stateChanges: { selHero: G.selHero, selectedCell: G.selectedCell }, refresh: { scope: 'battle', changedKeys: ['selection','preview','board'] } };
  });

  register('CLEAR_SELECTION', function(payload) {
    G.selHero = null;
    G.selSlot = null;
    G.prevCells = [];
    G.explPos = null;
    G.heroPrev = [];
    if (payload && payload.cell) G.selectedCell = { r: payload.cell.r, c: payload.cell.c };
    return { ok: true, stateChanges: { selectedCell: G.selectedCell }, refresh: { scope: 'battle', changedKeys: ['selection','preview','board'] } };
  });

  register('SELECT_CELL', function(payload) {
    var r = payload.r, c = payload.c;
    if (r == null || c == null) return { ok: false, errors: [{ code: 'INVALID_POS' }] };
    var same = G.selectedCell && G.selectedCell.r === r && G.selectedCell.c === c;
    G.selectedCell = same ? null : { r: r, c: c };
    var info = (typeof queryCellInfo === 'function' && G.selectedCell) ? queryCellInfo(r, c) : null;
    return { ok: true, stateChanges: { selectedCell: G.selectedCell, cellInfo: info }, refresh: { scope: 'battle', changedKeys: ['selection','cellDetail'] } };
  });

  // ========= CLICK_CELL =========
  register('CLICK_CELL', function(payload) {
    return handlers.SELECT_CELL(payload);
  });

  // ========= BUY_UNIT =========
    register("BUY_UNIT", function(payload) {
    var itemId = payload.itemId;
    if (!itemId) return { ok: false, errors: [{ code: "MISSING_ITEM_ID" }] };
    if (typeof _coreBuyUnit !== "function") return { ok: false, errors: [{ code: "CORE_NOT_AVAILABLE" }] };
    var before = snapshotShop();
    var result = _coreBuyUnit(itemId);
    result.stateChanges = diffShop(before);
    if (!result.ok) {
      if (typeof writeStructuredLog === "function") {
        writeStructuredLog("shop_buy_fail", { card_id: itemId, reason: result.errors[0].code }, null);
      }
      result.refresh = { scope: "shop" };
      result.logs = [{ type: "shop_buy_fail", text: "⚠️ 购买失败", data: { reason: result.errors[0].code } }];
      return result;
    }
    if (typeof writeStructuredLog === "function") {
      var msg = result.merged
        ? "🛒 购买" + result.qualityLabel + result.unitName + "，自动合成！"
        : "🛒 购买" + result.qualityLabel + result.unitName + (result.newUnit.active ? "，上阵" : "，放入备战");
      writeStructuredLog("shop_buy", { card_id: result.defId, cost: result.item.cost, merged: result.merged, gold_after: G.gold }, msg);
    }
    if (typeof syncUnitsToHeroes === "function") syncUnitsToHeroes();
    result.refresh = { scope: "shop" };
    result.logs = [{ type: "shop_buy", text: "", data: { card_id: result.defId } }];
    return result;
  });


  // ========= ROLL_SHOP =========
  register('ROLL_SHOP', function(payload) {
    if (G.phase !== 'SHOP') return { ok: false, errors: [{ code: 'WRONG_PHASE' }] };
    var before = snapshotShop();
    var eco = (typeof getShopEconomyConfig === 'function') ? getShopEconomyConfig() : null;
    var cost = (eco && eco.roll_cost != null) ? eco.roll_cost : 1;
    if (G.gold < cost) return { ok: false, errors: [{ code: 'GOLD_NOT_ENOUGH' }], stateChanges: diffShop(before), logs: [{ type: 'shop_reroll_fail', text: '\u26A0\uFE0F \u91D1\u5E01\u4E0D\u8DB3\uFF0C\u5237\u65B0\u9700\u8981' + cost + '\u91D1\u5E01\uFF01', data: { cost: cost } }] };
    G.gold -= cost;
    G.shopFrozen = { units: new Set(), consumables: new Set() };
    if (typeof genShop === 'function') genShop();
    if (typeof writeStructuredLog === 'function') writeStructuredLog('shop_reroll', { cost: cost, gold_after: G.gold }, '\uD83D\uDD04 \u5546\u5E97\u5DF2\u5237\u65B0\uFF01');
    return { ok: true, stateChanges: diffShop(before), logs: [{ type: 'shop_reroll', text: '\uD83D\uDD04 \u5546\u5E97\u5DF2\u5237\u65B0\uFF01', data: { cost: cost, gold_after: G.gold } }], refresh: { scope: 'shop' } };
  });

  // ========= SELECT_EVENT =========
  register('SELECT_EVENT', function(payload) {
    var eventId = payload.eventId, optionId = payload.optionId;
    if (!optionId) optionId = eventId + '_choice';
    if (!eventId) return { ok: false, errors: [{ code: 'MISSING_EVENT_ID' }] };
    var before = snapshotShop();
    if (typeof _coreDoEventOption !== 'function') return { ok: false, errors: [{ code: 'DO_EVENT_NOT_AVAILABLE' }], stateChanges: diffShop(before) };
    var core = _coreDoEventOption(eventId, optionId) || { ok: true };
    return { ok: !!core.ok, stateChanges: diffShop(before), logs: [{ type: 'event_select', text: '🎁 事件已执行：' + eventId, data: { eventId: eventId } }], errors: core.errors || [], refresh: { scope: 'shop', changedKeys: ['shop','gold','ownedUnits','events'] } };
  });

  register('SELL_UNIT', function(payload) {
    var before = snapshotShop();
    if (typeof _coreSellUnit !== 'function') return { ok: false, errors: [{ code: 'SELL_UNIT_NOT_AVAILABLE' }], stateChanges: diffShop(before) };
    var result = _coreSellUnit(payload.instanceId) || { ok: true };
    result.stateChanges = diffShop(before);
    result.refresh = { scope: 'shop', changedKeys: ['shop','gold','ownedUnits','heroes','boardState'] };
    return result;
  });

  register('TOGGLE_UNIT_ACTIVE', function(payload) {
    var before = snapshotShop();
    if (typeof _coreToggleUnitActive !== 'function') return { ok: false, errors: [{ code: 'TOGGLE_UNIT_NOT_AVAILABLE' }], stateChanges: diffShop(before) };
    var result = _coreToggleUnitActive(payload.instanceId) || { ok: true };
    result.stateChanges = diffShop(before);
    result.refresh = { scope: 'shop', changedKeys: ['shop','ownedUnits','heroes','boardState'] };
    return result;
  });

  register('CLOSE_SHOP', function(payload) {
    var before = snapshotShop();
    if (typeof _coreCloseShop !== 'function') return { ok: false, errors: [{ code: 'CLOSE_SHOP_NOT_AVAILABLE' }], stateChanges: diffShop(before) };
    var result = _coreCloseShop() || { ok: true };
    result.stateChanges = diffShop(before);
    result.refresh = { scope: 'battle', changedKeys: ['phase','day','shop','monsters','heroes','boardState'] };
    return result;
  });

  register('FREEZE_SHOP_ITEM', function(payload) {
    if (G.phase !== 'SHOP') return { ok: false, errors: [{ code: 'WRONG_PHASE' }] };
    var category = payload.category;
    var itemId = payload.itemId;
    if (!G.shopFrozen) G.shopFrozen = { units: new Set(), consumables: new Set() };
    var set = G.shopFrozen[category];
    if (!set) return { ok: false, errors: [{ code: 'BAD_CATEGORY' }] };
    if (set.has(itemId)) set.delete(itemId);
    else set.add(itemId);
    return { ok: true, refresh: { scope: 'shop', changedKeys: ['shop'] } };
  });

  // ========= MOVE_HERO =========
  register('MOVE_HERO', function(payload) {
    var heroId = payload.heroId;
    var to = payload.to || (payload.r != null && payload.c != null ? {r: payload.r, c: payload.c} : null);
    if (!heroId || !to) return { ok: false, errors: [{ code: 'INVALID_MOVE_PAYLOAD' }] };
    var hero = G.heroes && G.heroes[heroId];
    if (!hero || hero._acted) return { ok: false, errors: [{ code: 'HERO_UNAVAILABLE' }] };
    if (G.phase !== 'PLAYER' || heroAt(to) || monAt(to) || summonAt(to) || hasElementAt(to) || castleAt(to)) return { ok: false, errors: [{ code: 'CELL_BLOCKED' }] };
    var from = { r: hero.pos.r, c: hero.pos.c };
    var occ = (typeof cloneBoardStateOccupant === 'function') ? cloneBoardStateOccupant('hero', hero, { side: 'player' }) : {type:'hero', id:hero.id};
    hero.pos = { r: to.r, c: to.c };
    if (typeof moveBoardStateUnit === 'function') moveBoardStateUnit(from, hero.pos, occ);
    if (G.selectedCell && G.selectedCell.r === from.r && G.selectedCell.c === from.c) G.selectedCell = { r: to.r, c: to.c };
    G.actionLog.push({ type: 'MOVE_HERO', heroId: heroId, from: from, to: to });
    if (typeof assertBoardStateValid === 'function') assertBoardStateValid('dispatch MOVE_HERO');
    G.prevCells = []; G.selSlot = null; G.heroPrev = [];
    return { ok: true, stateChanges: { heroId: heroId, from: from, to: to }, logs: [{ type:'move_hero', data:{heroId:heroId, from:from, to:to} }], refresh: { scope:'battle', changedKeys:['heroes','boardState'] } };
  });

  register('SELECT_ACTION_SLOT', function(payload) {
    G.selSlot = G.selSlot === payload.slotId ? null : payload.slotId;
    G.selHero = null; G.explPos = null; G.heroPrev = [];
    if (typeof updPreview === 'function') updPreview();
    return { ok: true, refresh: { scope:'battle', changedKeys:['selection','preview'] } };
  });

  register('UPDATE_ACTION_SLOT', function(payload) {
    var s = G.slots && G.slots[payload.slotId];
    if (!s) return { ok:false, errors:[{code:'SLOT_NOT_FOUND'}] };
    if (payload.heroId !== undefined) s.hid = payload.heroId;
    if (payload.element !== undefined) s.el = payload.element;
    if (payload.direction !== undefined) s.dir = payload.direction;
    if (G.selSlot === payload.slotId && typeof updPreview === 'function') updPreview();
    return { ok: true, refresh: { scope:'battle', changedKeys:['slots','preview'] } };
  });

  register('SET_ACTION_DIRECTION', function(payload) {
    var s = G.slots && G.slots[payload.slotId];
    if (!s) return { ok:false, errors:[{code:'SLOT_NOT_FOUND'}] };
    s.dir = payload.direction;
    if (G.selSlot === payload.slotId && typeof updPreview === 'function') updPreview();
    return { ok:true, refresh:{ scope:'battle', changedKeys:['slots','preview'] } };
  });

  register('SET_ACTION_TARGET', function(payload) {
    var s = G.slots && G.slots[payload.slotId];
    if (s && payload.targetCell !== undefined) s.targetCell = payload.targetCell;
    return { ok:true, refresh:{ scope:'battle', changedKeys:['slots'] } };
  });

  // ========= USE_SLOT =========
  register('USE_SLOT', function(payload) {
    var idx = payload.slotIdx != null ? payload.slotIdx : payload.slotId;
    if (idx == null) return { ok: false, errors: [{ code: 'MISSING_SLOT_IDX' }] };
    // 直接委托核心实现，避免 dispatch -> useSlot -> dispatch 递归。
    if (typeof _coreUseSlot !== 'function') return { ok: false, errors: [{ code: 'USE_SLOT_NOT_AVAILABLE' }] };
    _coreUseSlot(idx);
    if (typeof assertBoardStateValid === 'function') assertBoardStateValid('dispatch USE_SLOT');
    return { ok: true, stateChanges: {}, logs: [{ type: 'use_slot', text: '⚔️ 执行行动槽 ' + idx, data: { slotIdx: idx } }], refresh: { scope: 'battle' } };
  });

  // ========= END_TURN =========
  register('END_TURN', function(payload) {
    if (G.phase !== 'PLAYER') return { ok: false, errors: [{ code: 'WRONG_PHASE' }] };
    // 委托 _coreEndPlayerTurn（不复制战斗结算逻辑）
    if (typeof _coreEndPlayerTurn !== 'function') return { ok: false, errors: [{ code: 'CORE_NOT_AVAILABLE' }] };
    var coreResult = payload.sync && typeof endPlayerTurnSync === 'function' ? endPlayerTurnSync() : _coreEndPlayerTurn();
    if (coreResult && coreResult.over) {
      return { ok: true, stateChanges: { phase: 'OVER' }, logs: [{ type: 'end_turn', text: '战斗结束' }], refresh: { scope: 'battle' } };
    }
    return { ok: true, stateChanges: { phase: 'MONSTER', warnText: coreResult.warnText }, logs: [{ type: 'end_turn', text: '⚔️ 结束玩家回合', data: {} }], refresh: { scope: 'battle' } };
  });

  g.dispatchGameAction = dispatchGameAction;
  g.__dispatchGameActionCore = dispatchGameAction;
  g.__dispatchHandlers__ = handlers;
  g.__dispatchRegister = register;
})();
