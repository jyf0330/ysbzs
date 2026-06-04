# 数据表质量报告

基于 `external-data/generated-json/` 最新数据（commit 484582d）。

## 总览

| 表名 | 行数 | 状态 |
|------|:----:|:----:|
| pal_master | 60 | ✅ |
| pal_stats_ysbzs | 60 | ✅ |
| unit_usage | 60 | ✅ |
| action_template | 180 | ✅ 60 Pal × 3 slots |
| action_growth | 720 | ✅ 60 Pal × 3 slots × 4 levels |
| shop_source | 60 | ✅ |
| shop_rule | 12 | ✅ |
| encounter_wave | 10 | ✅ Day1-10 全覆盖 |
| relic_master | 17 | ✅ |
| relic_effect | 15 | ✅ |
| event_master | 16 | ✅ |
| event_option | 29 | ✅ |
| hero_master | 1 | ✅（火种驯宠师） |
| hero_starting_config | 3 | ✅（2 宠物 + 1 遗物） |
| hero_level_rule | 4 | ✅ Lv1-4 |
| attack_shape_master | 22 | ✅ 12 core + 10 reserve |

## 遭遇波次（Encounter Waves）

| Day | 敌人池 | 数量 | HP倍率 | ATK倍率 | 金币奖励 |
|:---:|--------|:----:|:------:|:-------:|:--------:|
| 1 | small_bronze_pal_pool | 1 | 0.80 | 0.80 | 2 |
| 2 | small_bronze_pal_pool | 2 | 0.90 | 0.90 | 3 |
| 3 | bronze_mixed_pal_pool | 3 | 1.00 | 1.00 | 4 |
| 4 | bronze_silver_pal_pool | 3 | 1.10 | 1.00 | 4 |
| 5 | silver_gold_pal_pool | 4 | 1.20 | 1.10 | 5 |
| 6 | silver_gold_pal_pool | 4 | 1.25 | 1.25 | 5 |
| 7 | gold_pal_pool | 4 | 1.35 | 1.20 | 6 |
| 8 | gold_diamond_pal_pool | 5 | 1.40 | 1.35 | 6 |
| 9 | gold_diamond_pal_pool | 5 | 1.55 | 1.45 | 7 |
| 10 | gold_diamond_pal_pool | 5 | 1.50 | 1.35 | 8 |

**难度曲线：** 从 Day1（1 怪，0.8 倍率）到 Day10（5 怪，1.5 倍率），平滑递增。Day9 达到峰值压力（5 怪，1.55 HP，1.45 ATK），略高于 Day10 最终战，为合理配置。

## 元素分布（60 Pal）

| 元素 | 数量 |
|:----:|:----:|
| fire | 13 |
| water | 13 |
| wind | 18 |
| earth | 16 |

## 体型分布

| size | 数量 | slotSize |
|:----:|:----:|:--------:|
| small | 20 | 1 |
| medium | 27 | 2 |
| large | 13 | 3 |

## 品质分布

| quality | 数量 |
|:-------:|:----:|
| 青铜 | 22 |
| 白银 | 14 |
| 黄金 | 13 |
| 钻石 | 11 |

## 攻击形状分布（22 shapes）

| SN | 名称 | cat | status | 说明 |
|:--:|------|:---:|:------:|------|
| 1 | 单点刺 | line | core | 基础单格 |
| 2 | 二连刺 | line | core | 2 格横排 |
| 3 | 三连枪 | line | core | 3 格横排 |
| 4 | 横扫三格 | sweep | core | 横扫攻击 |
| 5 | 前二横扫 | sweep | core | 双格横扫 |
| 6 | 标准前置T | t_shape | core | T 形 4 格 |
| 7 | 长柄T | t_shape | core | 前伸 T 形 |
| 8 | 宽头T | t_shape | core | 宽区域 T 形 |
| 9 | 双层T | t_shape | core | 两层 T 形 |
| 10 | 前方2×2 | square | core | 2×2 方块 |
| 11 | 远程横三 | remote | core | 远程横线 |
| 12 | 远程T | remote_t | core | 远程 T 形 |
| 13 | 隔格枪 | line | reserve | 间隔攻击 |
| 14 | 横扫五格 | sweep | reserve | 5 格横扫 |
| 15 | 近远双横扫 | sweep | reserve | 双行横扫 |
| 16-22 | 其他 | - | reserve | 扩展保留 |

## 英雄等级

| Lv | 品质 | XP 要求 | 奖励 |
|:--:|:----:|:-------:|------|
| 1 | 青铜 | 0 | 开局配置（2 宠物 + 遗物） |
| 2 | 白银 | 3 | 火系事件/遗物权重增强 |
| 3 | 黄金 | 7 | 解锁黄金英雄遗物池 |
| 4 | 钻石 | 12 | 获得/选择核心英雄遗物 |

## 行动槽分布（180 template）

| slot_role | 数量 | 占比 |
|:---------:|:----:|:----:|
| summon | 14 | 8% |
| aoe_attack | 97 | 54% |
| support | 16 | 9% |
| heal | 6 | 3% |
| single_attack | 13 | 7% |
| line_attack | 34 | 19% |

**分析:** AOE 攻击占比最高（54%），符合游戏快速清场节奏。召唤（8%）和治疗（3%）占比较低，作为特殊流派。

## 形状使用分布（180 template）

| SN | 使用次数 | 占比 |
|:--:|:--------:|:----:|
| 1 | 34 | 19% |
| 2 | 13 | 7% |
| 3 | 21 | 12% |
| 4 | 39 | 22% |
| 6 | 24 | 13% |
| 7 | 8 | 4% |
| 8 | 19 | 11% |
| 12 | 22 | 12% |

**分析:** 仅使用了 8 种形状（1/2/3/4/6/7/8/12），全部为 core 类型。SN4（横扫三格）使用最多（22%），SN1（单点刺）其次（19%）。SN7（长柄T）最少（4%）。
