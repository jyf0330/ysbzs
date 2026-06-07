# 《元素背包史》第一版 —— 现有代码 vs 新规则 差距分析表

> 基准日期：2026-06-08
> 源：game-rules-v1 记忆 + ysbzs-day7-fire-trial-connected.zip (含 day7FireTrial.cjs 实现)

## 一、7 个边界问题的答案（来自 zip 实现）

| # | 问题 | 答案（来自 day7FireTrial.cjs 实现） |
|---|------|--------------------------------------|
| 1 | 火引爆作用对象 | 伤害作用于 **该格上的单位**。若格上无单位，火层保持不引爆，变成"空格爆火陷阱"等待敌人进入。引爆后火层清零。 |
| 2 | 风核心具体效果 | 风 = **元素位移**。`transferFire` 将火层从一格搬运到另一格，不直接造成伤害。风击本身只铺风层，搬运火层是核心效果。 |
| 3 | 复制体等级与数量 | 第7天场景固定为 **4 只黄金品质复制体**（精灵龙/皮皮鸡/骑士蜂/棉悠悠），不是随机抽取。题型固定非半随机。 |
| 4 | 宠物挂接触发时机 | 目前 **无宠物挂接系统**。场景直接通过 `makeScenarioUnit` 创建 4 只预设宠物，绑定在英雄的 mechanics 字段（`move_free_field`, `fire_core_field`）。 |
| 5 | 附魔与品质关系 | 品质影响 **baseLayers**（黄金=2，白银/青铜=1）。附魔系统未实现，目前只有 mechanics 字段中的被动技能。 |
| 6 | "10回合"判定 | `state.maxRounds = 10` 是战斗总上限。目前只实现了第1回合的固定脚本流程，没有多回合循环。 |
| 7 | 水核心具体形式 | 水 = **火催化**：`consumeWaterCatalystForFire` — 同格有水层时消耗 1 水，本次施加火层 **翻倍**。水本身不造成毒/回血。 |

---

## 二、全局架构差距（更新版）

| 领域 | 当前实现 | 新规则要求 | 差距等级 | 改动范围 |
|------|---------|-----------|---------|---------|
| **元素系统** | 火水风土 (4元素) | 火水风 (3元素) | 🟡 中改 | 移除 土，但 day7 实现仍含土字段 |
| **英雄领域** | `leaders` + `factionRules` | `day7FireTrial` 用 mechanics 字段替代 (`move_free_field`, `fire_core_field`) | 🟡 中改 | 未解耦成独立系统 |
| **宠物池** | 旧 30+ 宠含土/副属 | 火12/水10/风8，青铜12/白银10/黄金8 | 🟢 小改 | CSV 已有但不含 day7 的新宠 |
| **战斗流程** | player_turn → move → useSlot → settle → monster | 与 day7 一致：move → attack × N → element | 🟢 小改 | 核心流程兼容 |
| **火结算** | threshold terrain + linear | **Sum(1..N) 引爆 + 清空** | 🔴 大改 | 当前 engine 无此逻辑 |
| **水结算** | terrain modules + linear | **催化剂：消耗 1 水 → 火层翻倍** | 🟡 中改 | 新机制，非默认 |
| **风结算** | wind_push 减AP | **元素位移：transferFire** | 🟡 中改 | 新机制 |
| **地形系统** | element→threshold→terrain→damage | **保留但 day7 不用** | 🟢 不动 | 可保留，新场景不用 |
| **敌方试炼** | wave CSV spawnWave | **day7FireTrial.cjs 已实现** | ✅ 已有 | 需接入正式 reducer |
| **行动块附魔** | 无 | 未在 zip 中实现 | 🔴 大改 | 需新建 |
| **文字战报** | events→JSON | day7 的 battleTrace 已含中文日志 | 🟢 小改 | 已有轮子 |

---

## 三、day7FireTrial.cjs 关键实现细节

