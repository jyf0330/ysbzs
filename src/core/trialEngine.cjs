const fs = require('fs');
const path = require('path');
const { pushEvent } = require('./events.cjs');
const { createBoard, getCell, syncBoardUnits, makeEmptyElements } = require('./state.cjs');
const { parseCsv } = require('./csvData.cjs');

const CSV_DIR = path.resolve(__dirname, '../..', 'data', 'csv');
const TABLES = Object.freeze({
  pets: '01_宠物主表_好读版.csv',
  shapes: '08_形状行动槽_好读版.csv',
  domains: '11_英雄领域_联动版.csv',
  reactions: '12_元素反应_联动版.csv',
  trialUnits: '13_第7天兽群试炼_联动版.csv',
  trialActions: '16_试炼回合行动计划.csv'
});

function clone(v) { return JSON.parse(JSON.stringify(v)); }
function toNum(v, fallback = 0) {
  if (v === undefined || v === null || v === '') return fallback;
  const n = Number(String(v).replace(/,/g, '').trim());
  return Number.isFinite(n) ? n : fallback;
}
function yes(v) { return ['是', 'true', '1', 'yes', 'y'].includes(String(v || '').trim().toLowerCase()); }
function readRows(name) {
  const file = path.join(CSV_DIR, name);
  if (!fs.existsSync(file)) return [];
  return parseCsv(fs.readFileSync(file, 'utf8'));
}
function by(rows, key) { const m = new Map(); for (const r of rows || []) if (r && r[key]) m.set(r[key], r); return m; }
function pos(row, prefix = '') {
  const r = toNum(row[`${prefix}行`] || row[`${prefix}行(1-8)`], null);
  const c = toNum(row[`${prefix}列`] || row[`${prefix}列(1-8)`], null);
  if (r === null || c === null) return null;
  return { r: Math.max(0, r - 1), c: Math.max(0, c - 1) };
}
function posText(p) { return `第${p.r + 1}行第${p.c + 1}列`; }
function ensureCellElements(cell) {
  if (!cell.elements) cell.elements = makeEmptyElements();
  for (const el of ['火', '水', '风', '土']) if (typeof cell.elements[el] !== 'number') cell.elements[el] = 0;
  if (!cell.elementCamps) cell.elementCamps = { 火: null, 水: null, 风: null, 土: null };
  return cell.elements;
}
function cellAt(state, p) { return getCell(state, p.r, p.c); }
function fireDamage(layers) { const n = Math.max(0, Number(layers || 0)); return (n * (n + 1)) / 2; }

function stableScenarioUnitId(row) {
  const type = row['类型'];
  const petId = row['宠物ID'];
  const name = row['名称'] || '';
  if (type === 'enemy_hero') return 'day7_beast_examiner';
  if (petId === 'pal_072') return 'day7_rongyan';
  if (petId === 'pal_005') return 'day7_huoronghu';
  if (petId === 'pal_006') return 'day7_chonglangya';
  if (petId === 'pal_038') return 'day7_wind_gather';
  if (name.includes('精灵龙')) return 'day7_enemy_dragon';
  if (name.includes('皮皮鸡')) return 'day7_enemy_chicken';
  if (name.includes('骑士蜂')) return 'day7_enemy_bee';
  if (name.includes('棉悠悠')) return 'day7_enemy_sheep';
  return `trial_${String(petId || name).replace(/[^\w\u4e00-\u9fa5]+/g, '_')}`;
}
function parseShape(row, shapeId) {
  if (!row) return { shapeId, shapeName: shapeId, hitCells: 1, slotCount: 3, baseLayers: 1 };
  return {
    shapeId,
    shapeName: row['形状名'] || shapeId,
    shapeClass: row['形状分类'] || null,
    hitCells: toNum(row['命中格数'], 1),
    slotCount: toNum(row['槽数'], 3),
    baseLayers: toNum(row['基础层数'], 1),
    slotElements: [row['槽1元素'], row['槽2元素'], row['槽3元素']].filter(Boolean)
  };
}
function effectScoreFrom(row, mechanismScore = 0) {
  return toNum(row['HP']) + 3 * (toNum(row['攻']) + toNum(row['防'])) + 5 * (toNum(row['盾']) + toNum(row['行动'])) + mechanismScore;
}

