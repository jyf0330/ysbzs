# 2026-06-29_auto-enemy-turn-flow

task_id: 2026-06-29_auto-enemy-turn-flow
type: ui-flow
status: READY_TO_MERGE
owner: Codex
branch: codex/bazaar-day1-day3-route

## Goal

正式战斗 UI 中，我方完成出击后自动执行敌方行动并进入下一玩家回合；保留 `END_PLAYER_TURN` / `RUN_MONSTER_TURN` / `START_NEXT_ROUND` 等分步公开命令，供未来联机和调试继续使用。

## Scope

- 只改正式浏览器 UI 的流程编排，不改核心战斗命令语义。
- `我方全部出击` 后自动串行执行公开命令：`RUN_PLAYER_ALL_OUT` -> `END_PLAYER_TURN` -> 按阶段继续 `RUN_MONSTER_TURN` / `START_NEXT_ROUND`，直到回到 `player_turn` 或进入 `battle_end`。
- 顶部玩家回合按钮在 `player_turn` 也走同一自动推进链。
- 敌方/下一回合分步按钮保留，作为异常状态、调试和未来联机入口。

## related_files

- `web/js/main.js`
- `tests/unit/manual_flow_undo_contract.test.cjs`
- `tasks/doing/2026-06-29_auto-enemy-turn-flow.md`

## exclusive_files

- `web/js/main.js`

## read_files

- `AGENTS.md`
- `docs/02_CURRENT_WORKFLOW.md`
- `docs/00_AI_START_HERE.md`
- `docs/roles/PROGRAMMER_START.md`
- `docs/roles/UI_UX_START.md`
- `tasks/index.md`
- `tasks/README.md`
- `tasks/doing/2026-06-28_replay-command-stream.md`
- `tasks/doing/2026-06-29_auto-position-boss-priority.md`
- `tasks/doing/2026-06-29_live-4173-bundle-rule.md`
- `src/core/reducer.cjs`
- `src/core/battle.cjs`
- `src/uiAdapter.cjs`
- `src/uiAdapterManualFlowPreview.cjs`
- `web/index.html`
- `web/js/main.js`
- `tests/ui_adapter.test.cjs`
- `tests/unit/manual_flow_undo_contract.test.cjs`

## validation

- pass: module syntax check `node --input-type=module --check < web/js/main.js`
- pass: `node tests/run_all_tests.cjs` (64/64)
- pass: `node --test tests/unit/manual_flow_undo_contract.test.cjs` (3/3)
- pass: `git diff --check -- web/js/main.js tasks/doing/2026-06-29_auto-enemy-turn-flow.md`
- pass after test contract update: `git diff --check -- web/js/main.js tests/unit/manual_flow_undo_contract.test.cjs tasks/doing/2026-06-29_auto-enemy-turn-flow.md`
- pass: 4173 formal browser flow through real buttons at `http://127.0.0.1:4173/?runtime=http&sessionId=auto-enemy-flow-20260629-fixed`: clicked `#etb` to start battle, then clicked `#all-out-btn`; final ViewModel `phase=player_turn`, `round=2`, DOM `#route-progress-label=战斗 2/10`, `#next-step-label=移动/行动`, `#monster-btn.disabled=true`, event types include `PLAYER_TURN_END` and `ROUND_START`, console errors/page errors = 0.
- screenshot reviewed by Lead: `/Users/ywh/Documents/ysbzs/output/playwright/auto-enemy-turn-flow-4173-fixed.png`; visible state is coherent, no obvious overlap/missing state; old pre-fix screenshot `/Users/ywh/Documents/ysbzs/output/playwright/auto-enemy-turn-flow-4173.png` showed an over-advancing bug and is superseded.
- blocked: `npm run check:all` passes `npm test` through unit/ui/full/ops/prediction and passes `check:architecture`, then fails in existing `CSV08 策划总表可无损导出全部程序 CSV` because `xlsx/ysbzs_master.xlsx` is missing CSV source sheets such as `00_maintenance_guide.csv`, `05_events.csv`, `07_relic_blessings.csv`, `09_cross_validation.csv`, `10_initial_roster.csv`, `11_hero_domains.csv`, `12_element_reactions.csv`, `14_quality_multipliers.csv`, `15_summon_trial_questions.csv`, `16_trial_action_plan.csv`, `17_trial_victory_rules.csv`, `18_effect_objects.csv`, `19_triggers.csv`, `20_modifiers.csv`, `21_element_packet_rules.csv`, `22_element_conversion_rules.csv`, `23_trigger_order_rules.csv`, `24_node_schedule.csv`, `25_node_pool.csv`, and `26_encounter_pool.csv`. This matches existing blocked tasks and is outside the UI turn-flow scope.
- note: `tasks/index.md` not updated because it is exclusive to `2026-06-28_replay-command-stream`.
- LIVE_4173_NOT_REFRESHED: `node tools/build_local_engine_bundle.cjs` was not run because it rewrites `web/js/local-engine.js`, which is already dirty and listed by existing blocked replay/boss-priority tasks. This task changes `web/js/main.js`, which the 4173 page loads directly and was verified live.

## commit_plan

- message: `fix(ui): auto advance enemy turn flow`
- auto_commit: blocked by unrelated dirty files and existing task ownership of `tasks/index.md` / `web/js/local-engine.js`; output Commit Plan instead of committing.

## collaboration

- lead_scope: Browser UI flow orchestration only.
- specialist_input: 无
- tester_pass: 4173 real browser pass through official buttons; screenshot `/Users/ywh/Documents/ysbzs/output/playwright/auto-enemy-turn-flow-4173-fixed.png`; DOM/ViewModel assertions matched; console/page errors 0.
- external_ai_input: 无
- lead_decision: Keep low-level turn commands as public protocol, and make the singleplayer UI compose them automatically for the normal play path. The auto chain stops once `START_NEXT_ROUND` returns to `player_turn`; an earlier over-advance to round 3 was caught in browser QA and fixed.
