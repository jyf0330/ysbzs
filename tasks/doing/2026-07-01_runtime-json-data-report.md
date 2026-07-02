# 2026-07-01_runtime-json-data-report

task_id: 2026-07-01_runtime-json-data-report
type: data-tooling
status: READY_TO_MERGE
owner: Codex
branch: codex/bazaar-day1-day3-route

## Goal

建立新的数据构建与审核产物：生成运行时 `game_data.json` 和规范化 SQLite 数据库，并生成可浏览的 HTML / 手机数据审核页，覆盖当前已接入表，同时把 JSON / YAML / CSV / workbook 来源区分清楚。

## Scope

- 新增构建工具，默认从 `xlsx/ysbzs_master.xlsx` 生成 `data/runtime/game_data.json`，不写入持久化中间 CSV。
- 保留 CSV 兼容模式 `npm run data:runtime:csv` 作为对照；当前 `data/csv/` 仍作为薄总表补全程序列的兼容基线。
- 新增 `reports/data/index.html`，用 HTML 表格审核当前所有 normalized runtime 表。
- 新增手机优先数据浏览页 `mobile.html`，用卡片/抽屉方式浏览全部数据，避免手机横向看大表。
- 同步生成公网静态副本到 `web/data/`，使云服务器 `/ysbzs/data/` 可直接访问审核页和手机页。
- 新增 SQLite 数据库 `data/runtime/ysbzs.db`，按“一个字段只维护一个主表，其他表引用 ID”的口径生成规范化表。
- 新增数据库快照 `data/runtime/database.json`，作为静态手机版读取数据库内容的轻量索引。
- 新增手机优先数据库浏览页 `database-mobile.html`，从数据库快照展示表、字段、引用和行数据，并提供 SQLite 下载入口。
- 报告中展示源文件清单，并按 `xlsx` / `csv` / `json` / `yaml` 分类。
- 不改当前游戏加载链路，不切换 core/UI runtime loader，不刷新 `web/js/local-engine.js`。
- 不更新 `tasks/index.md`，因为当前被 replay 任务独占。

## related_files

- `tools/build_runtime_data_report.cjs`
- `data/runtime/game_data.json`
- `reports/data/index.html`
- `reports/data/mobile.html`
- `web/data/index.html`
- `web/data/mobile.html`
- `web/data/game_data.json`
- `data/runtime/ysbzs.db`
- `data/runtime/database.json`
- `web/data/ysbzs.db`
- `web/data/database.json`
- `web/data/database-mobile.html`
- `reports/data/database-mobile.html`
- `output/playwright/runtime-data-report.png`
- `output/playwright/runtime-data-mobile.png`
- `output/playwright/runtime-database-mobile.png`
- `output/playwright/runtime-database-mobile-cloud.png`
- `tests/unit/runtime_data_report.test.cjs`
- `tests/unit/runtime_database.test.cjs`
- `package.json`
- `tools/build_runtime_database.cjs`
- `tasks/doing/2026-07-01_runtime-json-data-report.md`

## exclusive_files

- 无

## read_files

- `AGENTS.md`
- `docs/02_CURRENT_WORKFLOW.md`
- `docs/00_AI_START_HERE.md`
- `docs/roles/PROGRAMMER_START.md`
- `docs/roles/PLANNER_START.md`
- `tasks/index.md`
- `tasks/README.md`
- `src/core/csvData.cjs`
- `src/core/data.cjs`
- `tools/check_csv_data.cjs`
- `package.json`
- `data/csv/`
- `data/unconnected/`

## validation

