/**
 * 元素背包史 · 文字战斗模拟器
 * 运行：node sim.js [天数]   默认跑2天
 */
const fs   = require('fs');
const path = require('path');

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
  addEventListener(){},
};
global.window = { innerWidth:1920 };
global.setTimeout = fn => { try{ fn(); }catch(e){} };

const htmlPath = path.join(__dirname, 'index.html');
const html = fs.readFileSync(htmlPath,'utf8');
const scriptTag = html.match(/<script>([\s\S]+?)<\/script>/);
if(!scriptTag) throw new Error('找不到 <script> 标签');
global.__TEST__ = true;
eval(scriptTag[1].replace(/\bconst\b/g,'var').replace(/\blet\b/g,'var'));

const out = (...a) => process.stdout.write(a.join(' ')+'\n');
render = ()=>{};
renderShop = ()=>{};
glog = msg => {
  const tag = G ? `[D${G.day}.${G.dayHalf?'下':'上'} R${G.round}/${G.maxRound}]` : '[INIT]';
  out(`  ${tag} ${msg}`);
};
showMsg = t => { out('📢', t); };

// 劫持 dispatch 输出英雄动作细节
const _realDispatch = dispatchGameAction;
dispatchGameAction = function(action) {
  if (action.type === 'MOVE_HERO') {
    const hero = G.heroes[action.heroId];
    if (hero) out(`    🚶 ${hero.name} → (${action.to.r},${action.to.c})`);
  }
  if (action.type === 'USE_SLOT') {
    const s = G.slots[action.slotId];
    const hero = G.heroes[s?.hid];
    if (hero && s) {
      const cells = atkCells(hero.pos, s.sn, s.dir);
      out(`    ⚡ ${hero.name} 使用 ${EL[s.el]}槽#${action.slotId+1} → ${cells.length}格`);
    }
  }
  _realDispatch(action);
};

const maxDays = parseInt(process.argv[2]) || 2;

out('╔══════════════════════════════════╗');
out('║  元素背包史 · 文字战斗模拟器    ║');
out('╚══════════════════════════════════╝');
out('');

initGame();
out('');

let turn = 0;
while (G.day <= maxDays && G.phase !== 'OVER') {
  turn++;
  if (G.phase === 'PLAYER') {
    out(`\n━━━ 第 ${turn} 回合 · D${G.day}${G.dayHalf?'下午':'早上'} R${G.round}/${G.maxRound} ━━━`);
    const heroes = Object.values(G.heroes).filter(h=>h.hp>0);
    heroes.forEach(h => out(`  🦸 ${h.name} HP=${h.hp}/${h.maxHp} (${h.pos.r},${h.pos.c}) ${h._acted?'🔒':''}`));
    const alive = G.monsters.filter(m=>!m.dead);
    out(`  👾 ${alive.length}只存活:`);
    alive.forEach(m => out(`     ${m.name} HP=${m.hp}/${m.maxHp} (${m.pos.r},${m.pos.c})`));
    execAllHeroSlots();
    if (G.phase === 'PLAYER') endPlayerTurn();
  }
  if (G.phase === 'SHOP') {
    out(`\n🏪 Day${G.day} 夜晚 · 金币: ${G.gold}`);
    closeShop();
  }
  if (G.phase === 'OVER') { out(`\n💀 游戏结束！`); break; }
}

out('');
out('════════════════════════════════════');
out(`模拟结束：Day ${G.day} · Phase ${G.phase} · 共 ${turn} 回合`);
const aliveHeroes = Object.values(G.heroes).filter(h=>h.hp>0);
out(`存活英雄: ${aliveHeroes.map(h=>`${h.name} HP=${h.hp}`).join(', ') || '无'}`);
