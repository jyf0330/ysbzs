# 01-09 数据接入说明

## 生成顺序

推荐脚本按以下顺序读取：

1. `01_宠物主表`
2. `04_机制词条库`
3. `02_怪物模板`
4. `08_形状行动槽`
5. `03_怪物波次`
6. `06_商店奖励池`
7. `05_事件主表`
8. `07_遗物祝福`
9. `09_跨表校验`

## 运行时生成建议

- `pal_units.json`：来自 01 + 02 + 08
- `monster_templates.json`：来自 02
- `monster_waves.json`：来自 03
- `mechanism_library.json`：来自 04 + `mechanism_rules_60.yaml`
- `shop_reward_pools.json`：来自 06 + `shop_reward_rules.yaml`
- `event_config.json`：来自 05 + `event_rules.yaml`
- `relic_blessing_config.json`：来自 07 + `relic_blessing_rules.yaml`

## 硬边界

- 不要让事件、遗物、商店各自写一套效果逻辑，都引用机制ID。
- 不要在波次表重复维护怪物名/元素/数值，最终从宠物ID/怪物模板派生。
- 不要把形状坐标塞进主表，坐标后续放 YAML。
- 脚本生成前先跑跨表校验，任何 FAIL 都不应进 runtime。
