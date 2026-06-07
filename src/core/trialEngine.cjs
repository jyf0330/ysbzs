/**
 * trialEngine.cjs — 试炼引擎（表驱动）
 *
 * 依赖统一的 elementReactions.cjs + unitFactory.cjs + csvData.cjs 数据加载。
 * 不再独立加载 CSV、不再复制 fireDamage/explode/waterCatalyst/transferFire。
 */

const { getCell, syncBoardUnits, makeEmptyElements, createBoard } = require('./state.cjs');
const { loadGameData, buildIndexes } = require('./data.cjs');
const { makeTrialUnit } = require('./unitFactory.cjs');
const { fireDamage, explodeIfEnemyOnFire, waterCatalyst, transferFire } = require('./elements.cjs');
const mech = require('./mechanics.cjs');

function clone(v) { return JSON.parse(JSON.stringify(v)); }
function toNum(v, fallback = 0) {
  if (v === undefined || v === null || v === '') return fallback;
  const n = Number(String(v).replace(/,/g, '').trim());
  return Number.isFinite(n) ? n : fallback;
}
function yes(v) { return ['是', 'true', '1', 'yes', 'y'].includes(String(v || '').trim().toLowerCase()); }
function pos(row, prefix = '') {
  const r = toNum(row[`${prefix}行`] || row[`${prefix}行(1-8)`], null);
  const c = toNum(row[`${prefix}列`] || row[`${prefix}列(1-8)`], null);
  if (r === null || c === null) return null;
  return { r: Math.max(0, r - 1), c: Math.max(0, c - 1) };
}
function posText(p) { return `第${p.r + 1}行第${p.c + 1}列`; }
function cellAt(state, p) { return getCell(state, p.r, p.c); }
function ensureCellElements(cell) {
  if (!cell.elements) cell.elements = makeEmptyElements();
  for (const el of ['火', '水', '风', '土']) if (typeof cell.elements[el] !== 'number') cell.elements[el] = 0;
  if (!cell.elementCamps) cell.elementCamps = { 火: null, 水: null, 风: null, 土: null };
  return cell.elements;
}

function stableScenarioUnitId(row) {
  const type = row['类型'], petId = row['宠物ID'], name = row['名称'] || '';
  if (type === 'enemy_hero') return 'day7_beast_examiner';
  if (petId === 'pal_072') return 'day7_rongyan';
  if (petId === 'pal_005') return 'day7_huoronghu';
  if (petId === 'pal_006') return 'day7_chonglangya';
  if (petId === 'pal_038') return 'day7_wind_gather';
  if (name.includes('精灵龙')) return 'day7_enemy_dragon';
  if (name.includes('皮皮鸡')) return 'day7_enemy_chicken';
  if (name.includes('骑士蜂')) return 'day7_enemy_bee';
  if (name.includes('棉悠悠')) return 'day7_enemy_sheep';
  return `trial_${String(petId || name).replace(/[^\w一-龥]+/g, '_')}`;
}