### 火引爆公式
```js
// day7FireTrial.cjs: fireDamage()
function fireDamage(layers) {
  const n = Math.max(0, Number(layers || 0));
  return (n * (n + 1)) / 2;  // sum(1..N)
}
// 火3层 = 6, 火4层 = 10, 火10层 = 55
```

### 水催化逻辑
```js
// day7FireTrial.cjs: consumeWaterCatalystForFire()
// 同格有水层 > 0 → 消耗 1 水 → 本次施加火层翻倍
if ((cell.elements.水 || 0) > 0 && baseFire > 0) {
  cell.elements.水 -= 1;       // 消耗 1 水
  return baseFire * 2;         // 火层翻倍
}
```

### 风聚火逻辑
```js
// day7FireTrial.cjs: transferFire()
// 从格子 A 搬 amount 火层到格子 B
fromCell.elements.火 -= moved;
toCell.elements.火 += moved;
```

### 场景阵容

| 宠物 | 品质 | 体型 | 角色 | 形状 | 层数 | AP |
|------|------|------|------|------|------|----|
| 融焰娘 | 黄金 | 中型 | 火爆核心 | B2 爆心二连(2格) | 2 | 3 |
| 火绒狐 | 白银 | 中型 | 点火启动 | B2 隔点二刺(2格) | 1 | 3 |
| 冲浪鸭 | 白银 | 小型 | 水汽催化 | A2 单点水冲(1格) | 1 | 3 |
| 旋风狸 | 白银 | 中型 | 风聚合 | B2 旋风收束(2格) | 1 | 3 |

### 场景敌方

| 原型 | 品质 | 类型 | HP | 攻 | 盾 | AP | 题型 |
|------|------|------|----|----|----|----|------|
| 精灵龙复制体 | 黄金 | 支援题 | 42 | 8 | 6 | 3 | 支援 |
| 皮皮鸡复制体 | 黄金 | 护盾题 | 40 | 18 | 20 | 3 | 护盾(回合末回满) |
| 骑士蜂复制体 | 黄金 | 突击题 | 36 | 18 | 0 | 4 | 快速击杀 |
| 棉悠悠复制体 | 黄金 | 站场题 | 60 | 16 | 0 | 3 | 站场(会移动) |

---

## 四、ZIP 增量清单

需要从 zip 合并到当前项目的文件：

| 文件 | 类型 | 说明 |
|------|------|------|
| `src/core/day7FireTrial.cjs` | **NEW** | 第7天试炼场景引擎 |
| `tests/day7_fire_trial.test.cjs` | **NEW** | 试炼测试 |
| `tools/check_day7_fire_trial_browser.cjs` | **NEW** | 浏览器端验收 |
| `web/day7-fire-trial.html` | **NEW** | 独立试炼页面 |
| `src/core/reducer.cjs` | 修改(+2行) | 加 require + 2 case |
| `src/uiAdapter.cjs` | 修改(+10行) | 加命令 + viewModel + methods |
| `web/index.html` | 修改(+1行) | 加试炼入口链接 |

---

## 五、建议改动优先级

### Phase 0 (立即合并 ZIP 增量)
1. 合并 reducer.cjs 2 行改动
2. 合并 uiAdapter.cjs 10 行改动
3. 复制 day7FireTrial.cjs + test + html + check 工具
4. 确认 `node tests/run_all_tests.cjs` 通过（含新增的 day7 测试）

### Phase 1 (核心规则解耦)
5. 从 day7FireTrial.cjs 提取火引爆公式 → 通用 settleElements
6. 从 day7FireTrial.cjs 提取水催化 + 风聚火 → 通用 mechanics
7. 从 mechanics 字段解耦 → heroDomains 系统
8. 移除/保留 土 元素（保留兼容）

### Phase 2 (通用化)
9. 附魔系统（slot enchantment）
10. 多回合循环（round 2-10）
11. CSV 数据表对齐（新宠物 + 新机制）
