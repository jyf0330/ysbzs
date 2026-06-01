
## 2026-06-01 — 羊皮纸手绘风视觉主题重设计

### 视觉（`index.html`）
- **整体风格切换**：从暗色赛博主题（`#0d1117`底+金色霓虹+红色心跳预警+紫色发光）整体替换为浅色羊皮纸手绘风（暖色纸面+棕色手绘线条+低饱和柔和配色）。
- **CSS 变量重定义**：`:root` 全部变量替换为羊皮纸主题色系，新增 `--c-text`/`--c-text2`/`--c-title`/`--c-panel-bg`/`--c-panel-border`/`--c-btn-*` 等语义变量。
- **元素色系柔化**：火 `#d4855e`（陶土）/ 水 `#5e95b5`（灰蓝）/ 风 `#6ea86c`（鼠尾草绿）/ 土 `#b8844a`（赭石），元素背景色改为浅色半透明。
- **棋盘风格**：格子间隙 2px 透出棋盘底色模拟画线，边框暖棕色 `#b8a590`，格子带 `#e0d8c8` 细边框。
- **实体卡片**：英雄/怪物/召唤物/城堡卡片改为浅色背景+细边框，去 box-shadow 光晕，选中用虚线描边替代。
- **UI 面板**：面板背景 `#f5f0e6`，暖棕边框，按钮主色 `#8b6f5a`。
- **字体**：优先日系圆体/手写体（Hiragino Maru Gothic ProN, Klee, YuKyokasho）。
- **JS 颜色常量同步**：`EC`/`EB`/`ELIC2` 全部更新为羊皮纸主题色值。

### 测试（`test.js`）
- shapeHTML 颜色断言同步为新色值（`#d4855e`/`#5e95b5`/`#7b9db5`），416/416 通过。

### 文档
- `美术风格指南.md`：整体重写为羊皮纸手绘风规范。

## 2026-06-01 — AI 自动试玩 runner

### 工具（`ai-eval/`）
- **新增 `ai-eval/runners/run-playtest.mjs`**：AI 自动试玩 runner，VM 沙箱内同步驱动完整游戏循环（Day1→Day10），生成 `trace.json`（618事件/10天）和 `summary.json`（提取指标）。商店 AI 按元素协同+价格排序。`npm run playtest` 一键运行。
- **修改 `ai-eval/core/game-script-loader.js`**：`createExportFooter` 追加桥接 `UNIT_DEFS`、`EL`、`SHOP_PRICE_CONFIG`、`TIER_MULT`、`ADV`，使 runner 能读取游戏常量用于 AI 决策。
- **新增 npm scripts**：`"playtest": "node ai-eval/runners/run-playtest.mjs"`

### 输出
- **`reports/playtest/runs/<timestamp>_<commit>/trace.json`**：完整事件记录（GAME_START / DAY_START / ROUND_START / PLAYER_ACTIONS / COMBAT_RESULT / SHOP_OPEN / SHOP_PURCHASE / HERO_STATE / MONSTER_STATE / GAME_OVER）
- **`summary.json`**：指标提取（result/daysPlayed/kills/gold/purchases/engineStats/wallClockMs）

## 2026-06-01 — 棋盘格子中文短字显示重构

### 代码（`index.html` / `test.js`）
- **`buildPreviewGrid` 新增**：每个格子计算 `displayBrief`（中文短字，如"英1打1 火3 总3"）、`displayDetail`（战斗详情数据）和 `displayType`（monster/hero/castle/empty），UI 层只读取不重新计算。
- **`buildBoardVM` 透传**：cell view model 新增 `displayBrief` 字段，从 coreSnapshot 读取。
- **`renderBoard` 改造**：有 `displayBrief` 时优先显示中文短字，精简底部徽标行（仅保留💥爆炸/☠致死指示器）；无 `displayBrief` 时保留原有 HP/伤害显示。
- **`renderCellDetail` 增强**：新增"战斗摘要"块，使用 `displayDetail` 展示攻击方/目标/火水风土伤害/总伤害等中文信息。
- **禁止事项落实**：棋子不再使用 H/M/A/Σ 等英文缩写；UI 层不重新计算元素伤害或怪物攻击目标。
- **测试**：新增 K2 组 12 个测试（k2_001~k2_012），覆盖怪物格/英雄格/空格/城堡格的 displayBrief 格式、多英雄/多怪物攻击、元素场显示、禁止英文缩写、buildBoardVM 透传和 renderCellDetail 中文验证。总测试数 404→416。

## 2026-06-01 — 格子详情面板增强：英雄信息与移动后交互修复

### 代码（`index.html` / `test.js`）
- **`onCell` 修复**：选中英雄后点击实体格（英雄/怪物/召唤物/城堡）改为清除选中并显示格子详情，不再静默失败；点击空格仍保持移动行为。
- **`buildPreviewGrid` 增强**：英雄实体新增 `_acted`（已行动状态）和 `slots`（未使用行动槽摘要，含元素/形状/方向）字段。
- **`renderCellDetail` 增强**：英雄详情块新增已行动/可行动标签、行动槽列表（元素图标+形状+方向）、友方叠层预览（来自另一英雄的行动槽叠层）。
- **测试**：新增 `case_k_015`（onCell 实体格交互）、`case_k_016`（英雄实体 slot 字段）、`case_k_017`（英雄详情渲染），总测试数 401→404。

## 2026-06-01 — AI 工作流同步（上游 ywh-work 反哺）

### 工作流（`docs/00_AI_WORKFLOW_DETAILS.md`、`docs/00_AI_PROJECT_RULES.md`、`AGENTS.md`、`CLAUDE.md`、`.github/copilot-instructions.md`）
- **执行纪律总纲**：新增任务先分类、代码基线/文档基线、设计未拍板不实现、建议来源与执行优先级四条原则。
- **Codex Goal 适配**：新增完整章节（何时开启、输入优先级、Charter 字段、Goal Skill Hooks、Objective 格式、与任务卡/Superpowers 的关系）。
- **文档门禁分级**：新增大系统/中等改动/小修改三段。
- **TDD 前置步骤**：改为 Goal/交互双模式，Goal 模式自主确认即可进入实现。
- **根目录清理**：新增禁止长期存放临时草稿规则。
- **Goal Skill Hooks 表**：写入 required/conditional hook 表和条件型 hook 清单。
- **商店/经济/成长方向**：新增优先向《The Bazaar》结构对齐。
- **建议来源声明**：外部 AI 建议不是项目真实规则。

## 2026-05-31 — 关卡策划 03/04 代码实现

### 代码（`index.html` / `test.js`）
- **10 天游玩闭环**：`DAY_ROUND_CONFIG` / `DAY_WAVE_CONFIG` 扩展到 Day10；`closeShop` 不再把 Day6+ 钳制到 Day5，Day10 结束进入 Run 胜利。
- **商店收束**：`genShop` 改为只生成英雄，移除自动 consumables；`calcUnitPrice` 改为同品级统一价（青铜2、白银4、黄金6、钻石8）；`calcShopTier` 支持 Tier4。
- **新内容入池**：新增 `forge_fire` / `command_sprout` / `dragon_flame` / `prime_sprout`，并加入 Day5-10 商店池。
- **新怪与 ability hook**：新增 `swarm` / `blocker` / `siege` / `boss5` / `minion` / `boss8` / `boss10`；补 `runMonsterAbilityHook`，支持 `lava_surge` 与 `core_split` 的最小可测行为。
- **召唤行为补齐**：召唤物无相邻目标时会向最近怪物移动，接近后攻击。
- **兼容入口审查修复**：`addLevelupUnit` 最高池同步到 Tier4，并使用同品级统一定价。
- **走查脚本同步**：`playable_run.js` 改为 10 天游玩链路，`playable_day1.js` 改为 Day1/Day3 当前商店池口径。
- 测试新增 GOAL0304-01~10，并同步旧商店/价格/Boss 口径，**401/401 全部通过**。

## 2026-05-30 — Debug 面板 v3 树形详情重构

