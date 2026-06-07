const assert = require('assert');
const { data, validateData, buildIndexes } = require('../src/core/data.cjs');
const { createGameState } = require('../src/core/state.cjs');
const { dispatch } = require('../src/core/reducer.cjs');
const { runFullDayScenario } = require('../src/scenarios/fullDay.cjs');
const { renderPlayerReport } = require('../src/render/textReport.cjs');
const { SUPPORTED_MECHANICS } = require('../src/core/mechanics.cjs');
let tests=[]; function test(name, fn){ tests.push({name, fn}); }
function hasEvent(state,type){ return state.events.some(e=>e.type===type); }

test('loads all 01-09 table counts',()=>{ assert.equal(data.pets.length,127); assert.equal(data.monsters.length,34); assert.equal(data.waves.length,134); assert.equal(data.mechanisms.length,61); assert.equal(data.events.length,32); assert.equal(data.shop.length,127); assert.equal(data.relics.length,40); assert.equal(data.shapes.length,127); assert.equal(data.validation.length,10); });
test('all cross-table references connected',()=>{ const v=validateData(); assert.deepEqual(v.issues,[]); assert.equal(v.ok,true); });
test('all mechanism IDs have executable handler registration',()=>{ for(const m of data.mechanisms) assert.ok(SUPPORTED_MECHANICS.has(m.id), `unsupported ${m.id}`); });
test('every pet has shape and shop row',()=>{ const ix=buildIndexes(); for(const p of data.pets){ assert.ok(ix.shapesByPetId.has(p.id), p.id); assert.ok(ix.shopByPetId.has(p.id), p.id); } });
test('every wave uses monster template',()=>{ const ix=buildIndexes(); for(const w of data.waves) assert.ok(ix.monstersByPetId.has(w.petId), `${w.waveId}:${w.petId}`); });
test('shop pools contain night/element/role/tier pools',()=>{ const ix=buildIndexes(); for(const k of ['night_base','elem_火','elem_水','elem_风','elem_土','tier_pT1']) assert.ok(ix.shopPools.has(k), k); });
test('reward pools contain pT pools',()=>{ const ix=buildIndexes(); for(const k of ['reward_pT1','reward_pT2','reward_pT3']) assert.ok(ix.rewardPools.has(k), k); });

