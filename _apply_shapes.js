// 原子性替换 SD + 全英雄 slot sn
// 策略：每个替换都是精确字符串匹配，全匹配才写回文件
const fs = require('fs');
let f = fs.readFileSync('index.html', 'utf8');

const steps = [];
let ok = true;

// ── 1. 替换整个 SD ──
{
  const old = `const SD = {
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
};`;

  const rep = `// 攻击形状库（12基础 + 4高级 = 16个）
// 坐标系：dir='right'为基准，rotCells 运行时旋转
// 设计：直线系 + 横扫系 + T系 + 方块系 + 远程系
const SD = {
   1: {cells:[[0,1]],                       name:'单点刺',    n:1, cat:'line'},       // A1
   2: {cells:[[0,1],[0,2]],                 name:'二连刺',    n:2, cat:'line'},       // A2
   3: {cells:[[0,1],[0,2],[0,3]],           name:'三连枪',    n:3, cat:'line'},       // A3
   4: {cells:[[0,1],[0,3]],                 name:'隔格枪',    n:2, cat:'line'},       // A4
   5: {cells:[[-1,1],[0,1],[1,1]],          name:'横扫三格',  n:3, cat:'sweep'},      // B1
   6: {cells:[[-2,1],[-1,1],[0,1],[1,1],[2,1]],name:'横扫五格',n:5, cat:'sweep'},    // B2
   7: {cells:[[-1,2],[0,2],[1,2]],          name:'前二横扫',  n:3, cat:'sweep'},      // B3
   8: {cells:[[-1,1],[0,1],[1,1],[-1,2],[0,2],[1,2]],name:'双横扫',n:6, cat:'sweep'},// B4
   9: {cells:[[0,2],[-1,1],[0,1],[1,1]],    name:'标准前置T', n:4, cat:'t_shape'},   // T1 ★默认
  10: {cells:[[0,2],[0,3],[-1,1],[0,1],[1,1]],name:'长柄T',  n:5, cat:'t_shape'},   // T2
  11: {cells:[[0,2],[-2,1],[-1,1],[0,1],[1,1],[2,1]],name:'宽头T',n:6, cat:'t_shape'},// T3
  12: {cells:[[-2,1],[-1,1],[0,1],[1,1],[2,1],[0,2]],name:'短柄宽T',n:6, cat:'t_shape'},// T4
  13: {cells:[[-1,2],[0,2],[-1,1],[0,1]],   name:'前方2×2',  n:4, cat:'square'},     // C1
  14: {cells:[[-1,1],[0,1],[-1,2],[0,2]],   name:'居中2×2',  n:4, cat:'square'},     // C2
  15: {cells:[[0,3]],                        name:'远程单点',  n:1, cat:'ranged'},     // D1
  16: {cells:[[-1,3],[0,3],[1,3]],           name:'远程横三',  n:3, cat:'ranged'},     // D2
  17: {cells:[[0,2],[-1,1],[0,1],[1,1],[-1,2],[0,2],[1,2]],name:'双层T',n:7, cat:'t_shape'},// T5
  18: {cells:[[-1,2],[0,2],[-1,3],[0,3]],    name:'远程2×2',  n:4, cat:'ranged'},     // D4
  19: {cells:[[0,2],[0,3],[-2,1],[-1,1],[0,1],[1,1],[2,1]],name:'大前置T',n:7,cat:'t_shape'},// T8
  20: {cells:[[-1,1],[0,1],[-1,2],[0,2],[-1,3],[0,3]],name:'前方3×2',n:6, cat:'square'},// C3
};`;

  if (f.includes(old)) { f = f.replace(old, rep); steps.push('SD ✓'); }
  else { console.error('SD MISMATCH'); ok = false; }
}

// ── 2. 替换 SHAPE_BIG_CROSS 常量 ──
{
  const old = `const SHAPE_BIG_CROSS = 12;
const TUTORIAL_DEFAULT_SLOT_SN = SHAPE_BIG_CROSS;`;
  const rep = `const SHAPE_T1 = 9;
const TUTORIAL_DEFAULT_SLOT_SN = SHAPE_T1;`;
  if (f.includes(old)) { f = f.replace(old, rep); steps.push('SHAPE_T1 ✓'); }
  else { console.error('SHAPE_BIG_CROSS MISMATCH'); ok = false; }
}

