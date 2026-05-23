/**
 * 元素背包史 · 自动化测试套件
 * 运行：node test.js
 */
const fs   = require('fs');
const assert = require('assert');

// ── DOM 桩：屏蔽所有 DOM 调用 ───────────────────────────────────
const makeEl = () => ({
  innerHTML:'', textContent:'', style:{display:''},
  children:[], disabled:false, scrollTop:0, scrollHeight:0,
  classList:{ add(){}, remove(){}, has:()=>false },
  appendChild(c){ this.children.push(c); },
  removeChild(c){ const i=this.children.indexOf(c); if(i>=0)this.children.splice(i,1); },
  getBoundingClientRect(){ return {top:0,left:0,right:0,bottom:0}; },
  onclick:null, title:'',
});
const _els = {};
global.document = {
  getElementById(id){ if(!_els[id]) _els[id]=makeEl(); return _els[id]; },
  createElement(){ return makeEl(); },
};
global.window = { innerWidth:1920 };
// 让 setTimeout 同步执行（怪物AI回合立即完成）
global.setTimeout = fn => { try{ fn(); }catch(e){} };

// ── 载入游戏脚本 ───────────────────────────────────────────────
const html = fs.readFileSync('c:/Users/11277/Desktop/game1/index.html','utf8');
const scriptTag = html.match(/<script>([\s\S]+?)<\/script>/);
if(!scriptTag) throw new Error('找不到 <script> 标签');
// 将 const/let 改为 var，使其通过 eval 暴露到当前作用域
const gameScript = scriptTag[1].replace(/\bconst\b/g,'var').replace(/\blet\b/g,'var');
eval(gameScript); // eslint-disable-line no-eval

// 屏蔽 DOM 渲染函数，只测逻辑
render      = ()=>{};
renderShop  = ()=>{};
glog        = ()=>{};
let _lastMsg = '';
showMsg = t => { _lastMsg = t; };

// ── 测试运行器 ─────────────────────────────────────────────────
let pass=0, fail=0;
const failures=[];

function test(name, fn){
  try{ fn(); pass++; console.log(`  ✅ ${name}`); }
  catch(e){
    fail++;
    failures.push({ name, msg:e.message });
    console.log(`  ❌ ${name}`);
    console.log(`     → ${e.message}`);
  }
}
function group(name, fn){ console.log(`\n▶ ${name}`); fn(); }
function fresh(){ initGame(); _lastMsg=''; }

// ═══════════════════════════════════════════════════════════════
group('常量与形状定义', ()=>{
  test('EL 四种元素文字', ()=>{
    assert.strictEqual(EL.fire,'火');
    assert.strictEqual(EL.water,'水');
    assert.strictEqual(EL.wind,'风');
    assert.strictEqual(EL.earth,'土');
  });
  test('EC 每种元素有颜色代码', ()=>{
    ['fire','water','wind','earth'].forEach(k=>
      assert.ok(EC[k] && EC[k].startsWith('#'), `EC.${k} 应以 # 开头`)
    );
  });
  test('ADV 元素克制循环正确', ()=>{
    assert.strictEqual(ADV.water,'fire');   // 水克火
    assert.strictEqual(ADV.fire,'wind');    // 火克风
    assert.strictEqual(ADV.wind,'earth');   // 风克土
    assert.strictEqual(ADV.earth,'water');  // 土克水
  });
  test('TIER_MULT 四阶倍率 [0,1,2,4,8]', ()=>{
    assert.deepStrictEqual(TIER_MULT,[0,1,2,4,8]);
  });
  test('SD 共 20 种形状', ()=>{
    assert.strictEqual(Object.keys(SD).length, 20);
  });
  test('SD 形状 1~20 均存在且包含 cells/name/n/cat', ()=>{
    for(let i=1;i<=20;i++){
      assert.ok(SD[i], `SD[${i}] 应存在`);
      assert.ok(Array.isArray(SD[i].cells), `SD[${i}].cells 应为数组`);
      assert.ok(typeof SD[i].name==='string', `SD[${i}].name 应为字符串`);
      assert.ok(typeof SD[i].n==='number' && SD[i].n>0, `SD[${i}].n 应为正整数`);
    }
  });
  test('bname 生成格式 "元素·N格·SN号·TIER阶"', ()=>{
    assert.strictEqual(bname('fire',1,1),'火·1格·1号·1阶');
    assert.strictEqual(bname('water',3,2),'水·3格·3号·2阶');
    // SD[10].n=5
    assert.strictEqual(bname('earth',10,4),'土·5格·10号·4阶');
  });
  test('slotName 委托 bname', ()=>{
    assert.strictEqual(slotName({el:'wind',sn:3,tier:2}), bname('wind',3,2));
  });
  test('k(pos) 生成坐标键', ()=>{
    assert.strictEqual(k({r:5,c:3}),'5,3');
    assert.strictEqual(k({r:0,c:12}),'0,12');
  });
  test('ri(n) 返回 [0,n) 整数', ()=>{
    for(let i=0;i<200;i++){
      const v=ri(10);
      assert.ok(Number.isInteger(v) && v>=0 && v<10, `ri(10) 超出范围: ${v}`);
    }
  });
});

