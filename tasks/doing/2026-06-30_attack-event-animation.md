# 2026-06-30_attack-event-animation

task_id: 2026-06-30_attack-event-animation
type: ui-feedback
status: READY_TO_MERGE
owner: Codex
branch: codex/bazaar-day1-day3-route

## Goal

给正式战斗 UI 增加轻量攻击动画反馈：我方和敌方行动结算后，根据公开战斗事件播放出手、高亮命中、飘伤害数字和 KO 提示，避免画面看起来“秒结算”。

## Scope

- 只改浏览器 UI 表现层，不改核心战斗结算、不直接操作核心 state。
- 动画来源只读 `/api/action` 返回的公开事件：`PLAYER_SELECT_SLOT`、`ENEMY_PET_ACTION`、`DAMAGE`、`UNIT_DEAD`。
- 正式按钮链路保持不变：智能调整站位、我方全部出击、敌方自动推进仍走现有公开命令。
- 尊重 `prefers-reduced-motion`，低动效环境下跳过非必要动画。
- 战斗核心可以立即返回结算后的 ViewModel，但正式 UI 不得在事件动画播放完前把 `battle_end` 结果/奖励面板直接展示给玩家；需要先播放完整伤害/KO 动画，再显示战斗结果。
- 本任务由用户在前一轮 `FILE_CONFLICT_STOP` 报告后明确回复“弄吧”授权继续，但仍记录与 `2026-06-29_auto-enemy-turn-flow` 的同文件重叠，完成后不自动提交。

## related_files

- `web/js/main.js`
- `web/ux-app.css`
- `tests/unit/attack_animation_contract.test.cjs`
- `tasks/doing/2026-06-30_attack-event-animation.md`

## exclusive_files

- `web/js/main.js`
- `web/ux-app.css`
- `tests/unit/attack_animation_contract.test.cjs`

## read_files

- `AGENTS.md`
- `docs/02_CURRENT_WORKFLOW.md`
- `docs/00_AI_START_HERE.md`
- `docs/roles/UI_UX_START.md`
- `tasks/index.md`
- `tasks/README.md`
- `tasks/doing/2026-06-29_auto-enemy-turn-flow.md`
- `src/core/events.cjs`
- `src/core/battle/actions.cjs`
- `src/core/battle.cjs`
- `web/js/main.js`
- `web/ux-app.css`

## validation

