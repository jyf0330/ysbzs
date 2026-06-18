# 10_CHANGELOG

## 2026-06-18

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
