# 2026-06-30_main-page-hub

task_id: 2026-06-30_main-page-hub
type: ui-navigation
status: READY_TO_MERGE
owner: Codex
branch: shared-worktree

## Goal

新增一个主入口大厅，把当前项目所有主要页面按“镇/地点”集合到一张入口图里，玩家或调试者点击哪个镇就进入哪个页面。

## Scope

- 新增独立 `web/main.html`，作为页面集合/城镇入口页。
- 新增 `web/main.css`，做清晰、可读、响应式的入口布局。
- 不修改 `web/index.html`，因为当前战斗页已有 READY_TO_MERGE 任务占用。
- 入口覆盖正常游戏、正式战斗页、战斗调试、命令控制台、每日流程、纸面战斗、谜题求解、谜题投稿等现有页面。
- 增加静态合同测试，防止入口漏掉关键页面。

## related_files

- `web/main.html`
- `web/main.css`
- `tests/unit/main_page_hub.test.cjs`
- `tasks/doing/2026-06-30_main-page-hub.md`

## exclusive_files

- 无

## read_files

- `AGENTS.md`
- `docs/02_CURRENT_WORKFLOW.md`
- `docs/00_AI_START_HERE.md`
- `docs/roles/UI_UX_START.md`
- `tasks/index.md`
- `tasks/README.md`
- `tasks/doing/2026-06-30_normal-game-three-scenes.md`
- `tasks/doing/2026-06-30_battle-debug-route-page.md`
- `tasks/doing/2026-06-30_command-console-page.md`
- `web/index.html`
- `web/normal-game.html`
- `web/battle-debug.html`
- `web/command-console.html`

## validation

- pass: `node --test tests/unit/main_page_hub.test.cjs`
- pass: `git diff --check -- web/main.html web/main.css tests/unit/main_page_hub.test.cjs tasks/doing/2026-06-30_main-page-hub.md`
- pass: `curl --noproxy '*' -sS -I http://127.0.0.1:4173/main.html` returned HTTP 200.
- pass: `node tests/run_all_tests.cjs` (67/67)
- pass: 4173 real browser flow at `http://127.0.0.1:4173/main.html`: main hub title `主入口`, town entry count 8, links include `normal-game.html`, `index.html`, `daily-flow.html`, `paper-battle.html`, `battle-debug.html`, `command-console.html`, `puzzle-solver.html`, and `puzzle-submission.html`; clicked `桃源镇` / normal-game entry and landed on `http://127.0.0.1:4173/normal-game.html?runtime=http` with title `正常游戏流程`; console/page errors 0.
- screenshot reviewed by Lead: `/Users/ywh/Documents/ysbzs/output/playwright/main-page-hub-4173-2026-06-30T14-42-05.png`; page clearly groups game towns and debug towns, top quick links are visible, no obvious overlap or missing entry.

## commit_plan

- message: `feat(ui): add main page hub`
- auto_commit: no; shared worktree has multiple unrelated dirty READY_TO_MERGE task groups.

## collaboration

- lead_scope: Standalone entry hub only.
- specialist_input: 无
- tester_pass: `TEST_SUBTHREAD_UNAVAILABLE`; equivalent browser pass run via Playwright from terminal, screenshot `/Users/ywh/Documents/ysbzs/output/playwright/main-page-hub-4173-2026-06-30T14-42-05.png`, DOM/navigation assertions matched, console/page errors 0.
- external_ai_input: 无
- lead_decision: Use a new standalone hub page instead of changing `web/index.html`, so existing battle-page tasks remain isolated.
