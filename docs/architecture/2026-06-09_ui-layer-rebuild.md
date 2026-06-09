# 2026-06-09 UI 界面层完全重构记录

## 结论

本次不是替换交互说明文档，而是删除旧的原项目 UI 兼容外壳，重建 `web/` 界面层。

新的浏览器界面只保留三类入口：

1. `web/index.html`：静态结构，不再加载旧 `game.js/ui.js` 链路。
2. `web/ux-app.css`：新三栏布局、棋盘、英雄卡、行动槽、商店、日志样式。
3. `web/ux-app.js`：唯一前端交互层，通过 `/api/*` 调用 `src/uiAdapter.cjs`。

## 已删除旧界面文件

删除清单见：`docs/removed/old_ui_files_2026-06-09.txt`。

这些文件包含旧 DOM 渲染、旧交互桥接、旧兼容注入、旧本地假战斗逻辑。删除后，前端不再存在第二套战斗状态。

## 新 UI 链路

```txt
玩家点击
  ↓
web/ux-app.js
  ↓ fetch('/api/action') 或 fetch('/api/view')
tools/run_ui_server.cjs
  ↓
src/uiAdapter.cjs
  ↓
src/core/reducer.cjs / battle.cjs / shop.cjs / day7FireTrial.cjs
  ↓
ViewModel / events / battleTrace / textReport
  ↓
web/ux-app.js 只读渲染
```

## 硬规则

- UI 不直接修改核心规则 state。
- UI 不 import `src/core`、`src/uiAdapter.cjs`。
- UI 不保留旧 `original-ui-compat-adapter.js` 注入逻辑。
- 玩家操作必须走 `/api/action`。
- 画面渲染只消费 `/api/view` 返回的 ViewModel。
- 战报只消费 `/api/report`。

## 新界面覆盖功能

- 顶部状态：阶段、天数、回合、金币、我方英雄 HP、敌方Boss HP。
- 左栏：英雄选择、格子详情、第7天试炼摘要。
- 中栏：棋盘、单位、元素层、移动范围、预览、威胁提示。
- 右栏：行动槽、方向按钮、施放按钮、回合控制、奖励、商店。
- 底栏：事件日志、玩家战报、调试视图。
- 特殊入口：第7天火核心试炼、自动战斗、一键完整流程。

## 验收命令

```bash
npm test
npm run check:ui-connected
node tools/check_browser_player_flow.cjs
npm run check:day7
```

## 2026-06-09 补完项

- 行动槽瞄准态新增 `slotArmed`，防止“选槽后点棋盘”被误判为移动。
- `runCommand` 不再在结束时统一解锁全部按钮，改为重新渲染后由 phase/busy 规则决定按钮状态。
- `replayBattleTrace(events)` 修复为只调用 `REPLAY_BATTLE_TRACE`。
- 当前验收升级为：

```bash
npm run check:all
npm run test:coverage
```
