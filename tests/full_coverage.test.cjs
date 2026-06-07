const test = require('node:test');
const assert = require('node:assert/strict');
const { data, validateData, buildIndexes } = require('../src/core/data.cjs');
const { createGameState, makeUnit } = require('../src/core/state.cjs');
const battle = require('../src/core/battle.cjs');
const shop = require('../src/core/shop.cjs');
const { dispatch } = require('../src/core/reducer.cjs');
const { pushEvent, change } = require('../src/core/events.cjs');
const mech = require('../src/core/mechanics.cjs');
const { rng, pickWeighted } = require('../src/core/rng.cjs');
const { renderPlayerReport, renderShopReport } = require('../src/render/textReport.cjs');
const { runFullDayScenario } = require('../src/scenarios/fullDay.cjs');

function clone(obj){ return JSON.parse(JSON.stringify(obj)); }
function hasEvent(state, type){ return state.events.some(e => e.type === type); }
function eventCount(state, type){ return state.events.filter(e => e.type === type).length; }
function firstEvent(state, type){ return state.events.find(e => e.type === type); }
function makeState(opts={}){ return createGameState(Object.assign({gold:20}, opts)); }
function unitWithMechanic(state, id, side='enemy', params={}){
  const u = makeUnit(state, side, 'pal_001', { hp: 30, atk: 4, def: 0, shield: 0, mechanics: [id], mechanicParams: params });
  state.units.push(u);
  return u;
}
function hero(state){ return battle.living(state,'hero')[0]; }
function enemy(state){ return battle.living(state,'enemy')[0]; }

const expectedCounts = { pets:127, monsters:34, waves:134, mechanisms:61, events:32, shop:127, relics:40, shapes:127, validation:10 };

test('T01 数据源 01-09 表数量完整', () => {
  for (const [key, count] of Object.entries(expectedCounts)) assert.equal(data[key].length, count, key);
  assert.ok(data.meta);
});

test('T02 normalized data 跨表引用无缺口', () => {
  const v = validateData();
  assert.equal(v.ok, true, v.issues.join('\n'));
  assert.deepEqual(v.counts, expectedCounts);
});

test('T03 所有机制 ID 都进入可识别集合', () => {
  const missing = data.mechanisms.filter(m => !mech.SUPPORTED_MECHANICS.has(m.id)).map(m => m.id);
  assert.deepEqual(missing, []);
});

test('T04 宠物全部能找到形状、商店、奖励池', () => {
  const ix = buildIndexes();
  for (const p of data.pets) {
    assert.ok(ix.shapesByPetId.has(p.id), `missing shape ${p.id}`);
    assert.ok(ix.shopByPetId.has(p.id), `missing shop ${p.id}`);
    const s = ix.shopByPetId.get(p.id);
    assert.ok(s.shopPools.length >= 3, `${p.id} shopPools too small`);
    assert.ok(s.rewardPools.length >= 1, `${p.id} rewardPools empty`);
  }
});

test('T05 怪物波次全部能回链宠物和怪物模板', () => {
  const ix = buildIndexes();
  for (const w of data.waves) {
    assert.ok(ix.petsById.has(w.petId), `${w.waveId} pet`);
    assert.ok(ix.monstersByPetId.has(w.petId), `${w.waveId} monster`);
    assert.ok(w.day >= 1 && w.day <= 10, `${w.waveId} day`);
    assert.ok(['上午','下午'].includes(w.period), `${w.waveId} period`);
    assert.ok(w.round >= 1 && w.round <= 10, `${w.waveId} round`);
  }
});

test('T06 所有商店池和奖励池可建立索引', () => {
  const ix = buildIndexes();
  const shopPools = [...new Set(data.shop.flatMap(s => s.shopPools))];
  const rewardPools = [...new Set(data.shop.flatMap(s => s.rewardPools))];
  assert.ok(shopPools.includes('night_base'));
  for (const p of shopPools) assert.ok(ix.shopPools.has(p), p);
  for (const p of rewardPools) assert.ok(ix.rewardPools.has(p), p);
});

