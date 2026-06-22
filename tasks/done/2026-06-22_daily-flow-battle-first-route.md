# 2026-06-22_daily-flow-battle-first-route

task_id: 2026-06-22_daily-flow-battle-first-route
type: core-ui
status: READY_TO_MERGE
owner: Codex
branch: codex/bazaar-day1-day3-route

## Goal

把每日流程改成用户最终确认的同日闭环：前两个步骤是 3 选 1 事件/节点，第三步进入棋盘战斗；后半天继续两个 3 选 1 事件/节点，第六步进入第二场棋盘战斗，完成当天。

## Scope

- 核心路线顺序按用户最新纠正改为“节点、节点、战斗、节点、节点、战斗”：第一/二步是 3 选 1，第三步是第一场固定战，第四/五步是 3 选 1，第六步是第二场固定战。
- 保持核心规则和 UI 分离：核心改 `src/core/dayRoute.cjs` / CSV 日程；页面只读 `dailyFlow`/ViewModel 并通过 `/api/action` 发命令。
- 每日流程页隐藏/降级开发按钮，玩家主按钮只表达战斗、3 选 1、节点内部处理和进入下一段。
- `2026-06-22_battle-shape-attribute-readability` 已移动到 `tasks/done/` 后，同步修正 `src/uiAdapter.cjs` 的 `nextActions`，让主 ViewModel 在 init 暴露固定路线战斗，并允许 Day10 终局战后继续显示后续节点。
- 把 shape ViewModel 小工具拆到 `src/uiAdapterShapeVM.cjs`，保持 `src/uiAdapter.cjs` 低于 round5 size guard，并重建 `web/js/local-engine.js`。
- 本轮补充用户要求的可录屏验收闭环：除战斗可用路线战斗自动结算外，3 选 1、进商店、买、卖、离店、进入下一天都必须是 daily-flow 页面真实按钮。
- 新增玩家命令 `START_NEXT_DAY`，让 Day1 结束后可以通过正式 `/api/action` 进入 Day2。
- daily-flow 商店节点显示背包出售按钮，录屏可证明买入后再出售不是脚本改状态。
- 修正早期商店经济：`06_shop_rewards.csv` 的 `价格覆盖` 原本全是 44，导致默认 Day1 战后真实玩家买不起任何商品；现在 pT1/pT2/pT3 覆盖价分别回到 2/4/6，Day1 默认经济可真实买卖。
- 本轮补充用户纠正：每日流程商店必须明确显示“购买宠物 / 出售宠物”，并且玩家流程不再展示冻结/解冻入口；冻结命令保留为底层兼容能力，但不作为玩家 nextActions 或 daily-flow 页面按钮。
- 本轮补充用户纠正：首屏开局必须先建立“孙悟空 vs 虎先锋”的英雄/Boss 概念；玩家初始只带宠物单位，默认两只捣蛋猫上场；虎先锋通过波次持续召唤棉悠悠、捣蛋猫这类宠物，不把小怪当成新的英雄概念。
- daily-flow 首屏保留开局背景信息：孙悟空、虎先锋、玩家宠物、首波召唤预告，但玩家当天第一个可执行流程仍是 3 选 1。
- daily-flow 页面默认使用 HTTP runtime，并透传 `sessionId`，普通 server URL 不需要再额外带 `runtime=http` 才能跑起来。
- 本轮补充用户纠正：流程页面必须显示背包，上阵区域和背包区域分开；商店购买优先放入上阵位，上阵满后才进入背包，两个区域都没有空位时购买失败；商店内库存卡额外提供“出售”入口。
- 本轮补充用户纠正：背包与上阵区域必须能手动调度，背包卡显示“上阵”，上阵卡显示“下阵”，容量满时按钮禁用并给出原因。

## related_files

