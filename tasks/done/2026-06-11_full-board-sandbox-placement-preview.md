# 2026-06-11 Full Board Sandbox Placement Preview

task_id: full-board-sandbox-placement-preview
status: DONE
owner: Codex
created: 2026-06-11

## Goal

修正棋盘预览来源：移动任意我方宠物或 hover 候选落点后，必须在克隆沙盒里按当前整盘站位真实执行行动结算，再把沙盒后的单位、棋盘格、元素、伤害、事件和差异数据返回给 UI 预览；不能只依赖单只宠物的估算预览。

## Scope

- `buildMoveRiskGrid` 候选落点返回沙盒行动后的棋盘格、单位、事件和 diff。
- UI hover 候选落点时用沙盒棋盘/单位投影渲染整盘结果，同时保留已有攻击/影响格预览。
- 新增 focused test 覆盖“候选落点真实行动会改变敌方 HP 与棋盘元素”。
- 不触碰投稿工具页面的未提交改动。

## Related Files

- `src/core/battle/planning.cjs`
- `src/core/battle.cjs`
- `tests/ui_adapter.test.cjs`
- `web/js/main.js`
- `web/ux-app.js`
- `tasks/index.md`
- `tasks/doing/2026-06-11_full-board-sandbox-placement-preview.md`

## Commit Plan

commit: `fix(ui): project full sandbox placement preview`

## Verification

- [x] RED: focused UI adapter test fails before implementation (`sandboxActionOk` was `undefined`)
- [x] `node --test --test-timeout=60000 tests/ui_adapter.test.cjs`
- [x] `node tests/run_all_tests.cjs`
- [x] `npm run check:all`
- [x] Browser smoke on `http://127.0.0.1:4173` (64 cells, 4 heroes, 56 move targets, no console error)
- [x] `npm run test:coverage`
- [x] `git diff --check -- src/core/battle.cjs src/core/battle/planning.cjs tests/ui_adapter.test.cjs web/ux-app.js web/js/main.js tasks/index.md tasks/doing/2026-06-11_full-board-sandbox-placement-preview.md`

## Notes

- Unrelated dirty files are the puzzle submission tool/page files already present in the workspace.
- Browser default battle state did not expose a damage-producing `moveRiskGrid` candidate for visual hover proof; the regression is covered by UI21 at the adapter/core level and by browser smoke for DOM health.

## Result

- `buildMoveRiskGrid` now clones the current board, applies the candidate team placement, executes slot 0 through the existing `useActionSlot` sandbox path during `player_turn`, then returns sandbox cells, units, events, cell diffs and unit diffs.
- Hover rendering can project `sandboxBoardCells` and `sandboxUnits` onto the board without mutating real state.
- Existing `previewGrid` and `teamRiskGrid` remain available for attack/impact overlays and team risk labels.
