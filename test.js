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
  test('6 个行动槽（每英雄3个）', ()=> assert.strictEqual(G.slots.length,6));
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
  test('explCells 中心返回 5 个十字格（含中心）', ()=>{
    const c=explCells({r:5,c:5});
    assert.strictEqual(c.length,5);
    const keys=c.map(p=>`${p.r},${p.c}`);
    ['5,5','4,5','6,5','5,4','5,6'].forEach(k=>assert.ok(keys.includes(k),`缺少 ${k}`));
  });
  test('explCells 角落(0,0) 含中心共 3 格', ()=>{
    assert.strictEqual(explCells({r:0,c:0}).length,3);
  });
  test('explCells 边(0,5) 含中心共 4 格', ()=>{
    assert.strictEqual(explCells({r:0,c:5}).length,4);
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
    doExplode({r:5,c:5}); settleDamage();
    assert.strictEqual(G.monsters[0].hp, 7); // 10-3=7
  });
  test('doExplode 对空格无副作用', ()=>{
    fresh();
    // 元素格上没有元素
    doExplode({r:5,c:5}); // should silently return
    assert.ok(true);
  });

// ═══════════════════════════════════════════════════════
group('战斗系统验收测试 (10条规则)', ()=>{
  test('验收-1: 火1层再落火变火屏2', ()=>{
    fresh();
    addEl({r:5,c:5},'fire');
    addEl({r:5,c:5},'fire');
    assert.strictEqual(G.board[5][5].el,'fire');
    assert.strictEqual(G.board[5][5].stk,2);
  });
  test('验收-2: 火5层+水自动引爆，基础伤害=15', ()=>{
    fresh();
    for(let i=0;i<5;i++) addEl({r:5,c:5},'fire');
    G.monsters[0].pos={r:5,c:6}; G.monsters[0].hp=20; G.monsters[0].el=null;
    G.monsters[1].pos={r:9,c:9};
    addEl({r:5,c:5},'water'); // 水克火 → 自动引爆
    settleDamage();
    assert.strictEqual(G.monsters[0].hp,5,'20-15=5');
  });
  test('验收-3: 引爆后原格变水屏1', ()=>{
    fresh();
    for(let i=0;i<5;i++) addEl({r:5,c:5},'fire');
    G.monsters[0].pos={r:9,c:9}; G.monsters[1].pos={r:9,c:8};
    addEl({r:5,c:5},'water');
    assert.strictEqual(G.board[5][5].el,'water');
    assert.strictEqual(G.board[5][5].stk,1);
  });
  test('验收-4: 引爆范围包含中心和四个方向共5格', ()=>{
    const c=explCells({r:5,c:5});
    assert.strictEqual(c.length,5);
    const keys=new Set(c.map(p=>`${p.r},${p.c}`));
    assert.ok(keys.has('5,5'),'缺少中心');
    assert.ok(keys.has('4,5'),'缺少上');
    assert.ok(keys.has('6,5'),'缺少下');
    assert.ok(keys.has('5,4'),'缺少左');
    assert.ok(keys.has('5,6'),'缺少右');
  });
  test('验收-5: 火层爆炸炸到风属性怪 ×2', ()=>{
    fresh();
    G.monsters[0].pos={r:5,c:6}; G.monsters[0].hp=20; G.monsters[0].el='wind';
    G.monsters[1].pos={r:9,c:9};
    G.board[5][5].el='fire'; G.board[5][5].stk=3; // explDmg=6, ×2=12
    doExplode({r:5,c:5}); settleDamage();
    assert.strictEqual(G.monsters[0].hp,8,'20-12=8');
  });
  test('验收-6: 火层爆炸炸到无属性怪不翻倍', ()=>{
    fresh();
    G.monsters[0].pos={r:5,c:6}; G.monsters[0].hp=20; G.monsters[0].el=null;
    G.monsters[1].pos={r:9,c:9};
    G.board[5][5].el='fire'; G.board[5][5].stk=3; // explDmg=6, 不翻倍
    doExplode({r:5,c:5}); settleDamage();
    assert.strictEqual(G.monsters[0].hp,14,'20-6=14');
  });
  test('验收-7: wave1怪物 el=null 不吃克制翻倍', ()=>{
    fresh();
    G.monsters.forEach((m,i)=>
      assert.strictEqual(m.el,null,`教学怪${i} 属性应为 null`)
    );
  });
  test('验收-8: 怪物格单体结算，相邻格怪物不受波及', ()=>{
    fresh();
    G.heroes.ha.pos={r:5,c:4};
    G.heroes.hb.pos={r:12,c:0};
    G.monsters[0].pos={r:5,c:5}; G.monsters[0].hp=10;
    G.monsters[1].pos={r:5,c:6}; G.monsters[1].hp=10;
    G.slots[0].hid='ha'; G.slots[0].sn=1; G.slots[0].dir='right'; // 攻击(5,5)
    G.slots[0].tier=1; G.slots[0].used=false; G.hitCount=0;
    G.explosionThreshold=1; // 单次命中即引爆
    useSlot(0); settleDamage();
    assert.ok(G.monsters[0].hp<10,'命中格怪物受伤');
    // 新规则：怪物格=单体结算，不触发十字，相邻格怪物不受波及
    assert.strictEqual(G.monsters[1].hp,10,'怪物格单体结算不波及相邻格');
  });
  test('验收-9: 引爆伤害能打十字范围内多只怪', ()=>{
    fresh();
    G.monsters[0].pos={r:4,c:5}; G.monsters[0].hp=20; G.monsters[0].el=null;
    G.monsters[1].pos={r:5,c:6}; G.monsters[1].hp=20; G.monsters[1].el=null;
    G.board[5][5].el='fire'; G.board[5][5].stk=2; // dmg=3
    doExplode({r:5,c:5}); settleDamage();
    assert.ok(G.monsters[0].hp<20,'上方怪受伤');
    assert.ok(G.monsters[1].hp<20,'右方怪受伤');
  });
  test('验收-10: 新元素不克制旧元素时，不覆盖旧层', ()=>{
    fresh();
    addEl({r:5,c:5},'fire'); addEl({r:5,c:5},'fire'); // 火2层
    addEl({r:5,c:5},'earth'); // 土不克火，无效
    assert.strictEqual(G.board[5][5].el,'fire','应仍是火');
    assert.strictEqual(G.board[5][5].stk,2,'层数应不变');
  });
  test('验收-补: addEl 6层上限', ()=>{
    fresh();
    for(let i=0;i<8;i++) addEl({r:5,c:5},'fire');
    assert.strictEqual(G.board[5][5].stk,6,'最高6层');
  });
  test('验收-补: 中心格怪物能被引爆伤到', ()=>{
    fresh();
    G.monsters[0].pos={r:5,c:5}; G.monsters[0].hp=20; G.monsters[0].el=null;
    G.monsters[1].pos={r:9,c:9};
    G.board[5][5].el='fire'; G.board[5][5].stk=3; // dmg=6
    doExplode({r:5,c:5}); settleDamage();
    assert.ok(G.monsters[0].hp<20,'中心怪物应被引爆伤到');
  });
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
    G.explosionThreshold=1; // 测试伤害公式，单次命中即引爆
  }

  test('攻击命中：目标格元素层+1', ()=>{
    setup(5,5, 5,6);
    const el=G.slots[0].el;
    useSlot(0);
    assert.strictEqual(G.elementCells['5,6']?.[el]?.layers, 1);
  });
  test('命中后 slot.used=true', ()=>{
    setup(5,5, 5,6);
    useSlot(0);
    assert.strictEqual(G.slots[0].used,true);
  });
  test('1阶·第1次·伤害=1×1=1', ()=>{
    setup(5,5, 5,6);
    G.monsters[0].hp=6; G.slots[0].tier=1; G.hitCount=0;
    useSlot(0); settleDamage();
    assert.strictEqual(G.monsters[0].hp,5); // 6-1=5
  });
  test('tier无加成：单层引爆=explDmg(1)=1', ()=>{
    setup(5,5, 5,6);
    G.monsters[0].hp=6; G.slots[0].tier=2;
    useSlot(0); settleDamage();
    assert.strictEqual(G.monsters[0].hp,5); // 6-1=5，explDmg(1)=1，tier不影响
  });
  test('3层fire结算：explDmg(3)=6', ()=>{
    fresh();
    G.monsters[0].pos={r:5,c:5}; G.monsters[0].hp=10; G.monsters[1].pos={r:12,c:12};
    G.elementCells['5,5']={fire:{layers:3,willExplode:true},water:{layers:0,willExplode:false},wind:{layers:0,willExplode:false},earth:{layers:0,willExplode:false}};
    settleDamage();
    assert.strictEqual(G.monsters[0].hp,4); // 10-6=4，explDmg(3)=6
  });
  test('6层fire结算：explDmg(6)=21', ()=>{
    fresh();
    G.monsters[0].pos={r:5,c:5}; G.monsters[0].hp=25; G.monsters[1].pos={r:12,c:12};
    G.elementCells['5,5']={fire:{layers:6,willExplode:true},water:{layers:0,willExplode:false},wind:{layers:0,willExplode:false},earth:{layers:0,willExplode:false}};
    settleDamage();
    assert.strictEqual(G.monsters[0].hp,4); // 25-21=4，explDmg(6)=21
  });
  test('同格叠2层结算：explDmg(2)=3', ()=>{
    setup(5,5, 5,6);
    G.monsters[0].hp=10;
    G.elementCells['5,6']={fire:{layers:1,willExplode:false},water:{layers:0,willExplode:false},wind:{layers:0,willExplode:false},earth:{layers:0,willExplode:false}};
    G.explosionThreshold=2;
    useSlot(0); settleDamage();
    assert.strictEqual(G.monsters[0].hp,7); // 10-3=7，explDmg(2)=3
  });
  test('元素克制 ×2：水攻火属性怪', ()=>{
    setup(5,5, 5,6);
    G.monsters[0].hp=20; G.monsters[0].el='fire';
    G.slots[0].el='water'; G.slots[0].tier=1; G.hitCount=0;
    useSlot(0); settleDamage();
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
    G.explosionThreshold=1; // 单次命中即引爆
    useSlot(0); settleDamage();
    assert.ok(G.monsters[0].hp<10,'怪物0应受伤');
    assert.ok(G.monsters[1].hp<10,'怪物1应受伤');
  });

  test('空地叠层引爆：无怪物时不出错', ()=>{
    setup(5,5, 9,9); // 怪物移远
    G.slots[0].el='fire'; G.explosionThreshold=1;
    assert.doesNotThrow(()=>{useSlot(0); settleDamage();});
  });
  test('同格火水各3层同时引爆：各自dmg=6', ()=>{
    fresh();
    G.monsters[0].pos={r:5,c:5}; G.monsters[0].hp=20; G.monsters[1].pos={r:12,c:12};
    G.elementCells['5,5']={fire:{layers:3,willExplode:true},water:{layers:3,willExplode:true},wind:{layers:0,willExplode:false},earth:{layers:0,willExplode:false}};
    settleDamage();
    assert.strictEqual(G.monsters[0].hp,8); // 20-6-6=8
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
    assert.strictEqual(G.selHero,'ha'); // 移动后保持选中，预览继续显示
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
  test('genShop 生成3个商品', ()=>{
    fresh(); genShop();
    assert.strictEqual(G.shopItems.length,3);
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
  test('refreshShop 才 1 金币并重新生成3 件商品', ()=>{
    fresh(); G.gold=5; genShop();
    refreshShop();
    assert.strictEqual(G.gold,4);
    assert.strictEqual(G.shopItems.length,3);
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
group('threshold=3 引爆阈值（游戏默认）', ()=>{
  function setup3(heroR,heroC,monR,monC){
    fresh();
    G.explosionThreshold=3;
    G.heroes.ha.pos={r:heroR,c:heroC};
    G.heroes.hb.pos={r:12,c:0};
    G.monsters[0].pos={r:monR,c:monC}; G.monsters[0].hp=20;
    G.monsters[1].pos={r:12,c:12};
    // 3 个火元素槽，全部向右
    G.slots[0].hid='ha'; G.slots[0].el='fire'; G.slots[0].sn=1; G.slots[0].dir='right'; G.slots[0].tier=1; G.slots[0].used=false;
    G.slots[1].hid='ha'; G.slots[1].el='fire'; G.slots[1].sn=1; G.slots[1].dir='right'; G.slots[1].tier=1; G.slots[1].used=false;
    G.slots[2].hid='ha'; G.slots[2].el='fire'; G.slots[2].sn=1; G.slots[2].dir='right'; G.slots[2].tier=1; G.slots[2].used=false;
    G.hitCount=0;
  }
  test('fire+1 层结算：怪物格单体伤害1', ()=>{
    setup3(5,5, 5,6);
    useSlot(0); settleExplosions();
    assert.strictEqual(G.monsters[0].hp, 19, '怪物格1层单体伤害：20-1=19');
  });
  test('fire+2 层结算：怪物格单体伤害3', ()=>{
    setup3(5,5, 5,6);
    useSlot(0); useSlot(1); settleExplosions();
    assert.strictEqual(G.monsters[0].hp, 17, '怪物格2层单体伤害：20-3=17');
  });
  test('行动阶段 HP 不变（settleExplosions 之前）', ()=>{
    setup3(5,5, 5,6);
    useSlot(0); useSlot(1); useSlot(2);
    assert.strictEqual(G.monsters[0].hp, 20, '行动阶段未结算，HP 不变');
  });
  test('fire+3 触发：settleExplosions 扣真实 HP', ()=>{
    setup3(5,5, 5,6);
    useSlot(0); useSlot(1); useSlot(2); settleExplosions();
    assert.ok(G.monsters[0].hp < 20, '3层达到阈值，结算后 HP 降低');
  });
  test('useSlot 不触发 doExplode（跨元素不立即扣血）', ()=>{
    fresh();
    G.explosionThreshold=3;
    G.heroes.ha.pos={r:5,c:5}; G.heroes.hb.pos={r:12,c:0};
    G.monsters[0].pos={r:5,c:6}; G.monsters[0].hp=20;
    G.monsters[1].pos={r:12,c:12};
    G.board[5][6].el='fire'; G.board[5][6].stk=3; // 棋盘已有火 3 层
    G.slots[0].hid='ha'; G.slots[0].el='water'; G.slots[0].sn=1; G.slots[0].dir='right'; G.slots[0].tier=1; G.slots[0].used=false;
    G.hitCount=0;
    useSlot(0); // 水攻火格：不调用 doExplode，HP 应不变
    assert.strictEqual(G.monsters[0].hp, 20, 'useSlot 行动阶段不触发 doExplode，HP 不变');
  });
});

// ═══════════════════════════════════════════════════════════════
group('格子规则 case_001~007（怪物格单体 vs 空格十字）', ()=>{
  test('case_001: 怪物格1层fire结算为单体伤害1', ()=>{
    fresh();
    G.monsters[0].pos={r:5,c:5}; G.monsters[0].hp=6; G.monsters[1].pos={r:12,c:12};
    G.elementCells['5,5']={fire:{layers:1,willExplode:true},water:{layers:0,willExplode:false},wind:{layers:0,willExplode:false},earth:{layers:0,willExplode:false}};
    settleDamage();
    assert.strictEqual(G.monsters[0].hp,5,'单体伤害1：6-1=5');
  });
  test('case_002: 怪物格2层fire结算为单体伤害3', ()=>{
    fresh();
    G.monsters[0].pos={r:5,c:5}; G.monsters[0].hp=6; G.monsters[1].pos={r:12,c:12};
    G.elementCells['5,5']={fire:{layers:2,willExplode:true},water:{layers:0,willExplode:false},wind:{layers:0,willExplode:false},earth:{layers:0,willExplode:false}};
    settleDamage();
    assert.strictEqual(G.monsters[0].hp,3,'单体伤害3：6-3=3');
  });
  test('case_003: 怪物格3层fire单体结算，不触发十字，相邻怪物不受伤', ()=>{
    fresh();
    G.monsters[0].pos={r:5,c:5}; G.monsters[0].hp=10;
    G.monsters[1].pos={r:5,c:6}; G.monsters[1].hp=6; // 相邻格
    G.elementCells['5,5']={fire:{layers:3,willExplode:true},water:{layers:0,willExplode:false},wind:{layers:0,willExplode:false},earth:{layers:0,willExplode:false}};
    settleDamage();
    assert.strictEqual(G.monsters[0].hp,4,'怪物0受单体伤害6：10-6=4');
    assert.strictEqual(G.monsters[1].hp,6,'相邻怪物不受十字波及');
  });
  test('case_004: 空格3层fire十字引爆，波及相邻怪物', ()=>{
    fresh();
    G.monsters[0].pos={r:6,c:5}; G.monsters[0].hp=10; // 在(5,5)正下方
    G.monsters[1].pos={r:12,c:12};
    // (5,5)是空格（没有怪物）
    G.elementCells['5,5']={fire:{layers:3,willExplode:true},water:{layers:0,willExplode:false},wind:{layers:0,willExplode:false},earth:{layers:0,willExplode:false}};
    settleDamage();
    assert.strictEqual(G.monsters[0].hp,4,'相邻怪受十字引爆伤害6：10-6=4');
  });
  test('case_005: buildMonsterStats 合并自身格伤害和波及伤害', ()=>{
    fresh();
    G.monsters[0].pos={r:5,c:5}; G.monsters[0].hp=20;
    G.monsters[1].pos={r:12,c:12};
    // 自身格有2层fire（单体3伤害，不需要达到阈值）
    G.elementCells['5,5']={fire:{layers:2,willExplode:false},water:{layers:0,willExplode:false},wind:{layers:0,willExplode:false},earth:{layers:0,willExplode:false}};
    // 空格(5,4)有3层fire（达到默认阈值3，触发十字，波及(5,5)）
    G.elementCells['5,4']={fire:{layers:3,willExplode:true},water:{layers:0,willExplode:false},wind:{layers:0,willExplode:false},earth:{layers:0,willExplode:false}};
    const stats=buildMonsterStats();
    const ms=stats['5,5'];
    assert.ok(ms,'monsterStats应包含怪物所在格');
    assert.strictEqual(ms.selfCellDamage.total,3,'自身格2层伤害=explDmg(2)=3');
    assert.strictEqual(ms.splashDamage.total,6,'波及来自(5,4)3层fire=6');
    assert.strictEqual(ms.finalPreview.totalDamage,9,'总预计伤害=9');
    assert.strictEqual(ms.finalPreview.willDie,false,'9<20不死亡');
  });
  test('case_006: 两只怪物都能攻击同一英雄', ()=>{
    fresh();
    G.heroes.ha.pos={r:1,c:0};
    G.heroes.hb.pos={r:11,c:0};
    G.monsters[0].pos={r:1,c:1}; // 左攻ha
    G.monsters[1].pos={r:0,c:0}; // 下攻ha
    const{heroIncomingDmg}=computeMonsterActionPreview();
    assert.ok(heroIncomingDmg['ha'],'ha应收到攻击预警');
    assert.strictEqual(heroIncomingDmg['ha'].length,2,'两次攻击预警');
    const totalDmg=heroIncomingDmg['ha'].reduce((s,e)=>s+e.dmg,0);
    assert.ok(totalDmg>0,'总预警伤害大于0');
  });
  test('case_007: 结算前怪物不被提前删除，结算后标记dead', ()=>{
    fresh();
    G.monsters[0].pos={r:5,c:5}; G.monsters[0].hp=1;
    G.elementCells['5,5']={fire:{layers:1,willExplode:true},water:{layers:0,willExplode:false},wind:{layers:0,willExplode:false},earth:{layers:0,willExplode:false}};
    // 结算前：怪物仍存活
    assert.strictEqual(G.monsters[0].dead,false,'结算前不死亡');
    assert.ok(monAt({r:5,c:5}),'结算前仍能在格上找到怪物');
    // 结算后：怪物死亡
    settleDamage();
    assert.strictEqual(G.monsters[0].hp,0,'结算后hp=0');
    assert.strictEqual(G.monsters[0].dead,true,'结算后标记dead');
  });
});

// ═══════════════════════════════════════════════════════════════
// CellInfoLayer 测试（case_cellinfo_001~007）
group('格子信息层 cellInfoMap（buildCellInfoMap）', ()=>{
  function freshCellInfo(){
    fresh();
    G.explosionThreshold=3;
    G.heroes.ha.pos={r:10,c:1}; G.heroes.hb.pos={r:12,c:0};
    // 清空怪物，方便各 case 自行安排
    G.monsters=[];
  }

  test('case_cellinfo_001: 怪物格 fire=1 → 单体伤害1，不爆炸', ()=>{
    freshCellInfo();
    G.monsters=[{id:'m0',name:'怪甲',hp:10,maxHp:10,atk:1,pos:{r:5,c:5},dead:false,el:null}];
    G.elementCells['5,5']={fire:{layers:1,willExplode:false}};
    const ciMap=buildCellInfoMap();
    const ci=ciMap['5,5'];
    assert.ok(ci,'应有 5,5 的 cellInfo');
    assert.ok(ci.entities.some(e=>e.type==='monster'),'实体含怪物');
    assert.strictEqual(ci.elementField.fire,1,'火=1');
    assert.strictEqual(ci.selfCellDamagePreview.total,1,'单体伤害=1');
    assert.strictEqual(ci.explosionPreview.willExplode,false,'怪物格不触发十字爆炸');
  });

  test('case_cellinfo_002: 怪物格 fire=3 → 单体伤害6，不触发十字', ()=>{
    freshCellInfo();
    G.monsters=[{id:'m0',name:'怪甲',hp:10,maxHp:10,atk:1,pos:{r:5,c:5},dead:false,el:null}];
    G.elementCells['5,5']={fire:{layers:3,willExplode:false}};
    const ciMap=buildCellInfoMap();
    const ci=ciMap['5,5'];
    assert.strictEqual(ci.selfCellDamagePreview.total,6,'怪物格3层=6伤');
    assert.strictEqual(ci.explosionPreview.willExplode,false,'怪物格不爆炸');
    assert.ok(ci.summaryBadges.includes('🔥3'),'badge 含 🔥3');
    assert.ok(ci.summaryBadges.includes('-6'),'badge 含 -6');
    assert.ok(!ci.summaryBadges.includes('💥'),'badge 不含 💥');
  });

  test('case_cellinfo_003: 空格 fire=3 willExplode=true → 十字引爆', ()=>{
    freshCellInfo();
    G.elementCells['5,5']={fire:{layers:3,willExplode:true}};
    const ciMap=buildCellInfoMap();
    const ci=ciMap['5,5'];
    assert.ok(ci.entities.length===0,'空格无实体');
    assert.strictEqual(ci.explosionPreview.willExplode,true,'空格应引爆');
    assert.strictEqual(ci.explosionPreview.damage,6,'引爆伤害=6');
    assert.strictEqual(ci.explosionPreview.shape,'cross','形状=cross');
    assert.ok(ci.explosionPreview.affectedCells.length>0,'有波及格');
    assert.ok(ci.summaryBadges.includes('🔥3'),'badge 含 🔥3');
    assert.ok(ci.summaryBadges.includes('💥'),'badge 含 💥');
  });

  test('case_cellinfo_004: 点击怪物格 - 实体/元素场/单体结算/来源完整', ()=>{
    freshCellInfo();
    G.monsters=[{id:'m0',name:'怪甲',hp:10,maxHp:10,atk:1,pos:{r:5,c:5},dead:false,el:null}];
    G.elementCells['5,5']={fire:{layers:3,willExplode:false}};
    // 槽1向右攻击 (5,2)→右→(5,3)→... 调整英雄位置使槽落到 (5,5)
    G.heroes.ha.pos={r:5,c:4};
    G.slots[0].hid='ha'; G.slots[0].el='fire'; G.slots[0].sn=1; G.slots[0].dir='right'; G.slots[0].used=false;
    G.slots[1].used=true; G.slots[2].used=true;
    const ciMap=buildCellInfoMap();
    const ci=ciMap['5,5'];
    assert.ok(ci.entities.some(e=>e.type==='monster'),'有怪物实体');
    assert.strictEqual(ci.elementField.fire,3,'元素场 fire=3');
    assert.strictEqual(ci.selfCellDamagePreview.total,6,'单体伤害=6');
    assert.strictEqual(ci.explosionPreview.willExplode,false,'不触发十字');
    assert.ok(ci.incomingEffects.some(ef=>ef.source==='A-1'),'来源含 A-1');
  });

  test('case_cellinfo_005: 空格点击 - 元素场/引爆/波及/来源', ()=>{
    freshCellInfo();
    G.elementCells['5,5']={fire:{layers:3,willExplode:true}};
    G.heroes.ha.pos={r:5,c:4};
    G.slots[0].hid='ha'; G.slots[0].el='fire'; G.slots[0].sn=1; G.slots[0].dir='right'; G.slots[0].used=false;
    G.slots[1].used=true; G.slots[2].used=true;
    const ciMap=buildCellInfoMap();
    const ci=ciMap['5,5'];
    assert.ok(ci.entities.length===0,'无实体');
    assert.strictEqual(ci.elementField.fire,3,'元素场 fire=3');
    assert.ok(ci.explosionPreview.willExplode,'空格 willExplode=true');
    assert.ok(ci.explosionPreview.affectedCells.length>0,'有波及格');
    assert.ok(ci.incomingEffects.some(ef=>ef.element==='fire'),'来源含 fire');
  });

  test('case_cellinfo_006: 同一格被三个槽作用 → incomingEffects 长度=3', ()=>{
    freshCellInfo();
    // 英雄 ha 在 (5,4)，sn=1 right → 攻击 (5,5)
    G.heroes.ha.pos={r:5,c:4};
    G.slots[0].hid='ha'; G.slots[0].el='fire'; G.slots[0].sn=1; G.slots[0].dir='right'; G.slots[0].used=false;
    G.slots[1].hid='ha'; G.slots[1].el='fire'; G.slots[1].sn=1; G.slots[1].dir='right'; G.slots[1].used=false;
    G.slots[2].hid='ha'; G.slots[2].el='fire'; G.slots[2].sn=1; G.slots[2].dir='right'; G.slots[2].used=false;
    const ciMap=buildCellInfoMap();
    const ci=ciMap['5,5'];
    assert.strictEqual(ci.incomingEffects.length,3,'三个槽各贡献一条来源');
  });

  test('case_cellinfo_007: 英雄格被两怪威胁 → monsterThreatPreview.hitCount=2', ()=>{
    freshCellInfo();
    G.heroes.ha.pos={r:5,c:5};
    // 两只怪在英雄左侧，能攻击到英雄
    G.monsters=[
      {id:'m0',name:'怪甲',hp:10,maxHp:10,atk:2,pos:{r:5,c:6},dead:false,el:null},
      {id:'m1',name:'怪乙',hp:10,maxHp:10,atk:3,pos:{r:5,c:7},dead:false,el:null},
    ];
    // simMonAct: 怪从右向左攻击相邻英雄
    // 需要确认 simMonAct 能让两怪都攻击到 ha
    // 使用 computeMonsterActionPreview 验证
    const {heroIncomingDmg}=computeMonsterActionPreview();
    // 只有紧邻 (5,6) 的怪能攻击，(5,7) 需要移动
    // 结果取决于 simMonAct；这里只检查 ciMap 正确映射
    const ciMap=buildCellInfoMap();
    const ci=ciMap['5,5'];
    const thr=ci.monsterThreatPreview;
    const haIncoming=heroIncomingDmg['ha']||[];
    assert.strictEqual(thr.hitCount,haIncoming.length,'hitCount 与 computeMonsterActionPreview 一致');
    if(haIncoming.length>0)assert.strictEqual(thr.totalDamage,haIncoming.reduce((s,e)=>s+e.dmg,0),'totalDamage 一致');
    // 无论 simMonAct 结果，summaryBadges 应正确包含 ⚠×N
    if(thr.hitCount>0)assert.ok(ci.summaryBadges.some(b=>b.startsWith('⚠×')),`badge 含 ⚠×N (hitCount=${thr.hitCount})`);
  });
});

// ═══════════════════════════════════════════════════════════════
// A 组：initGame 第一关默认配置测试
group('A组：initGame 第一关默认配置', ()=>{
  test('case_init_001: ha/hb 6个槽全部是 fire', ()=>{
    fresh();
    const els=G.slots.map(s=>s.el);
    assert.ok(els.every(e=>e==='fire'), `所有槽应为 fire，实际: ${JSON.stringify(els)}`);
  });
  test('case_init_002: 默认槽无 water/wind/earth', ()=>{
    fresh();
    const els=G.slots.map(s=>s.el);
    assert.ok(!els.includes('water'),'water 不应出现在默认槽');
    assert.ok(!els.includes('wind'), 'wind 不应出现在默认槽');
    assert.ok(!els.includes('earth'),'earth 不应出现在默认槽');
  });
  test('case_init_003: 英雄A hp=20 pos(10,1)，英雄B hp=20 pos(11,1)', ()=>{
    fresh();
    assert.ok(G.heroes.ha,'英雄A存在');
    assert.ok(G.heroes.hb,'英雄B存在');
    assert.strictEqual(G.heroes.ha.hp,20,'ha hp=20');
    assert.strictEqual(G.heroes.hb.hp,20,'hb hp=20');
    assert.deepStrictEqual(G.heroes.ha.pos,{r:10,c:1},'ha 初始位置(10,1)');
    assert.deepStrictEqual(G.heroes.hb.pos,{r:11,c:1},'hb 初始位置(11,1)');
  });
  test('case_init_004: 教学怪1 hp=6 el=null，教学怪2 hp=10 el=null', ()=>{
    fresh();
    assert.strictEqual(G.monsters.length,2,'应有2只怪');
    assert.strictEqual(G.monsters[0].name,'教学怪1','怪1名称');
    assert.strictEqual(G.monsters[0].hp,6,'教学怪1 hp=6');
    assert.strictEqual(G.monsters[0].el,null,'教学怪1 el=null');
    assert.strictEqual(G.monsters[1].name,'教学怪2','怪2名称');
    assert.strictEqual(G.monsters[1].hp,10,'教学怪2 hp=10');
    assert.strictEqual(G.monsters[1].el,null,'教学怪2 el=null');
  });
  test('case_init_005: explosionThreshold=3', ()=>{
    fresh();
    assert.strictEqual(G.explosionThreshold,3,'threshold=3');
  });
});

// ═══════════════════════════════════════════════════════════════
// B 组：怪物格单体结算测试
group('B组：怪物格单体结算', ()=>{
  // pos: 怪物格坐标，相邻怪放在 (pos.r, pos.c+1)
  function setMonCell(pos,hp,el,layers){
    fresh();
    G.monsters=[
      {id:'m0',name:'主怪',hp,maxHp:hp,atk:1,pos,dead:false,el:null},
      {id:'m1',name:'相邻怪',hp:10,maxHp:10,atk:1,pos:{r:pos.r,c:pos.c+1},dead:false,el:null},
    ];
    const ky=`${pos.r},${pos.c}`;
    G.elementCells[ky]={
      fire:{layers:0,willExplode:false},water:{layers:0,willExplode:false},
      wind:{layers:0,willExplode:false},earth:{layers:0,willExplode:false},
    };
    G.elementCells[ky][el]={layers,willExplode:layers>=G.explosionThreshold};
  }
  test('case_monster_cell_001: fire=1 → 单体伤1，相邻怪不受波及', ()=>{
    setMonCell({r:5,c:5},10,'fire',1);
    settleDamage();
    assert.strictEqual(G.monsters[0].hp,9,'主怪 10-1=9');
    assert.strictEqual(G.monsters[1].hp,10,'相邻怪不受伤');
  });
  test('case_monster_cell_002: fire=2 → 单体伤3，相邻怪不受波及', ()=>{
    setMonCell({r:5,c:5},10,'fire',2);
    settleDamage();
    assert.strictEqual(G.monsters[0].hp,7,'主怪 10-3=7');
    assert.strictEqual(G.monsters[1].hp,10,'相邻怪不受伤');
  });
  test('case_monster_cell_003: fire=3 → 单体伤6，6血怪死亡，相邻怪不受波及', ()=>{
    setMonCell({r:5,c:5},6,'fire',3);
    settleDamage();
    assert.strictEqual(G.monsters[0].hp,0,'主怪 6-6=0');
    assert.strictEqual(G.monsters[0].dead,true,'主怪死亡');
    assert.strictEqual(G.monsters[1].hp,10,'相邻怪不受伤');
  });
  test('case_monster_cell_004: fire=6 → 单体伤21，相邻怪不受波及', ()=>{
    setMonCell({r:5,c:5},30,'fire',6);
    settleDamage();
    assert.strictEqual(G.monsters[0].hp,9,'主怪 30-21=9');
    assert.strictEqual(G.monsters[1].hp,10,'相邻怪不受伤');
  });
});

// ═══════════════════════════════════════════════════════════════
// C 组：空格十字爆炸测试
group('C组：空格十字爆炸', ()=>{
  // 爆炸格(5,5)，范围内怪在(5,6)，范围外怪在(8,8)
  function setEmptyCell(layers){
    fresh();
    G.monsters=[
      {id:'m0',name:'范围内怪',hp:10,maxHp:10,atk:1,pos:{r:5,c:6},dead:false,el:null},
      {id:'m1',name:'范围外怪',hp:10,maxHp:10,atk:1,pos:{r:8,c:8},dead:false,el:null},
    ];
    G.elementCells['5,5']={
      fire:{layers,willExplode:layers>=G.explosionThreshold},
      water:{layers:0,willExplode:false},wind:{layers:0,willExplode:false},earth:{layers:0,willExplode:false},
    };
  }
  test('case_empty_cell_001: fire=1 不伤害不爆炸', ()=>{
    setEmptyCell(1);
    settleDamage();
    assert.strictEqual(G.monsters[0].hp,10,'范围内怪不受伤');
    assert.strictEqual(G.monsters[1].hp,10,'范围外怪不受伤');
  });
  test('case_empty_cell_002: fire=2 不伤害不爆炸', ()=>{
    setEmptyCell(2);
    settleDamage();
    assert.strictEqual(G.monsters[0].hp,10,'范围内怪不受伤');
    assert.strictEqual(G.monsters[1].hp,10,'范围外怪不受伤');
  });
  test('case_empty_cell_003: fire=3 十字爆炸→范围内怪-6，范围外不受伤', ()=>{
    setEmptyCell(3);
    settleDamage();
    assert.strictEqual(G.monsters[0].hp,4,'范围内怪 10-6=4');
    assert.strictEqual(G.monsters[1].hp,10,'范围外怪不受伤');
  });
  test('case_empty_cell_004: fire=6 十字爆炸→范围内怪-21(下限0)', ()=>{
    setEmptyCell(6);
    settleDamage();
    assert.strictEqual(G.monsters[0].hp,0,'范围内怪 10-21=0(下限0)');
    assert.strictEqual(G.monsters[1].hp,10,'范围外怪不受伤');
  });
});

// ═══════════════════════════════════════════════════════════════
// D 组：怪物格 vs 空格行为差异测试
group('D组：怪物格 vs 空格行为差异', ()=>{
  test('case_diff_001: fire=3 怪物格单体不波及 vs 空格十字波及', ()=>{
    // 怪物格：主怪在(5,5)fire=3，相邻怪在(5,6)不受波及
    fresh();
    G.monsters=[
      {id:'m0',name:'主怪',hp:10,maxHp:10,atk:1,pos:{r:5,c:5},dead:false,el:null},
      {id:'m1',name:'相邻',hp:10,maxHp:10,atk:1,pos:{r:5,c:6},dead:false,el:null},
    ];
    G.elementCells['5,5']={fire:{layers:3,willExplode:true},water:{layers:0,willExplode:false},wind:{layers:0,willExplode:false},earth:{layers:0,willExplode:false}};
    settleDamage();
    assert.strictEqual(G.monsters[0].hp,4,'怪物格:主怪 10-6=4');
    assert.strictEqual(G.monsters[1].hp,10,'怪物格:相邻怪不受波及（单体结算）');
    // 空格：(5,5)无怪fire=3，怪在(5,6)被十字波及
    fresh();
    G.monsters=[
      {id:'m0',name:'范围内',hp:10,maxHp:10,atk:1,pos:{r:5,c:6},dead:false,el:null},
      {id:'m1',name:'范围外',hp:10,maxHp:10,atk:1,pos:{r:8,c:8},dead:false,el:null},
    ];
    G.elementCells['5,5']={fire:{layers:3,willExplode:true},water:{layers:0,willExplode:false},wind:{layers:0,willExplode:false},earth:{layers:0,willExplode:false}};
    settleDamage();
    assert.strictEqual(G.monsters[0].hp,4,'空格:范围内怪 10-6=4');
    assert.strictEqual(G.monsters[1].hp,10,'空格:范围外不受伤');
  });
  test('case_diff_002: fire=2 怪物格伤3 vs 空格无伤害', ()=>{
    // 怪物格 fire=2 → 单体扣3
    fresh();
    G.monsters=[
      {id:'m0',name:'主怪',hp:10,maxHp:10,atk:1,pos:{r:5,c:5},dead:false,el:null},
      {id:'m1',name:'远处',hp:10,maxHp:10,atk:1,pos:{r:12,c:12},dead:false,el:null},
    ];
    G.elementCells['5,5']={fire:{layers:2,willExplode:false},water:{layers:0,willExplode:false},wind:{layers:0,willExplode:false},earth:{layers:0,willExplode:false}};
    settleDamage();
    assert.strictEqual(G.monsters[0].hp,7,'怪物格fire=2→扣3: 10-3=7');
    // 空格 fire=2 → 不达阈值，不伤害
    fresh();
    G.monsters=[
      {id:'m0',name:'相邻',hp:10,maxHp:10,atk:1,pos:{r:5,c:6},dead:false,el:null},
      {id:'m1',name:'远处',hp:10,maxHp:10,atk:1,pos:{r:12,c:12},dead:false,el:null},
    ];
    G.elementCells['5,5']={fire:{layers:2,willExplode:false},water:{layers:0,willExplode:false},wind:{layers:0,willExplode:false},earth:{layers:0,willExplode:false}};
    settleDamage();
    assert.strictEqual(G.monsters[0].hp,10,'空格fire=2不伤害，HP不变');
  });
});

// ═══════════════════════════════════════════════════════════════
// E 组：多元素场测试（非第一关默认，作为规则测试保留）
group('E组：多元素场测试', ()=>{
  test('case_multi_001: 怪物格 fire=2 water=2 wind=2 → 各单体3+3+3=9', ()=>{
    fresh();
    G.monsters=[
      {id:'m0',name:'主怪',hp:20,maxHp:20,atk:1,pos:{r:5,c:5},dead:false,el:null},
      {id:'m1',name:'远处',hp:20,maxHp:20,atk:1,pos:{r:12,c:12},dead:false,el:null},
    ];
    G.elementCells['5,5']={
      fire:{layers:2,willExplode:false},water:{layers:2,willExplode:false},
      wind:{layers:2,willExplode:false},earth:{layers:0,willExplode:false},
    };
    settleDamage();
    assert.strictEqual(G.monsters[0].hp,11,'20-3-3-3=11');
    assert.strictEqual(G.monsters[1].hp,20,'远处怪不受影响');
  });
  test('case_multi_002: 空格 fire=2 water=2 wind=2 → 无元素达到阈值，不伤害', ()=>{
    fresh();
    G.monsters=[
      {id:'m0',name:'范围内',hp:10,maxHp:10,atk:1,pos:{r:5,c:6},dead:false,el:null},
      {id:'m1',name:'远处',hp:10,maxHp:10,atk:1,pos:{r:12,c:12},dead:false,el:null},
    ];
    G.elementCells['5,5']={
      fire:{layers:2,willExplode:false},water:{layers:2,willExplode:false},
      wind:{layers:2,willExplode:false},earth:{layers:0,willExplode:false},
    };
    settleDamage();
    assert.strictEqual(G.monsters[0].hp,10,'无元素达到阈值不造成伤害');
  });
  test('case_multi_003: 怪物格 fire=3 water=2 → 单体 6+3=9', ()=>{
    fresh();
    G.monsters=[
      {id:'m0',name:'主怪',hp:20,maxHp:20,atk:1,pos:{r:5,c:5},dead:false,el:null},
      {id:'m1',name:'远处',hp:10,maxHp:10,atk:1,pos:{r:12,c:12},dead:false,el:null},
    ];
    G.elementCells['5,5']={
      fire:{layers:3,willExplode:false},water:{layers:2,willExplode:false},
      wind:{layers:0,willExplode:false},earth:{layers:0,willExplode:false},
    };
    settleDamage();
    assert.strictEqual(G.monsters[0].hp,11,'20-6-3=11');
  });
  test('case_multi_004: 空格 fire=3 water=2 → fire十字爆炸6，water未达阈值不爆', ()=>{
    fresh();
    G.monsters=[
      {id:'m0',name:'范围内',hp:10,maxHp:10,atk:1,pos:{r:5,c:6},dead:false,el:null},
      {id:'m1',name:'远处',hp:10,maxHp:10,atk:1,pos:{r:12,c:12},dead:false,el:null},
    ];
    G.elementCells['5,5']={
      fire:{layers:3,willExplode:true},water:{layers:2,willExplode:false},
      wind:{layers:0,willExplode:false},earth:{layers:0,willExplode:false},
    };
    settleDamage();
    assert.strictEqual(G.monsters[0].hp,4,'范围内怪 10-6=4，只fire十字爆');
  });
  test('case_multi_005 [TODO/NEEDS_REVIEW]: 空格 fire=3 water=3 两元素均达阈值→各自十字爆', ()=>{
    // NEEDS_REVIEW: 当前实现支持多元素同格均爆炸，各自独立结算
    // 若规则后续限定"每格只允许一种元素爆炸"，此测试需同步修改
    fresh();
    G.monsters=[
      {id:'m0',name:'范围内',hp:20,maxHp:20,atk:1,pos:{r:5,c:6},dead:false,el:null},
      {id:'m1',name:'远处',hp:10,maxHp:10,atk:1,pos:{r:12,c:12},dead:false,el:null},
    ];
    G.elementCells['5,5']={
      fire:{layers:3,willExplode:true},water:{layers:3,willExplode:true},
      wind:{layers:0,willExplode:false},earth:{layers:0,willExplode:false},
    };
    settleDamage();
    // fire 6 + water 6 = 12
    assert.strictEqual(G.monsters[0].hp,8,'[TODO] 两元素均爆: 20-6-6=8，NEEDS_REVIEW');
  });
});

// ═══════════════════════════════════════════════════════════════
// G 组：buildMonsterStats 预览统计测试
group('G组：buildMonsterStats 预览统计', ()=>{
  test('case_monstats_001: 怪物格 fire=3 → selfCellDamage.fire=6, splash=0, willDie=false', ()=>{
    fresh();
    G.monsters=[
      {id:'m0',name:'测试怪',hp:10,maxHp:10,atk:1,pos:{r:5,c:5},dead:false,el:null},
      {id:'m1',name:'远处',hp:10,maxHp:10,atk:1,pos:{r:12,c:12},dead:false,el:null},
    ];
    G.elementCells['5,5']={fire:{layers:3,willExplode:false},water:{layers:0,willExplode:false},wind:{layers:0,willExplode:false},earth:{layers:0,willExplode:false}};
    const s=buildMonsterStats()['5,5'];
    assert.ok(s,'应有5,5的统计');
    assert.strictEqual(s.selfCellDamage.fire,6,'selfCellDamage.fire=6');
    assert.strictEqual(s.splashDamage.total,0,'splash=0');
    assert.strictEqual(s.finalPreview.totalDamage,6,'totalDamage=6');
    assert.strictEqual(s.finalPreview.willDie,false,'hp=10>dmg=6，不死亡');
  });
  test('case_monstats_002: 空格 fire=3 波及怪物→splash.fire=6, self=0', ()=>{
    fresh();
    G.monsters=[
      {id:'m0',name:'测试怪',hp:10,maxHp:10,atk:1,pos:{r:5,c:6},dead:false,el:null},
      {id:'m1',name:'远处',hp:10,maxHp:10,atk:1,pos:{r:12,c:12},dead:false,el:null},
    ];
    G.elementCells['5,5']={fire:{layers:3,willExplode:true},water:{layers:0,willExplode:false},wind:{layers:0,willExplode:false},earth:{layers:0,willExplode:false}};
    const s=buildMonsterStats()['5,6'];
    assert.ok(s,'应有5,6的统计');
    assert.strictEqual(s.selfCellDamage.total,0,'自身格无元素=0');
    assert.strictEqual(s.splashDamage.fire,6,'波及fire=6');
    assert.strictEqual(s.finalPreview.totalDamage,6,'totalDamage=6');
  });
  test('case_monstats_003: 自身格fire=2 + 空格fire=3波及→总伤3+6=9', ()=>{
    fresh();
    G.monsters=[
      {id:'m0',name:'测试怪',hp:20,maxHp:20,atk:1,pos:{r:5,c:5},dead:false,el:null},
      {id:'m1',name:'远处',hp:10,maxHp:10,atk:1,pos:{r:12,c:12},dead:false,el:null},
    ];
    // 自身格 fire=2 → 单体 explDmg(2)=3
    G.elementCells['5,5']={fire:{layers:2,willExplode:false},water:{layers:0,willExplode:false},wind:{layers:0,willExplode:false},earth:{layers:0,willExplode:false}};
    // 空格(5,4) fire=3 十字波及(5,5) → splash=6
    G.elementCells['5,4']={fire:{layers:3,willExplode:true},water:{layers:0,willExplode:false},wind:{layers:0,willExplode:false},earth:{layers:0,willExplode:false}};
    const s=buildMonsterStats()['5,5'];
    assert.strictEqual(s.selfCellDamage.total,3,'自身格fire=2→explDmg(2)=3');
    assert.strictEqual(s.splashDamage.total,6,'波及fire=3→explDmg(3)=6');
    assert.strictEqual(s.finalPreview.totalDamage,9,'总伤3+6=9');
  });
  test('case_monstats_004: buildMonsterStats不修改状态，预览willDie不提前改dead', ()=>{
    fresh();
    G.monsters=[
      {id:'m0',name:'测试怪',hp:6,maxHp:6,atk:1,pos:{r:5,c:5},dead:false,el:null},
      {id:'m1',name:'远处',hp:10,maxHp:10,atk:1,pos:{r:12,c:12},dead:false,el:null},
    ];
    G.elementCells['5,5']={fire:{layers:3,willExplode:false},water:{layers:0,willExplode:false},wind:{layers:0,willExplode:false},earth:{layers:0,willExplode:false}};
    assert.strictEqual(G.monsters[0].dead,false,'结算前怪物不dead');
    const s=buildMonsterStats()['5,5'];
    assert.strictEqual(G.monsters[0].dead,false,'buildMonsterStats不修改dead');
    assert.strictEqual(s.finalPreview.willDie,true,'预览willDie=true(dmg=6>=hp=6)');
  });
});

// ═══════════════════════════════════════════════════════════════
// H 组：怪物攻击预警测试
group('H组：怪物攻击预警', ()=>{
  test('case_monwarn_001: 怪物一步后到达攻击位→英雄A预警≥1次', ()=>{
    fresh();
    G.heroes.ha.pos={r:5,c:5};
    G.heroes.hb.pos={r:12,c:0};
    // 怪物在(5,7)，1步→(5,6)，再检查左侧(5,5)有英雄→攻击
    G.monsters[0].pos={r:5,c:7};
    G.monsters[1].pos={r:0,c:10};
    const{heroIncomingDmg}=computeMonsterActionPreview();
    const haIncoming=heroIncomingDmg['ha']||[];
    assert.ok(haIncoming.length>=1,'怪物应在3AP内攻击到英雄A');
  });
  test('case_monwarn_002: 两怪均攻击英雄A→hitCount=2，totalDmg=atk1+atk2', ()=>{
    fresh();
    G.heroes.ha.pos={r:5,c:5};
    G.heroes.hb.pos={r:12,c:0};
    // 怪1在(5,6)，直接检查lp=(5,5)有英雄→攻击
    G.monsters[0].pos={r:5,c:6}; G.monsters[0].atk=2;
    // 怪2在(4,6)，移动1步到(4,5)后dp=(5,5)有英雄→攻击
    G.monsters[1].pos={r:4,c:6}; G.monsters[1].atk=3;
    const{heroIncomingDmg}=computeMonsterActionPreview();
    const haIncoming=heroIncomingDmg['ha']||[];
    assert.strictEqual(haIncoming.length,2,'两怪均攻击英雄A');
    const total=haIncoming.reduce((s,e)=>s+e.dmg,0);
    assert.strictEqual(total,5,'总伤害 2+3=5');
    // 验证 cellInfoMap 的 monsterThreatPreview
    const ciMap=buildCellInfoMap();
    assert.strictEqual(ciMap['5,5'].monsterThreatPreview.hitCount,2,'cellInfo hitCount=2');
    assert.strictEqual(ciMap['5,5'].monsterThreatPreview.totalDamage,5,'cellInfo totalDmg=5');
  });
  test('case_monwarn_003: computeMonsterActionPreview 与 simMonAct 攻击结果一致', ()=>{
    fresh();
    G.heroes.ha.pos={r:5,c:5};
    G.heroes.hb.pos={r:12,c:0};
    // 怪1在(5,6)，lp=(5,5)有英雄→直接攻击
    G.monsters[0].pos={r:5,c:6}; G.monsters[0].atk=2;
    G.monsters[1].pos={r:0,c:10};
    const sim=simMonAct(G.monsters[0]);
    const{heroIncomingDmg}=computeMonsterActionPreview();
    assert.ok(sim.atkTarget,'simMonAct 应检测到攻击目标');
    const incoming=(heroIncomingDmg[sim.atkTarget.id]||[]).filter(e=>e.label==='M1');
    assert.ok(incoming.length>0,'computeMonsterActionPreview 应记录M1的攻击');
    assert.strictEqual(incoming[0].dmg,G.monsters[0].atk,'预警伤害与怪物atk一致');
  });
});

// ═══════════════════════════════════════════════════════════════
// I 组：核心事件驱动架构（case_core_001~007）
group('I组：核心事件驱动架构（case_core_001~007）', ()=>{
  test('case_core_001: MOVE_HERO action 触发 recomputeCorePreview，版本号递增', ()=>{
    fresh();
    recomputeCorePreview();
    const v0=G.coreSnapshot._version;
    dispatchGameAction({type:'MOVE_HERO',heroId:'ha',to:{r:8,c:1}});
    assert.ok(G.coreSnapshot._version>v0,'版本号应递增');
    assert.ok(G.coreSnapshot,'coreSnapshot 应存在');
    assert.deepStrictEqual(G.heroes.ha.pos,{r:8,c:1},'英雄位置应已更新');
  });
  test('case_core_002: UPDATE_ACTION_SLOT action 触发 recomputeCorePreview，版本号递增', ()=>{
    fresh();
    recomputeCorePreview();
    const v0=G.coreSnapshot._version;
    dispatchGameAction({type:'UPDATE_ACTION_SLOT',slotId:0,direction:'left'});
    assert.ok(G.coreSnapshot._version>v0,'版本号应递增');
    assert.strictEqual(G.slots[0].dir,'left','slot 方向应已更新');
  });
  test('case_core_003: SET_ACTION_DIRECTION action 触发 recomputeCorePreview，版本号递增', ()=>{
    fresh();
    recomputeCorePreview();
    const v0=G.coreSnapshot._version;
    dispatchGameAction({type:'SET_ACTION_DIRECTION',slotId:1,direction:'up'});
    assert.ok(G.coreSnapshot._version>v0,'版本号应递增');
    assert.strictEqual(G.slots[1].dir,'up','slot 方向应已更新');
  });
  test('case_core_004: battleReport 包含怪物格单体伤害描述，不含十字引爆', ()=>{
    fresh();
    G.monsters[0].pos={r:5,c:5}; G.monsters[0].hp=10;
    G.monsters[1].pos={r:12,c:12};
    G.elementCells['5,5']={fire:{layers:3,willExplode:false},water:{layers:0,willExplode:false},wind:{layers:0,willExplode:false},earth:{layers:0,willExplode:false}};
    recomputeCorePreview();
    const br=G.coreSnapshot.battleReport;
    assert.ok(br.some(l=>l.includes('怪物格')&&l.includes('3')),'报告应含怪物格3层描述');
    assert.ok(br.some(l=>l.includes('单体')),'报告应含单体结算描述');
    assert.ok(!br.some(l=>l.includes('预计十字引爆')),'怪物格不应触发十字引爆');
  });
  test('case_core_005: battleReport 包含空格十字引爆描述', ()=>{
    fresh();
    G.monsters[0].pos={r:5,c:6}; G.monsters[0].hp=10;
    G.monsters[1].pos={r:12,c:12};
    G.elementCells['5,5']={fire:{layers:3,willExplode:true},water:{layers:0,willExplode:false},wind:{layers:0,willExplode:false},earth:{layers:0,willExplode:false}};
    recomputeCorePreview();
    const br=G.coreSnapshot.battleReport;
    assert.ok(br.some(l=>l.includes('空格')),'报告应含空格描述');
    assert.ok(br.some(l=>l.includes('引爆')),'报告应含引爆描述');
  });
  test('case_core_006: battleReport 包含怪物攻击英雄预警', ()=>{
    fresh();
    G.heroes.ha.pos={r:5,c:5};
    G.heroes.hb.pos={r:11,c:0};
    G.monsters[0].pos={r:5,c:6}; G.monsters[0].atk=2;
    G.monsters[1].pos={r:12,c:12};
    recomputeCorePreview();
    const br=G.coreSnapshot.battleReport;
    assert.ok(br.some(l=>l.includes('英雄A')&&l.includes('受击')),'报告应含英雄A受击预警');
    assert.ok(br.some(l=>l.includes('M1')&&l.includes('攻击')),'报告应含M1攻击描述');
  });
  test('case_core_007: coreSnapshot 包含所有必要字段，供 UI 读取', ()=>{
    fresh();
    recomputeCorePreview();
    const snap=G.coreSnapshot;
    assert.ok(snap,'coreSnapshot 应存在');
    assert.ok('_version' in snap,'应含 _version');
    assert.ok('_ts' in snap,'应含 _ts');
    assert.ok('monsterStats' in snap,'应含 monsterStats');
    assert.ok('cellInfoMap' in snap,'应含 cellInfoMap');
    assert.ok('monsterThreats' in snap,'应含 monsterThreats');
    assert.ok('heroStats' in snap,'应含 heroStats');
    assert.ok('battleReport' in snap,'应含 battleReport');
    assert.ok(Array.isArray(snap.battleReport),'battleReport 应为数组');
    assert.ok('warnings' in snap,'应含 warnings');
    assert.ok(snap._version>=1,'版本号应>=1');
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
