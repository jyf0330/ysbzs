# 外层陷阱增伤 modifier 证据

## task_id

2026-06-15_outer-trap-modifier-evidence

## 目标

推进 `docs/BAZAAR_OUTER_LOOP_ACCEPTANCE.md` 第五层：让已接入的 `evt_trap_bonus` 不只通过专用字段加伤害，而是进入统一 `modifierEngine` 计算路径，并在火陷阱触发时写入可断言的 modifier / changeLog / 战报证据。

## 验收映射

- 第五层物体触发系统：至少一个外层奖励或摊位效果能转化成战斗内 modifier / trigger / object。
- Phase E：结构化日志能解释外层奖励影响战斗触发链。

## 外层状态字段

- `state.battlePrepEffects[]`
- `state.changes[]`
- `state.battleTrace[]`
- `FIRE_TRAP_TRIGGER.effects[].modifierApplied`

## 玩家入口

- `GENERATE_NODE_OPTIONS`
- `PICK_NODE`
- `RUN_FIXED_BATTLE` / 真实战斗移动触发火陷阱

## ViewModel / report 证据

- `viewModel.battlePrepEffects`
- `FIRE_TRAP_TRIGGER`
- `BATTLE_PREP_EFFECT_APPLY`
- `renderPlayerReport(state)` 包含陷阱增伤记录

## related_files

- `src/core/outerBattleEffects.cjs`
- `tests/run_all_tests.cjs`
- `docs/10_CHANGELOG.md`
- `tasks/index.md`
- `tasks/done/2026-06-15_outer-trap-modifier-evidence.md`

## commit_plan

`feat: 接入外层陷阱 modifier 证据`

## 验证计划

- `node tests/run_all_tests.cjs`
- `node --test tests/full_coverage.test.cjs`
- `npm run check:all`
- `npm run test:coverage`
- `git diff --check`

## 可见验收

本任务不修改浏览器 DOM、CSS、棋盘显示、布局或可见交互；只增加核心战斗 modifier 证据和结构化日志，不触发提交前截图门禁。

## 进度记录

- 2026-06-15: 创建任务卡，占用外层陷阱 modifier 证据相关文件。
- 2026-06-15: TDD 红灯：扩展 `route trap bonus event arms next battle fire trap modifier and consumes on trigger`，要求 `FIRE_TRAP_TRIGGER.effects[].modifierApplied` 和 `APPLY_OUTER_BATTLE_MODIFIER` changeLog；运行 `node tests/run_all_tests.cjs` 失败于缺少 `modifierApplied` 数组。
- 2026-06-15: 实现 `applyTrapDamageBonus` 通过 `modifierEngine.computeModifiedValue` 计算火陷阱伤害，并为每个外层陷阱 modifier 写入 `APPLY_OUTER_BATTLE_MODIFIER`。
- 2026-06-15: `node tests/run_all_tests.cjs` 通过，61/61。
- 2026-06-15: `node --test tests/full_coverage.test.cjs` 通过，9/9。
- 2026-06-15: `npm run check:all` 通过：main 61/61、unit 50/50、ui 27/27、full 9/9、ops 12/12、prediction 4/4；architecture、CSV、Day7 browser、no DOM、UI connected、JSDoc 全部 PASS。
- 2026-06-15: `npm run test:coverage` 通过，112/112，all files line coverage 92.13%。
- 2026-06-15: `git diff --check` 通过。
- 2026-06-15: 本任务不触发可见截图门禁，原因：未修改 DOM/CSS/棋盘显示/布局/交互反馈，只增加核心 modifier 计算和结构化战斗日志证据。
