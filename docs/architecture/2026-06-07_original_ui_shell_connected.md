# 参考项目 UI 外壳接入说明

## 目标

把原项目压缩包里的 `index.html` UI 壳接到新核心，避免继续使用临时调试 UI。

## 当前连接方式

浏览器加载：

```text
web/index.html
旧 web 脚本壳/兼容函数
original-ui-compat-adapter.js
```

`web/index.html` 来自原项目 UI，仍保留旧脚本加载顺序以兼容 DOM/id/样式：

```text
external-tables.js → data.js → rng.js → board.js → actions.js → elements.js → waves.js → battle.js → shop.js → game.js → ui.js
```

其中 `web/battle.js`、`web/elements.js` 已改为兼容壳，不再执行真实战斗和元素规则。运行时由 `tools/run_ui_server.cjs` 注入 `original-ui-compat-adapter.js`，所有按钮通过 `/api/action` 进入 `src/uiAdapter.cjs`。

## UI 边界

`original-ui-compat-adapter.js` 只允许访问：

```text
GET  /api/view
GET  /api/report?mode=player|shop
POST /api/session/new
POST /api/action
GET  /api/data/summary
```

它不读取 `src/core`，不读取 `src/uiAdapter.cjs`，不计算战斗规则。

## 已映射的原 UI 区域

- 顶栏：我方英雄 HP、敌方Boss HP、阶段、天数、回合、金币。
- 中央棋盘：8×8 单位层、Leader/Boss 层、地形层、元素层、预览/威胁信息层。
- 左栏：我方阵容、单位状态、选中格信息。
- 右栏：行动槽展示、战报摘要。
- 底部：事件日志、主操作按钮。
- 商店弹层：商品、价格、冻结、购买、商店事件。

## 验收

```bash
npm run check:ui-connected
node tools/check_browser_player_flow.cjs
npm run check:all
```
