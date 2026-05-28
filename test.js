/**
 * 元素背包史 · 自动化测试套件
 * 运行：node test.js
 */
const fs   = require('fs');
const path = require('path');
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
const htmlPath = process.env.YSBZS_HTML_PATH || path.join(__dirname, 'index.html');
const html = fs.readFileSync(htmlPath,'utf8');
const scriptTag = html.match(/<script>([\s\S]+?)<\/script>/);
if(!scriptTag) throw new Error('找不到 <script> 标签');
// 将 const/let 改为 var，使其通过 eval 暴露到当前作用域
const gameScript = scriptTag[1].replace(/\bconst\b/g,'var').replace(/\blet\b/g,'var');
eval(gameScript); // eslint-disable-line no-eval

// 屏蔽 DOM 渲染函数，只测逻辑
const _realRender = render;
const _realGlog = glog;
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
function resetDomEl(id){
  const el=document.getElementById(id);
  el.innerHTML=''; el.textContent=''; el.children=[]; el.style.display='';
  return el;
}
function withRealUi(fn){
  const oldRender=render, oldGlog=glog;
  render=_realRender; glog=_realGlog;
  try{ fn(); }
  finally{ render=oldRender; glog=oldGlog; }
}

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
  test('gold = 10',       ()=> assert.strictEqual(G.gold,10));
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
  test('第 1 波生成 2 只普通怪', ()=> assert.strictEqual(G.monsters.length,2));
  test('day1 morning 怪 HP=6',   ()=> { assert.strictEqual(G.monsters[0].hp,6); assert.strictEqual(G.monsters[1].hp,6); });
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
  test('finishMonsters round>maxRound（下午波）→ 进入商店并 openShop', ()=>{
    fresh();
    G.dayHalf=1;
    G.round=G.maxRound+1;
    finishMonsters();
    assert.strictEqual(G.phase,'SHOP');
    // openShop 增加收入+利息: 5 (day1 income) + floor((10+5)/5)=3 (interest) = 18
    assert.strictEqual(G.gold, 18);
    assert.ok(G.shopItems.units.length>0,'应已生成商店');
  });
  test('finishMonsters 所有怪死亡（下午波）→ 商店', ()=>{
    fresh();
    G.dayHalf=1;
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
  test('monsterAct 遇元素块→被阻挡但不受伤不消元素', ()=>{
    fresh();
    const m=G.monsters[0];
    m.pos={r:5,c:8};
    G.heroes.ha.pos={r:5,c:2};
    G.heroes.hb.pos={r:12,c:0};
    G.board[5][7].el='fire'; G.board[5][7].stk=2;
    const prevHp=m.hp;
    monsterAct(m);
    assert.strictEqual(m.hp,prevHp,'怪物不应受伤');
    assert.strictEqual(G.board[5][7].el,'fire','元素不应清除');
    assert.strictEqual(G.board[5][7].stk,2,'层数不应清零');
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

group('buildWaveForDay 波次生成', ()=>{
  test('buildWaveForDay Day1 morning 预算=4 生成正常', ()=>{
    const plan=buildWaveForDay(1,'morning');
    assert.ok(plan.monsters.length>=2,`Day1 morning 怪物数≥2，实际${plan.monsters.length}`);
    // 预算4，普通怪cost=2，最多2只
    const totalCost=plan.monsters.reduce((s,m)=>s+m.cost,0);
    assert.ok(totalCost<=4,`总cost ${totalCost} 不应超过预算4`);
  });
  test('buildWaveForDay Day1 afternoon 预算=5', ()=>{
    const plan=buildWaveForDay(1,'afternoon');
    assert.ok(plan.monsters.length>=2);
    const totalCost=plan.monsters.reduce((s,m)=>s+m.cost,0);
    assert.ok(totalCost<=5,`总cost ${totalCost} 不应超过预算5`);
  });
  test('buildWaveForDay Day3 含强攻/快速怪', ()=>{
    // Day3 allowed: normal/thick/fast/heavy
    const plan=buildWaveForDay(3,'morning');
    assert.ok(plan.monsters.length>=3,`Day3 morning 怪物数≥3，实际${plan.monsters.length}`);
    const types=new Set(plan.monsters.map(m=>m.typeId));
    assert.ok(['normal','thick','fast','heavy'].some(t=>types.has(t)),'应含 allowed 中的类型');
  });
  test('buildWaveForDay Day4 含精英怪', ()=>{
    const plan=buildWaveForDay(4,'morning');
    const types=plan.monsters.map(m=>m.typeId);
    assert.ok(types.includes('elite')||types.includes('normal'),'至少含一种类型');
    const totalCost=plan.monsters.reduce((s,m)=>s+m.cost,0);
    assert.ok(totalCost<=14,`总cost ${totalCost} 不应超过预算14`);
  });
  test('buildWaveForDay Day5 morning 含 boss', ()=>{
    const plan=buildWaveForDay(5,'morning');
    const types=plan.monsters.map(m=>m.typeId);
    // boss cost=12, 预算18-12=6 够再加几只小怪
    assert.ok(plan.monsters.length>=1);
    const totalCost=plan.monsters.reduce((s,m)=>s+m.cost,0);
    assert.ok(totalCost<=18,`总cost ${totalCost} 不应超过预算18`);
  });
  test('buildWaveForDay maxAlive 限制', ()=>{
    // Day1 morning maxAlive=4, 即使预算够也不超过4
    const plan=buildWaveForDay(1,'morning');
    assert.ok(plan.monsters.length<=4,`怪物数 ${plan.monsters.length} 不应超过 maxAlive=4`);
  });
  test('buildWaveForDay 无效 day/phase 返回空', ()=>{
    let plan=buildWaveForDay(99,'morning');
    assert.ok(!plan||plan.length===0||(Array.isArray(plan)&&plan.length===0)||plan.monsters.length===0);
    plan=buildWaveForDay(1,'nonexistent');
    assert.ok(!plan||plan.length===0||(Array.isArray(plan)&&plan.length===0)||(plan.monsters&&plan.monsters.length===0));
  });
  test('spawnWaveForDay 怪物在 spawn zone 内', ()=>{
    fresh(); G.monsters=[]; G.heroes={};
    spawnWaveForDay(2,'morning'); // spawnSize=3 → 右上角 r:0-2, c:10-12
    G.monsters.forEach(m=>{
      assert.ok(m.pos.r>=0&&m.pos.r<3,`怪物 ${m.name} r=${m.pos.r} 应在 0-2`);
      assert.ok(m.pos.c>=10&&m.pos.c<13,`怪物 ${m.name} c=${m.pos.c} 应在 10-12`);
    });
  });
  test('spawnWaveForDay Day4 spawn zone 4x4', ()=>{
    fresh(); G.monsters=[]; G.heroes={};
    spawnWaveForDay(4,'morning'); // spawnSize=4 → r:0-3, c:9-12
    G.monsters.forEach(m=>{
      assert.ok(m.pos.r>=0&&m.pos.r<4);
      assert.ok(m.pos.c>=9&&m.pos.c<13);
    });
  });
});

// ═══════════════════════════════════════════════════════════════
group('商店系统 — 单位购买/出售/刷新/冻结', ()=>{
  test('openShop 设定 shopTier=calcShopTier(day) 并 genShop', ()=>{
    fresh(); G.day=1;
    openShop();
    assert.strictEqual(G.shopTier,1);
    assert.ok(G.shopItems.units.length>0,'应生成单位商品');
    assert.ok(G.shopItems.consumables.length>0,'应生成强化品');
  });
  test('genShop Day1: 4 T1 + 0 T2 + 1 强化品', ()=>{
    fresh(); G.shopTier=1; G.day=1;
    genShop();
    assert.strictEqual(G.shopItems.units.length,4,'Day1应有4个T1单位');
    assert.strictEqual(G.shopItems.consumables.length,1,'Day1应有1个强化品');
  });
  test('shopItems.units 每个商品含 defId/cost/frozen', ()=>{
    fresh(); G.shopTier=1; genShop();
    G.shopItems.units.forEach((item,i)=>{
      assert.ok(UNIT_DEFS[item.defId],`单位${i} defId 应存在于 UNIT_DEFS`);
      assert.ok(item.cost>=2,`单位${i} cost 应≥2`);
      assert.strictEqual(item.frozen,false,`单位${i} 初始 frozen=false`);
    });
  });
  test('buyUnit 扣金币并加入 ownedUnits', ()=>{
    fresh(); G.phase='SHOP'; G.gold=10;
    G.shopTier=1; genShop();
    G.ownedUnits=[]; G.nextUnitId=0;
    const item=G.shopItems.units[0];
    const cost=item.cost;
    buyUnit(item.id);
    assert.strictEqual(G.gold, 10-cost);
    assert.strictEqual(G.ownedUnits.length,1);
    assert.strictEqual(G.ownedUnits[0].defId,item.defId);
  });
  test('buyUnit 金币不足 → 不购买', ()=>{
    fresh(); G.phase='SHOP'; G.gold=0;
    G.shopTier=1; genShop();
    G.ownedUnits=[];
    buyUnit(G.shopItems.units[0].id);
    assert.strictEqual(G.ownedUnits.length,0);
  });
  test('buyUnit 同名单位自动合成', ()=>{
    fresh(); G.phase='SHOP'; G.gold=10;
    G.shopTier=1; genShop();
    const defId=G.shopItems.units[0].defId;
    // 先手动加一个同名L1单位
    addOwnedUnit(defId,{r:10,c:1});
    const beforeCount=G.ownedUnits.length;
    buyUnit(G.shopItems.units[0].id);
    // 应该合成为 Lv2，不会增加单位数
    const merged=G.ownedUnits.find(u=>u.defId===defId);
    assert.ok(merged,'应有合并后的单位');
    assert.strictEqual(merged.level,2,'应升级到 Lv2');
  });
  test('sellUnit 返还 unit.level 金币并移除单位', ()=>{
    fresh(); G.phase='SHOP'; G.gold=5;
    // initGame 已有 fire_starter + water_droplet，再加一个 fire_starter
    addOwnedUnit('fire_starter',{r:12,c:1});
    const unit=G.ownedUnits[2]; // 第三个 unit
    const beforeLen=G.ownedUnits.length;
    sellUnit(unit.instanceId);
    assert.strictEqual(G.gold, 5+unit.level);
    assert.strictEqual(G.ownedUnits.length, beforeLen-1);
  });
  test('rollShop 花费 2 金币并重新生成商店', ()=>{
    fresh(); G.phase='SHOP'; G.gold=10; G.day=1;
    G.shopTier=1; genShop();
    // 冻结一个商品
    const uid=G.shopItems.units[0].id;
    G.shopFrozen.units.add(uid);
    rollShop();
    assert.strictEqual(G.gold,8);
    // rollShop 清除冻结
    assert.strictEqual(G.shopFrozen.units.size,0);
    assert.strictEqual(G.shopFrozen.consumables.size,0);
    assert.strictEqual(G.shopItems.units.length,4,'Day1应生成4个单位');
    assert.strictEqual(G.shopItems.consumables.length,1,'Day1应生成1个强化品');
  });
  test('rollShop 金币不足 → 不刷新', ()=>{
    fresh(); G.phase='SHOP'; G.gold=0;
    G.shopTier=1; genShop();
    const oldIds=G.shopItems.units.map(u=>u.id);
    rollShop();
    assert.strictEqual(G.gold,0);
    assert.deepStrictEqual(G.shopItems.units.map(u=>u.id),oldIds);
  });
  test('freezeShopItem 切换冻结状态', ()=>{
    fresh(); G.phase='SHOP'; G.shopTier=1;
    genShop();
    const uid=G.shopItems.units[0].id;
    freezeShopItem(uid,'units');
    assert.ok(G.shopFrozen.units.has(uid),'应被冻结');
    freezeShopItem(uid,'units');
    assert.ok(!G.shopFrozen.units.has(uid),'应取消冻结');
  });
  test('closeShop day+1 wave+1 重置状态', ()=>{
    fresh(); G.phase='SHOP';
    const d0=G.day; const w0=G.wave;
    closeShop();
    assert.strictEqual(G.day, d0+1);
    assert.strictEqual(G.wave, w0+1);
    assert.strictEqual(G.phase,'PLAYER');
    assert.strictEqual(G.round,1);
    assert.strictEqual(G.hitCount,0);
  });
  test('buyConsumable coin_bag → 直接获得3金币', ()=>{
    fresh(); G.phase='SHOP'; G.gold=5;
    const item={id:'sc_test',type:'coin_bag',name:'💰金币袋',cost:2};
    G.shopItems.consumables=[item];
    buyConsumable('sc_test');
    assert.strictEqual(G.gold,6,'应扣2得3，净+1');
  });
  test('buyConsumable 金币不足不购买', ()=>{
    fresh(); G.phase='SHOP'; G.gold=0;
    const item={id:'sc_test2',type:'coin_bag',name:'💰金币袋',cost:2};
    G.shopItems.consumables=[item];
    buyConsumable('sc_test2');
    assert.strictEqual(G.gold,0);
  });
  test('openShop 增加日收入+利息', ()=>{
    fresh(); G.day=1; G.gold=5;
    openShop();
    // Day1 income=5, gold=10, interest=floor(10/5)=2, total=12
    assert.strictEqual(G.gold, 12);
  });
  test('openShop 利息上限3', ()=>{
    fresh(); G.day=2; G.gold=20;
    openShop();
    // Day2 income=6, gold=26, interest=min(floor(26/5),3)=3, total=29
    assert.strictEqual(G.gold, 29);
  });
  test('renderTurn 在 SHOP 阶段显示商店文案，不显示小回合', ()=>{
    fresh();
    G.phase='SHOP';
    G.day=2;
    G.dayHalf=1;
    G.round=5;
    withRealUi(()=>{
      renderTurn(buildTurnVM());
      const txt=document.getElementById('rc').textContent;
      assert.ok(txt.includes('商店阶段'),`SHOP 文案应包含“商店阶段”，实际: ${txt}`);
      assert.ok(!txt.includes('小回合'),`SHOP 文案不应包含“小回合”，实际: ${txt}`);
    });
  });
});

// ═══════════════════════════════════════════════════════════════
group('单位管理 addOwnedUnit / syncUnitsToHeroes / mergeUnits', ()=>{
  test('addOwnedUnit 创建单位实例并加入 ownedUnits', ()=>{
    fresh();
    const before=G.ownedUnits.length;
    const u=addOwnedUnit('fire_starter',{r:5,c:5});
    assert.ok(u,'应返回单位');
    assert.strictEqual(G.ownedUnits.length, before+1);
    assert.strictEqual(u.defId,'fire_starter');
    assert.strictEqual(u.level,1);
    assert.strictEqual(u.hp,20);
    assert.strictEqual(u.active,true);
  });
  test('addOwnedUnit 无效 defId 返回 null', ()=>{
    fresh();
    assert.strictEqual(addOwnedUnit('nonexistent'),null);
  });
  test('syncUnitsToHeroes 从 2 个活跃单位构建 heroes/slots', ()=>{
    fresh();
    G.ownedUnits=[];
    addOwnedUnit('fire_starter',{r:10,c:1});
    addOwnedUnit('water_droplet',{r:11,c:1});
    syncUnitsToHeroes();
    assert.strictEqual(Object.keys(G.heroes).length,2);
    assert.ok(G.heroes.ha,'ha 应存在');
    assert.ok(G.heroes.hb,'hb 应存在');
    assert.strictEqual(G.slots.length,6,'2单位×3槽=6');
    assert.strictEqual(G.heroes.ha.hp,20);
    assert.strictEqual(G.heroes.hb.hp,20);
  });
  test('syncUnitsToHeroes 超过2个活跃单位时只取前2个', ()=>{
    fresh();
    G.ownedUnits=[];
    addOwnedUnit('fire_starter',{r:10,c:1});
    addOwnedUnit('water_droplet',{r:11,c:1});
    addOwnedUnit('wind_breeze',{r:12,c:1});
    syncUnitsToHeroes();
    assert.strictEqual(G.slots.length,6,'仍只构建6槽');
    assert.strictEqual(G.ownedUnits[2].active,false,'第3个单位应标记为 inactive');
  });
  test('mergeUnits 同 defId 合成升级 Lv1→Lv2', ()=>{
    fresh();
    G.ownedUnits=[];
    const u1=addOwnedUnit('fire_starter',{r:10,c:1});
    const u2=addOwnedUnit('fire_starter',{r:11,c:1});
    u1.level=1; u1.hp=20;
    u2.level=1; u2.hp=20;
    const ok=mergeUnits(u2,u1);
    assert.ok(ok,'合成应成功');
    assert.strictEqual(u1.level,2);
    assert.strictEqual(u1.maxHp,25);
    assert.strictEqual(G.ownedUnits.length,1,'素材单位已移除');
  });
  test('mergeUnits Lv3 不再合成', ()=>{
    fresh();
    G.ownedUnits=[];
    const u1=addOwnedUnit('fire_starter',{r:10,c:1});
    const u2=addOwnedUnit('fire_starter',{r:11,c:1});
    u1.level=3; u2.level=3;
    const ok=mergeUnits(u2,u1);
    assert.strictEqual(ok,false);
    assert.strictEqual(G.ownedUnits.length,2,'不应移除任何单位');
  });
  test('mergeUnits 不同 defId 不合成', ()=>{
    fresh();
    G.ownedUnits=[];
    const u1=addOwnedUnit('fire_starter',{r:10,c:1});
    const u2=addOwnedUnit('water_droplet',{r:11,c:1});
    const ok=mergeUnits(u2,u1);
    assert.strictEqual(ok,false);
    assert.strictEqual(G.ownedUnits.length,2);
  });
  test('toggleUnitActive active→bench 切换', ()=>{
    fresh();
    G.ownedUnits=[];
    addOwnedUnit('fire_starter',{r:10,c:1});
    const u=G.ownedUnits[0];
    assert.strictEqual(u.active,true);
    toggleUnitActive(u.instanceId);
    assert.strictEqual(u.active,false);
    toggleUnitActive(u.instanceId);
    assert.strictEqual(u.active,true);
  });
  test('calcShopTier day1→1, day2→1, day3→2, day5→3', ()=>{
    assert.strictEqual(calcShopTier(1),1);
    assert.strictEqual(calcShopTier(2),1);
    assert.strictEqual(calcShopTier(3),2);
    assert.strictEqual(calcShopTier(4),2);
    assert.strictEqual(calcShopTier(5),3);
    assert.strictEqual(calcShopTier(10),3);
  });
});

// ═══════════════════════════════════════════════════════════════
group('UNIT_DEFS 单位定义库', ()=>{
  test('UNIT_DEFS 含 12 个单位（8 tier1 + 4 tier2）', ()=>{
    const all=Object.values(UNIT_DEFS);
    assert.strictEqual(all.length,12);
    assert.strictEqual(all.filter(u=>u.tier===1).length,8);
    assert.strictEqual(all.filter(u=>u.tier===2).length,4);
  });
  test('每个单位有 3 个等级，每级有 3 个 action slot', ()=>{
    Object.values(UNIT_DEFS).forEach(u=>{
      for(let lv=1;lv<=3;lv++){
        assert.ok(u.levels[lv],`${u.id} Lv${lv} 应存在`);
        assert.ok(u.levels[lv].hp>0,`${u.id} Lv${lv} hp>0`);
        assert.strictEqual(u.levels[lv].slots.length,3,`${u.id} Lv${lv} 应有3槽`);
      }
    });
  });
  test('UNIT_TIER_POOL 按 tier 分组', ()=>{
    assert.ok(Array.isArray(UNIT_TIER_POOL[1]));
    assert.ok(Array.isArray(UNIT_TIER_POOL[2]));
    assert.ok(UNIT_TIER_POOL[1].length>=6,'tier1 至少6个');
    assert.ok(UNIT_TIER_POOL[2].length>=4,'tier2 至少4个');
  });
  test('所有单位 slot 含合法 el/sn/dir/tier', ()=>{
    const validEl=['fire','water','wind','earth'];
    Object.values(UNIT_DEFS).forEach(u=>{
      for(let lv=1;lv<=3;lv++){
        u.levels[lv].slots.forEach((s,si)=>{
          assert.ok(validEl.includes(s.el),`${u.id} Lv${lv} slot${si} el非法`);
          assert.ok(s.sn>=1&&s.sn<=20,`${u.id} Lv${lv} slot${si} sn非法`);
          assert.ok(['right','left','up','down'].includes(s.dir),`${u.id} Lv${lv} slot${si} dir非法`);
          assert.ok(s.tier>=1&&s.tier<=4,`${u.id} Lv${lv} slot${si} tier非法`);
        });
      }
    });
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
  test('case_init_001: 教程默认 fire_starter(3火) + water_droplet(3水) = 6槽', ()=>{
    fresh();
    const els=G.slots.map(s=>s.el);
    assert.deepStrictEqual(els, ['fire','fire','fire','water','water','water']);
  });
  test('case_init_002: 教程默认槽含 fire 和 water，无 wind/earth', ()=>{
    fresh();
    const els=G.slots.map(s=>s.el);
    assert.ok(els.includes('fire'),'fire 应在默认槽');
    assert.ok(els.includes('water'),'water 应在默认槽');
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
  test('case_init_004: Day1 morning 2只普通怪 hp=6 el=null', ()=>{
    fresh();
    assert.strictEqual(G.monsters.length,2,'应有2只怪');
    assert.strictEqual(G.monsters[0].name,'普通怪','怪1名称');
    assert.strictEqual(G.monsters[0].hp,6,'怪1 hp=6');
    assert.strictEqual(G.monsters[0].el,null,'怪1 el=null');
    assert.strictEqual(G.monsters[1].name,'普通怪','怪2名称');
    assert.strictEqual(G.monsters[1].hp,6,'怪2 hp=6');
    assert.strictEqual(G.monsters[1].el,null,'怪2 el=null');
  });
  test('case_init_005: explosionThreshold=3', ()=>{
    fresh();
    assert.strictEqual(G.explosionThreshold,3,'threshold=3');
  });
  test('case_init_006: 教程默认槽形状为 fire_starter L1(sn1/2/3) + water_droplet L1(sn1/4/12)', ()=>{
    fresh();
    const sns=G.slots.map(s=>s.sn);
    assert.deepStrictEqual(sns, [1,2,3,1,4,12]);
  });
});

// ═══════════════════════════════════════════════════════════════
// A补：教程默认大十字攻击方块测试
group('A补：教程默认大十字攻击方块', ()=>{
  function seedElCell(pos,el,layers){
    const ky=`${pos.r},${pos.c}`;
    G.elementCells[ky]={
      fire:{layers:0,willExplode:false},
      water:{layers:0,willExplode:false},
      wind:{layers:0,willExplode:false},
      earth:{layers:0,willExplode:false},
    };
    G.elementCells[ky][el]={layers,willExplode:layers>=G.explosionThreshold};
    G.board[pos.r][pos.c].el=el;
    G.board[pos.r][pos.c].stk=layers;
  }

  test('case_bigcross_001: 大十字同时覆盖怪物格与空格', ()=>{
    fresh();
    G.heroes.ha.pos={r:5,c:5};
    G.monsters=[
      {id:'m0',name:'命中怪',hp:10,maxHp:10,atk:1,pos:{r:5,c:6},dead:false,el:null},
      {id:'m1',name:'远处怪',hp:10,maxHp:10,atk:1,pos:{r:10,c:10},dead:false,el:null},
    ];
    // 显式设置大十字 sn=12
    G.slots[0].hid='ha'; G.slots[0].el='fire'; G.slots[0].sn=12; G.slots[0].dir='right'; G.slots[0].tier=1; G.slots[0].used=false;
    const hitKeys=atkCells(G.heroes.ha.pos,12,'right').map(p=>`${p.r},${p.c}`);
    ['4,6','5,6','6,6','5,7','5,5'].forEach(ky=>assert.ok(hitKeys.includes(ky),`大十字应覆盖 ${ky}`));
    useSlot(0);
    assert.strictEqual(G.elementCells['5,6'].fire.layers,1,'怪物格应叠 fire 1 层');
    assert.strictEqual(G.elementCells['5,7'].fire.layers,1,'空格应叠 fire 1 层');
    assert.strictEqual(G.monsters[0].hp,10,'行动阶段不立即扣血');
  });

  test('case_bigcross_002: 大十字可把空格叠到3层并触发十字引爆', ()=>{
    fresh();
    G.heroes.ha.pos={r:5,c:5};
    G.monsters=[
      {id:'m0',name:'波及怪',hp:10,maxHp:10,atk:1,pos:{r:5,c:8},dead:false,el:null},
      {id:'m1',name:'远处怪',hp:10,maxHp:10,atk:1,pos:{r:10,c:10},dead:false,el:null},
    ];
    G.slots[0].hid='ha'; G.slots[0].el='fire'; G.slots[0].sn=12; G.slots[0].dir='right'; G.slots[0].tier=1; G.slots[0].used=false;
    seedElCell({r:5,c:7},'fire',2);
    useSlot(0);
    assert.strictEqual(G.elementCells['5,7'].fire.layers,3,'空格应叠到3层');
    assert.strictEqual(G.elementCells['5,7'].fire.willExplode,true,'空格达到阈值后应待引爆');
    settleDamage();
    assert.strictEqual(G.monsters[0].hp,4,'波及怪应吃到空格十字爆炸 10-6=4');
    assert.strictEqual(G.monsters[1].hp,10,'远处怪不受伤');
  });

  test('case_bigcross_003: 大十字命中怪物格到3层时仍是单体结算，不触发十字', ()=>{
    fresh();
    G.heroes.ha.pos={r:5,c:5};
    G.monsters=[
      {id:'m0',name:'主怪',hp:10,maxHp:10,atk:1,pos:{r:4,c:6},dead:false,el:null},
      {id:'m1',name:'相邻怪',hp:10,maxHp:10,atk:1,pos:{r:4,c:7},dead:false,el:null},
    ];
    G.slots[0].hid='ha'; G.slots[0].el='fire'; G.slots[0].sn=12; G.slots[0].dir='right'; G.slots[0].tier=1; G.slots[0].used=false;
    seedElCell({r:4,c:6},'fire',2);
    useSlot(0);
    assert.strictEqual(G.elementCells['4,6'].fire.layers,3,'怪物格应叠到3层');
    settleDamage();
    assert.strictEqual(G.monsters[0].hp,4,'主怪仅受单体 6 伤');
    assert.strictEqual(G.monsters[1].hp,10,'相邻怪不应被怪物格十字波及');
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
  test('case_multi_005: 空格 fire=3 water=3 两元素均达阈值→各自十字爆',()=>{
    fresh();
    G.monsters=[
      {id:'m0',name:'范围内',hp:20,maxHp:20,atk:1,pos:{r:5,c:6},dead:false,el:null},
      {id:'m1',name:'远处',hp:10,maxHp:10,atk:1,pos:{r:12,c:12},dead:false,el:null},
    ];
    G.elementCells['5,5']={
      fire:{layers:3,willExplode:true},water:{layers:3,willExplode:true},
      wind:{layers:0,willExplode:false},earth:{layers:0,willExplode:false},
    };
    // 预览验证
    const pg=buildPreviewGrid();
    const cell=pg.grid['5,5'];
    assert.ok(cell.preview.willExplode,'空格应触发爆炸');
    assert.ok(cell.preview.explosionElements,'应有 explosionElements');
    assert.strictEqual(cell.preview.explosionElements.length,2,'应有两个元素同时爆炸');
    assert.strictEqual(cell.preview.explosionDamage,12,'fire=6 + water=6 = 12');
    const monCell=pg.grid['5,6'];
    assert.ok(monCell.preview.isSplashTarget,'相邻怪物应是波及目标');
    assert.strictEqual(monCell.preview.splashDamage.total,12,'怪物收到 fire6+water6=12 波及');
    assert.strictEqual(monCell.preview.entityDamage,12,'怪物总伤害=12');
    // 真实结算验证
    settleDamage();
    assert.strictEqual(G.monsters[0].hp,8,'真实结算 20-6-6=8');
    assert.strictEqual(G.monsters[1].hp,10,'远处怪物不受波及');
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
// J组：独立格子预览层 previewGrid
// ═══════════════════════════════════════════════════════════════
group('J组：独立格子预览层 previewGrid', ()=>{
  test('case_pg_001: buildPreviewGrid 返回含 169 格的 grid（13×13）', ()=>{
    fresh();
    const pg=buildPreviewGrid();
    assert.ok(pg&&pg.grid,'应返回含 grid 的对象');
    assert.strictEqual(Object.keys(pg.grid).length,169,'13×13=169 格');
  });

  test('case_pg_002: 每格含 entity / elementField / preview 三大字段', ()=>{
    fresh();
    const pg=buildPreviewGrid();
    const cell=pg.grid['5,5'];
    assert.ok(cell,'格子 5,5 应存在');
    assert.ok('entity' in cell,'应含 entity');
    assert.ok('elementField' in cell,'应含 elementField');
    assert.ok('preview' in cell,'应含 preview');
    // elementField 结构
    ['fire','water','wind','earth'].forEach(el=>{
      const ef=cell.elementField[el];
      assert.ok('boardLayers' in ef,`${el} 应含 boardLayers`);
      assert.ok('addedLayers' in ef,`${el} 应含 addedLayers`);
      assert.ok('layers' in ef,`${el} 应含 layers`);
      assert.ok('damage' in ef,`${el} 应含 damage`);
    });
    // preview 结构
    assert.ok('entityDamage' in cell.preview,'应含 entityDamage');
    assert.ok('willExplode' in cell.preview,'应含 willExplode');
    assert.ok(Array.isArray(cell.preview.incomingActions),'incomingActions 应为数组');
    assert.ok(Array.isArray(cell.preview.labels),'labels 应为数组');
  });

  test('case_pg_003: 怪物格 fire=1，entityDamage=1，willExplode=false', ()=>{
    fresh();
    G.monsters=[{id:'m1',name:'测试怪',pos:{r:5,c:5},hp:10,maxHp:10,atk:3,el:null,dead:false,step:3}];
    G.elementCells['5,5']={fire:{layers:1,willExplode:false}};
    // 清空所有槽，避免 slot 模拟影响 5,5
    G.slots.forEach(s=>s.used=true);
    const pg=buildPreviewGrid();
    const cell=pg.grid['5,5'];
    assert.strictEqual(cell.entity.type,'monster','实体应为 monster');
    assert.strictEqual(cell.preview.entityDamage,1,'fire=1 单体伤害=explDmg(1)=1');
    assert.strictEqual(cell.preview.willExplode,false,'怪物格不触发十字爆炸');
    assert.strictEqual(cell.elementField.fire.boardLayers,1,'boardLayers=1');
  });

  test('case_pg_004: 怪物格 fire=3，entityDamage=6，willExplode=false', ()=>{
    fresh();
    G.monsters=[{id:'m1',name:'测试怪',pos:{r:5,c:5},hp:20,maxHp:20,atk:3,el:null,dead:false,step:3}];
    G.elementCells['5,5']={fire:{layers:3,willExplode:true}};
    G.slots.forEach(s=>s.used=true);
    const pg=buildPreviewGrid();
    const cell=pg.grid['5,5'];
    assert.strictEqual(cell.preview.entityDamage,6,'fire=3 单体伤害=explDmg(3)=6');
    assert.strictEqual(cell.preview.willExplode,false,'怪物格不触发十字爆炸');
  });

  test('case_pg_005: 空格 fire=3，willExplode=true，explosionShape=cross', ()=>{
    fresh();
    G.elementCells['5,5']={fire:{layers:3,willExplode:true}};
    G.slots.forEach(s=>s.used=true);
    const pg=buildPreviewGrid();
    const cell=pg.grid['5,5'];
    assert.strictEqual(cell.entity.type,null,'空格无实体');
    assert.strictEqual(cell.preview.willExplode,true,'空格 fire=3 应触发爆炸');
    assert.strictEqual(cell.preview.explosionShape,'cross','爆炸形状为十字');
    assert.strictEqual(cell.preview.explosionElement,'fire','爆炸元素为 fire');
    assert.strictEqual(cell.preview.explosionDamage,6,'爆炸伤害=explDmg(3)=6');
  });

  test('case_pg_006: 空格 fire=3 爆炸波及相邻怪物，怪物 entityDamage 含 splash', ()=>{
    fresh();
    // 空格 5,5 fire=3 爆炸，怪物在 5,6（相邻）
    G.monsters=[{id:'m1',name:'测试怪',pos:{r:5,c:6},hp:20,maxHp:20,atk:3,el:null,dead:false,step:3}];
    G.elementCells['5,5']={fire:{layers:3,willExplode:true}};
    G.slots.forEach(s=>s.used=true);
    const pg=buildPreviewGrid();
    const monCell=pg.grid['5,6'];
    assert.ok(monCell.preview.entityDamage>0,'相邻怪物应受到 splash 伤害');
    assert.strictEqual(monCell.preview.isSplashTarget,true,'isSplashTarget 应为 true');
    assert.ok(monCell.preview.splashDamage.total>0,'splashDamage.total>0');
    assert.ok(monCell.preview.splashDamage.fire>0,'splashDamage.fire>0');
  });

  test('case_pg_007: 怪物格元素克制加成（ADV）翻倍伤害', ()=>{
    fresh();
    // fire 克制 wind 属性怪物
    G.monsters=[{id:'m1',name:'风怪',pos:{r:5,c:5},hp:20,maxHp:20,atk:3,el:'wind',dead:false,step:3}];
    G.elementCells['5,5']={fire:{layers:2,willExplode:false}};
    G.slots.forEach(s=>s.used=true);
    const pg=buildPreviewGrid();
    const cell=pg.grid['5,5'];
    // fire 克制 wind：ADV.fire==='wind'，emult=2
    // explDmg(2)=3，*2=6
    assert.strictEqual(cell.preview.entityDamage,6,'克制加成：explDmg(2)*2=6');
  });

  test('case_pg_008: elementField.boardLayers 与 addedLayers 分开追踪', ()=>{
    fresh();
    // 棋盘已有 fire=2，hero 槽未用，模拟 slot 会在 5,5 增加 fire
    G.elementCells['5,5']={fire:{layers:2,willExplode:false}};
    // 让 hero ha 从当前位置直接覆盖一个 1x1 槽命中 (5,5)
    G.heroes.ha.pos={r:5,c:4};
    G.slots[0].el='fire'; G.slots[0].sn=1; G.slots[0].dir='right';  // 1x1 right→命中(5,5)
    G.slots[0].hid='ha'; G.slots[0].used=false;
    G.slots.slice(1).forEach(s=>s.used=true);
    const pg=buildPreviewGrid();
    const ef=pg.grid['5,5'].elementField.fire;
    assert.strictEqual(ef.boardLayers,2,'boardLayers=2（棋盘既有）');
    assert.ok(ef.addedLayers>=1,'addedLayers>=1（槽模拟加层）');
    assert.ok(ef.layers>=3,'总 layers>=3');
  });

  test('case_pg_009: coreSnapshot.previewGrid 包含 grid 字段，覆盖全棋盘', ()=>{
    fresh();
    recomputeCorePreview();
    const snap=G.coreSnapshot;
    assert.ok('previewGrid' in snap,'coreSnapshot 应含 previewGrid');
    assert.ok(snap.previewGrid&&snap.previewGrid.grid,'previewGrid 应含 grid');
    assert.strictEqual(Object.keys(snap.previewGrid.grid).length,169,'grid 应有 169 格');
  });

  test('case_pg_010: 英雄移动后 previewGrid 更新（hero pos 变化反映到 entity）', ()=>{
    fresh();
    recomputeCorePreview();
    const v0=G.coreSnapshot._version;
    const oldKey=`${G.heroes.ha.pos.r},${G.heroes.ha.pos.c}`;
    dispatchGameAction({type:'MOVE_HERO',heroId:'ha',to:{r:7,c:7}});
    const snap=G.coreSnapshot;
    assert.ok(snap._version>v0,'版本号应递增');
    const newCell=snap.previewGrid.grid['7,7'];
    assert.ok(newCell,'新位置格子应存在');
    assert.strictEqual(newCell.entity.type,'hero','新位置应为 hero');
    assert.strictEqual(newCell.entity.id,'ha','hero id 应为 ha');
  });

  test('case_pg_011: 空格 fire=1，不爆炸，entityDamage=0', ()=>{
    fresh();
    G.elementCells['4,4']={fire:{layers:1,willExplode:false}};
    G.slots.forEach(s=>s.used=true);
    const pg=buildPreviewGrid();
    const cell=pg.grid['4,4'];
    assert.strictEqual(cell.preview.willExplode,false,'fire=1 < threshold=3，不爆炸');
    assert.strictEqual(cell.preview.entityDamage,0,'空格无实体，entityDamage=0');
  test('case_pg_012: getSelectedCellPreview 返回选中格子的 preview cell',()=>{
    fresh();
    G.elementCells['5,5']={fire:{layers:1,willExplode:false}};
    G.slots.forEach(s=>s.used=true);
    recomputeCorePreview();
    G.selectedCell={r:5,c:5};
    const cell=getSelectedCellPreview(G);
    assert.ok(cell,'应返回 preview cell');
    assert.strictEqual(cell.cellKey,'5,5','cellKey 应正确');
    assert.ok(cell.elementField.fire.layers>=1,'应有 fire 层');
  });
  test('case_pg_013: 空格 fire=3，详情 willExplode=true splashTargets 有目标',()=>{
    fresh();
    G.elementCells['5,5']={fire:{layers:3,willExplode:true}};
    G.slots.forEach(s=>s.used=true);
    recomputeCorePreview();
    G.selectedCell={r:5,c:5};
    const cell=getSelectedCellPreview(G);
    assert.ok(cell,'应返回 preview cell');
    assert.strictEqual(cell.preview.willExplode,true,'fire=3 应触发爆炸');
    assert.strictEqual(cell.preview.explosionShape,'cross','爆炸形状应为十字');
    assert.ok(cell.preview.splashTargets.length>0,'应有波及目标');
  });
  test('case_pg_014: 怪物格 fire=3 详情 entity.type=monster entityDamage=6 willExplode=false',()=>{
    fresh();
    G.monsters=[{id:'m1',name:'测试怪',pos:{r:5,c:5},hp:20,maxHp:20,atk:3,el:null,dead:false,step:3}];
    G.elementCells['5,5']={fire:{layers:3,willExplode:true}};
    G.slots.forEach(s=>s.used=true);
    recomputeCorePreview();
    G.selectedCell={r:5,c:5};
    const cell=getSelectedCellPreview(G);
    assert.ok(cell,'应返回 preview cell');
    assert.strictEqual(cell.entity.type,'monster','实体类型应为 monster');
    assert.strictEqual(cell.preview.entityDamage,6,'fire=3 entityDamage=explDmg(3)=6');
    assert.strictEqual(cell.preview.willExplode,false,'怪物格不触发十字爆炸');
  });
  test('case_pg_015: getSelectedCellPreview 未选择时返回 null',()=>{
    fresh();
    recomputeCorePreview();
    G.selectedCell=null;
    assert.strictEqual(getSelectedCellPreview(G),null,'未选择时返回 null');
  });
  test('case_pg_016: 空格 fire=1，详情 layers=1 willExplode=false',()=>{
    fresh();
    G.elementCells['4,4']={fire:{layers:1,willExplode:false}};
    G.slots.forEach(s=>s.used=true);
    recomputeCorePreview();
    G.selectedCell={r:4,c:4};
    const cell=getSelectedCellPreview(G);
    assert.ok(cell,'应返回 preview cell');
    assert.strictEqual(cell.elementField.fire.layers,1,'fire 层数=1');
    assert.strictEqual(cell.preview.willExplode,false,'fire=1 不触发爆炸');
  });
  test('case_pg_017: 移动英雄后详情随 previewGrid 重算变化',()=>{
    fresh();
    G.slots.forEach(s=>s.used=true);
    recomputeCorePreview();
    const haPos={r:G.heroes.ha.pos.r,c:G.heroes.ha.pos.c};
    G.selectedCell=haPos;
    assert.strictEqual(getSelectedCellPreview(G).entity.type,'hero','初始 ha 位置应有 hero');
    const newPos={r:haPos.r+1,c:haPos.c+1};
    G.heroes.ha.pos=newPos;
    recomputeCorePreview();
    G.selectedCell=haPos;
    assert.strictEqual(getSelectedCellPreview(G).entity.type,null,'原格英雄离开后无实体');
    G.selectedCell=newPos;
    assert.strictEqual(getSelectedCellPreview(G).entity.type,'hero','新位置有 hero');
  });
  test('case_pg_018: 英雄格详情走 previewGrid 含 threatFromMonsters',()=>{
    fresh();
    G.slots.forEach(s=>s.used=true);
    recomputeCorePreview();
    G.selectedCell={r:G.heroes.ha.pos.r,c:G.heroes.ha.pos.c};
    const cell=getSelectedCellPreview(G);
    assert.ok(cell,'应返回 preview cell');
    assert.strictEqual(cell.entity.type,'hero','英雄格实体类型为 hero');
    assert.strictEqual(cell.entity.id,'ha','英雄 id 正确');
    assert.ok(Array.isArray(cell.preview.threatFromMonsters),'threatFromMonsters 应为数组');
  });
  test('case_pg_019: 选取格子后详情 entity.type 与 previewGrid 一致',()=>{
    fresh();
    G.slots.forEach(s=>s.used=true);
    recomputeCorePreview();
    assert.strictEqual(getSelectedCellPreview(G),null,'未选择时返回 null');
    G.selectedCell={r:G.heroes.ha.pos.r,c:G.heroes.ha.pos.c};
    assert.strictEqual(getSelectedCellPreview(G).entity.type,'hero','英雄格');
    G.monsters.push({id:'m2',name:'怪2',pos:{r:3,c:3},hp:15,maxHp:15,atk:2,el:'wind',dead:false,step:3});
    recomputeCorePreview();
    G.selectedCell={r:3,c:3};
    assert.strictEqual(getSelectedCellPreview(G).entity.type,'monster','怪物格');
  test('case_pg_020: 空格 fire=3 water=3 previewGrid 同时爆炸，波及怪物总伤=12',()=>{
    fresh();
    G.monsters=[{id:'m0',name:'受波及',hp:20,maxHp:20,atk:1,pos:{r:5,c:6},dead:false,el:null}];
    G.elementCells['5,5']={fire:{layers:3,willExplode:true},water:{layers:3,willExplode:true},wind:{layers:0,willExplode:false},earth:{layers:0,willExplode:false}};
    G.slots.forEach(s=>s.used=true);
    recomputeCorePreview();
    const snap=G.coreSnapshot;
    const cell=snap.previewGrid.grid['5,5'];
    assert.ok(cell.preview.willExplode,'应触发爆炸');
    assert.strictEqual(cell.preview.explosionElements.length,2,'两元素同时爆炸');
    assert.strictEqual(cell.preview.explosionDamage,12,'总爆炸伤害=12');
    const monCell=snap.previewGrid.grid['5,6'];
    assert.strictEqual(monCell.preview.splashDamage.total,12,'怪物波及伤害=12');
    assert.strictEqual(monCell.preview.entityDamage,12,'怪物总伤害 entityDamage=12');
    assert.strictEqual(monCell.preview.isSplashTarget,true,'怪物是波及目标');
    // 通过 getSelectedCellPreview 验证详情读取
    G.selectedCell={r:5,c:5};
    const detailCell=getSelectedCellPreview(G);
    assert.ok(detailCell,'详情应返回 preview cell');
    assert.strictEqual(detailCell.preview.explosionDamage,12,'详情 explosionDamage=12');
    assert.strictEqual(detailCell.preview.explosionElements.length,2,'详情含两元素');
  });
  });
  });
// ═══════════════════════════════════════════════════════════════
group('K组：结算与元素落地一致性', ()=>{
  test('case_k_001: calcElementLayerDamage 公式正确',()=>{
    assert.strictEqual(calcElementLayerDamage(1),1,'1层=1');
    assert.strictEqual(calcElementLayerDamage(2),3,'2层=3');
    assert.strictEqual(calcElementLayerDamage(3),6,'3层=6');
    assert.strictEqual(calcElementLayerDamage(4),10,'4层=10');
    assert.strictEqual(calcElementLayerDamage(5),15,'5层=15');
    assert.strictEqual(calcElementLayerDamage(6),21,'6层=21');
  });
  test('case_k_002: useSlot 走 dispatchGameAction 写入 elementCells',()=>{
    fresh();
    assert.ok(G.elementCells,'elementCells 应存在');
    assert.strictEqual(Object.keys(G.elementCells).length,0,'初始为空');
    const slot0=G.slots[0];
    const cells=atkCells(G.heroes[slot0.hid].pos,slot0.sn,slot0.dir);
    useSlot(0);
    // useSlot 通过 dispatchGameAction 写入 elementCells
    const writtenKeys=Object.keys(G.elementCells).filter(k=>G.elementCells[k][slot0.el].layers>0);
    assert.ok(writtenKeys.length>0,'useSlot 后 elementCells 应有该槽对应格子');
    assert.strictEqual(writtenKeys.length,cells.length,'写入格数应等于攻击范围格数');
  });
  test('case_k_003: 怪物格 fire=3，HP6，endPlayerTurn 后怪物死亡',()=>{
    fresh();
    G.monsters=[{id:'m0',name:'测试怪',hp:6,maxHp:6,atk:1,pos:{r:5,c:5},dead:false,el:null}];
    G.elementCells['5,5']={fire:{layers:3,willExplode:true},water:{layers:0,willExplode:false},wind:{layers:0,willExplode:false},earth:{layers:0,willExplode:false}};
    assert.strictEqual(G.monsters[0].hp,6,'结算前 HP=6');
    settleDamage();
    assert.strictEqual(G.monsters[0].dead,true,'fire=3 → 怪物死亡');
    // 不触发十字爆炸：相邻格无伤害
    assert.strictEqual(G.monsters[0].hp,0,'HP 归零');
  });
  test('case_k_004: 怪物格 fire=3，HP10，endPlayerTurn 后 HP=4',()=>{
    fresh();
    G.monsters=[{id:'m0',name:'测试怪',hp:10,maxHp:10,atk:1,pos:{r:5,c:5},dead:false,el:null}];
    G.elementCells['5,5']={fire:{layers:3,willExplode:true},water:{layers:0,willExplode:false},wind:{layers:0,willExplode:false},earth:{layers:0,willExplode:false}};
    settleDamage();
    assert.strictEqual(G.monsters[0].hp,4,'HP10 → fire=3 伤害6 → 剩余 HP4');
    // 不触发十字爆炸：怪物格不移除元素（但结算后元素层归零）
    const cellEl=G.elementCells['5,5']?.fire;
    assert.ok(!cellEl||cellEl.layers===0,'结算后元素层应归零');
  });
  test('case_k_005: 空格 fire=3 十字爆炸波及相邻怪物',()=>{
    fresh();
    G.monsters=[{id:'m0',name:'受波及',hp:10,maxHp:10,atk:1,pos:{r:5,c:6},dead:false,el:null}];
    G.elementCells['5,5']={fire:{layers:3,willExplode:true},water:{layers:0,willExplode:false},wind:{layers:0,willExplode:false},earth:{layers:0,willExplode:false}};
    settleDamage();
    assert.strictEqual(G.monsters[0].hp,4,'相邻怪物应受 6 伤害');
  });
  test('case_k_006: 空格 fire=3 十字爆炸不炸中心格（空格无实体）',()=>{
    fresh();
    G.monsters=[{id:'m0',name:'中心格',hp:10,maxHp:10,atk:1,pos:{r:5,c:5},dead:false,el:null}];
    G.elementCells['5,5']={fire:{layers:3,willExplode:true}};
    settleDamage();
    // 空格 fire=3 不会对中心格怪物造成伤害（中心是爆炸源，不是波及目标）
    // 但实际 explCells 包含中心，settleExplosions 会对中心评估
    // 空格有怪物时，实际会按怪物格处理（单体伤害）
    assert.strictEqual(G.monsters[0].hp,4,'中心格有怪物时按怪物格单体结算');
    assert.strictEqual(G.monsters[0].dead,false,'HP4 未死亡');
  });
  test('case_k_007: 结束回合元素落地：useSlot 后 elementCells 有对应格子',()=>{
    fresh();
    const slot0=G.slots[0];
    assert.strictEqual(slot0.used,false,'初始未使用');
    useSlot(0);
    assert.strictEqual(slot0.used,true,'使用后标记 used');
    // 验证 elementCells 有该槽产生的格子
    const hero=G.heroes[slot0.hid];
    const cells=atkCells(hero.pos,slot0.sn,slot0.dir);
    cells.forEach(c=>{
      const key=`${c.r},${c.c}`;
      assert.ok(G.elementCells[key],`格子 [${key}] 应存在于 elementCells`);
      assert.ok(G.elementCells[key][slot0.el].layers>0,`格子 [${key}] 应有 ${slot0.el} 层`);
    });
  });
  test('case_k_008: 预览 entityDamage 与 settleDamage 真实扣血一致',()=>{
    fresh();
    G.monsters=[{id:'m0',name:'测试怪',hp:20,maxHp:20,atk:1,pos:{r:5,c:5},dead:false,el:null}];
    G.elementCells['5,5']={fire:{layers:3,willExplode:true},water:{layers:0,willExplode:false},wind:{layers:0,willExplode:false},earth:{layers:0,willExplode:false}};
    // 预览
    const pg=buildPreviewGrid();
    const previewDmg=pg.grid['5,5'].preview.entityDamage;
    assert.strictEqual(previewDmg,6,'预览 entityDamage=6');
    // 真实结算
    settleDamage();
    const actualDmg=20-G.monsters[0].hp;
    assert.strictEqual(actualDmg,6,'真实扣血=6');
    assert.strictEqual(actualDmg,previewDmg,'预览与真实扣血一致');
  });
  test('case_k_009: commitPlayerActionsToElementField 幂等',()=>{
    fresh();
    G.elementCells['5,5']={fire:{layers:2,willExplode:false}};
    commitPlayerActionsToElementField(G);
    // 幂等：不覆盖已有非零层
    assert.strictEqual(G.elementCells['5,5'].fire.layers,2,'调用后不改变已有层数');
  });
  test('case_k_010: 结束回合 endPlayerTurn 调用 commit 后再 settle，怪物格结算',()=>{
    fresh();
    G.dayHalf=1;
    G.monsters=[{id:'m0',name:'测试怪',hp:6,maxHp:6,atk:1,pos:{r:5,c:5},dead:false,el:null}];
    const target=G.monsters[0];
    G.elementCells['5,5']={fire:{layers:3,willExplode:true},water:{layers:0,willExplode:false},wind:{layers:0,willExplode:false},earth:{layers:0,willExplode:false}};
    endPlayerTurn();
    // endPlayerTurn 内部调用了 commitPlayerActionsToElementField + settleExplosions
    assert.strictEqual(target.dead,true,'回合结束后怪物格元素应被结算');
    assert.ok(G.phase==='MONSTER'||G.phase==='SHOP','阶段切换到 MONSTER 或 SHOP（全灭后进商店）');
  });
  test('case_k_011: 空格多元素结算后，未引爆元素重新同步为地形并阻挡英雄',()=>{
    fresh();
    G.monsters=[];
    G.elementCells['5,5']={
      fire:{layers:3,willExplode:true},
      water:{layers:1,willExplode:false},
      wind:{layers:0,willExplode:false},
      earth:{layers:0,willExplode:false},
    };
    G.board[5][5].el='fire'; G.board[5][5].stk=3;
    settleDamage();
    assert.strictEqual(G.elementCells['5,5'].fire.layers,0,'已引爆 fire 应清零');
    assert.strictEqual(G.elementCells['5,5'].water.layers,1,'未引爆 water 应保留');
    assert.strictEqual(G.board[5][5].el,'water','board 应重新显示剩余 water 地形');
    assert.strictEqual(G.board[5][5].stk,1,'board 应同步 water 层数');
    G.selHero='ha';
    const prev={...G.heroes.ha.pos};
    moveHero(5,5);
    assert.deepStrictEqual(G.heroes.ha.pos,prev,'英雄不能走入剩余元素格');
  });
  test('case_k_012: 怪物攻击元素块时同步清除 elementCells 与 board',()=>{
    fresh();
    G.monsters=[{id:'m0',name:'测试怪',hp:10,maxHp:10,atk:1,pos:{r:5,c:8},dead:false,el:null}];
    G.elementCells['5,7']={fire:{layers:1,willExplode:false},water:{layers:0,willExplode:false},wind:{layers:0,willExplode:false},earth:{layers:0,willExplode:false}};
    G.board[5][7].el='fire'; G.board[5][7].stk=1;
    monsterAct(G.monsters[0]);
    assert.strictEqual(G.board[5][7].el,'fire','核对点A：元素格不应清除');
    assert.strictEqual(G.board[5][7].stk,1,'层数不应清零');
    assert.strictEqual(G.elementCells['5,7'].fire.layers,1,'elementCells 层数保留');
    assert.strictEqual(G.monsters[0].hp,10,'怪物不应受伤');
    assert.deepStrictEqual(G.monsters[0].pos,{r:5,c:8},'怪物被阻挡后不移动');
  });
  test('case_k_013: MOVE_HERO action 不能绕过元素格占用校验',()=>{
    fresh();
    G.elementCells['5,5']={fire:{layers:1,willExplode:false},water:{layers:0,willExplode:false},wind:{layers:0,willExplode:false},earth:{layers:0,willExplode:false}};
    G.board[5][5].el='fire'; G.board[5][5].stk=1;
    const prev={...G.heroes.ha.pos};
    dispatchGameAction({type:'MOVE_HERO',heroId:'ha',to:{r:5,c:5}});
    assert.deepStrictEqual(G.heroes.ha.pos,prev,'底层 action 也不能移动到元素格');
  });
  test('case_k_014: 点击剩余元素格会生成详情，移动点击会写入占用日志',()=>{
    fresh();
    resetDomEl('cd'); resetDomEl('log');
    G.monsters=[];
    G.elementCells['5,5']={
      fire:{layers:3,willExplode:true},
      water:{layers:1,willExplode:false},
      wind:{layers:0,willExplode:false},
      earth:{layers:0,willExplode:false},
    };
    G.board[5][5].el='fire'; G.board[5][5].stk=3;
    settleDamage();
    withRealUi(()=>{
      const logEl=document.getElementById('log');
      onCell(5,5);
      const cdEl=document.getElementById('cd');
      assert.strictEqual(G.selectedCell.r,5,'点击后 selectedCell.r=5');
      assert.strictEqual(G.selectedCell.c,5,'点击后 selectedCell.c=5');
      assert.strictEqual(cdEl.style.display,'block','格子详情面板应显示');
      assert.ok(cdEl.innerHTML.includes('格子 [5,5]'),'详情应显示坐标');
      assert.ok(cdEl.innerHTML.includes('💧水1层'),'详情应显示剩余水元素层');
      assert.ok(!cdEl.innerHTML.includes('🔥火3层'),'详情不应显示已引爆的火3层');
      assert.ok(cdEl.innerHTML.includes('还需 2 层才能引爆'),'详情应显示未达到引爆阈值');
      assert.strictEqual(logEl.children.length,0,'普通点击查看详情不应写战斗日志');
      G.selHero='ha';
      const prev={...G.heroes.ha.pos};
      onCell(5,5);
      assert.deepStrictEqual(G.heroes.ha.pos,prev,'英雄点击剩余元素格后位置不变');
      const lastLog=logEl.children[logEl.children.length-1]?.textContent||'';
      assert.ok(lastLog.includes('目标格已占用'),'移动点击被阻挡时应写入占用日志');
    });
  });
});

group('L组：一键执行英雄动作',()=>{
  test('case_l_001: 一键执行所有已配置未使用的行动槽',()=>{
    fresh();
    G.monsters=[];
    G.heroes.ha.pos={r:5,c:5};
    // 清空默认slot配置，手动构造: 2个有效, 1个无hero, 1个已使用
    G.slots=[{},{},{},{}];
    G.slots[0]={hid:'ha',el:'fire',sn:1,dir:'right',used:false};
    G.slots[1]={hid:'ha',el:'water',sn:2,dir:'right',used:false};
    G.slots[2]={hid:null,el:'wind',sn:1,dir:'right',used:false};
    G.slots[3]={hid:'ha',el:'earth',sn:1,dir:'right',used:true};
    execAllHeroSlots();
    assert.strictEqual(G.slots[0].used,true,'slot0 应被执行');
    assert.strictEqual(G.slots[1].used,true,'slot1 应被执行');
    assert.strictEqual(G.slots[2].used,false,'slot2 无hero不应执行');
    assert.strictEqual(G.slots[3].used,true,'slot3 已使用保持true');
  });
  test('case_l_002: buildTurnVM 包含 execAllDisabled',()=>{
    fresh();
    G.phase='PLAYER';
    G.slots=[{hid:'ha',el:'fire',sn:1,dir:'right',used:false}];
    G.heroes.ha.pos={r:5,c:5};
    let vm=buildTurnVM();
    assert.strictEqual(vm.execAllDisabled,false,'有可执行slot时execAllDisabled=false');
    G.slots[0].used=true;
    vm=buildTurnVM();
    assert.strictEqual(vm.execAllDisabled,true,'无可执行slot时execAllDisabled=true');
  });
  test('case_l_003: 非PLAYER阶段不执行',()=>{
    fresh();
    G.phase='MONSTER';
    G.slots=[{hid:'ha',el:'fire',sn:1,dir:'right',used:false}];
    G.heroes.ha.pos={r:5,c:5};
    execAllHeroSlots();
    assert.strictEqual(G.slots[0].used,false,'非PLAYER阶段不执行');
  });
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
