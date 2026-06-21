// @ts-check

const { targetCellsForShape } = require('./shapeCatalog.cjs');

const QUALITY_EFFECT_IDS = Object.freeze([
  'S01', 'S02', 'S03', 'S04', 'S05', 'S06', 'S07', 'S08',
  'G01', 'G02', 'G03', 'G04', 'G05', 'G06', 'G07', 'G08', 'G09', 'G10',
  'G11', 'G12', 'G13', 'G14', 'G15', 'G16', 'G17', 'G18', 'G19', 'G20',
  'G21', 'G22', 'G23', 'G24', 'G25', 'G26', 'G27', 'G28', 'G29', 'G30',
  'D01', 'D02', 'D03', 'D04', 'D05', 'D06', 'D07', 'D08', 'D09', 'D10',
  'D11', 'D12', 'D13', 'D14', 'D15', 'D16', 'D17', 'D18', 'D19', 'D20',
  'D21', 'D22', 'D23', 'D24', 'D25', 'D26', 'D27', 'D28', 'D29', 'D30'
]);

function upgrade(unit) { return unit?.qualityUpgrade || null; }
function upgradeId(unit) { return upgrade(unit)?.id || unit?.qualityProgression?.upgradeId || null; }
function posKey(p) { return `${Number(p.r)},${Number(p.c)}`; }
function clone(v) { return JSON.parse(JSON.stringify(v)); }
function livingUnit(unit) { return !!unit && unit.alive !== false && Number(unit.hp || 0) > 0; }
function unitCamp(unit) { return unit?.camp || (unit?.side === 'hero' ? 'player' : 'enemy'); }
function isAlly(actor, unit) { return actor && unit && unitCamp(actor) === unitCamp(unit); }
function isEnemy(actor, unit) { return actor && unit && unitCamp(actor) !== unitCamp(unit); }

function ensureQualityRuntime(unit) {
  unit.qualityRuntime = unit.qualityRuntime || { killCount: 0, permanentAtk: 0, flags: {}, actionSeq: 0 };
  unit.qualityRuntime.flags = unit.qualityRuntime.flags || {};
  return unit.qualityRuntime;
}

function pushQualityEvent(state, deps, type, payload) {
  if (typeof deps.pushEvent === 'function') deps.pushEvent(state, type, payload);
}

function addShield(state, unit, amount, deps, reason) {
  if (!livingUnit(unit) || amount <= 0) return 0;
  const before = Number(unit.shield || 0);
  unit.shield = before + amount;
  unit.maxShield = Math.max(Number(unit.maxShield || 0), unit.shield);
  pushQualityEvent(state, deps, 'QUALITY_SHIELD', {
    unitId: unit.id,
    amount,
    shieldFrom: before,
    shieldTo: unit.shield,
    reason,
    text: `${unit.displayName || unit.name} 触发${reason}：护盾 ${before}→${unit.shield}。`
  });
  return amount;
}

function healUnit(state, unit, amount, deps, reason) {
  if (!livingUnit(unit) || amount <= 0) return 0;
  const before = Number(unit.hp || 0);
  const maxHp = Math.max(before, Number(unit.maxHp || before));
  unit.hp = Math.min(maxHp, before + amount);
  const healed = unit.hp - before;
  if (healed > 0) pushQualityEvent(state, deps, 'QUALITY_HEAL', {
    unitId: unit.id,
    amount: healed,
    hpFrom: before,
    hpTo: unit.hp,
    reason,
    text: `${unit.displayName || unit.name} 触发${reason}：HP ${before}→${unit.hp}。`
  });
  return healed;
}

