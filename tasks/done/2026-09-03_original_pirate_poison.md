# Original Pirate 项目原创 Poison v1 数据合同

task_id: 2026-09-03_original_pirate_poison
status: COMPLETED
owner: remaining_rules_gap_audit（data）
branch: codex/original-pirate-content
target_ids: BZ-OP-POISON-01

## Goal

在 `ysbzs_master.xlsx -> CSV -> exporter -> generated` 单一真相链中加入项目原创 Poison v1，并新增一件正式商店自然可达、四品质完整的原创纯 Poison 物品。

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
- `data/csv/README_csv_source.md`
- `tools/export_original_pirate_content.py`
- `tests/original_pirate_content_export.test.cjs`
- `tests/original_pirate_csv_subset.test.cjs`
- `tasks/index.md`
- 本任务卡

## Result

- 数据版本已迁移为 source 24/runtime 22、content 26/runtime bundle 24/catalog 17/rules v22，source/bundle/content revision 统一为 v23；旧版本候选继续 fail closed。
- `runtimeBundle.battleRules.poisonRules` 精确包含冻结的 13 字段；`apply_poison` 仅接受 `item_ready + [always] -> selected_enemy` 与正整数 `stacks`，profile 必须 `critChanceBps=0` 且只含这一条效果。
- 新增原创 `item_inkwake_doser` / “墨航滴液器”、`skill_inkwake_doser` / “暗潮渗毒”：1 格、`poison,relic,tool`，四品质冷却 10/9/8/7、层数 2/3/5/7、买卖价 2/1、4/2、7/3、11/5。
- 三段升级价 3/6/9；仅 tailwind 铭刻，价格 4/6/9/12 且冷却 -1。它以 `offer_refresh_5_inkwake_doser` 在 Mistwake refresh 5 slot 1 提供青铜报价，价格 2；Random 槽与初始 Burn/Crit 未被覆盖。
- 平衡意图：Poison 绕过护盾且不衰减，因此以 10 tick 的首次完整间隔和较低层数开局；品质成长同时缩短冷却并提高层数，Tailwind 只提高施加频率，不另加层数或直接伤害。
- 生成包计数为 22 items / 82 profiles / 144 effects / 22 item skills / 60 upgrades / 148 enchant profiles / 33 shop templates / 121 display entries。
- canonical runtime bundle hash：`4095d69f19ed647713b96ea9c53a499b277e4a392db7145745b5798a55c59315`。
- 隔离生成物：`output/original_pirate_poison/content.json`（SHA-256 `08e92ddaa0beff42af4a7da592bfcc5c0d7c5813f5951a3f0a1650cbe03f7409`）与 `output/original_pirate_poison/display.json`（SHA-256 `ee3c7711087475373a9c7fb90e99bda3a7a47ce2a79d2f880a4ec47fea3e09f6`）。第二次隔离生成逐字一致。

## Validation

- TDD RED：专项 Node 先以旧 schema/缺 Poison 列与内容运行，25 项中 13 项按预期失败。
- bundled Python `tools/export_master_to_csv.py --check --original-pirate-only`：PASS，workbook 可逐字重建 22 个 BZ CSV 域。
- bundled Python `tools/export_original_pirate_content.py --check`：PASS，22 items / 33 shop templates / 10 battle templates / 10 ghost encounters / 10 ghost snapshots / 121 display entries。
- bundled Node `--test tests/original_pirate_content_export.test.cjs tests/original_pirate_csv_subset.test.cjs`：25/25 PASS，0 failed。
- 独立第二次生成与正式隔离包 `cmp`：runtime/display 均逐字一致。
- `git diff --check`：PASS。

## Delivery Boundary

- 本任务只实现项目原创数据合同，未复制参考作品专有名称、效果原文、图像或精确未冻结数值。
- 外部 Vanessa Item/Skill 正式可执行映射仍为 `0/138 + 0/138`，本任务不改变该事实。
- 按主线程要求保持未提交、未推送；Godot 运行时、Session 与实窗验收不属于本数据任务。
