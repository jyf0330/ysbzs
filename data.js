/**
 * 元素背包史 · 数据层
 * 包含：元素常量、形状定义、单位定义、怪物类型、商店配置、波次配置
 * 依赖：无（纯数据，无函数依赖）
 */

// ========== 元素常量 ==========
const EL = {fire:'火',water:'水',wind:'风',earth:'土'};
const EL_ORDER = ['fire','water','wind','earth'];
const ELEMS = ['fire','water','wind','earth'];
const EC = {fire:'#d4855e',water:'#5e95b5',wind:'#6ea86c',earth:'#b8844a'};
const EB = {fire:'#fae8df',water:'#e3eff7',wind:'#e8f3e5',earth:'#f5ede0'};
const ADV = {water:'fire',fire:'wind',wind:'earth',earth:'water'};
const ELICON = {fire:'🔥',water:'💧',wind:'🌬',earth:'🪨'};
const ELNAME = {fire:'火',water:'水',wind:'风',earth:'土'};
const EL_CLASS = {火:'b-el-f',水:'b-el-w',风:'b-el-i',土:'b-el-e'};
const TIER_MULT = [0,1,2,4,8];
const MAX_STK = 6;

// ========== 形状定义 ==========
// cells = [row_offset, col_offset] relative to hero, default "right"
const SD = {
  1: {cells:[[0,1]],            name:'1格点',    n:1, cat:'line'},
  2: {cells:[[0,1],[0,2]],      name:'2格短线',  n:2, cat:'line'},
  3: {cells:[[0,1],[0,2],[0,3]],name:'3格直线',  n:3, cat:'line'},
  4: {cells:[[0,1],[1,1]],      name:'3格拐角',  n:3, cat:'l_shape'},
  5: {cells:[[0,1],[0,2],[0,3],[0,4]],         name:'4格直线',  n:4, cat:'line'},
  6: {cells:[[0,1],[0,2],[1,1],[1,2]],         name:'2×2方块',  n:4, cat:'square'},
  7: {cells:[[0,1],[0,2],[0,3],[1,2]],         name:'T形4格',   n:4, cat:'t_shape'},
  8: {cells:[[0,1],[1,1],[2,1],[2,2]],         name:'L形4格',   n:4, cat:'l_shape'},
  9: {cells:[[0,1],[0,2],[1,2],[1,3]],         name:'Z形4格',   n:4, cat:'zs_shape'},
 10: {cells:[[0,1],[0,2],[0,3],[0,4],[0,5]],  name:'5格直线',  n:5, cat:'line'},
 11: {cells:[[0,1],[0,2],[0,3],[1,1],[2,1]],  name:'长L形5格', n:5, cat:'l_shape'},
 12: {cells:[[-1,1],[0,1],[1,1],[0,2],[0,0]], name:'十字5格',  n:5, cat:'cross'},
 13: {cells:[[0,1],[0,2],[0,3],[1,2],[2,2]],  name:'T形5格',   n:5, cat:'t_shape'},
 14: {cells:[[0,1],[0,2],[1,1],[1,2],[2,1]],  name:'紧凑5格',  n:5, cat:'square'},
 15: {cells:[[0,1],[0,2],[1,1],[2,1],[2,2]],  name:'凹槽5格',  n:5, cat:'notch'},
 16: {cells:[[0,1],[0,2],[1,2],[1,3],[2,3]],  name:'阶梯5格',  n:5, cat:'stair'},
 17: {cells:[[-1,1],[0,1],[1,1],[0,2],[0,3]], name:'分叉5格',  n:5, cat:'branch'},
 18: {cells:[[0,1],[0,3],[-1,1],[-1,2],[-1,3]],name:'U形5格', n:5, cat:'notch'},
 19: {cells:[[0,1],[0,2],[0,3],[0,4],[0,5],[0,6]],name:'6格直线',n:6, cat:'line'},
 20: {cells:[[0,1],[0,2],[0,3],[1,1],[1,2],[1,3]],name:'2×3矩形',n:6, cat:'square'},
};

const SHAPE_BIG_CROSS = 12;
const TUTORIAL_DEFAULT_SLOT_SN = SHAPE_BIG_CROSS;

