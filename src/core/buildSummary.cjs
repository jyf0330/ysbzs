function clone(value) { return JSON.parse(JSON.stringify(value)); }

function incCount(map, key, label, amount = 1) {
  if (!key || key === '-') return;
  if (!map.has(key)) map.set(key, { id: key, label, count: 0 });
  map.get(key).count += amount;
}

function addTag(tags, id, label, kind, weight = 1, sourceId = null) {
  if (!id || !label || label === '-') return;
  if (!tags.has(id)) tags.set(id, { id, label, kind, weight: 0, sourceIds: [] });
  const tag = tags.get(id);
  tag.weight += weight;
  if (sourceId && !tag.sourceIds.includes(sourceId)) tag.sourceIds.push(sourceId);
}

function mapGet(maybeMap, key) {
  return maybeMap && typeof maybeMap.get === 'function' ? maybeMap.get(key) : null;
}

function lookupPet(state, petId) {
  return mapGet(state.indexes?.petsById, petId) || (state.data?.pets || []).find(x => x.id === petId) || {};
}

function lookupShopItem(state, petId) {
  return mapGet(state.indexes?.shopByPetId, petId) || (state.data?.shop || []).find(x => x.petId === petId) || {};
}

function publicTier(poolTier, quality) {
  const mapped = { pT1: '青铜', pT2: '白银', pT3: '黄金', pT4: '钻石' }[poolTier];
  return mapped || quality || poolTier || '-';
}

function sortedCounts(map) {
  return Array.from(map.values()).sort((a, b) => b.count - a.count || String(a.label).localeCompare(String(b.label), 'zh-Hans-CN'));
}

function sortedTags(tags) {
  const kindOrder = { element: 1, role: 2, tier: 3, relic: 4, restock: 5 };
  return Array.from(tags.values())
    .map(x => Object.assign({}, x, { sourceIds: x.sourceIds.slice() }))
    .sort((a, b) => b.weight - a.weight || (kindOrder[a.kind] || 9) - (kindOrder[b.kind] || 9) || String(a.label).localeCompare(String(b.label), 'zh-Hans-CN'));
}

function tagWeight(entry) {
  const level = Math.max(1, Number(entry.level || 1));
  const count = Math.max(1, Number(entry.count || 1));
  const activeBonus = entry.active !== false ? 1.5 : 1;
  return level * count * activeBonus;
}

function addInventoryTags(state, entry, maps) {
  const pet = lookupPet(state, entry.petId);
  const shop = lookupShopItem(state, entry.petId);
  const element = entry.element || pet.element || shop.element || '-';
  const role = entry.role || pet.role || pet.定位 || shop.role || '-';
  const tier = publicTier(entry.poolTier || shop.poolTier, entry.quality || pet.quality || shop.quality);
  const weight = tagWeight(entry);
  incCount(maps.elements, element, `${element}系`, weight);
  incCount(maps.roles, role, role, weight);
  incCount(maps.tiers, tier, tier, weight);
  addTag(maps.tags, `element:${element}`, `${element}系`, 'element', weight, entry.petId);
  addTag(maps.tags, `role:${role}`, role, 'role', weight, entry.petId);
  addTag(maps.tags, `tier:${tier}`, tier, 'tier', Math.max(1, weight * 0.5), entry.petId);
}

function addRelicTags(state, relicId, maps) {
  const relic = mapGet(state.indexes?.relicsById, relicId) || (state.data?.relics || []).find(x => x.id === relicId) || {};
  if (!relic.id) return;
  const pet = relic.petId ? lookupPet(state, relic.petId) : {};
  const element = pet.element || (relic.shopPoolId || '').replace('elem_', '') || '-';
  addTag(maps.tags, `relic:${relic.id}`, relic.name || relic.id, 'relic', 1, relic.id);
  addTag(maps.tags, `element:${element}`, `${element}系`, 'element', 0.75, relic.id);
}

function addRestockTags(restock, maps) {
  for (const label of restock.tags || []) {
    if (!label || label === '元素' || label === '流派' || label === '等级' || label === '通用') continue;
    const kind = restock.poolId && restock.poolId.startsWith('elem_') ? 'element'
      : restock.poolId && restock.poolId.startsWith('role_') ? 'role'
      : restock.poolId && restock.poolId.startsWith('tier_') ? 'tier'
      : 'restock';
    const publicLabel = kind === 'element' ? `${label}系` : label;
    addTag(maps.tags, `${kind}:${label}`, publicLabel, kind, 0.5, restock.restockId || restock.poolId);
  }
}

function buildConstructionSummary(state) {
  const maps = { tags: new Map(), elements: new Map(), roles: new Map(), tiers: new Map() };
  const inventory = state.inventory || [];
  for (const entry of inventory) addInventoryTags(state, entry, maps);
  for (const relicId of state.relics || []) addRelicTags(state, relicId, maps);
  const restocks = state.shop?.refreshState?.targetedRestocks || [];
  for (const restock of restocks) addRestockTags(restock, maps);
  const tags = sortedTags(maps.tags);
  const buildTags = tags.filter(x => x.kind === 'element' || x.kind === 'role');
  const primaryTags = (buildTags.length ? buildTags : tags).slice(0, 5);
  return {
    summaryText: primaryTags.length ? primaryTags.map(x => x.label).join(' / ') : '尚未形成',
    tags,
    primaryTags,
    elements: sortedCounts(maps.elements),
    roles: sortedCounts(maps.roles),
    tiers: sortedCounts(maps.tiers),
    inventory: {
      totalCount: inventory.length,
      activeCount: inventory.filter(x => x.active !== false).length,
      benchCount: inventory.filter(x => x.active === false).length
    },
    relicCount: (state.relics || []).length,
    restocks: clone(restocks)
  };
}

module.exports = { buildConstructionSummary };
