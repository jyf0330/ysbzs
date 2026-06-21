# 2026-06-22_master-mechanics-quality-followup

task_id: 2026-06-22_master-mechanics-quality-followup
type: planner-data-runtime-followup
status: DONE
owner: Codex
branch: codex/bazaar-day1-day3-route

## Goal

补齐刚刚策划总表同步后暴露的轻量机制和默认阵容宠物品质接入，不做召唤、自爆、扣线、复活等需要系统级战斗扩展的大机制。

## Scope

- 让总表里的宠物机制进入默认玩家单位；`REVIEW` 只作为待策划占位，不进入运行时机制门禁。
- 实装 `mech_scale_with_allies`，承接 `mech_aura` 的轻量同阵营成长效果。
- 让 `10_initial_roster` 的品质覆盖进入 `createGameState()` 默认队伍，优先处理融焰娘黄金覆盖。
- 如修改总表源数据，保持 `xlsx/ysbzs_master.xlsx`、导出 CSV 和好读 workbook 一致。
- 不实现 `mech_summon_each_round`、`mech_self_destruct`、`mech_death_summon`、`mech_castle_line_damage`、`mech_countdown_pressure` 等重机制。

## related_files

- `tasks/done/2026-06-22_master-mechanics-quality-followup.md`
- `tasks/index.md`
- `docs/10_CHANGELOG.md`
- `xlsx/ysbzs_master.xlsx`
- `xlsx/ysbzs_v1_linked_data_tables.xlsx`
- `data/csv/10_initial_roster.csv`
- `src/core/csvData.cjs`
- `src/core/state.cjs`
- `src/core/mechanics.cjs`
- `tests/csv_source.test.cjs`
- `tests/unit/quality_tiers_factory.test.cjs`
- `tests/unit/mechanics_feasible.test.cjs`
- `tests/unit/singleplayer_round5.test.cjs`
- `tests/ui_adapter.test.cjs`

## exclusive_files

- `tasks/index.md`
- `docs/10_CHANGELOG.md`
- `xlsx/ysbzs_master.xlsx`
- `xlsx/ysbzs_v1_linked_data_tables.xlsx`
- `data/csv/10_initial_roster.csv`
- `src/core/csvData.cjs`
- `src/core/state.cjs`
- `src/core/mechanics.cjs`
- `tests/csv_source.test.cjs`
- `tests/unit/quality_tiers_factory.test.cjs`
- `tests/unit/singleplayer_round5.test.cjs`
- `tests/ui_adapter.test.cjs`

## read_files

- `AGENTS.md`
- `docs/02_CURRENT_WORKFLOW.md`
- `docs/00_AI_START_HERE.md`
- `docs/roles/PROGRAMMER_START.md`
- `docs/roles/PLANNER_START.md`
- `tasks/README.md`
- `tasks/done/2026-06-22_master-quality-shape-sync.md`
- `src/core/csvData.cjs`
- `src/core/state.cjs`
- `src/core/unitFactory.cjs`
- `src/core/mechanics.cjs`
- `data/csv/01_pets.csv`
- `data/csv/10_initial_roster.csv`
- `data/csv/28_quality_growth.csv`
- `data/csv/29_quality_upgrades.csv`

## validation

- `npm run data:export`
- `npm run data:workbook`
- `npm run data:export:check`
- `node --test tests/csv_source.test.cjs tests/unit/quality_tiers_factory.test.cjs tests/unit/mechanics_feasible.test.cjs tests/unit/singleplayer_round5.test.cjs`
- `npm run test:ui`
- `npm run check:all`
- `npm run test:coverage`

## commit_plan

message: `feat: wire master mechanics and roster quality`

## collaboration

lead_scope: 按总表同步后的真实数据补运行时接入和轻量机制。
specialist_input: 无
tester_pass: 不适用，本任务不改浏览器 UI / 棋盘可见交互。
external_ai_input: 无
lead_decision: 仅处理已有核心钩子能承载的机制和默认阵容品质覆盖；召唤/失败/地形/复活等系统级机制保留。

## evidence

- 2026-06-22: 用户纠正范围为刚刚策划总表同步后的机制与宠物品质。
- 2026-06-22: 已接入 `REVIEW -> none`、`mech_aura -> mech_scale_with_allies` 回合开始同阵营成长、`10_initial_roster.csv` 结构化 `品质覆盖`，默认队伍变为融焰娘黄金 + 火绒狐/冲浪鸭/疾风隼白银。
- 2026-06-22: 修正 `makeUnit()` 默认覆盖机制为 `none` 的问题，只有显式 override 才覆盖 mechanics；敌方单位因此会保留宠物主表机制，`tests/ui_adapter.test.cjs` 中非机制 fixture 已显式关闭目标机制。
- 2026-06-22: 验证通过：`npm run data:export && npm run data:workbook && npm run data:export:check`。
- 2026-06-22: 验证通过：`node --test tests/csv_source.test.cjs tests/unit/quality_tiers_factory.test.cjs tests/unit/mechanics_feasible.test.cjs tests/unit/singleplayer_round5.test.cjs`。
- 2026-06-22: 验证通过：`npm run test:ui`。
- 2026-06-22: 验证通过：`npm run check:all`。
- 2026-06-22: 验证通过：`npm run test:coverage`，178/178 pass，all files line coverage 89.08%。
