/**
 * 元素背包史 · 商店模块
 * 战斗外成长：商品池、摊位、购买/出售/合成/刷新/冻结
 * 依赖：data.js（UNIT_DEFS/UNIT_TIER_POOL/SHOP_PRICE_CONFIG/SHOP_POOLS）、game.js（unit mgmt）
 */

// ── 容量常量（优先从 JSON 读取）────────────────────────────────
var SHOP_CAPACITY = 10;
function refreshShopCapacity() {
  var cfg = (typeof getCapacityConfig === 'function') ? getCapacityConfig() : null;
  if (cfg && cfg.shop_capacity) SHOP_CAPACITY = cfg.shop_capacity;
}

function calcShopTier(day) {
  if (day >= 7) return 4;
  if (day >= 5) return 3;
  if (day >= 3) return 2;
  return 1;
}

function openShop() {
  if (G.phase === 'OVER') return;
  refreshShopCapacity();
  G.shopTier = calcShopTier(G.day);
  var eco = (typeof getShopEconomyConfig === 'function') ? getShopEconomyConfig() : null;
  var nightIncome = (eco && eco.night_income) ? eco.night_income : {};
  var interestStep = (eco && eco.interest_step != null) ? eco.interest_step : 8;
  var interestMax = (eco && eco.interest_max != null) ? eco.interest_max : 2;
  const income = nightIncome[G.day] || 0;
  G.gold += income;
  const interest = Math.min(
    Math.floor(G.gold / interestStep),
    interestMax
  );
  G.gold += interest;
  if (income > 0 || interest > 0) {
    glog('💰 第' + G.day + '天收入 +' + income + (interest > 0 ? '（利息+' + interest + '）' : '') + '，共 ' + G.gold + ' 金币');
  }
  syncHeroHPToUnits();
  genShop();
  syncUnitsToHeroes();
  // 商店事件：不占商店10格，不随刷新重置
  if (!G.shopEvents || G.shopEvents.length === 0) {
    G.shopEvents = rollShopEvents();
  }
  if (typeof triggerRelicHooks === 'function') triggerRelicHooks('on_shop_enter', {});
  renderShop();
  document.getElementById('so').style.display = 'block';
}

function getShopPoolKey() {
  const d = G.day || 1;
  if (d >= 10) return G.dayHalf >= 2 ? 'day10_night' : 'day10_midday';
  if (d >= 9) return G.dayHalf >= 2 ? 'day9_night' : 'day9_midday';
  if (d >= 8) return G.dayHalf >= 2 ? 'day8_night' : 'day8_midday';
  if (d >= 7) return G.dayHalf >= 2 ? 'day7_night' : 'day7_midday';
  if (d >= 6) return G.dayHalf >= 2 ? 'day6_night' : 'day6_midday';
  if (d >= 5) return G.dayHalf >= 2 ? 'day5_night' : 'day5_midday';
  if (d >= 4) return G.dayHalf >= 2 ? 'day4_night' : 'day4_midday';
  if (d >= 3) return G.dayHalf >= 2 ? 'day3_night' : 'day3_midday';
  if (G.dayHalf >= 2) return 'day' + d + '_night';
  return 'day' + d + '_midday';
}

function getShopPoolIds(tier) {
  const pool = SHOP_POOLS[getShopPoolKey()];
  if (!pool) return null;
  const ids = [...new Set(pool)].filter(id => UNIT_DEFS[id] && UNIT_DEFS[id].tier === tier);
  return ids.length ? ids : null;
}

/** 获取只含外部 Pal 的池（不含旧 ID） */
function getExternalOnlyPool() {
  var pools = (typeof getExternalOnlyShopPools === 'function') ? getExternalOnlyShopPools() : null;
  if (!pools) return null;
  return pools[getShopPoolKey()] || null;
}

