# 2026-06-22_battle-shape-attribute-readability

task_id: 2026-06-22_battle-shape-attribute-readability
type: ui
status: DONE
owner: Codex
branch: codex/bazaar-day1-day3-route

## Goal

优化战斗页前端信息表达，让玩家不用点开调试也能看懂宠物形状、行动块作用范围、关键属性、品质和机制。

## Scope

- 在现有 `web/js/main.js` / `web/ux-app.js` / `web/ux-app.css` 展示层优化，不把核心规则复制到前端。
- 在 `src/uiAdapter.cjs` 的 ViewModel 边界补形状图字段，让前端只渲染公开数据。
- 只消费当前 ViewModel 已有字段：`shape`, `slots`, `quality`, `role`, `mechanicStatus`, `hp/atk/shield/ap/moveRange` 等。
- 补 UI 合同测试，防止形状/属性信息再次被压成不可读短名。
- 完成真实浏览器玩家入口截图验收。

## related_files

- `src/uiAdapter.cjs`
- `web/js/main.js`
- `web/ux-app.js`
- `web/ux-app.css`
- `web/js/local-engine.js`
- `tests/ui_adapter.test.cjs`
- `tests/unit/ui_combat_layout_contract.test.cjs`
- `tasks/done/2026-06-22_battle-shape-attribute-readability.md`
- `output/playwright/battle-shape-attribute-readability-2026-06-22.png`
- `output/playwright/battle-shape-attribute-readability-2026-06-22.json`

## exclusive_files

- `web/ux-app.js`
- `src/uiAdapter.cjs`
- `web/js/main.js`

## read_files

- `AGENTS.md`
- `docs/00_AI_START_HERE.md`
- `docs/02_CURRENT_WORKFLOW.md`
- `docs/roles/UI_UX_START.md`
- `tasks/index.md`
- `tasks/README.md`
- `web/index.html`
- `web/js/main.js`
- `web/ux-app.js`
- `web/ux-app.css`
- `src/uiAdapter.cjs`
- `tests/ui_adapter.test.cjs`
- `tests/unit/ui_combat_layout_contract.test.cjs`
- `tools/build_local_engine_bundle.cjs`

## validation

- pass: `node --test tests/unit/ui_combat_layout_contract.test.cjs`
- pass: `node --test --test-name-pattern "UI02 getViewModel" tests/ui_adapter.test.cjs`
- pass: `node tools/build_local_engine_bundle.cjs`
- pass: `npm run check:ui-connected`
- pass: real browser tester pass on `http://127.0.0.1:4347/index.html?runtime=local&shapeAttributeReadability=1`
  - screenshot: `output/playwright/battle-shape-attribute-readability-2026-06-22.png`
  - report: `output/playwright/battle-shape-attribute-readability-2026-06-22.json`
  - asserted: hero/action/detail shape text, shape diagrams, quality panel, ViewModel `shapeGrid`, `settleCount`, no console/page errors, no active-pet card overflow
- blocked unrelated full adapter sweep: `node --test tests/ui_adapter.test.cjs`
  - failing route tests emit `NODE_OPTIONS_BLOCKED` / `BATTLE_OPTIONS_BLOCKED` from current `src/core/dayRoute.cjs` / `src/core/shop.cjs` dirty route changes outside this task

## commit_plan

- message: `feat: surface battle shape and attribute details`
- stage only:
  - `src/uiAdapter.cjs`
  - `web/js/main.js`
  - `web/ux-app.js`
  - `web/ux-app.css`
  - `web/js/local-engine.js`
  - `tests/ui_adapter.test.cjs`
  - `tests/unit/ui_combat_layout_contract.test.cjs`
  - archived task card

## collaboration

- lead_scope: Improve visible battle UI shape/attribute readability while staying on ViewModel data.
- specialist_input: 无
- tester_pass: completed via Playwright real browser pass; main thread reviewed screenshot.
- external_ai_input: 无
- lead_decision: Expose compact shape diagrams through ViewModel, then add property summaries to the existing active-pet, action-block, and right-detail surfaces; keep detailed controls in the existing popover.
- unowned_dirty_files: `data/csv/24_node_schedule.csv`, `docs/10_CHANGELOG.md`, `docs/PAPER_BATTLE_UI_START_HERE.md`, `src/core/dayRoute.cjs`, `src/core/shop.cjs`, `tasks/index.md`, `tests/run_all_tests.cjs`, `web/daily-flow.css`, `web/daily-flow.html`, `web/daily-flow.js`, `docs/RIGHT_PET_DETAIL_PANEL_PROMPT.md`, `tasks/doing/2026-06-22_daily-flow-battle-first-route.md`, `tasks/done/2026-06-22_local-engine-shape-sync.md`, `tasks/done/2026-06-22_main-style-right-pet-detail-prompt.md`, `tests/unit/daily_flow_battle_first_route.test.cjs`, `web/assets/reference_main_style_battle_ui_2026-06-22.jpg`, `xlsx/.~lock.ysbzs_master.xlsx#`
