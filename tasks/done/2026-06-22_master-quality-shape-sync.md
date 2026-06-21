# 2026-06-22_master-quality-shape-sync

task_id: 2026-06-22_master-quality-shape-sync
type: planner-data-sync
status: DONE
owner: Codex
branch: codex/bazaar-day1-day3-route

## Goal

根据当前代码里已经实现的品质成长和 19 个战斗形状，把策划总表更新为后续准绳，并重新导出程序 CSV 与策划好读版 workbook。

## Scope

- 将 `xlsx/ysbzs_master.xlsx` 的宠物形状口径从旧 `A1/B1` 同步为当前代码使用的 `01-19` 形状。
- 在策划总表中补齐当前代码里的品质成长、品质升级/质变和 19 形状目录数据。
- 让导出链路能从总表生成对应 CSV，并刷新 `xlsx/ysbzs_v1_linked_data_tables.xlsx`。
- 更新仍按旧形状口径断言的测试，验证当前实现和新总表一致。
- 不改浏览器 UI 和战斗规则实现。

## related_files

- `tasks/doing/2026-06-22_master-quality-shape-sync.md`
- `tasks/index.md`
- `docs/10_CHANGELOG.md`
- `xlsx/ysbzs_master.xlsx`
- `xlsx/ysbzs_v1_linked_data_tables.xlsx`
- `data/csv/01_pets.csv`
- `data/csv/08_action_shapes.csv`
- `data/csv/27_shape_catalog.csv`
- `data/csv/28_quality_growth.csv`
- `data/csv/29_quality_upgrades.csv`
- `tools/export_master_to_csv.py`
- `tools/build_readable_workbook.py`
- `tests/run_all_tests.cjs`
- `tests/csv_source.test.cjs`
- `tests/full_coverage.test.cjs`
- `tests/ui_adapter.test.cjs`
- `tests/unit/core_focused_battle.test.cjs`
- `tests/unit/puzzle_solver.test.cjs`
- `src/core/battle/actions.cjs`

## exclusive_files

- `tasks/index.md`
- `docs/10_CHANGELOG.md`
- `xlsx/ysbzs_master.xlsx`
- `xlsx/ysbzs_v1_linked_data_tables.xlsx`
- `tools/export_master_to_csv.py`
- `tools/build_readable_workbook.py`
- `tests/run_all_tests.cjs`
- `tests/csv_source.test.cjs`
- `tests/full_coverage.test.cjs`
- `tests/ui_adapter.test.cjs`
- `tests/unit/core_focused_battle.test.cjs`
- `tests/unit/puzzle_solver.test.cjs`
- `src/core/battle/actions.cjs`

## read_files

- `AGENTS.md`
- `docs/02_CURRENT_WORKFLOW.md`
- `docs/00_AI_START_HERE.md`
- `docs/roles/PLANNER_START.md`
- `tasks/README.md`
- `/Users/ywh/Desktop/AI-Memory-Pack/20-projects.md`
- `src/core/qualityProgression.cjs`
- `src/core/battle/shapeCatalog.cjs`
- `src/core/battle/qualityEffects.cjs`
- `src/core/unitFactory.cjs`
- `src/core/battle/actions.cjs`

## validation

- `npm run data:export`
- `npm run data:workbook`
- `npm run data:export:check`
- `npm run check:csv`
- `node --test tests/unit/quality_progression.test.cjs tests/unit/quality_tiers_factory.test.cjs tests/unit/shape_catalog.test.cjs tests/unit/quality_effects.test.cjs`
- `npm run check:all`
- `npm run test:coverage`

## commit_plan

message: `data: sync master workbook with quality and shape rules`

## collaboration

lead_scope: 同步策划总表、CSV 导出链路和旧形状测试断言。
specialist_input: 无
tester_pass: 不适用，本任务不改 UI / 棋盘可见交互。
external_ai_input: 无
lead_decision: 以当前核心代码为源，先把实现口径回灌到总表，再让导出链路生成程序数据和好读版 workbook。

## evidence

- `npm run data:export`：通过，刷新程序 CSV。
- `npm run data:workbook`：通过，刷新策划好读版 workbook。
- `npm run data:export:check`：通过，`PASS master export matches generated CSV tables`。
- `npm run check:csv`：通过，CSV tests 9/9，数据校验通过。
- `node --test tests/unit/quality_progression.test.cjs tests/unit/quality_tiers_factory.test.cjs tests/unit/shape_catalog.test.cjs tests/unit/quality_effects.test.cjs`：通过，19/19。
- `npm run check:all`：通过，包含 `npm test`、架构、CSV、DOM、UI connected、JSDoc。
- `npm run test:coverage`：通过，175/175，all files line coverage 88.85%。
- 可见验收门禁：不适用，本任务只同步总表、CSV、导出脚本和测试口径，不修改浏览器 UI / 棋盘可见交互。
