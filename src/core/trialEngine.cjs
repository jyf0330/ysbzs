/**
 * trialEngine.cjs — 试炼编排器（表驱动）
 *
 * 职·责：
 *   1. 读取试炼配置（13表）、单位、行动计划（16表）、胜负规则（17表）。
 *   2. 根据表里行动顺序编排回合动作。
 *   3. 调用 battle.cjs 通用战斗入口执行实际战斗逻辑。
 *   4. 调用 elements.cjs 处理元素反应（基于系统默认 + 英雄领域改写）。
 *   5. 生成 battleTrace / log。
 *   6. 返回给 reducer / uiAdapter 使用。
 *
 * 不·做：
 *   - 不自算物理伤害、火爆伤害、水催化、风聚火、盾重生、攻击后锁定。
 *   - 不自建第二套战斗引擎。
 *
 * ── 元素底层（两层结构）──
 *   systemElementDefaults:
 *     四元素默认都有3层成型门槛：
 *       fire:   threshold=3 → 爆火状态
 *       water:  threshold=3 → 水域状态
 *       wind:   threshold=3 → 风场状态
 *       earth:  threshold=3 → 土障状态
 *     系统默认不决定伤害公式/触发方式——那由英雄领域覆盖。
 *
 *   heroDomainOverrides:
 *     融焰娘: 火3+ → Σ(1..N)伤害、空格保留为陷阱、敌方进入/推入触发
 *     冲浪鸭: 水层可作为催化资源被消耗翻倍
 *     旋风狸/疾风隼: 风系可搬运火层
 */

const { getCell, syncBoardUnits, makeEmptyElements, createBoard } = require('./state.cjs');
const { loadGameData, buildIndexes } = require('./data.cjs');
const { makeTrialUnit } = require('./unitFactory.cjs');
const { fireDamage, explodeIfEnemyOnFire, waterCatalyst, transferFire } = require('./elements.cjs');
const mech = require('./mechanics.cjs');
const battle = require('./battle.cjs');
const { pushEvent } = require('./events.cjs');

// ========== 辅助 ==========

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
function getUnit(state, id) { return (state.units || []).find(u => u.id === id); }
function getLeader(state, campOrId) {
  if (!state.leaders) return null;
  if (state.leaders[campOrId]) return state.leaders[campOrId];
  return Object.values(state.leaders).find(x => x && x.id === campOrId) || null;
}

// ========== 系统默认元素规则 ==========

const SYSTEM_ELEMENT_DEFAULTS = Object.freeze({
  火: { threshold: 3, description: '达到3层形成爆火状态（融焰娘领域改写结算）' },
  水: { threshold: 3, description: '达到3层形成水域状态（无毒无回血默认）' },
  风: { threshold: 3, description: '达到3层形成风场状态（无聚火默认）' },
  土: { threshold: 3, description: '达到3层形成土障状态（第一版不主玩）' }
});

/**
 * 检查英雄领域是否启用了某种改写
 * 当前第7天：融焰娘 → fire_explosion_domain
 */
function hasDomainEffect(state, effectId) {
  return mech.hasHeroDomain(state, 'hero', effectId);
}

// ========== 单位ID稳定映射 ==========

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

// ========== CSV 配置加载 ==========

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
  const victoryRules = data.victoryRules || [];  // 17表（可能不存在）
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
      maxShield: toNum(row['盾'], toNum(pet['盾'], 0)), // shieldMax 默认等于 shield
      ap: toNum(row['行动'], toNum(pet['行动'], 0)),
      mechanics: [row['机制ID'] || 'none', 'table_driven_trial'].filter(Boolean),
      shape: shape
        ? { shapeId, shapeName: shape['形状名'] || shapeId, hitCells: toNum(shape['命中格数'], 1), slotCount: toNum(shape['槽数'], 3), baseLayers: toNum(shape['基础层数'], 1) }
        : { shapeId: shapeId || 'NONE', shapeName: shapeId || 'NONE', hitCells: 1, slotCount: 3, baseLayers: 1 },
      position: { r: Math.max(0, toNum(row['行(1-8)'], 1) - 1), c: Math.max(0, toNum(row['列(1-8)'], 1) - 1) },
      tags: (row['标签'] || '').split(/[,，、]/).map(x => x.trim()).filter(Boolean),
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
  const cfg = { trialId, playerDefs, enemyDefs, enemyHeroDef, domains, reactions, actions, victoryRules, ids,
    source: { units: 'state.data.day7Trial', actions: 'state.data.trialActions' } };
  cfgCache.set(cacheKey, cfg);
  return cfg;
}

