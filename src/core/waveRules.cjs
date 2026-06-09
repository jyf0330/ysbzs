/**
 * waveRules.cjs — 波次表宠物池 / 品质权重规则。
 *
 * 兼容两种表格口径：
 * 1. 旧版：宠物ID=pal_001，数量=1。
 * 2. 新版：宠物池-数量=1,2,3,4,5-2，品质权重=90,10,0,1。
 *
 * 程序内部统一把数字短写转成 pal_XXX。
 */

const QUALITIES = Object.freeze(['青铜', '白银', '黄金', '钻石']);

const DEFAULT_QUALITY_MULTIPLIERS = Object.freeze({
  青铜: Object.freeze({ multiplier: 1.0, hp: 1.0, atk: 1.0, def: 1.0, shield: 1.0, mechanic: 1.0 }),
  白银: Object.freeze({ multiplier: 1.5, hp: 1.5, atk: 1.5, def: 1.5, shield: 1.5, mechanic: 1.5 }),
  黄金: Object.freeze({ multiplier: 2.0, hp: 2.0, atk: 2.0, def: 2.0, shield: 2.0, mechanic: 2.0 }),
  钻石: Object.freeze({ multiplier: 2.5, hp: 2.5, atk: 2.5, def: 2.5, shield: 2.5, mechanic: 2.5 })
});

function toNum(v, fallback = null) {
  if (v === undefined || v === null || v === '') return fallback;
  if (typeof v === 'number') return Number.isFinite(v) ? v : fallback;
  const n = Number(String(v).replace(/,/g, '').trim());
  return Number.isFinite(n) ? n : fallback;
}

function round1(n) {
  return Math.round(Number(n || 0) * 10) / 10;
}

function roundStat(n, min = 0) {
  const v = Math.round(Number(n || 0));
  return Math.max(min, v);
}

function uniquePreserveOrder(list) {
  const seen = new Set();
  const out = [];
  for (const item of list || []) {
    if (!item || seen.has(item)) continue;
    seen.add(item);
    out.push(item);
  }
  return out;
}

function normalizePetIdToken(token) {
  const raw = String(token || '').trim();
  if (!raw) return null;
  const s = raw.replace(/^No\.?/i, '').trim();
  const pal = s.match(/^pal[_-]?(\d+)$/i);
  if (pal) return `pal_${String(Number(pal[1])).padStart(3, '0')}`;
  if (/^\d+$/.test(s)) return `pal_${String(Number(s)).padStart(3, '0')}`;
  return raw;
}

function expandPoolToken(token) {
  const raw = String(token || '').trim();
  if (!raw) return [];
  const range = raw.match(/^(?:pal[_-]?)?(\d+)\s*(?:~|至|到|\.\.|-)\s*(?:pal[_-]?)?(\d+)$/i);
  if (!range) {
    const id = normalizePetIdToken(raw);
    return id ? [id] : [];
  }
  const start = Number(range[1]);
  const end = Number(range[2]);
  if (!Number.isInteger(start) || !Number.isInteger(end)) return [];
  const step = start <= end ? 1 : -1;
  const out = [];
  for (let n = start; step > 0 ? n <= end : n >= end; n += step) out.push(normalizePetIdToken(String(n)));
  return out.filter(Boolean);
}

function splitPoolTokens(poolPart) {
  return String(poolPart || '')
    .split(/[,，、;；|/]+/)
    .map(x => x.trim())
    .filter(Boolean);
}

function parsePetPoolCount(expression, fallbackCount = 1) {
  const raw = String(expression || '').trim();
  let poolPart = raw;
  let count = toNum(fallbackCount, 1);

  const suffix = raw.match(/^(.*)-\s*(\d+)\s*$/);
  if (suffix && suffix[1] && suffix[1].trim()) {
    poolPart = suffix[1].trim();
    count = Math.max(0, Math.floor(Number(suffix[2])));
  }

  const petIds = uniquePreserveOrder(splitPoolTokens(poolPart).flatMap(expandPoolToken));
  return {
    raw,
    poolPart,
    petIds,
    count: Math.max(0, Math.floor(toNum(count, 1) || 0)),
    isPoolExpression: petIds.length > 1 || /-\s*\d+\s*$/.test(raw)
  };
}

function parseQualityWeights(raw, fallback = null) {
  if (raw === undefined || raw === null || raw === '') return fallback;
  if (typeof raw === 'object' && !Array.isArray(raw)) {
    const out = {};
    for (const q of QUALITIES) out[q] = Math.max(0, toNum(raw[q], 0) || 0);
    return out;
  }
  const parts = String(raw)
    .split(/[,，、;；|/]+/)
    .map(x => x.trim())
    .filter(x => x !== '');
  if (!parts.length) return fallback;
  const out = {};
  for (let i = 0; i < QUALITIES.length; i += 1) out[QUALITIES[i]] = Math.max(0, toNum(parts[i], 0) || 0);
  const total = Object.values(out).reduce((s, n) => s + n, 0);
  if (total <= 0) return { 青铜: 1, 白银: 0, 黄金: 0, 钻石: 0 };
  return out;
}

