# 2026-06-30_normal-game-three-scenes

task_id: 2026-06-30_normal-game-three-scenes
type: ui-structure
status: READY_TO_MERGE
owner: Codex
branch: codex/bazaar-day1-day3-route

## Goal

把当前“所有功能都在一个界面”的体验拆成正常游戏三场景：3 选 1 界面、商店界面、游戏/战斗界面；3 选 1 与商店界面都允许上阵/下阵宠物。

## Scope

- 新增独立正常游戏三场景页，不修改当前被其他任务占用的旧正式战斗页。
- 三场景页只通过 `createGameRuntime()` 访问 `/api/view` 和 `/api/action`。
- 3 选 1界面负责路线/奖励/遭遇选择，并显示可上阵/下阵阵容区。
- 商店界面负责购买、刷新、出售、离开商店，并显示可上阵/下阵阵容区。
- 游戏/战斗界面负责棋盘、战斗按钮、敌我状态和战斗记录，不承载商店与大背包整理。
- 不改核心规则、不改 `web/js/main.js`、不改 `web/ux-app.css`、不改 `web/index.html`、不刷新 `web/js/local-engine.js`。

## related_files

- `web/normal-game.html`
- `web/normal-game.css`
- `web/normal-game.js`
- `tests/unit/normal_game_three_scenes.test.cjs`
- `tasks/doing/2026-06-30_normal-game-three-scenes.md`

## exclusive_files

- 无

## read_files

- `AGENTS.md`
- `docs/02_CURRENT_WORKFLOW.md`
- `docs/00_AI_START_HERE.md`
- `docs/roles/UI_UX_START.md`
- `tasks/index.md`
- `tasks/README.md`
- `web/daily-flow.html`
- `web/daily-flow.js`
- `web/paper-battle.js`
- `web/js/runtime-client.js`
- `tests/unit/ui_combat_layout_contract.test.cjs`

## validation

- pass: `node --test tests/unit/normal_game_three_scenes.test.cjs`
- pass: `node --input-type=module --check < web/normal-game.js`
- pass: `git diff --check -- web/normal-game.html web/normal-game.css web/normal-game.js tests/unit/normal_game_three_scenes.test.cjs tasks/doing/2026-06-30_normal-game-three-scenes.md`
- pass: `node tests/run_all_tests.cjs` (64/64)
- pass: 4173 real browser flow through formal page controls at `http://127.0.0.1:4173/normal-game.html?runtime=http`: opened 3 选 1 scene, verified route roster; switched to shop, clicked `进入商店`, clicked shop roster `下阵` then `上阵` through `TOGGLE_UNIT_ACTIVE`; opened game scene, clicked `开始战斗`, waited for `阶段=玩家回合`, verified board unit cells=6, hero cards=3, enemy cards=3, console errors/page errors=0.
- screenshot reviewed by Lead: `/Users/ywh/Documents/ysbzs/output/playwright/normal-game-three-scenes-4173-2026-06-30T12-05-42-803Z.png`; scene split is visible, no obvious overlap/missing core state, board HP values render from ViewModel unit data.
- note: `tasks/index.md` not updated because it is exclusive to `2026-06-28_replay-command-stream`.

## commit_plan

- message: `feat(ui): add normal three-scene game shell`
- auto_commit: blocked by existing overlapping READY_TO_MERGE task groups and dirty shared UI files; leave for git-c / Lead grouping.

## collaboration

- lead_scope: New standalone three-scene browser UI only.
- specialist_input: 无
- tester_pass: 4173 real browser pass through normal-game route/shop/battle controls; screenshot `/Users/ywh/Documents/ysbzs/output/playwright/normal-game-three-scenes-4173-2026-06-30T12-05-42-803Z.png`; DOM assertions matched; console/page errors 0.
- external_ai_input: 无
- lead_decision: Avoid editing old formal battle page files because multiple active tasks own them. Built a standalone normal-game page that proves the desired scene split through public runtime APIs first: route and shop own roster switching, battle owns only board and combat controls.