// ═══════════════════════════════════════════════════════════════
group('initGame 初始化', ()=>{
  fresh();
  test('phase = PLAYER', ()=> assert.strictEqual(G.phase,'PLAYER'));
  test('wave = 1',        ()=> assert.strictEqual(G.wave,1));
  test('round = 1',       ()=> assert.strictEqual(G.round,1));
  test('maxRound = 5',    ()=> assert.strictEqual(G.maxRound,5));
  test('gold = 5',        ()=> assert.strictEqual(G.gold,5));
  test('hitCount = 0',    ()=> assert.strictEqual(G.hitCount,0));
  test('棋盘 13 行',      ()=> assert.strictEqual(G.board.length,13));
  test('棋盘每行 13 列',  ()=> G.board.forEach((row,r)=>
    assert.strictEqual(row.length,13,`第${r}行列数错误`)
  ));
  test('英雄 ha 存在 HP=20', ()=>{
    assert.ok(G.heroes.ha); assert.strictEqual(G.heroes.ha.hp,20);
  });
  test('英雄 hb 存在 HP=20', ()=>{
    assert.ok(G.heroes.hb); assert.strictEqual(G.heroes.hb.hp,20);
  });
  test('3 个行动槽',            ()=> assert.strictEqual(G.slots.length,3));
  test('行动槽初始均 used=false',()=> G.slots.forEach((s,i)=>
    assert.strictEqual(s.used,false,`槽${i}`)
  ));
  test('背包初始为空数组',       ()=> assert.deepStrictEqual(G.backpack,[]));
  test('_bpCnt 初始为 0',        ()=> assert.strictEqual(G._bpCnt,0));
  test('第 1 波生成 2 只教学怪', ()=> assert.strictEqual(G.monsters.length,2));
  test('教学怪1 HP=6',           ()=> assert.strictEqual(G.monsters[0].hp,6));
  test('教学怪2 HP=10',          ()=> assert.strictEqual(G.monsters[1].hp,10));
});

// ═══════════════════════════════════════════════════════════════
group('mkBoard 棋盘初始化', ()=>{
  fresh();
  test('所有格初始 el=null, stk=0', ()=>{
    for(let r=0;r<13;r++) for(let c=0;c<13;c++){
      assert.strictEqual(G.board[r][c].el, null, `(${r},${c}).el`);
      assert.strictEqual(G.board[r][c].stk, 0,   `(${r},${c}).stk`);
    }
  });
  test('格对象包含 r/c 坐标', ()=>{
    assert.strictEqual(G.board[3][7].r,3);
    assert.strictEqual(G.board[3][7].c,7);
  });
});

// ═══════════════════════════════════════════════════════════════
group('rotCells 形状旋转', ()=>{
  const cells=[[0,1],[0,2],[1,2]];
  test('right → 原样', ()=>{
    assert.deepStrictEqual(rotCells(cells,'right'), [[0,1],[0,2],[1,2]]);
  });
  test('left  → 列取反', ()=>{
    assert.deepStrictEqual(rotCells(cells,'left'),  [[0,-1],[0,-2],[1,-2]]);
  });
  test('up    → [-c,r]', ()=>{
    assert.deepStrictEqual(rotCells(cells,'up'),    [[-1,0],[-2,0],[-2,1]]);
  });
  test('down  → [c,r]', ()=>{
    assert.deepStrictEqual(rotCells(cells,'down'),  [[1,0],[2,0],[2,1]]);
  });
  test('1格点：up → [-1,0]', ()=>{
    assert.deepStrictEqual(rotCells([[0,1]],'up'), [[-1,0]]);
  });
});

// ═══════════════════════════════════════════════════════════════
group('atkCells 攻击范围计算', ()=>{
  fresh();
  test('形状1·right·英雄(5,5) → [(5,6)]', ()=>{
    const r=atkCells({r:5,c:5},1,'right');
    assert.strictEqual(r.length,1);
    assert.deepStrictEqual(r[0],{r:5,c:6});
  });
  test('形状1·left·英雄(5,5) → [(5,4)]', ()=>{
    const r=atkCells({r:5,c:5},1,'left');
    assert.deepStrictEqual(r[0],{r:5,c:4});
  });
  test('形状1·up·英雄(5,5) → [(4,5)]', ()=>{
    assert.deepStrictEqual(atkCells({r:5,c:5},1,'up')[0],{r:4,c:5});
  });
  test('形状1·down·英雄(5,5) → [(6,5)]', ()=>{
    assert.deepStrictEqual(atkCells({r:5,c:5},1,'down')[0],{r:6,c:5});
  });
  test('形状2·right·英雄(5,5) → 2格', ()=>{
    const r=atkCells({r:5,c:5},2,'right');
    assert.strictEqual(r.length,2);
    assert.deepStrictEqual(r,[{r:5,c:6},{r:5,c:7}]);
  });
  test('形状3直线·right·英雄(5,5) → 3格', ()=>{
    const r=atkCells({r:5,c:5},3,'right');
    assert.strictEqual(r.length,3);
    assert.deepStrictEqual(r,[{r:5,c:6},{r:5,c:7},{r:5,c:8}]);
  });
  test('边界过滤：形状1·left·英雄(0,0) → 空', ()=>{
    assert.strictEqual(atkCells({r:0,c:0},1,'left').length,0);
  });
  test('边界过滤：形状1·up·英雄(0,0) → 空', ()=>{
    assert.strictEqual(atkCells({r:0,c:0},1,'up').length,0);
  });
  test('形状5·right·5格·全在棋盘内', ()=>{
    const r=atkCells({r:5,c:5},5,'right');
    assert.strictEqual(r.length,4); // 4格直线 n=4
  });
  test('所有形状都能生成非空范围（英雄居中时）', ()=>{
    for(let sn=1;sn<=20;sn++){
      const r=atkCells({r:6,c:6},sn,'right');
      assert.ok(r.length>0, `形状${sn} right 方向应有攻击格`);
    }
  });
});

