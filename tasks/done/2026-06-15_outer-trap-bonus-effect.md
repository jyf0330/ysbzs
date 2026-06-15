# 外层陷阱增伤效果进入战斗

## task_id

2026-06-15_outer-trap-bonus-effect

## 目标

推进 `docs/BAZAAR_OUTER_LOOP_ACCEPTANCE.md` 第三、第四、第五层和 Phase E：让外层 `evt_trap_bonus` 从待接入数据变成下一场战斗可消耗的陷阱增伤效果，火陷阱触发时实际提高伤害并留下结构化证据。

## 验收映射

- 第三层构筑成长：陷阱流节点成为可选择的构筑方向。
- 第四层战斗接入：外层选择影响下一场元素背包史战斗伤害。
- 第五层触发物体闭环：外层效果转成战斗内 modifier/effect，火陷阱触发时写结构化日志和战报。

## 外层状态字段

- `state.battlePrepEffects`
- `state.dayRoute.history[].prepEffect`

## 玩家入口

- `GENERATE_NODE_OPTIONS`
- `PICK_NODE`
- `RUN_BATTLE`
- 火陷阱触发走战斗核心的 `triggerTerrainOnEnter`

## ViewModel / report 证据

- `viewModel.battlePrepEffects`
- `BATTLE_PREP_EFFECT_QUEUE`
- `BATTLE_PREP_EFFECT_APPLY`
- `FIRE_TRAP_TRIGGER` 中的 `baseDamage / bonusDamage / damage`
- `renderPlayerReport(state)` 包含陷阱增伤记录

## related_files

- `data/csv/05_events.csv`
- `data/csv/25_node_pool.csv`
- `src/core/outerBattleEffects.cjs`
- `src/core/battle.cjs`
- `src/core/battle/resolution.cjs`
- `src/core/stateHash.cjs`
- `src/render/textReport.cjs`
- `tests/run_all_tests.cjs`
- `tests/full_coverage.test.cjs`
- `docs/10_CHANGELOG.md`
- `tasks/index.md`
- `tasks/done/2026-06-15_outer-trap-bonus-effect.md`

## commit_plan

`feat: 接入外层陷阱增伤效果`

## 验证计划

- `node tests/run_all_tests.cjs`
- `npm run check:all`
- `npm run test:coverage`
- `git diff --check`

## 可见验收

本任务不修改浏览器 DOM、CSS、棋盘显示、可见预览、布局或文案渲染文件；只增加核心状态、ViewModel 已有字段内容、文字报告和自动测试，不触发提交前截图门禁。

## 进度记录

- 2026-06-15: 创建任务卡，占用外层陷阱增伤效果相关文件。
- 2026-06-15: 红灯验证完成，`node tests/run_all_tests.cjs` 失败于 Day5 路线未暴露 `evt_trap_bonus`。
- 2026-06-15: `evt_trap_bonus` 从待接入改为正式事件；Day5 路线新增 `node_d05_event_trap` 陷阱商人节点。
- 2026-06-15: 接入 `trap_damage_bonus` 战前效果，`START_BATTLE` 激活效果，火陷阱触发时消耗效果并写入 `baseDamage / bonusDamage / damage / eventId`。
- 2026-06-15: `renderPlayerReport(state)` 已纳入 `FIRE_TRAP_TRIGGER`，战报可显示陷阱增伤证据。
- 2026-06-15: `node tests/run_all_tests.cjs` 通过，55/55。
- 2026-06-15: `node --test tests/full_coverage.test.cjs` 通过，9/9；`nodePool` 数量更新为 62。
- 2026-06-15: `npm run check:all` 通过；CSV 归一化数量包含 `nodeSchedule:60,nodePool:62,encounterPool:40`。
- 2026-06-15: `npm run test:coverage` 通过，112/112；全文件行覆盖率 93.47%。
- 2026-06-15: 可见验收门禁判定不触发：本任务未修改 DOM/CSS/棋盘显示/布局/可见预览。
