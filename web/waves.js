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
  const wavePlan = buildWaveForDay(day, phase);
  if (!wavePlan || !wavePlan.monsters) {
    G.monsters = [];
    return;
  }
  assignSpawnPositions(wavePlan.monsters, wavePlan.spawnSize);
  G.monsters = wavePlan.monsters.map((m, i) => ({ id: `d${day}_${phase}_${i}`, ...m }));
  glog(`⚔️ 第${day}天${phase === 'morning' ? '早上' : '下午'}：${G.monsters.length}只怪物出击！`);
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
