# 2026-06-15_route-shop-stall-identity

task_id: 2026-06-15_route-shop-stall-identity
status: DONE
type: core-flow-feature
created_at: 2026-06-15

## Goal

推进 `docs/BAZAAR_OUTER_LOOP_ACCEPTANCE.md` Phase B / 第二层商人摊位标签池：让路线商店节点进入具体商人/摊位身份，摊位带标签、商品池、槽位数量、解锁天数和价格规则摘要，并进入核心 `state.shop`、ViewModel、路线历史与文字报告。

## Acceptance Mapping

本任务推进本文哪一层验收：第二层商人 / 摊位 / 标签池，Phase B “商人/摊位标签开始实际影响商品”，并为 Phase D 大巴扎式商店闭环打基础。
外层状态字段：`state.shop.activeStall`, `state.shop.activePool`, `state.shop.offers[].poolId`, `state.dayRoute.history[].stall`。
玩家入口：`PICK_NODE` 选择 shop 节点、`ENTER_SHOP` 手动商店、`RUN_FULL_DAY` 自动路线。
ViewModel / report 证据：`viewModel.shop.activeStall`、`viewModel.dayRoute.history[].stall`、`renderPlayerReport` / `renderShopReport` 中摊位身份与倾向。
自动测试：`node tests/run_all_tests.cjs`、`node --test tests/ui_adapter.test.cjs`、`npm run check:all`、`npm run test:coverage`。
如果可见，浏览器截图：本任务不改 UI 布局或 DOM；无需截图门禁。
未完成风险：本任务只让摊位身份和标签进入核心状态与报告，不实现完整摊位 UI 排版、定向补货事件链或 Day10 商店闭环。

## Related Files

- `src/core/dayRoute.cjs`
- `src/core/shop.cjs`
- `src/core/state.cjs`
- `src/core/stateHash.cjs`
- `src/uiAdapter.cjs`
- `src/scenarios/fullDay.cjs`
- `src/render/textReport.cjs`
- `tests/run_all_tests.cjs`
- `tests/ui_adapter.test.cjs`
- `docs/10_CHANGELOG.md`
- `tasks/index.md`
- `tasks/doing/2026-06-15_route-shop-stall-identity.md`
- `tasks/done/2026-06-15_route-shop-stall-identity.md`

## Validation

- `node tests/run_all_tests.cjs`
- `node --test tests/ui_adapter.test.cjs`
- `npm run check:all`
- `npm run test:coverage`
- `git diff --check`

## Commit Plan

- `feat: 记录路线商店摊位身份`

## Evidence Log

- 2026-06-15: 创建任务卡，占用路线商店摊位身份、核心商店、ViewModel、报告、测试与 changelog 文件。
- 2026-06-15: TDD 红灯确认：`node tests/run_all_tests.cjs` 失败于 `state.shop.activeStall` 未定义。
- 2026-06-15: 实现 `state.shop.activeStall`、摊位标签推导、路线历史 `stall` 回写、ViewModel 暴露、报告摊位摘要，并将 `activeStall` 纳入 state hash。
- 2026-06-15: `node tests/run_all_tests.cjs` 通过，50/50。
- 2026-06-15: `node --test tests/ui_adapter.test.cjs` 通过，26/26。
- 2026-06-15: `git diff --check` 通过。
- 2026-06-15: `npm run check:all` 通过，包含 run_all_tests 50/50、unit 50/50、ui 26/26、full 9/9、ops 12/12、prediction 4/4、architecture、csv、day7、dom、ui-connected、jsdoc。
- 2026-06-15: `npm run test:coverage` 通过，111/111，all files line coverage 94.36%。
