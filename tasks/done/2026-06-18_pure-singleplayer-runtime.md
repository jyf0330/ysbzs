# 2026-06-18_pure-singleplayer-runtime

## 状态

- task_id: `2026-06-18_pure-singleplayer-runtime`
- 类型: 架构 / 浏览器单机运行时
- 目标: 将主浏览器游戏推进为可静态加载的纯单机模式，默认不依赖 `/api/*` HTTP 服务，同时保留 HTTP runtime 作为开发/回归入口；战斗界面核心操作无明显卡顿。
- 状态: done

## related_files

- `web/index.html`
- `web/js/runtime-client.js`
- `web/js/local-engine.js`
- `src/core/battle/planning.cjs`
- `src/uiAdapter.cjs`
- `tools/build_local_engine_bundle.cjs`
- `tools/check_ui_connected.cjs`
- `tools/check_browser_player_flow.cjs`
- `tools/check_pure_singleplayer_browser.cjs`
- `tools/check_battle_ui_responsiveness.cjs`
- `tools/audit_singleplayer_architecture.cjs`
- `tests/unit/singleplayer_runtime.test.cjs`
- `tasks/index.md`
- `tasks/done/2026-06-18_pure-singleplayer-runtime.md`
- `external_ai/prompts/2026-06-18_pure-singleplayer-runtime.md`
- `external_ai/logs/2026-06-18_pure-singleplayer-runtime_attempt1.log`

## 开工前未归属改动

- `docs/PAPER_BATTLE_UI_START_HERE.md` 未跟踪，非本任务产物。
- `tools/check_paper_battle_ui.cjs` 未跟踪，非本任务产物。
- `web/assets/reference_trace_base.jpeg` 未跟踪，非本任务产物。
- `web/paper-battle.css` 未跟踪，非本任务产物。
- `web/paper-battle.html` 未跟踪，非本任务产物。
- `web/paper-battle.js` 未跟踪，非本任务产物。

## 外部 AI 协作

- session: `ysbzs-extai-pure-singleplayer`
- prompt: `external_ai/prompts/2026-06-18_pure-singleplayer-runtime.md`
- log: `external_ai/logs/2026-06-18_pure-singleplayer-runtime_attempt1.log`
- attempt: 1/3
- 结果: 用户中途改为“你自己做吧”，Lead 已中断并关闭 tmux 会话；外部 AI 只读/探索，未产生代码改动。
- Lead 规则: 外部 AI 不提交；Lead 已复核 diff、测试、真实浏览器截图。

## 实施记录

- 新增 `tools/build_local_engine_bundle.cjs`，把 `src/**/*.cjs` 与 `data/csv/*.csv` 打成浏览器可执行的 `web/js/local-engine.js`，并注册 `window.__YSBZS_LOCAL_ENGINE_FACTORY__`。
- `web/index.html` 在主 ES module 前加载 `js/local-engine.js`。
- `web/js/runtime-client.js` 默认选择 `local` runtime，显式 `?runtime=http` 才回到 HTTP runtime；local runtime 可从 factory 创建 engine，并继续提供统一 `view/report/action/save/load/request` 方法。
- `tools/check_pure_singleplayer_browser.cjs` 新增真实浏览器验收：默认页面使用 bundled local engine，点击开始战斗、棋盘移动、行动槽、保存/读取、战报标签，并断言没有 `/api/view|action|report|save|load` 请求。
- `tools/check_ui_connected.cjs`、`tools/audit_singleplayer_architecture.cjs`、`tests/unit/singleplayer_runtime.test.cjs` 已补 local bundle / local default / HTTP fallback 合同。
- 新增 `tools/check_battle_ui_responsiveness.cjs`，真实浏览器默认 local runtime 测量开始战斗、棋盘选中、移动、行动块、目标选择、释放、保存/读取、战报标签响应时间。
- 响应性优化：
  - `src/uiAdapter.cjs` 增加 `includeAuthoritativeState` 开关，local bundle 关闭 action 结果里的重复 `authoritativeState` 快照构建。
  - `tools/build_local_engine_bundle.cjs` 改为从 `src/adapters/serverAuthorityAdapter.cjs` 收集依赖图，避免把暂停/其他任务的未跟踪 `src` 文件打进 browser bundle。
  - `src/core/battle/planning.cjs` 保留 `buildMoveRiskGrid()` 默认完整沙盒输出，但新增 `summaryOnly` 分支供轻量路径使用。
  - ViewModel 热路径不再默认计算全量 `moveRiskGrid`；核心函数和测试里的完整落点沙盒能力保留。

