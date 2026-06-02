/**
 * 元素背包史 · UI 层
 * 包含：ViewModel 构建、DOM 渲染、事件绑定
 * 依赖：game.js (G 状态), data.js (常量)
 */
// ========== RENDERING ==========

// ─── Preview 计算层（只读 G，不创建 DOM）───
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
      const emult=m.el&&ADV[el]===m.el?2:1;
      const d=explDmg(slot.layers)*emult;
      selfCellDmg[el]+=d; selfCellDmg.total+=d;
    });
    // 2. 来自空格十字爆炸的波及伤害（空格需达到 willExplode）
    Object.entries(G.elementCells).forEach(([srcKey,srcElData])=>{
      if(srcKey===mk)return;
      const [sr,sc]=srcKey.split(',').map(Number);
      if(monAt({r:sr,c:sc}))return; // 怪物格不触发十字
      ['fire','water','wind','earth'].forEach(el=>{
        const slot=srcElData[el];
        if(!slot||!slot.willExplode)return;
        const inRange=explCells({r:sr,c:sc}).some(p=>p.r===m.pos.r&&p.c===m.pos.c);
        if(!inRange)return;
        const emult=m.el&&ADV[el]===m.el?2:1;
        const d=explDmg(slot.layers)*emult;
        splashDmg[el]+=d; splashDmg.total+=d;
        splashDmg.sources.push({srcKey,el,dmg:d});
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

// ─── ViewModel 层（读 G，输出纯 JS 描述对象，不创建 DOM）───
function buildBoardVM(){
  const hp={},mp={},sp={};
  Object.values(G.heroes).forEach(h=>{hp[k(h.pos)]=h;});
  G.monsters.forEach(m=>{if(!m.dead)mp[k(m.pos)]=m;});
  (G.summons||[]).filter(s=>!s.dead).forEach(s=>{sp[k(s.pos)]=s;});
  const ps=new Set(G.prevCells.map(p=>k(p)));
  const es=new Set();if(G.explPos)explCells(G.explPos).forEach(p=>es.add(k(p)));
  // 从 coreSnapshot 读取预览数据，不在 VM 层重算
  const pgGrid=G.coreSnapshot?.previewGrid?.grid||{};
  const mt=G.coreSnapshot?.monsterThreats||{monActMap:{},heroIncomingDmg:{},summonIncomingDmg:{},monFinalSet:new Set(),monCardMap:{}};
  const{monActMap,heroIncomingDmg,summonIncomingDmg,monFinalSet,monCardMap}=mt;
  const ELEMS=['fire','water','wind','earth'];
  const cells=[];
  for(let r=0;r<8;r++)for(let c=0;c<8;c++){
    const key=`${r},${c}`,hero=hp[key],mon=mp[key],bc=G.board[r][c];
    const pgCell=pgGrid[key]||null;
    const classes=[];
    if(ps.has(key))classes.push('ap');
    if(es.has(key))classes.push('ep');
    if(G.explPos&&G.explPos.r===r&&G.explPos.c===c)classes.push('ec');
    // 怪物路径：区分路过格(橙)、停留格(黄)、攻击格(红)
    const actData=monActMap[key];
    if(actData){
      if(actData.type==='atk')classes.push('mw-atk');
      else if(monFinalSet.has(key))classes.push('mw-final');
      else classes.push('mw-mov');
    }
    // 从 previewGrid 读取预览信息（不在此层重计算）
    let pvEl=null,pvOpacity=null,monDmg=null,pvElLayers=null,pvWillExplode=false;
    if(pgCell){
      const actions=pgCell.preview.incomingActions;
      if(actions.length>0){pvEl=actions[0].element;pvOpacity=pgCell.preview.fromSelHero?'0.42':'0.20';}
      ELEMS.forEach(el=>{
        const ef=pgCell.elementField[el];
        if(ef.addedLayers>0){
          if(!pvElLayers)pvElLayers={};
          const isMonCell=pgCell.entity.type==='monster';
          pvElLayers[el]={add:ef.addedLayers,cur:ef.boardLayers,next:ef.layers,willExplode:!isMonCell&&ef.layers>=G.explosionThreshold,dmg:ef.damage};
        }
      });
      pvWillExplode=pgCell.preview.willExplode;
      if(pgCell.preview.entityDamage>0)monDmg=pgCell.preview.entityDamage;
    }
    cells.push({
      r,c,key,
      hero:hero?{id:hero.id,name:hero.name,hp:hero.hp,maxHp:hero.maxHp,isSel:G.selHero===hero.id,incomingDmg:heroIncomingDmg[hero.id]||[]}:null,
      mon:mon?{id:mon.id,name:mon.name,hp:mon.hp,maxHp:mon.maxHp,atk:mon.atk,el:mon.el,atkInfo:monCardMap[key]||{atkTargetId:null,atkDmg:0,canAttack:false},previewDamage:pgCell?.preview.entityDamage||0,willDie:pgCell?(pgCell.preview.entityDamage>=mon.hp&&mon.hp>0):false}:null,
      summon:sp[key]?{id:sp[key].id,name:sp[key].name,hp:sp[key].hp,maxHp:sp[key].maxHp,atk:sp[key].atk,el:sp[key].el,incomingDmg:summonIncomingDmg[sp[key].id]||[]}:null,
      el:(bc.el&&bc.stk>0)?{el:bc.el,stk:bc.stk,bg:EB[bc.el],color:EC[bc.el],explDmg:explDmg(bc.stk)}:null,
      castle:playerCastleAt({r,c})?{side:'player',hp:G.playerCastle.hp,maxHp:G.playerCastle.maxHp}:enemyCastleAt({r,c})?{side:'enemy',hp:G.enemyCastle.hp,maxHp:G.enemyCastle.maxHp}:null,
      classes,pvEl,pvOpacity,monDmg,pvElLayers,pvWillExplode,
      monStep:actData?.type==='mov'?actData.step:null,
      displayBrief:(G.coreSnapshot?._cellBriefs||{})[key]?.brief||'',
    });
  }
  return cells;
}

// ─── 核心预览层：buildPreviewGrid（独立格子预览层，UI 只读不计算）───
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
      label:`${EL[s.el]}·${s.sn}号·×${TIER_MULT[s.tier]}`,
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
          const emult=(entity.el&&ADV[el]===entity.el)?2:1;
          const dmg=explDmg(ef.layers)*emult;
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
          const expDmg=explDmg(ef.layers)+spaceBonus;
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

function buildHeroesVM(){
  return Object.values(G.heroes).map(hero=>{
    const pct=(hero.hp/hero.maxHp)*100;
    return{id:hero.id,name:hero.name,hp:hero.hp,maxHp:hero.maxHp,pos:hero.pos,pct,
      col:hero.id==='ha'?'#7b9db5':'#7a9e7a',
      hpcol:pct>60?'#7a9e7a':pct>30?'#c4a860':'#c4675a'};
  });
}

function buildSlotsVM(){
  const heroSlotCount={};
  return G.slots.map((s,i)=>{
    heroSlotCount[s.hid]=(heroSlotCount[s.hid]||0)+1;
    return{idx:i,el:s.el,tier:s.tier,sn:s.sn,dir:s.dir,hid:s.hid,used:s.used,isSel:G.selSlot===i,
      hLabel:(s.hid==='ha'?'A':'B')+'-'+heroSlotCount[s.hid],
      disabled:s.used||G.phase!=='PLAYER'};
  });
}

function buildTurnVM(){
  const hasExec=G.phase==='PLAYER'&&G.slots.some(s=>!s.used&&s.hid&&G.heroes[s.hid]);
  const aliveSummons=(G.summons||[]).filter(s=>!s.dead).length;
  const ai=G.aiBattleStatus||null;
  return{phase:G.phase,wave:G.wave,day:G.day,dayHalf:G.dayHalf,round:Math.min(G.round,G.maxRound),maxRound:G.maxRound,gold:G.gold,endTurnDisabled:G.phase!=='PLAYER',execAllDisabled:!hasExec,
    aiBattleBusy:!!ai&&ai.phase==='executing',
    aiBattleLabel:ai&&ai.phase==='executing'?'⚡ 推演中':'⚡ AI战斗',
    aiBattleHint:ai&&ai.summary?ai.summary:'AI 自动规划移动和符文施放',
    engineStats:{summonCount:G.engineStats?.summonCount||0,healCount:G.engineStats?.healCount||0,summonAlive:aliveSummons,
      growth:{summonTier:G.growth?.summonTier||0,healTier:G.growth?.healTier||0,chainTier:G.growth?.chainTier||0},
      lastSettle:G.lastSettle||null}};
}

function buildBattleVM(){
  return{board:buildBoardVM(),heroes:buildHeroesVM(),slots:buildSlotsVM(),turn:buildTurnVM()};
}

// ─── 核心事件驱动架构 ───
function buildHeroStats(){
  return Object.fromEntries(
    Object.values(G.heroes).map(h=>[h.id,{id:h.id,name:h.name,hp:h.hp,maxHp:h.maxHp,pos:{r:h.pos.r,c:h.pos.c}}])
  );
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

// ========== REPLAY 战斗复盘 ==========
const REPLAY_VERSION = 1;

function snapshotCoreStateForReplay(){
  return {
    day:G.day, dayHalf:G.dayHalf, phase:G.phase, round:G.round, maxRound:G.maxRound,
    gold:G.gold, hitCount:G.hitCount, explosionThreshold:G.explosionThreshold,
    board:JSON.parse(JSON.stringify(G.board)),
    elementCells:JSON.parse(JSON.stringify(G.elementCells)),
    heroes:JSON.parse(JSON.stringify(G.heroes)),
    monsters:JSON.parse(JSON.stringify(G.monsters)),
    slots:JSON.parse(JSON.stringify(G.slots)),
    summons:JSON.parse(JSON.stringify(G.summons||[])),
    ownedUnits:JSON.parse(JSON.stringify(G.ownedUnits||[])),
    playerCastle:JSON.parse(JSON.stringify(G.playerCastle)),
    enemyCastle:JSON.parse(JSON.stringify(G.enemyCastle)),
    engineStats:JSON.parse(JSON.stringify(G.engineStats||{})),
    growth:JSON.parse(JSON.stringify(G.growth||{})),
    _nextSummonId:G._nextSummonId||0,
  };
}

function applyReplaySnapshot(snap){
  Object.assign(G,{
    ...snap,
    actionLog:[],
    coreSnapshot:null,
    coreVersion:0,
    selHero:null, selSlot:null, selectedCell:null,
    prevCells:[], heroPrev:[], explPos:null, monWarn:[],
    previewEvents:[], shopItems:{units:[],consumables:[]},
    shopFrozen:{units:new Set(),consumables:new Set()},
    runVictory:null, lastSettle:null,
  });
  recomputeCorePreview();
}

function hashReplayState(){
  const payload={
    phase:G.phase, round:G.round, day:G.day, dayHalf:G.dayHalf,
    gold:G.gold, explosionThreshold:G.explosionThreshold,
    playerCastle:G.playerCastle, enemyCastle:G.enemyCastle,
    elementCells:G.elementCells,
    heroes:Object.fromEntries(Object.entries(G.heroes).map(([k,h])=>[k,{hp:h.hp,maxHp:h.maxHp,pos:h.pos,_acted:!!h._acted}])),
    monsters:G.monsters.map(m=>({hp:m.hp,maxHp:m.maxHp,pos:m.pos,dead:!!m.dead,name:m.name})),
    slots:G.slots.map(s=>({el:s.el,sn:s.sn,used:!!s.used,hid:s.hid,dir:s.dir,layers:s.layers})),
    summons:(G.summons||[]).map(s=>({hp:s.hp,dead:!!s.dead,pos:s.pos})),
    engineStats:G.engineStats,
  };
  return stableReplayHash(JSON.stringify(payload));
}

function stableReplayHash(str){
  let h=2166136261;
  for(let i=0;i<str.length;i++){
    h^=str.charCodeAt(i);
    h=Math.imul(h,16777619);
  }
  return (h>>>0).toString(16);
}

function buildReplayFinalResult(){
  return {
    hash:hashReplayState(),
    phase:G.phase,
    round:G.round,
    day:G.day,
    monstersAlive:G.monsters.filter(m=>!m.dead).length,
    playerCastleHp:G.playerCastle?.hp,
    enemyCastleHp:G.enemyCastle?.hp,
    engineStats:{...(G.engineStats||{})},
    growth:{...(G.growth||{})},
  };
}

function startReplayCapture(){
  G._replayCapture={ initial:snapshotCoreStateForReplay(), steps:[] };
}

function stopReplayCapture(){
  const cap=G._replayCapture;
  G._replayCapture=null;
  return cap;
}

function pushReplayStep(step){
  if(!G._replayCapture)return;
  G._replayCapture.steps.push(JSON.parse(JSON.stringify(step)));
}

function exportReplay(opts={}){
  const cap=G._replayCapture;
  return {
    version:REPLAY_VERSION,
    seed:opts.seed??null,
    meta:{
      day:G.day, dayHalf:G.dayHalf, phase:G.phase,
      exportedAt:typeof Date!=='undefined'?Date.now():0,
    },
    initial:opts.initial||(cap&&cap.initial)||snapshotCoreStateForReplay(),
    steps:opts.steps||(cap&&cap.steps)||[...(G.actionLog||[])],
    finalResult:buildReplayFinalResult(),
  };
}

function executeReplayStep(step){
  switch(step.type){
    case 'MOVE_HERO':
    case 'USE_SLOT':
    case 'SELECT_ACTION_SLOT':
    case 'UPDATE_ACTION_SLOT':
    case 'SET_ACTION_DIRECTION':
    case 'SET_ACTION_TARGET':
      dispatchGameAction(step);
      break;
    case 'END_PLAYER_TURN':
      endPlayerTurn();
      break;
    case 'CLOSE_SHOP':
      closeShop();
      break;
    default:
      throw new Error('未知 replay 步骤: '+step.type);
  }
}

function runReplay(replay){
  if(!replay||replay.version!==REPLAY_VERSION){
    throw new Error('不支持的 replay 版本');
  }
  applyReplaySnapshot(replay.initial);
  (replay.steps||[]).forEach(executeReplayStep);
  return buildReplayFinalResult();
}

function isDebugMode(){
  if(typeof global!=='undefined'&&global.__DEBUG__)return true;
  if(typeof location!=='undefined'&&location&&location.search){
    if(new URLSearchParams(location.search).get('debug')==='1')return true;
  }
  if(typeof localStorage!=='undefined'){
    try{ if(localStorage.getItem('ysbzs_debug')==='1')return true; }catch(e){}
  }
  return false;
}

function buildDebugPanelVM(){
  var sel=G.selectedCell;
  var selectedCell=null;
  if(sel){
    var key=sel.r+','+sel.c;
    var ec=G.elementCells[key];
    var pg=G.coreSnapshot?.previewGrid?.grid?.[key];
    selectedCell={
      r:sel.r,c:sel.c,coord:key,
      pos:{r:sel.r,c:sel.c},
      entity:pg?.entity||null,
      elementField:pg?.elementField||null,
      entityDamage:pg?.preview?.entityDamage||0,
      isMonster:pg?.entity?.type==='monster',
      selfDmg:pg?.preview?.selfCellDamage?.total||0,
      splashDmg:pg?.preview?.splashDamage?.total||0,
      selfByEl:pg?.preview?.selfCellDamage?{fire:pg.preview.selfCellDamage.fire||0,water:pg.preview.selfCellDamage.water||0,wind:pg.preview.selfCellDamage.wind||0,earth:pg.preview.selfCellDamage.earth||0}:{},
      selfCellDamage:pg?.preview?.selfCellDamage||null,
      splashDamage:pg?.preview?.splashDamage||null,
      explosionElements:pg?.preview?.explosionElements||null,
      willExplode:!!pg?.preview?.willExplode,
      explosionDamage:pg?.preview?.explosionDamage||0,
      splashTargets:pg?.preview?.splashTargets||[],
      explosionSources:pg?.preview?.explosionSources||[],
      threats:pg?.preview?.threatFromMonsters||[],
      incomingActions:pg?.preview?.incomingActions||[],
      result:pg?.preview?.result||{totalDamage:0,willDie:false,surviveHp:null,damageBySource:{elementDirect:0,explosionSplash:0,monsterThreat:0}},
    };
  }
  return {
    phase:G.phase,day:G.day,dayHalf:G.dayHalf,round:G.round,maxRound:G.maxRound,wave:G.wave,
    gold:G.gold,
    selectedCell,
    previewGrid:G.coreSnapshot?.previewGrid?.grid||{},
    slots:G.slots.map(function(s,i){
      var hero=G.heroes[s.hid];
      return{i:i,el:s.el,used:!!s.used,hid:s.hid,skill:s.skill||null,sn:s.sn,dir:s.dir,heroPos:hero?{r:hero.pos.r,c:hero.pos.c}:null};
    }),
    actionLogTail:(G.actionLog||[]).slice(-8),
    monsters:G.monsters.filter(function(m){return!m.dead;}).map(function(m){
      return{name:m.name,pos:{r:m.pos.r,c:m.pos.c},hp:m.hp,atk:m.atk,nextWarn:(G.monWarn||[]).find(function(w){return w.r===m.pos.r&&w.c===m.pos.c;})||null};
    }),
    engineStats:{...(G.engineStats||{})},
    growth:{summonTier:G.growth?.summonTier||0,healTier:G.growth?.healTier||0,chainTier:G.growth?.chainTier||0},
  };
}

let _debugTimer=null;
function scheduleDebugPanelUpdate(){
  // leading-edge debounce: 首次立即渲染，200ms 内连续调用排队到最后一次
  if(_debugTimer!==null){clearTimeout(_debugTimer);_debugTimer=setTimeout(()=>{_debugTimer=null;renderDebugPanel();},200);return;}
  renderDebugPanel();
  _debugTimer=setTimeout(()=>{_debugTimer=null;},200);
}

function renderDebugPanel(){
  if(typeof global!=='undefined'&&global.__TEST__)return;
  var dock=document.getElementById('debug-dock');
  var floating=document.getElementById('debug-panel');
  var el=dock||floating;
  if(!el)return;
  var docked=!!dock;
  if(!docked&&!isDebugMode()){el.style.display='none';el.setAttribute('aria-hidden','true');return;}
  if(floating&&docked){floating.style.display='none';floating.setAttribute('aria-hidden','true');}
  el.style.display='block';el.setAttribute('aria-hidden','false');
  var vm=buildDebugPanelVM();
  var EC={fire:'火',water:'水',wind:'风',earth:'土'};
  var ELIC2={fire:'#d4855e',water:'#5e95b5',wind:'#6ea86c',earth:'#b8844a'};
  var ES=['fire','water','wind','earth'];
  var ELIC2N={fire:'🔥',water:'💧',wind:'🌿',earth:'🪨'};
  // ── 树形详情面板格式 v3（只读 VM，不重算）──
  var ELICON={fire:'🔥',water:'💧',wind:'🌬',earth:'🪨'};
  function esc(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}
  function elColor(el){return ELIC2[el]||'#8b7d6b';}

  function buildCellTree(sc){
    if(!sc)return'<div class="dbg-cell"><span class="dbg-k">（无数据）</span></div>';
    var ent=sc.entity,ef=sc.elementField||{};
    var lines=[],s='';
    var SEC='<span style="color:#8b7d6b">  ┃ </span>';
    var ITEM='<span style="color:#8b7d6b">  ┣ </span>';

    // ── 首行 ──
    var first='';
    var pos=sc.pos||{r:sc.r,c:sc.c};
    if(!ent||!ent.type){
      first='('+pos.r+','+pos.c+') 空地';
    }else if(ent.type==='monster'){
      first='<span style="color:#c4907a">'+esc(ent.name)+'</span>('+pos.r+','+pos.c+') '+ent.hp+'/'+ent.maxHp+'血';
      if(ent.atk!==null&&ent.atk!==undefined)first+=' 攻'+ent.atk;
      if(ent.el)first+=' <span style="color:'+elColor(ent.el)+'">'+ELICON[ent.el]+'</span>';
    }else if(ent.type==='hero'){
      var hc=ent.id==='ha'?'#7b9db5':'#7a9e7a';
      first='<span style="color:'+hc+'">'+esc(ent.name)+'</span>('+pos.r+','+pos.c+') '+ent.hp+'/'+ent.maxHp+'血';
    }else if(ent.type==='summon'){
      first='💧'+esc(ent.name)+'('+pos.r+','+pos.c+') '+ent.hp+'/'+ent.maxHp+'血';
      if(ent.atk!==null&&ent.atk!==undefined)first+=' 攻'+ent.atk;
    }else if(ent.type==='player_castle'){
      first='🏰我方城堡('+pos.r+','+pos.c+') '+ent.hp+'/'+ent.maxHp+'血';
    }else if(ent.type==='enemy_castle'){
      first='🏰敌方城堡('+pos.r+','+pos.c+') '+ent.hp+'/'+ent.maxHp+'血';
    }else{
      first=esc(ent.name||'?')+'('+pos.r+','+pos.c+') '+ent.hp+'/'+ent.maxHp+'血';
    }
    lines.push('<div style="font-weight:bold;color:#4a3f35">'+first+'</div>');

    // ── 怪物威胁 (仅英雄格) ──
    if(ent&&ent.type==='hero'){
      var thr=sc.threats||[];
      if(thr.length>0){
        lines.push(SEC+'怪物威胁');
        thr.forEach(function(t){
          var aliveTag=t.alive?'若存活':'(已死亡，威胁取消)';
          var atkDesc=t.attackType||'攻击';
          var fromRC=(t.fromR!==undefined&&t.fromC!==undefined)?'从('+t.fromR+','+t.fromC+')'+atkDesc:'';
          var toRC=(t.toR!==undefined&&t.toC!==undefined)?'→('+t.toR+','+t.toC+')':'';
          lines.push(ITEM+(t.stableId||t.label)+'   打'+t.dmg+'血 ('+fromRC+toRC+')  '+aliveTag);
        });
      }
      // 爆炸波及
      var expSrcs=sc.explosionSources||[];
      if(expSrcs.length>0){
        if(thr.length===0)lines.push(SEC+'爆炸波及');
        expSrcs.forEach(function(es){
          lines.push(ITEM+'来自('+es.r+','+es.c+') 💥'+EC[es.element]+es.layers+'层爆炸 波及伤: -'+es.layers);
        });
      }
      // 伤害合计
      var res=sc.result;
      if(res&&(res.totalDamage>0||thr.length>0||expSrcs.length>0)){
        var sumText='';
        if(res.willDie)sumText='→ 倒下(剩'+res.surviveHp+')';
        else sumText='，存活(剩'+res.surviveHp+')';
        lines.push(SEC+'伤害合计   -'+res.totalDamage+sumText);
      }
    }

    // ── 元素层 ──
    var hasEl=false;
    ES.forEach(function(el){
      var v=ef[el]; if(!v||(v.boardLayers||0)+(v.addedLayers||0)===0&&(v.layers||0)===0)return;
      hasEl=true;
    });
    if(hasEl){
      lines.push(SEC+'元素层');
      var isMonsterOrSummon=ent&&(ent.type==='monster'||ent.type==='summon');
      var isCastle=ent&&(ent.type==='player_castle'||ent.type==='enemy_castle');
      ES.forEach(function(el){
        var v=ef[el]; if(!v||!v.layers)return;
        var board=v.boardLayers||v.beforeLayers||0;
        var added=v.addedLayers||v.addLayers||0;
        if(board>0)lines.push(ITEM+'当前     '+EC[el]+': '+board+'层');
        // 行动来源详情
        var acts=(sc.incomingActions||[]).filter(function(a){return a.element===el;}).sort(function(a,b){return (a.sequenceIndex||0)-(b.sequenceIndex||0);});
        acts.forEach(function(a){
          var hName=a.heroName||(a.heroId==='ha'?'焱A':'岚B');
          var slotN='H'+(a.heroId==='ha'?'1':'2')+'-S'+(a.slotIndex||'?');
          var dirChar={up:'↑',down:'↓',left:'←',right:'→'};
          var d=dirChar[a.dir]||a.dir||'';
          var effects=a.resolvedEffects||[];
          var mode='';
          if(effects.indexOf('explosionCenter')>=0)mode='十字中心';
          else if(effects.indexOf('splash')>=0)mode='十字波及';
          else mode='目标格';
          if(effects.indexOf('ignored')>=0)mode+='(英雄免疫)';
          var fromRC=(a.fromR!==undefined)?'从('+a.fromR+','+a.fromC+')释放':'';
          var desc=hName+' '+mode+' '+d+' '+fromRC;
          lines.push(ITEM+slotN+'      '+EC[el]+': +'+a.amount+'层 ('+desc+')');
        });
        lines.push(SEC+'预计     '+EC[el]+': '+v.layers+'层'+(v.layers>=3&&!isMonsterOrSummon&&!isCastle&&!(ent&&ent.type==='hero')?' → 💥爆炸':''));
      });
    }

    // ── 本格元素伤害 (实体格非英雄，结算层≥1) ──
    if(hasEl&&ent&&ent.type!=='hero'){
      var isMonSumCastle=ent.type==='monster'||ent.type==='summon'||ent.type==='player_castle'||ent.type==='enemy_castle';
      if(isMonSumCastle){
        var hasDmg=false;
        ES.forEach(function(el){var v=ef[el];if(v&&(v.directDamage||0)>0)hasDmg=true;});
        if(hasDmg){
          if(ent.type==='player_castle'){
            lines.push(SEC+'本格元素伤害 [我方城堡免疫我方元素]');
          }else{
            lines.push(SEC+'本格元素伤害');
          }
          ES.forEach(function(el){
            var v=ef[el]; if(!v||!v.layers||!v.directDamage)return;
            var tri='1';
            for(var i=2;i<=v.layers;i++)tri+='+'+i;
            tri+='='+v.directDamage;
            lines.push(ITEM+EC[el]+v.layers+'层   三角伤 '+tri);
          });
        }
      }
    }

    // ── 爆炸结算 (空地，结算层≥3) ──
    if(sc.willExplode){
      lines.push(SEC+'爆炸结算');
      ES.forEach(function(el){
        var v=ef[el]; if(!v||!v.layers||v.layers<3)return;
        var tri='1';
        for(var i=2;i<=v.layers;i++)tri+='+'+i;
        tri+='='+(v.directDamage||0);
        lines.push(ITEM+'中心伤  三角伤 '+tri);
        lines.push(ITEM+'波及伤  层数直伤 '+(v.splashDamage||v.layers)+' (上下左右各-'+(v.splashDamage||v.layers)+')');
      });
      var st=sc.splashTargets||[];
      if(st.length>0)lines.push(ITEM+'波及格  '+st.join(' '));
    }

    // ── 波及伤害 (被其他格爆炸扫到，有实体) ──
    var expSrcs2=sc.explosionSources||[];
    if(!sc.willExplode&&expSrcs2.length>0&&ent&&ent.type!=='hero'){
      lines.push(SEC+'波及伤害');
      expSrcs2.forEach(function(es){
        lines.push(ITEM+'来自('+es.r+','+es.c+') 💥'+EC[es.element]+es.layers+'层爆炸 波及伤: -'+es.layers);
      });
    }

    // ── 伤害合计 (实体格非英雄) ──
    if(ent&&ent.type!=='hero'){
      var res2=sc.result;
      if(res2&&res2.totalDamage>0){
        var sum2='';
        if(res2.willDie)sum2='≥ 当前'+ent.hp+'血 ☠';
        else sum2='，存活(剩'+res2.surviveHp+')';
        lines.push(SEC+'伤害合计   -'+res2.totalDamage+sum2);
      }
    }

    // ── 英雄不承受本格元素伤害 ──
    if(ent&&ent.type==='hero'&&hasEl){
      lines.push(SEC+'英雄不承受本格元素伤害');
    }

    return'<div class="dbg-cell">'+lines.join('<br>')+'</div>';
  }

  // ── 顶部状态条 ──
  var stateHtml='<span class="dbg-k">phase</span> '+vm.phase
    +' <span class="dbg-k">D</span>'+vm.day+'<span class="dbg-k">h</span>'+vm.dayHalf
    +' <span class="dbg-k">R</span>'+vm.round+'/'+vm.maxRound
    +' <span class="dbg-k">波</span>'+vm.wave
    +' <span class="dbg-k">金币</span>'+vm.gold;
  // ── 格子区 ──
  var cellHtml='';
  if(vm.selectedCell){
    cellHtml='<div><span class="dbg-lb" style="display:inline">📍</span> ['+vm.selectedCell.r+','+vm.selectedCell.c+']</div>';
    cellHtml+=buildCellTree(vm.selectedCell);
  }else{
    cellHtml='<div class="dbg-cell"><span class="dbg-k">（点击格子查看）</span></div>';
  }
  // ── 怪物列表 ──
  var monHtml=vm.monsters.length
    ? vm.monsters.map(function(m){
        var w=m.nextWarn;
        var warn=w?' <span class="dbg-exp">'+(w.type==='atk'?'⚔攻击':w.type==='mov'?'M步':'?')+'</span>':'';
        return '<span class="dbg-mon-item">👾'+m.name
          +' <span class="dbg-k">('+m.pos.r+','+m.pos.c+')</span>'
          +' <span class="dbg-k">HP</span>'+m.hp
          +warn+'</span>';
      }).join('')
    : '<div><span class="dbg-k">无存活怪物</span></div>';
  // ── 行动槽 ──
  var slotHtml=vm.slots.map(function(s){
    var usedCls=s.used?'<span style="color:#6a8e6a">✓</span>':'<span style="color:#8b7d6b">○</span>';
    var dirLb={up:'↑',down:'↓',left:'←',right:'→'};
    return '<span class="dbg-slot-item">'+usedCls+' #'+(s.i+1)+' '
      +(s.el?'<span style="color:'+(ELIC2[s.el]||'#8b7d6b')+'">'+s.el.substring(0,3)+'</span> ':'')
      +'h'+s.hid
      +' s'+s.sn+(s.dir?dirLb[s.dir]||s.dir:'')
      +(s.used?'':' <span class="dbg-detail">'+(s.skill||'')+'</span>')
      +'</span>';
  }).join('');
  // ── 引擎/成长 ──
  var eng=vm.engineStats;
  var gr=vm.growth;
  var engHtml='<span class="dbg-eng-item"><span class="dbg-k">召</span>'+eng.summonCount
    +'</span><span class="dbg-eng-item"><span class="dbg-k">疗</span>'+eng.healCount
    +'</span><span class="dbg-eng-item"><span class="dbg-k">连</span>'+eng.chainCount
    +'</span><span class="dbg-eng-item"><span class="dbg-k">完美</span>'+eng.perfectCount
    +'</span><span class="dbg-eng-item"><span class="dbg-k">成长</span>'
    +'召T'+gr.summonTier+' 疗T'+gr.healTier+' 连T'+gr.chainTier+'</span>';
  // ── actionLog ──
  var logHtml=vm.actionLogTail.length
    ? vm.actionLogTail.map(function(a){
        var d=a.desc||a.type;
        if(a.type==='USE_SLOT'){d+=' [<span class="dbg-detail">'+(a.el||'')+' sn'+(a.sn)+' '+(a.dir||'')+'</span>]'+(a.cells?' <span class="dbg-detail">'+a.cells.join(',')+'</span>':'');}
        if(a.type==='MOVE_HERO'){d+=' <span class="dbg-detail">'+a.from.r+','+a.from.c+'</span><span class="dbg-arrow">→</span><span class="dbg-detail">'+a.to.r+','+a.to.c+'</span>';}
        return d;
      }).join('<br>')
    : '<span class="dbg-k">（空）</span>';
  // ── 组装 ──
  el.innerHTML='<div class="dbg-bar">🛠 调试书记板 <span style="color:#8b7d6b;font-weight:400">'+(docked?'只读侧栏':'← 拖拽 · D 切换')+'</span></div>'
    +'<div class="dbg-sec">'+stateHtml+'</div>'
    +'<div class="dbg-sec"><span class="dbg-lb">📍 格子</span>'+cellHtml+'</div>'
    +'<div class="dbg-sec"><span class="dbg-lb">👾 怪物</span><div class="dbg-mon-list">'+monHtml+'</div></div>'
    +'<div class="dbg-sec"><span class="dbg-lb">🎯 行动槽</span><div class="dbg-slot">'+slotHtml+'</div></div>'
    +'<div class="dbg-sec"><span class="dbg-lb">⚙️ 引擎</span><div class="dbg-eng">'+engHtml+'</div></div>'
    +'<div class="dbg-sec"><span class="dbg-lb">📝 日志</span><div class="dbg-log">'+logHtml+'</div></div>';
  // ── 拖拽 ──
  if(docked)return;
  var bar=el.querySelector('.dbg-bar');
  if(bar&&!bar._dragInited){bar._dragInited=1;var ox=0,oy=0,on=0;
    bar.addEventListener('mousedown',function(e){on=1;var S=window._gameScale||1;ox=(e.clientX-(window._gameShellOffX||0))/S-el.offsetLeft;oy=(e.clientY-(window._gameShellOffY||0))/S-el.offsetTop;bar.classList.add('dragging');e.preventDefault();});
    document.addEventListener('mousemove',function(e){if(!on)return;var S=window._gameScale||1;var lx=(e.clientX-(window._gameShellOffX||0))/S-ox;var ly=(e.clientY-(window._gameShellOffY||0))/S-oy;el.style.left=Math.max(0,Math.min(1280-el.offsetWidth,lx))+'px';el.style.top=Math.max(0,Math.min(720-el.offsetHeight,ly))+'px';});
    document.addEventListener('mouseup',function(){on=0;bar.classList.remove('dragging');});
  }
}

function dispatchGameAction(action){
  applyActionToState(action);
  pushReplayStep(action);
  recomputeCorePreview();
  if(typeof document!=='undefined')render();
}

function applyActionToState(action){
  if(!G.actionLog)G.actionLog=[];
  switch(action.type){
    case 'MOVE_HERO':{
      const hero=G.heroes[action.heroId];
      if(!hero||hero._acted)return;
      if(G.phase!=='PLAYER'||heroAt(action.to)||monAt(action.to)||summonAt(action.to)||hasElementAt(action.to))return;
      if(castleAt(action.to))return;
      const from={r:hero.pos.r,c:hero.pos.c};
      hero.pos={r:action.to.r,c:action.to.c};
      if(G.selectedCell&&G.selectedCell.r===from.r&&G.selectedCell.c===from.c){G.selectedCell={r:action.to.r,c:action.to.c};}
      G.actionLog.push({type:'MOVE_HERO',heroId:action.heroId,from,to:action.to});
      G.prevCells=[]; G.selSlot=null; G.heroPrev=[];
      break;
    }
    case 'SELECT_ACTION_SLOT':{
      G.selSlot=G.selSlot===action.slotId?null:action.slotId;
      G.selHero=null; G.explPos=null; G.heroPrev=[];
      updPreview();
      break;
    }
    case 'UPDATE_ACTION_SLOT':{
      const s=G.slots[action.slotId];
      if(!s)return;
      if(action.heroId!==undefined)s.hid=action.heroId;
      if(action.element!==undefined)s.el=action.element;
      if(action.direction!==undefined)s.dir=action.direction;
      if(G.selSlot===action.slotId)updPreview();
      break;
    }
    case 'SET_ACTION_DIRECTION':{
      const s=G.slots[action.slotId];
      if(!s)return;
      s.dir=action.direction;
      if(G.selSlot===action.slotId)updPreview();
      break;
    }
    case 'SET_ACTION_TARGET':{
      const s=G.slots[action.slotId];
      if(s&&action.targetCell!==undefined)s.targetCell=action.targetCell;
      break;
    }
    case 'USE_SLOT':{
      // 委托 battle.js 的 useSlot 处理全部逻辑
      useSlot(action.slotId);
      break;
    }
    default:break;
  }
}

// refreshUI() = 显式 recompute + render，用于非 dispatchGameAction 的直接调用路径
function refreshUI(){
  recomputeCorePreview();
  if(!G)return;
  const vm=buildBattleVM();
  renderBoard(vm.board);
  renderHS(vm.heroes);
  renderSlots(vm.slots);
  renderTurn(vm.turn);
  if(G.selectedCell){
    renderCellDetail(getSelectedCellPreview(G));
  }else{
    const cdEl=document.getElementById('cd');
    if(cdEl)cdEl.style.display='none';
  }
  scheduleDebugPanelUpdate();
}

// ─── View 层（只接受 VM 参数，只创建 DOM，不计算规则）───
// render() 是纯 View：不计算规则，调用方负责先调 recomputeCorePreview()
function render(){
  if(!G)return;
  const vm=buildBattleVM();
  renderBoard(vm.board);
  renderHS(vm.heroes);
  renderSlots(vm.slots);
  renderTurn(vm.turn);
  if(G.selectedCell){
    renderCellDetail(getSelectedCellPreview(G));
  }else{
    const cdEl=document.getElementById('cd');
    if(cdEl)cdEl.style.display='none';
  }
  scheduleDebugPanelUpdate();
}

function renderBoard(boardVM){
  const board=document.getElementById('board');
  board.innerHTML='';
  // 中文短字元素着色
  const EL_CLASS={火:'b-el-f',水:'b-el-w',风:'b-el-i',土:'b-el-e'};
  function _colorBrief(b){
    // "英1打1 火3 总3" → 元素着色、总伤害高亮
    return b.replace(/([火水风土])(\d+)/g,'<span class="$1'+String.fromCharCode(8203)+'$2">$1$2</span>')
            .replace(/总(\d+)/g,'<span class="b-sum">总$1</span>');
  }
  // 修正 class 名
  function _fixCls(s){return s.replace(/([火水风土])​(\d+)/g,(_,el,d)=>(EL_CLASS[el]||'')+'">'+el+d+'</span>');}

  // 覆写 _colorBrief：避免 ZWS class 名导致渲染乱码
  _colorBrief=function(b){
    return b.replace(/([\u706b\u6c34\u98ce\u571f])(\d+)/g,function(_,el,d){return '<span class="'+(EL_CLASS[el]||'')+'">'+el+d+'</span>';})
            .replace(/\u603b(\d+)/g,'<span class="b-sum">\u603b$1</span>');
  };
  boardVM.forEach(cv=>{
    const cell=document.createElement('div');
    cell.className='cell';
    cv.classes.forEach(cls=>cell.classList.add(cls));

    // ── 实体块：永远显示实体 icon，brief 单独贴底显示 ──
    const brief=cv.displayBrief||'';
    const briefHtml=brief?_colorBrief(brief):'';
    let entHtml='',entCls='',isEntityCell=false;
    if(cv.castle){
      const isP=cv.castle.side==='player';
      entCls='ib-e ib-c '+(isP?'ib-cp':'ib-ce');
      entHtml=`<span>🏰</span>`;
      isEntityCell=true;
    }else if(cv.hero){
      entCls='ib-e ib-h ib-'+(cv.hero.id==='ha'?'ha':'hb')+(cv.hero.isSel?' sel':'');
      const heroLabel=cv.hero.id==='ha'?'英1':'英2';
      entHtml=`<span>${heroLabel}</span>`;
      isEntityCell=true;
    }else if(cv.mon){
      entCls='ib-e ib-m'+(cv.mon.willDie?' ib-m-die':'');
      entHtml=`<span>👾</span>`;
      isEntityCell=true;
    }else if(cv.summon){
      entCls='ib-e ib-s';
      entHtml=`<span>💧</span>`;
      isEntityCell=true;
    }else if(briefHtml){
      // 空元素格：brief 居中显示
      entCls='ib-e ib-el-only';
      entHtml=`<span class="ib-brief">${briefHtml}</span>`;
    }else if(cv.el){
      entCls='ib-e ib-el-only';
      entHtml='<span class="ib-empty">·</span>';
    }
    if(entHtml){
      const entEl=document.createElement('div');
      entEl.className=entCls||'ib-e';
      entEl.innerHTML=entHtml;
      if(cv.hero)entEl.onclick=(e)=>{e.stopPropagation();selHero(cv.hero.id);};
      cell.appendChild(entEl);
    }

    // ── 贴底短字条：实体格子的攻击/伤害信息 ──
    if(briefHtml&&isEntityCell){
      const stripEl=document.createElement('div');
      stripEl.className='ib-strip';
      stripEl.innerHTML=briefHtml;
      cell.appendChild(stripEl);
    }

    // ── 右上角徽章：致死/爆炸 ──
    const corners=[];
    if(cv.mon&&cv.mon.willDie)corners.push('☠');
    if(cv.pvWillExplode&&!cv.mon)corners.push('💥');
    if(corners.length>0){
      const cornerEl=document.createElement('div');
      cornerEl.className='ib-corner';
      cornerEl.textContent=corners.join('');
      cell.appendChild(cornerEl);
    }

    // ── 元素预览覆盖层 ──
    if(cv.pvEl){
      const ovl=document.createElement('div');
      ovl.className='hp-ovl';
      ovl.style.background=EC[cv.pvEl];
      ovl.style.opacity=cv.pvOpacity;
      cell.appendChild(ovl);
    }

    // ── 伤害数字徽标（空格被波及）──
    if(cv.monDmg!==null&&!cv.mon){
      const badge=document.createElement('div');
      badge.className='dmg-badge';
      badge.textContent=`-${cv.monDmg}`;
      cell.appendChild(badge);
    }

    cell.onclick=()=>onCell(cv.r,cv.c);
    board.appendChild(cell);
  });
}

function k(p){return`${p.r},${p.c}`;}
function getSelectedCellPreview(state){
  const key=state.selectedCell;
  if(!key)return null;
  const sk=`${key.r},${key.c}`;
  return state.coreSnapshot?.previewGrid?.grid?.[sk]||null;
}

function renderCellDetail(cell){
  const cdEl=document.getElementById('cd');
  if(!cdEl||!cell)return;
  const{r,c}=cell.pos;
  const ELICON={fire:'🔥',water:'💧',wind:'🌬',earth:'🪨'};
  const ELNAME={fire:'火',water:'水',wind:'风',earth:'土'};
  const{entity,elementField,preview}=cell;
  const blocks=[];
  // 位置头
  let header=`<div class="cd-pos">📍 [${r},${c}]<button class="cd-close" onclick="G.selectedCell=null;refreshUI()">×</button></div>`;

  // ── 块1：实体 ──
  let eHtml='';
  if(!entity||!entity.type){
    eHtml='<span class="cd-empty">空地</span>';
  }else if(entity.type==='monster'){
    const td=preview.entityDamage||0;
    const willDie=td>=entity.hp&&entity.hp>0;
    eHtml=`<div>👾 ${entity.name}</div><div>HP ${entity.hp}/${entity.maxHp} 攻 ${entity.atk||'?'}${entity.el?` ${ELICON[entity.el]}`:''}</div>`;
    if(td>0)eHtml+=`<div style="color:${willDie?'#fff':'#c4675a'};background:${willDie?'#c4675a':'rgba(220,38,38,0.15)'};padding:2px 6px;border-radius:3px;margin-top:3px;">预计承伤 ${td}${willDie?' ☠致死':''}</div>`;
    const sd=preview.selfCellDamage||{total:0};
    const sp=preview.splashDamage||{total:0};
    if(sd.total>0)eHtml+=`<div style="font-size:12px;color:var(--c-text2);margin-top:2px;">单体:${sd.total} 波及:${sp.total}</div>`;
  }else if(entity.type==='hero'){
    const thr=preview.threatFromMonsters||[];
    const actedTag=entity._acted?'<span style="color:#b87440;font-size:12px;margin-left:4px;">⚡已行动</span>':'<span style="color:#7a9e7a;font-size:12px;margin-left:4px;">▶可行动</span>';
    eHtml=`<div style="color:${entity.id==='ha'?'#7b9db5':'#7a9e7a'}">英雄${entity.id==='ha'?'A':'B'} ${entity.name}${actedTag}</div><div>HP ${entity.hp}/${entity.maxHp}</div>`;
    // 行动槽
    if(entity.slots&&entity.slots.length>0){
      eHtml+=`<div style="margin-top:3px;font-size:12px;color:#8b7d6b;">⚔ 行动槽 (${entity.slots.length})</div>`;
      entity.slots.forEach(s=>{
        eHtml+=`<div style="font-size:12px;color:${EC[s.el]};padding-left:8px;">${ELICON[s.el]} ${s.label} ${s.dir}</div>`;
      });
    }else if(!entity._acted){
      eHtml+=`<div style="font-size:12px;color:#8b7d6b;margin-top:2px;">无可用行动槽</div>`;
    }
    // 来自我方另一英雄的元素叠层（preview.incomingActions 中非自身英雄的）
    const allyActions=(preview.incomingActions||[]).filter(a=>a.heroId!==entity.id);
    if(allyActions.length>0){
      const byEl={};
      allyActions.forEach(a=>{byEl[a.element]=(byEl[a.element]||0)+a.amount;});
      eHtml+=`<div style="margin-top:3px;font-size:12px;color:#5e95b5;">📥 友方叠层</div>`;
      Object.entries(byEl).forEach(([el,amt])=>{
        eHtml+=`<div style="font-size:12px;color:${EC[el]};padding-left:8px;">${ELICON[el]} +${amt}层</div>`;
      });
    }
    // 怪物威胁
    if(thr.length>0){
      const td=thr.reduce((s,t)=>s+t.dmg,0);
      eHtml+=`<div style="color:#6a5080;margin-top:3px;">⚠ 威胁 ×${thr.length} 总伤 ${td}`;
      thr.forEach(t=>{eHtml+=`<div style="font-size:12px;color:#6ea86c;">${t.label} -${t.dmg}</div>`;});
      eHtml+=`</div>`;
    }
  }else if(entity.type==='summon'){
    eHtml=`<div>💧 ${entity.name}</div><div>HP ${entity.hp}/${entity.maxHp} ⚔${entity.atk||0}</div>`;
  }else if(entity.type==='player_castle'){
    eHtml=`<div>🏰 我方城堡</div><div>HP ${entity.hp}/${entity.maxHp}</div>`;
  }else if(entity.type==='enemy_castle'){
    eHtml=`<div>🏰 敌方城堡</div><div>HP ${entity.hp}/${entity.maxHp}</div>`;
  }
  blocks.push(`<div class="cd-block"><div class="cd-blkt">实体</div>${eHtml}</div>`);

  // ── 块2：战斗摘要（来自 coreSnapshot._cellBriefs，debug 面板同源）──
  const dd=(G.coreSnapshot?._cellBriefs||{})[cell.cellKey]?.detail||{};
  let combatHtml='';
  if(dd.type==='monster'||dd.type==='summon'){
    if(dd.attackers&&dd.attackers.length>0)combatHtml+=`<div style="font-weight:bold;margin-bottom:4px;">${dd.attackers.join('')} 攻击 ${dd.target}</div>`;
    else if(dd.total>0)combatHtml+=`<div style="font-weight:bold;margin-bottom:4px;">${dd.target} 受到元素伤害</div>`;
    var elLines=[];
    if(dd.fire>0)elLines.push(`<div style="font-size:13px;color:${EC.fire};padding-left:8px;">🔥 火伤害 ${dd.fire}</div>`);
    if(dd.water>0)elLines.push(`<div style="font-size:13px;color:${EC.water};padding-left:8px;">💧 水伤害 ${dd.water}</div>`);
    if(dd.wind>0)elLines.push(`<div style="font-size:13px;color:${EC.wind};padding-left:8px;">🌬 风伤害 ${dd.wind}</div>`);
    if(dd.earth>0)elLines.push(`<div style="font-size:13px;color:${EC.earth};padding-left:8px;">🪨 土伤害 ${dd.earth}</div>`);
    if(elLines.length>0)combatHtml+=elLines.join('');
    if(dd.splash>0)combatHtml+=`<div style="font-size:13px;color:#b87440;padding-left:8px;">💥 爆炸波及 ${dd.splash}</div>`;
    if(dd.total>0)combatHtml+=`<div style="font-size:13px;color:#b87440;margin-top:2px;">总伤害 ${dd.total}</div>`;
    if(dd.willDie)combatHtml+=`<div style="color:#c4675a;font-weight:bold;margin-top:2px;">☠ 致死</div>`;
  }else if(dd.type==='hero'){
    combatHtml=`<div style="font-weight:bold;margin-bottom:4px;">${(dd.attackers||[]).join('')} 攻击 ${dd.target}</div>`;
    if(dd.incoming>0)combatHtml+=`<div style="font-size:13px;color:#b87440;margin-top:2px;">总受击伤害 ${dd.incoming}</div>`;
  }else if(dd.type==='castle'){
    if(dd.attackers&&dd.attackers.length>0)combatHtml+=`<div style="font-weight:bold;margin-bottom:4px;">${dd.attackers.join('')} 攻击${dd.target}</div>`;
    if(dd.fire>0)combatHtml+=`<div style="font-size:13px;color:${EC.fire};padding-left:8px;">🔥 火伤害 ${dd.fire}</div>`;
    if(dd.water>0)combatHtml+=`<div style="font-size:13px;color:${EC.water};padding-left:8px;">💧 水伤害 ${dd.water}</div>`;
    if(dd.monsterDmg>0)combatHtml+=`<div style="font-size:13px;color:#6a5080;padding-left:8px;">怪物伤害 ${dd.monsterDmg}</div>`;
    if(dd.total>0)combatHtml+=`<div style="font-size:13px;color:#b87440;margin-top:2px;">总伤害 ${dd.total}</div>`;
  }else if(dd.type==='empty'){
    combatHtml=`<div style="font-weight:bold;">元素场：${dd.elements||'无'}</div>`;
    if(dd.total>0)combatHtml+=`<div style="font-size:13px;color:#b87440;margin-top:2px;">总元素伤害 ${dd.total}</div>`;
  }
  if(combatHtml){
    blocks.push(`<div class="cd-block"><div class="cd-blkt">战斗摘要</div>${combatHtml}</div>`);
  }

  // ── 块3：元素场 ──
  const elEntries=Object.entries(elementField).filter(([,v])=>v.layers>0);
  let elHtml='';
  if(elEntries.length===0){
    elHtml='<span class="cd-empty">无</span>';
  }else{
    elEntries.forEach(([el,v])=>{
      elHtml+=`<div class="cd-badge" style="color:${EC[el]};margin:2px 0;">${ELICON[el]}${ELNAME[el]} ${v.boardLayers}层${v.addedLayers>0?` +${v.addedLayers}预叠 → ${v.layers}层`:''} 伤害${v.damage}</div>`;
    });
  }
  blocks.push(`<div class="cd-block"><div class="cd-blkt">元素场</div>${elHtml}</div>`);

  // ── 块3：结算 ──
  let settleHtml='';
  if(entity&&entity.type==='monster'){
    // no extra, entity block already shows damage
    settleHtml='<span class="cd-empty" style="font-size:12px;">见实体块伤害</span>';
  }else if(preview.willExplode){
    const expEls=preview.explosionElements||[{element:preview.explosionElement,layers:0,damage:preview.explosionDamage}];
    expEls.forEach(e=>{
      settleHtml+=`<div style="color:#b87440;">💥 ${ELICON[e.element]}${e.layers}层 → 十字引爆 伤害${e.damage}</div>`;
    });
    settleHtml+=`<div style="font-size:12px;color:var(--c-text2);">波及: ${(preview.splashTargets||[]).join(' ')}</div>`;
  }else{
    const maxLayers=elEntries.length>0?Math.max(...elEntries.map(([,v])=>v.layers)):0;
    const gap=G.explosionThreshold-maxLayers;
    settleHtml=gap>0?`<span class="cd-empty">还需 ${gap} 层引爆</span>`:'<span class="cd-empty">未达阈值</span>';
  }
  blocks.push(`<div class="cd-block"><div class="cd-blkt">结算</div>${settleHtml}</div>`);

  // ── 块5：行动来源（按英雄分组）──
  const acts=preview.incomingActions||[];
  let srcHtml='';
  if(acts.length===0){
    srcHtml='<span class="cd-empty">无</span>';
  }else{
    const byHero={};
    acts.forEach(a=>{
      if(!byHero[a.heroId])byHero[a.heroId]=[];
      byHero[a.heroId].push(a);
    });
    Object.entries(byHero).forEach(([hid,as])=>{
      const tag=hid==='ha'?'A':'B';
      srcHtml+=`<div style="margin:4px 0;"><span style="color:${hid==='ha'?'#7b9db5':'#7a9e7a'};font-weight:bold;">英雄${tag}</span>`;
      as.forEach(a=>{
        srcHtml+=`<div style="font-size:12px;color:var(--c-text2);padding-left:8px;">槽 ${a.description}</div>`;
      });
      srcHtml+=`</div>`;
    });
  }
  blocks.push(`<div class="cd-block"><div class="cd-blkt">行动来源</div>${srcHtml}</div>`);

  cdEl.innerHTML=header+blocks.join('');
  cdEl.style.display='block';
}

function onCell(r,c){
  hideTT();
  if(G.selHero){
    // 点击实体格 → 清除选中并显示格子详情，不尝试移动
    if(heroAt({r,c})||monAt({r,c})||summonAt({r,c})||castleAt({r,c})){
      G.selHero=null; G.prevCells=[]; G.heroPrev=[];
      G.selectedCell={r,c};
      refreshUI();
      return;
    }
    moveHero(r,c);
    return;
  }
  G.selectedCell=(G.selectedCell&&G.selectedCell.r===r&&G.selectedCell.c===c)?null:{r,c};
  refreshUI();
}

function showTT(r,c,e){
  if(G.phase!=='PLAYER')return;
  const bc=G.board[r][c]; if(!bc.el)return;
  G.explPos={r,c}; refreshUI();
  const dmg=explDmg(bc.stk);
  document.getElementById('ttc').innerHTML=`
    <div class="ttl"><b style="color:${EC[bc.el]}">${EL[bc.el]}元素格</b></div>
    <div class="ttl">层数：${bc.stk}</div>
    <div class="ttl">引爆伤害：${dmg}</div>
    <div class="ttl">范围：十字5格（含中心）</div>
    <button class="ttc" onclick="hideTT();G.explPos=null;refreshUI()">关闭</button>
  `;
  const tt=document.getElementById('tt');
  const bnd=e.target.getBoundingClientRect();
  const S=window._gameScale||1;
  const sox=window._gameShellOffX||0;
  const soy=window._gameShellOffY||0;
  let lft=(bnd.right-sox)/S+8;
  let tp=(bnd.top-soy)/S;
  if(lft+150>1280)lft=(bnd.left-sox)/S-160;
  tt.style.left=lft+'px'; tt.style.top=tp+'px';
  tt.style.display='block';
}
function hideTT(){document.getElementById('tt').style.display='none';}

function renderHS(heroesVM){
  const PORTRAITS={ha:'⚔️',hb:'🔮'};
  const TYPES={ha:'近战·物理',hb:'远程·法术'};
  let h='';
  heroesVM.forEach(hero=>{
    const isSel=G.selHero===hero.id;
    const unit=getUnitByHeroId?.(hero.id);
    const lvl=unit?unit.level:1;
    const portrait=PORTRAITS[hero.id]||'🧙';
    const typeLabel=TYPES[hero.id]||'';
    h+=`<div class="hero-card${isSel?' sel':''}" onclick="selHero('${hero.id}')">
      <div class="hc-portrait">${portrait}</div>
      <div class="hc-nameline">
        <span class="hc-name">${hero.name}</span>
        <span class="hc-lv">Lv.${lvl}</span>
      </div>
      <div class="hc-hp-row">
        <span class="hc-hp-icon">♥</span>
        <span class="hc-hp-txt">${hero.hp}/${hero.maxHp}</span>
        <div class="hc-hpbar"><div class="hc-hpfill" style="width:${hero.pct}%;background:#c84040"></div></div>
      </div>
      <span class="hc-type">${typeLabel}</span>
      <div class="hc-coord">📍 (${hero.pos.r},${hero.pos.c})</div>
    </div>`;
  });
  document.getElementById('hs').innerHTML=h;
}

function renderSlots(slotsVM){
  // Group slots by hero
  const groups={};
  const heroOrder=[];
  slotsVM.forEach(s=>{
    if(!groups[s.hid]){groups[s.hid]=[];heroOrder.indexOf(s.hid)===-1&&heroOrder.push(s.hid);}
    groups[s.hid].push(s);
  });
  const dirLabels={up:'↑',down:'↓',left:'←',right:'→'};
  const HERO_ICON={ha:'⚔',hb:'🔮'};
  const HERO_TYPE={ha:'近战·物理',hb:'远程·法术'};
  const usedCount=slotsVM.filter(s=>s.used).length;
  const totalCount=slotsVM.length;
  const countEl=document.getElementById('slot-count');
  if(countEl)countEl.textContent=`(${totalCount-usedCount}/${totalCount})`;
  let h='';
  heroOrder.forEach(hid=>{
    const hero=G.heroes[hid];
    if(!hero)return;
    const hIcon=HERO_ICON[hid]||'◆';
    const hType=HERO_TYPE[hid]||'';
    h+=`<div class="asl-hero-group">
      <div class="asl-hero-label">${hIcon} ${hero.name} <span style="font-size:13px;font-weight:normal;color:var(--c-text2)">(${hType})</span></div>`;
    groups[hid].forEach(s=>{
      const cls=`as-card${s.used?' used':''}${s.isSel?' sel':''}`;
      const shapeHtml=shapeHTML(s.sn,s.el,6);
      const tierVal=TIER_MULT[s.tier]||1;
      const localIdx=groups[hid].indexOf(s)+1;
      h+=`<div class="${cls}" style="--slot-color:${EC[s.el]}" onclick="selSlot(${s.idx})">
        <span class="as-num" style="background:${EC[s.el]}">${localIdx}</span>
        <div class="as-meta">
          <span class="as-el">${EL[s.el]}符文</span>
          <span class="as-layer">灌注 ${tierVal} 层</span>
        </div>
        <span class="as-shape">${shapeHtml}</span>
        <div class="as-controls">
          <div class="as-dirs">
            ${['up','left','right','down'].map(d=>`<div class="as-dir-btn${s.dir===d?' active':''}" onclick="event.stopPropagation();setDir(${s.idx},'${d}')">${dirLabels[d]}</div>`).join('')}
          </div>
          <button class="as-use-btn" onclick="event.stopPropagation();useSlot(${s.idx})" ${s.disabled?'disabled':''}>${s.used?'✓':'⚔'}</button>
        </div>
      </div>`;
    });
    h+='</div>';
  });
  document.getElementById('asl').innerHTML=h;
}

function renderTurn(turnVM){
  const phText={PLAYER:'⚔️ 玩家回合',MONSTER:'👾 怪物行动中…',SHOP:'🛒 商店阶段',OVER:'💀 游戏结束'};
  const dayLabel=`第${turnVM.day||turnVM.wave}天`;
  const halfLabel=turnVM.dayHalf===0?'晨曦':(turnVM.dayHalf===1?'午后':'暮色');
  const halfIcon=turnVM.dayHalf===0?'☀️':'🌤️';
  // Bottom bar
  document.getElementById('ph').textContent=phText[turnVM.phase]||turnVM.phase;
  if(turnVM.phase==='SHOP'){
    document.getElementById('rc').textContent=`${dayLabel} · 商店阶段`;
  }else if(turnVM.phase==='OVER'){
    document.getElementById('rc').textContent=`${dayLabel}${halfLabel} · 战斗结束`;
  }else{
    document.getElementById('rc').textContent=`${dayLabel} · ${turnVM.round}/${turnVM.maxRound}小回合`;
  }
  const etb=document.getElementById('etb');
  if(etb)etb.disabled=turnVM.endTurnDisabled;
  const exa=document.getElementById('exa');
  if(exa){
    exa.disabled=turnVM.execAllDisabled||turnVM.aiBattleBusy;
    exa.textContent=turnVM.aiBattleLabel||'⚡ AI战斗';
    exa.title=turnVM.aiBattleHint||'AI 自动规划移动和符文施放';
    if(exa.classList&&typeof exa.classList.toggle==='function')exa.classList.toggle('ai-busy',!!turnVM.aiBattleBusy);
  }
  // Topbar elements
  const gold=document.getElementById('gold');
  if(gold)gold.textContent=turnVM.gold;
  const tbDay=document.getElementById('tb-day');
  if(tbDay)tbDay.textContent=turnVM.day||1;
  const tbWave=document.getElementById('tb-wave');
  if(tbWave)tbWave.textContent=turnVM.wave||1;
  const tbMaxWave=document.getElementById('tb-maxwave');
  if(tbMaxWave)tbMaxWave.textContent=turnVM.maxRound||2;
  const tbPhase=document.getElementById('tb-phase');
  if(tbPhase)tbPhase.textContent=`${halfLabel} ${halfIcon}`;
  const tbRc=document.getElementById('tb-rc');
  if(tbRc)tbRc.textContent=turnVM.phase==='SHOP'?'商店中':`${turnVM.round}/${turnVM.maxRound}回合`;
  // Castle HP bars
  if(G.playerCastle){
    const pct=Math.max(0,(G.playerCastle.hp/G.playerCastle.maxHp)*100);
    const bar=document.getElementById('p-castle-bar');
    if(bar)bar.style.width=pct+'%';
    const txt=document.getElementById('p-castle-txt');
    if(txt)txt.textContent=`${G.playerCastle.hp}/${G.playerCastle.maxHp}`;
  }
  if(G.enemyCastle){
    const pct=Math.max(0,(G.enemyCastle.hp/G.enemyCastle.maxHp)*100);
    const bar=document.getElementById('e-castle-bar');
    if(bar)bar.style.width=pct+'%';
    const txt=document.getElementById('e-castle-txt');
    if(txt)txt.textContent=`${G.enemyCastle.hp}/${G.enemyCastle.maxHp}`;
  }
  // Engine stats
  const esEl=document.getElementById('es');
  if(esEl&&turnVM.engineStats){
    const es=turnVM.engineStats;
    if(es.summonAlive>0||es.summonCount>0||es.healCount>0){
      esEl.style.display='';
      let txt=`🌀 场上${es.summonAlive} · 召${es.summonCount} · 疗${es.healCount}`;
      const g=es.growth;
      if(g&&(g.summonTier||g.healTier||g.chainTier))txt+=` T${g.summonTier}/${g.healTier}/${g.chainTier}`;
      esEl.textContent=txt;
    }else esEl.style.display='none';
  }
}

// #2 形状图形预览
function shapeHTML(sn,el,sz=7){
  const s=SD[sn]; if(!s)return'';
  const allPos=[[0,0],...s.cells];
  const minR=Math.min(...allPos.map(([r])=>r));
  const maxR=Math.max(...allPos.map(([r])=>r));
  const minC=Math.min(...allPos.map(([,c])=>c));
  const maxC=Math.max(...allPos.map(([,c])=>c));
  const rows=maxR-minR+1, cols=maxC-minC+1;
  const grid={};
  s.cells.forEach(([r,c])=>{grid[`${r-minR},${c-minC}`]='a';});
  grid[`${-minR},${-minC}`]='h';
  let h=`<div style="display:inline-grid;grid-template-columns:repeat(${cols},${sz}px);grid-template-rows:repeat(${rows},${sz}px);gap:1px;flex-shrink:0;">`;
  for(let r=0;r<rows;r++)for(let c=0;c<cols;c++){
    const t=grid[`${r},${c}`];
    h+=`<div style="width:${sz}px;height:${sz}px;border-radius:1px;background:${t==='a'?EC[el]:t==='h'?'#7b9db5':'#8b7d6b'};"></div>`;
  }
  return h+'</div>';
}

function renderShop(){
  document.getElementById('sg').textContent=G.gold;
  const rollCost=(SHOP_PRICE_CONFIG?.consumableBase?.roll)||1;
  const activeUnits=G.ownedUnits.filter(u=>u.active);
  const benchUnits=G.ownedUnits.filter(u=>!u.active);
  const allOwned=G.ownedUnits||[];
  const mergeHints={};
  allOwned.forEach(u=>{mergeHints[u.defId]=(mergeHints[u.defId]||0)+1;});
  (G.shopItems.units||[]).forEach(it=>{mergeHints[it.defId]=(mergeHints[it.defId]||0)+1;});
  const canMerge=Object.entries(mergeHints).filter(([,cnt])=>cnt>=3).map(([id])=>UNIT_DEFS[id]?.name).filter(Boolean);
  const dayLabel=G.dayHalf===2?'夜晚商店':'午后商店';
  const recommend=(canMerge.length>0)
    ?`优先合成：${canMerge.slice(0,2).join('、')}`
    : (G.gold<=2?'金币紧张，优先保留核心与经济节奏':'可刷新找关键件，注意转派成本');

  let h='';
  h+=`<div class="shop-grid">`;

  // 左栏：阵容与后效
  h+=`<div class="shop-col">
    <div class="sstt">⚔️ 阵容与后效</div>
    ${activeUnits.length===0&&benchUnits.length===0?'<div class="shop-note">还没有单位，先购买核心件。</div>':''}
    <div class="shop-alert">上阵 ${activeUnits.length}/2 · 可用备战 ${benchUnits.length}</div>
    <div class="sstt">上阵单位</div>
    ${activeUnits.map(u=>{
      const def=UNIT_DEFS[u.defId]; if(!def)return'';
      const lvl=def.levels[u.level];
      const nextLvl=def.levels[u.level+1]||null;
      const currentSlots=(lvl.slots||[]).map(slot=>`<div class="unit-slot-dot compact">${shapeHTML(slot.sn,slot.el,5)}<span class="unit-slot-meta">${EL[slot.el]}×${TIER_MULT[slot.tier]}</span></div>`).join('');
      const nextSlots=nextLvl?(nextLvl.slots||[]).map(slot=>`<div class="unit-slot-dot compact">${shapeHTML(slot.sn,slot.el,5)}<span class="unit-slot-meta">${EL[slot.el]}×${TIER_MULT[slot.tier]}</span></div>`).join(''):'';
      return `<div class="roster-card">
        <div class="roster-line"><span style="font-size:15px;font-weight:bold;color:#c4a860">⭐ ${['','青铜','白银','黄金','钻石'][u.level]}</span><span style="color:${EC[def.element]}">${def.name}</span><span style="font-size:13px;color:var(--c-text2)">HP:${u.hp}/${u.maxHp}</span></div>
        <div class="mini-compare"><div class="mini-level"><div class="mini-level-head">当前</div>${currentSlots}</div>${nextLvl?`<div class="mini-level"><div class="mini-level-head">下一阶 HP ${nextLvl.hp}</div>${nextSlots}</div>`:''}</div>
        <div class="roster-line" style="margin-top:4px">${benchUnits.length>0?`<button class="bb" style="font-size:13px;padding:2px 4px" onclick="toggleUnitActive('${u.instanceId}')">→备战</button>`:''}<button class="bb" style="font-size:13px;padding:2px 4px;background:#c4907a" onclick="sellUnit('${u.instanceId}')">💸出售</button></div>
      </div>`;
    }).join('')}
    <div class="sstt" style="margin-top:8px">备战单位</div>
    ${benchUnits.map(u=>{
      const def=UNIT_DEFS[u.defId]; if(!def)return'';
      const lvl=def.levels[u.level];
      const nextLvl=def.levels[u.level+1]||null;
      const currentSlots=(lvl.slots||[]).map(slot=>`<div class="unit-slot-dot compact">${shapeHTML(slot.sn,slot.el,5)}<span class="unit-slot-meta">${EL[slot.el]}×${TIER_MULT[slot.tier]}</span></div>`).join('');
      const nextSlots=nextLvl?(nextLvl.slots||[]).map(slot=>`<div class="unit-slot-dot compact">${shapeHTML(slot.sn,slot.el,5)}<span class="unit-slot-meta">${EL[slot.el]}×${TIER_MULT[slot.tier]}</span></div>`).join(''):'';
      return `<div class="roster-card" style="opacity:0.8">
        <div class="roster-line"><span style="font-size:15px;color:var(--c-text2)">💤备战 ${['','青铜','白银','黄金','钻石'][u.level]}</span><span style="color:${EC[def.element]}">${def.name}</span><span style="font-size:13px;color:var(--c-text2)">HP:${u.hp}/${u.maxHp}</span></div>
        <div class="mini-compare"><div class="mini-level"><div class="mini-level-head">当前</div>${currentSlots}</div>${nextLvl?`<div class="mini-level"><div class="mini-level-head">下一阶 HP ${nextLvl.hp}</div>${nextSlots}</div>`:''}</div>
        <div class="roster-line" style="margin-top:4px">${activeUnits.length<2?`<button class="bb" style="font-size:13px;padding:2px 4px" onclick="toggleUnitActive('${u.instanceId}')">上阵</button>`:''}<button class="bb" style="font-size:13px;padding:2px 4px;background:#c4907a" onclick="sellUnit('${u.instanceId}')">💸出售</button></div>
      </div>`;
    }).join('')}
  </div>`;

  // 中栏：商品主区
  h+=`<div class="shop-col">
    <div class="sstt">🎖️ 单位商店 · Tier ${G.shopTier}</div>
    <div class="unit-grid">
      ${G.shopItems.units.length===0?'<div class="shop-note">已售罄</div>':''}
      ${G.shopItems.units.map(item=>{
        const def=UNIT_DEFS[item.defId]; if(!def)return'';
        const lvl=def.levels[1];
        const nextLvl=def.levels[2]||null;
        const ownCnt=(allOwned.filter(u=>u.defId===item.defId).length)||0;
        const toMerge=Math.max(0,3-(ownCnt+1));
        const mergeHint=(ownCnt>=2)?'购买后可立刻合成升级':(ownCnt===1?`再补 ${toMerge} 张可合成`:'作为新核心起点');
        const tags=(def.tags||[]).slice(0,3).join(' · ');
        const currentSlots=(lvl.slots||[]).map(slot=>`<div class="unit-slot-dot compact">${shapeHTML(slot.sn,slot.el,5)}<span class="unit-slot-meta">${EL[slot.el]}×${TIER_MULT[slot.tier]}</span></div>`).join('');
        const nextSlots=nextLvl?(nextLvl.slots||[]).map(slot=>`<div class="unit-slot-dot compact">${shapeHTML(slot.sn,slot.el,5)}<span class="unit-slot-meta">${EL[slot.el]}×${TIER_MULT[slot.tier]}</span></div>`).join(''):'';
        return`<div class="unit-card">
          <div class="unit-head">
            <div class="unit-meta">
              <div class="unit-icon" style="background:${EC[def.element]}">${def.element==='fire'?'🔥':def.element==='water'?'💧':def.element==='wind'?'🌿':'🪨'}</div>
              <div>
                <div class="unit-name" style="color:${EC[def.element]}">${def.name}</div>
                <div class="unit-tags">HP:${lvl.hp} · ${lvl.slots.length}槽 · ${tags||'基础单位'}</div>
              </div>
            </div>
            <span class="sic">💰${item.cost}</span>
          </div>
          <div class="unit-hint">${mergeHint}</div>
          <div class="mini-compare">
            <div class="mini-level">
              <div class="mini-level-head">当前 HP ${lvl.hp}</div>
              ${currentSlots}
            </div>
            ${nextLvl?`<div class="mini-level"><div class="mini-level-head">下一级 HP ${nextLvl.hp}</div>${nextSlots}</div>`:''}
          </div>
          <div class="unit-actions">
            <button class="bb" onclick="buyUnit('${item.id}')" ${G.gold<item.cost?'disabled':''}>购买</button>
          </div>
        </div>`;
      }).join('')}
    </div>
  </div>`;

  // 右栏：决策摘要
  h+=`<div class="shop-col">
    <div class="sstt" style="display:flex;justify-content:space-between;align-items:center;gap:8px;">
      <span>🧭 决策摘要</span>
      <button class="bb sl" style="font-size:12px;padding:2px 8px" onclick="closeShop()">完成</button>
    </div>
    <div class="shop-stat"><span>阶段</span><span>${dayLabel}</span></div>
    <div class="shop-stat"><span>天数</span><span>Day ${G.day}</span></div>
    <div class="shop-stat"><span>金币</span><span>${G.gold}</span></div>
    <div class="shop-stat"><span>上阵/备战</span><span>${activeUnits.length}/2 · ${benchUnits.length}</span></div>
    <div class="shop-alert">${recommend}</div>
    <div class="shop-alert">当前版本：商店仅售英雄卡，构筑深度来自买卖与同名合成。</div>
    <button class="rfb" style="width:100%;margin-top:4px" onclick="rollShop()">🔄 刷新（${rollCost}💰）</button>
  </div>`;

  h+=`</div>`;

  document.getElementById('scat').innerHTML=h;
}

function buyConsumable(itemId){
  if(G.phase!=='SHOP')return;
  const idx=G.shopItems.consumables.findIndex(c=>c.id===itemId);
  if(idx===-1)return;
  const item=G.shopItems.consumables[idx];
  if(G.gold<item.cost){showMsg('💰 金币不足！');return;}
  G.gold-=item.cost;
  G.shopItems.consumables.splice(idx,1);
  if(item.type==='coin_bag'){
    G.gold+=3;
    glog('💰 金币袋：获得3金币！');
  } else if(item.type==='hp_potion'||item.type==='hp_potion2'){
    G.backpack.push({...item,bpId:`bp_${G._bpCnt++}`});
    glog(`📦 ${item.name} 放入背包，可在阵容区使用`);
  } else if(item.type==='board_el'){
    G.backpack.push({...item,bpId:`bp_${G._bpCnt++}`});
    glog(`📦 ${item.name} 放入背包，可在战斗中使用`);
  } else if(item.type==='el_up'||item.type==='el_up2'||item.type==='el_up3'||item.type==='tier_up'){
    G.backpack.push({...item,bpId:`bp_${G._bpCnt++}`});
    glog(`📦 ${item.name} 放入背包，可在阵容区装备到行动槽`);
  }
  renderShop();
}

function useBackpackItem(bpId){
  const idx=G.backpack.findIndex(b=>b.bpId===bpId);
  if(idx===-1)return;
  const item=G.backpack[idx];
  if(item.type==='hp_potion'||item.type==='hp_potion2'){
    const heal=item.type==='hp_potion'?5:10;
    const heroes=Object.values(G.heroes).filter(h=>h.hp>0);
    if(heroes.length===0){showMsg('没有存活的英雄！');return;}
    const h=heroes[0];
    const oldHp=h.hp;
    h.hp=Math.min(h.hp+heal,h.maxHp);
    const u=getUnitByHeroId(h.id); if(u)u.hp=h.hp;
    glog(`💚 ${h.name} 恢复 ${h.hp-oldHp} HP（${h.hp}/${h.maxHp}）`);
  } else if(item.type==='board_el'){
    if(G.phase!=='PLAYER'){showMsg('只能在战斗阶段使用棋盘元素！');return;}
    const empty=[];
    for(let r=0;r<8;r++)for(let c=0;c<8;c++){
      if(!G.board[r][c].el&&!monAt({r,c})&&!heroAt({r,c}))empty.push({r,c});
    }
    if(empty.length===0){showMsg('没有空格可以放置元素！');return;}
    const pos=empty[ri(empty.length)];
    addEl(pos,item.el||'fire');
    glog(`🌱 在(${pos.r},${pos.c})放置1层${EL[item.el||'fire']}元素`);
  } else {
    showMsg('该物品功能开发中');
    return;
  }
  G.backpack.splice(idx,1);
  renderShop(); refreshUI();
}

function toggleUnitActive(instanceId){
  const unit=G.ownedUnits.find(u=>u.instanceId===instanceId);
  if(!unit)return;
  if(unit.active){
    unit.active=false;
  } else {
    const activeCount=G.ownedUnits.filter(u=>u.active).length;
    if(activeCount>=2){showMsg('最多上阵2个英雄！请先下阵一个。');return;}
    unit.active=true;
  }
  syncUnitsToHeroes();
  renderShop(); refreshUI();
}

// 保留旧函数别名（向后兼容）
function refreshShop(){ rollShop(); }
function genShop_old(){
  G.shopItems=[]; for(let i=0;i<3;i++){const el=['fire','water','wind','earth'][Math.floor(Math.random()*4)],sn=Math.floor(Math.random()*20)+1,tier=1,cost=SD[sn].n<=1?1:SD[sn].n<=3?2:SD[sn].n<=4?3:4;G.shopItems.push({id:`si${i}`,el,sn,tier,name:bname(el,sn,tier),cost});}
}

// ========== UTILS ==========
function glog(t){
  const el=document.getElementById('log');
  const d=document.createElement('div');d.textContent=t;el.appendChild(d);
  el.scrollTop=el.scrollHeight;
  while(el.children.length>60)el.removeChild(el.firstChild);
}

function showMsg(t){document.getElementById('msgt').textContent=t;document.getElementById('msgd').textContent='';document.getElementById('msg').style.display='block';}

function buildRunEndVM(){
  const win=!!G.runVictory;
  const es=G.engineStats||{};
  const gr=G.growth||{};
  return{
    win,
    title:win?'🏆 Run 通关！':'💀 Run 结束',
    day:G.day||1,
    gold:G.gold||0,
    castleHp:G.playerCastle?.hp||0,
    summonCount:es.summonCount||0,
    healCount:es.healCount||0,
    chainCount:es.chainCount||0,
    perfectCount:es.perfectCount||0,
    summonTier:gr.summonTier||0,
    healTier:gr.healTier||0,
    chainTier:gr.chainTier||0,
  };
}
function showRunEnd(){
  if(G.runVictory==null)G.runVictory=false;
  const vm=buildRunEndVM();
  const lines=[
    vm.win?'恭喜通关 Day5 Boss 战！':'本次 Run 未能通关。',
    `天数 ${vm.day} · 金币 ${vm.gold} · 城堡 ${vm.castleHp} HP`,
    `引擎 召${vm.summonCount} 疗${vm.healCount} 连${vm.chainCount} 完美${vm.perfectCount}`,
    `成长 召T${vm.summonTier} 疗T${vm.healTier} 连T${vm.chainTier}`,
  ];
  document.getElementById('msgt').textContent=vm.title;
  document.getElementById('msgd').textContent=lines.join('\n');
  document.getElementById('msg').style.display='block';
  glog(vm.title);
  refreshUI();
}
function restartRun(){
  document.getElementById('msg').style.display='none';
  document.getElementById('msgd').textContent='';
  initGame();
}

// ===== FIXED-RESOLUTION SCALE MANAGER =====
;(function(){
  var BASE_W=1280,BASE_H=720;
  window._gameScale=1;window._gameShellOffX=0;window._gameShellOffY=0;
  function applyGameScale(){
    if(typeof document==='undefined')return;
    var S=Math.min(window.innerWidth/BASE_W,window.innerHeight/BASE_H);
    var offX=Math.round((window.innerWidth-BASE_W*S)/2);
    var offY=Math.round((window.innerHeight-BASE_H*S)/2);
    var shell=document.getElementById('game-shell');
    if(!shell||!shell.style)return;
    shell.style.transform='scale('+S+')';
    shell.style.left=offX+'px';
    shell.style.top=offY+'px';
    window._gameScale=S;
    window._gameShellOffX=offX;
    window._gameShellOffY=offY;
  }
  if(window&&typeof window.addEventListener==='function')window.addEventListener('resize',applyGameScale);
  applyGameScale();
})();

// ========== START ==========
initGame();
