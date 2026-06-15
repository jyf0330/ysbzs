# 10_CHANGELOG

## 2026-06-15

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
