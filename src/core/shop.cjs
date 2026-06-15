const { pushEvent } = require('./events.cjs');
const { rng, pickWeighted } = require('./rng.cjs');
function clone(value){ return JSON.parse(JSON.stringify(value)); }
function parseGoldCost(text){ if(!text || text==='无') return 0; const m=String(text).match(/金币\s*-\s*(\d+)/); return m ? Number(m[1]) : 0; }
function enabledShopItems(state, poolId='night_base'){ return state.data.shop.filter(i => i.status==='启用' && i.unlockDay <= state.day && (i.shopPools||[]).includes(poolId)); }
function itemWeight(item,poolId){ if(poolId==='night_base') return item.weights.night; if(poolId.startsWith('elem_')) return item.weights.element; if(poolId.startsWith('role_')) return item.weights.role; if(poolId.startsWith('tier_')) return item.weights.tier; return item.weights.night || 1; }
function stallTags(poolId='night_base') {
 if (poolId.startsWith('elem_')) return ['元素', poolId.replace('elem_', '')];
 if (poolId.startsWith('role_')) return ['流派', poolId.replace('role_', '')];
 if (poolId.startsWith('tier_')) {
  const tier = poolId.replace('tier_', '');
  const publicTier = { pT1: '青铜', pT2: '白银', pT3: '黄金', pT4: '钻石' }[tier] || tier;
  return ['等级', publicTier];
 }
 return ['通用', '夜市'];
}
function ensureRefreshState(state) {
 if (!state.shop.refreshState) state.shop.refreshState = { freeRolls: Number(state.shop.freeRolls || 0), nextDiscount: Number(state.shop.nextDiscount || 0), targetedRestocks: [], effects: [], lastRoll: null };
 if (!Array.isArray(state.shop.refreshState.targetedRestocks)) state.shop.refreshState.targetedRestocks = [];
 if (!Array.isArray(state.shop.refreshState.effects)) state.shop.refreshState.effects = [];
 state.shop.refreshState.freeRolls = Number(state.shop.freeRolls || 0);
 state.shop.refreshState.nextDiscount = Number(state.shop.nextDiscount || 0);
 return state.shop.refreshState;
}
function makeStall(state, poolId='night_base', slots=6, meta={}) {
 return {
  nodeId: meta.nodeId || null,
  name: meta.name || (poolId === 'night_base' ? '夜市商人' : `摊位 ${poolId}`),
  shopPoolId: poolId,
  tags: meta.tags || stallTags(poolId),
  slots: Number(slots || meta.slots || 6),
  unlockDay: Number(meta.unlockDay || state.day || 1),
  priceRule: meta.priceRule || '标准价格',
  note: meta.note || ''
 };
}
function buildOffer(state, item, slot, poolId){ const discount = state.shop.nextDiscount || 0; const price = Math.max(0, Math.ceil(item.price * (100-discount)/100)); return { offerId:`offer_${state.day}_${state.period}_${state.shop.rollCount}_${slot}_${item.petId}`, type:'pet', petId:item.petId, name:item.name, element:item.element, role:item.role, poolTier:item.poolTier, poolId, price, frozen:false }; }
function enterShop(state, poolId='night_base', slots=6, opts={}){ ensureRefreshState(state); const stall=makeStall(state,poolId,slots,opts.stall||opts); state.phase='shop'; state.shop.activePool=poolId; state.shop.activeStall=stall; state.shop.offers=[]; pushEvent(state,'SHOP_ENTER',{poolId,stall,text:`进入${stall.name}，倾向=${stall.tags.join('/')}，池=${poolId}，槽位=${stall.slots}，金币${state.gold}。`}); rollShop(state,{poolId,slots:stall.slots,free:true}); return true; }
function rollShop(state,{poolId=state.shop.activePool||'night_base', slots=6, free=false}={}){ const cost = free || state.shop.freeRolls>0 ? 0 : 1; if(cost>0 && state.gold < cost) { pushEvent(state,'SHOP_ROLL_BLOCKED',{text:`金币不足，无法刷新。`}); return false; }
 if(cost>0) state.gold-=cost; else if(!free && state.shop.freeRolls>0) state.shop.freeRolls-=1;
 const random=rng(`${state.day}:${state.period}:${state.shop.rollCount}:${poolId}:${state.gold}`); const pool=enabledShopItems(state,poolId); const kept=(state.shop.offers||[]).filter(o=>o.frozen); const offers=[...kept]; let slot=0; while(offers.length<slots && pool.length){ const item=pickWeighted(pool, i=>itemWeight(i,poolId), random); if(!item) break; offers.push(buildOffer(state,item,slot++,poolId)); }
 state.shop.offers=offers; state.shop.rollCount+=1; const discountApplied=Number(state.shop.nextDiscount || 0); state.shop.nextDiscount=0; const refresh=ensureRefreshState(state); refresh.lastRoll={poolId,cost,slots:Number(slots),free:!!free,discountApplied,offerIds:offers.map(o=>o.offerId), petIds:offers.map(o=>o.petId)}; pushEvent(state,'SHOP_ROLL',{poolId,cost,offers:offers.map(o=>o.petId), refreshState:clone(refresh), text:`商店刷新：花费${cost}金币，出现 ${offers.map(o=>`${o.name}(${o.price})`).join('、')}。`}); return true; }
