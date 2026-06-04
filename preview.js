/**
 * 元素背包史 · 预览计算层
 * 管：预览伤害、格子信息、怪物威胁、战斗日志（纯计算，无 DOM）
 * 不管：DOM 渲染、事件绑定、调试面板
 * 依赖：board.js / elements.js / battle.js / terrain.js / damage.js
 * 加载顺序：preview.js → ui.js（buildBoardVM 从此层读取 4 层数据）
 */

// ========== 四层棋盘数据（只读 G，供 buildBoardVM 合成 cellVM）==========

/**
 * unitLayer：英雄、怪物、召唤物占位
 * 返回 {r,c → {hero, mon, summon, castle}} 对象
 */
function buildUnitLayer(){
  const hp={},mp={},sp={};
  Object.values(G.heroes).forEach(function(h){ hp[k(h.pos)]=h; });
  G.monsters.forEach(function(m){ if(!m.dead) mp[k(m.pos)]=m; });
  (G.summons||[]).filter(function(s){ return !s.dead; }).forEach(function(s){ sp[k(s.pos)]=s; });
  var layer={};
  for(var r=0;r<8;r++)for(var c=0;c<8;c++){
    var key=r+','+c;
    layer[key]={hero:hp[key]||null,mon:mp[key]||null,summon:sp[key]||null,
      castle:playerCastleAt({r:r,c:c})?{side:'player',hp:G.playerCastle.hp,maxHp:G.playerCastle.maxHp}:enemyCastleAt({r:r,c:c})?{side:'enemy',hp:G.enemyCastle.hp,maxHp:G.enemyCastle.maxHp}:null};
  }
  return layer;
}

/**
 * terrainLayer：陷阱、地形场景（读取 G.terrainCells，不参与规则结算）
 * 返回 {r,c → {fire, water, wind, earth}} 层数对象
 */
function buildTerrainLayer(){
  var layer={};
  for(var r=0;r<8;r++)for(var c=0;c<8;c++){
    var t=getTerrain({r,c});
    layer[r+','+c]=t;
  }
  return layer;
}

/**
 * elementLayer：元素层数、引爆状态（读取 G.elementCells + G.board）
 * 返回 {r,c → {el, stk, explDmg, cells:{el:{layers,willExplode}}}}
 */
function buildElementLayer(){
  var layer={};
  for(var r=0;r<8;r++)for(var c=0;c<8;c++){
    var key=r+','+c, bc=G.board[r][c];
    var elData=null;
    if(bc.el&&bc.stk>0) elData={el:bc.el,stk:bc.stk,bg:EB[bc.el],color:EC[bc.el],explDmg:explDmg(bc.stk)};
    var cellsEl=(G.elementCells||{})[key]||{};
    layer[key]={boardEl:elData,cells:cellsEl};
  }
  return layer;
}

/**
 * infoLayer：预览、伤害、日志、调试信息（只读 G.coreSnapshot，不计算规则）
 * 返回 {r,c → {previewDamage, willDie, brief, classes, pvEl, ...}}
 */
function buildInfoLayer(){
  var pgGrid=G.coreSnapshot?.previewGrid?.grid||{};
  var mt=G.coreSnapshot?.monsterThreats||{monActMap:{},heroIncomingDmg:{},summonIncomingDmg:{},monFinalSet:new Set(),monCardMap:{}};
  var{monActMap,heroIncomingDmg,summonIncomingDmg,monFinalSet,monCardMap}=mt;
  var ps=new Set(G.prevCells.map(function(p){return k(p);}));
  var es=new Set();if(G.explPos)explCells(G.explPos).forEach(function(p){es.add(k(p));});
  var cellBriefs=(G.coreSnapshot?._cellBriefs||{});
  var layer={};
  for(var r=0;r<8;r++)for(var c=0;c<8;c++){
    var key=r+','+c, pgCell=pgGrid[key]||null;
    var classes=[];
    if(ps.has(key))classes.push('ap');
    if(es.has(key))classes.push('ep');
    if(G.explPos&&G.explPos.r===r&&G.explPos.c===c)classes.push('ec');
    var actData=monActMap[key];
    if(actData){
      if(actData.type==='atk')classes.push('mw-atk');
      else if(monFinalSet.has(key))classes.push('mw-final');
      else classes.push('mw-mov');
    }
    var pvEl=null, pvOpacity=null, monDmg=null, pvElLayers=null, pvWillExplode=false;
    if(pgCell){
      var actions=pgCell.preview.incomingActions;
      if(actions.length>0){pvEl=actions[0].element;pvOpacity=pgCell.preview.fromSelHero?'0.42':'0.20';}
      ['fire','water','wind','earth'].forEach(function(el){
        var ef=pgCell.elementField[el];
        if(ef.addedLayers>0){
          if(!pvElLayers)pvElLayers={};
          var isMonCell=pgCell.entity.type==='monster';
          pvElLayers[el]={add:ef.addedLayers,cur:ef.boardLayers,next:ef.layers,willExplode:!isMonCell&&ef.layers>=G.explosionThreshold,dmg:ef.damage};
        }
      });
      pvWillExplode=pgCell.preview.willExplode;
      if(pgCell.preview.entityDamage>0)monDmg=pgCell.preview.entityDamage;
    }
    layer[key]={classes,pvEl,pvOpacity,monDmg,pvElLayers,pvWillExplode,
      monStep:actData?.type==='mov'?actData.step:null,
      brief:cellBriefs[key]?.brief||'',
      monsterThreat:{heroIncoming:heroIncomingDmg,summonIncoming:summonIncomingDmg,card:monCardMap[key]||null},
      pgCell:pgCell,
    };
  }
  return layer;
}

// ========== 预览计算层（只读 G，不创建 DOM）==========

