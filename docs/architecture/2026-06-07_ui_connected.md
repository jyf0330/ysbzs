# UI 已接入：单一适配层边界

本包把 UI 也接入到新架构，但保持核心边界：

```text
Browser UI(web/) → HTTP API(tools/run_ui_server.cjs) → src/uiAdapter.cjs → core reducer/event log → ViewModel/TextReport → Browser UI
```

## 关键规则

1. `web/app.js` 只能调用 `/api/*`，不得 import/require `src/core`、`src/uiAdapter.cjs`。
2. `tools/run_ui_server.cjs` 是浏览器 UI 和核心适配层之间的本地桥。
3. `src/uiAdapter.cjs` 是唯一游戏功能门面，UI 可见功能都从这里进出。
4. `src/core/**` 仍然无 DOM、无浏览器 API、无渲染逻辑。
5. UI 只展示 ViewModel、事件日志、文字战报，不反推规则。

## 已接 UI 功能

- 新建局
- 开始战斗
- 选择英雄、点击棋盘移动
- 选择行动槽、调整方向、施放
- 结束玩家回合、怪物行动、自动战斗
- 生成奖励候选
- 选择奖励
- 进入商店
- 刷新商店
- 冻结/解冻商品
- 购买商品
- 商店事件
- 离开商店
- 查看我方/敌方/奖励/商店/事件日志/文字战报

## 单轨证明

- `web/battle.js` 和 `web/elements.js` 是兼容壳，真实战斗和元素计算只在 `src/core`。
- 顶栏血条读取 `ViewModel.leaders.player/enemy`，不再用 `castleLine` 或 `enemies.length` 伪造。
- 棋盘格读取 `ViewModel.board.cells`，展示单位层、地形模块、未成型元素、预览和威胁。
- 敌方元素保留在核心 `cell.elements/elementCamps`，默认 ViewModel 按阵营规则隐藏。

## 运行

```bash
npm run ui
```

打开：

```text
http://127.0.0.1:4173
```

## 验收

```bash
npm run check:ui-connected
node tools/check_browser_player_flow.cjs
npm run check:all
```