// ========== 单位定义 ==========
const UNIT_DEFS = {
  // --- Tier 1 ---
  fire_starter: {
    id:'fire_starter', name:'火苗灵', element:'fire', grade:'青铜', priceTier:1, tags:['火','前排','单点','输出'], tier:1, cost:2,
    levels: {
      1:{ hp:20, slots:[
        {el:'fire',sn:1,dir:'right',tier:1},{el:'fire',sn:2,dir:'right',tier:1},{el:'fire',sn:3,dir:'right',tier:1}
      ]},
      2:{ hp:25, slots:[
        {el:'fire',sn:2,dir:'right',tier:2},{el:'fire',sn:2,dir:'right',tier:2},{el:'fire',sn:3,dir:'right',tier:2}
      ]},
      3:{ hp:30, slots:[
        {el:'fire',sn:2,dir:'right',tier:3},{el:'fire',sn:3,dir:'right',tier:3},{el:'fire',sn:5,dir:'right',tier:3}
      ]}
    }
  },
  water_droplet: {
    id:'water_droplet', name:'滴滴灵', element:'water', grade:'青铜', priceTier:1, tags:['水','后排','远程','输出'], tier:1, cost:2,
    levels: {
      1:{ hp:20, slots:[
        {el:'water',sn:1,dir:'right',tier:1},{el:'water',sn:4,dir:'right',tier:1},{el:'water',sn:12,dir:'right',tier:1}
      ]},
      2:{ hp:25, slots:[
        {el:'water',sn:1,dir:'right',tier:2},{el:'water',sn:6,dir:'right',tier:2},{el:'water',sn:12,dir:'right',tier:2}
      ]},
      3:{ hp:30, slots:[
        {el:'water',sn:3,dir:'right',tier:3},{el:'water',sn:6,dir:'right',tier:3},{el:'water',sn:12,dir:'right',tier:3}
      ]}
    }
  },
  wind_breeze: {
    id:'wind_breeze', name:'十字使', element:'wind', grade:'青铜', priceTier:1, tags:['风','范围','十字'], tier:1, cost:3,
    levels: {
      1:{ hp:20, slots:[
        {el:'wind',sn:12,dir:'right',tier:1},{el:'wind',sn:12,dir:'right',tier:1},{el:'wind',sn:12,dir:'right',tier:1}
      ]},
      2:{ hp:25, slots:[
        {el:'wind',sn:3,dir:'right',tier:2},{el:'wind',sn:7,dir:'right',tier:2},{el:'wind',sn:10,dir:'right',tier:2}
      ]},
      3:{ hp:30, slots:[
        {el:'wind',sn:5,dir:'right',tier:3},{el:'wind',sn:7,dir:'right',tier:3},{el:'wind',sn:10,dir:'right',tier:3}
      ]}
    }
  },
  earth_shield: {
    id:'earth_shield', name:'岩岩灵', element:'earth', grade:'青铜', priceTier:3, tags:['土','前排','防御'], tier:1, cost:3,
    levels: {
      1:{ hp:25, slots:[
        {el:'earth',sn:4,dir:'right',tier:1},{el:'earth',sn:6,dir:'right',tier:1},{el:'earth',sn:8,dir:'right',tier:1}
      ]},
      2:{ hp:30, slots:[
        {el:'earth',sn:4,dir:'right',tier:2},{el:'earth',sn:6,dir:'right',tier:2},{el:'earth',sn:11,dir:'right',tier:2}
      ]},
      3:{ hp:35, slots:[
        {el:'earth',sn:6,dir:'right',tier:3},{el:'earth',sn:11,dir:'right',tier:3},{el:'earth',sn:18,dir:'right',tier:3}
      ]}
    }
  },
  balance: {
    id:'balance', name:'均衡灵', element:'fire', grade:'青铜', priceTier:1, tags:['火','水','风','灵活'], tier:1, cost:3,
    levels: {
      1:{ hp:20, slots:[
        {el:'fire',sn:1,dir:'right',tier:1},{el:'water',sn:1,dir:'right',tier:1},{el:'wind',sn:4,dir:'right',tier:1}
      ]},
      2:{ hp:25, slots:[
        {el:'fire',sn:2,dir:'right',tier:2},{el:'water',sn:2,dir:'right',tier:2},{el:'wind',sn:4,dir:'right',tier:2}
      ]},
      3:{ hp:30, slots:[
        {el:'fire',sn:3,dir:'right',tier:3},{el:'water',sn:3,dir:'right',tier:3},{el:'wind',sn:7,dir:'right',tier:3}
      ]}
    }
  },
  ember: {
    id:'ember', name:'余烬灵', element:'fire', grade:'青铜', priceTier:1, tags:['火','输出'], tier:1, cost:2,
    levels: {
      1:{ hp:20, slots:[
        {el:'fire',sn:2,dir:'right',tier:1},{el:'fire',sn:1,dir:'right',tier:1},{el:'fire',sn:12,dir:'right',tier:1}
      ]},
      2:{ hp:23, slots:[
        {el:'fire',sn:3,dir:'right',tier:2},{el:'fire',sn:2,dir:'right',tier:2},{el:'fire',sn:12,dir:'right',tier:2}
      ]},
      3:{ hp:28, slots:[
        {el:'fire',sn:5,dir:'right',tier:3},{el:'fire',sn:3,dir:'right',tier:3},{el:'fire',sn:12,dir:'right',tier:3}
      ]}
    }
  },
  pebble_guard: {
    id:'pebble_guard', name:'泡泡灵', element:'water', grade:'青铜', priceTier:1, tags:['水','前排','防御'], tier:1, cost:2,
    levels: {
      1:{ hp:22, slots:[
        {el:'water',sn:4,dir:'right',tier:1},{el:'water',sn:6,dir:'right',tier:1},{el:'water',sn:8,dir:'right',tier:1}
      ]},
      2:{ hp:28, slots:[
        {el:'water',sn:4,dir:'right',tier:2},{el:'water',sn:6,dir:'right',tier:2},{el:'water',sn:11,dir:'right',tier:2}
      ]},
      3:{ hp:34, slots:[
        {el:'water',sn:6,dir:'right',tier:3},{el:'water',sn:11,dir:'right',tier:3},{el:'water',sn:18,dir:'right',tier:3}
      ]}
    }
  },
  // --- Tier 2 ---
  fire_blaze: {
    id:'fire_blaze', name:'烈焰使', element:'fire', tier:2, cost:3,
    levels: {
      1:{ hp:22, slots:[
        {el:'fire',sn:3,dir:'right',tier:2},{el:'fire',sn:12,dir:'right',tier:2},{el:'fire',sn:17,dir:'right',tier:2}
      ]},
      2:{ hp:28, slots:[
        {el:'fire',sn:5,dir:'right',tier:3},{el:'fire',sn:12,dir:'right',tier:3},{el:'fire',sn:17,dir:'right',tier:3}
      ]},
      3:{ hp:35, slots:[
        {el:'fire',sn:10,dir:'right',tier:4},{el:'fire',sn:12,dir:'right',tier:4},{el:'fire',sn:17,dir:'right',tier:4}
      ]}
    }
  },
  water_splash: {
    id:'water_splash', name:'溅射灵', element:'water', tier:2, cost:3,
    levels: {
      1:{ hp:22, slots:[
        {el:'water',sn:7,dir:'right',tier:2},{el:'water',sn:12,dir:'right',tier:2},{el:'water',sn:13,dir:'right',tier:2}
      ]},
      2:{ hp:28, slots:[
        {el:'water',sn:7,dir:'right',tier:3},{el:'water',sn:12,dir:'right',tier:3},{el:'water',sn:13,dir:'right',tier:3}
      ]},
      3:{ hp:35, slots:[
        {el:'water',sn:10,dir:'right',tier:4},{el:'water',sn:12,dir:'right',tier:4},{el:'water',sn:13,dir:'right',tier:4}
      ]}
    }
  },
  wind_gale: {
    id:'wind_gale', name:'狂风使', element:'wind', tier:2, cost:3,
    levels: {
      1:{ hp:22, slots:[
        {el:'wind',sn:5,dir:'right',tier:2},{el:'wind',sn:12,dir:'right',tier:2},{el:'wind',sn:17,dir:'right',tier:2}
      ]},
      2:{ hp:28, slots:[
        {el:'wind',sn:10,dir:'right',tier:3},{el:'wind',sn:12,dir:'right',tier:3},{el:'wind',sn:17,dir:'right',tier:3}
      ]},
      3:{ hp:35, slots:[
        {el:'wind',sn:10,dir:'right',tier:4},{el:'wind',sn:12,dir:'right',tier:4},{el:'wind',sn:19,dir:'right',tier:4}
      ]}
    }
  },
  earth_rock: {
    id:'earth_rock', name:'磐石灵', element:'earth', tier:2, cost:3,
    levels: {
      1:{ hp:28, slots:[
        {el:'earth',sn:6,dir:'right',tier:2},{el:'earth',sn:11,dir:'right',tier:2},{el:'earth',sn:18,dir:'right',tier:2}
      ]},
      2:{ hp:35, slots:[
        {el:'earth',sn:6,dir:'right',tier:3},{el:'earth',sn:11,dir:'right',tier:3},{el:'earth',sn:18,dir:'right',tier:3}
      ]},
      3:{ hp:42, slots:[
        {el:'earth',sn:6,dir:'right',tier:4},{el:'earth',sn:11,dir:'right',tier:4},{el:'earth',sn:18,dir:'right',tier:4}
      ]}
    }
  },
  // --- 召唤引擎单位 ---
  sprout_summoner: {
    id:'sprout_summoner', name:'召芽灵', element:'water', grade:'白银', tier:2, cost:4,
    tags:['水','召唤','核心'],
    passive:{type:'splitSproutSummon'},
    levels: {
      1:{ hp:18, slots:[
        {el:'water',sn:1,dir:'right',tier:2,special:'summonFromCell'},
        {el:'water',sn:4,dir:'right',tier:2},{el:'water',sn:12,dir:'right',tier:2}
      ]},
      2:{ hp:22, slots:[
        {el:'water',sn:1,dir:'right',tier:3,special:'summonFromCell'},
        {el:'water',sn:6,dir:'right',tier:3},{el:'water',sn:12,dir:'right',tier:3}
      ]},
      3:{ hp:28, slots:[
        {el:'water',sn:1,dir:'right',tier:4,special:'summonFromCell'},
        {el:'water',sn:6,dir:'right',tier:4},{el:'water',sn:12,dir:'right',tier:4}
      ]}
    }
  },
  spring_sprite: {
    id:'spring_sprite', name:'泉泉灵', element:'water', grade:'白银', tier:2, cost:4,
    tags:['水','治疗','引擎'],
    passive:{type:'healSummons'},
    levels: {
      1:{ hp:20, slots:[
        {el:'water',sn:4,dir:'right',tier:2},{el:'water',sn:6,dir:'right',tier:2},
        {el:'water',sn:1,dir:'right',tier:2,special:'healSummons'}
      ]},
      2:{ hp:25, slots:[
        {el:'water',sn:6,dir:'right',tier:3},{el:'water',sn:11,dir:'right',tier:3},
        {el:'water',sn:1,dir:'right',tier:3,special:'healSummons'}
      ]},
      3:{ hp:30, slots:[
        {el:'water',sn:6,dir:'right',tier:4},{el:'water',sn:11,dir:'right',tier:4},
        {el:'water',sn:1,dir:'right',tier:4,special:'healSummons'}
      ]}
    }
  },
  fluff_speaker: {
    id:'fluff_speaker', name:'绒语灵', element:'water', grade:'白银', tier:2, cost:4,
    tags:['水','被动','增益'],
    passive:{type:'buffAllSummons'},
    levels: {
      1:{ hp:20, slots:[
        {el:'water',sn:4,dir:'right',tier:2},{el:'water',sn:6,dir:'right',tier:2},
        {el:'water',sn:1,dir:'right',tier:2,special:'healSummons'}
      ]},
      2:{ hp:25, slots:[
        {el:'water',sn:6,dir:'right',tier:3},{el:'water',sn:11,dir:'right',tier:3},
        {el:'water',sn:1,dir:'right',tier:3,special:'healSummons'}
      ]},
      3:{ hp:30, slots:[
        {el:'water',sn:6,dir:'right',tier:4},{el:'water',sn:11,dir:'right',tier:4},
        {el:'water',sn:1,dir:'right',tier:4,special:'healSummons'}
      ]}
    }
  },
  split_sprite: {
    id:'split_sprite', name:'分分灵', element:'water', grade:'白银', tier:2, cost:4,
    tags:['水','拆分','被动'],
    passive:{type:'splitSproutSummon'},
    levels: {
      1:{ hp:20, slots:[
        {el:'water',sn:4,dir:'right',tier:2},{el:'water',sn:6,dir:'right',tier:2},{el:'water',sn:8,dir:'right',tier:2}
      ]},
      2:{ hp:25, slots:[
        {el:'water',sn:4,dir:'right',tier:3},{el:'water',sn:6,dir:'right',tier:3},{el:'water',sn:11,dir:'right',tier:3}
      ]},
      3:{ hp:30, slots:[
        {el:'water',sn:6,dir:'right',tier:4},{el:'water',sn:11,dir:'right',tier:4},{el:'water',sn:18,dir:'right',tier:4}
      ]}
    }
  },
  boom_sprite: {
    id:'boom_sprite', name:'爆爆灵', element:'fire', grade:'白银', tier:2, cost:4,
    tags:['火','死亡','铺火'],
    passive:{type:'onSummonDeath'},
    levels: {
      1:{ hp:20, slots:[
        {el:'fire',sn:3,dir:'right',tier:2},{el:'fire',sn:12,dir:'right',tier:2},{el:'fire',sn:17,dir:'right',tier:2}
      ]},
      2:{ hp:25, slots:[
        {el:'fire',sn:5,dir:'right',tier:3},{el:'fire',sn:12,dir:'right',tier:3},{el:'fire',sn:17,dir:'right',tier:3}
      ]},
      3:{ hp:30, slots:[
        {el:'fire',sn:10,dir:'right',tier:4},{el:'fire',sn:12,dir:'right',tier:4},{el:'fire',sn:17,dir:'right',tier:4}
      ]}
    }
  },
  bubble_sprite: {
    id:'bubble_sprite', name:'泡泡灵', element:'water', grade:'青铜', tier:1, cost:2,
    tags:['水','前排','防御'],
    levels: {
      1:{ hp:22, slots:[
        {el:'water',sn:4,dir:'right',tier:1},{el:'water',sn:6,dir:'right',tier:1},{el:'water',sn:8,dir:'right',tier:1}
      ]},
      2:{ hp:28, slots:[
        {el:'water',sn:4,dir:'right',tier:2},{el:'water',sn:6,dir:'right',tier:2},{el:'water',sn:11,dir:'right',tier:2}
      ]},
      3:{ hp:34, slots:[
        {el:'water',sn:6,dir:'right',tier:3},{el:'water',sn:11,dir:'right',tier:3},{el:'water',sn:18,dir:'right',tier:3}
      ]}
    }
  },
  ember_seed: {
    id:'ember_seed', name:'火种灵', element:'fire', grade:'青铜', tier:1, cost:2,
    tags:['火','引信','被动'],
    levels: {
      1:{ hp:20, slots:[
        {el:'fire',sn:2,dir:'right',tier:1},{el:'fire',sn:3,dir:'right',tier:1},{el:'fire',sn:12,dir:'right',tier:1}
      ]},
      2:{ hp:25, slots:[
        {el:'fire',sn:3,dir:'right',tier:2},{el:'fire',sn:5,dir:'right',tier:2},{el:'fire',sn:12,dir:'right',tier:2}
      ]},
      3:{ hp:30, slots:[
        {el:'fire',sn:5,dir:'right',tier:3},{el:'fire',sn:10,dir:'right',tier:3},{el:'fire',sn:12,dir:'right',tier:3}
      ]}
    }
  },
  // --- Tier 3 ---
  forge_fire: {
    id:'forge_fire', name:'熔火灵', element:'fire', tier:3, cost:6,
    levels: {
      1:{ hp:28, slots:[
        {el:'fire',sn:5,dir:'right',tier:3},{el:'fire',sn:12,dir:'right',tier:3},{el:'fire',sn:17,dir:'right',tier:3}
      ]},
      2:{ hp:35, slots:[
        {el:'fire',sn:10,dir:'right',tier:4},{el:'fire',sn:12,dir:'right',tier:4},{el:'fire',sn:19,dir:'right',tier:4}
      ]},
      3:{ hp:42, slots:[
        {el:'fire',sn:10,dir:'right',tier:4},{el:'fire',sn:12,dir:'right',tier:4},{el:'fire',sn:19,dir:'right',tier:4}
      ]}
    }
  },
  command_sprout: {
    id:'command_sprout', name:'指挥芽', element:'water', tier:3, cost:6,
    tags:['水','召唤','指挥'],
    levels: {
      1:{ hp:24, slots:[
        {el:'water',sn:1,dir:'right',tier:3,special:'summonFromCell'},
        {el:'water',sn:6,dir:'right',tier:3},{el:'water',sn:12,dir:'right',tier:3}
      ]},
      2:{ hp:30, slots:[
        {el:'water',sn:1,dir:'right',tier:4,special:'summonFromCell'},
        {el:'water',sn:6,dir:'right',tier:4},{el:'water',sn:12,dir:'right',tier:4}
      ]},
      3:{ hp:36, slots:[
        {el:'water',sn:1,dir:'right',tier:4,special:'summonFromCell'},
        {el:'water',sn:6,dir:'right',tier:4},{el:'water',sn:12,dir:'right',tier:4}
      ]}
    }
  },
  // --- Tier 4 ---
  dragon_flame: {
    id:'dragon_flame', name:'龙焰灵', element:'fire', tier:4, cost:8,
    levels: {
      1:{ hp:35, slots:[
        {el:'fire',sn:10,dir:'right',tier:4},{el:'fire',sn:12,dir:'right',tier:4},{el:'fire',sn:19,dir:'right',tier:4}
      ]},
      2:{ hp:42, slots:[
        {el:'fire',sn:10,dir:'right',tier:4},{el:'fire',sn:12,dir:'right',tier:4},{el:'fire',sn:19,dir:'right',tier:4}
      ]},
      3:{ hp:50, slots:[
        {el:'fire',sn:10,dir:'right',tier:4},{el:'fire',sn:12,dir:'right',tier:4},{el:'fire',sn:19,dir:'right',tier:4}
      ]}
    }
  },
  prime_sprout: {
    id:'prime_sprout', name:'元芽灵', element:'water', tier:4, cost:8,
    tags:['水','召唤','终极'],
    levels: {
      1:{ hp:30, slots:[
        {el:'water',sn:1,dir:'right',tier:4,special:'summonFromCell'},
        {el:'water',sn:6,dir:'right',tier:4},{el:'water',sn:12,dir:'right',tier:4}
      ]},
      2:{ hp:38, slots:[
        {el:'water',sn:1,dir:'right',tier:4,special:'summonFromCell'},
        {el:'water',sn:6,dir:'right',tier:4},{el:'water',sn:12,dir:'right',tier:4}
      ]},
      3:{ hp:46, slots:[
        {el:'water',sn:1,dir:'right',tier:4,special:'summonFromCell'},
        {el:'water',sn:6,dir:'right',tier:4},{el:'water',sn:12,dir:'right',tier:4}
      ]}
    }
  },
};