function computeHeroAttackPreview(){
  const heroAtkMap={};
  if(G.phase==='OVER')return heroAtkMap;
  // 判断"当前选中英雄"：selHero 或 selSlot 所属英雄
  const selHid=G.selHero||(G.selSlot!==null?G.slots[G.selSlot]?.hid:null);
  Object.values(G.heroes).forEach(hero=>{
    if(hero.hp<=0)return;
    const isSel=!!selHid&&hero.id===selHid;
    G.slots.filter(s=>s.hid===hero.id&&!s.used).forEach(slot=>{
      atkCells(hero.pos,slot.sn,slot.dir).forEach(ap=>{
        const key=k(ap);
        if(!heroAtkMap[key])heroAtkMap[key]={el:slot.el,monDmg:0,addLayers:{},fromSelHero:false};
        heroAtkMap[key].el=slot.el;
        if(isSel)heroAtkMap[key].fromSelHero=true;
        // 累计每格每元素的命中次数
        const adds=heroAtkMap[key].addLayers;
        adds[slot.el]=(adds[slot.el]||0)+1;
        {const pvBc=G.board[ap.r][ap.c];if(pvBc.el&&pvBc.stk>0&&ADV[slot.el]===pvBc.el){const expDmg=explDmg(pvBc.stk),oldEl=pvBc.el;explCells(ap).forEach(ep=>{const ek=k(ep);if(!heroAtkMap[ek])heroAtkMap[ek]={el:oldEl,monDmg:0,addLayers:{},fromSelHero:false};const em=monAt(ep);if(em){const emult2=(em.el&&ADV[oldEl]===em.el)?2:1;heroAtkMap[ek].monDmg+=expDmg*emult2;}});}}      });
    });
  });
  // 后处理：计算 elLabel 与 willExplode
  Object.entries(heroAtkMap).forEach(([key,v])=>{
    const [r,c]=key.split(',').map(Number);
    const bc=G.board[r][c];
    const adds=v.addLayers;
    const elKeys=Object.keys(adds);
    v.elLabel=null; v.willExplode=false;
    if(elKeys.length>0){
      // 取命中次数最多的元素作为主显示
      const domEl=elKeys.reduce((a,b)=>adds[a]>=adds[b]?a:b);
      const n=adds[domEl];
      v.elLabel=`${EL[domEl]}+${n}`;
      const curStk=(bc.el===domEl)?bc.stk:0;
      const total=Math.min(curStk+n,MAX_STK);
      if(total>=G.explosionThreshold){
        v.willExplode=true;
        const pos2={r,c};
        const monAtPos2=monAt(pos2);
        if(monAtPos2){
          // 怪物格预览：单体伤害写到怪物自身格
          const emult=(monAtPos2.el&&ADV[domEl]===monAtPos2.el)?2:1;
          const ek=k(pos2);
          if(!heroAtkMap[ek])heroAtkMap[ek]={el:domEl,monDmg:0,addLayers:{},fromSelHero:false};
          heroAtkMap[ek].monDmg+=explDmg(total)*emult;
        } else {
          // 空格预览：十字引爆，写到范围内怪物格
          explCells(pos2).forEach(tp=>{const m=monAt(tp);if(m){const emult=(m.el&&ADV[domEl]===m.el)?2:1;const ek=k(tp);if(!heroAtkMap[ek])heroAtkMap[ek]={el:domEl,monDmg:0,addLayers:{},fromSelHero:false};heroAtkMap[ek].monDmg+=explDmg(total)*emult;}});
        }
      }
    }
  });
  return heroAtkMap;
}

function buildMonsterStats(){
  const stats={};
  G.monsters.filter(m=>!m.dead).forEach(m=>{
    const mk=k(m.pos);
    const cellEl=G.elementCells[mk]||{};
    const selfCellDmg={fire:0,water:0,wind:0,earth:0,total:0};
    const splashDmg={fire:0,water:0,wind:0,earth:0,total:0,sources:[]};
    // 1. 怪物格单体元素伤害：有层即计算，不需要达到引爆阈值
    ['fire','water','wind','earth'].forEach(el=>{
      const slot=cellEl[el];
      if(!slot||slot.layers===0)return;
      const r=calcElementDamage(slot.layers,m.el,el,{advHitBonus:getAdvHitBonus()});
      selfCellDmg[el]+=r.damage; selfCellDmg.total+=r.damage;
    });
    // 2. 来自空格爆炸的波及伤害（空格需达到 willExplode）
    // 注意：爆炸范围受 hasCrossExplosion() 影响，无此被动时只炸自身格
    var _xActive = hasCrossExplosion();
    function _explRangeCells(p) { return _xActive ? explCells(p) : [p]; }
    Object.entries(G.elementCells).forEach(([srcKey,srcElData])=>{
      if(srcKey===mk)return;
      const [sr,sc]=srcKey.split(',').map(Number);
      if(monAt({r:sr,c:sc}))return; // 怪物格不触发十字
      ['fire','water','wind','earth'].forEach(el=>{
        const slot=srcElData[el];
        if(!slot||!slot.willExplode)return;
        const inRange=_explRangeCells({r:sr,c:sc}).some(p=>p.r===m.pos.r&&p.c===m.pos.c);
        if(!inRange)return;
        const r=calcElementDamage(slot.layers,m.el,el,{spaceBonus:getSpaceExplosionBonus(),advHitBonus:getAdvHitBonus()});
        splashDmg[el]+=r.damage; splashDmg.total+=r.damage;
        splashDmg.sources.push({srcKey,el,dmg:r.damage});
      });
    });
    const totalDmg=selfCellDmg.total+splashDmg.total;
    const hpAfter=Math.max(0,m.hp-totalDmg);
    stats[mk]={
      monsterId:m.id,monsterName:m.name,position:m.pos,
      hp:{current:m.hp,max:m.maxHp,previewDamage:totalDmg,previewHp:hpAfter,willDie:totalDmg>=m.hp&&m.hp>0},
      cellElementField:{fire:cellEl.fire?.layers||0,water:cellEl.water?.layers||0,wind:cellEl.wind?.layers||0,earth:cellEl.earth?.layers||0},
      selfCellDamage:selfCellDmg,
      splashDamage:splashDmg,
      finalPreview:{totalDamage:totalDmg,hpAfter,willDie:totalDmg>=m.hp&&m.hp>0},
    };
  });
  return stats;
}