### 代码（`index.html` / `test.js`）
- **VM 数据层**：`buildPreviewGrid` 扩展 `elementField`（`beforeLayers`/`addLayers`/`afterLayers`/`directDamage`/`splashDamage`/`pathDamage`/`totalDamage`）、`incomingActions`（`slotIndex`/`sn`/`dir`/`fromR`/`fromC`/`heroName`/`sourceType`/`resolvedEffects`/`sequenceIndex`）、`preview.result`（`totalDamage`/`willDie`/`surviveHp`/`damageBySource`）
- **怪物威胁增强**：`computeMonsterActionPreview` 输出新增 `stableId`/`alive`/`fromR`/`fromC`/`toR`/`toC`/`attackType`
- **R8 落地**：我方城堡不承受我方元素伤害（`buildPreviewGrid` 5a 段判定 `player_castle` → `ignoreElDmg=true`）
- **R9 标注**：路径反伤仅 VM 预览字段（`pathDamage=0`），不改真实怪物行动结算
- **渲染层**：`renderDebugPanel` 删除旧 `buildDebugOneLiner` + `buildSourceDetail`，替换为 `buildCellTree` 树形详情面板（v3 ┃┣ 格式），只读 VM 不重算
- 测试新增 DEBUG6~DEBUG15，**391/391 全部通过**

## 2026-05-30 — 文字战争与代码决策落地（1C–8）
## 2026-05-30 — 一键执行：英雄能攻击时不走位

### 代码（`index.html` / `test.js`）
- **N组**：`canHeroAttackEnemyFrom(pos,hid)` —— 检查英雄从给定位置是否能攻击到敌方怪物或城堡
- `execAllHeroSlots_sync` / `execAllHeroSlots_async`：走位阶段增加检查，英雄已能攻击敌方时跳过移动，直接执行动作
- 测试新增 `case_n_002`（多行密度引导不走位）、`case_n_003`（直接测试 canHeroAttackEnemyFrom），**374 项（373 通过 + 1 已有失败）**

## 2026-05-30 — 三 Bug 修复

### 代码（`index.html` / `test.js`）
- **Bug1 怪物出生在元素块上**：`spawnWaveForDay` 出生区过滤增加 `!hasElementAt(sc)`，防止怪物刷到残留在出生区的元素格上
- **Bug2 打完第一波跳商店**：`finishMonsters` 改为 `allDead && castleDead` 才进商店——清完怪后城堡还在则继续战斗，只有城堡也被毁或回合超限才进商店；同时修复 `endPlayerTurn` 在 castle 结算被炸毁后覆写 `phase='MONSTER'` 的问题
- **Bug3 第三天英雄消失**：`syncUnitsToHeroes` 重写停用逻辑。旧代码按 `ownedUnits` 下标停用（`i>=2` 误杀了购买的单位）；新代码只停用非前 2 个上阵单位（`heroUnits = Set(active.slice(0,2))`），同时修复了 `ui>=2` 时覆写 `hb` 的问题
- 测试 **377/377 全部通过**



### 代码（`index.html` / `test.js`）
- **1C**：`closeShop` 新一天仅**敌方城堡回满**，我方 HP 跨天保留（RUN1 更新）
- **5**：`SHOP_POOLS` 收束教学节奏——召芽灵 **Day3 夜** 起；Day4 泉泉/绒语；Day2 不再刷高级构筑
- **6**：`spawnWaveForDay(3,'morning')` **脚本波**——铁甲队长 HP24 + 小怪
- **7**：胜利仅 **敌方城堡 HP≤0**（`runVictory`）；移除 Day5 下午 / day>5 自动通关
- 测试 **367/367**


### 策划 / 教学文档
- **2C**：恢复火/水/风与代码一致；`召唤引擎系统GDD` 回 **水+召唤**
- **3B**：附录与前2天规则改 **杀怪+夜收入+利息**，删除阶段固定金币表
- **4B**：合成改 **Lv2** + 预览算伤害；删除「白银 6 层=21」权威口径
- **8**：文档商店价改 **Tier1=3 / Tier2=6**
- 第3–5天正文保留部分旧叙事示例，文首标注「以附录与代码为准」
## 2026-05-30 — 小团队能力补强 P0（replay / debug / smoke）

### 程序 / 测试
- **Replay**：`REPLAY_VERSION=1` · `snapshotCoreStateForReplay` / `exportReplay` / `runReplay` / `startReplayCapture` · `recordings/day1_fire_sample.json` · CLI `node replay.js`
- **Debug 面板**：`?debug=1` 或 localStorage `ysbzs_debug` / 键 D · `buildDebugPanelVM` · 显示 phase/选中格/行动槽/actionLog
- **测试**：`test.js` 新增 Replay + Debug 组（**372/372**）
- **Playwright smoke**：`node e2e/smoke.js`（169 格 + debug 可见）
- 工具：`scripts/gen_replay_fixture.js` 生成样例 replay

### 文档
- `个人开发者小团队能力补强清单.md` P0-a/b/d/e 勾选

## 2026-05-30 — 个人开发者小团队能力补强清单

### 文档
- 新增 `docs/02_程序开发（程序主导）/个人开发者小团队能力补强清单.md`：九类岗位能力对照、优先六件套（replay / 规则测试 / Playwright / Debug / 数据表 / 发布）、实施勾选与外部参考
- `08_ROADMAP.md`：增加工具补强节与 replay/UI 回归风险
- `游戏闭环成熟度评分.md`：回放策略指向补强清单

## 2026-05-30 — 前期单火元素 + 文字战争文档统一

### 策划 / 教学
- **前期第1–5天只教火元素**：文字战争三文档（前2天 / 第3–5天 / 共用附录）中水层、风层、水召唤、💧 统一改为火层、火召唤、🔥；滴滴灵/十字使叙述改为火槽
- `召唤引擎系统GDD.md`：水+召唤 → **火+召唤**；留水→留火；默认 `el: fire`；标注代码仍 `water` 的 `[NEEDS_REVIEW]`
- `游戏概述文档GDD.md`、`成长与连锁反馈系统GDD.md`：垂直切片表述同步为火+召唤

### 待决（[NEEDS_REVIEW]）
- `index.html` / `test.js` 仍默认水召唤物与留水层，与文档「火+召唤」不一致，需另任务同步实现

## 2026-05-30 — 文字战争教学脚本补全 + 第3-5天

### 策划 / 教学（关卡策划）
- 修正 `01_第3-5天文字战斗过程.md` 伤害表现：统一火3层=6 / 火6层=21；集火改逐步 HP（24→3→0）；区分叠层伤害与召唤物 flat ATK；修正城堡当日累计（Day4 100→58、Day5 100→79）；远程/近战分工与引擎累计数
- 新增 `关卡策划/01_文字战争共用附录.md`：相对站位词表、商店标价、前5天金币自洽表
- 补齐 `关卡策划/01_前2天文字战斗过程.md`：新增「规则补全」段（金币按阶段固定递增 / 城堡 HP 次日回满 / 白银槽对同格叠2层→6层=21 / 胜负与上阵），并补每日城堡当日 HP 数字线；链到共用附录
- 新增 `关卡策划/01_第3-5天文字战斗过程.md`：第3天精英关（集火/取舍/完整判断）、第4天英雄技能（召唤/治疗成长/自动攻击/死亡留火）、第5天构筑组合（五类英雄并行 + 召唤引擎滚雪球）；召芽灵/泉泉灵标价与附录及 `UNIT_DEFS.cost` 对齐
- 体例沿用「文字战争」逐回合叙述；机制对齐 `战斗系统.md` / `召唤引擎系统GDD.md`

### 待决（[NEEDS_REVIEW]）
- 城堡「次日回满」与已实现代码/GDD「城堡跨战不重置（RUN1 回归）」冲突；本轮仅写进文字过程文档，未改 `index.html` / `test.js`

### 流程
- 走 Superpowers `brainstorming`：逐题确认元素教学范围(以文字过程为准)、金币规则、城堡HP、白银叠层来源

## 2026-05-30 — S3 P1 结算 UI + 构筑被动

### 游戏
- Run 结束：`buildRunEndVM` / `showRunEnd` / `restartRun()`，胜败统计（天/金/城堡/引擎/成长）
- 构筑被动：泉泉灵 `healAmpBonus`、岩岩灵 `castleReduce`、风风灵 `advHitBonus`
- 城堡失败 / Day5 通关 / 全灭统一走 `showRunEnd`
- 测试 RUN6–7、SH4–6；基线 **366/366**


### 工作流
- `docs/00_AI_WORKFLOW_DETAILS.md` 对齐上游 `ywh-game`：新增 Superpowers 执行链、文档门禁分级、verification 铁律
- 任务卡要求增加 TDD 清单、实施步骤、RED/GREEN 证据字段
- subagent 默认：有 `writing-plans` 且任务独立时走 `subagent-driven-development`

## 2026-05-28 — 双层状态机 + 文字流程一对一实现

