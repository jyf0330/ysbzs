# 2026-06-30_pet-detail-final-stats

task_id: 2026-06-30_pet-detail-final-stats
type: ui-detail
status: READY_TO_MERGE
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

- note: implementation continued after explicit user confirmation `do`, despite overlapping dirty UI task groups in the shared worktree.
- pass: `node --input-type=module --check < web/js/main.js`
- pass: `node --test tests/unit/ui_combat_layout_contract.test.cjs`
- pass: `git diff --check -- web/js/main.js tests/unit/ui_combat_layout_contract.test.cjs tasks/doing/2026-06-30_pet-detail-final-stats.md`
- pass: `node tools/build_local_engine_bundle.cjs`
- pass: `node tests/run_all_tests.cjs` (64/64)
- pass: 4173 real browser flow through formal visible controls at `http://127.0.0.1:4173/?runtime=http&sessionId=pet-detail-final-stats-1782783337729`: clicked `#prep-open-btn`, `#prep-ready-btn`, then clicked board hero cell `R7C2` / `hero_pal_002_1`; detail panel showed final HP / attack / defense / shield / AP / move stats and no `evolutionPoints`, `statBonus`, `growthMode`, `进化点`, `生命进化点`, `攻击进化点`, `防御进化点`, `白银到黄金`, or `黄金到钻石`; console/page errors 0.
- screenshot reviewed by Lead: `/Users/ywh/Documents/ysbzs/output/playwright/pet-detail-final-stats-4173-2026-06-30T01-35-37-729Z.png`; right detail panel shows final stat grid and current quality line without visible growth-breakdown clutter.

## commit_plan

- message: `fix(ui): show final pet stats in detail panel`
- auto_commit: blocked by existing overlapping dirty READY_TO_MERGE UI task groups and shared `web/js/main.js` / `web/js/local-engine.js` ownership; leave for git-c / Lead grouping.

## collaboration

- lead_scope: Right-side pet detail data presentation only.
- specialist_input: 无
- tester_pass: 4173 real browser pass through official prep and board-click flow; screenshot `/Users/ywh/Documents/ysbzs/output/playwright/pet-detail-final-stats-4173-2026-06-30T01-35-37-729Z.png`; DOM text assertions matched; console/page errors 0.
- external_ai_input: 无
- lead_decision: Player-facing pet detail now uses final unit stats and a narrow `playerQualityEffectText()` helper that only reads current quality effect text. It does not read growth-process fields such as `qualityProgression.statBonus`, `evolutionPoints`, `growthMode`, or descriptive breakdowns; those belong in debug tooling.
