# 外层同名复制构筑事件

## task_id

2026-06-15_outer-duplicate-pet-event

## 目标

推进 `docs/BAZAAR_OUTER_LOOP_ACCEPTANCE.md` 第三层和 Phase D：让 `evt_duplicate` 从待接入变成 Day3 可选复制商人事件，玩家花费金币复制一个已拥有宠物，进入背包/合成成长并留下结构化证据。

## 验收映射

- 第三层构筑成长：外层节点能影响构筑，提供复制已有宠物的长期成长方向。
- Phase D：商店/事件能改变构筑状态，而不是只改变刷新和折扣。

## 外层状态字段

- `state.inventory`
- `state.dayRoute.history[].constructionEffect`

## 玩家入口

- `GENERATE_NODE_OPTIONS`
- `PICK_NODE`

## ViewModel / report 证据

- `viewModel.inventory`
- `NODE_EVENT_APPLY`
- `CONSTRUCTION_EVENT_APPLY`
- `renderPlayerReport(state)` 包含同名复制记录

## related_files

- `data/csv/05_events.csv`
- `data/csv/25_node_pool.csv`
- `src/core/shop.cjs`
- `src/core/dayRoute.cjs`
- `src/render/textReport.cjs`
- `tests/run_all_tests.cjs`
- `tests/full_coverage.test.cjs`
- `docs/10_CHANGELOG.md`
- `tasks/index.md`
- `tasks/done/2026-06-15_outer-duplicate-pet-event.md`

## commit_plan

`feat: 接入外层同名复制事件`

## 验证计划

- `node tests/run_all_tests.cjs`
- `npm run check:all`
- `npm run test:coverage`
- `git diff --check`

## 可见验收

本任务不修改浏览器 DOM、CSS、棋盘显示、布局或可见预览；只增加核心构筑状态、ViewModel 已有 inventory 内容、文字报告和自动测试，不触发提交前截图门禁。

## 进度记录

- 2026-06-15: 创建任务卡，占用外层同名复制构筑事件相关文件。
- 2026-06-15: TDD 红灯：新增 `route duplicate event copies an owned pet into construction state` 后运行 `node tests/run_all_tests.cjs`，失败于 `evt_duplicate` 仍为 `待接入`。
- 2026-06-15: 实现 `applyConstructionEvent`，`evt_duplicate` 正式化并加入 Day3 growth 节点；路线选择后花费 4 金币，复制已拥有宠物到 inactive bench，写入 `CONSTRUCTION_EVENT_APPLY`、`NODE_EVENT_APPLY.constructionEffect` 和 `dayRoute.history[].constructionEffect`。
- 2026-06-15: 修正 ViewModel 断言为现有 `inventory.bench` 结构；`node tests/run_all_tests.cjs` 通过，58/58。
- 2026-06-15: `node --test tests/full_coverage.test.cjs` 通过，9/9；CSV normalized `nodePool=64`。
- 2026-06-15: `npm run check:all` 通过：unit 50/50、ui 27/27、full 9/9、ops 12/12、prediction 4/4，架构/CSV/day7/no DOM/UI connected/JSDoc 均通过。
- 2026-06-15: `npm run test:coverage` 通过，112/112，all files line coverage 92.73%。
- 2026-06-15: `git diff --check` 通过；可见验收门禁不触发，因为本任务未改 DOM/CSS/可见棋盘渲染。
