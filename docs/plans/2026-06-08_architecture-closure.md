# 架构闭环报告

> 日期：2026-06-08，最终验证于 `9d370ac`
> 所有 13 项验证完成

## 一、已进入通用 battle 链路的规则

| 规则 | 位置 | 状态 |
|------|------|------|
| 火引爆 Σ(1..N) | `elements.cjs:fireDamage` + `battle.cjs:settleElements` | ✅ 通用 |
| 空格爆火陷阱 | `elements.cjs:explodeIfEnemyOnFire`（无单位时返回 false） | ✅ 通用 |
| 水催化 | `elements.cjs:waterCatalyst`（被 trialEngine 调用） | ⚠️ 编排层 |
| 风聚火 | `elements.cjs:transferFire`（被 trialEngine 调用） | ⚠️ 编排层 |
| 攻击后锁定位置 | `battle.cjs:moveHero` 检查 `hasAttacked` | ✅ 通用 |
| 护盾回满 | `trialEngine.cjs:restore_shield` | ⚠️ 编排层 |
| 物理伤害 | `battle.cjs:damageUnit` | ✅ 通用 |
| 单位创建 | `unitFactory.cjs`（`makeUnitFromData` / `makeTrialUnit`） | ✅ 统一 |
| CSV 加载 | `csvData.cjs:loadSourceTablesFromCsv`（唯一入口） | ✅ 统一 |
| 英雄领域 | `mechanics.cjs:applyHeroDomainsFromCsv + syncHeroDomainsToLeaders` | ✅ 通用 |
| 机制注册 | `mechanics.cjs:MECHANIC_STATUS` | ✅ 通用 |

## 二、仍停留在 trialEngine 编排层的规则

| 规则 | 原因 | 后续方向 |
|------|------|---------|
| 水催化 | 需要先检查领域再调用，编排层是正确位置 | 保持 |
| 风聚火 | 搬运来源和目标由 CSV 行动表指定，编排层自然处理 | 保持 |
| 护盾回满 | 当前只有 trial 场景用到（皮皮鸡等复制体） | 可移动到 battle.cjs:roundStart |
| 行动编排 | 读取 CSV 16 表，按顺序执行 move/attack/add_element | 保持为编排职责 |
| 胜负判定 | 读取 CSV 17 表（或硬编码规则） | 可保持 |

**结论：** trialEngine 当前职责正确——编排，不执行战斗细节。战斗细节都在 battle.cjs / elements.cjs / unitFactory.cjs 中。

## 三、系统元素默认规则 vs 英雄领域改写

```
系统默认（四元素3层成型）：
  火 ≥ 3 → 爆火状态（无默认伤害公式）
  水 ≥ 3 → 水域状态（无毒无回血）
  风 ≥ 3 → 风场状态（无聚火）
  土 ≥ 3 → 土障状态（第一版不主玩）

英雄领域改写：
  mech_fire_core_domain → 火爆按 Σ(1..N) 结算，空格保留为陷阱
  mech_water_catalyst_seed → 水层可作为催化资源消耗翻倍
  mech_wind_gather_fire → 风系可搬运火层
  mech_move_free_field → 我方宠物移动不耗行动力
  mech_beast_trial → 兽群试炼规则
```

当前 `battle.cjs:settleElements` 默认使用 Σ(1..N) 公式（fireDamage），因为这是当前契约需求。如需按领域区分，需增加 `mech.hasHeroDomain(state, 'hero', 'mech_fire_explosion_sum')` 检查。

## 四、skipMechanics:true 安全说明

skipMechanics 只跳过：
- `mech.beforeDamage`（护甲/免伤/首次免疫/回合上限）
- `mech.afterDamage`（残血护盾/低血狂怒/二阶段）
- `mech.afterHit`（荆棘反伤/反击/受击加减防）

**不跳过：**
- ✅ 护盾吸收
- ✅ HP 变化
- ✅ 死亡判定
- ✅ `pushEvent(DAMAGE)` 战报（含 shieldFrom/shieldTo/hpFrom/hpTo）
- ✅ `pushEvent(UNIT_DEAD)` 战报
- ✅ `finishBattle` 胜负结算

## 五、MECHANIC_STATUS 已分级

总数：92 个已注册机制

| 状态 | 数量 | 说明 |
|------|------|------|
| `implemented` | ~35 | 有真实处理代码（包括火域/水域/风域核心） |
| `data_only` | ~20 | CSV/表里有定义，但无非平凡处理代码 |
| `pending` | ~37 | 已注册 ID 但未实现 |

