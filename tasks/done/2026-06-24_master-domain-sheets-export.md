# 2026-06-24_master-domain-sheets-export

task_id: 2026-06-24_master-domain-sheets-export
type: data-source
status: DONE
owner: Codex
branch: codex/bazaar-day1-day3-route

## Goal

让 `xlsx/ysbzs_master.xlsx` 按策划思维保持 6-10 张可见域表，并由导出脚本从这些域表生成全部 30 张程序 CSV；禁止隐藏完整 CSV sheet 作为来源。

## Scope

- 重建总表为少量可见策划域表，不保留隐藏同名 CSV sheet。
- 修改 `tools/build_human_master.py`，使总表重建规则可复现。
- 修改 `tools/export_master_to_csv.py`，从域表分区生成所有程序 CSV。
- 更新 CSV 测试，要求可见 sheet <= 10、无隐藏 sheet、无同名 CSV sheet。

## related_files

- `xlsx/ysbzs_master.xlsx`
- `tools/build_human_master.py`
- `tools/export_master_to_csv.py`
- `tests/csv_source.test.cjs`
- `docs/10_CHANGELOG.md`
- `tasks/index.md`
- `tasks/done/2026-06-24_master-domain-sheets-export.md`

## exclusive_files

- 无

## read_files

- `docs/00_AI_START_HERE.md`
- `docs/02_CURRENT_WORKFLOW.md`
- `tasks/README.md`
- `data/csv/*.csv`

## validation

- `npm run data:export -- --check`
- `npm run check:csv`
- `node tests/run_all_tests.cjs`

## commit_plan

commit_message: `data: generate csvs from planner domain sheets`

## collaboration

- lead_scope: Codex owns source-of-truth correction after user rejected hidden raw CSV sheets.
- specialist_input: 无
- tester_pass: 无，数据表/导出链路改动，不涉及 UI 可见验收。
- external_ai_input: 无
- lead_decision: Keep workbook small and planner-facing; use domain-section tables as the source for many generated CSV outputs.

## Evidence

- `python3 tools/build_human_master.py` 重建 `xlsx/ysbzs_master.xlsx`。
- `npm run data:export -- --check`：PASS，全部程序 CSV 可由总表无损导出。
- `npm run check:csv`：PASS，CSV tests 10/10 + CSV data validation。
- `node tests/run_all_tests.cjs`：64/64 tests passed。
- Workbook 结构检查：10 个可见 sheet（`README/PETS/WAVES/SHOP_ITEMS/MECHANISMS/TRIALS/ROUTE/ECONOMY_EVENTS/RULES/PROGRESSION_TRIALS`），0 个隐藏 sheet，0 个原始 CSV 同名 sheet。
