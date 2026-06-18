# 2026-06-18_reset-action-lock-next-round

task_id: 2026-06-18_reset-action-lock-next-round
type: combat core / board interaction
status: DONE

## Goal

修复我方单位上一回合释放行动块后，进入新回合仍被 `hasAttacked` 锁住导致正式界面无法移动的问题。直接结束回合与怪物行动流程不应影响下一回合的移动资格。

## Scope

- 核心回合开始重置本回合行动锁。
- 保持同一回合“行动后不能移动”的规则不变。
- 补核心回归测试。
- 刷新正式本地运行包 `web/js/local-engine.js`。
- 用 `4173` 正式界面真实点击流程验证下一回合可移动。

## related_files

- `src/core/battle.cjs`
- `web/js/main.js`
- `web/js/local-engine.js`
- `tests/unit/core_focused_battle.test.cjs`
- `tests/unit/ui_module_render_cache.test.cjs`
- `docs/10_CHANGELOG.md`
- `output/playwright/reset-action-lock-next-round-2026-06-18.png`
- `tasks/index.md`
- `tasks/doing/2026-06-18_reset-action-lock-next-round.md`

## validation

- RED/GREEN: `node --test tests/unit/core_focused_battle.test.cjs`
- Bundle: `node tools/build_local_engine_bundle.cjs`
- Formal UI gate on `http://127.0.0.1:4173/index.html?runtime=local`: real click flow reaches next player round and acted unit can move.
- `npm run check:all`

## commit_plan

message: `fix(combat): reset action movement lock each round`

## collaboration

lead_scope: Reset per-round action movement lock and validate movement through formal UI.
specialist_input: 无
tester_pass: pending
external_ai_input: 无
lead_decision: pending

## verification_results

- Diagnosis: 用户判断正确，问题不是必须先点“我方全部出击”。直接点“结束回合”会进入 `round_end`，再点“怪物行动”会触发 `START_NEXT_ROUND`；真正根因是 `startNextRound` 只清了 `actionSlotsUsed/actionApSpent`，没有清 `hasAttacked`，而 `moveHero` 用 `hasAttacked` 拦截移动。
- RED: `node --test tests/unit/core_focused_battle.test.cjs` failed `CB04 startNextRound clears attack movement lock but keeps same-round lock` because `hero.hasAttacked` stayed `true` after `startNextRound`.
- GREEN: `node --test tests/unit/core_focused_battle.test.cjs` passed 4/4.
- RED/GREEN UI console guard: `node --test tests/unit/ui_module_render_cache.test.cjs` failed until `unitPositionLocked(null)` returned false; passed 14/14 after the guard.
- Bundle: `node tools/build_local_engine_bundle.cjs` rebuilt `web/js/local-engine.js`.
- Formal UI gate on fixed port `4173`: Playwright clicked `新开一天` -> `开始战斗` -> first hero -> first action block -> `释放` -> `结束回合` -> `怪物行动` -> clicked a visible `.move-target`.
- Formal UI assertions: same-round hint was `融焰娘 本回合已行动，位置锁定；可选择其他英雄或点行动槽继续。`; round 2 phase was `player_turn`; acted hero slots were reset; `.move-target` count was 54 before moving; final event included `MOVE_HERO` and no stale position-lock block.
- Screenshot: `output/playwright/reset-action-lock-next-round-2026-06-18.png`
- Console errors: `[]`
- Main-thread screenshot review: screenshot shows the formal 4173 interface at battle 2/10 in player turn, with 融焰娘 moved from R7C2 to R1C1 and no obvious layout break or missing state.
- Full validation: `npm run check:all` passed.

## commit_status

- pending commit
