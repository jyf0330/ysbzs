# CSV 数据真源说明

这个目录是新核心默认读取的数据源。日常策划优先改 `xlsx/ysbzs_master.xlsx`，再运行 `npm run data:export` 生成这里的完整 CSV。

## 读取规则

- 程序启动 / 新建局时优先读取 `data/csv/*.csv`。
- 如果 `data/csv` 不存在，才回退到 `data/normalized_data.json`。
- 改 `xlsx/ysbzs_master.xlsx` 后，先运行 `npm run data:export`，再运行 `npm run check:csv` / `npm run check:all` 验证；如果 UI 服务已经启动，点“新建局”或重启 `npm run ui` 让新数据重新载入。

## 主要文件

- `xlsx/ysbzs_master.xlsx`：人类策划入口，只保留少量人工字段。
- `01_pets.csv`：宠物基础属性、元素、机制、形状文字。
- `02_monster_templates.csv`：敌方模板属性。
- `03_monster_waves.csv`：第几天、第几回合刷什么敌人；兼容旧版单 `宠物ID`，也支持 `宠物池-数量` / `品质权重` 随机池写法。
- `04_mechanisms.csv`：机制 ID 和机制说明。
- `05_events.csv`：商店事件、事件收益、代价。
- `06_shop_rewards.csv`：商店池、奖励池、价格、权重、解锁日。
- `07_relic_blessings.csv`：遗物/祝福奖励。
- `08_action_shapes.csv`：宠物行动槽、元素、形状。
- `09_cross_validation.csv`：人工校验说明。
- `10_initial_roster.csv`：我方初始宠物和站位；想换开局阵容改这里。

## 注意

- 日常不要手改自动列；自动名称、自动元素、威胁计算、商店池/奖励池等字段由导出脚本或运行时补全。
- 不要改列名，程序按列名读取。
- 多个机制用英文逗号、中文逗号或顿号分隔都可以，例如 `mech_aura,mech_curse`。
- 多个标签/池 ID 可以用 `,`、`，`、`、` 分隔。
- `行(1-8)` 和 `列(1-8)` 是给人看的 1 起始坐标，程序会转成内部 0 起始坐标。

## 波次表随机池

- `宠物池-数量` 或 `宠物ID` 可写 `1,2,3,4,5-2`，表示从 `pal_001` 到 `pal_005` 里随机出 2 只。
- `品质权重` 或 `概率` 写 `90,10,0,1`，顺序为青铜、白银、黄金、钻石，按权重归一化。
- 含英文逗号的单元格导出 CSV 时必须被引号包住；用 Excel/WPS 保存 CSV 通常会自动处理。