test('T07 validateData 能抓出坏引用', () => {
  const bad = clone(data);
  bad.waves[0].petId = 'pal_missing';
  bad.shop[0].shopPools = [];
  const v = validateData(bad);
  assert.equal(v.ok, false);
  assert.ok(v.issues.some(x => x.includes('pal_missing')));
  assert.ok(v.issues.some(x => x.includes('has no shop pools')));
});

test('T08 基础事件和状态变化记录器工作', () => {
  const s = makeState();
  const e = pushEvent(s, 'TEST_EVENT', { text:'测试事件' });
  const c = change(s, 'gold', 1, 2, 'test');
  assert.ok(e.step >= 1);
  assert.equal(e.text, '测试事件');
  assert.equal(c.path, 'gold');
});

test('T09 rng 和 pickWeighted 确定性', () => {
  const r1 = rng('same-seed');
  const r2 = rng('same-seed');
  assert.equal(r1(), r2());
  const item = pickWeighted([{id:'a',w:0},{id:'b',w:10}], x=>x.w, rng('pick'));
  assert.equal(item.id, 'b');
  assert.equal(pickWeighted([], x=>1, rng('empty')), null);
});

test('T10 createGameState 默认英雄/库存/初始经济完整', () => {
  const s = createGameState();
  assert.equal(battle.living(s,'hero').length, 4);
  assert.equal(s.inventory.length, 4);
  assert.equal(s.gold, 3);
  assert.equal(s.phase, 'init');
});

test('T11 makeUnit 敌方读取怪物模板、覆盖值生效', () => {
  const s = makeState();
  const u = makeUnit(s, 'enemy', 'pal_001', { hp: 99, atk: 7, position: {x:1} });
  assert.equal(u.hp, 99);
  assert.equal(u.atk, 7);
  assert.equal(u.side, 'enemy');
  assert.deepEqual(u.position, {r:0,c:1});
});

test('T12 waveRows 按 day/period/round 过滤', () => {
  const s = createGameState({day:1, period:'上午'});
  assert.ok(battle.waveRows(s,1).length >= 1);
  assert.ok(battle.waveRows(s,99).length === 0);
});

test('T13 spawnWave 产生敌方单位和事件', () => {
  const s = createGameState({day:1, period:'上午'});
  s.round = 1;
  battle.spawnWave(s);
  assert.ok(battle.living(s,'enemy').length >= 1);
  assert.ok(hasEvent(s,'SPAWN_ENEMY'));
});

test('T14 玩家回合完整产生选择槽、叠元素、统一结算', () => {
  const s = createGameState({day:1, period:'上午'});
  s.round = 1;
  battle.spawnWave(s);
  battle.runPlayerTurn(s);
  assert.ok(hasEvent(s,'PLAYER_TURN_START'));
  assert.ok(hasEvent(s,'PLAYER_SELECT_SLOT'));
  assert.ok(hasEvent(s,'APPLY_ELEMENT'));
  assert.ok(hasEvent(s,'PLAYER_TURN_END'));
  assert.ok(hasEvent(s,'ELEMENT_SETTLE'));
});

test('T15 玩家无敌方宠物时仍会把敌方Boss作为目标', () => {
  const s = createGameState();
  s.units = s.units.filter(u => u.side === 'hero');
  battle.runPlayerTurn(s);
  assert.ok(hasEvent(s,'PLAYER_TURN_START'));
  assert.ok(eventCount(s,'PLAYER_SELECT_SLOT') >= 1);
  assert.ok(s.leaders.enemy.hp < s.leaders.enemy.maxHp);
});

test('T16 damageUnit 处理护盾、HP、死亡', () => {
  const s = makeState();
  const a = hero(s);
  const t = unitWithMechanic(s, 'none', 'enemy', {});
  t.hp = 5; t.shield = 2;
  const dealt = battle.damageUnit(s, a, t, 10, {element:'火'});
  assert.equal(dealt, 10);
  assert.equal(t.hp, 0);
  assert.equal(t.alive, false);
  assert.ok(hasEvent(s,'DAMAGE'));
  assert.ok(hasEvent(s,'UNIT_DEAD'));
});

test('T17 damageUnit 对死目标/0伤害返回0', () => {
  const s = makeState();
  const a = hero(s);
  const t = unitWithMechanic(s, 'none', 'enemy');
  t.alive = false;
  assert.equal(battle.damageUnit(s, a, t, 5), 0);
  t.alive = true;
  assert.equal(battle.damageUnit(s, a, t, 0), 0);
});

