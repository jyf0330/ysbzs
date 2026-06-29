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
- 日常策划数据优先改 `xlsx/ysbzs_master.xlsx`，再用 `npm run data:export` 生成完整 CSV；需要好读版总览时用 `npm run data:workbook` 刷新 workbook。
- 新规则写核心或规则内核，UI 只展示 ViewModel。
- 新增交互必须补浏览器/adapter/玩家链路测试。
- `http://127.0.0.1:4173/` 是默认 live 验收端口。凡是会影响浏览器端行为的源码改动，必须运行 `node tools/build_local_engine_bundle.cjs` 刷新 `web/js/local-engine.js`，再在 4173 端口通过正式玩家入口复测；否则只能说“源码已改/单测已过”，不能说“页面已生效”。
- 如果 `web/js/local-engine.js` 或 4173 服务重启被任务租约阻塞，必须记录 `LIVE_4173_NOT_REFRESHED` 并输出 blocked/Commit Plan。
- UI、棋盘、可见预览、交互反馈类改动在提交前必须先走独立测试子线程或等价 tester pass，在真实浏览器里操作页面，保存截图，记录操作步骤、DOM / ViewModel / console 辅助证据，并由主线程复核截图效果正确后才允许进入自动提交检查。
- 可见验收截图必须来自正式界面和正式玩家流程；禁止用临时构造存档、`localStorage`/`importSave` 注入、`page.evaluate` 改状态、调试对象或内部函数直接制造画面来当作提交前截图证据。构造状态只能做单元测试或辅助诊断；正式流程不可达时必须 blocked/Commit Plan。

## 当前验收命令

```bash
npm run check:all
npm run test:coverage
```
