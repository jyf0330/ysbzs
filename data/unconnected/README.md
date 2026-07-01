# Unconnected Data Sources

本目录存放当前不进入核心 runtime 数据链的旧配置、外部工具规格或候选数据。

## 已移入

- `config/ysbzs_v1_linked_rules.yaml`
  - 旧联动规则快照。
  - 当前核心 runtime 不读取；当前核心读取的是 `yaml/wave_rules_20260609.yaml`。
- `web-external-data/external-data/`
  - 旧网页外部数据、谜题投稿工具规格和表单字段。
  - 当前核心 runtime 不读取；后续如果谜题工具重新启用，再按新入口接回。

## 暂缓移动

- `data/csv/27_shape_catalog.csv`
- `data/csv/28_quality_growth.csv`
- `data/csv/29_quality_upgrades.csv`

这三张当前不在 `src/core/csvData.cjs` 的核心 runtime `TABLE_FILES` 里，但仍被总表导出、好读 workbook 和测试引用。等 exporter/readable workbook 边界重做时，再决定是接入 runtime、移入本目录，还是改成配置文件。