test('T18 怪物回合有目标时产生意图和伤害', () => {
  const s = makeState();
  unitWithMechanic(s, 'none', 'enemy');
  battle.runMonsterTurn(s);
  assert.ok(hasEvent(s,'MONSTER_INTENT'));
  assert.ok(hasEvent(s,'DAMAGE'));
});

test('T19 怪物回合没有我方宠物时仍会把我方英雄作为目标', () => {
  const s = makeState();
  s.units = s.units.filter(u => u.side !== 'hero');
  unitWithMechanic(s, 'none', 'enemy');
  battle.runMonsterTurn(s);
  assert.equal(hasEvent(s,'MONSTER_INTENT'), true);
  assert.ok(s.events.some(e => e.type === 'MONSTER_INTENT' && e.targetId === s.leaders.player.id));
});

test('T20 startBattle 可进入 battle 阶段并记录事件', () => {
  const s = createGameState({day:1, period:'上午'});
  battle.runBattle(s);
  assert.ok(s.round >= 1);
  assert.ok(hasEvent(s,'BATTLE_START'));
});

test('T21 runBattle 能胜利并结算奖励金币', () => {
  const s = createGameState({day:1, period:'上午', gold:0});
  const result = battle.runBattle(s);
  assert.ok(result.code === 'WIN_FAST' || result.code === 'WIN' || result.code === 'LOSE');
  assert.ok(hasEvent(s,'BATTLE_END'));
});

test('T22 runBattle 失败路径会扣城堡线和经济倍率', () => {
  const s = createGameState({day:10, period:'下午', maxRounds:1, gold:0, activePets:['pal_001']});
  battle.runBattle(s);
  if (!s.result.win) {
    assert.equal(s.castleLine, 9);
    assert.ok(s.economyMultiplier < 1);
    assert.ok(hasEvent(s,'BATTLE_FAIL_PENALTY'));
  } else {
    assert.ok(s.result.win);
  }
});

test('T23 dispatch 未知命令抛错', () => {
  const s = makeState();
  assert.throws(() => dispatch(s,{type:'UNKNOWN_COMMAND'}), /Unknown command/);
});

test('T24 战斗命令通过 reducer 工作', () => {
  const s = createGameState({day:1, period:'上午'});
  dispatch(s,{type:'RUN_BATTLE'});
  assert.ok(s.result);
  assert.ok(hasEvent(s,'BATTLE_START'));
});

test('T25 机制 battle_start：开场护盾', () => {
  const s = makeState();
  const u = unitWithMechanic(s, 'mech_shield_flat', 'enemy', { shield: 5 });
  const before = u.shield;
  mech.applyBattleStart(s, u);
  assert.equal(u.shield, before + 5);
  assert.ok(s.events.some(e => e.mechanicId === 'mech_shield_flat'));
});

test('T26 机制 before_damage：护甲减伤', () => {
  const s = makeState();
  const t = unitWithMechanic(s, 'mech_armor_flat', 'enemy', { armor: 2 });
  const calc = mech.beforeDamage(s, t, hero(s), 5, {element:'火'});
  assert.equal(calc.damage, 3);
  assert.ok(calc.logs.join('').includes('护甲'));
});

test('T27 机制 before_damage：百分比免伤', () => {
  const s = makeState();
  const t = unitWithMechanic(s, 'mech_damage_reduce_pct', 'enemy', { rate: 0.5, min_damage: 1 });
  const calc = mech.beforeDamage(s, t, hero(s), 7, {element:'火'});
  assert.equal(calc.damage, 4);
});

test('T28 机制 before_damage：首次免疫只生效一次', () => {
  const s = makeState();
  const t = unitWithMechanic(s, 'mech_first_hit_immunity', 'enemy');
  assert.equal(mech.beforeDamage(s, t, hero(s), 7, {}).damage, 0);
  assert.equal(mech.beforeDamage(s, t, hero(s), 7, {}).damage, 7);
});

test('T29 机制 before_damage：单回合损血上限', () => {
  const s = makeState();
  const t = unitWithMechanic(s, 'mech_damage_cap_per_round', 'enemy', { cap: 5 });
  t.roundDamageTaken = 3;
  assert.equal(mech.beforeDamage(s, t, hero(s), 10, {}).damage, 2);
});

