# 自动玩家入口审查 & 测试口径

## 测试分类

| 分类 | 含义 | 允许行为 | 禁止行为 |
|------|------|----------|----------|
| `smoke-flow` | 流程烟测 | 快进跳过战斗，只验证天数/商店/Boss节点/不崩 | 不得声称"战斗系统通过" |
| `real-combat` | 真实战斗验收 | 走 AI 规划/useSlot/endPlayerTurn/怪物回合/日志/渲染 | 不得跳过战斗结算 |
| `unit` | 单元测试 | 允许直接调内部函数验证单一行为 | 不得替代最终玩家验收 |

---

## 一、playable_run.js — smoke-flow 定位

### 当前行为
- `clearBattleFast()` 直接设置所有怪物 `hp=1, dead=true`
- 跳过：战斗、元素场、陷阱、遗物触发、怪物回合、战斗日志
- 验证：天数推进、商店商品、Boss 节点存在、流程不崩

### 定位
**10 天流程快进烟测 / shop-day progression smoke test**  
不是真实战斗验收。不得以 `playable_run.js` 通过作为战斗系统正确的依据。

### 测试分类标签
```
smoke-flow
```
所有涉及 `clearBattleFast()` 或等价秒杀逻辑的场景，均归为 smoke-flow。

---

## 二、真实自动玩家验收入口 — real-combat 定位

符合条件的自动玩家路径：

### 入口 A：浏览器按钮
- 按钮：`index.html` id=`exa` "⚡ AI战斗"
- 调用链：`runAiBattleTurn()` → `runAiBattleTurn_async()` / `runAiBattleTurn_sync()`
- 规划：`planAiBattleTurn()` → `buildAiBattleTurnPlan()`
- 执行：移动英雄 → 逐个 useSlot → endPlayerTurn → 怪物回合 → 进入商店
- 环境：浏览器（异步 setTimeout）或 `__TEST__` 环境（同步）

### 入口 B：scripts/run_10day_simulation
- 文件：`scripts/run_10day_simulation.js`
- 调用：`buildAiBattleTurnPlan()` → 手动执行 moves → 逐个 useSlot
- 环境：Node（同步）
- **注意**：这是目前唯一一个复用浏览器 AI 计划函数的批量脚本

### 验证要求（real-combat）
- 必须走 `buildAiBattleTurnPlan()` 或 `planAiBattleTurn()` 规划路径
- 必须通过 `useSlot()` 触发战斗结算
- 必须经过 `endPlayerTurn()` → 怪物回合
- 必须触发元素场、陷阱、遗物 hook、战斗日志

---

## 三、自动玩家入口分叉登记

### 当前状态

| 场景 | 入口 | 分类 | 风险 |
|------|------|------|------|
| 浏览器 AI 战斗 | `runAiBattleTurn()` | real-combat | — |
| scripts/run_10day_simulation | `buildAiBattleTurnPlan()` | real-combat | 唯一复用路径，易被忽略 |
| playable_run.js | `clearBattleFast()` | smoke-flow | **秒杀跳过全部战斗** |
| playable_day1.js | 内联 slot 遍历 | smoke-flow | 只到 Day1，不走 AI 计划 |

### 风险描述
- 快进脚本通过 ≠ 战斗系统通过
- `clearBattleFast()` 跳过元素/陷阱/遗物/怪物回合，战斗平衡问题不会被它检出
- 如果未来战斗数值出了问题，smoke-flow 仍然可能通过，产生误报

### 后续建议
等有明确的"自动化测试增强"任务时再做统一入口改造：
- 将 `runAiBattleTurn_sync()` 暴露为公共入口
- `playable_run.js` 增加可选参数 `--real-combat`，走真实战斗路径
- 所有 smoke-flow 测试在报告中标记测试分类，不得声称覆盖战斗系统
