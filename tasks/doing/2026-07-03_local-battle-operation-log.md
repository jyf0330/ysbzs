# 2026-07-03_local-battle-operation-log

task_id: 2026-07-03_local-battle-operation-log
type: debug-tooling
status: READY_TO_MERGE
owner: Codex
branch: shared-worktree

## Goal

给本地浏览器玩家战斗操作增加临时记录，方便排查“第一次战斗伤害不对”这类问题；上线前可整块移除。

## related_files

- `web/js/runtime-client.js`
- `tools/run_ui_server.cjs`
- `tests/unit/player_battle_operation_recorder.test.cjs`
- `tasks/doing/2026-07-03_local-battle-operation-log.md`

## write_scopes

- file: `web/js/runtime-client.js`
  scope: local browser battle-operation recorder helpers and `action()` wrapper logging
  mode: direct
- file: `tools/run_ui_server.cjs`
  scope: local `/api/action` battle-operation JSONL file logging
  mode: direct
- file: `tests/unit/player_battle_operation_recorder.test.cjs`
  scope: focused runtime-client localStorage recorder tests
  mode: direct
- file: `tasks/doing/2026-07-03_local-battle-operation-log.md`
  scope: task status and validation evidence
  mode: direct

## exclusive_files

- 无

## shared_file_policy

`web/js/runtime-client.js` is only listed as read context by existing battle-debug / command-console tasks. `tools/run_ui_server.cjs` has no current ACTIVE exclusive owner. This task does not touch `src/uiAdapter.cjs`, `web/js/main.js`, or core reducer semantics. `web/js/local-engine.js` remains a shared generated artifact and is not a primary edit target.

## read_files

- `AGENTS.md`
- `docs/00_AI_START_HERE.md`
- `docs/02_CURRENT_WORKFLOW.md`
- `docs/roles/PROGRAMMER_START.md`
- `tasks/index.md`
- `tasks/README.md`
- `tasks/doing/*.md`
- `web/js/runtime-client.js`
- `tools/run_ui_server.cjs`
- `tests/unit/singleplayer_runtime.test.cjs`

## validation

- pass: `node --test tests/unit/player_battle_operation_recorder.test.cjs` (4/4)
- pass: `node --test tests/unit/singleplayer_runtime.test.cjs` (4/4)
- pass: `node --input-type=module --check < web/js/runtime-client.js`
- pass: `node --check tools/run_ui_server.cjs`
- pass: `node tools/build_local_engine_bundle.cjs`; no `web/js/local-engine.js` diff after rebuild.
- pass: `npm run test:unit` (168/168)
- pass: `git diff --check -- web/js/runtime-client.js tools/run_ui_server.cjs tests/unit/player_battle_operation_recorder.test.cjs tasks/doing/2026-07-03_local-battle-operation-log.md`
- pass: browser localStorage verification on current 4173 page: opened `http://127.0.0.1:4173/?runtime=http&sessionId=local-battle-log-1783020230636`, clicked `#prep-open-btn`, `#prep-ready-btn`, then `#all-out-btn`; `localStorage.ysbzs.localBattleOperations.v1` contained `START_BATTLE` and `RUN_PLAYER_ALL_OUT`, console/page errors 0, screenshot `/Users/ywh/Documents/ysbzs/output/playwright/local-battle-operation-log-2026-07-02T19-23-50-635Z.png`.
- pass: browser JSONL file verification on temporary current-code server `PORT=4174 node tools/run_ui_server.cjs`: opened `http://127.0.0.1:4174/?runtime=http&sessionId=jsonl-battle-log-1783020343078`, clicked `#prep-open-btn`, `#prep-ready-btn`, then `#all-out-btn`; JSONL file `/Users/ywh/Documents/ysbzs/output/battle-operation-logs/jsonl-battle-log-1783020343078.jsonl` contained `START_BATTLE`, `RUN_PLAYER_ALL_OUT`, and `END_PLAYER_TURN`; console/page errors 0, screenshot `/Users/ywh/Documents/ysbzs/output/playwright/local-battle-operation-jsonl-2026-07-02T19-25-43-077Z.png`.

## commit_plan

- message: `debug: record local battle operations`
- auto_commit: no; shared worktree has many unarchived READY/BLOCKED task cards, leave final grouping to git-c / Lead.

## collaboration

- lead_scope: Browser runtime-client local operation recording only.
- specialist_input: 无
- tester_pass: TEST_SUBTHREAD_UNAVAILABLE; Lead ran real-browser passes through formal player buttons on 4173 and a temporary current-code 4174 server. Screenshots and JSONL evidence recorded above.
- external_ai_input: 无
- lead_decision: Record at the `/api/action` runtime-client boundary for browser localStorage and in the local HTTP server for JSONL files, so normal-game and formal battle pages share one temporary local debug log without modifying core state or UI rendering semantics.
