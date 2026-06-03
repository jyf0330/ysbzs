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

  // 优先用外部纯 Pal 池
  var extPool = getExternalOnlyPool();
  var usedSlots = 0;

  // 先把冻结的商品恢复（按旧逻辑，不计入容量？暂保持原有行为）
  frozenUnits.forEach(function(u) {
    G.shopItems.units.push(u);
    usedSlots += u.slotSize || 1;
  });

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

function buyUnit(itemId) {
  if (G.phase !== 'SHOP') return;
  const idx = G.shopItems.units.findIndex(u => u.id === itemId);
  if (idx === -1) return;
  const item = G.shopItems.units[idx];
  if (G.gold < item.cost) { showMsg('💰 金币不足！'); return; }

  // 背包容量检查
  var slotSize = item.slotSize || 1;
  var backpackUsed = 0;
  G.ownedUnits.forEach(function(u) {
    if (!u.active) backpackUsed += (u.slotSize || 1);
  });
  if (backpackUsed + slotSize > 20) {
    showMsg('🎒 背包已满（' + backpackUsed + '/' + 20 + '）！');
    glog('⚠️ 背包容量不足，无法购买！');
    return;
  }

  G.gold -= item.cost;
  G.shopItems.units.splice(idx, 1);
  const activeCount = G.ownedUnits.filter(u => u.active).length;

  var newUnit = null;
  var defId = item.unitId || item.defId;
  var pos = activeCount < 2 ? { r: 6 + activeCount, c: 0 } : null;

  // Pal 商品用工厂创建，旧商品 fallback addOwnedUnit
  if (item.itemType === 'pal' && typeof createPalUnitInstance === 'function') {
    var raw = createPalUnitInstance({ unitId: defId, faction: 'player', quality: item.quality || 1, position: pos });
    if (raw) {
      raw.instanceId = 'u_' + (G.nextUnitId++);
      raw.slotSize = slotSize;
      G.ownedUnits.push(raw);
      newUnit = raw;
    }
  }
  if (!newUnit) {
    newUnit = addOwnedUnit(defId, pos);
    if (newUnit) newUnit.slotSize = slotSize;
  }
  if (!newUnit) return;

  const existing = G.ownedUnits.find(u =>
    u.instanceId !== newUnit.instanceId && u.defId === (newUnit.unitId || newUnit.defId) && u.active
  );
  const unitName = UNIT_DEFS[defId] ? UNIT_DEFS[defId].name : defId;
  const qualityLabel = item.quality || '青铜';
  if (existing) {
    mergeUnits(newUnit, existing);
    glog('🛒 购买' + qualityLabel + unitName + '，自动合成！');
    if (typeof triggerRelicHooks === 'function') triggerRelicHooks('on_pal_gained', { gainedUnit: newUnit });
  } else {
    if (activeCount >= 2) newUnit.active = false;
    glog('🛒 购买' + qualityLabel + unitName + (newUnit.active ? '，上阵' : '，放入备战'));
    if (typeof triggerRelicHooks === 'function') triggerRelicHooks('on_pal_gained', { gainedUnit: newUnit });
  }
  syncUnitsToHeroes();
  renderShop();
  refreshUI();
}

function sellUnit(instanceId) {
  if (G.phase !== 'SHOP') return;
  const idx = G.ownedUnits.findIndex(u => u.instanceId === instanceId);
  if (idx === -1) return;
  const unit = G.ownedUnits[idx];
  const refund = unit.level;
  G.gold += refund;
  G.ownedUnits.splice(idx, 1);
  glog('💸 出售' + (UNIT_DEFS[unit.defId] ? UNIT_DEFS[unit.defId].name : unit.defId) + '，返还' + refund + '金币');
  syncUnitsToHeroes();
  renderShop();
  refreshUI();
}

function rollShop() {
  if (G.phase !== 'SHOP') return;
  var eco = (typeof getShopEconomyConfig === 'function') ? getShopEconomyConfig() : null;
  var cost = (eco && eco.roll_cost != null) ? eco.roll_cost : 1;
  if (G.gold < cost) { showMsg('💰 金币不足，刷新需要' + cost + '金币！'); return; }
  G.gold -= cost;
  G.shopFrozen = { units: new Set(), consumables: new Set() };
  genShop();
  glog('🔄 商店已刷新！');
  renderShop();
}