- `data/csv/24_node_schedule.csv`
- `data/csv/03_monster_waves.csv`
- `data/csv/06_shop_rewards.csv`
- `data/csv/10_initial_roster.csv`
- `xlsx/ysbzs_master.xlsx`
- `src/core/state.cjs`
- `src/core/battle.cjs`
- `src/core/dayRoute.cjs`
- `src/core/shop.cjs`
- `src/core/inventoryRules.cjs`
- `src/uiAdapterCommands.cjs`
- `src/dailyFlowView.cjs`
- `src/uiAdapter.cjs`
- `src/uiAdapterInventoryVM.cjs`
- `src/uiAdapterShapeVM.cjs`
- `web/daily-flow.html`
- `web/daily-flow.css`
- `web/daily-flow.js`
- `web/js/local-engine.js`
- `tools/record_daily_flow_player_flow.cjs`
- `tests/run_all_tests.cjs`
- `tests/ui_adapter.test.cjs`
- `tests/unit/architecture_round4.test.cjs`
- `tests/unit/daily_flow_battle_first_route.test.cjs`
- `tests/unit/quality_tiers_factory.test.cjs`
- `tests/unit/ui_combat_layout_contract.test.cjs`
- `tasks/doing/2026-06-22_daily-flow-battle-first-route.md`
- `tasks/index.md`
- `output/playwright/daily-flow-battle-first-route-2026-06-22.png`
- `output/playwright/daily-flow-battle-first-route-2026-06-22.json`
- `output/playwright/daily-flow-day1-day2-shop-route-2026-06-22.webm`
- `output/playwright/daily-flow-day1-day2-shop-route-2026-06-22.json`
- `output/playwright/daily-flow-day1-day2-shop-route-2026-06-22.png`
- `output/playwright/daily-flow-day1-day2-shop-route-start-2026-06-22.png`
- `output/playwright/daily-flow-2026-06-22-pet-buy-sell-no-freeze.webm`
- `output/playwright/daily-flow-2026-06-22-pet-buy-sell-no-freeze.json`
- `output/playwright/daily-flow-2026-06-22-pet-buy-sell-no-freeze.png`
- `output/playwright/daily-flow-opening-start-2026-06-22.png`
- `output/playwright/daily-flow-opening-after-click-2026-06-22.png`
- `output/playwright/daily-flow-opening-2026-06-22.json`
- `output/playwright/daily-flow-2026-06-22-node-node-battle-day1-day2-with-cursor.webm`
- `output/playwright/daily-flow-2026-06-22-node-node-battle-day1-day2-with-cursor.png`
- `output/playwright/daily-flow-2026-06-22-node-node-battle-day1-day2-with-cursor.json`
- `output/playwright/daily-flow-inventory-shop-before-sell-2026-06-22.png`
- `output/playwright/daily-flow-inventory-shop-after-sell-2026-06-22.png`
- `output/playwright/daily-flow-inventory-shop-2026-06-22.json`
- `output/playwright/daily-flow-inventory-toggle-final-2026-06-23-after-down.png`
- `output/playwright/daily-flow-inventory-toggle-final-2026-06-23-after-up.png`
- `output/playwright/daily-flow-inventory-toggle-final-2026-06-23.json`

## exclusive_files

- `src/core/dayRoute.cjs`
- `src/core/state.cjs`
- `src/core/battle.cjs`
- `src/uiAdapterCommands.cjs`
- `data/csv/03_monster_waves.csv`
- `data/csv/24_node_schedule.csv`
- `data/csv/10_initial_roster.csv`
- `xlsx/ysbzs_master.xlsx`
- `tasks/index.md`

## read_files

- `AGENTS.md`
- `~/Desktop/AI-Memory-Pack/20-projects.md`
- `docs/00_AI_START_HERE.md`
- `docs/02_CURRENT_WORKFLOW.md`
- `docs/roles/PROGRAMMER_START.md`
- `docs/roles/UI_UX_START.md`
- `docs/roles/PLANNER_START.md`
- `tasks/README.md`
- `tasks/doing/2026-06-22_battle-shape-attribute-readability.md`
- `data/csv/25_node_pool.csv`
- `data/csv/26_encounter_pool.csv`
- `src/scenarios/fullDay.cjs`
- `src/core/state.cjs`
- `src/core/battle.cjs`
- `src/core/shop.cjs`
- `src/uiAdapter.cjs`
- `src/uiAdapterShapeVM.cjs`
- `src/uiAdapterCommands.cjs`
- `web/js/runtime-client.js`
- `tasks/done/2026-06-22_battle-shape-attribute-readability.md`