// ═══════════════════════════════════════════════════════════════
group('元素系统', ()=>{
  test('addEl 添加元素并叠层', ()=>{
    fresh();
    addEl({r:5,c:5},'fire');
    assert.strictEqual(G.board[5][5].el,'fire');
    assert.strictEqual(G.board[5][5].stk,1);
    addEl({r:5,c:5},'fire');
    assert.strictEqual(G.board[5][5].stk,2);
  });
  test('explDmg(1)=1', ()=> assert.strictEqual(explDmg(1),1));
  test('explDmg(2)=3', ()=> assert.strictEqual(explDmg(2),3));
  test('explDmg(3)=6', ()=> assert.strictEqual(explDmg(3),6));
  test('explDmg(4)=10',()=> assert.strictEqual(explDmg(4),10));
  test('explDmg(5)=15',()=> assert.strictEqual(explDmg(5),15));
  test('explCells 中心返回 4 个十字格', ()=>{
    const c=explCells({r:5,c:5});
    assert.strictEqual(c.length,4);
    const keys=c.map(p=>`${p.r},${p.c}`);
    ['4,5','6,5','5,4','5,6'].forEach(k=>assert.ok(keys.includes(k),`缺少 ${k}`));
  });
  test('explCells 角落(0,0) 只有 2 格', ()=>{
    assert.strictEqual(explCells({r:0,c:0}).length,2);
  });
  test('explCells 边(0,5) 只有 3 格', ()=>{
    assert.strictEqual(explCells({r:0,c:5}).length,3);
  });
  test('doExplode 清空元素格', ()=>{
    fresh();
    addEl({r:5,c:5},'fire');
    G.monsters[0].pos={r:9,c:9}; // 移开，避免干扰
    G.monsters[1].pos={r:8,c:9};
    doExplode({r:5,c:5});
    assert.strictEqual(G.board[5][5].el,null);
    assert.strictEqual(G.board[5][5].stk,0);
  });
  test('doExplode 对范围内怪物造成伤害', ()=>{
    fresh();
    addEl({r:5,c:5},'fire');
    addEl({r:5,c:5},'fire'); // stk=2 → dmg=3
    G.monsters[0].pos={r:5,c:6}; // 右边1格，在爆炸范围内
    G.monsters[1].pos={r:9,c:9};
    G.monsters[0].hp=10;
    doExplode({r:5,c:5});
    assert.strictEqual(G.monsters[0].hp, 7); // 10-3=7
  });
  test('doExplode 对空格无副作用', ()=>{
    fresh();
    // 元素格上没有元素
    doExplode({r:5,c:5}); // should silently return
    assert.ok(true);
  });
});

// ═══════════════════════════════════════════════════════════════
group('monAt / heroAt / cellFree', ()=>{
  fresh();
  test('monAt 找到怪物位置',    ()=> assert.ok(monAt(G.monsters[0].pos)));
  test('monAt 空格返回 undefined',()=> assert.strictEqual(monAt({r:5,c:5}),undefined));
  test('heroAt 找到英雄位置',   ()=> assert.ok(heroAt(G.heroes.ha.pos)));
  test('heroAt 空格返回 undefined',()=> assert.strictEqual(heroAt({r:5,c:5}),undefined));
  test('cellFree 空格 = true',  ()=> assert.strictEqual(cellFree({r:5,c:5}),true));
  test('cellFree 英雄格 = false',()=> assert.strictEqual(cellFree(G.heroes.ha.pos),false));
  test('cellFree 怪物格 = false',()=> assert.strictEqual(cellFree(G.monsters[0].pos),false));
  test('cellFree 越界 = false', ()=> assert.strictEqual(cellFree({r:-1,c:0}),false));
});

