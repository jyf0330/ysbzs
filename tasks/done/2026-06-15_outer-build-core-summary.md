# 外层构筑核心摘要

## task_id

2026-06-15_outer-build-core-summary

## 目标

推进 `docs/BAZAAR_OUTER_LOOP_ACCEPTANCE.md` 第三层和第六层：让外层 run 不只显示背包列表，还能从核心状态派生当前构筑核心，例如火系、召唤、等级和遗物方向，并进入 ViewModel 与文字战报。

## 验收映射

- 第三层构筑成长：玩家一局内围绕至少两个流派或元素形成选择时，系统能读出构筑方向。
- 第六层玩家理解：第一屏 / ViewModel 能读取金币、构筑核心和下一步选择所需状态。

## 外层状态字段

- `state.inventory`
- `state.relics`
- `state.shop.refreshState.targetedRestocks`

## 玩家入口

- `ENTER_SHOP`
- `BUY_OFFER`
- `REWARD_OPTIONS`
- `PICK_REWARD`

## ViewModel / report 证据

- `viewModel.buildCore`
- `renderPlayerReport(state)` 包含构筑核心摘要

## related_files

- `src/core/buildSummary.cjs`
- `src/uiAdapter.cjs`
- `src/render/textReport.cjs`
- `tests/run_all_tests.cjs`
- `docs/10_CHANGELOG.md`
- `tasks/index.md`
- `tasks/done/2026-06-15_outer-build-core-summary.md`

## commit_plan

`feat: 接入外层构筑核心摘要`

## 验证计划

- `node tests/run_all_tests.cjs`
- `node --test tests/full_coverage.test.cjs`
- `npm run check:all`
- `npm run test:coverage`
- `git diff --check`

## 可见验收

本任务不修改浏览器 DOM、CSS、棋盘显示、布局、可见预览或交互反馈；只增加核心派生摘要、ViewModel 字段、文字战报和自动测试，不触发提交前截图门禁。

## 进度记录

- 2026-06-15: 创建任务卡，占用外层构筑核心摘要相关文件。
- 2026-06-15: TDD 红灯：新增 `construction summary exposes build core tags in ViewModel and text report` 后运行 `node tests/run_all_tests.cjs`，失败于 `ViewModel should expose buildCore`。
- 2026-06-15: 实现 `buildConstructionSummary(state)`，从背包、遗物和定向补货状态派生元素、流派、等级、核心标签和摘要文本，并接入 `viewModel.buildCore` 与 `renderPlayerReport(state)`。
- 2026-06-15: `node tests/run_all_tests.cjs` 通过，62/62。
- 2026-06-15: `node --test tests/full_coverage.test.cjs` 初次发现 debug snapshot 的 `state.indexes` 不是 Map，修复 `buildSummary` 对快照索引的兼容后通过，9/9。
- 2026-06-15: `npm run check:all` 通过：main 62/62、unit 50/50、ui 27/27、full 9/9、ops 12/12、prediction 4/4；architecture、CSV、Day7 browser、no DOM、UI connected、JSDoc 全部 PASS。
- 2026-06-15: `npm run test:coverage` 通过，112/112，all files line coverage 91.95%。
- 2026-06-15: `git diff --check` 通过。
- 2026-06-15: 本任务不触发可见截图门禁，原因：未修改 DOM/CSS/棋盘显示/布局/交互反馈，只增加核心派生摘要、ViewModel 字段和文字战报。