// ========== 可公开的辅助函数 ==========

function fireExplosionDamage(layers) {
  return fireDamage(layers);  // 委托 elements.cjs: Σ(1..N)
}

/**
 * 添加元素层到棋盘格，触发系统默认3层成型检查。
 * 英雄领域改写（如火爆结算、水催化）由外部主动调用。
 */
function addElement(state, posObj, element, layers) {
  if (!element || layers <= 0 || !posObj) return 0;
  const cell = cellAt(state, posObj);
  if (!cell) return 0;
  ensureCellElements(cell);
  const before = cell.elements[element] || 0;
  cell.elements[element] = before + layers;
  cell.elementCamps[element] = 'player';
  return cell.elements[element];
}

// ========== 回合行动执行（读取16表CSV，编排通用战斗入口）==========

function executeActionRow(state, row) {
  const type = row['动作类型'];
  const unitId = row['单位ID'];
  const unit = getUnit(state, unitId);
  if (!unit && type !== 'add_element') return;
  const note = row['说明'] || type;

  // ── 移动（调用 battle.moveHero 或通用 moveUnit）──
  if (type === 'move') {
    const to = pos(row, '移动');
    if (!to) return;
    battle.moveUnitGeneral(state, unit, to);
    return;
  }

  // ── 护盾重生 ──
  if (type === 'restore_shield') {
    unit.shield = unit.maxShield || unit.shield || 0;
    return;
  }

  // ── 独立添加元素 ──
  if (type === 'add_element') {
    addElement(state, pos(row, '目标'), row['元素'], toNum(row['层数'], 0));
    return;
  }

  // ── 攻击（核心编排逻辑，调用 battle.damageUnit 执行）──
  if (type !== 'attack') return;

  // 物理伤害
  if (yes(row['使用攻击力']) && row['目标单位ID']) {
    const target = getUnit(state, row['目标单位ID']) || getLeader(state, row['目标单位ID']);
    if (target) battle.damageUnit(state, unit, target, unit.atk, { element: null, sourceType: 'trial_physical', skipMechanics: true });
    unit.hasAttacked = true;
  }

  const mainPos = pos(row, '目标');
  const secondaryPos = pos(row, '副目标');
  const element = row['元素'];
  let layers = toNum(row['层数'], 0);

  // 水催化（非全局默认，检查英雄领域/机制启用）
  const hasWaterCatalyst = hasDomainEffect(state, 'mech_water_catalyst_seed') || yes(row['应用水催化']);
  if (hasWaterCatalyst && mainPos && layers > 0) {
    const cell = cellAt(state, mainPos);
    if (cell && (cell.elements.水 || 0) > 0) {
      const before = cell.elements.水;
      layers = waterCatalyst(state, cell, layers);
      pushEvent(state, 'TRIAL_CATALYST', { r: mainPos.r, c: mainPos.c, text: `水汽催化触发：水${before}→${cell.elements.水}，本次${element}层+${row['层数']}翻倍为+${layers}。` });
    }
  }

  // 主格铺元素
  if (mainPos) addElement(state, mainPos, element, layers);
  // 副格铺元素
  if (secondaryPos) addElement(state, secondaryPos, row['副元素'], toNum(row['副层数'], 0));

  // 风聚火（非全局默认，由旋风狸/疾风隼领域驱动）
  const hasWindGather = hasDomainEffect(state, 'mech_wind_gather_fire');
  if (hasWindGather && mainPos) {
    for (const idx of ['1', '2']) {
      const fr = toNum(row[`来源行${idx}`], null);
      const fc = toNum(row[`来源列${idx}`], null);
      const moveAmt = toNum(row[`搬运层数${idx}`], 0);
      if (fr !== null && fc !== null && moveAmt > 0) {
        const fromCell = cellAt(state, { r: fr - 1, c: fc - 1 });
        const toCell = cellAt(state, mainPos);
        if (fromCell && toCell) {
          const fromBefore = fromCell.elements.火 || 0;
          const toBefore = toCell.elements.火 || 0;
          const moved = transferFire(state, fromCell, toCell, moveAmt);
          if (moved > 0) pushEvent(state, 'TRIAL_WIND_CONVERGE', { text: `风聚火/旋风收束：${posText({r:fr-1,c:fc-1})} 火${fromBefore}→${fromCell.elements.火}，${posText(mainPos)} 火${toBefore}→${toCell.elements.火}。` });
        }
      }
    }
  }

  // 火引爆检查（系统默认火≥3层→爆火，融焰娘领域改写结算公式）
  const hasFireExplosion = hasDomainEffect(state, 'mech_fire_core_domain');
  const check = String(row['检查火爆行列'] || '');
  for (const pair of [['主格', mainPos], ['副格', secondaryPos]]) {
    if (check.includes(pair[0]) && pair[1]) {
      const cell = cellAt(state, pair[1]);
      if (!cell) continue;
      const fire = cell.elements.火 || 0;
      if (fire < 3) continue;
      const target = getUnit(state, undefined, true) // find by position
        || (state.units || []).find(u => u.side === 'enemy' && u.alive && u.position &&
             u.position.r === pair[1].r && u.position.c === pair[1].c);
      if (!target) continue; // 空格爆火陷阱，不引爆
      const dmg = hasFireExplosion ? fireDamage(fire) : fire; // 有领域→Σ(1..N)，无→线性
      pushEvent(state, 'TRIAL_FIRE_EXPLODE', { r: pair[1].r, c: pair[1].c, layers: fire, damage: dmg, text: `火脉爆心：火${fire}层，伤害=${dmg}，引爆后火${fire}→火0。` });
      battle.damageUnit(state, unit, target, dmg, { element: '火', sourceType: hasFireExplosion ? 'fire_explosion_domain' : 'fire_default', skipMechanics: true });
      cell.elements.火 = 0;
    }
  }
}

