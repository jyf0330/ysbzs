const { makeUnit, syncBoardUnits } = require('./state.cjs');
const { pushEvent } = require('./events.cjs');
const { applyBattleStart } = require('./mechanics.cjs');
const { activationBlockReason } = require('./mechanicGate.cjs');

const MAX_ACTIVE_UNITS = 4;
const MAX_BENCH_UNITS = 8;

function inventoryEntries(state) {
  return Array.isArray(state?.inventory) ? state.inventory : [];
}

function activeEntries(state) {
  return inventoryEntries(state).filter(item => item.active !== false);
}

function benchEntries(state) {
  return inventoryEntries(state).filter(item => item.active === false);
}

function activeCount(state) {
  return activeEntries(state).length;
}

function benchCount(state) {
  return benchEntries(state).length;
}

function mergeBenchEntry(state, petId) {
  return benchEntries(state).find(item => item.petId === petId && Number(item.level || 1) < 3) || null;
}

function nextActiveSlot(state) {
  const used = new Set(activeEntries(state).map(item => Number(item.slot || 0)).filter(Boolean));
  for (let slot = 1; slot <= MAX_ACTIVE_UNITS; slot += 1) {
    if (!used.has(slot)) return slot;
  }
  return activeCount(state) + 1;
}

function firstEmptyHeroCell(state) {
  syncBoardUnits(state);
  const preferred = [
    { r: 6, c: 1 }, { r: 5, c: 1 }, { r: 6, c: 2 }, { r: 5, c: 2 },
    { r: 4, c: 1 }, { r: 7, c: 1 }, { r: 4, c: 2 }, { r: 7, c: 2 }
  ];
  const seen = new Set();
  const candidates = [];
  for (const point of preferred) {
    const key = `${point.r},${point.c}`;
    if (!seen.has(key)) {
      seen.add(key);
      candidates.push(point);
    }
  }
  for (const cell of state.board?.cells || []) {
    const key = `${cell.r},${cell.c}`;
    if (!seen.has(key)) {
      seen.add(key);
      candidates.push({ r: cell.r, c: cell.c });
    }
  }
  for (const point of candidates) {
    const cell = (state.board?.cells || []).find(item => item.r === point.r && item.c === point.c);
    if (cell && !cell.unitId) return point;
  }
  return null;
}

function findInventoryEntry(state, petIdOrInstanceId) {
  if (!petIdOrInstanceId) return null;
  return inventoryEntries(state).find(item => item.instanceId === petIdOrInstanceId)
    || inventoryEntries(state).find(item => item.petId === petIdOrInstanceId && item.active === false)
    || inventoryEntries(state).find(item => item.petId === petIdOrInstanceId || `unit_${item.petId}` === petIdOrInstanceId)
    || null;
}

function findUnitForInventoryEntry(state, inv) {
  if (!inv) return null;
  return (state.units || []).find(unit => unit.id === inv.instanceId || unit.petId === inv.petId) || null;
}

function sellUnit(state, command = {}) {
  const id = command.petId || command.instanceId || command.unitId;
  const inv = findInventoryEntry(state, id);
  if (!inv) {
    pushEvent(state, 'SELL_UNIT_BLOCKED', { unitId: id || null, text: `出售失败：找不到单位 ${id || ''}。` });
    return false;
  }

  const refund = Math.max(1, Number(inv.level || 1));
  const before = state.gold;
  state.gold += refund;
  inv.count = Math.max(0, Number(inv.count || 1) - 1);

  const unit = findUnitForInventoryEntry(state, inv);
  if (unit) {
    unit.alive = false;
    unit.active = false;
    unit.position = null;
  }

  if (inv.count <= 0) state.inventory = inventoryEntries(state).filter(item => item !== inv);
  syncBoardUnits(state);

  const result = {
    sold: true,
    petId: inv.petId,
    instanceId: inv.instanceId || null,
    refund,
    goldFrom: before,
    goldTo: state.gold
  };
  pushEvent(state, 'SELL_UNIT', Object.assign({}, result, {
    text: `出售 ${inv.petId}，金币${before}→${state.gold}。`
  }));
  return result;
}

