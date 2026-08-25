# 第一套火种地形宠物正式映射

task_id: 2026-08-25_fire_terrain_pet_plugins
status: DONE
owner: codex-root-20260825-fire-terrain-pets
branch: codex/bazaar-day1-day3-route

## Goal

把第一套七宠从占位机制改为玩家可理解的火种地形联动，并把七个稳定机制 ID 写入正式 workbook；火种只描述地形层，所有伤害仍由 Godot 回合末统一结算。

## related_files

- `xlsx/ysbzs_master.xlsx`
- `data/csv/01_pets.csv`
- `data/csv/02_monster_templates.csv`
- `data/csv/03_monster_waves.csv`
- `data/csv/04_mechanisms.csv`
- `data/csv/06_shop_rewards.csv`
- `data/csv/08_action_shapes.csv`
- `src/core/mechanics.cjs`
- `src/core/petPlugins/*.cjs`
- `tests/unit/fire_terrain_pet_plugins.test.cjs`
- `tasks/doing/2026-08-25_fire_terrain_pet_plugins.md`

## write_scopes

- `PETS` / `01_pets.csv`: 只修改 `pal_005/007/009/012/014/017/019` 的元素、副属、定位、机制 ID、标签与玩家说明；不改已确认基础面板、身体体型和攻击形状
- `MECHANISMS` / `04_mechanisms.csv`: 新增七个一宠一机制的正式定义、默认参数、玩家效果和日志模板
- `02_monster_templates.csv`、`03_monster_waves.csv`、`06_shop_rewards.csv`、`08_action_shapes.csv`: 仅接收上述七宠与七机制通过 workbook 公式产生的派生变化
- `src/core/petPlugins/*.cjs`: 与 Godot 使用相同机制 ID 的纯函数模拟插件；每宠一个文件，只产生地形补丁、结算投影、移动意图或奖励增量
- `src/core/mechanics.cjs`: 只从宠物插件注册表合入机制可执行状态，不承载七宠分支
- `tests/unit/fire_terrain_pet_plugins.test.cjs`: 锁定七插件注册、地形写入、延迟结算与经济/位移合同

## exclusive_files

- `xlsx/ysbzs_master.xlsx`
- `data/csv/01_pets.csv`
- `data/csv/02_monster_templates.csv`
- `data/csv/03_monster_waves.csv`
- `data/csv/04_mechanisms.csv`
- `data/csv/06_shop_rewards.csv`
- `data/csv/08_action_shapes.csv`
- `src/core/mechanics.cjs`
- `src/core/petPlugins/registry.cjs`
- `src/core/petPlugins/pet_pal_005_red_tail_fox.cjs`
- `src/core/petPlugins/pet_pal_007_thunder_whisker_cat.cjs`
- `src/core/petPlugins/pet_pal_009_fire_antler_deer.cjs`
- `src/core/petPlugins/pet_pal_012_electric_quill_mouse.cjs`
- `src/core/petPlugins/pet_pal_014_money_raccoon.cjs`
- `src/core/petPlugins/pet_pal_017_black_horn_rhino.cjs`
- `src/core/petPlugins/pet_pal_019_night_burrow_mole.cjs`
- `tests/unit/fire_terrain_pet_plugins.test.cjs`

## existing_wip

- 前20形状基础数值任务已为 `DONE` 并提交；本任务保留其 8/20、5/22、4/18 面板结果
- 开工时仓库只有既有 `outputs/**` 未跟踪交付物，正式 workbook 与 CSV 工作树干净

## validation

- 使用 artifact-tool 检查、编辑、公式错误扫描并渲染正式 workbook
- `npm run data:export:check` / `npm run data:export`
- CSV 来源、宠物基础面板与聚焦战斗测试
- 七宠字段、七机制 ID、玩家效果文本和 `pal_001..020` 面板不回退的结构化核对
- `git diff --check`

## commit_plan

- message: `data: define first fire terrain pet system`
- auto_commit: 验证通过后精确暂存本任务文件、提交并推送当前上游

## result

- `pal_005/007/009/012/014/017/019` 已映射到七个稳定的独立宠物机制 ID；保留前20按攻击命中格数确定的 `8/20、5/22、4/18` 攻血以及防御/护盾为0。
- 正式机制表新增 `M61..M67`；火种效果文本统一声明为地形层，并由 Godot 全员攻击后的元素阶段统一结算。
- workbook 通过 artifact-tool 公式错误扫描（0 项）和 PETS/MECHANICS_QUALITY 渲染核对；交付副本为 `outputs/2026-08-25-fire-terrain-pets/ysbzs_master.xlsx`。
- `npm run data:export:check`：PASS。
- `node --test tests/csv_source.test.cjs tests/unit/core_focused_battle.test.cjs tests/unit/pet_base_stats_data_driven.test.cjs`：26/26 PASS。
- 结构化核对：`FIRE_TERRAIN_FORMAL_DATA_OK pets=7 first20_stats=20`。
- `git diff --check`：PASS。
- 七个上游纯函数插件与注册表已接入，保证策划模拟器和 Godot 使用同一组机制 ID；`node --test tests/unit/fire_terrain_pet_plugins.test.cjs`：3/3 PASS。
