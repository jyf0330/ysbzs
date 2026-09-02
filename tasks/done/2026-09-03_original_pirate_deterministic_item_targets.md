# Original Pirate 确定性物品目标 v1

task_id: 2026-09-03_original_pirate_deterministic_item_targets
status: DONE
owner: codex-original-pirate-target-data
branch: codex/original-pirate-content

## Goal

在 `original_pirate` 正式原创数据中新增一件自然可买、四品质完整的中型物品，以四条独立 typed 效果覆盖 `left_adjacent_item`、`right_adjacent_item`、`leftmost_friendly_item`、`rightmost_friendly_item`；仅复用现有 `deal_damage/charge` 操作，不引入随机、全体、Aura、Burn、Poison 或 Crit。

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

- workbook/CSV：新增一件原创物品的四品质 item/effect/skill/offer/upgrade/铭刻行，并做一次自洽内容版本升级
- exporter：只扩展四种 deterministic friendly-item target，固定 operation/trigger/参数与 fail-closed 合同
- tests：覆盖正式目录、四 target、四品质、报价可达、升级/铭刻、canonical hash 与未知/错配 target 负向量
- docs/tasks：说明四种 target 排除自身、缺目标时无效果、各 effect 独立结算且不代表外部 138 来源映射
- generated output：生成隔离 content/display 包供 Godot 后续消费，不纳入 Git

## exclusive_files

- `xlsx/ysbzs_master.xlsx`
- `tools/export_original_pirate_content.py`
- `tests/original_pirate_content_export.test.cjs`

## shared_file_policy

开工基线 `39181d71d1e1eefd89e0a4888ab9c368fd3751e7` 且 clean；本切片只改 original-pirate 44–65 正式数据域及其文档/任务索引。现有 ACTIVE/READY 任务不占用上述 semantic scope；不改外部 reference 34/66 域，不修改 Godot 仓库。

## validation

- PASS：`python3 tools/export_master_to_csv.py --check --original-pirate-only`，22 个 BZ 页仍可从主表逐字重建。
- PASS：`python3 tools/export_original_pirate_content.py --check`，正式包为 content `19` / runtime `17` / executable catalogs `10` / rules `v15`。
- PASS：`node --test tests/original_pirate_content_export.test.cjs`，`10/10`；含四 target 的正式逐品质正向量、未知 target、错 operation、错 trigger 与额外 target param 负向量。
- PASS：`PATH=<workspace-python>:$PATH node --test --test-name-pattern='CSV02F|CSV08B|CSV09' tests/csv_source.test.cjs`，`3/3`。
- PASS：`node --test tests/unit/hero_skill_catalog_source.test.cjs`，`1/1`。
- PASS：主线程使用 bundled Python/Node 独立复跑上述四组专项，分别为 workbook→CSV、exporter check、`10/10`、`3/3` 与 `1/1`，结果一致。
- `npm run check:csv` 为 `19/20`：唯一失败 `CSV08` 可在未修改的 HEAD 原始 workbook 独立复现，原因是 `pet pal_001 missing required base stat action`；与本轮只改 BZ 页及 original-pirate 导出链无关。`CSV08B/CSV09` 均通过，未污染 workbook 可见页与可读版重建。

## frozen_content

- `item_quadrant_linkage` / 四缆联动轮：`slotWidth=2`、tags=`tool,vehicle`，四品质 cooldown `8/7/6/5`，buy `5/8/12/17`，sell `2/4/6/8`。
- `skill_quadrant_linkage` / 四缆传动：每个品质先执行 `selected_enemy + deal_damage`，伤害 `2/3/5/7`；再以 priority `30/31/32/33` 独立执行左邻、右邻、最左、最右 CHARGE。
- 四 target charge ticks：青铜 `[1,1,1,1]`、白银 `[1,1,2,2]`、黄金 `[2,2,2,2]`、钻石 `[2,2,3,3]`。四 selector 的类型语义固定排除 source/self；空集合合法 no-op，不生成 fallback；同一目标被多个 selector 命中时保留各自 effect identity 并依确定性顺序分别结算。
- 商店：`offer_refresh_1_quadrant_linkage` 位于 `package_mistwake_refresh_1` slot 2，青铜价 5；起始 12 金支付一次 2 金刷新后仍可自然购买。原 slot 2 的罗盘仍由后续 refresh 包提供。
- 升级价 `5/8/11`；正式适用铭刻为顺风与破浪，四品质 profile 共 8 条，不开放弹舱铭刻。

## output_evidence

- 目录数量：items `15`、quality profiles `54`、item effects `108`、item skills `15`、shop templates `33`、upgrades `39`、enchantment profiles `108`、display entries `107`。
- runtime `bundleHash=62ea95279721a288cbe36b55d841ffb7fc5c1e3dc16566343cd48fbea50996a4`。
- 隔离输出：`output/original_pirate_deterministic_item_targets/content.json`，SHA-256 `6a08b71403ab418014121c78a6b06fa13d835f3cab13a97324cfb6ebac8c9d51`；`display.zh-CN.json`，SHA-256 `6ab93a3dccb469b649787a68a4fde1c578c626ec6013388f4493da99c1392d7b`。输出目录不纳入 Git。
- 本切片只增加原创内容与通用确定性 selector，不代表外部 Vanessa 参考目录已映射；正式可执行映射仍为 Item `0/138`、Skill `0/138`。

## delivery

- 数据真相链已由主线程独立复核并收口；Godot 运行侧通过生成候选接入，继续在独立仓库完成 Authority 与 Session 验证。
