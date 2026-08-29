#!/usr/bin/env node
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');
const { buildRuntimeDataReport } = require('./build_runtime_data_report.cjs');

const ROOT = path.resolve(__dirname, '..');
const DEFAULT_DB_PATH = path.join(ROOT, 'data', 'runtime', 'ysbzs.db');
const DEFAULT_DB_JSON_PATH = path.join(ROOT, 'data', 'runtime', 'database.json');
const DEFAULT_REPORT_MOBILE_HTML = path.join(ROOT, 'reports', 'data', 'database-mobile.html');
const DEFAULT_WEB_DB_PATH = path.join(ROOT, 'web', 'data', 'ysbzs.db');
const DEFAULT_WEB_DB_JSON_PATH = path.join(ROOT, 'web', 'data', 'database.json');
const DEFAULT_WEB_MOBILE_HTML = path.join(ROOT, 'web', 'data', 'database-mobile.html');

const TABLE_LABELS = {
  db_meta: '数据库信息',
  table_catalog: '表目录',
  field_catalog: '字段目录',
  source_files: '来源文件',
  source_rows: '来源原始行',
  issues: '校验问题',
  lookup_values: '字典值',
  units: '单位身份',
  unit_tags: '单位标签',
  stat_profiles: '数值档案',
  mechanisms: '机制',
  mechanism_params: '机制默认参数',
  unit_mechanics: '单位机制引用',
  shapes: '形状',
  shape_slots: '形状槽位',
  unit_shapes: '单位形状引用',
  monster_templates: '怪物模板',
  waves: '波次',
  wave_rounds: '波次回合',
  wave_unit_pool: '波次单位池',
  wave_quality_weights: '波次品质权重',
  shop_stores: '商品店',
  shop_items: '商品',
  shop_item_pools: '商品池引用',
  shop_reward_pools: '奖励池引用',
  relics: '遗物祝福',
  events: '事件',
  node_schedule: '路线日程',
  node_pool: '节点池',
  encounter_pool: '遭遇池',
  quality_multipliers: '品质倍率'
};

