# 2026-06-24_master-all-csv-source

task_id: 2026-06-24_master-all-csv-source
type: data-source
status: DONE
owner: Codex
branch: codex/bazaar-day1-day3-route

## Goal

把运行时读取的所有 CSV 数据纳入 `xlsx/ysbzs_master.xlsx`，并让导出/检查链路证明所有运行数据都由总表传出。

## Scope

- 审计 `src/core/csvData.cjs` 读取的运行 CSV 清单。
- 在总表中补齐完整 CSV sheet。
- 修改 `tools/export_master_to_csv.py`，让总表中的完整 CSV sheet 覆盖导出所有运行 CSV。
- 增加测试，阻止运行 CSV 绕过总表/导出脚本。

## related_files

- `xlsx/ysbzs_master.xlsx`
- `tools/export_master_to_csv.py`
- `tests/csv_source.test.cjs`
- `docs/10_CHANGELOG.md`
- `tasks/index.md`
- `tasks/doing/2026-06-24_master-all-csv-source.md`

## exclusive_files

- 无

## read_files

- `docs/00_AI_START_HERE.md`
- `docs/02_CURRENT_WORKFLOW.md`
- `tasks/README.md`
- `data/csv/*.csv`
- `src/core/csvData.cjs`

## validation

- `npm run data:export -- --check`
- `npm run check:csv`

## commit_plan

commit_message: `data: make master workbook own runtime csv sources`

## collaboration

- lead_scope: Codex owns total workbook source correction and CSV export coverage.
- specialist_input: 无
- tester_pass: 无，数据/导出链路改动，不涉及 UI 可见验收。
- external_ai_input: 无
- lead_decision: 以当前运行 CSV 为基线补入总表完整 sheet，再让导出脚本从这些完整 sheet 生成运行 CSV。

## Evidence

- `xlsx/ysbzs_master.xlsx` contains the original 6 maintenance sheets plus 30 complete `data/csv/*.csv` sheets using the CSV filename stem as sheet name.
- Spreadsheet visual sanity pass rendered `README!A1:B6` before edit and `07_relic_blessings!A1:P12` after edit through artifact-tool; formula error scan found 0 matches.
- `npm run data:export -- --check` PASS: master export matches generated CSV tables.
- `npm run check:csv` PASS: 10 node:test CSV tests passed and `tools/check_csv_data.cjs` reported PASS CSV data validation.
- `node tests/run_all_tests.cjs` PASS: 64/64 tests passed.
