# 2026-06-19_move-simulation-diff-preview

task_id: 2026-06-19_move-simulation-diff-preview
type: core-preview-ui
status: DONE
owner: Codex
branch: shared-worktree

## Goal

把我方移动后的受伤/预览显示改为基于沙盒执行结果：移动核心只负责真实落位和同步棋盘，移动后记录当前全格子信息，再沙盒执行我方全部行动与敌方行动，获取执行后全格子信息并 diff，把前端需要渲染的数据交给 ViewModel / manual flow preview。

## Scope

- 删除 `moveHero()` 内部的单只宠物 `beforeRisk` / `afterRisk` 即时计算，不再用它决定移动后的显示。
- 让移动后的事务预览沙盒执行 `RUN_PLAYER_ALL_OUT` + `END_PLAYER_TURN`，并返回执行前后全格子、全详情与 diff。
- 保持核心层无 DOM，UI 只读 ViewModel / 预览结果。
- 用 RED/GREEN 测试覆盖移动不再带单体风险、事务预览包含全格子 diff，并刷新本地浏览器 bundle。
- 完成真实浏览器 tester pass，验证移动后宠物受伤/预览信息来自沙盒投影并可见。

## related_files

- tasks/done/2026-06-19_move-simulation-diff-preview.md
- tasks/index.md
- docs/10_CHANGELOG.md
- src/core/battle/position.cjs
- src/core/battle/planning.cjs
- src/uiAdapter.cjs
- src/uiAdapterManualFlowPreview.cjs
- web/js/main.js
- web/ux-app.js
- web/js/local-engine.js
- tests/ui_adapter.test.cjs
- tests/unit/manual_flow_undo_contract.test.cjs
- output/playwright/

## exclusive_files

- tasks/index.md
- docs/10_CHANGELOG.md
- src/core/battle/position.cjs
- src/core/battle/planning.cjs
- src/uiAdapter.cjs
- src/uiAdapterManualFlowPreview.cjs
- web/js/main.js
- web/ux-app.js
- web/js/local-engine.js
- tests/ui_adapter.test.cjs
- tests/unit/manual_flow_undo_contract.test.cjs

## read_files

- /Users/ywh/Desktop/AI-Memory-Pack/20-projects.md
- docs/02_CURRENT_WORKFLOW.md
- docs/00_AI_START_HERE.md
- docs/roles/PROGRAMMER_START.md
- docs/roles/UI_UX_START.md
- tasks/README.md
- /Users/ywh/.codex/skills/game-ui-frontend/SKILL.md
- /Users/ywh/.codex/skills/frontend-skill/SKILL.md
- /Users/ywh/.codex/skills/ywh-web-game/SKILL.md
- /Users/ywh/.codex/skills/playwright/SKILL.md
- /Users/ywh/.agents/skills/systematic-debugging/SKILL.md
- /Users/ywh/.agents/skills/test-driven-development/SKILL.md
- /Users/ywh/.codex/memories/MEMORY.md

## validation

- RED: `node --test tests/ui_adapter.test.cjs` failed as expected: `UI22C` still returned `END_PLAYER_TURN -> START_NEXT_ROUND`, and `UI22D` showed `MOVE_HERO` still included `riskBefore`.
- GREEN: `node --test tests/ui_adapter.test.cjs` passed after `MOVE_HERO` stopped emitting `riskBefore/riskAfter`, movement responses carried `manualFlowPreview`, and `PREVIEW_MANUAL_FLOW` returned before/after cells, cell details, `cellDiffs`, and `unitDiffs` for `RUN_PLAYER_ALL_OUT -> END_PLAYER_TURN`.
- Related checks passed: `node --test tests/unit/manual_flow_undo_contract.test.cjs`, `node --test tests/unit/battle_module_split.test.cjs`, `node --test tests/unit/event_summary.test.cjs`.
- Generated browser bundle refreshed: `node tools/build_local_engine_bundle.cjs`.
- Architecture guard passed after keeping `src/uiAdapter.cjs` under the round5 size limit: `node tools/audit_singleplayer_architecture.cjs`.
- Full validation passed: `npm run check:all`.
- Browser tester pass: Playwright opened `http://127.0.0.1:4193/?runtime=local&case=move-simulation-diff-preview-2026-06-19`, clicked `第7天火核心试炼`, clicked a real hero cell, clicked a real legal move target, then clicked the moved hero cell for detail review.
- Browser assertions: `manualFlowPreview.commands` was `RUN_PLAYER_ALL_OUT -> END_PLAYER_TURN`; `beforeCells`, `cells`, `beforeCellDetails`, and `cellDetails` were all 64; `cellDiffs` was 30; `unitDiffs` was 8; `rolledBack` was true; console/page errors were empty.
- Screenshot saved and reviewed by lead: `output/playwright/move-simulation-diff-preview-2026-06-19.png`. Visible result showed the moved hero cell and right detail panel using projected injury warning data (`受44 KO` / HP `9->0`) rather than the bottom event log.

## commit_plan

fix(ui): project move previews from sandbox diffs

## collaboration

- lead_scope: Implement the move-preview data-source correction in the shared worktree.
- specialist_input: none.
- tester_pass: PASS, `output/playwright/move-simulation-diff-preview-2026-06-19.png`.
- external_ai_input: none.
- lead_decision: implemented and verified.

## notes

- Pre-existing untracked `.playwright-cli/page-*.yml` files are not owned by this task.
