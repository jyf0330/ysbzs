const fs = require('fs');
const path = require('path');
const { normalizeWaveRow, buildQualityMultiplierMap } = require('./waveRules.cjs');

const ROOT = path.resolve(__dirname, '../..');
const DEFAULT_CSV_DIR = path.join(ROOT, 'data', 'csv');
const FALLBACK_JSON = path.join(ROOT, 'data', 'normalized_data.json');
const DATA_CACHE = new Map();

const TABLE_FILES = Object.freeze({
  readme: '00_maintenance_guide.csv',
  pets: '01_pets.csv',
  monsters: '02_monster_templates.csv',
  waves: '03_monster_waves.csv',
  mechanisms: '04_mechanisms.csv',
  events: '05_events.csv',
  shop: '06_shop_rewards.csv',
  relics: '07_relic_blessings.csv',
  shapes: '08_action_shapes.csv',
  validation: '09_cross_validation.csv',
  initialSetup: '10_initial_roster.csv',
  heroDomains: '11_hero_domains.csv',
  elementReactions: '12_element_reactions.csv',
  day7Trial: '13_day7_beast_trial.csv',
  qualityMultipliers: '14_quality_multipliers.csv',
  trialQuestions: '15_summon_trial_questions.csv',
  trialActions: '16_trial_action_plan.csv',
  victoryRules: '17_trial_victory_rules.csv',
  effectObjects: '18_effect_objects.csv',
  triggers: '19_triggers.csv',
  modifiers: '20_modifiers.csv',
  elementPacketRules: '21_element_packet_rules.csv',
  elementConversions: '22_element_conversion_rules.csv',
  triggerOrderRules: '23_trigger_order_rules.csv',
  nodeSchedule: '24_node_schedule.csv',
  nodePool: '25_node_pool.csv',
  encounterPool: '26_encounter_pool.csv'
});

const LEGACY_MECHANIC_ALIAS = Object.freeze({
  mech_poison: 'mech_curse_gold_loss',
  mech_weaken: 'mech_soften_when_hit',
  mech_firm_threshold: 'mech_damage_cap_per_round',
  mech_revive: 'mech_death_summon',
  mech_shielded_fragile: 'mech_shield_flat',
  mech_opening_shield: 'mech_shield_flat',
  mech_damage_cap: 'mech_damage_cap_per_round',
  mech_first_hit_block: 'mech_first_hit_immunity',
  mech_counter: 'mech_counter_damage',
  mech_grow_attack: 'mech_grow_atk_each_round',
  mech_grow_shield: 'mech_grow_shield_each_round',
  mech_summon: 'mech_summon_each_round',
  mech_aura: 'mech_scale_with_allies',
  mech_curse: 'mech_curse_gold_loss',
  mech_break_castle: 'mech_castle_line_damage',
  mech_multi_hit: 'mech_counter_attack',
  mech_steal_reward: 'mech_reduce_reward_if_alive',
  mech_pierce_shield: 'mech_armor_flat',
  mech_armor_break: 'mech_soften_when_hit',
  mech_zone_pressure: 'mech_countdown_pressure'
});

function stripBom(s) {
  return String(s || '').replace(/^\uFEFF/, '');
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;
  const s = stripBom(text);
  for (let i = 0; i < s.length; i += 1) {
    const ch = s[i];
    const next = s[i + 1];
    if (inQuotes) {
      if (ch === '"' && next === '"') { field += '"'; i += 1; continue; }
      if (ch === '"') { inQuotes = false; continue; }
      field += ch;
      continue;
    }
    if (ch === '"') { inQuotes = true; continue; }
    if (ch === ',') { row.push(field); field = ''; continue; }
    if (ch === '\n') { row.push(field); rows.push(row); row = []; field = ''; continue; }
    if (ch === '\r') continue;
    field += ch;
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }
  if (!rows.length) return [];
  const headers = rows[0].map(h => stripBom(h).trim());
  return rows.slice(1).filter(r => r.some(v => String(v || '').trim() !== '')).map(r => {
    const obj = {};
    headers.forEach((h, i) => { obj[h] = cleanCell(r[i]); });
    return obj;
  });
}