function buildCellInfoMap(){
  const monStats=buildMonsterStats();
  const{heroIncomingDmg}=computeMonsterActionPreview();
  // 1. 各格来源：未用行动槽作用到的格子
  const inEffMap={};
  const heroSlotCnt={};
  G.slots.forEach(slot=>{
    if(slot.used)return;
    const hero=G.heroes[slot.hid]; if(!hero||hero.hp<=0)return;
    heroSlotCnt[slot.hid]=(heroSlotCnt[slot.hid]||0)+1;
    const sLabel=(slot.hid==='ha'?'A':'B')+'-'+heroSlotCnt[slot.hid];
    atkCells(hero.pos,slot.sn,slot.dir).forEach(ap=>{
      const ky=k(ap);
      if(!inEffMap[ky])inEffMap[ky]=[];
      inEffMap[ky].push({source:sLabel,type:'element_add',element:slot.el,amount:1,description:`${sLabel}：${EL[slot.el]} +1`});
    });
  });
  // 2. 怪物威胁：哪些英雄格被怪物攻击
  const monThreatMap={};
  Object.entries(heroIncomingDmg).forEach(([heroId,dmgArr])=>{
    const hero=G.heroes[heroId]; if(!hero)return;
    const ky=k(hero.pos);
    if(!monThreatMap[ky])monThreatMap[ky]={hitCount:0,totalDamage:0,sources:[]};
    dmgArr.forEach(d=>{monThreatMap[ky].hitCount++;monThreatMap[ky].totalDamage+=d.dmg;monThreatMap[ky].sources.push({label:d.label,dmg:d.dmg});});
  });
  // 3. 遍历全棋盘构建 cellInfoMap
  const map={};
  for(let r=0;r<8;r++)for(let c=0;c<8;c++){
    const ky=`${r},${c}`;
    const bc=G.board[r][c];
    const mon=G.monsters.find(m=>!m.dead&&m.pos.r===r&&m.pos.c===c);
    const hero=Object.values(G.heroes).find(h=>h.pos.r===r&&h.pos.c===c);
    // 实体
    const entities=[];
    if(mon)entities.push({type:'monster',id:mon.id,name:mon.name,hp:mon.hp,maxHp:mon.maxHp,atk:mon.atk,el:mon.el});
    if(hero)entities.push({type:'hero',id:hero.id,name:hero.name,hp:hero.hp,maxHp:hero.maxHp});
    // 元素场（elementCells 优先，兼容 board.el）
    const cellEl=G.elementCells[ky]||{};
    const elementField={fire:cellEl.fire?.layers||0,water:cellEl.water?.layers||0,wind:cellEl.wind?.layers||0,earth:cellEl.earth?.layers||0};
    if(bc.el&&bc.stk>0&&elementField[bc.el]===0)elementField[bc.el]=bc.stk;
    // 来源（未用槽）
    const incomingEffects=inEffMap[ky]||[];
    // 单体伤害预览（读 monStats，不重算）
    const mStat=monStats[ky];
    const selfCellDamagePreview=mStat
      ?{total:mStat.selfCellDamage.total,byElement:{fire:mStat.selfCellDamage.fire,water:mStat.selfCellDamage.water,wind:mStat.selfCellDamage.wind,earth:mStat.selfCellDamage.earth}}
      :{total:0,byElement:{fire:0,water:0,wind:0,earth:0}};
    // 空格爆炸预览（只在无怪物的格子上）
    let explosionPreview={willExplode:false,element:null,damage:0,shape:null,affectedCells:[]};
    if(!mon){
      ['fire','water','wind','earth'].forEach(el=>{
        if(explosionPreview.willExplode)return;
        const slot=cellEl[el];
        if(slot&&slot.willExplode){const hasX=hasCrossExplosion();explosionPreview={willExplode:true,element:el,damage:explDmg(slot.layers),shape:hasX?'cross':'single',affectedCells:hasX?explCells({r,c}).map(p=>[p.r,p.c]):[[r,c]]};}
      });
    }
    // 波及伤害（读 monStats.splashDamage）
    const splashIncomingPreview=mStat?{total:mStat.splashDamage.total,sources:mStat.splashDamage.sources}:{total:0,sources:[]};
    // 怪物威胁（英雄格）
    const monsterThreatPreview=monThreatMap[ky]||{hitCount:0,totalDamage:0,sources:[]};
    // 摘要徽章
    const ELICON={fire:'🔥',water:'💧',wind:'🌬',earth:'🪨'};
    const summaryBadges=[];
    Object.entries(elementField).forEach(([el,layers])=>{if(layers>0)summaryBadges.push(`${ELICON[el]}${layers}`);});
    if(mon&&mStat){const td=mStat.finalPreview.totalDamage;if(td>0){summaryBadges.push(`-${td}`);if(mStat.finalPreview.willDie)summaryBadges.push('☠');}}
    if(explosionPreview.willExplode)summaryBadges.push('💥');
    if(monsterThreatPreview.hitCount>0)summaryBadges.push(`⚠×${monsterThreatPreview.hitCount}`);
    map[ky]={position:[r,c],entities,elementField,incomingEffects,selfCellDamagePreview,explosionPreview,splashIncomingPreview,monsterThreatPreview,summaryBadges};
  }
  return map;
}

