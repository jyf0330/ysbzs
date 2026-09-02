# Original Pirate 英雄防御资源物品

task_id: 2026-09-03_original_pirate_hero_defense_items
status: DONE
owner: codex-last-chance-data
branch: codex/original-pirate-content

## Goal

为 `original_pirate` 正式内容增加英雄治疗与护盾两类可执行物品效果，并提供三件具完整品质、成长、商店和显示资料的原创防御物品。

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
- `tasks/index.md`

## write_scopes

- workbook/CSV: 仅 `BZ_*` 的版本身份、三件新物品及其 effect/skill/offer/upgrade/enchantment 正式行
- exporter: original-pirate 版本、`owner_hero`、`heal/gain_shield` exact validator、canonical/hash 门禁
- tests: OPC 防御资源内容、目标/操作/参数 forged vectors、多效果稳定排序与哈希
- docs/tasks: 防御资源合同、验证与索引状态

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

- 一个原子 Spec 功能提交；按根线程要求本轮只提交、不推送

## Contract

- root/runtime/catalogs/source identity 固定为 16/14/7/14/12；rules v12，source/content/bundle revision v13；display v3 与 generation/battle/ghost/newRun schema 不变。
- 物品 effect 新增 exact `{target:{type:'owner_hero',params:{}},operation:{type:'heal'|'gain_shield',params:{amount:int>0}}}`，只允许 `item_ready + always`；reactive operation 白名单不扩。
- heroSkills 仍为独立目录且正式 62/63 表不新增条目；其 exact 五字段 validator 允许 `owner_hero + heal|gain_shield + amount>0 + ticks=0`，与物品共用 operation 语义。
- 雾藻疗匣仅治疗、叠潮护舷仅获得护盾、归辉航标按 priority 20/21 先治疗再获得护盾；治疗不超过最大生命，护盾一比一阻挡直接伤害。未声明尚不存在的周期伤害特例。
- 三件物品均有 bronze→diamond 完整品质、相邻升阶、刷新 4/5/6 的正式青铜商店入口和逐品质顺风铭刻；不生成无实际效果的伤害或弹药铭刻。

## Validation results

- PASS：exporter v16，12 items、33 shop templates、72 effects、101 display entries，bundle hash `ba150c655d537b7a05ac2dc4d86f91bdc540bb00a3aca9169050928703d2b92b`。
- PASS：22 个 BZ workbook 页与 CSV 一致；master-to-CSV original-pirate-only check。
- PASS：OPC01–OPC06 8/8，含共享 heroSkill 防御 operation 正向 fixture、错误 target/params/reactive/旧字段 forged 门禁与重排 hash。
- PASS：CSV02F/02G/08B/09 4/4；HERO_SKILLS rebuildable source 1/1。

## collaboration

- runtime contract: `/root/last_chance_runtime` 冻结 `owner_hero`、`heal/gain_shield` exact、版本和 reactive 边界。
- lead decision: 正式数据仅新增三件 item，不新增 heroSkill；用 validator fixture 证明共享 operation，保持 itemSkills/heroSkills 身份分离。
