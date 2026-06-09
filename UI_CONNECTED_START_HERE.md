# UI_CONNECTED_START_HERE

当前 UI 已完全重构，不再使用旧 `web/ui.js` 兼容层。

## 新入口

- 页面：`web/index.html`
- 样式：`web/ux-app.css`
- 交互：`web/ux-app.js`
- 服务：`tools/run_ui_server.cjs`
- 适配器：`src/uiAdapter.cjs`

## UI 调用规则

浏览器只做三件事：

1. `GET /api/view` 读取 ViewModel。
2. `POST /api/action` 提交公开命令。
3. `GET /api/report?mode=player|shop|debug` 展示文本战报。

UI 不允许直接调用核心战斗函数，不允许在浏览器层重算规则。

## 玩家链路

选英雄 → 点空格移动 / 点目标格选中 → 选行动槽 → 调方向 → 施放 → 结束回合。

行动槽选中后进入 `slotArmed` 状态，此时点击棋盘只更新目标格，不会误触发移动。
