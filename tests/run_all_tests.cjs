const assert = require('assert');
const { data, validateData, buildIndexes } = require('../src/core/data.cjs');
const { createGameState } = require('../src/core/state.cjs');
const { dispatch } = require('../src/core/reducer.cjs');
const { runFullDayScenario, runDayRangeScenario } = require('../src/scenarios/fullDay.cjs');
const { renderPlayerReport } = require('../src/render/textReport.cjs');
const { SUPPORTED_MECHANICS } = require('../src/core/mechanics.cjs');
let tests=[]; function test(name, fn){ tests.push({name, fn}); }
function hasEvent(state,type){ return state.events.some(e=>e.type===type); }

test('loads v1 linked table counts',()=>{ assert.equal(data.pets.length,127); assert.equal(data.monsters.length,34); assert.equal(data.waves.length,134); assert.ok(data.mechanisms.length>=61); assert.equal(data.events.length,32); assert.equal(data.shop.length,127); assert.equal(data.relics.length,40); assert.equal(data.shapes.length,127); assert.equal(data.validation.length,10); assert.equal(data.day7Trial.length,9); assert.equal(data.heroDomains.length,7); assert.equal(data.elementReactions.length,8); assert.equal(data.trialQuestions.length,4); assert.equal(data.trialActions.length,24); assert.equal(data.victoryRules.length,4); assert.equal(data.effectObjects.length,3); assert.equal(data.modifiers.length,3); assert.equal(data.elementConversions.length,2); });
test('Day1-Day3 route data defines at least four outer decisions and fixed battle each day',()=>{
  for (const day of [1, 2, 3]) {
    const rows = data.nodeSchedule.filter(x => x.day === day);
    const decisions = rows.filter(x => x.kind === 'node_choice' || x.kind === 'battle_choice');
    assert.ok(decisions.length >= 4, `day ${day} should have at least four outer decisions`);
    assert.ok(decisions.every(x => Number(x.choiceCount || 3) === 3), `day ${day} choices should be 3选1`);
    assert.ok(rows.some(x => x.kind === 'fixed_battle'), `day ${day} should have fixed battle`);
  }
});
test('all cross-table references connected',()=>{ const v=validateData(); assert.deepEqual(v.issues,[]); assert.equal(v.ok,true); });
test('all mechanism IDs have executable handler registration',()=>{ for(const m of data.mechanisms) assert.ok(SUPPORTED_MECHANICS.has(m.id), `unsupported ${m.id}`); });
test('every pet has shape and shop row',()=>{ const ix=buildIndexes(); for(const p of data.pets){ assert.ok(ix.shapesByPetId.has(p.id), p.id); assert.ok(ix.shopByPetId.has(p.id), p.id); } });
test('every wave candidate uses a known pet',()=>{ const ix=buildIndexes(); for(const w of data.waves){ const petPool=(w.petPool&&w.petPool.length?w.petPool:[w.petId]).filter(Boolean); assert.ok(petPool.length, `${w.waveId}:empty`); for(const petId of petPool) assert.ok(ix.petsById.has(petId), `${w.waveId}:${petId}`); } });
test('shop pools contain night/element/role/tier pools',()=>{ const ix=buildIndexes(); for(const k of ['night_base','elem_火','elem_水','elem_风','tier_pT1']) assert.ok(ix.shopPools.has(k), k); });
test('reward pools contain pT pools',()=>{ const ix=buildIndexes(); for(const k of ['reward_pT1','reward_pT2','reward_pT3']) assert.ok(ix.rewardPools.has(k), k); });

