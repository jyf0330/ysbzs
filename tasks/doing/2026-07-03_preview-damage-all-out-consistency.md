# 2026-07-03_preview-damage-all-out-consistency

task_id: 2026-07-03_preview-damage-all-out-consistency
type: bugfix
status: READY_TO_MERGE
owner: Codex
branch: shared-worktree

## Goal

核对并修正“预计受伤”和点击“我方全部出击”后的真实伤害一致性，尤其覆盖全出击会直接击杀目标、目标从 projected ViewModel 中消失的情况。

## related_files

- `src/uiAdapterManualFlowPreview.cjs`
- `tests/unit/manual_flow_preview_lethal_diff.test.cjs`
- `web/js/local-engine.js`
- `tasks/doing/2026-07-03_preview-damage-all-out-consistency.md`

## write_scopes

- file: `src/uiAdapterManualFlowPreview.cjs`
  scope: `buildUnitDiffs` handling for units present before projection but absent after projection
  mode: direct
- file: `tests/unit/manual_flow_preview_lethal_diff.test.cjs`
  scope: focused regression for PREVIEW_MANUAL_FLOW lethal all-out damage matching real RUN_PLAYER_ALL_OUT flow
  mode: direct
- file: `web/js/local-engine.js`
  scope: generated local-browser bundle snapshot after manual-flow preview diff fix
  mode: direct
- file: `tasks/doing/2026-07-03_preview-damage-all-out-consistency.md`
  scope: task status and validation evidence
  mode: direct

## exclusive_files

- 无

## shared_file_policy

`src/uiAdapterManualFlowPreview.cjs` appears in older READY_TO_MERGE auto-flow work, but this task only changes the diff representation for projected-dead units and does not change command sequencing, rollback, frontend rendering, or battle rules. `web/js/local-engine.js` is generated and may include the current shared-worktree source snapshot per project rule.

## read_files

- `AGENTS.md`
- `docs/00_AI_START_HERE.md`
- `docs/02_CURRENT_WORKFLOW.md`
- `tasks/index.md`
- `tasks/README.md`
- `tasks/doing/*.md`
- `src/uiAdapterManualFlowPreview.cjs`
- `src/uiAdapter.cjs`
- `web/js/main.js`
- `tests/ui_adapter.test.cjs`

## validation

- RED confirmed: `node --test tests/unit/manual_flow_preview_lethal_diff.test.cjs` failed before implementation because `PREVIEW_MANUAL_FLOW` returned a diff for the killed target with `after: null`, so frontend `injuryFromUnitDiff()` could not compute visible expected injury.
- pass: `node --test tests/unit/manual_flow_preview_lethal_diff.test.cjs`
- pass: `node --test --test-name-pattern 'UI22C|UI22D|UI22E' tests/ui_adapter.test.cjs`
- pass: `node --check src/uiAdapterManualFlowPreview.cjs`
- pass: multi-seed adapter comparison for `damage-preview-consistency`, `normal-loaded-positioning`, `coord-damage-check`, and `p1`; projected `unitDiffs` damage matched the real `RUN_PLAYER_ALL_OUT -> END_PLAYER_TURN` damage for all cases, including lethal `p1` target `敌方翠叶鼠` damage `18`.
- pass: `node tools/build_local_engine_bundle.cjs`; rebuilt `web/js/local-engine.js` from the current shared-worktree source snapshot.
- pass: formal browser flow on `http://127.0.0.1:4175/?runtime=http&seed=p1&sessionId=damage-consistency-1783021472949`: clicked `#prep-open-btn`, `#prep-ready-btn`, `#auto-position-btn`, waited for manual-flow preview, clicked `#all-out-btn`; console/page errors 0.
- pass visible evidence before all-out: screenshot `/Users/ywh/Documents/ysbzs/output/playwright/damage-consistency-1783021472949-before-all-out.png` shows board badge `受18 KO` and detail panel `预计伤害 18`, `HP 18→0`, `结果 KO` for `敌方翠叶鼠`.
- pass actual damage evidence after all-out: `/Users/ywh/Documents/ysbzs/output/battle-operation-logs/damage-consistency-1783021472949.jsonl` has `DAMAGE` events against `enemy_pal_004_3` totaling `18` (`4+4+4+6`); screenshot `/Users/ywh/Documents/ysbzs/output/playwright/damage-consistency-1783021472949-after-all-out.png` shows the target removed and the game advanced to round 2.
- pass: `git diff --check -- src/uiAdapterManualFlowPreview.cjs tests/unit/manual_flow_preview_lethal_diff.test.cjs web/js/local-engine.js tasks/doing/2026-07-03_preview-damage-all-out-consistency.md`

## commit_plan

- message: `fix(ui): keep lethal all-out preview damage visible`
- auto_commit: no; shared worktree has unrelated dirty task groups and existing READY/BLOCKED cards.

## collaboration

- lead_scope: Manual-flow preview diff data only; no battle rule or UI layout edits.
- specialist_input: 无
- tester_pass: pending
- external_ai_input: 无
- tester_pass: Formal 4175 browser pass through visible prep/auto-position/all-out buttons; screenshots `/Users/ywh/Documents/ysbzs/output/playwright/damage-consistency-1783021472949-before-all-out.png` and `/Users/ywh/Documents/ysbzs/output/playwright/damage-consistency-1783021472949-after-all-out.png`; JSONL `/Users/ywh/Documents/ysbzs/output/battle-operation-logs/damage-consistency-1783021472949.jsonl`; console/page errors 0.
- lead_decision: Preserve projected-dead units in `unitDiffs` by synthesizing an after-state with `hp=0`, `shield=0`, and `alive=false`; this lets the existing frontend injury calculation show lethal expected damage without changing UI layout or battle rules.
