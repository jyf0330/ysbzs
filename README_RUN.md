# 元素背包史 · 运行与验收说明（本地预测/服务器权威预留版）

当前包是：**30 宠 CSV 单源数据 + 重构版浏览器 UI + 服务器权威入口 + per-player ViewModel + UI 缺口补齐版**。

## 运行

```bash
npm install
npm run ui
```

浏览器打开：`http://127.0.0.1:4195`

## 当前前端入口

只保留新 UI 层：

- `web/index.html`
- `web/ux-app.css`
- `web/ux-app.js`

旧 `web/ui.js / game.js / board.js / battle.js / shop.js / original-ui-compat-adapter.js` 已移除。浏览器层不保存独立战斗状态，只从 `/api/view` 读取 ViewModel，只向 `/api/action` 发送 Command。

## 新架构入口

新增：

- `src/core/multiplayerState.cjs`
- `src/core/commandEnvelope.cjs`
- `src/core/stateHash.cjs`
- `src/adapters/localAdapter.cjs`
- `src/adapters/serverAuthorityAdapter.cjs`
- `tests/prediction_authority.test.cjs`
- `docs/architecture/2026-06-09_prediction-server-authority.md`

核心口径：

```txt
Click → Command → Core → Events → GameState → ViewModel → Render
```

以后联机口径：

```txt
客户端本地预测 → 服务器权威验证 → stateHash 对齐则确认，不一致则服务器状态覆盖
```

## 核心验收

```bash
npm run check:all
npm run test:coverage
npm run test:prediction
```

`test:prediction` 专门验证以后本地/服务器两条路不会分叉。

## 真实浏览器验收

```bash
npm run verify:browser:evidence
```

会真实打开 Chromium，用鼠标事件点击页面，不走 API fallback。输出：

- `evidence/browser-real-flow/REAL_BROWSER_VERIFICATION.md`
- `evidence/browser-real-flow/verified_flow.json`
- `evidence/browser-real-flow/screenshots/*.png`
- `evidence/browser-real-flow/ysbzs_real_browser_player_flow.mp4`

注意：部分容器环境有 Chromium 托管策略 `URLBlocklist: ["*"]`，会拦截 `127.0.0.1`。普通本地环境直接运行即可；如果在受限容器里跑，需要先解除该容器策略，否则严格浏览器验收会失败。

## 数据口径

当前版本以 `data/csv` 为真源，标准规模：

- pets: 30
- monsters: 30
- waves: 12
- mechanisms: 41
- events: 7
- shop: 30
- relics: 10
- shapes: 30
- validation: 10


## 2026-06-09 优化第 2 轮

新增/变更命令：

```bash
npm run test:unit
npm run tools:diff -- before.json after.json
npm run tools:compare-replays -- replay-a.json replay-b.json
```

关键变化：

- 玩家全图移动不再依赖 `moveMode: infinite`，改为单位字段 `moveRange`。
- UI 棋盘/英雄/行动槽/奖励/商店改为事件委托，不再每次渲染重新绑定大量监听器。
- `runCommand()` 不再在 `finally` 中做第二次全量 `render()`。
- `events.cjs` 增加事件级别和过滤工具，但不写 `Date.now()`，保持本地预测和服务器权威一致。
- `run_ui_server.cjs` 支持 `x-session-id` 或 `?sessionId=` 区分多个本地会话。


## 2026-06-09 优化第 4 轮

本轮闭环了前面列出的架构和 UI 缺口：

- `tools/run_ui_server.cjs` 真实接入 `serverAuthorityAdapter(strictVersion)`。
- `selected` 从权威 GameState 拆到 per-player ViewState，选择/点格/选槽不再推进 `stateVersion`。
- 新增 `buildViewModelForPlayer(state, playerId, viewState)` 口径。
- `RUN_FULL_DAY` 不再重复写入 `battleTrace`。
- UI 补齐阵容管理、战斗回放、格详情、商店事件、调试面板、AP 分配、工具提示。
- 真实浏览器验证新增 AP 弹窗、回放标签、tooltip hover、Ctrl+` 调试面板操作。

新增防回退测试：

```bash
node --test tests/unit/architecture_round4.test.cjs
```

详细说明：`docs/architecture/2026-06-09_round4-authority-ui-gaps.md`

## 2026-06-09 Round5 单机架构加固

新增命令：

```bash
npm run check:architecture
npm run check:all
npm run verify:browser:evidence
```

新增能力：浏览器“保存/读取”按钮，服务端 `/api/save` / `/api/load`，核心 `USE_SLOT` AP 消耗，机制门禁，事件投影统一入口。
