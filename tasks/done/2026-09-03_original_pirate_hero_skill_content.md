# Original Pirate 物品技能 / 英雄技能正式分域

- task_id: `2026-09-03_original_pirate_hero_skill_content`
- status: `DONE`
- branch: `codex/original-pirate-content`

## Goal

修复 `original_pirate` 把物品 `item_ready` 技能误挂为英雄技能的语义混用，建立完全原创的雾航船长英雄被动技能、起始实例与十日 Ghost 技能实例真相链。

## Contract

- `BZ_SKILLS/48_bz_skills.csv` 单向迁移为 `BZ_ITEM_SKILLS/48_bz_item_skills.csv`；items/effects 只通过 `item_skill_id` 引用，runtime 目录固定为 `itemSkills`。
- 新增 `BZ_HERO_SKILLS/62_bz_hero_skills.csv`：两项英雄技能逐品质结构化，唯一触发为 `friendly_item_used`，禁止 reentrant。
- `hero_skill_mist_salvo`（雾线追炮）：对敌方英雄造成 1/1/2/2 伤害，每战最多触发 1/2/2/3 次。
- `hero_skill_tailwind_return`（顺风回索）：为来源物品推进 1/1/1/2 ticks，每战最多触发 1/2/3/3 次。
- 新增 `BZ_HERO_SKILL_LOADOUTS/63_bz_hero_skill_loadouts.csv`：英雄起始两实例为 bronze；Ghost Day 1–3/4–6/7–9/10 分别为 bronze/silver/gold/diamond。
- runtime `heroes` exact 为 `{heroId,heroSkillIds,startingHeroSkills}`，`heroSkills` 与 `itemSkills` 完全分域；Ghost build 使用 `heroSkills` 实例，禁止 `hero.skillIds`。
- 新局模板 schema v3 继续不持有 `ownedHeroSkills`；下游 Authority 从 hero catalog 构建顶层权威拥有状态。
- root/runtime/catalogs/generation/display/Ghost schema 分别升级为 13/11/4/3/2/2；source identity 为 11/9，battle package 为 3，rules/source/content/bundle revision 分别升级 v9/v10/v10/v10。

## Data boundary

- 两项技能名称、说明和数值均为本项目原创本地数据。
- 不读取、不迁移 `43_hero_skills.csv` 中 `hero_001/bazaar_skill_audit` 的 7 条参考切片，也不从 fixture 推导缺失值。
- 中文显示目录使用 `item_skills` 与 `hero_skills`；每项 hero skill 只有统一名称/说明，品质数值只存在 runtime qualityProfiles。

## Validation

- `python3 tools/export_original_pirate_content.py --check`
- `python3 tools/export_master_to_csv.py --check --original-pirate-only`
- `node --test tests/original_pirate_content_export.test.cjs`
- `node --test --test-name-pattern='CSV08B|CSV09' tests/csv_source.test.cjs`
- `node --test tests/unit/hero_skill_catalog_source.test.cjs`
- `git diff --check` 与 staged diff 审计

门禁覆盖 exact fields、物品/英雄跨目录引用、缺品质、owner drift、重复实例/技能、实例顺序、触发/效果参数、Ghost 品质日段、canonical hash、旧字段与伪造包 fail-closed。

全量旧域 `CSV08` 在本任务未修改的 Git 基线工作簿上同样会报
`pal_001 missing required base stat action`；本切片不扩大范围修改旧宠物域，仅以
`--original-pirate-only` 与工作簿结构门禁验收本次单向迁移。

## Validation results

- PASS：20 个 original-pirate workbook 页与 `44..63` 对应 CSV 逐字一致。
- PASS：exporter 输出 root v13/runtimeBundle v11/catalogs v4/newRun v3/generation v3/Ghost snapshot v2，display 72 条。
- PASS：`tests/original_pirate_content_export.test.cjs` 6/6；包含 source/package forged 与 canonical hash 门禁。
- PASS：工作簿结构与可读版重建 2/2；旧 `HERO_SKILLS` 域回归 1/1。
