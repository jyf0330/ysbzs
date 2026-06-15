# 外层升阶机会构筑事件

## task_id

2026-06-15_outer-upgrade-offer-event

## 目标

推进 `docs/BAZAAR_OUTER_LOOP_ACCEPTANCE.md` 第三层：让 `evt_upgrade_offer` 从待接入变成 Day4 可选升阶商人事件，玩家花费金币提升一个已拥有宠物等级，形成复制之外的构筑成长路线。

## 验收映射

- 第三层构筑成长：外层节点能影响构筑，提供升级/升阶宠物的长期成长方向。
- Phase D：商店/事件能改变构筑状态，而不是只改变刷新、折扣或奖励池。

## 外层状态字段

- `state.inventory`
- `state.dayRoute.history[].constructionEffect`

## 玩家入口

- `GENERATE_NODE_OPTIONS`
- `PICK_NODE`
- `APPLY_SHOP_EVENT`

## ViewModel / report 证据

- `viewModel.inventory`
- `NODE_EVENT_APPLY`
- `CONSTRUCTION_EVENT_APPLY`
- `renderPlayerReport(state)` 包含升阶机会记录

## related_files

- `data/csv/05_events.csv`
- `data/csv/25_node_pool.csv`
- `src/core/shop.cjs`
- `tests/run_all_tests.cjs`
- `tests/full_coverage.test.cjs`
- `docs/10_CHANGELOG.md`
- `tasks/index.md`
- `tasks/done/2026-06-15_outer-upgrade-offer-event.md`

## commit_plan

`feat: 接入外层升阶机会事件`

## 验证计划

- `node tests/run_all_tests.cjs`
- `node --test tests/full_coverage.test.cjs`
- `npm run check:all`
- `npm run test:coverage`
- `git diff --check`

## 可见验收

本任务不修改浏览器 DOM、CSS、棋盘显示、布局或可见预览；只增加核心构筑状态、ViewModel 已有 inventory 内容、文字报告和自动测试，不触发提交前截图门禁。

## 进度记录

- 2026-06-15: 创建任务卡，占用外层升阶机会构筑事件相关文件。
- 2026-06-15: TDD 红灯：新增 `route upgrade event raises an owned pet level through construction state` 后运行 `node tests/run_all_tests.cjs`，失败于 `evt_upgrade_offer` 仍为 `待接入`。
- 2026-06-15: 实现升阶构筑事件：`evt_upgrade_offer` 正式化并加入 Day4 growth 节点；路线选择和 `APPLY_SHOP_EVENT` 都通过 `applyConstructionEvent` 花费 6 金币，将已拥有宠物 Lv1→Lv2，并写入 `CONSTRUCTION_EVENT_APPLY`、`NODE_EVENT_APPLY.constructionEffect` 和 `dayRoute.history[].constructionEffect`。
- 2026-06-15: `node tests/run_all_tests.cjs` 通过，60/60。
- 2026-06-15: `node --test tests/full_coverage.test.cjs` 通过，9/9；CSV normalized `nodePool=65`。
- 2026-06-15: `npm run check:all` 通过：unit 50/50、ui 27/27、full 9/9、ops 12/12、prediction 4/4，架构/CSV/day7/no DOM/UI connected/JSDoc 均通过。
- 2026-06-15: `npm run test:coverage` 通过，112/112，all files line coverage 92.74%。
- 2026-06-15: `git diff --check` 通过；可见验收门禁不触发，因为本任务未改 DOM/CSS/可见棋盘渲染。