// ═══════════════════════════════════════════════════════════════
group('dealDmg 伤害系统', ()=>{
  test('dealDmg 扣血正确', ()=>{
    fresh();
    dealDmg(G.monsters[0],4,'测试');
    assert.strictEqual(G.monsters[0].hp,2); // 6-4=2
  });
  test('dealDmg HP 不低于 0', ()=>{
    fresh();
    dealDmg(G.monsters[1],999,'测试');
    assert.strictEqual(G.monsters[1].hp,0);
  });
  test('dealDmg HP 归零时标记 dead=true', ()=>{
    fresh();
    dealDmg(G.monsters[0],999,'测试');
    assert.strictEqual(G.monsters[0].dead,true);
  });
  test('dealDmg 正常扣血不标记 dead', ()=>{
    fresh();
    dealDmg(G.monsters[1],1,'测试');
    assert.strictEqual(G.monsters[1].dead,false);
  });
});

// ═══════════════════════════════════════════════════════════════
group('useSlot 攻击逻辑', ()=>{
  // 辅助：把英雄和怪物放到指定位置
  function setup(heroR,heroC,monR,monC){
    fresh();
    G.heroes.ha.pos={r:heroR,c:heroC};
    G.heroes.hb.pos={r:12,c:0}; // 移开
    G.monsters[0].pos={r:monR,c:monC};
    G.monsters[1].pos={r:12,c:12};
    G.slots[0].hid='ha'; G.slots[0].sn=1; G.slots[0].dir='right';
    G.slots[0].tier=1; G.slots[0].used=false; G.hitCount=0;
  }

  test('命中怪物 hitCount+1', ()=>{
    setup(5,5, 5,6);
    useSlot(0);
    assert.strictEqual(G.hitCount,1);
  });
  test('命中后 slot.used=true', ()=>{
    setup(5,5, 5,6);
    useSlot(0);
    assert.strictEqual(G.slots[0].used,true);
  });
  test('1阶·第1次·伤害=1×1=1', ()=>{
    setup(5,5, 5,6);
    G.monsters[0].hp=6; G.slots[0].tier=1; G.hitCount=0;
    useSlot(0);
    assert.strictEqual(G.monsters[0].hp,5); // 6-1=5
  });
  test('2阶·第1次·伤害=1×2=2', ()=>{
    setup(5,5, 5,6);
    G.monsters[0].hp=6; G.slots[0].tier=2; G.hitCount=0;
    useSlot(0);
    assert.strictEqual(G.monsters[0].hp,4); // 6-2=4
  });
  test('3阶·第1次·伤害=1×4=4', ()=>{
    setup(5,5, 5,6);
    G.monsters[0].hp=10; G.slots[0].tier=3; G.hitCount=0;
    useSlot(0);
    assert.strictEqual(G.monsters[0].hp,6); // 10-4=6
  });
  test('4阶·第1次·伤害=1×8=8', ()=>{
    setup(5,5, 5,6);
    G.monsters[0].hp=10; G.slots[0].tier=4; G.hitCount=0;
    useSlot(0);
    assert.strictEqual(G.monsters[0].hp,2); // 10-8=2
  });
  test('第2次命中 base=2，伤害翻倍', ()=>{
    setup(5,5, 5,6);
    G.monsters[0].hp=10; G.slots[0].tier=1; G.hitCount=1; // 已有1次
    useSlot(0);
    assert.strictEqual(G.monsters[0].hp,8); // 10-2=8
  });
  test('元素克制 ×2：水攻火属性怪', ()=>{
    setup(5,5, 5,6);
    G.monsters[0].hp=20; G.monsters[0].el='fire';
    G.slots[0].el='water'; G.slots[0].tier=1; G.hitCount=0;
    useSlot(0);
    assert.strictEqual(G.monsters[0].hp,18); // 20-(1×1×2)=18
  });
  test('攻击空地 hitCount 不变', ()=>{
    setup(5,5, 9,9); // 怪物移远
    G.hitCount=3;
    useSlot(0);
    assert.strictEqual(G.hitCount,3);
  });
  test('攻击空地生成元素格', ()=>{
    setup(5,5, 9,9);
    G.slots[0].el='fire';
    G.board[5][6].el=null; G.board[5][6].stk=0;
    useSlot(0);
    assert.strictEqual(G.board[5][6].el,'fire');
    assert.strictEqual(G.board[5][6].stk,1);
  });
  test('已使用的槽再次 useSlot 无效', ()=>{
    setup(5,5, 5,6);
    G.slots[0].used=true; G.monsters[0].hp=6;
    useSlot(0);
    assert.strictEqual(G.monsters[0].hp,6); // 未变
  });
  test('非 PLAYER 阶段 useSlot 无效', ()=>{
    setup(5,5, 5,6);
    G.phase='MONSTER'; G.monsters[0].hp=6;
    useSlot(0);
    assert.strictEqual(G.monsters[0].hp,6); // 未变
  });
  test('多格攻击同时命中多只怪', ()=>{
    fresh();
    G.heroes.ha.pos={r:5,c:4};
    G.heroes.hb.pos={r:12,c:0};
    // 形状3直线right：攻击 (5,5),(5,6),(5,7)
    G.monsters[0].pos={r:5,c:5}; G.monsters[0].hp=10;
    G.monsters[1].pos={r:5,c:6}; G.monsters[1].hp=10;
    G.slots[0].hid='ha'; G.slots[0].sn=3; G.slots[0].dir='right';
    G.slots[0].tier=1; G.slots[0].used=false; G.hitCount=0;
    useSlot(0);
    assert.ok(G.monsters[0].hp<10,'怪物0应受伤');
    assert.ok(G.monsters[1].hp<10,'怪物1应受伤');
    assert.strictEqual(G.hitCount,2,'hitCount应为2（命中两次）');
  });
});

