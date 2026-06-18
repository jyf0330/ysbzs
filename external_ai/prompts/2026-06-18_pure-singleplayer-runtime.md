# 外部 AI 任务：主界面改成纯浏览器单机运行

你是 External AI Worker。工作目录：`/Users/ywh/Documents/ysbzs`。

## 必读规则

1. 先读：
   - `docs/02_CURRENT_WORKFLOW.md`
   - `docs/00_AI_START_HERE.md`
   - `docs/roles/PROGRAMMER_START.md`
   - `tasks/index.md`
   - `tasks/doing/2026-06-18_pure-singleplayer-runtime.md`
2. 核心层不得直接操作 DOM，不得出现 `document` / `querySelector` / `innerHTML` / `classList` / `addEventListener`。
3. UI 层只能发交互意图，不得直接修改核心 state。
4. 玩家链路仍走统一 runtime API：`view()` / `report()` / `action()` / `save()` / `load()` / `request()`。不要在 UI 主入口重新散落 fetch。
5. 不要恢复旧 `web/ui.js / game.js / board.js / battle.js / shop.js`。
6. 不要提交，不要 `git add .`。

## 当前目标

把主游戏页面从“HTTP 服务优先，`?runtime=local` 需要外部注入 engine”推进到“默认可纯浏览器单机运行”：

- `web/index.html` 静态加载后应默认使用本地单机 engine。
- 本地 engine 要能在浏览器里创建并持有游戏状态，提供和 HTTP runtime 一致的方法：
  - `view()`
  - `report(mode)`
  - `action(command)`
  - `save()`
  - `load(saveDoc)`
  - `request(pathname, body)`
- 保留 HTTP 模式作为显式开发/回归入口，例如 `?runtime=http` 或 `window.__YSBZS_RUNTIME_MODE__ = 'http'`。
- 主 UI 的按钮、棋盘点击、保存/读取仍经 `runtime.*`。
- 单机模式存档使用 `localStorage`，保存可恢复 ViewModel。

## 推荐实现方向

本仓库核心是 CommonJS，浏览器不能直接 import `src/*.cjs`。请优先采用最小、可审计的 bundle 方案：

1. 新增 `tools/build_local_engine_bundle.cjs`，用 esbuild 或可用打包器把一个 CommonJS bridge 打到 `web/js/local-engine.js`。
2. bundle bridge 可在构建时 require `src/adapters/serverAuthorityAdapter.cjs` 或等价 adapter，导出/注册 `window.__YSBZS_LOCAL_ENGINE_FACTORY__`。
3. `web/js/runtime-client.js` 在 local 模式下：
   - 优先使用 `options.engine`
   - 其次使用 `window.__YSBZS_LOCAL_ENGINE__`
   - 再使用 `window.__YSBZS_LOCAL_ENGINE_FACTORY__` 创建 engine
   - 默认 runtime mode 应变为 `local`，除非显式 `?runtime=http`
4. `web/index.html` 加载 `js/local-engine.js` 后再加载 `js/main.js`。
5. 更新测试，让它验证：
   - 默认 mode 是 local
   - 支持 `runtime=http`
   - HTML 加载 local-engine bundle
   - `runtime-client.js` 使用 local engine factory
   - UI 仍不 import core / adapter

## 允许修改文件

只允许改这些文件：

- `web/index.html`
- `web/js/runtime-client.js`
- `web/js/local-engine.js`
- `tools/build_local_engine_bundle.cjs`
- `tools/check_ui_connected.cjs`
- `tools/check_browser_player_flow.cjs`
- `tools/record_browser_player_flow.cjs`
- `tools/audit_singleplayer_architecture.cjs`
- `tests/unit/singleplayer_runtime.test.cjs`
- `tasks/doing/2026-06-18_pure-singleplayer-runtime.md`

如果你发现必须改其他文件，先停止并在终端说明原因。

## 验证顺序

1. 先跑红测：`node --test tests/unit/singleplayer_runtime.test.cjs`。
2. 实现后至少跑：
   - `node --test tests/unit/singleplayer_runtime.test.cjs`
   - `node tools/audit_singleplayer_architecture.cjs`
   - `node tools/check_ui_connected.cjs`
3. 如果时间允许再跑：
   - `node tests/run_all_tests.cjs`
   - `npm run check:all`

## 输出要求

完成后在终端输出：

- 修改了哪些文件
- 单机模式入口怎么验证
- 跑过哪些命令及结果
- 剩余风险
