# 终局 Run 摘要与下一步文案

## task_id

2026-06-15_terminal-run-summary-ui

## 目标

推进 `docs/BAZAAR_OUTER_LOOP_ACCEPTANCE.md` Phase F：完整 run 到达终局后，浏览器第一屏顶部状态必须清楚表达“本局已结束 / 查看终局报告”，不能再被未领取奖励误导成“下一步选择奖励”。

## 本任务推进本文哪一层验收

- 第一层：完整 run 到终局后能从 ViewModel / UI 读取明确终局状态。
- 第六层：玩家能理解当前处于 run 的哪一步，终局后不显示错误下一步。
- Phase F：新玩家从 Day1 跑到终局后，不需要开发者解释就能知道这局结束并查看报告。

## 外层状态字段

- `state.dayRoute.terminal`
- `state.dayRouteRuns[]`
- `state.dayRoute.pendingRewards[]`
- `vm.nextActions[]`
- `vm.dayRoute.terminal`

## 玩家入口

- 浏览器按钮 `#full-run-btn`
- `/api/action` → `RUN_FULL_RUN`
- `/api/view`
- `/api/report`

## ViewModel / report 证据

- `nextActions` 在 terminal 状态下不再暴露需要继续领取的奖励动作。
- 顶部 `#next-step-label` 在 terminal 状态下显示终局报告/本局结束类文案。
- 浏览器点击“完整Run”后，状态条显示 Day10 终局，下一步显示终局报告，战报包含 `【跨天成长】` 和 Day10。

## related_files

- `src/uiAdapter.cjs`
- `web/js/main.js`
- `web/ux-app.css`
- `tests/ui_adapter.test.cjs`
- `tests/unit/ui_module_render_cache.test.cjs`
- `docs/10_CHANGELOG.md`
- `tasks/index.md`
- `tasks/done/2026-06-15_terminal-run-summary-ui.md`

## unowned_dirty_files

- `.gitignore`
- `pipeline/output.md`
- `pipeline/prompt.md`
- `pipeline/run.sh`
- `pipeline/state.json`
- `state.json.tmp`
- 已暂存但未提交的前序任务文件：`src/core/battle/resolution.cjs`、`src/core/battleEventProtocol.cjs`、`src/core/dayRoute.cjs`、`src/core/explainTrace.cjs`、`src/render/textReport.cjs`、`src/scenarios/fullDay.cjs`、`src/uiAdapter.cjs`、`src/uiAdapterCommands.cjs`、`src/uiAdapterFlowCommands.cjs`、`tests/run_all_tests.cjs`、`tests/ui_adapter.test.cjs`、`tests/unit/ui_combat_layout_contract.test.cjs`、`tests/unit/ui_module_render_cache.test.cjs`、`web/index.html`、`web/js/main.js`、`web/ux-app.css`、`web/ux-app.js`、`tasks/done/2026-06-15_full-run-browser-entry.md` 及其他前序 done 任务卡。

## commit_plan

`fix: 修正终局run下一步提示`

## 验证计划

- `node --test tests/unit/ui_module_render_cache.test.cjs`
- `node --test tests/ui_adapter.test.cjs`
- `node tests/run_all_tests.cjs`
- `npm run check:all`
- `npm run test:coverage`
- `git diff --check`
- 真实浏览器操作：点击 `#full-run-btn`，截图保存到 `output/playwright/`，记录 DOM / ViewModel / console evidence。

## 可见验收

本任务修改浏览器顶部可见文案，必须执行真实浏览器截图门禁。

## 进度记录

- 2026-06-15: 创建任务卡；当前 ACTIVE 为空，记录已有非本任务暂存/脏文件，后续不纳入本任务提交。
- 2026-06-15: TDD 红灯：`node --test tests/unit/ui_module_render_cache.test.cjs` 失败于 `terminalSummary?.nextStepText` 缺失；`node --test tests/ui_adapter.test.cjs` 失败于 `terminalSummary` 未进入 ViewModel。
- 2026-06-15: 实现 terminal 状态 ViewModel `terminalSummary`，terminal 下 `nextActions` 不再暴露奖励动作；浏览器 `nextStepText` 优先返回 `terminalSummary.nextStepText` / “查看终局报告”。
- 2026-06-15: `node --test tests/unit/ui_module_render_cache.test.cjs` 通过，12/12。
- 2026-06-15: `node --test tests/ui_adapter.test.cjs` 通过，31/31。
- 2026-06-15: `node tools/audit_singleplayer_architecture.cjs` 通过，`src/uiAdapter.cjs` 保持 round5 size guard 内。
- 2026-06-15: 可见验收红灯：真实浏览器截图发现顶部下一步显示为 `查看终局...`，新增 CSS 合同要求 `.status-pill.next-step strong` 允许换行，先红后绿。
- 2026-06-15: `node --test tests/unit/ui_module_render_cache.test.cjs` 通过，12/12；`node --test tests/ui_adapter.test.cjs` 通过，31/31；`node tests/run_all_tests.cjs` 通过，63/63。
- 2026-06-15: `npm run check:all` 通过；包含 run_all、unit、ui、full、ops、prediction、architecture、csv、day7 browser、no-DOM、UI connected、checkJs。
- 2026-06-15: `npm run test:coverage` 通过，122/122；all files line coverage 92.32%。
- 2026-06-15: `git diff --check` 通过。
- 2026-06-15: 真实浏览器验收通过，证据目录：`output/playwright/terminal-run-summary-ui-2026-06-15T18-25-00/`。
- 2026-06-15: 真实玩家入口：打开 `/`，用浏览器鼠标点击 `#full-run-btn`，再点击战报页签；截图：`01_initial.png`、`02_after_full_run_report.png`；结构化证据：`evidence.json`。
- 2026-06-15: 浏览器断言：Day10、phase=`day_end`、terminal kind=`final_boss`、`terminalSummary.nextStepText`=`查看终局报告`、顶部 `#next-step-label` 文案完整、CSS `white-space`=`normal`、`nextActions` 不含 `PICK_REWARD` / `CLAIM_ROUTE_REWARD`、战报包含 `【跨天成长】` 和 Day10、console/page error 数量为 0。
- 2026-06-15: 主线程截图复核：顶部状态显示 Day10 / 终局 defeat，下一步完整显示 `查看终局报告`（换行显示，无省略号），未见明显遮挡、错位、空白或错误数值。
- 2026-06-15: 自动提交检查未满足：工作区存在前序任务暂存和未归属本任务的脏文件；本任务只做精确暂存，提交需按 Commit Plan 由后续统一处理。
