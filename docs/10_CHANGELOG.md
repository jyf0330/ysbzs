# 10_CHANGELOG

## 2026-06-22

- 总表机制与默认品质覆盖进入运行时：`REVIEW` 机制占位归一为 `none`，默认队伍创建不再覆盖宠物主表机制，`mech_aura` 归一后的 `mech_scale_with_allies` 已接入回合开始同阵营成长；`10_initial_roster.csv` 新增结构化 `品质覆盖` 列，默认队伍按表成为融焰娘黄金、火绒狐/冲浪鸭/疾风隼白银。
- 策划总表同步当前品质成长与新 19 形状口径：`xlsx/ysbzs_master.xlsx` 新增 `SHAPE_CATALOG` / `QUALITY_GROWTH` / `QUALITY_UPGRADES`，宠物 `shape_id` 回灌为代码实际使用的 `01-19`；导出链路生成 `27_shape_catalog.csv`、`28_quality_growth.csv`、`29_quality_upgrades.csv`，策划好读版 workbook 增加对应 27/28/29 表。
- 旧形状测试口径改为显式受控 fixture 或从 `shapeCatalog` 计算正式作用格，避免默认宠物切到新形状后仍按旧 `A1/B1` 相邻格断言；同时清理 `actions.cjs` 中一行无效循环末尾 `continue`，让 `check:jsdoc` 继续通过。

## 2026-06-21

- 优化项目 Superpowers / YWH skill 路由：`docs/02_CURRENT_WORKFLOW.md` 现在明确 Superpowers 负责执行纪律、YWH 负责项目适配，`ywh-web-game` / Playwright / game-playtest 只在浏览器 UI 或可见验收阶段加载，避免纯工作流文档任务过早拉入 UI 验收链。
- 修正任务总览规则口径：`tasks/index.md` 不再写“ACTIVE 任务最多 1 个”，改为多个 ACTIVE 任务按 `related_files` / `exclusive_files` 文件级写入租约判断是否冲突。

## 2026-06-20

- 移动后的沙盒单位 diff 现在保留受伤来源：`PREVIEW_MANUAL_FLOW.unitDiffs` 会从沙盒 `DAMAGE` 与 `ENEMY_PET_ACTION` 事件回填 `enemyIds` / `threats` / 敌方名称 / 槽位 / 形状来源，右侧详情不再显示 `敌方宠物()` 空来源；默认战斗真实浏览器验证 `疾风隼 R6C3 -> R2C6` 显示 `敌方翠叶鼠(-3,-3) · 合计-6`。
- 移动后的我方宠物受伤显示彻底改为最新 `manualFlowPreview.unitDiffs`：右侧详情和棋盘格 `受X/KO` 标记在投影预览模式下不再读取 projected/current `teamRisk`，避免旧风险口径覆盖沙盒实际 diff。默认战斗真实浏览器验证 `疾风隼 R6C3 -> R2C6` 显示 `预计伤害 6 / HP10→4 / 受6`，未使用 Day7。
- `PREVIEW_MANUAL_FLOW` 的 timing 现在支持按需本地基线日志：命令传 `persistTiming: true` 或设置 `YSBZS_TIMING_PERSIST=1` 时写入 `.ysbzs-performance/`，默认不落盘，避免普通预览增加同步写入成本。
- 第7天火核心试炼不再作为默认测试/验收基准：`npm test`、`check:all`、`check:v1`、coverage 和 all-check runner 都不会自动执行 Day7；显式 `npm run check:day7` 入口保留，仅在用户主动要求时使用。
- 试炼单位创建路径补齐我方宠物全棋盘移动：`makeTrialUnit()` 现在和普通我方单位一样给 hero 默认显式 board-covering `moveRange`，不恢复 `moveMode: infinite` 特判，敌方和显式移动范围不受影响。

## 2026-06-19