function cleanCell(v) {
  if (v === undefined || v === null) return null;
  const s = String(v).trim();
  return s === '' ? null : s;
}


function decodeEscapedUnicodeName(name) {
  return String(name || '').replace(/#U([0-9A-Fa-f]{4})/g, (_, hex) => {
    try { return String.fromCodePoint(parseInt(hex, 16)); } catch (_) { return _; }
  });
}

function resolveCsvFile(csvDir, tableName) {
  const direct = path.join(csvDir, tableName);
  if (fs.existsSync(direct)) return direct;
  if (!fs.existsSync(csvDir)) return direct;
  const target = decodeEscapedUnicodeName(tableName);
  const files = fs.readdirSync(csvDir);
  const found = files.find(fn => decodeEscapedUnicodeName(fn) === target) || files.find(fn => decodeEscapedUnicodeName(fn).startsWith(target.replace(/\.csv$/i, '')));
  return found ? path.join(csvDir, found) : direct;
}

function readCsvRows(filePath) {
  if (!fs.existsSync(filePath)) return [];
  return parseCsv(fs.readFileSync(filePath, 'utf8'));
}

function readTableRows(csvDir, tableName) {
  return readCsvRows(resolveCsvFile(csvDir, tableName));
}

function toNum(v, fallback = null) {
  if (v === undefined || v === null || v === '') return fallback;
  if (typeof v === 'number') return Number.isFinite(v) ? v : fallback;
  const n = Number(String(v).replace(/,/g, '').trim());
  return Number.isFinite(n) ? n : fallback;
}

function toBool(v) {
  if (v === true || v === 1) return true;
  if (v === false || v === 0 || v === null || v === undefined) return false;
  const s = String(v).trim().toLowerCase();
  return ['是', 'true', '1', 'yes', 'y', '启用', '可召'].includes(s);
}

function splitList(v) {
  if (!v) return [];
  return String(v)
    .split(/[\n,，、;；|\/]+/)
    .map(x => x.trim())
    .filter(Boolean);
}

function splitMechanics(v) {
  const original = splitList(v || 'none');
  const source = original.length ? original : ['none'];
  const normalized = source.map(id => LEGACY_MECHANIC_ALIAS[id] || id).filter(Boolean);
  return { normalized, original: source };
}

