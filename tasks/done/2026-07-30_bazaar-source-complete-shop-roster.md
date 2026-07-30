# 2026-07-30_bazaar-source-complete-shop-roster

task_id: 2026-07-30_bazaar-source-complete-shop-roster
status: DONE
owner: Codex
branch: shared-worktree
done_at: 2026-07-30

## Goal

- 按当前 Vanessa 来源目录补全 369 个对象：138 个普通物品、93 个商人包、138 个技能全部一对一转为宠物。
- 删除“每宠至少 8 店”的人工补齐，改成来源商人 / 训练师 / 商人包归属的真实交叉关系。
- 保留前 30 个西游地点，把来源节点作为地点内独立摊位，补全前三天开放、货架数、刷新数和 13 类附魔设计。

## related_files

- `xlsx/ysbzs_master.xlsx`
- `data/csv/01_pets.csv`
- `data/csv/02_monster_templates.csv`
- `data/csv/03_monster_waves.csv`
- `data/csv/04_mechanisms.csv`
- `data/csv/06_shop_rewards.csv`
- `data/csv/08_action_shapes.csv`
- `data/csv/27_shape_catalog.csv`
- `data/csv/28_quality_growth.csv`
- `data/csv/29_quality_upgrades.csv`
- `data/csv/30_shop_stores.csv`
- `data/csv/32_enchantment_types.csv`
- `data/csv/33_pet_enchantments.csv`
- `data/csv/34_bazaar_objects.csv`
- `data/csv/35_bazaar_shop_mapping.csv`
- `tools/export_master_to_csv.py`
- `tests/csv_source.test.cjs`
- `tests/run_all_tests.cjs`
- `tasks/doing/2026-07-30_bazaar-source-complete-shop-roster.md`
- `tasks/index.md`

## write_scopes

- `xlsx/ysbzs_master.xlsx`: PETS、SHOP_STORES、SHOP_ITEMS、BAZAAR_OBJECTS、SHOP_MAPPING、ENCHANTMENTS、PET_ENCHANTMENTS、README、AUDIT。
- `data/csv/*.csv`: 由本任务总表通过 `npm run data:export` 生成的宠物、商店、来源、品质、形状与附魔分区。
- `tools/export_master_to_csv.py`: 将旧的每宠至少 8 店合同改为来源关系、商人包和独立摊位合同。
- `tests/csv_source.test.cjs`: 369 对象分解、来源关系、前三天开放、商人包和 13 类附魔断言。
- `tests/run_all_tests.cjs`: 仅同步受新来源商店关系影响的运行时断言。
- `tasks/doing/2026-07-30_bazaar-source-complete-shop-roster.md`: 本任务记录。
- `tasks/index.md`: 按真实任务目录刷新本任务状态。

## shared_file_policy

- 现有活动任务只读消费商店 CSV，未占用总表、导出器、来源目录或同一数据合同；本任务是这些数据合同的唯一写入 owner。
- 不修改浏览器 UI、核心商店流程或本地 bundle；只更新策划真相源、导出合同和生成物。

## exclusive_files

- `xlsx/ysbzs_master.xlsx`
- `tools/export_master_to_csv.py`
- `tests/csv_source.test.cjs`

## validation

- `@oai/artifact-tool` 改前/改后渲染与公式错误扫描。
- `npm run data:export`
- `npm run data:export -- --check`
- `node --test tests/csv_source.test.cjs`
- `node tests/run_all_tests.cjs`
- `npm run check:csv`
- 数据审计：369 = 138 普通物品 + 93 商人包 + 138 技能；30 地点 / 56 来源摊位；来源关系无人工补齐；13 类附魔；前三天摊位和货架规则完整。
- `git diff --check`

## result

- `@oai/artifact-tool` 改前/改后渲染通过；最终 `AUDIT` 13/13 `PASS`，公式错误扫描 0。
- 正式对象分解为 `138 item + 93 merchant_package + 138 skill = 369`；全部 `confirmed`，无 `derived_gap_profile`。
- 93 个商人包逐卡保留 BazaarDB card id、来源 URL、品质和占格；占格 `Large=30 / Medium=32 / Small=31`，品质 `bronze=30 / silver=46 / gold=17`。
- 30 个西游地点承接 56 个独立来源摊位；每个对象保留 `source_stall_ids` 与 `local_shop_ids`，不再人工补足 8 店。
- Day1 开放 Aila、Ande、Barkun、Curio、Jay Jay、Kina、Midsworth、Valpak、Nufu 共 9 摊；Day2/3 为 10 摊。普通摊 3 格/1 刷，Curio 10 格/1 刷。
- 所有 30 个地点按真实关系自然拥有至少 9 个候选；单宠来源地点数为 1–10。
- `npm run data:export`、`npm run data:export -- --check`、`node --test tests/csv_source.test.cjs`（15/15）、`node tests/run_all_tests.cjs`（67/67）、`npm run check:csv`、`git diff --check` 全部通过。

## collaboration

- lead_scope: 总表、来源关系、商人包、前三天摊位、CSV 合同与回归。
- specialist_input: 无。
- tester_pass: 无，纯数据与表格任务；使用 workbook render、公式扫描、CSV/运行时测试替代。
- external_ai_input: 无。
- lead_decision: 取消每宠至少 8 店；以来源摊位为精确关系，30 个西游商店仅作为地点容器，地点内摊位独立抽取。

## commit_plan

- message: `data: complete source-based bazaar pet shops`
- 精确暂存本任务总表、导出器、生成 CSV、测试、任务卡与索引，不吸收其他任务文件。
