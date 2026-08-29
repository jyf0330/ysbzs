const { loadGameData: loadCsvGameData } = require('./csvData.cjs');

function normalizeDailyRouteSchedule(rows = []) {
  const grouped = new Map();
  for (const row of rows) {
    const day = Number(row.day || 1);
    if (!grouped.has(day)) grouped.set(day, []);
    grouped.get(day).push(row);
  }
  const normalized = [];
  for (const day of Array.from(grouped.keys()).sort((a, b) => a - b)) {
    const dayRows = grouped.get(day).slice().sort((a, b) => Number(a.step || 0) - Number(b.step || 0));
    const nodes = dayRows.filter(row => row.kind === 'node_choice');
    const fixedBattles = dayRows.filter(row => row.kind === 'fixed_battle');
    if (nodes.length !== 4 || fixedBattles.length !== 2) {
      normalized.push(...dayRows);
      continue;
    }
    let nodeLabelIndex = 0;
    let battleLabelIndex = 0;
    const ordered = [nodes[0], nodes[1], fixedBattles[0], nodes[2], nodes[3], fixedBattles[1]];
    for (const [index, row] of ordered.entries()) {
      const copy = Object.assign({}, row, { step: index + 1 });
      if (copy.kind === 'node_choice') {
        nodeLabelIndex += 1;
        copy.label = `事件节点${nodeLabelIndex}`;
      } else if (copy.kind === 'fixed_battle') {
        battleLabelIndex += 1;
        const isFinalBoss = day === 10 && /final_boss|终局/.test(`${copy.id || ''}${copy.encounterId || ''}${copy.label || ''}`);
        copy.label = isFinalBoss ? '终局Boss战' : (battleLabelIndex === 1 ? '第一场战斗' : '第二场战斗');
      }
      normalized.push(copy);
    }
  }
  return normalized;
}

function loadGameData() {
  const d = loadCsvGameData();
  return Object.assign({}, d, { nodeSchedule: normalizeDailyRouteSchedule(d.nodeSchedule || []) });
}

