/**
 * 元素背包史 · 战斗结算模块
 * 总调度器：伤害、回合流程、AI、怪物行动、召唤物行动
 * 依赖：所有下层模块（board/actions/elements/waves）、data.js
 */

// ========== 城堡伤害 ==========

function damagePlayerCastle(dmg, src) {
  if (!G.playerCastle || G.playerCastle.hp <= 0) return;
  const red = getCastleDamageReduce();
  const td = Math.max(1, (dmg || 0) - red);
  G.playerCastle.hp = Math.max(0, G.playerCastle.hp - td);
  glog(`🏰 我方城堡 ${src} -${td}${red > 0 ? ' (护城-' + red + ')' : ''}（${G.playerCastle.hp}/${G.playerCastle.maxHp}）`);
  if (G.playerCastle.hp <= 0) checkGameOver();
}

function damageEnemyCastle(dmg, src) {
  if (!G.enemyCastle || G.enemyCastle.hp <= 0) return;
  G.enemyCastle.hp = Math.max(0, G.enemyCastle.hp - dmg);
  glog(`🏰 敌方城堡 ${src} -${dmg}（${G.enemyCastle.hp}/${G.enemyCastle.maxHp}）`);
  if (G.enemyCastle.hp <= 0) checkGameOver();
}

// ========== 伤害处理 ==========

function dealDmg(monster, dmg, src) {
  monster.hp = Math.max(0, monster.hp - dmg);
  glog(`⚔️ ${src} → ${monster.name} -${dmg}（${monster.hp}/${monster.maxHp}）`);
  if (monster.hp <= 0) {
    monster.dead = true;
    glog(`💀 ${monster.name}被击杀！`);
    if (monster.gold) {
      G.gold += monster.gold;
      glog(`💰 获得 ${monster.gold} 金币！`);
    }
  }
}

// ========== 元素结算 ==========

function settleExplosions() {
  const report = {
    chainSegments: 0, advHits: 0, totalDamage: 0,
    killedCount: 0, clearedWave: false, perfect: false,
  };
  const aliveBefore = G.monsters.filter(m => !m.dead).length;
  const keys = Object.keys(G.elementCells);
  if (keys.length > 0) glog('--- 结算阶段 ---');
  keys.forEach(key => {
    const [r, c] = key.split(',').map(Number);
    const pos = { r, c };
    const monHere = monAt(pos);
    ['fire', 'water', 'wind', 'earth'].forEach(el => {
      const slot = G.elementCells[key][el];
      if (!slot || slot.layers === 0) return;
      if (monHere) {
        report.chainSegments++;
        const r = calcElementDamage(slot.layers, monHere.el, el, { advHitBonus: getAdvHitBonus() });
        const td = r.damage;
        if (r.isAdv) report.advHits++;
        report.totalDamage += td;
        if (r.isAdv) glog(`⚡ 元素克制 ×2！`);
        glog(`⚔️ ${EL[el]}${slot.layers}层→${monHere.name} 单体 -${td}`);
        const wasAlive = !monHere.dead;
        dealDmg(monHere, td, `${EL[el]}元素结算`);
        if (wasAlive && monHere.dead) report.killedCount++;
      } else if (heroAt(pos)) {
        // 英雄身上有层，暂不结算
      } else {
        if (!slot.willExplode) return;
        report.chainSegments++;
        const spaceBonus = getSpaceExplosionBonus();
        const crossActive = hasCrossExplosion();
        const targets = crossActive ? explCells(pos) : [pos];
        const expDmg = calcElementDamage(slot.layers, null, el, { spaceBonus }).damage;
        glog(`💥 ${EL[el]}${slot.layers}层引爆！${crossActive ? '范围伤害 ' : '单体伤害 '}${expDmg}${spaceBonus > 0 ? ' (引信+' + spaceBonus + ')' : ''}`);
        if (crossActive && el === 'fire' && typeof writeStructuredLog === 'function') writeStructuredLog('fire_archon_cross_explode', { center_cell: pos, damage: expDmg, layers: slot.layers }, '钻石火魔触发十字火引爆：中心(' + pos.r + ',' + pos.c + ')，伤害' + expDmg);
        if (typeof bazaarRunTrigger === 'function') bazaarRunTrigger(el === 'fire' ? 'on_fire_explode' : 'on_element_explode', { pos: pos, center_cell: pos, element: el, el: el, damage: expDmg, layers: slot.layers });
        targets.forEach(tp => {
          const m = monAt(tp);
          if (m) {
            const r = calcElementDamage(slot.layers, m.el, el, { spaceBonus, advHitBonus: getAdvHitBonus() });
            const td = r.damage;
            if (r.isAdv) report.advHits++;
            report.totalDamage += td;
            if (r.isAdv) glog(`⚡ 元素克制 ×2！`);
            const wasAlive = !m.dead;
            dealDmg(m, td, `${EL[el]}元素结算`);
            if (wasAlive && m.dead) report.killedCount++;
          } else if (enemyCastleAt(tp)) {
            report.totalDamage += expDmg;
            damageEnemyCastle(expDmg, `${EL[el]}元素结算`);
          }
        });
      }
      // 空格引爆后在该格生成地形陷阱
      if (!monHere && !heroAt(pos) && slot.willExplode && slot.layers > 0) {
        addTrapLayers(pos, el, slot.layers);
      }
      slot.layers = 0; slot.willExplode = false;
      syncBoardElementFromElementCells(pos);
    });
  });
  report.clearedWave = G.monsters.every(m => m.dead);
  report.perfect = report.clearedWave && aliveBefore > 0;
  if (report.perfect) {
    G.gold += 3;
    G.engineStats.perfectCount = (G.engineStats.perfectCount || 0) + 1;
    glog('🌟 完美回合！连锁清场 +3 金');
  }
  if (report.chainSegments > 0) {
    G.engineStats.chainCount = (G.engineStats.chainCount || 0) + report.chainSegments;
  }
  G.lastSettle = report;
  recomputeGrowth();
  // 快照：结算后/怪物移动前的 HP（用于预览验证）
  G._hpAfterSettle = {};
  G.monsters.filter(m => !m.dead && m.hp > 0).forEach(m => { G._hpAfterSettle[m.id] = m.hp; });
  if (report.chainSegments > 0) {
    glog(`🔗 连锁 ×${report.chainSegments}！克制 ×${report.advHits}！合计 −${report.totalDamage}`);
  }
  G.previewEvents = [];
  checkAllDead();
  onCoreStateChange();
}

