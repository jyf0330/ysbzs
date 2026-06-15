# objectRegistry 火陷阱触发闭环

## task_id

2026-06-15_object-registry-fire-trap-trigger

## 目标

推进 `docs/BAZAAR_OUTER_LOOP_ACCEPTANCE.md` 第五层：让 `objectRegistry` 不只是导出/manifest 收集器，而是在常用战斗触发链路中参与火陷阱触发，给 `triggerQueue / objectRegistry / changeLog` 留下同一对象的结构化证据。

## 验收映射

- 第五层物体触发系统：场上元素包、陷阱、外层奖励能进入统一可触发对象视图。
- Phase E：结构化日志能解释一次关键触发链。

## 外层状态字段

- `state.board.cells[].elements`
- `state.board.cells[].elementCamps`
- `state.changes[]`
- `state.battleTrace[]`

## 玩家入口

- `START_BATTLE`
- `triggerTerrainOnEnter` 所在真实战斗移动/踩格链路

## ViewModel / report 证据

- `FIRE_TRAP_TRIGGER.object`
- `TRIGGER_OBJECT_RESOLVE`
- `buildModuleManifest(state).effectObjects`

## related_files

- `src/core/objectRegistry.cjs`
- `src/core/battle/resolution.cjs`
- `src/core/battle.cjs`
- `tests/run_all_tests.cjs`
- `docs/10_CHANGELOG.md`
- `tasks/index.md`
- `tasks/done/2026-06-15_object-registry-fire-trap-trigger.md`

## unowned_dirty_files

- `.gitignore`
- `pipeline/output.md`
- `pipeline/prompt.md`
- `pipeline/run.sh`
- `pipeline/state.json`
- `state.json.tmp`
- 已暂存但未提交的上一任务文件：`src/core/dayRoute.cjs`、`src/uiAdapter.cjs`、`tests/ui_adapter.test.cjs`、`tests/unit/ui_module_render_cache.test.cjs`、`web/js/main.js`、`web/ux-app.css`、`docs/10_CHANGELOG.md`、`tasks/index.md`、`tasks/done/2026-06-15_route-battle-pressure-preview.md`

## commit_plan

`feat: 接入 objectRegistry 火陷阱触发`

## 验证计划

- `node tests/run_all_tests.cjs`
- `node --test tests/full_coverage.test.cjs`
- `npm run check:all`
- `npm run test:coverage`
- `git diff --check`

## 可见验收

本任务不修改浏览器 DOM、CSS、棋盘显示、布局或可见交互；只增加核心 objectRegistry / trigger / changeLog 证据，不触发提交前截图门禁。

## 进度记录

- 2026-06-15: 创建任务卡，占用 objectRegistry 火陷阱触发相关文件；记录当前已有未归属脏文件，后续不纳入本任务提交。
- 2026-06-15: TDD 红灯：扩展 `route trap bonus event arms next battle fire trap modifier and consumes on trigger`，要求火陷阱触发前 `buildModuleManifest(state).effectObjects` 能找到 `fire_trap_*`，触发事件写入 `object.objectId`，并产生 `TRIGGER_OBJECT_RESOLVE` changeLog；运行 `node tests/run_all_tests.cjs` 失败于 `trigger.object` 缺失。
- 2026-06-15: 实现 `triggerTerrainOnEnter` 在火陷阱触发前通过 `collectEffectObjects(state)` 定位 `fire_trap_r_c`，触发后写入 `FIRE_TRAP_TRIGGER.object` 和 `TRIGGER_OBJECT_RESOLVE`。
- 2026-06-15: `node tests/run_all_tests.cjs` 通过，62/62。
- 2026-06-15: `node --test tests/full_coverage.test.cjs` 通过，9/9；`node tools/audit_singleplayer_architecture.cjs` 通过；`git diff --check` 通过。
- 2026-06-15: `npm run check:all` 通过：main 62/62、unit 56/56、ui 30/30、full 9/9、ops 12/12、prediction 4/4；architecture、CSV、Day7 browser、no DOM、UI connected、JSDoc 全部 PASS。
- 2026-06-15: `npm run test:coverage` 通过，121/121，all files line coverage 92.33%。
- 2026-06-15: 本任务不触发可见截图门禁，原因：未修改 DOM/CSS/棋盘显示/布局/交互反馈，只增加核心 objectRegistry / changeLog 证据。
- 2026-06-15: 自动提交被阻断：当前暂存区包含未归属 `pipeline/*`、`state.json.tmp` 以及上一任务未提交文件；按任务规则不提交。