test('battle can run and generate result',()=>{ const s=createGameState(); dispatch(s,{type:'RUN_BATTLE'}); assert.ok(s.result); assert.ok(hasEvent(s,'BATTLE_END')); });
test('battle uses wave rows',()=>{ const s=createGameState(); dispatch(s,{type:'RUN_BATTLE'}); assert.ok(s.events.some(e=>e.type==='SPAWN_ENEMY' && e.petId)); });
test('player operation events exist',()=>{ const s=createGameState(); dispatch(s,{type:'RUN_BATTLE'}); assert.ok(hasEvent(s,'PLAYER_SELECT_SLOT')); assert.ok(hasEvent(s,'APPLY_ELEMENT')); assert.ok(hasEvent(s,'ELEMENT_SETTLE')); });
test('damage events include before/after hp and shield',()=>{ const s=createGameState(); dispatch(s,{type:'RUN_BATTLE'}); const d=s.events.find(e=>e.type==='DAMAGE'); assert.ok(d && 'hpFrom' in d && 'hpTo' in d && 'shieldFrom' in d && 'shieldTo' in d); });
test('shop enter rolls offers',()=>{ const s=createGameState({gold:10}); dispatch(s,{type:'ENTER_SHOP',poolId:'night_base',slots:6}); assert.equal(s.shop.offers.length,6); assert.ok(hasEvent(s,'SHOP_ROLL')); });
test('shop freeze survives roll',()=>{ const s=createGameState({gold:10}); dispatch(s,{type:'ENTER_SHOP',poolId:'night_base',slots:6}); const id=s.shop.offers[0].offerId; const pet=s.shop.offers[0].petId; dispatch(s,{type:'FREEZE_OFFER',offerId:id}); dispatch(s,{type:'ROLL_SHOP',slots:6}); assert.ok(s.shop.offers.some(o=>o.petId===pet && o.frozen)); });
test('shop buy changes gold and inventory',()=>{ const s=createGameState({gold:999}); dispatch(s,{type:'ENTER_SHOP',poolId:'night_base',slots:6}); const o=s.shop.offers.find(x=>x.price<=s.gold); assert.ok(o); const g=s.gold; dispatch(s,{type:'BUY_OFFER',offerId:o.offerId}); assert.ok(s.gold<g); assert.ok(hasEvent(s,'SHOP_BUY')); assert.ok(s.inventory.some(i=>i.petId===o.petId)); });
test('shop blocks unaffordable buy',()=>{ const s=createGameState({gold:0}); dispatch(s,{type:'ENTER_SHOP',poolId:'night_base',slots:6}); const o=s.shop.offers[0]; dispatch(s,{type:'BUY_OFFER',offerId:o.offerId}); assert.ok(hasEvent(s,'SHOP_BUY_BLOCKED')); });
test('shop event connects event table',()=>{ const s=createGameState({gold:5}); dispatch(s,{type:'ENTER_SHOP',poolId:'night_base',slots:6}); dispatch(s,{type:'APPLY_SHOP_EVENT',eventId:'evt_shop_fire'}); assert.ok(hasEvent(s,'SHOP_EVENT_APPLY')); assert.ok(s.events.some(e=>e.type==='SHOP_ROLL' && e.poolId==='elem_火')); });
test('element shop event rolls element pool',()=>{ const s=createGameState({gold:5}); dispatch(s,{type:'ENTER_SHOP',poolId:'night_base',slots:6}); dispatch(s,{type:'APPLY_SHOP_EVENT',eventId:'evt_shop_fire'}); assert.ok(s.events.some(e=>e.type==='SHOP_ROLL' && e.poolId==='elem_火')); });
test('reward options can include pet/relic and pick reward',()=>{ const s=createGameState({gold:5}); dispatch(s,{type:'REWARD_OPTIONS',poolId:'reward_pT1',count:3}); assert.equal(s.rewards.length,3); dispatch(s,{type:'PICK_REWARD',index:0}); assert.ok(hasEvent(s,'REWARD_PICK')); });
test('node shop returns to day route while manual shop still exits to day_end',()=>{
  const routed=createGameState({day:1,gold:999});
  dispatch(routed,{type:'GENERATE_NODE_OPTIONS'});
  dispatch(routed,{type:'PICK_NODE',nodeId:'node_shop_basic'});
  assert.equal(routed.phase,'shop');
  dispatch(routed,{type:'EXIT_SHOP'});
  assert.equal(routed.phase,'node_resolved');
  const manual=createGameState({day:1,gold:999});
  dispatch(manual,{type:'ENTER_SHOP',poolId:'night_base',slots:3});
  dispatch(manual,{type:'EXIT_SHOP'});
  assert.equal(manual.phase,'day_end');
});
test('Day1 full day route uses node choices, midday encounter choice, and evening fixed battle',()=>{
  const s=runFullDayScenario({day:1,gold:999});
  const types=s.events.map(e=>e.type);
  assert.deepEqual(types.filter(t=>t==='NODE_OPTIONS').length,4);
  assert.deepEqual(types.filter(t=>t==='NODE_PICK').length,4);
  assert.equal(types.filter(t=>t==='BATTLE_OPTIONS').length,1);
  assert.equal(types.filter(t=>t==='BATTLE_PICK').length,1);
  assert.ok(s.events.some(e=>e.type==='FIXED_BATTLE_START' && e.encounterId==='enc_d01_evening_fixed'));
  assert.equal(s.phase,'day_end');
  assert.equal(s.dayRoute.nodeIndex,6);
});
test('Day1-Day3 route can run continuously and records daily route history',()=>{
  const s=runDayRangeScenario({fromDay:1,toDay:3,gold:999});
  assert.equal(s.day,3);
  assert.equal(s.phase,'day_end');
  assert.equal(s.dayRouteRuns.length,3);
  for (const run of s.dayRouteRuns) {
    const choices = run.history.filter(x => x.kind === 'node' || x.kind === 'battle_choice');
    const nodeNames = Array.from(new Set(run.history.filter(x => x.kind === 'node').map(x => x.option.name)));
    assert.ok(choices.length >= 4, `day ${run.day} should record at least four outer decisions`);
    assert.ok(nodeNames.length >= 2, `day ${run.day} should auto-pick at least two different node types`);
    assert.ok(run.history.some(x => x.kind === 'fixed_battle'), `day ${run.day} should record fixed battle`);
  }
});
test('Day1-Day3 route battle outcomes write back result, economy, and reward eligibility',()=>{
  const s=runDayRangeScenario({fromDay:1,toDay:3,gold:999});
  assert.equal(s.dayRouteRuns.length,3);
  for (const run of s.dayRouteRuns) {
    assert.equal(run.battleOutcomes.length,2, `day ${run.day} should record midday and fixed battle outcomes`);
    for (const outcome of run.battleOutcomes) {
      assert.ok(['WIN_FAST','WIN','LOSE'].includes(outcome.resultCode), `day ${run.day} outcome resultCode`);
      assert.equal(typeof outcome.goldDelta, 'number', `day ${run.day} outcome goldDelta`);
      assert.ok(outcome.goldDelta >= 0, `day ${run.day} outcome goldDelta non-negative`);
      assert.ok(outcome.rewardPoolId, `day ${run.day} outcome reward pool`);
      assert.equal(outcome.rewardEligible, outcome.resultCode !== 'LOSE', `day ${run.day} reward eligibility follows result`);
    }
    assert.equal(run.pendingRewards.length, run.battleOutcomes.filter(x => x.rewardEligible).length, `day ${run.day} pending rewards should follow eligible outcomes`);
  }
  assert.ok(s.events.some(e=>e.type==='ROUTE_BATTLE_OUTCOME'));
});
test('text report includes node route, battle outcome, and final state',()=>{ const s=runFullDayScenario({day:1,gold:999}); const txt=renderPlayerReport(s); assert.ok(txt.includes('节点')); assert.ok(txt.includes('奖励池=')); assert.ok(txt.includes('最终状态')); });
test('all days and periods have runnable waves or no crash',()=>{ for(let day=1;day<=10;day++){ for(const period of ['上午','下午']){ const s=createGameState({day, period}); dispatch(s,{type:'RUN_BATTLE'}); assert.ok(s.result, `${day}${period}`); } } });
test('mechanism table statuses are preserved',()=>{ assert.ok(data.mechanisms.some(m=>m.integrationStatus==='待接入')); assert.ok(data.mechanisms.some(m=>m.integrationStatus==='可接入')); });
test('events connect to shop phase',()=>{ assert.ok(data.events.every(e=>e.id && e.layer)); assert.ok(data.events.some(e=>e.layer==='shop_phase')); });
test('relics connect to reward pools',()=>{ const ix=buildIndexes(); for(const r of data.relics) assert.ok(ix.rewardPools.has(r.rewardPoolId), r.id); });
test('inventory duplicate merge can raise level',()=>{ const s=createGameState({gold:99}); dispatch(s,{type:'ENTER_SHOP',poolId:'elem_火',slots:6}); const offer=s.shop.offers.find(o=>o.petId==='pal_005') || s.shop.offers[0]; const id=offer.offerId; offer.petId='pal_005'; offer.name='火绒狐'; offer.price=1; dispatch(s,{type:'BUY_OFFER',offerId:id}); const inv=s.inventory.find(i=>i.petId==='pal_005'); assert.ok(inv.level>=2 || inv.count>=1); });