function settleDamage() { settleExplosions(); }

// ========== 行动槽执行 ==========

function useSlot(idx) {
  var slot = G.slots[idx];
  if (!slot || slot.used || G.phase !== 'PLAYER') return;
  var hero = G.heroes[slot.hid]; if (!hero) return;
  if (slot.skill === 'summonFromCell') {
    if (!execSummonFromCellSkill(hero, slot)) return;
    slot.used = true; slot._committed = true; hero._acted = true;
    G.selSlot = null; G.prevCells = []; G.explPos = null; G.heroPrev = [];
    G.actionLog.push({ type: 'USE_SLOT', slotId: idx, heroId: slot.hid, skill: slot.skill, desc: hero.name + '：召唤' });
  if (typeof triggerRelicHooks === 'function') triggerRelicHooks('on_unit_action', { el: slot.el, sn: slot.sn, heroId: slot.hid });
    if (typeof bazaarRunTrigger === 'function') bazaarRunTrigger('on_pal_action', { heroId: slot.hid, slot: slot, sourceUnit: getUnitByHeroId(slot.hid) });
    onCoreStateChange();
    return;
  }
  if (slot.skill === 'healSummons') {
    execHealSummonsSkill(hero, slot);
    slot.used = true; slot._committed = true; hero._acted = true;
    G.selSlot = null; G.prevCells = []; G.explPos = null; G.heroPrev = [];
    G.actionLog.push({ type: 'USE_SLOT', slotId: idx, heroId: slot.hid, skill: slot.skill, desc: hero.name + '：治疗召唤物' });
  if (typeof triggerRelicHooks === 'function') triggerRelicHooks('on_unit_action', { el: slot.el, sn: slot.sn, heroId: slot.hid });
    if (typeof bazaarRunTrigger === 'function') bazaarRunTrigger('on_pal_action', { heroId: slot.hid, slot: slot, sourceUnit: getUnitByHeroId(slot.hid) });
    onCoreStateChange();
    return;
  }
  var cells = atkCells(hero.pos, slot.sn, slot.dir);
  if (cells.length === 0) { glog('⚠️ 攻击范围为空。'); return; }
  var center = findCenterCell(cells);
  var baseLayers = slot.layers || 1;
  var centerBonus = slot.centerBonus || 0;
  var condEl = slot.conditional ? slot.conditional.el : null;
  var condBonus = slot.conditional ? (slot.conditional.bonus || 0) : 0;
  cells.forEach(function(ap) {
    if (castleAt(ap)) return;
    var key = ap.r + ',' + ap.c;
    if (!G.elementCells[key]) G.elementCells[key] = {
      fire: { layers: 0, willExplode: false },
      water: { layers: 0, willExplode: false },
      wind: { layers: 0, willExplode: false },
      earth: { layers: 0, willExplode: false },
    };
    var elSlot = G.elementCells[key][slot.el];
    var layersToAdd = baseLayers;
    if (ap.r === center.r && ap.c === center.c) layersToAdd += centerBonus;
    if (condEl && elSlot.layers > 0) layersToAdd += condBonus;
    elSlot.layers = Math.min(elSlot.layers + layersToAdd, MAX_STK);
    elSlot.willExplode = elSlot.layers >= G.explosionThreshold;
    var cell = G.board[ap.r][ap.c];
    if (!cell.el || cell.stk === 0) { cell.el = slot.el; cell.stk = Math.min(layersToAdd, MAX_STK); }
    else if (cell.el === slot.el) { cell.stk = Math.min(cell.stk + layersToAdd, MAX_STK); }
  });
  slot.used = true;
  slot._committed = true;
  hero._acted = true;
  G.selSlot = null; G.prevCells = []; G.explPos = null; G.heroPrev = [];
  G.actionLog.push({ type: 'USE_SLOT', slotId: idx, heroId: slot.hid, el: slot.el, sn: slot.sn, dir: slot.dir, cells: cells.map(function(c) { return c.r + ',' + c.c; }), desc: '使用行动块#' + (idx + 1) + '：' + EL[slot.el] });
  if (typeof triggerRelicHooks === 'function') triggerRelicHooks('on_unit_action', { el: slot.el, sn: slot.sn, heroId: slot.hid });
  if (typeof bazaarRunTrigger === 'function') {
    bazaarRunTrigger('on_element_apply', { heroId: slot.hid, slot: slot, sourceUnit: getUnitByHeroId(slot.hid), element: slot.el, el: slot.el, cells: cells, source_cells: cells });
    bazaarRunTrigger('on_pal_action', { heroId: slot.hid, slot: slot, sourceUnit: getUnitByHeroId(slot.hid), cells: cells });
  }
  onCoreStateChange();
}