## validation

- pass: `node --test tests/unit/daily_flow_battle_first_route.test.cjs`
- pass: `node tests/run_all_tests.cjs`
- pass: `node --test tests/ui_adapter.test.cjs`
- pass: `node --test tests/unit/ui_combat_layout_contract.test.cjs`
- pass: `node tools/audit_singleplayer_architecture.cjs`
- pass: `npm run check:csv`
- pass: `node tools/check_no_dom.cjs`
- pass: `npm run check:all`
- pass: `npm run test:coverage`
- pass: `git diff --check`
- pass: `node tools/build_local_engine_bundle.cjs`
- pass after Day1 shop price fix: `node --test tests/unit/daily_flow_battle_first_route.test.cjs`
- pass after Day1 shop price fix: `node --test tests/ui_adapter.test.cjs`
- pass after Day1-Day2 video evidence: `node tests/run_all_tests.cjs`
- pass after Day1-Day2 video evidence: `npm run check:all`
- pass after Day1-Day2 video evidence: `npm run test:coverage`
- pass after Day1-Day2 video evidence: `git diff --check`
- pass after pet buy/sell/no-freeze fix: `node --test tests/unit/daily_flow_battle_first_route.test.cjs`
- pass after pet buy/sell/no-freeze fix: `node --test tests/ui_adapter.test.cjs`
- pass after pet buy/sell/no-freeze fix: `node tools/build_local_engine_bundle.cjs`
- pass after pet buy/sell/no-freeze fix: `node tests/run_all_tests.cjs`
- pass after pet buy/sell/no-freeze fix: `npm run check:all`
- pass after pet buy/sell/no-freeze fix: `npm run test:coverage`
- pass after pet buy/sell/no-freeze fix: `git diff --check`
- pass: real browser tester pass on `http://127.0.0.1:4873/daily-flow.html?runtime=http&dailyFlowBattleFirst=1`
  - screenshot: `output/playwright/daily-flow-battle-first-route-2026-06-22.png`
  - report: `output/playwright/daily-flow-battle-first-route-2026-06-22.json`
  - asserted: player-click path `node -> node -> fixed_battle -> node -> node -> fixed_battle`, final `phase=day_end`, `currentStep=6/6`, history has 2 fixed battles and 4 node picks, console/page errors empty
  - main-thread screenshot review: pass; page shows 6/6, all six steps done, no obvious overlap/missing state, cool green-gray palette replaces prior beige-dominant pass
- pass: real browser video pass on `http://127.0.0.1:4878/daily-flow.html?runtime=http&record=day1-day2-shop-route`
  - video: `output/playwright/daily-flow-day1-day2-shop-route-2026-06-22.webm`
  - screenshot: `output/playwright/daily-flow-day1-day2-shop-route-2026-06-22.png`
  - start screenshot: `output/playwright/daily-flow-day1-day2-shop-route-start-2026-06-22.png`
  - report: `output/playwright/daily-flow-day1-day2-shop-route-2026-06-22.json`
  - asserted: real page clicks for 4 route battle buttons, 8 generated 3-choice sets, 8 node picks, 2 shop entries, 2 buys, 2 sells, 2 shop exits, 1 next-day click; final `day=2`, `phase=day_end`, `currentStep=6/6`
  - asserted: console errors `0`, page errors `0`, request failures `0`
  - main-thread screenshot review: pass; screenshot visibly shows Day2 `当天结束`, route progress `6/6`, button `进入第3天`, and D1 run summary.
