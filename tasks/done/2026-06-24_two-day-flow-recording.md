# 2026-06-24_two-day-flow-recording

task_id: 2026-06-24_two-day-flow-recording
type: playtest_bugfix
status: DONE
owner: Codex
branch: codex/bazaar-day1-day3-route
worktree: shared-worktree

## Goal

按正常玩家流程录制新的每日流程，至少覆盖两天；如果流程中发现错误，先定位根因并修复，再重新录制通过。

## Scope

- 从正式 daily-flow 页面进入，按玩家可见按钮/卡片操作推进两天。
- 固定战从 daily-flow 跳入正常棋盘战斗界面。
- 战斗阶段使用正式战斗页的玩家可见入口推进，不用临时存档、localStorage/importSave、page.evaluate 改状态或核心内部函数制造画面。
- 保存两天流程视频、截图、console 与 ViewModel 辅助证据到 `output/playwright/`。
- 如果发现 bug，再扩展 `related_files` 到对应源码/测试文件，按 TDD 修复并重新验证。

## related_files

- `tasks/doing/2026-06-24_two-day-flow-recording.md`
- `tasks/done/2026-06-24_two-day-flow-recording.md`
- `tasks/index.md`
- `web/js/main.js`
- `tests/unit/ui_combat_layout_contract.test.cjs`
- `output/playwright/`

## exclusive_files

- `tasks/index.md`
- `web/js/main.js`

## read_files

- `~/Desktop/AI-Memory-Pack/20-projects.md`
- `docs/02_CURRENT_WORKFLOW.md`
- `docs/00_AI_START_HERE.md`
- `docs/roles/UI_UX_START.md`
- `docs/roles/PROGRAMMER_START.md`
- `tasks/index.md`
- `tasks/README.md`

## validation

- Real browser two-day recording through formal player flow.
- Screenshot and video saved under `output/playwright/`.
- Console/page errors recorded.
- `npm run check:all` if code changes are made.

## commit_plan

- message: `test: record two-day daily flow`

## collaboration

lead_scope: Codex owns two-day playtest recording, root-cause triage, any needed fixes, final evidence, and commit boundary.
specialist_input: 无
tester_pass: independent Playwright tester pass, session `two-day-flow-1782289116530`, video and screenshot under `output/playwright/`.
external_ai_input: 无
lead_decision: Start with evidence-only playtest; expand to implementation files only if the recorded flow exposes a reproducible bug.

## evidence

- Root cause found during recording: battle page top `流程` link used bare `daily-flow.html`, dropping `runtime=http&sessionId=...` and switching the player into a different session after battle.
- Fix: `web/js/main.js` now computes `dailyFlowHref()` from the current URL query and applies it through `setDailyFlowNavHref()` before player clicks.
- TDD red: `node --test tests/unit/ui_combat_layout_contract.test.cjs` failed on missing query-preserving daily-flow nav contract.
- TDD green: `node --test tests/unit/ui_combat_layout_contract.test.cjs` passed.
- Full validation: `npm run check:all` passed.
- Real browser two-day recording passed from daily-flow through normal battle page entries and back to daily-flow, ending at Day 3 route choice.
- Recording session: `two-day-flow-1782289116530`.
- Video: `output/playwright/two-day-flow-recording/page@cfb5f0308557096fb62eb38b5a1baef1.webm`.
- Final screenshot: `output/playwright/two-day-flow-recording-final.png`.
- Evidence JSON: `output/playwright/two-day-flow-recording.json`.
- Console/page errors: `[]`.
- Main-thread screenshot review: final page shows Day 3 morning route choice, D1/D2 marked done in cross-day run, console count 0, no obvious layout break or missing state.
