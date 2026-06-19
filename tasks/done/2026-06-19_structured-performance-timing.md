# 2026-06-19_structured-performance-timing

task_id: 2026-06-19_structured-performance-timing
type: performance-instrumentation
status: DONE
owner: Codex
branch: shared-worktree

## Goal

给高风险沙盒事务增加结构化阶段耗时记录：每个关键步骤都能看到本阶段耗时和累计耗时，方便以后判断到底是快照、沙盒命令、ViewModel、diff、恢复还是前端渲染链路慢。

## Scope

- 新增轻量 timing helper，避免在业务函数里散落计时代码。
- 为 `PREVIEW_MANUAL_FLOW` 事务记录阶段耗时，并随结果返回。
- `MOVE_HERO` 响应携带的移动后沙盒预览也保留 timing 数据。
- 确认前端 normalized `manualFlowPreview` 保留 timing，方便浏览器侧调试对象查看。
- 用 RED/GREEN 测试覆盖 timing 字段、阶段名、累计耗时、移动响应携带 timing。

## related_files

- tasks/done/2026-06-19_structured-performance-timing.md
- tasks/index.md
- docs/10_CHANGELOG.md
- src/performanceTiming.cjs
- src/uiAdapterManualFlowPreview.cjs
- tests/ui_adapter.test.cjs
- web/js/local-engine.js

## exclusive_files

- tasks/index.md
- docs/10_CHANGELOG.md
- src/uiAdapterManualFlowPreview.cjs
- tests/ui_adapter.test.cjs
- web/js/local-engine.js

## read_files

- /Users/ywh/Desktop/AI-Memory-Pack/20-projects.md
- docs/02_CURRENT_WORKFLOW.md
- docs/00_AI_START_HERE.md
- docs/roles/PROGRAMMER_START.md
- tasks/README.md
- /Users/ywh/.agents/skills/task-occupancy/SKILL.md
- /Users/ywh/.agents/skills/optimization-performance/SKILL.md
- /Users/ywh/.agents/skills/test-driven-development/SKILL.md
- /Users/ywh/.codex/memories/MEMORY.md

## validation

- RED: `node --test tests/ui_adapter.test.cjs` failed as expected in `UI22C` / `UI22D` because `PREVIEW_MANUAL_FLOW.result.timing` and move response `manualFlowPreview.timing` were missing.
- GREEN: `node --test tests/ui_adapter.test.cjs` passed after adding structured timing for snapshot, command normalization, before/after ViewModel/cells/details, sandbox commands, diffs, projected hash, restore, and restored response capture.
- Related checks passed: `node --test tests/unit/manual_flow_undo_contract.test.cjs`, `node tools/audit_singleplayer_architecture.cjs`, `git diff --check`.
- Browser bundle refreshed: `node tools/build_local_engine_bundle.cjs`.
- Timing probe confirmed actionable stage data. Example observed `PREVIEW_MANUAL_FLOW` total was about 648ms, with largest stages at `sandbox_command_RUN_PLAYER_ALL_OUT` and `sandbox_command_END_PLAYER_TURN`.
- Full validation passed: `npm run check:all`.
- No visible UI behavior change. `web/js/main.js` and `web/ux-app.js` already preserve unknown fields via `Object.assign({}, result, ...)`, so no frontend source edit was needed for timing preservation.

## commit_plan

perf(ui): add structured timing for sandbox previews

## collaboration

- lead_scope: Add structured timing to high-risk preview transaction path.
- specialist_input: none.
- tester_pass: not required; no visible UI behavior change planned.
- external_ai_input: none.
- lead_decision: implemented structured timing at the transaction boundary so risky functions expose step costs before optimization work.

## notes

- Pre-existing untracked `.playwright-cli/page-*.yml` files are not owned by this task.