- pass: real browser video pass on `http://127.0.0.1:4882/daily-flow.html?runtime=http&record=pet-buy-sell-no-freeze`
  - video: `output/playwright/daily-flow-2026-06-22-pet-buy-sell-no-freeze.webm`
  - screenshot: `output/playwright/daily-flow-2026-06-22-pet-buy-sell-no-freeze.png`
  - report: `output/playwright/daily-flow-2026-06-22-pet-buy-sell-no-freeze.json`
  - asserted: real page clicks for opening route battle, generating 3-choice, picking `nodeType=shop`, clicking `购买宠物 火绒狐`, clicking the resulting bench `出售宠物 火绒狐`; events include `SHOP_BUY` and `SELL_UNIT`
  - asserted: visible shop buttons include `购买宠物` and `出售宠物`, and exclude `冻结` / `解冻` / `FREEZE_OFFER` / `UNFREEZE_OFFER`
  - asserted: console errors `0`, page errors `0`, request failures `0`
  - main-thread screenshot review: pass; screenshot shows shop phase, pet buy/sell buttons, shop events and exit button, no freeze controls, no obvious overlap or missing labels.
- pass after latest node-node-battle rhythm: `node --test tests/unit/daily_flow_battle_first_route.test.cjs`
- pass after latest node-node-battle rhythm: `node --test tests/ui_adapter.test.cjs`
- pass after latest node-node-battle rhythm: `node tests/run_all_tests.cjs`
- pass after latest node-node-battle rhythm: `node tools/build_local_engine_bundle.cjs`
- pass after latest node-node-battle rhythm: `npm run check:all`
- pass after latest node-node-battle rhythm: `npm run test:coverage`
- pass after latest node-node-battle rhythm: `git diff --check`
- pass: real browser video pass on `http://127.0.0.1:4884/daily-flow.html?runtime=http&record=node-node-battle-day1-day2`
  - video: `output/playwright/daily-flow-2026-06-22-node-node-battle-day1-day2.webm`
  - screenshot: `output/playwright/daily-flow-2026-06-22-node-node-battle-day1-day2.png`
  - report: `output/playwright/daily-flow-2026-06-22-node-node-battle-day1-day2.json`
  - asserted: real page clicks for Day1 and Day2: `展开 3 选 1`, `PICK_NODE`, `BUY_OFFER`, `SELL_UNIT`, `EXIT_SHOP`, fixed battle route buttons, and `START_NEXT_DAY`; each day ended at `currentStep=6/6`.
  - asserted: normalized route order is `node_choice,node_choice,fixed_battle,node_choice,node_choice,fixed_battle`; console errors `0`, page errors `0`, request failures `0`; no `冻结` / `解冻` / `FREEZE_OFFER` / `UNFREEZE_OFFER` visible.
  - main-thread screenshot review: pass; screenshot visibly shows Day2 `当天结束`, route progress `6/6`, first two steps as event nodes and step 3 as first battle, no obvious overlap or missing labels.
- pass after external overwrite relock: runtime probe still returns `node_choice,node_choice,fixed_battle,node_choice,node_choice,fixed_battle` for both core schedule and public dailyFlow ViewModel.
- pass after external overwrite relock: key route files remain `uchg` locked because unlocking them previously allowed an external writer to restore the obsolete battle-first order within seconds.
- pass after external overwrite relock: `node --test tests/unit/daily_flow_battle_first_route.test.cjs`, `node --test tests/ui_adapter.test.cjs`, `node tools/build_local_engine_bundle.cjs`, `node tests/run_all_tests.cjs`, `npm run check:all`, `npm run test:coverage`, and `git diff --check`.
- pass: final real browser evidence exists:
  - video: `output/playwright/daily-flow-2026-06-22-node-node-battle-day1-day2-final.webm`
  - screenshot: `output/playwright/daily-flow-2026-06-22-node-node-battle-day1-day2-final.png`
  - report: `output/playwright/daily-flow-2026-06-22-node-node-battle-day1-day2-final.json`
  - asserted: 45 real page actions; final `day=2`, `phase=day_end`, `currentStep=6`, order `node_choice,node_choice,fixed_battle,node_choice,node_choice,fixed_battle`; console/page/request errors all `0`; report includes clicked `购买宠物` and `出售宠物`, and excludes freeze controls.
