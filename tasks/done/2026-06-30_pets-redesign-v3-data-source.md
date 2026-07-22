# 2026-06-30_pets-redesign-v3-data-source

task_id: 2026-06-30_pets-redesign-v3-data-source
type: data-pipeline
status: DONE
owner: Codex
branch: codex/bazaar-day1-day3-route
done_at: 2026-07-22

## Goal

接入 `/Users/ywh/Downloads/ysbzs_master_pets_redesign_v3_19shapes.xlsx` 的宠物重设计数据，替换项目宠物数据源，并更新导出链路/代码测试，让 `npm run data:export` 能生成新的宠物与行动形状 CSV。

## Scope

- 把下载 workbook 中的 `PETS_REDESIGN_V3_19形状` 与 `宠物数值规则_V3` 纳入项目主 workbook。
- 让导出链路以 `PETS_REDESIGN_V3_19形状` 作为宠物主数据覆盖源，生成现有程序 CSV schema。
- 保持品质成长/升阶表沿用当前 `QUALITY_GROWTH` / `QUALITY_UPGRADES`，不改白银/黄金/钻石机制。
- 商店价格按公开品质轴写明并导出：青铜=2、白银=4、黄金=6、钻石=8；不得让旧备注/占位值 `44` 进入 `价格覆盖`。
- Day1 默认开局只启用孙悟空携带的一只捣蛋猫；第二只捣蛋猫仅保留为历史测试参考，默认不启用。
- 原导入阶段不碰当前 UI、战斗动画、battle-debug 页面和 `web/js/local-engine.js`；本 follow-up 因用户发现默认本地运行时仍读旧内嵌 CSV，刷新 generated `web/js/local-engine.js`。
- follow-up: 用导入前主 workbook 的 `PETS` 表 127 行基础字段覆盖当前权威宠物基础字段：`name/element/tier/role/hp/atk/shield/action`；保留当前正式 19 形状和机制接入。
- follow-up: 在 `PETS` 和 `PETS_REDESIGN_V3_19形状` 两张宠物源表增加 `effect_score`，填入当前 `01_pets.csv` 的 `效果分`，便于策划直接查看强度分。
- follow-up: `mechanism_id` 不再作为宠物策划表可见字段；两张宠物源表改为 `cell_count`，填入当前行动形状的 `命中格数`。运行时 CSV 继续保留现有 `机制ID`，避免程序机制接入被误删。
- follow-up: 按当前数据源改造测试断言，减少宠物/波次/品质数值变化时需要重写的硬编码快照。
- follow-up: 用户反馈策划总表难用；把 `xlsx/ysbzs_master.xlsx` 收敛成约 6 张可见表：`README`、`PETS`、`WAVES`、`SHOP_ITEMS`、`MECHANICS_QUALITY`、`SHAPES_TRIALS`，并让 exporter 继续无损生成完整程序 CSV。
- follow-up: 用户确认第 7 天试炼以后用控制台处理；从策划总表 `SHAPES_TRIALS` 分区移除 `13_day7_beast_trial.csv`，但保留底层程序 CSV 供控制台/命令链继续读取。
- follow-up: 用户确认 `PETS` 前 7 个宠物是设计基准；本轮按该基准先重平衡后续 5 个宠物 `pal_008`-`pal_012`，保留名字、元素、定位、机制和形状，只修正异常基础数值。
- follow-up: 重新设计前 7 个宠物前，先清空 `pal_001`-`pal_007` 的可见定位，并把机制统一重置为无机制 `none`，形成重新定位的空白底稿。
- follow-up: 按用户确认的策划模型新增“所有商品店表”：宠物/商品行只用逗号字段声明可进入哪些商品店，商品店自身独立成表，一行一个店铺/摊位。
- follow-up: 恢复帕鲁九系 `无/火/水/草/雷/冰/地/暗/龙` 与双属性；现有 `副属` 中的原始属性作为迁移依据，宠物、行动槽、商品行、元素商店和 runtime database 同步生成，不再压缩为火/水/风/土。

## related_files

