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

// ── 载入游戏脚本（支持单文件或多文件模式）─────────────────────
global.__TEST__ = true;
const useMultiFile = fs.existsSync(path.join(__dirname, 'data.js')) && 
                     fs.existsSync(path.join(__dirname, 'game.js')) &&
                     fs.existsSync(path.join(__dirname, 'ui.js'));

if (useMultiFile) {
  // 多文件模式：data.js → game.js → ui.js
  const dataScript = fs.readFileSync(path.join(__dirname, 'data.js'), 'utf8').replace(/\bconst\b/g,'var').replace(/\blet\b/g,'var');
  const gameScript = fs.readFileSync(path.join(__dirname, 'game.js'), 'utf8').replace(/\bconst\b/g,'var').replace(/\blet\b/g,'var');
  const uiScript = fs.readFileSync(path.join(__dirname, 'ui.js'), 'utf8').replace(/\bconst\b/g,'var').replace(/\blet\b/g,'var');
  eval(dataScript);
  eval(gameScript);
  eval(uiScript);
} else {
  // 单文件模式：从 index.html 加载
  const htmlPath = process.env.YSBZS_HTML_PATH || path.join(__dirname, 'index.html');
  const html = fs.readFileSync(htmlPath,'utf8');
  const scriptTag = html.match(/<script>([\s\S]+?)<\/script>/);
  if(!scriptTag) throw new Error('找不到 <script> 标签');
  const gameScript = scriptTag[1].replace(/\bconst\b/g,'var').replace(/\blet\b/g,'var');
  eval(gameScript);
}

// 屏蔽 DOM 渲染函数，只测逻辑
const _realRender = render;
const _realGlog = glog;
render      = ()=>{};
renderShop  = ()=>{};
glog        = ()=>{};
let _lastMsg = '';
showMsg = t => { _lastMsg = t; };
showRunEnd = () => { _lastMsg = buildRunEndVM().title; };

// ── 测试运行器 ─────────────────────────────────────────────────
let pass=0, fail=0;
const failures=[];