function freezeOffer(state, offerId, frozen=true){ const offer=state.shop.offers.find(o=>o.offerId===offerId); if(!offer) return false; offer.frozen=frozen; pushEvent(state,frozen?'SHOP_FREEZE':'SHOP_UNFREEZE',{offerId,text:`${frozen?'冻结':'解冻'}商品：${offer.name}。`}); return true; }
function addInventory(state, petId){ let inv=state.inventory.find(x=>x.petId===petId && x.active===false && x.level<3); if(!inv){ state.nextInventory = Number(state.nextInventory || 1); const instanceId=`bench_${petId}_${state.nextInventory++}`; state.inventory.push({petId,count:1,level:1,active:false,instanceId}); return {merged:false, level:1, active:false, instanceId}; } inv.count+=1; let merged=false; while(inv.count>=2 && inv.level<3){ inv.count-=2; inv.level+=1; inv.count+=1; merged=true; } return {merged, level:inv.level, count:inv.count, active:false}; }
function buyOffer(state, offerId){ const idx=state.shop.offers.findIndex(o=>o.offerId===offerId); if(idx<0){ pushEvent(state,'SHOP_BUY_BLOCKED',{text:`商品不存在：${offerId}`}); return false; }
 const offer=state.shop.offers[idx]; if(state.gold < offer.price){ pushEvent(state,'SHOP_BUY_BLOCKED',{offerId,text:`金币不足，无法购买 ${offer.name}，需要${offer.price}，当前${state.gold}。`}); return false; }
 const before=state.gold; state.gold-=offer.price; const inv=addInventory(state,offer.petId); state.shop.offers.splice(idx,1); pushEvent(state,'SHOP_BUY',{offerId,petId:offer.petId,price:offer.price,goldFrom:before,goldTo:state.gold,inventory:inv,text:`购买 ${offer.name}，金币${before}→${state.gold}${inv.merged?`，同名合成到Lv${inv.level}`:''}。`}); return true; }