const data = loadGameData();
function byId(rows, key='id') { const m = new Map(); for (const r of rows) if (r && r[key]) m.set(r[key], r); return m; }
function buildIndexes(d = loadGameData()) {
  const petsById = byId(d.pets, 'id');
  const monstersByPetId = byId(d.monsters, 'petId');
  const mechanicsById = byId(d.mechanisms, 'id');
  const shapesByPetId = byId(d.shapes, 'petId');
  const shapesByShapeId = byId(d.shapes, 'shapeId');
  const shopByPetId = byId(d.shop, 'petId');
  const shopStoresById = byId(d.shopStores || [], 'id');
  const relicsById = byId(d.relics, 'id');
  const shopPools = new Map();
  const rewardPools = new Map();
  const nodePools = new Map();
  const wavesById = new Map();
  for (const wave of d.waves || []) if (wave.waveId && !wavesById.has(wave.waveId)) wavesById.set(wave.waveId, []);
  for (const wave of d.waves || []) if (wave.waveId) wavesById.get(wave.waveId).push(wave);
  const encountersById = byId(d.encounterPool || [], 'encounterId');
  const encounterPools = new Map();
  for (const store of d.shopStores || []) if (store.id && !shopPools.has(store.id)) shopPools.set(store.id, []);
  for (const item of d.shop) {
    for (const p of item.shopPools || []) { if (!shopPools.has(p)) shopPools.set(p, []); shopPools.get(p).push(item); }
    for (const p of item.rewardPools || []) { if (!rewardPools.has(p)) rewardPools.set(p, []); rewardPools.get(p).push(item); }
  }
  for (const e of d.events) {
    if (e.shopPoolId && !shopPools.has(e.shopPoolId)) shopPools.set(e.shopPoolId, []);
    if (e.rewardPoolId && !rewardPools.has(e.rewardPoolId)) rewardPools.set(e.rewardPoolId, []);
  }
  for (const relic of d.relics) {
    if (relic.shopPoolId) { if (!shopPools.has(relic.shopPoolId)) shopPools.set(relic.shopPoolId, []); shopPools.get(relic.shopPoolId).push(relic); }
    if (relic.rewardPoolId) { if (!rewardPools.has(relic.rewardPoolId)) rewardPools.set(relic.rewardPoolId, []); rewardPools.get(relic.rewardPoolId).push(relic); }
  }
  for (const node of d.nodePool || []) {
    if (node.nodePoolId) { if (!nodePools.has(node.nodePoolId)) nodePools.set(node.nodePoolId, []); nodePools.get(node.nodePoolId).push(node); }
  }
  for (const enc of d.encounterPool || []) {
    if (enc.encounterPoolId) { if (!encounterPools.has(enc.encounterPoolId)) encounterPools.set(enc.encounterPoolId, []); encounterPools.get(enc.encounterPoolId).push(enc); }
  }
  return { petsById, monstersByPetId, mechanicsById, shapesByPetId, shapesByShapeId, shopByPetId, shopStoresById, relicsById, shopPools, rewardPools, nodePools, wavesById, encountersById, encounterPools };
}
function listMechanics(ids) { return (ids || ['none']).filter(Boolean); }
function validateData(d = loadGameData()) {
  const ix = buildIndexes(d); const issues=[];
  const hasMech = id => id === 'none' || ix.mechanicsById.has(id);
  for (const p of d.pets) { for (const id of listMechanics(p.mechanics)) if(!hasMech(id) && id !== 'REVIEW') issues.push(`pet ${p.id} missing mechanic ${id}`); }
  for (const m of d.monsters) { if (!ix.petsById.has(m.petId)) issues.push(`monster missing pet ${m.petId}`); for (const id of listMechanics(m.mechanics)) if(!hasMech(id)) issues.push(`monster ${m.petId} missing mechanic ${id}`); }
  for (const w of d.waves) {
    const petPool = (w.petPool && w.petPool.length ? w.petPool : [w.petId]).filter(Boolean);
    if (!petPool.length) issues.push(`wave ${w.waveId} has empty pet pool`);
    for (const petId of petPool) {
      if (!ix.petsById.has(petId)) issues.push(`wave ${w.waveId} missing pet ${petId}`);
    }
  }
  for (const store of d.shopStores || []) {
    if (!store.id) issues.push('shop store missing id');
    if (store.id && !store.name) issues.push(`shop store ${store.id} missing name`);
  }
  const hasShopStore = id => !id || (ix.shopStoresById.size ? ix.shopStoresById.has(id) : ix.shopPools.has(id));
  for (const e of d.events) { if (e.petId && !ix.petsById.has(e.petId)) issues.push(`event ${e.id} missing pet ${e.petId}`); for (const id of listMechanics(e.mechanics)) if(!hasMech(id)) issues.push(`event ${e.id} missing mechanic ${id}`); if(e.shopPoolId && !hasShopStore(e.shopPoolId)) issues.push(`event ${e.id} missing shop store ${e.shopPoolId}`); if(e.rewardPoolId && !ix.rewardPools.has(e.rewardPoolId)) issues.push(`event ${e.id} missing reward pool ${e.rewardPoolId}`); }
  for (const s of d.shop) { if (!ix.petsById.has(s.petId)) issues.push(`shop missing pet ${s.petId}`); if (!s.shopPools || s.shopPools.length === 0) issues.push(`shop ${s.petId} has no shop stores`); for (const id of s.shopPools || []) if (!hasShopStore(id)) issues.push(`shop ${s.petId} missing shop store ${id}`); if (!s.rewardPools || s.rewardPools.length === 0) issues.push(`shop ${s.petId} has no reward pools`); }
  for (const r of d.relics) { if (r.petId && !ix.petsById.has(r.petId)) issues.push(`relic ${r.id} missing pet ${r.petId}`); for (const id of listMechanics(r.mechanics)) if(!hasMech(id)) issues.push(`relic ${r.id} missing mechanic ${id}`); if(r.shopPoolId && !hasShopStore(r.shopPoolId)) issues.push(`relic ${r.id} missing shop store ${r.shopPoolId}`); if(r.rewardPoolId && !ix.rewardPools.has(r.rewardPoolId)) issues.push(`relic ${r.id} missing reward pool ${r.rewardPoolId}`); }
  for (const s of d.shapes) { if (!ix.petsById.has(s.petId)) issues.push(`shape missing pet ${s.petId}`); for (const id of listMechanics(s.mechanics)) if(!hasMech(id)) issues.push(`shape ${s.petId} missing mechanic ${id}`); }
  for (const row of d.nodeSchedule || []) {
    if (row.kind === 'node_choice' && !ix.nodePools.has(row.poolId)) issues.push(`node schedule ${row.id} missing node pool ${row.poolId}`);
    if (row.kind === 'battle_choice' && !ix.encounterPools.has(row.encounterPoolId)) issues.push(`node schedule ${row.id} missing encounter pool ${row.encounterPoolId}`);
    if (row.kind === 'fixed_battle' && !ix.encountersById.has(row.encounterId)) issues.push(`node schedule ${row.id} missing encounter ${row.encounterId}`);
  }
  for (const node of d.nodePool || []) {
    if (node.shopPoolId && !hasShopStore(node.shopPoolId)) issues.push(`node ${node.nodeId} missing shop store ${node.shopPoolId}`);
    if (node.rewardPoolId && !ix.rewardPools.has(node.rewardPoolId)) issues.push(`node ${node.nodeId} missing reward pool ${node.rewardPoolId}`);
    if (node.eventId && !d.events.some(e => e.id === node.eventId)) issues.push(`node ${node.nodeId} missing event ${node.eventId}`);
  }
  for (const encounter of d.encounterPool || []) {
    if (encounter.waveId && !ix.wavesById.has(encounter.waveId)) issues.push(`encounter ${encounter.encounterId} missing wave ${encounter.waveId}`);
    if (encounter.rewardPoolId && !ix.rewardPools.has(encounter.rewardPoolId)) issues.push(`encounter ${encounter.encounterId} missing reward pool ${encounter.rewardPoolId}`);
  }
  return { ok: issues.length === 0, issues, indexes: ix, counts: { pets:d.pets.length, monsters:d.monsters.length, waves:d.waves.length, mechanisms:d.mechanisms.length, events:d.events.length, shop:d.shop.length, shopStores:(d.shopStores||[]).length, relics:d.relics.length, shapes:d.shapes.length, validation:d.validation.length, nodeSchedule:(d.nodeSchedule||[]).length, nodePool:(d.nodePool||[]).length, encounterPool:(d.encounterPool||[]).length }};
}
module.exports = { data, loadGameData, buildIndexes, validateData };
