# 2026-07-31_generic-pet-attribute-data

task_id: 2026-07-31_generic-pet-attribute-data
status: DONE
owner: Codex

## Goal

为正式 Godot 通用宠物属性系统提供唯一策划真相源：在 `ysbzs_master.xlsx` 中增加属性目录、状态目录和通用特性修饰定义，导出完整 CSV，并保持 369 宠与现有技能/特性数据无损。

## related_files

- `xlsx/ysbzs_master.xlsx`
- `data/csv/01_pets.csv`
- `data/csv/37_trait_catalog.csv`
- `data/csv/39_stat_catalog.csv`
- `data/csv/40_status_catalog.csv`
- `tools/export_master_to_csv.py`
- `tools/build_human_master.py`
- `tests/csv_source.test.cjs`
- `tasks/index.md`
- `tasks/done/2026-07-31_generic-pet-attribute-data.md`

## write_scopes

- `xlsx/ysbzs_master.xlsx`: 新增 `ATTRIBUTES_EFFECTS` 可见策划域，承载 39/40 CSV；保留既有样式、公式、工作表和全部宠物数据。
- `37_trait_catalog.csv`: 仅把现有四个特性 effects JSON 升级为通用 modifier schema，保留 ID、名称与数值语义。
- `39_stat_catalog.csv`: 新增几十种稳定 stat ID、值类型、默认值、上下限、显示与叠加规则。
- `40_status_catalog.csv`: 新增数据驱动状态定义，effects JSON 只使用白名单操作。
- 导出器/测试：让新增表纳入 workbook→CSV 无损导出和引用校验。

## exclusive_files

- `xlsx/ysbzs_master.xlsx` 的 `ATTRIBUTES_EFFECTS` 分区
- `data/csv/39_stat_catalog.csv`
- `data/csv/40_status_catalog.csv`

## shared_file_policy

- 既有任务没有独占上述分区与新 CSV；`tasks/index.md` 是维护索引，旧卡声明不阻止刷新。
- 本任务不修改浏览器核心/UI，不重建 `web/js/local-engine.js`。

## validation

- `npm run data:export`
- `node --test tests/csv_source.test.cjs`
- `npm run check:csv`
- artifact-tool inspect、公式错误扫描与新增策划域可见渲染。
- `git diff --check`

## commit_plan

数据验证与工作簿可见检查通过后，精确暂存 workbook、39/40 CSV、37 特性目录、导出器、测试和任务卡；不吸收其他任务文件。

## result

- 总表新增可见 `ATTRIBUTES_EFFECTS` 域，完整承载 47 个属性与 8 个状态，并把 4 个特性升级为通用 modifier。
- `npm run data:export` 与 `npm run check:csv` 通过，CSV 测试 18/18 通过。
- artifact-tool 公式错误扫描为 0；新增属性/状态域与更新后的特性表已渲染并人工核对。