function genShop() {
  const frozenUnits = (G.shopItems.units || []).filter(u => G.shopFrozen.units.has(u.id));
  G.shopItems = { units: [], consumables: [] };

  var usedSlots = 0;

  // 先把冻结的商品恢复（按旧逻辑，不计入容量？暂保持原有行为）
  frozenUnits.forEach(function(u) {
    G.shopItems.units.push(u);
    usedSlots += u.slotSize || 1;
  });

  // 主流程：Bazaar-like YAML schema -> merchant/rule/pool -> offers。
  // 旧 SHOP_POOLS 仅在 schema 不可用时作为 fallback。
  if (typeof rollBazaarLikeShopOffers === 'function') {
    var rolled = rollBazaarLikeShopOffers({ day: G.day || 1, dayHalf: G.dayHalf || 1, heroId: G.heroInfo && G.heroInfo.id });
    if (rolled && rolled.offers && rolled.offers.length > 0) {
      G.shopMerchant = rolled.merchant || null;
      G.shopRule = rolled.rule || null;
      for (var bi = 0; bi < rolled.offers.length && usedSlots < SHOP_CAPACITY; bi++) {
        var offer = rolled.offers[bi];
        var os = offer.slotSize || 1;
        if (usedSlots + os > SHOP_CAPACITY) continue;
        G.shopItems.units.push(offer);
        usedSlots += os;
      }
      if (typeof writeStructuredLog === 'function') {
        writeStructuredLog('shop_offer_roll', {
          merchant_id: G.shopMerchant && G.shopMerchant.merchant_id,
          offer_count: G.shopItems.units.length,
          schema: 'bazaar-like-schema'
        });
      }
      return;
    }
  }

  // fallback：旧外部纯 Pal 池 / SHOP_POOLS
  var extPool = getExternalOnlyPool();

  // 按 tier 遍历填充
  var tierPoolMap = {};
  if (extPool) {
    // 从外部池按 tier 分组
    extPool.forEach(function(id) {
      var def = UNIT_DEFS[id];
      if (!def) return;
      var t = def.tier || 1;
      if (!tierPoolMap[t]) tierPoolMap[t] = [];
      tierPoolMap[t].push(id);
    });
  } else {
    // fallback: 旧池
    for (var ti = 1; ti <= 4; ti++) {
      tierPoolMap[ti] = getShopPoolIds(ti) || (UNIT_TIER_POOL[ti] || []);
    }
  }

  // 按 tier 顺序填充，直到格子满
  for (var tier = 1; tier <= 4; tier++) {
    var pool = tierPoolMap[tier] || [];
    var legacySlots = (typeof getLegacyShopSlots === 'function') ? getLegacyShopSlots() : null;
    var maxPerTier = extPool ? 8 : ((legacySlots && legacySlots.by_day) ? ((legacySlots.by_day[G.day] || legacySlots.by_day[1])['unitT' + tier] || 3) : 3);
    var placed = 0;
    // 最多尝试 pool.length * 2 次
    for (var i = 0; i < pool.length * 2 && placed < maxPerTier && usedSlots < SHOP_CAPACITY; i++) {
      var defId = pool[(i + G.nextUnitId) % pool.length];
      var def = UNIT_DEFS[defId];
      if (!def) continue;
      var slotSize = def.slotSize || 1;
      if (usedSlots + slotSize > SHOP_CAPACITY) continue;
      G.shopItems.units.push({
        id: 'su_' + (G.nextUnitId + i) + '_' + tier + '_' + placed,
        itemType: 'pal',
        unitId: defId,
        defId: defId,
        name: def.name || defId,
        size: def.size || 'medium',
        slotSize: slotSize,
        quality: def.grade || '青铜',
        price: (typeof calcUnitPrice === 'function' ? calcUnitPrice : function(d){ return d.price||d.cost||2; })(def),
        cost: (typeof calcUnitPrice === 'function' ? calcUnitPrice : function(d){ return d.price||d.cost||2; })(def),
        tags: def.tags || [],
        frozen: false,
      });
      usedSlots += slotSize;
      placed++;
    }
  }
}


