# 2026-06-19_move-board-overlays-left-up

task_id: 2026-06-19_move-board-overlays-left-up
type: UI / board overlay layout
status: DONE
owner: Codex
worktree: shared-worktree

## Goal

把棋盘上挡住格子的三个操作状态浮层和行动块浮层往左上移动一点，避免遮挡棋盘主要操作区。

## Scope

- 仅调整浏览器 UI 样式定位。
- 不改核心规则、ViewModel、reducer 或棋盘数据来源。
- 不改现有 READY_TO_MERGE 任务占用的核心文件、`tasks/index.md`、`docs/10_CHANGELOG.md`。
- 继续收束棋盘格内 overlay：隐藏宠物上方方向图标，移动受伤/伤害提示，避免遮挡宠物关键状态。
- 按截图反馈增高右侧“详细信息”区域，并把右侧流程按钮整体下移，避免详情和按钮挤在一起。
- 按截图反馈填补左下空白，底部日志横向铺满并收进 720px 画布内。
- 按后续反馈把事件日志恢复为与中间棋盘列同宽，并把 `事件 / 战报 / 回放 / 调试` 切换按钮移到日志下方横排。
- 按后续反馈允许底部事件日志文字单独选中复制，同时保持游戏主体防误选。
- 按后续反馈减少右侧按钮区土棕色堆叠感，并把按钮组进一步压到右栏底部。

## related_files

- `web/ux-app.css`
- `tests/unit/ui_combat_layout_contract.test.cjs`
- `tasks/doing/2026-06-19_move-board-overlays-left-up.md`
- `output/playwright/board-overlays-left-up-2026-06-19.png`
- `output/playwright/pet-overlay-damage-clear-2026-06-19.png`
- `output/playwright/pet-overlay-damage-no-ellipsis-2026-06-19.png`
- `output/playwright/event-log-text-selectable-2026-06-19.png`

## exclusive_files

- 无

## read_files

- `docs/00_AI_START_HERE.md`
- `docs/02_CURRENT_WORKFLOW.md`
- `docs/roles/UI_UX_START.md`
- `tasks/README.md`
- `tasks/doing/2026-06-19_enemy-spawn-yaml-position.md`
- `tasks/doing/2026-06-19_all-out-preview-sandbox.md`
- `tasks/doing/2026-06-19_parallel-ai-file-lock-workflow.md`

## validation

- `npm run check:all`
- Formal UI gate: real browser flow, screenshot under `output/playwright/`, console error check.

## commit_plan

message: `fix(ui): move board overlays away from playfield`

## collaboration

lead_scope: UI 样式最小调整，保持棋盘和操作入口不变。
specialist_input: 无
tester_pass: TEST_SUBTHREAD_UNAVAILABLE；当前未启用独立子线程工具，本轮用主线程独立 Playwright tester pass 走正式浏览器入口并保存截图。
external_ai_input: 无
lead_decision: 底部状态 chip 改为左上紧凑浮层，行动块 popover 上移并左移，优先保护棋盘下半区。

## verification_results

