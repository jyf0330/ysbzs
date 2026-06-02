
// ========== CONSTANTS ==========
const EL = {fire:'火',water:'水',wind:'风',earth:'土'};
const EC = {fire:'#d4855e',water:'#5e95b5',wind:'#6ea86c',earth:'#b8844a'};
const EB = {fire:'#fae8df',water:'#e3eff7',wind:'#e8f3e5',earth:'#f5ede0'};
const ADV = {water:'fire',fire:'wind',wind:'earth',earth:'water'};
const TIER_MULT = [0,1,2,4,8];
const MAX_STK = 6;

// Shape definitions: cells = [row_offset, col_offset] relative to hero, default "right"
const SD = {
  1: {cells:[[0,1]],            name:'1格点',    n:1, cat:'line'},
  2: {cells:[[0,1],[0,2]],      name:'2格短线',  n:2, cat:'line'},
  3: {cells:[[0,1],[0,2],[0,3]],name:'3格直线',  n:3, cat:'line'},
  4: {cells:[[0,1],[1,1]],      name:'3格拐角',  n:3, cat:'l_shape'}, // shape: column then down
  5: {cells:[[0,1],[0,2],[0,3],[0,4]],         name:'4格直线',  n:4, cat:'line'},
  6: {cells:[[0,1],[0,2],[1,1],[1,2]],         name:'2×2方块',  n:4, cat:'square'},
  7: {cells:[[0,1],[0,2],[0,3],[1,2]],         name:'T形4格',   n:4, cat:'t_shape'},
  8: {cells:[[0,1],[1,1],[2,1],[2,2]],         name:'L形4格',   n:4, cat:'l_shape'},
  9: {cells:[[0,1],[0,2],[1,2],[1,3]],         name:'Z形4格',   n:4, cat:'zs_shape'},
 10: {cells:[[0,1],[0,2],[0,3],[0,4],[0,5]],  name:'5格直线',  n:5, cat:'line'},
 11: {cells:[[0,1],[0,2],[0,3],[1,1],[2,1]],  name:'长L形5格', n:5, cat:'l_shape'},
 12: {cells:[[-1,1],[0,1],[1,1],[0,2],[0,0]], name:'十字5格',  n:5, cat:'cross'}, // 教程默认：大十字攻击方块
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

// ========== UNIT DEFINITIONS ==========
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
  water_torrent: {
    id:'water_torrent', name:'洪流使', element:'water', tier:2, cost:4,
    levels: {
      1:{ hp:22, slots:[
        {el:'water',sn:6,dir:'right',tier:2},{el:'water',sn:13,dir:'right',tier:2},{el:'water',sn:19,dir:'right',tier:2}
      ]},
      2:{ hp:28, slots:[
        {el:'water',sn:6,dir:'right',tier:3},{el:'water',sn:13,dir:'right',tier:3},{el:'water',sn:19,dir:'right',tier:3}
      ]},
      3:{ hp:35, slots:[
        {el:'water',sn:6,dir:'right',tier:4},{el:'water',sn:13,dir:'right',tier:4},{el:'water',sn:19,dir:'right',tier:4}
      ]}
    }
  },
  wind_storm: {
    id:'wind_storm', name:'飓风使', element:'wind', tier:2, cost:3,
    levels: {
      1:{ hp:20, slots:[
        {el:'wind',sn:10,dir:'right',tier:2},{el:'wind',sn:16,dir:'right',tier:2},{el:'wind',sn:15,dir:'right',tier:2}
      ]},
      2:{ hp:25, slots:[
        {el:'wind',sn:10,dir:'right',tier:3},{el:'wind',sn:16,dir:'right',tier:3},{el:'wind',sn:15,dir:'right',tier:3}
      ]},
      3:{ hp:30, slots:[
        {el:'wind',sn:10,dir:'right',tier:4},{el:'wind',sn:16,dir:'right',tier:4},{el:'wind',sn:15,dir:'right',tier:4}
      ]}
    }
  },
  earth_mountain: {
    id:'earth_mountain', name:'山岭使', element:'earth', tier:2, cost:4,
    levels: {
      1:{ hp:28, slots:[
        {el:'earth',sn:8,dir:'right',tier:2},{el:'earth',sn:11,dir:'right',tier:2},{el:'earth',sn:18,dir:'right',tier:2}
      ]},
      2:{ hp:35, slots:[
        {el:'earth',sn:8,dir:'right',tier:3},{el:'earth',sn:11,dir:'right',tier:3},{el:'earth',sn:18,dir:'right',tier:3}
      ]},
      3:{ hp:42, slots:[
        {el:'earth',sn:8,dir:'right',tier:4},{el:'earth',sn:11,dir:'right',tier:4},{el:'earth',sn:18,dir:'right',tier:4}
      ]}
    }
  },
  // 设计文档专属英雄
  fire_mouse: {
    id:'fire_mouse', name:'🔥火苗鼠', element:'fire', tier:1, cost:2,
    levels: {
      1:{ hp:20, slots:[
        {el:'fire',sn:1,dir:'right',tier:1},
        {el:'fire',sn:1,dir:'right',tier:1},
        {el:'fire',sn:9,dir:'right',tier:1,centerBonus:1}, // T1中心+2F
      ]},
      2:{ hp:28, slots:[
        {el:'fire',sn:1,dir:'right',tier:2,layers:2},
        {el:'fire',sn:1,dir:'right',tier:2,conditional:{el:'fire',bonus:1}},
        {el:'fire',sn:9,dir:'right',tier:2,centerBonus:1},
      ]},
      3:{ hp:35, slots:[
        {el:'fire',sn:1,dir:'right',tier:3,layers:2},
        {el:'fire',sn:1,dir:'right',tier:3,layers:2,conditional:{el:'fire',bonus:1}},
        {el:'fire',sn:11,dir:'right',tier:3,centerBonus:2}, // 宽头T中心+3F
      ]}
    }
  },
  firecracker: {
    id:'firecracker', name:'🧨爆竹匠', element:'fire', tier:1, cost:3,
    levels: {
      1:{ hp:20, slots:[
        {el:'fire',sn:1,dir:'right',tier:1},
        {el:'fire',sn:1,dir:'right',tier:1,conditional:{el:'fire',bonus:1}},
        {el:'fire',sn:9,dir:'right',tier:1,centerBonus:1},
      ]},
      2:{ hp:25, slots:[
        {el:'fire',sn:1,dir:'right',tier:2,layers:2},
        {el:'fire',sn:1,dir:'right',tier:2,conditional:{el:'fire',bonus:2}},
        {el:'fire',sn:11,dir:'right',tier:2,centerBonus:2},
      ]},
      3:{ hp:32, slots:[
        {el:'fire',sn:2,dir:'right',tier:3,layers:2},
        {el:'fire',sn:1,dir:'right',tier:3,layers:2,conditional:{el:'fire',bonus:2}},
        {el:'fire',sn:17,dir:'right',tier:3,centerBonus:3}, // 双层T中心+4F
      ]}
    }
  },
  // 水+召唤引擎原型单位
  sprout_summoner: {
    id:'sprout_summoner', name:'召芽灵', element:'water', grade:'青铜', priceTier:2, tags:['召唤','水','构筑核心'], tier:1, cost:3,
    levels: {
      1:{ hp:20, slots:[
        {skill:'summonFromCell', sn:1, dir:'right', tier:1, consumeLayers:true},
        {el:'water', sn:2, dir:'right', tier:1},
        {el:'water', sn:3, dir:'right', tier:1},
      ]},
      2:{ hp:28, slots:[
        {skill:'summonFromCell', sn:2, dir:'right', tier:2, consumeLayers:true, bonusHp:2},
        {el:'water', sn:2, dir:'right', tier:2},
        {el:'water', sn:3, dir:'right', tier:2},
      ]},
      3:{ hp:35, slots:[
        {skill:'summonFromCell', sn:3, dir:'right', tier:3, consumeLayers:true, count:2},
        {el:'water', sn:3, dir:'right', tier:3},
        {el:'water', sn:5, dir:'right', tier:3},
      ]}
    }
  },
  spring_sprite: {
    id:'spring_sprite', name:'泉泉灵', element:'water', grade:'青铜', priceTier:1, tags:['水','治疗','召唤'], tier:1, cost:2,
    passive:{type:'healAmpBonus',bonusByLevel:[1,1,2]},
    levels: {
      1:{ hp:18, slots:[
        {skill:'healSummons', sn:12, dir:'right', tier:1},
        {el:'water', sn:1, dir:'right', tier:1},
        {el:'water', sn:4, dir:'right', tier:1},
      ]},
      2:{ hp:24, slots:[
        {skill:'healSummons', sn:12, dir:'right', tier:2},
        {el:'water', sn:2, dir:'right', tier:2},
        {el:'water', sn:6, dir:'right', tier:2},
      ]},
      3:{ hp:30, slots:[
        {skill:'healSummons', sn:12, dir:'right', tier:3},
        {el:'water', sn:3, dir:'right', tier:3},
        {el:'water', sn:6, dir:'right', tier:3},
      ]}
    }
  },
  bubble_sprite: {
    id:'bubble_sprite', name:'泡泡灵', element:'water', grade:'青铜', priceTier:1, tags:['水','范围'], tier:1, cost:2,
    levels: {
      1:{ hp:20, slots:[
        {el:'water', sn:6, dir:'right', tier:1},
        {el:'water', sn:6, dir:'right', tier:1},
        {el:'water', sn:12, dir:'right', tier:1},
      ]},
      2:{ hp:25, slots:[
        {el:'water', sn:6, dir:'right', tier:2},
        {el:'water', sn:6, dir:'right', tier:2},
        {el:'water', sn:12, dir:'right', tier:2},
      ]},
      3:{ hp:30, slots:[
        {el:'water', sn:6, dir:'right', tier:3},
        {el:'water', sn:12, dir:'right', tier:3},
        {el:'water', sn:12, dir:'right', tier:3},
      ]}
    }
  },
  pebble_guard: {
    id:'pebble_guard', name:'岩岩灵', element:'earth', grade:'青铜', priceTier:2, tags:['土','前排','防御','挡路'], tier:1, cost:3,
    passive:{type:'castleReduce',reductionByLevel:[1,1,2]},
    levels: {
      1:{ hp:30, slots:[
        {el:'earth', sn:4, dir:'right', tier:1},
        {el:'earth', sn:6, dir:'right', tier:1},
        {el:'earth', sn:8, dir:'right', tier:1},
      ]},
      2:{ hp:45, slots:[
        {el:'earth', sn:4, dir:'right', tier:2},
        {el:'earth', sn:6, dir:'right', tier:2},
        {el:'earth', sn:11, dir:'right', tier:2},
      ]},
      3:{ hp:60, slots:[
        {el:'earth', sn:6, dir:'right', tier:3},
        {el:'earth', sn:11, dir:'right', tier:3},
        {el:'earth', sn:18, dir:'right', tier:3},
      ]}
    }
  },
  fluff_speaker: {
    id:'fluff_speaker', name:'绒语灵', element:'water', grade:'白银', priceTier:2, tags:['召唤','后排','辅助','增益'], tier:1, cost:4,
    passive:{type:'buffAllSummons',hpByLevel:[2,4,6],atkByLevel:[1,1,2]},
    levels: {
      1:{ hp:16, slots:[
        {skill:'healSummons', sn:12, dir:'right', tier:1},
        {el:'water', sn:1, dir:'right', tier:1},
        {el:'water', sn:4, dir:'right', tier:1},
      ]},
      2:{ hp:24, slots:[
        {skill:'healSummons', sn:12, dir:'right', tier:2},
        {el:'water', sn:2, dir:'right', tier:2},
        {el:'water', sn:6, dir:'right', tier:2},
      ]},
      3:{ hp:32, slots:[
        {skill:'healSummons', sn:12, dir:'right', tier:3},
        {el:'water', sn:3, dir:'right', tier:3},
        {el:'water', sn:6, dir:'right', tier:3},
      ]}
    }
  },
  boom_sprite: {
    id:'boom_sprite', name:'爆爆灵', element:'fire', grade:'白银', priceTier:2, tags:['召唤','死亡收益','火','铺元素'], tier:1, cost:4,
    passive:{type:'onSummonDeath',el:'fire',layersByLevel:[2,3,4]},
    levels: {
      1:{ hp:16, slots:[
        {el:'fire', sn:1, dir:'right', tier:1},
        {el:'fire', sn:2, dir:'right', tier:1},
        {el:'fire', sn:12, dir:'right', tier:1},
      ]},
      2:{ hp:24, slots:[
        {el:'fire', sn:2, dir:'right', tier:2},
        {el:'fire', sn:3, dir:'right', tier:2},
        {el:'fire', sn:12, dir:'right', tier:2},
      ]},
      3:{ hp:32, slots:[
        {el:'fire', sn:3, dir:'right', tier:3},
        {el:'fire', sn:5, dir:'right', tier:3},
        {el:'fire', sn:12, dir:'right', tier:3},
      ]}
    }
  },
  split_sprite: {
    id:'split_sprite', name:'分分灵', element:'water', grade:'白银', priceTier:2, tags:['召唤','中排','人海'], tier:1, cost:4,
    passive:{type:'splitSproutSummon',countByLevel:[2,2,3],hpMulByLevel:[0.5,0.75,0.6]},
    levels: {
      1:{ hp:18, slots:[
        {skill:'summonFromCell', sn:1, dir:'right', tier:1, consumeLayers:false, count:2},
        {el:'water', sn:1, dir:'right', tier:1},
        {el:'water', sn:2, dir:'right', tier:1},
      ]},
      2:{ hp:27, slots:[
        {skill:'summonFromCell', sn:2, dir:'right', tier:2, consumeLayers:false, count:2},
        {el:'water', sn:2, dir:'right', tier:2},
        {el:'water', sn:3, dir:'right', tier:2},
      ]},
      3:{ hp:36, slots:[
        {skill:'summonFromCell', sn:3, dir:'right', tier:3, consumeLayers:false, count:3},
        {el:'water', sn:3, dir:'right', tier:3},
        {el:'water', sn:5, dir:'right', tier:3},
      ]}
    }
  },
  ember_seed: {
    id:'ember_seed', name:'火种灵', element:'fire', grade:'青铜', priceTier:1, tags:['火','铺元素','前排'], tier:1, cost:2,
    passive:{type:'spaceExplosionBonus',bonusByLevel:[1,1,2]},
    levels: {
      1:{ hp:18, slots:[
        {el:'fire', sn:1, dir:'right', tier:1},
        {el:'fire', sn:2, dir:'right', tier:1},
        {el:'fire', sn:3, dir:'right', tier:1},
      ]},
      2:{ hp:27, slots:[
        {el:'fire', sn:2, dir:'right', tier:2},
        {el:'fire', sn:3, dir:'right', tier:2},
        {el:'fire', sn:5, dir:'right', tier:2},
      ]},
      3:{ hp:36, slots:[
        {el:'fire', sn:3, dir:'right', tier:3},
        {el:'fire', sn:5, dir:'right', tier:3},
        {el:'fire', sn:12, dir:'right', tier:3},
      ]}
    }
  },
  breeze_sprite: {
    id:'breeze_sprite', name:'风风灵', element:'wind', grade:'白银', priceTier:2, tags:['风','侧击','机动','清散怪'], tier:1, cost:4,
    passive:{type:'advHitBonus',bonusByLevel:[1,2,3]},
    levels: {
      1:{ hp:18, slots:[
        {el:'wind', sn:7, dir:'right', tier:1},
        {el:'wind', sn:7, dir:'right', tier:1},
        {el:'wind', sn:10, dir:'right', tier:1},
      ]},
      2:{ hp:27, slots:[
        {el:'wind', sn:7, dir:'right', tier:2},
        {el:'wind', sn:10, dir:'right', tier:2},
        {el:'wind', sn:12, dir:'right', tier:2},
      ]},
      3:{ hp:36, slots:[
        {el:'wind', sn:10, dir:'right', tier:3},
        {el:'wind', sn:12, dir:'right', tier:3},
        {el:'wind', sn:18, dir:'right', tier:3},
      ]}
    }
  },
  forge_fire: {
    id:'forge_fire', name:'锻火灵', element:'fire', grade:'黄金', priceTier:1, tags:['火','黄金','铺火','输出'], tier:3, cost:6,
    passive:{type:'addElementOnHit',el:'fire',layers:1},
    levels: {
      1:{ hp:34, slots:[
        {el:'fire',sn:5,dir:'right',tier:3},
        {el:'fire',sn:12,dir:'right',tier:3},
        {el:'fire',sn:17,dir:'right',tier:3},
      ]},
      2:{ hp:44, slots:[
        {el:'fire',sn:10,dir:'right',tier:4},
        {el:'fire',sn:12,dir:'right',tier:4},
        {el:'fire',sn:17,dir:'right',tier:4},
      ]},
      3:{ hp:56, slots:[
        {el:'fire',sn:19,dir:'right',tier:4},
        {el:'fire',sn:20,dir:'right',tier:4},
        {el:'fire',sn:12,dir:'right',tier:4},
      ]}
    }
  },
  command_sprout: {
    id:'command_sprout', name:'令芽灵', element:'water', grade:'黄金', priceTier:1, tags:['召唤','黄金','增益'], tier:3, cost:6,
    passive:{type:'buffAllSummons',hpByLevel:[2,4,6],atkByLevel:[1,2,3]},
    levels: {
      1:{ hp:30, slots:[
        {skill:'summonFromCell',sn:2,dir:'right',tier:3,consumeLayers:false,count:2,bonusHp:2},
        {skill:'healSummons',sn:12,dir:'right',tier:3},
        {el:'water',sn:6,dir:'right',tier:3},
      ]},
      2:{ hp:40, slots:[
        {skill:'summonFromCell',sn:3,dir:'right',tier:4,consumeLayers:false,count:2,bonusHp:4},
        {skill:'healSummons',sn:12,dir:'right',tier:4},
        {el:'water',sn:13,dir:'right',tier:4},
      ]},
      3:{ hp:52, slots:[
        {skill:'summonFromCell',sn:5,dir:'right',tier:4,consumeLayers:false,count:3,bonusHp:6},
        {skill:'healSummons',sn:12,dir:'right',tier:4},
        {el:'water',sn:19,dir:'right',tier:4},
      ]}
    }
  },
  dragon_flame: {
    id:'dragon_flame', name:'龙焰灵', element:'fire', grade:'钻石', priceTier:1, tags:['火','钻石','终局','引爆'], tier:4, cost:8,
    passive:{type:'spaceExplosionBonus',bonusByLevel:[2,3,4]},
    levels: {
      1:{ hp:42, slots:[
        {el:'fire',sn:10,dir:'right',tier:4},
        {el:'fire',sn:12,dir:'right',tier:4},
        {el:'fire',sn:19,dir:'right',tier:4},
      ]},
      2:{ hp:55, slots:[
        {el:'fire',sn:12,dir:'right',tier:4,layers:2},
        {el:'fire',sn:19,dir:'right',tier:4},
        {el:'fire',sn:20,dir:'right',tier:4},
      ]},
      3:{ hp:70, slots:[
        {el:'fire',sn:12,dir:'right',tier:4,layers:3},
        {el:'fire',sn:19,dir:'right',tier:4,layers:2},
        {el:'fire',sn:20,dir:'right',tier:4},
      ]}
    }
  },
  prime_sprout: {
    id:'prime_sprout', name:'主芽灵', element:'water', grade:'钻石', priceTier:1, tags:['召唤','钻石','终局'], tier:4, cost:8,
    passive:{type:'splitSproutSummon',countByLevel:[2,3,4],hpMulByLevel:[1,1,1]},
    levels: {
      1:{ hp:40, slots:[
        {skill:'summonFromCell',sn:3,dir:'right',tier:4,consumeLayers:false,count:2,bonusHp:4},
        {skill:'healSummons',sn:12,dir:'right',tier:4},
        {el:'water',sn:19,dir:'right',tier:4},
      ]},
      2:{ hp:52, slots:[
        {skill:'summonFromCell',sn:5,dir:'right',tier:4,consumeLayers:false,count:3,bonusHp:6},
        {skill:'healSummons',sn:12,dir:'right',tier:4},
        {el:'water',sn:20,dir:'right',tier:4},
      ]},
      3:{ hp:66, slots:[
        {skill:'summonFromCell',sn:12,dir:'right',tier:4,consumeLayers:false,count:4,bonusHp:8},
        {skill:'healSummons',sn:12,dir:'right',tier:4},
        {el:'water',sn:20,dir:'right',tier:4,layers:2},
      ]}
    }
  },
  fire_demon: {
    id:'fire_demon', name:'火魔', element:'fire', grade:'钻石', priceTier:1, tags:['火','钻石','终局','十字'], tier:4, cost:8,
    passive:{type:'crossExplosion',level:1},
    levels: {
      1:{ hp:45, slots:[
        {el:'fire',sn:10,dir:'right',tier:4},
        {el:'fire',sn:12,dir:'right',tier:4},
        {el:'fire',sn:19,dir:'right',tier:4},
      ]},
      2:{ hp:58, slots:[
        {el:'fire',sn:12,dir:'right',tier:4,layers:2},
        {el:'fire',sn:19,dir:'right',tier:4},
        {el:'fire',sn:20,dir:'right',tier:4},
      ]},
      3:{ hp:72, slots:[
        {el:'fire',sn:12,dir:'right',tier:4,layers:3},
        {el:'fire',sn:19,dir:'right',tier:4,layers:2},
        {el:'fire',sn:20,dir:'right',tier:4},
      ]}
    }
  },
};
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
// dayHalf: 'morning'=早上主波, 'afternoon'=下午加压波
// spawnSize: 出生区边长（正方形，右上角）
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
    el_random: 3,    // 随机元素强化
    el_specific: 5,  // 指定元素强化
    slot_layers_up: 4, // 行动槽层数+1
    roll: 2,         // 刷新商店
    freeze: 0,       // 锁定商店（免费）
  },
  // 每日商店格子构成
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
  // 每晚固定收入
  nightIncome: { 1:3, 2:4, 3:5, 4:6, 5:7, 6:7, 7:8, 8:8, 9:9, 10:0 },
  // 利息：每 interestStep 金币 +1，最高 interestMax
  interestStep: 8,
  interestMax: 2,
};
const GRADE_BASE={青铜:3,白银:5,黄金:7,钻石:10};function calcUnitPrice(def){return GRADE_BASE[def.grade]||def.cost||2;}