function allUnits(state) { return [...(state.units || []), state.leaders?.player, state.leaders?.enemy].filter(Boolean); }
function unitAtCell(state, p) {
  return allUnits(state).find(u => livingUnit(u) && u.position && Number(u.position.r) === Number(p.r) && Number(u.position.c) === Number(p.c)) || null;
}
function unitsAtCells(state, cells) {
  const keys = new Set(cells.map(posKey));
  return allUnits(state).filter(u => livingUnit(u) && u.position && keys.has(posKey(u.position)));
}
function nearestEnemy(state, actor, excludeIds = new Set()) {
  const pos = actor?.position || { r: 0, c: 0 };
  const enemies = allUnits(state).filter(u => livingUnit(u) && isEnemy(actor, u) && u.position && !excludeIds.has(u.id));
  enemies.sort((a, b) => {
    const da = Math.abs(a.position.r - pos.r) + Math.abs(a.position.c - pos.c);
    const db = Math.abs(b.position.r - pos.r) + Math.abs(b.position.c - pos.c);
    return da - db || String(a.id).localeCompare(String(b.id));
  });
  return enemies[0] || null;
}
function distanceFromActor(actor, p) {
  const pos = actor?.position || { r: 0, c: 0 };
  return Math.abs(Number(p.r) - Number(pos.r)) + Math.abs(Number(p.c) - Number(pos.c));
}
function coreIndex(cells) { return Math.max(0, Math.floor((cells.length - 1) / 2)); }
function farthestIndex(actor, cells) {
  let best = 0, bestDist = -1;
  for (let i = 0; i < cells.length; i += 1) {
    const d = distanceFromActor(actor, cells[i]);
    if (d > bestDist) { best = i; bestDist = d; }
  }
  return best;
}
function firstCellHasTarget(state, actor, p) { const u = unitAtCell(state, p); return !!u && isEnemy(actor, u); }
function isCoreCell(cells, p) { return cells[coreIndex(cells)] && posKey(cells[coreIndex(cells)]) === posKey(p); }
function isFarthestCell(actor, cells, p) { const i = farthestIndex(actor, cells); return cells[i] && posKey(cells[i]) === posKey(p); }

function directionDelta(dir = 'right') {
  const d = String(dir || 'right').toLowerCase();
  if (['up', 'u', '↑', 'north', '上'].includes(d)) return { dr: -1, dc: 0 };
  if (['down', 'd', '↓', 'south', '下'].includes(d)) return { dr: 1, dc: 0 };
  if (['left', 'l', '←', 'west', '左'].includes(d)) return { dr: 0, dc: -1 };
  return { dr: 0, dc: 1 };
}
function addUniqueCell(out, p, deps, modifier = null) {
  if (!p) return;
  if (typeof deps.inBoard === 'function' && !deps.inBoard(p)) return;
  const key = posKey(p);
  if (out.some(x => posKey(x) === key)) return;
  out.push({ r: Number(p.r), c: Number(p.c) });
  if (modifier && modifier.slot) {
    modifier.slot.qualityCellModifiers = modifier.slot.qualityCellModifiers || {};
    modifier.slot.qualityCellModifiers[key] = Object.assign({}, modifier.data || {});
  }
}
function extendFromFarthest(actor, cells, dir, deps, slot, data) {
  if (!cells.length) return null;
  const d = directionDelta(dir);
  const far = cells[farthestIndex(actor, cells)];
  const p = { r: far.r + d.dr, c: far.c + d.dc };
  addUniqueCell(cells, p, deps, { slot, data });
  return p;
}
function mirrorCells(actor, baseCells, out, deps, slot, data) {
  const start = actor.position || { r: 0, c: 0 };
  for (const p of baseCells) addUniqueCell(out, { r: 2 * Number(start.r) - Number(p.r), c: 2 * Number(start.c) - Number(p.c) }, deps, { slot, data });
}
function addMissingCorner(baseCells, out, deps, slot, data) {
  const rows = [...new Set(baseCells.map(p => Number(p.r)))];
  const cols = [...new Set(baseCells.map(p => Number(p.c)))];
  if (rows.length !== 2 || cols.length !== 2) return null;
  for (const r of rows) for (const c of cols) {
    if (!baseCells.some(p => Number(p.r) === r && Number(p.c) === c)) {
      const p = { r, c };
      addUniqueCell(out, p, deps, { slot, data });
      return p;
    }
  }
  return null;
}

