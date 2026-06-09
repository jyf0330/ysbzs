# 元素背包史 · 运行与验收说明（UI 重构补完版）

当前包是 **30 宠 CSV 单源数据 + 重构版浏览器 UI + uiAdapter/API 单入口**。

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

旧 `web/ui.js / game.js / board.js / battle.js / shop.js / original-ui-compat-adapter.js` 已移除。浏览器层不再保存独立战斗状态，只从 `/api/view` 读取 ViewModel，只向 `/api/action` 发送命令。

## 核心验收

```bash
npm run check:all
npm run test:coverage
```

`check:all` 覆盖：核心旧测试、UI adapter、当前 30 宠全覆盖、玩家细颗粒操作、CSV 校验、第7天试炼、DOM 隔离、新 UI 接口连通、浏览器玩家链路。

## Chromium 说明

当前容器环境可能存在 Chromium 托管策略 `URLBlocklist: ["*"]`，会拦截 `127.0.0.1` 页面导航。`tools/check_browser_player_flow.cjs` 已做保护：普通本地环境会走真实页面点击链路；被策略拦截时降级为“新 UI 源码 + API 状态事件 + 合成 DOM”smoke 验收。

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

旧 127 宠覆盖测试已归档为：

- `tests/legacy_full_coverage_127_20260608.test.cjs.disabled`