function commitPlayerActionsToElementField(G) {
  G.slots.forEach((s, idx) => {
    if (!s.used || s._committed) return;
    const hero = G.heroes[s.hid]; if (!hero) return;
    const cells = atkCells(hero.pos, s.sn, s.dir);
    const center = findCenterCell(cells);
    const baseLayers = s.layers || 1;
    const centerBonus = s.centerBonus || 0;
    const condEl = s.conditional?.el;
    const condBonus = s.conditional?.bonus || 0;
    cells.forEach(ap => {
      if (castleAt(ap)) return;
      const key = `${ap.r},${ap.c}`;
      if (!G.elementCells[key]) G.elementCells[key] = {
        fire: { layers: 0, willExplode: false },
        water: { layers: 0, willExplode: false },
        wind: { layers: 0, willExplode: false },
        earth: { layers: 0, willExplode: false },
      };
      const elSlot = G.elementCells[key][s.el];
      let layersToAdd = baseLayers;
      if (ap.r === center.r && ap.c === center.c) layersToAdd += centerBonus;
      if (condEl && elSlot.layers > 0) layersToAdd += condBonus;
      elSlot.layers = Math.min(elSlot.layers + layersToAdd, MAX_STK);
      elSlot.willExplode = elSlot.layers >= G.explosionThreshold;
      const cell = G.board[ap.r][ap.c];
      cell.el = s.el; cell.stk = Math.min(elSlot.layers, MAX_STK);
    });
    s._committed = true;
  });
}

function checkAllDead() {
  if (G.monsters.every(m => m.dead)) {
    glog('✅ 所有怪物被击杀！');
  }
}

function checkGameOver() {
  const allDead = Object.values(G.heroes).every(h => h.hp <= 0);
  if (allDead) { G.runVictory = false; G.phase = 'OVER'; showRunEnd(); return; }
  if (G.playerCastle && G.playerCastle.hp <= 0) { G.runVictory = false; G.phase = 'OVER'; showRunEnd(); return; }
  if (G.enemyCastle && G.enemyCastle.hp <= 0) { G.runVictory = true; G.phase = 'OVER'; showRunEnd(); }
}

// ========== 回合管理 ==========

function _coreEndPlayerTurn() {
  // 核心结束回合逻辑：被 endPlayerTurn() 和 dispatch END_TURN 共用
  // 只改 G，不调 UI（refreshUI/glog/document）
  G.aiBattleStatus = null;
  if (typeof pushReplayStep === 'function') pushReplayStep({ type: 'END_PLAYER_TURN' });
  if (typeof commitPlayerActionsToElementField === 'function') commitPlayerActionsToElementField(G);
  if (typeof settleExplosions === 'function') settleExplosions();
  if (typeof runSummonActions === 'function') runSummonActions();
  if (G.phase === 'OVER') return { phase: 'OVER', over: true };
  G.phase = 'MONSTER'; G.selSlot = null; G.selHero = null; G.prevCells = []; G.explPos = null; G.heroPrev = [];
  if (G.heroes) { Object.keys(G.heroes).forEach(function(k) { G.heroes[k]._acted = false; }); }
  if (typeof computeMonWarn === 'function') computeMonWarn();
  var warnText = '';
  if (G.monWarn && G.monWarn.length) {
    var hasAtk = G.monWarn.some(function(w) { return w.type === 'atk'; });
    warnText = hasAtk ? 'monster_will_attack' : 'monster_moving';
  }
  if (typeof setTimeout === 'function') {
    setTimeout(function() { G.monWarn = []; if (typeof runMonsters === 'function') runMonsters(0); }, 700);
  }
  return { phase: 'MONSTER', warnText: warnText, over: false };
}


function endPlayerTurn() {
  // 委托核心逻辑（不复制），再调 UI
  if (G.phase !== 'PLAYER') return;
  var result = _coreEndPlayerTurn();
  if (result.over) { onCoreStateChange(); return; }
  glog('--- 怪物回合 ---');
  if (result.warnText === 'monster_will_attack') glog('⚠️ 预警：怪物即将攻击英雄！');
  else if (result.warnText === 'monster_moving') glog('👁 预警：怪物移动方向已标出。');
  onCoreStateChange();
}

function finishMonsters() {
  if (G.phase === 'OVER') return;
  G.round++;
  const allDead = G.monsters.every(m => m.dead);
  const castleDead = !G.enemyCastle || G.enemyCastle.hp <= 0;
  if (G.round > G.maxRound || (allDead && castleDead)) {
    var hasBoss = G.monsters ? G.monsters.some(function(m) { return m.typeId && (String(m.typeId).indexOf('boss') >= 0 || m.typeId === 'elite'); }) : false;
    var rewardKey = G.day + '_' + G.dayHalf + '_' + (hasBoss ? 'boss' : 'battle');
    if ((allDead || castleDead) && typeof bazaarResolvePveReward === 'function' && G._pveRewardedKey !== rewardKey) {
      G._pveRewardedKey = rewardKey;
      bazaarResolvePveReward(hasBoss ? 'boss' : 'battle', { day: G.day, dayHalf: G.dayHalf, allDead: allDead });
    } else if (hasBoss && typeof heroAddXp === 'function') {
      if (hasBoss) heroAddXp(1, 'boss_legacy'); // boss/精英击杀+1经验
    }
    if (G.dayHalf === 0) {
      G.dayHalf = 1; G.round = 1; G.hitCount = 0;
      G.slots.forEach(s => { s.used = false; s._committed = false; });
      Object.values(G.heroes).forEach(h => h._acted = false);
      G.previewEvents = [];
      glog(`🛒 第${G.day}天中午·进入商店！`);
      G.phase = 'SHOP';
      openShop();
    } else if (G.dayHalf === 2) {
      glog(`🌙 第${G.day}天夜晚·进入商店！`);
      G.phase = 'SHOP';
      openShop();
    }
  } else {
    G.phase = 'PLAYER'; G.hitCount = 0; G.previewEvents = [];
    G.slots.forEach(s => { s.used = false; s._committed = false; });
    Object.values(G.heroes).forEach(h => h._acted = false);
    glog(`--- 玩家回合 · 第${G.round}/${G.maxRound}小回合 ---`);
  }
  onCoreStateChange();
}

