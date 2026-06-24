# 2026-06-24_daily-flow-next-step-unblock

task_id: 2026-06-24_daily-flow-next-step-unblock
type: bugfix-ui
status: DONE
owner: codex
branch: codex/bazaar-day1-day3-route

Goal:
- 修复 daily-flow 页面在“节点完成 / 正在进入下一段流程”状态下没有可点击下一步的问题。

Scope:
- 复现并定位 daily-flow 当前步骤完成后缺少下一步玩家操作的根因。
- 保持页面只暴露真实玩家决策按钮；自动流程不新增调试按钮。
- 上方“下一步”按钮读取 ViewModel 的 `primaryAction / autoAction`，并在旧服务进程缺少 dailyFlow action 字段时回退到公开 `nextActions`。

related_files:
- web/daily-flow.js
- tests/unit/daily_flow_battle_first_route.test.cjs
- output/playwright/
- tasks/done/2026-06-24_daily-flow-next-step-unblock.md
- tasks/index.md

exclusive_files:
- web/daily-flow.js

read_files:
- docs/00_AI_START_HERE.md
- docs/02_CURRENT_WORKFLOW.md
- docs/roles/UI_UX_START.md
- tasks/index.md
- tasks/README.md
- src/dailyFlowView.cjs
- src/uiAdapter.cjs
- src/uiAdapterInventoryVM.cjs
- src/core/inventoryRules.cjs

validation:
- RED: `node --test tests/unit/daily_flow_battle_first_route.test.cjs` failed on missing `routeActionForNext`.
- GREEN: `node --test tests/unit/daily_flow_battle_first_route.test.cjs` passed 10/10.
- Full check: `npm run check:all` passed.
- Browser tester pass: formal daily-flow page at `http://127.0.0.1:4173/daily-flow.html?qa=next-step-unblock`.
- Browser steps: loaded `node_resolved 1/6`, verified top button was enabled as `生成节点候选`, clicked it, waited for route options.
- Browser assertions: before click `{ phase: node_resolved, route: 1/6, choiceCount: 0, action: GENERATE_NODE_OPTIONS }`; after click `{ phase: node_choice, choiceCount: 3, options: 免费刷新 / 宠物奖励 / 夜市商人 }`.
- Console errors: `[]`.
- Screenshot: `output/playwright/daily-flow-next-step-unblock-2026-06-24.png`.
- Main-thread screenshot review: page shows step 2 as current, three choices visible, console counter 0, no obvious overlap or missing content.

commit_plan:
- commit message: fix daily-flow next step after completed node

collaboration:
- lead_scope: daily-flow next-step unblock and visible browser validation.
- specialist_input: 无
- tester_pass: TEST_SUBTHREAD_UNAVAILABLE; performed independent Playwright tester pass from the formal page, with screenshot and DOM/ViewModel/console assertions.
- external_ai_input: 无
- lead_decision: root cause was page controls only using `primaryAction`; fixed by a single ViewModel action selector with public `nextActions` fallback for already-running older API processes.