- 高风险沙盒预览开始返回结构化阶段耗时：`PREVIEW_MANUAL_FLOW.result.timing` 会记录快照、命令归一、前后 ViewModel/格子/详情、沙盒命令、diff、恢复等阶段的 `ms` 和 `totalMs`，移动响应携带的 `manualFlowPreview` 也保留这份 timing，后续性能优化可直接按阶段定位。
- 我方移动后的受伤/预览显示改为沙盒投影数据源：`MOVE_HERO` 不再在核心移动路径里计算单只宠物 `riskBefore/riskAfter`，移动响应会直接附带 `RUN_PLAYER_ALL_OUT -> END_PLAYER_TURN` 的事务预览，包含执行前后全格子、全详情、`cellDiffs` 和 `unitDiffs`，前端首次渲染即可使用模拟结果。
- 敌方宠物行动日志现在会把我方宠物实际受伤写进同一条行动摘要：`ENEMY_PET_ACTION` 会从随后的 `DAMAGE` 事件汇总 `我方火绒狐受伤18` 这类文本，底部事件日志不再只显示“命中”而漏掉我方受伤数。
- 右侧单位详情现在区分“单位元素层”和“脚下元素层”：单位站在 `水3` 等格子元素上时，详情面板会从棋盘格读取并显示脚下元素，不再因为单位自身元素为空而显示元素层无。
- 修复全队棋盘预览把我方行动误算到友方单位的问题：预览现在只把敌方单位作为伤害目标，友方占位格只保留作用格/元素投影，不再生成 `伤` 数值。
- 棋盘预览现在默认按当前/预览占位覆盖全队我方宠物：无移动时不再只看第一只，移动一只后也不会缩窄到 movedUnitIds；候选落点沙盒改为循环执行我方全部可用行动槽，同时保留独立的敌方受击风险预览。
- 战斗预览现在按“即将发生的结算结果”生成：`previewGrid` 会汇总当前预览主体剩余 AP 可执行的未用行动槽，并把普通行动伤害与元素成型伤害一起计入预计伤害；候选落点预览在沙盒施放前生成，施放后的真实差异继续进入 sandbox 结果。
- 新增 `AUTO_POSITION_HEROES` 智能站位命令和页面按钮：只移动本回合未移动、未锁定的我方宠物到预计伤害更高的位置，不自动释放行动槽；同时把“怪物行动/结束回合”相关按钮改成更贴近敌方宠物行动与 Boss 召唤阶段的动态文案。
- 新增纸上西游描线战斗界面 `web/paper-battle.html`：页面接入真实 `/api/view` 和 `/api/action`，可通过真实按钮/棋盘/行动形状操作第7天火核心试炼，并提供独立验证脚本。

## 2026-06-18

- 元素包转换现在保持原子性：当转换层数不足以覆盖一个多层元素包时会跳过该包，不再把一个元素包拆成已转换和未转换两段。
- 修复我方单位跨回合仍被“已行动”锁住的问题：战斗开始和新回合开始会同时重置 `actionSlotsUsed`、`actionApSpent` 与 `hasAttacked`，保留同回合行动后不能移动，但下一回合可正常移动；正式 4173 界面验证了释放行动块、直接结束回合、点怪物行动进入第 2 回合后可移动。
- 正式界面现在会正确显示“攻击后锁定位置”：单位释放行动块后不再继续标出可移动格，操作提示改为“本回合已行动，位置锁定”，避免误以为还能继续移动同一单位。
- 修复正式界面移动后再释放行动块时的旧目标格残留：移动 `R6C3->R6C6` 后再点疾风隼行动块直接释放，不会再把脚下格当成目标导致“没有合法目标格”，而是按当前方向正常命中右侧敌人。
- 玩家行动槽命中敌人时现在会同时结算行动伤害并铺完整作用格元素：例如正式界面 `R6C3 -> R6C6` 的疾风隼风行动会显示 `敌方翠叶鼠受风伤17`，并记录 `R6C4` 到 `R6C7` 风元素增加。
- 玩家行动日志现在改为摘要展示：移动只写 `R?C?->R?C?` 和预计受伤变化；方向只写预览格数/命中对象；施放只写命中、实际受伤和元素增加，默认不再输出每个格子的 HP、火0/水0/风0、无威胁等长明细。
- 行动槽摘要里的怪物受伤和元素增加现在从本次结算事件流提取：火爆等“先增加后清空”的元素也会显示 `元素增加：R?C? 火+1`，并同时保留 `敌方...受火伤N`。
- 浏览器事件 tab 现在显示完整事件历史并从第一条事件开始：ViewModel `events` 不再只下发最近 30 条，主战斗页不再只渲染最后 22 条，避免日志看起来从 `042` 等后段 step 开始。
- 公开事件输出不再裁掉结构化 payload：`/api/action` 返回的事件和 ViewModel `events` 现在会保留完整事件字段，并只补默认 `text`，避免 `restock`、伤害、目标、来源等数据在 UI 层丢失。
- 新增独立每日流程页面：`web/daily-flow.html` 通过公开 runtime 读取 `/api/view` 的 `dailyFlow`，并用 `/api/action` 推进生成节点、选择节点、跑完当天和完整 Run；主战斗页顶部新增“流程”入口。
- `dailyFlow` 从 `src/dailyFlowView.cjs` 进入 ViewModel，展示当天 6 步日程、当前/下一步状态、路线历史、待领奖励、跨天 Run 摘要和终局信息，同时保持 `src/uiAdapter.cjs` 在 round5 行数守卫内。

## 2026-06-17

