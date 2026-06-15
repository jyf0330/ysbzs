# 2026-06-15_route-battle-outcome-reward

task_id: 2026-06-15_route-battle-outcome-reward
status: DONE
type: core-flow-feature
created_at: 2026-06-15

## Goal

推进 `docs/BAZAAR_OUTER_LOOP_ACCEPTANCE.md` Phase B：让外层路线中的战斗胜负回写到 `dayRoute`，记录每场遭遇/固定战的结果、金币变化和奖励资格，并在自动 Day1-Day3 路线脚本中可断言。

## Acceptance Mapping

本任务推进本文哪一层验收：第四层战斗接入、第三层构筑成长、Phase B 战斗胜负回写外层经济或奖励。
外层状态字段：`state.dayRoute.battleOutcomes`, `state.dayRoute.history[].outcome`, `state.dayRoute.pendingRewards`, `state.gold`。
玩家入口：`RUN_FULL_DAY` / `runFullPlayerDayFlow` / `runDayRangeScenario` 触发的 `BATTLE_PICK` 与 `FIXED_BATTLE_START`。
ViewModel / report 证据：`viewModel.dayRoute`、`renderPlayerReport` 与 `renderShopReport` 中的 route outcome 事件。
自动测试：`node tests/run_all_tests.cjs`、`npm run check:all`、`npm run test:coverage`。
如果可见，浏览器截图：本任务不改 UI 布局或可见 DOM；无需截图门禁。
未完成风险：本任务只记录奖励资格和经济回写，不实现完整奖励节点 UI 或 10 天终局。

## Related Files

- `src/core/dayRoute.cjs`
- `src/scenarios/fullDay.cjs`
- `src/render/textReport.cjs`
- `tests/run_all_tests.cjs`
- `tests/ui_adapter.test.cjs`
- `tests/full_coverage.test.cjs`
- `docs/10_CHANGELOG.md`
- `tasks/index.md`
- `tasks/doing/2026-06-15_route-battle-outcome-reward.md`
- `tasks/done/2026-06-15_route-battle-outcome-reward.md`

## Validation

- `node tests/run_all_tests.cjs`
- `npm run check:all`
- `npm run test:coverage`
- `git diff --check`

## Commit Plan

- `feat: 记录路线战斗结果与奖励资格`

## Evidence Log

- 2026-06-15: 创建任务卡，占用路线战斗结果回写相关核心、测试与文档文件。
- 2026-06-15: TDD 红灯确认：`node tests/run_all_tests.cjs` 失败于缺少 `battleOutcomes`。
- 2026-06-15: 实现 `dayRoute.battleOutcomes`、`dayRoute.pendingRewards`、`ROUTE_BATTLE_OUTCOME` 事件，以及 `renderPlayerReport` / `renderShopReport` 路线战斗结算文本。
- 2026-06-15: 发现自动 Day1-Day3 当前战斗均为 `LOSE`，因此奖励资格以 `reward_none`/`rewardEligible=false` 回写；测试改为断言 pendingRewards 跟随 eligible outcomes，而不是伪造胜利奖励。
- 2026-06-15: `node tests/run_all_tests.cjs` 通过，48/48。
- 2026-06-15: Day1-Day3 路线 outcome 复查：每天 2 场 outcome，均记录 `resultCode/goldDelta/rewardPoolId/rewardEligible`。
- 2026-06-15: `git diff --check` 通过。
- 2026-06-15: `npm run check:all` 通过，包含 run_all_tests、unit/ui/full/ops/prediction、architecture、csv、day7、dom、ui-connected、jsdoc。
- 2026-06-15: `npm run test:coverage` 通过，110 tests passed，all files line coverage 94.56%。