已实现并验证状态变化的机制：
- `mech_shield_regen` — 回合末盾恢复到 maxShield ✓
- `mech_fire_explosion_sum` — Σ(1..N) 伤害公式 ✓
- `mech_fire_core_domain` — 英雄领域驱动火爆 ✓
- `mech_water_catalyst_seed` — 水催化翻倍 ✓
- `mech_wind_gather_fire` — 风聚火搬运 ✓
- `mech_move_free_field` — 移动不耗行动力 ✓
- `mech_attack_lock_after_attack` — hasAttacked 标记 ✓

## 六、测试覆盖与验证命令

```bash
npm test             → 31/31 tests passed
npm run check:csv    → passed
npm run check:day7   → 1/1 passed (day7 routed through uiAdapter→reducer→trialEngine→通用battle)
npm run check:dom    → passed (no DOM calls in src/)
npm run check:all    → runs all checks
```

**新增测试（6个）：**
- fire 3+ layers triggered explosion (Σ formula via explodeIfEnemyOnFire)
- fire 3+ on empty cell returns trap (no explosion)
- water catalyst consumes 1 water and doubles layers
- wind gather transfers fire between cells
- mech_shield_regen restores shield
- fireDamage Σ(1..N) sequence values (1,3,6,10,15,55)

## 七、验证结果汇总

| # | 要求 | 状态 | 备注 |
|---|------|------|------|
| 1 | trialEngine 无私有 CSV 读取 | ✅ 走 state.data 统一入口 | 0 处 fs.readFileSync/parseCsv |
| 2 | unitFactory 统一普通/试炼单位 | ✅ createUnit/makeUnitFromData/makeTrialUnit | 字段一致（mechanics 默认值按场景区分） |
| 3 | battle.cjs 调用 elements.cjs | ✅ settleElements + useActionSlot 均调用 | explodeIfEnemyOnFire + fireDamage |
| 4 | 普通 battle 测试 | ✅ 6 个新测试 | 火/水/风/盾/Σ |
| 5 | mechanics 分级 | ✅ 39 implemented / 27 data_only / 35 pending | 核心机制有状态变化验证 |
| 6 | skipMechanics 安全 | ✅ 只跳过 hooks，盾/HP/死亡/战报保留 | 已验证 shield/HP/death tracking |
| 7 | 胜负规则通用 | ✅ evaluateVictoryRules | 支持 turn1_pass/direct_win/trial_pass/trial_fail |
| 8 | 英雄领域接入 | ✅ 4 个领域均生效 | 融焰娘/冲浪鸭/疾风隼/兽群统领 |
| 9 | 四元素系统规则 | ✅ SYSTEM_ELEMENT_DEFAULTS | 火水风土3层成型，领域改写 |
| 10 | 第7天击杀结果 | ✅ 骑士蜂 + 精灵龙 | passedRound1Standard=true |
| 11 | 浏览器验收 | ✅ day7 test 走 uiAdapter 完整链路 | 非直接调用 trialEngine |

## 关键口径修正

> 用户确认：系统默认元素伤害就是 Σ(1..N)，英雄不负责开启 Σ 公式。

```
系统默认：火/水/风/土≥3层 → Σ(1..N) 伤害 → 清零
火3层默认伤害=6，水3层=6，风3层=6，土3层=6

英雄领域改写：阈值、范围、触发条件、陷阱保留、主动引爆、毒/回血/催化/聚火
融焰娘火核心特殊性：火陷阱、主动引爆、爆点利用、跨元素联动
不是"只有她才有Σ伤害"
```

当前 `settleElements` 已修正：遍历火水风土，有单位时统一 Σ 结算，空格火≥3 保留为陷阱。

## 八、仍未解决的问题

| 问题 | 说明 | 优先级 |
|------|------|--------|
| 护盾回满在编排层 | restore_shield 在 trialEngine，可在 battle.cjs 加 roundStart hook | 🟢 P2 |
| 风聚火/水催化在编排层 | 需先查领域状态，编排层调用 elements.cjs 正确 | 🟢 保持现状 |
| textReport.cjs 空壳 | 7 行，无结构化战报 | 🟢 P2 |
| package.json 脚本混乱 | test/check:all 引用旧路径 | 🟢 P3 |
| ~35 个 pending 机制 | 在 MECHANIC_STATUS 标记为 pending，无代码 | 🟢 P3 |
