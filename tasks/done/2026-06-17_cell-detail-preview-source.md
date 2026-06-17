# 已归档任务：cell-detail-preview-source

task_id: `2026-06-17_cell-detail-preview-source`
status: `FAILED`
task_type: `UI/交互小优化`
started_at: `2026-06-17`
done_at: `2026-06-17`

## 目标

在棋盘格详情面板补充清晰的预览/风险来源提示，用作多 AI 协作工作流压测任务：Lead 负责最小实现和验证，Tester Pass 负责真实浏览器点击、截图、DOM/ViewModel/console 证据。

## related_files

- `docs/02_CURRENT_WORKFLOW.md`
- `docs/10_CHANGELOG.md`
- `tasks/index.md`
- `tasks/done/2026-06-17_cell-detail-preview-source.md`

## attempted_files

外部 AI 曾尝试修改以下文件，但三次真实浏览器验收均未通过，最终已回滚，不进入提交：

- `web/ux-app.js`
- `web/ux-app.css`
- `tests/unit/ui_combat_layout_contract.test.cjs`

## 未归属文件

以下工作区未跟踪文件不属于本任务，不暂存、不提交：

- `docs/PAPER_BATTLE_UI_START_HERE.md`
- `tools/check_paper_battle_ui.cjs`
- `web/assets/reference_trace_base.jpeg`
- `web/paper-battle.css`
- `web/paper-battle.html`
- `web/paper-battle.js`

## commit_plan

- message: `workflow: harden external ai runner monitoring`
- staging: 精确暂存 `docs/02_CURRENT_WORKFLOW.md`, `docs/10_CHANGELOG.md`, `tasks/index.md`, `tasks/done/2026-06-17_cell-detail-preview-source.md`

## 验证命令

- `git diff --check`
- `node tests/run_all_tests.cjs`
- Tester Pass: 真实浏览器打开本地服务页面，点击棋盘单位/风险格，截图保存到 `output/playwright/2026-06-17_cell-detail-preview-source.png`，记录 console error 与 DOM/ViewModel 辅助断言。

## 协作记录

- collaboration:
  - lead_scope: `docs/02_CURRENT_WORKFLOW.md`, `docs/10_CHANGELOG.md`, task card
  - specialist_input: External AI via `cys` (`claude` CLI wrapper backed by `deepseek-v4-flash`) 负责代码与合约测试实现，写入范围限定为 `web/ux-app.js`, `web/ux-app.css`, `tests/unit/ui_combat_layout_contract.test.cjs`
  - tester_pass: 真实浏览器三次复测均失败，见验证结果
  - external_ai_input: 无
  - lead_decision: 按用户规则，同一问题外部 AI 三次未解决后终止任务；Lead 不接管代写实现。

## 验证结果

- External AI attempt 1：合约测试通过，但 Lead 真实浏览器点击 `team-risk hero-cell selected-unit current-preview-unit` 格后，`#cell-detail .detail-source-tag` 为 0，失败截图 `output/playwright/2026-06-17_cell-detail-preview-source.png`。
- External AI attempt 2：外部 AI 强化了静态合约并修改 `renderUnitDetail`，`node --test tests/unit/ui_combat_layout_contract.test.cjs` 通过；Lead 复测同一真实浏览器路径仍为 `sourceCount=0`，同一问题第 2 次失败。
- External AI attempt 3：外部 AI 再次强化静态合约并修改 `renderCellDetail` 的 teamRisk 查找，外部 AI 自报 `node --test tests/unit/ui_combat_layout_contract.test.cjs`、`node tests/run_all_tests.cjs`、`git diff --check` 通过；Lead 复测同一真实浏览器路径仍为 `sourceCount=0`，同一问题第 3 次失败。
- `EXTERNAL_AI_FAILED_THREE_TIMES`：已触发。Lead 已停止外部 AI 会话并回滚未通过的 UI/test 改动。
- `git diff -- web/ux-app.js web/ux-app.css tests/unit/ui_combat_layout_contract.test.cjs`：无输出，确认失败实现已回滚。
- `node --test tests/unit/ui_combat_layout_contract.test.cjs`：通过，`6/6`。
- `node tests/run_all_tests.cjs`：通过，`63/63 tests passed`；仅有 Node 的 `UNDICI-EHPA` experimental warning。
- `git diff --check`：通过，无空白错误。

## 失败原因分析

- 静态合约测试只能证明源码里存在 class/文案，不能证明真实玩家点击路径会走到对应分支。
- 真实失败路径发生在“选中行动块/瞄准态 + 点击当前预览单位”场景，右侧详情仍显示既有目标格/敌方 Boss 详情；外部 AI 三次都在不同渲染分支补标签，但没有定位到真实点击链路为什么落到 Boss 详情。
- 第 3 次尝试暴露了工作流问题：当前 tmux 版本 `#{pane_last}` 返回 `0`，需要用 `pipe-pane` 日志 mtime 作为 activity fallback。
- 后续如果继续做该 UI 需求，应先写真实浏览器级回归脚本或更接近玩家链路的测试，而不是继续追加源码 regex 合约。

## 文档同步

- 已更新 `docs/02_CURRENT_WORKFLOW.md`：外部 AI CLI 默认可观察 tmux 会话；优先用 `#{pane_last}` 监控活动，返回 `0`/空值时使用 `pipe-pane` 日志 mtime fallback；3 分钟无活动中断；同一问题 3 次失败终止并复盘。
- 已更新 `docs/10_CHANGELOG.md`。

## 收尾

- 本轮未交付 UI 功能，未提交 `web/ux-app.js` / `web/ux-app.css` / `tests/unit/ui_combat_layout_contract.test.cjs` 的外部 AI patch。
- 保留失败截图：`output/playwright/2026-06-17_cell-detail-preview-source.png`。
- 未归属 paper-battle 文件保持未暂存。
