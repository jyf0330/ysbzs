# 2026-06-11_singleplayer-runtime-mode

## 状态

- task_id: `2026-06-11_singleplayer-runtime-mode`
- 类型: 架构 / 浏览器运行时
- 目标: 将浏览器 UI 从写死 HTTP API 改为运行时客户端入口，默认保持现有 HTTP 行为，并补出可切换到单机运行的接口边界。
- 状态: done

## related_files

- `web/js/runtime-client.js`
- `web/js/main.js`
- `tools/check_ui_connected.cjs`
- `tests/unit/singleplayer_runtime.test.cjs`
- `tasks/index.md`
- `tasks/doing/2026-06-11_singleplayer-runtime-mode.md`

## 开工前未归属改动

- `docs/02_CURRENT_WORKFLOW.md` 已有 workflow skill routing 改动，非本任务产物。
- `tasks/index.md` 已有 `2026-06-11_workflow-consult-skill-routing` DONE 记录，非本任务产物；本任务只追加 ACTIVE/DONE 任务状态。
- `tasks/done/2026-06-11_workflow-consult-skill-routing.md` 是开工前已有未跟踪文件，非本任务产物。

## 验证计划

- RED/GREEN: `node --test tests/unit/singleplayer_runtime.test.cjs`
- 合同检查: `node tools/check_ui_connected.cjs`
- 项目级: `node tests/run_all_tests.cjs`
- 完整检查: `npm run check:all`

## 实施记录

- 新增 `web/js/runtime-client.js`，统一暴露 `createGameRuntime`、`createHttpRuntime`、`createLocalRuntime`、`resolveRuntimeMode`、`resolveApiBase`。
- `web/js/main.js` 保留现有页面行为，但不再在入口中直接 `fetch('/api/*')`；`view/report/action/save/load` 统一经 runtime 方法调用。
- HTTP runtime 默认保持现有本机服务行为；部署在 `/ysbzs/` 路径时自动把 `/api/*` 映射到 `/ysbzs-api/*`。
- Local runtime 支持 `?runtime=local` 或 `window.__YSBZS_RUNTIME_MODE__ = 'local'`，并通过 `window.__YSBZS_LOCAL_ENGINE__` 接管同一套 `view/report/action/save/load` 方法，为后续纯单机引擎打包留入口。
- `tools/check_ui_connected.cjs` 同时检查 `main.js` 与 `runtime-client.js`，继续禁止浏览器层导入核心或 adapter。
- `docs/10_CHANGELOG.md` 当前不存在，本轮未新建 changelog。

## 验证结果

- RED: `node --test tests/unit/singleplayer_runtime.test.cjs` 失败，缺少 `runtime-client.js`、`main.js` 未接 runtime、UI 连接检查未覆盖 runtime。
- GREEN: `node --test tests/unit/singleplayer_runtime.test.cjs` 通过，3/3 pass。
- UI 合同: `node tools/check_ui_connected.cjs` 通过。
- 项目级: `node tests/run_all_tests.cjs` 通过，44/44 tests passed。
- 完整检查: `npm run check:all` 通过，包含 47 个 unit 子测试与 UI/full/ops/prediction/architecture/csv/day7/dom/ui-connected/jsdoc。
- Whitespace: `git diff --check` 通过。

## commit_plan

- message: `feat(ui): add local-first runtime client`
- status: blocked_unrelated_dirty_files
- 说明: 开工前已有 `docs/02_CURRENT_WORKFLOW.md`、`tasks/index.md`、`tasks/done/2026-06-11_workflow-consult-skill-routing.md` 未归属改动；其中 `tasks/index.md` 与本任务收尾同文件，自动提交会混入非本任务内容，因此本轮只输出 Commit Plan，不自行提交。
