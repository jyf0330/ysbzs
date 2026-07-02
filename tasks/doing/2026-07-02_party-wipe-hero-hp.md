# 2026-07-02_party-wipe-hero-hp

task_id: 2026-07-02_party-wipe-hero-hp
type: bugfix
status: BLOCKED
owner: Codex
branch: shared-worktree

## Goal

我方宠物全部死亡时，当局战斗立即失败结算，扣玩家英雄 10 HP 并进入下一个时间点；如果玩家英雄死亡，则游戏结束。

## Scope

- 调整核心战斗失败结算：我方宠物全灭触发战斗失败，失败惩罚落到玩家英雄 HP。
- 路线战斗失败后，如果玩家英雄仍存活则继续推进路线时间点；如果英雄死亡则进入终局。
- 路线进下一场战斗时不再把玩家英雄回满血，保留跨时间点 HP。
- 不改 UI 布局；ViewModel 继续读取现有 leaders.player。

## related_files

- `src/core/battle.cjs`
- `src/core/battle/lifecycle.cjs`
- `src/core/battle/resolution.cjs`
- `src/core/dayRoute.cjs`
- `src/scenarios/fullDay.cjs`
- `src/uiAdapterFlowCommands.cjs`
- `tests/leader_boss_rules.test.cjs`
- `tests/ui_adapter.test.cjs`
- `tests/run_all_tests.cjs`
- `tasks/doing/2026-07-02_party-wipe-hero-hp.md`

## exclusive_files

- `src/core/battle.cjs`
- `src/core/dayRoute.cjs`

## read_files

- `AGENTS.md`
- `docs/00_AI_START_HERE.md`
- `docs/02_CURRENT_WORKFLOW.md`
- `docs/roles/PROGRAMMER_START.md`
- `tasks/index.md`
- `tasks/README.md`
- `tasks/doing/*.md`
- `src/core/state.cjs`
- `src/core/reducer.cjs`
- `src/uiAdapter.cjs`

## validation

- pass: `node --test --test-name-pattern 'LB02|LB10|LB11' tests/leader_boss_rules.test.cjs`
- pass: `node tests/run_all_tests.cjs` (67/67)
- pass: `node --test tests/unit/battle_module_split.test.cjs`
- pass: `npm run test:ui`
- pass: `npm run check:all`
- blocked: `LIVE_4173_NOT_REFRESHED` because `web/js/local-engine.js` is already listed by unarchived ACTIVE/BLOCKED task cards; this pass does not rebuild or stage the generated browser bundle.

## commit_plan

- message: `fix(combat): apply hero hp penalty on party wipe`
- auto_commit: blocked by existing unarchived task-card overlap on `src/core/battle.cjs`, `web/js/local-engine.js`, `src/scenarios/fullDay.cjs`, and `tasks/index.md`; output Commit Plan instead of committing unless ownership is reconciled.

## collaboration

- lead_scope: Core combat and route outcome rules only.
- specialist_input: 无
- tester_pass: 无，核心规则改动；如刷新浏览器 bundle 被旧任务租约阻塞，记录 `LIVE_4173_NOT_REFRESHED`。
- external_ai_input: 无
- lead_decision: Implement the new loss model in core rules, keep UI passive through existing leader ViewModel, preserve high-HP full-run test coverage as a test-only scenario override, and avoid touching generated browser files until task ownership is reconciled.

## overlap_note

- `src/core/battle.cjs` is already listed by `2026-06-30_round-placement-preview-reset`.
- `web/js/local-engine.js` is listed by several unarchived tasks, so this task will not refresh or stage the live bundle in this pass unless the file lease is reconciled.
- `tasks/index.md` is exclusive to `2026-06-28_replay-command-stream`; this task card is added without editing the index.