## 验证计划

- RED/GREEN: `node --test tests/unit/singleplayer_runtime.test.cjs`
- 单机架构审计: `node tools/audit_singleplayer_architecture.cjs`
- UI 合同: `node tools/check_ui_connected.cjs`
- 项目级: `node tests/run_all_tests.cjs`
- 完整检查: `npm run check:all`
- 可见验收: 独立 tester pass 真实浏览器打开主界面，默认纯单机模式操作按钮/棋盘，保存截图到 `output/playwright/`，记录 DOM/ViewModel/state/console/API 请求证据。

## 验证结果

- `node tools/build_local_engine_bundle.cjs` 通过，生成 `web/js/local-engine.js`。
- `node --test tests/unit/singleplayer_runtime.test.cjs` 通过，4/4 pass。
- `node tools/audit_singleplayer_architecture.cjs` 通过。
- `node tools/check_ui_connected.cjs` 通过。
- `YSBZS_BROWSER_EVIDENCE_DIR=output/playwright/2026-06-18_pure-singleplayer-runtime node tools/check_pure_singleplayer_browser.cjs` 通过。
- `node tests/run_all_tests.cjs` 通过，63/63 tests passed。
- `npm run check:all` 通过。
- `npm run test:coverage` 通过，128/128 tests passed。
- `YSBZS_BROWSER_EVIDENCE_DIR=output/playwright/2026-06-18_battle-ui-responsiveness node tools/check_battle_ui_responsiveness.cjs` 通过，max=113ms，p95=113ms。
- `git diff --check` 通过。

## 可见验收证据

- tester pass: `tools/check_pure_singleplayer_browser.cjs`
- screenshot/report dir: `output/playwright/2026-06-18_pure-singleplayer-runtime/`
- screenshots:
  - `output/playwright/2026-06-18_pure-singleplayer-runtime/01_loaded_local_runtime.png`
  - `output/playwright/2026-06-18_pure-singleplayer-runtime/02_player_turn.png`
  - `output/playwright/2026-06-18_pure-singleplayer-runtime/03_hero_moved.png`
  - `output/playwright/2026-06-18_pure-singleplayer-runtime/04_slot_action.png`
  - `output/playwright/2026-06-18_pure-singleplayer-runtime/05_load_restored.png`
  - `output/playwright/2026-06-18_pure-singleplayer-runtime/06_report_tab.png`
- DOM/ViewModel/state assertion: final ViewModel `phase=player_turn`, `stateVersion=3`, `events=6`, selected cell `r=6,c=4`。
- API assertion: `apiRequests=[]` for `/api/view|action|report|save|load` during page operation.
- console/pageerror: `consoleErrors=[]`, `pageErrors=[]`.
- 主线程截图复核: 首屏和行动槽截图已查看，核心 UI 可见，未见明显遮挡/错位/缺失。

## 响应性验收证据

- tester pass: `tools/check_battle_ui_responsiveness.cjs`
- report: `output/playwright/2026-06-18_battle-ui-responsiveness/battle_ui_responsiveness.json`
- screenshot: `output/playwright/2026-06-18_battle-ui-responsiveness/battle_ui_responsiveness_final.png`
- thresholds: `maxStepMs=500`, `p95StepMs=250`
- result: max `113ms`, p95 `113ms`, count `9`
- steps:
  - start battle: `113ms`
  - select hero cell: `105ms`
  - move hero: `71ms`
  - open action block: `67ms`
  - select target cell: `92ms`
  - use action block: `55ms`
  - save game: `42ms`
  - load game: `51ms`
  - open report tab: `38ms`
- API assertion: `apiRequests=[]` for `/api/view|action|report|save|load` during response test.
- console/pageerror: `consoleErrors=[]`, `pageErrors=[]`.
- 主线程截图复核: 响应性截图已查看，棋盘/行动块/右侧详情/日志区域可见，未见明显遮挡/错位/缺失。

## commit_plan

- message: `feat(ui): make browser runtime pure singleplayer`
- status: user_requested_precise_commit
- 说明: 用户已要求提交；提交时只暂存本任务文件，工作区内 puzzle solver、paper-battle、LibreOffice 锁文件等非本任务改动保留未暂存。