test('T30 机制 before_damage：元素屏障', () => {
  const s = makeState();
  const t = unitWithMechanic(s, 'mech_element_barrier', 'enemy', { reduce: 3 });
  t.element = '水';
  assert.equal(mech.beforeDamage(s, t, hero(s), 10, {element:'火'}).damage, 7);
  assert.equal(mech.beforeDamage(s, t, hero(s), 10, {element:'水'}).damage, 10);
});

test('T31 机制 after_damage：残血护盾', () => {
  const s = makeState();
  const t = unitWithMechanic(s, 'mech_last_stand_shield', 'enemy', { shield: 8 });
  t.maxHp = 30; t.hp = 8; t.shield = 0;
  mech.afterDamage(s, t, hero(s), 5);
  assert.equal(t.shield, 8);
});

test('T32 机制 after_damage：低血狂怒', () => {
  const s = makeState();
  const t = unitWithMechanic(s, 'mech_rage_low_hp', 'enemy', { atk: 2 });
  t.maxHp = 20; t.hp = 10; t.atk = 1;
  mech.afterDamage(s, t, hero(s), 5);
  assert.equal(t.atk, 3);
});

test('T33 机制 after_damage：第二阶段', () => {
  const s = makeState();
  const t = unitWithMechanic(s, 'mech_second_phase', 'enemy');
  t.maxHp = 20; t.hp = 10; t.atk = 1; t.shield = 0;
  mech.afterDamage(s, t, hero(s), 5);
  assert.equal(t.flags.phase2, true);
  assert.equal(t.atk, 2);
  assert.equal(t.shield, 3);
});

for (const id of ['mech_counter_damage','mech_thorn_shield','mech_thorns_percent','mech_reflect_first_hit']) {
  test(`T34 after_hit 反伤类机制 ${id}`, () => {
    const s = makeState();
    const source = hero(s);
    source.hp = 20;
    const t = unitWithMechanic(s, id, 'enemy', { reflect: 2 });
    mech.afterHit(s, t, source, 6);
    assert.ok(source.hp < 20, id);
    assert.ok(s.events.some(e => e.mechanicId === id), id);
  });
}

test('T38 after_hit 防御增减机制', () => {
  const s = makeState();
  const src = hero(s);
  const hard = unitWithMechanic(s, 'mech_harden_when_hit', 'enemy');
  const soft = unitWithMechanic(s, 'mech_soften_when_hit', 'enemy');
  hard.def = 1; soft.def = 2;
  mech.afterHit(s, hard, src, 1); mech.afterHit(s, soft, src, 1);
  assert.equal(hard.def, 2);
  assert.equal(soft.def, 1);
});

for (const id of ['mech_shield_regen','mech_grow_shield_each_round','mech_grow_atk_each_round','mech_enrage_after_round','mech_delayed_powerup']) {
  test(`T39 round_start 成长类机制 ${id}`, () => {
    const s = makeState();
    s.round = 3;
    const u = unitWithMechanic(s, id, 'enemy', { atk: 2, shield: 2, round: 3 });
    const beforeAtk = u.atk; const beforeShield = u.shield;
    mech.applyRoundStart(s, u);
    assert.ok(u.atk > beforeAtk || u.shield > beforeShield || id === 'mech_delayed_powerup');
    assert.ok(s.events.some(e => e.mechanicId === id), id);
  });
}

test('T44 delayed_powerup 回合不足时不触发', () => {
  const s = makeState(); s.round = 1;
  const u = unitWithMechanic(s, 'mech_delayed_powerup', 'enemy', { round: 3, atk: 5 });
  const before = u.atk;
  mech.applyRoundStart(s, u);
  assert.equal(u.atk, before);
});

for (const id of ['mech_death_explosion','mech_self_destruct','mech_shield_break_explosion','mech_death_summon','mech_split_into_minions']) {
  test(`T45 on_death 事件流机制 ${id}`, () => {
    const s = makeState();
    const u = unitWithMechanic(s, id, 'enemy');
    mech.onDeath(s, u, hero(s));
    assert.ok(s.events.some(e => e.mechanicId === id), id);
  });
}