function mutateActionCells(state, actor, slot, cells, deps) {
  const id = upgradeId(actor);
  const out = cells.map(p => ({ r: Number(p.r), c: Number(p.c) }));
  slot.qualityCellModifiers = {};
  if (!id || !out.length) return out;
  const base = out.slice();
  switch (id) {
    case 'D01':
      extendFromFarthest(actor, out, slot.direction, deps, slot, { damageDelta: 0, source: id });
      break;
    case 'D02':
      mirrorCells(actor, base, out, deps, slot, { damageDelta: -2, source: id });
      break;
    case 'D03':
      mirrorCells(actor, base, out, deps, slot, { damageDelta: 0, source: id });
      break;
    case 'D04': {
      const first = base[0];
      if (first) addUniqueCell(out, { r: first.r - 1, c: first.c + 1 }, deps, { slot, data: { damageDelta: 0, source: id } });
      break;
    }
    case 'D06': {
      const start = actor.position || { r: 0, c: 0 };
      for (const p of base) {
        const dr = Math.sign(Number(p.r) - Number(start.r));
        const dc = Math.sign(Number(p.c) - Number(start.c));
        addUniqueCell(out, { r: Number(p.r) + dr, c: Number(p.c) + dc }, deps, { slot, data: { damageDelta: -2, source: id } });
      }
      break;
    }
    case 'D09':
      addMissingCorner(base, out, deps, slot, { damageDelta: -2, source: id });
      break;
    case 'D10':
      extendFromFarthest(actor, out, slot.direction, deps, slot, { damageDelta: -1, source: id });
      break;
    case 'D20':
      out.reverse();
      break;
    default:
      break;
  }
  return out;
}

function applyQualityRoundStartEffects(state, unit, deps) {
  if (!livingUnit(unit)) return;
  const id = upgradeId(unit);
  const runtime = ensureQualityRuntime(unit);
  runtime.actionSeq = 0;
  runtime.lastChainDamage = 0;
  if (!id) return;
  if (id === 'S01') addShield(state, unit, 15, deps, '护体');
  if (id === 'S02') healUnit(state, unit, 20, deps, '自愈');
  if (id === 'S03' && !runtime.flags.s03Applied) {
    const beforeMax = Number(unit.maxHp || unit.hp || 0);
    const beforeHp = Number(unit.hp || beforeMax);
    const afterMax = Math.min(30, beforeMax * 2);
    const delta = Math.max(0, afterMax - beforeMax);
    unit.maxHp = afterMax;
    unit.hp = Math.min(afterMax, beforeHp + delta);
    runtime.flags.s03Applied = true;
    pushQualityEvent(state, deps, 'QUALITY_MAX_HP', { unitId: unit.id, hpFrom: beforeHp, hpTo: unit.hp, maxHpFrom: beforeMax, maxHpTo: afterMax, text: `${unit.displayName || unit.name} 触发壮体：最大生命 ${beforeMax}→${afterMax}。` });
  }
  if (id === 'G01') {
    runtime.mode = Number(unit.hp || 0) <= Number(unit.maxHp || unit.hp || 1) / 2 ? '守' : '攻';
    if (runtime.mode === '守') addShield(state, unit, 8, deps, '攻守切换·守');
  }
  applyBoardTraceRoundStart(state, unit, deps);
}

function applyBoardTraceRoundStart(state, unit, deps) {
  if (!livingUnit(unit) || !unit.position || typeof deps.getCell !== 'function') return;
  const cell = deps.getCell(state, unit.position.r, unit.position.c);
  if (!cell || !Array.isArray(cell.qualityTraces)) return;
  for (const trace of cell.qualityTraces) {
    if (!trace || trace.expiresRound < Number(state.round || 0)) continue;
    if (trace.id === 'D26' && isAlly(trace.actor, unit)) healUnit(state, unit, 4, deps, '木痕');
  }
}

function applyPreActionQualityEffects(state, actor, slot, cells, deps) {
  const id = upgradeId(actor);
  if (!id) return;
  const runtime = ensureQualityRuntime(actor);
  runtime.actionSeq = 0;
  runtime.lastChainDamage = 0;
  runtime.firstKillThisAction = false;
  const start = actor.position || { r: 0, c: 0 };
  if (id === 'G08') {
    const d = directionDelta(slot.direction);
    const back = { r: Number(start.r) - d.dr, c: Number(start.c) - d.dc };
    const ally = unitAtCell(state, back);
    if (ally && isAlly(actor, ally)) addShield(state, ally, 10, deps, '背向守势');
  }
  if (id === 'G21') {
    const d = directionDelta(slot.direction);
    const back = { r: Number(start.r) - d.dr, c: Number(start.c) - d.dc };
    const ally = unitAtCell(state, back);
    if (ally && isAlly(actor, ally)) addShield(state, ally, 8, deps, '一攻一守');
  }
  if (id === 'G28') {
    const units = unitsAtCells(state, cells);
    runtime.g28Active = units.length >= cells.length;
    if (runtime.g28Active) for (const unit of units) if (isAlly(actor, unit)) addShield(state, unit, 5, deps, '三点成阵');
  }
}