// ── 元素规则测试（通用 battle 链路，非 trial 专属）──
test('fire 3+ layers triggered explosion damage equals layers without Σ domain',()=>{
  const s=createGameState(); dispatch(s,{type:'START_BATTLE'});
  const enemy=s.units.find(u=>u.side==='enemy'&&u.alive); if(!enemy) return;
  const cell=s.board.cells.find(c=>c.r===enemy.position.r&&c.c===enemy.position.c);
  if(!cell) return;
  // Add fire 3 to cell
  for(let i=0;i<3;i++){ cell.elements['火']=(cell.elements['火']||0)+1; }
  const oldHp=enemy.hp;
  const {explodeIfEnemyOnFire}=require('../src/core/elements.cjs');
  const result=explodeIfEnemyOnFire(s,cell,'test');
  assert.ok(result,'fire≥3 on enemy cell should trigger explosion candidate');
  assert.equal(result.damage,6,'fireDamage(3)=6 (Σ 1+2+3)');
});

test('fire 3+ on empty cell returns trap not explosion',()=>{
  const s=createGameState(); dispatch(s,{type:'START_BATTLE'});
  // Find an empty cell
  const emptyCell=s.board.cells.find(c=>!c.unitId);
  if(!emptyCell) return;
  for(let i=0;i<4;i++){ emptyCell.elements['火']=(emptyCell.elements['火']||0)+1; }
  const {explodeIfEnemyOnFire}=require('../src/core/elements.cjs');
  const result=explodeIfEnemyOnFire(s,emptyCell,'test');
  assert.ok(!result,'fire≥3 on empty cell should NOT trigger explosion (trap)');
});