### 架构
- 大流程状态机 (DayStart→MorningBattle→MiddayShop→AfternoonBattle→NightShop→DayEnd)
- 战斗状态机 (PlayerPlan→HeroAction→SummonAction→ElementResolve→MonsterAction)
- 召唤流子状态机 (ChooseSummonCell→ReadElement→CreateSummon→ConsumeElement→AutoAct→DeathCheck)

### 城堡
- 敌方城堡 HP100 右侧 pos(6,11)，摧毁=胜利
- 怪物寻路优先英雄，城堡为次级目标

### 英雄
- 全部改名灵化：火苗灵/滴滴灵/十字使/岩岩灵/均衡灵/余烬灵
- 每位英雄增加 grade(品级), priceTier(定价档位), tags(标签)
- 新增9英雄：泡泡灵/召芽灵/绒语灵/爆爆灵/分分灵/火种灵/泉泉灵/岩岩灵/风风灵
- MAX_ACTIVE 2→6

### 定价
- GRADE_BASE × priceTier：青铜2/白银4/黄金6/钻石8
- 价格=品级基准价×定价档位

### 商店
- SHOP_POOLS 按天/阶段固定池，向后兼容旧genShop
- shopSize=5，池不足时允许重复

### 召唤系统
- summonOnCell：空格→小小灵HP6，元素格→对应元素灵HP=6+层数
- petAct：自动寻最近怪物，相邻攻击
- chooseElementForSummon：选最高层，同层fire>water>wind>earth
- processSummons + onPetDeath：召唤物死亡触发爆爆灵留元素

### 元素阻挡
- checkElementBlock：怪物踩入元素格受伤，层数×(层数+1)/2
- 不触发十字爆炸

### 文字流程调整
- Day1上午2回合，Day1下午2回合 (DAY_ROUND_CONFIG)
- 十字使加入Day1中午池，HP18 SD[12] 风元素 价格3
- 冲锋怪AP5→3，水滴使远程跳跃形状

### 工作流
- TDD新增前置步骤：测试清单审阅后方可写代码
# CHANGELOG · 元素背包史

