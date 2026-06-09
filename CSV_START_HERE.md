# CSV 数据真源版 · 从这里开始

本包已经把 01-09 全数据表拆成 CSV，并让程序默认优先读取 `data/csv/*.csv`。

## 你以后怎么改

- 改宠物属性：`data/csv/01_pets.csv`
- 改怪物属性：`data/csv/02_monster_templates.csv`
- 改敌方第几天第几回合出怪：`data/csv/03_monster_waves.csv`
  - 旧写法：`宠物ID=pal_001`、`数量=1`。
  - 新写法：`宠物池-数量=1,2,3,4,5-2`、`品质权重=90,10,0,1`，程序会转成 `pal_XXX` 并按权重实时计算威胁分。
- 改机制 ID / 机制说明：`data/csv/04_mechanisms.csv`
- 改商店事件：`data/csv/05_events.csv`
- 改商店商品、价格、权重、解锁日：`data/csv/06_shop_rewards.csv`
- 改遗物/祝福：`data/csv/07_relic_blessings.csv`
- 改行动槽/形状/元素槽：`data/csv/08_action_shapes.csv`
- 改我方初始阵容和站位：`data/csv/10_initial_roster.csv`

## 生效方式

1. 改 CSV。
2. 运行：

```bash
npm run check:csv
npm run check:all
```

3. 如果 UI 服务没开，直接：

```bash
npm run ui
```

4. 如果 UI 服务已经开了，点“新建局”或执行：

```js
await __YSBZS__.command('NEW_GAME')
```

也可以重启 `npm run ui`。

## 关键边界

- 程序启动 / 新建局时优先读 `data/csv`。
- 如果 `data/csv` 不存在，才回退到 `data/normalized_data.json`。
- 不要改 CSV 列名，程序按列名读取。
- 多机制可以写 `mech_aura,mech_curse`，程序会自动拆分和旧 ID 归一化。
- `10_初始阵容.csv` 里的行列是 1 起始坐标，程序会转成内部 0 起始坐标。