const SCHEMA = {
  db_meta: {
    columns: [
      ['key', 'TEXT PRIMARY KEY'],
      ['value', 'TEXT']
    ],
    label: TABLE_LABELS.db_meta,
    purpose: '构建时间、来源、schema 版本等数据库元信息。'
  },
  table_catalog: {
    columns: [
      ['table_name', 'TEXT PRIMARY KEY'],
      ['label', 'TEXT NOT NULL'],
      ['purpose', 'TEXT NOT NULL'],
      ['primary_key', 'TEXT'],
      ['row_count', 'INTEGER NOT NULL DEFAULT 0']
    ],
    label: TABLE_LABELS.table_catalog,
    purpose: '数据库表说明，手机版用它展示有哪些表。'
  },
  field_catalog: {
    columns: [
      ['table_name', 'TEXT NOT NULL'],
      ['field_name', 'TEXT NOT NULL'],
      ['field_type', 'TEXT NOT NULL'],
      ['field_role', 'TEXT NOT NULL'],
      ['references_table', 'TEXT'],
      ['references_field', 'TEXT'],
      ['source_field', 'TEXT'],
      ['note', 'TEXT'],
      ['PRIMARY KEY(table_name, field_name)', '']
    ],
    label: TABLE_LABELS.field_catalog,
    purpose: '字段目录，标记主字段和引用字段，避免同一个数据到处重复维护。'
  },
  source_files: {
    columns: [
      ['path', 'TEXT PRIMARY KEY'],
      ['format', 'TEXT NOT NULL'],
      ['bytes', 'INTEGER'],
      ['rows', 'INTEGER'],
      ['parse_status', 'TEXT']
    ],
    label: TABLE_LABELS.source_files,
    purpose: '构建数据库时扫描到的 CSV、JSON、YAML、XLSX 等来源文件。'
  },
  source_rows: {
    columns: [
      ['source_row_id', 'TEXT PRIMARY KEY'],
      ['source_kind', 'TEXT NOT NULL'],
      ['source_path', 'TEXT NOT NULL'],
      ['format', 'TEXT NOT NULL'],
      ['row_number', 'INTEGER'],
      ['key_path', 'TEXT'],
      ['value', 'TEXT'],
      ['row_json', 'TEXT NOT NULL']
    ],
    label: TABLE_LABELS.source_rows,
    purpose: '审计用原始字段和值；不作为策划主模型，只用来追来源。'
  },
  issues: {
    columns: [
      ['issue_id', 'TEXT PRIMARY KEY'],
      ['severity', 'TEXT NOT NULL'],
      ['table_name', 'TEXT'],
      ['row_key', 'TEXT'],
      ['field_name', 'TEXT'],
      ['message', 'TEXT NOT NULL']
    ],
    label: TABLE_LABELS.issues,
    purpose: '运行数据校验问题。'
  },
  lookup_values: {
    columns: [
      ['lookup_type', 'TEXT NOT NULL'],
      ['value_id', 'TEXT NOT NULL'],
      ['label', 'TEXT NOT NULL'],
      ['source', 'TEXT'],
      ['PRIMARY KEY(lookup_type, value_id)', '']
    ],
    label: TABLE_LABELS.lookup_values,
    purpose: '元素、品质、体型、定位、标签等可复用字典。'
  },
  units: {
    columns: [
      ['unit_id', 'TEXT PRIMARY KEY'],
      ['unit_type', 'TEXT NOT NULL'],
      ['unit_no', 'TEXT'],
      ['name', 'TEXT NOT NULL'],
      ['element_id', 'TEXT'],
      ['sub_element_id', 'TEXT'],
      ['quality_id', 'TEXT'],
      ['size_id', 'TEXT'],
      ['role_id', 'TEXT'],
      ['skill_id', 'TEXT'],
      ['summonable', 'INTEGER NOT NULL DEFAULT 0'],
      ['status', 'TEXT'],
      ['note', 'TEXT']
    ],
    label: TABLE_LABELS.units,
    purpose: '宠物/怪物共用的单位身份主表；名称、元素、品质、体型、定位只在这里维护。'
  },
  unit_tags: {
    columns: [
      ['unit_id', 'TEXT NOT NULL REFERENCES units(unit_id)'],
      ['tag_id', 'TEXT NOT NULL'],
      ['PRIMARY KEY(unit_id, tag_id)', '']
    ],
    label: TABLE_LABELS.unit_tags,
    purpose: '单位到标签的多对多引用。'
  },
  stat_profiles: {
    columns: [
      ['profile_id', 'TEXT PRIMARY KEY'],
      ['unit_id', 'TEXT NOT NULL REFERENCES units(unit_id)'],
      ['profile_kind', 'TEXT NOT NULL'],
      ['hp', 'REAL'],
      ['atk', 'REAL'],
      ['def', 'REAL'],
      ['shield', 'REAL'],
      ['ap', 'REAL'],
      ['score', 'REAL'],
      ['score_kind', 'TEXT'],
      ['note', 'TEXT']
    ],
    label: TABLE_LABELS.stat_profiles,
    purpose: '统一存宠物基础数值、怪物模板数值；别的表只引用单位或档案，不重复 HP/攻/盾。'
  },
  mechanisms: {
    columns: [
      ['mechanism_id', 'TEXT PRIMARY KEY'],
      ['code', 'TEXT'],
      ['name', 'TEXT NOT NULL'],
      ['category', 'TEXT'],
      ['trigger_id', 'TEXT'],
      ['condition_text', 'TEXT'],
      ['effect_text', 'TEXT'],
      ['log_template', 'TEXT'],
      ['score', 'REAL'],
      ['power', 'TEXT'],
      ['status', 'TEXT'],
      ['integration_status', 'TEXT'],
      ['note', 'TEXT']
    ],
    label: TABLE_LABELS.mechanisms,
    purpose: '机制定义主表；单位、形状、事件、遗物都引用 mechanism_id。'
  },
  mechanism_params: {
    columns: [
      ['mechanism_id', 'TEXT NOT NULL REFERENCES mechanisms(mechanism_id)'],
      ['param_key', 'TEXT NOT NULL'],
      ['param_value', 'TEXT'],
      ['PRIMARY KEY(mechanism_id, param_key)', '']
    ],
    label: TABLE_LABELS.mechanism_params,
    purpose: '机制默认参数。'
  },
  unit_mechanics: {
    columns: [
      ['unit_id', 'TEXT NOT NULL REFERENCES units(unit_id)'],
      ['mechanism_id', 'TEXT NOT NULL REFERENCES mechanisms(mechanism_id)'],
      ['relation_kind', 'TEXT NOT NULL'],
      ['PRIMARY KEY(unit_id, mechanism_id, relation_kind)', '']
    ],
    label: TABLE_LABELS.unit_mechanics,
    purpose: '单位和机制的引用关系，区分宠物基础、怪物模板、形状来源。'
  },
  shapes: {
    columns: [
      ['shape_id', 'TEXT PRIMARY KEY'],
      ['shape_name', 'TEXT NOT NULL'],
      ['shape_class', 'TEXT'],
      ['hit_cells', 'INTEGER'],
      ['direction', 'TEXT'],
      ['slot_count', 'INTEGER'],
      ['base_layers', 'INTEGER'],
      ['action_type_id', 'TEXT'],
      ['skill_id', 'TEXT'],
      ['mechanic_name', 'TEXT'],
      ['integration_status', 'TEXT'],
      ['note', 'TEXT']
    ],
    label: TABLE_LABELS.shapes,
    purpose: '形状定义主表；单位通过 unit_shapes 引用。'
  },
  shape_slots: {
    columns: [
      ['shape_id', 'TEXT NOT NULL REFERENCES shapes(shape_id)'],
      ['slot_index', 'INTEGER NOT NULL'],
      ['element_id', 'TEXT'],
      ['PRIMARY KEY(shape_id, slot_index)', '']
    ],
    label: TABLE_LABELS.shape_slots,
    purpose: '形状槽位元素。'
  },
  unit_shapes: {
    columns: [
      ['unit_id', 'TEXT NOT NULL REFERENCES units(unit_id)'],
      ['shape_id', 'TEXT NOT NULL REFERENCES shapes(shape_id)'],
      ['PRIMARY KEY(unit_id, shape_id)', '']
    ],
    label: TABLE_LABELS.unit_shapes,
    purpose: '单位引用形状。'
  },
  monster_templates: {
    columns: [
      ['template_id', 'TEXT PRIMARY KEY'],
      ['unit_id', 'TEXT NOT NULL REFERENCES units(unit_id)'],
      ['stage', 'TEXT'],
      ['enemy_role_id', 'TEXT'],
      ['countered_by', 'TEXT'],
      ['recommended_day', 'TEXT'],
      ['note', 'TEXT']
    ],
    label: TABLE_LABELS.monster_templates,
    purpose: '怪物模板只记录敌方语境字段；数值在 stat_profiles 的 monster_template 档。'
  },
  waves: {
    columns: [
      ['wave_id', 'TEXT PRIMARY KEY'],
      ['day', 'INTEGER'],
      ['period', 'TEXT']
    ],
    label: TABLE_LABELS.waves,
    purpose: '波次主表。'
  },
  wave_rounds: {
    columns: [
      ['wave_round_id', 'TEXT PRIMARY KEY'],
      ['wave_id', 'TEXT NOT NULL REFERENCES waves(wave_id)'],
      ['round_index', 'INTEGER NOT NULL'],
      ['primary_unit_id', 'TEXT REFERENCES units(unit_id)'],
      ['pet_pool_expression', 'TEXT'],
      ['spawn_count', 'INTEGER'],
      ['count', 'INTEGER'],
      ['threat', 'REAL'],
      ['threat_score_source', 'TEXT']
    ],
    label: TABLE_LABELS.wave_rounds,
    purpose: '波次回合编排；只引用单位，不重复单位名称或数值。'
  },
  wave_unit_pool: {
    columns: [
      ['wave_round_id', 'TEXT NOT NULL REFERENCES wave_rounds(wave_round_id)'],
      ['unit_id', 'TEXT NOT NULL REFERENCES units(unit_id)'],
      ['pool_index', 'INTEGER NOT NULL'],
      ['PRIMARY KEY(wave_round_id, unit_id, pool_index)', '']
    ],
    label: TABLE_LABELS.wave_unit_pool,
    purpose: '波次候选单位池。'
  },
  wave_quality_weights: {
    columns: [
      ['wave_round_id', 'TEXT NOT NULL REFERENCES wave_rounds(wave_round_id)'],
      ['quality_id', 'TEXT NOT NULL'],
      ['weight', 'REAL NOT NULL'],
      ['PRIMARY KEY(wave_round_id, quality_id)', '']
    ],
    label: TABLE_LABELS.wave_quality_weights,
    purpose: '波次品质权重。'
  },
  shop_stores: {
    columns: [
      ['store_id', 'TEXT PRIMARY KEY'],
      ['name', 'TEXT NOT NULL'],
      ['store_type', 'TEXT'],
      ['default_slots', 'INTEGER'],
      ['unlock_day', 'INTEGER'],
      ['price_rule', 'TEXT'],
      ['status', 'TEXT'],
      ['note', 'TEXT']
    ],
    label: TABLE_LABELS.shop_stores,
    purpose: '商品店/池定义。'
  },
  shop_items: {
    columns: [
      ['item_id', 'TEXT PRIMARY KEY'],
      ['item_type', 'TEXT NOT NULL'],
      ['ref_table', 'TEXT NOT NULL'],
      ['ref_id', 'TEXT NOT NULL'],
      ['unlock_day', 'INTEGER'],
      ['pool_tier', 'TEXT'],
      ['default_price', 'REAL'],
      ['price', 'REAL'],
      ['status', 'TEXT'],
      ['condition_text', 'TEXT'],
      ['note', 'TEXT']
    ],
    label: TABLE_LABELS.shop_items,
    purpose: '商品引用表；卖宠物时只引用 unit_id，不重复名称、元素、定位。'
  },
  shop_item_pools: {
    columns: [
      ['item_id', 'TEXT NOT NULL REFERENCES shop_items(item_id)'],
      ['store_id', 'TEXT NOT NULL'],
      ['weight', 'REAL'],
      ['PRIMARY KEY(item_id, store_id)', '']
    ],
    label: TABLE_LABELS.shop_item_pools,
    purpose: '商品进入哪些商店/池。'
  },
  shop_reward_pools: {
    columns: [
      ['item_id', 'TEXT NOT NULL REFERENCES shop_items(item_id)'],
      ['reward_pool_id', 'TEXT NOT NULL'],
      ['weight', 'REAL'],
      ['PRIMARY KEY(item_id, reward_pool_id)', '']
    ],
    label: TABLE_LABELS.shop_reward_pools,
    purpose: '商品进入哪些奖励池。'
  },
  relics: {
    columns: [
      ['relic_id', 'TEXT PRIMARY KEY'],
      ['name', 'TEXT NOT NULL'],
      ['relic_type', 'TEXT'],
      ['quality_id', 'TEXT'],
      ['trigger_text', 'TEXT'],
      ['unit_id', 'TEXT REFERENCES units(unit_id)'],
      ['shop_pool_id', 'TEXT'],
      ['reward_pool_id', 'TEXT'],
      ['unlock_day', 'INTEGER'],
      ['weight', 'REAL'],
      ['status', 'TEXT'],
      ['params_json', 'TEXT'],
      ['note', 'TEXT']
    ],
    label: TABLE_LABELS.relics,
    purpose: '遗物/祝福定义，只通过 unit_id 关联宠物。'
  },
  events: {
    columns: [
      ['event_id', 'TEXT PRIMARY KEY'],
      ['event_group', 'TEXT'],
      ['name', 'TEXT NOT NULL'],
      ['node', 'TEXT'],
      ['day_expr', 'TEXT'],
      ['option_id', 'TEXT'],
      ['option_text', 'TEXT'],
      ['unit_id', 'TEXT REFERENCES units(unit_id)'],
      ['shop_pool_id', 'TEXT'],
      ['reward_pool_id', 'TEXT'],
      ['cost_text', 'TEXT'],
      ['gain_text', 'TEXT'],
      ['value', 'REAL'],
      ['layer', 'TEXT'],
      ['status', 'TEXT'],
      ['note', 'TEXT']
    ],
    label: TABLE_LABELS.events,
    purpose: '事件定义，只通过 unit_id/池 ID 引用其他对象。'
  },
  node_schedule: {
    columns: [
      ['schedule_id', 'TEXT PRIMARY KEY'],
      ['day', 'INTEGER'],
      ['step', 'INTEGER'],
      ['kind', 'TEXT'],
      ['label', 'TEXT'],
      ['node_pool_id', 'TEXT'],
      ['choice_count', 'INTEGER'],
      ['status', 'TEXT'],
      ['note', 'TEXT']
    ],
    label: TABLE_LABELS.node_schedule,
    purpose: '每日路线日程。'
  },
  node_pool: {
    columns: [
      ['node_id', 'TEXT PRIMARY KEY'],
      ['node_pool_id', 'TEXT'],
      ['name', 'TEXT NOT NULL'],
      ['node_type', 'TEXT'],
      ['weight', 'REAL'],
      ['unlock_day', 'INTEGER'],
      ['shop_pool_id', 'TEXT'],
      ['reward_pool_id', 'TEXT'],
      ['event_id', 'TEXT'],
      ['slots', 'INTEGER'],
      ['value', 'REAL'],
      ['status', 'TEXT'],
      ['note', 'TEXT']
    ],
    label: TABLE_LABELS.node_pool,
    purpose: '路线节点池。'
  },
  encounter_pool: {
    columns: [
      ['encounter_id', 'TEXT PRIMARY KEY'],
      ['encounter_pool_id', 'TEXT'],
      ['name', 'TEXT NOT NULL'],
      ['weight', 'REAL'],
      ['unlock_day', 'INTEGER'],
      ['wave_period', 'TEXT'],
      ['battle_index', 'INTEGER'],
      ['phase_label', 'TEXT'],
      ['wave_id', 'TEXT'],
      ['reward_pool_id', 'TEXT'],
      ['risk_label', 'TEXT'],
      ['enemy_preview', 'TEXT'],
      ['mechanic_preview', 'TEXT'],
      ['reward_preview', 'TEXT'],
      ['status', 'TEXT'],
      ['note', 'TEXT']
    ],
    label: TABLE_LABELS.encounter_pool,
    purpose: '遭遇池。'
  },
  quality_multipliers: {
    columns: [
      ['quality_id', 'TEXT PRIMARY KEY'],
      ['multiplier', 'REAL'],
      ['hp_multiplier', 'REAL'],
      ['atk_multiplier', 'REAL'],
      ['def_multiplier', 'REAL'],
      ['shield_multiplier', 'REAL'],
      ['mechanic_multiplier', 'TEXT'],
      ['action_rule', 'TEXT'],
      ['note', 'TEXT']
    ],
    label: TABLE_LABELS.quality_multipliers,
    purpose: '品质倍率定义。'
  }
};

