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

## 当前文档体系

| 编号 | 文件 | 职责 |
|---|---|---|
| `00` | `00_AI_START_HERE.md` | 唯一总入口（本文件） |
| `01` | `01_CURRENT_GAME_SPEC.md` | 游戏规则、核心机制、当前阶段 |
| `02` | `02_CURRENT_WORKFLOW.md` | AI 工作流、执行纪律、TDD、部署 |
| `03` | `03_CURRENT_NUMBERS.md` | 数字、伤害表、定价、测试基准 |
| `04` | `04_CURRENT_UI_ART_SPEC.md` | UI 布局、美术风格、配色、交互规范 |
| `05` | `05_ASSET_AND_FILE_INDEX.md` | 本机文件、Excel、zip、参考图索引 |
| `06` | `06_DECISION_LOG.md` | 决策记录（持续追加） |
| `08` | `08_ROADMAP.md` | 版本里程碑与路线图 |
| `10` | `10_CHANGELOG.md` | 变更日志 |
| `roles/` | 各角色入口 | 程序/美术/UI/策划 各自启动指南 |
| `archive/` | 历史文档 | 追溯用，不作为当前规则 |
| `tables/_changes/` | 表格变更单系统 | `pending/` 为待同步变更（AI 可读），`archive/` 和 `reports/` 为已同步记录 |

## 常用命令

- 全量测试：`node test.js`
- 走查：`node playable_day1.js`
- Run 走查：`node playable_run.js`
- E2E：`node e2e/smoke.js`
- 回放：`node replay.js recordings/xxx.json`
- 工作区：`git status --short --untracked-files=all`
