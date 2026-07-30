# 2026-07-30_vanessa-369-pets-shops-enchantments

task_id: 2026-07-30_vanessa-369-pets-shops-enchantments
status: DONE
owner: Codex
branch: shared-worktree
done_at: 2026-07-30

## Goal

- 以 Vanessa 来源对象表为映射基线，把物品与技能统一设计成 369 只西游宠物。
- 仅保留前 30 家正式商店，并用来源商人/训练师重叠图压缩映射，确保每只宠物至少进入 8 家商店。
- 将青铜/白银/黄金/钻石、占格、攻击格数量和 13 类附魔写入策划总表并导出程序 CSV。

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
- `data/csv/32_pet_enchantments.csv`
- `tools/export_master_to_csv.py`
- `tests/csv_source.test.cjs`
- `tests/run_all_tests.cjs`
- `tasks/done/2026-07-30_vanessa-369-pets-shops-enchantments.md`

## write_scopes

- `xlsx/ysbzs_master.xlsx`: PETS、SHOP_STORES、SHOP_ITEMS、MECHANICS_QUALITY、SHAPES_TRIALS 及新增来源映射/附魔分区。
- `data/csv/*.csv`: 由 `npm run data:export` 生成的本任务宠物、商店、形状、品质、附魔数据分区。
- `tools/export_master_to_csv.py`: 新增附魔主表导出合同与 369 宠/前 30 店校验。
- `tests/csv_source.test.cjs`: 本任务新增的 369 宠、30 店、每宠至少 8 店、附魔导出断言。
- `tests/run_all_tests.cjs`: 将旧的 127 宠运行时表数量合同同步为正式 369 宠口径。
- `tasks/done/2026-07-30_vanessa-369-pets-shops-enchantments.md`: 本任务全过程记录。

## shared_file_policy

- 现有活动任务对上述 CSV 仅声明只读输入，未占用总表、导出器或相同数据合同；本任务作为该合同唯一写入 owner。
- 不修改现有浏览器核心、UI 或 `web/js/local-engine.js`，避免吸收其他活动任务的实现改动。

## exclusive_files

- `xlsx/ysbzs_master.xlsx`
- `tools/export_master_to_csv.py`
- `tests/csv_source.test.cjs`

## validation

- 使用 `@oai/artifact-tool` 渲染改前与改后总表并做公式错误扫描。
- `npm run data:export`
- `npm run data:export -- --check`
- `npm run check:csv`
- `node --test tests/csv_source.test.cjs`
- 统计断言：宠物 369、正式商店 30、每只宠物商店数至少 8、附魔类型 13。
- `git diff --check`

### result

- `@oai/artifact-tool` 最终重载检查通过；12 个正式工作表，`AUDIT` 全部 `PASS`，公式错误扫描为 0。
- `npm run data:export`：通过；导出正式 CSV。
- `npm run data:export -- --check`：通过。
- `node --test tests/csv_source.test.cjs`：15/15 通过。
- `node tests/run_all_tests.cjs`：67/67 通过；同步旧 127 宠总数、旧元素专店和旧固定宠物品质/形状断言到新的来源关系口径。
- `npm run check:csv`：通过；`pets=369`、`shopStores=30`、`shapes=369`。
- 数据审计：每宠物进入 8–10 家商店；每商店候选 23–362 只；13 类附魔；攻击格数覆盖 1/2/3。
- 来源审计：276 个对象来自可核对的 Vanessa 物品/技能静态源，缺少的 93 个按同一字段合同生成并明确标记为 `derived_gap_profile`，未冒充已确认来源。
- `git diff --check`：通过。

## commit_plan

- message: `data: design 369 bazaar-mapped pets and shops`
- 精确暂存本任务总表、导出器、生成 CSV、测试和任务卡；不吸收其他任务文件。
