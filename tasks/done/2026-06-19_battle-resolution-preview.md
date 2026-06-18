# 2026-06-19_battle-resolution-preview

task_id: 2026-06-19_battle-resolution-preview
type: combat core / board preview / UI data
status: DONE

## Goal

修正战斗预览语义，并补齐玩家手动流程里的智能站位辅助：

- `previewGrid` 必须表示即将发生的结算结果，而不是只显示当前/默认单个行动槽。
- 玩家应能同时看到我方未使用行动槽对敌方的预计伤害，以及敌方意图对我方的预计伤害。
- 页面按钮文案要区分“结算并执行敌方宠物行动”和“进入下一回合（Boss召唤）”。
- 新增按钮：把还没移动且未锁定的我方宠物按推荐位置移动到更合适的位置，以最大化预计伤害。

## Scope

- `previewGrid` 汇总当前预览主体所有未使用且可用的行动槽。
- 保留选中行动槽 + 瞄准格语义：选中槽时只约束当前被瞄准的槽，不影响其他未使用槽继续进入结算预览。
- 保持敌方对我方伤害预览继续来自 `teamRiskGrid` / `threatGrid`。
- 新增智能站位命令只移动单位，不自动施放行动槽。
- 智能站位只移动本回合还未移动、未攻击/未锁定且有可用行动槽的我方宠物。
- 不把 UI 层变成规则计算层；UI 只发命令并读 ViewModel。
- 补核心/adapter 回归测试和正式浏览器验收。

## related_files

- `src/core/battle.cjs`
- `src/core/battle/planning.cjs`
- `src/core/battle/preview.cjs`
- `src/core/reducer.cjs`
- `src/core/commandEnvelope.cjs`
- `src/uiAdapter.cjs`
- `src/uiAdapterCommands.cjs`
- `tests/ui_adapter.test.cjs`
- `web/index.html`
- `web/js/main.js`
- `web/ux-app.js`
- `web/js/local-engine.js`
- `docs/10_CHANGELOG.md`
- `tasks/index.md`
- `tasks/doing/2026-06-19_battle-resolution-preview.md`
- `output/playwright/battle-resolution-preview-2026-06-19.png`
- `output/playwright/rename-turn-buttons-2026-06-19.png`
- `output/playwright/rename-turn-buttons-round-end-2026-06-19.png`
- `output/playwright/auto-position-heroes-2026-06-19.png`

## validation

- RED/GREEN: `node --test tests/ui_adapter.test.cjs`
- Bundle: `node tools/build_local_engine_bundle.cjs`
- Full check: `npm run check:all`
- Formal UI gate on `http://127.0.0.1:4173/index.html?runtime=local`: real click flow uses the new smart-position button and confirms board/unit state, labels, console, and screenshot.

## commit_plan

message: `fix(combat): preview resolution and smart positioning`

## collaboration

lead_scope: 合并战斗结算预览、回合按钮文案、智能站位按钮，并完成正式浏览器可见验收。
specialist_input: 无
tester_pass: TEST_SUBTHREAD_UNAVAILABLE；当前可用子线程工具要求用户明确授权，本次改用主线程独立 Playwright 真实浏览器验收并记录截图。
external_ai_input: 无
lead_decision: 通过。截图复核确认右侧按钮状态、棋盘移动结果、日志和回合按钮文案可见效果正确。

## verification_results

- Existing preview work had already recorded RED/GREEN for `UI17B` and browser evidence; continuing from its uncommitted diff.
- Rename-button browser evidence already recorded:
  - `output/playwright/rename-turn-buttons-2026-06-19.png`
  - `output/playwright/rename-turn-buttons-round-end-2026-06-19.png`
- RED: `node --test tests/ui_adapter.test.cjs` initially failed because `AUTO_POSITION_HEROES` was not in `PUBLIC_COMMANDS` and reducer rejected the command.
- GREEN: `node --test tests/ui_adapter.test.cjs` passed 38/38, including `UI03C 智能调整站位只移动未移动宠物并提升预计伤害`.
- Guard: `wc -l src/core/battle.cjs && node --test tests/unit/battle_module_split.test.cjs` passed with `src/core/battle.cjs` at 518 lines.
- Bundle: `node tools/build_local_engine_bundle.cjs` rebuilt `web/js/local-engine.js`.
- Full check: `npm run check:all` passed.
- Formal UI gate: Playwright real-click flow on `http://127.0.0.1:4173/index.html?runtime=local&codexAutoPosition=20260619` clicked `新开一天` -> `开始战斗` -> `智能调整站位`, confirmed `AUTO_POSITION_HEROES` event, moved 4 hero units, remained in `player_turn`, console/page errors 0.
- Screenshot: `output/playwright/auto-position-heroes-2026-06-19.png`
- Main-thread screenshot review: button placement and disabled state look correct; board shows recommended moved units; log records MOVE_HERO entries; no obvious overlap/missing UI.

## merge_notes

- Merged paused task `2026-06-19_rename-turn-buttons` into this ACTIVE task after user confirmed “改吧”.
- The previous `tasks/done/2026-06-19_battle-resolution-preview.md` represented uncommitted work and has been restored to ACTIVE for this combined scope.

## commit_status

- ready for precise staging; unrelated worktree changes exist and must not be staged.
