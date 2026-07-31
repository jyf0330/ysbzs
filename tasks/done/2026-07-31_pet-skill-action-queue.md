# 2026-07-31_pet-skill-action-queue

task_id: 2026-07-31_pet-skill-action-queue
type: planner-data
status: DONE
owner: Codex
branch: codex/bazaar-day1-day3-route

## Goal

为正式 Godot 技能行动条提供上游策划真相：每只宠物默认拥有 8 个可排序技能；首版技能均由“物理伤害 + 铺 1 层元素”组成。

## related_files

- `xlsx/ysbzs_master.xlsx`
- `data/csv/01_pets.csv`
- `data/csv/36_skill_catalog.csv`
- `tools/export_master_to_csv.py`
- `tools/build_human_master.py`
- `tests/csv_source.test.cjs`
- `tasks/doing/2026-07-31_pet-skill-action-queue.md`
- `tasks/index.md`

## write_scopes

- `PETS.skill_ids` / `01_pets.csv.技能序列`：声明每宠 8 技能的默认顺序。
- `SHAPES_TRIALS` 中 `36_skill_catalog.csv` 区段：维护 8 个基础技能 Type Object。
- exporter / rebuild：把新字段与技能目录稳定导出，不手改下游 CSV 形成第二真相源。
- tests：校验 369 宠均恰有 8 个已注册且唯一的技能 ID。

## exclusive_files

- `xlsx/ysbzs_master.xlsx` 的 `PETS.skill_ids` 列与 `SHAPES_TRIALS/36_skill_catalog.csv` 区段
- `data/csv/36_skill_catalog.csv`
- `tools/export_master_to_csv.py` 的技能目录导出
- `tools/build_human_master.py` 的技能表重建

## shared_file_policy

- 现有 READY/BLOCKED 任务只读引用总表或 CSV，没有占用上述字段、区段和导出语义。
- 不修改浏览器战斗规则或 UI；本任务只提供 Godot 正式数据链所需的上游策划数据。

## validation

- Artifact Tool inspect + render：修改前后检查 `PETS` 与 `SHAPES_TRIALS`。
- `npm run data:export`
- `node --test tests/csv_source.test.cjs`
- `npm run check:csv`
- `git diff --check`

## validation_result

- PASS：`npm run data:export`，从总表导出 37 个 CSV 表。
- PASS：`node --test tests/csv_source.test.cjs`，16/16。
- PASS：`npm run check:csv`，369 宠、8 技能目录与跨表数据校验通过。
- PASS：`git diff --check`。
- PASS：正式 Godot 项目代码与 UI 已消费本链路，显式视觉变更门禁已通过。

## commit_plan

精确暂存本任务总表、CSV、导出器、测试与任务卡并提交，不吸收其他 READY/BLOCKED 任务文件。
