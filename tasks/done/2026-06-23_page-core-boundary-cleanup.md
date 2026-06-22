# 2026-06-23_page-core-boundary-cleanup

task_id: 2026-06-23_page-core-boundary-cleanup
type: architecture-refactor
status: DONE
owner: Codex
branch: codex/bazaar-day1-day3-route

## Goal

完成上一轮页面逻辑 / 核心逻辑审查中的 1-6 项：状态变更回到核心 reducer、前端 UI 单源收口、daily-flow 动作由 ViewModel 提供、压缩 uiAdapter 规则职责、加固手动预览只读边界、统一商店冻结入口。

## Scope

- 把 `SELL_UNIT` / `TOGGLE_UNIT_ACTIVE` 的规则状态变更从 `src/uiAdapter.cjs` 下沉到核心库存规则，并由 `src/core/reducer.cjs` dispatch。
- 明确 `web/js/main.js` 为主战斗页面唯一运行 UI 源，退役或收口 `web/ux-app.js` 的测试依赖。
- 把 daily-flow 的下一步路线动作、自动动作和步骤摘要从页面内推导迁移到 `dailyFlow` ViewModel。
- 保持 `PREVIEW_MANUAL_FLOW` 只读事务边界，不让页面或 adapter 新增第二套规则预测。
- 主战斗页面不再暴露商店冻结/解冻按钮；冻结核心命令保留为内部/测试能力。
- 重建 `web/js/local-engine.js`，同步必要测试与 changelog。

## related_files

- `tasks/done/2026-06-23_page-core-boundary-cleanup.md`
- `tasks/index.md`
- `docs/10_CHANGELOG.md`
- `src/core/inventoryRules.cjs`
- `src/core/reducer.cjs`
- `src/uiAdapter.cjs`
- `src/dailyFlowView.cjs`
- `web/daily-flow.js`
- `web/daily-flow.html`
- `web/js/main.js`
- `web/js/local-engine.js`
- `web/ux-app.js`
- `tools/audit_singleplayer_architecture.cjs`
- `tests/ui_adapter.test.cjs`
- `tests/unit/daily_flow_battle_first_route.test.cjs`
- `tests/unit/ui_combat_layout_contract.test.cjs`
- `tests/unit/architecture_round4.test.cjs`
- `tests/unit/architecture_optimization.test.cjs`
- `tests/unit/singleplayer_round5.test.cjs`
- `tests/unit/manual_flow_undo_contract.test.cjs`
- `tests/unit/ui_module_render_cache.test.cjs`
- `output/playwright/page-core-boundary-cleanup-2026-06-23-daily-flow.png`
- `output/playwright/page-core-boundary-cleanup-2026-06-23-main-shop.png`
- `output/playwright/page-core-boundary-cleanup-2026-06-23-report.json`

## exclusive_files

- `src/core/inventoryRules.cjs`
- `src/core/reducer.cjs`
- `src/uiAdapter.cjs`
- `src/dailyFlowView.cjs`
- `web/daily-flow.js`
- `web/daily-flow.html`
- `web/js/main.js`
- `web/js/local-engine.js`
- `web/ux-app.js`
- `tools/audit_singleplayer_architecture.cjs`
- `tasks/index.md`
- `docs/10_CHANGELOG.md`

## read_files

- `AGENTS.md`
- `~/Desktop/AI-Memory-Pack/10-workflows.md`
- `~/Desktop/AI-Memory-Pack/20-projects.md`
- `docs/00_AI_START_HERE.md`
- `docs/02_CURRENT_WORKFLOW.md`
- `docs/roles/PROGRAMMER_START.md`
- `docs/roles/UI_UX_START.md`
- `tasks/README.md`
- `tasks/index.md`

## validation

- PASS: core/UI unit tests for inventory commands and daily-flow action source.
- PASS: `node tools/check_no_dom.cjs`
- PASS: `node tools/audit_singleplayer_architecture.cjs`
- PASS: targeted `node --test tests/unit/daily_flow_battle_first_route.test.cjs tests/unit/ui_module_render_cache.test.cjs tests/unit/manual_flow_undo_contract.test.cjs tests/unit/ui_combat_layout_contract.test.cjs tests/unit/architecture_round4.test.cjs tests/unit/architecture_optimization.test.cjs tests/unit/singleplayer_round5.test.cjs tests/ui_adapter.test.cjs`
- PASS: `npm run check:all`
- PASS: `npm run test:coverage`
- PASS: real browser tester pass on `http://127.0.0.1:4173/daily-flow.html?runtime=local&gate=page-core-boundary-cleanup` and `http://127.0.0.1:4173/index.html?runtime=local&gate=page-core-boundary-cleanup`
- Browser evidence: `output/playwright/page-core-boundary-cleanup-2026-06-23-daily-flow.png`, `output/playwright/page-core-boundary-cleanup-2026-06-23-main-shop.png`, `output/playwright/page-core-boundary-cleanup-2026-06-23-report.json`
- Browser assertions: daily-flow clicked node -> shop -> buy -> down -> up -> sell through real buttons; main page clicked generate node -> shop through real buttons; console/page errors `[]`; freeze controls `0`.
- Main-thread screenshot review: daily-flow screenshot shows shop node, purchase/sell/up-down controls and no freeze buttons; main shop screenshot shows shop offers/events with only buy/trigger controls and no visible freeze/decode leftovers.

## commit_plan

- message: `refactor(ui): separate page actions from core rules`
- stage only files listed in `related_files`
- auto-commit requires full tests and visible browser evidence; otherwise output Commit Plan

## collaboration

- lead_scope: Implement items 1-6 from page/core boundary review in the shared worktree.
- specialist_input: 无
- tester_pass: PASS via independent Playwright browser pass; no subthread tool was available in this turn, so main thread ran the formal player flow and reviewed screenshots.
- external_ai_input: 无
- lead_decision: Reuse existing inventory core module, keep reducer as the only mutating public command path, and make daily-flow consume explicit ViewModel actions rather than deriving route semantics in the page.