- Initial browser pass caught the first CSS selector was wrong: `operation-chip-row` did not move the real `#operation-rail`, so the implementation was corrected before acceptance.
- Formal UI gate: Playwright opened `http://127.0.0.1:4173/index.html?runtime=local&codexOverlayMove=20260619b`, clicked the formal `第7天火核心试炼` button, then clicked the first visible action block to open `#action-popover`.
- Browser assertions: `phase=玩家回合`; operation hint shows aiming mode; `#operation-rail` and `#action-popover` both have bounding boxes outside `#board`; console errors `[]`; page errors `[]`.
- Screenshot: `output/playwright/board-overlays-left-up-2026-06-19.png`.
- Main-thread screenshot review: 三枚操作状态 chip 已移到棋盘左侧上方，行动块 popover 在棋盘左边缘外；未见明显遮挡、错位、缺失或错误数值。
- Full check: `npm run check:all` passed after the final CSS correction.
- Follow-up layout: right detail/buttons balance adjusted in `web/ux-app.css`; formal browser flow opened `http://127.0.0.1:4173/index.html?runtime=local&rightPanelFollowup=20260619c`, clicked `第7天火核心试炼`, then clicked a real hero board cell.
- Follow-up DOM boxes: `.detail-zone` height `276`, `#cell-detail` height `246`, `.manual-flow-controls` top `395`, `#auto-controls` bottom `587`, `.right-panel` bottom `592`.
- Follow-up screenshot: `output/playwright/right-panel-detail-buttons-2026-06-19.png`.
- Follow-up console result: browser console errors `[]`, page errors `[]`.
- Follow-up main-thread screenshot review: 右侧详情区更高，流程按钮整体下移，底部 `完整Run` 未裁切；未见明显遮挡、错位、缺失或错误数值。
- Follow-up UI connected check: `npm run check:ui-connected` passed.
- Bottom-fill follow-up: after user pointed out the lower-left empty area, `.bottom-panel` was expanded to the full shell width and the shell's third grid row was changed to the remaining height so the footer no longer clips.
- Bottom-fill browser assertions: screenshot flow opened `http://127.0.0.1:4173/index.html?runtime=local&bottomFill=20260619c`, clicked `第7天火核心试炼`, then clicked a real hero board cell; `.bottom-panel` starts at `x=14`, width `1262`, bottom `706`; `#log` width `1150`; right panel `完整Run` bottom `587` within right panel bottom `592`.
- Bottom-fill screenshot: `output/playwright/right-panel-detail-buttons-bottom-fill-2026-06-19.png`.
- Bottom-fill console result: browser console errors `[]`, page errors `[]`.
- Bottom-fill main-thread screenshot review: 左下空白已由底部日志填满，右侧详情和下移按钮仍保持可见；未见明显遮挡、错位、缺失或裁切。
- Event-width follow-up: after user clarified the event area should match the board width and the buttons should be underneath, `.bottom-panel` was realigned to the middle board column and its internal grid changed to log-above/tabs-below.
- Event-width browser assertions: screenshot flow opened `http://127.0.0.1:4173/index.html?runtime=local&eventBoardWidth=20260619`, clicked `第7天火核心试炼`, then clicked a real hero board cell; `.board-panel` x `324` width `642`, `.bottom-panel` x `324` width `642`; `.log-tabs` y `669` below `#log` y `611`; footer bottom `706`; right panel `完整Run` remains within right panel.
- Event-width screenshot: `output/playwright/event-log-board-width-tabs-bottom-2026-06-19.png`.
- Event-width console result: browser console errors `[]`, page errors `[]`.
- Event-width main-thread screenshot review: 事件日志与中间棋盘列同宽，切换按钮在日志下方横排，右侧详情和按钮仍保持可见；未见明显遮挡、错位、缺失或裁切。
- Right-action-color follow-up: after user pointed out the right side still looked like stacked brown blocks and asked to move the buttons lower, the detail area was shortened to create a visible spacer, `.manual-flow-controls` was pushed down with `margin-top:auto`, and the action buttons were recolored with green / blue-gray / blue / wine-red / teal hierarchy.
- Right-action-color browser assertions: screenshot flow opened `http://127.0.0.1:4173/index.html?runtime=local&rightActionsLowerColor=20260619`, clicked `第7天火核心试炼`; `.detail-zone` bottom `361`, `.manual-flow-controls` y `398`, spacer `37`; `#full-run-btn` bottom `581` within `.right-panel` bottom `592`; console/page errors `[]`.
- Right-action-color screenshot: `output/playwright/right-actions-lower-color-2026-06-19.png`.
- Right-action-color main-thread screenshot review: 右侧按钮组明显下移，颜色层级不再是一排土棕；详情、按钮和底部日志均未见明显遮挡、错位、缺失或裁切。
- Follow-up RED: formal browser flow on Day7 fire trial asserted hidden `.preview-arrow`; failed before CSS follow-up with `preview direction arrows should be hidden, found 4`.
- Follow-up GREEN: formal browser flow on Day7 fire trial passed with `visibleArrows=0`, `maxOverlap=0` between `.preview-num` / `.team-risk-num` and `.unit-token`, `phase=player_turn`, `previewCount=27`, and console/page errors `[]`.
- Follow-up screenshot: `output/playwright/pet-overlay-damage-clear-2026-06-19.png`.
- Follow-up main-thread screenshot review: 方向图标已消失；伤害/元素提示在格子底部左右角，宠物名称、HP 条和数值角标没有被明显遮挡或错位。
- Follow-up focused check: `npm run check:ui-connected` passed.
- Follow-up full check: `npm run check:all` passed.
- Damage-label RED: static CSS check failed before this follow-up because `.team-risk-num` / `.preview-num` still used `text-overflow: ellipsis`, which rendered board badges like `受1...` / `伤1...` in cramped cells.
- Damage-label GREEN: static CSS check passed after changing those board damage badges to `text-overflow: clip`.
- Damage-label formal browser check: Day7 fire trial opened through the real page; `.preview-num` / `.team-risk-num` computed `textOverflow=clip`, `visibleArrows=0`, `phase=player_turn`, `previewCount=27`, and console/page errors `[]`.
- Damage-label screenshot: `output/playwright/pet-overlay-damage-no-ellipsis-2026-06-19.png`.
- Damage-label focused check: `npm run check:ui-connected` passed.
- Event-log selectable RED: `node --test tests/unit/ui_combat_layout_contract.test.cjs` failed before CSS follow-up because `.log-view` did not override global `body{user-select:none}`.
- Event-log selectable GREEN: `node --test tests/unit/ui_combat_layout_contract.test.cjs` passed after adding `user-select:text` to `.log-view`.
- Event-log browser check: formal page opened `http://127.0.0.1:4173/index.html?runtime=local&eventLogSelectable=20260619b`, clicked `第7天火核心试炼`, and used real mouse drag over the bottom event log text.
- Event-log browser assertions: `#log` computed `user-select=text`, visible log text length `292`, selected text length `40`, selected preview `001 [TRIAL_SETUP] 第7天火核心试炼已按表驱动初始化：8×8棋盘`, console/page errors `[]`.
- Event-log screenshot: `output/playwright/event-log-text-selectable-2026-06-19.png`.
- Event-log main-thread screenshot review: 底部事件日志可见文字被蓝色选区选中，棋盘/右侧详情/日志 tab 未见明显遮挡、错位或裁切。
- Event-log focused check: `npm run check:ui-connected` passed.
- Closeout verification: 2026-06-19 Lead reran `node tools/build_local_engine_bundle.cjs && npm run check:all && npm run test:coverage && node --test tests/browser_detail_selection.test.cjs && git diff --check`; command exited 0.

## commit_status

- blocked: auto-commit remains blocked by shared-worktree unrelated READY_TO_MERGE / ACTIVE task files and dirty files, including `tasks/index.md`, core/generated files, generated bundle/core files, and `web/js/main.js` owned by other tasks; use `git-c` or a later Lead pass to split commits by task.