// ── 通过 state.data 加载试炼配置（不走独立 fs.readFileSync）──
let cfgCache = new Map();
function loadTrialConfig(trialId = 'day7_fire_trial_v1', state) {
  const cacheKey = state ? `${trialId}_${state.phase || 0}` : trialId;
  if (cfgCache.has(cacheKey)) return cfgCache.get(cacheKey);

  const data = (state && state.data) || loadGameData();
  const ix = (state && state.indexes) || buildIndexes(data);
  const trialUnits = data.day7Trial || [];
  const rows = trialUnits.filter(r => r['配置ID'] === trialId);
  const petMap = ix.petsById;
  const shapeMap = ix.shapesByPetId;
  const domains = data.heroDomains || [];
  const reactions = data.elementReactions || [];
  const trialActions = data.trialActions || [];
  const actions = trialActions.filter(r => r['配置ID'] === trialId)
    .sort((a, b) => toNum(a['回合'], 0) - toNum(b['回合'], 0) || toNum(a['顺序'], 0) - toNum(b['顺序'], 0));

  function makeDef(row) {
    const pet = petMap.get(row['宠物ID']) || { 名称: row['宠物ID'] };
    const isPlayer = row['阵营'] === 'player';
    const shapeId = row['形状ID'];
    const shape = shapeMap.get(shapeId);
    return {
      id: stableScenarioUnitId(row), petId: row['宠物ID'],
      type: row['类型'], side: isPlayer ? 'hero' : 'enemy',
      camp: isPlayer ? 'player' : 'enemy',
      name: row['名称'] || pet['名称'] || row['宠物ID'],
      displayName: `${isPlayer ? '我方' : '敌方'}${row['名称'] || pet['名称'] || row['宠物ID']}`,
      element: ['enemy_clone', 'enemy_hero'].includes(row['类型']) ? null : (pet['元素'] || null),
      quality: row['品质覆盖'] || pet['品质'], bodySize: pet['体型'] || '中型',
      role: row['关键规则'] || pet['定位'] || row['类型'],
      effectScore: toNum(row['HP'], 0) + 3 * (toNum(row['攻'], 0) + toNum(row['防'], 0)) + 5 * (toNum(row['盾'], 0) + toNum(row['行动'], 0)) + toNum(pet['机制分'], 0),
      hp: toNum(row['HP'], toNum(pet['HP'], 1)), atk: toNum(row['攻'], toNum(pet['攻'], 0)),
      def: toNum(row['防'], toNum(pet['防'], 0)), shield: toNum(row['盾'], toNum(pet['盾'], 0)),
      ap: toNum(row['行动'], toNum(pet['行动'], 0)),
      mechanics: [row['机制ID'] || 'none', 'table_driven_trial'].filter(Boolean),
      shape: shape ? { shapeId, shapeName: shape['形状名'] || shapeId, hitCells: toNum(shape['命中格数'], 1), slotCount: toNum(shape['槽数'], 3), baseLayers: toNum(shape['基础层数'], 1) } : { shapeId: shapeId || 'NONE', shapeName: shapeId || 'NONE', hitCells: 1, slotCount: 3, baseLayers: 1 },
      position: { r: Math.max(0, toNum(row['行(1-8)'], 1) - 1), c: Math.max(0, toNum(row['列(1-8)'], 1) - 1) },
      flags: { sourceTable: '13_第7天兽群试炼_联动版.csv', sourceRow: clone(row) }
    };
  }
  const defs = rows.map(makeDef);
  const playerDefs = defs.filter(d => d.type === 'player_unit');
  const enemyDefs = defs.filter(d => d.type === 'enemy_clone');
  const enemyHeroDef = defs.find(d => d.type === 'enemy_hero');
  const ids = {
    fireCore: (playerDefs.find(d => d.petId === 'pal_072') || {}).id || 'day7_rongyan',
    fireStarter: (playerDefs.find(d => d.petId === 'pal_005') || {}).id || 'day7_huoronghu',
    waterCatalyst: (playerDefs.find(d => d.petId === 'pal_006') || {}).id || 'day7_chonglangya',
    windGather: (playerDefs.find(d => d.petId === 'pal_038') || {}).id || 'day7_wind_gather',
    dragon: (enemyDefs.find(d => d.name.includes('精灵龙')) || {}).id || 'day7_enemy_dragon',
    chicken: (enemyDefs.find(d => d.name.includes('皮皮鸡')) || {}).id || 'day7_enemy_chicken',
    bee: (enemyDefs.find(d => d.name.includes('骑士蜂')) || {}).id || 'day7_enemy_bee',
    sheep: (enemyDefs.find(d => d.name.includes('棉悠悠')) || {}).id || 'day7_enemy_sheep'
  };
  const cfg = { trialId, playerDefs, enemyDefs, enemyHeroDef, domains, reactions, actions, ids,
    source: { units: 'state.data.day7Trial', actions: 'state.data.trialActions' } };
  cfgCache.set(cacheKey, cfg);
  return cfg;
}