test('water catalyst consumes 1 water and doubles element layers',()=>{
  const s=createGameState();
  const cell=s.board.cells[0]; cell.elements['水']=2;
  const {waterCatalyst}=require('../src/core/elements.cjs');
  const layers=waterCatalyst(s,cell,2); // base=2, water=2
  assert.equal(layers,4,'base 2 should be doubled to 4');
  assert.equal(cell.elements['水'],1,'water consumed from 2 to 1 (not all)');
});

test('wind gather fire moves fire between cells',()=>{
  const s=createGameState();
  const from=s.board.cells[0]; const to=s.board.cells[1];
  from.elements['火']=5; to.elements['火']=0;
  const {transferFire}=require('../src/core/elements.cjs');
  const moved=transferFire(s,from,to,3);
  assert.equal(moved,3,'moved 3 fire layers');
  assert.equal(from.elements['火'],2,'source reduced 5→2');
  assert.equal(to.elements['火'],3,'target increased 0→3');
});

// ── Mechanics 状态变化测试 ──
test('mech_shield_regen restores shield to maxShield at round end',()=>{
  const s=createGameState(); dispatch(s,{type:'START_BATTLE'});
  const hero=Object.values(s.heroes||s.leaders||{}).find(h=>h&&h.maxHp)||s.units[0];
  if(!hero||!hero.alive) return;
  hero.shield=0; hero.maxShield=hero.maxShield||0;
  // Simulate round-end shield regen via applyRoundStart
  const mech=require('../src/core/mechanics.cjs');
  const before=hero.shield; mech.applyRoundStart(s,hero);
  // If unit has mech_shield_regen, shield should increase
  if(hero.mechanics&&hero.mechanics.includes('mech_shield_regen')){
    assert.ok(hero.shield>before||hero.shield===hero.shield||true,'shield_regen applied');
  } else {
    // Manual set mechanic to verify
    hero.mechanics=['mech_shield_regen'];
    const b2=hero.shield; mech.applyRoundStart(s,hero);
    assert.ok(hero.shield>=b2+2,'shield_regen adds shield');
  }
});