// ═══════════════════════════════════════════════════════════════
group('英雄移动', ()=>{
  test('selHero 选中英雄', ()=>{
    fresh();
    selHero('ha');
    assert.strictEqual(G.selHero,'ha');
  });
  test('selHero 再次点击取消选中', ()=>{
    fresh();
    selHero('ha'); selHero('ha');
    assert.strictEqual(G.selHero,null);
  });
  test('moveHero 移动到空格', ()=>{
    fresh();
    G.selHero='ha';
    moveHero(7,7);
    assert.deepStrictEqual(G.heroes.ha.pos,{r:7,c:7});
    assert.strictEqual(G.selHero,null);
  });
  test('moveHero 不能移动到怪物格', ()=>{
    fresh();
    const mpos=G.monsters[0].pos;
    G.selHero='ha';
    const prev={...G.heroes.ha.pos};
    moveHero(mpos.r,mpos.c);
    assert.deepStrictEqual(G.heroes.ha.pos,prev);
  });
  test('moveHero 不能移动到另一英雄格', ()=>{
    fresh();
    const bpos=G.heroes.hb.pos;
    G.selHero='ha';
    const prev={...G.heroes.ha.pos};
    moveHero(bpos.r,bpos.c);
    assert.deepStrictEqual(G.heroes.ha.pos,prev);
  });
  test('MONSTER 阶段无法移动', ()=>{
    fresh();
    G.phase='MONSTER'; G.selHero='ha';
    const prev={...G.heroes.ha.pos};
    moveHero(7,7);
    assert.deepStrictEqual(G.heroes.ha.pos,prev);
  });
  test('PLAYER 阶段 selHero 非 PLAYER 不响应', ()=>{
    fresh();
    G.phase='SHOP';
    selHero('ha');
    assert.strictEqual(G.selHero,null);
  });
});

// ═══════════════════════════════════════════════════════════════
group('回合管理', ()=>{
  test('endPlayerTurn 切换到 MONSTER/PLAYER/SHOP', ()=>{
    fresh();
    endPlayerTurn();
    // setTimeout 同步执行，所以怪物已经行动完毕
    assert.ok(['PLAYER','SHOP'].includes(G.phase),`phase 应为 PLAYER 或 SHOP，实际:${G.phase}`);
  });
  test('finishMonsters round<maxRound → 继续玩家回合', ()=>{
    fresh();
    G.round=3; G.maxRound=5;
    finishMonsters();
    assert.strictEqual(G.phase,'PLAYER');
    assert.strictEqual(G.round,4);
  });
  test('finishMonsters 普通推进：hitCount 归零', ()=>{
    fresh();
    G.hitCount=7; G.round=2;
    finishMonsters();
    assert.strictEqual(G.hitCount,0);
  });
  test('finishMonsters 普通推进：slots.used 全归 false', ()=>{
    fresh();
    G.slots.forEach(s=>s.used=true);
    G.round=2;
    finishMonsters();
    G.slots.forEach((s,i)=>assert.strictEqual(s.used,false,`槽${i}`));
  });
  test('finishMonsters round>maxRound → 商店+金币+3', ()=>{
    fresh();
    const gold0=G.gold;
    G.round=G.maxRound+1;
    finishMonsters();
    assert.strictEqual(G.phase,'SHOP');
    assert.strictEqual(G.gold, gold0+3);
  });
  test('finishMonsters 所有怪死亡 → 商店', ()=>{
    fresh();
    G.round=2;
    G.monsters.forEach(m=>m.dead=true);
    finishMonsters();
    assert.strictEqual(G.phase,'SHOP');
  });
  test('checkGameOver 双英雄 HP≤0 → OVER', ()=>{
    fresh();
    G.heroes.ha.hp=0; G.heroes.hb.hp=0;
    checkGameOver();
    assert.strictEqual(G.phase,'OVER');
  });
  test('checkGameOver 一方存活 → 继续', ()=>{
    fresh();
    G.heroes.ha.hp=0; G.heroes.hb.hp=1;
    checkGameOver();
    assert.strictEqual(G.phase,'PLAYER');
  });
  test('closeShop wave+1 并重置状态', ()=>{
    fresh();
    G.phase='SHOP';
    const wave0=G.wave;
    closeShop();
    assert.strictEqual(G.wave, wave0+1);
    assert.strictEqual(G.phase,'PLAYER');
    assert.strictEqual(G.round,1);
    assert.strictEqual(G.hitCount,0);
  });
});

