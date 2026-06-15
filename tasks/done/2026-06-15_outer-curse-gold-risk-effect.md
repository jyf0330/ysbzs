# 外层贪婪诅咒风险事件

## task_id

2026-06-15_outer-curse-gold-risk-effect

## 目标

推进 `docs/BAZAAR_OUTER_LOOP_ACCEPTANCE.md` 第三、第四层：让 `evt_curse_gold` 从待接入风险事件变成可选择的外层节点，玩家立刻获得金币，但下一场路线战斗奖励金币按 90% 结算并留下结构化证据。

## 验收映射

- 第三层构筑成长：外层选择出现短期经济收益和后续压力，不只是等价奖励。
- 第四层战斗接入：外层事件影响下一场战斗结算的金币回写。

## 外层状态字段

- `state.outerRunEffects`
- `state.dayRoute.history[].runEffect`
- `state.dayRoute.battleOutcomes[].runEffects`

## 玩家入口

- `GENERATE_NODE_OPTIONS`
- `PICK_NODE`
- `RUN_BATTLE` / 路线战斗结算

## ViewModel / report 证据

- `viewModel.outerRunEffects`
- `NODE_EVENT_APPLY`
- `OUTER_RUN_EFFECT_QUEUE`
- `OUTER_RUN_EFFECT_CONSUME`
- `ROUTE_BATTLE_OUTCOME` 中的 `runEffects / goldBaseDelta / goldDelta`
- `renderPlayerReport(state)` 包含奖励折损记录

## related_files

- `data/csv/05_events.csv`
- `data/csv/25_node_pool.csv`
- `src/core/state.cjs`
- `src/core/dayRoute.cjs`
- `src/core/outerRunEffects.cjs`
- `src/core/stateHash.cjs`
- `src/uiAdapter.cjs`
- `src/render/textReport.cjs`
- `tests/run_all_tests.cjs`
- `tests/full_coverage.test.cjs`
- `docs/10_CHANGELOG.md`
- `tasks/index.md`
- `tasks/done/2026-06-15_outer-curse-gold-risk-effect.md`

## commit_plan

`feat: 接入外层贪婪诅咒风险`

## 验证计划

- `node tests/run_all_tests.cjs`
- `npm run check:all`
- `npm run test:coverage`
- `git diff --check`

## 可见验收

本任务不修改浏览器 DOM、CSS、棋盘显示、布局或可见预览；只增加核心状态、ViewModel 字段、文字报告和自动测试，不触发提交前截图门禁。

## 进度记录

- 2026-06-15: 创建任务卡，占用外层风险经济事件相关文件。
- 2026-06-15: 红灯验证完成，`node tests/run_all_tests.cjs` 失败于 Day6 路线未暴露 `evt_curse_gold`。
- 2026-06-15: `evt_curse_gold` 从待接入改为正式事件；Day6 路线新增 `node_d06_event_curse_gold` 贪婪诅咒节点。
- 2026-06-15: 新增 `state.outerRunEffects` 和 `outerRunEffects.cjs`，路线事件选择后立刻金币+4，并排队下一场战斗奖励金币 90% 结算效果。
- 2026-06-15: 路线战斗结算会消费 `reward_gold_multiplier`，记录 `goldBaseDelta / goldDelta / runEffects`，并写入 `OUTER_RUN_EFFECT_CONSUME` 和文字战报。
- 2026-06-15: `viewModel.outerRunEffects` 与 `stateHash` 已纳入外层 run effect，方便 UI、回放和调试读取。
- 2026-06-15: `node tests/run_all_tests.cjs` 通过，56/56。
- 2026-06-15: `node --test tests/full_coverage.test.cjs` 通过，9/9；`nodePool` 数量更新为 63。
- 2026-06-15: `npm run check:all` 通过；包含 unit 50/50、ui_adapter 27/27、full 9/9、ops 12/12、prediction 4/4、architecture/CSV/day7 browser/no-DOM/UI connected/jsdoc 全部通过，CSV 归一化数量包含 `nodeSchedule:60,nodePool:63,encounterPool:40`。
- 2026-06-15: `npm run test:coverage` 通过，112/112；全文件行覆盖率 93.06%。
- 2026-06-15: `git diff --check` 已在实现后通过；归档后会再跑一次。
- 2026-06-15: 可见验收门禁判定不触发：本任务未修改 DOM/CSS/棋盘显示/布局/可见预览。