- pass: `npm run data:runtime`; generated `data/runtime/game_data.json` and `reports/data/index.html` from workbook mode.
- pass: default runtime JSON source is `workbook`: `source.runtime.mode=workbook`, `data.meta.sourcePackage=xlsx/ysbzs_master.xlsx`, `persistedIntermediate=false`; no temporary directory path is written into JSON/HTML.
- pass: CSV compatibility mode remains test-covered through `buildRuntimeDataReport({ sourceMode: 'csv' })`, and workbook mode row counts match CSV mode for all 28 normalized tables.
- pass: generated runtime payload covers 28 normalized tables, including pets=127, monsters=34, waves=134, mechanisms=61, shop=127, shopStores=32, shapes=127, nodeSchedule=60, nodePool=65, encounterPool=40.
- pass: source inventory distinguishes formats: xlsx=3, csv=33, json=4, yaml=4, md=3.
- pass: runtime JSON now includes `source.csvRows` for all workbook-derived CSV field/value auditing: 1074 rows, including auxiliary tables `27_shape_catalog.csv`=19, `28_quality_growth.csv`=12, `29_quality_upgrades.csv`=68.
- pass: runtime JSON now includes `source.contentRows` for source config auditing: 919 JSON/YAML field-value rows, split as json=105 and yaml=814.
- pass: runtime data validation has 0 errors; current warnings are 4 high pet score rows (`pal_090`, `pal_114`, `pal_123`, `pal_124`) for design review.
- pass: `node --test tests/unit/runtime_data_report.test.cjs` (3/3).
- pass: `node tools/check_csv_data.cjs`.
- pass: `git diff --check -- tools/build_runtime_data_report.cjs tests/unit/runtime_data_report.test.cjs package.json tasks/doing/2026-07-01_runtime-json-data-report.md data/runtime/game_data.json reports/data/index.html`.
- pass: `npm run check:all`.
- pass: static browser check opened `reports/data/index.html`, found title `元素背包史数据审核`, 32 nav buttons, default exception table rows=4, CSV source and JSON/YAML labels present; screenshot `output/playwright/runtime-data-report.png`.
- pass: updated static browser check opened `CSV/总表派生表`, filtered XLSX-derived rows and searched `27_shape_catalog.csv`; 19 rows showed workbook-derived field/value data.
- pass: updated static browser check opened the `JSON/YAML配置内容` view, filtered YAML and searched `spawn_position_rules.default_enemy_spawn.mode`; one row showed value `top_right_expand`, summary includes `运行源 workbook`, nav buttons=32, console/page errors=0; screenshot refreshed at `output/playwright/runtime-data-report.png`.
- pass: generated mobile-first data browser at `reports/data/mobile.html` and public static copy `web/data/mobile.html`.
- pass: generated public static data artifacts `web/data/game_data.json` and `web/data/index.html` for deployment under `/ysbzs/data/`.
- pass: mobile browser check opened `web/data/mobile.html` at 390x844 viewport, filtered `CSV/总表派生表` for `27_shape_catalog.csv` and found 19 cards, filtered `JSON/YAML配置内容` for `spawn_position_rules.default_enemy_spawn.mode` and found `top_right_expand`, expanded `完整字段`, console/page errors=0; screenshot `output/playwright/runtime-data-mobile.png`.
- pass: deployed with `bash deploy/deploy.sh`; PM2 `ysbzs-ui` restarted online and deploy health check returned `{"ok":true,"status":"ok"}`.
- pass: public static checks returned HTTP 200 for `http://124.222.83.113/ysbzs/data/mobile.html` and `http://124.222.83.113/ysbzs/data/index.html`.
- pass: public runtime JSON check returned `tables=29`, `mode=workbook`, `csvRows=1074`, `contentRows=919` from `http://124.222.83.113/ysbzs/data/game_data.json`.
- pass: public mobile browser check opened `http://124.222.83.113/ysbzs/data/mobile.html` at 390x844 viewport, filtered `CSV/总表派生表` for `27_shape_catalog.csv` and found 19 cards, filtered `JSON/YAML配置内容` for `spawn_position_rules.default_enemy_spawn.mode` and found `top_right_expand`, expanded `完整字段`, console/page errors=0; screenshot `output/playwright/runtime-data-mobile-cloud.png`.
- pass: `npm run data:db`; generated SQLite database `data/runtime/ysbzs.db`, database snapshot `data/runtime/database.json`, mobile database page `reports/data/database-mobile.html`, and public copies under `web/data/`.
- pass: runtime database contains 31 tables and 6558 rows; key counts are `units=127`, `stat_profiles=161` (127 base pet + 34 monster template profiles), `wave_rounds=134`, `shop_items=127`, `field_catalog=220`.
- pass: SQLite query confirmed `wave_rounds` columns use `primary_unit_id` and do not contain repeated `name`, `hp`, or `atk` fields.
- pass: `field_catalog` records references including `shop_items.ref_id -> units`, `wave_rounds.primary_unit_id -> units`, `stat_profiles.unit_id -> units`, and `unit_mechanics.mechanism_id -> mechanisms`.
- pass: `node --test tests/unit/runtime_data_report.test.cjs tests/unit/runtime_database.test.cjs` (5/5).
- pass: database mobile browser check opened `web/data/database-mobile.html` at 390x844 viewport, searched `units` for `棉悠悠`, checked `wave_rounds` data rows use `primary_unit_id` without `hp/atk`, checked reference-field mode shows `primary_unit_id`, console/page errors=0; screenshot `output/playwright/runtime-database-mobile.png`.
- pass: `git diff --check -- tools/build_runtime_database.cjs tests/unit/runtime_database.test.cjs package.json tasks/doing/2026-07-01_runtime-json-data-report.md data/runtime/database.json data/runtime/ysbzs.db web/data/database.json web/data/database-mobile.html web/data/ysbzs.db`.
- pass: `npm run check:all`.
- pass: redeployed with `bash deploy/deploy.sh`; PM2 `ysbzs-ui` restarted online and deploy health check returned `{"ok":true,"status":"ok"}`.
- pass: public database static checks returned HTTP 200 for `http://124.222.83.113/ysbzs/data/database-mobile.html` and `http://124.222.83.113/ysbzs/data/ysbzs.db`.
- pass: public database JSON check returned `schema=ysbzs.runtime-database.v1`, `tables=31`, `units=127`, `statProfiles=161`, `waveRounds=134`, `shopItems=127`, `download=ysbzs.db`.
- pass: public mobile database browser check opened `http://124.222.83.113/ysbzs/data/database-mobile.html` at 390x844 viewport, searched `units` for `棉悠悠`, checked `wave_rounds` data rows use `primary_unit_id` without `hp/atk`, checked reference-field mode shows `primary_unit_id`, console/page errors=0; screenshot `output/playwright/runtime-database-mobile-cloud.png`.
- note: `reports/data/index.html` and `output/playwright/runtime-data-report.png` are currently ignored by `.gitignore`; they are generated local artifacts from `npm run data:runtime`.

## commit_plan

- message: `data: generate runtime database and audit pages`
- auto_commit: no; `tasks/index.md` is occupied by an existing ACTIVE task and this is a new data tooling boundary.

## collaboration

- lead_scope: Runtime data JSON export, normalized SQLite database export, and HTML/mobile audit tooling.
- specialist_input: 无
- tester_pass: Static mobile database page checked locally and on public server with 390x844 Playwright viewport; screenshots `output/playwright/runtime-database-mobile.png` and `output/playwright/runtime-database-mobile-cloud.png`; console/page errors 0.
- external_ai_input: 无
- lead_decision: Keep this as an additive tool first. Current game code continues reading existing data path; the new JSON/report/database artifacts let us audit normalized tables before removing CSV from the formal chain. The SQLite schema makes unit identity, stats, mechanisms, shapes, waves, shops, events, relics, and route data explicit, with repeated context tables using ID references instead of duplicating unit fields.
