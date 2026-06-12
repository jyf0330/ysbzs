# 2026-06-12_all-out-two-round-browser-flow

task_id: 2026-06-12_all-out-two-round-browser-flow
status: DONE
type: bugfix/ui-player-flow
created_at: 2026-06-12
completed_at: 2026-06-12

## Goal

修复真实浏览器里“我方全部出击”第 2 回合没有把当前回合所有可释放行动块打完的问题；验收必须从浏览器操作完整完成两个回合。

## Related Files

- `web/js/main.js`
- `web/ux-app.js`
- `src/uiAdapter.cjs`
- `src/core/commandEnvelope.cjs`
- `tests/unit/ui_module_render_cache.test.cjs`
- `tests/ui_adapter.test.cjs`
- `tasks/index.md`
- `tasks/done/2026-06-12_all-out-two-round-browser-flow.md`

## Validation

- `node --test tests/unit/ui_module_render_cache.test.cjs`
- `node --test tests/ui_adapter.test.cjs`
- `node tests/run_all_tests.cjs`
- real browser two-round player-flow verification with screenshots in `output/playwright/`

## Commit Plan

- `fix: 修复全部出击两回合流程`

## Evidence Log

- 2026-06-12: 真实浏览器 Playwright 验收失败：第 1 回合能完成并进入第 2 回合；第 2 回合点击“我方全部出击”后稳定停在 `player_turn / round 2`，`冲浪鸭 HP4 / AP2`，未完整完成第二回合。证据目录：`output/playwright/two-round-playwright-complete-audit-2026-06-12T09-34-06-716Z/`。
- 2026-06-12: 最终代码真实浏览器 Playwright 验收通过，全程只通过页面按钮操作：`开始战斗` → `我方全部出击` → `结束回合` → `怪物行动/下一回合` → 第 2 回合 `我方全部出击` → `结束回合` → `怪物行动`。断言 `round1_after_all_out`、`round1_completed`、`round2_after_all_out`、`round2_completed` 的 leftovers 均为空，console/page error 均为空。证据目录：`output/playwright/two-round-playwright-final-audit-2026-06-12T10-29-26-957Z/`；关键截图：`02_round1_after_all_out.png`、`06_round2_after_all_out.png`、`02_round_completed.png`；报告：`two-round-browser-report.json`。
- 2026-06-12: 单元/基础验证通过：`node --test tests/unit/ui_module_render_cache.test.cjs`、`node --test tests/unit/ui_combat_layout_contract.test.cjs`、`node --test tests/ui_adapter.test.cjs`、`node tests/run_all_tests.cjs`（44/44）。
- 2026-06-12: 主线程复核截图：两次全部出击后左侧 AP/可用行动块清零，第 2 回合完成图进入 `round_end`，未见明显遮挡、错位、缺失或错误数值。