function _coreBuyUnit(itemId) {
  // 核心购买逻辑：只改状态，不调 UI。返回结构化结果供 wrapper 使用。
  if (G.phase !== 'SHOP') return { ok: false, errors: [{ code: 'WRONG_PHASE' }] };
  var idx = (G.shopItems.units || []).findIndex(function(u) { return u.id === itemId; });
  if (idx === -1) return { ok: false, errors: [{ code: 'ITEM_NOT_FOUND' }] };
  var item = G.shopItems.units[idx];
  if (G.gold < item.cost) return { ok: false, errors: [{ code: 'GOLD_NOT_ENOUGH' }], item: item };

  var slotSize = item.slotSize || 1;
  var backpackUsed = 0;
  (G.ownedUnits || []).forEach(function(u) { if (!u.active) backpackUsed += (u.slotSize || 1); });
  if (backpackUsed + slotSize > 20) return { ok: false, errors: [{ code: 'BACKPACK_FULL' }], item: item };

  G.gold -= item.cost;
  G.shopItems.units.splice(idx, 1);
  var activeCount = (G.ownedUnits || []).filter(function(u) { return u.active; }).length;
  var defId = item.unitId || item.defId;
  var pos = activeCount < 2 ? { r: 6 + activeCount, c: 0 } : null;

  var newUnit = null;
  if (item.itemType === 'pal' && typeof createPalUnitInstance === 'function') {
    var raw = createPalUnitInstance({ unitId: defId, faction: 'player', quality: item.quality || 1, position: pos });
    if (raw) { raw.instanceId = 'u_' + (G.nextUnitId++); raw.slotSize = slotSize; G.ownedUnits.push(raw); newUnit = raw; }
  }
  if (!newUnit && typeof addOwnedUnit === 'function') {
    newUnit = addOwnedUnit(defId, pos);
    if (newUnit) newUnit.slotSize = slotSize;
  }
  if (!newUnit) return { ok: false, errors: [{ code: 'CREATE_UNIT_FAILED' }], item: item };

  var existing = (G.ownedUnits || []).find(function(u) {
    return u.instanceId !== newUnit.instanceId && u.defId === (newUnit.unitId || newUnit.defId) && u.active;
  });
  var defs = (typeof UNIT_DEFS !== 'undefined') ? UNIT_DEFS : {};
  var unitName = defs[defId] ? defs[defId].name : defId;
  var qualityLabel = item.quality || '青铜';
  var merged = false;
  if (existing && typeof mergeUnits === 'function') {
    mergeUnits(newUnit, existing);
    merged = true;
  } else {
    if (activeCount >= 2) newUnit.active = false;
  }
  if (typeof triggerRelicHooks === 'function') triggerRelicHooks('on_pal_gained', { gainedUnit: newUnit });

  return {
    ok: true, item: item, defId: defId, newUnit: newUnit,
    merged: merged, unitName: unitName, qualityLabel: qualityLabel,
    activeCount: activeCount, errors: []
  };
}




function buyUnit(itemId) {
  // UI wrapper: 购买会改变金币/单位/商店状态，必须走 dispatch。
  if (typeof dispatchGameAction !== 'function') { showMsg('⚠️ dispatch 未加载，无法购买'); return { ok: false, errors: [{ code: 'DISPATCH_NOT_AVAILABLE' }] }; }
  var r = dispatchGameAction({ type: 'BUY_UNIT', itemId: itemId });
  if (r && !r.ok && r.errors && r.errors.length) {
    var code = r.errors[0].code;
    showMsg(code === 'GOLD_NOT_ENOUGH' ? '💰 金币不足！' : code === 'BACKPACK_FULL' ? '⚠️ 背包容量不足，无法购买！' : '⚠️ 购买失败！');
  }
  renderShop();
  refreshUI(r && r.refresh && r.refresh.changedKeys || [CK.SHOP,CK.UNITS,CK.HEROES,CK.BOARDSTATE]);
  return r;
}

function _coreSellUnit(instanceId) {
  if (G.phase !== 'SHOP') return { ok: false, errors: [{ code: 'WRONG_PHASE' }] };
  const idx = G.ownedUnits.findIndex(u => u.instanceId === instanceId);
  if (idx === -1) return { ok: false, errors: [{ code: 'UNIT_NOT_FOUND' }] };
  const unit = G.ownedUnits[idx];
  const refund = unit.level;
  G.gold += refund;
  G.ownedUnits.splice(idx, 1);
  glog('💸 出售' + (UNIT_DEFS[unit.defId] ? UNIT_DEFS[unit.defId].name : unit.defId) + '，返还' + refund + '金币');
  syncUnitsToHeroes();
  return { ok: true, unitId: instanceId, refund: refund };
}

function sellUnit(instanceId) {
  // UI wrapper: 出售会改变金币/单位状态，必须走 dispatch。
  if (typeof dispatchGameAction !== 'function') { showMsg('⚠️ dispatch 未加载，无法出售'); return { ok: false, errors: [{ code: 'DISPATCH_NOT_AVAILABLE' }] }; }
  var r = dispatchGameAction({ type: 'SELL_UNIT', instanceId: instanceId });
  if (r && !r.ok) showMsg('⚠️ 出售失败！');
  renderShop();
  refreshUI(r && r.refresh && r.refresh.changedKeys || ['shop','ownedUnits','heroes','boardState']);
  return r;
}

