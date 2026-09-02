# Original Pirate 英雄技能正式学习 / 升阶目录

- task_id: `2026-09-03_original_pirate_hero_skill_training`
- status: `DONE`
- branch: `codex/original-pirate-content`

## Goal

把 `original_pirate` 的英雄技能从固定开局能力推进为可由正式训练师学习、按相邻品质升阶的构筑层，同时保持物品技能、英雄技能与英雄技能交易目录三者独立。

## Contract

- 新增 `BZ_HERO_SKILL_TRAINERS/64_bz_hero_skill_trainers.csv` 与 `BZ_HERO_SKILL_OFFERS/65_bz_hero_skill_offers.csv`，不复用物品 offer / upgrade。
- `heroSkillTrainers` exact 为 `{trainerId,heroId,stallId,offerSlots,offerIds}`；两个训练师均绑定 `stall_mistwake`，分别只负责一项原创英雄技能。
- `heroSkillOffers` exact 为 `{offerId,trainerId,heroSkillId,action,price,availability,order}`；action 是严格的 `learn` 或相邻品质 `upgrade` 联合类型。
- 学习所得英雄技能实例来源固定为 `{sourceType:'hero_skill_trainer',sourceId:trainerId}`；同一 trainer + hero skill 只允许一个 learn offer。
- 雾线追炮保留为唯一 bronze starter；顺风回索通过 Day 1–10、5 金币的 learn offer 获得。
- 两项技能均提供 bronze→silver→gold→diamond 的完整相邻升阶；雾线追炮价格为 5/8/12，顺风回索为 4/7/10，日窗分别为 2–10、5–10、8–10。
- `62_bz_hero_skills.csv` 为每个品质新增原创 `effect_description_zh`；显示目录新增 `hero_skill_quality_profiles`，UI 不必解析 executable effects。
- starter 与 Ghost build 都允许非空、owner 合法的英雄技能子集；训练路径必须令全部正式品质在 battle layers 投影的 maximumDay（当前 Day 10）内可达。
- root/runtime/catalogs/display/source identity 分别升级为 14/12/5/3/12/10；rules/source/content/bundle revision 分别升级为 v10/v11/v11/v11。newRun v3、generation v3、battle package v3、Ghost snapshot v2 不变。

## Validation

- `python3 tools/export_original_pirate_content.py --check`
- `python3 tools/export_master_to_csv.py --check --original-pirate-only`
- `node --test tests/original_pirate_content_export.test.cjs`
- `node --test --test-name-pattern='CSV08B|CSV09' tests/csv_source.test.cjs`
- `node --test tests/unit/hero_skill_catalog_source.test.cjs`
- `git diff --check`、staged diff 与远端 OID 核对

门禁覆盖 exact fields、非 starter learn 路径、相邻升级、训练师/英雄/摊位/日程引用、ID 冲突、价格、日窗、顺序、逐品质显示、合法子集、Day 10 可达性、行重排、canonical hash 以及 forged package fail-closed。

## Validation results

- PASS：22 个 original-pirate workbook 页与 `44..65` 对应 CSV 逐字一致。
- PASS：exporter 输出 root v14/runtimeBundle v12/catalogs v5/newRun v3/generation v3/Ghost snapshot v2，display 89 条。
- PASS：`tests/original_pirate_content_export.test.cjs` 7/7；包含 source/package forged、合法子集与 canonical hash 门禁。
- PASS：工作簿结构与可读版重建专项，以及旧 `HERO_SKILLS` 域回归。
