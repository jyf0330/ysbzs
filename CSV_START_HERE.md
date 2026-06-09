# 策划总表 + CSV 数据真源版 · 从这里开始

本包已经把日常策划入口压成 `xlsx/ysbzs_master.xlsx`，并让程序默认优先读取导出的 `data/csv/*.csv`。

## 你以后怎么改

- 日常改宠物、波次、商店商品、机制摘要、第7天试炼：`xlsx/ysbzs_master.xlsx`
- 导出完整程序 CSV：`npm run data:export`
- 低频/高级程序表仍保留在 `data/csv/*.csv`，例如事件、遗物、品质倍率、16-23 规则展开表。

## 精简总表对应关系

- `PETS`：生成/覆盖 `01_pets.csv`，并补全 `02_monster_templates.csv`、`08_action_shapes.csv` 的自动名称/元素/定位/形状。
- `WAVES`：生成/覆盖 `03_monster_waves.csv` 的敌人池、数量、品质权重和目标威胁。
- `SHOP_ITEMS`：生成/覆盖 `06_shop_rewards.csv` 的解锁、价格、权重。
- `MECHANISMS`：生成/覆盖 `04_mechanisms.csv` 的机制摘要、分值、接入状态。
- `TRIALS`：生成/覆盖 `13_day7_beast_trial.csv` 的特殊关卡单位、站位、属性覆盖和规则说明。

## 需要直接看 CSV 的情况

- 改商店事件：`data/csv/05_events.csv`
- 改遗物/祝福：`data/csv/07_relic_blessings.csv`
- 改品质倍率：`data/csv/14_quality_multipliers.csv`
- 改试炼动作脚本/胜负规则/触发器展开：`data/csv/16_*` 到 `23_*`
- 改我方初始阵容和站位：`data/csv/10_initial_roster.csv`

## 波次写法

- 旧写法：`宠物ID=pal_001`、`数量=1`。
- 新写法：`enemy_pool=1,2,3,4,5`、`count=2`、`quality_weights=90,10,0,1`，导出后写成 `宠物池-数量=1,2,3,4,5-2`。
- 程序会转成 `pal_XXX` 并按权重实时计算威胁分。

## 生效方式

1. 改 `xlsx/ysbzs_master.xlsx`。
2. 运行：

```bash
npm run data:export
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
- `xlsx/ysbzs_master.xlsx` 是人类入口，不是程序完整数据库。
- `data/csv/*.csv` 是程序输入，字段可以多、可以自动生成、可以保留冗余列。
- 不要改 CSV 列名，程序按列名读取。
- 多机制可以写 `mech_aura,mech_curse`，程序会自动拆分和旧 ID 归一化。
- `10_初始阵容.csv` 里的行列是 1 起始坐标，程序会转成内部 0 起始坐标。