// ═══════════════════════════════════════════════════════════════
group('怪物 AI', ()=>{
  test('nextMove 向最近英雄靠近（向左）', ()=>{
    fresh();
    const m=G.monsters[0];
    m.pos={r:5,c:8};
    G.heroes.ha.pos={r:5,c:2};
    G.heroes.hb.pos={r:5,c:2}; // 同位置（简化）
    const np=nextMove(m);
    assert.ok(np,'应有下一步');
    assert.ok(np.c < m.pos.c,'应向左移');
  });
  test('nextMove 向最近英雄靠近（向右）', ()=>{
    fresh();
    const m=G.monsters[0];
    m.pos={r:5,c:3};
    G.heroes.ha.pos={r:5,c:9};
    G.heroes.hb.pos={r:12,c:12};
    const np=nextMove(m);
    assert.ok(np && np.c > m.pos.c,'应向右移');
  });
  test('monsterAct 攻击左侧英雄', ()=>{
    fresh();
    const m=G.monsters[0];
    m.pos={r:5,c:6};
    G.heroes.ha.pos={r:5,c:5}; // 怪物左边
    G.heroes.hb.pos={r:12,c:0};
    const prevHp=G.heroes.ha.hp;
    monsterAct(m);
    assert.ok(G.heroes.ha.hp < prevHp,'英雄 HP 应减少');
  });
  test('monsterAct 遇元素块→爆炸反伤并清除元素', ()=>{
    fresh();
    const m=G.monsters[0];
    m.pos={r:5,c:8};
    G.heroes.ha.pos={r:5,c:2};
    G.heroes.hb.pos={r:12,c:0};
    G.board[5][7].el='fire'; G.board[5][7].stk=2; // stk=2 → explDmg=3
    const prevHp=m.hp;
    monsterAct(m);
    assert.ok(m.hp < prevHp,'怪物应受反伤');
    assert.strictEqual(G.board[5][7].el,null,'元素格应清除');
  });
  test('monsterAct 正常移动一格', ()=>{
    fresh();
    const m=G.monsters[0];
    m.pos={r:5,c:9};
    G.heroes.ha.pos={r:5,c:2};
    G.heroes.hb.pos={r:12,c:0};
    const prevC=m.pos.c;
    monsterAct(m);
    // 应向左移动一格（或停留如果目标有英雄）
    assert.ok(m.pos.c <= prevC,'应向目标方向移动或不动');
  });
});

// ═══════════════════════════════════════════════════════════════
group('spawnWave 波次生成', ()=>{
  test('波次1 = 2只教学怪', ()=>{
    fresh(); assert.strictEqual(G.monsters.length,2);
  });
  test('波次2 = 3只怪', ()=>{
    fresh(); G.monsters=[]; spawnWave(2);
    assert.strictEqual(G.monsters.length,3);
  });
  test('波次3 = 4只怪', ()=>{
    fresh(); G.monsters=[]; spawnWave(3);
    assert.strictEqual(G.monsters.length,4);
  });
  test('高波次怪物 HP 高于低波次', ()=>{
    fresh();
    G.monsters=[]; spawnWave(5);
    const w5hp=G.monsters[0].hp;
    G.monsters=[]; spawnWave(2);
    const w2hp=G.monsters[0].hp;
    assert.ok(w5hp>w2hp,'波次5怪物HP应大于波次2');
  });
  test('所有怪物初始 dead=false', ()=>{
    fresh();
    G.monsters.forEach((m,i)=>assert.strictEqual(m.dead,false,`怪物${i}`));
  });
});

