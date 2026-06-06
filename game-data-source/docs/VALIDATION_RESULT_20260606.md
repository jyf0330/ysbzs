# 单一数据源项目验收结果 · 2026-06-06

验收口径：项目是可运行游戏项目，但数据真源只能是 `game-data-source/`。

## 已执行命令

```bash
rm -rf external-data
npm run data:rebuild
npm run data:validate
node test.js
node gpt_test.js
node playable_run.js
node playable_day1.js
```

## 结果

| 命令 | 结果 |
|---|---|
| `npm run data:rebuild` | 通过，从 `game-data-source/` 生成 `external-data/generated-json/` |
| `npm run data:validate` | 通过，127/180/720 关键数量正确 |
| `node test.js` | 514/514 通过 |
| `node gpt_test.js` | 465/465 通过 |
| `node playable_run.js` | PASS |
| `node playable_day1.js` | PASS |

## 数据来源边界

- 唯一真源：`game-data-source/`
- 表格入口：`game-data-source/tables/`
- YAML 入口：`game-data-source/yaml/`
- 说明入口：`game-data-source/docs/`
- 生成产物：`external-data/generated-json/`，不随包提供，可删除重建。

## 已清理

- 删除 `planner-data/`
- 删除旧 `external-data/source-yaml/`
- 删除旧 `external-tables.js`
- 删除旧外部表生成脚本
- 删除散落在 `docs/` 的 xlsx 数据文件
- 删除 `benchmarks/` 中旧测试 fixture 数据，避免形成第二套数据源

## 当前边界

`game-data-source/tables/04_机制词条库_策划管理版.xlsx` 当前缺原始源文件；本包只保留 `04_机制词条库_缺源说明.md`，机制映射当前由 `game-data-source/yaml/mechanism_mapping.yaml` 管理。
