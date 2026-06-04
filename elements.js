/**
 * 元素背包史 · 元素模块
 * 核心战斗差异：元素层、伤害公式、引爆、被动技能、召唤物管理
 * 依赖：data.js（EL/ADV/MAX_STK/MONSTER_TYPES/UNIT_DEFS）、board.js（monAt/summonAt/castleAt）
 */

// ========== 元素层管理 ==========

// 旧式单元素操作（仅 UI 物品放置使用）
// 注意：普通行动块的元素层由 addElementLayers()/commitPlayerActionsToElementField() 统一处理
function addEl(pos, el) {
  const cell = G.board[pos.r][pos.c];
  if (!cell.el || cell.stk === 0) { cell.el = el; cell.stk = 1; }
  else if (cell.el === el) { if (cell.stk < MAX_STK) cell.stk++; }
  // EL_CROSS_REACT 已废弃：同一格可多元素并存，互克不触发覆盖/爆炸;
}

function explCells(pos) {
  return [pos,
    { r: pos.r - 1, c: pos.c }, { r: pos.r + 1, c: pos.c },
    { r: pos.r, c: pos.c - 1 }, { r: pos.r, c: pos.c + 1 }
  ].filter(p => p.r >= 0 && p.r < 8 && p.c >= 0 && p.c < 8);
}

function topElementAt(pos) {
  const key = `${pos.r},${pos.c}`;
  const elData = G.elementCells[key];
  const boardEl = G.board[pos.r][pos.c].el;
  if (elData) {
    if (boardEl && elData[boardEl]?.layers > 0) return { el: boardEl, layers: elData[boardEl].layers };
    for (const el of ['fire', 'water', 'wind', 'earth']) {
      if (elData[el]?.layers > 0) return { el, layers: elData[el].layers };
    }
  }
  const bc = G.board[pos.r][pos.c];
  return bc.el && bc.stk > 0 ? { el: bc.el, layers: bc.stk } : null;
}

function hasElementAt(pos) { return !!topElementAt(pos); }

function syncBoardElementFromElementCells(pos) {
  const key = `${pos.r},${pos.c}`;
  const elData = G.elementCells[key];
  const bc = G.board[pos.r][pos.c];
  if (elData) {
    for (const el of ['fire', 'water', 'wind', 'earth']) {
      if (elData[el]?.layers > 0) { bc.el = el; bc.stk = elData[el].layers; return; }
    }
  }
  bc.el = null; bc.stk = 0;
}

function clearElementAt(pos, el) {
  const key = `${pos.r},${pos.c}`;
  const elData = G.elementCells[key];
  if (elData) {
    const targets = el ? [el] : ['fire', 'water', 'wind', 'earth'];
    targets.forEach(target => {
      if (elData[target]) { elData[target].layers = 0; elData[target].willExplode = false; }
    });
  }
  syncBoardElementFromElementCells(pos);
}

// 按结算可识别的规范结构把 n 层 el 元素写入 elementCells
function addElementLayers(pos, el, n) {
  if (castleAt(pos)) return;
  const key = `${pos.r},${pos.c}`;
  if (!G.elementCells[key]) G.elementCells[key] = {
    fire: { layers: 0, willExplode: false },
    water: { layers: 0, willExplode: false },
    wind: { layers: 0, willExplode: false },
    earth: { layers: 0, willExplode: false },
  };
  const slot = G.elementCells[key][el];
  slot.layers = Math.min(slot.layers + (n || 1), MAX_STK);
  slot.willExplode = slot.layers >= G.explosionThreshold;
  syncBoardElementFromElementCells(pos);
}