let cache = new Map();
function loadTrialConfig(trialId = 'day7_fire_trial_v1') {
  if (cache.has(trialId)) return cache.get(trialId);
  const rows = readRows(TABLES.trialUnits).filter(r => r['配置ID'] === trialId);
  const petsById = by(readRows(TABLES.pets), '宠物ID');
  const shapesById = by(readRows(TABLES.shapes), '形状ID');
  const domains = readRows(TABLES.domains).filter(r => r['领域ID']);
  const reactions = readRows(TABLES.reactions).filter(r => r['反应ID']);
  const actions = readRows(TABLES.trialActions)
    .filter(r => r['配置ID'] === trialId)
    .sort((a, b) => toNum(a['回合'], 0) - toNum(b['回合'], 0) || toNum(a['顺序'], 0) - toNum(b['顺序'], 0));

  function makeDef(row) {
    const pet = petsById.get(row['宠物ID']) || {};
    const isPlayer = row['阵营'] === 'player';
    const shapeId = row['形状ID'] || (pet['形状'] ? String(pet['形状']).split(/\s+/)[0] : 'NONE');
    const mechanismScore = toNum(pet['机制分'], 0);
    return {
      id: stableScenarioUnitId(row),
      petId: row['宠物ID'],
      type: row['类型'],
      side: isPlayer ? 'hero' : 'enemy',
      camp: isPlayer ? 'player' : 'enemy',
      name: row['名称'] || pet['名称'] || row['宠物ID'],
      displayName: `${isPlayer ? '我方' : '敌方'}${row['名称'] || pet['名称'] || row['宠物ID']}`,
      element: row['类型'] === 'enemy_clone' || row['类型'] === 'enemy_hero' ? null : (pet['元素'] || null),
      quality: row['品质覆盖'] || pet['品质'],
      bodySize: pet['体型'] || '中型',
      role: row['关键规则'] || pet['定位'] || row['类型'],
      effectScore: effectScoreFrom(row, mechanismScore),
      hp: toNum(row['HP'], toNum(pet['HP'], 1)),
      atk: toNum(row['攻'], toNum(pet['攻'], 0)),
      def: toNum(row['防'], toNum(pet['防'], 0)),
      shield: toNum(row['盾'], toNum(pet['盾'], 0)),
      ap: toNum(row['行动'], toNum(pet['行动'], 0)),
      mechanics: [row['机制ID'] || 'none', 'table_driven_trial'].filter(Boolean),
      shape: parseShape(shapesById.get(shapeId), shapeId),
      position: { r: toNum(row['行(1-8)'], 1) - 1, c: toNum(row['列(1-8)'], 1) - 1 },
      sourceRow: clone(row)
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
  const cfg = { trialId, playerDefs, enemyDefs, enemyHeroDef, domains, reactions, actions, ids, source: { csvDir: CSV_DIR, units: TABLES.trialUnits, actions: TABLES.trialActions } };
  cache.set(trialId, cfg);
  return cfg;
}

function makeTrialUnit(def) {
  return {
    id: def.id,
    petId: def.petId || def.id,
    side: def.side,
    camp: def.camp || (def.side === 'hero' ? 'player' : 'enemy'),
    name: def.name,
    displayName: def.displayName,
    element: def.element || null,
    quality: def.quality,
    bodySize: def.bodySize,
    role: def.role,
    effectScore: def.effectScore,
    maxHp: def.hp,
    hp: def.hp,
    atk: def.atk,
    def: def.def || 0,
    shield: def.shield || 0,
    maxShield: def.shield || 0,
    ap: def.ap,
    mechanics: def.mechanics || ['table_driven_trial'],
    shape: def.shape || null,
    position: clone(def.position),
    elements: makeEmptyElements(),
    alive: true,
    flags: { sourceTable: TABLES.trialUnits, sourceRow: def.sourceRow || null },
    roundDamageTaken: 0,
    actionSlotsUsed: {},
    hasAttacked: false
  };
}
function getUnit(state, id) { return (state.units || []).find(u => u.id === id); }
function getLeader(state, campOrId) {
  if (!state.leaders) return null;
  if (state.leaders[campOrId]) return state.leaders[campOrId];
  return Object.values(state.leaders).find(x => x && x.id === campOrId) || null;
}
function trialSummary(state, trialId = 'day7_fire_trial_v1') {
  const cfg = loadTrialConfig(trialId);
  const enemies = cfg.enemyDefs.map(d => getUnit(state, d.id)).filter(Boolean);
  const killed = enemies.filter(u => !u.alive || u.hp <= 0).map(u => u.name);
  return {
    id: 'day7_fire_trial',
    trialId,
    title: '第7天火核心试炼',
    dataDriven: true,
    generalized: true,
    dataSource: `${TABLES.trialUnits} + ${TABLES.trialActions}`,
    playerTeam: cfg.playerDefs.map(d => d.name),
    enemyArea: '右上4×4：第1-4行、第5-8列',
    enemyHeroPosition: '第1行第8列',
    objective: '1金3银第一回合解决2个黄金复制体；4黄金第一回合应能解决3个。',
    round1Kills: killed,
    round1KillCount: killed.length,
    passedRound1Standard: killed.includes('骑士蜂黄金复制体') && killed.includes('精灵龙黄金复制体') && killed.length >= 2,
    remainingEnemies: enemies.filter(u => u.alive && u.hp > 0).map(u => ({ name: u.name, hp: u.hp, shield: u.shield, position: posText(u.position) }))
  };
}

function setupTrial(state, trialId = 'day7_fire_trial_v1') {
  const cfg = loadTrialConfig(trialId);
  state.phase = 'player_turn';
  state.day = 7;
  state.period = '上午';
  state.round = 1;
  state.maxRounds = 10;
  state.result = null;
  state.units = [];
  state.inventory = [];
  state.board = createBoard();
  state.actionDirs = {};
  state.selected = { unitId: null, slotId: null, cell: null, direction: 'right' };
  state.leaders.player = Object.assign(state.leaders.player || {}, {
    id: 'day7_player_core', side: 'hero_leader', camp: 'player', name: '我方英雄', displayName: '我方英雄', hp: 80, maxHp: 80, atk: 0, def: 0, shield: 0, alive: true, position: { r: 7, c: 0 }, mechanics: ['move_free_field', 'fire_core_field']
  });
  const eh = cfg.enemyHeroDef || { id: 'day7_beast_examiner', name: '兽群统领', hp: 80, atk: 0, def: 0, shield: 0, position: { r: 0, c: 7 } };
  state.leaders.enemy = Object.assign(state.leaders.enemy || {}, {
    id: eh.id, side: 'boss', camp: 'enemy', name: eh.name, displayName: eh.name, hp: eh.hp, maxHp: eh.hp, atk: eh.atk, def: eh.def, shield: eh.shield, alive: true, position: clone(eh.position), mechanics: eh.mechanics || ['beast_trial_examiner']
  });
  const qualityLevel = { 青铜: 1, 白银: 2, 黄金: 3, 钻石: 4 };
  for (const def of cfg.playerDefs) {
    const u = makeTrialUnit(def);
    state.units.push(u);
    state.inventory.push({ petId: u.petId, count: 1, level: qualityLevel[u.quality] || 1, active: true, instanceId: u.id, slot: state.inventory.length + 1 });
  }
  for (const def of cfg.enemyDefs) state.units.push(makeTrialUnit(def));
  syncBoardUnits(state);
  state.day7Trial = { scenario: trialSummary(state, trialId), round1Executed: false, roundExecuted: {}, configSource: cfg.source, domains: cfg.domains.map(d => d['领域ID']), reactions: cfg.reactions.map(r => r['反应ID']) };
  pushEvent(state, 'TRIAL_SETUP', { text: `第7天火核心试炼已按通用表驱动初始化：读取${TABLES.trialUnits}与${TABLES.trialActions}，右上4×4占位，兽群统领固定第1行第8列。` });
  pushEvent(state, 'TRIAL_POSITIONS', { text: `本次表内测试站位：${cfg.enemyDefs.map(d => `${d.name}${posText(d.position)}`).join('，')}。` });
  pushEvent(state, 'TRIAL_RULE', { text: `领域来自11表；元素反应来自12表；回合行动来自16表，不再在代码里手写固定流程。` });
  return state.day7Trial.scenario;
}

function moveUnit(state, unitId, to, reason = '') {
  const unit = getUnit(state, unitId);
  if (!unit) throw new Error(`trial move missing unit ${unitId}`);
  const from = clone(unit.position);
  unit.position = clone(to);
  syncBoardUnits(state);
  pushEvent(state, 'MOVE_HERO', { unitId, from, to, text: `${unit.displayName || unit.name} 移动：${posText(from)}→${posText(to)}${reason ? `（${reason}）` : ''}。` });
}
function applyDamage(state, sourceId, targetId, amount, reason = '') {
  const source = getUnit(state, sourceId) || getLeader(state, sourceId);
  const target = getUnit(state, targetId) || getLeader(state, targetId);
  if (!target || !target.alive || amount <= 0) return 0;
  const raw = amount;
  const shieldFrom = target.shield || 0;
  const hpFrom = target.hp || 0;
  let left = raw;
  const shieldAbsorb = Math.min(shieldFrom, left);
  target.shield = shieldFrom - shieldAbsorb;
  left -= shieldAbsorb;
  const hpDamage = Math.min(target.hp, left);
  target.hp -= hpDamage;
  if (target.hp <= 0) { target.hp = 0; target.alive = false; }
  pushEvent(state, 'DAMAGE', { sourceId, targetId, raw, final: shieldAbsorb + hpDamage, shieldFrom, shieldTo: target.shield, hpFrom, hpTo: target.hp, text: `${source?.displayName || source?.name || '系统'} 对 ${target.displayName || target.name} 造成${raw}点${reason}伤害，盾${shieldFrom}→${target.shield}，HP${hpFrom}→${target.hp}。` });
  if (!target.alive) pushEvent(state, 'UNIT_DEAD', { unitId: target.id, name: target.name, text: `${target.displayName || target.name} HP${hpFrom}→0，死亡。` });
  syncBoardUnits(state);
  return shieldAbsorb + hpDamage;
}
function addElement(state, sourceId, posObj, element, layers, reason = '') {
  if (!element || layers <= 0 || !posObj) return 0;
  const cell = cellAt(state, posObj);
  ensureCellElements(cell);
  const before = cell.elements[element] || 0;
  cell.elements[element] = before + layers;
  cell.elementCamps[element] = 'player';
  pushEvent(state, 'APPLY_ELEMENT_CELL', { actorId: sourceId, r: posObj.r, c: posObj.c, element, layers, from: before, to: cell.elements[element], text: `${sourceId} 向${posText(posObj)}施加${element}${layers}层${reason ? `（${reason}）` : ''}，${element}${before}→${cell.elements[element]}。` });
  return cell.elements[element];
}
function consumeWaterCatalyst(state, posObj, element, baseLayers) {
  const cell = cellAt(state, posObj);
  ensureCellElements(cell);
  if ((cell.elements.水 || 0) > 0 && baseLayers > 0 && ['火', '水', '风'].includes(element)) {
    const beforeWater = cell.elements.水;
    cell.elements.水 -= 1;
    pushEvent(state, 'TRIAL_CATALYST', { r: posObj.r, c: posObj.c, text: `${posText(posObj)} 水汽催化触发：水${beforeWater}→${cell.elements.水}，本次${element}层+${baseLayers}翻倍为+${baseLayers * 2}。` });
    return baseLayers * 2;
  }
  return baseLayers;
}
function explodeIfEnemyOnFire(state, sourceId, posObj) {
  const cell = cellAt(state, posObj);
  ensureCellElements(cell);
  const layers = cell.elements.火 || 0;
  if (layers < 3) return false;
  const target = (state.units || []).find(u => u.side === 'enemy' && u.alive && u.position && u.position.r === posObj.r && u.position.c === posObj.c);
  if (!target) {
    pushEvent(state, 'TRIAL_FIRE_TRAP_READY', { r: posObj.r, c: posObj.c, layers, text: `${posText(posObj)} 火${layers}层，形成空格爆火陷阱，等待敌人进入、被推入或主动引爆。` });
    return false;
  }
  const dmg = fireDamage(layers);
  pushEvent(state, 'TRIAL_FIRE_EXPLODE', { r: posObj.r, c: posObj.c, layers, damage: dmg, targetId: target.id, text: `${posText(posObj)} 火${layers}层触发火脉爆心，火爆伤害=${Array.from({ length: layers }, (_, i) => layers - i).join('+')}=${dmg}。` });
  applyDamage(state, sourceId, target.id, dmg, `火${layers}层爆发`);
  const before = cell.elements.火;
  cell.elements.火 = 0;
  pushEvent(state, 'TRIAL_FIRE_CLEAR', { r: posObj.r, c: posObj.c, from: before, to: 0, text: `${posText(posObj)} 火${before}层→火0层。` });
  return true;
}
function transferFire(state, from, to, amount, sourceId) {
  if (!from || !to || amount <= 0) return 0;
  const fromCell = cellAt(state, from); const toCell = cellAt(state, to);
  ensureCellElements(fromCell); ensureCellElements(toCell);
  const moved = Math.min(amount, fromCell.elements.火 || 0);
  if (moved <= 0) return 0;
  const fromBefore = fromCell.elements.火;
  const toBefore = toCell.elements.火;
  fromCell.elements.火 -= moved;
  toCell.elements.火 += moved;
  toCell.elementCamps.火 = 'player';
  pushEvent(state, 'TRIAL_WIND_CONVERGE', { sourceId, from, to, moved, text: `风聚火/旋风收束：${posText(from)} 火${fromBefore}→${fromCell.elements.火}，${posText(to)} 火${toBefore}→${toCell.elements.火}。` });
  return moved;
}
function runChecks(state, sourceId, row, mainPos, secondaryPos) {
  const check = String(row['检查火爆行列'] || '');
  if (check.includes('主格') && mainPos) explodeIfEnemyOnFire(state, sourceId, mainPos);
  if (check.includes('副格') && secondaryPos) explodeIfEnemyOnFire(state, sourceId, secondaryPos);
}
function executeActionRow(state, row) {
  const type = row['动作类型'];
  const unitId = row['单位ID'];
  const unit = getUnit(state, unitId);
  const note = row['说明'] || type;
  if (type === 'move') {
    moveUnit(state, unitId, pos(row, '移动'), note);
    return;
  }
  if (type === 'restore_shield') {
    if (!unit) return;
    const before = unit.shield;
    unit.shield = unit.maxShield || unit.shield || 0;
    pushEvent(state, 'TRIAL_SHIELD_REGEN', { unitId, text: `${unit.displayName || unit.name} 回合末护盾重生：盾${before}→${unit.shield}。` });
    return;
  }
  if (type === 'add_element') {
    const p = pos(row, '目标');
    addElement(state, unitId, p, row['元素'], toNum(row['层数'], 0), note);
    return;
  }
  if (type !== 'attack') throw new Error(`unknown trial action type ${type}`);
  if (!unit) throw new Error(`trial attack missing unit ${unitId}`);
  pushEvent(state, 'TRIAL_ACTION', { text: note });
  if (yes(row['使用攻击力']) && row['目标单位ID']) applyDamage(state, unitId, row['目标单位ID'], unit.atk, '物理');
  const mainPos = pos(row, '目标');
  const secondaryPos = pos(row, '副目标');
  const element = row['元素'];
  let layers = toNum(row['层数'], 0);
  if (yes(row['应用水催化'])) layers = consumeWaterCatalyst(state, mainPos, element, layers);
  addElement(state, unitId, mainPos, element, layers, note);
  addElement(state, unitId, secondaryPos, row['副元素'], toNum(row['副层数'], 0), note);
  for (const idx of ['1', '2']) {
    const from = pos(row, `来源`); // not usable for indexed headers
  }
  const from1 = (() => { const r = toNum(row['来源行1'], null), c = toNum(row['来源列1'], null); return r === null || c === null ? null : { r: r - 1, c: c - 1 }; })();
  const from2 = (() => { const r = toNum(row['来源行2'], null), c = toNum(row['来源列2'], null); return r === null || c === null ? null : { r: r - 1, c: c - 1 }; })();
  transferFire(state, from1, mainPos, toNum(row['搬运层数1'], 0), unitId);
  transferFire(state, from2, mainPos, toNum(row['搬运层数2'], 0), unitId);
  runChecks(state, unitId, row, mainPos, secondaryPos);
}

function runTrialRound(state, trialId = 'day7_fire_trial_v1', round = 1) {
  const cfg = loadTrialConfig(trialId);
  if (!state.day7Trial || state.day7Trial.scenario?.trialId !== trialId) setupTrial(state, trialId);
  if (state.day7Trial.roundExecuted && state.day7Trial.roundExecuted[round]) return state.day7Trial.scenario;
  pushEvent(state, 'ROUND_START', { text: `第7天火核心试炼第${round}回合开始：按16_试炼回合行动计划.csv执行。` });
  const actions = cfg.actions.filter(a => toNum(a['回合'], 0) === round);
  pushEvent(state, 'TRIAL_DATA_DRIVEN', { text: `本回合读取${TABLES.trialActions}的${actions.length}条动作；没有在代码里硬写具体战斗步骤。` });
  for (const row of actions) executeActionRow(state, row);
  syncBoardUnits(state);
  state.day7Trial.roundExecuted = state.day7Trial.roundExecuted || {};
  state.day7Trial.roundExecuted[round] = true;
  if (round === 1) state.day7Trial.round1Executed = true;
  state.day7Trial.scenario = trialSummary(state, trialId);
  pushEvent(state, 'TRIAL_RESULT', { text: `第${round}回合验收：击杀${state.day7Trial.scenario.round1KillCount}个黄金复制体（${state.day7Trial.scenario.round1Kills.join('、')}），${state.day7Trial.scenario.passedRound1Standard ? '达成1金3银首回合解决2怪标准' : '未达标'}。` });
  return state.day7Trial.scenario;
}

module.exports = { loadTrialConfig, setupTrial, runTrialRound, trialSummary, fireDamage };
