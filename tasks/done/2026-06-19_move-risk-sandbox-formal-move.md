# 2026-06-19_move-risk-sandbox-formal-move

task_id: 2026-06-19_move-risk-sandbox-formal-move
type: combat preview / sandbox authority
status: DONE
owner: Codex
worktree: shared-worktree
done_at: 2026-06-19T15:40:11+0800

## Goal

修正候选落点沙盒模拟链路：沙盒里不能直接改 `unit.position` 来假装玩家移动，必须复用正式玩家移动链路，产生正式 `MOVE_HERO` 事件并更新 `teamPlacementPreview` 后，再计算风险和后续行动沙盒。

## Scope

- `buildMoveRiskGrid` 的每个候选落点沙盒先走正式 `moveHero` 核心函数。
- 沙盒事件保留 `MOVE_HERO`，方便验证和回放。
- 保持玩家真实点击仍通过 `web/js/main.js` 的 `runCommand('MOVE_HERO')`。
- 右侧两个流程按钮新增多步撤回：点击前通过公开 save API 记录快照，撤回时通过 load API 还原。
- 流程按钮执行和撤回后，重新拉取当前选中格子的 `GET_CELL_DETAIL`，避免详情面板停在按钮点击前的旧格子数据。
- 新增后台事务预演：预览数据必须通过正式流程命令链路预先执行两个右侧按钮对应命令，读取两步后的格子/风险数据，再回滚到玩家当前状态。
- 同步 `web/js/local-engine.js`。
- Follow-up：点击敌方宠物或棋盘外时，必须取消当前我方宠物/行动槽选择，避免旧选择继续驱动移动/预览。

## related_files

- `src/core/battle/planning.cjs`
- `src/core/battle.cjs`
- `src/core/commandEnvelope.cjs`
- `src/uiAdapter.cjs`
- `src/uiAdapterCommands.cjs`
- `src/uiAdapterManualFlowPreview.cjs`
- `tests/ui_adapter.test.cjs`
- `tests/unit/manual_flow_undo_contract.test.cjs`
- `tests/unit/singleplayer_runtime.test.cjs`
- `tests/unit/ui_combat_layout_contract.test.cjs`
- `tests/unit/ui_module_render_cache.test.cjs`
- `web/index.html`
- `web/ux-app.css`
- `web/js/main.js`
- `web/ux-app.js`
- `web/js/runtime-client.js`
- `web/js/local-engine.js`
- `tasks/done/2026-06-19_move-risk-sandbox-formal-move.md`
- `tasks/index.md`

## exclusive_files

- `src/core/battle/planning.cjs`
- `src/core/battle.cjs`
- `src/core/commandEnvelope.cjs`
- `src/uiAdapter.cjs`
- `src/uiAdapterCommands.cjs`
- `src/uiAdapterManualFlowPreview.cjs`
- `tests/ui_adapter.test.cjs`
- `tests/unit/manual_flow_undo_contract.test.cjs`
- `tests/unit/singleplayer_runtime.test.cjs`
- `tests/unit/ui_combat_layout_contract.test.cjs`
- `tests/unit/ui_module_render_cache.test.cjs`
- `web/index.html`
- `web/ux-app.css`
- `web/js/main.js`
- `web/ux-app.js`
- `web/js/runtime-client.js`
- `web/js/local-engine.js`

## validation

