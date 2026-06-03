# 表格同步规则

> AI 在收到"同步内容"指令时按此规则执行。

## 触发口令

当用户说 **"同步内容"** 时，进入表格同步模式（参见 `docs/02_CURRENT_WORKFLOW.md`）。

## 同步流程

```
1. 读取 pending/ 下所有 status = pending 的变更单
2. 汇总 affected_tables，检查冲突
3. 无冲突 → 按变更单顺序更新正式表格
4. 生成同步报告到 reports/（文件名：YYYY-MM-DD_HH-mm_sync-report.md）
5. 将已处理变更单移动到 archive/（文件名保留原 pending 名称）
6. 归档后的变更单 status → applied，并填写 applied_at = YYYY-MM-DD HH:mm
7. 检查旧口径残留
8. 汇报本次同步：内容、影响表格、归档文件、残留风险
```

## 变更单生命周期

```
pending（待同步，必须记录 created_at）
  →（AI 读取并执行）
  → applied（归档至 archive/，必须记录 applied_at）
```

## 时间精度规则

所有变更单和同步报告中的时间字段，**必须精确到分钟**（格式：`YYYY-MM-DD HH:mm`）。

| 字段 | 填写时机 | 格式 |
|------|----------|------|
| `created_at` | 创建变更单时 | `YYYY-MM-DD HH:mm` |
| `applied_at` | 归档变更单时 | `YYYY-MM-DD HH:mm` |
| 报告文件名 | 生成报告时 | `YYYY-MM-DD_HH-mm_sync-report.md` |
| 报告正文 `generated_at` | 生成报告时 | `YYYY-MM-DD HH:mm` |

禁止使用只有日期的格式（如 `YYYY-MM-DD`）作为新规范。

## 冲突处理规则

| 冲突类型 | 处理方式 |
|----------|----------|
| 两个变更单修改同一表格的同一行/段 | 报冲突，暂停同步，请用户裁决 |
| 变更单引用的表格文件不存在 | 报错，跳过该变更单 |
| 变更单格式不符合模板（缺必填字段） | 报错，跳过该变更单 |
| 变更单之间的变更内容无重叠 | 按文件名排序，逐个执行 |

## 归档规则

- 归档时变更单的 `status` 字段从 `pending` 改为 `applied`，并填写 `applied_at`。
- 归档文件名保留原 pending 中的文件名不变。
- 同步报告文件名格式：`YYYY-MM-DD_HH-mm_sync-report.md`。
- `archive/` 和 `reports/` 中的内容不作当前规则，AI 不主动读取。
- 如需追溯历史变更，用户可指定查看某份同步报告。

## 旧口径检查

每次同步完成后，额外执行一次旧口径扫描：

```bash
grep -r "最高 lv3\|lv3 最高" docs/ --include="*.md"
```

如有命中，在同步报告中列出残留风险。