function sortedTargetEntriesForQuality(actor, entries) {
  if (upgradeId(actor) === 'D19') return entries.slice().sort((a, b) => Number(a.target.hp || 0) - Number(b.target.hp || 0));
  return entries;
}

function qualityElementApplyCount(actor, slot, cell) {
  let count = 1;
  if (upgradeId(actor) === 'S04') count += 1;
  if (Array.isArray(cell?.qualityTraces)) {
    const trace = cell.qualityTraces.find(x => x && x.id === 'D30' && x.expiresRound >= 0);
    if (trace) count += 1;
  }
  return count;
}

function qualityElementLayers(actor, slot, baseLayers) {
  if (upgradeId(actor) === 'S08' && actor.element && actor.element === slot.element) return baseLayers * 2;
  return baseLayers;
}

function consumeTargetNextDamageBonus(target) {
  const amount = Math.max(0, Number(target?.qualityNextDamageBonus || 0));
  if (amount > 0) target.qualityNextDamageBonus = 0;
  return amount;
}

function qualityActionDamage(state, actor, target, slot, p, hitIndex, entries, cells, baseDamage) {
  const id = upgradeId(actor);
  const runtime = ensureQualityRuntime(actor);
  let damage = Math.max(0, Number(baseDamage || 0));
  const key = p ? posKey(p) : '';
  const mod = key && slot.qualityCellModifiers ? slot.qualityCellModifiers[key] : null;
  if (mod && Number(mod.damageDelta || 0)) damage = Math.max(0, damage + Number(mod.damageDelta || 0));
  damage += consumeTargetNextDamageBonus(target);

  const targetCount = entries.length;
  const cellIndex = p ? cells.findIndex(c => posKey(c) === posKey(p)) : -1;
  const core = p ? isCoreCell(cells, p) : false;
  const farthest = p ? isFarthestCell(actor, cells, p) : false;
  const first = hitIndex === 0;
  const second = hitIndex === 1;
  const dist = p ? distanceFromActor(actor, p) : 0;

  switch (id) {
    case 'S05':
      if (hitIndex === entries.length - 1) damage *= 2;
      break;
    case 'S06':
      if (hitIndex === 0) damage = Math.max(1, Math.floor(damage / 2));
      else damage = Math.max(damage, Math.max(1, runtime.lastChainDamage || 1) * 2);
      runtime.lastChainDamage = damage;
      break;
    case 'G01':
      if (runtime.mode !== '守') damage += 2;
      break;
    case 'G02':
      damage += hitIndex === 0 ? 4 : 1;
      break;
    case 'G03':
    case 'G25':
    case 'G30':
      if (core) damage += 3;
      break;
    case 'G06':
      if (core) damage += 2;
      break;
    case 'G07':
      if (farthest) damage += 3;
      break;
    case 'G09':
      if (p && Math.abs(Number(p.r) - Number(actor.position?.r || 0)) > 0) damage += 1;
      break;
    case 'G10':
      if (farthest) damage += 4;
      break;
    case 'G11':
      if (targetCount === 1) damage += 5;
      break;
    case 'G13':
      if (dist >= 2) damage += 4;
      break;
    case 'G14':
      damage += 6;
      break;
    case 'G15':
      if (Number(target.hp || 0) <= 8) damage += 8;
      break;
    case 'G17':
      if (core || cells.length === 1) damage += 5;
      break;
    case 'G18':
      if (targetCount >= 2 && second) damage += 4;
      break;
    case 'G19':
      if (targetCount >= 2) damage += 2;
      break;
    case 'G20':
      if (farthest) damage += 4;
      break;
    case 'G21':
      if (cellIndex === 0) damage += 2;
      break;
    case 'G22':
      if (core || cellIndex === 0) damage += 4;
      break;
    case 'G23':
      if (second) damage += 3;
      break;
    case 'G24':
      if (first) damage += 4;
      break;
    case 'G26':
      if (targetCount >= 2) damage += 1;
      break;
    case 'G27':
      if (farthest) damage += 3;
      break;
    case 'G28':
      if (runtime.g28Active) damage += 2;
      break;
    case 'D07':
      if (targetCount === 1) damage += 6;
      break;
    case 'D08':
      if (targetCount >= 2) damage += 2;
      break;
    case 'D12':
      if (hitIndex === entries.length - 1) damage += 5;
      break;
    case 'D16':
      if (targetCount === 1) damage *= 2;
      break;
    case 'D17':
      damage += Math.ceil(damage / 2);
      break;
    default:
      break;
  }
  return Math.max(0, damage);
}

