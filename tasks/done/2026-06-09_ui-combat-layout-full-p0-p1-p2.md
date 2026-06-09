# 2026-06-09_ui-combat-layout-full-p0-p1-p2

## task_id

`2026-06-09_ui-combat-layout-full-p0-p1-p2`

## 目标

完成战斗界面出版规格的完整首版闭环：

- P0：三栏重排、左侧 4 宠 12 行动块、右侧详情、棋盘减字、底部纸张日志、非商店阶段隐藏商店 / 奖励入口。
- P1：行动槽方向选择进入右侧详情、tooltip 延迟、自动按钮禁用态清晰。
- P2：备战大覆盖层、拖拽上阵/下阵、背包筛选、我方全部出击、一键完整流程策略边界和手动锁定。

## related_files

- `tasks/doing/当前任务.md`
- `tasks/index.md`
- `docs/UI_COMBAT_LAYOUT_PUBLICATION_SPEC.md`
- `docs/UI_COMBAT_LAYOUT_TASKS.md`
- `web/index.html`
- `web/js/main.js`
- `web/ux-app.js`
- `web/ux-app.css`
- `tools/record_browser_player_flow.cjs`
- `tests/unit/ui_combat_layout_contract.test.cjs`
- `evidence/browser-real-flow/REAL_BROWSER_VERIFICATION.md`
- `evidence/browser-real-flow/verified_flow.json`
- `evidence/browser-real-flow/screenshots/*`

## 验证命令

- `node --test tests/unit/ui_combat_layout_contract.test.cjs`
- `node --input-type=module --check < web/js/main.js`
- `node --check web/ux-app.js`
- `node --check tools/record_browser_player_flow.cjs`
- `node --test tests/ui_adapter.test.cjs`
- `npm run check:ui-connected`
- `npm run check:browser`
- `npm run check:all`
- `npm run test:coverage`

## commit_plan

`ui: complete combat layout p0 p1 p2`

## 进度

- [x] 占用任务卡与冲突检查
- [x] 补 P0/P1/P2 静态合同测试
- [x] 更新出版规格与任务拆分文档
- [x] 实现完整备战覆盖层、拖拽、筛选
- [x] 实现自动流程禁用态、我方全部出击、tooltip 延迟
- [x] 更新真实浏览器验收脚本
- [x] 运行验证并归档

## 验证记录

- `node --test tests/unit/ui_combat_layout_contract.test.cjs`：通过，3/3。
- `node --input-type=module --check < web/js/main.js`：通过。
- `node --check web/ux-app.js`：通过。
- `node --check tools/record_browser_player_flow.cjs`：通过。
- `node --test tests/ui_adapter.test.cjs`：通过，15/15。
- `npm run check:ui-connected`：通过。
- `npm run check:browser`：通过，真实浏览器链路 22 张截图。
- `npm run check:all`：通过。
- `npm run test:coverage`：通过，91/91，all files line coverage 94.56%。
