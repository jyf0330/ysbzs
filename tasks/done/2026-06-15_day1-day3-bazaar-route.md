# 2026-06-15_day1-day3-bazaar-route

task_id: 2026-06-15_day1-day3-bazaar-route
status: DONE
type: core-flow-feature
created_at: 2026-06-15

## Goal

推进 `docs/BAZAAR_OUTER_LOOP_ACCEPTANCE.md` Phase B：把 Day1 大巴扎式路线样板扩到 Day1-Day3 可跑外层，确保每天至少 4 个外层决策点，自动脚本能连续跑完 Day1-Day3，并保留战斗走元素背包史核心。

## Acceptance Mapping

本任务推进本文哪一层验收：第一层外层 Run 骨架、第四层战斗接入、Phase B Day1-Day3 可玩外层。
外层状态字段：`state.day`, `state.phase`, `state.dayRoute.nodeIndex`, `state.dayRoute.history`, `state.dayRoute.currentEncounter`。
玩家入口：`RUN_DAY_ROUTE`, `GENERATE_NODE_OPTIONS`, `PICK_NODE`, `GENERATE_BATTLE_OPTIONS`, `PICK_BATTLE_ENCOUNTER`。
ViewModel / report 证据：`viewModel.dayRoute`、`renderPlayerReport` 节点文本。
自动测试：`node tests/run_all_tests.cjs`。
如果可见，浏览器截图：本任务不改 UI；如后续 UI 暴露 Day2-Day3，再走可见验收门禁。
未完成风险：本任务只推进 Day1-Day3 路线骨架，不完成 10 天、完整摊位系统或触发物体闭环。

## Related Files

- `data/csv/24_node_schedule.csv`
- `data/csv/25_node_pool.csv`
- `data/csv/26_encounter_pool.csv`
- `src/core/dayRoute.cjs`
- `src/scenarios/fullDay.cjs`
- `tests/run_all_tests.cjs`
- `tests/ui_adapter.test.cjs`
- `tests/full_coverage.test.cjs`
- `docs/10_CHANGELOG.md`
- `tasks/index.md`
- `tasks/doing/2026-06-15_day1-day3-bazaar-route.md`
- `tasks/done/2026-06-15_day1-day3-bazaar-route.md`

## Validation

- `node tests/run_all_tests.cjs`
- `git diff --check`

## Commit Plan

- `feat: 扩展大巴扎外层路线到前三天`

## Evidence Log

- 2026-06-15: 创建任务卡，占用 Day1-Day3 外层路线相关数据、核心、测试和文档文件。
- 2026-06-15: TDD 红灯确认：`node tests/run_all_tests.cjs` 失败于 `day 2 should have at least four outer decisions`。
- 2026-06-15: 新增 Day2/Day3 节点日程、节点池、遭遇池和 `runDayRangeScenario` 连续运行入口。
- 2026-06-15: 第二轮 TDD 红灯确认：连续路线每天固定选择最高权重节点，失败于 `day 1 should auto-pick at least two different node types`。
- 2026-06-15: `runDayRoute` 自动节点选择改为按 schedule step 轮换候选，避免自动脚本每步重复同一节点。
- 2026-06-15: `node tests/run_all_tests.cjs` 通过，47/47。
- 2026-06-15: Day1-Day3 路线复查：Day1=免费刷新/宠物奖励；Day2=召唤摊位/前排摊位；Day3=白银预备商人/白银奖励，三天均 `phase=day_end,nodeIndex=6`。
- 2026-06-15: `npm run check:all` 首轮在 `tests/ui_adapter.test.cjs` 的旧断言失败；原因是新自动路线会进入奖励节点，已将 UI07 断言更新为要求 `REWARD_OPTIONS` 与 `REWARD_PICK` 存在。
- 2026-06-15: `npm run check:all` 第二轮在 `tests/full_coverage.test.cjs` 的旧数据规模断言失败；已将 nodeSchedule/nodePool/encounterPool 数量更新为 Day1-Day3 的 18/18/12。
- 2026-06-15: `npm run test:ui` 通过，25/25。
- 2026-06-15: `npm run test:full` 通过，9/9。
- 2026-06-15: `npm run check:all` 完整通过。
- 2026-06-15: `npm run test:coverage` 通过，110/110，all files line coverage 94.66%。
- 2026-06-15: `git diff --check` 通过。