- 外部 AI CLI 协作规则补充：DeepSeek/Claude/Gemini 等外部 Worker 默认用可观察 `tmux` 会话，Lead 用 `#{pane_last}` 判断活动时间；若当前 tmux 返回 `0`/空值，则用 `pipe-pane` 日志 mtime 作为零干扰 fallback。3 分钟无活动先中断，同一问题 3 次失败则终止任务并记录复盘，避免 Lead 黑箱等待或接管代写。
- 外部 AI 压测记录：棋盘格右侧详情来源标签任务交给 `cys` / DeepSeek 执行 3 次，均未通过 Lead 的真实浏览器点击验收；未交付 UI 代码，失败原因已归档到任务卡。
- 优化多 AI 协作工作流：`docs/02_CURRENT_WORKFLOW.md` 现在明确 Lead Agent、Specialist Agent、Tester Pass、External AI 的职责边界、派发条件、交接格式和冲突处理，避免外部建议或测试线程绕过任务卡、真实入口验收和精确提交规则。

## 2026-06-15

- 新增 pipeline/ 双 Agent 协作工具：`run.sh` 状态机支持 plan→review→implement→verify→fix→commit 六阶段流转，prompt.md 写需求、output.md 依次追加产出，适合我+Codex 接力开发。详见 `pipeline/README.md`。
- 购买定向补货商品后，来源现在会真正进入构筑：背包条目、`SHOP_BUY` 事件、ViewModel inventory、state hash 和玩家战报都会保留 `restock_offer` 来源，能追踪“火元素补货”等商店事件如何变成后续队伍资产。
- 定向补货生成的商品现在携带来源证据：`offer.restock` 记录 `restockId`、事件名、补货池和标签，ViewModel / state hash / 文字报告 / 浏览器商品卡都能看到“补货：火元素补货”等来源，方便追踪商店事件如何塑造构筑。
- 完整 run 终局后的顶部下一步提示修正为“查看终局报告”：`terminalSummary` 进入 ViewModel，terminal 状态下不再把未领取奖励动作暴露成下一步，避免玩家到 Day10 后误以为还要继续领奖。
- 浏览器现在有完整 run 入口：右侧自动控制区新增“完整Run”按钮，通过 `/api/action` 发送 `RUN_FULL_RUN`，可从 Day1 自动推进到 Day10 终局，并在状态条 / 战报中保留终局与跨天成长。
- Day1-Day10 自动 run 现在记录跨天成长快照：`dayRouteRuns[]` 每天包含金币变化、背包/遗物数量和构筑核心摘要，玩家战报新增 `【跨天成长】` 段落，便于验收一局 run 的经济与构筑轨迹。
- 触发对象现在进入玩家可读战报和 replay 协议：`TRIGGER_OBJECT_RESOLVE` 会在 battleTrace protocol 暴露 object id，`buildTraceFromChanges` 和玩家报告会输出 `fire_trap_*` 触发链，便于复盘 objectRegistry 触发来源。
- `objectRegistry` 开始进入真实火陷阱触发链路：火陷阱触发前会从可触发对象视图定位 `fire_trap_*`，触发事件写入对象证据，并新增 `TRIGGER_OBJECT_RESOLVE` changeLog，方便 replay/战报解释触发来源。
- 路线遭遇和固定战现在显示战前压力预览：遭遇 3 选 1 卡片和固定战预告会展示时段、波次数、总威胁、峰值威胁、敌量、主品质和胜利奖励预期，数据来自当前遭遇与真实波次表。
- 路线固定战 / 终局 Boss 战现在有明确玩家入口：外层日程走到固定战时，ViewModel `nextActions` 会暴露 `RUN_ROUTE_FIXED_BATTLE`，浏览器“生成遭遇”按钮会切换成“进入晚上战 / 终局Boss战”，点击后走路线固定战、回写 outcome 和终局状态。
- 路线战斗奖励现在能在浏览器奖励区直接领取：`dayRoute.pendingRewards` 会显示为“路线战斗奖励”卡片，点击后走 `CLAIM_ROUTE_REWARD`，写入 claimed reward，并清空临时候选，避免玩家误以为还能重复选择普通奖励。
- 商店界面现在直接显示当前摊位和刷新经济状态：浏览器商店面板会展示摊位名、标签倾向、商品池、槽位、价格规则、免费刷新、下次折扣、最近刷新和定向补货数量，玩家不需要从日志里猜当前商店状态。
- 外层路线选择候选现在有结构化后果预览：节点和遭遇 3 选 1 会在 ViewModel 与浏览器卡片中显示类型、标签、成本、收益和简短说明，玩家能更快判断商人、奖励、事件和战斗压力的区别。
- 外层构筑核心进入浏览器第一屏状态条：顶部 HUD 现在显示阶段、当天、外层进度、金币、构筑核心和下一步，节点候选生成后能直接看到 `节点 0 · 3选1` 与 `选择节点`。
- 外层构筑核心现在进入 ViewModel 和文字战报：系统会从背包、遗物和定向补货状态派生 `buildCore`，输出火系、召唤、等级等当前构筑标签，帮助玩家理解本局 run 的成长方向。
- 外层 Day10 终局状态进入自动 run 闭环：Day10 终局固定战后现在写入 `state.dayRoute.terminal` 和 `RUN_TERMINAL`，`runDayRangeScenario` 能断言最终 Boss 状态，文字战报也会输出终局记录。
- 外层陷阱增伤进入统一 modifier 证据链：`evt_trap_bonus` 触发火陷阱时现在通过 `modifierEngine` 计算伤害，并写入 `APPLY_OUTER_BATTLE_MODIFIER` changeLog，方便战报和 replay 解释外层奖励如何影响战斗触发。
- 外层五回合高奖进入路线战后闭环：`evt_battle_bonus` 现在会在路线战斗 `WIN_FAST` 时写入 post-battle event，保留 `reward_fast_clear` pending reward，并进入 outcome、路线历史和文字战报。
- 外层升阶机会进入构筑成长闭环：`evt_upgrade_offer` 从待接入转为正式，Day4 路线新增“升阶机会商人”；选择后花费金币提升已拥有宠物等级，并写入路线历史、ViewModel 和文字战报。
- 外层失败惩罚事件进入路线战后闭环：`evt_battle_fail` 现在会在路线战斗失败时写入 post-battle event，记录防线与经济倍率变化，并进入 outcome、路线历史和文字战报。
- 外层同名复制事件进入构筑成长闭环：`evt_duplicate` 从待接入转为正式，Day3 路线新增“同名复制商人”；选择后花费金币复制已拥有宠物到 bench/合成背包，并写入路线历史、ViewModel 和文字战报。
- 外层精英战奖励开始回写高奖池：`evt_elite_reward` 从待接入转为正式战后事件，精英/Boss 压力战胜利后路线奖励池切到 `reward_elite`，并写入 outcome、pending reward、结构化事件和战报。
- 外层风险经济事件开始进入 run 压力闭环：`evt_curse_gold` 从待接入转为正式事件，Day6 路线新增“贪婪诅咒”；选择后立刻获得金币，但下一场路线战斗奖励金币按 90% 结算并写入 ViewModel / 战报。
- 外层陷阱流开始影响战斗核心：`evt_trap_bonus` 从待接入转为正式事件，Day5 路线新增陷阱商人；选择后下一场火陷阱触发会获得陷阱增伤、消耗战前效果并写入战报。
- 外层 `pre_battle` 事件开始进入战斗核心：Day4 路线新增“战前护盾祝福”，选择后写入 `state.battlePrepEffects`，下一场战斗开局给我方单位护盾并进入 ViewModel / 文字战报。
- 扩展大巴扎外层路线骨架到 Day1-Day10：新增 Day4-Day10 节点日程、节点池、遭遇池，自动路线脚本可连续跑完 10 天并断言每日决策、固定战、战斗 outcome 与高阶资源/压力标签。
- 商店刷新控制现在进入核心状态：`state.shop.refreshState` 记录免费刷新、待用折扣、最近刷新、定向补货队列和事件来源；商店事件与路线事件共用同一套状态，并通过 ViewModel / 文字报告暴露。
- 路线商店节点现在会进入具名商人/摊位状态：`state.shop.activeStall` 记录摊位名、标签、商品池、槽位、解锁日和价格规则摘要，ViewModel 与文字报告可读取，商品继续按摊位标签池筛选。
- 路线战斗胜利产生的 pending reward 现在能通过 `CLAIM_ROUTE_REWARD` 玩家入口领取：核心会按战斗结果奖励池生成候选、选择奖励进入背包/遗物，并写回 `dayRoute.claimedRewards`、路线历史和文字战报。
- 路线战斗现在会回写外层 outcome：记录遭遇/固定战结果、金币变化、奖励池资格和 pending reward 状态，并在文字报告中展示路线战斗结算。
- 扩展大巴扎外层路线骨架到 Day1-Day3：新增 Day2/Day3 节点日程、节点池、遭遇池和连续运行场景入口；自动路线不再每步固定选择同一最高权重节点。
- 新增 `docs/BAZAAR_OUTER_LOOP_ACCEPTANCE.md`，固化长期方向：外层对齐《The Bazaar》式 run / 节点 / 商人 / 摊位 / 奖励 / 遭遇系统，内层继续使用元素背包史棋盘元素战斗。