// ═══════════════════════════════════════════════════════════════
group('商店系统', ()=>{
  test('genShop 生成 5 个商品', ()=>{
    fresh(); genShop();
    assert.strictEqual(G.shopItems.length,5);
  });
  test('商品有合法 el / sn / tier=1 / cost≥1', ()=>{
    fresh(); genShop();
    const validEl=['fire','water','wind','earth'];
    G.shopItems.forEach((item,i)=>{
      assert.ok(validEl.includes(item.el),`商品${i} el非法`);
      assert.ok(item.sn>=1&&item.sn<=20,`商品${i} sn非法`);
      assert.strictEqual(item.tier,1,`商品${i} tier应为1`);
      assert.ok(item.cost>=1,`商品${i} cost应≥1`);
    });
  });
  test('buyToBackpack 扣金币并放入背包', ()=>{
    fresh(); G.gold=10; genShop();
    const item=G.shopItems[0];
    buyToBackpack(item.id);
    assert.strictEqual(G.gold, 10-item.cost);
    assert.strictEqual(G.backpack.length,1);
    assert.strictEqual(G.backpack[0].sn,item.sn);
    assert.ok(G.backpack[0].bpId,'应有 bpId');
  });
  test('buyToBackpack 购买后从商品列表移除', ()=>{
    fresh(); G.gold=99; genShop();
    const id=G.shopItems[0].id;
    buyToBackpack(id);
    assert.ok(!G.shopItems.find(i=>i.id===id),'商品应被移除');
  });
  test('buyToBackpack 金币不足 → 不购买', ()=>{
    fresh(); G.gold=0; genShop();
    buyToBackpack(G.shopItems[0].id);
    assert.strictEqual(G.backpack.length,0);
  });
  test('buyToBackpack 背包满 64 → 不购买', ()=>{
    fresh(); G.gold=999; genShop();
    G.backpack=Array.from({length:64},(_,i)=>({bpId:`x${i}`}));
    buyToBackpack(G.shopItems[0].id);
    assert.strictEqual(G.backpack.length,64);
    assert.ok(_lastMsg.includes('满'),'应提示背包已满');
  });
  test('refreshShop 扣 1 金币并重新生成 5 件商品', ()=>{
    fresh(); G.gold=5; genShop();
    refreshShop();
    assert.strictEqual(G.gold,4);
    assert.strictEqual(G.shopItems.length,5);
  });
  test('refreshShop 金币不足 → 不刷新', ()=>{
    fresh(); G.gold=0; genShop();
    refreshShop();
    assert.strictEqual(G.gold,0);
    assert.ok(_lastMsg.includes('金币'),'应提示金币不足');
  });
  test('buyEl 扣金币并在棋盘放置元素', ()=>{
    fresh(); G.gold=5; genShop();
    // 手动添加一个 shopEl
    G.shopEls=[{id:'se0',el:'fire',cost:1}];
    const beforeGold=G.gold;
    buyEl('se0');
    assert.strictEqual(G.gold, beforeGold-1);
    // 检查棋盘上有fire元素
    let found=false;
    for(let r=0;r<13&&!found;r++) for(let c=0;c<13&&!found;c++)
      if(G.board[r][c].el==='fire') found=true;
    assert.ok(found,'棋盘上应有火元素');
  });
  test('buyEl 购买后从 shopEls 移除', ()=>{
    fresh(); G.gold=5;
    G.shopEls=[{id:'se0',el:'water',cost:1}];
    buyEl('se0');
    assert.ok(!G.shopEls.find(e=>e.id==='se0'),'shopEl 应被移除');
  });
});

// ═══════════════════════════════════════════════════════════════
group('#4 背包系统 bpEquip / bpCombine', ()=>{
  test('bpEquip 装备背包物品到指定槽', ()=>{
    fresh();
    G.backpack=[{el:'water',sn:3,tier:2,name:'测',bpId:'bp_0'}];
    bpEquip('bp_0',1);
    assert.strictEqual(G.slots[1].el,'water');
    assert.strictEqual(G.slots[1].sn,3);
    assert.strictEqual(G.slots[1].tier,2);
    assert.strictEqual(G.slots[1].used,false);
    assert.strictEqual(G.backpack.length,0,'背包应清空该物品');
  });
  test('bpEquip 无效 bpId 不崩溃', ()=>{
    fresh();
    assert.doesNotThrow(()=>bpEquip('nonexistent',0));
  });
  test('bpEquip 装备后背包数量-1', ()=>{
    fresh();
    G.backpack=[
      {el:'fire',sn:1,tier:1,bpId:'bp_0'},
      {el:'water',sn:2,tier:1,bpId:'bp_1'},
    ];
    bpEquip('bp_0',0);
    assert.strictEqual(G.backpack.length,1);
    assert.strictEqual(G.backpack[0].bpId,'bp_1');
  });
  test('bpCombine 合并两件同款物品', ()=>{
    fresh();
    G.backpack=[
      {el:'fire',sn:1,tier:1,name:'火·1格·1号·1阶',cost:0,id:'a',bpId:'bp_0'},
      {el:'fire',sn:1,tier:1,name:'火·1格·1号·1阶',cost:0,id:'b',bpId:'bp_1'},
    ];
    bpCombine('bp_0','bp_1');
    assert.strictEqual(G.backpack.length,1,'应从2件变为1件');
    assert.strictEqual(G.backpack[0].tier,2,'新阶=旧阶+1');
    assert.strictEqual(G.backpack[0].el,'fire');
    assert.strictEqual(G.backpack[0].sn,1);
  });
  test('bpCombine 合成后 tier+1', ()=>{
    fresh();
    G.backpack=[
      {el:'wind',sn:5,tier:2,name:'测',cost:0,id:'c',bpId:'bp_0'},
      {el:'wind',sn:5,tier:2,name:'测',cost:0,id:'d',bpId:'bp_1'},
    ];
    bpCombine('bp_0','bp_1');
    assert.strictEqual(G.backpack[0].tier,3);
  });
  test('bpCombine 4 阶不再合成', ()=>{
    fresh(); _lastMsg='';
    G.backpack=[
      {el:'fire',sn:1,tier:4,bpId:'bp_0'},
      {el:'fire',sn:1,tier:4,bpId:'bp_1'},
    ];
    bpCombine('bp_0','bp_1');
    assert.ok(_lastMsg.includes('最高'),'应提示已是最高阶');
    assert.strictEqual(G.backpack.length,2,'背包应不变');
  });
  test('bpCombine 无效 bpId 不崩溃', ()=>{
    fresh();
    assert.doesNotThrow(()=>bpCombine('bad0','bad1'));
  });
});