function availableEvents(state){ return state.data.events.filter(e=>e.layer==='shop_phase' && e.status==='正式' && dayExprAllows(e.dayExpr,state.day)); }
function dayExprAllows(expr, day){ if(!expr) return true; const m=String(expr).match(/D(\d+)\s*-\s*D(\d+)/); if(m) return day>=Number(m[1]) && day<=Number(m[2]); const m2=String(expr).match(/D(\d+)/); return m2 ? day===Number(m2[1]) : true; }
function applyShopEventModifiers(state, e, source='shop_event') {
 if (!e) return null;
 const refresh=ensureRefreshState(state);
 const effect={eventId:e.id, name:e.name, source, freeRolls:0, nextDiscount:0, targetedPoolId:e.shopPoolId || null, step:state.nextStep || 0};
 if(String(e.gainText||'').includes('免费刷新')) { state.shop.freeRolls += e.value || 1; effect.freeRolls=e.value || 1; }
 if(String(e.gainText||'').includes('折扣')) { state.shop.nextDiscount=Math.max(state.shop.nextDiscount||0, e.value || 50); effect.nextDiscount=state.shop.nextDiscount; }
 ensureRefreshState(state).effects.push(effect);
 return effect;
}
function applyShopEvent(state, eventId){ const e=state.data.events.find(x=>x.id===eventId); if(!e) return false; const cost=parseGoldCost(e.costText); if(state.gold<cost){ pushEvent(state,'SHOP_EVENT_BLOCKED',{eventId,text:`金币不足，无法选择事件 ${e.name}。`}); return false; } const before=state.gold; state.gold-=cost; const effect=applyShopEventModifiers(state,e,'shop_event'); if(e.shopPoolId && /候选|商品位|补货/.test(e.gainText||'')){ const slots=Math.max(3, e.value || 2); const restock={restockId:`restock_${state.day}_${state.nextStep || 0}_${eventId}`, eventId:e.id, name:e.name, source:'shop_event', poolId:e.shopPoolId, tags:stallTags(e.shopPoolId), slots, status:'pending', offerIds:[]}; ensureRefreshState(state).targetedRestocks.push(restock); rollShop(state,{poolId:e.shopPoolId, slots, free:true}); restock.status='applied'; restock.offerIds=(state.shop.offers||[]).map(o=>o.offerId); pushEvent(state,'SHOP_TARGETED_RESTOCK',{poolId:e.shopPoolId, restock:clone(restock), text:`定向补货：${e.name} -> ${e.shopPoolId}，槽位${slots}。`}); } pushEvent(state,'SHOP_EVENT_APPLY',{eventId,cost,goldFrom:before,goldTo:state.gold,effect:effect?clone(effect):null,refreshState:clone(ensureRefreshState(state)),text:`选择商店事件【${e.name}】：${e.optionText}，金币${before}→${state.gold}。`}); return true; }
function rewardOptions(state, poolId='reward_pT1', count=3){ const pool=state.data.shop.filter(i => i.unlockDay<=state.day && (i.rewardPools||[]).includes(poolId)); const relics=state.data.relics.filter(r=>r.unlockDay<=state.day && r.rewardPoolId===poolId && r.status==='正式'); const random=rng(`reward:${state.day}:${state.period}:${poolId}:${state.round}`); const out=[]; for(let i=0;i<count;i++){ const source = i===count-1 && relics.length ? 'relic' : 'pet'; if(source==='relic'){ const r=pickWeighted(relics,x=>x.weight||1,random); if(r) out.push({type:'relic', id:r.id, name:r.name, poolId}); } else { const it=pickWeighted(pool,x=>x.weights.reward||1,random); if(it) out.push({type:'pet', petId:it.petId, name:it.name, poolId}); } }
 state.rewards=out; pushEvent(state,'REWARD_OPTIONS',{poolId,options:out,text:`奖励候选：${out.map(x=>x.name).join('、')}。`}); return out; }
function pickReward(state, index=0){ const r=state.rewards[index]; if(!r) return false; if(r.type==='pet') addInventory(state,r.petId); if(r.type==='relic') state.relics.push(r.id); pushEvent(state,'REWARD_PICK',{reward:r,text:`选择奖励：${r.name}。`}); return true; }
function exitShop(state){ const returnPhase=state.shop.routeReturnPhase || null; delete state.shop.routeReturnPhase; state.phase=returnPhase || 'day_end'; pushEvent(state,'SHOP_EXIT',{stall:state.shop.activeStall||null,text:`离开商店：金币${state.gold}，背包${state.inventory.length}种宠物，遗物${state.relics.length}件。`}); }
module.exports={ enterShop, rollShop, freezeOffer, buyOffer, availableEvents, applyShopEvent, applyShopEventModifiers, rewardOptions, pickReward, exitShop, enabledShopItems, makeStall, stallTags, ensureRefreshState };
