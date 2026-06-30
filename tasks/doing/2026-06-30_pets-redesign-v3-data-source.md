# 2026-06-30_pets-redesign-v3-data-source

task_id: 2026-06-30_pets-redesign-v3-data-source
type: data-pipeline
status: READY_TO_MERGE
owner: Codex
branch: codex/bazaar-day1-day3-route

## Goal

接入 `/Users/ywh/Downloads/ysbzs_master_pets_redesign_v3_19shapes.xlsx` 的宠物重设计数据，替换项目宠物数据源，并更新导出链路/代码测试，让 `npm run data:export` 能生成新的宠物与行动形状 CSV。

## Scope

- 把下载 workbook 中的 `PETS_REDESIGN_V3_19形状` 与 `宠物数值规则_V3` 纳入项目主 workbook。
- 让导出链路以 `PETS_REDESIGN_V3_19形状` 作为宠物主数据覆盖源，生成现有程序 CSV schema。
- 保持品质成长/升阶表沿用当前 `QUALITY_GROWTH` / `QUALITY_UPGRADES`，不改白银/黄金/钻石机制。
- 不碰当前 UI、战斗动画、battle-debug 页面和 `web/js/local-engine.js`。

## related_files

- `xlsx/ysbzs_master.xlsx`
- `tools/export_master_to_csv.py`
- `data/csv/01_pets.csv`
- `data/csv/02_monster_templates.csv`
- `data/csv/03_monster_waves.csv`
- `data/csv/06_shop_rewards.csv`
- `data/csv/08_action_shapes.csv`
- `src/core/buildSummary.cjs`
- `tests/run_all_tests.cjs`
- `tests/csv_source.test.cjs`
- `tests/ui_adapter.test.cjs`
- `tests/unit/daily_flow_battle_first_route.test.cjs`
- `tests/unit/mechanics_feasible.test.cjs`
- `tests/unit/quality_tiers_factory.test.cjs`
- `tasks/doing/2026-06-30_pets-redesign-v3-data-source.md`

## exclusive_files

- `xlsx/ysbzs_master.xlsx`
- `tools/export_master_to_csv.py`
- `data/csv/01_pets.csv`
- `data/csv/02_monster_templates.csv`
- `data/csv/03_monster_waves.csv`
- `data/csv/06_shop_rewards.csv`
- `data/csv/08_action_shapes.csv`
- `src/core/buildSummary.cjs`

## read_files

- `AGENTS.md`
- `docs/02_CURRENT_WORKFLOW.md`
- `docs/00_AI_START_HERE.md`
- `docs/roles/PROGRAMMER_START.md`
- `docs/roles/PLANNER_START.md`
- `tasks/index.md`
- `tasks/README.md`
- `/Users/ywh/Downloads/ysbzs_master_pets_redesign_v3_19shapes.xlsx`
- `xlsx/ysbzs_master.xlsx`
- `src/core/csvData.cjs`
- `src/core/buildSummary.cjs`
- `data/csv/27_shape_catalog.csv`
- `data/csv/28_quality_growth.csv`
- `data/csv/29_quality_upgrades.csv`

## validation

- pass: workbook now has 11 visible planning sheets including `PETS_REDESIGN_V3_19形状` and `宠物数值规则_V3`; no hidden raw CSV sheets are used.
- pass: synced compact `PETS` from redesign data; exported pets=127, pet-shapes=127, shape catalog=19, shape ids only 01-19.
- pass: `python3 -m py_compile tools/export_master_to_csv.py`
- pass: `npm run data:export`
- pass: `npm run data:export:check`
- pass: `node --test tests/csv_source.test.cjs` (10/10)
- pass: `node tools/check_csv_data.cjs`
- pass: `npm run check:csv`
- pass: `node tests/run_all_tests.cjs` (64/64)
- pass: `npm run test:unit` (126/126)
- pass: `node --test tests/ui_adapter.test.cjs` (48/48)
- pass: `git diff --check -- xlsx/ysbzs_master.xlsx tools/export_master_to_csv.py data/csv/01_pets.csv data/csv/02_monster_templates.csv data/csv/03_monster_waves.csv data/csv/06_shop_rewards.csv data/csv/08_action_shapes.csv src/core/buildSummary.cjs tests/run_all_tests.cjs tests/csv_source.test.cjs tests/ui_adapter.test.cjs tests/unit/daily_flow_battle_first_route.test.cjs tests/unit/mechanics_feasible.test.cjs tests/unit/quality_tiers_factory.test.cjs tasks/doing/2026-06-30_pets-redesign-v3-data-source.md`
- pass: `npm run check:all`
- note: `LIVE_4173_NOT_REFRESHED`; this task intentionally did not rebuild `web/js/local-engine.js` or refresh local port 4173 because current UI tasks already own dirty browser/bundle files.

## commit_plan

- message: `data: adopt pets redesign v3 sheet`
- auto_commit: blocked by unrelated dirty UI/core task files and current worktree task overlaps; use precise staging only after those are resolved.

## collaboration

lead_scope: Data workbook, CSV export mapping, and data source tests only.
specialist_input: 无
tester_pass: 无，非 UI/可见改动。
external_ai_input: 无
lead_decision: Use `PETS_REDESIGN_V3_19形状` as the authoritative pet source for generated CSVs, keep current `QUALITY_GROWTH` / `QUALITY_UPGRADES` for 白银/黄金/钻石, and preserve legacy shop/economy role tags while writing the new board role into pet/monster/action-shape tables. Keep the browser bundle untouched because current UI tasks own `web/js/local-engine.js`; report `LIVE_4173_NOT_REFRESHED` for live 4173.