const REWARD_NODE_CONFIG={
  3:{midday:{stalls:1,tier:2,guarantee:['fluff_speaker','spring_sprite']}},
  4:{midday:{stalls:1,tier:3,guarantee:['forge_fire']},elite:{tier:3,cost:6}},
  5:{midday:{stalls:2,tier:3,guarantee:['forge_fire','command_sprout']},boss:{tier:3,cost:3,guarantee:['forge_fire']}},
  6:{boss:{tier:4,cost:0,free:true,guarantee:['dragon_flame','prime_sprout']}},
  7:{special:{id:'legend_chest',tier:4,cost:8,guarantee:['dragon_flame','prime_sprout']},boss:{tier:4,cost:4}},
  8:{special:{id:'element_spring',freeRefresh:1}},
  9:{midday:{stalls:2,tier:4,guarantee:['dragon_flame','prime_sprout']},boss:{tier:4,cost:4}},
  10:{midday:{stalls:5,tier:4,guarantee:['dragon_flame','prime_sprout']}},
};

// ========== GAME STATE ==========
let G;

function playerCastleAt(pos){
  if(!G.playerCastle||G.playerCastle.hp<=0)return false;
  return G.playerCastle.pos.r===pos.r&&G.playerCastle.pos.c===pos.c;
}
function enemyCastleAt(pos){
  if(!G.enemyCastle||G.enemyCastle.hp<=0)return false;
  return G.enemyCastle.pos.r===pos.r&&G.enemyCastle.pos.c===pos.c;
}
function castleAt(pos){return playerCastleAt(pos)||enemyCastleAt(pos);}
function damagePlayerCastle(dmg,src){
  if(!G.playerCastle||G.playerCastle.hp<=0)return;
  const red=getCastleDamageReduce();
  const td=Math.max(1,(dmg||0)-red);
  G.playerCastle.hp=Math.max(0,G.playerCastle.hp-td);
  glog(`🏰 我方城堡 ${src} -${td}${red>0?' (护城-'+red+')':''}（${G.playerCastle.hp}/${G.playerCastle.maxHp}）`);
  if(G.playerCastle.hp<=0)checkGameOver();
}
function damageEnemyCastle(dmg,src){
  if(!G.enemyCastle||G.enemyCastle.hp<=0)return;
  G.enemyCastle.hp=Math.max(0,G.enemyCastle.hp-dmg);
  glog(`🏰 敌方城堡 ${src} -${dmg}（${G.enemyCastle.hp}/${G.enemyCastle.maxHp}）`);
  if(G.enemyCastle.hp<=0)checkGameOver();
}

