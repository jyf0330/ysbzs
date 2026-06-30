# 2026-06-30_round-placement-preview-reset

task_id: 2026-06-30_round-placement-preview-reset
type: bugfix
status: READY_TO_MERGE
owner: Codex
branch: codex/bazaar-day1-day3-route

## Goal

修复正常战斗流程里打完一回合后“智能调整站位”不能再用的问题。

## Scope

- 把 `teamPlacementPreview.movedUnitIds` 明确为每回合状态。
- 进入战斗和进入下一回合时清空上一回合移动预览记录。
- 保留同一回合内“已移动/已出手单位不能再次智能调整”的限制。
- 不改正式 UI 按钮结构，不移除未来联机/调试分步命令。

## related_files

- `src/core/battle.cjs`
- `web/js/main.js`
- `web/js/local-engine.js`
- `tests/unit/core_focused_battle.test.cjs`
- `tests/unit/attack_animation_contract.test.cjs`
- `tasks/doing/2026-06-30_round-placement-preview-reset.md`

## exclusive_files

- 无

## read_files

- `docs/02_CURRENT_WORKFLOW.md`
- `tasks/README.md`
- `tasks/index.md`
- `tasks/doing/2026-06-29_auto-enemy-turn-flow.md`
- `src/core/battle/position.cjs`
- `src/core/battle/planning.cjs`
- `web/js/main.js`

## validation

- pass: `node --test tests/unit/core_focused_battle.test.cjs tests/unit/manual_flow_undo_contract.test.cjs tests/unit/ui_module_render_cache.test.cjs`
- pass: `node --test tests/unit/battle_module_split.test.cjs`
- pass: `node tests/run_all_tests.cjs` (64/64)
- pass: `node tools/build_local_engine_bundle.cjs`
- pass within `npm run check:all`: npm test stages, `test:unit` 126/126, `test:ui` 48/48, `test:full`, `test:ops`, `test:prediction`, and `check:architecture`.
- blocked: `npm run check:all` fails at existing CSV08 workbook validation because `xlsx/ysbzs_master.xlsx` is missing CSV source sheets such as `00_maintenance_guide.csv`, `05_events.csv`, `07_relic_blessings.csv`, `09_cross_validation.csv`, `10_initial_roster.csv`, `11_hero_domains.csv`, `12_element_reactions.csv`, `14_quality_multipliers.csv`, `15_summon_trial_questions.csv`, `16_trial_action_plan.csv`, `17_trial_victory_rules.csv`, `18_effect_objects.csv`, `19_triggers.csv`, `20_modifiers.csv`, `21_element_packet_rules.csv`, `22_element_conversion_rules.csv`, `23_trigger_order_rules.csv`, `24_node_schedule.csv`, `25_node_pool.csv`, and `26_encounter_pool.csv`.
- pass: `node --test tests/unit/core_focused_battle.test.cjs tests/unit/attack_animation_contract.test.cjs tests/unit/manual_flow_undo_contract.test.cjs tests/unit/ui_module_render_cache.test.cjs`
- pass: `node --input-type=module --check < web/js/main.js`
- pass: `node tools/build_local_engine_bundle.cjs`
- pass: 4173-style formal browser flow on `http://127.0.0.1:4198/?runtime=http&sessionId=round-placement-reset-final-1782755585456`: clicked `备战` -> `准备开始` -> `智能调整站位` -> `我方全部出击`; final ViewModel `phase=player_turn`, `round=2`, `teamPlacementPreview.movedUnitIds=[]`; both normal combat buttons were enabled (`autoDisabled=false`, `allOutDisabled=false`); hero action slots reset to `used=false`, `canUse=true`; console/page errors 0.
- screenshot reviewed by Lead: `/Users/ywh/Documents/ysbzs/output/playwright/round-placement-reset-final.png`; right-side normal combat buttons are visible and enabled in round 2, with no obvious overlap or missing state.
- deployed: `bash deploy/deploy.sh`; PM2 `ysbzs-ui` restarted; server health returned `{ ok: true, status: "ok" }`.
- pass public check: `curl -I http://124.222.83.113/ysbzs/` returned HTTP 200; `curl http://124.222.83.113/ysbzs-api/health` returned ok.

## commit_plan

- message: `fix(combat): reset placement preview each round`
- auto_commit: blocked by existing CSV08 workbook failure and git-c grouping conflict: shared UI files contain overlapping uncommitted work from auto-enemy-turn-flow / attack-animation plus separate debug-page task files.

## collaboration

- lead_scope: Core round-state reset for team placement preview.
- specialist_input: 无
- tester_pass: 4173-style real browser pass through official visible buttons; screenshot `/Users/ywh/Documents/ysbzs/output/playwright/round-placement-reset-final.png`; console/page errors 0.
- external_ai_input: 无
- lead_decision: Reset placement preview at battle start and next-round start so the UI and smart-position planner do not inherit last round's moved-unit list. Combat FX now runs in the background instead of keeping `ui.busy` true, so buttons recover as soon as the next player turn state arrives.
