/** waveSpawn.cjs — 将波次随机池解析结果转为实际刷怪条目。 */
const { rng } = require('./rng.cjs');
const { buildQualityMultiplierMap, selectPetIdsForWave, pickQualityForWave, scaleStatsForQuality } = require('./waveRules.cjs');

function waveRandom(state, row) {
  const seed = state.rngState?.seed || 'ysbzs-local';
  const index = Number.isFinite(Number(state.rngState?.index)) ? Number(state.rngState.index) : 0;
  return rng(`wave:${seed}:${state.day}:${state.period}:${state.round}:${row.waveId}:${index}`);
}

function enemyBaseStats(state, petId) {
  const pet = state.indexes?.petsById?.get(petId) || null;
  const monster = state.indexes?.monstersByPetId?.get(petId) || null;
  const base = monster || pet || {};
  return {
    hp: base.hp ?? pet?.hp ?? 1,
    atk: base.atk ?? pet?.atk ?? 1,
    def: base.def ?? pet?.def ?? 0,
    shield: base.shield ?? pet?.shield ?? 0,
    effectScore: pet?.score ?? base.panelScore ?? base.effectScore ?? 0
  };
}

function qualityStatOverrideForWave(state, petId, quality) {
  if (!quality) return {};
  const qualityMultipliers = state.data?.waveRules?.qualityMultiplierMap || buildQualityMultiplierMap(state.data?.qualityMultipliers || []);
  return scaleStatsForQuality(enemyBaseStats(state, petId), quality, qualityMultipliers);
}

function buildWaveSpawnEntries(state, row) {
  const random = waveRandom(state, row);
  return selectPetIdsForWave(row, random).map(petId => {
    const quality = pickQualityForWave(row, random);
    const legacyStatOverride = row.hasQualityWeights ? {} : { hp: row.hp ?? undefined, atk: row.atk ?? undefined, def: row.def ?? undefined, shield: row.shield ?? undefined, ap: row.ap ?? undefined };
    return { petId, quality, override: Object.assign({}, legacyStatOverride, qualityStatOverrideForWave(state, petId, quality)) };
  });
}

module.exports = { buildWaveSpawnEntries, enemyBaseStats, qualityStatOverrideForWave };
