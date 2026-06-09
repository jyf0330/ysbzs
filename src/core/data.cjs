const { loadGameData } = require('./csvData.cjs');
const data = loadGameData();
function byId(rows, key='id') { const m = new Map(); for (const r of rows) if (r && r[key]) m.set(r[key], r); return m; }
function buildIndexes(d = loadGameData()) {
  const petsById = byId(d.pets, 'id');
  const monstersByPetId = byId(d.monsters, 'petId');
  const mechanicsById = byId(d.mechanisms, 'id');
  const shapesByPetId = byId(d.shapes, 'petId');
  const shapesByShapeId = byId(d.shapes, 'shapeId');
  const shopByPetId = byId(d.shop, 'petId');
  const relicsById = byId(d.relics, 'id');
  const shopPools = new Map();
  const rewardPools = new Map();
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
  return { petsById, monstersByPetId, mechanicsById, shapesByPetId, shapesByShapeId, shopByPetId, relicsById, shopPools, rewardPools };
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
      if (!ix.monstersByPetId.has(petId)) issues.push(`wave ${w.waveId} pet ${petId} has no monster template`);
    }
  }
  for (const e of d.events) { if (e.petId && !ix.petsById.has(e.petId)) issues.push(`event ${e.id} missing pet ${e.petId}`); for (const id of listMechanics(e.mechanics)) if(!hasMech(id)) issues.push(`event ${e.id} missing mechanic ${id}`); if(e.shopPoolId && !ix.shopPools.has(e.shopPoolId)) issues.push(`event ${e.id} missing shop pool ${e.shopPoolId}`); if(e.rewardPoolId && !ix.rewardPools.has(e.rewardPoolId)) issues.push(`event ${e.id} missing reward pool ${e.rewardPoolId}`); }
  for (const s of d.shop) { if (!ix.petsById.has(s.petId)) issues.push(`shop missing pet ${s.petId}`); if (!s.shopPools || s.shopPools.length === 0) issues.push(`shop ${s.petId} has no shop pools`); if (!s.rewardPools || s.rewardPools.length === 0) issues.push(`shop ${s.petId} has no reward pools`); }
  for (const r of d.relics) { if (r.petId && !ix.petsById.has(r.petId)) issues.push(`relic ${r.id} missing pet ${r.petId}`); for (const id of listMechanics(r.mechanics)) if(!hasMech(id)) issues.push(`relic ${r.id} missing mechanic ${id}`); if(r.shopPoolId && !ix.shopPools.has(r.shopPoolId)) issues.push(`relic ${r.id} missing shop pool ${r.shopPoolId}`); if(r.rewardPoolId && !ix.rewardPools.has(r.rewardPoolId)) issues.push(`relic ${r.id} missing reward pool ${r.rewardPoolId}`); }
  for (const s of d.shapes) { if (!ix.petsById.has(s.petId)) issues.push(`shape missing pet ${s.petId}`); for (const id of listMechanics(s.mechanics)) if(!hasMech(id)) issues.push(`shape ${s.petId} missing mechanic ${id}`); }
  return { ok: issues.length === 0, issues, indexes: ix, counts: { pets:d.pets.length, monsters:d.monsters.length, waves:d.waves.length, mechanisms:d.mechanisms.length, events:d.events.length, shop:d.shop.length, relics:d.relics.length, shapes:d.shapes.length, validation:d.validation.length }};
}
module.exports = { data, loadGameData, buildIndexes, validateData };
