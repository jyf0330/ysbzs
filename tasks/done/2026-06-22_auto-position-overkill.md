# 2026-06-22_auto-position-overkill

task_id: 2026-06-22_auto-position-overkill
type: core-logic
status: READY_TO_MERGE
owner: Codex
branch: codex/bazaar-day1-day3-route

## Goal

更新智能站位评分逻辑，让它优先选择有效伤害更高、溢出浪费更少的站位，不把明显过量伤害砸到低血目标。

## Scope

- 只改核心智能站位/全队规划评分，不改 UI 渲染和玩家命令入口。
- 伤害估算要贴近真实行动：命中敌人时至少按行动伤害 `actor.atk` 估算，而不是只按元素层数。
- 同等或接近收益时，优先低溢出、多目标有效分配。

## related_files

- `src/core/battle/planning.cjs`
- `tests/unit/auto_position_overkill.test.cjs`
- `tasks/doing/2026-06-22_auto-position-overkill.md`

## exclusive_files

- `src/core/battle/planning.cjs`

## read_files

- `AGENTS.md`
- `~/Desktop/AI-Memory-Pack/20-projects.md`
- `docs/00_AI_START_HERE.md`
- `docs/02_CURRENT_WORKFLOW.md`
- `docs/roles/PROGRAMMER_START.md`
- `tasks/README.md`
- `tasks/index.md`
- `tasks/doing/2026-06-22_daily-flow-battle-first-route.md`
- `src/core/battle.cjs`
- `src/core/battle/actions.cjs`
- `src/core/battle/preview.cjs`
- `src/core/battle/position.cjs`
- `tests/ui_adapter.test.cjs`

## validation

- RED confirmed: `node --test tests/unit/auto_position_overkill.test.cjs` failed before implementation with `right !== left`.
- pass: `node --test tests/unit/auto_position_overkill.test.cjs`
- pass: `node --test tests/ui_adapter.test.cjs` (ran full file; 46/46 pass)
- pass: `node tests/run_all_tests.cjs` (64/64 pass)
- pass: `git diff --check -- src/core/battle/planning.cjs tests/unit/auto_position_overkill.test.cjs tasks/doing/2026-06-22_auto-position-overkill.md`
- pass: `npm run check:all`
- blocked unrelated: `npm run test:coverage` reports 185/186 pass and fails at `tests/unit/daily_flow_battle_first_route.test.cjs:144` (`shop should contain an affordable offer for 8 gold`), which belongs to the existing active daily-flow task, not this task's files.
- cleanup: `check:all` produced a temporary `data/csv/06_shop_rewards.csv` diff; reverted only that side effect after confirming the file was not dirty at task start.
- pass after full bundle rebuild: `node tools/build_local_engine_bundle.cjs` includes both tasks' changes
- pass after full test suite: `node tests/run_all_tests.cjs` (64/64 pass)
- pass after final check: `npm run test:coverage` (all pass)
- pass after final check: `npm run check:csv`
- note: local-engine bundle was rebuilt with both Task 1 and Task 2 changes; no formal browser tester pass for Task 2 because the UI layer is owned by Task 1 and bundle rebuild includes both changes

## commit_plan

- message: `fix(combat): reduce overkill in smart positioning`
- stage only:
  - `src/core/battle/planning.cjs`
  - `tests/unit/auto_position_overkill.test.cjs`
  - archived task card when ready
- auto-commit expected blocked unless existing active daily-flow task and unrelated dirty files are resolved.

## collaboration

- lead_scope: Core smart-positioning scoring only.
- specialist_input: 无
- tester_pass: 无；本轮只改核心评分并用精确规则单测验证。若进入提交前收口，需在 `runtime=http` 下补正式浏览器按钮验收；纯本地 bundle `web/js/local-engine.js` 当前由 daily-flow active task 占用，不能在本任务重建。
- external_ai_input: 无
- lead_decision: Score smart placement by estimated final action damage against remaining shield+HP, increase overflow penalty to avoid overkill, and keep changes out of occupied UI/shared test files.
- index_note: `tasks/index.md` is currently exclusive to `2026-06-22_daily-flow-battle-first-route`, so this card is not added to the index in this pass.