// ── 3. 逐英雄替换 ── 每个带精确 old→new

function replaceBlock(label, oldBlock, newBlock) {
  if (!f.includes(oldBlock)) {
    console.error(label + ' MISMATCH');
    ok = false;
  } else {
    f = f.replace(oldBlock, newBlock);
    steps.push(label + ' ✓');
  }
}

// fire_starter: 保留不改（A1,A2,A3 → A2,A3,B1 已经很合理）
replaceBlock('fire_starter L2-3',
`      2:{ hp:25, slots:[
        {el:'fire',sn:2,dir:'right',tier:2},{el:'fire',sn:2,dir:'right',tier:2},{el:'fire',sn:3,dir:'right',tier:2}
      ]},
      3:{ hp:30, slots:[
        {el:'fire',sn:2,dir:'right',tier:3},{el:'fire',sn:3,dir:'right',tier:3},{el:'fire',sn:5,dir:'right',tier:3}
      ]}`,
`      2:{ hp:25, slots:[
        {el:'fire',sn:2,dir:'right',tier:2},{el:'fire',sn:3,dir:'right',tier:2},{el:'fire',sn:3,dir:'right',tier:2}
      ]},
      3:{ hp:30, slots:[
        {el:'fire',sn:3,dir:'right',tier:3},{el:'fire',sn:5,dir:'right',tier:3},{el:'fire',sn:5,dir:'right',tier:3}
      ]}`
);

// water_droplet: 远程+A1→A2+C1→C1+C2
replaceBlock('water_droplet',
`  water_droplet: {
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
  },`,
`  water_droplet: {
    id:'water_droplet', name:'滴滴灵', element:'water', grade:'青铜', priceTier:1, tags:['水','后排','远程','输出','方块'], tier:1, cost:2,
    levels: {
      1:{ hp:20, slots:[
        {el:'water',sn:1,dir:'right',tier:1},{el:'water',sn:16,dir:'right',tier:1},{el:'water',sn:4,dir:'right',tier:1}
      ]},
      2:{ hp:25, slots:[
        {el:'water',sn:2,dir:'right',tier:2},{el:'water',sn:13,dir:'right',tier:2},{el:'water',sn:13,dir:'right',tier:2}
      ]},
      3:{ hp:30, slots:[
        {el:'water',sn:3,dir:'right',tier:3},{el:'water',sn:13,dir:'right',tier:3},{el:'water',sn:14,dir:'right',tier:3}
      ]}
    }
  },`
);

// wind_breeze: T1+T2+T1 → T1+T3+C3 → T5+T3+C3
replaceBlock('wind_breeze',
`  wind_breeze: {
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
  },`,
`  wind_breeze: {
    id:'wind_breeze', name:'十字使', element:'wind', grade:'青铜', priceTier:1, tags:['风','范围','T形','横扫'], tier:1, cost:3,
    levels: {
      1:{ hp:20, slots:[
        {el:'wind',sn:9,dir:'right',tier:1},{el:'wind',sn:10,dir:'right',tier:1},{el:'wind',sn:9,dir:'right',tier:1}
      ]},
      2:{ hp:25, slots:[
        {el:'wind',sn:9,dir:'right',tier:2},{el:'wind',sn:11,dir:'right',tier:2},{el:'wind',sn:20,dir:'right',tier:2}
      ]},
      3:{ hp:30, slots:[
        {el:'wind',sn:17,dir:'right',tier:3},{el:'wind',sn:11,dir:'right',tier:3},{el:'wind',sn:20,dir:'right',tier:3}
      ]}
    }
  },`
);

