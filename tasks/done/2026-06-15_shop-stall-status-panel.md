# 商店摊位状态面板

## task_id

2026-06-15_shop-stall-status-panel

## 目标

推进 `docs/BAZAAR_OUTER_LOOP_ACCEPTANCE.md` 第二层和第六层：浏览器商店界面直接展示当前摊位身份、商品倾向、商品池、槽位、免费刷新、折扣、最近刷新和定向补货状态。

## 验收映射

- 第二层商人 / 摊位 / 标签池：玩家能看到摊位身份、标签、商品池、槽位和刷新/折扣状态。
- 第六层可视化和玩家理解：商店界面能看到摊位身份、商品倾向、价格、折扣、刷新状态。

## 外层状态字段

- `viewModel.shop.activeStall`
- `viewModel.shop.refreshState`
- `viewModel.shop.freeRolls`
- `viewModel.shop.nextDiscount`
- `viewModel.shop.offers[]`

## 玩家入口

- `/api/action`
- `/api/view`
- 页面按钮：生成节点、选择商店节点、进入商店、刷新商店、触发商店事件

## ViewModel / report 证据

- `viewModel.shop.activeStall.name`
- `viewModel.shop.activeStall.tags`
- `viewModel.shop.refreshState.freeRolls`
- `viewModel.shop.refreshState.nextDiscount`
- `viewModel.shop.refreshState.lastRoll`
- 浏览器 `.shop-stall-summary`
- 浏览器 `.shop-refresh-summary`

## related_files

- `web/js/main.js`
- `web/ux-app.css`
- `tests/unit/ui_module_render_cache.test.cjs`
- `docs/10_CHANGELOG.md`
- `tasks/index.md`
- `tasks/done/2026-06-15_shop-stall-status-panel.md`

## commit_plan

`feat: 显示商店摊位状态面板`

## 验证计划

- `node --test tests/unit/ui_module_render_cache.test.cjs`
- `node tests/run_all_tests.cjs`
- `node --test tests/full_coverage.test.cjs`
- `npm run check:all`
- `npm run test:coverage`
- `git diff --check`
- 真实浏览器 Playwright 验收：通过按钮进入路线商店，截图记录摊位身份、刷新/折扣/定向补货状态、DOM/ViewModel/console 证据。

## 可见验收

本任务修改浏览器商店面板，必须执行提交前可见验收门禁：独立 tester pass 或子线程真实浏览器操作、保存截图、记录 DOM / ViewModel / console 证据，并由主线程复核截图。

## 进度记录

- 2026-06-15: 创建任务卡，占用商店摊位状态面板相关文件。
- 2026-06-15: TDD 红灯：新增 UI03D 后运行 `node --test tests/unit/ui_module_render_cache.test.cjs`，失败于缺少 `renderShopStallSummary`。
- 2026-06-15: 实现 `renderShopStallSummary` / `renderShopRefreshSummary`，浏览器商店面板显示摊位身份、标签、池、槽位、价格规则、免费刷新、折扣、最近刷新和定向补货数量。
- 2026-06-15: `node --test tests/unit/ui_module_render_cache.test.cjs` 通过，9/9。
- 2026-06-15: `node tests/run_all_tests.cjs` 通过，62/62；`node --test tests/full_coverage.test.cjs` 通过，9/9。
- 2026-06-15: TEST_SUBTHREAD_UNAVAILABLE：当前线程执行独立 tester pass，真实浏览器链路 `新开一天 -> 生成节点 -> 选择夜市商人 -> 触发免费刷新/折扣/火元素补货`。
- 2026-06-15: 浏览器证据保存到 `output/playwright/shop-stall-status-panel-2026-06-15T06-51-19-175Z/`；截图 `shop-stall-initial.png` / `shop-refresh-status.png`，报告 `shop-status-report.json`。
- 2026-06-15: 浏览器断言通过：`phase=shop`，`activeStall.name=夜市商人`，tags=`通用/夜市`，pool=`night_base`，slots=`6`，刷新状态包含 `freeRolls=1`、`lastRoll.poolId=elem_火`、`evt_shop_fire status=applied`，console/page errors 为空，摘要块无横向溢出。
- 2026-06-15: 主线程复核截图：右侧商店面板顶部可见摊位身份、标签、池、槽位、价格规则；触发事件后可见免费刷新、最近火池刷新和定向补货 applied，无明显遮挡、错位或关键字段缺失。
- 2026-06-15: `npm run check:all` 通过。
- 2026-06-15: `npm run test:coverage` 通过，115/115；overall line coverage 92.04%。
- 2026-06-15: `git diff --check` 通过。
