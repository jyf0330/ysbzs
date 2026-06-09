# AI_START_HERE · 元素背包史当前包

当前工程口径：127 宠精简策划总表 + CSV 程序数据源 + 134 行波次随机池规则 + 重构版浏览器 UI + uiAdapter/API 单入口。

## 不要再做的事

- 不要恢复旧 `web/ui.js / game.js / board.js / battle.js / shop.js`。
- 不要把规则写进浏览器层。
- 不要以旧 30 宠 / 12 波次断言作为当前验收标准。
- 不要让 UI 直接调用 `src/core/*`。

## 要遵守的事

- 所有玩家操作走 `/api/action`。
- 所有页面渲染读 `/api/view`。
- 所有战报读 `/api/report`。
- 日常策划数据优先改 `xlsx/ysbzs_master.xlsx`，再用 `npm run data:export` 生成完整 CSV。
- 新规则写核心或规则内核，UI 只展示 ViewModel。
- 新增交互必须补浏览器/adapter/玩家链路测试。

## 当前验收命令

```bash
npm run check:all
npm run test:coverage
```