function freezeShopItem(itemId, category) {
  if (G.phase !== 'SHOP') return;
  const set = G.shopFrozen[category];
  if (set.has(itemId)) { set.delete(itemId); glog('❄️ 取消冻结'); }
  else { set.add(itemId); glog('❄️ 已冻结（刷新时保留）'); }
  renderShop();
}

function closeShop() {
  document.getElementById('so').style.display = 'none';
  G.shopFrozen = { units: new Set(), consumables: new Set() };
  G.slots.forEach(s => s.used = false);
  G.shopEvents = []; // 关闭商店时清除事件
  if (G.dayHalf === 1) {
    G.dayHalf = 2;
    G.round = 1; G.hitCount = 0;
    spawnWaveForDay(G.day, 'afternoon');
    G.phase = 'PLAYER';
    glog('☀️ 第' + G.day + '天下午·更多怪物来袭！');
  } else {
    G.day++;
    if (typeof heroAddXp === 'function') heroAddXp(1); // 每天结束+1经验
    if (G.enemyCastle) G.enemyCastle.hp = G.enemyCastle.maxHp;
    if (G.day > 10) {
      G.runVictory = true;
      G.phase = 'OVER';
      glog('🏆 十天远征完成！');
      if (typeof showRunEnd === 'function') showRunEnd();
      refreshUI();
      return;
    }
    G.dayHalf = 0;
    G.wave++;
    G.round = 1; G.hitCount = 0;
    spawnWaveForDay(G.day, 'morning');
    G.phase = 'PLAYER';
    glog('⚔️ 第' + G.day + '天战斗开始！');
  }
  syncUnitsToHeroes();
  refreshUI();
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
  var shuffled = pool.slice().sort(function() { return Math.random() - 0.5; });
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
        var src = G.ownedUnits[Math.floor(Math.random() * G.ownedUnits.length)];
        if (src) {
          var copy = createPalUnitInstance({ unitId: src.defId, faction: 'player', quality: src.quality || '青铜' });
          if (copy) { copy.instanceId = 'u_' + (G.nextUnitId++); copy.slotSize = src.slotSize || 1; G.ownedUnits.push(copy); glog('🎁 事件奖励：复制 ' + (src.name || src.defId)); }
        }
      } else {
        // 从 Pal 池随机选一只
        var extP = getExternalOnlyPool ? getExternalOnlyPool() : null;
        var pool = extP ? extP['day' + G.day + '_midday'] : null;
        if (pool && pool.length > 0) {
          var uid = pool[Math.floor(Math.random() * pool.length)];
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
        if (eligible.length > 0) relicId = eligible[Math.floor(Math.random() * eligible.length)].relic_id;
      }
      if (typeof gainRelic === 'function') gainRelic(relicId, '事件遗物');
      break;
    case 'buff_pal':
      if (G.ownedUnits.length > 0) {
        var target = G.ownedUnits[Math.floor(Math.random() * G.ownedUnits.length)];
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
        var t = G.ownedUnits[Math.floor(Math.random() * G.ownedUnits.length)];
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
  refreshUI();
}

/** 执行事件选项（从 UI 调用） */
function doEventOption(eventId, optionId) {
  var opts = getEventOptions(eventId);
  var opt = opts.find(function(o) { return o.option_id === optionId; });
  if (!opt) return;
  // 扣费
  if (opt.cost_type === 'gold' && opt.cost_value > 0) {
    if ((G.gold || 0) < opt.cost_value) { showMsg('💰 金币不足！'); return; }
    G.gold -= opt.cost_value;
  }
  // 执行奖励
  var rewards = getEventRewards(opt.reward_group);
  rewards.forEach(function(r) { executeEventReward(r); });
  // 标记事件已做
  if (!G._doneEvents) G._doneEvents = [];
  G._doneEvents.push(eventId);
  G.shopEvents = (G.shopEvents || []).filter(function(e) { return e.event_id !== eventId; });
  renderShop();
}

// 旧接口别名
function bname(el, sn, tier) { const s = SD[sn]; return EL[el] + '·' + s.n + '格·' + sn + '号·' + tier + '阶'; }
function slotName(s) { return bname(s.el, s.sn, s.tier); }
