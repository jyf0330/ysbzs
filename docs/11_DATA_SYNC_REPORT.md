# 数据表回写与 Excel 同步报告

生成日期：2026-06-04
范围：G0-G10 实施后已验证但需回写 Excel 的字段

## 一、attack-shapes（攻击形状）

| 字段 | 来源 | 状态 | 说明 |
|------|------|------|------|
| cells | attack_shape_sd_replacement_22.json | ✅ 已验证 | 22 形状全部可用 |
| requiresFullFit | attack_shape_master.json | ✅ 数据保留 | 运行时未使用，AI 寻优待接入 |
| cat（分类） | attack_shape_sd_replacement_22.json | ✅ 已验证 | line/sweep/t_shape/remote 等 |
| shape_name | attack_shape_sd_replacement_22.json | ✅ UI 已显示 | 行动槽显示新名称 |

**建议：** requiresFullFit 字段在 Excel 中确认含义后决定是否启用 AI 限制。

## 二、action-slots（行动槽）

| 字段 | 来源 | 状态 | 说明 |
|------|------|------|------|
| shape_sn | action_template_enriched.json | ✅ 已验证 | Pal 技能绑定形状 |
| shape_name | action_template_enriched.json | ✅ UI 显示 | 行动槽标签显示 |
| shape_cat | action_template_enriched.json | ✅ 数据保留 | 分类信息 |
| growth 数据 | action_growth_enriched.json | ✅ 已验证 | 技能成长数值 |

**建议：** enrich 报告中的 stats 字段可回写 Excel 作为平衡参考。

## 三、slotSize（体型占格）

| 字段 | 来源 | 状态 | 说明 |
|------|------|------|------|
| size | pal_units.json / shop_config.json | ✅ 已验证 | small=1, medium=2, large=3 |
| slotSize | 运行时计算 | ✅ 已验证 | 商店/背包/上阵均生效 |
| SHOP_CAPACITY | 常量 10 | ✅ 已验证 | genShop 限制 |
| ACTIVE_CAPACITY | 常量 10 | ✅ 已验证 | syncUnitsToHeroes 限制 |
| BACKPACK_CAPACITY | 常量 20 | ✅ 已验证 | buyUnit 限制 |

**建议：** 容量值可调整，当前为硬编码常量。如需 Excel 驱动，可改为配置加载。

## 四、relic（遗物状态）

| 字段 | 来源 | 状态 | 说明 |
|------|------|------|------|
| relics[] | G.relics 数组 | ✅ 已验证 | 开局遗物+gainRelic |
| relic_effect.relic_id | relic_config.json | ✅ 已验证 | 钩子匹配 |
| relic_effect.trigger | relic_config.json | ✅ 已接入 | 5 个钩子就绪 |
| relic_effect.effect_type | relic_config.json | ✅ 部分实现 | 简单效果已接入，复杂条件效果 pending |

**待回写 Excel 字段：** relic_effect 中 condition 字段（ally_pal, ally.element=fire 等条件链尚未完全使用）。

## 五、event（商店事件状态）

| 字段 | 来源 | 状态 | 说明 |
|------|------|------|------|
| event_master | event_config.json | ✅ 已验证 | 16 事件可用 |
| event_option | event_config.json | ✅ 已验证 | 选项+费用+奖励组 |
| event_reward | event_config.json | ✅ 部分实现 | 基础奖励（pal/relic/gold/buff/upgrade） |
| refresh_with_shop | event_config.json | ✅ 已验证 | 事件不随商店刷新 |
| repeatable | event_config.json | ✅ 已验证 | 事件只做一次 |

**建议：** reward_type=capacity_up 暂未实现完整效果，需确认含义。

## 六、hero level（英雄等级）

| 字段 | 来源 | 状态 | 说明 |
|------|------|------|------|
| hero_level_rule | hero_config.json | ✅ 已验证 | 4 级经验表 |
| hero_level_reward | hero_config.json | ✅ 部分实现 | Lv4 核心遗物已配，事件权重暂未影响 |
| hero_bias | hero_config.json | ✅ 数据读取 | 倾向标签暂未用于事件/遗物筛选 |

**建议：** hero_bias_tags 和 event_bias_tags 的权重影响尚未实现，建议 Excel 确认权重算法后补充。

## 七、同步优先级

1. 🔴 attack-shapes requiresFullFit 含义确认
2. 🟡 relic condition 条件链回写
3. 🟡 event_reward capacity_up 完整效果
4. 🟢 hero_bias 权重影响算法
5. 🟢 容量常量的 Excel 配置化

