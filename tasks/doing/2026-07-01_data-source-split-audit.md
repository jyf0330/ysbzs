# 2026-07-01_data-source-split-audit

task_id: 2026-07-01_data-source-split-audit
type: data-source-audit
status: READY_TO_MERGE
owner: Codex
branch: codex/bazaar-day1-day3-route

## Goal

把未接入核心运行链的数据/配置先集中到专门目录，并开始按已接入运行 CSV 逐表核对字段和值。

## Scope

- 新建 `data/unconnected/` 存放当前不进入核心 runtime 数据链的旧配置和外部工具规格。
- 不修改当前已接入 runtime CSV 的内容；第一轮只读核对 `data/csv/01_pets.csv`。
- 暂不移动 `data/csv/27_shape_catalog.csv`、`data/csv/28_quality_growth.csv`、`data/csv/29_quality_upgrades.csv`，因为当前 exporter/readable workbook 流程仍引用它们，且相关 exporter 文件被 `2026-06-30_pets-redesign-v3-data-source` 占用。
- 不更新 `tasks/index.md`，因为当前被 replay 任务独占。

## related_files

- `tasks/doing/2026-07-01_data-source-split-audit.md`
- `data/unconnected/README.md`
- `data/unconnected/config/ysbzs_v1_linked_rules.yaml`
- `data/unconnected/web-external-data/`

## exclusive_files

- 无

## read_files

- `AGENTS.md`
- `docs/02_CURRENT_WORKFLOW.md`
- `docs/00_AI_START_HERE.md`
- `docs/roles/PLANNER_START.md`
- `tasks/index.md`
- `tasks/README.md`
- `src/core/csvData.cjs`
- `data/csv/01_pets.csv`
- `data/csv/27_shape_catalog.csv`
- `data/csv/28_quality_growth.csv`
- `data/csv/29_quality_upgrades.csv`
- `yaml/wave_rules_20260609.yaml`

## validation

- pass: moved `yaml/ysbzs_v1_linked_rules.yaml` to `data/unconnected/config/ysbzs_v1_linked_rules.yaml`.
- pass: moved `web/external-data/` to `data/unconnected/web-external-data/external-data/`.
- pass: added `data/unconnected/README.md` documenting moved files and deferred `27/28/29` CSV candidates.
- pass: read-only audit of `data/csv/01_pets.csv`: 127 rows, 22 fields, unique `宠物ID/编号/名称`, qualities `青铜/白银/黄金`, elements `风/火/水/土`, sizes `一格/两格/三格`.
- pass: `node tools/check_csv_data.cjs`.
- pass: `git diff --check -- data/unconnected/README.md tasks/doing/2026-07-01_data-source-split-audit.md data/unconnected/config/ysbzs_v1_linked_rules.yaml data/unconnected/web-external-data/external-data`.
- note: `data/csv/01_pets.csv` is dirty from `2026-06-30_pets-redesign-v3-data-source`; this task did not modify it.
- note: `tasks/index.md` not updated because it is currently recorded as occupied by `2026-06-28_replay-command-stream`.

## commit_plan

- message: `data: separate unconnected data sources`
- auto_commit: no; worktree has multiple active dirty task groups and `tasks/index.md` is occupied.

## collaboration

- lead_scope: Data-source split and read-only first table audit.
- specialist_input: 无
- tester_pass: 无，非 UI/浏览器改动。
- external_ai_input: 无
- lead_decision: Move only files not used by the current core runtime path; leave exporter-linked CSV candidates in place until the data pipeline ownership is cleared.
