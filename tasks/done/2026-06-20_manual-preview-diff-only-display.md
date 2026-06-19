# 2026-06-20_manual-preview-diff-only-display

task_id: 2026-06-20_manual-preview-diff-only-display
type: ui-preview-data-source-bugfix
status: DONE
owner: Codex
branch: shared-worktree

## Goal

清掉移动后受伤显示里的旧 `teamRisk` 口径。移动成功后，前端只用最新 `manualFlowPreview` 的 projected cell/detail/unit diff 展示已发生的沙盒结果，不再用未来风险表覆盖最终受伤结果。

## Scope

- 前端缓存 `manualFlowPreview.unitDiffs`，按 unit id 建索引。
- 有 projected preview 时，详情里的我方受伤/HP 变化和棋盘格 `受X/KO` 标记都来自 `unitDiffs` / projected detail，不再回退到 projected/current `teamRisk`。
- `PREVIEW_MANUAL_FLOW` timing 支持按需落本地基线日志，默认不落盘。
- 保持未执行沙盒预览时的当前态风险展示。
- 不使用 Day7 作为测试或验收入口。

## related_files

- tasks/done/2026-06-20_manual-preview-diff-only-display.md
- tasks/index.md
- docs/10_CHANGELOG.md
- src/performanceTiming.cjs
- src/uiAdapterManualFlowPreview.cjs
- tests/ui_adapter.test.cjs
- web/js/main.js
- web/js/local-engine.js
- web/ux-app.js
- tests/unit/manual_flow_undo_contract.test.cjs
- output/playwright/manual-preview-diff-only-display-2026-06-20.png

## exclusive_files

- tasks/index.md
- docs/10_CHANGELOG.md
- src/performanceTiming.cjs
- src/uiAdapterManualFlowPreview.cjs
- tests/ui_adapter.test.cjs
- web/js/main.js
- web/js/local-engine.js
- web/ux-app.js
- tests/unit/manual_flow_undo_contract.test.cjs

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

- RED: `node --test tests/unit/manual_flow_undo_contract.test.cjs` failed before implementation because `web/js/main.js` did not index projected `unitDiffs` by unit id.
- GREEN: `node --test tests/unit/manual_flow_undo_contract.test.cjs` passed 3/3.
- GREEN: `npm run test:ui` passed 44/44, including `UI22C1` timing local persistence and `UI22D` diff-sourced moved injury preview.
- GREEN: `npm test` passed (`tests/run_all_tests.cjs` 64/64, unit 78/78, ui 44/44, full 8/8, ops 12/12, prediction 4/4).
- GREEN: `git diff --check` passed.
- GREEN: `npm run check:dom` passed (`PASS no DOM/UI calls in src`).
- GREEN: `npm run check:ui-connected` passed (`PASS rebuilt UI shell -> /api -> uiAdapter -> core -> ViewModel/TextReport`).
- Browser formal flow: `http://127.0.0.1:4173/index.html?runtime=local&manualPreviewDiffOnly=3`; clicked `新开一天 -> 备战 -> 准备开始 -> R6C3 疾风隼 -> R2C6`; no state injection; no Day7.
- Browser assertions: right detail summary `我方疾风隼 受击预警`; detail text contains `预计伤害 6`, `HP 10→4`, `敌方宠物() · 合计-6`; target cell `.team-risk-num` is `受6`; console/page errors `[]`.
- Screenshot: `output/playwright/manual-preview-diff-only-display-2026-06-20.png`; lead reviewed screenshot and visible effect is correct.

## commit_plan

fix(ui): render move preview injuries from latest diff

## collaboration

- lead_scope: Clear stale risk fallback from moved-cell injury display and verify via default battle flow, not Day7.
- specialist_input: none.
- tester_pass: browser formal flow executed by lead with screenshot evidence; no separate subthread tool available in this turn.
- external_ai_input: none.
- lead_decision: Keep projected preview injury display on `unitDiffs`; keep old `teamRisk` only for non-projected current-state risk.

## notes

- Pre-existing untracked `.playwright-cli/page-*.yml` files are not owned by this task.
- `.ysbzs-performance/PREVIEW_MANUAL_FLOW.jsonl` is generated timing output from local validation and is not owned by this task.
