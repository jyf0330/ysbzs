# 2026-07-03_manual-flow-injury-diff-source

task_id: 2026-07-03_manual-flow-injury-diff-source
type: bugfix
status: DONE
owner: Codex
branch: shared-worktree

## Goal

修正手动流程预览中的受伤来源明细，确保显示伤害从沙盒执行后的 HP/护盾结果反推，而不是优先使用可能溢出的 `DAMAGE.final`。

## related_files

- `src/uiAdapterManualFlowPreview.cjs`
- `tests/unit/manual_flow_injury_diff_source.test.cjs`
- `web/js/local-engine.js`
- `tasks/index.md`
- `tasks/doing/2026-07-03_manual-flow-injury-diff-source.md`

## write_scopes

- file: `src/uiAdapterManualFlowPreview.cjs`
  scope: `damageThreatFromEvent` realized damage calculation
  mode: direct
- file: `tests/unit/manual_flow_injury_diff_source.test.cjs`
  scope: new focused regression test
  mode: direct
- file: `web/js/local-engine.js`
  scope: generated browser runtime snapshot after source change
  mode: direct
- file: `tasks/index.md`
  scope: READY_TO_MERGE task index entry
  mode: direct
- file: `tasks/doing/2026-07-03_manual-flow-injury-diff-source.md`
  scope: task card status and validation evidence
  mode: direct

## exclusive_files

- 无

## shared_file_policy

不修改 `web/js/main.js` 或 `tests/ui_adapter.test.cjs`，避开现有 UI/test 租约；`web/js/local-engine.js` 按项目浏览器生效规则重建，记录为当前共享工作区源码快照，不单独提交。

## validation

- pass: `node --test tests/unit/manual_flow_injury_diff_source.test.cjs`
- pass: `node --test --test-name-pattern 'UI22D|UI22E|UI24' tests/ui_adapter.test.cjs`
- pass: `git diff --check -- src/uiAdapterManualFlowPreview.cjs tests/unit/manual_flow_injury_diff_source.test.cjs tasks/doing/2026-07-03_manual-flow-injury-diff-source.md`
- pass: `node tools/build_local_engine_bundle.cjs`
- pass: `git diff --check -- src/uiAdapterManualFlowPreview.cjs tests/unit/manual_flow_injury_diff_source.test.cjs web/js/local-engine.js tasks/doing/2026-07-03_manual-flow-injury-diff-source.md`
- pass: `git diff --check -- tasks/index.md tasks/doing/2026-07-03_manual-flow-injury-diff-source.md`
- not run: full `npm run check:all`; shared worktree already has unrelated dirty task groups and known route/workbook/test ownership noise.

## commit_plan

- message: `fix(preview): derive injury sources from realized diff`
- auto_commit: no; shared worktree already has unrelated dirty/untracked task files and existing READY/BLOCKED task groups.

## collaboration

- lead_scope: manual-flow preview injury source payload only.
- specialist_input: 无
- tester_pass: 无，非可见 UI 改动；已按浏览器生效规则重建 `web/js/local-engine.js`。
- external_ai_input: 无
- lead_decision: Keep board/detail rendering source as `unitDiffs`; adjust source details so their damage value also follows realized HP/shield delta. Rebuilt `web/js/local-engine.js` as the current shared-worktree source snapshot.
