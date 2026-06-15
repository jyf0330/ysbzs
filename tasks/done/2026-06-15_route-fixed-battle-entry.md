# 路线固定战公开入口

## task_id

2026-06-15_route-fixed-battle-entry

## 目标

推进 `docs/BAZAAR_OUTER_LOOP_ACCEPTANCE.md` 第一层、第四层和第六层：当外层日程走到固定战或终局 Boss 战时，玩家不需要依赖“一键完整流程”或通用战斗按钮，而能通过明确的公开命令和浏览器按钮进入当前路线固定战。

## 验收映射

- 第一层外层 Run 骨架：固定战 / Boss 战是路线日程的一部分，玩家入口能推进结构化历史。
- 第四层战斗接入：固定战继续使用当前元素背包史战斗核心，并回写路线 outcome。
- 第六层可视化和玩家理解：下一步按钮能明确显示“进入晚上战 / 终局Boss战”。

## 外层状态字段

- `state.dayRoute.nodeIndex`
- `state.dayRoute.history[]`
- `state.dayRoute.battleOutcomes[]`
- `state.dayRoute.terminal`
- `viewModel.nextActions[]`

## 玩家入口

- `/api/action`
- `RUN_ROUTE_FIXED_BATTLE`
- 浏览器下一步 / 快捷动作按钮

## ViewModel / report 证据

- `viewModel.nextActions[]` 暴露 `RUN_ROUTE_FIXED_BATTLE`
- `FIXED_BATTLE_START`
- `ROUTE_BATTLE_OUTCOME`
- Day10 终局时 `RUN_TERMINAL`

## related_files

- `src/uiAdapterCommands.cjs`
- `src/core/reducer.cjs`
- `src/core/dayRoute.cjs`
- `src/uiAdapter.cjs`
- `tests/ui_adapter.test.cjs`
- `tests/unit/ui_module_render_cache.test.cjs`
- `web/js/main.js`
- `docs/10_CHANGELOG.md`
- `tasks/index.md`
- `tasks/done/2026-06-15_route-fixed-battle-entry.md`

## commit_plan

`feat: 暴露路线固定战入口`

## 验证计划

- `node --test tests/ui_adapter.test.cjs`
- `node --test tests/unit/ui_module_render_cache.test.cjs`
- `node tests/run_all_tests.cjs`
- `npm run check:all`
- `npm run test:coverage`
- `git diff --check`
- 真实浏览器 Playwright 验收：通过按钮推进到固定战前，确认下一步显示固定战入口并点击进入固定战，保存截图、DOM/ViewModel/console 证据。

## 可见验收

本任务修改浏览器下一步动作可见文案和按钮入口，必须执行提交前可见验收门禁：独立 tester pass 或子线程真实浏览器操作、保存截图、记录 DOM / ViewModel / console 证据，并由主线程复核截图。

## 进度记录

- 2026-06-15: 创建任务卡，占用路线固定战公开入口相关文件。
- 2026-06-15: TDD 红灯：`node --test tests/ui_adapter.test.cjs` 失败于 `RUN_ROUTE_FIXED_BATTLE` 未进入公开命令集合、固定战前 `nextActions` 缺少路线固定战动作；`node --test tests/unit/ui_module_render_cache.test.cjs` 失败于浏览器按钮不认识固定战命令。
- 2026-06-15: 实现 `RUN_ROUTE_FIXED_BATTLE` 公开命令、reducer 到 `dayRoute.runFixedBattle`、固定战前 `nextActions`，并让浏览器“生成遭遇”按钮在固定战前切换成固定战入口。
- 2026-06-15: focused 绿灯：`node --test tests/ui_adapter.test.cjs` 通过，29/29；`node --test tests/unit/ui_module_render_cache.test.cjs` 通过，11/11。
- 2026-06-15: `node tests/run_all_tests.cjs` 通过，62/62。
- 2026-06-15: 真实浏览器验收保存到 `output/playwright/route-fixed-battle-entry-2026-06-15T15-31-06/`；截图 `fixed-battle-before-click.png` / `fixed-battle-after-click.png`，报告 `route-fixed-battle-report.cli.json`。
- 2026-06-15: 浏览器操作步骤：新开一天 -> 生成/选择节点 -> 生成/选择遭遇 -> 领取路线奖励 -> 继续生成/选择节点到固定战前 -> 点击“进入晚上战”。断言：固定战前 `nextActions` 含 `RUN_ROUTE_FIXED_BATTLE`，按钮和下一步均显示“进入晚上战”；点击后 `phase=day_end`，固定战 history / outcome 写入，console/page errors 为空。
- 2026-06-15: 主线程复核截图：固定战前右侧按钮清楚显示“进入晚上战”，顶部下一步一致；点击后显示“当天结束”，日志可见晚上战 outcome 和 `DAY_ROUTE_END`，无明显遮挡、错位或错误状态。
- 2026-06-15: `npm run check:all` 通过；`npm run test:coverage` 通过，119/119；`git diff --check` 通过。
