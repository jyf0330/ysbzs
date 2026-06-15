# 外层精英战高奖池回写

## task_id

2026-06-15_outer-elite-reward-pool

## 目标

推进 `docs/BAZAAR_OUTER_LOOP_ACCEPTANCE.md` 第三、第四层：让 `evt_elite_reward` 从待接入战后奖励事件变成正式规则，精英/Boss 压力战胜利后把路线战斗奖励池切到 `reward_elite`，并留下结构化证据。

## 验收映射

- 第三层构筑成长：高压遭遇能产出高奖池，外层奖励质量跟风险挂钩。
- 第四层战斗接入：战斗结果回写外层奖励资格和奖励池，不只是固定 pT 池。

## 外层状态字段

- `state.dayRoute.battleOutcomes[].postBattleEvents`
- `state.dayRoute.pendingRewards[].rewardPoolId`
- `state.dayRoute.history[].outcome.postBattleEvents`

## 玩家入口

- `GENERATE_BATTLE_OPTIONS`
- `PICK_BATTLE_ENCOUNTER`
- `RUN_BATTLE` / 路线战斗结算
- `CLAIM_ROUTE_REWARD`

## ViewModel / report 证据

- `viewModel.dayRoute.battleOutcomes[].postBattleEvents`
- `ROUTE_POST_BATTLE_EVENT_APPLY`
- `ROUTE_BATTLE_OUTCOME` 中的 `rewardPoolId=reward_elite`
- `ROUTE_REWARD_CLAIM` 领取 `reward_elite`
- `renderPlayerReport(state)` 包含精英奖励记录

## related_files

- `data/csv/05_events.csv`
- `data/csv/06_shop_rewards.csv`
- `src/core/dayRoute.cjs`
- `src/render/textReport.cjs`
- `tests/run_all_tests.cjs`
- `docs/10_CHANGELOG.md`
- `tasks/index.md`
- `tasks/done/2026-06-15_outer-elite-reward-pool.md`

## commit_plan

`feat: 接入外层精英高奖池`

## 验证计划

- `node tests/run_all_tests.cjs`
- `npm run check:all`
- `npm run test:coverage`
- `git diff --check`

## 可见验收

本任务不修改浏览器 DOM、CSS、棋盘显示、布局或可见预览；只增加核心结算、文字报告和自动测试，不触发提交前截图门禁。

## 进度记录

- 2026-06-15: 创建任务卡，占用精英战高奖池回写相关文件。
- 2026-06-15: 红灯验证完成，`node tests/run_all_tests.cjs` 失败于 `evt_elite_reward` 仍为 `待接入`。
- 2026-06-15: `evt_elite_reward` 从待接入改为正式战后事件。
- 2026-06-15: `reward_elite` 接入可领取内容，加入 `pal_124` 和 `pal_127` 两个黄金终局级宠物奖励源。
- 2026-06-15: 精英/Boss/终局压力战胜利时，路线 outcome 从基础奖励池升级到 `reward_elite`，并同步 pending reward。
- 2026-06-15: 新增 `ROUTE_POST_BATTLE_EVENT_APPLY` 结构化事件，`ROUTE_BATTLE_OUTCOME` 和文字战报会显示精英奖励。
- 2026-06-15: `node tests/run_all_tests.cjs` 通过，57/57。
- 2026-06-15: `node --test tests/full_coverage.test.cjs` 通过，9/9。
- 2026-06-15: `npm run check:all` 通过；包含 unit 50/50、ui_adapter 27/27、full 9/9、ops 12/12、prediction 4/4、architecture/CSV/day7 browser/no-DOM/UI connected/jsdoc 全部通过。
- 2026-06-15: `npm run test:coverage` 通过，112/112；全文件行覆盖率 92.88%。
- 2026-06-15: `git diff --check` 已在实现后通过；归档后会再跑一次。
- 2026-06-15: 可见验收门禁判定不触发：本任务未修改 DOM/CSS/棋盘显示/布局/可见预览。
