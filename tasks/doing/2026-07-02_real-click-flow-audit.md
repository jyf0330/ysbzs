# 2026-07-02_real-click-flow-audit

task_id: 2026-07-02_real-click-flow-audit
type: browser tester pass / bug triage
status: READY_TO_MERGE
owner: Codex
worktree: shared-worktree

## Goal

按真人点击按钮走正常游戏流程，先记录可见错误；错误记录超过 5 个后再进入修复代码。

## Scope

- 只通过正式浏览器页面和玩家可触发按钮/棋盘点击操作流程。
- 巡检优先使用 `http://127.0.0.1:4173/normal-game.html?runtime=http`，避免把 stale `web/js/local-engine.js` 当成当前源码事实。
- 先记录错误，不修改实现文件；若错误数超过 5 个，再重新做冲突检查、根因调查和 TDD 修复。
- 不更新 `tasks/index.md`，因为当前仍由旧 replay 任务独占。

## related_files

- `tasks/doing/2026-07-02_real-click-flow-audit.md`
- `output/playwright/real-click-flow-*.png`
- `output/playwright/real-click-flow-*.json`

## write_scopes

- file: `tasks/doing/2026-07-02_real-click-flow-audit.md`
  scope: 本任务卡全文
  mode: direct
- file: `output/playwright/real-click-flow-*.png`
  scope: 本轮真实点击巡检截图证据
  mode: direct
- file: `output/playwright/real-click-flow-*.json`
  scope: 本轮真实点击巡检步骤、状态、console 与错误记录
  mode: direct

## shared_file_policy

- `output/playwright/` 可由 tester pass 写入；本任务使用 `real-click-flow-*` 前缀避免覆盖其他任务证据。
- 不修改 `web/normal-game.*`、`web/js/main.js`、`src/core/*`、`src/uiAdapter*` 或测试文件，除非错误数超过 5 个并重新占用对应写入范围。

## exclusive_files

- 无

## read_files

- `AGENTS.md`
- `CLAUDE.md`
- `docs/00_AI_START_HERE.md`
- `docs/02_CURRENT_WORKFLOW.md`
- `docs/roles/UI_UX_START.md`
- `docs/roles/PROGRAMMER_START.md`
- `tasks/index.md`
- `tasks/README.md`
- `tasks/doing/2026-06-30_normal-game-three-scenes.md`
- `~/Desktop/AI-Memory-Pack/00-tools.md`
- `~/Desktop/AI-Memory-Pack/10-workflows.md`
- `~/Desktop/AI-Memory-Pack/20-projects.md`

## validation

- pass: 4173 `runtime=http` normal-game real-click pass opened `http://127.0.0.1:4173/normal-game.html?runtime=http&sessionId=real-click-flow-1783090000001&seed=real-click-flow-20260702`; clicked 保存、菜单、规则自测、夜市商人、购买、下阵/上阵、刷新商品、离开商店、读取、继续路线到战斗、iframe 棋盘我方单位、空格移动、我方全部出击. Console errors 0; page errors 0. Report: `/Users/ywh/Documents/ysbzs/output/playwright/real-click-flow-2026-07-02T15-52-52-907Z-report.json`.
- screenshot reviewed by Lead: `/Users/ywh/Documents/ysbzs/output/playwright/real-click-flow-2026-07-02T15-52-52-907Z-11-after-all-out.png`; battle scene, formal iframe board, detail panel, action blocks, and buttons are visible with no obvious overlap/missing state.
- recorded warning: `智能调整站位` existed but was disabled in the `runtime=http` battle-control pass after the prior board move; error count stayed below the user's >5 repair threshold, so no code fix was started.
- pass: default normal-game entry real-click pass opened `http://127.0.0.1:4173/normal-game.html?sessionId=real-click-default-1783094050610&seed=real-click-default-20260702`; clicked 保存、菜单、规则自测、夜市商人、购买、刷新商品、离开商店、读取、继续路线到战斗、iframe 棋盘我方单位、我方全部出击. Issues 0; console errors 0; page errors 0. Report: `/Users/ywh/Documents/ysbzs/output/playwright/real-click-flow-default-2026-07-02T15-54-10-600Z-report.json`.
- screenshot reviewed by Lead: `/Users/ywh/Documents/ysbzs/output/playwright/real-click-flow-default-2026-07-02T15-54-10-600Z-08-battle-parent.png`; normal-game battle shell hosts the formal battle iframe with 64-cell board and visible combat controls, no obvious overlap/missing state.
- pass visible rerun for user review: headed Chrome/Chromium slow-click pass opened `http://127.0.0.1:4173/normal-game.html?sessionId=visible-real-click-1783017822382&seed=visible-real-click-20260703`; clicked 保存、菜单、规则自测、夜市商人、购买、下阵/上阵、刷新商品、离开商店、读取、继续路线到战斗、iframe 我方单位、我方全部出击, then held the browser on the final battle view for 45 seconds. Issues 0; console errors 0; page errors 0. Report: `/Users/ywh/Documents/ysbzs/output/playwright/visible-real-click-2026-07-02T18-43-42-381Z-report.json`.
- screenshot reviewed by Lead after visible rerun: `/Users/ywh/Documents/ysbzs/output/playwright/visible-real-click-2026-07-02T18-43-42-381Z-11-11-after-all-out.png`; normal-game page and embedded formal board remained visible, detail panel showed post-action warning text, and no obvious overlap/missing state was observed.
- not run: implementation tests, because this pass did not modify implementation code and the recorded issue count did not exceed 5.

## commit_plan

- auto_commit: no; this is a tester pass in a dirty multi-task worktree.

## collaboration

- lead_scope: Real browser flow audit and bug recording only.
- specialist_input: 无
- tester_pass: TEST_SUBTHREAD_UNAVAILABLE; Lead ran equivalent Playwright real-click tester passes from terminal, including a headed visible slow-click rerun for user review, saved screenshots/reports under `output/playwright/real-click-flow-*` and `output/playwright/visible-real-click-*`.
- external_ai_input: 无
- lead_decision: Record first, repair only if more than 5 distinct errors are found; current count is 0 errors on default entry and 1 warning on `runtime=http`, so no repair pass was started.