- pass: replacement real browser video with visible simulated mouse cursor exists:
  - script: `node tools/record_daily_flow_player_flow.cjs`
  - video: `output/playwright/daily-flow-2026-06-22-node-node-battle-day1-day2-with-cursor.webm`
  - screenshot: `output/playwright/daily-flow-2026-06-22-node-node-battle-day1-day2-with-cursor.png`
  - report: `output/playwright/daily-flow-2026-06-22-node-node-battle-day1-day2-with-cursor.json`
  - asserted: visible in-page cursor overlay present in screenshot/video; 28 real page clicks; final `day=2`, `phase=day_end`, `currentStep=6`, order `node_choice,node_choice,fixed_battle,node_choice,node_choice,fixed_battle`; `展开 3 选 1` is no longer clicked and is auto-expanded 8 times; clicked 8 node picks, 4 route battle buttons, 5 `购买宠物`, 5 `出售宠物`, 5 shop exits, and 1 next-day button; console/page/request errors all `0`; visible page excludes `冻结` / `解冻` / `FREEZE_OFFER` / `UNFREEZE_OFFER`.
- pass after visible-cursor evidence fix: `node --test tests/unit/daily_flow_battle_first_route.test.cjs`
- pass after visible-cursor evidence fix: `node --test tests/unit/ui_combat_layout_contract.test.cjs`
- pass after visible-cursor evidence fix: `node --test tests/ui_adapter.test.cjs`
- pass after visible-cursor evidence fix: `git diff --check -- web/daily-flow.js tools/record_daily_flow_player_flow.cjs`
- pass after reduced-click flow: `node tools/record_daily_flow_player_flow.cjs`
- pass after reduced-click flow: `node --test tests/unit/daily_flow_battle_first_route.test.cjs`
- pass after reduced-click flow: `node --test tests/unit/ui_combat_layout_contract.test.cjs`
- pass after reduced-click flow: `node --test tests/ui_adapter.test.cjs`
- pass after reduced-click flow: `node --check tools/record_daily_flow_player_flow.cjs && git diff --check -- web/daily-flow.js tools/record_daily_flow_player_flow.cjs tasks/doing/2026-06-22_daily-flow-battle-first-route.md`
- pass after flow inventory/shop placement fix: `node --test tests/unit/daily_flow_battle_first_route.test.cjs`
- pass after flow inventory/shop placement fix: `node --test tests/ui_adapter.test.cjs`
- pass after flow inventory/shop placement fix: `node --test tests/unit/architecture_round4.test.cjs`
- pass after flow inventory/shop placement fix: `node tools/build_local_engine_bundle.cjs`
- pass after flow inventory/shop placement fix: `node tests/run_all_tests.cjs`
- pass after flow inventory/shop placement fix: `npm run check:all`
- pass after flow inventory/shop placement fix: `npm run test:coverage`
- pass after flow inventory/shop placement fix: `git diff --check`
- red: `node --test tests/unit/daily_flow_battle_first_route.test.cjs` failed before implementation because inventory ViewModel did not expose `canMoveToActive` and daily-flow page did not expose `TOGGLE_UNIT_ACTIVE` / `上阵` / `下阵` controls.
- pass after manual active/backpack toggle fix: `node --test tests/unit/daily_flow_battle_first_route.test.cjs`
- pass after manual active/backpack toggle fix: `node --test tests/ui_adapter.test.cjs`
- pass after manual active/backpack toggle fix: `node --test tests/unit/architecture_round4.test.cjs`
- pass after manual active/backpack toggle fix: `node tools/audit_singleplayer_architecture.cjs`
- pass after manual active/backpack toggle fix: `node tools/build_local_engine_bundle.cjs`
- pass after manual active/backpack toggle fix: `node tests/run_all_tests.cjs`
- pass after manual active/backpack toggle fix: `npm run check:all`
- pass after manual active/backpack toggle fix: `npm run test:coverage`
- pass after manual active/backpack toggle fix: `git diff --check`
- pass: final real browser inventory toggle tester pass on `daily-flow.html?runtime=http&sessionId=daily-flow-inventory-toggle-final-*`
  - screenshot after down: `output/playwright/daily-flow-inventory-toggle-final-2026-06-23-after-down.png`
  - screenshot after up: `output/playwright/daily-flow-inventory-toggle-final-2026-06-23-after-up.png`
  - report: `output/playwright/daily-flow-inventory-toggle-final-2026-06-23.json`
  - asserted: real page click on active-card `下阵` moved one pet from active to backpack; real page click on backpack-card `上阵` moved it back to active; events included `TOGGLE_UNIT_ACTIVE` with `active=false` and `active=true`.
  - asserted: console errors `0`, page errors `0`, request failures `0`.
  - main-thread screenshot review: pass; screenshots visibly show 上阵区域 / 背包区域 with `下阵` and `上阵` controls, counts changing `上阵 1/4 · 背包 1/8` then back to `上阵 2/4 · 背包 0/8`, no obvious overlap or missing labels.
