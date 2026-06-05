# ysbzs 机制ID接入说明

## 为什么宠物表要从自由文本改成机制ID

- 宠物表原有“友召增益 / 前排减压 / 治疗续航”更像策划口语标签，便于讨论，但不能稳定作为程序主键。
- 正式接入时应以机制词条库 `内部ID` 为主键，中文机制名只保留给策划阅读和复查。
- 因此宠物表新增 `机制编号 / 机制ID / 机制来源 / 机制复查`，主表继续保留原 `机制` 作为策划阅读列。

## 怪物波次如何引用机制库

- 怪物波次表每行都要落到 `机制编号 / 机制ID`，没有机制则明确写 `none`。
- 程序读取优先使用 `机制ID`，再读取 `机制参数`；策划复查时仍可看 `设计目的 / 克制解法 / 备注`。
- 复杂行为如召唤内容、奖励惩罚、失败惩罚下沉到 YAML，不把 trigger / effect / log 塞进主表。

## 程序读取字段优先级

1. 机制库：`内部ID` 为主键，`编号` 仅作策划索引。
2. 宠物表：优先读 `内部ID` + `机制ID` + `机制复查`。
3. 怪物波次表：优先读 `怪物ID` + `机制ID` + `机制参数`。
4. YAML：承载多机制映射、REVIEW、奖励惩罚、失败惩罚和后续 override。

## REVIEW 项如何处理

- `机制复查 = REVIEW` 表示当前机制词条库没有精确对应，或现有映射只是近似映射。
- REVIEW 项不能静默当成正式规则接入；应先补机制词条，再把 `机制ID` 改成正式 `内部ID`。
- 当前缺口主要集中在治疗、减压、补刀控场、爆格增伤这类宠物专用规则。

## 宠物旧机制 -> 新机制ID 映射结果

| 旧机制 | 技能 | 机制编号 | 机制ID | 来源 | 复查 | 说明 |
|---|---|---|---|---|---|---|
| 友召增益 | buffAllSummons | M28 | mech_aura | 机制词条库 | REVIEW | 现有 mech_aura 可近似表示友军增益，但机制库暂无“仅召唤物光环”专用词条。 |
| 前排减压 | castleReduce | REVIEW | REVIEW | REVIEW新增 | REVIEW | 机制库暂无精确的前排减压 / 城堡线减压词条，不能硬映射到城堡破坏或诅咒。 |
| 治疗续航 | healAmpBonus | REVIEW | REVIEW | 暂无匹配 | REVIEW | 机制库当前没有治疗 / 回复 / 续航类正式机制ID。 |
| 补刀控场 | advHitBonus | REVIEW | REVIEW | 暂无匹配 | REVIEW | 机制库暂无“补刀后追加收益 / 斩杀控场”类词条，不能硬塞成长或连击。 |
| 爆格增伤 | spaceExplosionBonus | REVIEW | REVIEW | REVIEW新增 | REVIEW | 机制库暂无格子爆炸增伤 / 格位联动类词条。 |
| 落子召唤 | summonFromCell | M27 | mech_summon | 机制词条库 | OK | 直接对应召唤机制。 |

## 无法精确匹配的机制缺口

- mech_summon_aura
- mech_guard_reduce_castle_pressure
- mech_heal_sustain
- mech_execute_control
- mech_explosion_bonus
- mech_gate_guard
- mech_elite_guard_armor

## 怪物波次使用到的机制ID

- mech_aura
- mech_break_castle
- mech_counter
- mech_curse
- mech_damage_cap
- mech_firm_threshold
- mech_grow_attack
- mech_grow_shield
- mech_multi_hit
- mech_opening_shield
- mech_shield_regen
- mech_shielded_fragile
- mech_steal_reward
- mech_summon

## 暂时未使用的机制ID

- mech_first_strike（M01 / 先攻）
- mech_ignore_defense（M02 / 无视防御）
- mech_true_damage（M03 / 真实伤害）
- mech_fixed_damage（M04 / 固定伤害）
- mech_firm_glancing（M06 / 坚固（刮痧））
- mech_lifesteal（M09 / 吸血）
- mech_revive（M10 / 重生）
- mech_self_destruct（M11 / 自爆）
- mech_poison（M12 / 毒）
- mech_weaken（M13 / 衰弱）
- mech_zone_pressure（M15 / 领域）
- mech_first_hit_block（M17 / 首伤免疫）
- mech_shield_refresh（M20 / 护盾刷新）
- mech_shield_to_attack（M22 / 护盾转攻）
- mech_armor_break（M23 / 破甲）
- mech_pierce_shield（M24 / 穿盾）

## 验收规则

- 宠物表保留 127 行，不减行。
- 每个宠物都必须有 `内部ID`，并且 `机制ID` 或 `REVIEW`、`机制复查` 必填。
- 怪物波次表每行都必须有 `机制ID` 或明确写 `none`。
- 所有正式机制ID都必须能在机制词条库 `内部ID` 中找到。
- 主表不允许出现未解释的自由文本机制作为程序主键。

## 本次校验摘要

- 宠物总行数：127
- 机制库总数：30
- 已匹配宠物数：18
- REVIEW 宠物数：121
- 怪物波次数：55
- 使用到的机制ID数：14
- 未使用机制ID数：16