function buildTerrainInfo(pos) {
  var traps = getTerrain(pos);
  if (!traps) return [];
  var result = [];
  ELEMS.forEach(function(el) {
    var layers = traps[el] || 0;
    if (layers <= 0) return;
    var cfg = (typeof getTrapConfig === "function" ? getTrapConfig() : {})[el] || {};
    var dmg = explDmg(layers);
    result.push({
      element: el,
      layers: layers,
      damage: dmg,
      apDelta: cfg.apDelta || 0,
      label: cfg.name + layers,
      desc: cfg.name + layers + '：怪物踩入 -' + dmg + ' HP' + (cfg.apDelta ? '，AP ' + cfg.apDelta : ''),
    });
  });
  return result;
}

function buildCellInfo(state, pos) {
  if (!state) state = G;
  var key = pos.r + ',' + pos.c;
  var cell = state.board ? state.board[pos.r]?.[pos.c] : null;
  // 单位层
  var unit = null;
  var monster = monAt(pos);
  var hero = Object.values(state.heroes || {}).find(function(h){return h.pos.r===pos.r&&h.pos.c===pos.c;});
  var summ = (state.summons||[]).find(function(s){return !s.dead&&s.pos.r===pos.r&&s.pos.c===pos.c;});
  if (monster) unit = { type:'monster', name:monster.name, hp:monster.hp, maxHp:monster.maxHp, el:monster.el };
  else if (hero) unit = { type:'hero', name:hero.name, hp:hero.hp, maxHp:hero.maxHp };
  else if (summ) unit = { type:'summon', name:summ.name, hp:summ.hp, maxHp:summ.maxHp, el:summ.el };
  else if (playerCastleAt(pos)) unit = { type:'castle', side:'player', hp:state.playerCastle?.hp, maxHp:state.playerCastle?.maxHp };
  else if (enemyCastleAt(pos)) unit = { type:'castle', side:'enemy', hp:state.enemyCastle?.hp, maxHp:state.enemyCastle?.maxHp };
  // 元素层
  var elData = state.elementCells ? state.elementCells[key] : null;
  var elements = {};
  if (elData) ELEMS.forEach(function(el){elements[el]=Math.max(0,elData[el]?.layers||0);});
  else elements = { fire:0, water:0, wind:0, earth:0 };
  // 地形层
  var terrain = buildTerrainInfo(pos);
  // 概要
  var summary = buildCellSummary(unit, elements, terrain);
  return { pos:pos, unit:unit, elements:elements, terrain:terrain, summary:summary };
}

function buildCellSummary(unit, elements, terrain) {
  var parts = [];
  if (unit) {
    if (unit.type === 'monster') parts.push(unit.name + ' HP' + unit.hp);
    else if (unit.type === 'hero') parts.push(unit.name);
    else if (unit.type === 'summon') parts.push(unit.name);
    else if (unit.type === 'castle') parts.push(unit.side === 'player' ? '🏰自' : '🏰敌');
  }
  var elParts = [];
  ELEMS.forEach(function(el){if(elements[el]>0)elParts.push(EL[el]+elements[el]);});
  if (elParts.length > 0) parts.push(elParts.join(' '));
  if (terrain.length > 0) {
    var tParts = terrain.map(function(t){return t.label;});
    parts.push(tParts.join(' '));
  }
  return parts.join(' | ');
}

function computeMonsterActionPreview(){
  const monActMap={},heroIncomingDmg={},summonIncomingDmg={},monCardMap={};
  const monFinalSet=new Set(); // 怪物预计停留格（区别于路过格）
  if(G.phase==='OVER')return{monActMap,heroIncomingDmg,summonIncomingDmg,monFinalSet,monCardMap};
  G.monsters.forEach((m,idx)=>{
    if(m.dead)return;
    const mLabel='M'+(idx+1);
    var stableId=m.name+'#'+idx;
    const{movCells,atkCell,atkTarget,dmg}=simMonAct(m);
    movCells.forEach(c=>{if(!monActMap[k(c)])monActMap[k(c)]={type:c.type,step:c.step||null};});
    // 最后一个 mov 类型格为怪物停留位置
    const movOnly=movCells.filter(c=>c.type==='mov');
    if(movOnly.length>0)monFinalSet.add(k(movOnly[movOnly.length-1]));
    if(atkCell){
      monActMap[k(atkCell)]={type:'atk',step:null};
      if(atkTarget){
        var thrEntry={label:mLabel,dmg:dmg,stableId:stableId,alive:!m.dead,fromR:m.pos.r,fromC:m.pos.c,attackType:'近战攻击'};
        if(atkTarget.id){
          thrEntry.toR=atkTarget.pos?atkTarget.pos.r:null;
          thrEntry.toC=atkTarget.pos?atkTarget.pos.c:null;
          if(atkTarget.kind==='summon'){
            if(!summonIncomingDmg[atkTarget.id])summonIncomingDmg[atkTarget.id]=[];
            summonIncomingDmg[atkTarget.id].push(thrEntry);
          }else{
            if(!heroIncomingDmg[atkTarget.id])heroIncomingDmg[atkTarget.id]=[];
            heroIncomingDmg[atkTarget.id].push(thrEntry);
          }
        }
      }
    }
    // 记录每个怪物自身的攻击目标信息（用于怪物卡显示）
    monCardMap[k(m.pos)]={atkTargetId:atkTarget?.id||null,atkDmg:atkTarget?dmg:0,canAttack:!!atkTarget};
  });
  return{monActMap,heroIncomingDmg,summonIncomingDmg,monFinalSet,monCardMap};
}