// ========== 怪物行动 ==========

function monsterAct(m) {
  if (m.dead) return;
  let ap = 3;
  while (ap > 0) {
    if (m.dead) break; // 死怪终止
    const lp = { r: m.pos.r, c: m.pos.c - 1 };
    if (lp.c >= 0) {
      const lh = heroAt(lp);
      if (lh) {
        lh.hp = Math.max(0, lh.hp - m.atk);
        const lu = getUnitByHeroId(lh.id); if (lu) lu.hp = lh.hp;
        glog(`👾 ${m.name}攻击${lh.name}！-${m.atk}（${lh.hp}/${lh.maxHp}）`);
        if (lh.hp <= 0) { glog(`💔 ${lh.name}倒下了！`); checkGameOver(); }
        ap -= 1; break;
      }
      if (playerCastleAt(lp)) { damagePlayerCastle(m.atk, `${m.name}攻击`); ap -= 1; break; }
      const ls = summonAt(lp);
      if (ls) { damageSummon(ls, m.atk); glog(`👾 ${m.name}攻击${ls.name}！-${m.atk}（${ls.dead ? 0 : ls.hp}/${ls.maxHp}）`); ap -= 1; break; }
    }
    const dp = { r: m.pos.r + 1, c: m.pos.c };
    if (dp.r <= 12) {
      const dh = heroAt(dp);
      if (dh) {
        dh.hp = Math.max(0, dh.hp - m.atk);
        const du = getUnitByHeroId(dh.id); if (du) du.hp = dh.hp;
        glog(`👾 ${m.name}攻击${dh.name}！-${m.atk}（${dh.hp}/${dh.maxHp}）`);
        if (dh.hp <= 0) { glog(`💔 ${dh.name}倒下了！`); checkGameOver(); }
        ap -= 1; break;
      }
      if (playerCastleAt(dp)) { damagePlayerCastle(m.atk, `${m.name}攻击`); ap -= 1; break; }
      const ds = summonAt(dp);
      if (ds) { damageSummon(ds, m.atk); glog(`👾 ${m.name}攻击${ds.name}！-${m.atk}（${ds.dead ? 0 : ds.hp}/${ds.maxHp}）`); ap -= 1; break; }
    }
    const np = nextMoveFromPos(m.pos, m);
    if (!np) break;
    const block = topElementAt(np);
    if (block) { glog(`👾 ${m.name}被${EL[block.el]}${block.layers}阻挡！本回合结束。`); ap = 0; break; }
    if (!monAt(np) && !heroAt(np) && !castleAt(np) && !summonAt(np)) {
      var fromPos = { r: m.pos.r, c: m.pos.c };
      m.pos = np;
      glog(`👾 ${m.name}→(${np.r},${np.c})`);
      if (typeof writeStructuredLog === 'function') writeStructuredLog('monster_move_step', { monster_id: m.id || m.typeId, monster_name: m.name, from_cell: fromPos, to_cell: np, ap_before: ap, ap_after: ap - 1 }, null);
      if (typeof bazaarRunTrigger === 'function') bazaarRunTrigger('on_monster_move_step', { actor: m, monster: m, from: fromPos, to: np });
      ap -= 1;
      resolveTerrainOnEnter(m, np);
      if (m.dead) break; // 陷阱杀怪后终止
    }
    if (m.dead) break; // 二次防御
    else break;
  }
}

function nextMoveFromPos(pos, m) {
  let best = null, bd = 99;
  const heroes = Object.values(G.heroes).filter(h => h.hp > 0);
  heroes.forEach(h => {
    const d = Math.abs(h.pos.r - pos.r) + Math.abs(h.pos.c - pos.c);
    if (d < bd) { bd = d; best = { r: h.pos.r, c: h.pos.c }; }
  });
  if (G.playerCastle && G.playerCastle.hp > 0) {
    const cd = Math.abs(G.playerCastle.pos.r - pos.r) + Math.abs(G.playerCastle.pos.c - pos.c);
    if (cd < bd) { bd = cd; best = { r: G.playerCastle.pos.r, c: G.playerCastle.pos.c }; }
  }
  if (!best) return null;
  const dr = best.r - pos.r, dc = best.c - pos.c;
  const moves = [];
  if (dc < 0) moves.push({ r: pos.r, c: pos.c - 1 });
  if (dc > 0) moves.push({ r: pos.r, c: pos.c + 1 });
  if (dr < 0) moves.push({ r: pos.r - 1, c: pos.c });
  if (dr > 0) moves.push({ r: pos.r + 1, c: pos.c });
  for (const mv of moves) {
    if (mv.r < 0 || mv.r > 12 || mv.c < 0 || mv.c > 12) continue;
    if (!monAt(mv) && !summonAt(mv) && !heroAt(mv) && !castleAt(mv)) return mv;
  }
  return null;
}

function nextMove(m) { return nextMoveFromPos(m.pos, m); }


// ========== 地形陷阱结算 ==========