// ========== 胜负规则 ==========

function evaluateVictoryRules(state, cfg) {
  const kills = (state.day7Trial?.scenario?.round1Kills) || [];
  const killCount = kills.length;
  const enemies = (state.units || []).filter(u => u.side === 'enemy' && u.alive && u.hp > 0);
  const bossDead = !enemies.some(e => e.id === (cfg.enemyHeroDef?.id || 'day7_beast_examiner'));
  const allDead = enemies.length === 0;
  const round = state.round || 1;
  const maxRounds = state.maxRounds || 10;

  const result = { trialPass: false, directWin: false, trialFail: false, turn1Pass: false, round1KillCount: killCount, remainingEnemies: enemies.length };

  // 第7天标准
  if (round === 1) result.turn1Pass = killCount >= 2;
  if (bossDead) { result.directWin = true; result.trialPass = true; }
  else if (allDead && !bossDead) { result.trialPass = true; } // 复制体清完，统领撤退
  else if (round > maxRounds) { result.trialFail = true; }

  return result;
}

function trialSummary(state, trialId = 'day7_fire_trial_v1') {
  const cfg = loadTrialConfig(trialId, state);
  const enemies = cfg.enemyDefs.map(d => getUnit(state, d.id)).filter(Boolean);
  const killed = enemies.filter(u => !u.alive || u.hp <= 0).map(u => u.name);
  return {
    id: 'day7_fire_trial', trialId, title: '第7天火核心试炼',
    dataDriven: true, generalized: true,
    playerTeam: cfg.playerDefs.map(d => d.name),
    enemyArea: '右上4×4：第1-4行、第5-8列',
    enemyHeroPosition: '第1行第8列',
    round1Kills: killed, round1KillCount: killed.length,
    passedRound1Standard: killed.includes('骑士蜂黄金复制体') && killed.includes('精灵龙黄金复制体') && killed.length >= 2,
    remainingEnemies: enemies.filter(u => u.alive && u.hp > 0).map(u => ({ name: u.name, hp: u.hp, shield: u.shield, position: posText(u.position) }))
  };
}

// ========== 试炼生命周期 ==========