function toggleUnitActive(state, command = {}) {
  const id = command.petId || command.instanceId || command.unitId;
  const inv = findInventoryEntry(state, id);
  if (!inv) {
    pushEvent(state, 'TOGGLE_UNIT_ACTIVE_BLOCKED', { unitId: id || null, text: `切换失败：找不到 ${id || '未知单位'}。` });
    return false;
  }

  const currentlyActive = inv.active !== false;
  if (!currentlyActive) {
    const currentActive = inventoryEntries(state).filter(item => item !== inv && item.active !== false).length;
    if (currentActive >= MAX_ACTIVE_UNITS) {
      pushEvent(state, 'TOGGLE_UNIT_ACTIVE_BLOCKED', { unitId: id, maxActive: MAX_ACTIVE_UNITS, text: `上阵失败：上场位已满 ${MAX_ACTIVE_UNITS}/${MAX_ACTIVE_UNITS}。` });
      return false;
    }

    let unit = findUnitForInventoryEntry(state, inv);
    if (!unit) unit = makeUnit(state, 'hero', inv.petId, { position: firstEmptyHeroCell(state) });
    const blockReason = activationBlockReason(unit);
    if (blockReason) {
      pushEvent(state, 'TOGGLE_UNIT_ACTIVE_BLOCKED', { unitId: id, petId: inv.petId, reason: blockReason, text: `上阵失败：${unit.displayName || unit.name} ${blockReason}。` });
      return false;
    }

    inv.active = true;
    if (!state.units.includes(unit)) {
      applyBattleStart(state, unit);
      state.units.push(unit);
      inv.instanceId = unit.id;
    }
    unit.active = true;
    unit.alive = true;
    if (!unit.position) unit.position = firstEmptyHeroCell(state);
    inv.slot = inv.slot || nextActiveSlot(state);
  } else {
    const currentBench = benchCount(state);
    if (currentBench >= MAX_BENCH_UNITS) {
      pushEvent(state, 'TOGGLE_UNIT_ACTIVE_BLOCKED', { unitId: id, maxBench: MAX_BENCH_UNITS, text: `下阵失败：背包已满 ${MAX_BENCH_UNITS}/${MAX_BENCH_UNITS}。` });
      return false;
    }

    inv.active = false;
    inv.slot = null;
    const unit = findUnitForInventoryEntry(state, inv);
    if (unit) {
      unit.active = false;
      unit.alive = false;
      unit.position = null;
    }
  }

  syncBoardUnits(state);
  const result = {
    unitId: id || inv.instanceId || inv.petId,
    petId: inv.petId,
    instanceId: inv.instanceId || null,
    active: inv.active !== false
  };
  pushEvent(state, 'TOGGLE_UNIT_ACTIVE', Object.assign({}, result, {
    text: `${result.active ? '上阵' : '下阵'}：${id || inv.petId}。`
  }));
  return result;
}

function shopPurchaseTarget(state, petId) {
  const currentActive = activeCount(state);
  const currentBench = benchCount(state);
  if (currentActive < MAX_ACTIVE_UNITS) {
    const position = firstEmptyHeroCell(state);
    if (!position) {
      return {
        ok: false,
        placement: 'blocked',
        reason: 'no_active_position',
        activeCount: currentActive,
        benchCount: currentBench,
        text: `购买失败：上阵区还有空位，但棋盘没有可上阵格。`
      };
    }
    return { ok: true, placement: 'active', position, slot: nextActiveSlot(state), activeCount: currentActive, benchCount: currentBench };
  }
  const mergeTarget = mergeBenchEntry(state, petId);
  if (mergeTarget) return { ok: true, placement: 'merge', entry: mergeTarget, activeCount: currentActive, benchCount: currentBench };
  if (currentBench < MAX_BENCH_UNITS) return { ok: true, placement: 'bench', activeCount: currentActive, benchCount: currentBench };
  return {
    ok: false,
    placement: 'blocked',
    reason: 'no_roster_space',
    activeCount: currentActive,
    benchCount: currentBench,
    text: `购买失败：没有上阵或背包空位（上阵${currentActive}/${MAX_ACTIVE_UNITS}，背包${currentBench}/${MAX_BENCH_UNITS}）。`
  };
}

module.exports = {
  MAX_ACTIVE_UNITS,
  MAX_BENCH_UNITS,
  activeEntries,
  benchEntries,
  activeCount,
  benchCount,
  mergeBenchEntry,
  nextActiveSlot,
  firstEmptyHeroCell,
  findInventoryEntry,
  findUnitForInventoryEntry,
  sellUnit,
  toggleUnitActive,
  shopPurchaseTarget
};
