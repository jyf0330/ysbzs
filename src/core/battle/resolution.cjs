const { applyTrapDamageBonus } = require('../outerBattleEffects.cjs');

function createResolutionModule(deps) {
  const { pushEvent, mech, elementRules, fireDamage, explodeIfEnemyOnFire, clone, getCell, combatTargets, unitCamp, terrainModules, hasTerrain, ensureElements, weakenUnformedElements, addElementToCell, livingLeader, finishBattle, syncDerivedBoard } = deps;
function applyElement(state, actor, target, element, layers, ctx = {}) {
  ensureElements(target);
  let appliedLayers = Number(layers || 0);
  let cellResult = null;
  if (target.position) {
    const cell = getCell(state, target.position.r, target.position.c);
    if (cell) {
      weakenUnformedElements(state, cell, 1, actor.displayName || actor.name);
      cellResult = addElementToCell(state, actor, cell, element, layers, ctx.source || 'unit_hit_element');
      appliedLayers = Number(cellResult.layers || appliedLayers);
    }
  }
  const before = target.elements[element] || 0;
  const holderResult = elementRules.addElementPacketToHolder(state, target, element, appliedLayers, {
    unitId: actor?.id,
    sourceUnitId: actor?.id,
    sourceName: actor?.displayName || actor?.name || '系统',
    sourceActionId: ctx.source || 'unit_status_element',
    ownerSide: unitCamp(actor),
    tags: ['unit_status', 'mirrored_from_cell']
  }, {
    reason: ctx.source || 'unit_status_element',
    path: `unit.${target.id}.elements.${element}`,
    skipModifiers: true,
    tags: ['unit_status', 'mirrored_from_cell']
  });
  const to = target.elements[element] || 0;
  pushEvent(state, 'APPLY_ELEMENT', { actorId: actor.id, targetId: target.id, element, layers: appliedLayers, from: before, to, packetId: holderResult.packet && holderResult.packet.packetId, cellPacketId: cellResult && cellResult.packetId, text: `${actor.displayName || actor.name} 给 ${target.displayName || target.name} 叠${element}${appliedLayers}层，${element}层 ${before}→${to}。` });
  mech.afterElementApply(state, actor, target, element, appliedLayers);
}

function applyElementToCell(state, actor, cell, element, layers) {
  weakenUnformedElements(state, cell, 1, actor.displayName || actor.name);
  return addElementToCell(state, actor, cell, element, layers);
}

function triggerTerrainOnEnter(state, unit, cell) {
  if (!unit || !cell) return false;
  let triggered = false;
  if ((cell.elements?.火 || 0) >= 3 && cell.elementCamps?.火 && cell.elementCamps.火 !== unitCamp(unit)) {
    const result = elementRules.explodeIfEnemyOnFire(state, cell, null, { source: 'fire_trap_enter' });
    if (result) {
      const boosted = applyTrapDamageBonus(state, result.damage, { source: 'fire_trap_enter', r: cell.r, c: cell.c, unitId: unit.id });
      const effect = boosted.effects[0] || null;
      pushEvent(state, 'FIRE_TRAP_TRIGGER', { unitId: unit.id, r: cell.r, c: cell.c, layers: result.layersBefore, baseDamage: boosted.baseDamage, bonusDamage: boosted.bonusDamage, damage: boosted.damage, eventId: effect ? effect.eventId : null, effectId: effect ? effect.effectId : null, effects: boosted.effects, text: `${unit.displayName || unit.name} 踩入 R${cell.r}C${cell.c} 爆火陷阱：火${result.layersBefore}层，伤害=${boosted.baseDamage}${boosted.bonusDamage ? `+陷阱增伤${boosted.bonusDamage}` : ''}=${boosted.damage}，火${result.layersBefore}→火0。` });
      damageUnit(state, null, unit, boosted.damage, { element: '火', terrain: true, sourceType: 'fire_trap_enter' });
      elementRules.clearElement(state, unit, '火', { reason: 'fire_trap_enter_clear_unit_status' });
      triggered = true;
      if (!unit.alive || unit.hp <= 0) return true;
    }
  }
  if (!hasTerrain(cell)) return triggered;
  for (const mod of terrainModules(cell)) {
    if (!mod || mod.camp === unitCamp(unit)) continue;
    const damage = Math.max(0, Number(mod.damage ?? mod.layers ?? 0));
    const apDelta = Number(mod.apDelta ?? (mod.element === '风' ? -Number(mod.layers || 1) : 0));
    const apFrom = unit.ap;
    if (apDelta) unit.ap = Math.max(0, Number(unit.ap || 0) + apDelta);
    pushEvent(state, 'TERRAIN_TRIGGER', { unitId: unit.id, r: cell.r, c: cell.c, element: mod.element, layers: mod.layers, damage, apFrom, apTo: unit.ap, text: `${unit.displayName || unit.name} 踩入 R${cell.r}C${cell.c}，触发${mod.element}地形：伤害${damage}${apDelta ? `，AP${apFrom}→${unit.ap}` : ''}。` });
    if (damage > 0) damageUnit(state, null, unit, damage, { element: mod.element, terrain: true });
    triggered = true;
    if (!unit.alive || unit.hp <= 0) break;
  }
  return triggered;
}

function damageUnit(state, source, target, amount, ctx = {}) {
  if (!target || target.alive === false || target.hp <= 0 || amount <= 0) return 0;
  ensureElements(target);
  let raw = amount;
  let logs = [];
  if (!ctx.skipMechanics) {
    const calc = mech.beforeDamage(state, target, source, amount, ctx);
    raw = calc.damage;
    logs = calc.logs || [];
  }
  let final = Math.max(0, raw - (target.def || 0));
  const shieldBefore = target.shield;
  const hpBefore = target.hp;
  const shieldAbsorb = Math.min(target.shield, final);
  target.shield -= shieldAbsorb;
  final -= shieldAbsorb;
  if (final > 0) { target.hp = Math.max(0, target.hp - final); target.roundDamageTaken = (target.roundDamageTaken || 0) + final; }
  pushEvent(state, 'DAMAGE', { sourceId: source?.id, targetId: target.id, element: ctx.element, raw: amount, final: shieldAbsorb + final, shieldFrom: shieldBefore, shieldTo: target.shield, hpFrom: hpBefore, hpTo: target.hp, logs, text: `${source?.displayName || source?.name || '系统'} 对 ${target.displayName || target.name} 造成${ctx.element || ''}伤害：原始${amount}→有效${shieldAbsorb + final}，盾${shieldBefore}→${target.shield}，HP${hpBefore}→${target.hp}。` });
  if (!ctx.skipMechanics) {
    if (hpBefore !== target.hp) mech.afterDamage(state, target, source, final);
    if (source && shieldAbsorb + final > 0) mech.afterHit(state, target, source, shieldAbsorb + final);
  }
  if (target.hp <= 0 && target.alive) {
    target.alive = false;
    pushEvent(state, 'UNIT_DEAD', { unitId: target.id, name: target.name, text: `${target.displayName || target.name} HP${hpBefore}→0，死亡。` });
    mech.onDeath(state, target, source);
    if (target.id === state.leaders?.enemy?.id) finishBattle(state, true);
    if (target.id === state.leaders?.player?.id) finishBattle(state, false);
  }
  syncDerivedBoard(state);
  return shieldAbsorb + final;
}

function settleElements(state) {
  // 系统默认：火/水/风/土≥3层 → Σ(1..N) 伤害 → 清零
  // 空格火≥3层保留为爆火陷阱（不引爆不消失）
  // 水/风/土特殊效果由英雄领域/机制开启（毒/回血/聚火/土障）
  const EL_NAMES = { 火: '火爆', 水: '水击', 风: '风袭', 土: '土崩' };
  // 1. 有单位的格子：结算元素伤害
  for (const target of [...combatTargets(state, 'enemy'), ...combatTargets(state, 'player')]) {
    if (!target.alive || !target.position) continue;
    const cell = getCell(state, target.position.r, target.position.c);
    if (!cell) continue;
    for (const el of ['火', '水', '风', '土']) {
      const layers = cell.elements[el] || 0;
      if (layers < 3) continue;
      const dmg = fireDamage(layers); // Σ(1..N) 默认公式
      pushEvent(state, 'ELEMENT_SETTLE', {
        targetId: target.id, element: el, layers,
        damage: dmg,
        text: `${target.displayName || target.name} 所在格${el}${layers}层结算，${EL_NAMES[el] || el}伤害=${dmg}。`
      });
      damageUnit(state, null, target, dmg, { element: el, sourceType: 'element_settle' });
      elementRules.clearElement(state, cell, el, { reason: 'element_settle_clear' });
      elementRules.clearElement(state, target, el, { reason: 'element_settle_clear_unit_status' });
      cell.elements[el] = 0;
      break;
    }
    if (state.phase === 'battle_end') break;
  }
  // 2. 空格火≥3层：保留为爆火陷阱
  if (state.phase !== 'battle_end') {
    for (const cell of state.board.cells) {
      if (cell.unitId) continue;
      const fireL = cell.elements.火 || 0;
      if (fireL >= 3) {
        pushEvent(state, 'ELEMENT_SETTLE', {
          r: cell.r, c: cell.c, layers: fireL,
          text: `R${cell.r}C${cell.c} 火${fireL}层，形成空格爆火陷阱（不引爆不消失）。`
        });
      }
    }
  }
  syncDerivedBoard(state);
}

  return { applyElement, applyElementToCell, triggerTerrainOnEnter, damageUnit, settleElements };
}

module.exports = { createResolutionModule };