// ========== 单位 Tier 池 ==========
const UNIT_TIER_POOL = {1:[],2:[],3:[],4:[]};
Object.values(UNIT_DEFS).forEach(u=>{ UNIT_TIER_POOL[u.tier].push(u.id); });

// ========== 怪物类型配置 ==========
const MONSTER_TYPES = {
  normal:  { name:'普通怪', hp:8,  atk:1, ap:5, cost:2, gold:2 },
  thick:   { name:'厚皮怪', hp:14, atk:1, ap:4, cost:3, gold:3 },
  fast:    { name:'快速怪', hp:7,  atk:1, ap:7, cost:3, gold:3 },
  heavy:   { name:'冲锋怪', hp:14, atk:2, ap:3, cost:4, gold:4 },
  swarm:   { name:'小怪群', hp:4,  atk:1, ap:4, cost:1, gold:1 },
  elite:   { name:'精英怪', hp:40, atk:4, ap:5, cost:8, gold:8 },
  boss:    { name:'小Boss',hp:65, atk:5, ap:4, cost:12,gold:15},
  blocker: { name:'堵路怪', hp:30, atk:1, ap:3, cost:4, gold:4, ability:{id:'block_path',trigger:'onMoveIntent',status:'pending'} },
  siege:   { name:'攻城怪', hp:20, atk:3, ap:5, cost:4, gold:4, ability:{id:'target_castle',trigger:'onChooseTarget',status:'pending'} },
  boss5:   { name:'炎甲兽', hp:80, atk:6, ap:4, cost:12,gold:15,ability:{id:'iron_wall',trigger:'onBeforeTakeDamage',status:'pending',config:{threshold:5,reduction:2}} },
  minion:  { name:'Boss护卫',hp:24, atk:2, ap:4, cost:5, gold:5, ability:{id:'guard_aura',trigger:'onChooseTarget',status:'pending'} },
  boss8:   { name:'熔岩核心',hp:100,atk:6, ap:5, cost:14,gold:20,ability:{id:'lava_surge',trigger:'onRoundStart',status:'pending',config:{el:'fire',layers:1}} },
  boss10:  { name:'远古炎核',hp:140,atk:8, ap:5, cost:18,gold:25,ability:{id:'core_split',trigger:'onEveryNthRound',status:'pending',config:{n:2,typeId:'normal'}} },
};

