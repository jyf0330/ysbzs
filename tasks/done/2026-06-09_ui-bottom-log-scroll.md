# 2026-06-09_ui-bottom-log-scroll

## task_id

`2026-06-09_ui-bottom-log-scroll`

## 目标

修复底部事件 / 战报区信息被截断、且新增内容后不会自动滚动到底部的问题：

- 底部事件 / 战报列表在有限高度内完整可滚动。
- 新事件、新战报、新回放内容渲染后自动跟随到底部。
- 不改变核心状态与战斗规则，只改 UI 展示与验收。

## related_files

- `tasks/done/2026-06-09_ui-bottom-log-scroll.md`
- `tasks/index.md`
- `tests/unit/ui_combat_layout_contract.test.cjs`
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

## commit_plan

`ui: keep bottom log readable and scrolled`

## 进度

- [x] 占用任务卡与冲突检查
- [x] 复现底部日志截断 / 不自动滚动根因
- [x] 补 UI 合同测试并确认失败
- [x] 修复底部日志滚动与高度
- [x] 浏览器验收、归档、提交

## 验证结果

- `node --test tests/unit/ui_combat_layout_contract.test.cjs`：通过，4/4。
- `node --input-type=module --check < web/js/main.js && node --check web/ux-app.js && node --check tools/record_browser_player_flow.cjs`：通过。
- `npm run check:browser`：通过，真实浏览器链路截图 21 张；`21_all_out_flow.png` 显示底部事件日志可滚动并贴近最新内容。
- `npm run check:all`：通过。

## 备注

- 根因：底部固定高度 footer 内的日志网格项缺少 `min-height:0` / `grid-template-rows:minmax(0,1fr)` 约束，内容被父级裁切；渲染日志后也没有自动滚动到最新内容。
- 当前仓库未找到 `docs/10_CHANGELOG.md` 或同名变更日志文件，本任务记录作为交付变更记录。
