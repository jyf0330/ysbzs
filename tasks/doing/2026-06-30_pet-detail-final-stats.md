# 2026-06-30_pet-detail-final-stats

task_id: 2026-06-30_pet-detail-final-stats
type: ui-detail
status: BLOCKED
owner: Codex
branch: codex/bazaar-day1-day3-route

## Goal

调整棋盘宠物详情面板：玩家详情页只显示最终战斗面板属性，不展示白银/黄金/钻石成长点拆解；品质成长过程只允许进入 Debug / 调试面板。

## Scope

- 玩家侧宠物详情保留最终 HP / 攻击 / 防御 / 护盾 / AP / 移动等最终值。
- 玩家侧宠物详情保留当前生效的品质标签和战斗质变效果摘要，但不展示 `qualityProgression.statBonus`、`qualityProgression.evolutionPoints`、成长阶段或加点来源。
- Debug / 调试面板可以展示成长拆解、原始值和最终值对比。
- 需要补 UI 合同测试，防止玩家详情误显示成长过程字段。
- 需要刷新 `web/js/local-engine.js` 并通过 4173 真实页面点击棋盘宠物验收。

## related_files

- `web/js/main.js`
- `web/js/local-engine.js`
- `tests/unit/ui_combat_layout_contract.test.cjs`
- `tasks/doing/2026-06-30_pet-detail-final-stats.md`

## exclusive_files

- `web/js/main.js`

## read_files

- `AGENTS.md`
- `docs/02_CURRENT_WORKFLOW.md`
- `docs/00_AI_START_HERE.md`
- `docs/roles/UI_UX_START.md`
- `tasks/index.md`
- `tasks/README.md`
- `tasks/doing/2026-06-29_auto-enemy-turn-flow.md`
- `tasks/doing/2026-06-30_attack-event-animation.md`
- `tasks/doing/2026-06-30_round-placement-preview-reset.md`
- `src/core/qualityProgression.cjs`
- `web/js/main.js`

## validation

- blocked before implementation: `web/js/main.js` is currently owned by existing ACTIVE / READY_TO_MERGE tasks, including `2026-06-29_auto-enemy-turn-flow` as `exclusive_files`, plus `2026-06-30_attack-event-animation` and `2026-06-30_round-placement-preview-reset` as related files.
- blocked before implementation: `web/js/local-engine.js` is also dirty and owned by multiple existing tasks.
- not run: code tests and 4173 browser verification, because implementation is blocked by file-level leases.

## commit_plan

- message: `fix(ui): show final pet stats in detail panel`
- auto_commit: blocked by file-level lease conflicts and unrelated dirty worktree.

## collaboration

- lead_scope: Right-side pet detail data presentation only.
- specialist_input: 无
- tester_pass: blocked before implementation.
- external_ai_input: 无
- lead_decision: Do not modify `web/js/main.js` until existing UI task groups are committed/merged or user explicitly reassigns the same-file ownership. The intended product rule is final-value-only player detail, with growth breakdown restricted to debug tooling.