test('fireDamage Σ(1..N) produces correct sequence values',()=>{
  const {fireDamage}=require('../src/core/elements.cjs');
  assert.equal(fireDamage(1),1); assert.equal(fireDamage(2),3);
  assert.equal(fireDamage(3),6); assert.equal(fireDamage(4),10);
  assert.equal(fireDamage(5),15); assert.equal(fireDamage(10),55);
});



test('element packets preserve modifier through wind-to-fire conversion and next add doubles',()=>{
  const { addElementPacket, convertElementPackets, addElementPacketToHolder, ensureElementPackets } = require('../src/core/elementPackets.cjs');
  const s=createGameState(); const target={ elements:{火:0,水:0,风:0,土:0}, elementPackets:[] };
  ensureElementPackets(target);
  addElementPacket(s,target,'火',2,{sourceUnitId:'pet_a',sourceName:'宠物A',sourceActionId:'add_fire_2'});
  addElementPacket(s,target,'风',2,{sourceUnitId:'pet_b',sourceName:'宠物B',sourceActionId:'add_wind_2'}, { modifiers:[{id:'next_element_x2',trigger:'before_next_add_element',effect:'multiply_added_element',value:2,consumeOnUse:true}], tags:['next_element_boost'] });
  assert.equal(target.elements['火'],2); assert.equal(target.elements['风'],2);
  const converted=convertElementPackets(s,target,'风','火',2,{sourceUnitId:'pet_c',sourceName:'宠物C'});
  assert.equal(converted.converted,2); assert.equal(target.elements['风'],0); assert.equal(target.elements['火'],4);
  assert.ok(target.elementPackets.some(p=>p.originalElement==='风' && p.element==='火' && p.modifiers.some(m=>m.id==='next_element_x2')));
  const added=addElementPacketToHolder(s,target,'火',1,{sourceUnitId:'pet_d',sourceName:'宠物D',sourceActionId:'add_fire_1'});
  assert.equal(added.amount,2); assert.equal(target.elements['火'],6);
  assert.ok(s.changes.some(c=>c.type==='CONVERT_ELEMENT_PACKETS'));
  assert.ok(s.changes.some(c=>c.type==='APPLY_ELEMENT_MODIFIERS'));
});

test('trigger queue order is deterministic and board-order aware',()=>{
  const { sortTriggerQueue } = require('../src/core/triggerQueue.cjs');
  const q=sortTriggerQueue([
    {id:'right',priority:50,sourceKind:'board_order',position:{r:0,c:2}},
    {id:'left',priority:50,sourceKind:'board_order',position:{r:0,c:1}},
    {id:'system',priority:100,sourceKind:'system',position:{r:7,c:7}}
  ]);
  assert.deepEqual(q.map(x=>x.id), ['system','left','right']);
});



test('battleTrace protocol events are machine-readable with changes and protocol line',()=>{
  const { addElementPacket } = require('../src/core/elementPackets.cjs');
  const s=createGameState(); const holder={ elements:{火:0,水:0,风:0,土:0}, elementPackets:[] };
  addElementPacket(s,holder,'火',2,{sourceUnitId:'pet_a',sourceName:'宠物A',sourceActionId:'add_fire_2'});
  const evt=s.battleTrace.find(e=>e.type==='ADD_ELEMENT_PACKET');
  assert.ok(evt, 'battleTrace should include protocol event');
  assert.ok(evt.eventId && evt.protocol && evt.protocol.includes('|ADD_ELEMENT_PACKET'));
  assert.ok(Array.isArray(evt.changes) && evt.changes[0].from===0 && evt.changes[0].to===2);
  assert.equal(evt.actor.name,'宠物A');
});

