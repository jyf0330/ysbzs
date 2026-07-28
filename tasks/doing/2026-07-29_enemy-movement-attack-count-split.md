# 2026-07-29_enemy-movement-attack-count-split

task_id: 2026-07-29_enemy-movement-attack-count-split
status: ACTIVE_IMPL
owner: Codex
branch: shared-worktree

## Goal

在策划总表和怪物模板 CSV 中把敌方移动力与攻击次数拆成两个独立字段，并保持现有数值迁移兼容。

## related_files

- `xlsx/ysbzs_master.xlsx`
- `tools/build_human_master.py`
- `tools/export_master_to_csv.py`
- `data/csv/02_monster_templates.csv`
- `tests/csv_source.test.cjs`
- `tasks/doing/2026-07-29_enemy-movement-attack-count-split.md`
- `tasks/index.md`

## write_scopes

- `xlsx/ysbzs_master.xlsx` / `PETS`: 新增 `enemy_move_range`、`enemy_attack_count` 两列；移动力沿用现有 `action`，攻击次数按既有 3 个行动槽上限迁移，保持当前实际攻击效果。
- `tools/build_human_master.py`: 重建人类策划总表时保留两列。
- `tools/export_master_to_csv.py`: 把两列导出为 `02_monster_templates.csv` 的 `移动力`、`攻击次数`，不改变玩家宠物 `行动` 字段。
- `data/csv/02_monster_templates.csv`: 由总表导出新增字段。
- `tests/csv_source.test.cjs`: 固定总表与怪物模板的新字段契约。
- 任务卡与索引：记录租约、验证和提交边界。

## exclusive_files

- `xlsx/ysbzs_master.xlsx`
- `tools/export_master_to_csv.py` 的 PETS -> `02_monster_templates.csv` 导出合同

## validation

- `npm run data:export`
- `npm run check:csv`
- 核对 `02_monster_templates.csv` 每行都有独立 `移动力`、`攻击次数`。
- 用 artifact-tool 检查并渲染 `PETS` 新列，确认格式与可读性。

## validation_results

- artifact-tool 已在 `PETS` 追加 `enemy_move_range`、`enemy_attack_count`，保留原表样式；公式错误扫描为 0，渲染图 `/tmp/codex-enemy-action-split/pets-after.png` 已人工核对。
- `npm run data:export`：通过，从总表导出 32 张 CSV。
- `npm run check:csv`：14/14 Node 测试通过，CSV 跨表校验通过。
- `02_monster_templates.csv` 34 行均有独立字段；迁移口径为移动力沿用原 `行动`，攻击次数不超过既有 3 个行动槽。例如 `pal_006` 为移动力 4 / 攻击次数 3，`pal_005` 为移动力 5 / 攻击次数 3。

## commit_plan

验证通过后精确暂存本任务总表、导出器、CSV、测试、任务卡和索引并提交；不吸收其他历史 doing 任务文件。
