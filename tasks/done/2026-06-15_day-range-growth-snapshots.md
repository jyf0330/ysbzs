# 跨天构筑成长快照

## task_id

2026-06-15_day-range-growth-snapshots

## 目标

推进 `docs/BAZAAR_OUTER_LOOP_ACCEPTANCE.md` 第三层和 Phase C/F：Day1-Day10 自动 run 不只记录每天节点历史和战斗 outcome，还要记录跨天经济、背包、遗物和构筑核心快照，方便验收一局 run 的成长轨迹。

## 本任务推进本文哪一层验收

- 第三层：构筑成长验收，背包、金币、奖励候选、构筑状态能被读取并追踪。
- Phase C：Day1-Day10 结构闭环，自动脚本能跑到终局并解释成长状态。
- Phase F：发布级竖切，外层 run、构筑、战斗、奖励在报告中闭环。

## 外层状态字段

- `state.dayRouteRuns[]`
- `state.gold`
- `state.inventory[]`
- `state.relics[]`
- `buildConstructionSummary(state)`

## 玩家入口

- `runDayRangeScenario({ fromDay: 1, toDay: 10 })`
- `/api/report` 对应的 `renderPlayerReport(state)`

## ViewModel / report 证据

- 每日 run 快照包含 `economy.goldFrom/goldTo/goldDelta`。
- 每日 run 快照包含 `construction.inventoryCount/activeCount/benchCount/relicCount/buildCore`。
- 玩家战报包含 `【跨天成长】` 段落。

## related_files

- `src/scenarios/fullDay.cjs`
- `src/render/textReport.cjs`
- `tests/run_all_tests.cjs`
- `docs/10_CHANGELOG.md`
- `tasks/index.md`
- `tasks/done/2026-06-15_day-range-growth-snapshots.md`

## unowned_dirty_files

- `.gitignore`
- `pipeline/output.md`
- `pipeline/prompt.md`
- `pipeline/run.sh`
- `pipeline/state.json`
- `state.json.tmp`
- 已暂存但未提交的前序任务文件：`src/core/battle/resolution.cjs`、`src/core/battleEventProtocol.cjs`、`src/core/dayRoute.cjs`、`src/core/explainTrace.cjs`、`src/render/textReport.cjs`、`src/uiAdapter.cjs`、`tests/run_all_tests.cjs`、`tests/ui_adapter.test.cjs`、`tests/unit/ui_module_render_cache.test.cjs`、`web/js/main.js`、`web/ux-app.css`、`tasks/done/2026-06-15_route-battle-pressure-preview.md`、`tasks/done/2026-06-15_object-registry-fire-trap-trigger.md`、`tasks/done/2026-06-15_trigger-object-readable-report.md`

## commit_plan

`feat: 记录跨天构筑成长快照`

## 验证计划

- `node tests/run_all_tests.cjs`
- `node --test tests/full_coverage.test.cjs`
- `npm run check:all`
- `npm run test:coverage`
- `git diff --check`

## 可见验收

本任务不改浏览器 DOM、CSS、棋盘布局或交互；只增加 scenario 结构化快照和文本战报段落，不触发截图门禁。

## 进度记录

- 2026-06-15: 创建任务卡，占用跨天 run 快照相关文件；记录当前已有未归属脏文件，后续不纳入本任务提交。
- 2026-06-15: TDD 红灯：新增 `Day1-Day10 route records economy and construction growth snapshots`，要求 `dayRouteRuns[]` 每天暴露 economy / construction 快照，玩家战报包含 `【跨天成长】`；运行 `node tests/run_all_tests.cjs` 失败于 day1 缺少 economy snapshot。
- 2026-06-15: 实现 `runDayRangeScenario` 每日经济与构筑快照，玩家战报新增跨天成长段落。
- 2026-06-15: `node tests/run_all_tests.cjs` 通过，63/63。
- 2026-06-15: `node --test tests/full_coverage.test.cjs` 通过，9/9。
- 2026-06-15: `npm run check:all` 通过：主测试 63/63、unit 56/56、UI 30/30、full 9/9、ops 12/12、prediction 4/4、architecture/csv/day7/dom/ui-connected/jsdoc 全部 PASS。
- 2026-06-15: `npm run test:coverage` 通过，121/121，all files line 92.30% / branch 64.98% / funcs 91.20%。
- 2026-06-15: `git diff --check` 通过。
- 2026-06-15: 自动提交检查未满足：工作区存在不归属当前任务的已暂存/未暂存文件；本任务只做精确暂存并输出 Commit Plan。
