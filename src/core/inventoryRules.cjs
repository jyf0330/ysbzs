const { syncBoardUnits } = require('./state.cjs');

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
  shopPurchaseTarget
};
