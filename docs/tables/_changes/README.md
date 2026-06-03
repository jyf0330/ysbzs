# 表格变更单系统

> 管理 docs/tables/ 下正式表格的变更：pending → 同步 → archive

## 目录结构

```
_changes/
├── README.md              ← 本文件
├── TEMPLATE_change.md     ← 变更单模板
├── SYNC_RULES.md          ← 同步规则（AI 工作流入口）
├── pending/               ← 待同步变更单（AI 会读）
├── archive/               ← 已同步变更单（AI 不读）
└── reports/               ← 同步报告（可追溯）
```

## 流程

1. **写变更单**：新增或修改表格规则时，先在 `pending/` 下创建变更单。
2. **说"同步内容"**：触发 AI 读取 `pending/` → 更新正式表格 → 生成报告 → 归档。
3. **验收入库**：确认同步正确，变更单移至 `archive/`，报告写入 `reports/`。

## 备注

- 不要在聊天中直接散落表格改动，应先写变更单。
- `archive/` 中的变更单 `status` 标记为 `applied`。
- 如需追溯历史变更，查 `reports/` 下的同步报告。
