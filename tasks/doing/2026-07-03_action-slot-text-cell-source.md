# 2026-07-03_action-slot-text-cell-source

task_id: 2026-07-03_action-slot-text-cell-source
type: bugfix
status: READY_TO_MERGE
owner: Codex
branch: shared-worktree

## Goal

修正行动槽/战报文本中“元素增加”和底层事件文本的棋盘坐标口径不一致问题。事件 payload 继续保留内部 0 基 `r/c`，玩家可见 `text` 统一显示 1 基坐标。

## related_files

- `src/core/battle.cjs`
- `src/core/battle/actions.cjs`
- `src/core/battle/resolution.cjs`
- `src/core/battle/position.cjs`
- `src/core/battle/preview.cjs`
- `web/js/local-engine.js`
- `tests/unit/action_slot_text_cell_source.test.cjs`
- `tasks/doing/2026-07-03_action-slot-text-cell-source.md`

## write_scopes

- file: `src/core/battle.cjs`
  scope: user-visible battle event `text` coordinate labels only; no state/rule/payload changes
  mode: direct
- file: `src/core/battle/actions.cjs`
  scope: user-visible action/fire event `text` coordinate labels only; no action-slot layer/rule changes
  mode: direct
- file: `src/core/battle/resolution.cjs`
  scope: user-visible terrain/trap event `text` coordinate labels only; no damage/rule changes
  mode: direct
- file: `src/core/battle/position.cjs`
  scope: user-visible move-blocked event `text` coordinate labels only; no movement rule changes
  mode: direct
- file: `src/core/battle/preview.cjs`
  scope: user-visible preview text coordinate labels only; no preview semantics changes
  mode: direct
- file: `web/js/local-engine.js`
  scope: generated local-browser bundle snapshot after battle text formatter changes
  mode: direct
- file: `tests/unit/action_slot_text_cell_source.test.cjs`
  scope: focused regression for battle/action text using the same player-facing coordinate labels as `PLAYER_SELECT_SLOT.elementIncreases`
  mode: direct
- file: `tasks/doing/2026-07-03_action-slot-text-cell-source.md`
  scope: task status and validation evidence
  mode: direct

## exclusive_files

- 无

## shared_file_policy

`src/core/battle.cjs` appears in older READY/BLOCKED combat tasks, including a BLOCKED party-wipe task that lists it as exclusive, but this task only changes player-visible `text` coordinate formatting and leaves event payloads, lifecycle, damage, party-wipe, movement, preview semantics, and save codec unchanged. `src/core/battle/actions.cjs` / `preview.cjs` also appear in blocked action-slot/preview tasks; this task does not touch their rule semantics or layer calculations. `web/js/local-engine.js` is a generated browser runtime snapshot and may include the current shared-worktree source state per project rule.

## read_files

- `AGENTS.md`
- `docs/00_AI_START_HERE.md`
- `docs/02_CURRENT_WORKFLOW.md`
- `tasks/index.md`
- `tasks/README.md`
- `tasks/doing/*.md`
- `src/core/battle/eventSummary.cjs`
- `src/core/battle.cjs`
- `src/core/battle/actions.cjs`
- `src/core/battle/resolution.cjs`
- `src/core/battle/position.cjs`
- `src/core/battle/preview.cjs`
- `tests/ui_adapter.test.cjs`
- `tests/unit/action_slot_element_layers.test.cjs`

## validation

- RED confirmed before fix: `node --test tests/unit/action_slot_text_cell_source.test.cjs` failed because `APPLY_ELEMENT_CELL.text` showed `R6C5` while the same payload `{ r: 6, c: 5 }` summary should show `R7C6`; spawn text showed `R1C7` for payload position `{ r: 1, c: 7 }` where player text should be `R2C8`.
- pass: `node --test tests/unit/action_slot_text_cell_source.test.cjs`
- pass: `node --test --test-name-pattern 'UI25|UI26|UI27' tests/ui_adapter.test.cjs`
- pass: `node --test tests/unit/action_slot_element_layers.test.cjs`
- pass: `node --check src/core/battle.cjs`
- pass: `node --check src/core/battle/actions.cjs`
- pass: `node --check src/core/battle/resolution.cjs`
- pass: `node --check src/core/battle/position.cjs`
- pass: `node --check src/core/battle/preview.cjs`
- pass: `node tools/build_local_engine_bundle.cjs`; rebuilt `web/js/local-engine.js` from the current shared-worktree source snapshot.
- pass: `git diff --check -- src/core/battle.cjs src/core/battle/actions.cjs src/core/battle/resolution.cjs src/core/battle/position.cjs src/core/battle/preview.cjs web/js/local-engine.js tests/unit/action_slot_text_cell_source.test.cjs tasks/doing/2026-07-03_action-slot-text-cell-source.md`
- pass: formal browser flow on `http://127.0.0.1:4175/?runtime=http&sessionId=coord-text-check-1783020992810`: clicked `#prep-open-btn`, `#prep-ready-btn`, waited for `#all-out-btn`, clicked `#all-out-btn`; console/page errors 0.
- pass JSONL evidence: `/Users/ywh/Documents/ysbzs/output/battle-operation-logs/coord-text-check-1783020992810.jsonl` includes `APPLY_ELEMENT_CELL` text `我方捣蛋猫 向 R7C4 施加风1层...` and matching `PLAYER_SELECT_SLOT` text `元素增加：R7C4 风+1`; spawn text uses player labels such as `位置 R2C8`.
- screenshot reviewed by Lead: `/Users/ywh/Documents/ysbzs/output/playwright/coord-text-check-1783020992810.png`; formal page rendered normally with no obvious overlap or missing state.

## commit_plan

- message: `fix(combat): align action text element cells`
- auto_commit: no; shared worktree has unrelated dirty task groups and existing READY/BLOCKED cards.

## collaboration

- lead_scope: Core battle/action event text coordinate labels only.
- specialist_input: 无
- tester_pass: Formal 4175 browser pass through visible prep/all-out buttons; screenshot `/Users/ywh/Documents/ysbzs/output/playwright/coord-text-check-1783020992810.png`; JSONL `/Users/ywh/Documents/ysbzs/output/battle-operation-logs/coord-text-check-1783020992810.jsonl`; console/page errors 0.
- external_ai_input: 无
- lead_decision: Fix the display-label convention at text emission sites with a shared formatter, keeping raw coordinates in structured payloads for core rules and tests.
