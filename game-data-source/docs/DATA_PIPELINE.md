# 元素背包史数据管线

目标：`game-data-source/` 是唯一人工维护源，`external-data/` 是生成产物目录，可删除后通过脚本重建。

## 目录

- `game-data-source/tables/`：策划好读表，包含宠物、怪物、波次、事件、机制映射相关 xlsx。
- `game-data-source/yaml/`：程序规则源，包含战斗、商店、形状、Bazaar-like schema、怪物/事件/机制补充 YAML。
- `game-data-source/docs/`：字段说明、接入说明、缺口报告。
- `external-data/generated-json/`：运行时代码读取的 JSON，禁止手改。

## 一键重建

```bash
rm -rf external-data
npm run data:rebuild
npm run data:validate
npm test
node gpt_test.js
node playable_run.js
node playable_day1.js
```

运行时代码只读 `external-data/generated-json/`。浏览器中 `index.html` 会优先加载 generated-json，`external-data/generated-json` 是唯一运行时生成产物。