- pass: `node --input-type=module --check < web/js/main.js`
- pass: `node --test tests/unit/attack_animation_contract.test.cjs`
- pass: `node --test tests/unit/manual_flow_undo_contract.test.cjs`
- pass: `git diff --check -- web/js/main.js web/ux-app.css tests/unit/attack_animation_contract.test.cjs tasks/doing/2026-06-30_attack-event-animation.md`
- pass: `node tests/run_all_tests.cjs` (64/64)
- pass: `node tools/build_local_engine_bundle.cjs`
- pass: 4173 real browser flow through formal player buttons at `http://127.0.0.1:4173/?runtime=http&sessionId=attack-animation-damage-1782754929926`: clicked `#prep-open-btn`, `#prep-ready-btn`, `#auto-position-btn`, then `#all-out-btn`; observed `.combat-damage-pop` visible with text `-3`, animation class count `2`, ViewModel had `damageEvents=7`, final `phase=battle_end`, `round=1`, console errors/page errors = 0.
- screenshot reviewed by Lead: `/Users/ywh/Documents/ysbzs/output/playwright/attack-animation-damage-4173-2026-06-29T17-42-09-512Z.png`; visible `-3` damage pop appears over the right side of the board, no obvious overlap/missing state; final still screenshot `/Users/ywh/Documents/ysbzs/output/playwright/attack-animation-damage-final-4173-2026-06-29T17-42-09-512Z.png`.
- diagnostic pass: no-auto-position default flow reaches round 2 with no `DAMAGE` events in the first all-out, so no damage pop is expected in that path.
- RED confirmed for result reveal delay: `node --test tests/unit/attack_animation_contract.test.cjs` failed before implementation because `COMBAT_FX_SETTLE_MS` / delayed battle-result reveal helpers were absent.
- pass: `node --test tests/unit/attack_animation_contract.test.cjs`
- pass: `node --input-type=module --check < web/js/main.js`
- pass: `git diff --check -- web/js/main.js tests/unit/attack_animation_contract.test.cjs tasks/doing/2026-06-30_attack-event-animation.md`
- pass: `node --test tests/unit/manual_flow_undo_contract.test.cjs`
- pass: `node tests/run_all_tests.cjs` (67/67)
- pass: 4173 formal page + public command dispatch at `http://127.0.0.1:4173/?runtime=http&sessionId=combat-result-delay-dispatch-1783002508012`: clicked `#prep-open-btn`, `#prep-ready-btn`, then dispatched public `RUN_BATTLE` through the page command entry. During combat animation, sampled ViewModel/DOM stayed `phase=player_turn`, `#operation-hint` did not contain battle-end text, reward text was empty, `#shop-btn` and `#reward-btn` stayed disabled, and `.combat-damage-pop` showed `-45`; after animation settled, ViewModel became `phase=battle_end`, hint became `战斗结束，可以生成奖励或进入商店。`, shop/reward buttons enabled, console errors/page errors = 0.
- screenshot reviewed by Lead: `/Users/ywh/Documents/ysbzs/output/playwright/combat-result-delay-dispatch-1783002508012-mid-animation.png` shows no battle result/reward panel during animation gate; `/Users/ywh/Documents/ysbzs/output/playwright/combat-result-delay-dispatch-1783002508012-final-result.png` shows battle-end state after reveal with no obvious overlap/missing state.
- note: `node tools/build_local_engine_bundle.cjs` was not run in this follow-up because the worktree currently contains unrelated dirty core combat files from `2026-07-02_party-wipe-hero-hp`; rebuilding `web/js/local-engine.js` would absorb out-of-scope core changes into the generated bundle.
- blocked: `npm run check:all` passes npm test stages, `test:unit` 126/126, `test:ui` 48/48, `test:full`, `test:ops`, `test:prediction`, and `check:architecture`, then fails in existing CSV08 workbook validation because `xlsx/ysbzs_master.xlsx` is missing CSV source sheets such as `00_maintenance_guide.csv`, `05_events.csv`, `07_relic_blessings.csv`, `09_cross_validation.csv`, `10_initial_roster.csv`, `11_hero_domains.csv`, `12_element_reactions.csv`, `14_quality_multipliers.csv`, `15_summon_trial_questions.csv`, `16_trial_action_plan.csv`, `17_trial_victory_rules.csv`, `18_effect_objects.csv`, `19_triggers.csv`, `20_modifiers.csv`, `21_element_packet_rules.csv`, `22_element_conversion_rules.csv`, `23_trigger_order_rules.csv`, `24_node_schedule.csv`, `25_node_pool.csv`, and `26_encounter_pool.csv`. This is outside the attack animation scope and matches existing blocked tasks.

## commit_plan

- message: `feat(ui): animate combat event feedback`
- auto_commit: blocked by same-file overlap with existing READY_TO_MERGE `2026-06-29_auto-enemy-turn-flow` changes, adjacent dirty `2026-06-30_round-placement-preview-reset` generated bundle changes, and existing repo-wide CSV08 workbook blocker; output Commit Plan instead of committing.

## collaboration

- lead_scope: Browser combat feedback animation only.
- specialist_input: 无
- tester_pass: 4173 real browser pass through official buttons; screenshot `/Users/ywh/Documents/ysbzs/output/playwright/attack-animation-damage-4173-2026-06-29T17-42-09-512Z.png`; `fxText=-3`; DOM/ViewModel assertions matched; console/page errors 0.
- tester_pass follow-up: TEST_SUBTHREAD_UNAVAILABLE; Lead ran an independent 4173 tester pass on the formal page. Official buttons opened prep and started battle, then a public page command dispatch `RUN_BATTLE` simulated the core returning a final battle result. Mid-animation screenshot `/Users/ywh/Documents/ysbzs/output/playwright/combat-result-delay-dispatch-1783002508012-mid-animation.png`; final reveal screenshot `/Users/ywh/Documents/ysbzs/output/playwright/combat-result-delay-dispatch-1783002508012-final-result.png`; DOM/ViewModel assertions matched; console/page errors 0.
- external_ai_input: 无
- lead_decision: Use public action events as animation input and keep the reducer/core unaware of DOM animation. Damage/KO animation falls back to public hit cells when the final ViewModel no longer contains a dead target on the board. When the core returns `battle_end` with combat FX events, the UI now temporarily renders the pre-result ViewModel, waits for the animation and settle window, then renders the final battle result.