// earth_shield: 用 A2+A3 → A3+C1+C3 (格数不变，形状更直观)
replaceBlock('earth_shield',
`  earth_shield: {
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
  },`,
`  earth_shield: {
    id:'earth_shield', name:'岩岩灵', element:'earth', grade:'青铜', priceTier:3, tags:['土','前排','防御','方块'], tier:1, cost:3,
    levels: {
      1:{ hp:25, slots:[
        {el:'earth',sn:2,dir:'right',tier:1},{el:'earth',sn:3,dir:'right',tier:1},{el:'earth',sn:13,dir:'right',tier:1}
      ]},
      2:{ hp:30, slots:[
        {el:'earth',sn:3,dir:'right',tier:2},{el:'earth',sn:13,dir:'right',tier:2},{el:'earth',sn:20,dir:'right',tier:2}
      ]},
      3:{ hp:35, slots:[
        {el:'earth',sn:13,dir:'right',tier:3},{el:'earth',sn:20,dir:'right',tier:3},{el:'earth',sn:20,dir:'right',tier:3}
      ]}
    }
  },`
);

// balance: 多元素A1火+A1水+A3风
replaceBlock('balance',
`  balance: {
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
  },`,
`  balance: {
    id:'balance', name:'均衡灵', element:'fire', grade:'青铜', priceTier:1, tags:['火','水','风','灵活','多元素'], tier:1, cost:3,
    levels: {
      1:{ hp:20, slots:[
        {el:'fire',sn:1,dir:'right',tier:1},{el:'water',sn:1,dir:'right',tier:1},{el:'wind',sn:3,dir:'right',tier:1}
      ]},
      2:{ hp:25, slots:[
        {el:'fire',sn:2,dir:'right',tier:2},{el:'water',sn:2,dir:'right',tier:2},{el:'wind',sn:9,dir:'right',tier:2}
      ]},
      3:{ hp:30, slots:[
        {el:'fire',sn:3,dir:'right',tier:3},{el:'water',sn:13,dir:'right',tier:3},{el:'wind',sn:17,dir:'right',tier:3}
      ]}
    }
  },`
);

// ember: A1+A2+T1 → A2+三连枪+T5
replaceBlock('ember',
`  ember: {
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
  },`,
`  ember: {
    id:'ember', name:'余烬灵', element:'fire', grade:'青铜', priceTier:1, tags:['火','输出','精准'], tier:1, cost:2,
    levels: {
      1:{ hp:20, slots:[
        {el:'fire',sn:1,dir:'right',tier:1},{el:'fire',sn:2,dir:'right',tier:1},{el:'fire',sn:9,dir:'right',tier:1}
      ]},
      2:{ hp:23, slots:[
        {el:'fire',sn:2,dir:'right',tier:2},{el:'fire',sn:3,dir:'right',tier:2},{el:'fire',sn:9,dir:'right',tier:2}
      ]},
      3:{ hp:28, slots:[
        {el:'fire',sn:3,dir:'right',tier:3},{el:'fire',sn:5,dir:'right',tier:3},{el:'fire',sn:17,dir:'right',tier:3}
      ]}
    }
  },`
);

// T2 heroes...
// fire_blaze: B1+宽头T+短柄宽T → B2+宽头T+T5
replaceBlock('fire_blaze',
`  fire_blaze: {
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
  },`,
`  fire_blaze: {
    id:'fire_blaze', name:'烈焰使', element:'fire', tier:2, cost:3,
    levels: {
      1:{ hp:22, slots:[
        {el:'fire',sn:6,dir:'right',tier:2},{el:'fire',sn:11,dir:'right',tier:2},{el:'fire',sn:12,dir:'right',tier:2}
      ]},
      2:{ hp:28, slots:[
        {el:'fire',sn:6,dir:'right',tier:3},{el:'fire',sn:11,dir:'right',tier:3},{el:'fire',sn:17,dir:'right',tier:3}
      ]},
      3:{ hp:35, slots:[
        {el:'fire',sn:19,dir:'right',tier:4},{el:'fire',sn:11,dir:'right',tier:4},{el:'fire',sn:17,dir:'right',tier:4}
      ]}
    }
  },`
);

