# Original Pirate 物品标签与跨物品响应

task_id: 2026-09-03_original_pirate_item_tag_reactions
status: DONE
owner: codex-last-chance-data
branch: codex/original-pirate-content

## Goal

为 `original_pirate` 正式内容增加 canonical item tags，以及“另一件友方物品使用后按来源物品标签响应”的结构化效果，并加入三件完整可达的原创物品。

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
- `tools/export_master_to_csv.py`
- `tools/export_original_pirate_content.py`
- `tests/original_pirate_content_export.test.cjs`
- `tests/csv_source.test.cjs`
- `CSV_START_HERE.md`
- `tasks/index.md`

## write_scopes

- workbook/CSV: 仅 `BZ_*` 页和 `44/46/47/48/50/56/57/58` 正式域的本切片字段与行
- exporter: original-pirate 版本、item tags、item trigger/condition、canonical/hash/validator
- tests: OPC 内容、重排、forged、workbook header 门禁
- docs/tasks: 本切片合同、验证与索引状态

## exclusive_files

- `xlsx/ysbzs_master.xlsx`
- `tools/export_original_pirate_content.py`
- `tests/original_pirate_content_export.test.cjs`

## validation

- bundled Python original-pirate exporter check
- bundled Python master-to-CSV original-pirate-only check
- Node original-pirate content tests、相关 CSV tests
- deterministic/hash/reorder/forged vectors、diff/staged audit

## commit_plan

- 一个原子 Spec 功能提交并推送 `codex/original-pirate-content`

## Contract

- `items[]` exact 新增 canonical `tags`；词表严格为 `ammo/aquatic/relic/tool/vehicle/weapon`。
- `itemSkills[]` 从单数 `triggerEvent` 迁移为 canonical `triggerEvents`；旧字段不兼容且 fail-closed。
- 新事件 `another_friendly_item_used` 只接受 `{type:'source_item_has_any_tag',params:{tags:[...]}}`；响应操作仅复用 `deal_damage/charge/reload`。
- 每件物品每个品质仍必须至少含一个 `item_ready + always` 主动效果，避免纯被动物品进入当前 cooldown kernel。
- 新增原创尾潮回响鼓、盐风绞盘、潮鳍投筒；三者均具 bronze→diamond 完整品质、相邻升阶、商店自然候选和兼容铭刻档案。
- root/runtime/catalogs/source identity 分别升级为 15/13/6/13/11；rules 与 source/content/bundle revision 分别为 v11/v12/v12/v12；display v3、generation v3、battle package v3、newRun v3 不变。

## Validation results

- PASS：`tools/export_original_pirate_content.py --check`，root v15 / runtime v13，9 items、33 shop templates、56 effects、95 display entries，bundle hash `994d7689f14f94f511f02cdb26db077b29f3762d014e8f227242f2ed6126fb7d`。
- PASS：22 个 BZ workbook 页与 CSV 逐字一致。
- PASS：OPC01–OPC06 7/7；覆盖 tags/condition exact、主动效果、响应 op、重排/hash 与 forged package。
- PASS：CSV02F/02G/08B/09 4/4；旧 `HERO_SKILLS` 来源域 1/1。