/** 怪物进入格子时触发地形陷阱 */
function resolveTerrainOnEnter(monster, pos) {
  if (!G.terrainCells) return;
  var key = pos.r + ',' + pos.c;
  var traps = G.terrainCells[key];
  if (!traps) return;

  ELEMS.forEach(function(el) {
    var layers = traps[el] || 0;
    if (layers <= 0) return;

    var dmg = explDmg(layers);
    var cfg = (typeof getTrapConfig === 'function' ? getTrapConfig() : (typeof TRAP_CONFIG !== 'undefined' ? TRAP_CONFIG : {}))[el] || {};
    var apDelta = cfg.apDelta || 0;

    var oldHp = monster.hp;
    var oldAp = monster.ap || 3;

    monster.hp = Math.max(0, monster.hp - dmg);
    if (monster.ap !== undefined) monster.ap = Math.max(0, monster.ap + apDelta);

    if (dmg > 0) glog('🔥 ' + monster.name + ' 踩中' + cfg.name + layers + '！HP ' + oldHp + '→' + monster.hp + (apDelta ? '，AP ' + oldAp + '→' + (monster.ap||3) : ''));

    if (monster.hp <= 0) {
      monster.dead = true;
      glog('💀 ' + monster.name + ' 被陷阱击杀！');
    }
  });

  // 触发后清空该格陷阱（一次性）
  // 保留元素层不受影响
  G.terrainCells[key] = { fire:0, water:0, wind:0, earth:0 };
}

function simMonAct(m) {
  const startPos = { r: m.pos.r, c: m.pos.c };
  let pos = { r: m.pos.r, c: m.pos.c };
  let ap = 3;
  const movCells = [];
  let atkCell = null, atkTarget = null, stopReason = 'ap_exhausted';
  while (ap > 0) {
    const lp = { r: pos.r, c: pos.c - 1 };
    if (lp.c >= 0) {
      const lh = heroAt(lp);
      if (lh) { atkCell = { r: lp.r, c: lp.c }; atkTarget = lh; stopReason = 'attack'; break; }
      if (playerCastleAt(lp)) { atkCell = { r: lp.r, c: lp.c }; atkTarget = { id: 'playerCastle', name: '我方城堡', hp: G.playerCastle.hp }; stopReason = 'attack'; break; }
      const ls = summonAt(lp);
      if (ls) { atkCell = { r: lp.r, c: lp.c }; atkTarget = ls; stopReason = 'attack'; break; }
    }
    const dp = { r: pos.r + 1, c: pos.c };
    if (dp.r <= 12) {
      const dh = heroAt(dp);
      if (dh) { atkCell = { r: dp.r, c: dp.c }; atkTarget = dh; stopReason = 'attack'; break; }
      if (playerCastleAt(dp)) { atkCell = { r: dp.r, c: dp.c }; atkTarget = { id: 'playerCastle', name: '我方城堡', hp: G.playerCastle.hp }; stopReason = 'attack'; break; }
      const ds = summonAt(dp);
      if (ds) { atkCell = { r: dp.r, c: dp.c }; atkTarget = ds; stopReason = 'attack'; break; }
    }
    const np = nextMoveFromPos(pos, m);
    if (!np) { stopReason = 'no_path'; break; }
    if (hasElementAt(np)) { movCells.push({ r: np.r, c: np.c, type: 'block', step: 4 - ap }); stopReason = 'blocked'; break; }
    if (monAt(np) || heroAt(np) || castleAt(np) || summonAt(np)) { stopReason = 'occupied'; break; }
    movCells.push({ r: np.r, c: np.c, type: 'mov', step: 4 - ap });
    pos = { r: np.r, c: np.c };
    ap -= 1;
  }
  return { movCells, atkCell, atkTarget, dmg: m.atk, startPos, remainAp: ap, stopReason };
}

function runMonsters(idx) {
  const alive = G.monsters.filter(m => !m.dead && m.hp > 0);
  if (idx >= alive.length) { finishMonsters(); return; }
  runMonsterAbilityHook('onRoundStart', alive[idx]);
  monsterAct(alive[idx]);
  onCoreStateChange();
  setTimeout(() => runMonsters(idx + 1), 350);
}

// ========== 怪物能力钩子 ==========

function runMonsterAbilityHook(trigger, monster) {
  if (!monster || monster.dead) return false;
  var ability = monster.ability || null;
  if (!ability && typeof getLegacyMonsterTypes === 'function') {
    var legacyMT = getLegacyMonsterTypes();
    ability = legacyMT[monster.typeId] ? legacyMT[monster.typeId].ability : null;
  }
  if (!ability || ability.trigger !== trigger) return false;
  if (ability.id === 'lava_surge') {
    const cfg = ability.config || {};
    addElementLayers(monster.pos, cfg.el || 'fire', cfg.layers || 1);
    glog(`🔥 ${monster.name}引发熔岩涌动`);
    return true;
  }
  if (ability.id === 'core_split') {
    monster._abilityTicks = (monster._abilityTicks || 0) + 1;
    const cfg = ability.config || {};
    const n = cfg.n || 2;
    if (monster._abilityTicks % n !== 0) return false;
    const dirs = [{ r: 0, c: -1 }, { r: 1, c: 0 }, { r: -1, c: 0 }, { r: 0, c: 1 }];
    const pos = dirs.map(d => ({ r: monster.pos.r + d.r, c: monster.pos.c + d.c }))
      .find(p => p.r >= 0 && p.r < 8 && p.c >= 0 && p.c < 8 && cellFree(p) && !castleAt(p) && !hasElementAt(p));
    if (!pos) return false;
    const typeId = cfg.typeId || 'normal';
    var legacyMT = (typeof getLegacyMonsterTypes === 'function') ? getLegacyMonsterTypes() : {};
    const mt = legacyMT[typeId] || legacyMT.normal || { name: '未知', hp: 8, atk: 1, ap: 5, cost: 2, gold: 2 };
    G.monsters.push({
      id: `split_${Date.now()}_${G.monsters.length}`,
      typeId, name: mt.name,
      hp: mt.hp, maxHp: mt.hp, atk: mt.atk, ap: mt.ap,
      cost: mt.cost, gold: mt.gold,
      pos, dead: false, el: null, ability: mt.ability || null,
    });
    glog(`🔥 ${monster.name}分裂出${mt.name}`);
    return true;
  }
  return false;
}

