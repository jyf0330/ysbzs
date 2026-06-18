# 2026-06-18_daily-flow-page

task_id: 2026-06-18_daily-flow-page
type: UI / daily route page
status: DONE
done_at: 2026-06-18 08:10:30 +0800
commit_id: this commit

## Goal

给当前每日流程新增独立页面，让玩家能在浏览器里单独查看当天流程、下一步、路线历史和完整 Run 摘要，并通过现有玩家入口触发流程动作。

## Scope

- 新开独立每日流程页面，不把主要流程视图塞进现有战斗页底部 tab。
- 只在浏览器 UI 和公开 ViewModel 表面实现展示。
- UI 读取 `/api/view` 的 `dayRoute` / `dayRouteRuns` / `nextActions` / `terminalSummary`。
- 会改变规则状态的操作继续走 `/api/action`，不得让 UI 直接改核心 state。
- 不处理未跟踪的 `paper-battle` 文件。

## related_files

- `web/index.html`
- `web/daily-flow.html`
- `web/daily-flow.css`
- `web/daily-flow.js`
- `web/ux-app.css`
- `src/uiAdapter.cjs`
- `src/dailyFlowView.cjs`
- `tests/ui_adapter.test.cjs`
- `tests/unit/ui_combat_layout_contract.test.cjs`
- `tasks/index.md`
- `tasks/done/2026-06-18_daily-flow-page.md`
- `docs/10_CHANGELOG.md`

## validation

- `npm run check:all`
- `npm run test:coverage`
- visible gate: real browser tester pass with screenshot under `output/playwright/`

## commit_plan

message: `feat(ui): add daily flow page`

## collaboration

lead_scope: Add a standalone daily flow page using existing API/ViewModel boundaries.
specialist_input: 无
tester_pass: TEST_SUBTHREAD_UNAVAILABLE; Lead executed independent real-browser Playwright pass.
external_ai_input: 无
lead_decision: 新开 `web/daily-flow.html` 独立页面；ViewModel 由 `src/dailyFlowView.cjs` 提供，UI 只读 runtime `/api/view` 并通过 `/api/action` 推进流程。

## verification_results

- `node --test tests/ui_adapter.test.cjs`: pass, 32/32.
- `node --test tests/unit/ui_combat_layout_contract.test.cjs`: pass, 7/7.
- `node tools/audit_singleplayer_architecture.cjs`: pass, including `uiAdapter remains under round5 size guard`.
- `npm run check:all`: pass.
- `npm run test:coverage`: pass, 124/124; `src/dailyFlowView.cjs` line coverage 100%.

## visible_gate

- command: Playwright real browser against `http://127.0.0.1:4185/daily-flow.html`.
- steps:
  1. Reset session through `/api/session/new`.
  2. Open standalone daily flow page.
  3. Click `执行下一步` to generate node options.
  4. Click first route choice card.
  5. Click `完整 Run` and wait for Day1-Day10 run summary.
- screenshot: `output/playwright/daily-flow-page-2026-06-18.png`.
- DOM assertions: `stepCards=6`, `runCards=10`, `choiceCount=0` after terminal.
- ViewModel assertions: first step `current` after node options; first step `done` after choice; final `day=10`, `phase=day_end`, `dailyFlow.terminal.kind=final_boss`.
- console errors: `0`.
- main-thread screenshot review: 截图复核通过；独立每日流程页、当天步骤、路线历史、跨天 Run 和流程记录可见，无明显遮挡/错位；终局状态不再显示旧奖励可选项。

## notes

- Unowned dirty files at start: `docs/PAPER_BATTLE_UI_START_HERE.md`, `tools/check_paper_battle_ui.cjs`, `web/assets/reference_trace_base.jpeg`, `web/paper-battle.css`, `web/paper-battle.html`, `web/paper-battle.js`.
