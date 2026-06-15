# 完整 Run 浏览器入口

## task_id

2026-06-15_full-run-browser-entry

## 目标

推进 `docs/BAZAAR_OUTER_LOOP_ACCEPTANCE.md` Phase F：玩家能从浏览器第一屏通过真实按钮入口跑完 Day1-Day10 完整 run，到达终局，并在状态条 / 战报里看到终局与跨天成长。

## 本任务推进本文哪一层验收

- 第一层：运行入口能从 Day1 自动推进到终局，并断言最终状态。
- 第三层：跨天经济、背包、构筑成长可追踪。
- 第六层 / Phase F：浏览器 UI 中暴露完整 run 入口，新玩家不需要开发者解释也能触达终局。

## 外层状态字段

- `state.dayRouteRuns[]`
- `state.dayRoute.terminal`
- `state.dayRoute.history[]`
- `state.dayRoute.battleOutcomes[]`
- `state.gold`
- `state.inventory[]`

## 玩家入口

- `/api/action` → `RUN_FULL_RUN`
- 浏览器按钮 `#full-run-btn`
- `renderPlayerReport(state)` / `/api/report`

## ViewModel / report 证据

- `PUBLIC_COMMANDS` 包含 `RUN_FULL_RUN`。
- `nextActions` 暴露 `RUN_FULL_RUN`。
- `createYSBZSUIAdapter().run('RUN_FULL_RUN')` 返回 Day10 终局 ViewModel。
- 浏览器按钮点击后状态条显示 Day10 / 终局，战报包含 `【跨天成长】`。

## related_files

- `src/uiAdapterCommands.cjs`
- `src/uiAdapter.cjs`
- `src/uiAdapterFlowCommands.cjs`
- `src/scenarios/fullDay.cjs`
- `web/index.html`
- `web/js/main.js`
- `web/ux-app.js`
- `tests/ui_adapter.test.cjs`
- `tests/unit/ui_combat_layout_contract.test.cjs`
- `docs/10_CHANGELOG.md`
- `tasks/index.md`
- `tasks/done/2026-06-15_full-run-browser-entry.md`

## unowned_dirty_files

- `.gitignore`
- `pipeline/output.md`
- `pipeline/prompt.md`
- `pipeline/run.sh`
- `pipeline/state.json`
- `state.json.tmp`
- 已暂存但未提交的前序任务文件：`src/core/battle/resolution.cjs`、`src/core/battleEventProtocol.cjs`、`src/core/dayRoute.cjs`、`src/core/explainTrace.cjs`、`src/render/textReport.cjs`、`src/scenarios/fullDay.cjs`、`src/uiAdapter.cjs`、`tests/run_all_tests.cjs`、`tests/ui_adapter.test.cjs`、`tests/unit/ui_module_render_cache.test.cjs`、`web/js/main.js`、`web/ux-app.css`、`web/ux-app.js`、`tasks/done/2026-06-15_day-range-growth-snapshots.md`、`tasks/done/2026-06-15_route-battle-pressure-preview.md`、`tasks/done/2026-06-15_object-registry-fire-trap-trigger.md`、`tasks/done/2026-06-15_trigger-object-readable-report.md`

## commit_plan

`feat: 增加完整run浏览器入口`

## 验证计划

- `node --test tests/unit/ui_combat_layout_contract.test.cjs`
- `node --test tests/ui_adapter.test.cjs`
- `node tests/run_all_tests.cjs`
- `npm run check:all`
- `npm run test:coverage`
- `git diff --check`
- 真实浏览器操作：点击 `#full-run-btn`，截图保存到 `output/playwright/`，记录 DOM / ViewModel / console evidence。

## 可见验收

本任务修改浏览器按钮和可见操作入口，必须执行真实浏览器截图门禁。

## 进度记录

- 2026-06-15: 创建任务卡，占用完整 run 浏览器入口相关文件；记录当前已有未归属脏文件，后续不纳入本任务提交。
- 2026-06-15: TDD 红灯：新增 adapter 测试要求 `RUN_FULL_RUN` 公开命令、nextAction、Day10 terminal、`dayRouteRuns` 和 `【跨天成长】` 战报；新增 UI 合约要求 `#full-run-btn` 与 `RUN_FULL_RUN` 绑定。`node --test tests/ui_adapter.test.cjs` 失败于缺 `RUN_FULL_RUN`，`node --test tests/unit/ui_combat_layout_contract.test.cjs` 失败于缺 `full-run-btn` / 绑定。
- 2026-06-15: 实现 `RUN_FULL_RUN` 白名单/别名、uiAdapter flow 分支、ViewModel `dayRouteRuns`、右侧“完整Run”按钮和浏览器脚本绑定。
- 2026-06-15: 将 `RUN_FULL_DAY` / `RUN_FULL_RUN` 回滚、快照和结果包装抽到 `src/uiAdapterFlowCommands.cjs`，让 `src/uiAdapter.cjs` 保持在 round5 size guard 内。
- 2026-06-15: `node --test tests/unit/ui_combat_layout_contract.test.cjs` 通过，6/6。
- 2026-06-15: `node --test tests/ui_adapter.test.cjs` 通过，31/31。
- 2026-06-15: `node tests/run_all_tests.cjs` 通过，63/63。
- 2026-06-15: 真实浏览器验收通过，服务 `http://127.0.0.1:4187`，操作步骤为打开首页、点击 `#full-run-btn`、切换战报页；证据目录 `output/playwright/full-run-browser-entry-2026-06-15T17-55-00/`。
- 2026-06-15: 浏览器断言：初始按钮文本为“完整Run”；点击后 `day=10`、`phase=day_end`、`terminal.kind=final_boss`、`dayRouteRuns=10`、战报包含 `【跨天成长】` 与 `Day10`、`consoleErrorCount=0`。
- 2026-06-15: 截图复核：`output/playwright/full-run-browser-entry-2026-06-15T17-55-00/02_after_full_run_report.png` 显示第10天下午、当天结束、终局 defeat、右侧“完整Run”按钮和底部战报，无明显遮挡、错位、空白或错误数值。
- 2026-06-15: `npm run check:all` 通过；包含 test、architecture、CSV、Day7 浏览器链路、DOM 禁止、UI connected、JSDoc。
- 2026-06-15: `npm run test:coverage` 通过，122/122，整体 line coverage 92.32%。
- 2026-06-15: `git diff --check` 通过。
- 2026-06-15: 自动提交检查不满足：工作区存在非本任务暂存/脏文件，需只精确暂存本任务文件并输出 Commit Plan，不自动提交。