// water_torrent: C1+C2→ B1+C1→ C3+D4
replaceBlock('water_torrent',
`  water_torrent: {
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
  },`,
`  water_torrent: {
    id:'water_torrent', name:'洪流使', element:'water', tier:2, cost:4,
    levels: {
      1:{ hp:22, slots:[
        {el:'water',sn:13,dir:'right',tier:2},{el:'water',sn:14,dir:'right',tier:2},{el:'water',sn:7,dir:'right',tier:2}
      ]},
      2:{ hp:28, slots:[
        {el:'water',sn:5,dir:'right',tier:3},{el:'water',sn:13,dir:'right',tier:3},{el:'water',sn:8,dir:'right',tier:3}
      ]},
      3:{ hp:35, slots:[
        {el:'water',sn:20,dir:'right',tier:4},{el:'water',sn:18,dir:'right',tier:4},{el:'water',sn:8,dir:'right',tier:4}
      ]}
    }
  },`
);

// wind_storm: T2+T1+D2 → T2+横扫三格+双层T → 大前置T+T5+B2
replaceBlock('wind_storm',
`  wind_storm: {
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
  },`,
`  wind_storm: {
    id:'wind_storm', name:'飓风使', element:'wind', tier:2, cost:3,
    levels: {
      1:{ hp:20, slots:[
        {el:'wind',sn:10,dir:'right',tier:2},{el:'wind',sn:5,dir:'right',tier:2},{el:'wind',sn:17,dir:'right',tier:2}
      ]},
      2:{ hp:25, slots:[
        {el:'wind',sn:10,dir:'right',tier:3},{el:'wind',sn:5,dir:'right',tier:3},{el:'wind',sn:17,dir:'right',tier:3}
      ]},
      3:{ hp:30, slots:[
        {el:'wind',sn:19,dir:'right',tier:4},{el:'wind',sn:6,dir:'right',tier:4},{el:'wind',sn:17,dir:'right',tier:4}
      ]}
    }
  },`
);

// earth_mountain: T2+T3+C1→T3+C1+C2→T5+C3+T8
replaceBlock('earth_mountain',
`  earth_mountain: {
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
  },`,
`  earth_mountain: {
    id:'earth_mountain', name:'山岭使', element:'earth', tier:2, cost:4,
    levels: {
      1:{ hp:28, slots:[
        {el:'earth',sn:10,dir:'right',tier:2},{el:'earth',sn:11,dir:'right',tier:2},{el:'earth',sn:13,dir:'right',tier:2}
      ]},
      2:{ hp:35, slots:[
        {el:'earth',sn:11,dir:'right',tier:3},{el:'earth',sn:13,dir:'right',tier:3},{el:'earth',sn:14,dir:'right',tier:3}
      ]},
      3:{ hp:42, slots:[
        {el:'earth',sn:17,dir:'right',tier:4},{el:'earth',sn:20,dir:'right',tier:4},{el:'earth',sn:19,dir:'right',tier:4}
      ]}
    }
  },`
);

// 特殊单位：sn:12→9(T1), sn:12→11(T3), sn:12→17(T5)
// fire_mouse 已经是好值，但 L1 sn:9 已经存在（之前改的）
// firecracker 同上

// --- 后续特殊英雄的替换 ---
// 这些英雄仍然使用旧的 sn 号，需要逐个替换

// spring_sprite heal: L1 12→9, L2 12→11, L3 12→17; water sn:4→16, sn:6→13
replaceBlock('spring_sprite',
`  spring_sprite: {
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
  },`,
`  spring_sprite: {
    id:'spring_sprite', name:'泉泉灵', element:'water', grade:'青铜', priceTier:1, tags:['水','治疗','召唤'], tier:1, cost:2,
    passive:{type:'healAmpBonus',bonusByLevel:[1,1,2]},
    levels: {
      1:{ hp:18, slots:[
        {skill:'healSummons', sn:9, dir:'right', tier:1},
        {el:'water', sn:1, dir:'right', tier:1},
        {el:'water', sn:16, dir:'right', tier:1},
      ]},
      2:{ hp:24, slots:[
        {skill:'healSummons', sn:11, dir:'right', tier:2},
        {el:'water', sn:2, dir:'right', tier:2},
        {el:'water', sn:13, dir:'right', tier:2},
      ]},
      3:{ hp:30, slots:[
        {skill:'healSummons', sn:17, dir:'right', tier:3},
        {el:'water', sn:3, dir:'right', tier:3},
        {el:'water', sn:13, dir:'right', tier:3},
      ]}
    }
  },`
);