function buildPreviewGrid(){
  const ELEMS=['fire','water','wind','earth'];
  // 1. 初始化全棋盘 13x13 空 preview cell
  const grid={};
  for(let r=0;r<8;r++)for(let c=0;c<8;c++){
    const cellKey=`${r},${c}`;
    grid[cellKey]={cellKey,pos:{r,c},
      entity:{type:null,id:null,name:null,hp:null,maxHp:null,atk:null,el:null},
      elementField:{
        fire: {boardLayers:0,addedLayers:0,layers:0,damage:0,sources:[],
          beforeLayers:0,addLayers:0,afterLayers:0,directDamage:0,splashDamage:0,pathDamage:0,totalDamage:0},
        water:{boardLayers:0,addedLayers:0,layers:0,damage:0,sources:[],
          beforeLayers:0,addLayers:0,afterLayers:0,directDamage:0,splashDamage:0,pathDamage:0,totalDamage:0},
        wind: {boardLayers:0,addedLayers:0,layers:0,damage:0,sources:[],
          beforeLayers:0,addLayers:0,afterLayers:0,directDamage:0,splashDamage:0,pathDamage:0,totalDamage:0},
        earth:{boardLayers:0,addedLayers:0,layers:0,damage:0,sources:[],
          beforeLayers:0,addLayers:0,afterLayers:0,directDamage:0,splashDamage:0,pathDamage:0,totalDamage:0},
      },
      preview:{incomingActions:[],selfCellDamage:{fire:0,water:0,wind:0,earth:0,total:0},
        splashDamage:{fire:0,water:0,wind:0,earth:0,total:0,sources:[]},
        entityDamage:0,willExplode:false,explosionShape:null,explosionElement:null,
        explosionDamage:0,splashTargets:[],isSplashTarget:false,splashSources:[],
        threatFromMonsters:[],labels:[],fromSelHero:false,
        result:{totalDamage:0,willDie:false,surviveHp:null,damageBySource:{elementDirect:0,explosionSplash:0,monsterThreat:0}}},
    };
  }
  // 2. 写入 elementCells 当前状态到 elementField.boardLayers
  Object.entries(G.elementCells).forEach(([key,elData])=>{
    if(!grid[key])return;
    ELEMS.forEach(el=>{
      const slot=elData[el];
      if(slot&&slot.layers>0){
        const ef=grid[key].elementField[el];
        ef.boardLayers=slot.layers; ef.beforeLayers=slot.layers;
        ef.layers=slot.layers; ef.afterLayers=slot.layers;
        ef.damage=explDmg(slot.layers); ef.totalDamage=explDmg(slot.layers); ef.sources.push('board');
      }
    });
  });
  // 2b. board.el/stk 兼容路径
  for(let r=0;r<8;r++)for(let c=0;c<8;c++){
    const key=`${r},${c}`,bc=G.board[r][c];
    if(bc.el&&bc.stk>0){
      const ef=grid[key].elementField[bc.el];
      if(ef.boardLayers===0){ef.boardLayers=bc.stk;ef.beforeLayers=bc.stk;ef.layers=bc.stk;ef.afterLayers=bc.stk;ef.damage=explDmg(bc.stk);ef.totalDamage=explDmg(bc.stk);ef.sources.push('board');}
    }
  }
  // 3. 写入实体
  G.monsters.filter(m=>!m.dead).forEach(m=>{
    const key=`${m.pos.r},${m.pos.c}`;
    grid[key].entity={type:'monster',id:m.id,name:m.name,hp:m.hp,maxHp:m.maxHp,atk:m.atk,el:m.el};
  });
  Object.values(G.heroes).forEach(h=>{
    const key=`${h.pos.r},${h.pos.c}`;
    const heroSlots=G.slots.filter(s=>s.hid===h.id&&!s.used).map(s=>({
      el:s.el, sn:s.sn, tier:s.tier, dir:s.dir, idx:s.idx,
      label:`${EL[s.el]}·${s.sn}号·×${((typeof getTierMult === "function" ? getTierMult() : [0,1,2,4,8])[s.tier] || 0)}`,
    }));
    grid[key].entity={type:'hero',id:h.id,name:h.name,hp:h.hp,maxHp:h.maxHp,_acted:!!h._acted,slots:heroSlots};
  });
  (G.summons||[]).filter(s=>!s.dead).forEach(s=>{
    const key=`${s.pos.r},${s.pos.c}`;
    if(grid[key])grid[key].entity={type:'summon',id:s.id,name:s.name,hp:s.hp,maxHp:s.maxHp,atk:s.atk,el:s.el};
  });
  if(G.playerCastle&&G.playerCastle.hp>0){
    const pk=`${G.playerCastle.pos.r},${G.playerCastle.pos.c}`;
    grid[pk].entity={type:'player_castle',id:'playerCastle',name:'我方城堡',hp:G.playerCastle.hp,maxHp:G.playerCastle.maxHp,atk:null,el:null};
  }
  if(G.enemyCastle&&G.enemyCastle.hp>0){
    const ek=`${G.enemyCastle.pos.r},${G.enemyCastle.pos.c}`;
    grid[ek].entity={type:'enemy_castle',id:'enemyCastle',name:'敌方城堡',hp:G.enemyCastle.hp,maxHp:G.enemyCastle.maxHp,atk:null,el:null};
  }
  // 4. 模拟全部未使用英雄行动槽，写入 elementField 和 preview.incomingActions
  const selHid=G.selHero||(G.selSlot!==null?G.slots[G.selSlot]?.hid:null);
  const heroSlotCount={};
  var seqCounter=0;
  G.slots.forEach(slot=>{
    if(slot.used)return;
    const hero=G.heroes[slot.hid]; if(!hero||hero.hp<=0)return;
    heroSlotCount[slot.hid]=(heroSlotCount[slot.hid]||0)+1;
    const sLabel=(slot.hid==='ha'?'A':'B')+'-'+heroSlotCount[slot.hid];
    const fromSel=!!(selHid&&slot.hid===selHid);
    const cells=atkCells(hero.pos,slot.sn,slot.dir);
    const center=findCenterCell(cells);
    const baseLayers=slot.layers||1;
    const centerBonus=slot.centerBonus||0;
    const condEl=slot.conditional?.el;
    const condBonus=slot.conditional?.bonus||0;
    cells.forEach(ap=>{
      // 不覆盖城堡格
      if(castleAt(ap))return;
      const key=`${ap.r},${ap.c}`;
      const cell=grid[key];
      let layersToAdd=baseLayers;
      if(ap.r===center.r&&ap.c===center.c)layersToAdd+=centerBonus;
      if(condEl===slot.el){const ef2=cell.elementField[condEl];if(ef2.boardLayers>0)layersToAdd+=condBonus;}
      var resolved=[];
      resolved.push('directElement');
      if(slot.sn===12&&ap.r===center.r&&ap.c===center.c)resolved.push('explosionCenter');
      else if(slot.sn===12&&!(ap.r===center.r&&ap.c===center.c))resolved.push('splash');
      if(ap.r===hero.pos.r&&ap.c===hero.pos.c)resolved.push('ignored');
      seqCounter++;
      cell.preview.incomingActions.push({
        source:sLabel,heroId:slot.hid,element:slot.el,amount:layersToAdd,fromSelHero:fromSel,
        description:`${sLabel}：${EL[slot.el]} +${layersToAdd}`,
        slotIndex:heroSlotCount[slot.hid],sn:slot.sn,dir:slot.dir,
        fromR:hero.pos.r,fromC:hero.pos.c,heroName:hero.name,
        sourceType:'heroSlot',resolvedEffects:resolved,sequenceIndex:seqCounter
      });
      if(fromSel)cell.preview.fromSelHero=true;
      const ef=cell.elementField[slot.el];
      for(let la=0;la<layersToAdd;la++){
        if(ef.layers<MAX_STK){ef.addedLayers++;ef.addLayers++;ef.layers=Math.min(ef.boardLayers+ef.addedLayers,MAX_STK);ef.afterLayers=ef.layers;ef.damage=explDmg(ef.layers);ef.sources.push(sLabel);}
      }
    });
  });
  // 5a. 第一遍：怪物格单体伤害 / 空格爆炸检测
  Object.values(grid).forEach(cell=>{
    const{entity,elementField,preview}=cell;
    const isMonster=entity.type==='monster';
    const isSummon=entity.type==='summon';
    const isCastle=entity.type==='player_castle'||entity.type==='enemy_castle';
    const hasEntity=isMonster||isSummon||isCastle;
    const explodingEls=[];
    const spaceBonus=getSpaceExplosionBonus();
    ELEMS.forEach(el=>{
      const ef=elementField[el]; if(ef.layers===0)return;
      if(hasEntity){
        // R8: 我方城堡不承受我方元素伤害
        var ignoreElDmg=false;
        if(entity.type==='player_castle')ignoreElDmg=true;
        if(!ignoreElDmg){
          const r=calcElementDamage(ef.layers,entity.el,el,{advHitBonus:getAdvHitBonus()});
          const dmg=r.damage;
          preview.selfCellDamage[el]=dmg; preview.selfCellDamage.total+=dmg; preview.entityDamage+=dmg;
          ef.directDamage=dmg; ef.totalDamage=dmg;
          preview.result.damageBySource.elementDirect+=dmg;
        }
      } else if(entity.type==='hero'){
        // R3: 英雄不承受本格元素伤害
        ef.directDamage=0;
      } else {
        // 空地
        if(ef.layers>=G.explosionThreshold){
          const expDmg=calcElementDamage(ef.layers,null,el,{spaceBonus}).damage;
          explodingEls.push({element:el,layers:ef.layers,damage:expDmg});
          preview.willExplode=true;
          ef.directDamage=expDmg; ef.splashDamage=ef.layers; ef.totalDamage=expDmg;
        }
      }
    });
    if(explodingEls.length>0){
      const xActive=hasCrossExplosion();
      preview.explosionElements=explodingEls;
      preview.explosionElement=explodingEls[0].element;
      preview.explosionShape=xActive?'cross':'single';
      preview.explosionDamage=explodingEls.reduce((s,e)=>s+e.damage,0);
      preview.splashTargets=xActive
        ? explCells(cell.pos).map(p=>`${p.r},${p.c}`)
        : [`${cell.pos.r},${cell.pos.c}`];
      // 空格爆炸不模拟溅射伤害——只读数据
    }
  });
  // 5b. 移除——预览层不模拟爆炸波及伤害，只读数据
  // 爆炸形状由 5a 根据 G.elementCells.willExplode + hasCrossExplosion() 决定
  // 6. 怪物行动预览 → 写入英雄格威胁
  const monsterThreats=computeMonsterActionPreview();
  const{heroIncomingDmg,summonIncomingDmg,monActMap,monFinalSet,monCardMap}=monsterThreats;
  Object.entries(heroIncomingDmg).forEach(([heroId,dmgArr])=>{
    const hero=G.heroes[heroId]; if(!hero)return;
    const key=`${hero.pos.r},${hero.pos.c}`;
    if(grid[key])grid[key].preview.threatFromMonsters=dmgArr.map(function(d){return{label:d.label,dmg:d.dmg,stableId:d.stableId,alive:d.alive,fromR:d.fromR,fromC:d.fromC,toR:d.toR,toC:d.toC,attackType:d.attackType};});
  });
  Object.entries(summonIncomingDmg).forEach(([sid,dmgArr])=>{
    const s=(G.summons||[]).find(x=>x.id===sid&&!x.dead); if(!s)return;
    const key=`${s.pos.r},${s.pos.c}`;
    if(grid[key])grid[key].preview.threatFromMonsters=dmgArr.map(function(d){return{label:d.label,dmg:d.dmg,stableId:d.stableId,alive:d.alive,fromR:d.fromR,fromC:d.fromC,toR:d.toR,toC:d.toC,attackType:d.attackType};});
  });
  // 6b. 汇总 result（仅 VM 预览，不改真实结算）
  Object.values(grid).forEach(cell=>{
    var r=cell.preview.result;
    var ent=cell.entity;
    if(ent&&ent.hp!==null&&ent.hp>0){
      var thrTotal=0;
      (cell.preview.threatFromMonsters||[]).forEach(function(t){thrTotal+=t.dmg||0;});
      r.damageBySource.monsterThreat=thrTotal;
      r.totalDamage=r.damageBySource.elementDirect+r.damageBySource.explosionSplash+r.damageBySource.monsterThreat;
      r.willDie=r.totalDamage>=ent.hp;
      r.surviveHp=Math.max(0,ent.hp-r.totalDamage);
    }
  });
  // 7. 汇总 labels
  const ELICON={fire:'🔥',water:'💧',wind:'🌬',earth:'🪨'};
  Object.values(grid).forEach(cell=>{
    const labels=[],{entity,elementField,preview}=cell;
    ELEMS.forEach(el=>{if(elementField[el].layers>0)labels.push(`${ELICON[el]}${elementField[el].layers}`);});
    if(entity.type==='monster'&&preview.entityDamage>0){
      labels.push(`-${preview.entityDamage}`);
      if(preview.entityDamage>=entity.hp&&entity.hp>0)labels.push('☠');
    }
    if(preview.willExplode)labels.push('💥');
    if(preview.threatFromMonsters.length>0)labels.push(`⚠×${preview.threatFromMonsters.length}`);
    cell.preview.labels=labels;
  });
  return{grid,monActMap,heroIncomingDmg,summonIncomingDmg,monFinalSet,monCardMap};
}