function markNextDamage(target, amount, reason, state, deps) {
  if (!livingUnit(target) || amount <= 0) return;
  const before = Math.max(0, Number(target.qualityNextDamageBonus || 0));
  target.qualityNextDamageBonus = before + amount;
  pushQualityEvent(state, deps, 'QUALITY_MARK', { targetId: target.id, amount, reason, text: `${target.displayName || target.name} 被${reason}标记：下次受伤 +${amount}。` });
}

function afterQualityActionHit(state, actor, target, slot, p, hitIndex, entries, cells, damageDone, deps) {
  const id = upgradeId(actor);
  if (!id || !target) return;
  const runtime = ensureQualityRuntime(actor);
  const killed = !livingUnit(target);
  if (id === 'G12') markNextDamage(target, 3, '点穴', state, deps);
  if (id === 'G23' && hitIndex === 0) markNextDamage(target, 3, '连环标记', state, deps);
  if (id === 'G16' && killed) damageNearestExtra(state, actor, target, 3, '追魂点', deps);
  if (id === 'D14' && killed) damageNearestExtra(state, actor, target, 4, '击杀连锁', deps);
  if (id === 'S07' && killed) {
    runtime.killCount = Math.max(0, Number(runtime.killCount || 0)) + 1;
    if (runtime.killCount >= 5) {
      runtime.killCount -= 5;
      actor.atk = Number(actor.atk || 0) + 1;
      runtime.permanentAtk = Math.max(0, Number(runtime.permanentAtk || 0)) + 1;
      pushQualityEvent(state, deps, 'QUALITY_GROW_ATTACK', { unitId: actor.id, atk: actor.atk, text: `${actor.displayName || actor.name} 触发越战越勇：永久攻击 +1，当前攻击${actor.atk}。` });
    }
  }
}

function damageNearestExtra(state, actor, excludedTarget, amount, reason, deps) {
  const target = nearestEnemy(state, actor, new Set([excludedTarget?.id].filter(Boolean)));
  if (!target) return 0;
  pushQualityEvent(state, deps, 'QUALITY_EXTRA_DAMAGE', { actorId: actor.id, targetId: target.id, amount, reason, text: `${actor.displayName || actor.name} 触发${reason}，追加攻击 ${target.displayName || target.name} ${amount}点。` });
  return deps.damageUnit(state, actor, target, amount, { element: actor.element || null, sourceType: 'quality_extra', qualityEffect: reason });
}

function applyPostActionQualityEffects(state, actor, slot, cells, entries, deps) {
  const id = upgradeId(actor);
  if (!id) return;
  if (id === 'D13') {
    const low = allUnits(state).filter(u => livingUnit(u) && isEnemy(actor, u) && Number(u.hp || 0) <= 5).sort((a, b) => Number(a.hp || 0) - Number(b.hp || 0))[0];
    if (low) deps.damageUnit(state, actor, low, 5, { element: actor.element || null, sourceType: 'quality_residual', qualityEffect: '残血追击' });
  }
  if (id === 'D15' && unitsAtCells(state, cells).length >= 3) {
    const core = cells[coreIndex(cells)];
    const target = core ? unitAtCell(state, core) : null;
    if (target && isEnemy(actor, target)) deps.damageUnit(state, actor, target, Math.max(1, Number(actor.atk || 1)), { element: actor.element || null, sourceType: 'quality_core_repeat', qualityEffect: '破阵启动' });
  }
  if (id >= 'D21' && id <= 'D30') applyBoardTracesAfterAction(state, actor, id, cells, deps);
}

function applyCoreAllyCellEffects(state, actor, slot, cells, deps) {
  const id = upgradeId(actor);
  if (!id) return;
  for (let i = 0; i < cells.length; i += 1) {
    const p = cells[i];
    const unit = unitAtCell(state, p);
    if (!unit || !isAlly(actor, unit)) continue;
    const core = i === coreIndex(cells);
    if (id === 'G04' && core) addShield(state, unit, 8, deps, '守护核心格');
    if (id === 'G05' && core) healUnit(state, unit, 6, deps, '回春核心格');
    if (id === 'G22' && (core || i === 0)) addShield(state, unit, 8, deps, '双印择一');
  }
}

