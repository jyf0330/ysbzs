# Original Pirate 动态触发源目标 v1

task_id: 2026-09-03_original_pirate_trigger_source_target
status: DONE
owner: codex-original-pirate-trigger-source-data
branch: codex/original-pirate-content
target_ids: BZ-OP-TARGET-TRIGGER-SOURCE-01

## Goal

在 `original_pirate` 正式原创数据中新增一件自然可买、四品质完整的辅助物品，以 `another_friendly_item_used + source_item_has_any_tag -> trigger_source_item -> gain_damage_for_fight` 覆盖动态触发源目标。冻结为源物品本次 `USE` 完成后响应，只影响后续 `USE`；动态源缺失或被伪造必须 fail closed，不能降级 no-op。

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

- workbook/CSV：一件原创辅助物的四品质 item/effect/skill/offer/upgrade/铭刻行与自洽版本升级
- exporter：只新增无参数 `trigger_source_item`，严格限定响应触发、canonical tag 与 `gain_damage_for_fight`
- tests：正式目录、逐品质、自然报价、升级/铭刻、canonical hash 及错误 trigger/operation/params/target 负向量
- docs/tasks：记录 USE 后响应、只影响后续 USE、动态源缺失必须 fail closed 和外部映射仍为 0/138
- generated output：生成隔离 content/display 包，不纳入 Git

## exclusive_files

- `xlsx/ysbzs_master.xlsx`
- `tools/export_original_pirate_content.py`
- `tests/original_pirate_content_export.test.cjs`

## shared_file_policy

开工基线 `4b1c116e2ff806ab62adee1390432bb89e351877` 且 clean。本任务不改 Godot 仓库、Target Spec、外部 reference 34/66 域，也不提交或推送。

## validation

- `xlsx/ysbzs_master.xlsx` 的 9 个本切片 BZ 页已同步；其余 zip entry 与 `HEAD` 逐字一致。`export_master_to_csv.py --check --original-pirate-only`：PASS。
- `export_original_pirate_content.py --check`：PASS，正式候选为 content v20 / runtime v18 / executable catalogs v11 / rules v16，authoring source 为 content v18 / runtime v16；16 items / 58 profiles / 116 effects / 16 item skills / 33 shop templates / 42 upgrades / 116 enchant profiles / 109 display entries。
- `node --test tests/original_pirate_content_export.test.cjs`：11/11 PASS；覆盖逐品质正向量及错误 params、trigger、operation、target 的 CSV 与 executable 双层 fail-closed 负向量。
- `CSV02F|CSV08B|CSV09`：3/3 PASS；`hero_skill_catalog_source`：1/1 PASS；`check_csv_data.cjs`：PASS。
- 主线程使用 bundled Python/Node 独立复跑 workbook→CSV、exporter check、11/11 内容测试、3/3 CSV 专项、1/1 英雄来源及 CSV data validator，结果一致。
- 全量 `npm run check:csv`：19/20；唯一失败仍为既有 `CSV08` 的 `pet pal_001 missing required base stat action`，本切片未改该页，且工作簿非本切片 sheet XML 已证明无漂移。

## delivered_candidate

- 原创物品 `item_followwake_calibrator`（继航校炮仪）：1 格、`relic/tool`、四品质完整；自身 ready 伤害 `1/2/3/5`，另一件 `weapon` 使用完成后令真实动态来源仅本战伤害成长 `1/2/3/4`，只影响后续使用。
- 自然报价：`offer_refresh_2_followwake_calibrator`，refresh 2 slot 2，青铜价 4；保留 slot 1 的盐风绞盘基础品质入口，目录可达门禁通过。
- 隔离输出：`output/original_pirate_trigger_source_target/content.json` SHA-256 `610256edd9677fdf90bcf142bb9d14d861f3e5a4a8d0a55bb1dc79dbdf117f36`；display SHA-256 `e5966e9ae18b9fc6add63baf609e64476eea5b138bfa0f4a2b463d7854571327`；canonical `bundleHash=5c408487e88fa4f0f4d4ee605dba082db74687f17cee424e26ecfd0a633cbab0`。
- 数据层严格声明 `trigger_source_item.params={}` 且禁止其他 trigger/operation/fallback；运行侧仍须以权威 USE 上下文解析真实来源，缺失或伪造来源必须 fail closed，不得按空 target no-op。
- 本原创切片不构成构建绑定外部目录映射；仍为 Item `0/138`、Skill `0/138`。

## delivery

- 数据真相链已由主线程独立复核并收口；Godot 运行侧将基于该生成候选在下一独立 Spec 提交接入动态来源目标。
