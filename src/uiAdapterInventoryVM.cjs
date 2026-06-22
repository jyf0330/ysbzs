const { statusOfMechanic } = require('./core/mechanicGate.cjs');
const { MAX_ACTIVE_UNITS, MAX_BENCH_UNITS } = require('./core/inventoryRules.cjs');

function clone(value) { return JSON.parse(JSON.stringify(value)); }

function buildInventoryVM(state, findUnitForInventoryEntry) {
  const activeCount = (state.inventory || []).filter(x => x.active !== false).length;
  const benchCount = (state.inventory || []).filter(x => x.active === false).length;
  const items = (state.inventory || []).map((x, i) => {
    const pet = state.indexes?.petsById?.get(x.petId) || {};
    const unit = findUnitForInventoryEntry(state, x);
    const active = x.active !== false;
    const canMoveToActive = !active && activeCount < MAX_ACTIVE_UNITS;
    const canMoveToBench = active && benchCount < MAX_BENCH_UNITS;
    const moveBlockedReason = active
      ? (canMoveToBench ? '' : `背包已满 ${benchCount}/${MAX_BENCH_UNITS}`)
      : (canMoveToActive ? '' : `上阵已满 ${activeCount}/${MAX_ACTIVE_UNITS}`);
    return Object.assign({}, clone(x), {
      name: x.name || pet.name || x.petId,
      element: x.element || pet.element || '-',
      role: x.role || pet.role || pet.定位 || '-',
      quality: x.quality || pet.quality || '普通',
      hp: unit ? unit.hp : (pet.hp || null),
      maxHp: unit ? unit.maxHp : (pet.hp || null),
      atk: unit ? unit.atk : (pet.atk || null),
      instanceId: x.instanceId || null,
      active,
      sellValue: Math.max(1, Number(x.level || 1)),
      mechanics: x.mechanics || pet.mechanics || [],
      mechanicStatus: (x.mechanics || pet.mechanics || []).map(id => ({ id, status: statusOfMechanic(id) })),
      canActivate: active || canMoveToActive,
      canMoveToActive,
      canMoveToBench,
      canToggleActive: active ? canMoveToBench : canMoveToActive,
      moveBlockedReason,
      index: i
    });
  });
  return {
    items,
    active: items.filter(x => x.active !== false),
    bench: items.filter(x => x.active === false),
    activeCount,
    benchCount,
    maxActive: MAX_ACTIVE_UNITS,
    maxBench: MAX_BENCH_UNITS,
    hasActiveSpace: activeCount < MAX_ACTIVE_UNITS,
    hasBenchSpace: benchCount < MAX_BENCH_UNITS
  };
}

module.exports = { buildInventoryVM };
