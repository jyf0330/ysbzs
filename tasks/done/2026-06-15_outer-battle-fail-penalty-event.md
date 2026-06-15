# 外层战斗失败惩罚事件

## task_id

2026-06-15_outer-battle-fail-penalty-event

## 目标

推进 `docs/BAZAAR_OUTER_LOOP_ACCEPTANCE.md` 第四层：让 `evt_battle_fail` 不只停留在战斗核心的失败扣罚，而是作为路线战后外层事件写入 outcome、历史和战报，证明战斗失败会推动 run 压力。

## 验收映射

- 第四层战斗接入：战斗结果能回写外层失败惩罚、经济压力和路线历史。
- Phase C / Phase F：连续 run 能解释胜负、奖励和失败压力，不只解释胜利奖励。

## 外层状态字段

- `state.castleLine`
- `state.economyMultiplier`
- `state.dayRoute.battleOutcomes[].postBattleEvents`
- `state.dayRoute.history[].outcome`

## 玩家入口

- `PICK_BATTLE`
- `RUN_FIXED_BATTLE`
- `autoExecuteTurn` / `RUN_BATTLE` 产生的战斗结果经路线记录

## ViewModel / report 证据

- `viewModel.castleLine`
- `viewModel.economyMultiplier`
- `ROUTE_POST_BATTLE_EVENT_APPLY`
- `ROUTE_BATTLE_OUTCOME`
- `renderPlayerReport(state)` 包含失败惩罚记录

## related_files

- `src/core/dayRoute.cjs`
- `src/render/textReport.cjs`
- `tests/run_all_tests.cjs`
- `docs/10_CHANGELOG.md`
- `tasks/index.md`
- `tasks/done/2026-06-15_outer-battle-fail-penalty-event.md`

## commit_plan

`feat: 接入外层失败惩罚事件`

## 验证计划

- `node tests/run_all_tests.cjs`
- `npm run check:all`
- `npm run test:coverage`
- `git diff --check`

## 可见验收

本任务不修改浏览器 DOM、CSS、棋盘显示、布局或可见预览；只增加路线 outcome / report / ViewModel 已有字段的核心证据，不触发提交前截图门禁。

## 进度记录

- 2026-06-15: 创建任务卡，占用外层战斗失败惩罚事件相关文件。
- 2026-06-15: TDD 红灯：新增 `route battle loss writes fail penalty post-battle event into run pressure` 后运行 `node tests/run_all_tests.cjs`，失败于 route outcome 缺少 `evt_battle_fail` postBattleEvent。
- 2026-06-15: 实现路线战后失败惩罚事件：`recordBattleOutcome` 在 `LOSE` 时读取正式 `evt_battle_fail`，记录防线/经济倍率前后值，写入 `ROUTE_POST_BATTLE_EVENT_APPLY`、`ROUTE_BATTLE_OUTCOME` 和 `dayRoute.history[].outcome`。
- 2026-06-15: `node tests/run_all_tests.cjs` 通过，59/59。
- 2026-06-15: `node --test tests/full_coverage.test.cjs` 通过，9/9。
- 2026-06-15: `npm run check:all` 通过：unit 50/50、ui 27/27、full 9/9、ops 12/12、prediction 4/4，架构/CSV/day7/no DOM/UI connected/JSDoc 均通过。
- 2026-06-15: `npm run test:coverage` 通过，112/112，all files line coverage 92.91%。
- 2026-06-15: `git diff --check` 通过；可见验收门禁不触发，因为本任务未改 DOM/CSS/可见棋盘渲染。
