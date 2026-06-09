# 2026-06-09_ui-remove-hover-detail

## task_id

`2026-06-09_ui-remove-hover-detail`

## 目标

去掉棋盘与界面上的悬停详情提示：

- 不再使用棋盘 `cell-popup`。
- 不再通过 `data-tip` / `tooltip` / `mousemove` 展示悬停说明。
- 信息查看统一走点击选择后右侧「详细信息 / 当前行动槽」面板。
- 浏览器真实链路不再验证悬停 tooltip。

## related_files

- `tasks/done/2026-06-09_ui-remove-hover-detail.md`
- `tasks/index.md`
- `tests/unit/ui_combat_layout_contract.test.cjs`
- `tests/unit/architecture_round4.test.cjs`
- `web/index.html`
- `web/js/main.js`
- `web/ux-app.js`
- `web/ux-app.css`
- `tools/record_browser_player_flow.cjs`
- `tools/check_ui_connected.cjs`
- `evidence/browser-real-flow/REAL_BROWSER_VERIFICATION.md`
- `evidence/browser-real-flow/verified_flow.json`
- `evidence/browser-real-flow/screenshots/*`

## 验证命令

- `node --test tests/unit/ui_combat_layout_contract.test.cjs tests/unit/architecture_round4.test.cjs`
- `node --input-type=module --check < web/js/main.js`
- `node --check web/ux-app.js`
- `node --check tools/record_browser_player_flow.cjs`
- `node --check tools/check_ui_connected.cjs`
- `npm run check:browser`
- `npm run check:all`

## commit_plan

`ui: remove hover detail popups`

## 进度

- [x] 占用任务卡与冲突检查
- [x] 补去悬停详情合同测试并确认失败
- [x] 删除 hover tooltip / cell-popup 渲染与样式
- [x] 更新浏览器真实链路验收脚本
- [x] 验证、归档、提交

## 验证结果

- `node --test tests/unit/ui_combat_layout_contract.test.cjs tests/unit/architecture_round4.test.cjs`：通过，10/10。
- `node --input-type=module --check < web/js/main.js && node --check web/ux-app.js && node --check tools/record_browser_player_flow.cjs && node --check tools/check_ui_connected.cjs`：通过。
- `npm run check:browser`：通过，真实浏览器链路截图 21 张，已移除 hover tooltip 步骤。
- `npm run check:all`：通过。