// bubble_sprite: sn:6→5(B1), sn:6→13(C1), sn:12→9/11/17
replaceBlock('bubble_sprite',
`  bubble_sprite: {
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
  },`,
`  bubble_sprite: {
    id:'bubble_sprite', name:'泡泡灵', element:'water', grade:'青铜', priceTier:1, tags:['水','范围','横扫'], tier:1, cost:2,
    levels: {
      1:{ hp:20, slots:[
        {el:'water', sn:5,dir:'right',tier:1},{el:'water', sn:5,dir:'right',tier:1},{el:'water', sn:9,dir:'right',tier:1}
      ]},
      2:{ hp:25, slots:[
        {el:'water', sn:5,dir:'right',tier:2},{el:'water', sn:13,dir:'right',tier:2},{el:'water', sn:11,dir:'right',tier:2}
      ]},
      3:{ hp:30, slots:[
        {el:'water', sn:13,dir:'right',tier:3},{el:'water', sn:11,dir:'right',tier:3},{el:'water', sn:17,dir:'right',tier:3}
      ]}
    }
  },`
);

// pebble_guard: A2+C1+C2→A3+C1+C3→C1+C3+T5
replaceBlock('pebble_guard',
`  pebble_guard: {
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
  },`,
`  pebble_guard: {
    id:'pebble_guard', name:'岩岩灵', element:'earth', grade:'青铜', priceTier:2, tags:['土','前排','防御','挡路','方块'], tier:1, cost:3,
    passive:{type:'castleReduce',reductionByLevel:[1,1,2]},
    levels: {
      1:{ hp:30, slots:[
        {el:'earth',sn:2,dir:'right',tier:1},{el:'earth',sn:13,dir:'right',tier:1},{el:'earth',sn:14,dir:'right',tier:1}
      ]},
      2:{ hp:45, slots:[
        {el:'earth',sn:3,dir:'right',tier:2},{el:'earth',sn:13,dir:'right',tier:2},{el:'earth',sn:20,dir:'right',tier:2}
      ]},
      3:{ hp:60, slots:[
        {el:'earth',sn:13,dir:'right',tier:3},{el:'earth',sn:20,dir:'right',tier:3},{el:'earth',sn:17,dir:'right',tier:3}
      ]}
    }
  },`
);

// fluff_speaker: heal 12→9/11/17, sn:4→16, sn:6→18/13
replaceBlock('fluff_speaker',
`  fluff_speaker: {
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
  },`,
`  fluff_speaker: {
    id:'fluff_speaker', name:'绒语灵', element:'water', grade:'白银', priceTier:2, tags:['召唤','后排','辅助','增益'], tier:1, cost:4,
    passive:{type:'buffAllSummons',hpByLevel:[2,4,6],atkByLevel:[1,1,2]},
    levels: {
      1:{ hp:16, slots:[
        {skill:'healSummons', sn:9, dir:'right', tier:1},
        {el:'water', sn:1, dir:'right', tier:1},
        {el:'water', sn:16, dir:'right', tier:1},
      ]},
      2:{ hp:24, slots:[
        {skill:'healSummons', sn:11, dir:'right', tier:2},
        {el:'water', sn:2, dir:'right', tier:2},
        {el:'water', sn:18, dir:'right', tier:2},
      ]},
      3:{ hp:32, slots:[
        {skill:'healSummons', sn:17, dir:'right', tier:3},
        {el:'water', sn:3, dir:'right', tier:3},
        {el:'water', sn:13, dir:'right', tier:3},
      ]}
    }
  },`
);

