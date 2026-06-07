# 元素背包史 · 参考项目 UI 已接入版

本包使用 `ysbzs-ai-context-20260603.tar.gz` 里的原项目 `index.html` 作为 UI 外壳，保留原来的羊皮纸/棋盘/左右栏/底部日志/商店弹层结构。

运行：

```bash
npm run ui
```

打开：

```text
http://127.0.0.1:4173
```

接入边界：

```text
原项目 web/index.html + web/orig-ui-bridge.js
  ↓ 只调用 /api/*
tools/run_ui_server.cjs
  ↓ 只调用 src/uiAdapter.cjs
src/uiAdapter.cjs
  ↓ core reducer / battle / shop / report
src/core/**
```

规则：

- UI 不直接 import `src/core`。
- UI 不直接 import `src/uiAdapter.cjs`。
- UI 只读 `/api/view`、`/api/report`，只写 `/api/action`。
- 原项目旧 `game.js/ui.js/battle.js/shop.js` 不再由浏览器加载，避免旧规则污染。
- 原 UI 结构和样式作为展示壳，数据完全来自新架构 ViewModel。

已接功能：新建局、开始战斗、奖励候选、选奖励、进入商店、刷新、冻结/解冻、购买、商店事件、离店、普通战报、商店战报、棋盘展示、英雄栏、行动槽栏、底部事件日志。