function buildBattleReport(monsterStats,monsterThreats){
  const ms=monsterStats||buildMonsterStats();
  const mt=monsterThreats||computeMonsterActionPreview();
  const ELNAME={fire:'火',water:'水',wind:'风',earth:'土'};
  const report=[];
  // 1. 行动日志
  (G.actionLog||[]).forEach(act=>{
    if(act.type==='MOVE_HERO'){
      const label=act.heroId==='ha'?'英雄A':'英雄B';
      report.push(`${label} 从 [${act.from.r},${act.from.c}] 移动到 [${act.to.r},${act.to.c}]`);
    } else if(act.type==='USE_SLOT'&&act.desc){
      report.push(act.desc);
    }
  });
  // 2. 怪物自身格伤害（单体结算，不触发十字）
  G.monsters.filter(m=>!m.dead).forEach(m=>{
    const mk=`${m.pos.r},${m.pos.c}`;
    const st=ms[mk];
    if(!st)return;
    if(st.selfCellDamage.total>0){
      ['fire','water','wind','earth'].forEach(el=>{
        const dmg=st.selfCellDamage[el]||0;
        if(dmg<=0)return;
        const lyr=(G.elementCells[mk]&&G.elementCells[mk][el])?G.elementCells[mk][el].layers:0;
        report.push(`怪物格 [${m.pos.r},${m.pos.c}] ${ELNAME[el]}${lyr}层，${m.name}预计单体受伤 ${dmg}`);
      });
      report.push('怪物格单体结算，不触发十字爆炸');
    }
    // 3. 来自周边空格的十字爆炸波及
    if(st.splashDamage.total>0){
      ['fire','water','wind','earth'].forEach(el=>{
        const dmg=st.splashDamage[el]||0;
        if(dmg>0)report.push(`${m.name}预计受到空格十字爆炸波及 ${ELNAME[el]} ${dmg}`);
      });
    }
    if(st.finalPreview.willDie){
      report.push(`${m.name}预计死亡（总伤 ${st.finalPreview.totalDamage}，HP ${m.hp}）`);
    }
  });
  // 4. 空格十字引爆预告
  Object.entries(G.elementCells).forEach(([ky,elData])=>{
    const[r,c]=ky.split(',').map(Number);
    if(monAt({r,c}))return; // 怪物格已在上面处理
    ['fire','water','wind','earth'].forEach(el=>{
      const slot=elData[el];
      if(!slot||!slot.willExplode)return;
      const affected=explCells({r,c}).filter(p=>monAt(p));
      if(affected.length>0){
        const names=affected.map(p=>monAt(p).name).join('、');
        report.push(`空格 [${r},${c}] ${ELNAME[el]}${slot.layers}层预计十字引爆，波及 ${names}，伤害 ${explDmg(slot.layers)}`);
      } else {
        report.push(`空格 [${r},${c}] ${ELNAME[el]}${slot.layers}层预计十字引爆`);
      }
    });
  });
  // 5. 怪物攻击英雄预警
  const{heroIncomingDmg}=mt;
  Object.entries(heroIncomingDmg).forEach(([heroId,dmgArr])=>{
    if(!dmgArr||dmgArr.length===0)return;
    const heroLabel=heroId==='ha'?'英雄A':'英雄B';
    const total=dmgArr.reduce((s,e)=>s+e.dmg,0);
    report.push(`${heroLabel}预计受击${dmgArr.length}次，总伤害 ${total}`);
    dmgArr.forEach(({label,dmg})=>{
      report.push(`${label} 攻击${heroLabel}，伤害 ${dmg}`);
    });
  });
  return report;
}