function qualityWeightTotal(weights) {
  if (!weights) return 0;
  return QUALITIES.reduce((s, q) => s + Math.max(0, toNum(weights[q], 0) || 0), 0);
}

function buildQualityMultiplierMap(rows = []) {
  const map = {};
  for (const q of QUALITIES) map[q] = Object.assign({}, DEFAULT_QUALITY_MULTIPLIERS[q]);
  for (const row of rows || []) {
    const quality = row['品质'] || row.quality || row.name;
    if (!quality || !QUALITIES.includes(quality)) continue;
    const base = map[quality] || DEFAULT_QUALITY_MULTIPLIERS[quality] || DEFAULT_QUALITY_MULTIPLIERS.青铜;
    map[quality] = {
      multiplier: toNum(row['倍率'] ?? row.multiplier, base.multiplier),
      hp: toNum(row['HP倍率'] ?? row.hp, base.hp),
      atk: toNum(row['攻倍率'] ?? row.atk, base.atk),
      def: toNum(row['防倍率'] ?? row.def, base.def),
      shield: toNum(row['盾倍率'] ?? row.shield, base.shield),
      mechanic: toNum(row['机制分倍率'] ?? row.mechanic, base.mechanic)
    };
  }
  return map;
}

function qualityExpectedMultiplier(weights, qualityMultipliers = null) {
  if (!weights) return 1;
  const total = qualityWeightTotal(weights);
  if (total <= 0) return 1;
  const mults = qualityMultipliers || DEFAULT_QUALITY_MULTIPLIERS;
  let expected = 0;
  for (const q of QUALITIES) {
    const w = Math.max(0, toNum(weights[q], 0) || 0);
    const m = mults[q] || DEFAULT_QUALITY_MULTIPLIERS[q] || DEFAULT_QUALITY_MULTIPLIERS.青铜;
    expected += (w / total) * Number(m.multiplier || 1);
  }
  return expected;
}

function petScoreFromIndex(petsById, petId) {
  if (!petsById || !petId) return null;
  const pet = typeof petsById.get === 'function' ? petsById.get(petId) : petsById[petId];
  if (!pet) return null;
  return toNum(pet.score ?? pet['效果分'], null);
}

function monsterScoreFromIndex(monstersByPetId, petId) {
  if (!monstersByPetId || !petId) return null;
  const monster = typeof monstersByPetId.get === 'function' ? monstersByPetId.get(petId) : monstersByPetId[petId];
  if (!monster) return null;
  return toNum(monster.panelScore ?? monster.effectScore ?? monster['面板分'], null);
}

function scoreForWaveThreat(petsById, monstersByPetId, petId) {
  const monsterScore = monsterScoreFromIndex(monstersByPetId, petId);
  return monsterScore !== null ? monsterScore : petScoreFromIndex(petsById, petId);
}

function computeWaveThreat(petPool, spawnCount, qualityWeights, petsById, qualityMultipliers = null, opts = {}) {
  const ids = uniquePreserveOrder(petPool || []);
  if (!ids.length || !petsById) return null;
  const monstersByPetId = opts.monstersByPetId || null;
  const scores = ids.map(id => scoreForWaveThreat(petsById, monstersByPetId, id)).filter(n => n !== null);
  if (!scores.length) return null;
  const avgScore = scores.reduce((s, n) => s + n, 0) / scores.length;
  const expectedQuality = qualityExpectedMultiplier(qualityWeights, qualityMultipliers);
  return round1(avgScore * Math.max(0, Number(spawnCount || 0)) * expectedQuality);
}