- pass: real browser inventory/shop tester pass on `daily-flow.html?runtime=http&sessionId=daily-flow-inventory-shop-*`
  - screenshot before sell: `output/playwright/daily-flow-inventory-shop-before-sell-2026-06-22.png`
  - screenshot after sell: `output/playwright/daily-flow-inventory-shop-after-sell-2026-06-22.png`
  - report: `output/playwright/daily-flow-inventory-shop-2026-06-22.json`
  - asserted: real page clicks selected a shop node, clicked `购买宠物` on a buy button whose public ViewModel said `buyPlacement=active`, then clicked the bought unit's inventory-card `出售`; `SHOP_BUY.inventory.active=true`, active count increased by 1 after purchase, `SELL_UNIT` fired from the inventory panel, final phase stayed `shop`.
  - asserted: daily-flow page shows `inventory-panel`, `inventory-active-list`, and `inventory-bench-list`; console errors `0`, page errors `0`, request failures `0`.
  - main-thread screenshot review: pass; screenshots visibly show the new 上阵区域 / 背包区域, buy/sell controls, active slot count changing from 3 back to 2 after sale, no obvious overlap or missing labels.
- superseded evidence: real browser screenshot pass on `http://127.0.0.1:4896/daily-flow.html?sessionId=daily-flow-opening-e2e&playerId=p1`
  - screenshot before click: `output/playwright/daily-flow-opening-start-2026-06-22.png`
  - screenshot after click: `output/playwright/daily-flow-opening-after-click-2026-06-22.png`
  - report: `output/playwright/daily-flow-opening-2026-06-22.json`
  - asserted: ordinary daily-flow URL defaults to HTTP runtime, opens with `开始开场战斗`, shows `孙悟空` / `虎先锋` / two `捣蛋猫` /首波 `棉悠悠、捣蛋猫`; real button click runs `RUN_ROUTE_FIXED_BATTLE`; after click `phase=node_resolved`, `currentStep=1`, next schedule is `node_choice`, button becomes `展开 3 选 1`, events include `虎先锋召唤`.
  - note: this battle-first opening pass was superseded by the user's later correction that the first two daily steps should be events and the third should be battle; final accepted browser evidence is `daily-flow-2026-06-22-node-node-battle-day1-day2-final.*`.
  - asserted: console errors `0`, page errors `0`, request failures `0`.
  - main-thread screenshot review: pass; first screenshot shows battle-first Day1 opening panel and button, second screenshot shows route progress `1/6` and next 3选1 step, no obvious overlap/missing labels.
  - note: during validation, iCloud/Drive file provider repeatedly restored stale copies and applied `uchg` to `src/core/dayRoute.cjs`, `tests/run_all_tests.cjs`, `tests/unit/daily_flow_battle_first_route.test.cjs`, and `tests/ui_adapter.test.cjs`; these files were re-applied and kept protected locally while finishing validation.

## commit_plan