// ── 辅助函数 ──
function getUnit(state, id) { return (state.units || []).find(u => u.id === id); }
function getLeader(state, campOrId) {
  if (!state.leaders) return null;
  if (state.leaders[campOrId]) return state.leaders[campOrId];
  return Object.values(state.leaders).find(x => x && x.id === campOrId) || null;
}
function applyDamage(state, sourceId, targetId, amount, reason = '') {
  const source = getUnit(state, sourceId) || getLeader(state, sourceId);
  const target = getUnit(state, targetId) || getLeader(state, targetId);
  if (!target || !target.alive || amount <= 0) return 0;
  const shieldFrom = target.shield || 0;
  const hpFrom = target.hp || 0;
  let left = amount;
  const shieldAbsorb = Math.min(shieldFrom, left);
  target.shield = shieldFrom - shieldAbsorb;
  left -= shieldAbsorb;
  const hpDamage = Math.min(target.hp, left);
  target.hp -= hpDamage;
  if (target.hp <= 0) { target.hp = 0; target.alive = false; }
  // pushEvent 省略保持简洁——battle.cjs 通用 damageUnit 是权威路径
  return shieldAbsorb + hpDamage;
}
function addElement(state, sourceId, posObj, element, layers, reason = '') {
  if (!element || layers <= 0 || !posObj) return 0;
  const cell = cellAt(state, posObj);
  ensureCellElements(cell);
  const before = cell.elements[element] || 0;
  cell.elements[element] = before + layers;
  cell.elementCamps[element] = 'player';
  return cell.elements[element];
}

// ── 回合行动执行（CSV 16 表驱动）──
function executeActionRow(state, row) {
  const type = row['动作类型'];
  const unitId = row['单位ID'];
  const unit = getUnit(state, unitId);
  const note = row['说明'] || type;
  if (type === 'move') {
    const to = pos(row, '移动');
    if (!unit || !to) return;
    unit.position = to;
    return;
  }
  if (type === 'restore_shield') {
    if (!unit) return;
    unit.shield = unit.maxShield || unit.shield || 0;
    return;
  }
  if (type === 'add_element') {
    addElement(state, unitId, pos(row, '目标'), row['元素'], toNum(row['层数'], 0));
    return;
  }
  if (type !== 'attack') return;
  if (!unit) return;
  if (yes(row['使用攻击力']) && row['目标单位ID']) applyDamage(state, unitId, row['目标单位ID'], unit.atk, '物理');
  const mainPos = pos(row, '目标');
  const secondaryPos = pos(row, '副目标');
  const element = row['元素'];
  let layers = toNum(row['层数'], 0);
  if (yes(row['应用水催化']) && mainPos) {
    const cell = cellAt(state, mainPos);
    if (cell) layers = waterCatalyst(state, cell, layers);
  }
  addElement(state, unitId, mainPos, element, layers);
  addElement(state, unitId, secondaryPos, row['副元素'], toNum(row['副层数'], 0));
  // 风聚火
  for (const idx of ['1', '2']) {
    const fr = toNum(row[`来源行${idx}`], null);
    const fc = toNum(row[`来源列${idx}`], null);
    const moveAmt = toNum(row[`搬运层数${idx}`], 0);
    if (fr !== null && fc !== null && mainPos && moveAmt > 0) {
      const fromCell = cellAt(state, { r: fr - 1, c: fc - 1 });
      const toCell = cellAt(state, mainPos);
      if (fromCell && toCell) transferFire(state, fromCell, toCell, moveAmt);
    }
  }
  // 火引爆检查（通过统一的 explodeIfEnemyOnFire）
  const check = String(row['检查火爆行列'] || '');
  for (const pair of [['主格', mainPos], ['副格', secondaryPos]]) {
    if (check.includes(pair[0]) && pair[1]) {
      const cell = cellAt(state, pair[1]);
      if (cell) {
        const result = explodeIfEnemyOnFire(state, cell, unitId);
        if (result) { cell.elements.火 = 0; applyDamage(state, unitId, result.target.id, result.damage, `火${result.layersBefore}层爆发`); }
      }
    }
  }
}

