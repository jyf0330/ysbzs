# 只改这里：游戏数据唯一真源

这个文件夹是《元素背包史 / ysbzs》当前唯一数据来源。

项目代码、测试、UI 可以保留在外面；但所有策划数据只能从这里进入运行时。

## 你日常管理的内容

- `tables/`：策划表，一行一条对象，适合人看、人改。
- `yaml/`：程序规则、坐标、公式、枚举、兼容数据，脚本读取这里生成 JSON。
- `docs/`：字段解释、接入说明、缺口报告、验收规则。

## 不要改哪里

- 不要手改 `external-data/`。它是生成产物，可以删除。
- 不要在代码里直接写宠物、怪物、事件、商店、机制数据。
- 不要把旧表散落到 `docs/` 或项目根目录。

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

## 当前正式表

1. `tables/01_宠物主表_127_策划管理版.xlsx`
2. `tables/02_怪物模板表_策划管理版.xlsx`
3. `tables/03_怪物波次表_策划管理版.xlsx`
4. `tables/05_事件主表_策划管理版.xlsx`
5. `tables/06_商店奖励池表_策划管理版.xlsx`

机制词条当前以 `yaml/mechanism_mapping.yaml` 管理；原始 `1_机制词条库_魔塔尖塔可计算版_20260605.xlsx` 本包内没有提供，后续拿到后再放入 `tables/04_机制词条库_策划管理版.xlsx`。