function rollShop() {
  // UI wrapper: 刷新会改变金币/商店状态，必须走 dispatch。
  if (typeof dispatchGameAction !== 'function') { showMsg('⚠️ dispatch 未加载，无法刷新'); return { ok: false, errors: [{ code: 'DISPATCH_NOT_AVAILABLE' }] }; }
  var r = dispatchGameAction({ type: 'ROLL_SHOP' });
  if (r && !r.ok && r.errors && r.errors[0] && r.errors[0].code === 'GOLD_NOT_ENOUGH') {
    var eco = (typeof getShopEconomyConfig === 'function') ? getShopEconomyConfig() : null;
    var cost = (eco && eco.roll_cost != null) ? eco.roll_cost : 1;
    showMsg('💰 金币不足，刷新需要' + cost + '金币！');
  }
  renderShop();
  return r;
}

function freezeShopItem(itemId, category) {
  // UI wrapper: 冻结状态也是商店状态，走 dispatch。
  if (typeof dispatchGameAction !== 'function') return { ok: false, errors: [{ code: 'DISPATCH_NOT_AVAILABLE' }] };
  var r = dispatchGameAction({ type: 'FREEZE_SHOP_ITEM', itemId: itemId, category: category });
  renderShop();
  return r;
}

function _coreToggleUnitActive(instanceId) {
  const unit = G.ownedUnits.find(u => u.instanceId === instanceId);
  if (!unit) return { ok: false, errors: [{ code: 'UNIT_NOT_FOUND' }] };
  if (unit.active) {
    unit.active = false;
  } else {
    const activeCount = G.ownedUnits.filter(u => u.active).length;
    if (activeCount >= 2) return { ok: false, errors: [{ code: 'ACTIVE_LIMIT' }] };
    unit.active = true;
  }
  syncUnitsToHeroes();
  return { ok: true, instanceId: instanceId, active: unit.active };
}

function _coreCloseShop() {
  if (G.phase !== 'SHOP') return { ok: false, errors: [{ code: 'WRONG_PHASE' }] };
  G.shopFrozen = { units: new Set(), consumables: new Set() };
  G.slots.forEach(s => { s.used = false; s._committed = false; });
  G.shopEvents = [];
  if (G.dayHalf === 1) {
    G.dayHalf = 2;
    G.round = 1; G.hitCount = 0;
    spawnWaveForDay(G.day, 'afternoon');
    G.phase = 'PLAYER';
    glog('☀️ 第' + G.day + '天下午·更多怪物来袭！');
  } else {
    G.day++;
    if (typeof heroAddXp === 'function') heroAddXp(1);
    if (G.enemyCastle) G.enemyCastle.hp = G.enemyCastle.maxHp;
    if (G.day > 10) {
      G.runVictory = true;
      G.phase = 'OVER';
      glog('🏆 十天远征完成！');
      syncUnitsToHeroes();
      return { ok: true, runEnd: true, victory: true };
    }
    G.dayHalf = 0;
    G.wave++;
    G.round = 1; G.hitCount = 0;
    spawnWaveForDay(G.day, 'morning');
    G.phase = 'PLAYER';
    glog('⚔️ 第' + G.day + '天战斗开始！');
  }
  syncUnitsToHeroes();
  return { ok: true, phase: G.phase, day: G.day, dayHalf: G.dayHalf };
}

function closeShop() {
  // UI wrapper: 推进天数/阶段/波次是核心规则，必须走 dispatch。
  if (typeof dispatchGameAction !== 'function') { showMsg('⚠️ dispatch 未加载，无法关闭商店'); return { ok: false, errors: [{ code: 'DISPATCH_NOT_AVAILABLE' }] }; }
  var panel = document.getElementById('so');
  if (panel) panel.style.display = 'none';
  var r = dispatchGameAction({ type: 'CLOSE_SHOP' });
  if (r && r.runEnd && typeof showRunEnd === 'function') showRunEnd();
  refreshUI(r && r.refresh && r.refresh.changedKeys || [CK.PHASE,CK.DAY,CK.SHOP,CK.MONSTERS,CK.HEROES,CK.BOARDSTATE]);
  return r;
}

