# 2026-06-30_battle-debug-route-page

task_id: 2026-06-30_battle-debug-route-page
type: ui-tool
status: READY_TO_MERGE
owner: Codex
branch: codex/bazaar-day1-day3-route

## Goal

新增一个独立战斗调试页面：可以从“类似存档”的固定路线状态出发，自动走完前两个事件选择，然后打开第一场固定战入口，方便直接调试战斗页面。

## Scope

- 新建独立页面，不嵌入现有 `web/index.html` 战斗页。
- 页面只通过 `createGameRuntime` 调 `/api/view`、`/api/action`、`/api/save`、`/api/load`，不直接 import 核心层或 adapter。
- 提供一键准备调试存档：生成第 1 天前两个 3 选 1 节点，按默认第一项选择两次，到达固定战入口。
- 提供打开战斗页按钮：保存“两事件后固定战入口”状态并跳转 `web/index.html` 同一 session，不提前运行会自动结算固定战的 `RUN_ROUTE_FIXED_BATTLE`。
- 保存一份调试快照到浏览器本地，允许页面重载后继续从该状态调试。
- 不修改现有主战斗页按钮流程。

## related_files

- `web/battle-debug.html`
- `web/battle-debug.css`
- `web/battle-debug.js`
- `tests/unit/battle_debug_page.test.cjs`
- `tasks/doing/2026-06-30_battle-debug-route-page.md`

## exclusive_files

- 无

## read_files

- `AGENTS.md`
- `docs/02_CURRENT_WORKFLOW.md`
- `docs/00_AI_START_HERE.md`
- `docs/roles/UI_UX_START.md`
- `tasks/index.md`
- `tasks/README.md`
- `web/daily-flow.html`
- `web/daily-flow.js`
- `web/js/runtime-client.js`
- `src/dailyFlowView.cjs`
- `src/uiAdapter.cjs`
- `tests/unit/daily_flow_battle_first_route.test.cjs`

## validation

- pass: RED `node --test tests/unit/battle_debug_page.test.cjs` initially failed on missing `web/battle-debug.html`.
- pass: `node --test tests/unit/battle_debug_page.test.cjs`
- pass: `node --input-type=module --check < web/battle-debug.js`
- pass: `git diff --check -- web/battle-debug.html web/battle-debug.css web/battle-debug.js tests/unit/battle_debug_page.test.cjs tasks/doing/2026-06-30_battle-debug-route-page.md`
- pass: `node tests/run_all_tests.cjs` -> 64/64 tests passed.
- pass: 4173 real browser pass through player-visible buttons:
  - clicked `准备两事件后战斗入口`
  - verified local snapshot `ysbzs.battleDebug.routeAfterTwoEvents` has `save.sessionId`, `save.state.phase=node_resolved`, and two selected node history entries
  - clicked `打开战斗页调试`
  - verified `index.html?runtime=http&sessionId=...` opens with phase label `节点结算`, next label `进入上午战`, and DOM contains `智能调整站位` / `我方全部出击`
  - console errors: 0; page errors: 0
  - screenshots:
    - `output/playwright/battle-debug-route-page-4173-2026-06-29T17-27-22-500Z.png`
    - `output/playwright/battle-debug-main-battle-entry-4173-2026-06-29T17-27-22-500Z.png`
    - `output/playwright/battle-debug-main-battle-entry-tall-4173-2026-06-29T17-27-45-311Z.png`

## commit_plan

- message: `feat(ui): add battle route debug page`
- auto_commit: blocked because worktree contains unrelated pre-existing dirty files from `2026-06-29_auto-enemy-turn-flow`; do not stage/commit this task together with them.

## collaboration

- lead_scope: Independent battle debug page and focused contract/browser tests.
- specialist_input: 无
- tester_pass: complete via Playwright on `http://127.0.0.1:4173/battle-debug.html?runtime=http&sessionId=battle-debug-pass-1782754042501`
- external_ai_input: 无
- lead_decision: Use a standalone debug tool page that consumes public ViewModel route actions and runtime save/load. Stop at the fixed battle entry and open the normal battle page with the same session, because the existing fixed battle command resolves the route battle instead of entering an interactive `player_turn`.