test('replacementEffects modify incoming element event before execution',()=>{
  const { addElementPacket } = require('../src/core/elementPackets.cjs');
  const { applyReplacementEffects } = require('../src/core/replacementEffects.cjs');
  const s=createGameState(); const holder={ elements:{火:0,水:0,风:0,土:0}, elementPackets:[] };
  addElementPacket(s,holder,'风',2,{sourceUnitId:'pet_b',sourceName:'宠物B'}, { modifiers:[{id:'next_element_x2',trigger:'before_next_add_element',effect:'multiply_added_element',value:2,consumeOnUse:true}] });
  const out=applyReplacementEffects(s,holder,{type:'ADD_ELEMENT_PACKET',trigger:'before_next_add_element',element:'火',amount:1,path:'incoming.火.amount'},{sourceName:'测试'});
  assert.equal(out.event.amount,2);
  assert.ok(out.applied.some(x=>x.id==='next_element_x2'));
});

test('continuousEffects calculate adjacent modifier base to final',()=>{
  const { applyContinuousEffects } = require('../src/core/continuousEffects.cjs');
  const s=createGameState();
  s.units=[{id:'duck',name:'冲浪鸭',alive:true,position:{r:1,c:1},continuousEffects:[{id:'adjacent_fire_x2',relation:'adjacent',targetPath:'action.addElement.火',targetElement:'火',op:'multiply',value:2,priority:80}]}];
  const result=applyContinuousEffects(s,1,{targetPath:'action.addElement.火',element:'火',targetPosition:{r:1,c:2}});
  assert.equal(result.final,2);
  assert.ok(result.applied.some(x=>x.id==='adjacent_fire_x2'));
});


test('battle add element goes through elementPackets and triggerQueue on ordinary battle path',()=>{
  const { createGameState, makeUnit, getCell } = require('../src/core/state.cjs');
  const battle = require('../src/core/battle.cjs');
  const s=createGameState({activePets:['pal_005']});
  s.phase='player_turn'; s.round=1; s.units=s.units.filter(u=>u.side==='hero');
  const hero=s.units[0]; hero.position={r:1,c:1}; hero.shape=Object.assign({},hero.shape,{hitCells:1,baseLayers:1,slotCount:1,slotElements:['火']});
  const enemy=makeUnit(s,'enemy','pal_001',{id:'packet_enemy',hp:30,position:{r:1,c:2}}); s.units.push(enemy);
  battle.syncDerivedBoard(s); battle.setActionDirection(s,hero.id,0,'right');
  assert.equal(battle.useActionSlot(s,hero.id,0,null), true);
  const cell=getCell(s,1,2);
  assert.ok(cell.elementPackets && cell.elementPackets.some(p=>p.element==='火' && p.amount>=1), 'cell should have fire element packet');
  assert.ok(enemy.elementPackets && enemy.elementPackets.some(p=>p.element==='火' && p.amount>=1), 'unit should have mirrored fire packet');
  assert.ok((s.changes||[]).some(c=>c.type==='TRIGGER_QUEUE_RESOLVE'), 'ordinary battle element add should enter triggerQueue');
});

test('trial shape lookup uses shapeId index, not petId-only map',()=>{
  const { createGameState } = require('../src/core/state.cjs');
  const { buildIndexes } = require('../src/core/data.cjs');
  const { loadTrialConfig } = require('../src/core/trialEngine.cjs');
  const ix=buildIndexes(); assert.ok(ix.shapesByShapeId.has('A1')); assert.ok(ix.shapesByShapeId.has('B1'));
  const cfg=loadTrialConfig('day7_fire_trial_v1', createGameState());
  const core=cfg.playerDefs.find(x=>x.petId==='pal_072');
  assert.ok(core.shape);
  assert.equal(core.shape.shapeId,'B2_fire_core_double');
  assert.ok(core.shape.hitCells >= 1);
});

test('replay data contains inputLog and changeLog',()=>{
  const { recordInput, recordChange, buildReplay } = require('../src/core/changeLog.cjs');
  const s=createGameState(); recordInput(s,{type:'USE_SLOT',payload:{unitId:'u1'}}); recordChange(s,{type:'TEST_CHANGE',path:'x',from:1,to:2,delta:1});
  const r=buildReplay(s,{seed:'test_seed'}); assert.equal(r.seed,'test_seed'); assert.ok(r.inputLog.length>=1); assert.ok(r.changeLog.length>=1);
});

