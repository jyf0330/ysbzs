# ysbzs 事件接入说明 · 2026-06-05

## 本轮产物

- `4_事件主表_策划好读版_20260605.xlsx`
  - 策划主视图，单 sheet、每个选项一行，共 22 行选项。
- `ysbzs_events_20260605.yaml`
  - 未来数据源优先的事件真相源。
- `ysbzs_events_接入说明_20260605.md`
  - 本文件，解释字段语义、桥接规则和未来挂点。

## 文件职责

### Excel 主表

- 面向策划扫读：事件窗口、节点、代价、即时收益、延迟收益、下一战改造、构筑导向、目标题型。
- `机制词条IDs` 统一引用 `1_机制词条库_魔塔尖塔可计算版_20260605.xlsx` 的 `内部ID`。
- 所有“改下一战题型 / 给对策”的选项都尽量填了机制 ID；纯经济事件允许留空。

### YAML 真相源

顶层固定为：

- `event_master`：14 个事件组，管理事件窗口、出现节点、权重和奖励档。
- `event_options`：22 条选项，管理代价、接入层级、策划语义。
- `event_effects`：标准化效果层，是未来 adapter 的直接输入。
- `event_conditions`：复用条件字典，承接单位拥有、build 偏向、天数窗口等限制。
- `bridge_current_event_config`：只放可桥接到旧 `event_master / event_option / event_reward / event_condition` 的子集。

## 字段语义

### 主表列

- `出现节点`：只用 `midday_event`、`night_shop_extra`、`elite_reward_event`、`boss_reward_event`。
- `事件类型`：策划分类，不作为运行时枚举真相源。
- `代价类型 / 代价值`：给策划读；YAML 里的真相源是 `cost_type` 和 `cost_value`。
- `即时收益`：选择当下就结算的效果。
- `延迟收益`：会在下一夜店、下一战前或下一战后结算的收益。
- `下一战改造`：只写量化改造，不写剧情。
- `参数`：压缩后的参数摘要；真正结构以 YAML `params` 为准。
- `接入层级`：
  - `bridge_now`：旧事件系统能表达这组效果组合。
  - `adapter_needed`：需要新的商店/战斗 adapter，不能直接回填旧 schema。

### effect_type 白名单

本轮只使用以下标准化效果：

- `grant_gold`
- `free_refresh`
- `spawn_targeted_shop_offer`
- `discount_targeted_offer`
- `copy_owned_unit`
- `upgrade_owned_unit`
- `buff_owned_unit`
- `reserve_future_offer`
- `unlock_pool_preview`
- `preview_next_battle`
- `add_next_battle_modifier`
- `set_clear_bonus`
- `set_failure_penalty`
- `grant_temp_summon_buff`

## 与旧 event_config 的桥接规则

### 哪些能直接桥接

当前 `bridge_now` 共 7 条选项：
- `evt_coupon_stall/opt_take_coin`
- `evt_training_yard/opt_hp_drill`
- `evt_training_yard/opt_atk_drill`
- `evt_merge_broker/opt_copy_bronze`
- `evt_merge_broker/opt_upgrade_bronze`
- `evt_gold_caravan/opt_take_gold`
- `evt_diamond_outpost/opt_take_gold`

桥接原则：

- 只在旧 schema 能表达该效果组合时才进入 `bridge_current_event_config`。
- 如旧逻辑能表达效果，但目标选择精度不足，会在 `bridge_note` 里标明“随机 owned_pal”之类的降级语义。
- `bridge_current_event_config` 只作兼容输入，不再是这批事件的真相源。

### 哪些必须走新 adapter

当前 `adapter_needed` 共 15 条选项，主要分成 5 类：

- `shop_phase_*`：商店阶段注入免费刷新、定向候选位、折扣位、预留位、3 选 1 候选包。
- `pre_battle_*`：下一战前加压力包、读情报、给召唤物临时 buff。
- `post_battle_clear_bonus_resolution`：下一战后按“5 回合内清场”结算奖励。
- `post_battle_failure_penalty_resolution`：下一战后按失败条件结算惩罚。
- `shop_phase_preview_*`：只读预览下一战题型或解锁高档预览池。

## 与怪物波次表 / 机制词条库的关系

- 怪物波次表负责“敌人出题”。
- 机制词条库负责“题型与解法的可计算词典”。
- 事件表负责“在商店 / 精英奖励 / Boss 奖励节点，给玩家资源、情报或对策”。

因此：

- 事件表不会直接写现有波次行 ID。
- 所有下一战相关事件都只写 `目标题型 + mechanism refs + quantified params`。
- 例如：
  - `evt_bounty_contract` 用 `mech_first_strike / mech_firm_threshold / mech_multi_hit` 表示下一战的精英压力包。
  - `evt_breaker_shop` 固定引用 `mech_firm_threshold / mech_firm_glancing / 护盾家族`，表示这是一个破坚位。
  - `evt_final_supply` 固定引用 Boss 常见题型，表示终局对策位。

## 约定池 / 标签名

本轮允许引用的“明确约定” pool/tag 名如下：

- `summon_aura_offer`：`[召唤, 友召增益]`
- `tank_break_shield_offer`：`[坦克, 破盾, 穿盾]`
- `fire_build_offer`：`[火, 输出, 爆发]`
- `summon_build_offer`：`[召唤, 友召增益, 场地]`
- `salvage_repair_offer`：回收纠偏位，默认镜像被交出单位的定位
- `gold_preview_candidates`：`品质=黄金` 的预览候选池
- `diamond_preview_candidates`：`品质=钻石` 的预览候选池
- `breaker_counter_offer`：`[破甲, 穿盾, 高单发]`
- `boss_counter_bundle`：`[爆发, 穿盾, 控制]` 三选一 Boss 对策包

这些名字在旧 schema 中都不存在；它们是本轮未来数据源的明确约定，不是遗留字段。

## 本轮明确不做

- 不引入 relic 奖励。
- 不引用旧 relic 池。
- 不写纯剧情效果。
- 不写“随机奇遇加强一点”这类不可计算描述。
- 不把旧 `event_config.yml` 或旧 `docs/tables/17_商店事件表.md` 当成新的真相源。

## 后续接线建议

1. 先做 `bridge_now` 子集回填旧 `event_config`，验证不碰运行时代码时的数据兼容性。
2. 再补 `shop_phase` adapter：免费刷新、定向候选位、折扣位、预留位、候选包。
3. 再补 `pre_battle / post_battle` adapter：下一战 modifier、清场奖励、失败惩罚。
4. 最后再决定是否把旧 `event_config.yml` 收口成纯兼容导出，而不是手工主源。
