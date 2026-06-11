# 2026-06-11 Sandbox Team Placement Preview

task_id: sandbox-team-placement-preview
status: DONE
owner: Codex
created: 2026-06-11

## Goal

把棋盘预览改成统一沙盒来源：任何我方宠物位置变化或 hover 候选落点，都从真实状态克隆出沙盒，应用整队站位后在沙盒内重算敌方受伤、我方受伤、攻击方向、影响格、元素和预计伤害，再只把派生预览数据返回 UI。

## Scope

- 核心层新增整队站位预览沙盒接口。
- `buildMoveRiskGrid` 的候选落点携带候选态完整预览，而不只带我方风险。
- UI hover 可落点时使用候选态 `previewGrid` / `teamRiskGrid` 覆盖当前显示。
- 不触碰投稿工具页面的未提交改动。

## Related Files

- `src/core/battle/planning.cjs`
- `src/core/battle.cjs`
- `src/uiAdapter.cjs`
- `tests/ui_adapter.test.cjs`
- `web/js/main.js`
- `web/ux-app.js`
- `tasks/index.md`
- `tasks/done/2026-06-11_sandbox-team-placement-preview.md`

## Commit Plan

commit: `fix(ui): drive placement preview from sandbox`

## Verification

- [x] RED: focused test fails before implementation (`候选落点需要携带沙盒 previewGrid`)
- [x] `node --test tests/ui_adapter.test.cjs`
- [x] `node tests/run_all_tests.cjs`
- [x] `npm run check:all`
- [x] `npm run test:coverage`
- [x] Browser verification for hover sandbox preview (`enemyHits 0 -> 1`, hovered `0,6`; UI20 covers candidate damage `6`)

## Result

- 候选落点现在从 cloned sandbox 里同时生成 `previewGrid` 和 `teamRiskGrid`。
- hover 可落点时，棋盘攻击/影响格、命中敌人、元素与预计伤害显示会切换到候选态沙盒结果。
- UI 不修改真实核心状态，只读取候选态派生数据。
