# 2026-08-13_pet-base-stats-data-driven

task_id: 2026-08-13_pet-base-stats-data-driven
status: DONE
owner: codex-root-20260813
branch: shared-worktree
delivery_base_commit: 65a3cec

## Goal

把 369 宠的 HP / 攻 / 防 / 盾 / 行动力正式收束为品质、定位、体型驱动的策划规则；具体宠物基础数值只存在于 workbook / CSV 数据，不由运行时代码兜底生成。

## related_files

- `xlsx/ysbzs_master.xlsx`
- `data/csv/01_pets.csv`
- `data/csv/02_monster_templates.csv`
- `tools/export_master_to_csv.py`
- `src/core/csvData.cjs`
- `src/core/unitFactory.cjs`
- `src/core/waveSpawn.cjs`
- `tests/unit/pet_base_stats_data_driven.test.cjs`
- `tests/csv_source.test.cjs`
- `tasks/doing/2026-08-13_pet-base-stats-data-driven.md`

## write_scopes

- workbook: 新增基础数值规则表；PETS 的 hp/atk/def/shield/action 改为规则引用
- exporter: PETS.def 映射及五项基础数值完整性校验
- runtime loader/factory/wave: 删除宠物基础数值的静默数值兜底，缺失时 fail closed
- test: 369 宠规则一致性、完整性和生产代码无宠物面板默认值静态门禁
- workbook contract: 允许且校验独立的 `PET_STAT_RULES` 策划规则表

## exclusive_files

- `xlsx/ysbzs_master.xlsx`
- `data/csv/01_pets.csv`
- `data/csv/02_monster_templates.csv`

## existing_wip

- 开工时 ysbzs 工作树干净。
- 旧任务卡对 `unitFactory.cjs` / `csvData.cjs` 仅有历史 related/read 记录；当前没有未提交改动。若出现新的同接口写入，执行 `FILE_CONFLICT_STOP`。

## validation

- workbook 全表渲染、关键范围公式/值检查、公式错误扫描
- `npm run data:export:check` 与 `npm run data:export`
- `node --test tests/unit/pet_base_stats_data_driven.test.cjs`
- 相关数据加载与单位工厂测试
- `git diff --check`

## commit_plan

- message: `data: make pet base stats table-driven`
- auto_commit: 满足数据导出、专项测试和跨仓 Godot 接入验证后精确提交；不推送

## changes

- 新增 `PET_STAT_RULES`，以品质 × 定位 × 体型的 84 个组合统一生成 HP / 攻 / 防 / 盾 / 行动力。
- `PETS` 五项基础数值均为规则表公式结果；防御纳入正式导出，3 个历史表外防御例外归零。
- CSV 加载、单位工厂和敌方波次生成删除基础数值的数值兜底，缺字段或非数值时直接拒绝。

## validation_result

- workbook 14 个 sheet 全量渲染；`PETS`、`PET_STAT_RULES` 关键范围人工检查通过；公式错误扫描 0 项。
- `npm run data:export:check`：通过。
- `node --test tests/csv_source.test.cjs tests/unit/core_focused_battle.test.cjs tests/unit/pet_base_stats_data_driven.test.cjs`：26/26 通过。
- Godot 跨仓专项、通用属性、模块内容包 smoke：通过。
- `git diff --check`：通过。
- 扩展回归 `quality_tiers_factory.test.cjs` 的既有机制期望仍为 `mech_scale_with_allies`，当前数据为 `mech_fire_ignite_bonus`；与本任务五项基础数值无关，未修改该基线。

## residual_risk

- 本轮统一的是基础面板，不改变技能、机制或成长倍率；后续平衡仍应修改规则表或策划数据，不在代码添加宠物数值。
