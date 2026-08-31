# Godot 英雄技能首批正式数据真相链

- task_id: `2026-08-31_godot_hero_skill_slice_data`
- status: `DONE`
- owner: `Codex task 01a05757-4636-7e03-afa9-616fb039abb5`
- branch: `codex/bazaar-day1-day3-route`

## Goal

为 Godot `BZ-HERO-SKILL-01` 新增独立 `HERO_SKILLS -> 43_hero_skills.csv` 正式域，首批只提供四个基础品质的代表定义并声明 `completeness=slice`；保留 34 表来源审计关系，不改宠物 A/B 技能目录，不把 reserved 来源记录改称玩家技能。

## related_files

- `xlsx/ysbzs_master.xlsx`
- `data/csv/43_hero_skills.csv`
- `data/csv/README_csv_source.md`
- `tools/export_master_to_csv.py`
- `tests/unit/hero_skill_catalog_source.test.cjs`
- `tasks/doing/2026-08-31_godot_hero_skill_slice_data.md`

## write_scopes

- `xlsx/ysbzs_master.xlsx`: 只新增/修正 `HERO_SKILLS` sheet；不修改既有 sheet/公式/样式域。
- `tools/export_master_to_csv.py`: 只在 `MASTER_ONLY_EXPORTS` 注册 `HERO_SKILLS -> 43_hero_skills.csv`。
- `43_hero_skills.csv`: 只由 workbook exporter 重建，不手改输出。
- `README_csv_source.md`: 补充 43 表职责和 reserved 来源边界。
- `hero_skill_catalog_source.test.cjs`: 锁定 workbook/CSV 可重建、四基础品质、来源 tier/训练师关系及 slice 声明。

## exclusive_files

- `xlsx/ysbzs_master.xlsx`
- `tools/export_master_to_csv.py`

## existing_wip

- 开工时 tracked worktree clean；`outputs/**` 存在其他任务未跟踪交付物，全部保留且不纳入本任务。
- 现有涉及 workbook/exporter 的 doing 卡经检查均为历史 `DONE` 记录；未发现 ACTIVE/PAUSED 的相同写入租约。

## validation

- `npm run data:export`
- `npm run data:export:check`
- `node --test tests/unit/hero_skill_catalog_source.test.cjs`
- 结构化核对 workbook sheet 与 CSV 内容一致、四基础品质齐备、每条 2—7 真实训练师、来源 tier/关系精确一致。
- `git diff --check`

## downstream_schema_alignment_gate

- Godot 原子提交 `8c0a6245` 已统一为本批实际使用的 `event/battle + max_triggers/max_triggers_value_key`，并继续拒绝旧别名；`c244a3e1` 已把正式第 17 个内容包接入 exporter/repository。
- 下游 builder 必须同时读取 42 表，保证 `tag_references` 只引用正式 tag；英雄技能不拥有宠物身份字段 `build_tags`。
- 生成 package 必须直接通过同一个 `HeroSkillCatalogValidator`；重舷尺寸条件必须使用 `triggering_pet_size_is`，不得把 `large` 伪装为 tag。

## validation_result

- 初次用 `openpyxl` 保存会清除既有公式缓存，`data:export` 因旧 `PETS.action` 缓存缺失 fail closed；该本任务改动已精确恢复到 HEAD。开工前 tracked clean，未发现用户 workbook WIP。
- 恢复后的 pristine workbook 已备份至 `outputs/2026-08-31-godot-hero-skill-slice-data/pre-artifact/ysbzs_master.xlsx`，SHA-256 为 `b04af049ff0c3ab2a8579633dde7a42b4b46bc0fded0917494e6dc29ee77620f`。
- artifact-tool 从 pristine 只新增 `HERO_SKILLS`，先输出 candidate；candidate 可重建 44 张 CSV，和既有 `data/csv` 比较后除新增 43 表外零漂移。
- 正式 workbook 保存后 SHA-256 为 `497f9b26dbd8b12517f2ef5d0c9de3e2c0b62502808d1681ec6dc90c72190796`。
- `npm run data:export`：PASS，生成 44 张 CSV。
- `npm run data:export:check`：PASS。
- `node --test tests/unit/hero_skill_catalog_source.test.cjs`：1/1 PASS。
- 7 条定义覆盖四基础品质、四类语义事件和首切所需五种 effect 外壳；每条来源 tier 与 2—7 个训练师关系精确匹配 34/35 表。
- 阻断修正：移除 hero `build_tags`，`tag_references` 全部收口到 42 表的 31 个 playable tag；`large` 改为 `triggering_pet_size_is{size=large}`，42 表未新增伪标签。
- tag 合同修正前 workbook 备份为 `outputs/2026-08-31-godot-hero-skill-slice-data/tag-contract-fix/ysbzs_master.before.xlsx`（SHA-256 `497f9b26dbd8b12517f2ef5d0c9de3e2c0b62502808d1681ec6dc90c72190796`）；修正后 workbook SHA-256 为 `3452e50b9c87b9ce82ffef2a28233f2717b806681437b080a11141fdacbf0b56`，candidate 重建除 43 表外零 CSV 漂移。
- 下游消费验证：Python export `6/6`、hero domain/content/modular/effect-schema 四项 Godot smoke 与 fast QA `23/23` 全部通过；正式 `017` 为 `completeness=slice` 的 7 条目录基础，未宣称玩家技能已实现。

## commit_plan

- 上游独立原子提交：`data: add first hero skill catalog slice`
- 上游追加原子修正：`fix(hero-skills): enforce public tag references`
- 只精确暂存本任务拥有文件；Godot 生成 package 由下游 exporter 从本 CSV 重建，不手改 JSON。

## completion

- 上游提交：`1131e83`、`0f65f37`。
- 下游集成提交：`8c0a6245`、`c244a3e1`。
