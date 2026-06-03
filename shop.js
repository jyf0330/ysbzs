/**
 * 元素背包史 · 商店模块
 * 战斗外成长：商品池、摊位、购买/出售/合成/刷新/冻结
 * 依赖：data.js（UNIT_DEFS/UNIT_TIER_POOL/SHOP_PRICE_CONFIG/SHOP_POOLS）、game.js（unit mgmt）
 */

function calcShopTier(day) {
  if (day >= 7) return 4;
  if (day >= 5) return 3;
  if (day >= 3) return 2;
  return 1;
}

function openShop() {
  if (G.phase === 'OVER') return;
  G.shopTier = calcShopTier(G.day);
  const income = SHOP_PRICE_CONFIG.nightIncome[G.day] || 0;
  G.gold += income;
  const interest = Math.min(
    Math.floor(G.gold / SHOP_PRICE_CONFIG.interestStep),
    SHOP_PRICE_CONFIG.interestMax
  );
  G.gold += interest;
  if (income > 0 || interest > 0) {
    glog(`💰 第${G.day}天收入 +${income}${interest > 0 ? `（利息+${interest})` : '）'}，共 ${G.gold} 金币`);
  }
  syncHeroHPToUnits();
  genShop();
  syncUnitsToHeroes();
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
  if (G.dayHalf >= 2) return `day${d}_night`;
  return `day${d}_midday`;
}

function getShopPoolIds(tier) {
  const pool = SHOP_POOLS[getShopPoolKey()];
  if (!pool) return null;
  const ids = [...new Set(pool)].filter(id => UNIT_DEFS[id] && UNIT_DEFS[id].tier === tier);
  return ids.length ? ids : null;
}

function genShop() {
  const frozenUnits = (G.shopItems.units || []).filter(u => G.shopFrozen.units.has(u.id));
  G.shopItems = { units: [], consumables: [] };
  const slots = SHOP_PRICE_CONFIG.shopSlots[G.day] || SHOP_PRICE_CONFIG.shopSlots[1];
  const counts = { 1: slots.unitT1 || 0, 2: slots.unitT2 || 0, 3: slots.unitT3 || 0, 4: slots.unitT4 || 0 };
  for (let tier = 1; tier <= 4; tier++) {
    const kept = frozenUnits.filter(u => UNIT_DEFS[u.defId]?.tier === tier);
    kept.forEach(u => G.shopItems.units.push(u));
    const target = Math.max(0, counts[tier] - kept.length);
    const pool = getShopPoolIds(tier) || (UNIT_TIER_POOL[tier] || []);
    for (let i = 0; i < target; i++) {
      if (pool.length === 0) break;
      var defId = pool[(i + G.nextUnitId) % pool.length];
      const def = UNIT_DEFS[defId];
      if (!def) continue;
      G.shopItems.units.push({
        id: `su_${G.nextUnitId}_${tier}_${i}`,
        itemType: 'pal',
        unitId: defId,
        defId: defId,
        name: def.name || defId,
        size: def.size || 'medium',
        quality: def.grade || '青铜',
        price: calcUnitPrice(def),
        cost: calcUnitPrice(def),
        tags: def.tags || [],
        frozen: false,
      });
    }
  }
}

function buyUnit(itemId) {
  if (G.phase !== 'SHOP') return;
  const idx = G.shopItems.units.findIndex(u => u.id === itemId);
  if (idx === -1) return;
  const item = G.shopItems.units[idx];
  if (G.gold < item.cost) { showMsg('💰 金币不足！'); return; }
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
      G.ownedUnits.push(raw);
      newUnit = raw;
    }
  }
  if (!newUnit) {
    newUnit = addOwnedUnit(defId, pos);
  }
  if (!newUnit) return;

  const existing = G.ownedUnits.find(u =>
    u.instanceId !== newUnit.instanceId && u.defId === (newUnit.unitId || newUnit.defId) && u.active
  );
  const unitName = UNIT_DEFS[defId] ? UNIT_DEFS[defId].name : defId;
  if (existing) {
    mergeUnits(newUnit, existing);
    glog('🛒 购买' + unitName + '，自动合成！');
  } else {
    if (activeCount >= 2) newUnit.active = false;
    glog('🛒 购买' + unitName + (newUnit.active ? '，上阵' : '，放入备战'));
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
  glog(`💸 出售${UNIT_DEFS[unit.defId].name}，返还${refund}金币`);
  syncUnitsToHeroes();
  renderShop();
  refreshUI();
}

function rollShop() {
  if (G.phase !== 'SHOP') return;
  const cost = SHOP_PRICE_CONFIG.consumableBase.roll;
  if (G.gold < cost) { showMsg(`💰 金币不足，刷新需要${cost}金币！`); return; }
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
  if (G.dayHalf === 1) {
    G.dayHalf = 2;
    G.round = 1; G.hitCount = 0;
    spawnWaveForDay(G.day, 'afternoon');
    G.phase = 'PLAYER';
    glog(`☀️ 第${G.day}天下午·更多怪物来袭！`);
  } else {
    G.day++;
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
    glog(`⚔️ 第${G.day}天战斗开始！`);
  }
  syncUnitsToHeroes();
  refreshUI();
}

// 升级时添加免费高共鸣英雄到商店
function addLevelupUnit() {
  var higherTier = Math.min(G.shopTier + 1, 4);
  var pool = UNIT_TIER_POOL[higherTier] || [];
  if (pool.length === 0) return;
  var defId = pool[rngInt(0, pool.length)];
  var def = UNIT_DEFS[defId];
  G.shopItems.units.push({
    id: 'su_' + G.nextUnitId,
    itemType: 'pal',
    unitId: defId,
    defId: defId,
    name: def.name || defId,
    size: def.size || 'medium',
    quality: def.grade || '青铜',
    price: calcUnitPrice(def),
    cost: calcUnitPrice(def),
    tags: def.tags || [],
    frozen: false,
  });
  G.nextUnitId++;
}

// 旧接口别名
function bname(el, sn, tier) { const s = SD[sn]; return `${EL[el]}·${s.n}格·${sn}号·${tier}阶`; }
function slotName(s) { return bname(s.el, s.sn, s.tier); }