// boom_sprite: sn:12→9/11/17
replaceBlock('boom_sprite',
`  boom_sprite: {
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
  },`,
`  boom_sprite: {
    id:'boom_sprite', name:'爆爆灵', element:'fire', grade:'白银', priceTier:2, tags:['召唤','死亡收益','火','铺元素','T形'], tier:1, cost:4,
    passive:{type:'onSummonDeath',el:'fire',layersByLevel:[2,3,4]},
    levels: {
      1:{ hp:16, slots:[
        {el:'fire',sn:1,dir:'right',tier:1},{el:'fire',sn:2,dir:'right',tier:1},{el:'fire',sn:9,dir:'right',tier:1}
      ]},
      2:{ hp:24, slots:[
        {el:'fire',sn:2,dir:'right',tier:2},{el:'fire',sn:3,dir:'right',tier:2},{el:'fire',sn:11,dir:'right',tier:2}
      ]},
      3:{ hp:32, slots:[
        {el:'fire',sn:3,dir:'right',tier:3},{el:'fire',sn:5,dir:'right',tier:3},{el:'fire',sn:17,dir:'right',tier:3}
      ]}
    }
  },`
);

// ember_seed L3 sn:12→9
replaceBlock('ember_seed',
`  ember_seed: {
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
  },`,
`  ember_seed: {
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
        {el:'fire', sn:9, dir:'right', tier:3},
      ]}
    }
  },`
);

// breeze_sprite: sn:7→5(B1)→13(C1)→17(T5), sn:10→10(T2), sn:12→11/18/19
replaceBlock('breeze_sprite',
`  breeze_sprite: {
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
  },`,
`  breeze_sprite: {
    id:'breeze_sprite', name:'风风灵', element:'wind', grade:'白银', priceTier:2, tags:['风','侧击','机动','清散怪'], tier:1, cost:4,
    passive:{type:'advHitBonus',bonusByLevel:[1,2,3]},
    levels: {
      1:{ hp:18, slots:[
        {el:'wind',sn:5,dir:'right',tier:1},{el:'wind',sn:5,dir:'right',tier:1},{el:'wind',sn:10,dir:'right',tier:1}
      ]},
      2:{ hp:27, slots:[
        {el:'wind',sn:13,dir:'right',tier:2},{el:'wind',sn:10,dir:'right',tier:2},{el:'wind',sn:11,dir:'right',tier:2}
      ]},
      3:{ hp:36, slots:[
        {el:'wind',sn:17,dir:'right',tier:3},{el:'wind',sn:18,dir:'right',tier:3},{el:'wind',sn:19,dir:'right',tier:3}
      ]}
    }
  },`
);

// forge_fire: sn:12→9/11/无需(já 用了), L3保留19,20格式
replaceBlock('forge_fire',
`  forge_fire: {
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
  },`,
`  forge_fire: {
    id:'forge_fire', name:'锻火灵', element:'fire', grade:'黄金', priceTier:1, tags:['火','黄金','铺火','输出'], tier:3, cost:6,
    passive:{type:'addElementOnHit',el:'fire',layers:1},
    levels: {
      1:{ hp:34, slots:[
        {el:'fire',sn:5,dir:'right',tier:3},{el:'fire',sn:9,dir:'right',tier:3},{el:'fire',sn:17,dir:'right',tier:3}
      ]},
      2:{ hp:44, slots:[
        {el:'fire',sn:10,dir:'right',tier:4},{el:'fire',sn:11,dir:'right',tier:4},{el:'fire',sn:17,dir:'right',tier:4}
      ]},
      3:{ hp:56, slots:[
        {el:'fire',sn:19,dir:'right',tier:4},{el:'fire',sn:20,dir:'right',tier:4},{el:'fire',sn:11,dir:'right',tier:4}
      ]}
    }
  },`
);

