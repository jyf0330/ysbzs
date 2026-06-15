# 2026-06-15_shop-refresh-control-state

task_id: 2026-06-15_shop-refresh-control-state
status: DONE
type: core-flow-feature
created_at: 2026-06-15

## Goal

推进 `docs/BAZAAR_OUTER_LOOP_ACCEPTANCE.md` 第二层 / Phase D：把商店刷新、免费刷新、折扣和定向补货统一记录为核心状态，让商店事件和路线事件不只是日志或即时刷新，而能在 `state.shop.refreshState`、ViewModel 与文字报告中被读取和断言。

## Acceptance Mapping

本任务推进本文哪一层验收：第二层商人 / 摊位 / 标签池；Phase D “刷新、折扣、定向补货全部进入核心状态，奖励和事件能改变商店状态”。
外层状态字段：`state.shop.refreshState`, `state.shop.freeRolls`, `state.shop.nextDiscount`, `state.shop.offers`, `state.shop.activeStall`。
玩家入口：`APPLY_SHOP_EVENT`、`ROLL_SHOP`、`PICK_NODE` 路线事件节点、`RUN_FULL_DAY` 自动路线。
ViewModel / report 证据：`viewModel.shop.refreshState`、`renderPlayerReport` / `renderShopReport` 中刷新/折扣/定向补货事件。
自动测试：`node tests/run_all_tests.cjs`、`node --test tests/ui_adapter.test.cjs`、`npm run check:all`、`npm run test:coverage`。
如果可见，浏览器截图：本任务不改 UI 布局或 DOM；无需截图门禁。
未完成风险：本任务只完成核心状态与报告，不做完整商店 UI 专门面板和 Day10 商店经济曲线。

## Related Files

- `src/core/shop.cjs`
- `src/core/dayRoute.cjs`
- `src/core/state.cjs`
- `src/core/stateHash.cjs`
- `src/uiAdapter.cjs`
- `src/scenarios/fullDay.cjs`
- `src/render/textReport.cjs`
- `tests/run_all_tests.cjs`
- `tests/ui_adapter.test.cjs`
- `docs/10_CHANGELOG.md`
- `tasks/index.md`
- `tasks/doing/2026-06-15_shop-refresh-control-state.md`
- `tasks/done/2026-06-15_shop-refresh-control-state.md`

## Validation

- `node tests/run_all_tests.cjs`
- `node --test tests/ui_adapter.test.cjs`
- `npm run check:all`
- `npm run test:coverage`
- `git diff --check`

## Commit Plan

- `feat: 记录商店刷新控制状态`

## Evidence Log

- 2026-06-15: 创建任务卡，占用商店刷新/折扣/定向补货核心状态相关文件。
- 2026-06-15: TDD 红灯确认：`node tests/run_all_tests.cjs` 失败于 `state.shop.refreshState` 未定义。
- 2026-06-15: 实现 `state.shop.refreshState`，记录 `freeRolls`、`nextDiscount`、`targetedRestocks`、`effects` 与 `lastRoll`；`APPLY_SHOP_EVENT` 与路线事件节点共用 `applyShopEventModifiers`。
- 2026-06-15: `SHOP_TARGETED_RESTOCK` 事件和报告文本会显示定向补货；ViewModel 暴露 `shop.refreshState`。
- 2026-06-15: `node tests/run_all_tests.cjs` 通过，52/52。
- 2026-06-15: `node --test tests/ui_adapter.test.cjs` 通过，27/27。
- 2026-06-15: `git diff --check` 通过。
- 2026-06-15: `npm run check:all` 通过，包含 run_all_tests 52/52、unit 50/50、ui 27/27、full 9/9、ops 12/12、prediction 4/4、architecture、csv、day7、dom、ui-connected、jsdoc。
- 2026-06-15: `npm run test:coverage` 通过，112/112，all files line coverage 94.40%。
