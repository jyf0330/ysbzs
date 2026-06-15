# Day1-Day10 大巴扎外层路线骨架

## task_id

2026-06-15_day1-day10-route-skeleton

## 目标

推进 `docs/BAZAAR_OUTER_LOOP_ACCEPTANCE.md` Phase C：补齐 Day4-Day10 数据化日程、节点池、遭遇池，使自动脚本能从 Day1 连续跑到 Day10，并断言每日路线、遭遇和固定战结构。

## 验收映射

- 第一层：外层 Run 骨架能连续跑到 Day10。
- 第二层：Day4+ 开始出现更高阶商店/奖励资源。
- 第三层：Day6+ 开始出现更高压力遭遇或 Boss 标签。
- 第四层：战斗仍通过既有元素背包史核心执行，只由路线数据选择遭遇。

## related_files

- `data/csv/24_node_schedule.csv`
- `data/csv/25_node_pool.csv`
- `data/csv/26_encounter_pool.csv`
- `tests/run_all_tests.cjs`
- `tests/full_coverage.test.cjs`
- `docs/10_CHANGELOG.md`
- `tasks/index.md`
- `tasks/doing/2026-06-15_day1-day10-route-skeleton.md`

## commit_plan

`feat: 扩展外层路线到 Day10`

## 验证计划

- `node tests/run_all_tests.cjs`
- `npm run check:all`
- `npm run test:coverage`
- `git diff --check`

## 可见验收

本任务只修改 CSV 数据、核心自动脚本测试和文档，不修改 UI、棋盘、可见预览、交互反馈或布局；不触发提交前截图门禁。

## 进度记录

- 2026-06-15: 创建任务卡，占用 Day1-Day10 外层路线骨架相关文件。
- 2026-06-15: 先写红灯测试，确认 Day4 缺少外层路线决策。
- 2026-06-15: 补齐 Day4-Day10 节点日程、节点池、遭遇池；`node tests/run_all_tests.cjs` 通过 53/53。
- 2026-06-15: `npm run check:all` 通过；CSV normalized counts 为 `nodeSchedule=60,nodePool=60,encounterPool=40`。
- 2026-06-15: `npm run test:coverage` 通过 112/112，整体行覆盖率 94.40%。
- 2026-06-15: `git diff --check` 通过。