## 未发布
| 2026-06-01 | docs | Superpowers 写入 AI 游戏评测台实施计划：按任务拆分 loader、runner、ysbzs core adapter、agents、evaluators、CLI、多 seed 和文档收尾；实施阶段仍不改运行代码。 | docs/superpowers/plans/2026-06-01-ai-game-evaluation-harness.md / tasks/doing/当前任务.md | 文档自检 |
| 2026-06-01 | docs | Superpowers 设计 AI 游戏评测台：确认 `test.js`/`benchmarks`/Playwright smoke/replay 的职责边界，新增通用 `GameAdapter -> Agent -> TraceRecorder -> Evaluator -> Report` spec，暂不改运行代码。 | docs/superpowers/specs/2026-06-01-ai-game-evaluation-harness-design.md / tasks/doing/当前任务.md | 文档自检 |
| 2026-05-31 | test | 新增 ysbzs v1 基准测试套件：12 个 case、6 份 fixture、smoke/full npm 脚本，并输出机器/人工可读报告与实现缺口报告；修复 Markdown 报告换行生成。 | benchmarks/ysbzs/* / reports/benchmark/* / package.json | npm run benchmark:smoke / npm run benchmark |
| 2026-05-31 | docs | Superpowers 全流程收束关卡策划 03/04：并行审查 03 商店/经济、04 Day2/刷怪/ability、代码现实；新增统一入口 `03_04_关卡商店刷怪收束计划.md`，将 10 天 run、priceTier 乘法定价、高收入经济、城堡回满、6 英雄上阵、完整 ability system 标为 `[NEEDS_REVIEW]` 或远期草案；原 03/04 文件顶部加状态说明；本轮不改运行代码。 | docs/01_游戏设计（策划主导）/关卡策划/03_04_关卡商店刷怪收束计划.md / docs/01_游戏设计（策划主导）/关卡策划/03_*.md / docs/01_游戏设计（策划主导）/关卡策划/04_*.md / tasks/doing/当前任务.md / docs/superpowers/* | rg 文档引用检查；git diff --check |
| 2026-05-30 | feat | S3 Roguelite 壳：删遗物（G.relics/old_fuse）；火种灵 `spaceExplosionBonus` 承接引信；Day4–5 `DAY_ROUND_CONFIG`；Day5 下午 Boss 保底+通关；`closeShop` 修复中午→下午三阶段；城堡跨战回归 RUN1/3。测试 RUN1–5/SH1–3 + `playable_run.js` | index.html / test.js / playable_run.js | node test.js 361/361 |
| 2026-05-30 | docs | 新增 Run 结构与城堡跨战系统 GDD（拍板：无独立地图/城堡实体格+HP/run≈5天HP100不回满/一天三阶段保留；城堡 HP 已事实跨战，待回归测试+Day5 Boss）；同步游戏概述 GDD 胜负/系统表/阶段表/待决、功能拆解 S3、ROADMAP、一天三阶段文档标“保留” | docs/01/Run结构与城堡跨战系统GDD.md / docs/01/游戏概述文档GDD.md / docs/01/功能拆解与优先级.md / docs/08_ROADMAP.md / docs/01/一天三阶段系统设计.md | — |
| 2026-05-30 | docs | 决策落盘「砍掉遗物·商店只卖英雄」（英雄被动/主动即遗物职能）：新增商店与英雄构筑系统 GDD（含遗物代码清理清单 old_fuse/G.relics）；游戏概述 GDD/功能拆解 S3/ROADMAP 去遗物；旧商店方案标遗物段落作废 | docs/01/商店与英雄构筑系统GDD.md / docs/01/游戏概述文档GDD.md / docs/01/功能拆解与优先级.md / docs/08_ROADMAP.md / docs/01/商店系统策划方案.md | — |
| 2026-05-30 | docs | 新增 S2 成长与连锁反馈系统 GDD（局内永久成长基于 engineStats、连锁飘字/完美回合、A4 风险对策、playtest sign-off 表、GROW backlog）；同步游戏概述 GDD 系统表/索引、功能拆解 S2 行 | docs/01/成长与连锁反馈系统GDD.md / docs/01/游戏概述文档GDD.md / docs/01/功能拆解与优先级.md | — |
| 2026-05-30 | docs | Deep-Interview 结果落盘：重写游戏概述 GDD（roguelite+城堡+阶段表）；新增召唤引擎系统 GDD；修订功能拆解 S0–S4、ROADMAP S1–S4；战斗系统 §12 指向系统 GDD；概念修订草案标记已合并 | docs/01/* / docs/08_ROADMAP.md | — |
| 2026-05-30 | feat | 水+召唤引擎（增量6·被动+Day1走查）：绒语灵 buffAllSummons / 爆爆灵死亡铺火 / 分分灵拆分召芽灵；`playable_day1.js` + `record_gameplay.mjs` 引擎路径。测试 ENG21–ENG26 | index.html / test.js / playable_day1.js | node test.js 345/345 |
| 2026-05-30 | feat | 水+召唤引擎（增量5·后续）：怪物左/下邻格攻击召唤物 + `summonIncomingDmg` 预览/HUD；引擎闭环测试；SHOP_POOLS 缺单位 UNIT_DEFS 补全。测试 ENG16–ENG20 | index.html / test.js / docs/01/战斗系统.md §12f | node test.js 339/339 |
| 2026-05-30 | feat | 水+召唤引擎（增量2–4）：`runSummonActions` 召唤物邻格攻击；`cellFree`/`moveHero`/`monsterAct`/`simMonAct`/`nextMoveFromPos` 经 `summonAt` 占用阻挡；召芽灵(`summonFromCell`)/泉泉灵(`healSummons`)/泡泡灵占位 + `USE_SLOT` skill 分支 + Day1 夜商店池；`buildBoardVM`/`buildTurnVM`/`buildPreviewGrid` 渲染召唤物与引擎统计。测试 ENG6–ENG15 | index.html / test.js / docs/01/战斗系统.md §12e | node test.js 334/334 |
| 2026-05-30 | feat | 水+召唤引擎（增量1·纯逻辑）：新增 `G.summons`/`G.engineStats`/`_nextSummonId`；新增 `spawnSummon`(生成水召唤物)、`healSummon`(治疗→atk+1 引擎成长)、`killSummon`/`damageSummon`(死亡原地留1层水)、`summonAt`(占用查询)、`addElementLayers`(规范写入 elementCells)；死亡留水层与 `settleExplosions` 连锁不冲突。来源 `.omx/specs/deep-interview-v1-scope.md` | index.html / test.js | node test.js 324/324 |
| 2026-05-29 | fix | 全屏布局修复：补 `#wrap` 容器；全屏样式改挂 `html:fullscreen`；棋盘用 `1fr` 网格等比缩放，侧栏固定宽+滚动，修复点全屏界面错乱 | index.html | 手动验证 |
| 2026-05-29 | feat | 双城堡 + GDD 开局：①`G.playerCastle` 左下 (12,1)、`G.enemyCastle` 右上 (0,11)，打掉敌方获胜、我方被毁失败；②怪物寻路/攻击以英雄优先、可攻我方城堡，不再混淆单城堡；③英雄 (10,1)/(11,1)；④Day1 早上固定教学怪 (1,11) hp6、(0,10) hp10；⑤刷怪区统一右上 `getSpawnCells`；⑥元素十字波及可伤敌方城堡 | index.html / test.js | node test.js 319/319 |
| 2026-05-29 | fix | 代码-文档-测试对齐：①`getSpawnCells(spawnSize,day,phase)` 恢复 Day1 教学区 + 按 spawnSize 右上角出生；②`MOVE_HERO` 与 `moveHero` 统一 `hasElementAt` 阻挡；③测试对齐一天三阶段（`dayHalf=2` 进夜晚商店）、预览夹具禁用未用槽、英雄初始坐标；④`case_k_013` 改为禁止穿越元素格；⑤更新 `技术架构总览`/`00_CURRENT_CONTEXT` 基线与 `render`/`refreshUI` 描述 | index.html / test.js / docs | node test.js 315/315 |
| 2026-05-28 | refactor | 核心/视图边界收敛：①`render()` 移除内部 `recomputeCorePreview()` 调用，改为纯 View 函数（只创建 DOM，不计算规则）；②新增 `refreshUI()` 包装函数（recompute+render），供非 dispatchGameAction 路径的直接调用；③所有直接 `render()` 调用（initGame/doExplode/settleExplosions/selHero/endPlayerTurn/runMonsters/finishMonsters/shop 系列/onCell/showTT/inline onclick）统一替换为 `refreshUI()`；④`execAllHeroSlots` 的 `var` hack 拆为 `execAllHeroSlots_sync`（测试）/ `execAllHeroSlots_async`（浏览器）+ 统一分派函数；⑤`dispatchGameAction` 保留先 `recomputeCorePreview` 后纯 `render()` 的调用链，不重复计算 | index.html | node test.js 314/315（预存 1 项失败）|
| 2026-05-28 | fix | async一键执行无条件调用endPlayerTurn：修复浏览器async版execAllHeroSlots只在n>0时调用endPlayerTurn导致怪物回合不触发的问题，改为与sync版一致的无条件调用 | index.html | 手动验证 |
| 2026-05-28 | fix | 一键执行状态机对齐 + B英雄走位修复：①修复行分配bug——rowDensity取min(heroIdx, length-1)防止怪物行少于英雄时越界回原行；②sync版补SELECT_ACTION_SLOT步骤（对齐真人操作流）；③async版execAllHeroSlots完成后自动调用endPlayerTurn()进入怪物回合；④新增N组case_n_001测试（怪物行少于英雄数时的走位分配） | index.html / test.js | node test.js 261/261 |
| 2026-05-28 | fix | 一键执行阶段拆分 + 元素穿越修复：①execAllHeroSlots拆为阶段1全部走位→阶段2全部攻击，避免队友元素阻挡走位；②走位阶段不检查hasElementAt；③applyActionToState MOVE_HERO移除元素格阻挡（AI路径），moveHero() UI层保留；④sim.js新增本地文字战斗模拟器；⑤修复__TEST__在eval后赋值导致走async分支的bug | index.html / test.js / sim.js | node test.js 261/261 |

| 2026-05-28 | feat | 全屏支持：①新增全屏按钮 ⛶（#fsb），调用 requestFullscreen/exitFullscreen 切换；②绑定 F11 快捷键;③CSS 全屏适配（#wrap 撑满视口、棋盘格自适应、面板字号调整）;④document.addEventListener 在测试环境安全跳过 | index.html | node test.js 260/260 |
| 2026-05-28 | feat | 英雄_acted 行动锁定规则：①hero 对象新增 `_acted` 标记(syncUnitsToHeroes);②USE_SLOT 设 `hero._acted=true`，MOVE_HERO 拒绝已行动英雄;③moveHero() UI 层提示"该英雄已行动，本回合无法再移动";④endPlayerTurn/finishMonsters 重置 `_acted`;⑤一键执行 alive 移入循环内每英雄刷新，走位条件加 `!hero._acted`（只锁走位不锁未用槽）;⑥新增 M 组 4 条测试(case_m_001~004) | index.html / test.js | node test.js 260/260 |
| 2026-05-28 | feat | 一键执行改为真人视觉路径：①execAllHeroSlots 拆分为测试/浏览器两条路径——测试走同步 forEach 原逻辑，浏览器走 async 逐步预览；②走位后 render()+sleep(250ms) 显示英雄移动；③每个槽先 SELECT_ACTION_SLOT 展示攻击范围(sleep 200ms)，再 USE_SLOT 执行(sleep 300ms)；④按钮执行期间 disabled 防连点；⑤test.js 新增 __TEST__ 标志并恢复 L 组同步测试 | index.html / test.js | node test.js 256/256 |
| 日期 | 类型 | 摘要 | 涉及文件 | 验证 |
|---|---|---|---|---|
| 2026-05-28 | fix | 文字战斗系统修复：①`USE_SLOT` actionLog 补上 `desc` 字段，battleReport 现在包含玩家行动记录（英雄名、行动块、元素类型）；②清理 `simLog` 死字段；③对齐 glog 战斗日志消息与 `dayHalf` 系统：下午波消息改为 `🌙 第{N}天夜晚·进入商店！`，商店阶段消息对齐 `renderTurn` 格式 | index.html / tasks/doing/当前任务.md / docs/10_CHANGELOG.md | node test.js 256/256 |
| 2026-05-28 | test | 修复剩余 3 个失败用例并与“一天两波”机制对齐：①`finishMonsters` 两个用例补充 `dayHalf=1`（下午波结束才进商店）；②`case_k_010` 避免因上午波清场后刷下午怪导致断言对象漂移，改为断言原怪物引用 `target.dead`；③全量回归通过并更新基线到 256/256 | test.js / docs/00_CURRENT_CONTEXT.md / tasks/doing/当前任务.md / docs/10_CHANGELOG.md | node test.js 256/256 |
| 2026-05-28 | fix | 修复第二天阶段切换顶部文案异常：`renderTurn` 按阶段分支显示，`SHOP` 改为“第X天夜晚 · 商店阶段”，不再沿用战斗态“小回合”文本；`OVER` 显示“战斗结束”；新增测试 `renderTurn 在 SHOP 阶段显示商店文案，不显示小回合` 并通过 | index.html / test.js / docs/01_游戏设计（策划主导）/UI-UX策划/用户界面与操作规范.md / tasks/doing/当前任务.md / docs/10_CHANGELOG.md | node test.js 256/256 |
| 2026-05-28 | docs | 补充 TDD 硬门禁：①代码改动默认要求先写失败测试或复现用例并确认 RED，再做最小实现和 GREEN 验证；②明确纯文档/规则/配置说明类改动可豁免但需记录原因；③任务卡需记录 RED/GREEN 命令和摘要；④明确 subagent 可用于并行审查、验收、文档核对和测试方案设计，但不是本项目硬门禁，仍保持单任务单代码文件编辑者规则；⑤归档本轮 TDD 门禁任务卡，`tasks/doing/当前任务.md` 恢复为空闲入口 | AGENTS.md / CLAUDE.md / .github/copilot-instructions.md / docs/00_AI_PROJECT_RULES.md / docs/00_AI_WORKFLOW_DETAILS.md / docs/00_CURRENT_CONTEXT.md / tasks/doing/当前任务.md / tasks/done/2026-05-28-tdd-gate.md / docs/10_CHANGELOG.md | rg TDD/subagent 规则检查；git diff --check |
| 2026-05-28 | docs | skill 流程优化落地：①入口文件不再复制测试基准数字，统一引用 `docs/00_CURRENT_CONTEXT.md`；②明确只读评审 / 流程审计不创建任务卡；③新增任务卡生命周期，完成任务归档到 `tasks/done/`；④收紧脏工作区门禁，要求 `git diff --stat` 和必要 diff 摘要；⑤补充自主执行暂停边界；⑥归档旧商店系统任务卡和本轮 workflow 任务卡，`tasks/doing/当前任务.md` 恢复为空闲入口 | AGENTS.md / CLAUDE.md / .github/copilot-instructions.md / docs/00_AI_PROJECT_RULES.md / docs/00_AI_WORKFLOW_DETAILS.md / docs/00_CURRENT_CONTEXT.md / tasks/doing/当前任务.md / tasks/done/2026-05-26-商店系统.md / tasks/done/2026-05-28-skill-flow-optimization.md / docs/10_CHANGELOG.md | rg 基准一致性检查；git diff --check |
| 2026-05-27 | feat | 一天两波系统 + 动态波次生成 + 商店经济重做：①新增 `buildWaveForDay(day, phase)` 预算制动态波次生成，支持普通/强攻/快速/精英/boss 五种怪物类型，每日两波（morning/afternoon）；②`spawnWave` 替换为 `spawnWaveForDay(day, phase)`，根据预算在 spawn zone 内随机布怪；③新增 `G.dayHalf` 状态（0=morning/1=afternoon），`finishMonsters` 早上波结束后进入下午波，下午波结束后才进商店；④击杀怪物获得 `monster.gold` 金币即时掉落；⑤ `openShop` 经济重做：每晚固定收入 `SHOP_PRICE_CONFIG.nightIncome[day]` + 利息 `floor(gold/5)`（上限3），替代硬编码 10+savedCoins；⑥新增 `SHOP_PRICE_CONFIG` 集中价格配置（nightIncome / consumableBase / monsterGold）；⑦ `rollShop` 费用 1→2（从配置读取），`genShop` Day1 调整为 4 T1 + 0 T2 + 1 强化品；⑧ `coin_bag` 改为直接获得金币而非 savedCoins；⑨测试 251→255：新增 buildWaveForDay 测试组 9 条，重写 spawnWave/回合管理/商店经济/initGame 相关测试；全部通过 | index.html / test.js / docs/00_AI_PROJECT_RULES.md / docs/10_CHANGELOG.md | node test.js 255/255 |
| 2026-05-27 | refactor | 架构优化 4 步：①HP 单一真相源 — monsterAct 攻击英雄时同步写 unit.hp，新增 syncHeroHPToUnits() 防御性回写（BATTLE→SHOP 边界），buildHeroesFromUnits→syncUnitsToHeroes 重命名明确单向语义；②冻结修复 — genShop 先快照已冻结商品再清空 shopItems，消除冻结永久失效 bug；③OVER 状态保护 — finishMonsters/openShop 顶部加 phase==='OVER' 守卫，防止游戏结束后状态被覆盖；④背包管道 — 新增 useBackpackItem(bpId) 支持 hp_potion/hp_potion2/board_el 使用，renderShop 新增背包区 UI；⑤修复 monsterAct 元素块爆炸反伤逻辑；⑥test.js 函数名/单位数同步；251/251 | index.html / test.js / docs/10_CHANGELOG.md | node test.js 251/251 |
| 2026-05-26 | feat | 完整商店系统实现：①新增 UNIT_DEFS（10 个单位 6 tier1+4 tier2，每单位 3 等级×3 槽），UNIT_TIER_POOL 按 tier 分组；②initGame 改为教程默认 fire_starter+water_droplet 两个单位上阵，通过 buildHeroesFromUnits() 桥接 G.heroes/G.slots；③新增 addOwnedUnit/buildHeroesFromUnits/mergeUnits/toggleUnitActive 等单位管理层；④商店改为 SAP 风格：openShop（gold=10+savedCoins）/genShop（6 单位+4 强化品）/buyUnit（支持自动合成）/sellUnit（返还 level 金币）/rollShop（1 金币）/freezeShopItem/closeShop；⑤calcShopTier=min(ceil(day/2),3)，savedCoins 上限 3；⑥finishMonsters 进入商店时调用 openShop；⑦移除旧 buyToBackpack/buyEl/refreshShop/bpEquip/bpCombine/combineSlots；⑧renderShop 重写为单位商店+强化品+阵容管理 UI；⑨测试 247→251：重写商店系统测试组（16 条）、单位管理测试组（8 条）、UNIT_DEFS 测试组（4 条）；更新教程默认配置测试和大十字测试；全部通过 | index.html / test.js / docs/10_CHANGELOG.md | node test.js 251/251 |
| 2026-05-26 | docs | 商店系统策划方案：①阅读 SAP 参考项目全部商店接口后输出完整策划；②覆盖核心循环/商品类型/单位设计(8-12个)/合成升级/经济模型/战斗连接/UI 流程/数据结构草案/风险取舍；③核心决策：第一版只做单位商店 + 合成升级，不做遗物/装备/羁绊，单位是行动槽容器，通过 buildHeroesFromUnits() 桥接现有战斗逻辑 | docs/01_游戏设计（策划主导）/商店系统策划方案.md / tasks/doing/当前任务.md / docs/10_CHANGELOG.md | 策划文档检查 |
| 2026-05-26 | docs | 接入商店系统外部参考 `SuperAutoTest`：①浅克隆 `koisland/SuperAutoTest` 到本地 `references/SuperAutoTest/` 供后续商店系统设计参考；②新增《商店系统外部参考-SuperAutoTest》摘录可复用的商店状态机、金币/刷新/冻结、buy/sell 接口、seed/tier/packs 与测试边界；③将该外部参考目录加入父仓库 `.gitignore`，避免污染主项目工作区 | tasks/doing/当前任务.md / docs/02_程序开发（程序主导）/商店系统外部参考-SuperAutoTest.md / docs/10_CHANGELOG.md / .gitignore | 本地克隆完成；参考文件检查 |
| 2026-05-26 | fix | 元素爆炸不再伤害英雄：移除 `doExplode()` 和 `settleExplosions()` 中对英雄的爆炸波及伤害，爆炸仅作用于怪物 | index.html / docs/01_游戏设计（策划主导）/战斗系统.md | node test.js 247/247 |
| 2026-05-26 | feat | 结束回合处一键执行英雄动作：①新增 `execAllHeroSlots()` 函数，遍历所有已配置但未使用的行动槽一键执行；②"结束回合"按钮旁新增"⚡一键执行"按钮（`#exa`），仅在 PLAYER 阶段存在可执行槽时可用；③`buildTurnVM()` 新增 `execAllDisabled` 字段控制按钮禁用态；④新增 L 组 3 条测试（case_l_001~003），覆盖批量执行/无hero跳过/已使用跳过/非PLAYER不执行/buildTurnVM 的 execAllDisabled；测试 244→247 全通过 | index.html / test.js / docs/10_CHANGELOG.md | node test.js 247/247 |
| 2026-05-26 | test | 补充剩余元素格点击详情集成测试：①测试 harness 保留真实 `render()` / `glog()`，允许单测临时走真实 UI 渲染与日志写入；②新增 `case_k_014`，构造 fire=3 引爆后 water=1 留存场景，调用 `onCell(5,5)` 验证 `#cd` 详情面板显示坐标、剩余水1层、未达到引爆阈值且不显示已引爆火3层；③验证普通点击查看详情不写战斗日志，选中英雄后点击同格会阻挡移动并在 `#log` 写入“目标格已占用”；测试 243→244 全通过 | test.js / docs/00_AI_PROJECT_RULES.md / docs/00_CURRENT_CONTEXT.md / docs/04_测试验收（测试主导）/版本发布验收清单.md / tasks/doing/当前任务.md / docs/10_CHANGELOG.md | node test.js 244/244 |
| 2026-05-26 | fix | 元素场持久化与占用同步补强：①新增 `topElementAt()` / `hasElementAt()`，元素地形占用统一以 `elementCells` 为准并兼容 `board.el/stk`；②新增 `syncBoardElementFromElementCells()` / `clearElementAt()`，结算或消耗元素后同步棋盘显示，避免多元素同格时留下隐形元素；③`settleExplosions()` 清空已结算元素后会把同格剩余元素重新投影到 `board`；④`moveHero()` 与底层 `MOVE_HERO` action 都禁止进入元素格；⑤`monsterAct()` / `simMonAct()` 改用统一元素占用判断，怪物攻击元素块时同步清除 `elementCells` 与 `board`；⑥`placeEl()` 避免把商店元素放到仍被元素场占用的格子；⑦新增 K 组 3 条测试（case_k_011~013）覆盖多元素结算后剩余元素显形并阻挡英雄、怪物攻击元素块清场、MOVE_HERO action 防绕过；测试 240→243 全通过 | index.html / test.js / docs/00_AI_PROJECT_RULES.md / docs/00_CURRENT_CONTEXT.md / docs/01_游戏设计（策划主导）/战斗系统.md / docs/02_程序开发（程序主导）/技术架构总览.md / docs/04_测试验收（测试主导）/版本发布验收清单.md / tasks/doing/当前任务.md / docs/10_CHANGELOG.md | node test.js 243/243 |
| 2026-05-29 | feat | 独立格子预览层（previewGrid）重构：①新增 `buildPreviewGrid()` 函数，创建 13×13 全棋盘 grid，每格含 entity/elementField/preview 三大字段；elementField 追踪 boardLayers（当前板上层数）、addedLayers（槽模拟增加）、layers（合计，上限 MAX_STK）；preview 含 incomingActions/selfCellDamage/splashDamage/entityDamage/willExplode/threatFromMonsters/labels 等；②怪物格不触发十字爆炸，只做单体伤害结算；空格达到 explosionThreshold 才触发十字，波及相邻怪物格；③`recomputeCorePreview()` 改为优先调用 `buildPreviewGrid()`，将 grid 存入 `G.coreSnapshot.previewGrid`；monsterThreats 从 previewGrid 返回值派生（不再单独调用 computeMonsterActionPreview 两次）；④`buildBoardVM()` 全面改为从 `G.coreSnapshot.previewGrid.grid[key]` 读取，不再调用 `computeHeroAttackPreview()` 或 `buildMonsterStats()`；⑤`render()` 顶部新增 `recomputeCorePreview()` 保证快照始终最新，cell detail 改从 `G.coreSnapshot.cellInfoMap` 读取；⑥`renderBoard()` 怪物卡不再读 `cv.mon.stats`，改为直接使用 `cv.mon.previewDamage/willDie`；⑦新增 J 组测试 11 条（case_pg_001~011）覆盖 grid 大小/结构/怪物格单体/空格爆炸/splash/克制加成/boardLayers 追踪/coreSnapshot 集成/hero 移动更新；测试 210→221 全通过 | index.html / test.js | node test.js 221/221 |
| 2026-05-29 | fix | 点击格子详情改为从 previewGrid 读取：①新增 `getSelectedCellPreview(state)` 函数，从 `coreSnapshot.previewGrid.grid[key]` 返回选中格子的 preview cell；②`render()` 调用 `getSelectedCellPreview(G)` 替代 `cellInfoMap[k(G.selectedCell)]`，使详情数据源与 previewGrid 统一；③`renderCellDetail(cell)` 重构为接收 previewGrid cell 结构（cell.pos / cell.entity / cell.elementField[].layers / cell.preview），不再接收 cellInfoMap 条目；④点击空格/怪物格/英雄格走同一套格子详情结构，不再独立重算；⑤新增 8 条测试（case_pg_012~019），覆盖 getSelectedCellPreview、空格 fire=1/3 详情、怪物格详情 entity.type=monster、英雄格 threatFromMonsters、移动英雄后详情随 previewGrid 重算、英雄/空格/怪物格 entity.type 一致性 | index.html / test.js | node test.js 229/229 |
| 2026-05-29 | chore | 安全清理 + 预览交互 + 多元素爆炸：①删除 `.env`（含 DEEPSEEK_API_KEY），创建 `.gitignore`，禁止密钥文件被提交；②点击棋盘格默认打开 previewGrid 格子详情，行动槽只通过「⚔使用」按钮发动，不再点击格子直接 useSlot；③`buildPreviewGrid` 步骤5a/5b 支持同一空格多个元素同时达到引爆阈值，每个元素独立计算爆炸伤害并累加；④`renderCellDetail` 怪物段改为「自身伤害 / 波及伤害 / 总伤害」格式，空格爆炸段显示多元素分项；⑤`case_multi_005` 从 `[TODO/NEEDS_REVIEW]` 升级为正式测试，新增 `case_pg_020` 验证 fire=3+water=3 预览和真实结算总伤均=12；测试 229→230 全通过 | index.html / test.js / .gitignore | node test.js 230/230 |
| 2026-05-26 | docs | 文档全量同步：任务卡、CURRENT_CONTEXT、AI_PROJECT_RULES、技术架构总览统一更新；任务卡日期从 2026-05-29 修正为 2026-05-26，完成内容补充 getSelectedCellPreview / onCell 改 / 多元素爆炸 / 安全清理；所有测试基线统一为 230/230；技术架构总览重写项目结构（移除已归档 txt 文件）、核心模块表（新增 buildPreviewGrid / dispatchGameAction / getSelectedCellPreview / renderCellDetail 等）、架构图（previewGrid 为中央预览源）、coreSnapshot 详细结构；新增《一天三阶段系统设计.md》设计概念草稿 | docs/00_CURRENT_CONTEXT.md / docs/00_AI_PROJECT_RULES.md / docs/02_程序开发（程序主导）/技术架构总览.md / tasks/doing/当前任务.md / docs/10_CHANGELOG.md / docs/01_游戏设计（策划主导）/一天三阶段系统设计.md | 文档检查 |
| 2026-05-26 | fix | useSlot 走事件驱动 + 元素持久化 + 英雄被元素格阻挡：①`useSlot` 改为调用 `dispatchGameAction({type:'USE_SLOT',slotId})`，新增 `USE_SLOT` 事件处理分支于 `applyActionToState`，actionLog 完整记录；②新增 `calcElementLayerDamage(layers)` 三角数公式函数；③新增 `commitPlayerActionsToElementField(G)` 幂等提交函数；④`endPlayerTurn()` 增加 `commitPlayerActionsToElementField(G)` 前置调用；⑤`finishMonsters()` 不再清除 `G.elementCells`，非引爆元素作为地形持久保留在棋盘上；⑥`moveHero()` 增加 `G.board[r][c].el` 检查，英雄不能走入元素格；⑦新增 K 组 10 条测试（case_k_001~010），覆盖 calcElementLayerDamage 公式、useSlot 事件路径、怪物格 HP6/HP10 结算、空格十字爆炸、元素落地幂等、预览与真实扣血一致性；测试 230→240 全通过 | index.html / test.js | node test.js 240/240 |
| 2026-05-26 | fix | 元素格与预览 badge 改为显示伤害值而非层数：①`.em` 元素格改为两行，上显示「N层」下显示「M伤」（M=N*(N+1)/2），直观呈现 1层=1伤/2层=3伤/3层=6伤；②`pvElLayers` 增加 `dmg` 字段；③预览 badge 在 `willExplode` 时改为显示 `💥M伤!`（爆炸伤害），未引爆时改为「cur→next层」，使玩家一眼看到引爆伤害 | index.html | node test.js 210/210 |
| 2026-05-26 | feat | 教程关默认攻击方块改为大十字：①确认 `SD[12]` 为教程默认大十字攻击方块，并以常量接线到 `initGame()`；②两位英雄 6 个默认行动槽统一改为 `fire + 大十字(sn=12)`，不改怪物攻击模块与商店全局形状池；③新增测试覆盖默认大十字同时命中怪物格与空格、空格补到 3 层触发十字引爆、怪物格补到 3 层仍只做单体结算；④同步更新 GDD 与战斗系统中的教程关说明 | index.html / test.js / docs/01_游戏设计（策划主导）/游戏概述文档GDD.md / docs/01_游戏设计（策划主导）/战斗系统.md | node test.js |
| 2026-05-26 | docs | 为《技术架构总览》补充正式架构图：用 Mermaid 展示玩家输入 → `dispatchGameAction` → `G` → 只读派生层（预览 / 统计 / `coreSnapshot`）→ ViewModel → `render()` / DOM 的主链路，并标出 `node test.js` 与单文件脚本的验证关系 | docs/02_程序开发（程序主导）/技术架构总览.md | 文档检查 |
| 2026-05-26 | fix | 测试入口可移植性修复：`test.js` 不再依赖写死的 Windows 绝对路径，改为默认读取仓库内同目录 `index.html`，并保留 `YSBZS_HTML_PATH` 环境变量覆盖口，便于仓库被下载到任意目录后直接执行自动化测试 | test.js | node test.js |
| 2026-05-28 | feat | 事件驱动架构 + 核心统一重算 + 文字战斗流程：①新增 `dispatchGameAction(action)` 统一入口，路由 6 种 action（MOVE_HERO/UPDATE_ACTION_SLOT/SELECT_ACTION_SLOT/SET_ACTION_TARGET/SET_ACTION_DIRECTION/END_PLAYER_ACTIONS）；②新增 `applyActionToState(action)` 状态修改路由；③新增 `recomputeCorePreview()` 统一重算，生成 `G.coreSnapshot`（含 _version/_ts/monsterStats/cellInfoMap/monsterThreats/heroStats/battleReport/warnings）；④新增 `buildHeroStats()` 英雄状态快照；⑤新增 `buildBattleReport(monsterStats,monsterThreats)` 文字战斗流程，覆盖行动日志/怪物格单体伤害/空格十字引爆/怪物攻击英雄预警；⑥接线 moveHero/selSlot/setDir/setHero 走 dispatchGameAction；⑦initGame 新增 coreSnapshot/coreVersion/actionLog 字段；⑧新增 I 组测试 case_core_001~007（199→206 全通过） | index.html / test.js | node test.js 206/206 |
| 2026-05-26 | docs | 瘦身 AI 规则入口：`00_AI_PROJECT_RULES.md` 改为极短必读入口，新增 `00_AI_WORKFLOW_DETAILS.md` 承载细则；入口文件和系统 ywh 模板同步要求必读细则；明确项目规则中文为主、保留英文命令和固定关键词；同步测试基线为 199/199 | docs/00_AI_PROJECT_RULES.md / docs/00_AI_WORKFLOW_DETAILS.md / docs/00_CURRENT_CONTEXT.md / AGENTS.md / CLAUDE.md / .github/copilot-instructions.md | node test.js 199/199；rg 一致性检查；git diff --check |
| 2026-05-25 | feat | 教程关默认配置统一全 fire + 规则测试矩阵：①initGame() 默认槽位改为 ha=fire/fire/fire、hb=fire/fire/fire（原 ha slot1=water、hb=wind/earth/water）；②新增 A 组 initGame 默认配置测试 5 条（教程关槽位全 fire、无多元素、英雄位置、怪物属性、threshold）；③新增 B 组怪物格单体结算测试 4 条（fire 1/2/3/6 层单体，相邻怪不受波及）；④新增 C 组空格十字爆炸测试 4 条（fire 1/2 不爆、fire 3/6 十字）；⑤新增 D 组怪物格 vs 空格差异测试 2 条；⑥新增 E 组多元素规则测试 5 条（含 TODO 标记的多元素同格引爆）；⑦新增 G 组 buildMonsterStats 预览统计测试 4 条（selfCellDamage/splash/合并/不改状态）；⑧新增 H 组怪物攻击预警测试 3 条（一步后攻击/两怪同攻/与 simMonAct 一致性）；I 组 UI/Playwright 测试因无 render_game_to_text 暂缓；172→199 全通过 | index.html / test.js | node test.js 199/199 |
| 2026-05-27 | feat | 新增格子信息层 CellInfoLayer：①`buildCellInfoMap()` 读取 G.elementCells/G.heroes/G.monsters/G.slots 及 buildMonsterStats/computeMonsterActionPreview 生成 cellInfoMap，结构含 entities/elementField/incomingEffects/selfCellDamagePreview/explosionPreview/splashIncomingPreview/monsterThreatPreview/summaryBadges；②UI 层新增 `renderCellDetail(ci)` 函数，分实体/元素场/本格结算/行动点来源四区展示；③更新 `onCell(r,c)`，无选中状态时切换格子详情面板（同格二次点击关闭）；④`render()` 调用 buildCellInfoMap+renderCellDetail；⑤`G.selectedCell` 新增至 initGame；⑥新增 #cd 面板及 CSS（.cd-pos/.cd-sec/.cd-badge/.cd-rule）；⑦新增测试 case_cellinfo_001~007，165→172 全通过 | index.html / test.js | node test.js 172/172 |
| 2026-05-27 | feat | 怪物格/空格结算规则分离：①`settleExplosions` 区分怪物格（有层即单体结算，不需达到引爆阈值，不触发十字）与空格（达到 willExplode 才十字引爆）；②新增 `buildMonsterStats()` 统计层，为每个怪物计算 selfCellDamage/splashDamage/finalPreview；③`computeHeroAttackPreview` 后处理区分怪物格/空格；④`buildBoardVM` dmgMap 同步区分；⑤怪物卡 UI 读取 monStats 显示预计扣血+☠死亡标记；⑥测试修复 验收-8（相邻格不受波及），更新 threshold=3 组两条期望值，新增 case_001~007 共 7 条，158→165 全通过 | index.html / test.js | node test.js 165/165 |
| 2026-05-26 | feat | 格子优先元素场：①`useSlot` 移除 hitCount/previewDamage 直伤，统一叠层（攻击怪物格与空地均一视同仁，仅叠 elementCells 层数）；②`settleExplosions` 改为十字范围引爆，explDmg(layers) 对十字内怪物和英雄各自结算，元素克制 ×2 在引爆时判定；③`computeHeroAttackPreview` 移除 simHit/tier 乘数，后处理阶段在引爆时将 explDmg 写到怪物所在格 monDmg；④`buildBoardVM` dmgMap 改为爆炸范围预览；⑤英雄卡承伤改为 `⚠×N -总伤` 格式；⑥测试从 156→158，替换 7 条过时用例，新增 2 条（空地引爆不崩溃、双元素同格引爆） | index.html / test.js | node test.js 158/158 |
| 2026-05-25 | feat | 怪物预览系统三项决策落地：①`simMonAct` 新增 `startPos/remainAp/stopReason` 返回字段（决策2）；②`computeMonWarn` 内部改为调用 `simMonAct`，log 预警与视觉预览来自同一模拟源（决策1）；③`heroIncomingDmg` 改为数组，英雄卡受伤显示从 `⚠-6` 升级为 `⚠-6;-3`（多怪各伤分列，决策3） | index.html | node test.js 156/156 |
| 2026-05-25 | fix | 怪物攻击方向扩展为左+下：①`monsterAct` 在左方检查后补充下方英雄攻击检查；②`simMonAct` 同步添加下方攻击模拟，确保英雄卡⚠-N 预览覆盖下方场景；③`computeMonWarn` 调整为 if/else if/else 结构，左/下均可触发 atk 类型预警 | index.html | node test.js 156/156 |
| 2026-05-25 | docs | 补充 graphify 使用边界：graphify 只作为总控 AI 的项目地图和影响范围分析工具，输出用于生成任务卡；执行 AI 仍只读任务卡指定文件，改代码前必须读真实源码，不能借图谱全量扫描项目 | docs/00_AI_PROJECT_RULES.md / tasks/doing/当前任务.md | rg 一致性检查；git diff --check |
| 2026-05-25 | docs | 明确固定口令“同步 ywh 工作流”：定义为以上游 ywh/ywh-game 为准，只同步项目工作流结构与 AI 入口，不改 index.html、test.js 或游戏核心代码；同步到入口文件、项目规则、决策记录和当前任务卡 | docs/00_AI_PROJECT_RULES.md / AGENTS.md / CLAUDE.md / .github/copilot-instructions.md / docs/09_DECISIONS.md / tasks/doing/当前任务.md | rg 一致性检查；git diff --check |
| 2026-05-25 | docs | 文档体系与多 AI 工作流清理：压缩 AGENTS/CLAUDE/Copilot 为薄入口；新增 CURRENT_CONTEXT、DECISIONS 和当前任务卡；将根目录 main/srd/数据/验收草稿归档并拆出攻击形状编号表、第一波教学脚本、基础数值表；将 Demo 门禁收敛为 10 份核心文档，补充任务卡分流、最小读取范围和单任务单代码编辑者规则 | AGENTS.md / CLAUDE.md / .github/copilot-instructions.md / docs/00_AI_PROJECT_RULES.md / docs/00_CURRENT_CONTEXT.md / docs/09_DECISIONS.md / tasks/doing/当前任务.md / docs/99_归档/** / docs/01_游戏设计（策划主导）/数值策划/** / docs/01_游戏设计（策划主导）/关卡策划/** / docs/02_程序开发（程序主导）/数据文件归档与分类规范.md / docs/04_测试验收（测试主导）/版本发布验收清单.md | node test.js 156/156；rg 结构检查 |
| 2026-05-25 | docs | 工作流规则优化：将 UI 文档分层同步到项目规则，新增用户界面与操作规范草稿；补齐核心/展示分离、数据归档、闭环成熟度评分 3 份门禁草稿；补充工作流规则变更 / 文档治理分类，明确用引用搜索、模板存在性、同步映射一致性验证 | docs/00_AI_PROJECT_RULES.md / AGENTS.md / CLAUDE.md / .github/copilot-instructions.md / docs/01_游戏设计（策划主导）/UI-UX策划/用户界面与操作规范.md / docs/02_程序开发（程序主导）/核心层与展示层分离设计.md / docs/02_程序开发（程序主导）/数据文件归档与分类规范.md / docs/04_测试验收（测试主导）/游戏闭环成熟度评分.md | rg 一致性检查 |
| 2026-05-25 | feat | 怪物行为预览补全：①computeMonsterActionPreview 新增 monCardMap，记录每个怪物攻击目标（atkTargetId）、伤害（atkDmg）、是否能攻击（canAttack）；②buildBoardVM 将 atkInfo 注入怪物 VM；③renderBoard 怪物卡新增 .mm-atkinfo 行，显示 →A（蓝）/-N（红）攻击信息，无法攻击时显示灰色·；④以上显示无条件启用，不依赖任何选中状态；明确战斗界面「两套预览始终共存」决策 | index.html | node test.js 156/156 |
| 2026-05-25 | docs | 补充决策文档：战斗系统.md 新增「§11 怪物行为预览是核心玩法数据」；用户界面与操作规范.md 新增「七、战斗界面默认可见信息」 | docs/01_游戏设计/战斗系统.md / docs/01_游戏设计/UI-UX策划/用户界面与操作规范.md | — |
| 2026-05-25 | fix | 战斗预览系统全面修复：①`computeHeroAttackPreview` 新增 `addLayers`/`elLabel`/`willExplode`/`fromSelHero` 字段，格子上常驻显示"火+1"/"水+2"等元素叠层文字；②选中英雄格子 overlay 更亮（0.42）、未选中淡色（0.20）；③将引爆时格子显示橙色"将引爆"警告；④`computeMonsterActionPreview` 新增 `monFinalSet` 区分怪物路过格（橙）/停留格（黄）/攻击格（红）；⑤`renderBoard` 新增 `.el-prev-badge`/`.explode-warn` 标签渲染 | index.html | node test.js 156/156 |
| 2026-05-25 | feat | HUD 显示层全面改造（Phase 2）：①棋盘格子 42px→52px，单位标记 38px→48px；②英雄卡改为 hm-row 两行布局，预测承伤集成进卡片（⚠-N）；③怪物卡改为四区布局（HP/ATK 顶行、👾图标、底部预测伤害/爆炸警告）；④元素预览标签从单一主元素改为全元素显示（🔥cur→next 格式）；⑤`simMonAct` 新增步骤编号（step:1/2/3），`computeMonsterActionPreview` 传递步骤至 VM，格子显示 M1/M2/M3 标签；⑥行动槽面板改为 2 列紧凑迷你卡（方向改为 ↑↓←→ 横排，去除 3×3 方向网格） | index.html | node test.js 156/156 |
| 2026-05-25 | docs | 新增 HUD与界面信息设计.md：从 index.html 实际代码逆向梳理，覆盖棋盘格子状态类、英雄/怪物/元素卡片规格、右侧面板4个box、4个覆盖层、元素色表、操作提示文案 | docs/03/HUD与界面信息设计.md | — |
| 2026-05-25 | docs | 代码-文档差异核查（排查验收）：对齐7项差异；技术架构总览清理3处乱码、修正 explosionThreshold 默认值说明（1→3）、hitCount 重置时机补文档、previewDamage 澄清（行动阶段预览，settleExplosions 时转真实扣血）；AI 规则文件补齐系统 ywh-game 缺失3规则（小修改防膨胀、代码-文档不一致处理流程、文档门禁+3个文档） | docs/02/技术架构总览.md / docs/00_AI_PROJECT_RULES.md / AGENTS.md | — |
| 2026-05-25 | fix | 规则一致性修复：G.explosionThreshold 默认值 1→3；useSlot 行动阶段直接更新棋盘不调用 addEl（杜绝 doExplode 在行动块中立即扣血）；doExplode 标注兼容路径注释；补测试 threshold=3 引爆阈值行为（5 新测试，共 156 项） | index.html / test.js | node test.js 156/156 |
| 2026-05-25 | refactor | elementCells 四元素槽架构：用 G.elementCells{"r,c":{fire/water/wind/earth:{layers,previewDamage,willExplode}}} 替代 G.pendingDmg；doExplode 恢复立即结算；useSlot 写入格子槽；新增 settleExplosions()，settleDamage 成为向后兼容别名；新增 G.previewEvents 供飘字显示 | index.html / docs/02 | node test.js 151/151 |
| 2026-05-25 | feat | 行动/结算两阶段分离（初版）：行动阶段只叠元素/记录待伤害；结算阶段统一引爆/扣血/清层 | index.html / test.js | node test.js 151/151 |
| 2026-05-24 | refactor | 视觉层重构：抽离预览计算为 computeHeroAttackPreview / computeMonsterActionPreview；新增 buildBattleVM / buildBoardVM / buildHeroesVM / buildSlotsVM / buildTurnVM ViewModel 层；renderBoard / renderHS / renderSlots / renderTurn 改为接受 VM 参数，不再计算规则 | index.html / docs/02 / docs/03 | node test.js 151/151 |

---

## 2026-05-24 · Demo v0.1 里程碑积累

| 日期 | 类型 | 摘要 | 涉及文件 | 验证 | Commit |
|---|---|---|---|---|---|
| 2026-05-24 | chore | ywh-init：初始化文档结构和 AI 规则文件 | docs/** / AGENTS.md / CLAUDE.md / .github/copilot-instructions.md | node test.js 139/139 | 待提交 |
| 2026-05-24 | feat | 怪物 3AP 系统：monsterAct 升级为 3 行动点循环 | index.html | node test.js 139/139 | a51d6ac |
| 2026-05-24 | feat | 攻击预览常驻：所有英雄行动槽始终显示预览 | index.html | node test.js 139/139 | a51d6ac |
| 2026-05-24 | feat | 怪物 3AP 预警：simMonAct 模拟完整 3AP 轨迹 | index.html | node test.js 139/139 | a51d6ac |
| 2026-05-24 | feat | 单位卡片重设计：HP/ATK 清晰显示，伤害徽章居中 | index.html | node test.js 139/139 | a51d6ac |
| 2026-05-24 | feat | nextMoveFromPos：提取显式位置参数的移动函数 | index.html | node test.js 139/139 | a51d6ac |
| 早期 | feat | 英雄 B 独立行动槽（3 槽）| index.html / test.js | node test.js 通过 | - |
| 早期 | feat | 商店系统、背包系统、合成升级 | index.html / test.js | node test.js 通过 | - |
| 早期 | feat | 元素叠层与引爆系统 | index.html / test.js | node test.js 通过 | - |
| 早期 | feat | 13×13 棋盘、两英雄、怪物基础系统 | index.html / test.js | node test.js 通过 | - |

---

## 2026-05-31 — 10天商店闭环验证·大巴扎对齐版 v2

### 文档
- **新增** `关卡策划/03_10天商店闭环验证_大巴扎对齐版.md`：六类成长节点（开局初始/午间商人/夜晚商店/精英奖励/Boss奖励/特殊事件）、黄金Day4首触/Day5入池、钻石Day6 Boss掉落/Day7入池、10天完整节点日历、经济/合成/战斗闭环推演。

## 2026-05-31 — 10天怪物刷怪闭环设计 v2（闭环修正版）

### 策划设计
- **新增** `关卡策划/04_第一阶段10天怪物刷怪闭环设计.md`：12种怪物类型表(6种零成本+6种ability占位)、20个战斗小段表(自动计算总HP/ATK)、10天压力曲线表、奖励与刷怪联动表、ability system接口预留(9 hooks)、各怪物基础版+完整版两套配置、Phase1执行规则(英雄特殊被动全部PENDING)、难度评估与Pending能力矫正分析。

### 修正（第2版）
- 第1版数值(手填总HP)全部替换为脚本自动计算值(怪物类型表驱动)
- 战术路线修正: "火元素叠层爆发+水+召唤" → "火伤害闭环+中立召唤流闭环"
- ember_seed/fluff_speaker ability status改pending
- 战斗表新增"玩家预期输出/是否允许漏怪"列
- "夜店"字眼全部替换为"夜晚商店"
- 新增§七数值风险分析(Day7-9总HP偏高,建议实现前降数值)
