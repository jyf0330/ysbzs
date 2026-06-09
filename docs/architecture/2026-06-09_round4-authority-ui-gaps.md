# 2026-06-09 Round 4 · 权威入口与 UI 功能缺口补齐

本轮目标：把前面发现的 P0/P1 架构问题和旧 UI 缺失功能一起闭环，避免“API 能跑、真人点不了”或“单人能跑、未来合作/PVP 被当前写法卡死”。

## 架构修正

### 1. 浏览器服务器真正走权威适配器

`tools/run_ui_server.cjs` 现在创建的是 `serverAuthorityAdapter`，不再绕过权威层直接调用 `uiAdapter`。

```txt
浏览器 /api/action
  -> run_ui_server.cjs
  -> serverAuthorityAdapter(strictVersion)
  -> uiAdapter
  -> core
```

`/api/action` 会按 `x-player-id` 或 `playerId` 生成/补齐玩家身份，`/api/view` 与 `/api/state/snapshot` 也按玩家返回视图。

### 2. selected 改为 per-player ViewState

`SELECT_UNIT / SELECT_CELL / SELECT_SLOT` 不再污染权威 `GameState`，不会推进 `stateVersion`，也不会改变 `stateHash`。

```txt
GameState：棋盘、单位、血量、金币、商店、战斗事件等真实状态
PlayerViewState：每个玩家自己的 selected / recentUiEvents
```

这样后续双人合作或 PVP 时，A 玩家点击格子不会覆盖 B 玩家的选中态。

### 3. ViewModel 改为玩家视角

新增/暴露 `buildViewModelForPlayer(state, playerId, playerViewState)`。当前单人仍用 `p1`，但接口形态已经支持后续不同玩家拿不同视图。

### 4. RUN_FULL_DAY 不再重复写 battleTrace

`RUN_FULL_DAY` 现在作为脚本流执行子命令，不再把子命令事件外层重复塞入 `battleTrace`。新增测试会校验导出的 `battleTrace.eventId` 不重复。

### 5. 权限分类预留

`RUN_BATTLE / RUN_FULL_DAY / SETUP_DAY7_FIRE_TRIAL / RUN_DAY7_FIRE_TRIAL_ALL` 等被归类为 debug/host 命令。单人开发服务器允许调用；非 solo 且未开启 host 权限时会拒绝。

## UI 功能补齐

### 阵容管理

新增左侧阵容区：

- 上场区
- 备战区
- 上阵 / 备战
- 出售
- 上场满 4 个时禁用上阵

商店购买的新宠物默认进备战席，玩家需要手动上阵，完整闭环为：

```txt
战斗 -> 奖励/商店 -> 购买 -> 备战席 -> 上阵 -> 再战
```

### 战斗回放

底栏新增「回放」标签，支持：

- 导出 `EXPORT_BATTLE_TRACE`
- 显示事件列表与步骤计数
- 上一步 / 下一步
- 复制 JSON
- 输入 JSON 后调用 `REPLAY_BATTLE_TRACE`

### 格详情

点击棋盘格时调用 `GET_CELL_DETAIL`，底栏显示：

- 坐标
- 单位
- 元素层
- 地形模块
- 预览
- 威胁

### 商店事件

商店列表会渲染 `shop.events`，可通过 `APPLY_SHOP_EVENT` 触发折扣/特殊商品/刷新类事件。

### 调试面板

`Ctrl + \`` 打开/关闭右下角调试面板，显示：

- phase
- selected
- heroCount
- gold
- stateVersion
- stateHash
- recentEvents

面板支持拖拽和关闭。

### AP 分配弹窗

选择行动槽时弹出 AP 分配面板。当前核心可以先忽略 `ap`，但 UI 已把玩家选择作为 command payload 传入 `USE_SLOT`，方便以后接 AP 强化规则。

### 工具提示

元素标签、预览数字、威胁数字支持鼠标悬停说明，避免新玩家看不懂机制。

## 防回退测试

新增：`tests/unit/architecture_round4.test.cjs`

覆盖：

- 服务器入口必须引用 `serverAuthorityAdapter`
- `selected` 不改变 `GameState/stateHash/stateVersion`
- `RUN_FULL_DAY` 不生成重复 battleTrace eventId
- 只读命令不推进版本
- strict 版本拒绝旧 mutation
- 商店购买进入备战席，上阵满员阻止，出售返金币
- 新 UI 必须暴露 roster/replay/debug/tooltip/AP/shop event 功能面

真实浏览器验证脚本也新增了：

- AP 弹窗点击
- 回放标签点击
- 工具提示 hover
- Ctrl+` 调试面板

验证脚本仍然禁止 API fallback。
