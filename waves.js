/**
 * 元素背包史 · 出怪/波次模块
 * 负责：波次配置、怪物生成、出生点分配、硬编码教学波
 * 依赖：data.js（DAY_WAVE_CONFIG/MONSTER_TYPES）、board.js（monAt/heroAt/hasElementAt）
 */

function buildWaveForDay(day, phase) {
  const cfg = DAY_WAVE_CONFIG[day]?.[phase];
  if (!cfg) { G.monsters = []; return []; }
  let budget = cfg.budget;
  const allowed = cfg.allowed;
  const spawnSize = cfg.spawnSize;
  const maxAlive = cfg.maxAlive;
  const pool = [];
  allowed.forEach(typeId => {
    const mt = MONSTER_TYPES[typeId];
    if (mt) pool.push({ ...mt, typeId });
  });
  if (pool.length === 0) { G.monsters = []; return []; }
  pool.sort((a, b) => a.cost - b.cost);
  const result = [];
  let attempts = 0;
  while (budget > 0 && result.length < maxAlive && attempts < 200) {
    const affordable = pool.filter(mt => mt.cost <= budget);
    if (affordable.length === 0) break;
    const pick = affordable[rngInt(0, affordable.length)];
    result.push({
      typeId: pick.typeId,
      name: pick.name,
      hp: pick.hp, maxHp: pick.hp,
      atk: pick.atk, ap: pick.ap,
      cost: pick.cost, gold: pick.gold,
      pos: null, dead: false, el: null,
      ability: pick.ability || null,
    });
    budget -= pick.cost;
    attempts++;
  }
  const forcedBoss = day === 10 && phase === 'afternoon' ? 'boss10'
    : day >= 7 && phase === 'afternoon' ? 'boss8'
    : day === 5 && phase === 'afternoon' ? 'boss5'
    : null;
  if (forcedBoss && !result.some(m => m.typeId === forcedBoss)) {
    const boss = MONSTER_TYPES[forcedBoss];
    if (boss) {
      result.push({
        typeId: forcedBoss,
        name: boss.name, hp: boss.hp, maxHp: boss.hp,
        atk: boss.atk, ap: boss.ap, cost: boss.cost, gold: boss.gold,
        pos: null, dead: false, el: null,
        ability: boss.ability || null,
      });
    }
  }
  return { monsters: result, remnant: budget, maxAlive, spawnSize };
}

function getSpawnCells(spawnSize) {
  const size = spawnSize || 3;
  const cells = [];
  for (let r = 0; r < size; r++) for (let c = 8 - size; c < 8; c++) cells.push({ r, c });
  return cells;
}

function spawnWaveForDay(day, phase) {
  // 硬编码教学波
  if (day === 1 && phase === 'morning') {
    const monsters = [
      { id: 'tut_m1', name: '教学怪1', hp: 6, maxHp: 6, atk: 1, dead: false, el: null, gold: 1 },
      { id: 'tut_m2', name: '教学怪2', hp: 10, maxHp: 10, atk: 1, dead: false, el: null, gold: 1 },
    ];
    assignSpawnPositions(monsters, 3);
    G.monsters = monsters;
    glog('⚔️ 第1天早上：2只教学怪物（右上）');
    return;
  }
  if (day === 3 && phase === 'morning') {
    const monsters = [
      { id: 'd3_elite', name: '铁甲队长', typeId: 'elite', hp: 24, maxHp: 24, atk: 3, ap: 3, dead: false, el: null, gold: 8 },
      { id: 'd3_a', name: '小怪A', typeId: 'normal', hp: 4, maxHp: 4, atk: 1, ap: 5, dead: false, el: null, gold: 2 },
      { id: 'd3_b', name: '小怪B', typeId: 'normal', hp: 4, maxHp: 4, atk: 1, ap: 5, dead: false, el: null, gold: 2 },
    ];
    assignSpawnPositions(monsters, 3);
    G.monsters = monsters;
    glog('⚔️ 第3天早上：精英教学波（铁甲队长+小怪）');
    return;
  }
  // 优先用 Pal 敌人波次（来自 encounter_config）
  var palWave = buildPalWaveForDay(day, phase);
  if (palWave && palWave.monsters && palWave.monsters.length > 0) {
    // 强制 Boss 兼容：旧系统 boss5/boss8/boss10
    var forcedBoss = day === 10 && phase === 'afternoon' ? 'boss10'
      : day >= 7 && phase === 'afternoon' ? 'boss8'
      : day === 5 && phase === 'afternoon' ? 'boss5'
      : null;
    if (forcedBoss && !palWave.monsters.some(function(m) { return m.typeId === forcedBoss; })) {
      var boss = MONSTER_TYPES[forcedBoss];
      if (boss) {
        palWave.monsters.push({
          id: 'forced_boss_' + day + '_' + phase,
          typeId: forcedBoss,
          name: boss.name, hp: boss.hp, maxHp: boss.hp,
          atk: boss.atk, ap: boss.ap, cost: boss.cost, gold: boss.gold,
          pos: null, dead: false, el: null, slots: [],
          ability: boss.ability || null,
        });
      }
    }
    assignSpawnPositions(palWave.monsters, palWave.spawnSize);
    G.monsters = palWave.monsters;
    glog('⚔️ 第' + day + '天' + (phase === 'morning' ? '早上' : '下午') + '：' + G.monsters.length + '只帕鲁怪物出击！');; if (typeof triggerRelicHooks === 'function') triggerRelicHooks('on_battle_start', {});
    return;
  }
  // fallback: 旧抽象怪物系统
  const wavePlan = buildWaveForDay(day, phase);
  if (!wavePlan || !wavePlan.monsters) {
    G.monsters = [];
    return;
  }
  assignSpawnPositions(wavePlan.monsters, wavePlan.spawnSize);
  G.monsters = wavePlan.monsters.map((m, i) => ({ id: `d${day}_${phase}_${i}`, ...m }));
  glog(`⚔️ 第${day}天${phase === 'morning' ? '早上' : '下午'}：${G.monsters.length}只怪物出击！`);; if (typeof triggerRelicHooks === 'function') triggerRelicHooks('on_battle_start', {});
}