const FIELD_NOTES = {
  units: {
    unit_id: ['pk', null, null, 'id', '单位唯一 ID。'],
    name: ['owned', null, null, 'name', '单位名称唯一维护处。'],
    element_id: ['reference', 'lookup_values', 'value_id', 'element', '引用元素字典。'],
    quality_id: ['reference', 'lookup_values', 'value_id', 'quality', '引用品质字典。'],
    role_id: ['reference', 'lookup_values', 'value_id', 'role', '引用定位字典。']
  },
  stat_profiles: {
    unit_id: ['reference', 'units', 'unit_id', 'id/petId', '引用单位身份。'],
    hp: ['owned', null, null, 'hp', '战斗数值统一维护处。'],
    atk: ['owned', null, null, 'atk', '战斗数值统一维护处。'],
    shield: ['owned', null, null, 'shield', '战斗数值统一维护处。'],
    ap: ['owned', null, null, 'ap', '战斗数值统一维护处。']
  },
  wave_rounds: {
    primary_unit_id: ['reference', 'units', 'unit_id', 'petId', '波次只引用单位，不重复名称/数值。']
  },
  shop_items: {
    ref_id: ['reference', 'units', 'unit_id', 'petId', '宠物商品只引用 unit_id。']
  }
};

function ensureDir(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function rel(root, file) {
  return path.relative(root, file).replace(/\\/g, '/');
}

function cleanValue(value) {
  if (value === undefined) return null;
  if (value === '') return null;
  return value;
}

function num(value) {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function text(value) {
  const cleaned = cleanValue(value);
  if (cleaned === null) return null;
  return String(cleaned);
}

function jsonText(value) {
  if (value === undefined) return null;
  return JSON.stringify(value);
}

function table(rows = []) {
  return Array.isArray(rows) ? rows : [];
}

function stableId(...parts) {
  return parts.map(part => String(part == null ? '' : part).replace(/[^A-Za-z0-9_]+/g, '_')).join('__');
}

function addLookup(set, lookupType, value, source) {
  if (value === null || value === undefined || value === '' || value === 'none') return;
  set.add(`${lookupType}\t${String(value)}\t${source || ''}`);
}

function pushUnique(rows, seen, key, row) {
  if (!key || seen.has(key)) return;
  seen.add(key);
  rows.push(row);
}

function buildDatabaseModel(payload) {
  const data = payload.data || {};
  const rows = Object.fromEntries(Object.keys(SCHEMA).map(key => [key, []]));
  const lookupSet = new Set();
  const seen = {
    units: new Set(),
    shapes: new Set(),
    shopStores: new Set(),
    waves: new Set(),
    unitMechanics: new Set(),
    unitTags: new Set(),
    shapeSlots: new Set()
  };
  const lookupSources = new Map();

  rows.db_meta.push(
    { key: 'schemaVersion', value: 'ysbzs.runtime-database.v1' },
    { key: 'generatedAt', value: payload.generatedAt },
    { key: 'runtimeSource', value: payload.source && payload.source.runtime ? payload.source.runtime.mode : 'unknown' },
    { key: 'sourceWorkbook', value: payload.source && payload.source.runtime ? payload.source.runtime.workbook : null }
  );

  for (const pet of table(data.pets)) {
    addLookup(lookupSet, 'element', pet.element, 'pets');
    addLookup(lookupSet, 'element', pet.subElement, 'pets');
    addLookup(lookupSet, 'quality', pet.quality, 'pets');
    addLookup(lookupSet, 'size', pet.size, 'pets');
    addLookup(lookupSet, 'role', pet.role, 'pets');
    for (const tag of pet.tags || []) addLookup(lookupSet, 'tag', tag, 'pets');
    pushUnique(rows.units, seen.units, pet.id, {
      unit_id: pet.id,
      unit_type: 'pet',
      unit_no: pet.no,
      name: pet.name,
      element_id: pet.element,
      sub_element_id: pet.subElement,
      quality_id: pet.quality,
      size_id: pet.size,
      role_id: pet.role,
      skill_id: pet.skill,
      summonable: pet.summonable ? 1 : 0,
      status: '正式',
      note: pet.note
    });
    rows.stat_profiles.push({
      profile_id: `${pet.id}:base_pet`,
      unit_id: pet.id,
      profile_kind: 'base_pet',
      hp: pet.hp,
      atk: pet.atk,
      def: pet.def,
      shield: pet.shield,
      ap: pet.ap,
      score: pet.score,
      score_kind: 'effect_score',
      note: null
    });
    for (const tag of pet.tags || []) {
      pushUnique(rows.unit_tags, seen.unitTags, `${pet.id}:${tag}`, { unit_id: pet.id, tag_id: tag });
    }
    for (const mechanismId of pet.mechanics || []) {
      if (!mechanismId || mechanismId === 'none') continue;
      pushUnique(rows.unit_mechanics, seen.unitMechanics, `${pet.id}:${mechanismId}:base_pet`, {
        unit_id: pet.id,
        mechanism_id: mechanismId,
        relation_kind: 'base_pet'
      });
    }
  }

  for (const mechanism of table(data.mechanisms)) {
    rows.mechanisms.push({
      mechanism_id: mechanism.id,
      code: mechanism.code,
      name: mechanism.name,
      category: mechanism.category,
      trigger_id: mechanism.trigger,
      condition_text: mechanism.condition,
      effect_text: mechanism.effect,
      log_template: mechanism.logTemplate,
      score: mechanism.score,
      power: mechanism.power,
      status: mechanism.status,
      integration_status: mechanism.integrationStatus,
      note: mechanism.note
    });
    addLookup(lookupSet, 'trigger', mechanism.trigger, 'mechanisms');
    for (const [paramKey, paramValue] of Object.entries(mechanism.defaultParams || {})) {
      rows.mechanism_params.push({
        mechanism_id: mechanism.id,
        param_key: paramKey,
        param_value: text(paramValue)
      });
    }
  }

  for (const shape of table(data.shapes)) {
    addLookup(lookupSet, 'action_type', shape.actionType, 'shapes');
    pushUnique(rows.shapes, seen.shapes, shape.shapeId, {
      shape_id: shape.shapeId,
      shape_name: shape.shapeName,
      shape_class: shape.shapeClass,
      hit_cells: shape.hitCells,
      direction: shape.direction,
      slot_count: shape.slotCount,
      base_layers: shape.baseLayers,
      action_type_id: shape.actionType,
      skill_id: shape.skill,
      mechanic_name: shape.mechanicName,
      integration_status: shape.integrationStatus,
      note: shape.note
    });
    if (shape.petId) rows.unit_shapes.push({ unit_id: shape.petId, shape_id: shape.shapeId });
    for (const mechanismId of shape.mechanics || []) {
      if (!mechanismId || mechanismId === 'none' || !shape.petId) continue;
      pushUnique(rows.unit_mechanics, seen.unitMechanics, `${shape.petId}:${mechanismId}:shape`, {
        unit_id: shape.petId,
        mechanism_id: mechanismId,
        relation_kind: 'shape'
      });
    }
    (shape.slotElements || []).forEach((elementId, index) => {
      addLookup(lookupSet, 'element', elementId, 'shapes');
      pushUnique(rows.shape_slots, seen.shapeSlots, `${shape.shapeId}:${index + 1}`, { shape_id: shape.shapeId, slot_index: index + 1, element_id: elementId });
    });
  }

  for (const monster of table(data.monsters)) {
    addLookup(lookupSet, 'enemy_role', monster.enemyRole, 'monsters');
    rows.monster_templates.push({
      template_id: `${monster.petId}:monster_template`,
      unit_id: monster.petId,
      stage: monster.stage,
      enemy_role_id: monster.enemyRole,
      countered_by: monster.counteredBy,
      recommended_day: monster.recommendedDay,
      note: monster.note
    });
    rows.stat_profiles.push({
      profile_id: `${monster.petId}:monster_template`,
      unit_id: monster.petId,
      profile_kind: 'monster_template',
      hp: monster.hp,
      atk: monster.atk,
      def: monster.def,
      shield: monster.shield,
      ap: monster.ap,
      score: monster.panelScore,
      score_kind: 'monster_panel_score',
      note: monster.note
    });
    for (const mechanismId of monster.mechanics || []) {
      if (!mechanismId || mechanismId === 'none') continue;
      pushUnique(rows.unit_mechanics, seen.unitMechanics, `${monster.petId}:${mechanismId}:monster_template`, {
        unit_id: monster.petId,
        mechanism_id: mechanismId,
        relation_kind: 'monster_template'
      });
    }
  }

  table(data.waves).forEach((wave, waveIndex) => {
    pushUnique(rows.waves, seen.waves, wave.waveId, {
      wave_id: wave.waveId,
      day: wave.day,
      period: wave.period
    });
    const waveRoundId = stableId(wave.waveId, `r${wave.round}`, `row${waveIndex + 1}`);
    rows.wave_rounds.push({
      wave_round_id: waveRoundId,
      wave_id: wave.waveId,
      round_index: wave.round,
      primary_unit_id: wave.petId,
      pet_pool_expression: wave.petPoolExpression,
      spawn_count: wave.spawnCount,
      count: wave.count,
      threat: wave.threat,
      threat_score_source: wave.threatScoreSource
    });
    (wave.petPool || []).forEach((unitId, index) => rows.wave_unit_pool.push({
      wave_round_id: waveRoundId,
      unit_id: unitId,
      pool_index: index + 1
    }));
    for (const [qualityId, weight] of Object.entries(wave.qualityWeights || {})) {
      addLookup(lookupSet, 'quality', qualityId, 'waves');
      rows.wave_quality_weights.push({ wave_round_id: waveRoundId, quality_id: qualityId, weight });
    }
  });

  for (const store of table(data.shopStores)) {
    pushUnique(rows.shop_stores, seen.shopStores, store.id, {
      store_id: store.id,
      name: store.name,
      store_type: store.storeType,
      default_slots: store.defaultSlots,
      unlock_day: store.unlockDay,
      price_rule: store.priceRule,
      status: store.status,
      note: store.note
    });
  }

  for (const item of table(data.shop)) {
    const itemId = item.itemType === '宠物' ? `pet:${item.petId}` : stableId(item.itemType, item.petId);
    rows.shop_items.push({
      item_id: itemId,
      item_type: item.itemType,
      ref_table: item.itemType === '宠物' ? 'units' : 'unknown',
      ref_id: item.petId,
      unlock_day: item.unlockDay,
      pool_tier: item.poolTier,
      default_price: item.defaultPrice,
      price: item.price,
      status: item.status,
      condition_text: item.condition,
      note: item.note
    });
    for (const storeId of item.shopPools || []) rows.shop_item_pools.push({
      item_id: itemId,
      store_id: storeId,
      weight: item.weights && storeId.startsWith('elem_') ? item.weights.element : item.weights && storeId.startsWith('tier_') ? item.weights.tier : item.weights ? item.weights.night : null
    });
    for (const rewardPoolId of item.rewardPools || []) rows.shop_reward_pools.push({
      item_id: itemId,
      reward_pool_id: rewardPoolId,
      weight: item.weights ? item.weights.reward : null
    });
  }

  for (const relic of table(data.relics)) {
    rows.relics.push({
      relic_id: relic.id,
      name: relic.name,
      relic_type: relic.type,
      quality_id: relic.quality,
      trigger_text: relic.trigger,
      unit_id: relic.petId,
      shop_pool_id: relic.shopPoolId,
      reward_pool_id: relic.rewardPoolId,
      unlock_day: relic.unlockDay,
      weight: relic.weight,
      status: relic.status,
      params_json: jsonText(relic.params || {}),
      note: relic.note
    });
  }

  for (const event of table(data.events)) {
    rows.events.push({
      event_id: event.id,
      event_group: event.group,
      name: event.name,
      node: event.node,
      day_expr: event.dayExpr,
      option_id: event.optionId,
      option_text: event.optionText,
      unit_id: event.petId,
      shop_pool_id: event.shopPoolId,
      reward_pool_id: event.rewardPoolId,
      cost_text: event.costText,
      gain_text: event.gainText,
      value: event.value,
      layer: event.layer,
      status: event.status,
      note: event.note
    });
  }

  for (const node of table(data.nodeSchedule)) rows.node_schedule.push({
    schedule_id: node.id,
    day: node.day,
    step: node.step,
    kind: node.kind,
    label: node.label,
    node_pool_id: node.poolId,
    choice_count: node.choiceCount,
    status: node.status,
    note: node.note
  });

  for (const node of table(data.nodePool)) rows.node_pool.push({
    node_id: node.nodeId,
    node_pool_id: node.nodePoolId,
    name: node.name,
    node_type: node.nodeType,
    weight: node.weight,
    unlock_day: node.unlockDay,
    shop_pool_id: node.shopPoolId,
    reward_pool_id: node.rewardPoolId,
    event_id: node.eventId,
    slots: node.slots,
    value: node.value,
    status: node.status,
    note: node.note
  });

  for (const encounter of table(data.encounterPool)) rows.encounter_pool.push({
    encounter_id: encounter.encounterId,
    encounter_pool_id: encounter.encounterPoolId,
    name: encounter.name,
    weight: encounter.weight,
    unlock_day: encounter.unlockDay,
    wave_period: encounter.wavePeriod,
    battle_index: encounter.battleIndex,
    phase_label: encounter.phaseLabel,
    wave_id: encounter.waveId,
    reward_pool_id: encounter.rewardPoolId,
    risk_label: encounter.riskLabel,
    enemy_preview: encounter.enemyPreview,
    mechanic_preview: encounter.mechanicPreview,
    reward_preview: encounter.rewardPreview,
    status: encounter.status,
    note: encounter.note
  });

  for (const quality of table(data.qualityMultipliers)) {
    const qualityId = quality['品质'];
    addLookup(lookupSet, 'quality', qualityId, 'quality_multipliers');
    rows.quality_multipliers.push({
      quality_id: qualityId,
      multiplier: num(quality['倍率']),
      hp_multiplier: num(quality['HP倍率']),
      atk_multiplier: num(quality['攻倍率']),
      def_multiplier: num(quality['防倍率']),
      shield_multiplier: num(quality['盾倍率']),
      mechanic_multiplier: quality['机制分倍率'],
      action_rule: quality['行动规则'],
      note: quality['说明']
    });
  }

  for (const entry of lookupSet) {
    const [lookupType, valueId, source] = entry.split('\t');
    const key = `${lookupType}\t${valueId}`;
    if (!lookupSources.has(key)) lookupSources.set(key, source || '');
  }
  for (const [key, source] of lookupSources) {
    const [lookupType, valueId] = key.split('\t');
    rows.lookup_values.push({ lookup_type: lookupType, value_id: valueId, label: valueId, source });
  }

  for (const file of payload.source.files || []) rows.source_files.push({
    path: file.path,
    format: file.format,
    bytes: file.bytes,
    rows: file.rows,
    parse_status: file.parseStatus
  });

  (payload.source.csvRows || []).forEach((row, index) => rows.source_rows.push({
    source_row_id: `csv:${index + 1}`,
    source_kind: 'csv',
    source_path: row.sourcePath,
    format: row.format,
    row_number: row.rowNumber,
    key_path: row.csvFile,
    value: null,
    row_json: jsonText(row)
  }));
  (payload.source.contentRows || []).forEach((row, index) => rows.source_rows.push({
    source_row_id: `content:${index + 1}`,
    source_kind: 'content',
    source_path: row.sourcePath,
    format: row.format,
    row_number: null,
    key_path: row.keyPath,
    value: row.value,
    row_json: jsonText(row)
  }));

  (payload.issues || []).forEach((issue, index) => rows.issues.push({
    issue_id: `issue:${index + 1}`,
    severity: issue.severity,
    table_name: issue.table,
    row_key: issue.rowKey,
    field_name: issue.field,
    message: issue.message
  }));

  for (const [tableName, schema] of Object.entries(SCHEMA)) {
    const primary = schema.columns.find(col => /PRIMARY KEY/.test(col[1])) || schema.columns.find(col => /PRIMARY KEY/.test(col[0]));
    rows.table_catalog.push({
      table_name: tableName,
      label: schema.label,
      purpose: schema.purpose,
      primary_key: primary ? primary[0].replace(/^PRIMARY KEY\((.+)\)$/, '$1') : null,
      row_count: rows[tableName].length
    });
    for (const [fieldName, fieldType] of schema.columns) {
      if (fieldName.startsWith('PRIMARY KEY')) continue;
      const note = FIELD_NOTES[tableName] && FIELD_NOTES[tableName][fieldName];
      const isPk = /PRIMARY KEY/.test(fieldType);
      rows.field_catalog.push({
        table_name: tableName,
        field_name: fieldName,
        field_type: fieldType.replace(/\s*PRIMARY KEY\s*/g, '').trim() || 'TEXT',
        field_role: note ? note[0] : isPk ? 'pk' : /REFERENCES\s+([^(]+)/.test(fieldType) ? 'reference' : 'owned',
        references_table: note ? note[1] : ((fieldType.match(/REFERENCES\s+([^(]+)/) || [])[1] || null),
        references_field: note ? note[2] : null,
        source_field: note ? note[3] : null,
        note: note ? note[4] : null
      });
    }
  }

  return rows;
}

function sqlValue(value) {
  if (value === null || value === undefined) return 'NULL';
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : 'NULL';
  return `'${String(value).replace(/'/g, "''")}'`;
}

function createTableSql(tableName, schema) {
  const cols = schema.columns.map(([name, type]) => type ? `${name} ${type}` : name).join(',\n  ');
  return `CREATE TABLE ${tableName} (\n  ${cols}\n);`;
}

function insertSql(tableName, row) {
  const fields = Object.keys(row);
  const values = fields.map(field => sqlValue(row[field]));
  return `INSERT INTO ${tableName} (${fields.join(', ')}) VALUES (${values.join(', ')});`;
}

function renderSql(rows) {
  const lines = [
    'PRAGMA foreign_keys=OFF;',
    'BEGIN TRANSACTION;'
  ];
  for (const [tableName, schema] of Object.entries(SCHEMA)) lines.push(`DROP TABLE IF EXISTS ${tableName};`);
  for (const [tableName, schema] of Object.entries(SCHEMA)) lines.push(createTableSql(tableName, schema));
  for (const tableName of Object.keys(SCHEMA)) {
    for (const row of rows[tableName] || []) lines.push(insertSql(tableName, row));
  }
  lines.push('COMMIT;', 'PRAGMA foreign_keys=ON;');
  return `${lines.join('\n')}\n`;
}

function buildSnapshot(payload, rows, dbFileName) {
  const tables = {};
  for (const [tableName, schema] of Object.entries(SCHEMA)) {
    const rowList = rows[tableName] || [];
    tables[tableName] = {
      label: schema.label,
      purpose: schema.purpose,
      columns: schema.columns.filter(([name]) => !name.startsWith('PRIMARY KEY')).map(([name, type]) => ({ name, type })),
      rows: rowList
    };
  }
  return {
    schemaVersion: 'ysbzs.runtime-database.v1',
    generatedAt: payload.generatedAt,
    source: payload.source.runtime,
    download: dbFileName,
    counts: Object.fromEntries(Object.entries(tables).map(([name, item]) => [name, item.rows.length])),
    tables
  };
}

function snapshotJson(snapshot) {
  return JSON.stringify({
    schemaVersion: snapshot.schemaVersion,
    generatedAt: snapshot.generatedAt,
    source: snapshot.source,
    download: snapshot.download,
    counts: snapshot.counts,
    tables: snapshot.tables
  }).replace(/</g, '\\u003c');
}

function renderDatabaseMobileHtml(snapshot) {
  const appJson = snapshotJson(snapshot);
  return `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>元素背包史数据库</title>
<style>
:root{color-scheme:light;--bg:#f5f7fa;--panel:#fff;--ink:#111827;--muted:#667085;--line:#d8dde6;--accent:#1d4ed8;--accent-soft:#eaf1ff;--green:#087443}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--ink);font:15px/1.45 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
header{position:sticky;top:0;z-index:5;background:rgba(255,255,255,.96);border-bottom:1px solid var(--line);padding:12px 14px 10px;backdrop-filter:blur(10px)}
h1{font-size:19px;margin:0 0 8px;letter-spacing:0}
.summary{display:flex;gap:6px;overflow-x:auto;padding-bottom:2px}
.chip,.download{flex:0 0 auto;border:1px solid var(--line);border-radius:7px;background:#fff;padding:5px 8px;color:var(--muted);font-size:12px;text-decoration:none}
.chip strong{color:var(--ink);font-size:13px}
.download{color:var(--accent);font-weight:700}
.controls{display:grid;grid-template-columns:1fr 1fr;gap:8px;padding:10px 12px;background:#eef2f6;border-bottom:1px solid var(--line);position:sticky;top:75px;z-index:4}
.controls input{grid-column:1/-1}
input,select{width:100%;min-height:42px;border:1px solid var(--line);border-radius:8px;background:#fff;padding:8px 10px;font:inherit;color:var(--ink)}
main{padding:10px 10px 70px}
.table-note{font-size:13px;color:var(--muted);margin:2px 2px 10px}
.head{display:flex;align-items:center;justify-content:space-between;gap:10px;margin:0 2px 10px}
.title{font-weight:800}
.pill{border-radius:999px;background:var(--accent-soft);color:var(--accent);padding:3px 8px;font-weight:700;font-size:13px;white-space:nowrap}
.card{background:var(--panel);border:1px solid var(--line);border-radius:8px;margin-bottom:9px;overflow:hidden}
.card-main{padding:10px 11px}
.card-top{display:flex;justify-content:space-between;gap:10px;margin-bottom:7px}
.row-title{font-weight:760;min-width:0;overflow-wrap:anywhere}
.row-meta{font-size:12px;color:var(--muted);white-space:nowrap}
.kv{display:grid;grid-template-columns:minmax(78px,36%) 1fr;gap:4px 8px;font-size:13px}
.key{color:var(--muted)}
.val{overflow-wrap:anywhere}
.ref{color:var(--green);font-weight:650}
details{border-top:1px solid #edf0f5}
summary{padding:9px 11px;color:var(--accent);font-weight:650;cursor:pointer}
pre{margin:0;padding:0 11px 11px;white-space:pre-wrap;overflow-wrap:anywhere;font:12px/1.45 ui-monospace,SFMono-Regular,Menlo,monospace;color:#374151}
.empty{padding:28px 12px;color:var(--muted);text-align:center}
@media (min-width:760px){body{max-width:760px;margin:0 auto;border-left:1px solid var(--line);border-right:1px solid var(--line)}.card-main{padding:12px 14px}.kv{grid-template-columns:170px 1fr}}
</style>
</head>
<body>
<header>
  <h1>元素背包史数据库</h1>
  <div class="summary" id="summary"></div>
</header>
<section class="controls">
  <input id="search" type="search" placeholder="搜索表、字段、ID、中文值">
  <select id="tableSelect"></select>
  <select id="fieldMode">
    <option value="data">数据行</option>
    <option value="fields">字段定义</option>
    <option value="refs">只看引用字段</option>
  </select>
</section>
<main>
  <div class="head"><div class="title" id="tableTitle"></div><div class="pill" id="rowCount"></div></div>
  <div class="table-note" id="tableNote"></div>
  <div id="list"></div>
</main>
<script id="app-data" type="application/json">${appJson}</script>
<script>
const db = JSON.parse(document.getElementById('app-data').textContent);
const tableNames = Object.keys(db.tables);
const preferred = ['units','stat_profiles','mechanisms','shapes','wave_rounds','shop_items','events','relics','field_catalog','source_rows'];
function orderedTables(){ return preferred.filter(name => db.tables[name]).concat(tableNames.filter(name => !preferred.includes(name))); }
function html(value){ return String(value == null ? '' : value).replace(/[&<>"]/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[ch])); }
function scalar(value){ if(value == null) return ''; if(typeof value === 'object') return JSON.stringify(value); return String(value); }
function rowKey(row){ return row.unit_id || row.profile_id || row.mechanism_id || row.shape_id || row.wave_round_id || row.item_id || row.event_id || row.relic_id || row.table_name || row.source_row_id || Object.values(row)[0] || ''; }
function renderSummary(){
  const totalRows = Object.values(db.counts).reduce((a,b)=>a+b,0);
  document.getElementById('summary').innerHTML = [
    ['源', db.source ? db.source.mode : 'unknown'],
    ['表', tableNames.length],
    ['行', totalRows],
    ['单位', db.counts.units || 0],
    ['数值档', db.counts.stat_profiles || 0]
  ].map(([k,v]) => '<span class="chip">' + k + ' <strong>' + v + '</strong></span>').join('') + '<a class="download" href="' + html(db.download) + '">下载 SQLite</a>';
}
function renderOptions(){
  const select = document.getElementById('tableSelect');
  select.innerHTML = orderedTables().map(name => {
    const table = db.tables[name];
    return '<option value="' + html(name) + '">' + html(table.label) + ' · ' + (db.counts[name] || 0) + '</option>';
  }).join('');
}
function fieldsFor(tableName){
  const defs = db.tables.field_catalog ? db.tables.field_catalog.rows : [];
  return defs.filter(row => row.table_name === tableName);
}
function compactKeys(tableName, row){
  const priority = ['unit_id','name','element_id','quality_id','role_id','profile_kind','hp','atk','shield','ap','mechanism_id','shape_id','wave_id','round_index','primary_unit_id','ref_id','event_id','relic_id','note'];
  const keys = [];
  for (const key of priority) if (Object.prototype.hasOwnProperty.call(row, key)) keys.push(key);
  for (const key of Object.keys(row)) if (!keys.includes(key) && keys.length < 9) keys.push(key);
  return keys.slice(0, 9);
}
function isReference(tableName, key){
  return fieldsFor(tableName).some(field => field.field_name === key && field.field_role === 'reference');
}
function renderRows(tableName){
  const mode = document.getElementById('fieldMode').value;
  const query = document.getElementById('search').value.trim().toLowerCase();
  const table = db.tables[tableName];
  let rows = mode === 'fields' || mode === 'refs' ? fieldsFor(tableName) : table.rows;
  if (mode === 'refs') rows = rows.filter(row => row.field_role === 'reference');
  if (query) rows = rows.filter(row => JSON.stringify(row).toLowerCase().includes(query));
  document.getElementById('tableTitle').textContent = table.label + ' / ' + tableName;
  document.getElementById('rowCount').textContent = rows.length + ' 行';
  document.getElementById('tableNote').textContent = mode === 'data' ? table.purpose : '字段目录会标出 owned / reference / pk；reference 表示这里不维护值，只引用别处。';
  if (!rows.length) { document.getElementById('list').innerHTML = '<div class="empty">没有匹配数据。</div>'; return; }
  document.getElementById('list').innerHTML = rows.slice(0, 300).map((row, index) => {
    const title = mode === 'data' ? rowKey(row) : row.field_name;
    const meta = mode === 'data' ? '#' + (index + 1) : row.field_role;
    const keys = mode === 'data' ? compactKeys(tableName, row) : ['field_name','field_type','field_role','references_table','references_field','source_field','note'];
    const body = keys.filter(key => Object.prototype.hasOwnProperty.call(row, key)).map(key => '<div class="key">' + html(key) + '</div><div class="val ' + (isReference(tableName, key) || key === 'references_table' ? 'ref' : '') + '">' + html(scalar(row[key])) + '</div>').join('');
    return '<article class="card"><div class="card-main"><div class="card-top"><div class="row-title">' + html(title) + '</div><div class="row-meta">' + html(meta) + '</div></div><div class="kv">' + body + '</div></div><details><summary>完整字段</summary><pre>' + html(JSON.stringify(row, null, 2)) + '</pre></details></article>';
  }).join('') + (rows.length > 300 ? '<div class="empty">已显示前 300 行，请继续搜索缩小范围。</div>' : '');
}
function render(){ renderSummary(); renderOptions(); renderRows(document.getElementById('tableSelect').value || orderedTables()[0]); }
document.getElementById('tableSelect').onchange = () => renderRows(document.getElementById('tableSelect').value);
document.getElementById('fieldMode').onchange = () => renderRows(document.getElementById('tableSelect').value);
document.getElementById('search').oninput = () => renderRows(document.getElementById('tableSelect').value);
render();
</script>
</body>
</html>
`;
}

function writeSqlite(sql, dbPath) {
  const tmpSql = path.join(os.tmpdir(), `ysbzs-runtime-db-${Date.now()}.sql`);
  fs.writeFileSync(tmpSql, sql);
  fs.rmSync(dbPath, { force: true });
  execFileSync('sqlite3', [dbPath, `.read ${tmpSql}`], { stdio: 'pipe' });
  fs.rmSync(tmpSql, { force: true });
}

function copyFile(src, dest) {
  ensureDir(dest);
  fs.copyFileSync(src, dest);
}

function buildRuntimeDatabase(options = {}) {
  const root = options.root || ROOT;
  const dbPath = options.dbPath || DEFAULT_DB_PATH;
  const dbJsonPath = options.dbJsonPath || DEFAULT_DB_JSON_PATH;
  const reportMobileHtmlPath = options.reportMobileHtmlPath || DEFAULT_REPORT_MOBILE_HTML;
  const webDbPath = options.webDbPath || DEFAULT_WEB_DB_PATH;
  const webDbJsonPath = options.webDbJsonPath || DEFAULT_WEB_DB_JSON_PATH;
  const webMobileHtmlPath = options.webMobileHtmlPath || DEFAULT_WEB_MOBILE_HTML;
  const sourceMode = options.sourceMode || 'workbook';
  const payload = buildRuntimeDataReport({ root, sourceMode, writeFiles: false }).payload;
  const rows = buildDatabaseModel(payload);
  const sql = renderSql(rows);
  const snapshot = buildSnapshot(payload, rows, path.basename(webDbPath));
  const mobileHtml = renderDatabaseMobileHtml(snapshot);

  if (options.writeFiles !== false) {
    ensureDir(dbPath);
    writeSqlite(sql, dbPath);
    ensureDir(dbJsonPath);
    fs.writeFileSync(dbJsonPath, `${JSON.stringify(snapshot, null, 2)}\n`);
    ensureDir(reportMobileHtmlPath);
    fs.writeFileSync(reportMobileHtmlPath, mobileHtml);
    copyFile(dbPath, webDbPath);
    ensureDir(webDbJsonPath);
    fs.writeFileSync(webDbJsonPath, `${JSON.stringify(snapshot, null, 2)}\n`);
    ensureDir(webMobileHtmlPath);
    fs.writeFileSync(webMobileHtmlPath, mobileHtml);
  }

  return {
    payload,
    rows,
    sql,
    snapshot,
    mobileHtml,
    dbPath,
    dbJsonPath,
    reportMobileHtmlPath,
    webDbPath,
    webDbJsonPath,
    webMobileHtmlPath
  };
}

function parseArgs(argv) {
  const out = { sourceMode: 'workbook' };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--csv') {
      out.sourceMode = 'csv';
      continue;
    }
    if (arg === '--workbook') {
      out.sourceMode = 'workbook';
      continue;
    }
    if (arg === '--help' || arg === '-h') {
      out.help = true;
      continue;
    }
    throw new Error(`unknown argument: ${arg}`);
  }
  return out;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log('Usage: node tools/build_runtime_database.cjs [--workbook] [--csv]');
    console.log('Builds data/runtime/ysbzs.db plus static web/data database browser artifacts.');
    return;
  }
  const result = buildRuntimeDatabase({ sourceMode: args.sourceMode });
  console.log(`SQLite database: ${rel(ROOT, result.dbPath)}`);
  console.log(`database JSON: ${rel(ROOT, result.dbJsonPath)}`);
  console.log(`mobile database: ${rel(ROOT, result.reportMobileHtmlPath)}`);
  console.log(`public web DB: ${rel(ROOT, result.webDbPath)}`);
  console.log(`public web mobile DB: ${rel(ROOT, result.webMobileHtmlPath)}`);
  console.log(`source: ${result.payload.source.runtime.mode}`);
  console.log(`tables: ${Object.keys(result.snapshot.tables).length}`);
  console.log(`rows: ${Object.values(result.snapshot.counts).reduce((acc, count) => acc + count, 0)}`);
}

if (require.main === module) main();

module.exports = {
  SCHEMA,
  TABLE_LABELS,
  buildDatabaseModel,
  renderSql,
  buildRuntimeDatabase,
  renderDatabaseMobileHtml
};
