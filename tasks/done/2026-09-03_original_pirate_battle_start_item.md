# Original Pirate 战斗开始物品效果 v1

task_id: 2026-09-03_original_pirate_battle_start_item
status: DONE
owner: codex-original-pirate-battle-start-data
branch: codex/original-pirate-content
target_ids: BZ-OP-TRIGGER-BATTLE-START-01

## Goal

新增完全原创、正式可买的 1 格物品 `item_dawntide_timer` / “晨潮校时器”：四品质均严格包含一条 `battle_start + always -> owner_hero + gain_shield` 和一条既有 `item_ready + always -> selected_enemy + deal_damage`。首版战斗开始触发只开放该物品效果组合，其他归属、条件、目标与操作全部 fail closed。

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

- workbook/CSV：新增晨潮校时器四品质 item/effect/skill/offer/upgrade/铭刻行，并做一次自洽内容版本升级
- exporter/schema：只新增 `battle_start` item trigger，并严格限定 `always + owner_hero + gain_shield + target.params={}`
- tests：覆盖正式目录、四品质、自然报价、升级/铭刻、canonical hash 及错误归属/条件/目标/操作/参数负向量
- docs/tasks：记录原创平衡、数据真相链、外部映射仍为 0/138
- generated output：生成隔离 content/display 包，不纳入 Git

## exclusive_files

- `xlsx/ysbzs_master.xlsx`
- `tools/export_original_pirate_content.py`
- `tests/original_pirate_content_export.test.cjs`

## shared_file_policy

开工基线 `9c8aa170` 且 clean；现有进行中任务不占用 original-pirate BZ 44–60 页、导出器或专项测试的当前语义接口。本任务不修改外部 reference 域、Godot 仓库或 Target Spec。

## validation

- `python3 tools/export_master_to_csv.py --check --original-pirate-only`
- `python3 tools/export_original_pirate_content.py --check`
- `node --test tests/original_pirate_content_export.test.cjs`
- `node --test --test-name-pattern='CSV02F|CSV08B|CSV09' tests/csv_source.test.cjs`
- `node --test tests/unit/hero_skill_catalog_source.test.cjs`
- `node tools/check_csv_data.cjs`
- `git diff --check`

## Content result

- `item_dawntide_timer` / “晨潮校时器”：1 格，canonical tags `relic, tool`，青铜/白银/黄金/钻石购买价 `4/7/11/16`、出售价 `2/3/5/8`、冷却 `9/8/7/6`。
- 开场护盾逐品质为 `3/5/8/12`，就绪直接伤害为 `2/3/5/7`；四品质均严格只有这两条效果，开场效果优先级 10、主动效果优先级 20。
- `offer_refresh_3_dawntide_timer` 位于 `package_mistwake_refresh_3` 的第三槽，出售青铜品质，报价 4。它通过既有正式摊位刷新目录自然可达，不新增 fixture 或旁路赠送。
- 升阶价为 `4/7/10`；适用铭刻为既有 `tailwind` 与 `breaker`，共 8 条逐品质 profile。

## Balance rationale

青铜开场护盾 3 仅为基础英雄 40 点生命的 7.5%，能缓冲首轮但不能替代持续防御；2 点伤害配 9 tick 冷却保持低压。品质提升同时提高一次性护盾与持续伤害，钻石仍止于 12 点开场护盾及 7 点/6 tick 主动伤害，且没有弹药、充能或响应循环，因此收益有明确上限。上述数值为本项目原创设计，未从外部参考源复制。

## Result

- 版本：content v21、runtime bundle v19、executable catalogs v12、rules v17、source/runtime authoring v19/v17，content/source/bundle revision v18。
- 目录：17 items、62 quality profiles、124 effects、17 item skills、45 upgrades、124 enchant profiles、33 shop templates、111 display entries。
- 隔离生成结果：`output/original_pirate_battle_start_item/content.json` SHA-256 `c249cf6d7ecf4ac960748b44b23b3bbcce81cec6b171c9854dc0b266fe5ab201`；display SHA-256 `e0a655f3b05d300e22e621effede9e9d09403ffedd21a28788a06b7c18507029`；canonical bundle hash `5cbf604b7411c570dabdb0920b99c55cc9c20a710c51c066b5a69056ebc6e0a7`。
- `python3 tools/export_master_to_csv.py --check --original-pirate-only`：PASS。
- `python3 tools/export_original_pirate_content.py --check`：PASS。
- `node --test tests/original_pirate_content_export.test.cjs`：12/12 PASS；覆盖正式样本与 battle_start 的错误归属、条件、关系、目标、操作、参数、集合目标及英雄技能冒用。
- `PATH=<bundled-python>:$PATH node --test --test-name-pattern='CSV02F|CSV08B|CSV09' tests/csv_source.test.cjs`：3/3 PASS。
- `node --test tests/unit/hero_skill_catalog_source.test.cjs`：1/1 PASS。
- `node tools/check_csv_data.cjs`：PASS。
- `npm run check:csv`：19/20；唯一 CSV08 仍被基线既有 `pet pal_001 missing required base stat action` 阻断，与本任务 BZ 数据无关；CSV08B、CSV09 均通过。
- `git diff --check`：PASS。
- 构建绑定 Vanessa 参考目录的正式可执行映射保持 Item `0/138`、Skill `0/138`；本原创样本不计入该映射。

## commit_plan

- 一个原子提交：`data(content): add battle-start shield item`
- 验证通过后精确暂存、提交并推送当前上游