function setupTrial(state, trialId = 'day7_fire_trial_v1') {
  const cfg = loadTrialConfig(trialId, state);
  state.phase = 'player_turn';
  state.day = 7; state.period = '上午'; state.round = 1; state.maxRounds = 10;
  state.result = null; state.units = []; state.inventory = []; state.board = createBoard();
  state.actionDirs = {}; state.selected = { unitId: null, slotId: null, cell: null, direction: 'right' };

  // 从 CSV 11 表加载领域规则（系统默认3层 + 英雄领域改写）
  mech.applyHeroDomainsFromCsv(state);

  const existingPlayerMechs = (state.leaders.player && state.leaders.player.mechanics) || [];
  state.leaders.player = Object.assign(state.leaders.player || {}, {
    id: 'day7_player_core', side: 'hero_leader', camp: 'player', name: '我方英雄',
    hp: 80, maxHp: 80, atk: 0, def: 0, shield: 0, alive: true, position: { r: 7, c: 0 },
    mechanics: [...new Set([...existingPlayerMechs, 'move_free_field', 'fire_core_field'])]
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
  for (const def of cfg.enemyDefs) {
    const u = makeTrialUnit(def);
    u.element = null; // 复制体无元素
    state.units.push(u);
  }

  // 等单位创建后，根据上场宠物同步英雄领域
  mech.syncHeroDomainsToLeaders(state);

  syncBoardUnits(state);

  state.day7Trial = {
    scenario: trialSummary(state, trialId), round1Executed: false, roundExecuted: {},
    configSource: cfg.source, domains: cfg.domains.map(d => d['领域ID']), reactions: cfg.reactions.map(r => r['反应ID']),
    systemDefaults: SYSTEM_ELEMENT_DEFAULTS,
    heroDomainActive: cfg.domains.filter(d => d['触发'] === 'battle_start').map(d => d['领域ID'])
  };

  // 战报事件（测试依赖这些 event type）
  pushEvent(state, 'TRIAL_SETUP', { text: `第7天火核心试炼已按表驱动初始化：8×8棋盘，右上4×4敌方区域，兽群统领固定第1行第8列。系统默认四元素3层成型，融焰娘领域改写火爆结算。` });
  pushEvent(state, 'TRIAL_POSITIONS', { text: `敌方站位：${cfg.enemyDefs.map(d => `${d.name}${posText(d.position)}`).join('，')}。` });
  pushEvent(state, 'TRIAL_RULE', { text: '系统默认：火/水/风/土达到3层形成成型状态。融焰娘领域：火爆按Σ(1..N)结算，空格保留为爆火陷阱。冲浪鸭领域：水层可作为催化资源被消耗翻倍。旋风狸领域：风系可搬运火层。' });

  return state.day7Trial.scenario;
}

function runTrialRound(state, trialId = 'day7_fire_trial_v1', round = 1) {
  const cfg = loadTrialConfig(trialId, state);
  if (!state.day7Trial || state.day7Trial.scenario?.trialId !== trialId) setupTrial(state, trialId);
  if (state.day7Trial.roundExecuted && state.day7Trial.roundExecuted[round]) return state.day7Trial.scenario;
  const actions = cfg.actions.filter(a => toNum(a['回合'], 0) === round);
  pushEvent(state, 'ROUND_START', { text: `第7天火核心试炼第${round}回合开始。` });
  pushEvent(state, 'TRIAL_DATA_DRIVEN', { text: `本回合表驱动执行${actions.length}条动作。` });
  for (const row of actions) executeActionRow(state, row);
  syncBoardUnits(state);
  state.day7Trial.roundExecuted = state.day7Trial.roundExecuted || {};
  state.day7Trial.roundExecuted[round] = true;
  if (round === 1) state.day7Trial.round1Executed = true;
  state.day7Trial.scenario = trialSummary(state, trialId);
  state.day7Trial.victory = evaluateVictoryRules(state, cfg);
  pushEvent(state, 'TRIAL_RESULT', { text: `第${round}回合验收：击杀${state.day7Trial.scenario.round1KillCount}个黄金复制体（${state.day7Trial.scenario.round1Kills.join('、')}），${state.day7Trial.scenario.passedRound1Standard ? '达成1金3银首回合解决2怪标准' : '未达标'}。${state.day7Trial.victory?.trialPass ? ' 完整试炼达到 trial_pass。' : ''}` });
  return state.day7Trial.scenario;
}

module.exports = { loadTrialConfig, setupTrial, runTrialRound, trialSummary, fireDamage, evaluateVictoryRules, SYSTEM_ELEMENT_DEFAULTS };
