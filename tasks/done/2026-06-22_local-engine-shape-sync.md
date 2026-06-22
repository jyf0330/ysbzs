# 2026-06-22_local-engine-shape-sync

task_id: 2026-06-22_local-engine-shape-sync
type: implementation
status: DONE
owner: Codex
branch: codex/bazaar-day1-day3-route

## Goal

同步战斗页默认本地运行包，让普通战斗页面使用当前核心与 CSV 的新 19 形状数据。

## Scope

- 重建 `web/js/local-engine.js`，不手写第二套形状逻辑。
- 验证默认页面本地 runtime 能读到最新形状数据。

## related_files

- `web/js/local-engine.js`
- `tasks/doing/2026-06-22_local-engine-shape-sync.md`
- `output/playwright/local-engine-shape-sync-2026-06-22.png`

## exclusive_files

无

## read_files

- `AGENTS.md`
- `docs/00_AI_START_HERE.md`
- `docs/02_CURRENT_WORKFLOW.md`
- `tasks/index.md`
- `tasks/README.md`
- `tools/build_local_engine_bundle.cjs`
- `web/index.html`
- `web/js/runtime-client.js`
- `src/core/battle/shapeCatalog.cjs`
- `data/csv/08_action_shapes.csv`
- `data/csv/27_shape_catalog.csv`

## validation

- pass: `node tools/build_local_engine_bundle.cjs`
  - output: `built web/js/local-engine.js (693342 bytes, 52 modules, 32 data files)`
- pass: bundle contains latest shape catalog / `形状19`
  - checked: `形状19`, `27_shape_catalog.csv`, `08_action_shapes.csv`, `pal_096,熔岩兽`, `shapeCatalog.cjs`, `targetCellsForShape`
- pass: `npm run check:all`
- pass: real browser tester pass through the default local runtime
  - operations: open normal battle page, click start battle, click action block 0.
  - no state injection, no localStorage/importSave setup, no internal function calls for the screenshot path.
  - screenshot: `output/playwright/local-engine-shape-sync-2026-06-22.png`
  - report: `output/playwright/local-engine-shape-sync-2026-06-22.json`
  - assertions: local engine initialized, bundle metadata `52 modules / 32 files`, no `/api/view/action/report/save/load` requests, console errors `0`, page errors `0`.
  - shapes observed in browser ViewModel: `pal_072=形状03`, `pal_005=形状12`, `pal_006=形状04`, `pal_038=形状03`.
  - visible detail: selected action block shows `形状03，火属性，基础3层，命中1格。`
- pass: `node tools/check_pure_singleplayer_browser.cjs`
  - evidence: `output/playwright/pure-singleplayer/pure_singleplayer_browser_evidence.json`
  - screenshots: `output/playwright/pure-singleplayer/01_loaded_local_runtime.png` through `06_report_tab.png`
  - console errors `0`, page errors `0`, API requests `0`.
- reviewed: main thread opened `output/playwright/local-engine-shape-sync-2026-06-22.png`; visible shape detail is correct, with no obvious overlap, missing values, or broken battle layout.

## commit_plan

- message: `fix: sync battle page local shape bundle`
- stage only:
  - `web/js/local-engine.js`
  - `tasks/doing/2026-06-22_local-engine-shape-sync.md` or archived done card

## collaboration

- lead_scope: Rebuild generated local runtime bundle and verify current battle page shape data.
- specialist_input: 无
- tester_pass: `output/playwright/local-engine-shape-sync-2026-06-22.png`; normal URL default local runtime, real clicks for start battle and action block, no API/localStorage/internal-state shortcut, console/page errors 0.
- external_ai_input: 无
- lead_decision: Use the existing generator so the page bundle stays derived from current core/data truth sources.
- commit_status: READY_TO_MERGE; `tasks/index.md` and `docs/10_CHANGELOG.md` already contain unrelated dirty edits from another task, so this task does not touch those files.
