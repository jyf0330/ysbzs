# Original Pirate 相邻响应物品 v1

task_id: 2026-09-03_original_pirate_item_adjacency
status: DONE
owner: codex-gamedata-source-lock
branch: codex/original-pirate-content

## Goal

新增完全原创、正式可达的 1 格物品 `item_mistline_ratchet`/“雾索棘轮”：自身就绪时攻击敌方船长，只有相邻且带 `ammo` 标签的另一件友方物品使用后才为自身推进充能。把 `condition_source_relation=any|adjacent` 纳入 workbook→CSV→exporter 单一真相链，使多条件按 canonical 顺序 `[source_item_has_any_tag, source_item_adjacent_to_self]` 导出并严格 fail closed。

## related_files

- `xlsx/ysbzs_master.xlsx`
- `data/csv/44_bz_gameplay.csv`
- `data/csv/46_bz_items.csv`
- `data/csv/47_bz_item_effects.csv`
- `data/csv/48_bz_item_skills.csv`
- `data/csv/50_bz_stall_offers.csv`
- `data/csv/56_bz_source_snapshot.csv`
- `data/csv/57_bz_item_upgrades.csv`
- `data/csv/58_bz_enchantments.csv`
- `data/csv/60_bz_ghost_snapshots.csv`
- `tools/export_original_pirate_content.py`
- `tests/original_pirate_content_export.test.cjs`
- `CSV_START_HERE.md`
- `data/csv/README_csv_source.md`
- `tasks/index.md`
- 本任务卡

## write_scopes

- workbook/CSV：新增 `condition_source_relation` 列、雾索棘轮四品质 item/effect/skill/offer/upgrade/铭刻行，以及一次自洽内容版本升级
- exporter：解析 `any|adjacent`，固定复合条件顺序、参数形状、适用触发与 fail-closed 门禁
- tests：正式内容、三档升级、8 条适用铭刻、refresh 1 替换、33 offer 不变，以及 relation 空值/未知值/非法组合/重排/重复/参数伪造负向量
- docs/tasks：说明相邻关系只由规则层解释，运行时不解析中文文案
- ignored output：生成隔离 content/display 包供 Godot 主线程消费，不纳入 Git

## exclusive_files

- `xlsx/ysbzs_master.xlsx`
- `tools/export_original_pirate_content.py`
- `tests/original_pirate_content_export.test.cjs`

## shared_file_policy

开工基线 `5af6608c534b21624d7375739729f956546728fc` 且 clean。本切片只改 original-pirate 44–65 正式数据域及其文档/任务索引；不改外部参考 34/66 域，不修改 Godot 仓库。

## validation

- PASS：`python3 tools/export_master_to_csv.py --check --original-pirate-only`；22 个 BZ 页与 CSV 可逐字重建。
- PASS：`python3 tools/export_original_pirate_content.py --check`；v18 candidate 含 14 items、88 effects、33 shop templates、36 upgrades、100 enchantment profiles、105 display entries。
- PASS：`tests/original_pirate_content_export.test.cjs` 9/9；覆盖正式雾索棘轮数值与目录、旧 80 行显式 `any`、四条 `adjacent`、33 报价/三槽不漂移、refresh 1 替换与 refresh 8 深潮钟保留、行重排/hash，以及 relation 空值/未知值/非法组合和执行包条件重排/重复/参数伪造拒绝。
- PASS：`CSV02F|CSV08B|CSV09` 与 `hero_skill_catalog_source` 4/4；总表结构、旧外部参考域与好读版重建未漂移。
- PASS：隔离包 `output/original_pirate_item_adjacency/content.json` SHA-256 `52011d315ced74891cabcb5e8bdf984388f15bdd07e9344804eb68871d765b78`；display SHA-256 `93e39eb9d302841de4992378060a1a45f510f8ecfb6a77b20acfbc623378e4c2`；bundle hash `d7a0716b7e63719a64ed6715ab04c21298e00d9f7130b42fa72591006cd407a7`。
- PASS：`git diff --check`；待主代理 staged diff 审计、跨仓消费验证、精确提交与推送。

## Contract

- `item_mistline_ratchet`/`skill_mistline_ratchet` 固定 1 格、`tool,weapon`、禁用弹药；四品质 cooldown `7/6/5/4`、damage `3/5/8/12`、相邻 ammo 来源使用后的 charge ticks `1/1/2/2`。
- 买卖价固定 `4/2,7/3,11/5,16/8`；升级价固定 `4/7/10`；顺风与破浪各四品质共 8 条铭刻，余响弹仓不得适用。
- refresh 1 slot 3 用青铜雾索棘轮替换钻石深潮钟；深潮钟仍保留 refresh 8，刷新 0–10、每组 3 槽、总 offer 33 不变。
- `condition_source_relation=any` 是所有旧效果的显式值；`adjacent` 仅允许 `another_friendly_item_used + source_item_has_any_tag`，导出顺序固定为 tag 条件后 adjacency 条件，adjacency 条件不带参数。
- 版本固定为 source schema v16、executable content v18、runtime bundle v16、source runtime v14、executable catalogs v9、rules v14；source/content/bundle/snapshot revision v15。
- 不复制任何外部参考名称、说明文本或数值。

## deferred_scope

- Godot fixed-tick 对 `source_item_adjacent_to_self` 的权威解释、正式 Session 交互和真实窗口证据由独立 Godot 任务完成。

## commit_plan

- 一个原子提交：`data(content): add adjacent item reaction`
