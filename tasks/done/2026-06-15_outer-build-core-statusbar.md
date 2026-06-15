# 外层构筑核心状态条

## task_id

2026-06-15_outer-build-core-statusbar

## 目标

推进 `docs/BAZAAR_OUTER_LOOP_ACCEPTANCE.md` 第六层：浏览器第一屏顶部状态条直接显示当天、外层进度、金币、构筑核心和下一步，让玩家不打开调试面板也能理解 run 状态。

## 验收映射

- 第六层可视化和玩家理解：第一屏能让玩家知道今天第几天、当前节点/进度、金币、构筑核心、下一步选择。
- 第三层构筑成长：上一轮接入的 `viewModel.buildCore` 进入真实浏览器可见 UI。

## 外层状态字段

- `viewModel.day`
- `viewModel.period`
- `viewModel.dayRoute`
- `viewModel.gold`
- `viewModel.buildCore`
- `viewModel.nextActions`

## 玩家入口

- `/api/view`
- `/api/action`
- 页面按钮：生成节点、选择节点、进入商店、购买商品

## ViewModel / browser 证据

- `#build-core-label`
- `#route-progress-label`
- `#next-step-label`
- 真实浏览器截图保存到 `output/playwright/`

## related_files

- `web/index.html`
- `web/js/main.js`
- `web/ux-app.css`
- `tests/unit/ui_module_render_cache.test.cjs`
- `docs/10_CHANGELOG.md`
- `tasks/index.md`
- `tasks/done/2026-06-15_outer-build-core-statusbar.md`

## commit_plan

`feat: 显示外层构筑核心状态条`

## 验证计划

- `node --test tests/unit/ui_module_render_cache.test.cjs`
- `node tests/run_all_tests.cjs`
- `node --test tests/full_coverage.test.cjs`
- `npm run check:all`
- `npm run test:coverage`
- `git diff --check`
- 真实浏览器 Playwright 验收：页面按钮触发外层状态变化，截图、DOM/ViewModel/console 证据写入任务卡

## 可见验收

本任务修改第一屏顶部 HUD，必须执行提交前可见验收门禁：独立 tester pass 或子线程真实浏览器操作、保存截图、记录 DOM / ViewModel / console 证据，并由主线程复核截图。

## 进度记录

- 2026-06-15: 创建任务卡，占用外层构筑核心状态条相关文件。
- 2026-06-15: TDD 红灯：新增 `UI03B top status bar exposes outer route progress, build core, and next step` 后运行 `node --test tests/unit/ui_module_render_cache.test.cjs`，失败于缺少 `#route-progress-label`。
- 2026-06-15: 实现顶部状态条字段：阶段、天数、外层进度、金币、构筑核心、下一步；补中文阶段 `node_choice` / `node_resolved` / `reward`。
- 2026-06-15: 首次真实浏览器验收发现状态条换行并遮挡 topbar，随后把投稿/全屏移出状态条、修正旧 CSS 覆盖，并将 HUD 构筑核心压缩为前三个核心标签。
- 2026-06-15: `node --test tests/unit/ui_module_render_cache.test.cjs tests/unit/ui_combat_layout_contract.test.cjs` 通过，13/13。
- 2026-06-15: `TEST_SUBTHREAD_UNAVAILABLE`：当前工具未提供可用独立子线程；执行独立 Playwright tester pass 替代。真实浏览器操作：打开 `http://127.0.0.1:4182`，点击“新开一天”，点击“生成节点”。截图 `/Users/ywh/Documents/ysbzs/output/playwright/outer-build-core-statusbar-2026-06-15T06-09-51-944Z/statusbar-node-options.png`；报告 `/Users/ywh/Documents/ysbzs/output/playwright/outer-build-core-statusbar-2026-06-15T06-09-51-944Z/statusbar-report.json`。
- 2026-06-15: 浏览器 DOM / ViewModel 断言：`phase=节点选择`，`day=第1天 上午`，`progress=节点 0 · 3选1`，`gold=8`，`buildCore=火系 / 风系 / 水系`，`buildCoreTitle=火系 / 风系 / 水系 / 机动 / 输出`，`nextStep=选择节点`，`vmRouteOptions=3`，`consoleErrors=[]`，`pageErrors=[]`，`topbar.overlap=false`。
- 2026-06-15: 主线程查看截图并复核通过：状态条一行展示，没有明显遮挡、错位、缺失或错误数值。
- 2026-06-15: `node tests/run_all_tests.cjs` 通过，62/62。
- 2026-06-15: `node --test tests/full_coverage.test.cjs` 通过，9/9。
- 2026-06-15: `npm run check:all` 通过，包含 main / unit / ui / full / ops / prediction / architecture / CSV / Day7 browser / no DOM / UI connected / JSDoc。
- 2026-06-15: `npm run test:coverage` 通过，113/113，行覆盖率 91.96%。
- 2026-06-15: `git diff --check` 通过。