// ========== 每日波次配置 ==========
const DAY_WAVE_CONFIG = {
  1: {
    morning:   { budget:5,  allowed:['normal'], spawnSize:2, maxAlive:5 },
    afternoon: { budget:6,  allowed:['normal'], spawnSize:2, maxAlive:5 },
  },
  2: {
    morning:   { budget:9,  allowed:['normal','thick'], spawnSize:2, maxAlive:6 },
    afternoon: { budget:10, allowed:['normal','thick'], spawnSize:2, maxAlive:6 },
  },
  3: {
    morning:   { budget:13, allowed:['normal','thick','fast','heavy'], spawnSize:3, maxAlive:8 },
    afternoon: { budget:15, allowed:['normal','thick','fast','heavy'], spawnSize:3, maxAlive:8 },
  },
  4: {
    morning:   { budget:18, allowed:['normal','thick','fast','heavy','elite'], spawnSize:3, maxAlive:10 },
    afternoon: { budget:20, allowed:['normal','thick','fast','heavy','elite'], spawnSize:3, maxAlive:10 },
  },
  5: {
    morning:   { budget:24, allowed:['normal','thick','fast','heavy','elite','boss'], spawnSize:3, maxAlive:12 },
    afternoon: { budget:28, allowed:['normal','thick','fast','heavy','elite','boss5','siege'], spawnSize:3, maxAlive:12 },
  },
  6: {
    morning:   { budget:30, allowed:['elite','swarm','normal','blocker','thick'], spawnSize:3, maxAlive:12 },
    afternoon: { budget:34, allowed:['siege','fast','elite','heavy','blocker'], spawnSize:3, maxAlive:12 },
  },
  7: {
    morning:   { budget:38, allowed:['elite','siege','blocker','heavy','swarm'], spawnSize:3, maxAlive:14 },
    afternoon: { budget:42, allowed:['boss8','elite','siege','fast'], spawnSize:3, maxAlive:14 },
  },
  8: {
    morning:   { budget:46, allowed:['elite','blocker','siege','thick'], spawnSize:3, maxAlive:14 },
    afternoon: { budget:50, allowed:['boss8','elite','fast','swarm','heavy','siege'], spawnSize:3, maxAlive:14 },
  },
  9: {
    morning:   { budget:54, allowed:['elite','siege','fast','boss8','blocker'], spawnSize:3, maxAlive:15 },
    afternoon: { budget:58, allowed:['boss8','elite','siege','heavy','minion'], spawnSize:3, maxAlive:15 },
  },
  10: {
    morning:   { budget:52, allowed:['minion','elite','siege','swarm'], spawnSize:3, maxAlive:15 },
    afternoon: { budget:65, allowed:['boss10','minion','siege','elite'], spawnSize:3, maxAlive:15 },
  },
};

