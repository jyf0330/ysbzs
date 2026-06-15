# 外层五回合高奖事件

## task_id

2026-06-15_outer-fast-clear-reward-event

## 目标

推进 `docs/BAZAAR_OUTER_LOOP_ACCEPTANCE.md` 第四层：让 `evt_battle_bonus` 不只是数据表中的正式事件，而是在路线战斗 `WIN_FAST` 时作为战后外层事件写入 outcome、历史和战报，证明快速清场会提升后续奖励池。

## 验收映射

- 第四层战斗接入：战斗结果能回写外层奖励资格和奖励池变化。
- Phase C / Phase F：连续 run 能解释胜利质量、奖励和下一步成长，不只记录胜负。

## 外层状态字段

- `state.dayRoute.battleOutcomes[].rewardPoolId`
- `state.dayRoute.battleOutcomes[].postBattleEvents`
- `state.dayRoute.pendingRewards[]`
- `state.dayRoute.history[].outcome`

## 玩家入口

- `PICK_BATTLE`
- `RUN_FIXED_BATTLE`
- `RUN_BATTLE` 产生的战斗结果经路线记录

## ViewModel / report 证据

- `viewModel.dayRoute.battleOutcomes`
- `viewModel.dayRoute.pendingRewards`
- `ROUTE_POST_BATTLE_EVENT_APPLY`
- `ROUTE_BATTLE_OUTCOME`
- `renderPlayerReport(state)` 包含五回合高奖记录

## related_files

- `src/core/dayRoute.cjs`
- `tests/run_all_tests.cjs`
- `docs/10_CHANGELOG.md`
- `tasks/index.md`
- `tasks/done/2026-06-15_outer-fast-clear-reward-event.md`

## commit_plan

`feat: 接入外层五回合高奖事件`

## 验证计划

- `node tests/run_all_tests.cjs`
- `node --test tests/full_coverage.test.cjs`
- `npm run check:all`
- `npm run test:coverage`
- `git diff --check`

## 可见验收

本任务不修改浏览器 DOM、CSS、棋盘显示、布局或可见预览；只增加路线 outcome / report / ViewModel 已有字段的核心证据，不触发提交前截图门禁。

## 进度记录

- 2026-06-15: 创建任务卡，占用外层五回合高奖事件相关文件。
- 2026-06-15: TDD 红灯：新增 `route fast clear win writes high reward post-battle event into pending reward` 后运行 `node tests/run_all_tests.cjs`，失败于 outcome 缺少 `evt_battle_bonus` postBattleEvent。
- 2026-06-15: 实现 `WIN_FAST` 战后事件：`recordBattleOutcome` 读取正式 `evt_battle_bonus`，保留 `reward_fast_clear` 奖励池，写入 `ROUTE_POST_BATTLE_EVENT_APPLY`、`ROUTE_BATTLE_OUTCOME` 和 `dayRoute.history[].outcome`。
- 2026-06-15: `node tests/run_all_tests.cjs` 通过，61/61。
- 2026-06-15: `node --test tests/full_coverage.test.cjs` 通过，9/9。
- 2026-06-15: `npm run check:all` 通过：main 61/61、unit 50/50、ui 27/27、full 9/9、ops 12/12、prediction 4/4；architecture、CSV、Day7 browser、no DOM、UI connected、JSDoc 全部 PASS。
- 2026-06-15: `npm run test:coverage` 通过，112/112，all files line coverage 92.57%。
- 2026-06-15: 本任务不触发可见截图门禁，原因：没有修改 DOM/CSS/棋盘显示/布局/交互反馈，只扩展核心路线事件、ViewModel 既有字段和文本战报。