// 旧式引爆（仅 addEl 触发，UI 物品放置使用）
// EL_CROSS_REACT 已废弃，不再通过跨元素反应触发 doExplode
// 注意：普通行动块的伤害由 settleExplosions() 统一结算
function doExplode(pos) {
  const cell = G.board[pos.r][pos.c];
  if (!cell.el || cell.stk === 0) return;
  const oldEl = cell.el;
  const dmg = explDmg(cell.stk);
  const elName = EL[oldEl];
  const isCross = hasCrossExplosion();
  const targets = isCross ? explCells(pos) : [pos];
  glog(`💥 ${elName}${cell.stk}引爆！${isCross ? '范围伤害 ' : '单体伤害 '}${dmg}`);
  cell.el = null; cell.stk = 0;
  targets.forEach(tp => {
    const m = monAt(tp);
    if (m) {
      let emult = 1;
      if (m.el && ADV[oldEl] === m.el) { emult = 2; glog(`⚡ 元素克制 ×2！`); }
      dealDmg(m, dmg * emult, `${elName}引爆`);
    }
  });
  G.explPos = null;
  onCoreStateChange();
}



// ========== 引擎成长/统计 ==========

function recomputeGrowth() {
  if (!G.growth) G.growth = { summonTier: 0, healTier: 0, chainTier: 0 };
  const es = G.engineStats || {};
  G.growth.summonTier = Math.floor((es.summonCount || 0) / 3);
  G.growth.healTier = Math.floor((es.healCount || 0) / 4);
  G.growth.chainTier = Math.floor((es.chainCount || 0) / 3);
}

function calcHealAmount() {
  return 2 + Math.floor((G.engineStats?.healCount || 0) / 4) + getHealAmpBonus();
}

function calcHealAtkGain() {
  return 1 + Math.floor((G.engineStats?.healCount || 0) / 8);
}

// ========== 被动技能查询 ==========

function getPassiveAura() {
  let buffHp = 0, buffAtk = 0, splitSprout = null;
  (G.ownedUnits || []).forEach(u => {
    const p = UNIT_DEFS[u.defId]?.passive; if (!p) return;
    const li = Math.max(0, Math.min(3, (u.level || 1) - 1));
    if (p.type === 'buffAllSummons') {
      buffHp += (p.hpByLevel || [])[li] || 0;
      buffAtk += (p.atkByLevel || [])[li] || 0;
    } else if (p.type === 'splitSproutSummon') {
      splitSprout = { count: (p.countByLevel || [])[li] || 2, hpMul: (p.hpMulByLevel || [])[li] || 0.5 };
    }
  });
  return { buffHp, buffAtk, splitSprout };
}

function getSpaceExplosionBonus() {
  let bonus = 0;
  (G.ownedUnits || []).forEach(u => {
    if (!u.active) return;
    const p = UNIT_DEFS[u.defId]?.passive;
    if (p?.type !== 'spaceExplosionBonus') return;
    const li = Math.max(0, Math.min(3, (u.level || 1) - 1));
    bonus += (p.bonusByLevel || [])[li] || 0;
  });
  return bonus;
}

function getHealAmpBonus() {
  let bonus = 0;
  (G.ownedUnits || []).forEach(u => {
    if (!u.active) return;
    const p = UNIT_DEFS[u.defId]?.passive;
    if (p?.type !== 'healAmpBonus') return;
    const li = Math.max(0, Math.min(3, (u.level || 1) - 1));
    bonus += (p.bonusByLevel || [])[li] || 0;
  });
  return bonus;
}

function getCastleDamageReduce() {
  let red = 0;
  (G.ownedUnits || []).forEach(u => {
    if (!u.active) return;
    const p = UNIT_DEFS[u.defId]?.passive;
    if (p?.type !== 'castleReduce') return;
    const li = Math.max(0, Math.min(3, (u.level || 1) - 1));
    red += (p.reductionByLevel || [])[li] || 0;
  });
  return red;
}

function hasCrossExplosion() {
  // 钻石火魔在场上或背包/备战区时，火引爆范围扩展为十字 5 格
  return (G.ownedUnits || []).some(u => {
    const p = UNIT_DEFS[u.defId]?.passive;
    return p?.type === 'crossExplosion';
  });
}

function getAdvHitBonus() {
  let bonus = 0;
  (G.ownedUnits || []).forEach(u => {
    if (!u.active) return;
    const p = UNIT_DEFS[u.defId]?.passive;
    if (p?.type !== 'advHitBonus') return;
    const li = Math.max(0, Math.min(3, (u.level || 1) - 1));
    bonus += (p.bonusByLevel || [])[li] || 0;
  });
  return bonus;
}