// 升级时添加免费高共鸣英雄到商店
function addLevelupUnit() {
  var higherTier = Math.min(G.shopTier + 1, 4);
  var pool = UNIT_TIER_POOL[higherTier] || [];
  if (pool.length === 0) return;

  // 优先用外部 Pal 池
  var extPool = getExternalOnlyPool();
  if (extPool) {
    var tierIds = extPool.filter(function(id) {
      var def = UNIT_DEFS[id];
      return def && def.tier === higherTier;
    });
    if (tierIds.length > 0) pool = tierIds;
  }

  var defId = pool[rngInt(0, pool.length)];
  var def = UNIT_DEFS[defId];
  G.shopItems.units.push({
    id: 'su_' + G.nextUnitId,
    itemType: 'pal',
    unitId: defId,
    defId: defId,
    name: def.name || defId,
    size: def.size || 'medium',
    slotSize: def.slotSize || 1,
    quality: def.grade || '青铜',
    price: (typeof calcUnitPrice === 'function' ? calcUnitPrice : function(d){ return d.price||d.cost||2; })(def),
    cost: (typeof calcUnitPrice === 'function' ? calcUnitPrice : function(d){ return d.price||d.cost||2; })(def),
    tags: def.tags || [],
    frozen: false,
  });
  G.nextUnitId++;
}

// ========== 商店事件系统 ==========

/** 滚动 0-3 个可用商店事件 */
function rollShopEvents() {
  var ec = (typeof getExternalEventConfig === 'function') ? getExternalEventConfig() : null;
  if (!ec || !ec.event_master) return [];
  var pool = ec.event_master.filter(function(e) {
    var d = G.day || 1;
    return (e.min_day || 1) <= d && d <= (e.max_day || 10);
  });
  if (pool.length === 0) return [];
  var count = rngInt(0, pool.length < 3 ? pool.length + 1 : 4); // 0-3
  var shuffled = (typeof rngShuffle === 'function') ? rngShuffle(pool.slice()) : pool.slice();
  var selected = [];
  for (var i = 0; i < count && i < shuffled.length; i++) {
    if (G._doneEvents && G._doneEvents.indexOf(shuffled[i].event_id) !== -1) continue;
    selected.push(shuffled[i]);
  }
  return selected;
}

function getEventOptions(eventId) {
  var ec = (typeof getExternalEventConfig === 'function') ? getExternalEventConfig() : null;
  if (!ec || !ec.event_option) return [];
  return ec.event_option.filter(function(o) { return o.event_id === eventId; });
}

function getEventRewards(rewardGroup) {
  var ec = (typeof getExternalEventConfig === 'function') ? getExternalEventConfig() : null;
  if (!ec || !ec.event_reward) return [];
  return ec.event_reward.filter(function(r) { return r.reward_group === rewardGroup; });
}