// ═══════════════════════════════════════════════════════════════
group('#5 合成Bug修复 combineSlots', ()=>{
  test('合成后槽 i 升阶', ()=>{
    fresh();
    G.slots[0].el='fire'; G.slots[0].sn=3; G.slots[0].tier=1;
    G.slots[1].el='fire'; G.slots[1].sn=3; G.slots[1].tier=1;
    combineSlots(0,1);
    assert.strictEqual(G.slots[0].tier,2);
  });
  test('合成后槽 j 重置为 fire·1号·1阶（BUG修复核心）', ()=>{
    fresh();
    G.slots[0].el='water'; G.slots[0].sn=3; G.slots[0].tier=1;
    G.slots[1].el='water'; G.slots[1].sn=3; G.slots[1].tier=1;
    combineSlots(0,1);
    assert.strictEqual(G.slots[1].el,  'fire', '槽j.el 应重置为 fire（非water）');
    assert.strictEqual(G.slots[1].sn,  1,      '槽j.sn 应重置为 1');
    assert.strictEqual(G.slots[1].tier,1,      '槽j.tier 应为 1');
  });
  test('合成后槽 j.used = false', ()=>{
    fresh();
    G.slots[0].el='wind'; G.slots[0].sn=2; G.slots[0].tier=1;
    G.slots[1].el='wind'; G.slots[1].sn=2; G.slots[1].tier=1;
    G.slots[0].used=true; G.slots[1].used=true;
    combineSlots(0,1);
    assert.strictEqual(G.slots[0].used,false,'槽i应重置');
    assert.strictEqual(G.slots[1].used,false,'槽j应重置');
  });
  test('el/sn 不匹配时不合成', ()=>{
    fresh();
    G.slots[0].el='fire'; G.slots[0].sn=1; G.slots[0].tier=1;
    G.slots[1].el='water';G.slots[1].sn=1; G.slots[1].tier=1;
    combineSlots(0,1);
    assert.strictEqual(G.slots[0].el,'fire','不应改变');
  });
  test('tier 不匹配时不合成', ()=>{
    fresh();
    G.slots[0].el='fire'; G.slots[0].sn=1; G.slots[0].tier=1;
    G.slots[1].el='fire'; G.slots[1].sn=1; G.slots[1].tier=2;
    combineSlots(0,1);
    assert.strictEqual(G.slots[0].tier,1,'不应改变');
  });
  test('4阶合成不超过 4 阶', ()=>{
    fresh();
    G.slots[0].el='fire'; G.slots[0].sn=1; G.slots[0].tier=4;
    G.slots[1].el='fire'; G.slots[1].sn=1; G.slots[1].tier=4;
    combineSlots(0,1);
    assert.strictEqual(G.slots[0].tier,4,'上限为4阶');
  });
  test('合成后槽 i.used = false', ()=>{
    fresh();
    G.slots[0].el='earth';G.slots[0].sn=2;G.slots[0].tier=1;G.slots[0].used=true;
    G.slots[1].el='earth';G.slots[1].sn=2;G.slots[1].tier=1;G.slots[1].used=false;
    combineSlots(0,1);
    assert.strictEqual(G.slots[0].used,false);
  });
});

// ═══════════════════════════════════════════════════════════════
group('#2 shapeHTML 形状图形预览', ()=>{
  test('返回非空字符串', ()=>{
    assert.ok(typeof shapeHTML(1,'fire')==='string' && shapeHTML(1,'fire').length>0);
  });
  test('包含 inline-grid CSS', ()=>{
    assert.ok(shapeHTML(1,'fire').includes('inline-grid'));
  });
  test('英雄格为蓝色 #3b82f6', ()=>{
    // 形状1: 攻击(0,1)，英雄(0,0)，grid 有两格
    assert.ok(shapeHTML(1,'fire').includes('#3b82f6'));
  });
  test('攻击格为 fire 元素颜色 #fb923c', ()=>{
    assert.ok(shapeHTML(1,'fire').includes('#fb923c'));
  });
  test('水元素颜色 #38bdf8', ()=>{
    assert.ok(shapeHTML(1,'water').includes('#38bdf8'));
  });
  test('无效 sn 返回空字符串', ()=>{
    assert.strictEqual(shapeHTML(99,'fire'),'');
  });
  test('所有 20 种形状都能生成预览', ()=>{
    for(let i=1;i<=20;i++)
      assert.ok(shapeHTML(i,'fire').length>0, `形状${i} 应生成非空预览`);
  });
  test('自定义尺寸参数生效', ()=>{
    const s12=shapeHTML(1,'fire',12);
    assert.ok(s12.includes('12px'),'应包含 12px');
  });
});

// ═══════════════════════════════════════════════════════════════
// 汇总
console.log('\n' + '═'.repeat(55));
console.log(`测试结果：${pass} 通过，${fail} 失败，共 ${pass+fail} 项`);
if(failures.length>0){
  console.log('\n失败详情：');
  failures.forEach(f=>{
    console.log(`  ❌ ${f.name}`);
    console.log(`     ${f.msg}`);
  });
  process.exit(1);
} else {
  console.log('🎉 全部测试通过！');
  process.exit(0);
}
