# CSV 数据真源说明

这个目录是新核心默认读取的数据源。日常策划优先改 `xlsx/ysbzs_master.xlsx`，再运行 `npm run data:export` 生成这里的完整 CSV；需要看完整好读版时运行 `npm run data:workbook` 刷新 `xlsx/ysbzs_v1_linked_data_tables.xlsx`。

## 读取规则

- 程序启动 / 新建局时优先读取 `data/csv/*.csv`。
- 如果 `data/csv` 不存在，才回退到 `data/normalized_data.json`。
- 改 `xlsx/ysbzs_master.xlsx` 后，先运行 `npm run data:export`，需要同步好读版时运行 `npm run data:workbook`，再运行 `npm run check:csv` / `npm run check:all` 验证；如果 UI 服务已经启动，点“新建局”或重启 `npm run ui` 让新数据重新载入。

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
- `43_hero_skills.csv`：第一英雄被动技能正式定义；当前 `completeness=slice` 只表示已接入切片，来源关系仍以 `34_bazaar_objects.csv` 的 reserved skill 审计记录为准，不与宠物 A/B 技能目录混用。
- `48_bz_item_skills.csv`：`original_pirate` 的物品技能目录，只能由 `46_bz_items.csv.item_skill_id` 与 `47_bz_item_effects.csv.item_skill_id` 引用；不得作为英雄技能。
- `47_bz_item_effects.csv` 的 `gain_damage_for_fight` 只允许“另一件友方物品使用 + 来源物品命中 canonical tag”时对 `self_item` 增加正整数当场伤害；同 profile 必须保留 `item_ready` 主动伤害，该成长不写入跨局基础数值。
- `62_bz_hero_skills.csv`：雾航船长的原创英雄被动技能，按技能与品质冻结 `friendly_item_used` 触发次数、正式效果数值和逐品质中文效果文案；不复用 `43_hero_skills.csv` 的 `hero_001` 参考审计切片。
- `63_bz_hero_skill_loadouts.csv`：英雄起始与离线 Ghost 的规范化英雄技能实例；起始仅携带雾线追炮，`starter` 与 `ghost_snapshot` 分别投影到英雄目录和 Ghost build，并共同参与运行包 hash。
- `64_bz_hero_skill_trainers.csv`：英雄技能训练师目录；训练师归属英雄并绑定正式摊位，和物品商店目录保持独立。
- `65_bz_hero_skill_offers.csv`：英雄技能学习与相邻品质升阶入口；`offer_id` 是命令内容身份，价格、日窗、顺序和 `learn|upgrade` action 均由正式数据冻结。学习所得实例来源固定为 `sourceType=hero_skill_trainer`、`sourceId=trainer_id`。
- `66_bazaar_reference_snapshots.csv`：外部参考来源锁。`current_version_boundary` 只冻结 Steam 官方当前 Patch 公告身份和公告正文 hash，不证明 `34_bazaar_objects.csv` 的旧效果属于该 Patch；`legacy_catalog_binding` 以 canonical 行集合 hash 绑定 369 条旧参考记录，其 patch/build 保持空值。两类记录均为 `reference_only`，license 未确认，不能进入 `original_pirate` 可执行目录。

`34_bazaar_objects.csv` 的 `identity_confirmed=true` 只表示旧对象身份映射仍被保留；`rule_verified=false` 与非空 `rule_unresolved_fields` 表示现行精确规则尚未核验。全部 369 条当前均为 `reference_reserved`，`current_version_boundary_snapshot_id` 只是审计对照，不是规则来源关系。

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