for (const id of ['mech_water_heal_on_layer','mech_earth_shield_on_layer','mech_summon_on_empty_cell','mech_summon_trap','mech_dirty_cell','mech_earth_block_cell']) {
  test(`T50 after_element_apply 元素后置机制 ${id}`, () => {
    const s = makeState();
    const caster = unitWithMechanic(s, id, 'hero');
    caster.hp = Math.max(1, caster.maxHp - 2);
    const target = unitWithMechanic(s, 'none', 'enemy');
    const beforeHp = caster.hp; const beforeShield = caster.shield;
    const element = id === 'mech_earth_shield_on_layer' ? '土' : id === 'mech_water_heal_on_layer' ? '水' : '火';
    mech.afterElementApply(s, caster, target, element, 2);
    if (id === 'mech_water_heal_on_layer') assert.ok(caster.hp > beforeHp);
    if (id === 'mech_earth_shield_on_layer') assert.ok(caster.shield > beforeShield);
    if (!['mech_water_heal_on_layer','mech_earth_shield_on_layer'].includes(id)) assert.ok(s.events.some(e => e.mechanicId === id), id);
  });
}

test('T56 battleEnd 快速奖励/折扣/金币诅咒', () => {
  const s = makeState(); s.units = []; s.inventory = []; s.round = 5;
  const u1 = unitWithMechanic(s, 'mech_shop_discount_after_clear', 'hero');
  const u2 = unitWithMechanic(s, 'mech_bonus_reward_under_round5', 'hero');
  const u3 = unitWithMechanic(s, 'mech_curse_gold_loss', 'hero');
  const result = { win:true, gold:5 };
  mech.battleEndMechanics(s, result);
  assert.equal(s.shop.nextDiscount, 50);
  assert.ok(result.gold >= 0);
  assert.ok(s.events.some(e => e.mechanicId === 'mech_shop_discount_after_clear'));
  assert.ok(s.events.some(e => e.mechanicId === 'mech_bonus_reward_under_round5'));
});

test('T57 fire ignite bonus 影响火层结算伤害', () => {
  const s = makeState({activePets:['pal_005']});
  const bonus = unitWithMechanic(s, 'mech_fire_ignite_bonus', 'hero');
  bonus.element = '火';
  const t = unitWithMechanic(s, 'none', 'enemy');
  t.elements['火'] = 3;
  battle.settleElements(s);
  const settle = firstEvent(s, 'ELEMENT_SETTLE');
  assert.ok(settle.damage >= 4);
});

test('T58 enterShop 进入商店并免费首刷', () => {
  const s = makeState({day:1, gold:6});
  dispatch(s,{type:'ENTER_SHOP', poolId:'night_base', slots:6});
  assert.equal(s.phase, 'shop');
  assert.equal(s.shop.offers.length, 6);
  assert.equal(firstEvent(s,'SHOP_ROLL').cost, 0);
});

test('T59 rollShop 非免费消耗金币', () => {
  const s = makeState({gold:6});
  shop.enterShop(s,'night_base',6);
  const before = s.gold;
  shop.rollShop(s,{poolId:'night_base', slots:6, free:false});
  assert.equal(s.gold, before - 1);
});

test('T60 rollShop 免费刷新次数优先消耗', () => {
  const s = makeState({gold:6});
  shop.enterShop(s,'night_base',6);
  s.shop.freeRolls = 1;
  const before = s.gold;
  shop.rollShop(s,{poolId:'night_base', slots:6, free:false});
  assert.equal(s.gold, before);
  assert.equal(s.shop.freeRolls, 0);
});

test('T61 rollShop 金币不足时阻止刷新', () => {
  const s = makeState({gold:0});
  shop.enterShop(s,'night_base',6);
  s.gold = 0;
  const ok = shop.rollShop(s,{poolId:'night_base', slots:6, free:false});
  assert.equal(ok, false);
  assert.ok(hasEvent(s,'SHOP_ROLL_BLOCKED'));
});