- `xlsx/ysbzs_master.xlsx`
- `outputs/multi-element-20260721/ysbzs_master.xlsx`
- `tools/export_master_to_csv.py`
- `src/core/csvData.cjs`
- `src/core/data.cjs`
- `data/csv/01_pets.csv`
- `data/csv/02_monster_templates.csv`
- `data/csv/03_monster_waves.csv`
- `data/csv/06_shop_rewards.csv`
- `data/csv/08_action_shapes.csv`
- `data/csv/30_shop_stores.csv`
- `data/csv/04_mechanisms.csv`
- `data/csv/05_events.csv`
- `data/csv/07_relic_blessings.csv`
- `data/csv/19_triggers.csv`
- `data/csv/22_element_conversion_rules.csv`
- `data/csv/25_node_pool.csv`
- `data/csv/10_initial_roster.csv`
- `tools/build_human_master.py`
- `tools/check_csv_data.cjs`
- `src/core/buildSummary.cjs`
- `tests/run_all_tests.cjs`
- `tests/unit/action_slot_element_layers.test.cjs`
- `tests/csv_source.test.cjs`
- `tests/full_coverage.test.cjs`
- `tests/day7_fire_trial.test.cjs`
- `tests/ui_adapter.test.cjs`
- `tests/unit/daily_flow_battle_first_route.test.cjs`
- `tests/unit/mechanics_feasible.test.cjs`
- `tests/unit/quality_tiers_factory.test.cjs`
- `web/js/local-engine.js`
- `tasks/doing/2026-06-30_pets-redesign-v3-data-source.md`

## exclusive_files

