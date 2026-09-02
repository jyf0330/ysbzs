# Original Pirate 潮痕火绳枪战内成长物品

task_id: 2026-09-03_original_pirate_tidescar_matchlock
status: DONE
owner: codex-data-catalog-gap
branch: codex/original-pirate-content

## Goal

新增完全原创、正式可达的战斗内伤害成长物品 `item_tidescar_matchlock`/“潮痕火绳枪”：物品自身就绪时攻击选定敌人，另一件带 `ammo` 标签的友方物品使用后，本物品仅在当场战斗增加自身伤害。按现有 master→CSV→exporter 单一真相链接入完整品质、技能、效果、升阶、适用铭刻、显示与确定性商店刷新报价，并保持全局三类铭刻目录。

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
- `tasks/done/2026-09-03_original_pirate_tidescar_matchlock.md`

## write_scopes

- workbook/CSV: 仅 `BZ_*` 版本身份、Ghost 内容版本引用、潮痕火绳枪 item/effect/skill/offer/upgrade/enchantment 正式行
- exporter: 版本、`gain_damage_for_fight` exact operation、配套主动伤害与 fail-closed 门禁、canonical/hash
- tests: 新物品数值、显示、商店可达、重排/hash 和错误 target/trigger/condition/amount/profile 负向向量
- docs/tasks: 新 operation 边界、验证与索引状态
- ignored generated artifacts: `output/original_pirate_tidescar_matchlock/content.json` 与 `display.zh-CN.json`，仅供 Godot 线程同步，不改 Godot worktree

## exclusive_files

- `xlsx/ysbzs_master.xlsx`
- `tools/export_original_pirate_content.py`
- `tests/original_pirate_content_export.test.cjs`

## shared_file_policy

数据 worktree 开工时 clean；历史 `tasks/doing` 中命中 master/exporter 的任务均不在本 `original_pirate` 44–65 内容切片上活跃实施。本任务不改 `34_bazaar_objects.csv` 与 `66_bazaar_reference_snapshots.csv`，不修改 Godot worktree。

## validation

- bundled Python master-to-CSV original-pirate-only check
- original-pirate exporter check 及 content/display 正式产物生成
- Node OPC 正向、重排/hash 与 forged 负向门禁
- `git diff --check`、staged diff 全量审计、fetch/ahead-behind/remote OID 核对

## Contract

- 数据源仅从 `ysbzs_master.xlsx` 生成 44–65 CSV；`34_bazaar_objects.csv`/`66_bazaar_reference_snapshots.csv` 外部参考域不改。
- 版本升级为 root/source/runtime/source-runtime `17/15/15/13`、executable catalog `8`、rules v13，source/content/bundle/snapshot revision v14；display directory 字段与域未变，保持 schema v3 并由 source/content revision v14 区分。
- 潮痕火绳枪固定 `slotWidth=2`、`baseQuality=bronze`、canonical tags `tool,weapon`、ammo disabled；bronze→diamond 的 `cooldown/damage/growth/buy/sell` 分别为 `7/4/2/5/2`、`6/7/3/8/4`、`5/11/4/12/6`、`4/16/6/17/8`。
- `gain_damage_for_fight` 只允许 `another_friendly_item_used`，且仅一个非空、canonical、无重复的 `source_item_has_any_tag` condition；target 固定 `self_item`、`amount>0`、不得带其他 params。condition tag 保持通用词表，不在 operation 层硬编码 `ammo`。
- 凡 profile 声明 `gain_damage_for_fight`，同 profile 必须另有 `item_ready + always -> selected_enemy -> deal_damage`；本物品的四个 growth effect 数据均固定 `condition_tags=ammo`。
- 进阶价格为 4/7/11；完整接入顺风与破浪铭刻四品质 profile，因 ammo disabled 不伪造备弹铭刻，全局三类铭刻目录不变。
- 确定性商店刷新 10 的 slot 1 用青铜潮痕火绳枪替换已由 starter+升阶链覆盖的黄金盐雾炮；33 个 shop template 总数与 0–10 连续刷新层不变。

## Validation results

- PASS：`tools/export_master_to_csv.py --check --original-pirate-only`，22 个 BZ sheet 与 CSV 可重建。
- PASS：exporter v17，13 items、33 shop templates、80 effects、33 upgrades、3 enchantment types、103 display entries。
- PASS：OPC01–OPC06 9/9，含通用 canonical condition tag 正向 fixture，以及 CSV/package 两层 target/trigger/condition/amount/extra-param/配套主动伤害/旧 schema 负向门禁。
- PASS：CSV02F/CSV08B/CSV09 3/3，`HERO_SKILLS` source catalog 1/1；34/66 无 Git 差异。
- generated content SHA-256 `c843b209cf485f0f675642f7d8aab6e6c2c3c24ed602de41f7acf8bcfef26da3`；display SHA-256 `e26b72d3c4665456e09ce6ede3b6ecb5b204359c5aa598aac993585cd7145c54`；bundle hash `ba9bf732e95d92caa131be48bba3cca1f63eb38d2e9737cc29db26f05ddfd739`。
- PASS：Godot 线程已独立确认同步 content/display 文件 hash 与数据输出一致，并完成正式 Session 自然链及 P1/P2 修复复验；数据合同已获跨仓核准。

## commit_plan

- 一个原子提交：`data(content): add Tidescar Matchlock combat growth`
- 验证通过后精确暂存、提交并推送 `codex/original-pirate-content`
