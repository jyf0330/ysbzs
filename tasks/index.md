# 当前任务总览

updated_at: 2026-06-04 22:52

## 项目状态

| 指标 | 值 |
|------|-----|
| 测试基线 | 472/472 (gpt_test: 422/422) ✅ |
| 核心模块 | 14 个（含新增 damage.js/terrain.js/battleLog.js/preview.js）|
| 10 天模拟 | ✅ 可运行（金币 310，3 钻石，预览一致） |
| 预览一致性 | 5/5 ✅ |
| 工作区 | ✅ 干净 |

## 当前执行优先级

### ✅ 已完成

| 任务 | 状态 | 提交 |
|------|:----:|------|
| Bazaar-like full runtime 集成 + 测试覆盖 | ✅ DONE | `0a3430a` |
| 四阶体系 + 元素伤害统一 + 表格同步 | ✅ DONE | `9f0ab9c` |
| 四层棋盘格 + 地形陷阱系统 | ✅ DONE | `34087c1` |
| P0 模块拆分：terrain.js + damage.js | ✅ DONE | `31aec96` |
| P1 模块拆分：battleLog.js | ✅ DONE | `4c2f2fe` |
| P1 模块拆分：preview.js | ✅ DONE | `0422d95` |
| 预览一致性修复（排除陷阱干扰） | ✅ DONE | `6b7f485` |

### ✅ 已完成

| 任务 | 状态 | 提交 |
|------|:----:|------|
| 架构二次证据审计（只读） | ✅ DONE | 无提交 |
| 商店 UI 首屏密度优化 | ✅ DONE | `e40dafb` |

### ⏸ 暂停

| 任务 | 状态 |
|------|:----:|
| 商店界面设计文档编写 | PAUSED |
| 商店 UI 首屏密度优化 | PAUSED |

### 🚧 当前 ACTIVE Goal

1. **架构风险前 5 项最小修复（READY_TO_VALIDATE）**
   - dispatch 化长尾玩家入口，禁止 UI 直接改核心状态
   - 统一关键战斗/商店结构化日志出口
   - 增加 legacy fallback strict mode 与命中校验
   - 清理 8×8 棋盘残留 `12/13` 边界
   - 补真实入口回归测试，覆盖入口 → 状态 → 结构化日志 → 渲染

### ⏩ 下一推荐 Goal

1. **修复 flaky 测试** — `buildWaveForDay Day4 含精英怪` 依赖随机种子偶尔不过，改为确定性测试
2. **`cell.js`** — 统一格子访问层（`getCell`, `getCellUnit`, `getCellTerrain`, `getCellElements`），为后续四层交互做准备

## 当前所有模块

```
data.js → rng.js → board.js → actions.js → elements.js
    → waves.js → battle.js → shop.js → game.js → ui.js
    → damage.js → terrain.js → battleLog.js → preview.js
    → externalDataAdapter.js (Bazaar-like full runtime)
    → dispatch.js (unified action architecture)
```

## 工作区状态

当前 git status 以实时命令结果为准；架构 top5 修复已完成主验证，等待决定是否顺手修旧 `e2e/smoke.js` selector 后再提交。

## 断线恢复规则

当用户说"继续当前任务"时：
1. 先读取本文件 `tasks/index.md`。
2. 找到下一推荐 Goal。
3. 运行 `git status --short`。
4. 检查 dirty 文件是否全部可归属当前任务。
5. 检查是否存在 `FILE_CONFLICT_STOP`。
6. 无冲突后继续。
