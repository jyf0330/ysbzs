# 2026-06-22_main-style-right-pet-detail-prompt

task_id: 2026-06-22_main-style-right-pet-detail-prompt
type: UI/Art prompt documentation
status: DONE
owner: Codex
branch: codex/bazaar-day1-day3-route
worktree: shared-worktree

## Goal

记录用户提供的战斗主风格图为当前主风格参考，并基于现有右侧宠物详情代码字段输出可交给美术/生图工具的重设计提示语。

## Scope

- 固化主风格参考图到仓库可追踪路径。
- 新增右侧宠物详情面板重设计提示语文档。
- 在纸面战斗入口文档登记主风格图。
- 更新任务索引和 changelog。

## related_files

- `web/assets/reference_main_style_battle_ui_2026-06-22.jpg`
- `docs/RIGHT_PET_DETAIL_PANEL_PROMPT.md`
- `docs/PAPER_BATTLE_UI_START_HERE.md`
- `docs/10_CHANGELOG.md`
- `tasks/index.md`
- `tasks/done/2026-06-22_main-style-right-pet-detail-prompt.md`

## exclusive_files

- `docs/10_CHANGELOG.md`
- `tasks/index.md`

## read_files

- `AGENTS.md`
- `docs/02_CURRENT_WORKFLOW.md`
- `docs/00_AI_START_HERE.md`
- `docs/roles/UI_UX_START.md`
- `docs/roles/ARTIST_START.md`
- `docs/PAPER_BATTLE_UI_START_HERE.md`
- `docs/UI_COMBAT_LAYOUT_PUBLICATION_SPEC.md`
- `web/paper-battle.js`
- `web/paper-battle.css`
- `src/uiAdapter.cjs`

## validation

- `test -f web/assets/reference_main_style_battle_ui_2026-06-22.jpg`
- `rg -n "reference_main_style_battle_ui_2026-06-22|右侧宠物详情面板重设计提示语" docs web`
- 文档/资产记录任务，不改运行时代码；不运行完整测试。

## validation_results

- PASS `test -f web/assets/reference_main_style_battle_ui_2026-06-22.jpg`
- PASS `rg -n "reference_main_style_battle_ui_2026-06-22|右侧宠物详情面板重设计提示语|RIGHT_PET_DETAIL_PANEL_PROMPT" docs web`
- PASS `git diff --check`
- 图片确认：`web/assets/reference_main_style_battle_ui_2026-06-22.jpg` 是 1280x720 JPEG，sha256 `7f1d7ea799f09304b7870f6a88c52e772e3408582a542d08418b0e1c804ea38b`。
- 未运行完整测试：本轮只新增文档与参考图，不改运行时代码。

## commit_plan

commit: `docs: record main battle style reference`

## collaboration

lead_scope: 记录风格图与提示语，不改 UI 运行时代码。
specialist_input: 无。
tester_pass: 无，非运行时可见改动；不触发浏览器验收。
external_ai_input: 无。
lead_decision: 以用户提供图片作为主风格参考，提示语约束右侧详情面板必须读取现有字段而不画死文字。

## completion

done_at: 2026-06-22
commit_status: not committed; docs/asset recording task only, no runtime code or functional behavior change.

## notes

- 工作区存在无关未跟踪文件 `xlsx/.~lock.ysbzs_master.xlsx#`，本任务不修改、不暂存。
