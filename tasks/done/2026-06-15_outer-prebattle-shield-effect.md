# 外层战前护盾效果进入战斗

## task_id

2026-06-15_outer-prebattle-shield-effect

## 目标

推进 `docs/BAZAAR_OUTER_LOOP_ACCEPTANCE.md` 第三、第四、第五层和 Phase E：让外层 `pre_battle` 事件能转化成下一场战斗的核心状态效果，至少实现 `evt_shield_bless` 给我方下一场战斗开局护盾。

## 验收映射

- 第三层构筑成长：外层节点选择产生短期收益，并进入可读核心状态。
- 第四层战斗接入：外层选择影响下一场元素背包史战斗，而不是只写日志。
- 第五层触发物体闭环：至少一个外层效果进入战斗内 modifier/effect，并写结构化日志。

## 外层状态字段

- `state.battlePrepEffects`
- `state.dayRoute.history[].prepEffect`

## 玩家入口

- `GENERATE_NODE_OPTIONS`
- `PICK_NODE`
- `GENERATE_BATTLE_OPTIONS`
- `PICK_BATTLE_ENCOUNTER`
- `RUN_BATTLE`

## ViewModel / report 证据

- `viewModel.battlePrepEffects`
- `BATTLE_PREP_EFFECT_APPLY` 事件
- `renderPlayerReport(state)` 中的战前效果记录

## related_files

- `data/csv/25_node_pool.csv`
- `src/core/state.cjs`
- `src/core/outerBattleEffects.cjs`
- `src/core/stateHash.cjs`
- `src/core/shop.cjs`
- `src/core/dayRoute.cjs`
- `src/core/battle.cjs`
- `src/uiAdapter.cjs`
- `src/render/textReport.cjs`
- `tests/run_all_tests.cjs`
- `tests/full_coverage.test.cjs`
- `docs/10_CHANGELOG.md`
- `tasks/index.md`
- `tasks/doing/2026-06-15_outer-prebattle-shield-effect.md`

## commit_plan

`feat: 接入外层战前护盾效果`

## 验证计划

- `node tests/run_all_tests.cjs`
- `npm run check:all`
- `npm run test:coverage`
- `git diff --check`

## 可见验收

本任务不修改浏览器 DOM、CSS、棋盘显示、可见预览、布局或文案渲染文件；只增加核心状态、ViewModel 字段、文字报告和自动测试，不触发提交前截图门禁。

## 进度记录

- 2026-06-15: 创建任务卡，占用外层战前效果相关文件。
- 2026-06-15: TDD 红灯确认：`node tests/run_all_tests.cjs` 因 Day4 路线缺少 `evt_shield_bless` 节点失败。
- 2026-06-15: 实现 `state.battlePrepEffects`、`outerBattleEffects.cjs`、Day4 战前护盾祝福节点、ViewModel 字段和文字战报事件。
- 2026-06-15: `node tests/run_all_tests.cjs` 通过 54/54。
- 2026-06-15: `node --test tests/full_coverage.test.cjs` 通过 9/9，`nodePool` 规模更新为 61。
- 2026-06-15: `npm run check:all` 通过；`check:csv` normalized counts 为 `nodeSchedule=60,nodePool=61,encounterPool=40`。
- 2026-06-15: `npm run test:coverage` 通过 112/112，整体行覆盖率 93.88%。
- 2026-06-15: `git diff --check` 通过。
