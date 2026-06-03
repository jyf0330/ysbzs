# 00_AI_START_HERE · 元素背包史 / ysbzs

## 当前项目一句话

《元素背包史》是一个向 The Bazaar 结构对齐、节奏更快的战术构筑游戏。核心循环是：战斗 → 商店 → 买英雄 → 同名合成升级 → 上阵组合 → 下一天战斗。采用 8×8 棋盘，元素叠层+引爆为主要战斗机制。第一阶段核心：火伤害闭环 + 召唤流闭环。

## 当前最重要口径

1. 第一阶段优先跑通：火伤害闭环 + 召唤流闭环。
2. 商店第一版只卖英雄，不卖行动槽、元素瓶、强化块。
3. 英雄同名合成按档位升级：青铜 → 白银 → 黄金 → 钻石（四阶，钻石为最高档位）。
4. 整体向 The Bazaar 的商店、经济、成长结构对齐，但节奏压缩。
5. 当前高优先级：文档收束、入口统一、代码/规则/素材索引统一。
6. 旧规则放入 docs/archive/，不作为当前依据。

## 每次 AI 启动读取顺序

### 通用任务（所有 AI 必读）

1. 本文件 `00_AI_START_HERE.md`
2. `01_CURRENT_GAME_SPEC.md` — 游戏规格与核心规则
3. `02_CURRENT_WORKFLOW.md` — AI 工作流与执行纪律
4. `06_DECISION_LOG.md` — 决策记录

### 按角色扩展

| 任务类型 | 额外必读 |
|---|---|
| 程序/代码 | `roles/PROGRAMMER_START.md` |
| 美术/生图 | `roles/ARTIST_START.md`, `04_CURRENT_UI_ART_SPEC.md` |
| UI/交互 | `roles/UI_UX_START.md`, `04_CURRENT_UI_ART_SPEC.md` |
| 策划/数值 | `roles/PLANNER_START.md`, `03_CURRENT_NUMBERS.md` |
| 涉及文件/素材 | `05_ASSET_AND_FILE_INDEX.md` |

### 首次进入项目或重构场景

先读：`git status --short --untracked-files=all`，确认当前工作区状态。

## 冲突处理

如果发现文档、代码、Excel、旧聊天、archive 内容冲突：

1. 不要直接重写全部文档。
2. 先列出冲突点。
3. 按优先级判断：用户最新明确指令 > 本文件 > 当前文档 > 代码真实实现 > archive。
4. 只更新必要文件。
5. 记录到 `06_DECISION_LOG.md`。

## Goal 执行规则

这些规则适用于所有 AI（Codex / Claude Code / Copilot），写入项目入口而非单个 AI 配置。

### 1. Goal 默认执行

用户说一个开发目标 → AI 默认按 Goal 推进，不逐步询问「可以开始吗」「要我做什么」。
必须先读入口文档、任务卡、当前 git 状态，再判断下一步。

### 2. 「策划」/ diff 后缀规则

如果用户指令以「策划」或 `diff` 结尾，本轮只做分析、规则收束、方案设计或文档建议。
**不改代码、不提交、不进入实现**，除非用户明确要求执行。

### 3. 不机械执行

AI 不得因为上一个回复推荐了某个模块（如 cell.js / battleLog.js）就机械执行。
每次开工前必须根据当前仓库状态、测试结果、dirty 文件、任务卡、用户最新指令重新判断最优目标。
如果推荐项已经过时，必须主动调整。

### 4. 核心层 / 显示层分离

| 层 | 管什么 | 对应文件 |
|---|---|---|
| 核心层 | HP、AP、元素/陷阱层数、伤害计算、结构化事件 | `battle.js` `elements.js` `terrain.js` `damage.js` `battleLog.js` |
| 显示层 | 格子渲染、面板、日志中文、预览、调试 | `ui.js` `board.js` |

核心层不得拼 UI 文案（中文/颜色/图标）。显示层不得修改核心状态。
`ui.js` 只读不写核心数据。`battle.js` / `terrain.js` / `elements.js` 不直接拼 `glog` 长中文（通过 `formatBattleEvent` 格式化）。

### 5. 四层棋盘格

棋盘格按四层理解，详见 `docs/plans/四层棋盘格设计.md`：

| 层 | 内容 |
|---|---|
| 单位层 | 英雄、怪物、召唤物、城堡 — 占单位位 |
| 地形层 | 陷阱 — 不占单位位，怪物进入结算 |
| 元素层 | 火水风土层数、引爆、元素伤害 — 不占单位位 |
| 信息层 | UI、预览、日志、调试 — 派生数据，不参与结算 |

地形层不占单位层，英雄可站陷阱。多元素陷阱可叠加。
当前版本优先保留爽感，不默认加硬上限、防爆、削弱。

### 6. 模块拆分规则

- 每次只拆一个清晰 Goal
- 先测试保护，再迁移函数
- 保持 `node test.js` 通过
- 不做大规模目录重构，不移动 JS 到 src/
- 不把多个无关拆分混在一个提交

已完成：`damage.js` `terrain.js` `battleLog.js`
候选：`cell.js` `preview.js` `movement.js`
候选不等于必须执行，每次重判断。

### 7. 提交规则

若测试通过且变更干净，满足自动提交条件时 AI 自行提交（见 `AGENTS.md` → 自动提交规则）。
提交前确认：无无关文件、无其他任务残留、无混任务修改、`node test.js` 通过。

---

## 当前文档体系

| 编号 | 文件 | 职责 |
|---|---|---|
| `00` | `00_AI_START_HERE.md` | 唯一总入口 + Goal 执行规则（本文件） |
| `01` | `01_CURRENT_GAME_SPEC.md` | 游戏规则、核心机制、当前阶段 |
| `02` | `02_CURRENT_WORKFLOW.md` | AI 工作流（Goal/策划/diff/git-c 触发）、冲突硬停 |
| `03` | `03_CURRENT_NUMBERS.md` | 数字、伤害表、定价、测试基准 |
| `04` | `04_CURRENT_UI_ART_SPEC.md` | UI 布局、美术风格、配色、交互规范 |
| `05` | `05_ASSET_AND_FILE_INDEX.md` | 本机文件、Excel、zip、参考图索引 |
| `06` | `06_DECISION_LOG.md` | 决策记录（持续追加） |
| `08` | `08_ROADMAP.md` | 版本里程碑与路线图 |
| `10` | `10_CHANGELOG.md` | 变更日志 |
| `roles/` | 各角色入口 | 程序/美术/UI/策划 各自启动指南 |
| `plans/` | 设计方案 | 四层棋盘格设计、模块拆分方案等 |
| `archive/` | 历史文档 | 追溯用，不作为当前规则 |
| `tables/_changes/` | 表格变更单系统 | `pending/` 为待同步变更，`archive/` 和 `reports/` 为已同步记录 |

## 常用命令

- 全量测试：`node test.js`
- 走查：`node playable_day1.js`
- Run 走查：`node playable_run.js`
- E2E：`node e2e/smoke.js`
- 回放：`node replay.js recordings/xxx.json`
- 工作区：`git status --short --untracked-files=all`
