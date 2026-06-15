# 10_CHANGELOG

## 2026-06-15

- 商店刷新控制现在进入核心状态：`state.shop.refreshState` 记录免费刷新、待用折扣、最近刷新、定向补货队列和事件来源；商店事件与路线事件共用同一套状态，并通过 ViewModel / 文字报告暴露。
- 路线商店节点现在会进入具名商人/摊位状态：`state.shop.activeStall` 记录摊位名、标签、商品池、槽位、解锁日和价格规则摘要，ViewModel 与文字报告可读取，商品继续按摊位标签池筛选。
- 路线战斗胜利产生的 pending reward 现在能通过 `CLAIM_ROUTE_REWARD` 玩家入口领取：核心会按战斗结果奖励池生成候选、选择奖励进入背包/遗物，并写回 `dayRoute.claimedRewards`、路线历史和文字战报。
- 路线战斗现在会回写外层 outcome：记录遭遇/固定战结果、金币变化、奖励池资格和 pending reward 状态，并在文字报告中展示路线战斗结算。
- 扩展大巴扎外层路线骨架到 Day1-Day3：新增 Day2/Day3 节点日程、节点池、遭遇池和连续运行场景入口；自动路线不再每步固定选择同一最高权重节点。
- 新增 `docs/BAZAAR_OUTER_LOOP_ACCEPTANCE.md`，固化长期方向：外层对齐《The Bazaar》式 run / 节点 / 商人 / 摊位 / 奖励 / 遭遇系统，内层继续使用元素背包史棋盘元素战斗。