// ========== 商店价格配置 ==========
const SHOP_PRICE_CONFIG = {
  unitPrice: { tier1:3, tier2:6 },
  consumableBase: {
    el_random: 3,
    el_specific: 5,
    slot_layers_up: 4,
    roll: 2,
    freeze: 0,
  },
  shopSlots: {
    1: { unitT1:5, unitT2:0, unitT3:0, unitT4:0, consumable:0 },
    2: { unitT1:5, unitT2:0, unitT3:0, unitT4:0, consumable:0 },
    3: { unitT1:4, unitT2:1, unitT3:0, unitT4:0, consumable:0 },
    4: { unitT1:3, unitT2:2, unitT3:0, unitT4:0, consumable:0 },
    5: { unitT1:2, unitT2:2, unitT3:1, unitT4:0, consumable:0 },
    6: { unitT1:1, unitT2:3, unitT3:1, unitT4:0, consumable:0 },
    7: { unitT1:1, unitT2:2, unitT3:1, unitT4:1, consumable:0 },
    8: { unitT1:0, unitT2:2, unitT3:2, unitT4:1, consumable:0 },
    9: { unitT1:0, unitT2:1, unitT3:2, unitT4:2, consumable:0 },
    10:{ unitT1:0, unitT2:1, unitT3:2, unitT4:2, consumable:0 },
  },
  nightIncome: { 1:3, 2:4, 3:5, 4:6, 5:7, 6:7, 7:8, 8:8, 9:9, 10:0 },
  interestStep: 8,
  interestMax: 2,
};

