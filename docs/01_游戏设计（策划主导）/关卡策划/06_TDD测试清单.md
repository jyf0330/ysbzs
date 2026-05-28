# TDD 测试清单 · 双层状态机重构

> 状态：待审阅
> 审阅后 → 写测试代码（RED） → 代码实现（GREEN）

---

## 组1：城堡（已有2 RED，待补1个）

| # | 测试名 | 断言 | 预期RED原因 |
|---|---|---|---|
| 1.1 | 城堡 HP=100，右侧 | `castle.hp===100`, `castle.maxHp===100`, `castle.pos.c>6` | 当前 hp:30, pos:(12,1) |
| 1.2 | 城堡摧毁=胜利 | `castle.hp=0`, `checkGameOver()`, phase=OVER, msg含"胜利" | 当前判断城堡被毁=失败 |
| 1.3 | 城堡格不可被英雄占用 | `moveHero(castle)` 后 hero.pos ≠ castle.pos | 移动检查已有，需确认 |
| 1.4 | 城堡HP每天回满 | DayStart → `castle.hp===castle.maxHp===100` | 当前无DayStart逻辑 |

---

## 组2：大流程状态机

一天结构：
```
DayStart → MorningBattle(2~3回合) → MiddayShop → AfternoonBattle(2~3回合) → NightShop → DayEnd
```

| # | 测试名 | 断言 | 预期RED原因 |
|---|---|---|---|
| 2.1 | DayStart 城堡回满 | castle.hp 从50回到100 | 无 macroPhase |
| 2.2 | MorningBattle 是回合子循环 | 上午战斗期间 macroPhase 保持 MORNING_BATTLE | 当前无 macroPhase |
| 2.3 | MorningBattle N回合后→MiddayShop | 达到该天上午回合上限→进商店 | 同上 |
| 2.4 | AfternoonBattle N回合后→NightShop | 达到该天下午回合上限→进商店 | 同上 |
| 2.5 | NightShop 结束→DayEnd | 晚上商店关闭→DayEnd | 同上 |
| 2.6 | DayEnd保留英雄 | dayEnd后 heroes 不清空 | 需确认跨天逻辑 |
| 2.7 | DayEnd保留金币 | dayEnd后 gold 不清零 | 当前每次进商店重算 |
| 2.8 | DayEnd→NextDayStart 城堡回满 | 第二天 castle.hp=100 | 无每日回满逻辑 |

---

## 组3：战斗状态机

| # | 测试名 | 断言 | 预期RED原因 |
|---|---|---|---|
| 3.1 | HeroAction只叠层不扣血 | useSlot后怪物hp不变 | 当前useSlot也不扣血✅，需确认 |
| 3.2 | ElementResolve统一结算 | 结算前怪物hp不变，结算后变化 | settleExplosions已有✅ |
| 3.3 | MonsterAction在Resolve之后 | endPlayerTurn中monsterAct在settle之后 | 当前顺序已对✅ |
| 3.4 | 阶段顺序完整 | PLAN→HERO→SUMMON→RESOLVE→MONSTER | 无SUMMON阶段❌ |
| 3.5 | CheckBattleEnd怪物全清 | 怪物全死后battlePhase=BATTLE_END | 当前finishMonsters已有 |
| 3.6 | CheckBattleEnd城堡归零 | castle.hp=0后battlePhase=BATTLE_END | 需添加 |

---

## 组4：召唤系统

| # | 测试名 | 断言 | 预期RED原因 |
|---|---|---|---|
| 4.1 | 空白格召唤普通小灵 | summon hp=6, atk=1 | 无召唤系统 |
| 4.2 | 火3格召唤火灵 | summon hp=9, atk=1, 火3层被清空 | 无 |
| 4.3 | 水3格召唤水灵 | summon hp=9, atk=1, 水3层被清空 | 无 |
| 4.4 | 召唤物自动移动 | pet向最近怪物移动1格 | 无 |
| 4.5 | 召唤物相邻攻击 | pet距怪物1格→攻击-ATK | 无 |
| 4.6 | 召唤物不攻击英雄 | pet不会以英雄为目标 | 无 |

---

## 组5：被动光环

| # | 测试名 | 断言 | 预期RED原因 |
|---|---|---|---|
| 5.1 | 兽语使+2HP+1ATK | 场上召唤物hp+2, atk+1 | 无 |
| 5.2 | 灵爆使死亡留火2 | 召唤物死亡→所在格fire=2 | 无 |
| 5.3 | 光环仅影响召唤物 | 英雄不受兽语使影响 | 无 |

---

## 组6：英雄上限

| # | 测试名 | 断言 | 预期RED原因 |
|---|---|---|---|
| 6.1 | MAX=4英雄可上阵 | activeCount可达4 | 当前slice(0,2) |
| 6.2 | 买英雄不满4直布 | activeCount<4→active=true | 当前>=2就备战 |
| 6.3 | 买英雄满4放备战 | activeCount>=4→active=false | 同上 |

---

## 组7：定价系统

| # | 测试名 | 断言 | 预期RED原因 |
|---|---|---|---|
| 7.1 | 青铜1档=2金 | calcUnitPrice(青铜,1)===2 | 无calcUnitPrice |
| 7.2 | 青铜2档=4金 | calcUnitPrice(青铜,2)===4 | 无 |
| 7.3 | 白银1档=4金 | calcUnitPrice(白银,1)===4 | 无 |
| 7.4 | genShop用calcUnitPrice | genShop生成的item.cost匹配公式 | 当前用unitPrice{tier1:3} |

---

## 组8：回合配置

| # | 测试名 | 断言 | 预期RED原因 |
|---|---|---|---|
| 8.1 | Day1 morning 2回合后进MiddayShop | 第2回合结束→macroPhase=MIDDAY_SHOP | 当前无回合计数上限配置 |
| 8.2 | Day1 afternoon 2回合后进NightShop | 第2回合结束→macroPhase=NIGHT_SHOP | 同上 |
| 8.3 | Day2 morning 2回合后进MiddayShop | 第2回合结束→SHOP | 同上 |
| 8.4 | Day2 afternoon 3回合后进NightShop | 第3回合结束→SHOP | Day1下午2回合，Day2下午3回合 |
| 8.5 | 同一战斗阶段内每回合battlePhase重置 | 每回合从PLAN重新开始 | 需确认battlePhase不跨回合残留 |
| 8.6 | 回合内HP跨回合保留（同一天内） | 第1回合受伤的怪物第2回合HP不变 | 当前已保留✅ |

---

## RED统计

- 已有RED：2个（城堡HP、城堡格占用）
- 新增预期RED：约20个
- 已通过不需改：约3个（3.1/3.2/3.3）
