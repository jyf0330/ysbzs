# 2026-06-23_attack-warning-cell-tooltip

task_id: 2026-06-23_attack-warning-cell-tooltip
type: UI / board feedback
status: DONE
owner: Codex
branch: shared-worktree
worktree: /Users/ywh/Documents/ysbzs

Goal:
- 生成一个被攻击预警格提示框，让玩家在棋盘受击预警格上能直接看到来源和预计伤害。

Scope:
- 只改前端展示层，复用 ViewModel 现有 `cell.teamRisk` / `teamRiskGrid` 数据。
- 不改核心规则，不新增第二套战斗、预览、移动或日志逻辑。
- 保持右侧详情面板为主信息面，提示框只作为格子旁的轻量预警说明。

Implementation:
- `web/js/main.js` 在 `team-risk` 单元格内渲染 `attack-warning-popover`，显示受击预警、预计伤害、HP 变化和敌方来源汇总。
- `web/ux-app.css` 增加预警框样式；风险格在 hover / focus / selected 状态放开 overflow 并抬高层级，避免提示框被格子裁剪。
- 修正右侧详情选择优先级：当前 `GET_CELL_DETAIL` 返回真实单位时，不再被事务预演中的空 projected detail 覆盖。
- 更新 UI 契约和浏览器测试，覆盖预警框、真实点击详情等待、以及当前单位详情优先级。

related_files:
- web/js/main.js
- web/ux-app.css
- tests/unit/ui_combat_layout_contract.test.cjs
- tests/unit/manual_flow_undo_contract.test.cjs
- tests/browser_detail_selection.test.cjs
- tasks/done/2026-06-23_attack-warning-cell-tooltip.md
- tasks/index.md
- output/playwright/2026-06-23_attack-warning-cell-tooltip.png

exclusive_files:
- web/js/main.js

read_files:
- docs/02_CURRENT_WORKFLOW.md
- docs/00_AI_START_HERE.md
- docs/roles/UI_UX_START.md
- docs/roles/PROGRAMMER_START.md
- tasks/README.md
- tasks/index.md
- web/index.html
- src/uiAdapter.cjs

validation:
- pass: node --test tests/unit/ui_combat_layout_contract.test.cjs
- pass: node --test tests/browser_detail_selection.test.cjs
- pass: npm run check:all
- pass: independent tester pass / real browser route opened `index.html?runtime=local`, clicked `#day7-btn`, hovered the first `.cell.team-risk`, saved screenshot to `output/playwright/2026-06-23_attack-warning-cell-tooltip.png`.
- browser evidence: risk cell `r=5,c=2`, popover text `受击预警 / 伤害 -38 · HP 47→9 / 敌方骑士蜂黄金复制体(-20) ... 总计-38`.
- console error: none.
- screenshot review: 主线程已查看截图；提示框清晰可见，未被格子裁剪，没有明显遮挡或错位；右侧详情与格子提示的风险数值一致。

commit_plan:
- message: ui(board): add incoming attack warning tooltip
- staging: precise add of task related files only

collaboration:
- lead_scope: Implement board incoming-risk tooltip using existing ViewModel risk data.
- specialist_input: 无
- tester_pass: TEST_SUBTHREAD_UNAVAILABLE；本轮执行独立 Playwright tester pass，使用真实浏览器玩家入口 `#day7-btn` 和真实 hover 预警格，截图路径见 validation。
- external_ai_input: 无
- lead_decision: 采用 UI 层提示框，不改变核心结算；同时修复当前点击单位详情被 projected empty detail 覆盖的问题，保证提示框和详情面板都来自同一条真实 ViewModel / GET_CELL_DETAIL 链路。