// ========== 每日回合配置 ==========
const DAY_ROUND_CONFIG = {
  1:{morning:2,afternoon:2},
  2:{morning:2,afternoon:3},
  3:{morning:3,afternoon:3},
  4:{morning:3,afternoon:4},
  5:{morning:3,afternoon:4},
  6:{morning:4,afternoon:4},
  7:{morning:4,afternoon:4},
  8:{morning:4,afternoon:5},
  9:{morning:5,afternoon:5},
  10:{morning:5,afternoon:5},
};

// ========== 奖励节点配置 ==========
const REWARD_NODE_CONFIG = {
  3:{midday:{stalls:1,tier:2,guarantee:['fluff_speaker','spring_sprite']}},
  4:{midday:{stalls:1,tier:3,guarantee:['forge_fire']},elite:{tier:3,cost:6}},
  5:{midday:{stalls:2,tier:3,guarantee:['forge_fire','command_sprout']},boss:{tier:3,cost:3,guarantee:['forge_fire']}},
  6:{boss:{tier:4,cost:0,free:true,guarantee:['dragon_flame','prime_sprout']}},
  7:{special:{id:'legend_chest',tier:4,cost:8,guarantee:['dragon_flame','prime_sprout']},boss:{tier:4,cost:4}},
  8:{special:{id:'element_spring',freeRefresh:1}},
  9:{midday:{stalls:2,tier:4,guarantee:['dragon_flame','prime_sprout']},boss:{tier:4,cost:4}},
  10:{midday:{stalls:5,tier:4,guarantee:['dragon_flame','prime_sprout']}},
};