// ========== 预警计算 ==========

function computeMonWarn() {
  G.monWarn = [];
  G.monsters.filter(m => !m.dead).forEach(m => {
    const { atkCell, atkTarget, movCells } = simMonAct(m);
    if (atkCell && atkTarget) {
      G.monWarn.push({ r: atkCell.r, c: atkCell.c, type: 'atk' });
    } else {
      const movOnly = movCells.filter(c => c.type === 'mov');
      if (movOnly.length > 0) {
        const last = movOnly[movOnly.length - 1];
        G.monWarn.push({ r: last.r, c: last.c, type: 'mov' });
      }
    }
  });
}

// ========== 召唤物行动 ==========

function runSummonActions() {
  if (!G.summons || G.summons.length === 0) return;
  let acted = 0, moved = 0;
  const dirs = [{ r: -1, c: 0 }, { r: 1, c: 0 }, { r: 0, c: -1 }, { r: 0, c: 1 }];
  const attackAdjacent = (s) => {
    for (const d of dirs) {
      const tp = { r: s.pos.r + d.r, c: s.pos.c + d.c };
      if (tp.r < 0 || tp.r > 12 || tp.c < 0 || tp.c > 12) continue;
      const m = monAt(tp);
      if (m) { dealDmg(m, s.atk, `${s.name}攻击`); glog(`💧 ${s.name}(ATK${s.atk})→${m.name} -${s.atk}`); return true; }
    }
    return false;
  };
  G.summons.filter(s => !s.dead).forEach(s => {
    if (attackAdjacent(s)) { acted++; return; }
    const targets = G.monsters.filter(m => !m.dead);
    if (targets.length === 0) return;
    let target = targets[0], best = 99;
    targets.forEach(m => {
      const d = Math.abs(m.pos.r - s.pos.r) + Math.abs(m.pos.c - s.pos.c);
      if (d < best) { best = d; target = m; }
    });
    const rowStep = Math.sign(target.pos.r - s.pos.r);
    const colStep = Math.sign(target.pos.c - s.pos.c);
    const candidates = [
      { r: s.pos.r, c: s.pos.c + colStep },
      { r: s.pos.r + rowStep, c: s.pos.c },
    ].filter(p => p.r >= 0 && p.r < 8 && p.c >= 0 && p.c < 8);
    const np = candidates.find(p => !monAt(p) && !heroAt(p) && !castleAt(p) && !summonAt(p) && !hasElementAt(p));
    if (np) { s.pos = np; moved++; glog(`💧 ${s.name}→(${np.r},${np.c})`); if (attackAdjacent(s)) acted++; }
  });
  if (acted > 0 || moved > 0) glog(`🌀 召唤物行动：${moved} 次移动 / ${acted} 次攻击`);
  checkAllDead();
}

function execSummonFromCellSkill(hero, slot) {
  const cells = atkCells(hero.pos, slot.sn, slot.dir);
  const candidates = cells.filter(p => !heroAt(p) && !monAt(p) && !castleAt(p) && !summonAt(p));
  if (candidates.length === 0) { glog('⚠️ 没有可召唤的空格'); return false; }
  let bestCell = candidates[0], bestLayers = -1;
  candidates.forEach(p => {
    const { layers } = chooseElementForSummon(p);
    if (layers > bestLayers) { bestLayers = layers; bestCell = p; }
  });
  const chosen = chooseElementForSummon(bestCell);
  if (slot.consumeLayers && chosen.layers > 0) {
    const key = `${bestCell.r},${bestCell.c}`;
    const elSlot = G.elementCells[key] && G.elementCells[key][chosen.el];
    if (elSlot) {
      elSlot.layers = Math.max(0, elSlot.layers - 1);
      elSlot.willExplode = elSlot.layers >= G.explosionThreshold;
      syncBoardElementFromElementCells(bestCell);
    }
  }
  const u = G.ownedUnits.find(unit => {
    const h = Object.values(G.heroes || {}).find(heroObj => heroObj.id === hero.id);
    return h && unit.instanceId === h.unitId;
  });
  const isSprout = u && u.defId === 'sprout_summoner';
  const spawnPlan = isSprout
    ? calcSproutSpawnParams(hero, slot, chosen)
    : { count: slot.count || 1, hp: 3 + (slot.bonusHp || 0) + Math.min(chosen.layers, 2), maxHp: 5 + (slot.bonusHp || 0) + Math.min(chosen.layers, 2) };
  for (let i = 0; i < spawnPlan.count; i++) {
    const offset = i === 0 ? bestCell : { r: bestCell.r, c: Math.min(12, bestCell.c + i) };
    if (summonAt(offset) || heroAt(offset) || monAt(offset) || castleAt(offset)) continue;
    spawnSummon(hero.id, offset, { el: chosen.el || 'water', hp: spawnPlan.hp, maxHp: spawnPlan.maxHp, name: chosen.el === 'water' ? '水灵' : '芽灵' });
  }
  glog(`🌱 ${hero.name}在(${bestCell.r},${bestCell.c})召唤${EL[chosen.el || 'water']}单位！`);
  return true;
}

