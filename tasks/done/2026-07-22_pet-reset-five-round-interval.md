# 2026-07-22_pet-reset-five-round-interval

task_id: 2026-07-22_pet-reset-five-round-interval
type: balance-data
status: DONE
owner: Codex

## Goal

把正式双人战斗宠物重置次数改为每 5 回合获得 1 次：取消开局赠送，进入第 5、10 回合时双方各增加 1 次，未使用次数继续累计。

## related_files

- `xlsx/ysbzs_master.xlsx`
- `data/csv/31_battle_rules.csv`
- `tools/build_human_master.py`
- `tests/csv_source.test.cjs`
- `outputs/pet-reset-five-round-20260722/ysbzs_master.xlsx`
- `tasks/doing/2026-07-22_pet-reset-five-round-interval.md`
- `tasks/index.md`
- `/Users/ywh/Documents/godot-latest/tools/export_ysbzs_singleplayer_data.py`
- `/Users/ywh/Documents/godot-latest/data/ysbzs_singleplayer_data.json`

## write_scopes

- 总表 `MECHANICS_QUALITY` 增加 `31_battle_rules.csv` 策划分区，记录重置间隔 5 和初始次数 0。
- 导出链和 CSV 回归只覆盖新增战斗规则表。
- Godot 导出器把规则投影到 `battle.rules`。

## exclusive_files

- `xlsx/ysbzs_master.xlsx`
- `data/csv/31_battle_rules.csv`
- `tools/build_human_master.py` 的 `MECHANICS_QUALITY` 分区列表
- `tests/csv_source.test.cjs` 的 battle-rules 数据链断言
- Godot 导出器的 battle-rules 读取和 `battle.rules` 输出

## validation

- `npm run data:export`
- `npm run data:export:check`
- `npm run check:csv`
- artifact-tool 渲染并检查七张策划表。
- Godot 数据导出后断言 `pet_reset_charge_interval=5`、`pet_reset_initial_charges=0`。

## commit_plan

- 上游表格/CSV/导出链独立精确提交；不吸收现有浏览器、seed preview 或 manual-flow dirty 文件。

## validation_result

- PASS: `npm run data:export`、`data:export:check`、`check:csv`。
- PASS: 七张策划表 artifact-tool 渲染检查与公式错误扫描。
- PASS: Godot 快照读取间隔 `5`、初始次数 `0`。
