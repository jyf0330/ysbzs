# 2026-06-11 Team Risk Preview Recompute

task_id: team-risk-preview-recompute
status: DONE
owner: Codex
created: 2026-06-11

## Goal

修补累计站位风险预览：第二只宠物移动后，如果敌方寻敌、攻击路径或命中对象因此变化，第一只已移动宠物的受伤风险也必须基于当前整队站位重新计算并保留显示。

## Scope

- 核心层增加整队受击风险网格计算。
- UI Adapter 暴露累计风险结果，棋盘格保留当前可落点风险，同时单位格显示已移动宠物的当前受击风险。
- 不触碰投稿工具页面的未提交改动。

## Related Files

- `src/core/battle/planning.cjs`
- `src/core/battle.cjs`
- `src/uiAdapter.cjs`
- `tests/ui_adapter.test.cjs`
- `web/js/main.js`
- `web/ux-app.js`
- `web/ux-app.css`
- `tasks/index.md`
- `tasks/done/2026-06-11_team-risk-preview-recompute.md`

## Commit Plan

commit: `fix(ui): recompute moved team risk preview`

## Verification

- [x] RED: focused test fails before implementation (`battle.buildTeamRiskGrid is not a function`)
- [x] `node --test tests/ui_adapter.test.cjs`
- [x] `node tests/run_all_tests.cjs`
- [x] `npm run check:all`
- [x] `npm run test:coverage`
- [x] Browser verification for retained team risk badges (`teamRiskGrid=1`, `teamRiskBadges=1`, sample `受1`; hover candidate cleared stale retained badge)

## Result

- 新增 `buildTeamRiskGrid`，按当前整队站位重算已移动宠物的实际受击风险。
- `buildMoveRiskGrid` 每个候选落点携带候选态 `teamRiskGrid`，支持第二只宠物 hover 时影响第一只的风险显示。
- UI 增加 `teamRiskGrid` / `teamRisk` 渲染，已移动宠物保留 `受X` 风险角标，hover 候选时用候选态风险覆盖旧结果。