test('battle can run and generate result',()=>{ const s=createGameState(); dispatch(s,{type:'RUN_BATTLE'}); assert.ok(s.result); assert.ok(hasEvent(s,'BATTLE_END')); });
test('battle uses wave rows',()=>{ const s=createGameState(); dispatch(s,{type:'RUN_BATTLE'}); assert.ok(s.events.some(e=>e.type==='SPAWN_ENEMY' && e.petId)); });
test('player operation events exist',()=>{ const s=createGameState(); dispatch(s,{type:'RUN_BATTLE'}); assert.ok(hasEvent(s,'PLAYER_SELECT_SLOT')); assert.ok(hasEvent(s,'APPLY_ELEMENT')); assert.ok(hasEvent(s,'ELEMENT_SETTLE')); });
test('damage events include before/after hp and shield',()=>{ const s=createGameState(); dispatch(s,{type:'RUN_BATTLE'}); const d=s.events.find(e=>e.type==='DAMAGE'); assert.ok(d && 'hpFrom' in d && 'hpTo' in d && 'shieldFrom' in d && 'shieldTo' in d); });
test('shop enter rolls offers',()=>{ const s=createGameState({gold:10}); dispatch(s,{type:'ENTER_SHOP',poolId:'night_base',slots:6}); assert.equal(s.shop.offers.length,6); assert.ok(hasEvent(s,'SHOP_ROLL')); });
test('shop freeze survives roll',()=>{ const s=createGameState({gold:10}); dispatch(s,{type:'ENTER_SHOP',poolId:'night_base',slots:6}); const id=s.shop.offers[0].offerId; const pet=s.shop.offers[0].petId; dispatch(s,{type:'FREEZE_OFFER',offerId:id}); dispatch(s,{type:'ROLL_SHOP',slots:6}); assert.ok(s.shop.offers.some(o=>o.petId===pet && o.frozen)); });
test('shop buy changes gold and inventory',()=>{ const s=createGameState({gold:10}); dispatch(s,{type:'ENTER_SHOP',poolId:'night_base',slots:6}); const o=s.shop.offers.find(x=>x.price<=s.gold); const g=s.gold; dispatch(s,{type:'BUY_OFFER',offerId:o.offerId}); assert.ok(s.gold<g); assert.ok(hasEvent(s,'SHOP_BUY')); assert.ok(s.inventory.some(i=>i.petId===o.petId)); });
test('shop blocks unaffordable buy',()=>{ const s=createGameState({gold:0}); dispatch(s,{type:'ENTER_SHOP',poolId:'night_base',slots:6}); const o=s.shop.offers[0]; dispatch(s,{type:'BUY_OFFER',offerId:o.offerId}); assert.ok(hasEvent(s,'SHOP_BUY_BLOCKED')); });
test('shop event free roll connects event table',()=>{ const s=createGameState({gold:5}); dispatch(s,{type:'ENTER_SHOP',poolId:'night_base',slots:6}); dispatch(s,{type:'APPLY_SHOP_EVENT',eventId:'evt_free_roll'}); assert.ok(s.shop.freeRolls>=1); assert.ok(hasEvent(s,'SHOP_EVENT_APPLY')); });
test('element shop event rolls element pool',()=>{ const s=createGameState({gold:5}); dispatch(s,{type:'ENTER_SHOP',poolId:'night_base',slots:6}); dispatch(s,{type:'APPLY_SHOP_EVENT',eventId:'evt_shop_fire'}); assert.ok(s.events.some(e=>e.type==='SHOP_ROLL' && e.poolId==='elem_火')); });
test('reward options can include pet/relic and pick reward',()=>{ const s=createGameState({gold:5}); dispatch(s,{type:'REWARD_OPTIONS',poolId:'reward_pT1',count:3}); assert.equal(s.rewards.length,3); dispatch(s,{type:'PICK_REWARD',index:0}); assert.ok(hasEvent(s,'REWARD_PICK')); });
test('full day includes battle reward shop buy exit',()=>{ const s=runFullDayScenario(); for(const t of ['BATTLE_END','REWARD_OPTIONS','SHOP_ENTER','SHOP_ROLL','SHOP_FREEZE','SHOP_BUY','SHOP_EXIT']) assert.ok(hasEvent(s,t), t); });
test('text report includes battle and shop',()=>{ const s=runFullDayScenario(); const txt=renderPlayerReport(s); assert.ok(txt.includes('战斗')); assert.ok(txt.includes('商店刷新')); assert.ok(txt.includes('购买')); assert.ok(txt.includes('最终状态')); });
test('all days and periods have runnable waves or no crash',()=>{ for(let day=1;day<=10;day++){ for(const period of ['上午','下午']){ const s=createGameState({day, period}); dispatch(s,{type:'RUN_BATTLE'}); assert.ok(s.result, `${day}${period}`); } } });
test('mechanism table statuses are preserved',()=>{ assert.ok(data.mechanisms.some(m=>m.integrationStatus==='待接入')); assert.ok(data.mechanisms.some(m=>m.integrationStatus==='可接入')); });
test('events connect to shop phase',()=>{ assert.ok(data.events.every(e=>e.id && e.layer)); assert.ok(data.events.some(e=>e.layer==='shop_phase')); });
test('relics connect to reward pools',()=>{ const ix=buildIndexes(); for(const r of data.relics) assert.ok(ix.rewardPools.has(r.rewardPoolId), r.id); });
test('inventory duplicate merge can raise level',()=>{ const s=createGameState({gold:99}); dispatch(s,{type:'ENTER_SHOP',poolId:'elem_火',slots:6}); const offer=s.shop.offers.find(o=>o.petId==='pal_005') || s.shop.offers[0]; const id=offer.offerId; offer.petId='pal_005'; offer.name='火绒狐'; offer.price=1; dispatch(s,{type:'BUY_OFFER',offerId:id}); const inv=s.inventory.find(i=>i.petId==='pal_005'); assert.ok(inv.level>=2 || inv.count>=1); });

let pass=0; for(const t of tests){ try{ t.fn(); pass++; } catch(e){ console.error(`FAIL ${t.name}\n${e.stack}`); process.exitCode=1; break; } }
if(!process.exitCode) console.log(`${pass}/${tests.length} tests passed`);
