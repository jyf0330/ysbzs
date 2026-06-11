# 2026-06-11_puzzle_submission_tool_spec

## 基本信息

- task_id: `2026-06-11_puzzle_submission_tool_spec`
- 类型: 策划数据 / UI 规格 / 投稿工具资料包
- 目标: 为玩家谜题投稿工具产出可读表、机器可读 YAML、产品说明 MD，不改运行时代码。

## related_files

- `tasks/doing/当前任务.md`
- `tasks/index.md`
- `web/external-data/puzzle-submission-tool/puzzle_submission_tool_fields.xlsx`
- `web/external-data/puzzle-submission-tool/puzzle_submission_tool_fields.csv`
- `web/external-data/puzzle-submission-tool/puzzle_submission_tool_schema.yaml`
- `web/external-data/puzzle-submission-tool/puzzle_submission_tool_design.md`

## 边界

- 本任务只做新页面/投稿工具的规格和数据结构资料包。
- 不修改 `src/`、`web/js/`、`data/csv/`、`xlsx/ysbzs_master.xlsx`。
- 不接入运行时导入逻辑，不创建真实可访问页面。

## 验证命令

```bash
python3 - <<'PY'
import csv
from pathlib import Path
import yaml
from openpyxl import load_workbook

root = Path("web/external-data/puzzle-submission-tool")
with (root / "puzzle_submission_tool_schema.yaml").open("r", encoding="utf-8") as f:
    data = yaml.safe_load(f)
assert data["tool"]["id"] == "puzzle_submission_tool"
assert data["puzzle_schema"]["board"]["rows"] == 8
assert data["puzzle_schema"]["board"]["cols"] == 8

with (root / "puzzle_submission_tool_fields.csv").open("r", encoding="utf-8-sig") as f:
    rows = list(csv.DictReader(f))
assert len(rows) >= 30
assert {"区域", "字段ID", "玩家看到的字段", "数据类型", "必填", "校验规则"}.issubset(rows[0].keys())

wb = load_workbook(root / "puzzle_submission_tool_fields.xlsx", read_only=True)
assert {"字段总表", "胜利条件模板", "导出结构", "AI整理流程"}.issubset(set(wb.sheetnames))
PY
```

## commit_plan

- message: `docs: add puzzle submission tool spec bundle`
- auto_commit: `no_runtime_code_change`

## 执行记录

- 2026-06-11: 创建任务卡，占用资料包相关文件。
- 2026-06-11: 已产出投稿工具字段表、YAML schema、设计说明 MD。
- 2026-06-11: 验证通过：YAML 可解析，CSV 共 43 行字段，xlsx 包含 `字段总表`、`胜利条件模板`、`导出结构`、`AI整理流程` 四张表。

## 验证结果

- `python3` 结构校验：通过。
- `git diff --check`：通过。
- 未运行 `node tests/run_all_tests.cjs`：本轮只新增规格/资料包，不修改运行时代码或现有数据导出链路。

## 提交状态

- 未自动提交：本轮不是代码或功能行为修改，`commit_plan.auto_commit` 标记为 `no_runtime_code_change`。
