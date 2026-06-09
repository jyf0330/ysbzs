# 2026-06-09_ui-action-block-popover-detail-space

## task_id

`2026-06-09_ui-action-block-popover-detail-space`

## 目标

按最新界面要求调整战斗布局：

- 左侧上阵宠物区不要被行动块压得太紧，宠物概览保留更高、更松的展示空间。
- 12 个行动块继续独立放在左下区域，但整体下沉，利用下方空间。
- 右侧不再常驻「当前行动槽」调整面板，右侧优先给「详细信息」完整展示。
- 点击行动块后，在行动块旁边出现浮窗，浮窗内调整方向、AP、释放。
- 不改核心战斗规则；玩家操作仍走 `/api/action`。

## related_files

- `tasks/done/2026-06-09_ui-action-block-popover-detail-space.md`
- `tasks/index.md`
- `tests/unit/ui_combat_layout_contract.test.cjs`
- `web/index.html`
- `web/js/main.js`
- `web/ux-app.js`
- `web/ux-app.css`
- `tools/check_ui_connected.cjs`
- `tools/record_browser_player_flow.cjs`
- `evidence/browser-real-flow/REAL_BROWSER_VERIFICATION.md`
- `evidence/browser-real-flow/verified_flow.json`
- `evidence/browser-real-flow/screenshots/*`

## 验证命令

- `node --test tests/unit/ui_combat_layout_contract.test.cjs`
- `node --input-type=module --check < web/js/main.js`
- `node --check web/ux-app.js`
- `node --check tools/record_browser_player_flow.cjs`
- `node --check tools/check_ui_connected.cjs`
- `npm run check:browser`
- `npm run check:all`

## commit_plan

`ui: move action controls into popover`

## 进度

- [x] 占用任务卡与冲突检查
- [x] 补 UI 合同测试并确认失败
- [x] 左侧宠物区放松、行动块下沉
- [x] 右侧详情扩容、行动块调整改浮窗
- [x] 浏览器验收、归档、提交

## 验证结果

- `node --test tests/unit/ui_combat_layout_contract.test.cjs`：通过，5/5。
- `node --input-type=module --check < web/js/main.js && node --check web/ux-app.js && node --check tools/record_browser_player_flow.cjs && node --check tools/check_ui_connected.cjs`：通过。
- `npm run check:browser`：通过，真实浏览器链路截图 21 张；`09_slot_selected_armed.png` 显示行动块旁浮窗、右侧详情保留、4 只宠物和 12 个行动块完整可见。
- `npm run check:all`：通过。

## 备注

- 右侧永久行动槽面板已移除；行动块调整入口改为左侧局部浮窗。
- 当前仓库未找到 `docs/10_CHANGELOG.md` 或同名变更日志文件，本任务记录作为交付变更记录。