function applyImmediateElementBurst(state, actor, target, slot, p, deps) {
  if (upgradeId(actor) !== 'D18' || !target || !p || typeof deps.getCell !== 'function') return;
  const cell = deps.getCell(state, p.r, p.c);
  const layers = Number(cell?.elements?.[slot.element] || 0);
  if (layers < 3) return;
  const damage = typeof deps.fireDamage === 'function' ? deps.fireDamage(layers) : (layers * (layers + 1)) / 2;
  pushQualityEvent(state, deps, 'QUALITY_ELEMENT_BURST', { actorId: actor.id, targetId: target.id, element: slot.element, layers, damage, text: `${actor.displayName || actor.name} 触发元素先爆：${slot.element}${layers}层提前结算，伤害${damage}。` });
  deps.damageUnit(state, actor, target, damage, { element: slot.element, sourceType: 'quality_element_burst', qualityEffect: '元素先爆' });
}

function applyBoardTracesAfterAction(state, actor, id, cells, deps) {
  for (const p of cells) {
    const cell = typeof deps.getCell === 'function' ? deps.getCell(state, p.r, p.c) : null;
    if (!cell) continue;
    cell.qualityTraces = Array.isArray(cell.qualityTraces) ? cell.qualityTraces : [];
    const trace = { id, actorId: actor.id, actor: { id: actor.id, camp: unitCamp(actor) }, expiresRound: Number(state.round || 0) + 1 };
    cell.qualityTraces.push(trace);
    const unit = unitAtCell(state, p);
    if (id === 'D21' && unit && isEnemy(actor, unit)) deps.damageUnit(state, actor, unit, 3, { element: '火', sourceType: 'quality_trace', qualityEffect: '火痕' });
    if (id === 'D22' && unit && isAlly(actor, unit)) healUnit(state, unit, 5, deps, '水痕');
    if (id === 'D23' && unit && isAlly(actor, unit)) unit.qualityNextDamageBonus = Math.max(Number(unit.qualityNextDamageBonus || 0), 2);
    if (id === 'D24' && unit && isAlly(actor, unit)) addShield(state, unit, 8, deps, '土痕');
    if (id === 'D25' && unit && isEnemy(actor, unit)) markNextDamage(unit, 2, '金痕', state, deps);
    if (id === 'D27' && unit && isAlly(actor, unit)) healUnit(state, unit, 6, deps, '佛光');
    if (id === 'D28' && unit && isEnemy(actor, unit)) { deps.damageUnit(state, actor, unit, 2, { element: '土', sourceType: 'quality_trace', qualityEffect: '流沙' }); markNextDamage(unit, 2, '流沙', state, deps); }
    if (id === 'D29' && unit && isEnemy(actor, unit)) markNextDamage(unit, 4, '妖印', state, deps);
  }
  pushQualityEvent(state, deps, 'QUALITY_TRACE_ADD', { actorId: actor.id, traceId: id, cells: clone(cells), text: `${actor.displayName || actor.name} 留下${upgrade(actor)?.name || id}，持续1回合。` });
}

function sortActionActorsForQuality(actors) {
  return actors.slice().sort((a, b) => {
    const aid = upgradeId(a), bid = upgradeId(b);
    const av = aid === 'D11' ? -1 : aid === 'D12' ? 1 : 0;
    const bv = bid === 'D11' ? -1 : bid === 'D12' ? 1 : 0;
    return av - bv;
  });
}

function handledQualityEffectIds() { return QUALITY_EFFECT_IDS.slice(); }

module.exports = {
  QUALITY_EFFECT_IDS,
  handledQualityEffectIds,
  upgradeId,
  applyQualityRoundStartEffects,
  mutateActionCells,
  applyPreActionQualityEffects,
  applyCoreAllyCellEffects,
  sortedTargetEntriesForQuality,
  qualityElementApplyCount,
  qualityElementLayers,
  qualityActionDamage,
  afterQualityActionHit,
  applyImmediateElementBurst,
  applyPostActionQualityEffects,
  sortActionActorsForQuality
};
