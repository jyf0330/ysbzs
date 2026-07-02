# 2026-07-02_settings-unification-cleanup

task_id: 2026-07-02_settings-unification-cleanup
type: docs-cleanup
status: READY_TO_MERGE
owner: Codex
branch: shared-worktree

Goal:
统一当前设定口径，删除仍在传播旧 30 宠 / 旧 Day7 表口径的无引用生成说明。

Scope:
- 确认当前真口径：127 宠、134 行波次随机池、7 张人类策划入口 workbook、CSV 程序数据源、runtime JSON/SQLite 作为审计产物。
- 删除 `docs/generated/*ysbzs_v1_linked_data*` 两个旧生成说明；它们无仓库引用，且仍写旧 30 宠和旧第 7 天表口径。
- 不修改其他 ACTIVE/READY 任务卡内的历史过程记录；这些文件属于各自任务边界，等待 git-c/Lead 收口。

related_files:
- `docs/generated/README_ysbzs_v1_linked_data.md`
- `docs/generated/implementation_notes_ysbzs_v1_linked_data.md`
- `tasks/doing/2026-07-02_settings-unification-cleanup.md`

exclusive_files:
- 无

read_files:
- `AGENTS.md`
- `docs/02_CURRENT_WORKFLOW.md`
- `docs/00_AI_START_HERE.md`
- `docs/roles/PLANNER_START.md`
- `tasks/index.md`
- `tasks/README.md`
- `tasks/doing/*.md`
- `tools/build_human_master.py`
- `tests/csv_source.test.cjs`
- `xlsx/ysbzs_master.xlsx`

validation:
- pass: `rg -n "README_ysbzs_v1_linked_data|implementation_notes_ysbzs_v1_linked_data|docs/generated" .` now only finds this task card, so no live repo file references the deleted docs.
- pass: `python3` workbook sheet list spot check returned `README`, `PETS`, `SHOP_STORES`, `WAVES`, `SHOP_ITEMS`, `MECHANICS_QUALITY`, `SHAPES_TRIALS`.
- note: remaining old-wording hits are either current guardrails (`不要以旧 30 宠 / 12 波次断言作为当前验收标准`), active task history, or historical audit/notes files outside this narrow deletion scope.
- skipped: full `npm run check:all`; this is a docs-only deletion and the current worktree already has unrelated ACTIVE/READY task changes plus known workbook/check ownership conflicts.

commit_plan:
- message: `docs: remove obsolete generated data notes`
- auto_commit: blocked by dirty multi-task worktree and stale `tasks/index.md`; leave for git-c/Lead grouping.

collaboration:
- lead_scope: Audit current setting truth and remove only unreferenced obsolete docs.
- specialist_input: 无
- tester_pass: 无，非 UI 改动。
- external_ai_input: 无
- lead_decision: Keep current source-of-truth files intact; delete only unreferenced generated legacy notes. Do not edit other task cards because they are active ownership records, even when they contain historical obsolete wording.