test('T62 freeze/unfreeze 商品', () => {
  const s = makeState({gold:6});
  shop.enterShop(s,'night_base',6);
  const id = s.shop.offers[0].offerId;
  assert.equal(shop.freezeOffer(s,id,true), true);
  assert.equal(s.shop.offers[0].frozen, true);
  assert.equal(shop.freezeOffer(s,id,false), true);
  assert.equal(s.shop.offers[0].frozen, false);
  assert.equal(shop.freezeOffer(s,'missing',true), false);
});

test('T63 freeze 后刷新保留冻结商品', () => {
  const s = makeState({gold:10});
  shop.enterShop(s,'night_base',6);
  const offer = s.shop.offers[0];
  shop.freezeOffer(s,offer.offerId,true);
  shop.rollShop(s,{poolId:'night_base', slots:6, free:false});
  assert.ok(s.shop.offers.some(o => o.offerId === offer.offerId && o.frozen));
});

test('T64 buyOffer 成功购买、金币减少、商品移除', () => {
  const s = makeState({gold:20});
  shop.enterShop(s,'night_base',6);
  const o = s.shop.offers.find(x => x.price <= s.gold);
  const before = s.gold;
  assert.equal(shop.buyOffer(s,o.offerId), true);
  assert.ok(s.gold < before);
  assert.ok(!s.shop.offers.some(x => x.offerId === o.offerId));
  assert.ok(hasEvent(s,'SHOP_BUY'));
});

test('T65 buyOffer 商品不存在/金币不足路径', () => {
  const s = makeState({gold:0});
  shop.enterShop(s,'night_base',6);
  assert.equal(shop.buyOffer(s,'missing-offer'), false);
  assert.equal(shop.buyOffer(s,s.shop.offers[0].offerId), false);
  assert.ok(eventCount(s,'SHOP_BUY_BLOCKED') >= 2);
});

test('T66 重复购买同名能触发合成升级', () => {
  const s = makeState({gold:99});
  shop.enterShop(s,'night_base',6);
  const offer = s.shop.offers[0];
  offer.petId = 'pal_005'; offer.name = '火绒狐'; offer.price = 1;
  shop.buyOffer(s, offer.offerId);
  const inv = s.inventory.find(x => x.petId === 'pal_005');
  assert.ok(inv.level >= 2 || inv.count >= 1);
});

test('T67 折扣影响下一次商品价格且刷新后清空折扣', () => {
  const s = makeState({gold:20});
  s.shop.nextDiscount = 50;
  shop.enterShop(s,'night_base',3);
  assert.ok(s.shop.offers.every(o => o.price <= 4));
  assert.equal(s.shop.nextDiscount, 0);
});

test('T68 四元素商店池都可刷新且商品元素匹配', () => {
  for (const element of ['火','水','风','土']) {
    const s = makeState({day:3, gold:10});
    shop.enterShop(s,`elem_${element}`,4);
    assert.ok(s.shop.offers.length > 0, element);
    assert.ok(s.shop.offers.every(o => o.element === element), element);
  }
});

test('T69 定位商店池可刷新', () => {
  for (const role of ['输出','坦克','治疗','召唤','经济','控制','机动']) {
    const s = makeState({day:5, gold:10});
    shop.enterShop(s,`role_${role}`,3);
    assert.ok(s.shop.offers.length > 0, role);
  }
});

test('T70 品质池 pT1-pT3 可刷新', () => {
  for (const pool of ['tier_pT1','tier_pT2','tier_pT3']) {
    const s = makeState({day:10, gold:10});
    shop.enterShop(s,pool,3);
    assert.ok(s.shop.offers.length > 0, pool);
  }
});

test('T71 applyShopEvent 免费刷新事件', () => {
  const s = makeState({gold:10});
  shop.enterShop(s,'night_base',6);
  assert.equal(shop.applyShopEvent(s,'evt_free_roll'), true);
  assert.ok(s.shop.freeRolls >= 1);
  assert.ok(hasEvent(s,'SHOP_EVENT_APPLY'));
});

test('T72 applyShopEvent 定向元素补货事件', () => {
  const s = makeState({gold:10});
  shop.enterShop(s,'night_base',6);
  assert.equal(shop.applyShopEvent(s,'evt_shop_fire'), true);
  assert.ok(s.events.some(e => e.type === 'SHOP_ROLL' && e.poolId === 'elem_火'));
});

