# 架构修复报告（2026-06-08 重构后）

> 基于 `d93e852~fa3ad2c` 到 `HEAD` 的重构提交

## 已修复的问题

| 原始问题 | 修复方式 | 涉及文件 | 状态 |
|---------|---------|---------|------|
| 核心引擎分裂 | 新建 `elements.cjs`，统一 fireDamage/explodeIfEnemyOnFire/waterCatalyst/transferFire。battle.cjs:settleElements 调用 elements.cjs 的火引爆 Σ(1..N)。 | `elements.cjs` `battle.cjs` `trialEngine.cjs` | ✅ 已完成 |
| 三条单元创建路径 | 新建 `unitFactory.cjs`，包含 `createUnit` / `makeUnitFromData` / `makeTrialUnit` 三个入口，都通过同一个 `createUnit` 函数统一字段。state.cjs:makeUnit 改为调用 unitFactory。day7FireTrial.cjs 已改为纯代理。 | `unitFactory.cjs` `state.cjs` `trialEngine.cjs` | ✅ 已完成 |
| mechanics.cjs 空机制 | 新增 `MECHANIC_STATUS` 映射，每个 ID 标记为 `implemented` / `data_only` / `pending`。火域/水域/风域/试炼相关标记为 implemented。~30 个标记为 pending 等待后续实现。 | `mechanics.cjs` | ✅ 已完成 |
| trialEngine 独立 CSV | 移除 `fs.readFileSync + parseCsv`，走 `state.data` 统一加载。`loadTrialConfig` 接收 state 参数，从 `state.data.day7Trial` 等已加载的表中读取。 | `trialEngine.cjs` | ✅ 已完成 |
| 元素系统不一致 | 新建 `elements.cjs`，`ACTIVE_ELEMENTS = [火水风]`、`COMPAT_ELEMENTS = [火水风土]`。state.cjs ELEMENTS 使用 COMPAT_ELEMENTS 保留兼容。UI 显示层只读 ACTIVE_ELEMENTS。 | `elements.cjs` `state.cjs` | ✅ 已完成 |
| 英雄领域未接入 | 新增 `mechanics.cjs:applyHeroDomainsFromCsv / syncHeroDomainsToLeaders / hasHeroDomain`。从 `state.data.heroDomains` 读取 CSV 11 表，根据上场宠物将效果挂接到英雄 mechanics。 | `mechanics.cjs` `trialEngine.cjs` | ✅ 已完成 |
| 攻击后锁定位置 | 新增 `hasAttacked` 标记。useActionSlot 和 runPlayerTurn 在攻击后设置 hasAttacked=true。moveHero 检查 hasAttacked 阻止攻击后移动。 | `battle.cjs` | ✅ 已完成 |

## 当前架构图示

```
elements.cjs          ← 元素配置 + 火引爆/水催化/风聚火统一入口
unitFactory.cjs       ← 单位创建统一入口
mechanics.cjs         ← 机制注册表(MECHANIC_STATUS) + 钩子执行 + 英雄领域
state.cjs             ← 状态结构（使用 elements.cjs + unitFactory.cjs）
battle.cjs            ← 战斗引擎（调用 elements.cjs 的火引爆结算）
trialEngine.cjs       ← 试炼引擎（读取 state.data，调用 elements/unitFactory/mechanics）
day7FireTrial.cjs     ← 纯代理（15行，仅调用 trialEngine）
csvData.cjs           ← CSV 加载（唯一入口）
```

## 仍需解决的问题

| 问题 | 优先级 | 说明 |
|------|--------|------|
| textReport.cjs 空壳 | 🟢 P2 | 7 行，按 12 步格式重写 |
| package.json 脚本混乱 | 🟢 P2 | test/check:all 引用旧路径 |
| ~30 个 pending 机制 | 🟢 P2 | 在 MECHANIC_STATUS 中标记为 pending，无实现代码 |
| 火引爆只检查直接目标格 | 🟡 P1 | 十字范围引爆（splash）未实现 |
| 空格爆火陷阱的进入触发 | 🟡 P1 | 怪物进入/推入陷阱时触发引爆未实现 |
| 战斗结束后 fire lock 重置 | 🟢 P2 | hasAttacked 在回合/战斗间未重置 |
