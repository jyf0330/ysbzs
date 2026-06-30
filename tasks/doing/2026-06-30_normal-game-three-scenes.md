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
- 商店宠物商品必须显示公开详情：品质、小/中/大体型、元素、攻击格、价格和基础战斗属性；商品卡购买按钮仍走公开 `BUY_OFFER` 命令。
- 宠物定位/role 是内部数据，只用于池、权重、调试或内部 ViewModel，不在正常玩家页展示。
- 商店只卖宠物；商店格数是宠物攻击命中格容量，命中 1/2/3 格累计总量 10 格，不是 10 个商品按钮；商品价格按攻击格数挂钩，1格=2金、2格=4金、3格=6金。
- 商店宠物详情必须显示 3×4 攻击范围小网格：宠物固定在第 2 行第 1 格，攻击范围按公开形状偏移标出。
- 商店付费刷新价格按次数递增：第一次 2 金，第二次 4 金，第三次 8 金，第四次 16 金；进店首刷和免费刷新不推进付费序列。
- 游戏/战斗界面负责棋盘、战斗按钮、敌我状态和战斗记录，不承载商店与大背包整理。
- 不改 `web/js/main.js`、不改 `web/ux-app.css`、不改 `web/index.html`；涉及浏览器运行的核心/adapter 改动后必须刷新 `web/js/local-engine.js`。

## related_files

- `web/normal-game.html`
- `web/normal-game.css`
- `web/normal-game.js`
- `src/core/shop.cjs`
- `src/core/state.cjs`
- `src/core/dayRoute.cjs`
- `src/core/stateHash.cjs`
- `src/uiAdapter.cjs`
- `src/scenarios/fullDay.cjs`
- `web/js/runtime-client.js`
- `tools/run_ui_server.cjs`
- `tests/run_all_tests.cjs`
- `tests/unit/normal_game_three_scenes.test.cjs`
- `tasks/doing/2026-06-30_normal-game-three-scenes.md`

## exclusive_files

- 无

## overlap_note

- `src/uiAdapter.cjs` is also listed by existing replay / battle-debug / formal UI task cards; this follow-up records the overlap and remains non-auto-commit.

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

