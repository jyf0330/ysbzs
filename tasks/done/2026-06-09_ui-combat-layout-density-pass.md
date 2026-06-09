# 2026-06-09_ui-combat-layout-density-pass

## task_id

`2026-06-09_ui-combat-layout-density-pass`

## 目标

按用户最新 10 条反馈继续收紧战斗界面信息层级：

- 备战入口移动到“上阵宠物”标题右侧，按钮名为“备战”，战斗开始后明确禁用。
- 左侧只保留上阵宠物必要战斗信息和每宠 3 个行动块，移除常驻备战 / 上场区。
- 行动槽视觉改为清楚的小行动块：短名、图标、方向箭头、点击后右侧操作。
- 右侧重排：上半详情，下半当前行动槽操作，右下角只放两个自动按钮。
- 移除常驻“自动战斗”主按钮，保留必要推进按钮但降权。
- 棋盘侧状态栏去掉目标信息，避免旧结构残留。
- 棋盘单位减字，只保留短名、阵营颜色、血条 / 小血量。
- 底部事件区只对齐中间棋盘宽度。

## related_files

- `tasks/done/2026-06-09_ui-combat-layout-density-pass.md`
- `tasks/index.md`
- `docs/UI_COMBAT_LAYOUT_PUBLICATION_SPEC.md`
- `docs/UI_COMBAT_LAYOUT_TASKS.md`
- `tests/unit/ui_combat_layout_contract.test.cjs`
- `tests/unit/architecture_round4.test.cjs`
- `src/core/battle/actions.cjs`
- `src/core/battle/position.cjs`
- `src/uiAdapter.cjs`
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

- `node --test tests/unit/ui_combat_layout_contract.test.cjs tests/unit/architecture_round4.test.cjs`
- `node --input-type=module --check < web/js/main.js`
- `node --check web/ux-app.js`
- `node --check tools/record_browser_player_flow.cjs`
- `npm run check:browser`
- `npm run check:all`
- `npm run test:coverage`

## commit_plan

`ui: tighten combat layout density`

## 进度

- [x] 占用任务卡与冲突检查
- [x] 补最新 10 条反馈的合同测试
- [x] 重排左侧、右侧、底部和棋盘信息密度
- [x] 更新真实浏览器链路与证据
- [x] 修正旧 UI 连通检查与结构化事件 JSDoc，避免旧合同要求棋盘显示完整属性
- [x] 完整验证、归档、提交

## 验证结果

- `node --test tests/unit/ui_combat_layout_contract.test.cjs tests/unit/architecture_round4.test.cjs` 通过。
- `node --input-type=module --check < web/js/main.js` 通过。
- `node --check web/ux-app.js` 通过。
- `node --check tools/record_browser_player_flow.cjs` 通过。
- `npm run check:browser` 通过，证据目录：`evidence/browser-real-flow/`。
- `npm run check:all` 通过。
- `npm run test:coverage` 通过，91/91。