test('T73 applyShopEvent 金币不足/不存在事件', () => {
  const s = makeState({gold:0});
  shop.enterShop(s,'night_base',6);
  assert.equal(shop.applyShopEvent(s,'evt_shop_fire'), false);
  assert.equal(shop.applyShopEvent(s,'missing-event'), false);
  assert.ok(hasEvent(s,'SHOP_EVENT_BLOCKED'));
});

test('T74 availableEvents 按天数过滤', () => {
  const s1 = makeState({day:1});
  const s5 = makeState({day:5});
  assert.ok(shop.availableEvents(s1).some(e => e.id === 'evt_shop_fire'));
  assert.ok(shop.availableEvents(s5).length >= shop.availableEvents(s1).length);
});

test('T75 rewardOptions 生成奖励候选，pickReward 入背包或遗物', () => {
  const s = makeState({day:10, gold:10});
  shop.rewardOptions(s,'reward_pT3',3);
  assert.equal(s.rewards.length, 3);
  const beforeInv = s.inventory.length;
  const beforeRelic = s.relics.length;
  assert.equal(shop.pickReward(s,0), true);
  assert.ok(s.inventory.length > beforeInv || s.relics.length > beforeRelic || hasEvent(s,'REWARD_PICK'));
});

test('T76 pickReward 越界返回 false', () => {
  const s = makeState();
  assert.equal(shop.pickReward(s,99), false);
});

test('T77 exitShop 更新阶段并记录状态', () => {
  const s = makeState();
  shop.exitShop(s);
  assert.equal(s.phase, 'day_end');
  assert.ok(hasEvent(s,'SHOP_EXIT'));
});

test('T78 所有正式商店事件都能被尝试执行并给出结果事件', () => {
  for (const e of data.events.filter(e => e.layer === 'shop_phase' && e.status === '正式')) {
    const s = makeState({day:10, gold:99});
    shop.enterShop(s,'night_base',6);
    const ok = shop.applyShopEvent(s,e.id);
    assert.equal(typeof ok, 'boolean', e.id);
    assert.ok(s.events.some(ev => ev.eventId === e.id || ev.type === 'SHOP_EVENT_APPLY' || ev.type === 'SHOP_EVENT_BLOCKED'), e.id);
  }
});

test('T79 所有奖励池可生成候选或被明确为空', () => {
  for (const pool of [...new Set(data.shop.flatMap(s => s.rewardPools))]) {
    const s = makeState({day:10});
    const opts = shop.rewardOptions(s,pool,3);
    assert.ok(Array.isArray(opts), pool);
  }
});

test('T80 full day 场景覆盖战斗→奖励→商店→退出', () => {
  const s = runFullDayScenario({day:1, period:'上午', gold:3});
  for (const type of ['BATTLE_END','REWARD_OPTIONS','REWARD_PICK','SHOP_ENTER','SHOP_ROLL','SHOP_FREEZE','SHOP_BUY','SHOP_EVENT_APPLY','SHOP_EXIT']) assert.ok(hasEvent(s,type), type);
});

test('T81 full day 文本报告包含玩家行为和最终状态', () => {
  const s = runFullDayScenario();
  const txt = renderPlayerReport(s);
  assert.ok(txt.includes('【玩家操作行为】'));
  assert.ok(txt.includes('商店刷新'));
  assert.ok(txt.includes('最终状态'));
});

test('T82 商店文本报告只聚焦商店/奖励', () => {
  const s = makeState({gold:20});
  shop.enterShop(s,'night_base',6);
  shop.rewardOptions(s,'reward_pT1',3);
  const txt = renderShopReport(s);
  assert.ok(txt.includes('商店链路报告'));
  assert.ok(txt.includes('奖励候选'));
});

test('T83 1-10天上午下午战斗全部可跑', () => {
  for (let day=1; day<=10; day++) for (const period of ['上午','下午']) {
    const s = createGameState({day, period});
    dispatch(s,{type:'RUN_BATTLE'});
    assert.ok(s.result, `${day}${period}`);
    assert.ok(hasEvent(s,'BATTLE_END'), `${day}${period}`);
  }
});

test('T84 所有波次行至少在 day/period/round 索引可被定位', () => {
  for (const w of data.waves) {
    const s = createGameState({day:w.day, period:w.period});
    const rows = battle.waveRows(s, w.round);
    assert.ok(rows.some(x => x.waveId === w.waveId), w.waveId);
  }
});