/**
 * encounter_config 缺失天数（Day6/8/9）的派生出战配置
 */
function buildFallbackPalWaveConfig(day) {
  var fallbacks = {
    6: { castle_enemy_pool: 'silver_gold_pal_pool', enemy_count: 4, enemy_hp_mul: 1.28, enemy_atk_mul: 1.15, reward_gold: 5 },
    8: { castle_enemy_pool: 'gold_diamond_pal_pool', enemy_count: 5, enemy_hp_mul: 1.42, enemy_atk_mul: 1.28, reward_gold: 7 },
    9: { castle_enemy_pool: 'gold_diamond_pal_pool', enemy_count: 5, enemy_hp_mul: 1.48, enemy_atk_mul: 1.32, reward_gold: 7 },
  };
  var cfg = fallbacks[day];
  if (!cfg) return null;
  glog('⚙️ 第' + day + '天：Pal 波次由派生配置生成（encounter_config 无此天）');
  return cfg;
}

/**
 * 从 encounter_config + Pal 池生成 Pal 敌人波次
 */
function buildPalWaveForDay(day, phase) {
  var encWaves = (typeof getExternalEncounterWaves === 'function') ? getExternalEncounterWaves() : null;
  var enemyPools = (typeof getExternalEnemyPools === 'function') ? getExternalEnemyPools() : null;
  var createUnit = (typeof createPalUnitInstance === 'function') ? createPalUnitInstance : null;

  if (!enemyPools || !createUnit) return null;

  // 找匹配天数的 encounter_wave，没有则用派生配置
  var waveCfg = null;
  if (encWaves) {
    for (var wi = 0; wi < encWaves.length; wi++) {
      if (encWaves[wi].day === day) { waveCfg = encWaves[wi]; break; }
    }
  }
  if (!waveCfg) {
    waveCfg = buildFallbackPalWaveConfig(day);
  }
  if (!waveCfg) return null;

  var poolName = waveCfg.castle_enemy_pool;
  var poolIds = enemyPools[poolName] || [];
  if (poolIds.length === 0) return null;

  var count = waveCfg.enemy_count || 3;
  var hpMul = waveCfg.enemy_hp_mul || 1;
  var atkMul = waveCfg.enemy_atk_mul || 1;
  var reward = waveCfg.reward_gold || 2;

  var result = [];
  for (var ei = 0; ei < count; ei++) {
    var uid = poolIds[rngInt(0, poolIds.length)];
    if (!uid) continue;
    var palUnit = createUnit({ unitId: uid, faction: 'enemy', hpMul: hpMul, atkMul: atkMul });
    if (!palUnit) continue;
    result.push({
      id: 'pal_enemy_' + day + '_' + phase + '_' + ei,
      typeId: 'pal',
      unitId: uid,
      name: palUnit.name,
      hp: palUnit.hp, maxHp: palUnit.maxHp,
      atk: palUnit.atk, ap: 4,
      cost: palUnit.cost || 2, gold: reward,
      pos: null, dead: false, el: palUnit.element || null,
      size: palUnit.size || 'medium',
      quality: palUnit.quality || '青铜',
      slots: palUnit.slots || [],
      ability: null,
    });
  }
  return { monsters: result, spawnSize: count > 4 ? 4 : count };
}

function assignSpawnPositions(monsters, spawnSize) {
  const spawnCells = getSpawnCells(spawnSize);
  const freeCells = spawnCells.filter(sc => !monAt(sc) && !heroAt(sc) && !hasElementAt(sc));
  for (let i = 0; i < monsters.length; i++) {
    if (i < freeCells.length) {
      monsters[i].pos = freeCells[i];
    } else {
      monsters[i].pos = spawnCells[0] || { r: 0, c: 7 };
    }
  }
}
