# 2026-06-28_replay-command-stream

task_id: 2026-06-28_replay-command-stream
type: feature
status: BLOCKED
owner: Codex
branch: codex/bazaar-day1-day3-route

## Goal

把现有 replay 从“事件导出/展示”升级为可重演的小文件协议：记录初始条件、玩家命令流、每步 hash 校验，并提供重建验证入口。

## Scope

- 设计 `ysbzs.replay` 文档格式，保留人类可读 JSON。
- 命令提交时保存可重演 command payload，而不是只保存摘要。
- `EXPORT_REPLAY` 输出初始选项、命令流、checkpoint、最终摘要和校验。
- 增加 replay 重建/校验 helper 和单元测试，证明从 command stream 可以重建相同 `stateHash`。
- 合并 replay / timing / browser evidence 的方向，先把 replay 层优化成 `debugTimeline` 底座：accepted/rejected 命令统一记录 before/after version/hash、eventIds 和 error code；rejected 命令不进入 deterministic command stream。
- 不改 UI 外观，不新增可见页面。

## related_files

- `src/core/commandEnvelope.cjs`
- `src/core/changeLog.cjs`
- `src/core/replayCodec.cjs`
- `src/uiAdapter.cjs`
- `web/js/local-engine.js`
- `docs/10_CHANGELOG.md`
- `tests/unit/replay_command_stream.test.cjs`
- `tasks/doing/2026-06-28_replay-command-stream.md`
- `tasks/index.md`

## exclusive_files

- `src/uiAdapter.cjs`
- `tasks/index.md`

## read_files

- `docs/00_AI_START_HERE.md`
- `docs/02_CURRENT_WORKFLOW.md`
- `docs/roles/PROGRAMMER_START.md`
- `docs/roles/PLANNER_START.md`
- `src/storage/saveCodec.cjs`
- `src/core/state.cjs`
- `src/core/stateHash.cjs`
- `tests/full_player_operations.test.cjs`
- `tests/ui_adapter.test.cjs`
- `tests/unit/singleplayer_round5.test.cjs`

## validation

- pass: `node --test tests/unit/replay_command_stream.test.cjs`
- pass: `node tests/run_all_tests.cjs`
- pass: `node tools/build_local_engine_bundle.cjs`
- pass within `npm run check:all`: `npm test`, `npm run check:architecture`
- pass: `npm run check:dom`
- pass: `npm run check:ui-connected`
- pass: `npm run check:jsdoc`
- pass after debugTimeline optimization: `node --test tests/unit/replay_command_stream.test.cjs`
- pass after debugTimeline optimization: `npm run test:unit && node --test tests/ui_adapter.test.cjs`
- pass after bundle refresh: `node tools/build_local_engine_bundle.cjs && npm run check:ui-connected`
- pass after debugTimeline optimization: `node tests/run_all_tests.cjs && npm run check:dom`
- pass after debugTimeline optimization: `npm run check:jsdoc`
- blocked: `npm run check:all` reached `check:csv` and failed in existing workbook validation `CSV08 策划总表可无损导出全部程序 CSV` because `xlsx/ysbzs_master.xlsx` is currently missing CSV source sheets such as `00_maintenance_guide.csv`, `05_events.csv`, `07_relic_blessings.csv`, `09_cross_validation.csv`, `10_initial_roster.csv`, `11_hero_domains.csv`, `12_element_reactions.csv`, `14_quality_multipliers.csv`, `15_summon_trial_questions.csv`, `16_trial_action_plan.csv`, `17_trial_victory_rules.csv`, `18_effect_objects.csv`, `19_triggers.csv`, `20_modifiers.csv`, `21_element_packet_rules.csv`, `22_element_conversion_rules.csv`, `23_trigger_order_rules.csv`, `24_node_schedule.csv`, `25_node_pool.csv`, and `26_encounter_pool.csv`. This workbook file was dirty before the replay task and is outside replay scope.
- blocked: `npm run test:coverage` fails at the same `tests/csv_source.test.cjs:124` CSV08 workbook export check; other tests in the coverage run reported 201/202 pass.

## commit_plan

- message: `feat: add deterministic replay command stream`
- auto_commit: blocked by unrelated dirty files and workbook CSV08 failure outside this task; output Commit Plan instead of committing

## collaboration

lead_scope: replay protocol, command logging, replay rebuild tests
specialist_input: 无
tester_pass: 无，非 UI/可见改动；以 reducer/adapter 单元重演和 hash 校验为准
external_ai_input: 无
lead_decision: 已实现 command stream replay，记录 initial options、公开命令、selection 兼容输入、每步 checkpoint hash，并提供重建校验 helper；本轮继续把记录点收敛到 `recordReplayResult()`，让 replay 文档拥有 current `replayVersion`、显式 `legacyReplayVersion`、`debugTimeline`、summary 和 rejected-command 记录。不把中文战报或 DOM 状态作为 replay 真相源。提交前仍被现有 workbook 校验失败和 unrelated dirty files 阻断。
