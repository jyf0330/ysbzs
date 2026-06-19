# 2026-06-20_manual-preview-diff-provenance

task_id: 2026-06-20_manual-preview-diff-provenance
type: ui-preview-provenance-bugfix
status: DONE
owner: Codex
branch: shared-worktree

## Goal

移动后的沙盒 diff 不只给受伤数值，还要带上伤害来源。右侧宠物受伤详情不能显示 `敌方宠物()` 这种空来源。

## Scope

- `PREVIEW_MANUAL_FLOW` 的单位 diff 补充来自沙盒事件流的伤害来源。
- 前端把 `manualFlowPreview.unitDiffs` 转成受伤面板时保留 `enemyIds` / `threats` / 来源名称。
- 棋盘格受伤标记继续用最新 diff 值。
- 不使用 Day7 作为测试或验收入口。

## related_files

- tasks/done/2026-06-20_manual-preview-diff-provenance.md
- tasks/index.md
- docs/10_CHANGELOG.md
- src/uiAdapterManualFlowPreview.cjs
- tests/ui_adapter.test.cjs
- tests/unit/manual_flow_undo_contract.test.cjs
- web/js/main.js
- web/js/local-engine.js
- web/ux-app.js
- output/playwright/manual-preview-diff-provenance-2026-06-20.png

## exclusive_files

- tasks/index.md
- docs/10_CHANGELOG.md
- src/uiAdapterManualFlowPreview.cjs
- tests/ui_adapter.test.cjs
- tests/unit/manual_flow_undo_contract.test.cjs
- web/js/main.js
- web/js/local-engine.js
- web/ux-app.js

## read_files

- /Users/ywh/Desktop/AI-Memory-Pack/20-projects.md
- docs/02_CURRENT_WORKFLOW.md
- docs/00_AI_START_HERE.md
- tasks/index.md
- tasks/README.md
- /Users/ywh/.agents/skills/task-occupancy/SKILL.md
- /Users/ywh/.agents/skills/systematic-debugging/SKILL.md
- /Users/ywh/.agents/skills/test-driven-development/SKILL.md

## validation

- RED: `node --test tests/unit/manual_flow_undo_contract.test.cjs` failed because `injuryFromUnitDiff()` still wrote `enemyIds: []` / `threats: []`.
- RED: `node --test --test-name-pattern "UI22E" tests/ui_adapter.test.cjs` failed because moved unit diff had no source ids.
- GREEN: `node --test tests/unit/manual_flow_undo_contract.test.cjs` passed 3/3.
- GREEN: `node --test --test-name-pattern "UI22E" tests/ui_adapter.test.cjs` passed 1/1.
- GREEN: `npm run test:ui` passed 45/45.
- GREEN: `npm test` passed (`tests/run_all_tests.cjs` 64/64, unit 78/78, ui 45/45, full 8/8, ops 12/12, prediction 4/4).
- GREEN: `git diff --check` passed.
- GREEN: `npm run check:dom` passed (`PASS no DOM/UI calls in src`).
- GREEN: `npm run check:ui-connected` passed (`PASS rebuilt UI shell -> /api -> uiAdapter -> core -> ViewModel/TextReport`).
- Browser formal flow: `http://127.0.0.1:4173/index.html?runtime=local&manualPreviewProvenance=1`; clicked `新开一天 -> 备战 -> 准备开始 -> R6C3 疾风隼 -> R2C6`; no state injection; no Day7.
- Browser assertions: right detail summary `我方疾风隼 受击预警`; detail text contains `预计伤害 6`, `HP 10→4`, `敌方翠叶鼠(-3,-3) · 合计-6`; target cell `.team-risk-num` is `受6`; console/page errors `[]`.
- Screenshot: `output/playwright/manual-preview-diff-provenance-2026-06-20.png`; lead reviewed screenshot and visible effect is correct.

## commit_plan

fix(ui): keep move preview injury provenance

## collaboration

- lead_scope: Add provenance to manual-flow unit diff injury rendering and verify via default battle flow, not Day7.
- specialist_input: none.
- tester_pass: browser formal flow executed by lead with screenshot evidence; no separate subthread tool available in this turn.
- external_ai_input: none.
- lead_decision: Attach provenance in core `unitDiffs` from sandbox event stream, then let UI render diff-provided `enemyIds` and `threats`.

## notes

- Pre-existing untracked `.playwright-cli/page-*.yml` and `.ysbzs-performance/PREVIEW_MANUAL_FLOW.jsonl` are not owned by this task.
