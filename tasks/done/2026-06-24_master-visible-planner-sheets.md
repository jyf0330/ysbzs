# 2026-06-24_master-visible-planner-sheets

task_id: 2026-06-24_master-visible-planner-sheets
type: data-source
status: ACTIVE_IMPL
owner: Codex
branch: codex/bazaar-day1-day3-route

## Goal

把 `xlsx/ysbzs_master.xlsx` 恢复成策划可编辑的 6-10 个可见表；程序用的完整 CSV 数据层保留为隐藏内部 sheet，由导出脚本继续生成全部 CSV。

## Scope

- 隐藏 `data/csv/*.csv` 对应的 30 张程序 CSV sheet。
- 保持 `README/PETS/WAVES/SHOP_ITEMS/MECHANISMS/TRIALS` 为可见策划编辑入口。
- 增加测试，确保总表可见 sheet 数量不超过 10，且隐藏 CSV sheet 仍能无损导出全部程序 CSV。

## related_files

- `xlsx/ysbzs_master.xlsx`
- `tests/csv_source.test.cjs`
- `docs/10_CHANGELOG.md`
- `tasks/index.md`
- `tasks/doing/2026-06-24_master-visible-planner-sheets.md`

## exclusive_files

- 无

## read_files

- `docs/00_AI_START_HERE.md`
- `docs/02_CURRENT_WORKFLOW.md`
- `tasks/README.md`
- `tools/export_master_to_csv.py`

## validation

- `npm run data:export -- --check`
- `npm run check:csv`
- `node tests/run_all_tests.cjs`

## commit_plan

commit_message: `data: keep master workbook planner-facing`

## collaboration

- lead_scope: Codex owns planner-facing workbook visibility fix.
- specialist_input: 无
- tester_pass: 无，数据表可见性和导出测试，不涉及 UI 可见验收。
- external_ai_input: 无
- lead_decision: 保留上次完整数据来源约束，但把程序 CSV sheet 隐藏，避免增加策划编辑负担。

## Evidence

- `xlsx/ysbzs_master.xlsx` visible sheets: `README`, `PETS`, `WAVES`, `SHOP_ITEMS`, `MECHANISMS`, `TRIALS`; 30 program CSV sheets are hidden.
- `npm run data:export -- --check` PASS: hidden CSV source sheets still export all generated CSV tables without drift.
- `npm run check:csv` PASS: 10 CSV tests passed; CSV08B now enforces hidden CSV sheets and <=10 visible planner sheets.
- artifact-tool visual pass rendered `README!A1:B6`; formula error scan found 0 matches.
- `node tests/run_all_tests.cjs` PASS: 64/64 tests passed.