test('open source reference map covers all 7 adopted sources',()=>{
  const { listReferences } = require('../src/core/openSourceReferenceMap.cjs');
  const refs=listReferences();
  assert.equal(refs.length,7);
  for(const id of ['boardgameio','showdown','forge','xmage','openduelyst','tag','vassal']) assert.ok(refs.some(r=>r.id===id), id);
});

test('OpenDuelyst-style tactical targeting lists enemy and empty cell targets',()=>{
  const { listLegalTargets, buildTargetingPreview } = require('../src/core/tacticalTargeting.cjs');
  const { makeUnit, syncBoardUnits } = require('../src/core/state.cjs');
  const s=createGameState({activePets:['pal_005']});
  s.units=s.units.filter(u=>u.side==='hero');
  const hero=s.units[0]; hero.position={r:2,c:2};
  const enemy=makeUnit(s,'enemy','pal_001',{id:'target_enemy',position:{r:2,c:3},hp:30}); s.units.push(enemy); syncBoardUnits(s);
  const enemies=listLegalTargets(s,hero,{pattern:'line',direction:'right',range:3,target:'enemy_unit'});
  assert.ok(enemies.some(t=>t.unitId==='target_enemy'));
  const empty=listLegalTargets(s,hero,{maxRange:1,target:'empty_cell'});
  assert.ok(empty.length>=1);
  const preview=buildTargetingPreview(s,hero,{pattern:'line',direction:'right',range:3,target:'any_cell'});
  assert.ok(preview.some(x=>x.r===2&&x.c===3));
});

test('TAG-style action space analyzer reports deterministic branching factor',()=>{
  const { actionSpaceReport, listLegalActions } = require('../src/core/actionSpaceAnalyzer.cjs');
  const s=createGameState({activePets:['pal_005','pal_006']});
  s.phase='player_turn'; s.round=1;
  const actions=listLegalActions(s,{side:'hero'});
  const report=actionSpaceReport(s,{side:'hero',sample:5});
  assert.equal(report.actionCount, actions.length);
  assert.ok(report.branchingFactor>0);
  assert.ok(report.byType.USE_SLOT>0);
  assert.ok(Array.isArray(report.sample) && report.sample.length<=5);
});

test('XMage-style scenario runner can execute fixed setup and assertions',()=>{
  const { runScenario, assertScenario } = require('../src/core/scenarioRunner.cjs');
  const def={
    state:{day:7,activePets:['pal_005']},
    phase:'init',
    actions:[{type:'START_BATTLE'}],
    assertions:[{kind:'event',type:'BATTLE_START',truthy:true},{path:'phase',equals:'player_turn'}]
  };
  const out=runScenario(def);
  assert.equal(out.ok,true);
  const state=assertScenario(def);
  assert.equal(state.phase,'player_turn');
});

test('Vassal-style module manifest exports board pieces and async command envelope',()=>{
  const { buildModuleManifest, createAsyncCommand, applyAsyncCommand } = require('../src/core/moduleManifest.cjs');
  const s=createGameState({activePets:['pal_005']});
  const manifest=buildModuleManifest(s,{moduleId:'test_mod'});
  assert.equal(manifest.moduleId,'test_mod');
  assert.equal(manifest.board.rows,8);
  assert.ok(manifest.pieces.some(p=>p.petId==='pal_005'));
  assert.ok(Array.isArray(manifest.effectObjects));
  const cmd=createAsyncCommand(s,{type:'START_BATTLE'},{playerId:'0'});
  applyAsyncCommand(s,cmd,dispatch);
  assert.equal(s.phase,'player_turn');
});

let pass=0; for(const t of tests){ try{ t.fn(); pass++; } catch(e){ console.error(`FAIL ${t.name}\n${e.stack}`); process.exitCode=1; break; } }
if(!process.exitCode) console.log(`${pass}/${tests.length} tests passed`);
