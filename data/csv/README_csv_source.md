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
- `47_bz_item_effects.csv` 的 `condition_source_relation` 必须显式为 `any|adjacent`；旧效果全部写 `any`，`adjacent` 只允许用于“另一件友方物品使用 + 来源物品命中 canonical tag”，并按 `[source_item_has_any_tag, source_item_adjacent_to_self]` 固定顺序导出。相邻条件本身不带参数，实际格位关系由权威战斗内核解释。`gain_damage_for_fight` 对 `self_item` 增加正整数当场伤害；同 profile 必须保留 `item_ready` 主动伤害，该成长不写入跨局基础数值。
- `trigger_source_item` 只允许作为上述响应链的无参数 target，并仅与 `gain_damage_for_fight` 配对；它解析为刚完成本次 `USE` 的真实来源物品。响应发生在当前 `USE` 完成后，所以增量只进入来源物品的后续 `USE`。动态来源缺失或身份与权威上下文不符属于损坏输入，必须 fail closed；不可按空目标 no-op，也不可声明 fallback 参数。
- `battle_start` 首版仅允许物品效果的 `[always] -> owner_hero + gain_shield`，`target.params={}` 且 `amount` 为正整数；禁止英雄技能、响应标签、相邻/集合/随机目标、aura 和其他 operation。原创“晨潮校时器”逐品质恰含一条该开场护盾和一条既有 `item_ready + always -> selected_enemy + deal_damage`，用于保持主动物品合同。
- `47_bz_item_effects.csv.target_type` 的 `left_adjacent_item / right_adjacent_item / leftmost_friendly_item / rightmost_friendly_item` 当前只与 `item_ready + always + charge` 配对；同 owner、排除 source/self，左右相邻按多尺寸占用区间端点接壤，最左/最右从排除自身后的友方物品中按稳定格位顺序选择。空目标是合法 no-op，不生成 fallback；四条 effect identity 独立，目标重合时按 `priority/effectId` 顺序分别结算。
- `friendly_items_with_any_tag` 是首个集合 target，筛选标签只写入独立的 `target_tags` 列并导出为 exact `target.params.tags`，不得复用响应条件的 `condition_tags`。当前只与 `item_ready + always + charge` 配对：匹配同 owner、战场内所有具备任一 canonical 标签的物品，source 自身若命中标签也包含；按 `boardSlot -> instanceId` 稳定排序，敌方与 stash 永不进入集合。空集合是合法 no-op，不回退自身、不生成静态 `targetInstanceId`。原创“齐射传令台”固定使用 `target_tags=weapon`，自身为非武器 `relic, tool`。
- `random_friendly_item_with_any_tag` 是随机友方物品单目标，标签继续只写入 `target_tags`，并由独立、必填的 canonical 布尔 `target_exclude_self=true|false` 与 `target_count=1` 冻结 exact `target.params={tags,excludeSelf,count}`；数字、其他字符串或空值均拒绝。当前只允许 `item_ready + always + charge`，候选仅含同 owner 战场内命中任一 canonical 标签的物品；仅当 `excludeSelf=true` 时排除 source。空候选合法 no-op，随机选择必须由运行时的确定性战斗 RNG 与 Trace 记录目标身份，不能隐式改写 schema 值或做静态绑定。原创“侧风择发器”固定使用 `target_tags=weapon`、`target_exclude_self=true`，自身虽为 `tool, weapon` 仍必须排除。
- Crit v1 的唯一玩法合同来自 `44_bz_gameplay.csv`：`crit_contract=ysbzs.original-pirate-critical-damage.v1` 导出为 `critRules.contractId`，`chance_scale_bps=10000`、`rounding_mode=floor`、`roll_scope=item_use`、`draw_policy=once_if_eligible_damage_effect` 均为 exact；`damage_multiplier_bps` 的正式当前值为 20000，schema 允许 10001..100000 的整数后续调整。`46_bz_items.csv.crit_chance_bps` 只声明品质档位概率；`47_bz_item_effects.csv.can_crit` 对每条 `deal_damage` 必须显式写 `true|false`，非伤害操作必须留空。首版仅允许 `item_ready + always -> selected_enemy + deal_damage` 的唯一效果声明 `can_crit=true`，有正暴击率的 profile 必须恰有一条该效果；可暴击 authored 伤害最大为 `922337203685477580`，保证任一合法倍率下的结果可由 int64 表达。普通伤害显式为 `false`，不存在隐式暴击。原创“潮镜短铳”的四品质概率为 2500/4000/5500/7000 bps；这是项目原创数据，不构成外部 138 目录的正式映射。
- Poison v1 的唯一玩法合同来自 `44_bz_gameplay.csv`，以 `ysbzs.original-pirate-poison.v1` 和另外 12 个 exact 字段导出为 `battleRules.poisonRules`；首版固定每 10 tick 结算，首次需等待完整间隔，重复施加保留既有到期 tick，并在 Burn 与终局判定之后、物品进度之前按到期双方快照结算。Poison 每层造成 1 点绕过且不消耗护盾的生命伤害，不衰减、不暴击、无治疗净化规则，层数上限 1000000，溢出拒绝推进。`apply_poison` 只允许 `item_ready + [always] -> selected_enemy`，参数 exact 为正整数 `stacks`；其 profile 必须 `crit_chance_bps=0` 且只含这一条效果。原创“墨航滴液器”的四品质层数为 2/3/5/7，这是项目原创数据，不构成外部 138 目录的正式映射。
- `62_bz_hero_skills.csv`：雾航船长的原创英雄被动技能，按技能与品质冻结 `friendly_item_used` 触发次数、正式效果数值和逐品质中文效果文案；不复用 `43_hero_skills.csv` 的 `hero_001` 参考审计切片。
- `63_bz_hero_skill_loadouts.csv`：英雄起始与离线 Ghost 的规范化英雄技能实例；起始仅携带雾线追炮，`starter` 与 `ghost_snapshot` 分别投影到英雄目录和 Ghost build，并共同参与运行包 hash。
- `64_bz_hero_skill_trainers.csv`：英雄技能训练师目录；训练师归属英雄并绑定正式摊位，和物品商店目录保持独立。
- `65_bz_hero_skill_offers.csv`：英雄技能学习与相邻品质升阶入口；`offer_id` 是命令内容身份，价格、日窗、顺序和 `learn|upgrade` action 均由正式数据冻结。学习所得实例来源固定为 `sourceType=hero_skill_trainer`、`sourceId=trainer_id`。
- `66_bazaar_reference_snapshots.csv`：外部参考来源锁。`current_version_boundary` 只冻结 Steam 官方当前 Patch 公告身份和公告正文 hash，不证明 `34_bazaar_objects.csv` 的旧效果属于该 Patch；`legacy_catalog_binding` 以 canonical 行集合 hash 绑定 369 条旧参考记录，其 patch/build 保持空值；`build_bound_catalog_candidate` 只冻结本机已安装客户端的 Steam build、客户端版本、缓存 ETag、`GameData.db` 原始字节 hash，以及 Vanessa `Always` 物品/技能各 138 个 UUID 的排序集合 hash。三类记录均为 `reference_only`、`license_status=unverified`，不得提交数据库、压缩包、专有原文或数值，也不能进入 `original_pirate` 可执行目录。构建绑定快照没有显式 Patch 字段，因此不能称为 Patch 18 规则来源；其每条规则仍须独立核验语义和正式 Trace。

`34_bazaar_objects.csv` 的 `identity_confirmed=true` 只表示旧对象身份映射仍被保留；`rule_verified=false` 与非空 `rule_unresolved_fields` 表示现行精确规则尚未核验。全部 369 条当前均为 `reference_reserved`，`current_version_boundary_snapshot_id` 只是审计对照，不是规则来源关系。

`original_pirate` 的原创物品及上述确定性 target 原语不计入构建绑定 Vanessa 目录的正式可执行映射；该映射仍为 Item `0/138`、Skill `0/138`。

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