function getOwnerDeathDrop(ownerHid) {
  const u = G.ownedUnits.find(unit => {
    const hero = Object.values(G.heroes || {}).find(h => h.id === ownerHid);
    return hero && unit.instanceId === hero.unitId;
  });
  if (!u) return null;
  const p = UNIT_DEFS[u.defId]?.passive;
  if (p?.type !== 'onSummonDeath') return null;
  const li = Math.max(0, Math.min(3, (u.level || 1) - 1));
  return { el: p.el || 'fire', layers: (p.layersByLevel || [])[li] || 2 };
}

// ========== 召唤物查询 ==========

function chooseElementForSummon(pos) {
  const key = `${pos.r},${pos.c}`;
  const elData = G.elementCells[key];
  let best = { el: 'water', layers: 0 };
  if (elData) {
    ['fire', 'water', 'wind', 'earth'].forEach(el => {
      const layers = elData[el]?.layers || 0;
      if (layers > best.layers) best = { el, layers };
    });
  }
  if (best.layers === 0) {
    const tp = topElementAt(pos);
    if (tp) best = { el: tp.el, layers: tp.layers };
  }
  return best;
}

function applySummonPassives(s) {
  const { buffHp, buffAtk } = getPassiveAura();
  if (buffHp) { s.hp += buffHp; s.maxHp += buffHp; }
  if (buffAtk) { s.atk += buffAtk; }
}

function calcSproutSpawnParams(hero, slot, chosen) {
  const bonusHp = slot.bonusHp || 0;
  const layerBonus = Math.min(chosen.layers || 0, 2);
  const base = 6 + bonusHp + layerBonus;
  let count = slot.count || 1;
  let hpMul = 1;
  const u = G.ownedUnits.find(unit => {
    const h = Object.values(G.heroes || {}).find(heroObj => heroObj.id === hero.id);
    return h && unit.instanceId === h.unitId;
  });
  if (u && u.defId === 'sprout_summoner') {
    const { splitSprout } = getPassiveAura();
    if (splitSprout) { count = splitSprout.count; hpMul = splitSprout.hpMul; }
  }
  const extraSpawn = Math.floor((G.engineStats?.summonCount || 0) / 5);
  count = Math.min(count + extraSpawn, 4);
  const hp = Math.max(1, Math.floor(base * hpMul));
  return { count, hp, maxHp: hp };
}

// ========== 召唤物管理 ==========

function spawnSummon(ownerHid, pos, opts) {
  opts = opts || {};
  const baseHp = opts.hp != null ? opts.hp : 3;
  const tierBonus = Math.floor((G.engineStats?.summonCount || 0) / 3);
  const s = {
    id: `sm_${G._nextSummonId++}`,
    kind: 'summon',
    name: opts.name || '水灵',
    el: opts.el || 'water',
    hp: baseHp,
    maxHp: opts.maxHp != null ? opts.maxHp : baseHp,
    atk: (opts.atk != null ? opts.atk : 1) + tierBonus,
    pos: { r: pos.r, c: pos.c },
    ownerHid: ownerHid || null,
    dead: false,
  };
  G.summons.push(s);
  G.engineStats.summonCount++;
  recomputeGrowth();
  applySummonPassives(s);
  return s;
}

function healSummon(summon, amount) {
  if (!summon || summon.dead) return;
  const amt = amount != null ? amount : calcHealAmount();
  summon.hp = Math.min(summon.hp + amt, summon.maxHp);
  summon.atk += calcHealAtkGain();
  G.engineStats.healCount++;
  recomputeGrowth();
}

function killSummon(summon) {
  if (!summon || summon.dead) return;
  summon.dead = true;
  addElementLayers(summon.pos, summon.el || 'water', 1);
  const drop = getOwnerDeathDrop(summon.ownerHid);
  if (drop) addElementLayers(summon.pos, drop.el, drop.layers);
}

function damageSummon(summon, dmg) {
  if (!summon || summon.dead) return;
  summon.hp = Math.max(0, summon.hp - (dmg || 0));
  if (summon.hp <= 0) killSummon(summon);
}
