task_id: 2026-07-02_animated-pet-move
type: ui-feedback
status: ACTIVE_IMPL
owner: Codex
branch: shared-worktree

## Goal

移动宠物时先播放可见的慢速棋盘移动动画，让玩家感知为宠物正在移动；宠物到达后再显示 `MOVE_HERO` 返回的预览、详情和受击数据，避免同步沙盒预览计算表现成卡顿。

## Scope

- 只改正式浏览器 UI 表现层，不改核心规则、不改 adapter、不改 `/api/action` 协议。
- 棋盘点击空格移动仍走公开 `MOVE_HERO`。
- 移动点击后立即渲染源格宠物向目标格移动的动画；如果 API 比动画快，延迟最终渲染到动画结束；如果 API 更慢，动画停在目标后等待真实结果。
- 到达前不显示新预览/详情；到达后再按真实 ViewModel 和 `manualFlowPreview` 渲染所有数据。
- 尊重 `prefers-reduced-motion`。
- 不刷新 `web/js/local-engine.js`，除非后续租约清理；本轮用 `runtime=http` / 正式玩家入口验证 `web/js/main.js` UI 行为。

## related_files

- `web/js/main.js`
- `web/ux-app.css`
- `tests/unit/ui_combat_layout_contract.test.cjs`
- `tasks/doing/2026-07-02_animated-pet-move.md`

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
- `tests/unit/ui_combat_layout_contract.test.cjs`

## validation

- RED confirmed: `node --test tests/unit/ui_combat_layout_contract.test.cjs` failed before implementation because `MOVE_ANIMATION_MIN_MS` / movement animation helpers and CSS were absent.
- pass: `node --test tests/unit/ui_combat_layout_contract.test.cjs` (11/11)
- pass: `node --input-type=module --check < web/js/main.js`
- pass: `git diff --check -- web/js/main.js web/ux-app.css tests/unit/ui_combat_layout_contract.test.cjs tasks/doing/2026-07-02_animated-pet-move.md`
- pass: 4173 formal browser tester pass through real buttons/clicks at `http://127.0.0.1:4173/?runtime=http&sessionId=animated-move-1783005521535&seed=animated-move`: opened battle, clicked hero pet, clicked empty move target; during movement DOM had `movingTokens=1`, `fromCells=1`, `toCells=1`, and final ViewModel moved `hero_pal_002_1` to `R0C0`; final `manualPreviewReady=true`, `cellDetailReady=true`, `movingTokens=0`; console/page errors = 0.
- screenshot reviewed by Lead: `/Users/ywh/Documents/ysbzs/output/playwright/animated-pet-move-during-4173.png` shows the pet visually traveling between cells and target highlight; `/Users/ywh/Documents/ysbzs/output/playwright/animated-pet-move-final-4173.png` shows final board state after the true command result, with no obvious overlap or missing board state.
- pass: `node --test tests/browser_detail_selection.test.cjs` (2/2)
- pass: `node --test tests/unit/attack_animation_contract.test.cjs` (1/1)
- pass: `node --test tests/unit/ui_module_render_cache.test.cjs` (17/17)
- not run: `node tools/build_local_engine_bundle.cjs`; this task validates `runtime=http` source UI path only because `web/js/local-engine.js` is occupied by existing unarchived task groups.

## commit_plan

- message: `ui: animate pet movement before preview refresh`
- auto_commit: no; shared worktree has multiple existing dirty READY_TO_MERGE UI task groups and overlapping `web/js/main.js` / `web/ux-app.css` ownership.

## collaboration

- lead_scope: Browser UI movement feedback only.
- specialist_input: 无
- tester_pass: `TEST_SUBTHREAD_UNAVAILABLE`; equivalent independent Playwright pass from terminal on 4173 formal page, screenshots `/Users/ywh/Documents/ysbzs/output/playwright/animated-pet-move-during-4173.png` and `/Users/ywh/Documents/ysbzs/output/playwright/animated-pet-move-final-4173.png`, DOM/ViewModel assertions matched, console/page errors 0.
- external_ai_input: 无
- lead_decision: User explicitly asked to hide the perceived lag by showing a slow pet movement first. Keep the heavy preview calculation intact for correctness, but delay final render until the movement reaches the target.

## overlap_note

- `web/js/main.js` / `web/ux-app.css` are already listed by existing unarchived UI tasks (`2026-06-29_auto-enemy-turn-flow`, `2026-06-30_attack-event-animation`, `2026-06-30_round-placement-preview-reset`, `2026-07-02_remove-pet-injury-popover`).
- This task proceeds in the shared worktree because the latest user instruction explicitly says to implement the animated movement. Do not auto-commit until grouped ownership is reconciled.