function buildHeroStats(){
  return Object.fromEntries(
    Object.values(G.heroes).map(function(h){return [h.id,{id:h.id,name:h.name,hp:h.hp,maxHp:h.maxHp,pos:{r:h.pos.r,c:h.pos.c}}];})
  );
}


function recomputeCorePreview(){
  const pg=buildPreviewGrid();
  const monsterStats=buildMonsterStats();
  const cellInfoMap=buildCellInfoMap();
  const monsterThreats={monActMap:pg.monActMap,heroIncomingDmg:pg.heroIncomingDmg,summonIncomingDmg:pg.summonIncomingDmg,monFinalSet:pg.monFinalSet,monCardMap:pg.monCardMap};
  const heroStats=buildHeroStats();
  const battleReport=buildBattleReport(monsterStats,monsterThreats);
  G.coreVersion=(G.coreVersion||0)+1;
  // ── cellBriefs：从 previewGrid 整理中文短字（debug 面板数据源，UI 只读）──
  const cellBriefs={};
  const ELNAME={fire:'火',water:'水',wind:'风',earth:'土'};
  const HERO_NAME={ha:'英1',hb:'英2'};
  const EL_ORDER=['fire','water','wind','earth'];
  function _monIdx(monId){var idx=G.monsters.findIndex(function(m){return m.id===monId&&!m.dead;});return idx>=0?idx+1:null;}
  function _monLabel(label){return String(label).replace(/^M/,'怪');}
  function _heroLabel(hid){return HERO_NAME[hid]||hid;}
  function _elParts(selfCellDmg){
    var parts=[]; var out={fire:0,water:0,wind:0,earth:0};
    EL_ORDER.forEach(function(el){var d=selfCellDmg[el]||0;out[el]=d;if(d>0)parts.push(ELNAME[el]+d);});
    out._str=parts.join(' '); return out;
  }
  function _uniqHeroes(acts){var ids=[],seen={};acts.forEach(function(a){if(!seen[a.heroId]){seen[a.heroId]=true;ids.push(a.heroId);}});return ids;}
  Object.values(pg.grid).forEach(function(cell){
    var ent=cell.entity, ef=cell.elementField, pv=cell.preview;
    var brief='', detail=null, dtype=ent.type||'empty';
    var hasDmg=pv.entityDamage>0;
    if(ent.type==='monster'||ent.type==='summon'){
      var hids=_uniqHeroes(pv.incomingActions);
      var eidx=ent.type==='monster'?_monIdx(ent.id):null;
      var etag=eidx?'怪'+eidx:(ent.name||'?');
      var eb=_elParts(pv.selfCellDamage);
      if(hids.length>0||hasDmg){
        if(hids.length>0)brief=hids.map(_heroLabel).join('')+'打'+(eidx||etag);
        if(eb._str)brief+=(brief?' ':'')+eb._str+' 总'+pv.entityDamage;
        else if(hasDmg)brief+=(brief?' ':'')+'总'+pv.entityDamage;
        detail={type:ent.type,attackers:hids.map(_heroLabel),target:etag,
          fire:eb.fire,water:eb.water,wind:eb.wind,earth:eb.earth,
          splash:pv.splashDamage?.total||0,total:pv.entityDamage,
          willDie:ent.hp>0&&pv.entityDamage>=ent.hp};
      }
    }else if(ent.type==='hero'){
      var thr=pv.threatFromMonsters||[];
      if(thr.length>0){
        var td=thr.reduce(function(s,t){return s+(t.dmg||0);},0);
        brief=thr.map(function(t){return _monLabel(t.label);}).join('')+'打'+td;
        detail={type:'hero',attackers:thr.map(function(t){return _monLabel(t.label);}),target:_heroLabel(ent.id),incoming:td};
      }
    }else if(ent.type==='player_castle'||ent.type==='enemy_castle'){
      var hids2=_uniqHeroes(pv.incomingActions);
      var ctag=ent.type==='player_castle'?'城':'敌城';
      var eb2=_elParts(pv.selfCellDamage);
      var cthr=pv.threatFromMonsters||[];
      var cmDmg=cthr.reduce(function(s,t){return s+(t.dmg||0);},0);
      if(hids2.length>0||hasDmg||cmDmg>0){
        if(hids2.length>0)brief=hids2.map(_heroLabel).join('')+'打'+ctag;
        else if(cmDmg>0)brief=cthr.map(function(t){return _monLabel(t.label);}).join('')+'打'+ctag;
        if(eb2._str)brief+=(brief?' ':'')+eb2._str;
        var ct=hasDmg?pv.entityDamage:cmDmg;
        if(ct>0)brief+=(brief?' ':'')+'总'+ct;
        detail={type:'castle',attackers:hids2.map(_heroLabel),target:ctag,
          fire:eb2.fire,water:eb2.water,wind:eb2.wind,earth:eb2.earth,
          monsterDmg:cmDmg,total:hasDmg?pv.entityDamage:cmDmg};
      }
    }else{
      var elParts=[]; var td3=0;
      EL_ORDER.forEach(function(el){var f=ef[el];if(!f||f.layers<=0)return;elParts.push(ELNAME[el]+f.layers);td3+=f.damage||0;});
      if(elParts.length>0){
        brief=elParts.join(' ')+(elParts.length>1?' 总'+td3:'');
        detail={type:'empty',elements:elParts.join(' '),total:td3};
      }
    }
    cellBriefs[cell.cellKey]={brief:brief,detail:detail||{},type:dtype};
  });
  G.coreSnapshot={
    _version:G.coreVersion,
    _ts:Date.now(),
    previewGrid:{grid:pg.grid},
    monsterStats,
    cellInfoMap,
    monsterThreats,
    heroStats,
    battleReport,
    warnings:[],
    _cellBriefs:cellBriefs,
  };
}
