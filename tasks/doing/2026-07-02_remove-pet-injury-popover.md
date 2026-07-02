# 2026-07-02_remove-pet-injury-popover

task_id: 2026-07-02_remove-pet-injury-popover
type: ui-feedback
status: READY_TO_MERGE
owner: Codex
branch: shared-worktree

## Goal

取消棋盘上我方宠物受伤信息的 hover/selected 浮窗，只保留格子上的紧凑受伤角标和右侧详情里的受击信息。

## Scope

- 删除正式战斗棋盘格中的 `.attack-warning-popover` 渲染。
- 删除对应浮窗样式和 hover 展示规则。
- 更新浏览器/契约测试，要求危险格仍有 `team-risk`/`team-risk-num`，但不再出现受伤浮窗。
- 不改核心 `teamRiskGrid`、右侧详情 panel、战斗结算或移动预览数据源。
- 用户已在上一轮 `FILE_CONFLICT_STOP` 后回复 `do`，授权本轮继续处理与旧 UI 任务同文件重叠；完成后不自动提交，留给 `git-c`/Lead 按任务边界收口。

## related_files

- `web/js/main.js`
- `web/ux-app.css`
- `tests/browser_detail_selection.test.cjs`
- `tests/unit/ui_combat_layout_contract.test.cjs`
- `tasks/doing/2026-07-02_remove-pet-injury-popover.md`

## exclusive_files

- `web/js/main.js`
- `web/ux-app.css`

## read_files

- `AGENTS.md`
- `docs/00_AI_START_HERE.md`
- `docs/02_CURRENT_WORKFLOW.md`
- `docs/roles/UI_UX_START.md`
- `tasks/index.md`
- `tasks/README.md`
- `tasks/doing/*.md`
- `web/js/main.js`
- `web/ux-app.css`
- `tests/browser_detail_selection.test.cjs`
- `tests/unit/ui_combat_layout_contract.test.cjs`

## validation

- pass: `node --input-type=module --check < web/js/main.js`
- pass: `node --test tests/unit/ui_combat_layout_contract.test.cjs` (11/11)
- pass: `node --test tests/browser_detail_selection.test.cjs` (2/2)
- pass: `git diff --check -- web/js/main.js web/ux-app.css tests/browser_detail_selection.test.cjs tests/unit/ui_combat_layout_contract.test.cjs tasks/doing/2026-07-02_remove-pet-injury-popover.md`
- pass: 4173 formal browser pass at `http://127.0.0.1:4173/?runtime=http&sessionId=remove-injury-popover-1783004837299`; clicked `#prep-open-btn`, `#prep-ready-btn`, then used the page's visible `#day7-btn` to reach a deterministic risky board state. Hovered first `.cell.team-risk`: `.team-risk-num` text was `受38`, `.attack-warning-popover` count was `0`, right detail still showed `受击预警` and HP `47→9`, console/page errors = 0.
- screenshot reviewed by Lead: `/Users/ywh/Documents/ysbzs/output/playwright/remove-pet-injury-popover-4173.png`; board shows compact injury markers only and no floating warning panel, with no obvious overlap/missing state.
- blocked: `node tests/run_all_tests.cjs` still fails at existing unrelated `tests/run_all_tests.cjs:464` legacy pet merge assertion `upgraded.level === 2`; this file is owned/dirty under another ACTIVE task and is outside the injury popover scope.
- not run: `node tools/build_local_engine_bundle.cjs`; this task changes direct browser UI files, while the generated bundle is already shared by multiple unarchived task cards and rebuilding now would absorb unrelated dirty core changes into `web/js/local-engine.js`.

## commit_plan

- message: `fix(ui): remove pet injury hover popover`
- auto_commit: no; shared worktree has multiple existing dirty task groups and this task intentionally overlaps old UI task files by user authorization.

## collaboration

- lead_scope: Browser board injury display only.
- specialist_input: 无
- tester_pass: TEST_SUBTHREAD_UNAVAILABLE; Lead ran an independent 4173 tester pass through visible page buttons. Screenshot `/Users/ywh/Documents/ysbzs/output/playwright/remove-pet-injury-popover-4173.png`; compact marker remained, floating popover was absent, console/page errors 0.
- external_ai_input: 无
- lead_decision: Keep structured injury data and compact board marker, but remove the floating hover/selected board popover that clutters the playfield.
