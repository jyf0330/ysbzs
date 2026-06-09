# AI_START_HERE · 元素背包史当前包

当前工程口径：30 宠 CSV 单源数据 + 重构版浏览器 UI + uiAdapter/API 单入口。

## 不要再做的事

- 不要恢复旧 `web/ui.js / game.js / board.js / battle.js / shop.js`。
- 不要把规则写进浏览器层。
- 不要以 127 宠旧测试作为当前验收标准。
- 不要让 UI 直接调用 `src/core/*`。

## 要遵守的事

- 所有玩家操作走 `/api/action`。
- 所有页面渲染读 `/api/view`。
- 所有战报读 `/api/report`。
- 新规则写核心或规则内核，UI 只展示 ViewModel。
- 新增交互必须补浏览器/adapter/玩家链路测试。

## 当前验收命令

```bash
npm run check:all
npm run test:coverage
```