- RED: `node --test tests/ui_adapter.test.cjs` failed on UI21 because candidate sandbox events did not include `MOVE_HERO`.
- RED: `node --test tests/unit/manual_flow_undo_contract.test.cjs` failed because `#undo-flow-btn` did not exist.
- GREEN: `node --test tests/ui_adapter.test.cjs tests/unit/manual_flow_undo_contract.test.cjs` passed 41/41.
- Static UI regression: `node --test tests/unit/ui_combat_layout_contract.test.cjs tests/unit/ui_module_render_cache.test.cjs tests/unit/manual_flow_undo_contract.test.cjs` passed 22/22.
- Syntax: `node --input-type=module --check < web/js/main.js` and `node --check web/ux-app.js` passed.
- Bundle: `node tools/build_local_engine_bundle.cjs` rebuilt `web/js/local-engine.js`.
- Direct-write cleanup: `rg -n "sandboxUnit\\.position\\s*=|projected_full_slot_threat|projectedEnemyFullSlotRisk|projectedById" src tests web` found no matches.
- Focused regression: `node --test tests/unit/*.test.cjs` passed 72/72.
- Full project test runner: `node tests/run_all_tests.cjs` passed 64/64.
- Browser gate: Playwright local runtime, real buttons only; `START_BATTLE` did not create undo; `END_PLAYER_TURN` advanced v1->v2 and undo restored v1; `START_NEXT_ROUND` advanced v2->v3 and undo restored v2. Screenshot: `output/playwright/manual-flow-undo-2026-06-19.png`.
- Browser gate follow-up: real button sequence `START_BATTLE -> END_PLAYER_TURN -> START_NEXT_ROUND -> undo -> undo`; undo depth changed `0 -> 1 -> 2 -> 1 -> 0`, phase/version restored `player_turn v1 -> round_end v2 -> player_turn v3 -> round_end v2 -> player_turn v1`, and selected R0C0 detail refreshed after each command/undo. Screenshot: `output/playwright/manual-flow-double-undo-detail-refresh-2026-06-19.png`.
- RED: `node --test tests/ui_adapter.test.cjs` failed because `PREVIEW_MANUAL_FLOW` was not a public command.
- GREEN: `PREVIEW_MANUAL_FLOW` now runs the same public manual-flow commands as the right-side buttons, returns projected ViewModel/cells/cellDetails/events, and rolls stateHash/stateVersion back to the pre-preview value.
- UI source: `web/js/main.js` and `web/ux-app.js` refresh `manualFlowPreview` after load, movement/action flow, and undo; incoming team risk reads projected `manualFlowPreview.viewModel` before current `vm.teamRiskGrid`.
- Runtime cleanup: local runtime factory now resolves function-valued `playerId` to `p1` before creating the local engine, preventing function-string player keys in projected ViewModels.
- Follow-up selection cleanup: `CLEAR_SELECTION` is now a public ephemeral selection command; clicking enemy pets or outside the board can clear stale selected pet/slot without mutating core state.
- RED follow-up 2: `node --test tests/ui_adapter.test.cjs` failed because `CLEAR_SELECTION` was not public/known; `node --test tests/unit/ui_module_render_cache.test.cjs` failed because browser click handling had no shared clear-selection path.
- GREEN follow-up 2: `node --test tests/ui_adapter.test.cjs tests/unit/ui_module_render_cache.test.cjs` passed 57/57.
- Full project test runner follow-up 2: `node tests/run_all_tests.cjs` passed 64/64.
- Browser gate follow-up 2: Playwright local runtime on `http://127.0.0.1:4173`, real clicks only; clicked hero cell, clicked enemy pet cell, reselected hero, clicked page outside the board. Enemy click cleared `selected.unitId` while preserving enemy cell/detail (`cellDetail.unit.side=enemy`); outside click cleared `selected.unitId` and `selected.cell`; consoleErrors/pageErrors were empty. Screenshot: `output/playwright/clear-pet-selection-enemy-outside-2026-06-19.png`.
- Main-thread screenshot review follow-up 2: `output/playwright/clear-pet-selection-enemy-outside-2026-06-19.png` shows the detail panel in unselected state after outside click, no obvious overlap/misalignment, and no selected hero highlight.
- Syntax: `node --input-type=module --check < web/js/main.js`, `node --check web/ux-app.js`, and `node --input-type=module --check < web/js/runtime-client.js` passed.
- Focused regression: `node --test tests/ui_adapter.test.cjs` passed 42/42.
- Focused runtime/static: `node --test tests/unit/singleplayer_runtime.test.cjs tests/unit/manual_flow_undo_contract.test.cjs` passed 6/6.
- Focused unit regression: `node --test tests/unit/*.test.cjs` passed 74/74.
- Full project test runner: `node tests/run_all_tests.cjs` passed 64/64 after transaction-preview changes.
- Browser gate: Playwright real page at `http://127.0.0.1:4173/`, clicked `#etb`; current ViewModel stayed `player_turn v1`, projected commands were `END_PLAYER_TURN -> START_NEXT_ROUND`, projected phase/round was `player_turn round 2`, projected cells/details were `64/64`, events included `PLAYER_TURN_END`, projected player keys were only `p1`, console errors `[]`, screenshot `output/playwright/manual-flow-transaction-preview-2026-06-19.png`.
- RED follow-up 3: `node --test tests/unit/manual_flow_undo_contract.test.cjs` failed because `teamRiskForUnit` still fell back to current `cell.teamRisk` when a projected `manualFlowPreview` existed but had no risk for that unit.
- GREEN follow-up 3: `web/js/main.js` and `web/ux-app.js` now treat projected preview as the exclusive risk source while it exists; no fallback to current cell risk in detail or board badge rendering.
- Syntax follow-up 3: `node --input-type=module --check < web/js/main.js`, `node --check web/ux-app.js`, and `node --input-type=module --check < web/js/runtime-client.js` passed.
- Focused regression follow-up 3: `node --test tests/unit/manual_flow_undo_contract.test.cjs` passed 2/2; `node --test tests/ui_adapter.test.cjs` passed 42/42; `node --test tests/unit/*.test.cjs` passed 74/74.
- Full project test runner follow-up 3: `node tests/run_all_tests.cjs` passed 64/64.
- Browser gate follow-up 3: Playwright real page, formal `#day7-btn -> #etb -> click R5C1 火绒狐`; current old risk had 火绒狐 18 but projected two-step risk no longer included 火绒狐, and the visible detail showed no `受击预警` / old 18 damage. Console errors `[]`, screenshot `output/playwright/manual-flow-no-stale-risk-fallback-2026-06-19.png`.
- RED follow-up 4: `node --test tests/ui_adapter.test.cjs` failed on `UI22C` because `PREVIEW_MANUAL_FLOW` consumed the real `nextCommand` counter (`4 !== 3`) even though stateHash/stateVersion rolled back.
- GREEN follow-up 4: `PREVIEW_MANUAL_FLOW` now captures a full snapshot transaction before command-envelope normalization, runs the same public manual-flow commands in `src/uiAdapterManualFlowPreview.cjs`, returns projected ViewModel/cells/cellDetails, and restores `nextCommand`, `commandLog`, events, stateVersion/stateHash, and view selection.
- Display-layer follow-up 4: `web/js/main.js` and `web/ux-app.js` normalize incoming preview data into `cellByKey`, `cellDetailByKey`, and a stable `signature`; render cache keys now use the stable signature instead of raw commandId-bearing preview payloads, while board/detail rendering reads projected risk/detail by coordinate.
- Architecture cleanup follow-up 4: moved manual-flow transaction implementation out of `src/uiAdapter.cjs` into `src/uiAdapterManualFlowPreview.cjs`; `node tools/audit_singleplayer_architecture.cjs` passes `uiAdapter remains under round5 size guard` with `src/uiAdapter.cjs` at 816 lines.
- Bundle follow-up 4: `node tools/build_local_engine_bundle.cjs` rebuilt `web/js/local-engine.js` with 48 modules.
- Syntax follow-up 4: `node --check src/uiAdapter.cjs`, `node --check src/uiAdapterManualFlowPreview.cjs`, `node --check src/core/commandEnvelope.cjs`, `node --input-type=module --check < web/js/main.js`, `node --check web/ux-app.js`, and `node --input-type=module --check < web/js/runtime-client.js` passed.
- Focused regression follow-up 4: `node --test tests/ui_adapter.test.cjs tests/unit/manual_flow_undo_contract.test.cjs tests/unit/singleplayer_runtime.test.cjs tests/unit/ui_module_render_cache.test.cjs` passed 63/63.
- Transaction probe follow-up 4: direct adapter probe after `START_BATTLE -> SELECT_CELL -> PREVIEW_MANUAL_FLOW` reported `beforeNextCommand=3`, `afterNextCommand=3`, `commandLog 1->1`, `events 4->4`, `cells=64`, `details=64`.
- Standard validation follow-up 4: `npm run check:all` passed; `npm run test:coverage` passed 151/151 with coverage report.
- Browser gate follow-up 4: Playwright real page at `http://127.0.0.1:4173/?runtime=local`, no save/import/localStorage injection; clicked `#day7-btn -> #etb -> projected-risk hero cell R6C1`. Projected commands were `START_NEXT_ROUND -> END_PLAYER_TURN`, current stayed `round_end round 1 v2`, projected state was `round_end round 2`, projected cells/details were `64/64`, preview indexes existed, console/page errors were empty, and detail showed `我方融焰娘 受击预警`, 预计伤害 `36`, HP `60→24`. Screenshot: `output/playwright/manual-flow-transaction-snapshot-display-2026-06-19.png`.
- Main-thread screenshot review follow-up 4: `output/playwright/manual-flow-transaction-snapshot-display-2026-06-19.png` shows the right detail panel using projected risk text without obvious overlap, clipping, stale value, or missing board/controls.
- RED follow-up 5: `node --test tests/unit/ui_combat_layout_contract.test.cjs` failed because `threatDetailText({ damage:0, totalDamage:0, threat:9, hits:[] })` rendered `合计0` instead of `合计9`.
- Browser diagnosis follow-up 5: real local page path `START_BATTLE -> click hero R7C2 -> MOVE_HERO to R1C1 -> END_PLAYER_TURN -> click R1C2` showed current `GET_CELL_DETAIL.threat` had `damage:0`, `threat:9`, `totalDamage:9`, but the right panel still rendered the same coordinate from `manualFlowPreview` future detail before the current clicked detail.
- GREEN follow-up 5: `web/js/main.js` and `web/ux-app.js` now keep `currentDetail` separate from projected transaction detail; empty attack threat text uses `threat` when there are no `hits`, and current clicked `threat` wins over projected same-coordinate `threat` while projected team risk remains available.
- Syntax follow-up 5: `node --input-type=module --check < web/js/main.js` and `node --check web/ux-app.js` passed.
- Focused regression follow-up 5: `node --test tests/ui_adapter.test.cjs tests/unit/manual_flow_undo_contract.test.cjs tests/unit/ui_module_render_cache.test.cjs tests/unit/ui_combat_layout_contract.test.cjs` passed 68/68.
- Browser gate follow-up 5: Playwright real page at `http://127.0.0.1:4173/?runtime=local`, no save/import/localStorage injection; clicked `#etb -> R7C2 hero -> R1C1 move -> #etb -> R1C2 empty attack threat`. Current detail had `damage:0`, `threat:9`, and right detail showed `敌方翠叶鼠 3次行动块；合计9`; console/page errors were empty. Screenshot: `output/playwright/empty-threat-detail-uses-threat-9-2026-06-19.png`.
- Main-thread screenshot review follow-up 5: `output/playwright/empty-threat-detail-uses-threat-9-2026-06-19.png` shows the selected empty threat cell and right detail `合计9` without obvious overlap, clipping, stale enemy name, or missing board/controls.
- Standard validation follow-up 5: `npm run check:all` passed; `npm run test:coverage` passed 153/153 with coverage report.