// ========== 价格计算 ==========
const GRADE_BASE = {青铜:3,白银:5,黄金:7,钻石:10};
function calcUnitPrice(def){ return GRADE_BASE[def.grade] || def.cost || 2; }

// ========== 商店池 ==========
const SHOP_POOLS = {
  day1_midday:['fire_starter','water_droplet','wind_breeze','pebble_guard'],
  day1_night:['fire_starter','water_droplet','wind_breeze','pebble_guard','bubble_sprite'],
  day2_midday:['fire_starter','water_droplet','wind_breeze','pebble_guard','ember_seed'],
  day2_night:['fire_starter','water_droplet','wind_breeze','pebble_guard','bubble_sprite'],
  day3_midday:['fire_starter','water_droplet','wind_breeze','pebble_guard','ember_seed'],
  day3_night:['sprout_summoner','fire_starter','water_droplet','wind_breeze','pebble_guard'],
  day4_midday:['spring_sprite','fire_starter','water_droplet','wind_breeze','pebble_guard'],
  day4_night:['fluff_speaker','sprout_summoner','spring_sprite','pebble_guard','boom_sprite'],
  day5_midday:['boom_sprite','split_sprite','fluff_speaker','spring_sprite','sprout_summoner'],
  day5_night:['boom_sprite','split_sprite','fluff_speaker','spring_sprite','ember_seed','forge_fire','command_sprout'],
  day6_midday:['fluff_speaker','spring_sprite','boom_sprite','split_sprite','forge_fire','command_sprout'],
  day6_night:['fluff_speaker','spring_sprite','boom_sprite','split_sprite','forge_fire','command_sprout'],
  day7_midday:['boom_sprite','split_sprite','forge_fire','command_sprout','dragon_flame','prime_sprout'],
  day7_night:['boom_sprite','split_sprite','forge_fire','command_sprout','dragon_flame','prime_sprout'],
  day8_midday:['fluff_speaker','spring_sprite','forge_fire','command_sprout','dragon_flame','prime_sprout'],
  day8_night:['fluff_speaker','spring_sprite','forge_fire','command_sprout','dragon_flame','prime_sprout'],
  day9_midday:['forge_fire','command_sprout','dragon_flame','prime_sprout','boom_sprite','split_sprite'],
  day9_night:['forge_fire','command_sprout','dragon_flame','prime_sprout','boom_sprite','split_sprite'],
  day10_midday:['forge_fire','command_sprout','dragon_flame','prime_sprout','fluff_speaker','spring_sprite'],
  day10_night:['forge_fire','command_sprout','dragon_flame','prime_sprout','fluff_speaker','spring_sprite'],
};
