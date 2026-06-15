# 外层 Day10 终局状态

## task_id

2026-06-15_outer-run-terminal-state

## 目标

推进 `docs/BAZAAR_OUTER_LOOP_ACCEPTANCE.md` 第一层 / Phase C：连续 Day1-Day10 自动 run 不只停在每天 `day_end`，还要在 Day10 终局战后写入可断言的 run 终局状态，证明路线已经到达最终 Boss 或明确失败。

## 验收映射

- 第一层：运行脚本或测试能从 Day1 自动推进到终局，并能断言最终胜利、失败或到达终局状态。
- Phase C：自动脚本能跑到 Day10 终局。

## 外层状态字段

- `state.dayRoute.terminal`
- `state.dayRouteRuns[].terminal`
- `RUN_TERMINAL`

## 玩家入口

- `runDayRangeScenario({fromDay:1,toDay:10})`
- `RUN_FIXED_BATTLE` / `runDayRoute`

## ViewModel / report 证据

- `ROUTE_BATTLE_OUTCOME`
- `DAY_ROUTE_END`
- `RUN_TERMINAL`
- `renderPlayerReport(state)` 包含终局记录

## related_files

- `src/core/dayRoute.cjs`
- `src/scenarios/fullDay.cjs`
- `src/render/textReport.cjs`
- `tests/run_all_tests.cjs`
- `docs/10_CHANGELOG.md`
- `tasks/index.md`
- `tasks/done/2026-06-15_outer-run-terminal-state.md`

## commit_plan

`feat: 接入外层终局状态`

## 验证计划

- `node tests/run_all_tests.cjs`
- `node --test tests/full_coverage.test.cjs`
- `npm run check:all`
- `npm run test:coverage`
- `git diff --check`

## 可见验收

本任务不修改浏览器 DOM、CSS、棋盘显示、布局或可见交互；只增加核心 run 终局状态和文字战报事件，不触发提交前截图门禁。

## 进度记录

- 2026-06-15: 创建任务卡，占用外层 Day10 终局状态相关文件。
- 2026-06-15: TDD 红灯：扩展 `Day1-Day10 route can run continuously and records daily route history`，要求 Day10 run 暴露 `terminal`、全局 `state.dayRoute.terminal`、`RUN_TERMINAL` 事件和文字战报“终局”；运行 `node tests/run_all_tests.cjs` 失败于缺少 Day10 terminal。
- 2026-06-15: 实现 Day10 Boss/终局固定战后写入 `state.dayRoute.terminal` 和 `RUN_TERMINAL`，并让 `runDayRangeScenario` 快照与 `renderPlayerReport` 输出该证据。
- 2026-06-15: `node tests/run_all_tests.cjs` 通过，61/61。
- 2026-06-15: `node --test tests/full_coverage.test.cjs` 通过，9/9。
- 2026-06-15: `npm run check:all` 通过：main 61/61、unit 50/50、ui 27/27、full 9/9、ops 12/12、prediction 4/4；architecture、CSV、Day7 browser、no DOM、UI connected、JSDoc 全部 PASS。
- 2026-06-15: `npm run test:coverage` 通过，112/112，all files line coverage 91.94%。
- 2026-06-15: `git diff --check` 通过。
- 2026-06-15: 本任务不触发可见截图门禁，原因：未修改 DOM/CSS/棋盘显示/布局/交互反馈，只增加核心 run 终局状态和文字战报事件。
