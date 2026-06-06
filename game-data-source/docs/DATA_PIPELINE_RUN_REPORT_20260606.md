# 数据管线落地运行报告（2026-06-06）

## 已完成

- 新增 `game-data-source/` 作为唯一人工维护源目录。
- `external-data/` 调整为生成产物目录，可删除后重建。
- 新增 `npm run data:rebuild`：从 `game-data-source/yaml` 与 `game-data-source/tables` 重建 `external-data/generated-json`。
- 新增 `npm run data:validate`：校验 YAML、关键 JSON、127/180/720 关键数量。
- 修正浏览器加载逻辑：优先加载 `external-data/generated-json`，`external-data/generated-json` 是唯一运行时生成产物。
- `gpt_test.js` 中 Bazaar-like 真源路径已从 `game-data-source/yaml` 改为 `game-data-source/yaml`。

## 当前兼容口径

- `pal_master` 与 `pal_stats_ysbzs`：127 行，来自 `game-data-source/tables/1_宠物总表_127_机制ID版_20260605.xlsx`。
- `action_template_enriched`：保留 180 行，兼容当前旧运行时与测试。
- `action_growth_enriched`：保留 720 行，兼容当前旧运行时与测试。
- `shop_source` / `unit_usage`：保留 60 行正式运行池，避免 61-127 号宠物因未接完整行动槽导致运行时空 slot。
- 怪物模板、怪物波次、事件、机制映射已进入 `game-data-source/yaml` 并生成 JSON；旧战斗链尚未完全接这些新表。

## 已实跑命令

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

- `npm run data:rebuild`：通过；生成 `pal_master=127`、`action_template=180`、`action_growth=720`。
- `npm run data:validate`：通过。
- `node test.js`：514/514 通过。
- `node gpt_test.js`：465/465 通过。
- `node playable_run.js`：PASS。
- `node playable_day1.js`：PASS。

## 后续真正要补的缺口

下一轮如果要让 127 个宠物全部正式进入商店/敌方/奖励运行池，需要同步扩展：

1. 127 宠物的正式 action_template / action_growth，而不是继续用旧 60 宠物 180/720 行。
2. 更新旧测试中对 180/720、shop_source=60、unit_usage=60 的兼容口径。
3. 给 61-127 号宠物补完整 3 槽行为、形状、技能效果和机制 resolver。
4. 把 `monster_templates.json` / `monster_waves.json` 接入 `waves.js` 正式逐回合出怪链。
5. 把 `event_config_new_20260605.json` 与 `mechanism_mapping.json` 接入事件/奖励/战斗效果解析器。