- pass after internal pet positioning cleanup: `node --input-type=module --check < web/normal-game.js`
- pass after internal pet positioning cleanup: `node --test tests/unit/normal_game_three_scenes.test.cjs` (4/4)
- pass after internal pet positioning cleanup: `node tests/run_all_tests.cjs` (67/67)
- pass after internal pet positioning cleanup: `git diff --check -- web/normal-game.js tests/unit/normal_game_three_scenes.test.cjs tasks/doing/2026-06-30_normal-game-three-scenes.md`
- pass after internal pet positioning cleanup: 4173 real browser flow at `http://127.0.0.1:4173/normal-game.html?runtime=http&sessionId=normal-internal-position-hidden-1782831165000&seed=normal-seed-check`: opened normal-game page, clicked route choice `夜市商人`, reached active shop scene, verified 4 `.shop-offer-card` entries; card headers use public body-size labels like `青铜 · 中 · 攻击2格 · 风`; shop cards and roster cards had no visible `定位` / `坦克` / `治疗` / `输出` / `控制` / `经济` / `机动` / `召唤`; console/page errors = 0.
- screenshot reviewed by Lead after internal pet positioning cleanup: `/Users/ywh/Documents/ysbzs/output/playwright/normal-game-internal-position-hidden-4173-2026-06-30T14-54-13-192Z.png`; visible shop cards show quality, public size, attack cells, element, stats and price without pet positioning text, and no obvious overlap/missing state.
- supersedes previous shop-detail visual wording: current normal-player shop/roster cards must not display pet `role` / 定位; role remains internal data for pools/debug.
- pass after shop 3x4 attack range grid: `node --input-type=module --check < web/normal-game.js`
- pass after shop 3x4 attack range grid: `node --test tests/unit/normal_game_three_scenes.test.cjs` (4/4)
- pass after shop 3x4 attack range grid: `node tests/run_all_tests.cjs` (67/67)
- pass after shop 3x4 attack range grid: `node tools/build_local_engine_bundle.cjs`
- pass after shop 3x4 attack range grid: restarted `http://127.0.0.1:4173/` so the live server used the rebuilt local engine and updated normal-game UI.
- pass after shop 3x4 attack range grid: 4173 real browser flow at `http://127.0.0.1:4173/normal-game.html?runtime=http&sessionId=normal-range-grid-1782830435136&seed=normal-seed-check`: opened normal-game page, clicked route choice `夜市商人`, reached active shop scene, verified 4 pet offer cards; each card had a 3x4 attack range grid with 12 cells, exactly 1 pet origin cell at the second row first column, at least 1 attack hit cell, no `超出` text, and the goods button command remained `BUY_OFFER`; console errors/page errors = 0.
- screenshot reviewed by Lead after shop 3x4 attack range grid: `/Users/ywh/Documents/ysbzs/output/playwright/normal-game-shop-range-grid-4173-2026-06-30T14-40-35-135Z.png`; visible shop cards show the pet origin and red attack-range cells inside a compact 3x4 grid, with no obvious overlap or missing price/stat details.
- pass after paid refresh cost sequence: `node --check src/core/shop.cjs`
- pass after paid refresh cost sequence: `node --check src/core/state.cjs`
- pass after paid refresh cost sequence: `node --check src/core/dayRoute.cjs && node --check src/core/stateHash.cjs && node --check src/scenarios/fullDay.cjs && node --check src/uiAdapter.cjs`
- pass after paid refresh cost sequence: `node --input-type=module --check < web/normal-game.js`
- pass after paid refresh cost sequence: `node --test tests/unit/normal_game_three_scenes.test.cjs` (4/4)
- pass after paid refresh cost sequence: `node tests/run_all_tests.cjs` (66/66)
- pass after paid refresh cost sequence: `git diff --check -- src/core/shop.cjs src/core/state.cjs src/core/dayRoute.cjs src/core/stateHash.cjs src/scenarios/fullDay.cjs src/uiAdapter.cjs web/normal-game.js tests/unit/normal_game_three_scenes.test.cjs tests/run_all_tests.cjs tasks/doing/2026-06-30_normal-game-three-scenes.md`
- pass after paid refresh cost sequence: `node tools/build_local_engine_bundle.cjs`
- pass after paid refresh cost sequence: restarted `http://127.0.0.1:4173/` so the live server used the updated paid refresh cost rule.
- pass after paid refresh cost sequence: 4173 real browser flow at `http://127.0.0.1:4173/normal-game.html?runtime=http&sessionId=normal-refresh-cost-1782829034925&seed=normal-seed-check`: opened normal-game page, clicked route choice `夜市商人`, reached active shop scene, verified refresh button initially showed `刷新商品 2 金`; clicked refresh and gold changed 8 -> 6, button showed `刷新商品 4 金`; clicked refresh again and gold changed 6 -> 2, button showed `刷新商品 8 金`; goods area still only exposed `BUY_OFFER`; console errors/page errors = 0.
- screenshot reviewed by Lead after paid refresh cost sequence: `/Users/ywh/Documents/ysbzs/output/playwright/normal-game-refresh-cost-4173-2026-06-30T14-17-14-924Z.png`; visible page shows gold 2 and refresh action `刷新商品 8 金`, with shop goods and operation row still separated and no obvious overlap.
- pass after shop attack-cell pricing: `node --check src/core/shop.cjs`
- pass after shop attack-cell pricing: `node --check src/uiAdapter.cjs`
- pass after shop attack-cell pricing: `node --input-type=module --check < web/normal-game.js`
- pass after shop attack-cell pricing: `node --test tests/unit/normal_game_three_scenes.test.cjs`
- pass after shop attack-cell pricing: `node tests/run_all_tests.cjs` (66/66)
- pass after shop attack-cell pricing: direct adapter assertion confirmed `shop.offers` total attack cells <= 10, `cells === attackCells`, and `price === attackCells * 2`.
- pass after shop attack-cell pricing: `git diff --check -- src/core/shop.cjs src/uiAdapter.cjs web/normal-game.js tests/unit/normal_game_three_scenes.test.cjs tests/run_all_tests.cjs tasks/doing/2026-06-30_normal-game-three-scenes.md`
- pass after shop attack-cell pricing: `node tools/build_local_engine_bundle.cjs`
- pass after shop attack-cell pricing: restarted `http://127.0.0.1:4173/` so the live server used the updated attack-cell pricing rule.
- pass after shop attack-cell pricing: 4173 real browser flow at `http://127.0.0.1:4173/normal-game.html?runtime=http&sessionId=normal-shop-attack-1782828927394&seed=normal-seed-check`: opened normal-game page, clicked route choice `夜市商人`, reached active shop scene, verified goods area had only pet cards with `BUY_OFFER`; attack cells were 2+3+3+2 = 10/10; prices were 4/6/6/4, matching `attackCells * 2`; refresh/exit/sell stayed in `#shop-action-list`; console errors/page errors = 0.
- screenshot reviewed by Lead after shop attack-cell pricing: `/Users/ywh/Documents/ysbzs/output/playwright/normal-game-shop-attack-cells-price-4173-2026-06-30T14-15-27-393Z.png`; visible page shows `攻击格 10/10`, pet cards show `攻击2格` or `攻击3格`, and prices are visibly tied to those attack-cell counts.
- pass after shop body-size grid capacity: `node --check src/core/shop.cjs`
- pass after shop body-size grid capacity: `node --check src/core/dayRoute.cjs`
- pass after shop body-size grid capacity: `node --check src/uiAdapter.cjs`
- pass after shop body-size grid capacity: `node --input-type=module --check < web/normal-game.js`
- pass after shop body-size grid capacity: `node --test tests/unit/normal_game_three_scenes.test.cjs`
- pass after shop body-size grid capacity: `git diff --check -- src/core/shop.cjs src/core/dayRoute.cjs src/uiAdapter.cjs web/normal-game.html web/normal-game.js web/normal-game.css tests/unit/normal_game_three_scenes.test.cjs tests/run_all_tests.cjs tasks/doing/2026-06-30_normal-game-three-scenes.md`
- pass after shop body-size grid capacity: `node tools/build_local_engine_bundle.cjs`
- pass after shop body-size grid capacity: restarted `http://127.0.0.1:4173/` so the live server used the updated shop grid-capacity rule.
- pass after shop body-size grid capacity: `node tests/run_all_tests.cjs` (64/64)
- pass after shop body-size grid capacity: 4173 real browser flow at `http://127.0.0.1:4173/normal-game.html?runtime=http&sessionId=normal-shop-grid-1782828320224&seed=normal-seed-check`: opened normal-game page, clicked route choice `夜市商人`, reached active shop scene, verified goods area had only pet cards with `BUY_OFFER`; body-size cells were 2+3+3+2 = 10/10; refresh/exit/sell were in `#shop-action-list`; no shop event card rendered as goods; console errors/page errors = 0.
- screenshot reviewed by Lead after shop body-size grid capacity: `/Users/ywh/Documents/ysbzs/output/playwright/normal-game-shop-grid-10-4173-2026-06-30T14-05-20-224Z.png`; visible page shows four pet goods cards, `宠物 10/10 格`, and the operation row separated below the goods grid with no obvious overlap.
- note after shop body-size grid capacity: `node --test tests/ui_adapter.test.cjs` still has unrelated existing failure `UI16 棋盘预览按整队摆位累计，当前主体跟随刚移动宠物` because the current initial roster has only one active pet while that older test requires at least two active pets.
- pass after shop pet detail cards: `node --check src/core/shop.cjs`
- pass after shop pet detail cards: `node --check src/uiAdapter.cjs`
- pass after shop pet detail cards: `node --input-type=module --check < web/normal-game.js`
- pass after shop pet detail cards: `node --test tests/unit/normal_game_three_scenes.test.cjs`
- pass after shop pet detail cards: `git diff --check -- src/core/shop.cjs src/uiAdapter.cjs web/normal-game.js web/normal-game.css tests/unit/normal_game_three_scenes.test.cjs tasks/doing/2026-06-30_normal-game-three-scenes.md`
- pass after shop pet detail cards: `node tools/build_local_engine_bundle.cjs`
- pass after shop pet detail cards: restarted `http://127.0.0.1:4173/` so the live server used the updated core modules and rebuilt `web/js/local-engine.js`.
- pass after shop pet detail cards: `node tests/run_all_tests.cjs` (64/64)
- pass after shop pet detail cards: 4173 real browser flow at `http://127.0.0.1:4173/normal-game.html?runtime=http&sessionId=normal-shop-detail-1782827788729&seed=normal-seed-check`: opened normal-game page, clicked route choice `夜市商人`, reached active shop scene, verified 6 `.shop-offer-card` entries; each pet offer exposed quality, 小/中/大 body size label, element, role, HP/攻/防/盾/行动, price and `BUY_OFFER` button; console errors/page errors = 0.
- screenshot reviewed by Lead after shop pet detail cards: `/Users/ywh/Documents/ysbzs/output/playwright/normal-game-shop-pet-detail-4173-2026-06-30T13-56-28-728Z.png`; first row and second row pet cards show `青铜 · 中/大/小 · 元素 · 定位`, stat cells and buy buttons are visible without overlap.
- RED confirmed for save/load/seed contract: `node --test tests/unit/normal_game_three_scenes.test.cjs` failed because the normal page had no `#seed-input` / save-load-restart buttons and `tools/run_ui_server.cjs` did not pass `seed` into new server sessions.
- pass after save/load/seed contract: `node --test tests/unit/normal_game_three_scenes.test.cjs`
- pass after save/load/seed contract: `node --input-type=module --check < web/normal-game.js && node --input-type=module --check < web/js/runtime-client.js && node --check tools/run_ui_server.cjs`
- pass after save/load/seed contract: `git diff --check -- web/normal-game.html web/normal-game.css web/normal-game.js web/js/runtime-client.js tools/run_ui_server.cjs tests/unit/normal_game_three_scenes.test.cjs`
- pass after save/load/seed contract: `node tests/run_all_tests.cjs` (64/64)
- pass after 4173 restart for save/load/seed contract: real browser flow through normal page controls at `http://127.0.0.1:4173/normal-game.html?runtime=http&sessionId=normal-save-load-seed-1782825306372&seed=normal-seed-check`: page opened at `时间节点 1` with 3 choices; clicked `保存` and got `已保存 v1`; clicked first node and reached `时间节点 2`; clicked `读取` and returned to `时间节点 1` with the saved stateHash restored; entered seed `normal-seed-check`; clicked `重开本局`, then choices were `免费刷新 / 宠物奖励 / 夜市商人`; clicked `规则自测`, which passed same-seed hash and route-choice consistency checks and restored the original run; no manual scene controls or console-style buttons; console errors/page errors = 0.
- screenshot reviewed by Lead after save/load/seed contract: `/Users/ywh/Documents/ysbzs/output/playwright/normal-game-save-load-seed-4173-2026-06-30T13-15-05-912Z.png`; top tools are visible without covering status, route scene directly shows three choices, and `规则自测通过：normal-seed-check` is visible.
- RED confirmed for normal-player chrome cleanup: `node --test tests/unit/normal_game_three_scenes.test.cjs` failed because `normal-game.html` still exposed `data-jump-scene` manual scene controls and console-style shop/battle buttons.
- pass after normal-player chrome cleanup: `node --test tests/unit/normal_game_three_scenes.test.cjs`
- pass after normal-player chrome cleanup: `node --input-type=module --check < web/normal-game.js`
- pass after normal-player chrome cleanup: `git diff --check -- web/normal-game.html web/normal-game.css web/normal-game.js tests/unit/normal_game_three_scenes.test.cjs`
- pass after normal-player chrome cleanup: `node tests/run_all_tests.cjs` (64/64)
- pass after normal-player chrome cleanup: 4173 real browser flow through formal page controls at `http://127.0.0.1:4173/normal-game.html?runtime=http&sessionId=normal-direct-node-1782824655214`: opened normal-game page; page auto-generated current node choices through public `/api/action`; initial visible scene was `route`; `#route-node-title=时间节点 1`; route choice count was 3 without clicking a generate-node button; no visible `生成节点候选` / `展开 3 选 1`; `data-jump-scene` count 0; console-style button count 0 for `#enter-shop-btn`, `#roll-shop-btn`, `#exit-shop-btn`, `#start-battle-btn`, `#route-return-btn`; clicked first route choice, then page auto-generated the next choices and reached `#route-node-title=时间节点 2`; console errors/page errors = 0.
- screenshot reviewed by Lead after normal-player chrome cleanup: `/Users/ywh/Documents/ysbzs/output/playwright/normal-game-direct-node-choices-4173-2026-06-30T13-04-14-760Z.png`; top bar shows only status chips, route scene directly shows 3 selectable node cards, and no manual shop/game/debug controls are visible.
- RED confirmed for time-node entry: `node --test tests/unit/normal_game_three_scenes.test.cjs` failed because the route scene had no `route-node-title` / `route-node-kicker` and the page did not contractually keep `init` on the route time-node screen.
- pass after time-node entry fix: `node --test tests/unit/normal_game_three_scenes.test.cjs`
- pass after time-node entry fix: `node --input-type=module --check < web/normal-game.js`
- pass after time-node entry fix: `git diff --check -- web/normal-game.html web/normal-game.js tests/unit/normal_game_three_scenes.test.cjs`
- pass after time-node entry fix: `node tests/run_all_tests.cjs` (64/64)
- pass after time-node entry fix: 4173 real browser flow through formal page controls at `http://127.0.0.1:4173/normal-game.html?runtime=http&sessionId=normal-time-node-1-1782821561467`: opened normal-game page; initial visible scene was `route`; `#route-node-title=时间节点 1`; `#next-label=生成节点候选`; clicked visible `展开 3 选 1` / node-generation button; route choices count became 3; console errors/page errors = 0.
- screenshot reviewed by Lead after time-node entry fix: `/Users/ywh/Documents/ysbzs/output/playwright/normal-game-time-node-1-4173-2026-06-30T12-12-41-127Z.png`; first visible screen is the route/time-node view, three choices are visible, and the roster panel has no obvious overlap or missing state.
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
