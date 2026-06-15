# 触发对象可读战报

## task_id

2026-06-15_trigger-object-readable-report

## 目标

推进 `docs/BAZAAR_OUTER_LOOP_ACCEPTANCE.md` 第五层：`objectRegistry` 火陷阱触发不只进入 changeLog / battleTrace，还要能被文字战报和 trace 解释层读懂，形成可复盘的触发链。

## 验收映射

- 第五层物体触发系统：触发结果写入结构化 changeLog，并能生成玩家可读战报。
- Phase E：replay 数据足以复盘一次关键战斗。

## 外层状态字段

- `state.changes[]`
- `state.battleTrace[]`
- `FIRE_TRAP_TRIGGER.object`

## 玩家入口

- `START_BATTLE`
- 真实战斗移动/踩格链路中的 `triggerTerrainOnEnter`
- `/api/report` 读取文字战报

## ViewModel / report 证据

- `buildTraceFromChanges(state.changes)` 包含 `fire_trap_*`
- `renderPlayerReport(state)` 包含触发对象说明
- battleTrace `TRIGGER_OBJECT_RESOLVE` 有对象协议字段

## related_files

- `src/core/battleEventProtocol.cjs`
- `src/core/explainTrace.cjs`
- `src/render/textReport.cjs`
- `tests/run_all_tests.cjs`
- `docs/10_CHANGELOG.md`
- `tasks/index.md`
- `tasks/done/2026-06-15_trigger-object-readable-report.md`

## unowned_dirty_files

- `.gitignore`
- `pipeline/output.md`
- `pipeline/prompt.md`
- `pipeline/run.sh`
- `pipeline/state.json`
- `state.json.tmp`
- 已暂存但未提交的前序任务文件：`src/core/dayRoute.cjs`、`src/uiAdapter.cjs`、`src/core/battle/resolution.cjs`、`tests/ui_adapter.test.cjs`、`tests/unit/ui_module_render_cache.test.cjs`、`web/js/main.js`、`web/ux-app.css`、`tasks/done/2026-06-15_route-battle-pressure-preview.md`、`tasks/done/2026-06-15_object-registry-fire-trap-trigger.md`

## commit_plan

`feat: 输出触发对象战报`

## 验证计划

- `node tests/run_all_tests.cjs`
- `node --test tests/full_coverage.test.cjs`
- `npm run check:all`
- `npm run test:coverage`
- `git diff --check`

## 可见验收

本任务不修改浏览器 DOM、CSS、棋盘显示、布局或可见交互；只增加文字战报 / replay 解释证据，不触发提交前截图门禁。

## 进度记录

- 2026-06-15: 创建任务卡，占用触发对象可读战报相关文件；记录当前已有未归属脏文件，后续不纳入本任务提交。
- 2026-06-15: TDD 红灯：扩展 `route trap bonus event arms next battle fire trap modifier and consumes on trigger`，要求 `TRIGGER_OBJECT_RESOLVE` battleTrace protocol 包含 `object=fire_trap_*`，`buildTraceFromChanges` 和 `renderPlayerReport` 能输出触发对象说明；运行 `node tests/run_all_tests.cjs` 失败于 protocol 缺少 object 字段。
- 2026-06-15: 实现 `battleEventProtocol` 的 `TRIGGER_OBJECT_RESOLVE` 解释和 protocol object 字段，`explainTrace` 输出触发物体说明，玩家报告新增 `【触发链】` 摘要。
- 2026-06-15: `node tests/run_all_tests.cjs` 通过，62/62。
- 2026-06-15: `node --test tests/full_coverage.test.cjs` 通过，9/9。
- 2026-06-15: `node tools/audit_singleplayer_architecture.cjs` 通过，核心无 DOM、单机架构门禁 PASS。
- 2026-06-15: `git diff --check` 通过。
- 2026-06-15: `npm run check:all` 通过：主测试 62/62、unit 56/56、UI 30/30、full 9/9、ops 12/12、prediction 4/4、architecture/csv/day7/dom/ui-connected/jsdoc 全部 PASS。
- 2026-06-15: `npm run test:coverage` 通过，121/121，all files line 92.30% / branch 65.06% / funcs 91.20%。
- 2026-06-15: 自动提交检查未满足：工作区存在不归属当前任务的已暂存/未暂存文件；本任务只做精确暂存并输出 Commit Plan。