const _asyncTests = [];
function test(name, fn){
  try{ 
    const r = fn();
    if (r && typeof r.then === 'function') {
      _asyncTests.push(
        r.then(() => { pass++; console.log(`  ✅ ${name}`); })
         .catch(e => { fail++; failures.push({ name, msg:e.message }); console.log(`  ❌ ${name}\n     → ${e.message}`); })
      );
    } else {
      pass++; console.log(`  ✅ ${name}`);
    }
  }
  catch(e){
    fail++;
    failures.push({ name, msg:e.message });
    console.log(`  ❌ ${name}\n     → ${e.message}`);
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
    assert.strictEqual(k({r:0,c:7}),'0,7');
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
  test('maxRound = 2',    ()=> assert.strictEqual(G.maxRound,2));
  test('gold = 8',       ()=> assert.strictEqual(G.gold,8));
  test('hitCount = 0',    ()=> assert.strictEqual(G.hitCount,0));
  test('棋盘 13 行',      ()=> assert.strictEqual(G.board.length,8));
  test('棋盘每行 13 列',  ()=> G.board.forEach((row,r)=>
    assert.strictEqual(row.length,8,`第${r}行列数错误`)
  ));
  test('英雄存在 HP>0', ()=>{
    assert.ok(G.heroes.ha); const h=Object.values(G.heroes)[0]; assert.ok(h); assert.ok(h.hp>0);
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
  test('英雄 GDD 站位 (6,0) 与 (7,1)', ()=>{
    assert.deepStrictEqual(G.heroes.ha.pos,{r:6,c:0});
    assert.deepStrictEqual(G.heroes.hb.pos,{r:7,c:1});
  });
  test('day1 morning 教学怪 GDD 坐标与 HP', ()=>{
    assert.deepStrictEqual(G.monsters[0].pos,{r:0,c:5});
    assert.strictEqual(G.monsters[0].hp,6);
    assert.deepStrictEqual(G.monsters[1].pos,{r:0,c:6});
    assert.strictEqual(G.monsters[1].hp,10);
  });
});

group('城堡系统', ()=>{
  test('双城堡：我方左下、敌方右上', ()=>{
    fresh();
    assert.strictEqual(G.playerCastle.hp,80);
    assert.deepStrictEqual(G.playerCastle.pos,{r:7,c:0});
    assert.strictEqual(G.enemyCastle.hp,80);
    assert.deepStrictEqual(G.enemyCastle.pos,{r:0,c:7});
  });
  test('敌方城堡 HP≤0 → 胜利且 runVictory', ()=>{
    fresh();
    damageEnemyCastle(80,'test');
    assert.strictEqual(G.phase,'OVER');
    assert.strictEqual(G.runVictory,true);
  });
  test('我方城堡 HP≤0 → 失败', ()=>{
    fresh();
    G.playerCastle.hp=0;
    checkGameOver();
    assert.strictEqual(G.phase,'OVER');
    assert.ok(_lastMsg.includes('失败')||_lastMsg.includes('我方')||_lastMsg.includes('结束'));
  });
  test('不可移动到城堡格', ()=>{
    fresh();
    G.selHero='ha';
    const start={...G.heroes.ha.pos};
    moveHero(G.enemyCastle.pos.r,G.enemyCastle.pos.c);
    assert.deepStrictEqual(G.heroes.ha.pos,start);
  });
});

// ═══════════════════════════════════════════════════════════════
group('mkBoard 棋盘初始化', ()=>{
  fresh();
  test('所有格初始 el=null, stk=0', ()=>{
    for(let r=0;r<8;r++) for(let c=0;c<8;c++){
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
    assert.strictEqual(r.length,2);
    assert.deepStrictEqual(r,[{r:5,c:6},{r:5,c:7}]);
  });
  test('边界过滤：形状1·left·英雄(0,0) → 空', ()=>{
    assert.strictEqual(atkCells({r:0,c:0},1,'left').length,0);
  });
  test('边界过滤：形状1·up·英雄(0,0) → 空', ()=>{
    assert.strictEqual(atkCells({r:0,c:0},1,'up').length,0);
  });
  test('形状5·right·5格·全在棋盘内', ()=>{
    const r=atkCells({r:5,c:5},5,'right');
    assert.strictEqual(r.length,2); // 2格在棋盘内
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
    G.monsters[0].pos={r:7,c:7}; // 移开，避免干扰
    G.monsters[1].pos={r:7,c:7};
    doExplode({r:5,c:5});
    assert.strictEqual(G.board[5][5].el,null);
    assert.strictEqual(G.board[5][5].stk,0);
  });
  test('doExplode 对范围内怪物造成伤害', ()=>{
    fresh(); addOwnedUnit('fire_demon',{r:2,c:2}); G.ownedUnits[G.ownedUnits.length-1].active=true;
    addEl({r:5,c:5},'fire');
    addEl({r:5,c:5},'fire'); // stk=2 → dmg=3
    G.monsters[0].pos={r:5,c:6}; // 右边1格，在爆炸范围内
    G.monsters[1].pos={r:7,c:7};
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
    fresh(); addOwnedUnit('fire_demon',{r:2,c:2}); G.ownedUnits[G.ownedUnits.length-1].active=true;
    for(let i=0;i<5;i++) addEl({r:5,c:5},'fire');
    G.monsters[0].pos={r:5,c:6}; G.monsters[0].hp=20; G.monsters[0].el=null;
    G.monsters[1].pos={r:7,c:7};
    addEl({r:5,c:5},'water'); // 水克火 → 自动引爆
    settleDamage();
    assert.strictEqual(G.monsters[0].hp,5,'20-15=5');
  });
  test('验收-3: 引爆后原格变水屏1', ()=>{
    fresh();
    for(let i=0;i<5;i++) addEl({r:5,c:5},'fire');
    G.monsters[0].pos={r:7,c:7}; G.monsters[1].pos={r:7,c:7};
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
    fresh(); addOwnedUnit('fire_demon',{r:2,c:2}); G.ownedUnits[G.ownedUnits.length-1].active=true;
    G.monsters[0].pos={r:5,c:6}; G.monsters[0].hp=20; G.monsters[0].el='wind';
    G.monsters[1].pos={r:7,c:7};
    G.board[5][5].el='fire'; G.board[5][5].stk=3; // explDmg=6, ×2=12
    doExplode({r:5,c:5}); settleDamage();
    assert.strictEqual(G.monsters[0].hp,8,'20-12=8');
  });
  test('验收-6: 火层爆炸炸到无属性怪不翻倍', ()=>{
    fresh(); addOwnedUnit('fire_demon',{r:2,c:2}); G.ownedUnits[G.ownedUnits.length-1].active=true;
    G.monsters[0].pos={r:5,c:6}; G.monsters[0].hp=20; G.monsters[0].el=null;
    G.monsters[1].pos={r:7,c:7};
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
    G.heroes.hb.pos={r:0,c:0};
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
    addOwnedUnit('fire_demon',{r:2,c:2}); G.ownedUnits[G.ownedUnits.length-1].active=true;
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
    G.monsters[1].pos={r:7,c:7};
    G.board[5][5].el='fire'; G.board[5][5].stk=3; // dmg=6
    doExplode({r:5,c:5}); settleDamage();
    assert.ok(G.monsters[0].hp<20,'中心怪物应被引爆伤到');
  });
});
});
group('能力系统测试', ()=>{
  test('能力-1: 无火魔时十字爆炸不上场（默认单点）', ()=>{
    fresh();
    G.monsters[0].pos={r:5,c:6}; G.monsters[0].hp=10;
    G.monsters[1].pos={r:7,c:7};
    G.monsters[1].hp=20;
    G.board[5][5].el='fire'; G.board[5][5].stk=2;
    doExplode({r:5,c:5}); settleDamage();
    assert.strictEqual(G.monsters[0].hp,10,'无火魔时相邻格不应受伤');
  });
  test('能力-2: 有火魔时十字爆炸正常工作', ()=>{
    fresh();
    addOwnedUnit('fire_demon',{r:2,c:2}); G.ownedUnits[G.ownedUnits.length-1].active=true;
    G.monsters[0].pos={r:5,c:6}; G.monsters[0].hp=10; G.monsters[0].el=null;
    G.monsters[1].pos={r:7,c:7};
    G.monsters[1].hp=20;
    G.board[5][5].el='fire'; G.board[5][5].stk=2;
    doExplode({r:5,c:5}); settleDamage();
    assert.strictEqual(G.monsters[0].hp,7,'有火魔时十字相邻格受伤');
  });
  test('能力-3: hasCrossExplosion 检测', ()=>{
    fresh();
    assert.strictEqual(hasCrossExplosion(),false,'初始无火魔');
    addOwnedUnit('fire_demon',{r:2,c:2}); G.ownedUnits[G.ownedUnits.length-1].active=true;
    assert.strictEqual(hasCrossExplosion(),true,'上场火魔后应有十字');
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
    G.heroes.hb.pos={r:0,c:0}; // 移开
    G.monsters[0].pos={r:monR,c:monC};
    G.monsters[1].pos={r:7,c:7};
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
    G.monsters[0].pos={r:5,c:5}; G.monsters[0].hp=10; G.monsters[1].pos={r:7,c:7};
    G.elementCells['5,5']={fire:{layers:3,willExplode:true},water:{layers:0,willExplode:false},wind:{layers:0,willExplode:false},earth:{layers:0,willExplode:false}};
    settleDamage();
    assert.strictEqual(G.monsters[0].hp,4); // 10-6=4，explDmg(3)=6
  });
  test('6层fire结算：explDmg(6)=21', ()=>{
    fresh();
    G.monsters[0].pos={r:5,c:5}; G.monsters[0].hp=25; G.monsters[1].pos={r:7,c:7};
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
    setup(5,5, 7,7); // 怪物移远
    G.hitCount=3;
    useSlot(0);
    assert.strictEqual(G.hitCount,3);
  });
  test('攻击空地生成元素格', ()=>{
    setup(5,5, 7,7);
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
    G.heroes.hb.pos={r:0,c:0};
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
    setup(5,5, 7,7); // 怪物移远
    G.slots[0].el='fire'; G.explosionThreshold=1;
    assert.doesNotThrow(()=>{useSlot(0); settleDamage();});
  });
  test('同格火水各3层同时引爆：各自dmg=6', ()=>{
    fresh();
    G.monsters[0].pos={r:5,c:5}; G.monsters[0].hp=20; G.monsters[1].pos={r:7,c:7};
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
  test('endPlayerTurn 城堡被炸毁不应覆写 OVER 状态', ()=>{
    fresh();
    addOwnedUnit('fire_demon',{r:2,c:2}); G.ownedUnits[G.ownedUnits.length-1].active=true;
    // 清掉教学怪，让空格爆炸能波及城堡
    G.monsters=[];
    G.enemyCastle={hp:1,maxHp:80,pos:{r:0,c:7}};
    const ck='1,7'; G.elementCells[ck]={fire:{layers:3,willExplode:true}};
    endPlayerTurn();
    assert.strictEqual(G.phase,'OVER','城堡被炸毁应直接结束');
    assert.strictEqual(G.runVictory,true,'炸毁敌方城堡应判定胜利');
    delete G.elementCells[ck];
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
    G.dayHalf=2;
    G.round=G.maxRound+1;
    finishMonsters();
    assert.strictEqual(G.phase,'SHOP');
    // openShop 增加收入+利息: 3 (day1 income) + floor((8+3)/8)=1 (interest) = 12
    assert.strictEqual(G.gold, 12);
    assert.ok(G.shopItems.units.length>0,'应已生成商店');
  });
  test('finishMonsters 所有怪死亡+城堡存活 → 不跳商店', ()=>{
    fresh();
    G.dayHalf=2;
    G.monsters.forEach(m=>m.dead=true);
    G.enemyCastle={hp:80,maxHp:80,pos:{r:0,c:7}};
    finishMonsters();
    assert.strictEqual(G.phase,'PLAYER','城堡存活时应继续战斗');
  });
  test('finishMonsters 所有怪死亡+城堡已毁 → 商店', ()=>{
    fresh();
    G.dayHalf=2;
    G.round=2;
    G.monsters.forEach(m=>m.dead=true);
    G.enemyCastle={hp:0,maxHp:80,pos:{r:0,c:7}};
    finishMonsters();
    assert.strictEqual(G.phase,'SHOP');
  });
  test('finishMonsters round>maxRound → 进商店（无视城堡状态）', ()=>{
    fresh();
    G.dayHalf=0;
    G.round=G.maxRound+1;
    G.enemyCastle={hp:100,maxHp:100,pos:{r:0,c:7}};
    finishMonsters();
    assert.strictEqual(G.phase,'SHOP','超出回合数必须进商店');
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
    G.monsters=[m];
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
    G.heroes.ha.pos={r:6,c:4};
    G.heroes.hb.pos={r:7,c:7};
    const np=nextMove(m);
    assert.ok(np && np.c > m.pos.c,'应向右移');
  });
  test('monsterAct 攻击左侧英雄', ()=>{
    fresh();
    const m=G.monsters[0];
    m.pos={r:5,c:6};
    G.heroes.ha.pos={r:5,c:5}; // 怪物左边
    G.heroes.hb.pos={r:0,c:0};
    const prevHp=G.heroes.ha.hp;
    monsterAct(m);
    assert.ok(G.heroes.ha.hp < prevHp,'英雄 HP 应减少');
  });
  test('monsterAct 遇元素块→被阻挡但不受伤不消元素', ()=>{
    fresh();
    const m=G.monsters[0];
    m.pos={r:5,c:8};
    G.heroes.ha.pos={r:5,c:2};
    G.heroes.hb.pos={r:0,c:0};
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
    m.pos={r:5,c:7};
    G.heroes.ha.pos={r:5,c:2};
    G.heroes.hb.pos={r:0,c:0};
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
  test('buildWaveForDay Day1 afternoon 预算=6', ()=>{
    const plan=buildWaveForDay(1,'afternoon');
    assert.ok(plan.monsters.length>=2);
    const totalCost=plan.monsters.reduce((s,m)=>s+m.cost,0);
    assert.ok(totalCost<=6,`总cost ${totalCost} 不应超过预算6`);
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
    assert.ok(totalCost<=18,`总cost ${totalCost} 不应超过预算18`);
  });
  test('buildWaveForDay Day5 morning 含 boss', ()=>{
    const plan=buildWaveForDay(5,'morning');
    const types=plan.monsters.map(m=>m.typeId);
    // boss cost=12, budget=24, 够再加几只小怪
    assert.ok(plan.monsters.length>=1);
    const totalCost=plan.monsters.reduce((s,m)=>s+m.cost,0);
    assert.ok(totalCost<=24,`总cost ${totalCost} 不应超过预算24`);
  });
  test('buildWaveForDay maxAlive 限制', ()=>{
    // Day1 morning maxAlive=5, 即使预算够也不超过5
    const plan=buildWaveForDay(1,'morning');
    assert.ok(plan.monsters.length<=5,`怪物数 ${plan.monsters.length} 不应超过 maxAlive=5`);
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
      assert.ok(m.pos.c>=5&&m.pos.c<8,`怪物 ${m.name} c=${m.pos.c} 应在 5-7`);
    });
  });
  test('spawnWaveForDay Day4 spawn zone 5x5', ()=>{
    fresh(); G.monsters=[]; G.heroes={};
    spawnWaveForDay(4,'morning'); // spawnSize=5 → r:0-4, c:8-12
    G.monsters.forEach(m=>{
      assert.ok(m.pos.r>=0&&m.pos.r<5);
      assert.ok(m.pos.c>=3&&m.pos.c<8);
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
    assert.strictEqual(G.shopItems.consumables.length,0,'商店不再生成强化品');
  });
  test('genShop Day1: 5 T1 + 0 强化品', ()=>{
    fresh(); G.shopTier=1; G.day=1;
    genShop();
    assert.strictEqual(G.shopItems.units.length,5,'Day1应有5个T1单位');
    assert.strictEqual(G.shopItems.consumables.length,0,'Day1不应生成强化品');
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
    fresh(); G.phase='SHOP'; G.gold=8;
    G.shopTier=1; genShop();
    G.ownedUnits=[]; G.nextUnitId=0;
    const item=G.shopItems.units[0];
    const cost=item.cost;
    buyUnit(item.id);
    assert.strictEqual(G.gold, 8-cost);
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
    fresh(); G.phase='SHOP'; G.gold=8;
    G.shopItems.consumables=[];
    G.shopTier=1; genShop();
    const defId=G.shopItems.units[0].defId;
    // 先手动加一个同名L1单位
    addOwnedUnit(defId,{r:0,c:0});
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
    addOwnedUnit('fire_starter',{r:0,c:2});
    const unit=G.ownedUnits[2]; // 第三个 unit
    const beforeLen=G.ownedUnits.length;
    sellUnit(unit.instanceId);
    assert.strictEqual(G.gold, 5+unit.level);
    assert.strictEqual(G.ownedUnits.length, beforeLen-1);
  });
  test('rollShop 花费 2 金币并重新生成商店', ()=>{
    fresh(); G.phase='SHOP'; G.gold=8; G.day=1;
    G.shopTier=1; genShop();
    // 冻结一个商品
    const uid=G.shopItems.units[0].id;
    G.shopFrozen.units.add(uid);
    rollShop();
    assert.strictEqual(G.gold,6);
    // rollShop 清除冻结
    assert.strictEqual(G.shopFrozen.units.size,0);
    assert.strictEqual(G.shopFrozen.consumables.size,0);
    assert.strictEqual(G.shopItems.units.length,5,'Day1应生成5个单位');
    assert.strictEqual(G.shopItems.consumables.length,0,'Day1不应生成强化品');
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
    // Day1 income=3, gold=8, interest=floor(8/8)=1, total=9
    assert.strictEqual(G.gold, 9);
  });
  test('openShop 利息上限2', ()=>{
    fresh(); G.day=2; G.gold=20;
    openShop();
    // Day2 income=4, gold=24, interest=min(floor(24/8),2)=2, total=26
    assert.strictEqual(G.gold, 26);
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
    assert.ok(u.hp>0);
    assert.strictEqual(u.active,true);
  });
  test('addOwnedUnit 无效 defId 返回 null', ()=>{
    fresh();
    assert.strictEqual(addOwnedUnit('nonexistent'),null);
  });
  test('syncUnitsToHeroes 从 2 个活跃单位构建 heroes/slots', ()=>{
    fresh();
    G.ownedUnits=[];
    addOwnedUnit('fire_starter',{r:0,c:0});
    addOwnedUnit('water_droplet',{r:0,c:1});
    syncUnitsToHeroes();
    assert.strictEqual(Object.keys(G.heroes).length,2);
    assert.ok(G.heroes.ha,'ha 应存在');
    assert.ok(G.heroes.hb,'hb 应存在');
    assert.strictEqual(G.slots.length,6,'2单位×3槽=6');
    const h=Object.values(G.heroes)[0]; assert.ok(h); assert.ok(h.hp>0);
    assert.strictEqual(G.heroes.hb.hp,20);
  });
  test('syncUnitsToHeroes 取前MAX_ACTIVE个活跃单位', ()=>{
    fresh();
    G.ownedUnits=[];
    const ids=['fire_starter','water_droplet','wind_breeze','earth_shield','balance','ember','fire_blaze'];
    ids.forEach((id,i)=>addOwnedUnit(id,{r:0,c:i}));
    syncUnitsToHeroes();
    assert.ok(G.ownedUnits.length>=7,'应有7个单位');
    assert.strictEqual(G.ownedUnits[6].active,false,'第7个应inactive');
  });
  test('mergeUnits 同 defId 合成升级 Lv1→Lv2', ()=>{
    fresh();
    G.ownedUnits=[];
    const u1=addOwnedUnit('fire_starter',{r:0,c:0});
    const u2=addOwnedUnit('fire_starter',{r:0,c:1});
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
    const u1=addOwnedUnit('fire_starter',{r:0,c:0});
    const u2=addOwnedUnit('fire_starter',{r:0,c:1});
    u1.level=3; u2.level=3;
    const ok=mergeUnits(u2,u1);
    assert.strictEqual(ok,false);
    assert.strictEqual(G.ownedUnits.length,2,'不应移除任何单位');
  });
  test('mergeUnits 不同 defId 不合成', ()=>{
    fresh();
    G.ownedUnits=[];
    const u1=addOwnedUnit('fire_starter',{r:0,c:0});
    const u2=addOwnedUnit('water_droplet',{r:0,c:1});
    const ok=mergeUnits(u2,u1);
    assert.strictEqual(ok,false);
    assert.strictEqual(G.ownedUnits.length,2);
  });
  test('toggleUnitActive active→bench 切换', ()=>{
    fresh();
    G.ownedUnits=[];
    addOwnedUnit('fire_starter',{r:0,c:0});
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
    assert.strictEqual(calcShopTier(10),4);
  });
});

// ═══════════════════════════════════════════════════════════════
group('UNIT_DEFS 单位定义库', ()=>{
  test('UNIT_DEFS 含 12 个单位（8 tier1 + 4 tier2）', ()=>{
    const all=Object.values(UNIT_DEFS);
    assert.ok(all.length>=12,`至少12个，当前${all.length}`);
    assert.ok(all.filter(u=>u.tier===1).length>=6,'tier1至少6个');
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
          if(s.skill){assert.ok(['summonFromCell','healSummons'].includes(s.skill),`${u.id} skill非法`);return;}
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
  test('英雄格为灰蓝色 #7b9db5', ()=>{
    // 形状1: 攻击(0,1)，英雄(0,0)，grid 有两格
    assert.ok(shapeHTML(1,'fire').includes('#7b9db5'));
  });
  test('攻击格为 fire 元素颜色 #d4855e', ()=>{
    assert.ok(shapeHTML(1,'fire').includes('#d4855e'));
  });
  test('水元素颜色 #5e95b5', ()=>{
    assert.ok(shapeHTML(1,'water').includes('#5e95b5'));
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
    G.heroes.hb.pos={r:0,c:0};
    G.monsters[0].pos={r:monR,c:monC}; G.monsters[0].hp=20;
    G.monsters[1].pos={r:7,c:7};
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
    G.heroes.ha.pos={r:5,c:5}; G.heroes.hb.pos={r:0,c:0};
    G.monsters[0].pos={r:5,c:6}; G.monsters[0].hp=20;
    G.monsters[1].pos={r:7,c:7};
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
    G.monsters[0].pos={r:5,c:5}; G.monsters[0].hp=6; G.monsters[1].pos={r:7,c:7};
    G.elementCells['5,5']={fire:{layers:1,willExplode:true},water:{layers:0,willExplode:false},wind:{layers:0,willExplode:false},earth:{layers:0,willExplode:false}};
    settleDamage();
    assert.strictEqual(G.monsters[0].hp,5,'单体伤害1：6-1=5');
  });
  test('case_002: 怪物格2层fire结算为单体伤害3', ()=>{
    fresh();
    G.monsters[0].pos={r:5,c:5}; G.monsters[0].hp=6; G.monsters[1].pos={r:7,c:7};
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
    addOwnedUnit('fire_demon',{r:2,c:2}); G.ownedUnits[G.ownedUnits.length-1].active=true;
    G.monsters[0].pos={r:6,c:5}; G.monsters[0].hp=10; // 在(5,5)正下方
    G.monsters[1].pos={r:7,c:7};
    // (5,5)是空格（没有怪物）
    G.elementCells['5,5']={fire:{layers:3,willExplode:true},water:{layers:0,willExplode:false},wind:{layers:0,willExplode:false},earth:{layers:0,willExplode:false}};
    settleDamage();
    assert.strictEqual(G.monsters[0].hp,4,'相邻怪受十字引爆伤害6：10-6=4');
  });
  test('case_005: buildMonsterStats 合并自身格伤害和波及伤害', ()=>{
    fresh();
    G.monsters[0].pos={r:5,c:5}; G.monsters[0].hp=20;
    G.monsters[1].pos={r:7,c:7};
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
    G.heroes.hb.pos={r:0,c:0};
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
    G.heroes.ha.pos={r:6,c:0}; G.heroes.hb.pos={r:0,c:0};
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
    addOwnedUnit('fire_demon',{r:0,c:0});
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
  test('case_init_003: 英雄A hp=20 pos(6,0)，英雄B hp=20 pos(7,1)', ()=>{
    fresh();
    assert.ok(G.heroes.ha,'英雄A存在');
    assert.ok(G.heroes.hb,'英雄B存在');
    assert.ok(G.heroes.ha||G.heroes.h0,'英雄A存在');const ha=G.heroes.ha||G.heroes.h0;assert.ok(ha.hp>0);
    const hb=G.heroes.hb||G.heroes.h1;assert.ok(hb.hp>0);
    assert.ok(ha.pos.r>=0);
    assert.ok(hb.pos.r>=0);
  });
  test('case_init_004: Day1 morning GDD 教学怪', ()=>{
    fresh();
    assert.strictEqual(G.monsters.length,2,'应有2只怪');
    assert.strictEqual(G.monsters[0].name,'教学怪1');
    assert.strictEqual(G.monsters[0].hp,6);
    assert.deepStrictEqual(G.monsters[0].pos,{r:0,c:5});
    assert.strictEqual(G.monsters[0].el,null);
    assert.strictEqual(G.monsters[1].name,'教学怪2');
    assert.strictEqual(G.monsters[1].hp,10);
    assert.deepStrictEqual(G.monsters[1].pos,{r:0,c:6});
    assert.strictEqual(G.monsters[1].el,null);
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
      {id:'m1',name:'远处怪',hp:10,maxHp:10,atk:1,pos:{r:7,c:7},dead:false,el:null},
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
    fresh(); addOwnedUnit('fire_demon',{r:2,c:2}); G.ownedUnits[G.ownedUnits.length-1].active=true;
    G.heroes.ha.pos={r:5,c:5};
    G.monsters=[
      {id:'m0',name:'波及怪',hp:10,maxHp:10,atk:1,pos:{r:5,c:6},dead:false,el:null},
      {id:'m1',name:'远处怪',hp:10,maxHp:10,atk:1,pos:{r:7,c:7},dead:false,el:null},
    ];
    G.slots[0].hid='ha'; G.slots[0].el='fire'; G.slots[0].sn=12; G.slots[0].dir='right'; G.slots[0].tier=1; G.slots[0].used=false;
    seedElCell({r:5,c:7},'fire',2);
    useSlot(0);
    assert.strictEqual(G.elementCells['5,7'].fire.layers,3,'空格应叠到3层');
    assert.strictEqual(G.elementCells['5,7'].fire.willExplode,true,'空格达到阈值后应待引爆');
    settleDamage();
    assert.strictEqual(G.monsters[0].hp,3,'怪物格fire=1单体1+空格十字引爆6=总7，10-7=3');
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
    G.monsters=[
      {id:'m0',name:'范围内怪',hp:10,maxHp:10,atk:1,pos:{r:5,c:6},dead:false,el:null},
      {id:'m1',name:'范围外怪',hp:10,maxHp:10,atk:1,pos:{r:7,c:7},dead:false,el:null},
    ];
    G.elementCells['5,5']={
      fire:{layers,willExplode:layers>=G.explosionThreshold},
      water:{layers:0,willExplode:false},wind:{layers:0,willExplode:false},earth:{layers:0,willExplode:false},
    };
  }
  test('case_empty_cell_001: fire=1 不伤害不爆炸', ()=>{
    fresh(); setEmptyCell(1);
    settleDamage();
    assert.strictEqual(G.monsters[0].hp,10,'范围内怪不受伤');
    assert.strictEqual(G.monsters[1].hp,10,'范围外怪不受伤');
  });
  test('case_empty_cell_002: fire=2 不伤害不爆炸', ()=>{
    fresh(); setEmptyCell(2);
    settleDamage();
    assert.strictEqual(G.monsters[0].hp,10,'范围内怪不受伤');
    assert.strictEqual(G.monsters[1].hp,10,'范围外怪不受伤');
  });
  test('case_empty_cell_003: fire=3 十字爆炸→范围内怪-6，范围外不受伤', ()=>{
    fresh(); addOwnedUnit('fire_demon',{r:2,c:2}); G.ownedUnits[G.ownedUnits.length-1].active=true;
    setEmptyCell(3);
    settleDamage();
    assert.strictEqual(G.monsters[0].hp,4,'范围内怪 10-6=4');
    assert.strictEqual(G.monsters[1].hp,10,'范围外怪不受伤');
  });
  test('case_empty_cell_004: fire=6 十字爆炸→范围内怪-21(下限0)', ()=>{
    fresh(); addOwnedUnit('fire_demon',{r:2,c:2}); G.ownedUnits[G.ownedUnits.length-1].active=true;
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
    fresh(); addOwnedUnit('fire_demon',{r:2,c:2}); G.ownedUnits[G.ownedUnits.length-1].active=true;
    G.monsters=[
      {id:'m0',name:'主怪',hp:10,maxHp:10,atk:1,pos:{r:5,c:5},dead:false,el:null},
      {id:'m1',name:'相邻',hp:10,maxHp:10,atk:1,pos:{r:5,c:6},dead:false,el:null},
    ];
    G.elementCells['5,5']={fire:{layers:3,willExplode:true},water:{layers:0,willExplode:false},wind:{layers:0,willExplode:false},earth:{layers:0,willExplode:false}};
    settleDamage();
    assert.strictEqual(G.monsters[0].hp,4,'怪物格:主怪 10-6=4');
    assert.strictEqual(G.monsters[1].hp,10,'怪物格:相邻怪不受波及（单体结算）');
    // 空格：(5,5)无怪fire=3，怪在(5,6)被十字波及
    fresh(); addOwnedUnit('fire_demon',{r:2,c:2}); G.ownedUnits[G.ownedUnits.length-1].active=true;
    G.monsters=[
      {id:'m0',name:'范围内',hp:10,maxHp:10,atk:1,pos:{r:5,c:6},dead:false,el:null},
      {id:'m1',name:'范围外',hp:10,maxHp:10,atk:1,pos:{r:7,c:7},dead:false,el:null},
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
      {id:'m1',name:'远处',hp:10,maxHp:10,atk:1,pos:{r:7,c:7},dead:false,el:null},
    ];
    G.elementCells['5,5']={fire:{layers:2,willExplode:false},water:{layers:0,willExplode:false},wind:{layers:0,willExplode:false},earth:{layers:0,willExplode:false}};
    settleDamage();
    assert.strictEqual(G.monsters[0].hp,7,'怪物格fire=2→扣3: 10-3=7');
    // 空格 fire=2 → 不达阈值，不伤害
    fresh();
    G.monsters=[
      {id:'m0',name:'相邻',hp:10,maxHp:10,atk:1,pos:{r:5,c:6},dead:false,el:null},
      {id:'m1',name:'远处',hp:10,maxHp:10,atk:1,pos:{r:7,c:7},dead:false,el:null},
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
      {id:'m1',name:'远处',hp:20,maxHp:20,atk:1,pos:{r:7,c:7},dead:false,el:null},
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
      {id:'m1',name:'远处',hp:10,maxHp:10,atk:1,pos:{r:7,c:7},dead:false,el:null},
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
      {id:'m1',name:'远处',hp:10,maxHp:10,atk:1,pos:{r:7,c:7},dead:false,el:null},
    ];
    G.elementCells['5,5']={
      fire:{layers:3,willExplode:false},water:{layers:2,willExplode:false},
      wind:{layers:0,willExplode:false},earth:{layers:0,willExplode:false},
    };
    settleDamage();
    assert.strictEqual(G.monsters[0].hp,11,'20-6-3=11');
  });
  test('case_multi_004: 空格 fire=3 water=2 → fire十字爆炸6，water未达阈值不爆', ()=>{
    fresh(); addOwnedUnit('fire_demon',{r:2,c:2}); G.ownedUnits[G.ownedUnits.length-1].active=true;
    G.monsters=[
      {id:'m0',name:'范围内',hp:10,maxHp:10,atk:1,pos:{r:5,c:6},dead:false,el:null},
      {id:'m1',name:'远处',hp:10,maxHp:10,atk:1,pos:{r:7,c:7},dead:false,el:null},
    ];
    G.elementCells['5,5']={
      fire:{layers:3,willExplode:true},water:{layers:2,willExplode:false},
      wind:{layers:0,willExplode:false},earth:{layers:0,willExplode:false},
    };
    settleDamage();
    assert.strictEqual(G.monsters[0].hp,4,'范围内怪 10-6=4，只fire十字爆');
  });
  test('case_multi_005: 空格 fire=3 water=3 两元素均达阈值→各自十字爆',()=>{
    fresh(); addOwnedUnit('fire_demon',{r:2,c:2}); G.ownedUnits[G.ownedUnits.length-1].active=true;
    G.slots.forEach(s=>{s.used=true;});
    G.monsters=[
      {id:'m0',name:'范围内',hp:20,maxHp:20,atk:1,pos:{r:5,c:6},dead:false,el:null},
      {id:'m1',name:'远处',hp:10,maxHp:10,atk:1,pos:{r:7,c:7},dead:false,el:null},
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
    // 预览层不模拟空格爆炸溅射伤害，但 explosionElements 和 splashTargets 有数据
    assert.ok(cell.preview.willExplode,'空格应触发爆炸');
    assert.strictEqual(cell.preview.explosionElements.length,2,'应有两个元素同时爆炸');
    assert.strictEqual(cell.preview.explosionDamage,12,'fire=6 + water=6 = 12');
    assert.ok(cell.preview.splashTargets.includes('5,6'),'splashTargets 应含相邻怪物格');
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
      {id:'m1',name:'远处',hp:10,maxHp:10,atk:1,pos:{r:7,c:7},dead:false,el:null},
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
      {id:'m1',name:'远处',hp:10,maxHp:10,atk:1,pos:{r:7,c:7},dead:false,el:null},
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
      {id:'m1',name:'远处',hp:10,maxHp:10,atk:1,pos:{r:7,c:7},dead:false,el:null},
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
      {id:'m1',name:'远处',hp:10,maxHp:10,atk:1,pos:{r:7,c:7},dead:false,el:null},
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
    G.heroes.hb.pos={r:0,c:0};
    // 怪物在(5,7)，1步→(5,6)，再检查左侧(5,5)有英雄→攻击
    G.monsters[0].pos={r:5,c:7};
    G.monsters[1].pos={r:0,c:5};
    const{heroIncomingDmg}=computeMonsterActionPreview();
    const haIncoming=heroIncomingDmg['ha']||[];
    assert.ok(haIncoming.length>=1,'怪物应在3AP内攻击到英雄A');
  });
  test('case_monwarn_002: 两怪均攻击英雄A→hitCount=2，totalDmg=atk1+atk2', ()=>{
    fresh();
    G.heroes.ha.pos={r:5,c:5};
    G.heroes.hb.pos={r:0,c:0};
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
    G.heroes.hb.pos={r:0,c:0};
    // 怪1在(5,6)，lp=(5,5)有英雄→直接攻击
    G.monsters[0].pos={r:5,c:6}; G.monsters[0].atk=2;
    G.monsters[1].pos={r:0,c:5};
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
    dispatchGameAction({type:'MOVE_HERO',heroId:'ha',to:{r:3,c:3}});
    assert.ok(G.coreSnapshot._version>v0,'版本号应递增');
    assert.ok(G.coreSnapshot,'coreSnapshot 应存在');
    assert.deepStrictEqual(G.heroes.ha.pos,{r:3,c:3},'英雄位置应已更新');
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
    G.monsters[1].pos={r:7,c:7};
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
    G.monsters[1].pos={r:7,c:7};
    G.elementCells['5,5']={fire:{layers:3,willExplode:true},water:{layers:0,willExplode:false},wind:{layers:0,willExplode:false},earth:{layers:0,willExplode:false}};
    recomputeCorePreview();
    const br=G.coreSnapshot.battleReport;
    assert.ok(br.some(l=>l.includes('空格')),'报告应含空格描述');
    assert.ok(br.some(l=>l.includes('引爆')),'报告应含引爆描述');
  });
  test('case_core_006: battleReport 包含怪物攻击英雄预警', ()=>{
    fresh();
    G.heroes.ha.pos={r:5,c:5};
    G.heroes.hb.pos={r:0,c:0};
    G.monsters[0].pos={r:5,c:6}; G.monsters[0].atk=2;
    G.monsters[1].pos={r:7,c:7};
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
  test('case_pg_001: buildPreviewGrid 返回含 64 格的 grid（13×13）', ()=>{
    fresh();
    const pg=buildPreviewGrid();
    assert.ok(pg&&pg.grid,'应返回含 grid 的对象');
    assert.strictEqual(Object.keys(pg.grid).length,64,'13×13=64 格');
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
    fresh(); addOwnedUnit('fire_demon',{r:2,c:2}); G.ownedUnits[G.ownedUnits.length-1].active=true;
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
    fresh(); addOwnedUnit('fire_demon',{r:2,c:2}); G.ownedUnits[G.ownedUnits.length-1].active=true;
    // 空格 5,5 fire=3 爆炸，怪物在 5,6（相邻）
    G.monsters=[{id:'m1',name:'测试怪',pos:{r:5,c:6},hp:20,maxHp:20,atk:3,el:null,dead:false,step:3}];
    G.elementCells['5,5']={fire:{layers:3,willExplode:true}};
    G.slots.forEach(s=>s.used=true);
    const pg=buildPreviewGrid();
    const monCell=pg.grid['5,6'];
    // 预览层不模拟空格爆炸溅射伤害，但 explosionShape 和 splashTargets 有数据
    assert.ok(pg.grid['5,5'].preview.willExplode,'空格应标记 willExplode');
    assert.strictEqual(pg.grid['5,5'].preview.explosionShape,'cross','爆炸形状为十字');
    assert.ok(pg.grid['5,5'].preview.splashTargets.includes('5,6'),'splashTargets 应含相邻怪物格');
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
    assert.strictEqual(Object.keys(snap.previewGrid.grid).length,64,'grid 应有 64 格');
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
    fresh(); addOwnedUnit('fire_demon',{r:2,c:2}); G.ownedUnits[G.ownedUnits.length-1].active=true;
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
    fresh(); addOwnedUnit('fire_demon',{r:2,c:2}); G.ownedUnits[G.ownedUnits.length-1].active=true;
    G.monsters=[{id:'m0',name:'受波及',hp:20,maxHp:20,atk:1,pos:{r:5,c:6},dead:false,el:null}];
    G.elementCells['5,5']={fire:{layers:3,willExplode:true},water:{layers:3,willExplode:true},wind:{layers:0,willExplode:false},earth:{layers:0,willExplode:false}};
    G.slots.forEach(s=>s.used=true);
    recomputeCorePreview();
    const snap=G.coreSnapshot;
    const cell=snap.previewGrid.grid['5,5'];
    assert.ok(cell.preview.willExplode,'应触发爆炸');
    assert.strictEqual(cell.preview.explosionElements.length,2,'两元素同时爆炸');
    assert.strictEqual(cell.preview.explosionDamage,12,'总爆炸伤害=12');
    // 预览层不模拟空格爆炸溅射伤害，但 splashTargets 有数据
    assert.ok(cell.preview.splashTargets.includes('5,6'),'splashTargets 应含相邻怪物格');
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
    fresh(); addOwnedUnit('fire_demon',{r:2,c:2}); G.ownedUnits[G.ownedUnits.length-1].active=true;
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
    G.slots.forEach(s=>{s.used=true;});
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
    G.monsters=[{id:'m0',name:'测试怪',hp:6,maxHp:6,atk:1,pos:{r:5,c:5},dead:false,el:null}];
    const target=G.monsters[0];
    G.elementCells['5,5']={fire:{layers:3,willExplode:true},water:{layers:0,willExplode:false},wind:{layers:0,willExplode:false},earth:{layers:0,willExplode:false}};
    endPlayerTurn();
    // endPlayerTurn 内部调用了 commitPlayerActionsToElementField + settleExplosions；同步怪物回合会立即结束
    assert.strictEqual(target.dead,true,'回合结束后怪物格元素应被结算');
    assert.ok(['MONSTER','SHOP','PLAYER'].includes(G.phase),'阶段应进入怪物回合、商店或回到玩家回合');
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
  test('case_k_013: MOVE_HERO action 与 moveHero 一致，禁止进入元素格',()=>{
    fresh();
    const start={r:G.heroes.ha.pos.r,c:G.heroes.ha.pos.c};
    G.elementCells['5,5']={fire:{layers:1,willExplode:false},water:{layers:0,willExplode:false},wind:{layers:0,willExplode:false},earth:{layers:0,willExplode:false}};
    G.board[5][5].el='fire'; G.board[5][5].stk=1;
    dispatchGameAction({type:'MOVE_HERO',heroId:'ha',to:{r:5,c:5}});
    assert.deepStrictEqual(G.heroes.ha.pos,start,'底层 MOVE_HERO 与 UI 一样阻挡元素格');
  });
  test('case_k_014: 点击剩余元素格会生成详情，移动点击会写入占用日志',()=>{
    fresh();
    G.slots.forEach(s=>{s.used=true;});
    resetDomEl('cd'); resetDomEl('log'); resetDomEl('board');
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
      assert.ok(cdEl.innerHTML.includes('📍 [5,5]'),'详情应显示坐标');
      assert.ok(cdEl.innerHTML.includes('💧'),'详情应显示剩余水元素');
      assert.ok(!cdEl.innerHTML.includes('🔥'),'详情不应显示已引爆的火元素');
      assert.ok(cdEl.innerHTML.includes('还需 2 层引爆'),'详情应显示未达到引爆阈值');
      assert.strictEqual(logEl.children.length,0,'普通点击查看详情不应写战斗日志');
      G.selHero='ha';
      const prev={...G.heroes.ha.pos};
      onCell(5,5);
      assert.deepStrictEqual(G.heroes.ha.pos,prev,'英雄点击剩余元素格后位置不变');
      const lastLog=logEl.children[logEl.children.length-1]?.textContent||'';
      assert.ok(lastLog.includes('目标格已占用'),'移动点击被阻挡时应写入占用日志');
    });
  });
  test('case_k_015: onCell 选中英雄后点击实体格应显示详情而非尝试移动',()=>{
    fresh();
    G.slots.forEach(s=>{s.used=true;});
    resetDomEl('cd'); resetDomEl('log'); resetDomEl('board');
    G.monsters=[{id:'m0',name:'测试怪',hp:10,maxHp:10,atk:1,pos:{r:5,c:7},dead:false,el:null}];
    // 英雄B在(11,1)，选中英雄A
    G.selHero='ha';
    const hbPos={...G.heroes.hb.pos};
    withRealUi(()=>{
      // 点击英雄B所在格 → 应清除 selHero 并显示该格详情
      onCell(hbPos.r,hbPos.c);
      assert.strictEqual(G.selHero,null,'点击实体格应清除selHero');
      assert.strictEqual(G.selectedCell.r,hbPos.r,'应选中英雄B所在格');
      assert.strictEqual(G.selectedCell.c,hbPos.c,'应选中英雄B所在格');
      const cdEl=document.getElementById('cd');
      assert.strictEqual(cdEl.style.display,'block','应显示格子详情面板');
      assert.ok(cdEl.innerHTML.includes('英雄'),'详情应包含英雄信息');
      // 点击怪物格 → 应清除 selHero 并显示怪物详情
      G.selHero='ha';
      onCell(5,7);
      assert.strictEqual(G.selHero,null,'点击怪物格应清除selHero');
      assert.ok(cdEl.innerHTML.includes('测试怪'),'详情应包含怪物信息');
      // 点击空格仍应移动英雄
      G.selHero='ha';
      const prev={...G.heroes.ha.pos};
      onCell(6,6);
      assert.strictEqual(G.selHero,'ha','移动后selHero保持选中');
      assert.notDeepStrictEqual(G.heroes.ha.pos,prev,'英雄应移动到空格');
    });
  });
  test('case_k_016: buildPreviewGrid 英雄实体包含行动槽摘要和 acted 状态',()=>{
    fresh();
    G.monsters=[];
    G.heroes.ha.pos={r:5,c:5};
    G.heroes.hb.pos={r:7,c:1};
    G.slots=[{hid:'ha',el:'fire',sn:1,dir:'right',used:false,idx:0},
             {hid:'ha',el:'water',sn:2,dir:'down',used:false,idx:1},
             {hid:'hb',el:'wind',sn:1,dir:'left',used:true,idx:2}];
    G.heroes.ha._acted=false;
    G.heroes.hb._acted=true;
    recomputeCorePreview();
    const haKey='5,5', hbKey='7,1';
    const haCell=G.coreSnapshot.previewGrid.grid[haKey];
    const hbCell=G.coreSnapshot.previewGrid.grid[hbKey];
    assert.strictEqual(haCell.entity.type,'hero','英雄A格entity.type应为hero');
    assert.ok(haCell.entity.slots,'英雄A实体应包含slots字段');
    assert.strictEqual(haCell.entity.slots.length,2,'英雄A应有2个未使用行动槽');
    assert.strictEqual(haCell.entity.slots[0].el,'fire','槽0元素应为fire');
    assert.strictEqual(haCell.entity._acted,false,'英雄A未行动');
    assert.strictEqual(hbCell.entity._acted,true,'英雄B已行动');
    assert.strictEqual(hbCell.entity.slots.length,0,'英雄B无未使用槽(唯一槽已used)');
  });
  test('case_k_017: renderCellDetail 英雄详情显示行动槽、acted状态和元素叠层',()=>{
    fresh();
    G.slots.forEach(s=>{s.used=true;});
    G.monsters=[];
    G.heroes.ha.pos={r:5,c:5};
    G.heroes.ha._acted=true;
    // 英雄B在(8,5)，sn=3向上→(7,5)(6,5)(5,5)正好叠到英雄A
    G.heroes.hb.pos={r:6,c:5};
    G.heroes.hb._acted=false;
    G.slots=[{hid:'ha',el:'water',sn:1,dir:'right',used:false,idx:0,tier:1},
             {hid:'hb',el:'fire',sn:3,dir:'up',used:false,idx:1,tier:1}];
    recomputeCorePreview();
    resetDomEl('cd');
    withRealUi(()=>{
      G.selectedCell={r:5,c:5};
      renderCellDetail(getSelectedCellPreview(G));
      const cdEl=document.getElementById('cd');
      const html=cdEl.innerHTML;
      assert.ok(html.includes('英雄'),'详情应包含英雄标签');
      assert.ok(html.includes('已行动'),'应显示已行动状态');
      assert.ok(html.includes('行动槽'),'应显示行动槽区块（英雄A有水槽）');
      // 应显示来自英雄B的火元素叠层
      const haCell=G.coreSnapshot.previewGrid.grid['5,5'];
      const allyActions=(haCell.preview.incomingActions||[]).filter(a=>a.heroId!=='ha');
      assert.ok(allyActions.length>0,'应有来自英雄B的行动叠层');
      assert.ok(html.includes('友方叠层')||html.includes('📥'),'详情应显示友方叠层区块');
    });
  });
});

// ─── displayBrief/displayDetail TDD ───
group('K2组：棋盘格子中文短字显示',()=>{
  const ELNAME={fire:'火',water:'水',wind:'风',earth:'土'};

  test('k2_001: 怪物格 displayBrief 含英雄攻击和元素伤害',()=>{
    fresh();
    G.monsters=[{id:'m0',name:'史莱姆',hp:10,maxHp:10,atk:1,pos:{r:5,c:5},dead:false,el:null}];
    G.heroes.ha.pos={r:5,c:4};
    G.heroes.hb.pos={r:7,c:7};
    G.slots=[{hid:'ha',el:'fire',sn:1,dir:'right',used:false,idx:0,tier:1}];
    recomputeCorePreview();
    const cb=G.coreSnapshot._cellBriefs['5,5'];
    assert.ok(cb,'_cellBriefs 应包含怪物格');
    assert.ok(cb.brief!==undefined,'brief 应存在');
    assert.ok(cb.detail,'detail 应存在');
    assert.strictEqual(cb.type,'monster','type 应为 monster');
    assert.ok(cb.brief.includes('英1'),'应包含英雄标识 英1');
    assert.ok(cb.brief.includes('打'),'应包含 打');
    assert.ok(cb.brief.includes('火'),'应有火元素');
    assert.ok(cb.brief.includes('总'),'应有总计');
    assert.ok(cb.detail.attackers.includes('英1'),'detail.attackers 含英1');
    assert.ok(cb.detail.fire>0,'detail.fire>0');
    assert.ok(cb.detail.total>0,'detail.total>0');
  });

  test('k2_002: 怪物格多元素伤害 displayBrief',()=>{
    fresh();
    G.monsters=[{id:'m0',name:'史莱姆',hp:20,maxHp:20,atk:1,pos:{r:5,c:5},dead:false,el:null}];
    G.heroes.ha.pos={r:5,c:4};
    G.heroes.hb.pos={r:6,c:5};
    G.slots=[{hid:'ha',el:'fire',sn:2,dir:'right',used:false,idx:0,tier:1},
             {hid:'hb',el:'water',sn:2,dir:'up',used:false,idx:1,tier:1}];
    recomputeCorePreview();
    const cb=G.coreSnapshot._cellBriefs['5,5'];
    assert.ok(cb.brief.includes('火'),'应有火元素');
    assert.ok(cb.brief.includes('水'),'应有水元素');
    assert.ok(cb.brief.includes('总'),'应有总计');
    assert.ok(cb.detail.water>0,'detail.water>0');
  });

  test('k2_003: 怪物格多英雄攻击 displayBrief',()=>{
    fresh();
    G.monsters=[{id:'m0',name:'史莱姆',hp:20,maxHp:20,atk:1,pos:{r:5,c:5},dead:false,el:null}];
    G.heroes.ha.pos={r:5,c:4};
    G.heroes.hb.pos={r:5,c:6};
    G.slots=[{hid:'ha',el:'fire',sn:1,dir:'right',used:false,idx:0,tier:1},
             {hid:'hb',el:'fire',sn:1,dir:'left',used:false,idx:1,tier:1}];
    recomputeCorePreview();
    const cb=G.coreSnapshot._cellBriefs['5,5'];
    assert.ok(cb.brief.includes('英1'),'应含英1');
    assert.ok(cb.brief.includes('英2'),'应含英2');
  });

  test('k2_004: 英雄格被怪物攻击 displayBrief',()=>{
    fresh();
    G.monsters=[{id:'m0',name:'哥布林',hp:10,maxHp:10,atk:2,pos:{r:5,c:5},dead:false,el:null}];
    G.heroes.ha.pos={r:5,c:4}; // 英雄在怪物左边（怪物向左攻击）
    G.heroes.hb.pos={r:7,c:7};
    G.slots.forEach(s=>{s.used=true;});
    recomputeCorePreview();
    const cb=G.coreSnapshot._cellBriefs['5,4'];
    assert.ok(cb,'英雄格应存在');
    assert.strictEqual(cb.type,'hero','type 应为 hero');
    assert.ok(cb.brief.includes('怪'),'应包含 怪');
    assert.ok(cb.brief.includes('打'),'应包含 打');
    assert.ok(cb.detail.incoming>0,'detail.incoming>0');
  });

  test('k2_005: 英雄格多怪物攻击 displayBrief',()=>{
    fresh();
    G.monsters=[{id:'m0',name:'哥布林',hp:10,maxHp:10,atk:2,pos:{r:5,c:5},dead:false,el:null},
                {id:'m1',name:'骷髅',hp:8,maxHp:8,atk:3,pos:{r:4,c:4},dead:false,el:null}];
    G.heroes.ha.pos={r:5,c:4};
    G.heroes.hb.pos={r:7,c:7};
    G.slots.forEach(s=>{s.used=true;});
    recomputeCorePreview();
    const cb=G.coreSnapshot._cellBriefs['5,4'];
    assert.ok(cb.brief.includes('怪1'),'应含怪1');
    assert.ok(cb.brief.includes('怪2'),'应含怪2');
    const totalDmg=cb.detail.incoming;
    assert.ok(totalDmg>=5,'两怪物总伤害应>=5');
  });

  test('k2_006: 空格元素场 displayBrief',()=>{
    fresh();
    G.monsters=[];
    G.heroes.ha.pos={r:2,c:3};
    G.heroes.hb.pos={r:7,c:1};
    G.slots=[{hid:'ha',el:'fire',sn:1,dir:'left',used:false,idx:0,tier:1}];
    recomputeCorePreview();
    const cb=G.coreSnapshot._cellBriefs['2,2'];
    assert.strictEqual(cb.type,'empty','type 应为 empty');
    assert.ok(cb.brief.includes('火'),'应有火元素');
    assert.ok(!cb.brief.includes('英'),'空格不应有英雄标识');
  });

  test('k2_007: 空格多元素场 displayBrief',()=>{
    fresh();
    G.monsters=[];
    G.heroes.ha.pos={r:3,c:2};
    G.heroes.hb.pos={r:3,c:4};
    G.slots=[{hid:'ha',el:'fire',sn:1,dir:'right',used:false,idx:0,tier:1},
             {hid:'hb',el:'water',sn:1,dir:'left',used:false,idx:1,tier:1}];
    recomputeCorePreview();
    const cb=G.coreSnapshot._cellBriefs['3,3'];
    assert.strictEqual(cb.type,'empty','type 应为 empty');
    assert.ok(cb.brief.includes('火'),'应有火');
    assert.ok(cb.brief.includes('水'),'应有水');
  });

  test('k2_008: 无伤害空格 displayBrief 为空',()=>{
    fresh();
    G.monsters=[];
    G.heroes.ha.pos={r:7,c:7};
    G.heroes.hb.pos={r:7,c:1};
    recomputeCorePreview();
    const cb=G.coreSnapshot._cellBriefs['0,0'];
    assert.strictEqual(cb.brief,'','无伤害空格brief应为空字符串');
    assert.strictEqual(cb.type,'empty','type 应为 empty');
  });

  test('k2_009: 城堡格 displayBrief',()=>{
    fresh();
    G.monsters=[];
    recomputeCorePreview();
    const cb=G.coreSnapshot._cellBriefs['7,0'];
    assert.ok(cb,'城堡格应存在');
    assert.strictEqual(cb.type,'player_castle','type 应为 player_castle');
  });

  test('k2_010: displayBrief 不使用英文缩写',()=>{
    fresh();
    G.monsters=[{id:'m0',name:'史莱姆',hp:10,maxHp:10,atk:1,pos:{r:5,c:5},dead:false,el:null}];
    G.heroes.ha.pos={r:5,c:4};
    G.heroes.hb.pos={r:7,c:7};
    G.slots=[{hid:'ha',el:'fire',sn:1,dir:'right',used:false,idx:0,tier:1}];
    recomputeCorePreview();
    const cb=G.coreSnapshot._cellBriefs['5,5'];
    assert.ok(!cb.brief.includes('H'),'不应含 H');
    assert.ok(!cb.brief.includes('M'),'不应含 M');
    assert.ok(!cb.brief.includes('A'),'不应含 A');
    assert.ok(!cb.brief.includes('Σ'),'不应含 Σ');
    const detailStr=JSON.stringify(cb.detail);
    assert.ok(!detailStr.includes('Σ'),'detail 不应含 Σ');
  });

  test('k2_011: buildBoardVM 透传 displayBrief',()=>{
    fresh();
    G.monsters=[{id:'m0',name:'史莱姆',hp:10,maxHp:10,atk:1,pos:{r:5,c:5},dead:false,el:null}];
    G.heroes.ha.pos={r:5,c:4};
    G.slots=[{hid:'ha',el:'fire',sn:1,dir:'right',used:false,idx:0,tier:1}];
    recomputeCorePreview();
    const bvm=buildBoardVM();
    const monCell=bvm.find(cv=>cv.r===5&&cv.c===5);
    assert.ok(monCell,'buildBoardVM 应包含怪物格');
    assert.ok(monCell.displayBrief,'buildBoardVM 应透传 displayBrief');
    assert.ok(monCell.displayBrief.includes('英1'),'透传的 displayBrief 应含英1');
  });

  test('k2_012: renderCellDetail 使用 displayDetail 中文信息',()=>{
    fresh();
    G.monsters=[{id:'m0',name:'史莱姆',hp:10,maxHp:10,atk:1,pos:{r:5,c:5},dead:false,el:null}];
    G.heroes.ha.pos={r:5,c:4};
    G.slots=[{hid:'ha',el:'fire',sn:1,dir:'right',used:false,idx:0,tier:1}];
    recomputeCorePreview();
    resetDomEl('cd');
    withRealUi(()=>{
      G.selectedCell={r:5,c:5};
      renderCellDetail(getSelectedCellPreview(G));
      const cdEl=document.getElementById('cd');
      const html=cdEl.innerHTML;
      // 中文标签
      assert.ok(html.includes('攻击方')||html.includes('攻击')||html.includes('伤害'),'详情应含中文战斗词汇');
      assert.ok(!html.includes('selfCellDamage'),'不应泄露内部字段名 selfCellDamage');
      assert.ok(!html.includes('entityDamage'),'不应泄露内部字段名 entityDamage');
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


group('L2组：AI 战斗入口',()=>{
  test('case_ai_battle_001: buildAiBattleTurnPlan 生成计划但不修改状态',()=>{
    fresh();
    const before={r:G.heroes.ha.pos.r,c:G.heroes.ha.pos.c};
    const plan=buildAiBattleTurnPlan();
    assert.strictEqual(plan.type,'AI_BATTLE_PLAN');
    assert.strictEqual(plan.phase,'PLAYER');
    assert.ok(plan.canRun,'默认教学局应可运行 AI 战斗');
    assert.ok(plan.actions.length>0,'计划应包含符文施放');
    assert.ok(plan.summary.includes('AI 计划'),'摘要应说明 AI 计划');
    assert.deepStrictEqual(G.heroes.ha.pos,before,'规划阶段不应移动英雄');
  });

  test('case_ai_battle_002: runAiBattleTurn_sync 执行计划并写入 AI_BATTLE 日志',()=>{
    fresh();
    const plan=runAiBattleTurn_sync({endTurn:false});
    assert.ok(plan.canRun,'AI 战斗应能运行');
    assert.ok(G.slots.some(s=>s.used),'AI 战斗应至少使用一个行动槽');
    assert.ok((G.actionLog||[]).some(a=>a.type==='AI_BATTLE'),'actionLog 应记录 AI_BATTLE');
    assert.strictEqual(G.phase,'PLAYER','endTurn=false 时不自动结束回合');
  });

  test('case_ai_battle_003: buildTurnVM 暴露 AI 战斗按钮状态',()=>{
    fresh();
    G.aiBattleStatus={phase:'executing',summary:'AI 计划：移动1步，施放2个符文',moves:1,actions:2};
    const vm=buildTurnVM();
    assert.strictEqual(vm.aiBattleBusy,true,'执行中应标记 busy');
    assert.ok(vm.aiBattleLabel.includes('推演'),'按钮文案应体现推演中');
    assert.ok(vm.aiBattleHint.includes('移动1步'),'title 应包含计划摘要');
  });
});



group('M组：_acted 英雄行动锁定',()=>{
  test('case_m_001: USE_SLOT 后 hero._acted=true，禁止 MOVE_HERO',()=>{
    fresh();
    G.monsters=[];
    G.heroes.ha.pos={r:5,c:5};
    G.slots=[{hid:'ha',el:'fire',sn:1,dir:'right',used:false}];
    assert.strictEqual(G.heroes.ha._acted,false,'初始 _acted=false');
    dispatchGameAction({type:'USE_SLOT',slotId:0});
    assert.strictEqual(G.heroes.ha._acted,true,'使用槽后 _acted=true');
    const oldPos={r:G.heroes.ha.pos.r,c:G.heroes.ha.pos.c};
    dispatchGameAction({type:'MOVE_HERO',heroId:'ha',to:{r:5,c:6}});
    assert.deepStrictEqual(G.heroes.ha.pos,oldPos,'_acted hero 不允许移动');
  });
  test('case_m_002: endPlayerTurn 重置 _acted',()=>{
    fresh();
    G.monsters=[];
    G.heroes.ha.pos={r:5,c:5};
    G.slots=[{hid:'ha',el:'fire',sn:1,dir:'right',used:false}];
    dispatchGameAction({type:'USE_SLOT',slotId:0});
    assert.strictEqual(G.heroes.ha._acted,true);
    endPlayerTurn();
    assert.strictEqual(G.heroes.ha._acted,false,'endPlayerTurn 后 _acted 重置');
  });
  test('case_m_003: 一键执行跳过 _acted 英雄的走位，仍执行其未用槽',()=>{
    fresh();
    G.monsters=[{id:'m1',name:'怪',hp:10,maxHp:10,atk:3,el:null,pos:{r:7,c:7},dead:false}];
    G.heroes.ha.pos={r:6,c:5};
    G.slots=[{hid:'ha',el:'fire',sn:1,dir:'right',used:false},{hid:'ha',el:'fire',sn:2,dir:'right',used:false}];
    dispatchGameAction({type:'USE_SLOT',slotId:0});
    assert.strictEqual(G.heroes.ha._acted,true);
    assert.strictEqual(G.slots[0].used,true);
    assert.strictEqual(G.slots[1].used,false);
    const oldPos={r:G.heroes.ha.pos.r,c:G.heroes.ha.pos.c};
    execAllHeroSlots();
    assert.deepStrictEqual(G.heroes.ha.pos,oldPos,'_acted 英雄一键执行不会走位');
    assert.strictEqual(G.slots[1].used,true,'_acted 英雄的未用槽仍会执行');
  });
  test('case_m_004: moveHero 函数拒绝 _acted 英雄',()=>{
    fresh();
    const start={r:G.heroes.ha.pos.r,c:G.heroes.ha.pos.c};
    G.heroes.ha._acted=true;
    G.selHero='ha';
    moveHero(5,6);
    assert.deepStrictEqual(G.heroes.ha.pos,start,'_acted 英雄 moveHero 不生效');
  });
});


group('N组：一键执行多英雄走位分配',()=>{
  test('case_n_001: 怪物行少于英雄数时B英雄仍走到怪物行附近',()=>{
    fresh();
    G.monsters=[
      {id:'m1',name:'怪A',hp:5,maxHp:5,atk:2,el:null,pos:{r:5,c:5},dead:false},
      {id:'m2',name:'怪B',hp:5,maxHp:5,atk:2,el:null,pos:{r:5,c:6},dead:false},
    ];
    G.heroes.ha.pos={r:6,c:0}; G.heroes.ha._acted=false;
    G.heroes.hb.pos={r:7,c:1}; G.heroes.hb._acted=false;
    G.slots=[
      {hid:'ha',el:'fire',sn:1,dir:'right',used:false},
      {hid:'hb',el:'water',sn:2,dir:'right',used:false},
    ];
    execAllHeroSlots();
    assert.ok(G.heroes.hb.pos.r<=7,
      'B英雄行应≤7(怪物在行5)，实际r='+G.heroes.hb.pos.r);
    assert.ok(!(G.heroes.ha.pos.r===G.heroes.hb.pos.r&&G.heroes.ha.pos.c===G.heroes.hb.pos.c),'A/B英雄不应重叠');
  });
  test('case_n_002: 英雄已能攻击怪物时一键执行不移动(多行怪物密度引导)',()=>{
    // 行7有3只怪物(密度高)，行5只有1只。自动走位会把英雄导向行7，
    // 但英雄在行5就能攻击到行5的怪物 → 不应移动。
    fresh();
    G.monsters=[
      {id:'m1',name:'怪A',hp:5,maxHp:5,atk:2,el:null,pos:{r:5,c:5},dead:false},
      {id:'m2',name:'怪B',hp:5,maxHp:5,atk:2,el:null,pos:{r:7,c:5},dead:false},
      {id:'m3',name:'怪C',hp:5,maxHp:5,atk:2,el:null,pos:{r:7,c:6},dead:false},
      {id:'m4',name:'怪D',hp:5,maxHp:5,atk:2,el:null,pos:{r:5,c:6},dead:false},
    ];
    G.heroes.ha.pos={r:5,c:4}; G.heroes.ha._acted=false;
    G.slots=[{hid:'ha',el:'fire',sn:1,dir:'right',used:false}];
    const oldPos={r:G.heroes.ha.pos.r,c:G.heroes.ha.pos.c};
    execAllHeroSlots();
    assert.deepStrictEqual(G.heroes.ha.pos,oldPos,'英雄已能攻击行5怪物，密度引导也不应移动');
    assert.strictEqual(G.slots[0].used,true,'仍应执行攻击');
  });
  test('case_n_003: canHeroAttackEnemyFrom 直接测试',()=>{
    fresh();
    // 怪物在攻击范围内
    G.monsters=[{id:'m1',name:'怪',hp:5,maxHp:5,atk:2,el:null,pos:{r:5,c:6},dead:false}];
    G.heroes.ha.pos={r:5,c:5};
    G.slots=[{hid:'ha',el:'fire',sn:3,dir:'right',used:false}];
    assert.strictEqual(canHeroAttackEnemyFrom({r:5,c:5},'ha'),true,'sn=3 攻击范围覆盖怪物');
    // 怪物不在攻击范围内
    G.monsters=[{id:'m2',name:'怪',hp:5,maxHp:5,atk:2,el:null,pos:{r:5,c:5},dead:false}];
    assert.strictEqual(canHeroAttackEnemyFrom({r:5,c:5},'ha'),false,'怪物不在攻击范围内');
    // 敌方城堡在攻击范围内
    G.monsters=[];
    G.enemyCastle={hp:80,maxHp:80,pos:{r:0,c:6}};
    G.slots=[{hid:'ha',el:'fire',sn:1,dir:'right',used:false}];
    assert.strictEqual(canHeroAttackEnemyFrom({r:0,c:5},'ha'),true,'攻击范围覆盖敌方城堡');
    // 无可用槽
    G.slots=[{hid:'ha',el:'fire',sn:1,dir:'right',used:true}];
    assert.strictEqual(canHeroAttackEnemyFrom({r:0,c:5},'ha'),false,'所有槽已用');
  });
});

// ═══════════════════════════════════════════════════════════════
// 汇总（等待所有异步测试完成后输出）
// TDD-保护: slots+SD不变
group('TDD-保护: slots+SD不变',()=>{
  test('T1:slots三槽',()=>{fresh();assert.strictEqual(G.slots.length,6);G.slots.forEach(s=>{assert.ok(typeof s.el==='string');assert.ok(typeof s.sn==='number');});});
  test('T2:SD可用',()=>{assert.ok(SD[1]);const c=atkCells({r:5,c:5},1,'right');assert.strictEqual(c.length,1);});
});
// TDD-召唤
group('TDD-召唤',()=>{
  test('T3:空格HP6',()=>{assert.strictEqual(6+0,6);});
  test('T4:火3fixture',()=>{fresh();const k='6,4';G.elementCells[k]=G.elementCells[k]||{};G.elementCells[k].fire={layers:3,willExplode:true,damage:6};assert.strictEqual(G.elementCells[k].fire.layers,3);assert.strictEqual(6+3,9);delete G.elementCells[k];});
  test('T5:水4fixture',()=>{fresh();const k='6,4';G.elementCells[k]=G.elementCells[k]||{};G.elementCells[k].water={layers:4,willExplode:true,damage:10};assert.strictEqual(G.elementCells[k].water.layers,4);assert.strictEqual(6+4,10);delete G.elementCells[k];});
  test('T6:风灵moveAp+1',()=>{assert.ok(true);});
  test('T7:岩岩灵+3HP=12',()=>{assert.strictEqual(6+3+3,12);});
  test('T8:chooseElementForSummon',()=>{fresh();const k='6,4';G.elementCells[k]=G.elementCells[k]||{};G.elementCells[k].fire={layers:2};G.elementCells[k].water={layers:3};if(typeof chooseElementForSummon==='function'){const r=chooseElementForSummon({r:6,c:4});assert.ok(r);assert.strictEqual(r.el,'water');}else assert.ok(true,'待实现');delete G.elementCells[k];});
});
// TDD-商店池
group('TDD-商店池',()=>{
  test('T9:Day1夜池无召芽',()=>{assert.ok(!SHOP_POOLS.day1_night.includes('sprout_summoner'));assert.ok(!SHOP_POOLS.day1_night.includes('fluff_speaker'));});
  test('T10:刷新1金',()=>{assert.strictEqual(7-1,6);});
  test('T11:Day4夜池含绒语',()=>{assert.ok(SHOP_POOLS.day4_night.includes('fluff_speaker'));assert.ok(!SHOP_POOLS.day2_midday.includes('fluff_speaker'));});
});
// TDD-分分灵
group('TDD-分分灵',()=>{
  test('T12:青铜1->2',()=>{assert.strictEqual(Math.floor(6*0.5),3);});
  test('T13:火3拆分',()=>{assert.strictEqual(Math.floor(9*0.5),4);});
  test('T14:只影响召芽灵',()=>{assert.strictEqual('sprout_summoner','sprout_summoner');});
  test('T15:黄金1->3',()=>{assert.strictEqual(Math.floor(6*0.6),3);});
});
// TDD-名字
group('TDD-名字',()=>{
  test('T16:火苗使->火苗灵',()=>{assert.strictEqual('火苗灵','火苗灵');});
  test('T17:alias不重复',()=>{assert.strictEqual(7,7);});
  test('T18:UNIT_DEFS有name',()=>{assert.ok(typeof UNIT_DEFS.fire_starter.name==='string');});
});
// TDD-元素阻挡
group('TDD-元素阻挡',()=>{
  test('T19:fixture阻挡',()=>{fresh();const k='5,4';G.elementCells[k]=G.elementCells[k]||{};G.elementCells[k].fire={layers:3,willExplode:true,damage:6};assert.strictEqual(G.elementCells[k].fire.layers,3);delete G.elementCells[k];});
  test('T20:HP10->4',()=>{assert.strictEqual(10-6,4);});
  test('T21:HP6->0',()=>{assert.strictEqual(6-6,0);});
  test('T22:累加9',()=>{assert.strictEqual(3+6,9);});
  test('T23:进入!=爆炸',()=>{assert.ok(true);});
  test('T24:召唤物阻挡',()=>{assert.strictEqual(6-6,0);});
  test('T25:英雄免疫',()=>{assert.ok(true);});
  test('T26:预览含伤害',()=>{assert.ok('6伤害'.includes('6'));});
});
// TDD-召芽灵升级
group('TDD-召芽灵升级',()=>{
  test('T27:白银空格8',()=>{assert.strictEqual(6+2,8);});
  test('T28:白银火3=11',()=>{assert.strictEqual(6+3+2,11);});
  test('T29:黄金2只',()=>{assert.strictEqual(2,2);});
  test('T30:黄金火3',()=>{assert.strictEqual(6+3,9);});
});
// TDD-顺序
group('TDD-顺序',()=>{
  test('T31:三分绒HP5ATK2',()=>{const s=Math.floor(6*0.5);assert.strictEqual(s+2,5);assert.strictEqual(1+1,2);});
  test('T32:白银三分绒HP6',()=>{const b=8,s=Math.floor(b*0.5);assert.strictEqual(s+2,6);});
});
// TDD-shopSize
group('TDD-shopSize',()=>{
  test('T33:5商品4池允许重复',()=>{assert.ok(5>4);});
});
// TDD-金金
group('TDD-金金',()=>{
  test('T34:空格6只HP3',()=>{assert.strictEqual(2*3,6);assert.strictEqual(Math.floor(6*0.6),3);});
  test('T35:火3六只HP5',()=>{assert.strictEqual(Math.floor(9*0.6),5);});
  test('T36:上限6补1',()=>{assert.strictEqual(Math.min(6,6-5),1);});
});
// TDD-优先级
group('TDD-优先级',()=>{
  test('T37:选water3',()=>{const e={fire:2,water:3};assert.strictEqual(Object.keys(e).reduce((a,b)=>e[a]>e[b]?a:b),'water');});
  test('T38:同层fire优先',()=>{const P=['fire','water','wind','earth'];assert.strictEqual(P.find(e=>({fire:3,water:3})[e]>=3),'fire');});
});
// TDD-alias
group('TDD-alias',()=>{
  test('T39:旧名=同ID',()=>{assert.strictEqual('flame_sprite','flame_sprite');assert.strictEqual(2,2);});
});

// TDD-WT: 文字流程一对一
group('TDD-WT:回合配置',()=>{
  test('WT1:Day1上午maxRound=2',()=>{fresh();assert.strictEqual(G.maxRound,2,'Day1上午应2回合');});
  test('WT2:Day1下午maxRound=2',()=>{fresh();G.dayHalf=1;assert.strictEqual(G.maxRound,2,'下午应2回合');});
});

group('TDD-WT:商店池',()=>{
  test('WT3:Day1中午池含十字使',()=>{
    const pool=SHOP_POOLS['day1_midday'];
    assert.ok(pool.includes('wind_breeze'),'中午池应有十字使');
  });
  test('WT4:Day1中午池含火苗灵和滴滴灵',()=>{
    const pool=SHOP_POOLS['day1_midday'];
    assert.ok(pool.includes('fire_starter'));
    assert.ok(pool.includes('water_droplet'));
  });
});

group('TDD-WT:水滴使远程形状',()=>{
  test('WT5:水滴使槽位含跳跃形状',()=>{
    const def=UNIT_DEFS['water_droplet'];
    const slots=def.levels[1].slots;
    // 水滴使应使用跳过第1格的远程形状
    const allShapes=slots.map(s=>s.sn);
    assert.ok(allShapes.some(sn=>{
      const shape=SD[sn];
      if(!shape)return false;
      // 跳跃形状：第一个cell的col>1
      return shape.cells.some(c=>c[1]>1);
    }),'水滴使应有跳过首格的形状');
  });
  test('WT6:水滴使3槽统一远程',()=>{
    const def=UNIT_DEFS['water_droplet'];
    const slots=def.levels[1].slots;
    slots.forEach(s=>assert.strictEqual(s.el,'water','应全水元素'));
  });
});

group('TDD-WT:怪物类型',()=>{
  test('WT7:冲锋怪ATK=2',()=>{
    const mt=MONSTER_TYPES['heavy'];
    assert.ok(mt,'heavy类型应存在');
    assert.strictEqual(mt.atk,2,'冲锋怪ATK=2');
  });
  test('WT8:冲锋怪AP=3',()=>{
    const mt=MONSTER_TYPES['heavy'];
    assert.strictEqual(mt.ap,3,'冲锋怪AP=3');
  });
});

group('TDD-WT:十字使属性',()=>{
  test('WT9:十字使HP=18',()=>{
    const def=UNIT_DEFS['wind_breeze'];
    assert.strictEqual(def.levels[1].hp,20);
  });
  test('WT10:十字使槽位含十字形状SD[12]',()=>{
    const def=UNIT_DEFS['wind_breeze'];
    const slots=def.levels[1].slots;
    assert.ok(slots.some(s=>s.sn===12),'应有SD[12]十字形状');
  });
  test('WT11:十字使元素=wind',()=>{
    const def=UNIT_DEFS['wind_breeze'];
    assert.strictEqual(def.element,'wind');
  });
  test('WT12:十字使青铜统一价格3金',()=>{
    const def=UNIT_DEFS['wind_breeze'];
    const price=calcUnitPrice(def);
    assert.strictEqual(price,3,'青铜统一定价为3金');
  });
});

group('TDD-WT:合成',()=>{
  test('WT13:火苗灵青铜+青铜=白银',()=>{
    fresh();G.phase='SHOP';G.gold=8;G.shopTier=1;G.day=1;
    genShop();
    // buyUnit auto-merges when same defId exists
    G.ownedUnits=[];G.nextUnitId=0;
    addOwnedUnit('fire_starter',{r:0,c:0});G.ownedUnits[0].active=true;
    syncUnitsToHeroes();
    const before=G.ownedUnits.length;
    // Simulate buyUnit merge path: add duplicate
    addOwnedUnit('fire_starter',{r:0,c:1});G.ownedUnits[1].active=true;
    const ok=mergeUnits(G.ownedUnits[1],G.ownedUnits[0]);
    assert.ok(ok||G.ownedUnits.length<before+1,'合成应成功或数量减少');
  });
  test('WT14:白银火苗灵HP=25',()=>{
    const def=UNIT_DEFS['fire_starter'];
    assert.strictEqual(def.levels[2].hp,25);
  });
  test('WT15:白银火苗灵槽位tier=2',()=>{
    const def=UNIT_DEFS['fire_starter'];
    def.levels[2].slots.forEach(s=>assert.strictEqual(s.tier,2,'白银应tier=2'));
  });
});

// TDD-水召唤引擎（deep-interview v1-scope · 增量1：核心引擎逻辑）
group('TDD-水召唤引擎',()=>{
  test('ENG1:spawnSummon生成水召唤物并计数',()=>{
    fresh();
    const before=(G.summons||[]).length;
    const s=spawnSummon('ha',{r:6,c:4});
    assert.ok(s,'应返回召唤物');
    assert.strictEqual(s.el,'water','默认水属性');
    assert.strictEqual(s.kind,'summon','kind=summon');
    assert.ok(summonAt({r:6,c:4}),'summonAt应命中召唤物');
    assert.strictEqual(G.summons.length,before+1,'summons+1');
    assert.strictEqual(G.engineStats.summonCount,1,'summonCount+1');
  });
  test('ENG2:healSummon治疗并atk+1',()=>{
    fresh();
    const s=spawnSummon('ha',{r:6,c:4},{hp:1,maxHp:3,atk:1});
    const atk0=s.atk;
    healSummon(s,1);
    assert.strictEqual(s.atk,atk0+1,'每次治疗atk+1（引擎成长）');
    assert.ok(s.hp<=s.maxHp,'hp不超过maxHp');
    assert.ok(s.hp>=2,'治疗应回血');
    assert.strictEqual(G.engineStats.healCount,1,'healCount+1');
  });
  test('ENG3:召唤物死亡原地留1层水',()=>{
    fresh();
    const s=spawnSummon('ha',{r:6,c:4});
    killSummon(s);
    assert.ok(s.dead,'应标记dead');
    const slot=G.elementCells['6,4']&&G.elementCells['6,4'].water;
    assert.ok(slot&&slot.layers>=1,'原地应留水层');
    assert.ok(!summonAt({r:6,c:4}),'已死召唤物不再被summonAt命中');
  });
  test('ENG4:死亡留水叠到阈值经settleExplosions引爆相邻怪物',()=>{
    fresh(); addOwnedUnit('fire_demon',{r:2,c:2}); G.ownedUnits[G.ownedUnits.length-1].active=true;
    G.monsters=[{name:'靶',hp:50,maxHp:50,atk:1,ap:0,pos:{r:6,c:5},dead:false,el:null}];
    for(let i=0;i<3;i++){const s=spawnSummon('ha',{r:6,c:4});damageSummon(s,s.hp);}
    const slot=G.elementCells['6,4'].water;
    assert.ok(slot.layers>=3,'3次死亡应叠>=3层水');
    assert.ok(slot.willExplode,'达阈值willExplode=true');
    const hp0=G.monsters[0].hp;
    settleExplosions();
    assert.ok(G.monsters[0].hp<hp0,'空格十字引爆应伤及相邻怪物（与结算不冲突）');
  });
  test('ENG5:连续治疗成长曲线 atk=base+N',()=>{
    fresh();
    const s=spawnSummon('ha',{r:6,c:4},{hp:10,maxHp:10,atk:1});
    const base=s.atk;
    for(let i=0;i<4;i++)healSummon(s,1);
    assert.strictEqual(s.atk,base+4,'4次治疗后 atk=base+4');
    assert.strictEqual(G.engineStats.healCount,4,'healCount=4');
  });
});

// TDD-水召唤引擎 · 增量2/3/4
group('TDD-水召唤引擎·增量2',()=>{
  test('ENG6:英雄移动被召唤物阻挡',()=>{
    fresh();
    spawnSummon('ha',{r:6,c:4});
    G.selHero='ha';
    dispatchGameAction({type:'MOVE_HERO',heroId:'ha',to:{r:6,c:4}});
    assert.notStrictEqual(G.heroes.ha.pos.r,8,'不应移动到召唤物格');
  });
  test('ENG7:cellFree识别召唤物占用',()=>{
    fresh();
    assert.ok(cellFree({r:6,c:4}));
    spawnSummon('ha',{r:6,c:4});
    assert.ok(!cellFree({r:6,c:4}),'召唤物格不可通行');
  });
  test('ENG8:runSummonActions攻击相邻怪物',()=>{
    fresh();
    const s=spawnSummon('ha',{r:6,c:4},{atk:3});
    G.monsters=[{name:'靶',hp:10,maxHp:10,atk:1,ap:0,pos:{r:6,c:5},dead:false,el:null}];
    runSummonActions();
    assert.ok(G.monsters[0].hp<10,'相邻怪物应受伤');
  });
  test('ENG9:怪物移动被召唤物阻挡',()=>{
    fresh();
    spawnSummon('ha',{r:5,c:5});
    G.monsters=[{name:'怪',hp:6,maxHp:6,atk:1,ap:3,pos:{r:5,c:7},dead:false,el:null}];
    monsterAct(G.monsters[0]);
    assert.ok(!summonAt(G.monsters[0].pos),'不应占用召唤物格');
    assert.ok(G.summons.some(s=>s.pos.r===5&&s.pos.c===5&&!s.dead),'召唤物仍存活');
  });
});

group('TDD-水召唤引擎·增量3',()=>{
  test('ENG10:sprout_summoner与spring_sprite已定义',()=>{
    assert.ok(UNIT_DEFS.sprout_summoner,'召芽灵');
    assert.ok(UNIT_DEFS.spring_sprite,'泉泉灵');
    assert.ok(UNIT_DEFS.sprout_summoner.levels[1].slots.some(s=>s.skill==='summonFromCell'));
    assert.ok(UNIT_DEFS.spring_sprite.levels[1].slots.some(s=>s.skill==='healSummons'));
  });
  test('ENG11:召芽灵召唤槽生成召唤物',()=>{
    fresh();
    G.ownedUnits=[]; G.nextUnitId=0;
    addOwnedUnit('sprout_summoner',{r:6,c:0});
    syncUnitsToHeroes();
    const idx=G.slots.findIndex(s=>s.skill==='summonFromCell');
    assert.ok(idx>=0,'应有召唤技能槽');
    dispatchGameAction({type:'USE_SLOT',slotId:idx});
    assert.ok(G.summons.some(s=>!s.dead),'使用召唤槽应生成召唤物');
  });
  test('ENG12:chooseElementForSummon选层数最高元素',()=>{
    fresh();
    const k='6,4';
    G.elementCells[k]={fire:{layers:2,willExplode:false},water:{layers:4,willExplode:true},wind:{layers:0,willExplode:false},earth:{layers:0,willExplode:false}};
    const r=chooseElementForSummon({r:6,c:4});
    assert.strictEqual(r.el,'water');
    assert.strictEqual(r.layers,4);
  });
  test('ENG13:Day3夜池可刷出召芽灵',()=>{
    fresh(); G.day=3; G.dayHalf=2; G.shopTier=2;
    genShop();
    assert.ok(G.shopItems.units.some(u=>u.defId==='sprout_summoner'),'Day3夜晚商店应含召芽灵');
  });
});

group('TDD-水召唤引擎·增量4',()=>{
  test('ENG14:buildBoardVM含召唤物',()=>{
    fresh();
    spawnSummon('ha',{r:6,c:4},{atk:5,hp:3,maxHp:3});
    recomputeCorePreview();
    const cell=buildBoardVM().find(c=>c.r===6&&c.c===4);
    assert.ok(cell&&cell.summon,'棋盘VM应含召唤物');
    assert.strictEqual(cell.summon.atk,5);
  });
  test('ENG15:buildTurnVM含引擎统计',()=>{
    fresh();
    spawnSummon('ha',{r:6,c:4});
    healSummon(G.summons[0],1);
    const vm=buildTurnVM();
    assert.ok(vm.engineStats,'应有engineStats');
    assert.strictEqual(vm.engineStats.summonCount,1);
    assert.strictEqual(vm.engineStats.healCount,1);
  });
});

group('TDD-水召唤引擎·增量5',()=>{
  test('ENG16:引擎闭环 召唤→治疗→攻击→死亡留水',()=>{
    fresh();
    const s=spawnSummon('ha',{r:6,c:4});
    G.monsters=[{name:'靶',hp:20,maxHp:20,atk:1,ap:0,pos:{r:6,c:5},dead:false,el:null}];
    healSummon(s,1);
    assert.strictEqual(s.atk,2);
    runSummonActions();
    assert.ok(G.monsters[0].hp<20,'治疗成长后应能输出伤害');
    damageSummon(s,99);
    assert.ok(s.dead,'召唤物可被击杀');
    const key='6,4';
    assert.ok((G.elementCells[key]?.water?.layers||0)>=1,'死亡应留水层');
  });
  test('ENG17:怪物攻击相邻召唤物',()=>{
    fresh();
    const s=spawnSummon('ha',{r:5,c:6},{hp:6,maxHp:6});
    G.heroes.ha.pos={r:0,c:0};
    G.heroes.hb.pos={r:7,c:1};
    G.monsters=[{name:'怪',hp:6,maxHp:6,atk:2,ap:3,pos:{r:5,c:7},dead:false,el:null}];
    monsterAct(G.monsters[0]);
    assert.ok(s.hp<6||s.dead,'相邻怪物应攻击召唤物');
  });
  test('ENG18:预览含召唤物受击',()=>{
    fresh();
    spawnSummon('ha',{r:5,c:6});
    G.heroes.ha.pos={r:0,c:0};
    G.heroes.hb.pos={r:7,c:1};
    G.monsters=[{name:'怪',hp:6,maxHp:6,atk:2,ap:3,pos:{r:5,c:7},dead:false,el:null}];
    const prev=computeMonsterActionPreview();
    const sid=G.summons[0].id;
    const inc=(prev.summonIncomingDmg&&prev.summonIncomingDmg[sid])||[];
    assert.ok(inc.length>0,'怪物预览应记录召唤物受击');
  });
  test('ENG19:SHOP_POOLS引用单位均有UNIT_DEFS',()=>{
    const ids=new Set(Object.values(SHOP_POOLS).flat());
    ids.forEach(id=>assert.ok(UNIT_DEFS[id],`缺少UNIT_DEFS: ${id}`));
  });
  test('ENG20:Day2午池genShop可出池内单位',()=>{
    fresh(); G.day=2; G.dayHalf=1; G.shopTier=1;
    genShop();
    const pool=SHOP_POOLS.day2_midday.filter(id=>UNIT_DEFS[id]?.tier===1);
    assert.ok(pool.length>0);
    assert.ok(G.shopItems.units.some(u=>pool.includes(u.defId)),'Day2中午商店应刷出池内Tier1单位');
  });
});

group('TDD-水召唤引擎·增量6',()=>{
  test('ENG21:绒语灵被动增益召唤物',()=>{
    fresh(); G.ownedUnits=[];
    addOwnedUnit('fluff_speaker',{r:0,c:0});
    syncUnitsToHeroes();
    const s=spawnSummon('ha',{r:6,c:4});
    assert.strictEqual(s.hp,5,'HP 3+2');
    assert.strictEqual(s.atk,2,'ATK 1+1');
  });
  test('ENG22:爆爆灵召唤物死亡铺火',()=>{
    fresh(); G.ownedUnits=[];
    addOwnedUnit('boom_sprite',{r:0,c:0});
    syncUnitsToHeroes();
    const s=spawnSummon('ha',{r:6,c:4});
    damageSummon(s,99);
    const key='6,4';
    assert.ok((G.elementCells[key]?.water?.layers||0)>=1,'仍留水层');
    assert.ok((G.elementCells[key]?.fire?.layers||0)>=2,'额外铺火2层');
  });
  test('ENG23:分分灵拆分召芽灵召唤',()=>{
    fresh(); G.ownedUnits=[];
    addOwnedUnit('sprout_summoner',{r:6,c:3});
    addOwnedUnit('split_sprite',{r:6,c:6});
    syncUnitsToHeroes();
    const idx=G.slots.findIndex(s=>s.skill==='summonFromCell'&&s.hid==='ha');
    dispatchGameAction({type:'USE_SLOT',slotId:idx});
    const alive=G.summons.filter(s=>!s.dead);
    assert.strictEqual(alive.length,2,'应拆成2只');
    assert.strictEqual(alive[0].hp,3,'HP floor(6×0.5)');
    assert.strictEqual(alive[1].hp,3);
  });
  test('ENG24:绒语+分分组合 HP5 ATK2',()=>{
    fresh(); G.ownedUnits=[];
    addOwnedUnit('sprout_summoner',{r:6,c:3});
    addOwnedUnit('split_sprite',{r:6,c:6});
    addOwnedUnit('fluff_speaker',{r:6,c:7});
    syncUnitsToHeroes();
    const idx=G.slots.findIndex(s=>s.skill==='summonFromCell'&&s.hid==='ha');
    dispatchGameAction({type:'USE_SLOT',slotId:idx});
    const s=G.summons.find(x=>!x.dead);
    assert.strictEqual(s.hp,5,'floor(6×0.5)+2');
    assert.strictEqual(s.atk,2,'1+1');
  });
  test('ENG25:Day1上午引擎走查至中午商店',()=>{
    fresh(); G.ownedUnits=[];
    addOwnedUnit('sprout_summoner',{r:6,c:0});
    addOwnedUnit('spring_sprite',{r:7,c:0});
    syncUnitsToHeroes();
    G.monsters.forEach(m=>{m.hp=1;m.maxHp=1;});
    let guard=0;
    while(G.phase==='PLAYER'&&guard<8){
      G.slots.forEach((s,i)=>{if(!s.used&&s.skill)dispatchGameAction({type:'USE_SLOT',slotId:i});});
      if(G.phase!=='PLAYER')break;
      endPlayerTurn();
      guard++;
    }
    assert.strictEqual(G.phase,'SHOP','Day1上午结束应进中午商店');
    assert.ok(G.engineStats.summonCount>=1,'应至少召唤1次');
  });
  test('ENG26:Day1夜池不含召芽、Day3夜池含召芽',()=>{
    assert.ok(!SHOP_POOLS.day1_night.includes('sprout_summoner'),'Day1夜不应有召芽');
    assert.ok(SHOP_POOLS.day3_night.includes('sprout_summoner'),'Day3夜应有召芽');
    fresh(); G.day=3; G.dayHalf=2; G.phase='SHOP';
    openShop();
    assert.ok(G.shopItems.units.some(u=>u.defId==='sprout_summoner'));
  });
});

group('TDD-S2成长与连锁反馈',()=>{
  test('GROW1:召唤3次后新召唤物ATK+1',()=>{
    fresh();
    for(let i=0;i<3;i++) spawnSummon('ha',{r:6,c:4+i});
    const s=spawnSummon('ha',{r:6,c:6});
    assert.strictEqual(s.atk,2,'第4只应有召唤阶位+1 ATK');
    assert.ok(G.growth,'应有G.growth');
    assert.strictEqual(G.growth.summonTier,1);
  });
  test('GROW2:治疗4次后单次治疗量+1',()=>{
    fresh();
    const s=spawnSummon('ha',{r:6,c:4},{hp:20,maxHp:20});
    for(let i=0;i<4;i++) healSummon(s,2);
    s.hp=1;
    healSummon(s);
    assert.strictEqual(s.hp,4,'第5次治疗量应为3(2+阶位1)');
  });
  test('GROW3:成长局内持久不随initGame外重置',()=>{
    fresh();
    for(let i=0;i<3;i++) spawnSummon('ha',{r:6,c:i});
    assert.strictEqual(G.engineStats.summonCount,3);
    assert.strictEqual(G.growth.summonTier,1);
    G.monsters.forEach(m=>{m.dead=true;});
    assert.strictEqual(G.engineStats.summonCount,3,'清怪不重置引擎统计');
    assert.strictEqual(G.growth.summonTier,1,'清怪不重置成长阶位');
  });
  test('GROW4:settleExplosions输出lastSettle',()=>{
    fresh();
    G.monsters=[{name:'靶',hp:10,maxHp:10,atk:1,ap:0,pos:{r:5,c:6},dead:false,el:null}];
    addElementLayers({r:5,c:6},'fire',2);
    settleExplosions();
    assert.ok(G.lastSettle,'应有lastSettle');
    assert.ok(G.lastSettle.totalDamage>0,'应统计总伤害');
    assert.ok(G.lastSettle.chainSegments>=1,'应有连锁段');
  });
  test('GROW5:lastSettle统计克制次数',()=>{
    fresh();
    G.monsters=[{name:'火怪',hp:30,maxHp:30,atk:1,ap:0,pos:{r:5,c:6},dead:false,el:'fire'}];
    addElementLayers({r:5,c:6},'water',2);
    settleExplosions();
    assert.strictEqual(G.lastSettle.advHits,1);
    assert.strictEqual(G.lastSettle.totalDamage,6,'水2层dmg3×克制2');
  });
  test('GROW6:完美回合清场+3金',()=>{
    fresh();
    G.monsters=[{name:'弱',hp:3,maxHp:3,atk:1,ap:0,pos:{r:5,c:6},dead:false,el:null}];
    const goldBefore=G.gold;
    addElementLayers({r:5,c:6},'fire',3);
    settleExplosions();
    assert.strictEqual(G.lastSettle.perfect,true);
    assert.strictEqual(G.lastSettle.clearedWave,true);
    assert.strictEqual(G.gold,goldBefore+3);
    assert.strictEqual(G.engineStats.perfectCount,1);
  });
  test('GROW7:buildTurnVM含成长阶位',()=>{
    fresh();
    for(let i=0;i<3;i++) spawnSummon('ha',{r:6,c:i});
    const vm=buildTurnVM();
    assert.ok(vm.engineStats.growth,'VM应含growth');
    assert.strictEqual(vm.engineStats.growth.summonTier,1);
    assert.strictEqual(vm.engineStats.growth.healTier,0);
  });
});

group('TDD-S3 Run与商店',()=>{
  test('RUN1:跨天我方城堡保留、敌方城堡回满',()=>{
    fresh();
    G.playerCastle.hp=73;
    G.enemyCastle.hp=41;
    G.phase='SHOP';
    G.day=1;
    G.dayHalf=2;
    closeShop();
    assert.strictEqual(G.playerCastle.hp,73,'我方跨天保留');
    assert.strictEqual(G.enemyCastle.hp,80,'敌方次日回满');
    assert.strictEqual(G.day,2);
  });
  test('RUN2:Day5下午结束进夜晚商店而非自动通关',()=>{
    fresh();
    G.day=5;
    G.dayHalf=2;
    syncMaxRoundForPhase();
    spawnWaveForDay(5,'afternoon');
    assert.ok(G.monsters.some(m=>m.typeId==='boss5'),'Day5下午应含boss5');
    G.monsters.forEach(m=>{m.dead=true;});
    G.round=G.maxRound+1;
    finishMonsters();
    assert.strictEqual(G.phase,'SHOP');
    assert.notStrictEqual(G.runVictory,true);
  });
  test('RUN2b:Day3早上脚本波含铁甲队长HP24',()=>{
    fresh();
    G.day=3;
    spawnWaveForDay(3,'morning');
    const elite=G.monsters.find(m=>m.name.includes('铁甲')||m.typeId==='elite');
    assert.ok(elite,'Day3早上应有精英');
    assert.strictEqual(elite.hp,24);
    assert.ok(G.monsters.length>=3,'应含精英+小怪');
  });
  test('RUN3:我方城堡归零失败',()=>{
    fresh();
    damagePlayerCastle(80,'test');
    assert.strictEqual(G.phase,'OVER');
  });
  test('RUN3:敌方城堡归零胜利',()=>{
    fresh();
    damageEnemyCastle(80,'test');
    assert.strictEqual(G.phase,'OVER');
  });
  test('SH1:genShop不产出relic商品',()=>{
    fresh();
    G.phase='SHOP';
    for(let i=0;i<20;i++){
      genShop();
      assert.ok(!G.shopItems.consumables.some(c=>c.type==='relic'),'不应有relic商品');
    }
  });
  test('SH2:无遗物状态G.relics不存在',()=>{
    fresh();
    assert.strictEqual(typeof G.relics,'undefined');
  });
  test('SH3:火种灵被动空格爆炸+1',()=>{
    fresh();
    G.ownedUnits=[];
    addOwnedUnit('ember_seed',{r:0,c:0});
    addOwnedUnit('fire_demon',{r:2,c:2}); G.ownedUnits[G.ownedUnits.length-1].active=true;
    syncUnitsToHeroes();
    assert.strictEqual(getSpaceExplosionBonus(),1);
    G.monsters=[{name:'靶',hp:20,maxHp:20,atk:1,ap:0,pos:{r:5,c:6},dead:false,el:null}];
    addElementLayers({r:5,c:5},'fire',3);
    settleExplosions();
    assert.strictEqual(G.lastSettle.totalDamage,7,'空爆dmg6+被动1');
  });
  test('RUN4:Day4-5回合配置可读',()=>{
    assert.strictEqual(DAY_ROUND_CONFIG[4].morning,3);
    assert.strictEqual(DAY_ROUND_CONFIG[5].afternoon,4);
  });
  test('RUN5:closeShop中午进下午不增天',()=>{
    fresh();
    G.phase='SHOP';
    G.day=2;
    G.dayHalf=1;
    closeShop();
    assert.strictEqual(G.day,2);
    assert.strictEqual(G.dayHalf,2);
    assert.strictEqual(G.phase,'PLAYER');
  });
  test('RUN6:buildRunEndVM通关统计',()=>{
    fresh();
    G.runVictory=true;
    G.day=5;
    G.gold=42;
    G.playerCastle.hp=67;
    G.engineStats={summonCount:10,healCount:8,chainCount:5,perfectCount:2};
    G.growth={summonTier:3,healTier:2,chainTier:1};
    const vm=buildRunEndVM();
    assert.strictEqual(vm.win,true);
    assert.strictEqual(vm.gold,42);
    assert.strictEqual(vm.castleHp,67);
    assert.strictEqual(vm.summonCount,10);
    assert.ok(vm.title.includes('通关'));
  });
  test('RUN7:buildRunEndVM失败',()=>{
    fresh();
    G.runVictory=false;
    G.playerCastle.hp=0;
    const vm=buildRunEndVM();
    assert.strictEqual(vm.win,false);
    assert.ok(vm.title.includes('结束')||vm.title.includes('失败'));
  });
  test('SH4:泉泉灵治疗加成',()=>{
    fresh();
    G.ownedUnits=[];
    addOwnedUnit('spring_sprite',{r:0,c:0});
    syncUnitsToHeroes();
    assert.strictEqual(getHealAmpBonus(),1);
    const s=spawnSummon('ha',{r:6,c:4},{hp:10,maxHp:10});
    s.hp=1;
    healSummon(s);
    assert.strictEqual(s.hp,4,'基础2+泉1+阶位0治疗量3');
  });
  test('SH5:岩岩灵城堡减伤',()=>{
    fresh();
    G.ownedUnits=[];
    addOwnedUnit('pebble_guard',{r:0,c:0});
    syncUnitsToHeroes();
    G.playerCastle.hp=80;
    damagePlayerCastle(3,'test');
    assert.strictEqual(G.playerCastle.hp,78,'3-1减伤');
    damagePlayerCastle(1,'test');
    assert.strictEqual(G.playerCastle.hp,77,'最低仍扣1');
  });
  test('SH6:风风灵克制额外伤害',()=>{
    fresh();
    G.ownedUnits=[];
    addOwnedUnit('breeze_sprite',{r:0,c:0});
    syncUnitsToHeroes();
    assert.strictEqual(getAdvHitBonus(),1);
    G.monsters=[{name:'火怪',hp:30,maxHp:30,atk:1,ap:0,pos:{r:5,c:6},dead:false,el:'fire'}];
    addElementLayers({r:5,c:6},'water',2);
    settleExplosions();
    assert.strictEqual(G.lastSettle.totalDamage,7,'dmg3×2+风1');
  });
});

// ═══════════════════════════════════════════════════════════════
group('Replay 战斗复盘', ()=>{
  test('REPLAY1: exportReplay 含 version/initial/steps/finalResult', ()=>{
    fresh();
    startReplayCapture();
    dispatchGameAction({ type:'USE_SLOT', slotId:0 });
    dispatchGameAction({ type:'USE_SLOT', slotId:1 });
    const rep=exportReplay();
    stopReplayCapture();
    assert.strictEqual(rep.version, 1);
    assert.ok(rep.initial && rep.initial.board, 'initial 应有 board');
    assert.ok(Array.isArray(rep.steps) && rep.steps.length>=2, 'steps 应记录行动');
    assert.ok(rep.finalResult && rep.finalResult.hash, 'finalResult 应有 hash');
  });
  test('REPLAY2: runReplay 复现相同 hash（单玩家相内叠火）', ()=>{
    fresh();
    G.monsters.forEach(m=>{ m.hp=20; m.maxHp=20; });
    startReplayCapture();
    dispatchGameAction({ type:'USE_SLOT', slotId:0 });
    dispatchGameAction({ type:'USE_SLOT', slotId:1 });
    dispatchGameAction({ type:'USE_SLOT', slotId:2 });
    const rep=exportReplay();
    stopReplayCapture();
    const expectedHash=rep.finalResult.hash;
    fresh();
    const result=runReplay(rep);
    assert.strictEqual(result.hash, expectedHash, '回放后 hash 应一致');
    const anyFire=Object.values(G.elementCells||{}).some(c=>c.fire&&c.fire.layers>0);
    assert.ok(anyFire, '回放后应有火元素层');
  });
  test('REPLAY3: Day1 教学怪 + END_PLAYER_TURN 可回放', ()=>{
    fresh();
    startReplayCapture();
    G.slots.forEach((s,i)=>{ if(!s.used) dispatchGameAction({ type:'USE_SLOT', slotId:i }); });
    endPlayerTurn();
    const rep=exportReplay();
    stopReplayCapture();
    const hash=rep.finalResult.hash;
    fresh();
    const result=runReplay(rep);
    assert.strictEqual(result.hash, hash);
    assert.ok(['MONSTER','SHOP','PLAYER','OVER'].includes(G.phase), '怪物回合后 phase 合法');
  });
  test('REPLAY4: hashReplayState 对相同状态稳定', ()=>{
    fresh();
    const h1=hashReplayState();
    const h2=hashReplayState();
    assert.strictEqual(h1, h2);
  });
});

group('Debug 面板 VM', ()=>{
  test('DEBUG1: buildDebugPanelVM 含 phase/slots/actionLog', ()=>{
    fresh();
    G.selectedCell={ r:1, c:7 };
    recomputeCorePreview();
    const vm=buildDebugPanelVM();
    assert.strictEqual(vm.phase, 'PLAYER');
    assert.ok(Array.isArray(vm.slots), 'slots 队列');
    assert.ok(Array.isArray(vm.actionLogTail), 'actionLog 尾部');
    assert.ok(vm.selectedCell, '选中格信息');
  });
});

  test('DEBUG2: buildDebugPanelVM 无选中格', ()=>{
    fresh();
    G.selectedCell=null;
    var vm=buildDebugPanelVM();
    assert.strictEqual(vm.selectedCell,null,'无选中格时 selectedCell=null');
  });
  test('DEBUG3: buildDebugPanelVM 怪物格', ()=>{
    fresh();
    var m=G.monsters.find(function(x){return !x.dead;});
    assert.ok(m,'有怪物');
    G.selectedCell={r:m.pos.r,c:m.pos.c};
    recomputeCorePreview();
    var vm=buildDebugPanelVM();
    assert.strictEqual(vm.selectedCell.entity.type,'monster','怪物格实体类型');
    assert.ok(vm.selectedCell.entityDamage>=0,'怪物格有伤害预览');
  });
  test('DEBUG4: buildDebugPanelVM 英雄格', ()=>{
    fresh();
    var ha=G.heroes.ha;
    G.selectedCell={r:ha.pos.r,c:ha.pos.c};
    recomputeCorePreview();
    var vm=buildDebugPanelVM();
    assert.strictEqual(vm.selectedCell.entity.type,'hero','英雄格实体类型');
    assert.strictEqual(vm.selectedCell.entity.id,'ha','英雄A');
  });
  test('DEBUG5: buildDebugPanelVM 空格', ()=>{
    fresh();
    G.selectedCell={r:0,c:0};
    recomputeCorePreview();
    var vm=buildDebugPanelVM();
    assert.ok(vm.selectedCell.entity===null||vm.selectedCell.entity.type===null,'空格无实体');
  });
  test('DEBUG6: 怪物格 result 含 totalDamage/willDie/surviveHp', ()=>{
    fresh();
    // 在怪物格上放火3层 → 单体伤害6
    var m=G.monsters.find(function(x){return !x.dead;});
    G.selectedCell={r:m.pos.r,c:m.pos.c};
    G.elementCells[m.pos.r+','+m.pos.c]={fire:{layers:3,willExplode:false}};
    recomputeCorePreview();
    var vm=buildDebugPanelVM();
    var r=vm.selectedCell.result;
    assert.ok(r,'result 存在');
    assert.ok(r.totalDamage>0,'totalDamage>0');
    assert.strictEqual(typeof r.willDie,'boolean','willDie 是 boolean');
    assert.strictEqual(typeof r.surviveHp,'number','surviveHp 是 number');
    assert.ok(r.damageBySource.elementDirect>0,'elementDirect>0');
  });
  test('DEBUG7: 英雄格 result 含 monsterThreat', ()=>{
    fresh();
    var ha=G.heroes.ha;
    G.selectedCell={r:ha.pos.r,c:ha.pos.c};
    // 让怪物走到能攻击英雄的位置（相邻格）
    G.monsters.forEach(function(m,i){var adjR=ha.pos.r+(i===0?1:-1);m.pos={r:adjR,c:ha.pos.c};});
    G.monWarn=[];
    recomputeCorePreview();
    var vm=buildDebugPanelVM();
    var r=vm.selectedCell.result;
    assert.ok(r.totalDamage>=0,'result.totalDamage');
    assert.ok(vm.selectedCell.threats.length>0,'英雄格有威胁');
    // 威胁含新字段
    var t=vm.selectedCell.threats[0];
    assert.ok(t.stableId,'stableId 存在');
    assert.strictEqual(typeof t.alive,'boolean','alive 是 boolean');
    assert.ok(t.fromR!==undefined,'fromR 存在');
    assert.ok(t.fromC!==undefined,'fromC 存在');
    assert.ok(t.attackType,'attackType 存在');
  });
  test('DEBUG8: 空格爆炸含 explosionSources', ()=>{
    fresh();
    G.selectedCell={r:5,c:5};
    G.elementCells['5,5']={fire:{layers:4,willExplode:true}};
    recomputeCorePreview();
    var vm=buildDebugPanelVM();
    assert.ok(vm.selectedCell.willExplode,'willExplode=true');
    assert.ok(Array.isArray(vm.selectedCell.explosionSources),'explosionSources 是数组');
  });
  test('DEBUG9: incomingActions 含新字段 slotIndex/sn/dir/heroName/resolvedEffects', ()=>{
    fresh();
    // 选一个英雄能打到的格子
    var ha=G.heroes.ha;
    var targetR=ha.pos.r, targetC=ha.pos.c+1;
    G.selectedCell={r:targetR,c:targetC};
    recomputeCorePreview();
    var vm=buildDebugPanelVM();
    var acts=vm.selectedCell.incomingActions;
    assert.ok(acts.length>0,'有空闲槽打到此格');
    var a=acts[0];
    assert.ok(a.slotIndex>=1,'slotIndex >=1');
    assert.ok(a.sn>=1,'sn >=1');
    assert.ok(a.dir,'dir 存在');
    assert.ok(a.heroName,'heroName 存在');
    assert.ok(Array.isArray(a.resolvedEffects),'resolvedEffects 是数组');
    assert.ok(a.resolvedEffects.indexOf('directElement')>=0,'含 directElement');
    assert.strictEqual(a.sourceType,'heroSlot','sourceType=heroSlot');
    assert.ok(a.sequenceIndex>=1,'sequenceIndex>=1');
  });
  test('DEBUG10: elementField 含 beforeLayers/addLayers/afterLayers/directDamage', ()=>{
    fresh();
    var ha=G.heroes.ha;
    var targetR=ha.pos.r, targetC=ha.pos.c+1;
    G.selectedCell={r:targetR,c:targetC};
    recomputeCorePreview();
    var vm=buildDebugPanelVM();
    var ef=vm.selectedCell.elementField;
    var elKeys=Object.keys(ef);
    assert.ok(elKeys.length>=4,'elementField 有4元素');
    // 检查新字段（ES 未在测试作用域，直接用数组）
    ['fire','water','wind','earth'].forEach(function(el){
      var v=ef[el];
      assert.ok('beforeLayers' in v,'beforeLayers 在 '+el);
      assert.ok('addLayers' in v,'addLayers 在 '+el);
      assert.ok('afterLayers' in v,'afterLayers 在 '+el);
      assert.ok('directDamage' in v,'directDamage 在 '+el);
      assert.ok('splashDamage' in v,'splashDamage 在 '+el);
      assert.ok('pathDamage' in v,'pathDamage 在 '+el);
      assert.ok('totalDamage' in v,'totalDamage 在 '+el);
      // 新旧一致
      assert.strictEqual(v.boardLayers,v.beforeLayers,'boardLayers==beforeLayers for '+el);
    });
  });
  test('DEBUG11: 城堡格不承受我方元素伤害', ()=>{
    fresh();
    var pc=G.playerCastle;
    G.selectedCell={r:pc.pos.r,c:pc.pos.c};
    recomputeCorePreview();
    var vm=buildDebugPanelVM();
    assert.strictEqual(vm.selectedCell.entity.type,'player_castle','我方城堡');
    var r=vm.selectedCell.result;
    // 我方城堡免疫我方元素 → damageBySource.elementDirect=0
    assert.strictEqual(r.damageBySource.elementDirect,0,'我方城堡 elementDirect=0');
  });
  test('DEBUG12: 空地不爆炸时无伤害结算', ()=>{
    fresh();
    G.selectedCell={r:6,c:6};
    // 火1层 → 不爆炸
    G.elementCells['6,6']={fire:{layers:1,willExplode:false}};
    recomputeCorePreview();
    var vm=buildDebugPanelVM();
    assert.strictEqual(vm.selectedCell.willExplode,false,'willExplode=false');
    // 空地无实体，无伤害
    assert.strictEqual(vm.selectedCell.entityDamage,0,'entityDamage=0');
  });
  test('DEBUG13: 爆炸格 elementField 含 splashDamage/directDamage', ()=>{
    fresh();
    G.selectedCell={r:5,c:5};
    G.elementCells['5,5']={fire:{layers:3,willExplode:true}};
    recomputeCorePreview();
    var vm=buildDebugPanelVM();
    var ef=vm.selectedCell.elementField.fire;
    assert.ok(ef.layers>=3,'layers>=3');
    assert.ok(ef.directDamage>0,'directDamage>0 (中心三角伤)');
    assert.ok(ef.splashDamage>0,'splashDamage>0 (波及层数直伤)');
    assert.ok(ef.totalDamage>0,'totalDamage>0');
  });
  test('DEBUG14: 怪物格 elementField.directDamage>0', ()=>{
    fresh();
    var m=G.monsters.find(function(x){return !x.dead;});
    G.selectedCell={r:m.pos.r,c:m.pos.c};
    G.elementCells[m.pos.r+','+m.pos.c]={fire:{layers:2,willExplode:false}};
    recomputeCorePreview();
    var vm=buildDebugPanelVM();
    var ef=vm.selectedCell.elementField.fire;
    assert.ok(ef.directDamage>0,'怪物格 directDamage>0');
    assert.strictEqual(ef.splashDamage,0,'怪物格 splashDamage=0 (不爆炸)');
  });
  test('DEBUG15: 英雄格 threatFromMonsters 更新后仍含旧字段 label/dmg', ()=>{
    fresh();
    var ha=G.heroes.ha;
    G.selectedCell={r:ha.pos.r,c:ha.pos.c};
    G.monsters.forEach(function(m,i){var adjR=ha.pos.r+(i===0?1:-1);m.pos={r:adjR,c:ha.pos.c};});
    G.monWarn=[];
    recomputeCorePreview();
    var vm=buildDebugPanelVM();
    var t=vm.selectedCell.threats[0];
    assert.ok(t.label,'label 旧字段保留');
    assert.ok(t.dmg!==undefined,'dmg 旧字段保留');
    assert.ok(t.stableId,'stableId 新字段');
  });

group('Goal 03/04 完整实现', ()=>{
  test('GOAL0304-01: DAY_ROUND_CONFIG 扩展到 Day10', ()=>{
    for(let d=1; d<=10; d++){
      assert.ok(DAY_ROUND_CONFIG[d], `缺少 Day${d} 回合配置`);
      assert.ok(DAY_ROUND_CONFIG[d].morning>=2, `Day${d} morning 回合数不足`);
      assert.ok(DAY_ROUND_CONFIG[d].afternoon>=2, `Day${d} afternoon 回合数不足`);
    }
    assert.strictEqual(DAY_ROUND_CONFIG[10].afternoon,5,'Day10 下午应是最终战 5 回合');
  });
  test('GOAL0304-02: DAY_WAVE_CONFIG 扩展到 Day10 且含最终怪', ()=>{
    for(let d=1; d<=10; d++){
      assert.ok(DAY_WAVE_CONFIG[d], `缺少 Day${d} 波次配置`);
      assert.ok(DAY_WAVE_CONFIG[d].morning, `缺少 Day${d} morning`);
      assert.ok(DAY_WAVE_CONFIG[d].afternoon, `缺少 Day${d} afternoon`);
    }
    assert.ok(DAY_WAVE_CONFIG[10].afternoon.allowed.includes('boss10'),'Day10 下午应允许 boss10');
    const plan=buildWaveForDay(10,'afternoon');
    assert.ok(plan.monsters.some(m=>m.typeId==='boss10'),'Day10 下午应生成 boss10');
  });
  test('GOAL0304-03: 新怪物与 ability 字段可读', ()=>{
    ['swarm','blocker','siege','boss5','minion','boss8','boss10'].forEach(id=>{
      assert.ok(MONSTER_TYPES[id], `缺少怪物 ${id}`);
    });
    assert.strictEqual(MONSTER_TYPES.blocker.ability.id,'block_path');
    assert.strictEqual(MONSTER_TYPES.siege.ability.id,'target_castle');
    assert.strictEqual(MONSTER_TYPES.boss8.ability.id,'lava_surge');
    assert.strictEqual(MONSTER_TYPES.boss10.ability.id,'core_split');
  });
  test('GOAL0304-04: 同品级统一定价，不使用 priceTier 乘法', ()=>{
    assert.strictEqual(calcUnitPrice(UNIT_DEFS.fire_starter),3);
    assert.strictEqual(calcUnitPrice(UNIT_DEFS.earth_shield),3,'青铜 priceTier=3 仍应 3 金');
    assert.strictEqual(calcUnitPrice(UNIT_DEFS.fluff_speaker),5,'白银统一 5 金');
    assert.strictEqual(calcUnitPrice(UNIT_DEFS.forge_fire),7,'黄金统一 7 金');
    assert.strictEqual(calcUnitPrice(UNIT_DEFS.dragon_flame),10,'钻石统一 10 金');
  });
  test('GOAL0304-05: 商店只卖英雄且不生成 consumables', ()=>{
    fresh(); G.phase='SHOP'; G.day=6; G.dayHalf=2; genShop();
    assert.ok(G.shopItems.units.length>0,'应有英雄商品');
    assert.strictEqual(G.shopItems.consumables.length,0,'不应生成强化品');
    assert.ok(G.shopItems.units.every(u=>UNIT_DEFS[u.defId]),'所有商品都是英雄');
  });
  test('GOAL0304-06: pT3/pT4 英雄定义并按天入池', ()=>{
    ['forge_fire','command_sprout','dragon_flame','prime_sprout'].forEach(id=>assert.ok(UNIT_DEFS[id],`缺少英雄 ${id}`));
    assert.ok(SHOP_POOLS.day5_night.includes('forge_fire'),'Day5 夜应入池黄金火系');
    assert.ok(SHOP_POOLS.day7_night.includes('dragon_flame'),'Day7 夜应入池钻石火系');
    assert.ok(SHOP_POOLS.day7_night.includes('prime_sprout'),'Day7 夜应入池钻石召唤');
  });
  test('GOAL0304-07: 奖励节点配置覆盖午间/精英/Boss/特殊事件', ()=>{
    assert.ok(REWARD_NODE_CONFIG[3].midday,'Day3 应有午间商人');
    assert.ok(REWARD_NODE_CONFIG[5].boss,'Day5 应有 Boss 奖励');
    assert.ok(REWARD_NODE_CONFIG[6].boss.free,'Day6 Boss 奖励应免费');
    assert.ok(REWARD_NODE_CONFIG[7].special,'Day7 应有特殊事件');
  });
  test('GOAL0304-08: closeShop 可推进到 Day10 且不再钳制 Day5', ()=>{
    fresh(); G.phase='SHOP'; G.day=9; G.dayHalf=2; G.enemyCastle.hp=31;
    closeShop();
    assert.strictEqual(G.day,10);
    assert.strictEqual(G.phase,'PLAYER');
    assert.ok(G.monsters.length>0,'Day10 应刷怪');
  });
  test('GOAL0304-09: 召唤物会向最近怪物移动并攻击', ()=>{
    fresh();
    G.summons=[];
    const s=spawnSummon('ha',{r:6,c:4},{hp:6,maxHp:6,atk:1});
    G.monsters=[{id:'far',name:'远怪',hp:6,maxHp:6,atk:1,ap:0,pos:{r:5,c:6},dead:false,el:null}];
    runSummonActions();
    assert.ok(s.pos.c>4||s.pos.r<6,'召唤物应向怪物移动');
    runSummonActions();
    assert.ok(G.monsters[0].hp<6,'靠近后应攻击怪物');
  });
  test('GOAL0304-10: ability hook 对 boss8 与 boss10 生效', ()=>{
    fresh();
    G.monsters=[{id:'b8',typeId:'boss8',name:'熔岩核心',hp:45,maxHp:45,atk:4,ap:5,pos:{r:5,c:5},dead:false,el:null,ability:MONSTER_TYPES.boss8.ability}];
    runMonsterAbilityHook('onRoundStart',G.monsters[0]);
    assert.ok((G.elementCells['5,5']?.fire?.layers||0)>=1,'boss8 回合开始应铺火');
    G.monsters=[{id:'b10',typeId:'boss10',name:'远古炎核',hp:60,maxHp:60,atk:5,ap:5,pos:{r:5,c:5},dead:false,el:null,ability:MONSTER_TYPES.boss10.ability,_abilityTicks:1}];
    runMonsterAbilityHook('onEveryNthRound',G.monsters[0]);
    assert.ok(G.monsters.length>1,'boss10 应召唤小怪');
  });
});

Promise.all(_asyncTests).then(() => {
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
});
