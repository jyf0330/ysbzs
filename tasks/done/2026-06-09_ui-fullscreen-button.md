# 2026-06-09_ui-fullscreen-button

## task_id

`2026-06-09_ui-fullscreen-button`

## 目标

给游戏主界面增加一个玩家可见的全屏按钮：

- 按钮应在顶部状态区，像界面工具按钮而不是战斗操作按钮。
- 点击后调用浏览器 Fullscreen API 进入 / 退出全屏。
- 全屏不可用或失败时给出可读提示，不影响战斗状态。
- 按钮状态随 `fullscreenchange` 更新。

## related_files

- `tasks/done/2026-06-09_ui-fullscreen-button.md`
- `tasks/index.md`
- `tests/unit/ui_combat_layout_contract.test.cjs`
- `web/index.html`
- `web/js/main.js`
- `web/ux-app.js`
- `web/ux-app.css`
- `tools/record_browser_player_flow.cjs`
- `evidence/browser-real-flow/REAL_BROWSER_VERIFICATION.md`
- `evidence/browser-real-flow/verified_flow.json`
- `evidence/browser-real-flow/screenshots/*`

## 验证命令

- `node --test tests/unit/ui_combat_layout_contract.test.cjs`
- `node --input-type=module --check < web/js/main.js`
- `node --check web/ux-app.js`
- `npm run check:browser`
- `npm run check:all`

## commit_plan

`ui: add game fullscreen control`

## 进度

- [x] 占用任务卡与冲突检查
- [x] 补全屏按钮合同测试并确认失败
- [x] 实现按钮、状态同步和样式
- [x] 验证、归档、提交

## 验证结果

- `node --test tests/unit/ui_combat_layout_contract.test.cjs`：通过。
- `node --input-type=module --check < web/js/main.js`：通过。
- `node --check web/ux-app.js`：通过。
- `node --check tools/record_browser_player_flow.cjs`：通过。
- `npm run check:browser`：通过，首屏证据包含全屏按钮。
- `npm run check:all`：通过。
