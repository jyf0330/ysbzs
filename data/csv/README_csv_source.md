# CSV 数据真源说明

## 逐物品来源绑定（2026-09-04）

`BZ_ITEM_SOURCE_BINDINGS -> 68_bz_item_source_bindings.csv` 只声明六列：item_id、quality、enchantment_id、scope_id、source_snapshot_id、source_object_id。每件物品在同一个对象/快照下精确声明全部品质的none和已配置附魔；battle_profile不表示审核通过，none不是所有附魔通配符。现有230条关系全部对应22件原创物品，原版执行审核覆盖不增加。

`runtimeBundle.sourceCatalog` 从56及按需读取、完整验证的66/67派生；local metadata去掉56的snapshot_id，external metadata去掉66的source_snapshot_id且仅game_patch空值转null，其余保留字符串。external成员为67完整140 item UUID，不包含专有规则。snapshotDigest是去掉自身字段后、成员按sourceType/sourceUuid排序的canonical JSON UTF-8 SHA256；JSON字典键排序、紧凑分隔、不转义Unicode。items.sourceBinding带同一摘要与声明范围，目录进入bundle hash。synthetic_fixture仅显式测试包身份，生产CSV不生成；无PASS或verifiedScopes字段。当前content36/runtime34、rules32、revision34；历史切片版本不覆盖当前身份。

## Poison 频率纠正（2026-09-04）

锁定 GameData.db SHA `7d8df658ebce967edf59ab8d0c889fa266f56917b87336928694cdce54246ee9` 的 Poison tooltip 提供“每秒一次”频率证据。按运行时 50ms/tick，当前 `poison.v3` 为 20 ticks；rules v32、source/content/bundle revision v33，原创批次 snapshot_id 同步为 snapshot_original_pirate_bootstrap_v33，content35/runtime33/catalog25 不变。此次仅频率获得来源支持；首次 pulse、重施加、结算阶段、护盾、暴击、治疗交互及其他既有策略保持未验证，不表示整套 Poison 或任何物品原规则验收通过。下文被动切片的 v31/revision32 是其历史迁移版本，不覆盖本次当前版本。

## Build-bound 身份成员（2026-09-04）

`BAZAAR_REFERENCE_MEMBERS -> 67_bazaar_reference_members.csv` 只保存 `source_snapshot_id/source_type/source_uuid` 三列。新 build `snapshot_vanessa_local_cache_25079259_db8914ab` 的 Vanessa Always 140 件物品 UUID 必须完整、唯一且为 canonical 小写；排序 UTF-8 UUID 以换行连接、无末尾换行的 SHA-256 必须匹配既有 66 快照锁。普通和 reference-scoped master 导出均校验成员，行重排规范化后输出一致。版本、build、原始 artifact SHA 和许可状态仍只由 66 快照拥有；34 的 legacy 对象不重绑。该身份清单保持 reference-only，原规则可执行映射覆盖为 0，不包含专有规则 payload、审核通过状态或 verifiedScopes。

## 无主动冷却物品合同（2026-09-04）

被动品质也不得声明 `self_item` 目标的 `charge/apply_status/reload`：它没有可操作的自身时钟，源数据与导出包均在进入战斗前拒绝。对其他物品的时钟操作不因施法者被动而被一概禁止，具体目标由运行时按时钟资格筛选。