- `xlsx/ysbzs_master.xlsx`
- `tools/export_master_to_csv.py`
- `src/core/csvData.cjs`
- `src/core/data.cjs`
- `data/csv/01_pets.csv`
- `data/csv/02_monster_templates.csv`
- `data/csv/03_monster_waves.csv`
- `data/csv/06_shop_rewards.csv`
- `data/csv/08_action_shapes.csv`
- `data/csv/30_shop_stores.csv`
- `data/csv/10_initial_roster.csv`
- `tools/build_human_master.py`
- `tools/check_csv_data.cjs`
- `src/core/buildSummary.cjs`
- `web/js/local-engine.js`

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
- pass follow-up: workbook `宠物数值规则_V3` now records `商店公开价目`: 青铜=2、白银=4、黄金=6、钻石=8.
- pass follow-up: `npm run data:export`; regenerated `data/csv/06_shop_rewards.csv`.
- pass follow-up: price spot check confirms 青铜 rows use `默认价/价格覆盖=2/2`, 白银 rows use `4/4`, 黄金 rows use `6/6`; current 127-pet redesign table has 0 钻石宠物 rows, but the 钻石=8 rule is present in exporter/workbook.
- pass follow-up: `data/csv/10_initial_roster.csv` now enables only slot 1 `pal_002` for Day1; slot 2 `pal_002` is retained as disabled historical reference.
- pass follow-up: `python3 -m py_compile tools/export_master_to_csv.py`
- pass follow-up: `npm run data:export:check`
- pass follow-up: `node --test tests/csv_source.test.cjs` (11/11)
- pass follow-up: `node --test tests/unit/daily_flow_battle_first_route.test.cjs` (13/13)
- pass follow-up: `node tests/run_all_tests.cjs` (64/64)
- pass follow-up: `npm run check:csv`
- pass follow-up: adapter smoke showed leaders `孙悟空/虎先锋` and default heroes `捣蛋猫:青铜`.
- pass follow-up: `git diff --check -- tools/export_master_to_csv.py tests/csv_source.test.cjs tests/unit/daily_flow_battle_first_route.test.cjs data/csv/06_shop_rewards.csv data/csv/10_initial_roster.csv tasks/doing/2026-06-30_pets-redesign-v3-data-source.md`
- blocked follow-up: `npm run check:all` fails in existing unrelated dirty UI runtime task at `tests/unit/singleplayer_runtime.test.cjs:RT02`, asserting `web/js/runtime-client.js` should pass a resolved player id instead of callback function. This file is outside this data task and already dirty before this follow-up.
- pass follow-up: confirmed root cause of visible bad pet data was legacy CSV completion baseline carrying exact placeholder `44` into fields not present in `PETS_REDESIGN_V3_19形状`, not failure to load the redesign pet sheet.
- pass follow-up: exporter now blanks exact legacy placeholder `44` from `01_pets.csv` 副属, `02_monster_templates.csv` 机制参数/克制/推荐日/备注, and `06_shop_rewards.csv` 出现条件/备注 while preserving redesign-provided pet fields.
- pass follow-up: added `CSV02C 宠物重设计导出不保留旧表 44 占位值`.
- pass follow-up: `npm run data:export`
- pass follow-up: placeholder scan confirms `01_pets.csv`, `02_monster_templates.csv`, and `06_shop_rewards.csv` have 0 exact `44` hits in checked fields.
- pass follow-up: `python3 -m py_compile tools/export_master_to_csv.py`
- pass follow-up: `node --test tests/csv_source.test.cjs` (12/12)
- pass follow-up: `npm run data:export:check`
- pass follow-up: `npm run check:csv`
- pass follow-up: `node tests/run_all_tests.cjs` (67/67)
- pass follow-up: `git diff --check -- tools/export_master_to_csv.py tests/csv_source.test.cjs data/csv/01_pets.csv data/csv/02_monster_templates.csv data/csv/06_shop_rewards.csv`
- pass follow-up: restored all 127 pet base fields from pre-redesign `PETS` into `PETS_REDESIGN_V3_19形状` and compact `PETS`; sample rows `pal_001`-`pal_007`, `pal_011`-`pal_015` match the user's pasted table.
- pass follow-up: `npm run data:export`; regenerated `01_pets.csv`, `02_monster_templates.csv`, `03_monster_waves.csv`, `06_shop_rewards.csv`, and `08_action_shapes.csv`.
- pass follow-up: `npm run data:export:check`
- pass follow-up: `node --test tests/csv_source.test.cjs` (12/12)
- pass follow-up: `node tests/run_all_tests.cjs` (67/67)
- pass follow-up: `node --test tests/ui_adapter.test.cjs` (48/48)
- pass follow-up: `npm run check:all`
- pass nine-element follow-up: planner workbook and CSV export now use `无/火/水/草/雷/冰/地/暗/龙`; 127 pets include 23 dual-affinity rows and 37 total stores including nine non-empty element stores.
- pass nine-element follow-up: `npm run data:export`, `npm run data:export:check`, `npm run check:csv`, `node tests/run_all_tests.cjs` (67/67), and `node --test tests/unit/action_slot_element_layers.test.cjs` (3/3).
- pass nine-element follow-up: `node tools/build_local_engine_bundle.cjs` and `npm run check:ui-connected`; live 4173 page shows the migrated neutral starter and three neutral action slots with no browser console errors.
- pass nine-element follow-up: rendered and visually reviewed all seven planner sheets; deliverable copy is `outputs/multi-element-20260721/ysbzs_master.xlsx`.
- blocked nine-element follow-up: full `npm run check:all` reaches unit tests but fails in pre-existing untracked `tests/unit/manual_flow_preview_lethal_diff.test.cjs` (`diff.after.hp` expected 0, actual 6), owned by the separate manual-flow preview task; this data task did not edit that file.
- pass follow-up: workbook `PETS` and `PETS_REDESIGN_V3_19形状` now replace visible `mechanism_id` with `cell_count`; sample rows `pal_001=1`, `pal_005=2`.
- pass follow-up: exporter keeps runtime `机制ID` from baseline CSV when planner sheets no longer expose `mechanism_id`, so mechanism wiring is not erased by the planner-facing column change.
- pass follow-up: `python3 -m py_compile tools/export_master_to_csv.py`
- pass follow-up: `npm run data:export:check`
- pass follow-up: `node --test tests/csv_source.test.cjs` (12/12)
- pass follow-up: `npm run check:csv`
- pass follow-up: `node tools/build_local_engine_bundle.cjs`; bundle-embedded `/data/csv/01_pets.csv` sample rows now match restored base data, so default `runtime=local` no longer carries stale pet basics.
- pass follow-up: `npm run check:ui-connected`
- pass follow-up: workbook `PETS` and `PETS_REDESIGN_V3_19形状` now include `effect_score`; sample rows `pal_001`-`pal_007` show `58, 90, 66, 48, 106, 66, 51`.
- pass follow-up: `npm run data:export:check`
- pass follow-up: `node --test tests/csv_source.test.cjs` (12/12)
- pass follow-up: `npm run check:csv`
- pass follow-up: changed brittle data snapshot tests to assert current CSV/workbook/export/runtime consistency instead of hard-coded row counts, starter wave names, quality stat numbers, and Day7 remaining HP/shield values.
- pass follow-up: `node --test tests/csv_source.test.cjs` (12/12)
- pass follow-up: `node --test tests/full_coverage.test.cjs` (8/8)
- pass follow-up: `node --test tests/day7_fire_trial.test.cjs` (1/1)
- pass follow-up: `node --test tests/unit/daily_flow_battle_first_route.test.cjs` (13/13)
- pass follow-up: `node --test tests/unit/quality_tiers_factory.test.cjs` (3/3)
- pass follow-up: `node tests/run_all_tests.cjs` (67/67)
- pass follow-up: `git diff --check -- tests/csv_source.test.cjs tests/full_coverage.test.cjs tests/day7_fire_trial.test.cjs tests/unit/daily_flow_battle_first_route.test.cjs tests/unit/quality_tiers_factory.test.cjs tasks/doing/2026-06-30_pets-redesign-v3-data-source.md`
- pass follow-up: `npm run check:all`
- pass follow-up: rebuilt `xlsx/ysbzs_master.xlsx` as 6 visible planner sheets: `README`, `PETS`, `WAVES`, `SHOP_ITEMS`, `MECHANICS_QUALITY`, `SHAPES_TRIALS`; removed the separate redesign/rules/quality/shape/trial sheet sprawl from the daily entry workbook.
- pass follow-up: `python3 tools/build_human_master.py`; regenerated the 6-sheet planner master from current CSV truth.
- pass follow-up: `npm run data:export:check`; 6-sheet master still exports losslessly to the current program CSV set.
- pass follow-up: workbook structure spot check confirms visible sheet list is exactly `['README', 'PETS', 'WAVES', 'SHOP_ITEMS', 'MECHANICS_QUALITY', 'SHAPES_TRIALS']`.
- pass follow-up: `npm run check:csv`
- pass follow-up: `node tests/run_all_tests.cjs` (67/67)
- pass follow-up: `npm run check:all`
- pass follow-up: `git diff --check -- tools/build_human_master.py tools/export_master_to_csv.py tests/csv_source.test.cjs tasks/doing/2026-06-30_pets-redesign-v3-data-source.md`
- pass follow-up: removed `13_day7_beast_trial.csv` from the planner-facing `SHAPES_TRIALS` section; workbook spot check confirms `has_day7_section=False`, while `data/csv/13_day7_beast_trial.csv` still exists with 10 lines for console/runtime use.
- pass follow-up: `python3 tools/build_human_master.py`
- pass follow-up: `npm run data:export:check`
- pass follow-up: `node --test tests/csv_source.test.cjs` (12/12)
- pass follow-up: `npm run check:all`
- pass follow-up: `PETS` rows `pal_008`-`pal_012` were rebalanced against the user-approved first seven pet baseline while preserving name/element/tier/role/mechanism/shape.
- pass follow-up: exported runtime rows now show `pal_008=HP24/攻4/盾1/行动3`, `pal_009=HP24/攻5/盾1/行动4`, `pal_010=HP18/攻4/盾0/行动4`, `pal_011=HP24/攻4/盾0/行动3`, `pal_012=HP18/攻3/盾0/行动4`.
- pass follow-up: `npm run data:export`
- pass follow-up: `npm run data:export:check`
- pass follow-up: `npm run check:csv`
- pass follow-up: `node tests/run_all_tests.cjs` (67/67)
- pass follow-up: `node tools/build_local_engine_bundle.cjs`
- pass follow-up: `npm run check:ui-connected`
- pass follow-up: `npm run check:all`
- pass follow-up: `git diff --check -- xlsx/ysbzs_master.xlsx data/csv/01_pets.csv data/csv/02_monster_templates.csv data/csv/03_monster_waves.csv data/csv/06_shop_rewards.csv data/csv/08_action_shapes.csv web/js/local-engine.js tasks/doing/2026-06-30_pets-redesign-v3-data-source.md`
- pass follow-up: `PETS` rows `pal_001`-`pal_007` now have blank `role` and `mechanism_id=none`, ready for redesigning their real positioning from scratch.
- pass follow-up: exporter now treats an explicitly blank `PETS.role` as authoritative instead of backfilling old CSV positioning, and filters old role tags / `role_*` shop pools when role is blank.
- pass follow-up: downstream generated CSV checks confirm first seven rows have blank `定位` / `定位(自动)` in `01_pets.csv`, `02_monster_templates.csv`, `06_shop_rewards.csv`, and `08_action_shapes.csv`; `机制ID` is `none` where present.
- pass follow-up: `python3 -m py_compile tools/export_master_to_csv.py`
- pass follow-up: `npm run data:export`
- pass follow-up: `npm run data:export:check`
- pass follow-up: `npm run check:csv`
- pass follow-up: `node tests/run_all_tests.cjs` (67/67)
- pass follow-up: `node tools/build_local_engine_bundle.cjs`
- pass follow-up: `npm run check:all`