function execHealSummonsSkill(hero, slot) {
  const cells = atkCells(hero.pos, slot.sn, slot.dir);
  let n = 0;
  G.summons.filter(s => !s.dead).forEach(s => {
    if (cells.some(p => p.r === s.pos.r && p.c === s.pos.c)) { healSummon(s); n++; }
  });
  if (n > 0) glog(`💧 ${hero.name}治疗${n}个召唤物，攻击成长+${n}`);
  else glog('⚠️ 范围内没有可治疗的召唤物');
  return n > 0;
}

// ========== AI 战斗计划 ==========

const ALLOW_AUTO_MOVE = true;

function _aiPlanKey(pos) { return pos.r + ',' + pos.c; }

function _aiSlotLabel(s, i) { return '#' + (i + 1) + ' ' + (EL[s.el] || s.el) + ' sn' + s.sn + ' ' + (s.dir || 'right'); }

function _aiCellBlocked(pos, movingHeroId, reserved) {
  if (!inBoard(pos)) return true;
  if (monAt(pos) || summonAt(pos) || hasElementAt(pos) || castleAt(pos)) return true;
  const h = heroAt(pos);
  if (h && h.id !== movingHeroId) return true;
  return reserved && reserved.has(_aiPlanKey(pos));
}

function _aiMaxSlotRange(hid) {
  let maxRange = 1;
  G.slots.forEach(s => {
    if (s.used || s.hid !== hid) return;
    const shape = SD[s.sn]; if (!shape) return;
    shape.cells.forEach(([dr, dc]) => { if (Math.abs(dc) > maxRange) maxRange = Math.abs(dc); });
  });
  return maxRange;
}

function _aiTargetCells() {
  const cells = G.monsters.filter(m => !m.dead).map(m => m.pos);
  if (G.enemyCastle && G.enemyCastle.hp > 0) cells.push(G.enemyCastle.pos);
  return cells.filter(inBoard);
}

function _aiChooseMove(hid, heroIdx, reserved) {
  const hero = G.heroes[hid];
  const targets = _aiTargetCells();
  if (!hero || hero._acted || targets.length === 0 || !ALLOW_AUTO_MOVE) return null;
  if (canHeroAttackEnemyFrom(hero.pos, hid)) return null;

  // === 增强：推线向敌方城堡方向 ===
  // 1. 计算最难触及的列（骑士方格最右列 vs 城堡列的最小值，确保总在推进）
  const maxRange = _aiMaxSlotRange(hid);
  // 包含城堡作为推进目标，确保最终目标列接近城堡 (c=7)
  const castleCol = G.enemyCastle && G.enemyCastle.hp > 0 ? G.enemyCastle.pos.c : 7;
  const minTargetCol = Math.min(...targets.map(t => t.c));
  // 目标列 = 到达城堡需要的最小列
  const pushCol = Math.min(castleCol, Math.max(minTargetCol, hero.pos.c + 1));
  const baseCol = Math.max(0, Math.min(boardCols() - 1, pushCol - maxRange));

  // 2. 行选择：英雄向怪物行/城堡行移动
  const density = [...new Set(targets.map(t => t.r))].map(r => ({ r, cnt: targets.filter(t => t.r === r).length }))
    .sort((a, b) => b.cnt - a.cnt || Math.abs(a.r - hero.pos.r) - Math.abs(b.r - hero.pos.r));

  // 城堡行也是重要目标
  const castleRowWeight = castleCol <= 7 ? 2 : 0;
  if (G.enemyCastle && G.enemyCastle.hp > 0) {
    const cr = G.enemyCastle.pos.r;
    const existing = density.find(d => d.r === cr);
    if (existing) existing.cnt += castleRowWeight;
    else density.push({ r: cr, cnt: castleRowWeight });
  }
  density.sort((a, b) => b.cnt - a.cnt || Math.abs(a.r - hero.pos.r) - Math.abs(b.r - hero.pos.r));

  const rowTarget = density.length > 0 ? density[Math.min(heroIdx, density.length - 1)].r : hero.pos.r;

  // 3. 生成候选格（优先推向右方高列）
  const cols = boardCols();
  const candidates = [];
  for (let off = 0; off < cols; off++) {
    candidates.push({ r: rowTarget, c: Math.min(cols - 1, baseCol + off) });
    candidates.push({ r: rowTarget, c: Math.max(0, baseCol - off) });
  }
  for (const t of candidates) {
    if (t.r === hero.pos.r && t.c === hero.pos.c) return null;
    if (_aiCellBlocked(t, hid, reserved)) continue;
    var reason = '推线向城堡';
    if (castleCol - t.c <= maxRange) reason = '已进入城堡攻击范围';
    else reason = '推线推进';
    return { heroId: hid, from: { r: hero.pos.r, c: hero.pos.c }, to: t, reason: reason };
  }
  return null;
}

