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
2. `POST /api/action` 提交 Command。
3. `GET /api/report?mode=player|shop|debug` 展示文本战报。

UI 不允许直接调用核心战斗函数，不允许在浏览器层重算规则。

## Command 信封

浏览器现在会自动给 `/api/action` 带：

- `commandId`
- `battleId`
- `playerId`
- `baseStateVersion`

服务器返回：

- `accepted`
- `stateVersion`
- `stateHash`
- `trace.events`
- `viewModel`

## 玩家链路

选英雄 → 点空格移动 / 点目标格选中 → 选行动槽 → 调方向 → 施放 → 结束回合。

行动槽选中后进入 `slotArmed` 状态，此时点击棋盘只更新目标格，不会误触发移动。

## 真实浏览器验收

```bash
npm run verify:browser:evidence
```

该脚本用真实鼠标事件点击页面，不允许 API fallback。


## 2026-06-09 Round 4 补齐功能

新 UI 现在已暴露旧版缺失的主要玩家/调试功能：

- 左侧阵容管理：上阵、备战、出售。
- 底栏回放标签：导出 battleTrace、步骤查看、复制 JSON、输入 JSON 回放。
- 棋盘格详情：点击格子会调用 `GET_CELL_DETAIL`。
- 商店事件：商店出现 `shop.events` 时可通过按钮触发 `APPLY_SHOP_EVENT`。
- `Ctrl+`` 调试面板：查看 phase、selected、stateVersion、stateHash、recentEvents。
- 行动槽 AP 分配弹窗：选择行动槽后可点 AP 值。
- 工具提示：元素、预览、威胁数字支持 hover 说明。

浏览器服务现在走 `serverAuthorityAdapter(strictVersion)`，并按 `x-player-id / playerId` 返回 per-player ViewModel。
