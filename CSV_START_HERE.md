# 策划总表 + CSV 数据真源版 · 从这里开始

本包已经把日常策划入口压成 `xlsx/ysbzs_master.xlsx`，并让程序默认优先读取导出的 `data/csv/*.csv`。

## 你以后怎么改

- 日常改宠物、波次、商店商品、机制摘要、第7天试炼：`xlsx/ysbzs_master.xlsx`
- 导出完整程序 CSV：`npm run data:export`
- 刷新策划好读版 workbook：`npm run data:workbook`
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

## Original Pirate 独立内容域

- `original_pirate` 只从 `xlsx/ysbzs_master.xlsx` 的 `BZ_*` 页机械导出到 `data/csv/44_bz_gameplay.csv` 至 `65_bz_hero_skill_offers.csv`；不要从 `element_grid` 的宠物、来源审计或英文效果文案补值。
- 物品的 `tags` 是非空、唯一、字典序 canonical 的稳定 ID，当前正式词表为 `ammo / aquatic / relic / tool / vehicle / weapon`。
- `47_bz_item_effects.csv` 逐效果声明 `trigger_event`。`condition_source_relation` 必须显式写 `any|adjacent`：`item_ready` 只能为 `any`；`another_friendly_item_used` 先用 `source_item_has_any_tag + condition_tags` 筛选来源，若为 `adjacent` 再追加无参数的 `source_item_adjacent_to_self` 条件。运行时不解析中文技能说明。
- 四种确定性友方物品目标 `left_adjacent_item / right_adjacent_item / leftmost_friendly_item / rightmost_friendly_item` 当前只允许 `item_ready + always + charge`。四者均限定同 owner 并排除触发源自身：左右相邻按多尺寸占用区间的端点接壤，最左/最右在排除自身后的友方物品中按稳定格位顺序选择；没有合法目标时该效果合法 no-op，不回退到自身或其他目标。每条 effect identity 独立结算，多个 selector 命中同一物品时按 `priority/effectId` 的确定性顺序分别生效。
- `gain_damage_for_fight` 只用于 `another_friendly_item_used + source_item_has_any_tag` 的当场战斗物品伤害成长，`amount` 必须为正整数。`self_item` 变体要求接收方同品质 profile 另有 `item_ready -> selected_enemy -> deal_damage` 主动效果；`trigger_source_item` 变体遵守下一条动态来源合同。两者都可与 `any|adjacent` 来源关系组合，但条件顺序仍固定为标签在前、相邻关系在后。
- `trigger_source_item` 是无参数动态 target，只允许 `another_friendly_item_used + source_item_has_any_tag (+ source_item_adjacent_to_self) -> gain_damage_for_fight`。它指向刚完成本次 `USE` 的真实来源物品：响应在该次 `USE` 完成后结算，成长只影响其后续 `USE`。权威上下文缺少该来源或来源身份被伪造时必须整条命令 fail closed；不得静默 no-op，也不得通过参数配置自身或其他 fallback。
- 英雄防御资源统一用 `target_type=owner_hero`：`heal` 的正整数 `amount` 恢复生命且不超过最大生命，`gain_shield` 的正整数 `amount` 获得一比一抵挡直接伤害的护盾；二者当前只允许 `item_ready + always`，不暗示尚未实现的周期伤害特例。
- `48_bz_item_skills.csv` 用 canonical `trigger_events` 汇总该技能实际拥有的触发集合；每个正式物品的每个品质仍必须至少有一项 `item_ready` 主动效果。
- 专项门禁：`python3 tools/export_master_to_csv.py --check --original-pirate-only` 与 `python3 tools/export_original_pirate_content.py --check`。
- 本域新增的原创物品与规则原语不构成 Vanessa 构建绑定参考目录的正式可执行映射；该映射仍为 Item `0/138`、Skill `0/138`。

## 波次写法

- 旧写法：`宠物ID=pal_001`、`数量=1`。
- 新写法：`enemy_pool=1,2,3,4,5`、`count=2`、`quality_weights=90,10,0,1`，导出后写成 `宠物池-数量=1,2,3,4,5-2`。
- 程序会转成 `pal_XXX` 并按权重实时计算威胁分。

## 生效方式

1. 改 `xlsx/ysbzs_master.xlsx`。
2. 运行：

```bash
npm run data:export
npm run data:workbook
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