function buildAiBattleTurnPlan() {
  const plan = {
    type: 'AI_BATTLE_PLAN', phase: G.phase, canRun: false,
    moves: [], actions: [], summary: '', reason: '',
    slotsTotal: (G.slots || []).length, slotsUsable: 0,
  };
  if (G.phase !== 'PLAYER') { plan.reason = '当前不是玩家回合'; plan.summary = 'AI 等待玩家回合'; return plan; }
  const heroIds = Object.keys(G.heroes).filter(hid => G.heroes[hid].hp > 0);
  const reserved = new Set();
  for (let heroIdx = 0; heroIdx < heroIds.length; heroIdx++) {
    const hid = heroIds[heroIdx];
    const hero = G.heroes[hid];
    if (!hero) continue;
    const mv = _aiChooseMove(hid, heroIdx, reserved);
    if (mv) { plan.moves.push(mv); reserved.add(_aiPlanKey(mv.to)); }
    else reserved.add(_aiPlanKey(hero.pos));
  }
  for (let heroIdx = 0; heroIdx < heroIds.length; heroIdx++) {
    const hid = heroIds[heroIdx];
    // 收集所有可用行动槽，按射程排序（长射程优先，十字形状优先）
    const heroActions = [];
    G.slots.forEach((s, i) => {
      if (s.used || s.hid !== hid || !G.heroes[s.hid]) return;
      const moved = plan.moves.find(m => m.heroId === hid);
      const pos = moved ? moved.to : G.heroes[s.hid].pos;
      if (atkCells(pos, s.sn, s.dir).length === 0) return;
      // 计算射程：最大列偏移（越深越靠近城堡）
      var maxCol = 0;
      var hitCastleRange = false;
      (SD[s.sn]?.cells || []).forEach(function(c) {
        var dc = Math.abs(c[1] || 0);
        if (dc > maxCol) maxCol = dc;
        var tp = { r: pos.r + (c[0]||0), c: pos.c + (c[1]||0) };
        if (enemyCastleAt(tp)) hitCastleRange = true;
      });
      // 十字形状 (sn=12) 和长直线优先，能打到城堡的尤其优先
      var depthScore = maxCol + (s.sn === 12 ? 2 : 0) + (s.sn >= 10 ? 1 : 0) + (s.layers || 0 > 1 ? 1 : 0) + (hitCastleRange ? 10 : 0);
      heroActions.push({ slotId: i, hid: hid, sn: s.sn, depthScore: depthScore, label: _aiSlotLabel(s, i), hitCastleRange: hitCastleRange });
    });
    // 按深度排序
    heroActions.sort(function(a, b) { return b.depthScore - a.depthScore; });
    heroActions.forEach(function(a) {
      plan.actions.push({ slotId: a.slotId, heroId: hid, sn: a.sn, depthScore: a.depthScore, label: a.label, hitCastleRange: a.hitCastleRange });
    });
  }
  plan.slotsUsable = plan.actions.length;
  plan.canRun = plan.moves.length > 0 || plan.actions.length > 0;
  plan.reason = plan.canRun ? 'ready' : '没有可执行的英雄动作';
  plan.summary = plan.canRun ? `AI 计划：移动${plan.moves.length}步，施放${plan.actions.length}个符文` : 'AI 没有找到可执行动作';
  return plan;
}

function planAiBattleTurn() {
  const plan = buildAiBattleTurnPlan();
  G.aiBattleStatus = { phase: 'planned', summary: plan.summary, moves: plan.moves.length, actions: plan.actions.length };
  glog('🧠 ' + plan.summary);
  onCoreStateChange();
  return plan;
}

function executeAiBattlePlan_sync(plan) {
  if (!plan) plan = buildAiBattleTurnPlan();
  if (!plan.canRun) { glog('⚠️ ' + (plan.reason || 'AI 没有可执行动作')); return plan; }
  G.aiBattleStatus = { phase: 'executing', summary: plan.summary, moves: plan.moves.length, actions: plan.actions.length };
  G.actionLog.push({ type: 'AI_BATTLE', desc: plan.summary, moves: plan.moves.length, actions: plan.actions.length });
  plan.moves.forEach(m => {
    if (!G.heroes[m.heroId]) return;
    G.heroes[m.heroId].pos = { r: m.to.r, c: m.to.c };
    glog(`🤖 ${G.heroes[m.heroId].name}→(${m.to.r},${m.to.c})`);
  });
  var usedCount = 0;
  plan.actions.forEach(a => {
    const s = G.slots[a.slotId];
    if (!s || s.used || !G.heroes[s.hid]) return;
    if (atkCells(G.heroes[s.hid].pos, s.sn, s.dir).length === 0) return;
    glog(`🤖 使用 ${G.heroes[s.hid].name}·${_aiSlotLabel(s, a.slotId)}`);
    useSlot(a.slotId);
    if (s.used) usedCount++;
  });
  plan.executedActions = usedCount;
  glog(`⚡ 我方自动行动：移动${plan.moves.length}步，施放${usedCount}个符文。`);
  return plan;
}

function runAiBattleTurn_sync(opts) {
  opts = opts || {};
  if (G.phase !== 'PLAYER') return buildAiBattleTurnPlan();
  const plan = planAiBattleTurn();
  if (!plan.canRun) return plan;
  executeAiBattlePlan_sync(plan);
  if (opts.endTurn !== false) endPlayerTurn();
  return plan;
}

// ========== 回合/小回合配置 ==========

function syncMaxRoundForPhase() {
  const d = G.day || 1;
  const phase = G.dayHalf === 2 ? 'afternoon' : 'morning';
  // 优先从 JSON round_config 读取，fallback 旧 DAY_ROUND_CONFIG
  var roundVal = (typeof getRoundsForDay === 'function') ? getRoundsForDay(d, phase) : null;
  if (roundVal != null) {
    G.maxRound = roundVal;
    return;
  }
  const cfg = DAY_ROUND_CONFIG[d] || DAY_ROUND_CONFIG[1];
  G.maxRound = cfg[phase] || 2;
}
