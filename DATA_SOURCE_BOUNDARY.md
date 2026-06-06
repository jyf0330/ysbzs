# 数据来源边界

本项目是可运行游戏项目，数据真源只有一个文件夹：`game-data-source/`。

## 真源目录结构

```
game-data-source/
├── yaml/                           # YAML 源数据（42 个文件）
│   ├── pal_units.yml               # 宠物主表（127）
│   ├── shop_config.yml              # 商店配置
│   ├── encounter_config.yml         # 遭遇战配置
│   ├── hero_config.yml             # 英雄配置
│   ├── battle_config.yml           # 战斗参数
│   ├── game_config.yml             # 游戏配置
│   ├── round_config.yml            # 回合配置
│   ├── terrain_config.yml          # 地形配置
│   ├── relic_config.yml            # 遗物配置
│   ├── event_config.yml            # 事件配置
│   ├── action-slots/               # 行动槽模板 + 成长（180+720）
│   ├── attack-shapes/              # 攻击形状（22+188+22）
│   ├── bazaar-like-schema/         # Bazaar 规则集（20+）
│   └── runtime-static/             # 运行时补丁（4 JSON，无 YAML 源）
├── tables/                         # 策划可编辑的 xlsx（5 个）
├── docs/                           # 管线说明文档
└── README_只改这里.md
```

## 运行原则

- **`external-data/` 是纯生成产物**，可随时删除后通过 `npm run data:rebuild` 重建。
- 运行时代码（`externalDataAdapter.js`）只读 `external-data/generated-json/`。
- 运行时代码**禁止直接读取 xlsx 或 yaml**。
- `game-data-source/` 是唯一人工维护的数据真源。

## 验收命令

```bash
rm -rf external-data
npm run data:rebuild
npm run data:validate
node test.js
node gpt_test.js
node playable_run.js
node playable_day1.js
```
