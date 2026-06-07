# 00_AI_START_HERE · 元素背包史 / ysbzs（CSV 驱动版）

## 当前项目一句话

《元素背包史》是一个 8×8 棋盘上的英雄领域 + 宠物对战 + 火水风元素铺场 + 召唤试炼游戏。核心循环是：战斗 → 商店 → 购买/合成宠物 → 上阵 → 下一天。采用 CSV 数据驱动的 Node.js 核心引擎 + 浏览器 UI 适配器架构。

第一阶段核心：火伤害闭环（引爆 Σ(1..N)）+ 水催化 + 风聚火。

## 当前最重要口径

1. 第一版只做火、水、风三元素，30 宠池（火12/水10/风8），品质（青铜12/白银10/黄金8）。
2. 宠物有总行动力（AP）和攻击槽，攻击后锁定位置不能移动。
3. 核心引擎在 `src/core/*.cjs`，浏览器 UI 在 `web/*.js`，数据表在 `data/csv/`。
4. 敌方试炼为兽群统领 + 4 钻石原型复制体，不是旧 CSV 波次刷怪。
5. 当前高优先级：合并 day7-fire-trial 场景，通用化火引爆/水催化/风聚火引擎。

## 每次 AI 启动读取顺序

### 通用任务（所有 AI 必读）

1. 本文件 `00_AI_START_HERE.md`
2. `02_CURRENT_WORKFLOW.md` — AI 工作流与执行纪律
3. `03_CURRENT_NUMBERS.md` — 当前数值与规则（TODO）
4. `06_DECISION_LOG.md` — 决策记录（TODO）

### 按角色扩展

| 任务类型 | 额外必读 |
|---------|---------|
| 程序/代码 | `roles/PROGRAMMER_START.md` |
| 美术/生图 | `roles/ARTIST_START.md` |
| UI/交互 | `roles/UI_UX_START.md` |
| 策划/数值 | `roles/PLANNER_START.md` |
| 涉及文件/素材 | `05_ASSET_AND_FILE_INDEX.md`（TODO） |

## 冲突处理

如果发现文档、代码、CSV、YAML、旧聊天、archive 内容冲突：

1. 不要直接重写全部文档。
2. 先列出冲突点。
3. 按优先级判断：用户最新明确指令 > 本文件 > 当前文档 > 代码真实实现 > archive。
4. 只更新必要文件。
5. 记录到 `06_DECISION_LOG.md`。

## Goal 执行规则

### 1. Goal 默认执行

用户说一个开发目标 → AI 默认按 Goal 推进，不逐步询问「可以开始吗」「要我做什么」。
必须先读入口文档、任务卡、当前 git 状态，再判断下一步。

### 2. 「策划」/ diff 后缀规则

如果用户指令以「策划」或 `diff` 结尾，本轮只做分析、规则收束、方案设计或文档建议。
**不改代码、不提交、不进入实现**，除非用户明确要求执行。

### 3. 不机械执行

AI 不得因为上一个回复推荐了某个模块就机械执行。
每次开工前必须根据当前仓库状态、测试结果、dirty 文件、任务卡、用户最新指令重新判断最优目标。

### 4. 核心层 / 显示层分离

| 层 | 管什么 | 对应文件 |
|----|--------|---------|
| 核心层 | 状态、战斗、元素、伤害、事件 | `src/core/*.cjs` |
| 显示层 | 棋盘渲染、面板、日志、预览 | `web/*.js` |
| 数据层 | 宠物、机制、商店、形状 CSV | `data/csv/*.csv` |
| 规则层 | 机制词条、关联规则、事件规则 | `source/game-data-source/yaml/*.yaml` |

核心层不得拼 UI 文案。显示层不得修改核心 state。

### 5. 提交规则

若测试通过且变更干净，满足自动提交条件时 AI 自行提交。
提交前确认：无无关文件、无其他任务残留、无混任务修改、`node tests/run_all_tests.cjs` 通过。

## 当前文档体系

| 文件 | 职责 |
|------|------|
| `00_AI_START_HERE.md` | 唯一总入口 + Goal 执行规则（本文件） |
| `02_CURRENT_WORKFLOW.md` | AI 工作流（Goal/策划/diff/git-c 触发） |
| `docs/architecture/*.md` | 架构说明 |
| `docs/plans/*.md` | 规划方案 |
| `docs/roles/*.md` | 各角色启动指南 |
| `data/csv/*.csv` | 宠物、怪物、机制、商店等数据表 |
| `source/game-data-source/` | xlsx 源数据 + yaml 规则 |

## 常用命令

- 全量测试：`node tests/run_all_tests.cjs`
- 运行服务器：`node tools/run_ui_server.cjs`
- 独立场景：`node tools/run_full_day.cjs`
- 工作区：`git status --short --untracked-files=all`
