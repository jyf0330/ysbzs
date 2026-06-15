# 路线战斗奖励 UI 可见领取

## task_id

2026-06-15_route-pending-reward-ui

## 目标

推进 `docs/BAZAAR_OUTER_LOOP_ACCEPTANCE.md` 第三层、第四层和第六层：路线战斗胜利产生的 pending reward 不只存在于核心状态和日志中，还要在浏览器奖励区作为可见卡片展示，并允许玩家通过真实 UI 入口领取。

## 验收映射

- 第三层构筑成长：战斗奖励候选能被玩家领取并进入背包 / 遗物等构筑状态。
- 第四层战斗接入：战斗结果回写外层奖励资格后，浏览器能继续走领取奖励链路。
- 第六层可视化和玩家理解：玩家能看到路线战斗奖励池、来源遭遇和领取动作。

## 外层状态字段

- `viewModel.dayRoute.pendingRewards[]`
- `viewModel.dayRoute.claimedRewards[]`
- `viewModel.rewards[]`
- `viewModel.nextActions[]`

## 玩家入口

- `/api/action`
- 页面按钮：生成遭遇、选择遭遇、路线奖励领取卡片
- `CLAIM_ROUTE_REWARD`

## ViewModel / report 证据

- `viewModel.dayRoute.pendingRewards[].rewardPoolId`
- `viewModel.dayRoute.claimedRewards[].selectedReward`
- 浏览器 `.route-pending-reward`
- `ROUTE_REWARD_CLAIM` 事件 / 战报

## related_files

- `src/uiAdapter.cjs`
- `src/core/dayRoute.cjs`
- `web/js/main.js`
- `web/ux-app.css`
- `tests/ui_adapter.test.cjs`
- `tests/unit/ui_module_render_cache.test.cjs`
- `docs/10_CHANGELOG.md`
- `tasks/index.md`
- `tasks/done/2026-06-15_route-pending-reward-ui.md`

## commit_plan

`feat: 显示并领取路线战斗奖励`

## 验证计划

- `node --test tests/ui_adapter.test.cjs`
- `node --test tests/unit/ui_module_render_cache.test.cjs`
- `node tests/run_all_tests.cjs`
- `npm run check:all`
- `npm run test:coverage`
- `git diff --check`
- 真实浏览器 Playwright 验收：通过真实按钮生成遭遇、选择遭遇产生 pending reward，在奖励区点击路线奖励领取卡片，截图记录 pending/claimed、DOM/ViewModel/console 证据。

## 可见验收

本任务修改浏览器奖励区，必须执行提交前可见验收门禁：独立 tester pass 或子线程真实浏览器操作、保存截图、记录 DOM / ViewModel / console 证据，并由主线程复核截图。

## 进度记录

- 2026-06-15: 创建任务卡，占用路线战斗奖励 UI 相关文件。
- 2026-06-15: TDD 红灯：`node --test tests/unit/ui_module_render_cache.test.cjs` 失败于缺少 `renderRoutePendingRewards`；`node --test tests/ui_adapter.test.cjs` 失败于 pending reward 没有 `CLAIM_ROUTE_REWARD` nextAction。
- 2026-06-15: 实现 pending route reward ViewModel action、浏览器奖励区卡片和点击 `CLAIM_ROUTE_REWARD`。
- 2026-06-15: 浏览器截图复核发现领取后普通奖励候选残留；扩展 related_files 到 `src/core/dayRoute.cjs`，补充领取后清空临时候选。
- 2026-06-15: TDD 红灯：`node --test tests/ui_adapter.test.cjs` 失败于路线奖励领取后 `rewards.length` 仍为 3；修复后该测试通过，28/28。
- 2026-06-15: `node --test tests/unit/ui_module_render_cache.test.cjs` 通过，10/10。
- 2026-06-15: `node tests/run_all_tests.cjs` 在 UI 实现后通过，62/62；之后因 `src/core/dayRoute.cjs` 追加候选清理，仍需最终门禁重跑。
- 2026-06-15: TEST_SUBTHREAD_UNAVAILABLE：当前线程执行独立 tester pass。自然路线遭遇 Day1-Day10 当前自动战斗均为 LOSE，无法自然产生 pending reward；可见验收改用 `/api/load` 导入由核心 `dayRoute.recordBattleOutcome(...WIN...)` 生成的合法存档状态，再在浏览器中真实点击 `.route-pending-reward` 领取。
- 2026-06-15: 浏览器证据保存到 `output/playwright/route-pending-reward-ui-2026-06-15T07-13-34-460Z/`；截图 `route-pending-before-claim.png` / `route-pending-after-claim.png`，报告 `route-pending-reward-report.json`。
- 2026-06-15: 浏览器断言通过：领取前 `pendingRewards.length=1`，卡片文本包含“路线战斗奖励 / reward_pT1 / WIN / A”，`nextActions` 暴露 `CLAIM_ROUTE_REWARD`；真实点击后 `pendingRewards.length=0`、`claimedRewards.length=1`、`selectedReward` 存在、普通 `rewards.length=0`、卡片移除、`ROUTE_REWARD_CLAIM` 出现，console/page errors 为空。
- 2026-06-15: 主线程复核截图：领取前右侧奖励区卡片清楚可见；领取后奖励卡和普通候选均消失，下一步回到生成节点，无明显遮挡、错位或重复领取误导。
- 2026-06-15: `npm run check:all` 通过；`npm run test:coverage` 通过，117/117；`git diff --check` 通过。
