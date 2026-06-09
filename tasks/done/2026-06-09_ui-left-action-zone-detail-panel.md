# 2026-06-09_ui-left-action-zone-detail-panel

## task_id

`2026-06-09_ui-left-action-zone-detail-panel`

## 目标

按最新设计稿重构战斗主界面的左中右结构：

- 左侧拆成左上「上阵宠物区」和左下「12 个行动块区」。
- 行动块不再塞进宠物卡内，集中作为左下主要操作入口。
- 上阵宠物卡补齐 HP、攻击、防御、护盾、AP、移动等关键战斗属性。
- 右侧详细信息改成完整详情面板，展示头像 / 名字 / 元素 / 品质、基础属性、技能、状态、面向方向、元素层数等。
- 浏览器真实链路仍能点击行动块、调整方向、分配 AP、释放行动。

## related_files

- `tasks/done/2026-06-09_ui-left-action-zone-detail-panel.md`
- `tasks/index.md`
- `tests/unit/ui_combat_layout_contract.test.cjs`
- `src/uiAdapter.cjs`
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
- `node --check tools/record_browser_player_flow.cjs`
- `npm run check:browser`
- `npm run check:all`
- `npm run test:coverage`

## commit_plan

`ui: split active pets and action blocks`

## 进度

- [x] 占用任务卡与冲突检查
- [x] 补独立行动块区与完整详情面板合同测试并确认失败
- [x] 实现左侧分区、行动块列表、完整数值详情与样式
- [x] 更新浏览器真实链路验收脚本
- [x] 验证、归档、提交

## 验证结果

- `node --test tests/unit/ui_combat_layout_contract.test.cjs`：通过。
- `node --input-type=module --check < web/js/main.js`：通过。
- `node --check web/ux-app.js`：通过。
- `node --check tools/record_browser_player_flow.cjs`：通过。
- `npm run check:browser`：通过；复跑通过，证据截图更新到 `evidence/browser-real-flow/`。
- `npm run check:all`：通过。
- `npm run test:coverage`：通过，91 个测试通过。
