# 2026-06-15_route-pending-reward-claim

task_id: 2026-06-15_route-pending-reward-claim
status: DONE
type: core-flow-feature
created_at: 2026-06-15

## Goal

推进 `docs/BAZAAR_OUTER_LOOP_ACCEPTANCE.md` Phase B / 第三层构筑成长 / 第四层战斗接入：让战斗胜利产生的 `dayRoute.pendingRewards` 能通过玩家入口领取，生成对应奖励候选、选择后进入背包或遗物，并把领取结果写回路线历史与报告。

## Acceptance Mapping

本任务推进本文哪一层验收：第三层构筑成长、第四层战斗接入，连接“战斗胜负回写外层奖励资格”到“奖励影响后续构筑”。
外层状态字段：`state.dayRoute.pendingRewards`, `state.dayRoute.claimedRewards`, `state.dayRoute.history[].claimedReward`, `state.rewards`, `state.inventory`, `state.relics`。
玩家入口：`CLAIM_ROUTE_REWARD` / `PICK_REWARD` / `RUN_FULL_DAY` 自动路线。
ViewModel / report 证据：`viewModel.dayRoute.pendingRewards`, `viewModel.dayRoute.claimedRewards`, `renderPlayerReport` / `renderShopReport` 中路线奖励领取事件。
自动测试：`node tests/run_all_tests.cjs`、`npm run check:all`、`npm run test:coverage`。
如果可见，浏览器截图：本任务不改 UI 布局或可见 DOM；无需截图门禁。
未完成风险：本任务只打通“待领奖励 -> 领取 -> 构筑变化”核心链路，不实现完整奖励节点 UI 视觉或 Day10 终局。

## Related Files

- `src/core/dayRoute.cjs`
- `src/core/reducer.cjs`
- `src/uiAdapter.cjs`
- `src/uiAdapterCommands.cjs`
- `src/scenarios/fullDay.cjs`
- `src/render/textReport.cjs`
- `tests/run_all_tests.cjs`
- `tests/ui_adapter.test.cjs`
- `docs/10_CHANGELOG.md`
- `tasks/index.md`
- `tasks/doing/2026-06-15_route-pending-reward-claim.md`
- `tasks/done/2026-06-15_route-pending-reward-claim.md`

## Validation

- `node tests/run_all_tests.cjs`
- `npm run check:all`
- `npm run test:coverage`
- `git diff --check`

## Commit Plan

- `feat: 打通路线战斗奖励领取`

## Evidence Log

- 2026-06-15: 创建任务卡，占用路线待领奖励领取相关核心、入口、测试、报告与文档文件。
- 2026-06-15: TDD 红灯确认：`node tests/run_all_tests.cjs` 失败于 `Unknown command: CLAIM_ROUTE_REWARD`。
- 2026-06-15: 实现 `CLAIM_ROUTE_REWARD` reducer/API 入口、`dayRoute.claimRouteReward`、`dayRoute.claimedRewards`、路线历史 `claimedReward`、`ROUTE_REWARD_CLAIM` 事件与报告文本。
- 2026-06-15: 自动路线在战斗后会尝试领取可用 pending reward；当前 Day1-Day3 自动战斗多为失败时不会伪造奖励。
- 2026-06-15: `node tests/run_all_tests.cjs` 通过，49/49。
- 2026-06-15: `node --test tests/ui_adapter.test.cjs` 通过，25/25。
- 2026-06-15: `git diff --check` 通过。
- 2026-06-15: `npm run check:all` 通过，包含 run_all_tests 49/49、unit 50/50、ui 25/25、full 9/9、ops 12/12、prediction 4/4、architecture、csv、day7、dom、ui-connected、jsdoc。
- 2026-06-15: `npm run test:coverage` 通过，110/110，all files line coverage 94.33%。
