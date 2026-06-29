# 2026-06-29_auto-position-boss-priority

task_id: 2026-06-29_auto-position-boss-priority
type: bugfix
status: BLOCKED
owner: Codex
branch: codex/bazaar-day1-day3-route

## Goal

调整智能站位/自动规划评分：除非本轮预计能直接击杀 Boss，否则小怪存活时不得优先打 Boss。

## Scope

- 修改核心规划评分，不改 UI。
- 重建 `web/js/local-engine.js`，确保 `http://127.0.0.1:4173/` live 页面吃到核心规划改动。
- 增加单元测试覆盖 Boss 不可击杀时优先小怪、Boss 可击杀时允许优先 Boss。

## related_files

- `src/core/battle/planning.cjs`
- `web/js/local-engine.js`
- `tests/unit/auto_position_boss_priority.test.cjs`
- `tasks/doing/2026-06-29_auto-position-boss-priority.md`

## exclusive_files

- 无

## read_files

- `docs/00_AI_START_HERE.md`
- `docs/02_CURRENT_WORKFLOW.md`
- `docs/roles/PROGRAMMER_START.md`
- `tasks/index.md`
- `tasks/README.md`
- `tasks/doing/2026-06-28_replay-command-stream.md`
- `src/core/battle.cjs`
- `src/core/battle/planning.cjs`
- `tests/unit/auto_position_overkill.test.cjs`

## validation

- RED confirmed: `node --test tests/unit/auto_position_boss_priority.test.cjs` failed before implementation with `'right' !== 'left'`.
- pass: `node --test tests/unit/auto_position_boss_priority.test.cjs`
- pass: `node --test tests/unit/auto_position_overkill.test.cjs`
- pass: `node tests/run_all_tests.cjs` (64/64)
- pass: default adapter smoke after `START_BATTLE` + `AUTO_POSITION_HEROES`: plan summary reports `Boss伤害0` and directions target `enemy_pal_002_4` instead of `enemy_boss`.
- pass: `git diff --check -- src/core/battle/planning.cjs tests/unit/auto_position_boss_priority.test.cjs tasks/doing/2026-06-29_auto-position-boss-priority.md`
- pass: `node tools/build_local_engine_bundle.cjs`
- pass: 4173 formal browser flow after bundle refresh: opened `http://127.0.0.1:4173/?codexBossPriorityFixed=20260629c`, clicked `#etb` -> `#auto-position-btn` -> `#all-out-btn`. Evidence: `web/js/local-engine.js` contains `nonlethalBossDeprioritized`; damage lines to `虎先锋` = 0; damage lines to non-Boss enemy = 6; screenshot `/Users/ywh/Documents/ysbzs/output/playwright/boss-priority-live-4173-fixed-after-allout.png`; console/page errors = 0.
- superseded evidence: `/Users/ywh/Documents/ysbzs/output/playwright/boss-priority-live-4173-after-allout.png` was captured before rebuilding `web/js/local-engine.js` and shows the old bug; do not use it as passing evidence.
- blocked: `npm run check:all` passes `npm test` and `check:architecture`, then fails in existing `CSV08 策划总表可无损导出全部程序 CSV` because `xlsx/ysbzs_master.xlsx` is missing CSV source sheets. This matches the existing replay task blocker and is outside this task's files.

## commit_plan

- message: `fix(combat): deprioritize nonlethal boss targeting`
- auto_commit: blocked by unrelated CSV08 workbook failure and `tasks/index.md` being exclusive to `2026-06-28_replay-command-stream`; do not update index or commit in this pass. `web/js/local-engine.js` is also listed by the replay task, but the user explicitly required the 4173 live port to be made current; keep this generated bundle grouped with the boss-priority closeout and do not stage until task ownership is reconciled.

## collaboration

- lead_scope: Core smart-positioning and auto-planning scoring plus generated local browser bundle refresh.
- specialist_input: 无
- tester_pass: 4173 live browser pass after bundle rebuild. Official button flow `开始战斗 -> 智能调整站位 -> 我方全部出击`; screenshot `/Users/ywh/Documents/ysbzs/output/playwright/boss-priority-live-4173-fixed-after-allout.png`; Boss damage line count 0; console errors 0.
- external_ai_input: 无
- lead_decision: Nonlethal Boss damage is removed from smart-positioning/auto-planning priority while any non-Boss enemy is alive. Boss damage regains priority when the planned hits kill Boss directly, or when no non-Boss enemies remain.
