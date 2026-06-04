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
    if (typeof action === 'object' && action !== null) {
      payload = action;
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
      return result;
    } catch (e) {
      return {
        ok: false, action: action, payload: payload,
        stateChanges: {}, logs: [],
        errors: [{ code: 'HANDLER_ERROR', message: String(e.message || e) }],
        refresh: { scope: 'none' }
      };
    }
  }

  // ========= CLICK_CELL =========
  register('CLICK_CELL', function(payload) {
    var r = payload.r, c = payload.c;
    if (r == null || c == null) return { ok: false, errors: [{ code: 'INVALID_POS' }] };
    var info = (typeof queryCellInfo === 'function') ? queryCellInfo(r, c) : null;
    return {
      ok: true,
      stateChanges: { selectedCell: { r: r, c: c }, cellInfo: info },
      refresh: { scope: info ? 'cell_detail' : 'none' }
    };
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
    G.shopFrozen = { units: {}, consumables: {} };
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
    if (typeof doEventOption !== 'function') return { ok: false, errors: [{ code: 'DO_EVENT_NOT_AVAILABLE' }], stateChanges: diffShop(before) };
    doEventOption(eventId, optionId);
    return { ok: true, stateChanges: diffShop(before), logs: [{ type: 'event_select', text: '\uD83C\uDF81 \u4E8B\u4EF6\u5DF2\u6267\u884C\uFF1A' + eventId, data: { eventId: eventId } }], refresh: { scope: 'shop' } };
  });

  // ========= USE_SLOT =========
  register('USE_SLOT', function(payload) {
    var idx = payload.slotIdx != null ? payload.slotIdx : payload.slotId;
    if (idx == null) return { ok: false, errors: [{ code: 'MISSING_SLOT_IDX' }] };
    // 委托 useSlot（含校验 + skill 分支 + hooks + actionLog）
    if (typeof useSlot !== 'function') return { ok: false, errors: [{ code: 'USE_SLOT_NOT_AVAILABLE' }] };
    useSlot(idx);
    return { ok: true, stateChanges: {}, logs: [{ type: 'use_slot', text: '⚔️ 执行行动槽 ' + idx, data: { slotIdx: idx } }], refresh: { scope: 'battle' } };
  });

  // ========= END_TURN =========
  register('END_TURN', function(payload) {
    if (G.phase !== 'PLAYER') return { ok: false, errors: [{ code: 'WRONG_PHASE' }] };
    // 委托 _coreEndPlayerTurn（不复制战斗结算逻辑）
    if (typeof _coreEndPlayerTurn !== 'function') return { ok: false, errors: [{ code: 'CORE_NOT_AVAILABLE' }] };
    var coreResult = _coreEndPlayerTurn();
    if (coreResult.over) {
      return { ok: true, stateChanges: { phase: 'OVER' }, logs: [{ type: 'end_turn', text: '战斗结束' }], refresh: { scope: 'battle' } };
    }
    return { ok: true, stateChanges: { phase: 'MONSTER', warnText: coreResult.warnText }, logs: [{ type: 'end_turn', text: '⚔️ 结束玩家回合', data: {} }], refresh: { scope: 'battle' } };
  });

  g.dispatchGameAction = dispatchGameAction;
  g.__dispatchHandlers__ = handlers;
  g.__dispatchRegister = register;
})();
