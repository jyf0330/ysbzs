# 2026-06-18_puzzle-solver-generator

## 状态

- task_id: `2026-06-18_puzzle-solver-generator`
- 类型: 核心工具 / 谜题精确求解器 / 生成器原型
- 目标: 做一个小型、可验证的宠物谜题求解器与候选生成器原型；数值结算必须走项目核心 reducer，不让 AI 手算。
- 状态: done

## related_files

- `src/core/puzzleSolver.cjs`
- `src/core/puzzleGenerator.cjs`
- `src/core/battle.cjs`
- `tests/unit/puzzle_solver.test.cjs`
- `tools/generate_puzzles.cjs`
- `tasks/index.md`
- `tasks/done/2026-06-18_puzzle-solver-generator.md`

## 开工前未归属改动

- `tasks/doing/2026-06-18_pure-singleplayer-runtime.md` 未跟踪，归属原单机运行时任务；本轮最终未接管该任务。
- `tests/unit/singleplayer_runtime.test.cjs` 已修改，归属原单机运行时任务。
- `tools/audit_singleplayer_architecture.cjs` 已修改，归属原单机运行时任务。
- `tools/check_ui_connected.cjs` 已修改，归属原单机运行时任务。
- `tools/record_browser_player_flow.cjs` 已修改，归属原单机运行时任务。
- `web/index.html` 已修改，归属原单机运行时任务。
- `web/js/runtime-client.js` 已修改，归属原单机运行时任务。
- `external_ai/prompts/2026-06-18_pure-singleplayer-runtime.md` 未跟踪，归属原单机运行时任务。
- `tools/build_local_engine_bundle.cjs` 未跟踪，归属原单机运行时任务。
- `tools/check_pure_singleplayer_browser.cjs` 未跟踪，归属原单机运行时任务。
- `web/js/local-engine.js` 未跟踪，归属原单机运行时任务。
- `docs/PAPER_BATTLE_UI_START_HERE.md` 未跟踪，非本任务产物。
- `tools/check_paper_battle_ui.cjs` 未跟踪，非本任务产物。
- `web/assets/reference_trace_base.jpeg` 未跟踪，非本任务产物。
- `web/paper-battle.css` 未跟踪，非本任务产物。
- `web/paper-battle.html` 未跟踪，非本任务产物。
- `web/paper-battle.js` 未跟踪，非本任务产物。
- `data/csv/.~lock.15_summon_trial_questions.csv#` 未跟踪，LibreOffice 锁文件，非本任务产物。

## 验证计划

- RED/GREEN: `node --test tests/unit/puzzle_solver.test.cjs`
- 项目级: `node tests/run_all_tests.cjs`

## 实现记录

- 2026-06-18: RED：`node --test tests/unit/puzzle_solver.test.cjs` 失败，缺少 `src/core/puzzleSolver.cjs`。
- 2026-06-18: 新增 `puzzleSolver.cjs`：BFS 精确搜索；动作通过 `battle.moveHero`、`battle.setActionDirection`、`battle.useActionSlot` 结算；胜利条件默认是敌方单位全灭。
- 2026-06-18: 新增 `puzzleGenerator.cjs`：候选状态必须通过求解器筛选，默认要求唯一解。
- 2026-06-18: 新增 `tools/generate_puzzles.cjs` 演示 CLI，输出 `puzzleId`、最短深度、解法数、状态 hash 和标准解。
- 2026-06-18: `src/core/battle.cjs` 导出已有 `targetCellsForSlot`，供求解器枚举真实行动范围，避免复制一套行动范围规则。

## 验证记录

- `node --test tests/unit/puzzle_solver.test.cjs`：通过，3/3 tests passed。
- `node tools/generate_puzzles.cjs 1`：通过，输出 1 个 `generated_exact_001`，最短深度 1，唯一解为 `hero_fire` 向右使用第 0 槽 AP3，最终 stateHash `5bf005a74725dc3b`。
- `node tests/run_all_tests.cjs`：通过，63/63 tests passed。

## 提交状态

- status: commit_blocked
- reason: 工作区仍有原 `2026-06-18_pure-singleplayer-runtime` ACTIVE 任务和相关脏文件；不满足自动提交条件。

## commit_plan

- message: `feat(core): add exact puzzle solver prototype`
- status: pending