function parseParams(v) {
  if (!v) return {};
  if (typeof v === 'object') return v;
  const raw = String(v).trim();
  if (!raw || raw === '{}') return {};
  try { return JSON.parse(raw); } catch (_) {}
  try {
    const normalized = raw
      .replace(/([{,]\s*)([A-Za-z_][\w-]*)(\s*:)/g, '$1"$2"$3')
      .replace(/'/g, '"');
    return JSON.parse(normalized);
  } catch (_) {
    const out = {};
    raw.replace(/[{}]/g, '').split(/[;,，]/).forEach(pair => {
      const [k, val] = pair.split(':').map(x => x && x.trim());
      if (!k) return;
      const n = toNum(val, null);
      out[k] = n === null ? val : n;
    });
    return Object.keys(out).length ? out : { raw };
  }
}

function dayPeriod(dayExpr) { return dayExpr || null; }

function normalizeSourceTables(sourceTables, options = {}) {
  const generatedAt = new Date().toISOString().slice(0, 10);
  const pets = (sourceTables.pets || []).map(row => {
    const mech = splitMechanics(row['机制ID']);
    return {
      id: row['宠物ID'],
      no: row['编号'],
      name: row['名称'],
      element: row['元素'],
      subElement: row['副属'],
      quality: row['品质'],
      size: row['体型'],
      role: row['定位'],
      score: toNum(row['效果分'], 0),
      hp: toNum(row['HP'], 1),
      atk: toNum(row['攻'], 1),
      def: toNum(row['防'], 0),
      shield: toNum(row['盾'], 0),
      ap: toNum(row['行动'], 3),
      mechanics: mech.normalized,
      shapeText: row['形状'],
      range: row['范围'],
      action: row['动作'],
      skill: row['技能'],
      tags: splitList(row['标签']),
      summonable: toBool(row['可召']),
      note: row['备注'],
      mechanicsOriginal: mech.original
    };
  }).filter(x => x.id);

  const monsters = (sourceTables.monsters || []).map(row => {
    const mech = splitMechanics(row['机制ID']);
    return {
      petId: row['宠物ID'],
      name: row['名称(自动)'],
      element: row['元素(自动)'],
      size: row['体型(自动)'],
      petRole: row['宠物定位(自动)'],
      stage: row['阶段'],
      enemyRole: row['敌方定位'],
      hp: toNum(row['HP'], 1),
      atk: toNum(row['攻'], 1),
      def: toNum(row['防'], 0),
      shield: toNum(row['盾'], 0),
      ap: toNum(row['行动'], 3),
      mechanics: mech.normalized,
      mechanicParams: parseParams(row['机制参数']),
      panelScore: toNum(row['面板分'], 0),
      mechanicScore: toNum(row['机制分'], 0),
      counteredBy: row['克制'],
      recommendedDay: row['推荐日'],
      note: row['备注'],
      mechanicsOriginal: mech.original
    };
  }).filter(x => x.petId);

  const qualityMultiplierMap = buildQualityMultiplierMap(sourceTables.qualityMultipliers || []);
  const petsByIdForWave = new Map(pets.map(p => [p.id, p]));
  const monstersByPetIdForWave = new Map(monsters.map(m => [m.petId, m]));
  const waves = (sourceTables.waves || [])
    .map(row => normalizeWaveRow(row, { petsById: petsByIdForWave, monstersByPetId: monstersByPetIdForWave, qualityMultiplierMap }))
    .filter(x => x.waveId && x.petId);

  const mechanisms = (sourceTables.mechanisms || []).map(row => ({
    code: row['机制编号'],
    id: row['机制ID'],
    name: row['机制名'],
    category: row['分类'],
    targets: splitList(row['适用对象']),
    trigger: row['触发'],
    condition: row['条件'],
    defaultParams: parseParams(row['参数默认']),
    effect: row['效果'],
    logTemplate: row['日志模板'],
    score: toNum(row['机制分'], 0),
    power: row['强度'],
    status: row['状态'],
    integrationStatus: row['接入状态'],
    petUse: toBool(row['宠物用']),
    monsterUse: toBool(row['怪物用']),
    eventUse: toBool(row['事件用']),
    waveUse: toBool(row['波次用']),
    note: row['备注']
  })).filter(x => x.id);

  const events = (sourceTables.events || []).map(row => {
    const mech = splitMechanics(row['机制ID']);
    return {
      id: row['事件ID'],
      group: row['事件组'],
      name: row['事件名'],
      node: row['节点'],
      dayExpr: dayPeriod(row['天数']),
      optionId: row['选项ID'],
      optionText: row['选项文案'],
      petId: row['宠物ID'],
      petName: row['名称(自动)'],
      element: row['元素(自动)'],
      role: row['定位(自动)'],
      mechanics: mech.normalized,
      shopPoolId: row['商店池ID'],
      rewardPoolId: row['奖励池ID'],
      costText: row['代价'],
      gainText: row['收益'],
      value: toNum(row['数值'], 0),
      layer: row['接入层级'],
      status: row['状态'],
      note: row['备注'],
      mechanicsOriginal: mech.original
    };
  }).filter(x => x.id);

  const shop = (sourceTables.shop || []).map(row => ({
    petId: row['宠物ID'],
    name: row['名称(自动)'],
    element: row['元素(自动)'],
    quality: row['品质(自动)'],
    role: row['定位(自动)'],
    tags: splitList(row['标签(自动)']),
    itemType: row['商品类型'],
    status: row['商店状态'],
    unlockDay: toNum(row['解锁日'], 1),
    poolTier: row['池档'],
    defaultPrice: toNum(row['默认价'], 0),
    price: toNum(row['价格覆盖'], toNum(row['默认价'], 0)),
    weights: {
      night: toNum(row['夜市权重'], 0),
      element: toNum(row['元素店权重'], 0),
      role: toNum(row['定位店权重'], 0),
      tier: toNum(row['品质店权重'], 0),
      reward: toNum(row['奖励权重'], 0)
    },
    shopPools: splitList(row['商店池(自动)']),
    rewardPools: splitList(row['奖励池(自动)']),
    condition: row['出现条件'],
    note: row['备注']
  })).filter(x => x.petId);

  const relics = (sourceTables.relics || []).map(row => {
    const mech = splitMechanics(row['机制ID']);
    return {
      id: row['遗物ID'],
      name: row['遗物名'],
      type: row['类型'],
      quality: row['品质'],
      trigger: row['触发'],
      mechanics: mech.normalized,
      params: parseParams(row['参数']),
      petId: row['关联宠物ID'],
      petName: row['名称(自动)'],
      shopPoolId: row['关联商店池'],
      rewardPoolId: row['关联奖励池'],
      unlockDay: toNum(row['解锁日'], 1),
      weight: toNum(row['权重'], 1),
      status: row['状态'],
      note: row['备注'],
      mechanicsOriginal: mech.original
    };
  }).filter(x => x.id);

  const shapes = (sourceTables.shapes || []).map(row => {
    const mech = splitMechanics(row['机制ID']);
    return {
      petId: row['宠物ID'],
      name: row['名称(自动)'],
      element: row['元素(自动)'],
      role: row['定位(自动)'],
      shapeId: row['形状ID'],
      shapeName: row['形状名'],
      shapeClass: row['形状分类'],
      hitCells: toNum(row['命中格数'], 1),
      direction: row['方向'],
      slotCount: toNum(row['槽数'], 3),
      slotElements: [row['槽1元素'], row['槽2元素'], row['槽3元素']].filter(Boolean),
      baseLayers: toNum(row['基础层数'], 1),
      actionType: row['行动类型'],
      skill: row['技能'],
      mechanics: mech.normalized,
      mechanicName: row['机制名(自动)'],
      integrationStatus: row['接入状态'],
      note: row['备注'],
      mechanicsOriginal: mech.original
    };
  }).filter(x => x.petId);

  const initialSetup = normalizeInitialSetup(sourceTables.initialSetup || []);
  const heroDomains = sourceTables.heroDomains || [];
  const elementReactions = sourceTables.elementReactions || [];
  const day7Trial = sourceTables.day7Trial || [];
  const qualityMultipliers = sourceTables.qualityMultipliers || [];
  const trialQuestions = sourceTables.trialQuestions || [];
  const trialActions = sourceTables.trialActions || [];
  const victoryRules = sourceTables.victoryRules || [];
  const effectObjects = sourceTables.effectObjects || [];
  const triggers = sourceTables.triggers || [];
  const modifiers = sourceTables.modifiers || [];
  const elementPacketRules = sourceTables.elementPacketRules || [];
  const elementConversions = sourceTables.elementConversions || [];
  const triggerOrderRules = sourceTables.triggerOrderRules || [];
  const nodeSchedule = (sourceTables.nodeSchedule || []).map(row => ({
    id: row.schedule_id || row['排程ID'],
    day: toNum(row.day || row['天数'], 1),
    step: toNum(row.step || row['步骤'], 1),
    kind: row.kind || row['类型'],
    label: row.label || row['显示名'],
    poolId: row.pool_id || row['节点池ID'],
    choiceCount: toNum(row.choice_count || row['候选数量'], 3),
    encounterPoolId: row.encounter_pool_id || row['遭遇池ID'],
    encounterId: row.encounter_id || row['遭遇ID'],
    phaseLabel: row.phase_label || row['阶段文案'],
    status: row.status || row['状态'],
    note: row.note || row['备注']
  })).filter(x => x.id);
  const nodePool = (sourceTables.nodePool || []).map(row => ({
    nodeId: row.node_id || row['节点ID'],
    nodePoolId: row.node_pool_id || row['节点池ID'],
    name: row.name || row['节点名'],
    nodeType: row.node_type || row['节点类型'],
    weight: toNum(row.weight || row['权重'], 1),
    unlockDay: toNum(row.unlock_day || row['解锁日'], 1),
    shopPoolId: row.shop_pool_id || row['商店池ID'],
    rewardPoolId: row.reward_pool_id || row['奖励池ID'],
    eventId: row.event_id || row['事件ID'],
    slots: toNum(row.slots || row['格数'], null),
    value: toNum(row.value || row['数值'], null),
    status: row.status || row['状态'],
    note: row.note || row['备注']
  })).filter(x => x.nodeId);
  const encounterPool = (sourceTables.encounterPool || []).map(row => ({
    encounterId: row.encounter_id || row['遭遇ID'],
    encounterPoolId: row.encounter_pool_id || row['遭遇池ID'],
    name: row.name || row['遭遇名'],
    weight: toNum(row.weight || row['权重'], 1),
    unlockDay: toNum(row.unlock_day || row['解锁日'], 1),
    wavePeriod: row.wave_period || row['波次时段'],
    battleIndex: toNum(row.battle_index || row['战斗序号'], 1),
    phaseLabel: row.phase_label || row['阶段文案'],
    status: row.status || row['状态'],
    note: row.note || row['备注']
  })).filter(x => x.encounterId);

  return {
    meta: {
      sourceType: options.sourceType || 'csv',
      sourcePackage: 'data/csv/*.csv',
      sourceWorkbook: null,
      generatedAt,
      scope: '01-09 CSV 数据真源完整接入',
      legacyMechanicAlias: LEGACY_MECHANIC_ALIAS,
      csvDir: options.csvDir || DEFAULT_CSV_DIR
    },
    pets,
    monsters,
    waves,
    mechanisms,
    events,
    shop,
    relics,
    shapes,
    validation: sourceTables.validation || [],
    initialSetup,
    heroDomains,
    elementReactions,
    day7Trial,
    qualityMultipliers,
    trialQuestions,
    trialActions,
    victoryRules,
    effectObjects,
    triggers,
    modifiers,
    elementPacketRules,
    elementConversions,
    triggerOrderRules,
    nodeSchedule,
    nodePool,
    encounterPool,
    waveRules: {
      qualityMultiplierMap
    }
  };
}

function normalizeInitialSetup(rows) {
  const playerParty = rows
    .filter(row => toBool(row['启用']) && ['player', 'hero', '我方'].includes(String(row['阵营'] || '').trim()))
    .sort((a, b) => toNum(a['槽位'], 0) - toNum(b['槽位'], 0))
    .map(row => {
      const rr = toNum(row['行(1-8)'], null);
      const cc = toNum(row['列(1-8)'], null);
      return {
        slot: toNum(row['槽位'], 0),
        petId: row['宠物ID'],
        position: rr === null || cc === null ? null : { r: Math.max(0, rr - 1), c: Math.max(0, cc - 1) },
        note: row['备注']
      };
    })
    .filter(x => x.petId);
  return { playerParty };
}

function loadSourceTablesFromCsv(csvDir = DEFAULT_CSV_DIR) {
  const rows = name => readTableRows(csvDir, name);
  return {
    readme: rows(TABLE_FILES.readme),
    pets: rows(TABLE_FILES.pets),
    monsters: rows(TABLE_FILES.monsters),
    waves: rows(TABLE_FILES.waves),
    mechanisms: rows(TABLE_FILES.mechanisms),
    events: rows(TABLE_FILES.events),
    shop: rows(TABLE_FILES.shop),
    relics: rows(TABLE_FILES.relics),
    shapes: rows(TABLE_FILES.shapes),
    validation: rows(TABLE_FILES.validation),
    initialSetup: rows(TABLE_FILES.initialSetup),
    heroDomains: rows(TABLE_FILES.heroDomains),
    elementReactions: rows(TABLE_FILES.elementReactions),
    day7Trial: rows(TABLE_FILES.day7Trial),
    qualityMultipliers: rows(TABLE_FILES.qualityMultipliers),
    trialQuestions: rows(TABLE_FILES.trialQuestions),
    trialActions: rows(TABLE_FILES.trialActions),
    victoryRules: rows(TABLE_FILES.victoryRules),
    effectObjects: rows(TABLE_FILES.effectObjects),
    triggers: rows(TABLE_FILES.triggers),
    modifiers: rows(TABLE_FILES.modifiers),
    elementPacketRules: rows(TABLE_FILES.elementPacketRules),
    elementConversions: rows(TABLE_FILES.elementConversions),
    triggerOrderRules: rows(TABLE_FILES.triggerOrderRules),
    nodeSchedule: rows(TABLE_FILES.nodeSchedule),
    nodePool: rows(TABLE_FILES.nodePool),
    encounterPool: rows(TABLE_FILES.encounterPool)
  };
}

function csvSourceAvailable(csvDir = DEFAULT_CSV_DIR) {
  return fs.existsSync(resolveCsvFile(csvDir, TABLE_FILES.pets))
    && fs.existsSync(resolveCsvFile(csvDir, TABLE_FILES.monsters))
    && fs.existsSync(resolveCsvFile(csvDir, TABLE_FILES.waves))
    && fs.existsSync(resolveCsvFile(csvDir, TABLE_FILES.shop));
}

function csvSignature(csvDir = DEFAULT_CSV_DIR) {
  return Object.values(TABLE_FILES).map(name => {
    const file = resolveCsvFile(csvDir, name);
    if (!fs.existsSync(file)) return `${name}:missing`;
    const st = fs.statSync(file);
    return `${name}:${st.size}:${Math.round(st.mtimeMs)}`;
  }).join('|');
}

function loadGameData(options = {}) {
  const csvDir = options.csvDir || DEFAULT_CSV_DIR;
  if (options.preferCsv !== false && csvSourceAvailable(csvDir)) {
    const sig = csvSignature(csvDir);
    const key = `csv:${csvDir}:${sig}`;
    if (options.cache !== false && DATA_CACHE.has(key)) return DATA_CACHE.get(key);
    const tables = loadSourceTablesFromCsv(csvDir);
    const normalized = normalizeSourceTables(tables, { sourceType: 'csv', csvDir });
    if (options.cache !== false) DATA_CACHE.set(key, normalized);
    return normalized;
  }
  const st = fs.existsSync(FALLBACK_JSON) ? fs.statSync(FALLBACK_JSON) : null;
  const key = st ? `json:${FALLBACK_JSON}:${st.size}:${Math.round(st.mtimeMs)}` : `json:${FALLBACK_JSON}`;
  if (options.cache !== false && DATA_CACHE.has(key)) return DATA_CACHE.get(key);
  const normalized = JSON.parse(fs.readFileSync(FALLBACK_JSON, 'utf8'));
  if (options.cache !== false) DATA_CACHE.set(key, normalized);
  return normalized;
}

module.exports = {
  TABLE_FILES,
  LEGACY_MECHANIC_ALIAS,
  parseCsv,
  decodeEscapedUnicodeName,
  resolveCsvFile,
  readTableRows,
  splitList,
  splitMechanics,
  parseParams,
  loadSourceTablesFromCsv,
  normalizeSourceTables,
  csvSourceAvailable,
  csvSignature,
  loadGameData
};