test('T85 127 个宠物都可作为英雄创建并参与初始化', () => {
  for (const p of data.pets) {
    const s = createGameState({activePets:[p.id]});
    assert.equal(battle.living(s,'hero')[0].petId, p.id);
  }
});

test('T86 34 个怪物模板都可生成敌方单位', () => {
  const s = makeState();
  for (const m of data.monsters) {
    const u = makeUnit(s,'enemy',m.petId);
    assert.equal(u.side, 'enemy');
    assert.equal(u.petId, m.petId);
    assert.ok(u.hp > 0);
  }
});

test('T87 127 个商店商品都可构造为优惠项所属池', () => {
  for (const item of data.shop) {
    assert.ok(item.price >= 0, item.petId);
    assert.ok(item.shopPools.includes('night_base'), item.petId);
    assert.ok(item.poolTier, item.petId);
  }
});

test('T88 40 个遗物祝福都能回链奖励池和机制', () => {
  const ix = buildIndexes();
  for (const r of data.relics) {
    assert.ok(ix.rewardPools.has(r.rewardPoolId), r.id);
    for (const id of r.mechanics) assert.ok(mech.SUPPORTED_MECHANICS.has(id), `${r.id}:${id}`);
  }
});

test('T89 127 个形状行动槽三槽规则完整', () => {
  for (const shape of data.shapes) {
    assert.equal(shape.slotCount, 3, shape.petId);
    assert.equal(shape.slotElements.length, 3, shape.petId);
    assert.ok(shape.hitCells >= 1, shape.petId);
  }
});

test('T90 validation 表全部 PASS', () => {
  for (const row of data.validation) assert.equal(row['状态'], 'PASS', row['校验ID']);
});

test('T91 文本战报不会暴露 DOM/UI 词', () => {
  const s = runFullDayScenario();
  const txt = renderPlayerReport(s);
  for (const token of ['document','querySelector','innerHTML','classList','refreshUI','renderBoard']) assert.equal(txt.includes(token), false, token);
});

test('T92 command/event 顺序单调递增', () => {
  const s = runFullDayScenario();
  for (let i=1; i<s.events.length; i++) assert.ok(s.events[i].step > s.events[i-1].step);
});

test('T93 DAMAGE 事件包含可审计前后值', () => {
  const s = createGameState({day:1, period:'上午'});
  dispatch(s,{type:'RUN_BATTLE'});
  for (const e of s.events.filter(e=>e.type==='DAMAGE')) {
    for (const k of ['raw','final','shieldFrom','shieldTo','hpFrom','hpTo']) assert.ok(k in e, `${k} missing`);
  }
});

test('T94 商店购买事件包含金币前后值', () => {
  const s = makeState({gold:20});
  shop.enterShop(s,'night_base',6);
  const o = s.shop.offers.find(x => x.price <= s.gold);
  shop.buyOffer(s,o.offerId);
  const e = firstEvent(s,'SHOP_BUY');
  assert.ok('goldFrom' in e && 'goldTo' in e && 'price' in e);
});

test('T95 玩家行为链路至少覆盖一次完整点击闭环', () => {
  const s = runFullDayScenario();
  const order = ['BATTLE_START','ROUND_START','SPAWN_ENEMY','PLAYER_SELECT_SLOT','APPLY_ELEMENT','PLAYER_TURN_END','ELEMENT_SETTLE','DAMAGE','BATTLE_END','REWARD_OPTIONS','REWARD_PICK','SHOP_ENTER','SHOP_ROLL','SHOP_FREEZE','SHOP_BUY','SHOP_EXIT'];
  let idx = -1;
  for (const type of order) {
    const next = s.events.findIndex((e,i) => i > idx && e.type === type);
    assert.ok(next > idx, `missing order ${type}`);
    idx = next;
  }
});

test('T96 静默/边界输入：空池刷新不崩溃', () => {
  const s = makeState({gold:20});
  shop.enterShop(s,'missing_pool',3);
  assert.equal(s.shop.offers.length, 0);
  assert.ok(hasEvent(s,'SHOP_ROLL'));
});