## commit_plan

- message: `data: complete pets redesign v3 source`
- precise staging: only this task's workbook, generated CSV, exporters, data assertions, task-only generated browser bundle, deliverable workbook copy, task card, and index hunk.
- shared dirty files and unrelated untracked tasks remain outside this commit.

## closeout_validation

- PASS: artifact-tool imported and rendered all seven planner sheets (`README`, `PETS`, `SHOP_STORES`, `WAVES`, `SHOP_ITEMS`, `MECHANICS_QUALITY`, `SHAPES_TRIALS`); no formula-error matches.
- PASS: current workspace `npm run data:export:check`, `npm run check:csv`, `node tests/run_all_tests.cjs` (67/67), and `node --test tests/unit/action_slot_element_layers.test.cjs` (3/3).
- PASS: isolated detached worktree containing only this task's files rebuilt `web/js/local-engine.js`, passed `npm run data:export:check`, and passed complete `npm run check:all`.
- NOTE: the shared workspace's complete check still sees the separate untracked `manual_flow_preview_lethal_diff.test.cjs`; isolated verification proves that failure is outside this task boundary.
- RELEASED: all `exclusive_files` listed above are released after this task commit.

## collaboration

lead_scope: Data workbook, CSV export mapping, data source tests, and generated local browser bundle refresh for this follow-up.
specialist_input: 无
tester_pass: 无，非 UI/可见改动。
external_ai_input: 无
lead_decision: Keep the full program CSV surface generated, but reduce the human daily workbook surface to six visible sheets. `PETS` is again the single pet editing table with `mechanism_id`; redesign/rules history is removed from the daily sheet list. Mechanisms and quality data live together in `MECHANICS_QUALITY`, while shape and summon-trial data live together in `SHAPES_TRIALS`; the Day 7 fire trial no longer appears in the planner workbook and stays as a runtime/console CSV. For the pet-stat iteration, treat `pal_001`-`pal_007` as the current design baseline and process later pets in 5-row batches; this batch corrected only `pal_008`-`pal_012` base stats and left identity/mechanic/shape fields intact. For the next design pass, `pal_001`-`pal_007` have been reset to blank positioning plus `none` mechanics so their real特色/定位 can be rebuilt deliberately rather than inherited from old role labels.
