# 2026-06-11 Move Target Risk Preview

task_id: move-target-risk-preview
status: DONE
owner: Codex
created: 2026-06-11

## Goal

给棋盘可落点增加敌方伤害模拟预览：选中或正在操作我方宠物时，每个合法落点都要按“该宠物移动到此格后”模拟敌方当前可攻击结果，并在棋盘上显示对应受伤风险。

## Scope

- 核心层提供纯状态的落点风险网格计算。
- UI Adapter 暴露 `moveRiskGrid`，棋盘格携带对应风险对象。
- 棋盘 UI 在可落点上显示预计受伤数字，并保持核心层无 DOM。
- 不处理投稿工具页面的现有未提交改动。

## Related Files

- `src/core/battle/planning.cjs`
- `src/core/battle.cjs`
- `src/uiAdapter.cjs`
- `tests/ui_adapter.test.cjs`
- `web/js/main.js`
- `web/ux-app.js`
- `web/ux-app.css`
- `tasks/index.md`
- `tasks/done/2026-06-11_move-target-risk-preview.md`

## Commit Plan

commit: `feat(ui): preview enemy damage on move targets`

## Verification

- [x] RED: focused test fails before implementation (`battle.buildMoveRiskGrid is not a function`)
- [x] `node --test tests/ui_adapter.test.cjs`
- [x] `node tests/run_all_tests.cjs`
- [x] `npm run check:all`
- [x] `npm run test:coverage`
- [x] UI/browser verification for move target risk badges (`riskGrid=35`, `riskBadges=35`, sample `受1`)

## Result

- 核心新增 `buildMoveRiskGrid`，按每个合法落点沙盒模拟敌方寻敌和伤害。
- ViewModel 顶层暴露 `moveRiskGrid`，棋盘格暴露 `moveRisk`。
- UI 可落点显示 `受X` 风险数字，致命落点使用更明显的红色风险态。