function normalizeWaveRow(row, context = {}) {
  const fallbackCount = toNum(row['数量'], 1);
  const rawPool = row['宠物池-数量'] || row['宠物池'] || row['随机宠物池'] || row['宠物ID'];
  const poolInfo = parsePetPoolCount(rawPool, fallbackCount);
  const qualityRaw = row['品质权重'] ?? row['品质概率'] ?? row['概率'];
  const hasQualityWeights = qualityRaw !== undefined && qualityRaw !== null && String(qualityRaw).trim() !== '';
  const qualityWeights = parseQualityWeights(qualityRaw, null);
  const qualityMultipliers = context.qualityMultiplierMap || context.qualityMultipliers || null;
  const computedThreat = computeWaveThreat(poolInfo.petIds, poolInfo.count, qualityWeights, context.petsById, qualityMultipliers, { monstersByPetId: context.monstersByPetId });
  const manualThreat = toNum(row['本行威胁(当前计算值)'], toNum(row['本行威胁(自动)'], 0));
  const useComputedThreat = row['宠物池-数量'] || hasQualityWeights || poolInfo.isPoolExpression;

  return {
    waveId: row['波次ID'],
    day: toNum(row['天数'], 1),
    period: row['时段'],
    round: toNum(row['回合'], 1),
    petId: poolInfo.petIds[0] || normalizePetIdToken(row['宠物ID']),
    petPool: poolInfo.petIds,
    petPoolExpression: poolInfo.raw,
    spawnCount: poolInfo.count,
    qualityWeights,
    qualityWeightTotal: qualityWeightTotal(qualityWeights),
    qualityExpectedMultiplier: qualityExpectedMultiplier(qualityWeights, qualityMultipliers),
    hasQualityWeights,
    name: row['名称(自动)'],
    element: row['元素(自动)'],
    enemyRole: row['怪物定位(自动)'],
    hp: toNum(row['HP(自动)'], null),
    atk: toNum(row['攻(自动)'], null),
    def: toNum(row['防(自动)'], null),
    shield: toNum(row['盾(自动)'], null),
    ap: toNum(row['行动(自动)'], null),
    count: poolInfo.count,
    positionRule: row['位置'],
    threat: useComputedThreat && computedThreat !== null ? computedThreat : manualThreat,
    threatManual: manualThreat,
    threatComputed: computedThreat,
    threatScoreSource: context.monstersByPetId ? 'monster_panel_score_with_pet_fallback' : 'pet_score',
    designGoal: row['设计目的'],
    failPenalty: row['失败惩罚'],
    rewardImpact: row['奖励影响'],
    note: row['备注']
  };
}

function selectPetIdsForWave(row, random, opts = {}) {
  const pool = uniquePreserveOrder(row.petPool && row.petPool.length ? row.petPool : [row.petId].filter(Boolean));
  const count = Math.max(0, Math.floor(Number(row.spawnCount ?? row.count ?? 1) || 0));
  if (!pool.length || count <= 0) return [];
  const allowDuplicate = opts.allowDuplicate === true || row.allowDuplicate === true;
  const out = [];
  let available = pool.slice();
  for (let i = 0; i < count; i += 1) {
    if (allowDuplicate) {
      out.push(pool[Math.floor(random() * pool.length) % pool.length]);
      continue;
    }
    if (!available.length) available = pool.slice();
    const idx = Math.floor(random() * available.length) % available.length;
    out.push(available.splice(idx, 1)[0]);
  }
  return out;
}

function pickQualityForWave(row, random) {
  if (!row || !row.hasQualityWeights || !row.qualityWeights) return null;
  const total = qualityWeightTotal(row.qualityWeights);
  if (total <= 0) return null;
  let r = random() * total;
  for (const q of QUALITIES) {
    r -= Math.max(0, toNum(row.qualityWeights[q], 0) || 0);
    if (r <= 0) return q;
  }
  return QUALITIES[QUALITIES.length - 1];
}

function scaleStatsForQuality(baseStats, quality, qualityMultipliers = null) {
  if (!quality) return {};
  const mults = qualityMultipliers || DEFAULT_QUALITY_MULTIPLIERS;
  const m = mults[quality] || DEFAULT_QUALITY_MULTIPLIERS[quality] || DEFAULT_QUALITY_MULTIPLIERS.青铜;
  const out = { quality };
  if (baseStats.hp !== undefined && baseStats.hp !== null) out.hp = roundStat(Number(baseStats.hp) * Number(m.hp || 1), 1);
  if (baseStats.atk !== undefined && baseStats.atk !== null) out.atk = roundStat(Number(baseStats.atk) * Number(m.atk || 1), 0);
  if (baseStats.def !== undefined && baseStats.def !== null) out.def = roundStat(Number(baseStats.def) * Number(m.def || 1), 0);
  if (baseStats.shield !== undefined && baseStats.shield !== null) out.shield = roundStat(Number(baseStats.shield) * Number(m.shield || 1), 0);
  if (baseStats.effectScore !== undefined && baseStats.effectScore !== null) out.effectScore = round1(Number(baseStats.effectScore) * Number(m.multiplier || 1));
  return out;
}

module.exports = {
  QUALITIES,
  DEFAULT_QUALITY_MULTIPLIERS,
  normalizePetIdToken,
  parsePetPoolCount,
  parseQualityWeights,
  buildQualityMultiplierMap,
  qualityExpectedMultiplier,
  computeWaveThreat,
  normalizeWaveRow,
  selectPetIdsForWave,
  pickQualityForWave,
  scaleStatsForQuality
};