## commit_plan

message: `fix(combat): run manual flow through reversible commands`

## collaboration

lead_scope: 修正落点沙盒模拟的数据来源和事件链路，避免绕开正式玩家移动。
tester_pass: TEST_SUBTHREAD_UNAVAILABLE；主线程执行独立 Playwright tester pass。
latest_bugfix: 用户指出连续点击两个流程按钮后撤回只像能撤一次，并且详情数据取的是旧值；根因是按钮/撤回后未刷新选中格子的 cell detail，而不是 save/load 只能存一层。
current_followup: 用户确认预览应当后台内部走两个按钮的正式函数，获得两步后的全格子数据，然后自动回滚，玩家无感。
current_followup_2: 用户要求点击敌方宠物或者棋盘外时取消当前宠物选择。
current_followup_3: 用户指出预览仍然像没修好；根因是 UI 在 projected preview 缺风险时仍回退到 current cell.teamRisk，导致旧格子数据污染详情/棋盘显示。
current_followup_4: 用户要求优化完整快照事务，并顺带梳理显示层如何接收和处理 projected ViewModel / cell detail 数据。
current_followup_5: 用户指出空格威胁详情显示 `合计0`，但敌方攻击块应显示 9 点威胁伤害；本轮追查 `buildThreatGrid -> GET_CELL_DETAIL -> threatDetailText` 数据链路。
lead_decision: 新增公开只读命令 `PREVIEW_MANUAL_FLOW`，由 adapter 事务执行正式按钮命令并回滚；事务实现拆到 `src/uiAdapterManualFlowPreview.cjs`，UI 只消费返回的 projected ViewModel/cells/cellDetails，并用坐标索引和稳定签名驱动显示层。Follow-up 5 维持核心 `damage=0` 表示空格无受击目标的语义，只修显示层：当前点击格子的 `GET_CELL_DETAIL.threat` 优先于 projected same-coordinate threat，空攻击格无 hits 时展示 `threat` 攻击威胁值。
commit_status: 由 `git-c` 收口提交；最终 commit id 见 git 历史和本轮最终报告。