function trialSummary(state, trialId = 'day7_fire_trial_v1') {
  const cfg = loadTrialConfig(trialId, state);
  const enemies = cfg.enemyDefs.map(d => getUnit(state, d.id)).filter(Boolean);
  const killed = enemies.filter(u => !u.alive || u.hp <= 0).map(u => u.name);
  return {
    id: 'day7_fire_trial', trialId, title: '第7天火核心试炼',
    dataDriven: true, generalized: true,
    playerTeam: cfg.playerDefs.map(d => d.name),
    enemyArea: '右上4×4', enemyHeroPosition: '第1行第8列',
    round1Kills: killed, round1KillCount: killed.length,
    passedRound1Standard: killed.includes('骑士蜂黄金复制体') && killed.includes('精灵龙黄金复制体') && killed.length >= 2,
    remainingEnemies: enemies.filter(u => u.alive && u.hp > 0).map(u => ({ name: u.name, hp: u.hp, shield: u.shield, position: posText(u.position) }))
  };
}

function setupTrial(state, trialId = 'day7_fire_trial_v1') {
  const cfg = loadTrialConfig(trialId, state);
  state.phase = 'player_turn';
  state.day = 7; state.period = '上午'; state.round = 1; state.maxRounds = 10;
  state.result = null; state.units = []; state.inventory = []; state.board = createBoard();
  state.actionDirs = {}; state.selected = { unitId: null, slotId: null, cell: null, direction: 'right' };
  // 从 CSV 11 表加载领域规则
  mech.applyHeroDomainsFromCsv(state);
  mech.syncHeroDomainsToLeaders(state);
  state.leaders.player = Object.assign(state.leaders.player || {}, {
    id: 'day7_player_core', side: 'hero_leader', camp: 'player', name: '我方英雄',
    hp: 80, maxHp: 80, atk: 0, def: 0, shield: 0, alive: true, position: { r: 7, c: 0 },
    mechanics: ['move_free_field', 'fire_core_field']
  });
  const eh = cfg.enemyHeroDef || { id: 'day7_beast_examiner', name: '兽群统领', hp: 80, position: { r: 0, c: 7 } };
  state.leaders.enemy = Object.assign(state.leaders.enemy || {}, {
    id: eh.id, side: 'boss', camp: 'enemy', name: eh.name, hp: eh.hp, maxHp: eh.hp,
    atk: eh.atk, def: eh.def, shield: eh.shield, alive: true, position: clone(eh.position),
    mechanics: eh.mechanics || ['beast_trial_examiner']
  });
  const qualityLevel = { 青铜: 1, 白银: 2, 黄金: 3, 钻石: 4 };
  for (const def of cfg.playerDefs) {
    const u = makeTrialUnit(def);
    state.units.push(u);
    state.inventory.push({ petId: u.petId, count: 1, level: qualityLevel[u.quality] || 1, active: true, instanceId: u.id, slot: state.inventory.length + 1 });
  }
  for (const def of cfg.enemyDefs) state.units.push(makeTrialUnit(def));
  syncBoardUnits(state);
  state.day7Trial = { scenario: trialSummary(state, trialId), round1Executed: false, roundExecuted: {},
    configSource: cfg.source, domains: cfg.domains.map(d => d['领域ID']), reactions: cfg.reactions.map(r => r['反应ID']) };
  return state.day7Trial.scenario;
}

function runTrialRound(state, trialId = 'day7_fire_trial_v1', round = 1) {
  const cfg = loadTrialConfig(trialId, state);
  if (!state.day7Trial || state.day7Trial.scenario?.trialId !== trialId) setupTrial(state, trialId);
  if (state.day7Trial.roundExecuted && state.day7Trial.roundExecuted[round]) return state.day7Trial.scenario;
  const actions = cfg.actions.filter(a => toNum(a['回合'], 0) === round);
  for (const row of actions) executeActionRow(state, row);
  syncBoardUnits(state);
  state.day7Trial.roundExecuted = state.day7Trial.roundExecuted || {};
  state.day7Trial.roundExecuted[round] = true;
  if (round === 1) state.day7Trial.round1Executed = true;
  state.day7Trial.scenario = trialSummary(state, trialId);
  return state.day7Trial.scenario;
}

module.exports = { loadTrialConfig, setupTrial, runTrialRound, trialSummary, fireDamage };