// command_sprout: heal 12→9/11/17, water sn:6→13
replaceBlock('command_sprout',
`  command_sprout: {
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
  },`,
`  command_sprout: {
    id:'command_sprout', name:'令芽灵', element:'water', grade:'黄金', priceTier:1, tags:['召唤','黄金','增益'], tier:3, cost:6,
    passive:{type:'buffAllSummons',hpByLevel:[2,4,6],atkByLevel:[1,2,3]},
    levels: {
      1:{ hp:30, slots:[
        {skill:'summonFromCell',sn:2,dir:'right',tier:3,consumeLayers:false,count:2,bonusHp:2},
        {skill:'healSummons',sn:9,dir:'right',tier:3},
        {el:'water',sn:13,dir:'right',tier:3},
      ]},
      2:{ hp:40, slots:[
        {skill:'summonFromCell',sn:3,dir:'right',tier:4,consumeLayers:false,count:2,bonusHp:4},
        {skill:'healSummons',sn:11,dir:'right',tier:4},
        {el:'water',sn:13,dir:'right',tier:4},
      ]},
      3:{ hp:52, slots:[
        {skill:'summonFromCell',sn:5,dir:'right',tier:4,consumeLayers:false,count:3,bonusHp:6},
        {skill:'healSummons',sn:17,dir:'right',tier:4},
        {el:'water',sn:19,dir:'right',tier:4},
      ]}
    }
  },`
);

// dragon_flame: sn:12→9/11/17
replaceBlock('dragon_flame',
`  dragon_flame: {
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
  },`,
`  dragon_flame: {
    id:'dragon_flame', name:'龙焰灵', element:'fire', grade:'钻石', priceTier:1, tags:['火','钻石','终局','引爆'], tier:4, cost:8,
    passive:{type:'spaceExplosionBonus',bonusByLevel:[2,3,4]},
    levels: {
      1:{ hp:42, slots:[
        {el:'fire',sn:10,dir:'right',tier:4},{el:'fire',sn:9,dir:'right',tier:4},{el:'fire',sn:19,dir:'right',tier:4}
      ]},
      2:{ hp:55, slots:[
        {el:'fire',sn:11,dir:'right',tier:4,layers:2},{el:'fire',sn:19,dir:'right',tier:4},{el:'fire',sn:20,dir:'right',tier:4}
      ]},
      3:{ hp:70, slots:[
        {el:'fire',sn:17,dir:'right',tier:4,layers:3},{el:'fire',sn:19,dir:'right',tier:4,layers:2},{el:'fire',sn:20,dir:'right',tier:4}
      ]}
    }
  },`
);

// prime_sprout: heal 12→9/11/17, water sn:20→20(keep)
replaceBlock('prime_sprout',
`  prime_sprout: {
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
  },`,
`  prime_sprout: {
    id:'prime_sprout', name:'主芽灵', element:'water', grade:'钻石', priceTier:1, tags:['召唤','钻石','终局'], tier:4, cost:8,
    passive:{type:'splitSproutSummon',countByLevel:[2,3,4],hpMulByLevel:[1,1,1]},
    levels: {
      1:{ hp:40, slots:[
        {skill:'summonFromCell',sn:3,dir:'right',tier:4,consumeLayers:false,count:2,bonusHp:4},
        {skill:'healSummons',sn:9,dir:'right',tier:4},
        {el:'water',sn:19,dir:'right',tier:4},
      ]},
      2:{ hp:52, slots:[
        {skill:'summonFromCell',sn:5,dir:'right',tier:4,consumeLayers:false,count:3,bonusHp:6},
        {skill:'healSummons',sn:11,dir:'right',tier:4},
        {el:'water',sn:20,dir:'right',tier:4},
      ]},
      3:{ hp:66, slots:[
        {skill:'summonFromCell',sn:12,dir:'right',tier:4,consumeLayers:false,count:4,bonusHp:8},
        {skill:'healSummons',sn:17,dir:'right',tier:4},
        {el:'water',sn:20,dir:'right',tier:4,layers:2},
      ]}
    }
  },`
);

// fire_demon 保留不改（测试用fire_demon tag没用到? 但有 fire_demon 定义在 UNIT_DEFS里）

// ── 写回 ──
if (ok) {
  fs.writeFileSync('index.html', f, 'utf8');
  console.log('ALL OK:', steps.length, 'steps');
  steps.forEach(s => console.log(' ', s));
} else {
  console.error('ABORTED due to mismatches');
}
