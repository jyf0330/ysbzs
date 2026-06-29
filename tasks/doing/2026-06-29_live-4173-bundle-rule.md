# 2026-06-29_live-4173-bundle-rule

task_id: 2026-06-29_live-4173-bundle-rule
type: workflow
status: BLOCKED
owner: Codex
branch: codex/bazaar-day1-day3-route

## Goal

把 `127.0.0.1:4173` 作为默认 live 验收端口写入项目规则，并明确浏览器端行为改动后必须重建 `web/js/local-engine.js` 才算在该端口生效。

## Scope

- 更新项目入口规则，不改实现代码。
- 不更新 `tasks/index.md`，因为当前被 replay 任务独占。

## related_files

- `AGENTS.md`
- `docs/00_AI_START_HERE.md`
- `tasks/doing/2026-06-29_live-4173-bundle-rule.md`

## exclusive_files

- `AGENTS.md`
- `docs/00_AI_START_HERE.md`

## read_files

- `docs/02_CURRENT_WORKFLOW.md`
- `tasks/index.md`
- `tasks/README.md`
- `tasks/doing/2026-06-28_replay-command-stream.md`
- `tasks/doing/2026-06-29_auto-position-boss-priority.md`
- `~/Desktop/AI-Memory-Pack/20-projects.md`

## validation

- pass: `git diff --check -- AGENTS.md docs/00_AI_START_HERE.md tasks/doing/2026-06-29_live-4173-bundle-rule.md`
- not run: code test suite, because this task only changes workflow documentation.

## commit_plan

- message: `workflow: require 4173 bundle refresh for browser behavior`
- auto_commit: blocked because `tasks/index.md` is exclusive to `2026-06-28_replay-command-stream` and the worktree also contains the separate uncommitted boss-priority implementation task.

## collaboration

- lead_scope: Project workflow rule only.
- specialist_input: 无
- tester_pass: 无，规则文档改动，无 UI 行为改动。
- external_ai_input: 无
- lead_decision: Add the rule to both `AGENTS.md` and `docs/00_AI_START_HERE.md`: after any source change that affects browser behavior, rebuild `web/js/local-engine.js` with `node tools/build_local_engine_bundle.cjs`, refresh or restart the `127.0.0.1:4173` live server as needed, and validate through the official player flow before claiming the page is fixed. If bundle/server refresh is blocked by file leases, explicitly report `LIVE_4173_NOT_REFRESHED`.
