# Original Pirate 项目原创固定伤害 Aura v1 数据合同

task_id: 2026-09-03_original_pirate_damage_aura
status: COMPLETED
owner: remaining_rules_gap_audit（data）
branch: codex/original-pirate-content
target_ids: BZ-OP-DAMAGE-AURA-01

## Goal

在 `ysbzs_master.xlsx -> CSV -> exporter -> generated` 单一真相链中增加独立 Aura 数据域；复用既有“雾藻疗匣”，保留主动治疗，并为战斗开始上板快照中的友方武器提供逐品质固定伤害加成。

## Result

- 新增第 23 个 BZ 域 `BZ_ITEM_AURAS -> 66_bz_item_auras.csv`；Aura 与 `BZ_ITEM_EFFECTS` 分域，不伪装成触发效果。
- `battleRules.damageAuraRules` 由 `44_bz_gameplay.csv` 九个 exact 字段唯一生成：`ysbzs.original-pirate-damage-aura.v1 / per_damage_from_compiled_sources / battle_start_board / board_slot_then_instance_id / additive_per_source_effect / before_crit / compiled_board_source_for_battle / reject_advance / never`。
- `item_mistkelp_remedy_kit` 四品质分别绑定独立 Aura ID，固定为友方 `weapon` 标签目标提供 `1/2/3/4` 点 `grant_damage`；`excludeSelf=true`，主动 `heal` 效果、原报价、升级与铭刻保持不变。
- `48_bz_item_skills.csv` 新增 `aura_ids`，运行包 `qualityProfiles` 新增 `auras`，`executableCatalogs.itemSkills` 新增 `auraIds`；effect 与 Aura 身份各自完整覆盖且不可重复归属。
- 数据版本迁移为 source content 26/source runtime 24、content 28/runtime bundle 26/catalog 18/rules v24，source/bundle/content revision 统一为 v25；旧版本继续 fail closed。
- 目录数量保持 22 items / 82 profiles / 144 effects / 22 item skills / 60 upgrades / 148 enchant profiles / 33 shop templates / 121 display entries，新增 4 条 Aura。
- runtime bundle hash：`9a8ef405ab2af1a016cc2d7dd91ba8317199e77f7d2fc99abcc4f78f5b3d790a`。
- 隔离生成物：`output/original_pirate_damage_aura/content.json`（SHA-256 `4b96f3b2d41d217543f208912480647f3365654eece2aadb4036d59118e7b3ac`）与 `output/original_pirate_damage_aura/display.json`（SHA-256 `6fd602b929a9dc1aa205c7c4ad92f1eb2a0fb68a0320d19e8b94014e486d05ef`）。

## Validation

- TDD RED：在规则列和 Aura CSV 尚未落盘时，`OPCSV04` 按预期失败。
- bundled Python `tools/export_master_to_csv.py --check --original-pirate-only`：PASS，workbook 可逐字重建 23 个 BZ CSV 域。
- bundled Python `tools/export_original_pirate_content.py --check`：PASS。
- bundled Node `--test tests/original_pirate_content_export.test.cjs tests/original_pirate_csv_subset.test.cjs`：27/27 PASS，0 failed。
- bundled Node `CSV08B`：1/1 PASS；`tools/check_csv_data.cjs`：PASS。
- 第二次隔离生成与上述 runtime/display 文件逐字一致，SHA-256 相同。
- `git diff --check`：PASS；最终状态仅含本任务归属文件，无缓存产物。

## Delivery Boundary

- 本切片只冻结项目原创固定伤害 Aura v1；不复制参考作品专有名称、效果原文、美术或数值，也不宣称复刻其 Aura 生命周期、重算时机或叠加语义。
- 外部 Vanessa Item/Skill 正式可执行映射仍为 `0/138 + 0/138`。
- 数据侧不修改 Godot；Authority、Trace、正式 Session 与实窗证据由 Godot 侧独立接入和验收。