- message: `feat: restore node-node-battle daily flow`
- stage only current task files:
  - `data/csv/24_node_schedule.csv`
  - `data/csv/03_monster_waves.csv`
  - `data/csv/06_shop_rewards.csv`
  - `data/csv/10_initial_roster.csv`
  - `xlsx/ysbzs_master.xlsx`
  - `src/core/state.cjs`
  - `src/core/battle.cjs`
  - `src/core/dayRoute.cjs`
  - `src/core/shop.cjs`
  - `src/core/inventoryRules.cjs`
  - `src/uiAdapterCommands.cjs`
  - `src/uiAdapter.cjs`
  - `src/uiAdapterInventoryVM.cjs`
  - `src/uiAdapterShapeVM.cjs`
  - `src/dailyFlowView.cjs`
  - `web/daily-flow.html`
  - `web/daily-flow.css`
  - `web/daily-flow.js`
  - `web/js/local-engine.js`
  - `tests/run_all_tests.cjs`
  - `tests/ui_adapter.test.cjs`
  - `tests/unit/architecture_round4.test.cjs`
  - `tests/unit/daily_flow_battle_first_route.test.cjs`
  - `tests/unit/quality_tiers_factory.test.cjs`
  - `tests/unit/ui_combat_layout_contract.test.cjs`
  - `output/playwright/daily-flow-inventory-shop-before-sell-2026-06-22.png`
  - `output/playwright/daily-flow-inventory-shop-after-sell-2026-06-22.png`
  - `output/playwright/daily-flow-inventory-shop-2026-06-22.json`
  - `output/playwright/daily-flow-inventory-toggle-final-2026-06-23-after-down.png`
  - `output/playwright/daily-flow-inventory-toggle-final-2026-06-23-after-up.png`
  - `output/playwright/daily-flow-inventory-toggle-final-2026-06-23.json`
  - archived task card when ready
- auto-commit blocked: `src/uiAdapter.cjs`, `web/js/local-engine.js`, `tests/ui_adapter.test.cjs`, and `tests/unit/ui_combat_layout_contract.test.cjs` contained pre-existing uncommitted changes from `tasks/done/2026-06-22_battle-shape-attribute-readability.md`; the worktree also now has unrelated/unowned active files such as `src/core/battle/planning.cjs`, `tasks/doing/2026-06-22_auto-position-overkill.md`, and `tests/unit/auto_position_overkill.test.cjs`. Staging whole files would mix task scopes.

## collaboration

- lead_scope: Restore the standalone daily-flow route to two 3-choice nodes before each fixed battle, with a real Day1/Day2 browser recording that includes shop buy/sell.
- specialist_input: 无
- tester_pass: completed via Playwright real browser passes; latest inventory toggle pass used real page clicks for active-card `下阵` and backpack-card `上阵`, with screenshots and JSON saved under `output/playwright/daily-flow-inventory-toggle-final-2026-06-23*`.
- external_ai_input: 无
- lead_decision: Treat the latest user correction as the source of truth: the first two daily steps are 3 选 1 event nodes and the third is battle, repeated twice per day. Runtime route order is `node_choice,node_choice,fixed_battle,node_choice,node_choice,fixed_battle`; flow page shows 上阵区域 / 背包区域, shop purchases prefer active slots then bench, full roster blocks buying, shop UI exposes pet buy/sell with no freeze controls, and inventory cards now expose manual `上阵` / `下阵` movement with capacity guards.
- unowned_dirty_files: `docs/10_CHANGELOG.md`, `docs/PAPER_BATTLE_UI_START_HERE.md`, `src/core/battle/planning.cjs`, `web/js/main.js`, `web/ux-app.css`, `web/ux-app.js`, `docs/RIGHT_PET_DETAIL_PANEL_PROMPT.md`, `tasks/doing/2026-06-22_auto-position-overkill.md`, `tests/unit/auto_position_overkill.test.cjs`, `tasks/done/2026-06-22_battle-shape-attribute-readability.md`, `tasks/done/2026-06-22_local-engine-shape-sync.md`, `tasks/done/2026-06-22_main-style-right-pet-detail-prompt.md`, `web/assets/reference_main_style_battle_ui_2026-06-22.jpg`, `xlsx/.~lock.ysbzs_master.xlsx#`
