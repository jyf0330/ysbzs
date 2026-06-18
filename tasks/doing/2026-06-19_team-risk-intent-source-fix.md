# 2026-06-19_team-risk-intent-source-fix

task_id: 2026-06-19_team-risk-intent-source-fix
type: combat core / team risk preview / UI correctness
status: VERIFIED_NO_COMMIT
owner: Codex
worktree: shared-worktree

## Goal

修正受击预警里“敌方棉悠悠 6次行动块、合计12”的错误展示。风险预警必须来自真实敌方宠物行动意图数据，不能用另写的投影方法把多个敌人/行动槽拼成一个不真实的敌方行动说明。

## Scope

- 移除或隔离上一轮 `projected_full_slot_threat` 这类手写风险投影，不让它进入玩家可见受击预警。
- `teamRiskGrid` 只聚合 `computeMonsterIntent` 产生的真实行动步骤。
- 如果多个敌人都能打到同一我方单位，结构化 threats 必须保留各自 enemyId/enemyName，UI 展示不能归并成第一个敌人的 6 次行动。
- 单位详情面板必须区分单位自身元素层与脚下格子的元素层；站在 `水3` 等格子元素上时，右侧详情不能显示为元素层无。
- 同步本地运行包 `web/js/local-engine.js`。

## related_files

- `src/core/battle/planning.cjs`
- `tests/ui_adapter.test.cjs`
- `tests/unit/ui_combat_layout_contract.test.cjs`
- `web/js/main.js`
- `web/ux-app.js`
- `web/js/local-engine.js`
- `tasks/doing/2026-06-19_team-risk-intent-source-fix.md`
- `output/playwright/team-risk-intent-source-2026-06-19.png`

## exclusive_files

- `src/core/battle/planning.cjs`
- `tests/ui_adapter.test.cjs`
- `tests/unit/ui_combat_layout_contract.test.cjs`
- `web/js/main.js`
- `web/ux-app.js`
- `web/js/local-engine.js`

## read_files

- `docs/02_CURRENT_WORKFLOW.md`
- `docs/00_AI_START_HERE.md`
- `docs/roles/PROGRAMMER_START.md`
- `docs/roles/UI_UX_START.md`
- `tasks/index.md`
- `tasks/README.md`
- `~/Desktop/AI-Memory-Pack/20-projects.md`

## validation

- RED: `node --test tests/ui_adapter.test.cjs` failed before implementation on UI22B with projected damage `9 !== 7`; `node --test tests/unit/ui_combat_layout_contract.test.cjs` failed because incoming risk detail did not group by enemy.
- GREEN: `node --test tests/ui_adapter.test.cjs` passed 40/40.
- UI contract: `node --test tests/unit/ui_combat_layout_contract.test.cjs` passed 7/7.
- Bundle: `node tools/build_local_engine_bundle.cjs` rebuilt `web/js/local-engine.js`.
- Projection cleanup: `rg -n "projectedEnemyFullSlotRisk|pathCanReachThreatPosition|projectedById|projected_full_slot_threat|projectedFullSlotThreat" src tests web` found no matches.
- Focused regression: `node --test tests/unit/*.test.cjs` passed 71/71.
- Full project test runner: `node tests/run_all_tests.cjs` passed 64/64.
- Browser gate: Playwright local runtime, real DOM clicks through Day7 trial and board movement; screenshot `output/playwright/team-risk-intent-source-2026-06-19.png`.
- Browser assertion: moved `我方疾风隼` to R3C3 via board click; detail grouped `敌方骑士蜂黄金复制体 2次行动块` and `敌方棉悠悠黄金复制体 1次行动块`, with subtotals 36/16 and total 52 KO; no console/page errors.
- Detail panel follow-up: pending; selecting a hero standing on a water element cell must show foot cell element layers in the right detail panel.
- Not run: `npm run check:all` was not executed in this task.

## commit_plan

message: `fix(combat): derive team risk from monster intent`

## collaboration

lead_scope: 修正受击预警数据来源和多敌人威胁结构，避免自写投影伪造行动块。
specialist_input: 无
tester_pass: TEST_SUBTHREAD_UNAVAILABLE；主线程执行独立 Playwright tester pass。
external_ai_input: 无
lead_decision: 先加复现测试，再移除玩家可见风险链路中的投影方法，改回真实 `computeMonsterIntent` 威胁数据。
commit_status: 已按 commit_plan 提交，提交信息 `fix(combat): derive team risk from monster intent`。
