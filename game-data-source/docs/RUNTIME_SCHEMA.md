# Runtime Schema 摘要

## pal_units.json

由 `game-data-source/tables/1_宠物总表_127_机制ID版_20260605.xlsx` 生成：

- `pal_master`：127 宠物主数据。
- `pal_stats_ysbzs`：HP/攻/防/盾/行动等数值。
- `unit_usage`：商店/敌方/奖励可用性。
- `action_template`：每宠 3 槽模板，当前同宠同品级默认 3 槽同形状。
- `action_growth`：每宠 3 槽 × 4 品级成长。

## shop_config.json

`shop_rule` 来自 YAML，`shop_source` 由 127 宠物表派生。

## monster_templates.json / monster_waves.json / mechanism_mapping.json

来自 `game-data-source/yaml/`，当前已生成 JSON，但旧战斗运行时还没有全部接线。