function executeEventReward(reward) {
  if (!G._doneEvents) G._doneEvents = [];
  switch (reward.reward_type) {
    case 'gain_gold':
      G.gold = (G.gold || 0) + (reward.amount || 2);
      glog('💰 事件奖励：+' + (reward.amount || 2) + ' 金币');
      break;
    case 'gain_pal':
      if (reward.pool_id === 'copy_owned_pal' && G.ownedUnits.length > 0) {
        var src = (typeof rngPick === 'function') ? rngPick(G.ownedUnits) : G.ownedUnits[0];
        if (src) {
          var copy = createPalUnitInstance({ unitId: src.defId, faction: 'player', quality: src.quality || '青铜' });
          if (copy) { copy.instanceId = 'u_' + (G.nextUnitId++); copy.slotSize = src.slotSize || 1; G.ownedUnits.push(copy); glog('🎁 事件奖励：复制 ' + (src.name || src.defId)); }
        }
      } else {
        // 从 Pal 池随机选一只
        var extP = getExternalOnlyPool ? getExternalOnlyPool() : null;
        var pool = extP ? extP['day' + G.day + '_midday'] : null;
        if (pool && pool.length > 0) {
          var uid = (typeof rngPick === 'function') ? rngPick(pool) : pool[0];
          var pal = createPalUnitInstance({ unitId: uid, faction: 'player', quality: reward.quality_hint || '青铜' });
          if (pal) { pal.instanceId = 'u_' + (G.nextUnitId++); pal.slotSize = pal.slotSize || 1; G.ownedUnits.push(pal); glog('🎁 事件奖励：获得 ' + (pal.name || uid)); }
        }
      }
      break;
    case 'gain_relic':
      var relicId = 'relic_coin_bag'; // 默认
      var rc = (typeof getExternalRelicConfig === 'function') ? getExternalRelicConfig() : null;
      if (rc && rc.relic_master) {
        var eligible = rc.relic_master.filter(function(r) { return G._doneEvents.indexOf('relic_' + r.relic_id) === -1; });
        if (eligible.length > 0) relicId = ((typeof rngPick === 'function') ? rngPick(eligible) : eligible[0]).relic_id;
      }
      if (typeof gainRelic === 'function') gainRelic(relicId, '事件遗物');
      break;
    case 'buff_pal':
      if (G.ownedUnits.length > 0) {
        var target = (typeof rngPick === 'function') ? rngPick(G.ownedUnits) : G.ownedUnits[0];
        if (reward.quality_hint && reward.quality_hint.indexOf('hp') !== -1) {
          var hpBuff = parseInt(reward.quality_hint.match(/\d+/)) || 3;
          target.maxHp += hpBuff; target.hp += hpBuff;
          glog('🎁 事件奖励：' + (target.name || target.defId) + ' HP+' + hpBuff);
        } else if (reward.quality_hint && reward.quality_hint.indexOf('atk') !== -1) {
          target.atk = (target.atk || 0) + (reward.amount || 1);
          glog('🎁 事件奖励：' + (target.name || target.defId) + ' ATK+' + (reward.amount || 1));
        }
      }
      break;
    case 'upgrade_pal':
      if (G.ownedUnits.length > 0) {
        var t = (typeof rngPick === 'function') ? rngPick(G.ownedUnits) : G.ownedUnits[0];
        if (t.level < 4) { t.level++; glog('🎁 事件奖励：' + (t.name || t.defId) + ' 升级至 Lv' + t.level); }
      }
      break;
    case 'capacity_up':
      glog('🎁 事件奖励：背包容量扩大');
      break;
    default:
      glog('🎁 事件奖励：' + (reward.reward_type || '未知'));
  }
  if (reward.reward_group && G._doneEvents.indexOf(reward.reward_group) === -1) G._doneEvents.push(reward.reward_group);
  syncUnitsToHeroes();
}

function _coreDoEventOption(eventId, optionId) {
  var opts = getEventOptions(eventId);
  var opt = opts.find(function(o) { return o.option_id === optionId; });
  if (!opt) return { ok: false, errors: [{ code: 'EVENT_OPTION_NOT_FOUND' }] };
  // 扣费
  if (opt.cost_type === 'gold' && opt.cost_value > 0) {
    if ((G.gold || 0) < opt.cost_value) return { ok: false, errors: [{ code: 'GOLD_NOT_ENOUGH' }] };
    G.gold -= opt.cost_value;
  }
  // 执行奖励
  var rewards = getEventRewards(opt.reward_group);
  rewards.forEach(function(r) { executeEventReward(r); });
  // 标记事件已做
  if (!G._doneEvents) G._doneEvents = [];
  G._doneEvents.push(eventId);
  G.shopEvents = (G.shopEvents || []).filter(function(e) { return e.event_id !== eventId; });
  return { ok: true, eventId: eventId, optionId: optionId };
}

/** UI wrapper：事件选择会改变金币/奖励/事件状态，必须走 dispatch。 */
function doEventOption(eventId, optionId) {
  if (typeof dispatchGameAction !== 'function') return { ok: false, errors: [{ code: 'DISPATCH_NOT_AVAILABLE' }] };
  var r = dispatchGameAction({ type: 'SELECT_EVENT', eventId: eventId, optionId: optionId });
  if (r && !r.ok && r.errors && r.errors[0] && r.errors[0].code === 'GOLD_NOT_ENOUGH') showMsg('💰 金币不足！');
  renderShop();
  refreshUI(r && r.refresh && r.refresh.changedKeys || [CK.SHOP,CK.GOLD,CK.UNITS,'events']);
  return r;
}

// 旧接口别名
function bname(el, sn, tier) { const s = SD[sn]; return EL[el] + '·' + s.n + '格·' + sn + '号·' + tier + '阶'; }
function slotName(s) { return bname(s.el, s.sn, s.tier); }
