# 大巴扎式英雄耐久外层规则

task_id: 2026-08-28_run_health_outer_loop
status: DONE
owner: codex-root-20260828-run-health
branch: codex/bazaar-day1-day3-route

## Goal

把正式战败事件从“城堡扣线/经济衰减”切换为“英雄耐久按当前天数扣除”，供 Godot 外层单局规则导出使用。

## related_files

- `data/csv/04_mechanisms.csv`
- `data/csv/05_events.csv`
- `tasks/doing/2026-08-28_run_health_outer_loop.md`

## write_scopes

- `04_mechanisms.csv`: 仅修改 `M53/mech_castle_line_damage` 与 `M54/mech_economy_decay_on_fail` 两行，标明旧城堡扣线及失败经济衰减已被英雄耐久规则取代。
- `05_events.csv`: 仅修改 `evt_battle_fail` 行，改为战败按当前天数扣英雄耐久，移除经济衰减文案。

## exclusive_files

- none

## shared_file_policy

- 既有火种任务已完成；Godot 单机任务把 `05_events.csv` 声明为只读，不与本任务写入范围冲突。
- 当前 workbook 缺少 `04_mechanisms.csv` / `05_events.csv` 完整源表，沿用项目已知 CSV 主线并保留导出检查证据。

## validation

- `npm run data:export:check`
- Godot 内容导出与运行时专项
- `git diff --check`

## commit_plan

- message: `data: align battle failure with run health`
- auto_commit: 验证通过后精确暂存本任务 CSV 与任务卡，单独提交并推送当前上游。

## result

- `evt_battle_fail` 已改成战败按当前天数扣英雄耐久，保留安慰奖励语义且明确不降低经济倍率。
- `M53` 保留兼容 ID 并承载 `run_health=-day` 新语义；`M54` 保留兼容 ID 但正式标记为不再生效。
- Godot 内容导出成功：16 packages / 16 operations；运行时读取的新机制和事件文案已进入生成内容。
- `node tools/check_csv_data.cjs` 通过。
- `npm run data:export:check` 与 `npm run check:csv` 的 CSV08 仍被仓库既有 workbook 漂移阻断；漂移同时涉及 `01_pets.csv`、`02_monster_templates.csv`、`08_action_shapes.csv` 等非本任务文件，未为本任务重写总表或吸收并行 WIP。
