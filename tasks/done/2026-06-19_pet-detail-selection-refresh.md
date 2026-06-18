# 2026-06-19_pet-detail-selection-refresh

task_id: 2026-06-19_pet-detail-selection-refresh
type: UI / board interaction bugfix
status: DONE
owner: Codex
worktree: shared-worktree

## Goal

修复点击棋盘宠物后右侧“详细信息”不随当前宠物刷新，尤其是先点我方宠物、再点敌方宠物、再点回我方宠物时详情仍停留在旧敌方格的问题。

## Scope

- 仅修复浏览器 UI 本地选中格与详情查询结果的同步。
- 不修改核心规则、`src/uiAdapter.cjs`、`tests/ui_adapter.test.cjs` 或生成 bundle。
- 保持玩家入口为真实棋盘点击，不引入 DOM 直改核心状态。

## related_files

- `web/js/main.js`
- `tests/browser_detail_selection.test.cjs`
- `tasks/doing/2026-06-19_pet-detail-selection-refresh.md`
- `output/playwright/pet-detail-selection-refresh-2026-06-19.png`

## exclusive_files

- `web/js/main.js`

## read_files

- `docs/00_AI_START_HERE.md`
- `docs/02_CURRENT_WORKFLOW.md`
- `docs/roles/UI_UX_START.md`
- `tasks/README.md`
- `tasks/doing/2026-06-19_all-out-preview-sandbox.md`
- `tasks/doing/2026-06-19_enemy-spawn-yaml-position.md`
- `tasks/doing/2026-06-19_move-board-overlays-left-up.md`
- `tasks/doing/2026-06-19_parallel-ai-file-lock-workflow.md`

## validation

- RED/GREEN: `node --test tests/browser_detail_selection.test.cjs`
- Focused UI sanity: Playwright formal browser flow, screenshot under `output/playwright/`.
- Full check if commit eligibility is considered: `npm run check:all`

## commit_plan

message: `fix(ui): refresh pet detail selection`

## collaboration

lead_scope: 修复正式浏览器入口 `web/js/main.js` 的棋盘宠物点击详情刷新，不触碰当前 READY_TO_MERGE 任务独占的核心/adapter/generated files。
specialist_input: 无
tester_pass: TEST_SUBTHREAD_UNAVAILABLE；当前未启用独立子线程工具，本轮用主线程独立 Playwright tester pass 走正式浏览器入口并保存截图。
external_ai_input: 无
lead_decision: 先用真实浏览器回归测试锁定“英雄 -> 敌人 -> 英雄”详情刷新，再做最小浏览器层修复。

## verification_results

- RED: `node --test tests/browser_detail_selection.test.cjs` 在当前代码上失败；真实浏览器点击 `第7天火核心试炼` 后，按“火绒狐 -> 精灵龙 -> 火绒狐”点击棋盘，第三次详情仍显示 `敌方精灵龙黄金复制体`。
- Root cause: 正式页面实际加载 `web/js/main.js`；浏览器本地 `ui.selectedCell` 会被服务端 ViewModel 旧 `selected.cell` 覆盖，且 `GET_CELL_DETAIL` 返回后未把本次查询格写回本地选中格，导致详情按旧格渲染。
- GREEN: `node --test tests/browser_detail_selection.test.cjs` 通过。
- Formal UI gate: `http://127.0.0.1:4180/index.html?runtime=local&petDetailFix=20260619`，真实浏览器点击 `第7天火核心试炼`，再依次点击棋盘 `火绒狐 -> 精灵龙 -> 火绒狐`。
- Browser assertions: 首次火绒狐详情包含 `火绒狐`；敌方详情包含 `精灵龙`；最后详情标题为 `火绒狐`，详情包含 `火绒狐` 且不包含 `精灵龙`；选中格为 `R6C2` 火绒狐所在格；console error 为 `[]`。
- Screenshot: `output/playwright/pet-detail-selection-refresh-2026-06-19.png`
- Main-thread screenshot review: 右侧详情显示 `我方火绒狐`，棋盘蓝色选中格在火绒狐所在格，未见明显遮挡、错位、缺失或错误数值。
- Full check: `npm run check:all` 通过。
- Closeout verification: 2026-06-19 Lead reran `node tools/build_local_engine_bundle.cjs && npm run check:all && npm run test:coverage && node --test tests/browser_detail_selection.test.cjs && git diff --check`; command exited 0.

## commit_status

- blocked for auto-commit: 共享工作区存在多个并行任务的 dirty / untracked 文件，且 `tasks/index.md` 由 `2026-06-19_enemy-spawn-yaml-position` 占用；本任务需后续按 `git-c` 或 Lead 精确分组收口。