const DAY_ROUND_CONFIG={
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
function syncMaxRoundForPhase(){
  const d=G.day||1;
  const phase=G.dayHalf===2?'afternoon':'morning';
  const cfg=DAY_ROUND_CONFIG[d]||DAY_ROUND_CONFIG[1];
  G.maxRound=cfg[phase]||2;
}
function initGame(){
  G={
    phase:'PLAYER',  // PLAYER | MONSTER | SHOP | OVER
    day:1, dayHalf:0, wave:1, round:1, maxRound:2,
    hitCount:0,
    gold:8,
    savedCoins:0,
    board:mkBoard(),
    heroes:{},
    monsters:[],
    slots:[],
    // 单位系统
    ownedUnits:[],           // 所有拥有的单位实例
    nextUnitId:0,            // 单位实例 ID 计数器
    // 商店系统
    shopItems:{units:[],consumables:[]},  // 当前商店商品
    shopFrozen:{units:new Set(),consumables:new Set()}, // 冻结索引
    shopTier:1,
    // 城堡：左下我方、右上敌方
    playerCastle:{hp:80,maxHp:80,pos:{r:7,c:0}},
    enemyCastle:{hp:80,maxHp:80,pos:{r:0,c:7}},
    // 召唤引擎（水+召唤原型 · deep-interview v1-scope 增量1）
    summons:[],              // 召唤物实体 [{id,kind,name,hp,maxHp,atk,el,pos,ownerHid,dead}]
    _nextSummonId:0,
    engineStats:{summonCount:0,healCount:0,chainCount:0,perfectCount:0},
    growth:{summonTier:0,healTier:0,chainTier:0},
    lastSettle:null,
    runVictory:null,
    aiBattleStatus:null,
    elementCells:{},
    explosionThreshold:3,
    previewEvents:[],
    selHero:null,
    selSlot:null,
    selectedCell:null,
    prevCells:[],
    heroPrev:[],
    explPos:null,
    backpack:[],   // 保留用于强化品存储
    _bpCnt:0,
    monWarn:[],
    coreSnapshot:null,
    coreVersion:0,
    actionLog:[],
  };
  // 教程默认上阵两个单位（GDD 左下）
  addOwnedUnit('fire_starter',{r:6,c:0});
  addOwnedUnit('water_droplet',{r:7,c:1});
  syncUnitsToHeroes();
  spawnWaveForDay(1,'morning');
  syncMaxRoundForPhase();
  refreshUI();
  glog('🎮 游戏开始！第一波教学关卡。');
  glog('💡 提示：选中行动点→调整方向→点"使用"发动攻击。');
  glog('💡 点击英雄选中，再点空格移动位置。');
}

function mkBoard(){
  const b=[];
  for(let r=0;r<8;r++){b[r]=[];for(let c=0;c<8;c++)b[r][c]={r,c,el:null,stk:0};}
  return b;
}

function buildWaveForDay(day,phase){
  const cfg = DAY_WAVE_CONFIG[day]?.[phase];
  if(!cfg) { G.monsters=[]; return []; }
  let budget = cfg.budget;
  const allowed = cfg.allowed;
  const spawnSize = cfg.spawnSize;
  const maxAlive = cfg.maxAlive;
  // 构建可选怪物池
  const pool = [];
  allowed.forEach(typeId => {
    const mt = MONSTER_TYPES[typeId];
    if(mt) pool.push({...mt, typeId});
  });
  if(pool.length===0){ G.monsters=[]; return []; }
  // 按cost升序排列，让廉价怪优先填满预算
  pool.sort((a,b)=>a.cost-b.cost);
  // 贪心+随机生成怪物列表
  const result = [];
  let attempts = 0;
  while(budget>0 && result.length<maxAlive && attempts<200){
    const affordable = pool.filter(mt=>mt.cost<=budget);
    if(affordable.length===0) break;
    const pick = affordable[ri(affordable.length)];
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
  const forcedBoss = day===10&&phase==='afternoon' ? 'boss10'
    : day>=7&&phase==='afternoon' ? 'boss8'
    : day===5&&phase==='afternoon' ? 'boss5'
    : null;
  if(forcedBoss&&!result.some(m=>m.typeId===forcedBoss)){
    const boss=MONSTER_TYPES[forcedBoss];
    if(boss){
      result.push({
        typeId:forcedBoss,
        name:boss.name,
        hp:boss.hp, maxHp:boss.hp,
        atk:boss.atk, ap:boss.ap,
        cost:boss.cost, gold:boss.gold,
        pos:null, dead:false, el:null,
        ability: boss.ability || null,
      });
    }
  }
  return {monsters:result,remnant:budget,maxAlive,spawnSize};
}

function getSpawnCells(spawnSize){
  const size=spawnSize||3;
  const cells=[];
  for(let r=0;r<size;r++)for(let c=8-size;c<8;c++)cells.push({r,c});
  return cells;
}

function spawnWaveForDay(day,phase){
  // ── 硬编码教学波：改为通过出生区分配，避免落在元素块上 ──
  if(day===1&&phase==='morning'){
    const monsters=[
      {id:'tut_m1',name:'教学怪1',hp:6,maxHp:6,atk:1,dead:false,el:null,gold:1},
      {id:'tut_m2',name:'教学怪2',hp:10,maxHp:10,atk:1,dead:false,el:null,gold:1},
    ];
    assignSpawnPositions(monsters,3);
    G.monsters=monsters;
    glog('⚔️ 第1天早上：2只教学怪物（右上）');
    return;
  }
  if(day===3&&phase==='morning'){
    const monsters=[
      {id:'d3_elite',name:'铁甲队长',typeId:'elite',hp:24,maxHp:24,atk:3,ap:3,dead:false,el:null,gold:8},
      {id:'d3_a',name:'小怪A',typeId:'normal',hp:4,maxHp:4,atk:1,ap:5,dead:false,el:null,gold:2},
      {id:'d3_b',name:'小怪B',typeId:'normal',hp:4,maxHp:4,atk:1,ap:5,dead:false,el:null,gold:2},
    ];
    assignSpawnPositions(monsters,3);
    G.monsters=monsters;
    glog('⚔️ 第3天早上：精英教学波（铁甲队长+小怪）');
    return;
  }
  const wavePlan = buildWaveForDay(day,phase);
  if(!wavePlan||!wavePlan.monsters){
    G.monsters=[];
    return;
  }
  assignSpawnPositions(wavePlan.monsters, wavePlan.spawnSize);
  G.monsters=wavePlan.monsters.map((m,i)=>({id:`d${day}_${phase}_${i}`,...m}));
  glog(`⚔️ 第${day}天${phase==='morning'?'早上':'下午'}：${G.monsters.length}只怪物出击！`);
  syncMaxRoundForPhase();
}
function assignSpawnPositions(monsters,spawnSize){
  const spawnCells=getSpawnCells(spawnSize);
  const freeCells=spawnCells.filter(sc=>!monAt(sc)&&!heroAt(sc)&&!hasElementAt(sc));
  for(let i=0;i<monsters.length;i++){
    if(i<freeCells.length){
      monsters[i].pos=freeCells[i];
    }else{
      monsters[i].pos=spawnCells[0]||{r:0,c:7};
    }
  }
}
// ========== SHAPE ROTATION ==========
function rotCells(cells,dir){
  switch(dir){
    case'right': return cells;
    case'left':  return cells.map(([r,c])=>[r,-c]);
    case'up':    return cells.map(([r,c])=>[-c,r]);
    case'down':  return cells.map(([r,c])=>[c,r]);
  }
}

function atkCells(heroPos,sn,dir){
  const s=SD[sn]; if(!s)return[];
  return rotCells(s.cells,dir)
    .map(([dr,dc])=>({r:heroPos.r+dr,c:heroPos.c+dc}))
    .filter(p=>p.r>=0&&p.r<8&&p.c>=0&&p.c<8);
}

function findCenterCell(cells){
  // 返回攻击形状中邻居最多的格子作为中心
  if(cells.length===1)return cells[0];
  let best=cells[0],bestCount=0;
  for(const c1 of cells){
    let count=0;
    for(const c2 of cells){
      if(c1!==c2&&Math.abs(c1.r-c2.r)+Math.abs(c1.c-c2.c)===1)count++;
    }
    if(count>bestCount){bestCount=count;best=c1;}
  }
  return best;
}

// ========== BOARD HELPERS ==========
function monAt(pos){return G.monsters.find(m=>!m.dead&&m.pos.r===pos.r&&m.pos.c===pos.c);}
function heroAt(pos){return Object.values(G.heroes).find(h=>h.pos.r===pos.r&&h.pos.c===pos.c);}
function cellFree(pos){return !monAt(pos)&&!heroAt(pos)&&!summonAt(pos)&&pos.r>=0&&pos.r<8&&pos.c>=0&&pos.c<8;}
function boardRows(){return G&&G.board?G.board.length:8;}
function boardCols(){return G&&G.board&&G.board[0]?G.board[0].length:8;}
function inBoard(pos){return pos&&pos.r>=0&&pos.r<boardRows()&&pos.c>=0&&pos.c<boardCols();}
// 检查英雄从指定位置是否能攻击到任何敌方（怪物或城堡）
function canHeroAttackEnemyFrom(pos,hid){
  const hasEnemy=G.monsters.some(m=>!m.dead);
  const hasCastle=G.enemyCastle&&G.enemyCastle.hp>0;
  if(!hasEnemy&&!hasCastle)return false;
  for(const s of G.slots){
    if(s.used||s.hid!==hid)continue;
    const shape=SD[s.sn]; if(!shape)continue;
    const cells=rotCells(shape.cells,s.dir)
      .map(([dr,dc])=>({r:pos.r+dr,c:pos.c+dc}))
      .filter(inBoard);
    for(const p of cells){
      if(monAt(p))return true;
      if(enemyCastleAt(p))return true;
    }
  }
  return false;
}

// ========== ELEMENT SYSTEM ==========
function addEl(pos,el){
  const cell=G.board[pos.r][pos.c];
  if(!cell.el||cell.stk===0){cell.el=el;cell.stk=1;}
  else if(cell.el===el){if(cell.stk<MAX_STK)cell.stk++;}
  else if(ADV[el]===cell.el){doExplode(pos);cell.el=el;cell.stk=1;}
  // else: 不克制不同元素 → 无效
}

function explDmg(stk){return stk*(stk+1)/2;}
function calcElementLayerDamage(layers){return layers*(layers+1)/2;}

function explCells(pos){
  return [pos,{r:pos.r-1,c:pos.c},{r:pos.r+1,c:pos.c},{r:pos.r,c:pos.c-1},{r:pos.r,c:pos.c+1}]
    .filter(p=>p.r>=0&&p.r<8&&p.c>=0&&p.c<8);
}

function topElementAt(pos){
  const key=`${pos.r},${pos.c}`;
  const elData=G.elementCells[key];
  const boardEl=G.board[pos.r][pos.c].el;
  if(elData){
    if(boardEl&&elData[boardEl]?.layers>0)return{el:boardEl,layers:elData[boardEl].layers};
    for(const el of ['fire','water','wind','earth']){
      if(elData[el]?.layers>0)return{el,layers:elData[el].layers};
    }
  }
  const bc=G.board[pos.r][pos.c];
  return bc.el&&bc.stk>0?{el:bc.el,layers:bc.stk}:null;
}

function hasElementAt(pos){return !!topElementAt(pos);}

function syncBoardElementFromElementCells(pos){
  const key=`${pos.r},${pos.c}`;
  const elData=G.elementCells[key];
  const bc=G.board[pos.r][pos.c];
  if(elData){
    for(const el of ['fire','water','wind','earth']){
      if(elData[el]?.layers>0){
        bc.el=el; bc.stk=elData[el].layers;
        return;
      }
    }
  }
  bc.el=null; bc.stk=0;
}

function clearElementAt(pos,el=null){
  const key=`${pos.r},${pos.c}`;
  const elData=G.elementCells[key];
  if(elData){
    const targets=el?[el]:['fire','water','wind','earth'];
    targets.forEach(target=>{
      if(elData[target]){elData[target].layers=0;elData[target].willExplode=false;}
    });
  }
  syncBoardElementFromElementCells(pos);
}

// ⚠️ 旧逻辑兼容路径：由 addEl() 跨元素反应触发，或特殊即时爆炸道具用。
// 普通行动块（useSlot）不会调用此函数；普通行动块的真实伤害必须由 settleExplosions() 统一结算。
function doExplode(pos){
  const cell=G.board[pos.r][pos.c];
  if(!cell.el||cell.stk===0)return;
  const oldEl=cell.el;
  const dmg=explDmg(cell.stk);
  const elName=EL[oldEl];
    const isCross=hasCrossExplosion();
  const targets=isCross?explCells(pos):[pos];
  glog(`💥 ${elName}${cell.stk}引爆！${isCross?'范围伤害 ':'单体伤害 '}${dmg}`);
  cell.el=null; cell.stk=0;
  targets.forEach(tp=>{
    const m=monAt(tp);
    if(m){let emult=1;if(m.el&&ADV[oldEl]===m.el){emult=2;glog(`⚡ 元素克制 ×2！`);}dealDmg(m,dmg*emult,`${elName}引爆`);}
  });
  G.explPos=null;
  refreshUI();
}

// ========== DAMAGE ==========
function recomputeGrowth(){
  if(!G.growth)G.growth={summonTier:0,healTier:0,chainTier:0};
  const es=G.engineStats||{};
  G.growth.summonTier=Math.floor((es.summonCount||0)/3);
  G.growth.healTier=Math.floor((es.healCount||0)/4);
  G.growth.chainTier=Math.floor((es.chainCount||0)/3);
}
function calcHealAmount(){
  return 2+Math.floor((G.engineStats?.healCount||0)/4)+getHealAmpBonus();
}
function calcHealAtkGain(){
  return 1+Math.floor((G.engineStats?.healCount||0)/8);
}
function settleExplosions(){
  const report={
    chainSegments:0,
    advHits:0,
    totalDamage:0,
    killedCount:0,
    clearedWave:false,
    perfect:false,
  };
  const aliveBefore=G.monsters.filter(m=>!m.dead).length;
  const goldBefore=G.gold;
  const keys=Object.keys(G.elementCells);
  if(keys.length>0)glog('--- 结算阶段 ---');
  keys.forEach(key=>{
    const [r,c]=key.split(',').map(Number);
    const pos={r,c};
    const monHere=monAt(pos);
    const heroHere=heroAt(pos);
    ['fire','water','wind','earth'].forEach(el=>{
      const slot=G.elementCells[key][el];
      if(!slot||slot.layers===0)return;
      if(monHere){
        report.chainSegments++;
        const dmg=explDmg(slot.layers);
        const emult=monHere.el&&ADV[el]===monHere.el?2:1;
        const advBonus=emult===2?getAdvHitBonus():0;
        const td=dmg*emult+advBonus;
        if(emult===2)report.advHits++;
        report.totalDamage+=td;
        if(emult===2)glog(`⚡ 元素克制 ×2！`);
        glog(`⚔️ ${EL[el]}${slot.layers}层→${monHere.name} 单体 -${td}`);
        const wasAlive=!monHere.dead;
        dealDmg(monHere,td,`${EL[el]}元素结算`);
        if(wasAlive&&monHere.dead)report.killedCount++;
      } else if(heroHere){
        // 英雄身上有层，暂不结算
      } else {
        if(!slot.willExplode)return;
        report.chainSegments++;
        let dmg=explDmg(slot.layers);
        const spaceBonus=getSpaceExplosionBonus();
        dmg+=spaceBonus;
        const crossActive=hasCrossExplosion();
        const targets=crossActive?explCells(pos):[pos];
        glog(`💥 ${EL[el]}${slot.layers}层引爆！${crossActive?'范围伤害 ':'单体伤害 '}${dmg}${spaceBonus>0?' (引信+'+spaceBonus+')':''}`);
        targets.forEach(tp=>{
          const m=monAt(tp);
          if(m){
            let emult=1;
            if(m.el&&ADV[el]===m.el){emult=2;report.advHits++;}
            const advBonus=emult===2?getAdvHitBonus():0;
            const td=dmg*emult+advBonus;
            report.totalDamage+=td;
            if(emult===2)glog(`⚡ 元素克制 ×2！`);
            const wasAlive=!m.dead;
            dealDmg(m,td,`${EL[el]}元素结算`);
            if(wasAlive&&m.dead)report.killedCount++;
          }
          else if(enemyCastleAt(tp)){
            report.totalDamage+=dmg;
            damageEnemyCastle(dmg,`${EL[el]}元素结算`);
          }
        });
      }
      slot.layers=0; slot.willExplode=false;
      syncBoardElementFromElementCells(pos);
    });
  });
  report.clearedWave=G.monsters.every(m=>m.dead);
  report.perfect=report.clearedWave&&aliveBefore>0;
  if(report.perfect){
    G.gold+=3;
    G.engineStats.perfectCount=(G.engineStats.perfectCount||0)+1;
    glog('🌟 完美回合！连锁清场 +3 金');
  }
  if(report.chainSegments>0){
    G.engineStats.chainCount=(G.engineStats.chainCount||0)+report.chainSegments;
  }
  G.lastSettle=report;
  recomputeGrowth();
  if(report.chainSegments>0){
    glog(`🔗 连锁 ×${report.chainSegments}！克制 ×${report.advHits}！合计 −${report.totalDamage}`);
  }
  G.previewEvents=[];
  checkAllDead();
  refreshUI();
}

// 向后兼容别名，测试代码直接调用 settleDamage() 等价于 settleExplosions()
function settleDamage(){ settleExplosions(); }

function dealDmg(monster,dmg,src){
  monster.hp=Math.max(0,monster.hp-dmg);
  glog(`⚔️ ${src} → ${monster.name} -${dmg}（${monster.hp}/${monster.maxHp}）`);
  if(monster.hp<=0){
    monster.dead=true;
    glog(`💀 ${monster.name}被击杀！`);
    // 击杀金币
    if(monster.gold){
      G.gold+=monster.gold;
      glog(`💰 获得 ${monster.gold} 金币！`);
    }
  }
}

// ========== ATTACK ==========
function useSlot(idx){
  const slot=G.slots[idx];
  if(!slot||slot.used||G.phase!=='PLAYER')return;
  const hero=G.heroes[slot.hid]; if(!hero)return;
  const cells=atkCells(hero.pos,slot.sn,slot.dir);
  if(cells.length===0){glog('⚠️ 攻击范围为空。');return;}
  glog(`🌀 铺下${cells.length}格${EL[slot.el]}元素。`);
  dispatchGameAction({type:'USE_SLOT',slotId:idx});
}
function commitPlayerActionsToElementField(G){
  // 扫描所有已使用行动槽，确保它们产生的元素已写入 elementCells
  // 如果某个槽用了但 elementCells 没有对应格子，重建它
  // 此函数是幂等的：重复调用不会破坏已有数据
  G.slots.forEach((s,idx)=>{
    if(!s.used)return;
    const hero=G.heroes[s.hid]; if(!hero)return;
    const cells=atkCells(hero.pos,s.sn,s.dir);
    const center=findCenterCell(cells);
    const baseLayers=s.layers||1;
    const centerBonus=s.centerBonus||0;
    const condEl=s.conditional?.el;
    const condBonus=s.conditional?.bonus||0;
    cells.forEach(ap=>{
      // 不覆盖城堡格
      if(castleAt(ap))return;
      const key=`${ap.r},${ap.c}`;
      if(!G.elementCells[key]) G.elementCells[key]={
        fire:{layers:0,willExplode:false},
        water:{layers:0,willExplode:false},
        wind:{layers:0,willExplode:false},
        earth:{layers:0,willExplode:false},
      };
      const elSlot=G.elementCells[key][s.el];
      let layersToAdd=baseLayers;
      if(ap.r===center.r&&ap.c===center.c)layersToAdd+=centerBonus;
      if(condEl&&elSlot.layers>0)layersToAdd+=condBonus;
      // 只有当该格该元素层数为 0 时才写入（幂等）
      if(elSlot.layers===0){
        elSlot.layers=Math.min(layersToAdd,MAX_STK);
        elSlot.willExplode=elSlot.layers>=G.explosionThreshold;
      }
      const cell=G.board[ap.r][ap.c];
      if(!cell.el||cell.stk===0){cell.el=s.el;cell.stk=1;}
    });
  });
}

function checkAllDead(){
  if(G.monsters.every(m=>m.dead)){
    glog('✅ 所有怪物被击杀！');
  }
}

// ========== HERO MOVE ==========
function selHero(id){
  if(G.phase!=='PLAYER')return;
  const wasSel=G.selHero===id;
  G.selHero=wasSel?null:id;
  G.selSlot=null; G.prevCells=[]; G.explPos=null; G.heroPrev=[];
  // 选中英雄时同步 selectedCell，让 debug 面板展示该英雄格信息
  if(!wasSel&&G.selHero){
    const hero=G.heroes[id];
    if(hero)G.selectedCell={r:hero.pos.r,c:hero.pos.c};
  }else if(wasSel){
    G.selectedCell=null;
  }
  refreshUI();
}

function moveHero(r,c){
  if(!G.selHero||G.phase!=='PLAYER')return;
  const hero=G.heroes[G.selHero];
  if(hero._acted){glog('⚠️ 该英雄已行动，本回合无法再移动！');return;}
  if(heroAt({r,c})||monAt({r,c})||summonAt({r,c})||hasElementAt({r,c})||castleAt({r,c})){glog('⚠️ 目标格已占用！');return;}
  glog(`🚶 ${hero.name}移动到(${r},${c})`);
  dispatchGameAction({type:'MOVE_HERO',heroId:G.selHero,to:{r,c}});
}

// ========== SLOT SELECTION ==========
function selSlot(idx){
  if(G.phase!=='PLAYER')return;
  const s=G.slots[idx]; if(!s||s.used)return;
  dispatchGameAction({type:'SELECT_ACTION_SLOT',slotId:idx});
}

function updPreview(){
  if(G.selSlot===null){G.prevCells=[];return;}
  const s=G.slots[G.selSlot]; if(!s)return;
  const hero=G.heroes[s.hid]; if(!hero)return;
  G.prevCells=atkCells(hero.pos,s.sn,s.dir);
}

function setDir(idx,dir){
  dispatchGameAction({type:'SET_ACTION_DIRECTION',slotId:idx,direction:dir});
}

function setHero(idx,hid){
  dispatchGameAction({type:'UPDATE_ACTION_SLOT',slotId:idx,heroId:hid});
}

// ========== MONSTER WARNING ==========
function computeMonWarn(){
  G.monWarn=[];
  G.monsters.filter(m=>!m.dead).forEach(m=>{
    const{atkCell,atkTarget,movCells}=simMonAct(m);
    if(atkCell&&atkTarget){
      G.monWarn.push({r:atkCell.r,c:atkCell.c,type:'atk'});
    } else {
      const movOnly=movCells.filter(c=>c.type==='mov');
      if(movOnly.length>0){const last=movOnly[movOnly.length-1];G.monWarn.push({r:last.r,c:last.c,type:'mov'});}
    }
  });
}

// ========== AI BATTLE / TURN MANAGEMENT ==========
// 浏览器内 AI 战斗代理：只生成计划并调用现有 dispatchGameAction，不绕过核心规则。
const ALLOW_AUTO_MOVE = true;
const __IS_TEST__ = typeof global !== 'undefined' && global.__TEST__;
const sleep = ms => new Promise(r => setTimeout(r, ms));

function _aiPlanKey(pos){return pos.r+','+pos.c;}
function _aiSlotLabel(s,i){
  return '#'+(i+1)+' '+(EL[s.el]||s.el)+' sn'+s.sn+' '+(s.dir||'right');
}
function _aiCellBlocked(pos, movingHeroId, reserved){
  if(!inBoard(pos))return true;
  if(monAt(pos)||summonAt(pos)||hasElementAt(pos)||castleAt(pos))return true;
  const h=heroAt(pos);
  if(h&&h.id!==movingHeroId)return true;
  const k=_aiPlanKey(pos);
  return reserved&&reserved.has(k);
}
function _aiMaxSlotRange(hid){
  let maxRange=1;
  G.slots.forEach(s=>{
    if(s.used||s.hid!==hid)return;
    const shape=SD[s.sn]; if(!shape)return;
    shape.cells.forEach(([dr,dc])=>{if(Math.abs(dc)>maxRange)maxRange=Math.abs(dc);});
  });
  return maxRange;
}
function _aiTargetCells(){
  const cells=G.monsters.filter(m=>!m.dead).map(m=>m.pos);
  if(G.enemyCastle&&G.enemyCastle.hp>0)cells.push(G.enemyCastle.pos);
  return cells.filter(inBoard);
}
function _aiChooseMove(hid, heroIdx, reserved){
  const hero=G.heroes[hid];
  const targets=_aiTargetCells();
  if(!hero||hero._acted||targets.length===0||!ALLOW_AUTO_MOVE)return null;
  if(canHeroAttackEnemyFrom(hero.pos,hid))return null;
  const rowDensity=[...new Set(targets.map(t=>t.r))].map(r=>({r,cnt:targets.filter(t=>t.r===r).length}))
    .sort((a,b)=>b.cnt-a.cnt||Math.abs(a.r-hero.pos.r)-Math.abs(b.r-hero.pos.r));
  const maxRange=_aiMaxSlotRange(hid);
  const minTargetCol=Math.min(...targets.map(t=>t.c));
  const cols=boardCols();
  const baseCol=Math.max(0,Math.min(cols-1,minTargetCol-maxRange));
  const rowTarget=rowDensity.length>0?rowDensity[Math.min(heroIdx,rowDensity.length-1)].r:hero.pos.r;
  const candidates=[];
  for(let off=0;off<cols;off++){
    candidates.push({r:rowTarget,c:Math.min(cols-1,baseCol+off)});
    candidates.push({r:rowTarget,c:Math.max(0,baseCol-off)});
  }
  for(const t of candidates){
    if(t.r===hero.pos.r&&t.c===hero.pos.c)return null;
    if(_aiCellBlocked(t,hid,reserved))continue;
    return {heroId:hid,from:{r:hero.pos.r,c:hero.pos.c},to:t,reason:'靠近敌方高密度行'};
  }
  return null;
}
function buildAiBattleTurnPlan(){
  const plan={type:'AI_BATTLE_PLAN',phase:G.phase,canRun:false,moves:[],actions:[],summary:'',reason:'',slotsTotal:(G.slots||[]).length,slotsUsable:0};
  if(G.phase!=='PLAYER'){plan.reason='当前不是玩家回合';plan.summary='AI 等待玩家回合';return plan;}
  const heroIds=Object.keys(G.heroes).filter(hid=>G.heroes[hid].hp>0);
  const reserved=new Set();
  for(let heroIdx=0;heroIdx<heroIds.length;heroIdx++){
    const hid=heroIds[heroIdx];
    const hero=G.heroes[hid];
    if(!hero)continue;
    const mv=_aiChooseMove(hid,heroIdx,reserved);
    if(mv){plan.moves.push(mv);reserved.add(_aiPlanKey(mv.to));}
    else reserved.add(_aiPlanKey(hero.pos));
  }
  for(let heroIdx=0;heroIdx<heroIds.length;heroIdx++){
    const hid=heroIds[heroIdx];
    G.slots.forEach((s,i)=>{
      if(s.used||s.hid!==hid||!G.heroes[s.hid])return;
      const moved=plan.moves.find(m=>m.heroId===hid);
      const pos=moved?moved.to:G.heroes[s.hid].pos;
      if(atkCells(pos,s.sn,s.dir).length===0)return;
      plan.actions.push({slotId:i,heroId:hid,el:s.el,sn:s.sn,dir:s.dir,label:_aiSlotLabel(s,i)});
    });
  }
  plan.slotsUsable=plan.actions.length;
  plan.canRun=plan.moves.length>0||plan.actions.length>0;
  plan.reason=plan.canRun?'ready':'没有可执行的英雄动作';
  plan.summary=plan.canRun
    ? `AI 计划：移动${plan.moves.length}步，施放${plan.actions.length}个符文`
    : 'AI 没有找到可执行动作';
  return plan;
}
function planAiBattleTurn(){
  const plan=buildAiBattleTurnPlan();
  G.aiBattleStatus={phase:'planned',summary:plan.summary,moves:plan.moves.length,actions:plan.actions.length};
  glog('🧠 '+plan.summary);
  refreshUI();
  return plan;
}
function executeAiBattlePlan_sync(plan){
  if(!plan)plan=buildAiBattleTurnPlan();
  if(!plan.canRun){glog('⚠️ '+(plan.reason||'AI 没有可执行动作'));return plan;}
  G.aiBattleStatus={phase:'executing',summary:plan.summary,moves:plan.moves.length,actions:plan.actions.length};
  G.actionLog.push({type:'AI_BATTLE',desc:plan.summary,moves:plan.moves.length,actions:plan.actions.length});
  plan.moves.forEach(m=>{
    dispatchGameAction({type:'MOVE_HERO',heroId:m.heroId,to:{r:m.to.r,c:m.to.c}});
  });
  plan.actions.forEach(a=>{
    const s=G.slots[a.slotId];
    if(!s||s.used||!G.heroes[s.hid])return;
    if(atkCells(G.heroes[s.hid].pos,s.sn,s.dir).length===0)return;
    dispatchGameAction({type:'SELECT_ACTION_SLOT',slotId:a.slotId});
    dispatchGameAction({type:'USE_SLOT',slotId:a.slotId});
  });
  glog(`⚡ AI 战斗执行：移动${plan.moves.length}步，施放${plan.actions.length}个符文。`);
  return plan;
}
function runAiBattleTurn_sync(opts={}){
  if(G.phase!=='PLAYER')return buildAiBattleTurnPlan();
  const plan=planAiBattleTurn();
  if(!plan.canRun)return plan;
  executeAiBattlePlan_sync(plan);
  if(opts.endTurn!==false)endPlayerTurn();
  return plan;
}

// 异步版本：供浏览器环境使用
async function runAiBattleTurn_async(opts={}){
  if(G.phase!=='PLAYER')return buildAiBattleTurnPlan();
  const btn=document.getElementById('exa');
  if(btn){btn.disabled=true;btn.classList.add('ai-busy');}
  const plan=planAiBattleTurn();
  if(!plan.canRun){
    if(btn){btn.disabled=false;btn.classList.remove('ai-busy');}
    return plan;
  }
  G.aiBattleStatus={phase:'executing',summary:plan.summary,moves:plan.moves.length,actions:plan.actions.length};
  G.actionLog.push({type:'AI_BATTLE',desc:plan.summary,moves:plan.moves.length,actions:plan.actions.length});
  render();
  for(const m of plan.moves){
    dispatchGameAction({type:'MOVE_HERO',heroId:m.heroId,to:{r:m.to.r,c:m.to.c}});
    await sleep(120);
  }
  for(const a of plan.actions){
    const s=G.slots[a.slotId];
    if(!s||s.used||!G.heroes[s.hid])continue;
    if(atkCells(G.heroes[s.hid].pos,s.sn,s.dir).length===0)continue;
    dispatchGameAction({type:'SELECT_ACTION_SLOT',slotId:a.slotId});
    await sleep(80);
    dispatchGameAction({type:'USE_SLOT',slotId:a.slotId});
    await sleep(140);
  }
  glog(`⚡ AI 战斗执行：移动${plan.moves.length}步，施放${plan.actions.length}个符文。`);
  if(opts.endTurn!==false)endPlayerTurn();
  if(btn){btn.disabled=false;btn.classList.remove('ai-busy');}
  return plan;
}

// 旧入口保留给测试/脚本：只执行行动，不强制结束回合。
function execAllHeroSlots_sync(){
  const plan=buildAiBattleTurnPlan();
  executeAiBattlePlan_sync(plan);
  return plan;
}
async function execAllHeroSlots_async(){
  return runAiBattleTurn_async({endTurn:true});
}

function runAiBattleTurn(){
  if(__IS_TEST__) return runAiBattleTurn_sync();
  return runAiBattleTurn_async({endTurn:true});
}

// 统一旧入口
function execAllHeroSlots(){
  if(__IS_TEST__) return execAllHeroSlots_sync();
  return execAllHeroSlots_async();
}

function toggleFullscreen(){
  if(!document.fullscreenElement){
    document.documentElement.requestFullscreen().catch(()=>{});
  } else {
    document.exitFullscreen();
  }
}
if(typeof document.addEventListener==='function'){
  document.addEventListener('keydown',e=>{
    if(e.key==='F11'){ e.preventDefault(); toggleFullscreen(); }
    if(e.key==='d'||e.key==='D'){
      try{
        const on=isDebugMode();
        localStorage.setItem('ysbzs_debug', on?'0':'1');
        scheduleDebugPanelUpdate();
      }catch(err){}
    }
  });
}
function endPlayerTurn(){
  if(G.phase!=='PLAYER')return;
  G.aiBattleStatus=null;
  pushReplayStep({type:'END_PLAYER_TURN'});
  commitPlayerActionsToElementField(G);
  settleExplosions();
  runSummonActions();
  if(G.phase==='OVER'){refreshUI();return;}
  G.phase='MONSTER'; G.selSlot=null; G.selHero=null; G.prevCells=[]; G.explPos=null; G.heroPrev=[];
  Object.values(G.heroes).forEach(h=>h._acted=false);
  glog('--- 怪物回合 ---');
  computeMonWarn();
  const hasAtk=G.monWarn.some(w=>w.type==='atk');
  if(hasAtk)glog('⚠️ 预警：怪物即将攻击英雄！');
  else if(G.monWarn.length)glog('👁 预警：怪物移动方向已标出。');
  refreshUI();
  setTimeout(()=>{G.monWarn=[];runMonsters(0);},700);
}

function runMonsters(idx){
  const alive=G.monsters.filter(m=>!m.dead);
  if(idx>=alive.length){finishMonsters();return;}
  runMonsterAbilityHook('onRoundStart',alive[idx]);
  monsterAct(alive[idx]);
  refreshUI();
  setTimeout(()=>runMonsters(idx+1),350);
}

function monsterAct(m){
  if(m.dead)return;
  let ap=3;
  while(ap>0){
    const lp={r:m.pos.r,c:m.pos.c-1};
    if(lp.c>=0){
      const lh=heroAt(lp);
      if(lh){
        lh.hp=Math.max(0,lh.hp-m.atk);
        const lu=getUnitByHeroId(lh.id); if(lu)lu.hp=lh.hp;
        glog(`👾 ${m.name}攻击${lh.name}！-${m.atk}（${lh.hp}/${lh.maxHp}）`);
        if(lh.hp<=0){glog(`💔 ${lh.name}倒下了！`);checkGameOver();}
        ap-=1;break;
      }
      if(playerCastleAt(lp)){
        damagePlayerCastle(m.atk,`${m.name}攻击`);
        ap-=1;break;
      }
      const ls=summonAt(lp);
      if(ls){
        damageSummon(ls,m.atk);
        glog(`👾 ${m.name}攻击${ls.name}！-${m.atk}（${ls.dead?0:ls.hp}/${ls.maxHp}）`);
        ap-=1;break;
      }
    }
    const dp={r:m.pos.r+1,c:m.pos.c};
    if(dp.r<=12){
      const dh=heroAt(dp);
      if(dh){
        dh.hp=Math.max(0,dh.hp-m.atk);
        const du=getUnitByHeroId(dh.id); if(du)du.hp=dh.hp;
        glog(`👾 ${m.name}攻击${dh.name}！-${m.atk}（${dh.hp}/${dh.maxHp}）`);
        if(dh.hp<=0){glog(`💔 ${dh.name}倒下了！`);checkGameOver();}
        ap-=1;break;
      }
      if(playerCastleAt(dp)){
        damagePlayerCastle(m.atk,`${m.name}攻击`);
        ap-=1;break;
      }
      const ds=summonAt(dp);
      if(ds){
        damageSummon(ds,m.atk);
        glog(`👾 ${m.name}攻击${ds.name}！-${m.atk}（${ds.dead?0:ds.hp}/${ds.maxHp}）`);
        ap-=1;break;
      }
    }
    const np=nextMoveFromPos(m.pos,m);
    if(!np)break;
    const block=topElementAt(np);
    if(block){
      glog(`👾 ${m.name}被${EL[block.el]}${block.layers}阻挡！本回合结束。`);
      ap=0;break;
    }
    if(!monAt(np)&&!heroAt(np)&&!castleAt(np)&&!summonAt(np)){m.pos=np;glog(`👾 ${m.name}→(${np.r},${np.c})`);ap-=1;}
    else break;
  }
}

function nextMoveFromPos(pos,m){
  // 目标：最近的英雄或城堡
  let best=null,bd=99;
  const heroes=Object.values(G.heroes).filter(h=>h.hp>0);
  heroes.forEach(h=>{
    const d=Math.abs(h.pos.r-pos.r)+Math.abs(h.pos.c-pos.c);
    if(d<bd){bd=d;best={r:h.pos.r,c:h.pos.c};}
  });
  if(G.playerCastle&&G.playerCastle.hp>0){
    const cd=Math.abs(G.playerCastle.pos.r-pos.r)+Math.abs(G.playerCastle.pos.c-pos.c);
    if(cd<bd){bd=cd;best={r:G.playerCastle.pos.r,c:G.playerCastle.pos.c};}
  }
  if(!best)return null;
  const dr=best.r-pos.r, dc=best.c-pos.c;
  const moves=[];
  if(dc<0)moves.push({r:pos.r,c:pos.c-1});
  if(dc>0)moves.push({r:pos.r,c:pos.c+1});
  if(dr<0)moves.push({r:pos.r-1,c:pos.c});
  if(dr>0)moves.push({r:pos.r+1,c:pos.c});
  for(const mv of moves){
    if(mv.r<0||mv.r>12||mv.c<0||mv.c>12)continue;
    if(!monAt(mv)&&!summonAt(mv)&&!heroAt(mv)&&!castleAt(mv))return mv;
  }
  return null;
}
function nextMove(m){return nextMoveFromPos(m.pos,m);}

// 模拟怪物3行动点回合，不修改真实状态
function simMonAct(m){
  const startPos={r:m.pos.r,c:m.pos.c};
  let pos={r:m.pos.r,c:m.pos.c};
  let ap=3;
  const movCells=[];
  let atkCell=null,atkTarget=null,stopReason='ap_exhausted';
  while(ap>0){
    const lp={r:pos.r,c:pos.c-1};
    if(lp.c>=0){
      const lh=heroAt(lp);
      if(lh){atkCell={r:lp.r,c:lp.c};atkTarget=lh;stopReason='attack';break;}
      if(playerCastleAt(lp)){atkCell={r:lp.r,c:lp.c};atkTarget={id:'playerCastle',name:'我方城堡',hp:G.playerCastle.hp};stopReason='attack';break;}
      const ls=summonAt(lp);
      if(ls){atkCell={r:lp.r,c:lp.c};atkTarget=ls;stopReason='attack';break;}
    }
    const dp={r:pos.r+1,c:pos.c};
    if(dp.r<=12){
      const dh=heroAt(dp);
      if(dh){atkCell={r:dp.r,c:dp.c};atkTarget=dh;stopReason='attack';break;}
      if(playerCastleAt(dp)){atkCell={r:dp.r,c:dp.c};atkTarget={id:'playerCastle',name:'我方城堡',hp:G.playerCastle.hp};stopReason='attack';break;}
      const ds=summonAt(dp);
      if(ds){atkCell={r:dp.r,c:dp.c};atkTarget=ds;stopReason='attack';break;}
    }
    const np=nextMoveFromPos(pos,m);
    if(!np){stopReason='no_path';break;}
    if(hasElementAt(np)){movCells.push({r:np.r,c:np.c,type:'block',step:4-ap});stopReason='blocked';break;}
    if(monAt(np)||heroAt(np)||castleAt(np)||summonAt(np)){stopReason='occupied';break;}
    const stepNum=4-ap;
    movCells.push({r:np.r,c:np.c,type:'mov',step:stepNum});
    pos={r:np.r,c:np.c};
    ap-=1;
  }
  return{movCells,atkCell,atkTarget,dmg:m.atk,startPos,remainAp:ap,stopReason};
}

function finishMonsters(){
  if(G.phase==='OVER')return;
  G.round++;
  const allDead=G.monsters.every(m=>m.dead);
  const castleDead=!G.enemyCastle||G.enemyCastle.hp<=0;
  if(G.round>G.maxRound||(allDead&&castleDead)){
    if(G.dayHalf===0){
      // 早上波结束 → 中午商店
      G.dayHalf=1;
      G.round=1; G.hitCount=0;
      G.slots.forEach(s=>s.used=false);
      Object.values(G.heroes).forEach(h=>h._acted=false);
      G.previewEvents=[];
      glog(`🛒 第${G.day}天中午·进入商店！`);
      G.phase='SHOP';
      openShop();
    } else if(G.dayHalf===2){
      glog(`🌙 第${G.day}天夜晚·进入商店！`);
      G.phase='SHOP';
      openShop();
    }
  } else {
    G.phase='PLAYER'; G.hitCount=0; G.previewEvents=[];
    G.slots.forEach(s=>s.used=false);
    Object.values(G.heroes).forEach(h=>h._acted=false);
    glog(`--- 玩家回合 · 第${G.round}/${G.maxRound}小回合 ---`);
  }
  refreshUI();
}

function checkGameOver(){
  const allDead=Object.values(G.heroes).every(h=>h.hp<=0);
  if(allDead){
    G.runVictory=false;
    G.phase='OVER';
    showRunEnd();
    return;
  }
  if(G.playerCastle&&G.playerCastle.hp<=0){
    G.runVictory=false;
    G.phase='OVER';
    showRunEnd();
    return;
  }
  if(G.enemyCastle&&G.enemyCastle.hp<=0){
    G.runVictory=true;
    G.phase='OVER';
    showRunEnd();
  }
}

// ========== UNIT MANAGEMENT ==========
function addOwnedUnit(defId, pos){
  const def=UNIT_DEFS[defId]; if(!def)return null;
  const lvl=def.levels[1];
  const unit={
    instanceId:`u_${G.nextUnitId++}`,
    defId:defId,
    level:1,
    hp:lvl.hp, maxHp:lvl.hp,
    pos:pos||{r:0,c:0},
    active:true,
  };
  G.ownedUnits.push(unit);
  return unit;
}

function getUnitByHeroId(hid){
  const hero=G.heroes[hid];
  if(!hero||!hero.unitId)return null;
  return G.ownedUnits.find(u=>u.instanceId===hero.unitId);
}

function syncHeroHPToUnits(){
  Object.values(G.heroes).forEach(h=>{
    const u=getUnitByHeroId(h.id);
    if(u)u.hp=h.hp;
  });
}

function syncUnitsToHeroes(){
  const MAX_ACTIVE=6;const active=G.ownedUnits.filter(u=>u.active).slice(0,MAX_ACTIVE);
  G.heroes={};
  G.slots=[];
  active.forEach((unit,ui)=>{
    if(ui>=2)return;
    const def=UNIT_DEFS[unit.defId];
    const lvlData=def.levels[unit.level];
    const hid=ui===0?'ha':'hb';
    unit.pos=unit.pos||{r:6+ui,c:0};
    G.heroes[hid]={
      id:hid,
      name:def.name+(unit.level>1?` Lv${unit.level}`:''),
      hp:unit.hp,
      maxHp:unit.maxHp,
      pos:{r:unit.pos.r,c:unit.pos.c},
      unitId:unit.instanceId,
      _acted:false,
    };
    lvlData.slots.forEach((slotDef,si)=>{
      G.slots.push({
        id:ui*3+si,
        el:slotDef.el||'water',
        sn:slotDef.sn,
        tier:slotDef.tier,
        dir:slotDef.dir,
        hid:hid,
        used:false,
        skill:slotDef.skill||null,
        consumeLayers:!!slotDef.consumeLayers,
        bonusHp:slotDef.bonusHp||0,
        count:slotDef.count||1,
        layers:slotDef.layers,
        centerBonus:slotDef.centerBonus,
        conditional:slotDef.conditional,
      });
    });
  });
  // 只保留前2个上阵单位，其余全部放入备战
  const heroUnits=new Set(active.slice(0,2));
  G.ownedUnits.forEach(u=>{if(!heroUnits.has(u))u.active=false;});
}

function mergeUnits(fromUnit, toUnit){
  if(fromUnit.defId!==toUnit.defId)return false;
  if(toUnit.level>=3){showMsg('已是最高3级，无法继续合成！');return false;}
  const oldLvl=toUnit.level;
  toUnit.level++;
  const def=UNIT_DEFS[toUnit.defId];
  const lvlData=def.levels[toUnit.level];
  toUnit.maxHp=lvlData.hp;
  toUnit.hp=Math.min(toUnit.hp+(lvlData.hp-def.levels[oldLvl].hp),lvlData.hp);
  G.ownedUnits=G.ownedUnits.filter(u=>u.instanceId!==fromUnit.instanceId);
  glog(`⬆️ ${def.name} 合成升级！Lv${oldLvl}→Lv${toUnit.level}`);
  addLevelupUnit();
  syncUnitsToHeroes();
  return true;
}

function addLevelupUnit(){
  const higherTier=Math.min(G.shopTier+1,4);
  const pool=UNIT_TIER_POOL[higherTier]||[];
  if(pool.length===0)return;
  const defId=pool[Math.floor(Math.random()*pool.length)];
  const def=UNIT_DEFS[defId];
  G.shopItems.units.push({id:`su_${G.nextUnitId}`,defId,cost:calcUnitPrice(def),frozen:false});
}

// ========== 召唤引擎（水+召唤原型 · deep-interview v1-scope 增量1） ==========
// 召唤物是水属性棋盘实体：被治疗 → 攻击+1（引擎成长）；死亡 → 原地留 1 层水（连锁燃料）。
function summonAt(pos){
  if(!G.summons)return undefined;
  return G.summons.find(s=>!s.dead&&s.pos.r===pos.r&&s.pos.c===pos.c);
}
// 按结算可识别的规范结构把 n 层 el 元素写入 elementCells，并同步棋盘显示
function addElementLayers(pos,el,n){
  if(castleAt(pos))return;
  const key=`${pos.r},${pos.c}`;
  if(!G.elementCells[key])G.elementCells[key]={
    fire:{layers:0,willExplode:false},
    water:{layers:0,willExplode:false},
    wind:{layers:0,willExplode:false},
    earth:{layers:0,willExplode:false},
  };
  const slot=G.elementCells[key][el];
  slot.layers=Math.min(slot.layers+(n||1),MAX_STK);
  slot.willExplode=slot.layers>=G.explosionThreshold;
  if(typeof syncBoardElementFromElementCells==='function')syncBoardElementFromElementCells(pos);
}
function getPassiveAura(){
  let buffHp=0,buffAtk=0,splitSprout=null;
  (G.ownedUnits||[]).forEach(u=>{
    const p=UNIT_DEFS[u.defId]?.passive; if(!p)return;
    const li=Math.max(0,Math.min(2,(u.level||1)-1));
    if(p.type==='buffAllSummons'){
      buffHp+=(p.hpByLevel||[])[li]||0;
      buffAtk+=(p.atkByLevel||[])[li]||0;
    }else if(p.type==='splitSproutSummon'){
      splitSprout={count:(p.countByLevel||[])[li]||2,hpMul:(p.hpMulByLevel||[])[li]||0.5};
    }
  });
  return {buffHp,buffAtk,splitSprout};
}
function getSpaceExplosionBonus(){
  let bonus=0;
  (G.ownedUnits||[]).forEach(u=>{
    if(!u.active)return;
    const p=UNIT_DEFS[u.defId]?.passive;
    if(p?.type!=='spaceExplosionBonus')return;
    const li=Math.max(0,Math.min(2,(u.level||1)-1));
    bonus+=(p.bonusByLevel||[])[li]||0;
  });
  return bonus;
}
function getHealAmpBonus(){
  let bonus=0;
  (G.ownedUnits||[]).forEach(u=>{
    if(!u.active)return;
    const p=UNIT_DEFS[u.defId]?.passive;
    if(p?.type!=='healAmpBonus')return;
    const li=Math.max(0,Math.min(2,(u.level||1)-1));
    bonus+=(p.bonusByLevel||[])[li]||0;
  });
  return bonus;
}
function getCastleDamageReduce(){
  let red=0;
  (G.ownedUnits||[]).forEach(u=>{
    if(!u.active)return;
    const p=UNIT_DEFS[u.defId]?.passive;
    if(p?.type!=='castleReduce')return;
    const li=Math.max(0,Math.min(2,(u.level||1)-1));
    red+=(p.reductionByLevel||[])[li]||0;
  });
  return red;
}
function hasCrossExplosion(){
  return (G.ownedUnits||[]).some(u=>{
    if(!u.active)return false;
    const p=UNIT_DEFS[u.defId]?.passive;
    return p?.type==='crossExplosion';
  });
}

function getAdvHitBonus(){
  let bonus=0;
  (G.ownedUnits||[]).forEach(u=>{
    if(!u.active)return;
    const p=UNIT_DEFS[u.defId]?.passive;
    if(p?.type!=='advHitBonus')return;
    const li=Math.max(0,Math.min(2,(u.level||1)-1));
    bonus+=(p.bonusByLevel||[])[li]||0;
  });
  return bonus;
}
function getOwnerDeathDrop(ownerHid){
  const u=getUnitByHeroId(ownerHid);
  if(!u)return null;
  const p=UNIT_DEFS[u.defId]?.passive;
  if(p?.type!=='onSummonDeath')return null;
  const li=Math.max(0,Math.min(2,(u.level||1)-1));
  return {el:p.el||'fire',layers:(p.layersByLevel||[])[li]||2};
}
function applySummonPassives(s){
  const {buffHp,buffAtk}=getPassiveAura();
  if(buffHp){s.hp+=buffHp;s.maxHp+=buffHp;}
  if(buffAtk){s.atk+=buffAtk;}
}
function calcSproutSpawnParams(hero,slot,chosen){
  const bonusHp=slot.bonusHp||0;
  const layerBonus=Math.min(chosen.layers||0,2);
  const base=6+bonusHp+layerBonus;
  let count=slot.count||1;
  let hpMul=1;
  const u=getUnitByHeroId(hero.id);
  if(u&&u.defId==='sprout_summoner'){
    const {splitSprout}=getPassiveAura();
    if(splitSprout){count=splitSprout.count;hpMul=splitSprout.hpMul;}
  }
  const extraSpawn=Math.floor((G.engineStats?.summonCount||0)/5);
  count=Math.min(count+extraSpawn,4);
  const hp=Math.max(1,Math.floor(base*hpMul));
  return {count,hp,maxHp:hp};
}
function spawnSummon(ownerHid,pos,opts){
  opts=opts||{};
  const baseHp=opts.hp!=null?opts.hp:3;
  const tierBonus=Math.floor((G.engineStats?.summonCount||0)/3);
  const s={
    id:`sm_${G._nextSummonId++}`,
    kind:'summon',
    name:opts.name||'水灵',
    el:opts.el||'water',
    hp:baseHp,
    maxHp:opts.maxHp!=null?opts.maxHp:baseHp,
    atk:(opts.atk!=null?opts.atk:1)+tierBonus,
    pos:{r:pos.r,c:pos.c},
    ownerHid:ownerHid||null,
    dead:false,
  };
  G.summons.push(s);
  G.engineStats.summonCount++;
  recomputeGrowth();
  applySummonPassives(s);
  return s;
}
function healSummon(summon,amount){
  if(!summon||summon.dead)return;
  const amt=amount!=null?amount:calcHealAmount();
  summon.hp=Math.min(summon.hp+amt,summon.maxHp);
  summon.atk+=calcHealAtkGain();
  G.engineStats.healCount++;
  recomputeGrowth();
}
function killSummon(summon){
  if(!summon||summon.dead)return;
  summon.dead=true;
  addElementLayers(summon.pos,summon.el||'water',1);   // 死亡留水层（连锁燃料）
  const drop=getOwnerDeathDrop(summon.ownerHid);
  if(drop)addElementLayers(summon.pos,drop.el,drop.layers);
}
function damageSummon(summon,dmg){
  if(!summon||summon.dead)return;
  summon.hp=Math.max(0,summon.hp-(dmg||0));
  if(summon.hp<=0)killSummon(summon);
}

// 召唤物回合行动：攻击相邻怪物（引擎滚雪球后的 atk 在此兑现）
function runSummonActions(){
  if(!G.summons||G.summons.length===0)return;
  let acted=0,moved=0;
  const dirs=[{r:-1,c:0},{r:1,c:0},{r:0,c:-1},{r:0,c:1}];
  const attackAdjacent=(s)=>{
    for(const d of dirs){
      const tp={r:s.pos.r+d.r,c:s.pos.c+d.c};
      if(tp.r<0||tp.r>12||tp.c<0||tp.c>12)continue;
      const m=monAt(tp);
      if(m){
        dealDmg(m,s.atk,`${s.name}攻击`);
        glog(`💧 ${s.name}(ATK${s.atk})→${m.name} -${s.atk}`);
        return true;
      }
    }
    return false;
  };
  G.summons.filter(s=>!s.dead).forEach(s=>{
    if(attackAdjacent(s)){acted++;return;}
    const targets=G.monsters.filter(m=>!m.dead);
    if(targets.length===0)return;
    let target=targets[0],best=99;
    targets.forEach(m=>{
      const d=Math.abs(m.pos.r-s.pos.r)+Math.abs(m.pos.c-s.pos.c);
      if(d<best){best=d;target=m;}
    });
    const rowStep=Math.sign(target.pos.r-s.pos.r);
    const colStep=Math.sign(target.pos.c-s.pos.c);
    const candidates=[
      {r:s.pos.r,c:s.pos.c+colStep},
      {r:s.pos.r+rowStep,c:s.pos.c},
    ].filter(p=>p.r>=0&&p.r<8&&p.c>=0&&p.c<8);
    const np=candidates.find(p=>!monAt(p)&&!heroAt(p)&&!castleAt(p)&&!summonAt(p)&&!hasElementAt(p));
    if(np){
      s.pos=np;
      moved++;
      glog(`💧 ${s.name}→(${np.r},${np.c})`);
      if(attackAdjacent(s))acted++;
    }
  });
  if(acted>0||moved>0)glog(`🌀 召唤物行动：${moved} 次移动 / ${acted} 次攻击`);
  checkAllDead();
}

function chooseElementForSummon(pos){
  const key=`${pos.r},${pos.c}`;
  const elData=G.elementCells[key];
  let best={el:'water',layers:0};
  if(elData){
    ['fire','water','wind','earth'].forEach(el=>{
      const layers=elData[el]?.layers||0;
      if(layers>best.layers)best={el,layers};
    });
  }
  if(best.layers===0){
    const top=topElementAt(pos);
    if(top)best={el:top.el,layers:top.layers};
  }
  return best;
}

function execSummonFromCellSkill(hero,slot){
  const cells=atkCells(hero.pos,slot.sn,slot.dir);
  const candidates=cells.filter(p=>!heroAt(p)&&!monAt(p)&&!castleAt(p)&&!summonAt(p));
  if(candidates.length===0){glog('⚠️ 没有可召唤的空格');return false;}
  let bestCell=candidates[0],bestLayers=-1;
  candidates.forEach(p=>{
    const {layers}=chooseElementForSummon(p);
    if(layers>bestLayers){bestLayers=layers;bestCell=p;}
  });
  const chosen=chooseElementForSummon(bestCell);
  if(slot.consumeLayers&&chosen.layers>0){
    const key=`${bestCell.r},${bestCell.c}`;
    const elSlot=G.elementCells[key]&&G.elementCells[key][chosen.el];
    if(elSlot){
      elSlot.layers=Math.max(0,elSlot.layers-1);
      elSlot.willExplode=elSlot.layers>=G.explosionThreshold;
      syncBoardElementFromElementCells(bestCell);
    }
  }
  const bonusHp=slot.bonusHp||0;
  const u=getUnitByHeroId(hero.id);
  const isSprout=u&&u.defId==='sprout_summoner';
  const spawnPlan=isSprout?calcSproutSpawnParams(hero,slot,chosen):{
    count:slot.count||1,
    hp:3+bonusHp+Math.min(chosen.layers,2),
    maxHp:5+bonusHp+Math.min(chosen.layers,2),
  };
  const spawnCount=spawnPlan.count;
  for(let i=0;i<spawnCount;i++){
    const offset=i===0?bestCell:{r:bestCell.r,c:Math.min(12,bestCell.c+i)};
    if(summonAt(offset)||heroAt(offset)||monAt(offset)||castleAt(offset))continue;
    spawnSummon(hero.id,offset,{
      el:chosen.el||'water',
      hp:spawnPlan.hp,
      maxHp:spawnPlan.maxHp,
      name:chosen.el==='water'?'水灵':'芽灵',
    });
  }
  glog(`🌱 ${hero.name}在(${bestCell.r},${bestCell.c})召唤${EL[chosen.el||'water']}单位！`);
  return true;
}

function execHealSummonsSkill(hero,slot){
  const cells=atkCells(hero.pos,slot.sn,slot.dir);
  let n=0;
  G.summons.filter(s=>!s.dead).forEach(s=>{
    if(cells.some(p=>p.r===s.pos.r&&p.c===s.pos.c)){
      healSummon(s);
      n++;
    }
  });
  if(n>0)glog(`💧 ${hero.name}治疗${n}个召唤物，攻击成长+${n}`);
  else glog('⚠️ 范围内没有可治疗的召唤物');
  return n>0;
}

function runMonsterAbilityHook(trigger,monster){
  if(!monster||monster.dead)return false;
  const ability=monster.ability || MONSTER_TYPES[monster.typeId]?.ability;
  if(!ability||ability.trigger!==trigger)return false;
  if(ability.id==='lava_surge'){
    const cfg=ability.config||{};
    addElementLayers(monster.pos,cfg.el||'fire',cfg.layers||1);
    glog(`🔥 ${monster.name}引发熔岩涌动`);
    return true;
  }
  if(ability.id==='core_split'){
    monster._abilityTicks=(monster._abilityTicks||0)+1;
    const cfg=ability.config||{};
    const n=cfg.n||2;
    if(monster._abilityTicks%n!==0)return false;
    const dirs=[{r:0,c:-1},{r:1,c:0},{r:-1,c:0},{r:0,c:1}];
    const pos=dirs.map(d=>({r:monster.pos.r+d.r,c:monster.pos.c+d.c}))
      .find(p=>p.r>=0&&p.r<8&&p.c>=0&&p.c<8&&cellFree(p)&&!castleAt(p)&&!hasElementAt(p));
    if(!pos)return false;
    const typeId=cfg.typeId||'normal';
    const mt=MONSTER_TYPES[typeId]||MONSTER_TYPES.normal;
    G.monsters.push({
      id:`split_${Date.now()}_${G.monsters.length}`,
      typeId,
      name:mt.name,
      hp:mt.hp,maxHp:mt.hp,atk:mt.atk,ap:mt.ap,cost:mt.cost,gold:mt.gold,
      pos,dead:false,el:null,ability:mt.ability||null,
    });
    glog(`🔥 ${monster.name}分裂出${mt.name}`);
    return true;
  }
  return false;
}

// ========== SHOP ==========
function calcShopTier(day){
  if(day>=7)return 4;
  if(day>=5)return 3;
  if(day>=3)return 2;
  return 1;
}

function openShop(){
  if(G.phase==='OVER')return;
  G.shopTier=calcShopTier(G.day);
  // 每晚固定收入
  const income=SHOP_PRICE_CONFIG.nightIncome[G.day]||0;
  G.gold+=income;
  // 利息：每 interestStep 金币 +1，最高 interestMax
  const interest=Math.min(Math.floor(G.gold/SHOP_PRICE_CONFIG.interestStep),SHOP_PRICE_CONFIG.interestMax);
  G.gold+=interest;
  if(income>0||interest>0) glog(`💰 第${G.day}天收入 +${income}${interest>0?`（利息+${interest})`:'）'}，共 ${G.gold} 金币`);
  syncHeroHPToUnits();
  genShop();
  syncUnitsToHeroes();
  renderShop();
  document.getElementById('so').style.display='block';
}

const SHOP_POOLS={
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
function getShopPoolKey(){
  const d=G.day||1;
  if(d>=10) return G.dayHalf>=2?'day10_night':'day10_midday';
  if(d>=9) return G.dayHalf>=2?'day9_night':'day9_midday';
  if(d>=8) return G.dayHalf>=2?'day8_night':'day8_midday';
  if(d>=7) return G.dayHalf>=2?'day7_night':'day7_midday';
  if(d>=6) return G.dayHalf>=2?'day6_night':'day6_midday';
  if(d>=5) return G.dayHalf>=2?'day5_night':'day5_midday';
  if(d>=4) return G.dayHalf>=2?'day4_night':'day4_midday';
  if(d>=3) return G.dayHalf>=2?'day3_night':'day3_midday';
  if(G.dayHalf>=2) return `day${d}_night`;
  return `day${d}_midday`;
}
function getShopPoolIds(tier){
  const pool=SHOP_POOLS[getShopPoolKey()];
  if(!pool)return null;
  const ids=[...new Set(pool)].filter(id=>UNIT_DEFS[id]&&UNIT_DEFS[id].tier===tier);
  return ids.length?ids:null;
}
function genShop(){
  // 先快照已冻结的商品，再清空重新生成
  const frozenUnits=(G.shopItems.units||[]).filter(u=>G.shopFrozen.units.has(u.id));
  G.shopItems={units:[],consumables:[]};
  // 每日商店格子构成
  const slots=SHOP_PRICE_CONFIG.shopSlots[G.day]||SHOP_PRICE_CONFIG.shopSlots[1];
  const counts={1:slots.unitT1||0,2:slots.unitT2||0,3:slots.unitT3||0,4:slots.unitT4||0};
  for(let tier=1;tier<=4;tier++){
    const kept=frozenUnits.filter(u=>UNIT_DEFS[u.defId]?.tier===tier);
    kept.forEach(u=>G.shopItems.units.push(u));
    const target=Math.max(0,counts[tier]-kept.length);
    const pool=getShopPoolIds(tier)||(UNIT_TIER_POOL[tier]||[]);
    for(let i=0;i<target;i++){
      if(pool.length===0)break;
      const defId=pool[(i+G.nextUnitId)%pool.length];
      const def=UNIT_DEFS[defId];
      G.shopItems.units.push({id:`su_${G.nextUnitId}_${tier}_${i}`,defId,cost:calcUnitPrice(def),frozen:false});
    }
  }
}

function buyUnit(itemId){
  if(G.phase!=='SHOP')return;
  const idx=G.shopItems.units.findIndex(u=>u.id===itemId);
  if(idx===-1)return;
  const item=G.shopItems.units[idx];
  if(G.gold<item.cost){showMsg('💰 金币不足！');return;}
  G.gold-=item.cost;
  G.shopItems.units.splice(idx,1);
  const activeCount=G.ownedUnits.filter(u=>u.active).length;
  const newUnit=addOwnedUnit(item.defId, activeCount<2?{r:6+activeCount,c:0}:null);
  if(!newUnit)return;
  // 检查是否有同名单位可合成
  const existing=G.ownedUnits.find(u=>u.instanceId!==newUnit.instanceId&&u.defId===newUnit.defId&&u.active);
  if(existing){
    mergeUnits(newUnit,existing);
    glog(`🛒 购买${UNIT_DEFS[item.defId].name}，自动合成！`);
  } else {
    // 上阵位满了放备战
    if(activeCount>=2) newUnit.active=false;
    glog(`🛒 购买${UNIT_DEFS[item.defId].name}${newUnit.active?'，上阵':'，放入备战'}`);
  }
  syncUnitsToHeroes();
  renderShop(); refreshUI();
}

function sellUnit(instanceId){
  if(G.phase!=='SHOP')return;
  const idx=G.ownedUnits.findIndex(u=>u.instanceId===instanceId);
  if(idx===-1)return;
  const unit=G.ownedUnits[idx];
  const refund=unit.level;
  G.gold+=refund;
  G.ownedUnits.splice(idx,1);
  glog(`💸 出售${UNIT_DEFS[unit.defId].name}，返还${refund}金币`);
  syncUnitsToHeroes();
  renderShop(); refreshUI();
}

function rollShop(){
  if(G.phase!=='SHOP')return;
  const cost=SHOP_PRICE_CONFIG.consumableBase.roll;
  if(G.gold<cost){showMsg(`💰 金币不足，刷新需要${cost}金币！`);return;}
  G.gold-=cost;
  G.shopFrozen={units:new Set(),consumables:new Set()};
  genShop();
  glog('🔄 商店已刷新！');
  renderShop();
}

function freezeShopItem(itemId, category){
  if(G.phase!=='SHOP')return;
  const set=G.shopFrozen[category];
  if(set.has(itemId)){set.delete(itemId);glog('❄️ 取消冻结');}
  else{set.add(itemId);glog('❄️ 已冻结（刷新时保留）');}
  renderShop();
}

function closeShop(){
  document.getElementById('so').style.display='none';
  G.shopFrozen={units:new Set(),consumables:new Set()};
  G.slots.forEach(s=>s.used=false);
  if(G.dayHalf===1){
    G.dayHalf=2;
    G.round=1; G.hitCount=0;
    spawnWaveForDay(G.day,'afternoon');
    G.phase='PLAYER';
    glog(`☀️ 第${G.day}天下午·更多怪物来袭！`);
  } else {
    G.day++;
    if(G.enemyCastle) G.enemyCastle.hp=G.enemyCastle.maxHp;
    if(G.day>10){
      G.runVictory=true;
      G.phase='OVER';
      glog('🏆 十天远征完成！');
      if(typeof showRunEnd==='function')showRunEnd();
      refreshUI();
      return;
    }
    if(G.day>5){
      G.wave++;
      G.dayHalf=0;
      G.round=1; G.hitCount=0;
      spawnWaveForDay(G.day,'morning');
      G.phase='PLAYER';
      glog(`⚔️ 第${G.day}天战斗开始！`);
      syncUnitsToHeroes();
      refreshUI();
      return;
    }
    G.dayHalf=0;
    G.wave++;
    G.round=1; G.hitCount=0;
    spawnWaveForDay(G.day,'morning');
    G.phase='PLAYER';
    glog(`⚔️ 第${G.day}天战斗开始！`);
  }
  syncUnitsToHeroes();
  refreshUI();
}

function ri(n){return Math.floor(Math.random()*n);}

// 旧接口别名（供 renderShop 和兼容）
function bname(el,sn,tier){const s=SD[sn];return`${EL[el]}·${s.n}格·${sn}号·${tier}阶`;}
function slotName(s){return bname(s.el,s.sn,s.tier);}

// ========== RENDERING ==========

// ─── Preview 计算层（只读 G，不创建 DOM）───

// ========== UI STUBS (implemented in ui.js) ==========
function glog(){}
function showMsg(){}
function showRunEnd(){}
function refreshUI(){}
function renderShop(){}
function render(){}
function scheduleDebugPanelUpdate(){}
function isDebugMode(){return false;}
function k(pos){return pos.r+','+pos.c;}
function buildRunEndVM(){return {title:'',sections:[]};}
function buildDebugPanelVM(){return {};}
