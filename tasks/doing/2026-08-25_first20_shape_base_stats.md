# 前20只宠物攻击形状基础数值试改

task_id: 2026-08-25_first20_shape_base_stats
status: DONE
owner: codex-root-20260825-first20-shape-stats
branch: codex/bazaar-day1-day3-route

## Goal

按用户确认的攻击命中格模板试改 `pal_001..pal_020`：一格 8攻/20生命、二格 5攻/22生命、三格 4攻/18生命，防御与初始护盾归零；不改变身体体型、形状、技能、机制、行动力或后续宠物。

## related_files

- `xlsx/ysbzs_master.xlsx`
- `data/csv/01_pets.csv`
- `data/csv/02_monster_templates.csv`
- `data/csv/03_monster_waves.csv`
- `tasks/doing/2026-08-25_first20_shape_base_stats.md`

## write_scopes

- `PETS`: 只修改 `pal_001..pal_020` 的 HP、攻、防、盾；行动力保持原值
- `01_pets.csv`: 同20行基础面板及派生效果分
- `02_monster_templates.csv`: 同20行敌方模板面板及派生面板分
- `03_monster_waves.csv`: 因候选池平均效果分变化而重算的波次威胁派生列

## exclusive_files

- `xlsx/ysbzs_master.xlsx`
- `data/csv/01_pets.csv`
- `data/csv/02_monster_templates.csv`
- `data/csv/03_monster_waves.csv`

## validation

- workbook 修改前后关键范围检查、公式错误扫描与 PETS 可见渲染
- `npm run data:export:check`
- `npm run data:export`
- `node --test tests/unit/pet_base_stats_data_driven.test.cjs`
- 前20只逐项结构化核对；`pal_021..pal_369` 基础面板不变
- `git diff --check`

## commit_plan

- message: `data: test shape stats on first twenty pets`
- auto_commit: 验证通过后精确暂存本任务文件、提交并推送当前上游

## collaboration

- lead_scope: 正式表、CSV、跨仓 Godot 内容导出和最终验证
- specialist_input: 数值、形状和主策三组只读会审；首测三格攻击采用4
- tester_pass: 非玩家正式 UI；使用 workbook 渲染与语义专项验证
- lead_decision: 保持数据真相源链路，不直接手改 CSV 或 Godot JSON

## Result

- 2026-08-25：PETS 前20行已按攻击命中格写入；分布为一格4只、二格11只、三格5只，行动力保留，`pal_021` 起继续使用既有公式。
- workbook 前后均已渲染检查；公式错误扫描为0，交付副本位于 `outputs/2026-08-25-first20-shape-stats/ysbzs_master.xlsx`。
- `npm run data:export:check`：PASS。
- `node --test tests/csv_source.test.cjs tests/unit/core_focused_battle.test.cjs tests/unit/pet_base_stats_data_driven.test.cjs`：26/26 PASS。
- `git diff --check`：交付前复核。