`BZ_ITEMS.activation_mode` 必须显式为 `cooldown` 或 `passive`，同一物品全部品质一致。主动品质必须有正 `cooldown_ticks` 与 `item_ready` 效果；被动品质的源冷却必须留空，由显式 mode 导出 `activationMode=passive/baseCooldownTicks=0`，不能从缺值推断模式。被动禁止 ready/弹药及冷却或弹药铭刻增量，至少有一个响应、开战效果或 Aura；纯 Aura 的 effect_ids/trigger_events 可空，完整归属仍校验。此切片只迁移既有 22 件物品为显式 cooldown，数值与效果不变；不新增原版或原创被动物品。content/runtime 为 35/33、catalog 25、rules v31、revision v32；独立旧冷却 Aura 工作树的增量不在本包。

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
- `48_bz_item_skills.csv`：`original_pirate` 的物品技能目录，只能由 `46_bz_items.csv.item_skill_id`、`47_bz_item_effects.csv.item_skill_id` 与 `66_bz_item_auras.csv.item_skill_id` 引用；`effect_ids` 与 `aura_ids` 分域持有身份，不得作为英雄技能或把 Aura 伪装成触发效果。
- `47_bz_item_effects.csv` 的 `condition_source_relation` 必须显式为 `any|adjacent`；旧效果全部写 `any`，`adjacent` 只允许用于“另一件友方物品使用 + 来源物品命中 canonical tag”，并按 `[source_item_has_any_tag, source_item_adjacent_to_self]` 固定顺序导出。相邻条件本身不带参数，实际格位关系由权威战斗内核解释。`gain_damage_for_fight` 对 `self_item` 增加正整数当场伤害；同 profile 必须保留 `item_ready` 主动伤害，该成长不写入跨局基础数值。
- `trigger_source_item` 只允许作为响应链的无参数 target，当前可与 `gain_damage_for_fight` 或下述 Crit v3 的 `gain_crit_chance_for_fight` 配对；它解析为刚完成本次 `USE` 的真实来源物品。响应发生在当前 `USE` 完成后，所以增量只进入来源物品的后续 `USE`。动态来源缺失或身份与权威上下文不符属于损坏输入，必须 fail closed；不可按空目标 no-op，也不可声明 fallback 参数。
- `source_item_ammo_depleted` 是 `item_ready` 的无参数当前来源条件，只在同一次真实物品 `USE` 的弹药从正数减到零时成立；评估点固定为扣弹后、物品效果前，并引用该次 `USE` 的 `ammoBefore/ammoAfter` 快照。v1 只允许弹药 profile 的 `item_ready + [source_item_ammo_depleted] -> owner_hero + gain_shield`；条件 tags、adjacency、target params、其他 trigger/target/operation 和非弹药 profile 全部拒绝。每次归零 `USE` 最多触发一次，后续装填不回溯取消，不消耗 RNG。原创“潮鳍投筒”四品质在保留就绪伤害与友方水生使用后装填的同时，弹药耗尽时分别获得 2/3/5/7 护盾；该时序与数值是项目原创合同，不构成外部 138 目录的规则映射。
- `battle_start` 首版仅允许物品效果的 `[always] -> owner_hero + gain_shield`，`target.params={}` 且 `amount` 为正整数；禁止英雄技能、响应标签、相邻/集合/随机目标、aura 和其他 operation。原创“晨潮校时器”逐品质恰含一条该开场护盾和一条既有 `item_ready + always -> selected_enemy + deal_damage`，用于保持主动物品合同。
- `47_bz_item_effects.csv.target_type` 的 `left_adjacent_item / right_adjacent_item / leftmost_friendly_item / rightmost_friendly_item` 当前只与 `item_ready + always + charge` 配对；同 owner、排除 source/self，左右相邻按多尺寸占用区间端点接壤，最左/最右从排除自身后的友方物品中按稳定格位顺序选择。空目标是合法 no-op，不生成 fallback；四条 effect identity 独立，目标重合时按 `priority/effectId` 顺序分别结算。
- `friendly_items_with_any_tag` 是首个集合 target，筛选标签只写入独立的 `target_tags` 列并导出为 exact `target.params.tags`，不得复用响应条件的 `condition_tags`。当前只与 `item_ready + always + charge` 配对：匹配同 owner、战场内所有具备任一 canonical 标签的物品，source 自身若命中标签也包含；按 `boardSlot -> instanceId` 稳定排序，敌方与 stash 永不进入集合。空集合是合法 no-op，不回退自身、不生成静态 `targetInstanceId`。原创“齐射传令台”固定使用 `target_tags=weapon`，自身为非武器 `relic, tool`。
- `random_friendly_item_with_any_tag` 是随机友方物品单目标，标签继续只写入 `target_tags`，并由独立、必填的 canonical 布尔 `target_exclude_self=true|false` 与 `target_count=1` 冻结 exact `target.params={tags,excludeSelf,count}`；数字、其他字符串或空值均拒绝。当前只允许 `item_ready + always + charge`，候选仅含同 owner 战场内命中任一 canonical 标签的物品；仅当 `excludeSelf=true` 时排除 source。空候选合法 no-op，随机选择必须由运行时的确定性战斗 RNG 与 Trace 记录目标身份，不能隐式改写 schema 值或做静态绑定。原创“侧风择发器”固定使用 `target_tags=weapon`、`target_exclude_self=true`，自身虽为 `tool, weapon` 仍必须排除。
- Crit v3 的唯一玩法合同来自 `44_bz_gameplay.csv`：`crit_contract=ysbzs.original-pirate-critical-damage.v3` 导出为 `critRules.contractId`，既有 `chance_scale_bps=10000`、`rounding_mode=floor`、`roll_scope=item_use`、`draw_policy=once_if_eligible_damage_effect` 保持 exact，`damage_multiplier_bps` 的正式当前值仍为 20000，schema 允许 10001..100000 的整数后续调整。成长字段继续固定逐 effect 相加、有效概率封顶 chanceScale、真实来源本次 USE 完成后才影响后续 USE、动态目标必须恰有一条 `canCrit=true` 的 `item_ready + always -> selected_enemy + deal_damage`、成长自身不消费 RNG。新增成功响应只以同次 `ITEM_EFFECT_CRIT_RESOLVED.isCritical=true` 且绑定已提交 `DAMAGE` 为证据；来源必须是另一件同 owner 的 active-board 物品，在来源 USE 的效果完成后进入 item response phase，每次合格 USE 最多一次，终局后跳过，响应本身不消费 RNG。`another_friendly_item_crit` 只允许 `[always] -> self_item {} -> charge{ticks}`，不能用 `source_item_can_crit` 资格条件代替成功结果。`46_bz_items.csv.crit_chance_bps` 只声明品质基础概率；`47_bz_item_effects.csv.can_crit` 对每条 `deal_damage` 必须显式写 `true|false`，非伤害操作必须留空；`crit_chance_bps_delta` 则只允许 `another_friendly_item_used + [source_item_can_crit] -> trigger_source_item + gain_crit_chance_for_fight` 使用，导出为唯一参数 `critChanceBpsDelta`。可暴击 authored 伤害最大为 `922337203685477580`，保证任一合法倍率下的结果可由 int64 表达。原创“继航校炮仪”保留伤害成长和 500/750/1000/1250 bps 本场暴击率成长，并在另一件友方物品成功暴击后按品质为自身推进 1/1/2/2 tick；原创“潮镜短铳”继续作为正式自然可买的可暴击来源。上述规则、时序和数值均为项目原创，不构成外部 138 目录的正式映射或参考作品精确语义复刻。
- Poison v3 的唯一玩法合同来自 `44_bz_gameplay.csv`，以 `ysbzs.original-pirate-poison.v3` 和另外 12 个 exact 字段导出为 `battleRules.poisonRules`；固定每 20 tick（50ms/tick，即每秒一次）结算，首次需等待完整间隔，重复施加保留既有到期 tick，并在 Burn 与终局判定之后、物品进度之前按到期双方快照结算。Poison 每层造成 1 点绕过且不消耗护盾的生命伤害，不衰减、不暴击，层数上限 1000000，溢出拒绝推进；治疗交互只通过 `healCleansePolicy=delegated_to_heal_status_cleanse_rules` 委托给下述唯一合同，不在 Poison 内重复定义。`apply_poison` 只允许 `item_ready + [always] -> selected_enemy`，参数 exact 为正整数 `stacks`；其 profile 必须 `crit_chance_bps=0` 且只含这一条效果。原创“墨航滴液器”的四品质层数为 2/3/5/7，这是项目原创数据，不构成外部 138 目录的正式映射。
- `battleRules.healStatusCleanseRules` 的唯一真相同样来自 `44_bz_gameplay.csv`：只在普通主动治疗的有效恢复后，以实际恢复量为基数按 2500 bps 计算，向下取整但正值至少 1；从同一状态快照分别封顶扣除 Burn 与 Poison。Poison 清零时清除 due tick，否则保留；只有有效治疗且目标存在任一状态时才发 Trace，不暴击、不消费 RNG。字段 exact 为 `contractId/triggerPolicy/healBasis/cleanseScaleBps/roundingMode/statusTargets/statusResolutionPolicy/poisonSchedulePolicy/traceEmitPolicy/critPolicy/rngPolicy`。Lifesteal 使用独立 trace 与 `statusCleansePolicy=never`，不得复用本合同触发清除。
- `66_bz_item_auras.csv` 是独立的项目原创 Aura 域，不属于 `47_bz_item_effects.csv` 的触发集合。`grant_damage` 与 `grant_lifesteal_bps` 使用互斥参数列，导出后也保留不同 operation 身份；二者都只允许 `friendly_items_with_any_tag + canonical tags + excludeSelf=true`，而吸血进一步限定为 `weapon`。`battleRules.damageAuraRules` 只由 `44_bz_gameplay.csv` 的九个 exact 字段生成；`battleRules.lifestealRules` 由十五个 exact 字段生成，冻结为：只处理 `item_ready + always + selected_enemy + direct damage`，按实际生命伤害、万分比、向下取整结算，多个 Aura 求和后封顶 10000，非致死伤害后立即恢复来源方英雄生命，过量治疗只记录不溢出，不改变护盾、不清状态、不消费 RNG，致死伤害跳过。雾藻疗匣四品质保留主动治疗与 1/2/3/4 点武器加伤，并分别向其他友方武器授予 2500/4000/5500/7000 bps 吸血。上述数值、时序与作用域均为项目原创合同，不构成外部 138 目录的可执行规则映射或参考作品精确复刻。
- `battleRules.regenRules` 的唯一真相来自 `44_bz_gameplay.csv` 的十六个 exact 字段：另一件同方活跃物品确实让 Slow 持续时间增加后，匹配响应才在同次物品响应相位执行一次；本场 Regen 每 20 tick 在 `TICK_START` 后、Burn/Poison/物品推进前按双方快照结算，生命封顶并保留过量审计，不触发普通治疗净化、不暴击、不抽 RNG。`47_bz_item_effects.csv` 只允许 `another_friendly_item_applied_slow + always + owner_hero + gain_regen_for_fight(amount)` 的这一种组合；归辉航标四品质为 `1/2/3/4`。具体数值、相位与审计仍是项目原创翻译，不改变外部来源锁或 `0/138` executable mapping。
- `62_bz_hero_skills.csv`：雾航船长的原创英雄被动技能，按技能与品质冻结 `friendly_item_used` 触发次数、正式效果数值和逐品质中文效果文案；不复用 `43_hero_skills.csv` 的 `hero_001` 参考审计切片。
- `63_bz_hero_skill_loadouts.csv`：英雄起始与离线 Ghost 的规范化英雄技能实例；起始仅携带雾线追炮，`starter` 与 `ghost_snapshot` 分别投影到英雄目录和 Ghost build，并共同参与运行包 hash。
- `64_bz_hero_skill_trainers.csv`：英雄技能训练师目录；训练师归属英雄并绑定正式摊位，和物品商店目录保持独立。
- `65_bz_hero_skill_offers.csv`：英雄技能学习与相邻品质升阶入口；`offer_id` 是命令内容身份，价格、日窗、顺序和 `learn|upgrade` action 均由正式数据冻结。学习所得实例来源固定为 `sourceType=hero_skill_trainer`、`sourceId=trainer_id`。
- `66_bazaar_reference_snapshots.csv`：外部参考来源锁。`current_version_boundary` 只冻结 Steam 官方当前 Patch 公告身份和公告正文 hash，不证明 `34_bazaar_objects.csv` 的旧效果属于该 Patch；`legacy_catalog_binding` 以 canonical 行集合 hash 绑定 369 条旧参考记录，其 patch/build 保持空值；版本化 `build_bound_catalog_candidate` 只冻结观测时本机客户端的 Steam build、客户端版本、缓存 ETag、`GameData.db` 原始字节 hash，以及 Vanessa `Always` 身份集合 hash。旧 build `24720155` 的 `138 Item + 138 Skill` 锁完整保留；最新候选 `snapshot_vanessa_local_cache_25079259_db8914ab` 以 `140 Item + 138 Skill` 作为独立行追加，不能覆盖旧锁，也不绑定旧 369 条 legacy 对象。同 build 的未提交缓存再次热更时以最新 artifact 原位替换候选行；快照提交后再发生漂移则只能新增版本化快照。所有记录均为 `reference_only`、`license_status=unverified`，不得提交数据库、压缩包、专有原文或数值，也不能进入 `original_pirate` 可执行目录。构建绑定快照没有显式 Patch 字段，因此不能称为 Patch 18 当前完整规则来源；其每条规则仍须独立核验语义和正式 Trace。

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
