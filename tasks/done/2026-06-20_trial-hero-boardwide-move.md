# 2026-06-20_trial-hero-boardwide-move

task_id: 2026-06-20_trial-hero-boardwide-move
type: core-movement-preview-bugfix
status: DONE
owner: Codex
branch: shared-worktree

## Goal

先关闭第7天火核心试炼作为默认测试/验收基准；除非用户主动提起，不再用它做默认验证。同时修复通用试炼单位创建路径：我方试炼宠物应继承“我方宠物全棋盘移动 / 显式 board-covering moveRange”，不能因 AP=3 被距离拦截。

## Scope

- 给 `makeTrialUnit()` 的我方单位补齐默认 board-covering `moveRange`，保持不恢复 `moveMode: infinite` 特判。
- 用通用 RED/GREEN 单测覆盖试炼我方/敌方默认移动范围和显式 `moveRange` 优先级。
- 从默认测试链路移除 Day7 火核心试炼：`npm test`、`check:all`、`check:v1`、coverage、all-check runner 不再执行 Day7；`check:day7` 仅保留为显式入口。
- 刷新浏览器本地 bundle。
- 不改变敌方移动规则；显式设置了 `moveRange` / `moveAp` 的单位仍按显式字段执行。

## related_files

- tasks/done/2026-06-20_trial-hero-boardwide-move.md
- tasks/index.md
- docs/10_CHANGELOG.md
- package.json
- tools/run_all_checks.cjs
- src/core/unitFactory.cjs
- tests/unit/architecture_optimization.test.cjs
- tests/day7_fire_trial.test.cjs
- tests/ui_adapter.test.cjs
- tests/full_coverage.test.cjs
- tests/csv_source.test.cjs
- tests/run_all_tests.cjs
- web/js/local-engine.js

## exclusive_files

- tasks/index.md
- docs/10_CHANGELOG.md
- package.json
- tools/run_all_checks.cjs
- tests/unit/architecture_optimization.test.cjs
- tests/ui_adapter.test.cjs
- tests/full_coverage.test.cjs
- tests/csv_source.test.cjs
- tests/run_all_tests.cjs
- web/js/local-engine.js

## read_files

- /Users/ywh/Desktop/AI-Memory-Pack/20-projects.md
- docs/02_CURRENT_WORKFLOW.md
- docs/00_AI_START_HERE.md
- tasks/README.md
- /Users/ywh/.agents/skills/task-occupancy/SKILL.md
- /Users/ywh/.agents/skills/systematic-debugging/SKILL.md
- /Users/ywh/.agents/skills/test-driven-development/SKILL.md
- /Users/ywh/.codex/memories/MEMORY.md

## validation

- RED: `node --test tests/unit/architecture_optimization.test.cjs` failed before fix at `AO02B trial hero units get explicit board-covering movement by default` because trial hero `moveRange` was not board-covering.
- GREEN: `node --test tests/unit/architecture_optimization.test.cjs` passed, 5/5.
- Bundle: `node tools/build_local_engine_bundle.cjs` rebuilt `web/js/local-engine.js`.
- Default test chain: `npm test` passed: legacy 64/64, unit 78/78, UI 43/43, full 8/8, ops 12/12, prediction 4/4.
- Default full check: `npm run check:all` passed; command chain no longer includes `check:day7`.
- Coverage entry: `npm run test:coverage` passed, 154/154, without `tests/day7_fire_trial.test.cjs`.
- Format: `git diff --check` passed.
- Script scan: default scripts/tests scan only reports explicit `package.json` `check:day7`; no default path references Day7 fire trial.

## commit_plan

fix(core): give trial heroes boardwide movement

## collaboration

- lead_scope: Disable Day7 as default validation and fix generic trial hero movement source-of-truth.
- specialist_input: none.
- tester_pass: not run against Day7 by latest user instruction; default UI adapter and UI-connected checks passed without Day7.
- external_ai_input: none.
- lead_decision: Day7 may remain available behind explicit `npm run check:day7`, but must not be part of default tests unless user asks.

## notes

- Pre-existing untracked `.playwright-cli/page-*.yml` files are not owned by this task.
