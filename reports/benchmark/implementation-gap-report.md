# ysbzs v1 实现缺口报告

> 基于 benchmarks/ysbzs/ 基准测试套件 C12 + 全量扫描  
> 时间: 2026-05-31  
> 不改代码，只标记缺口

## 总览

| 类别 | 数量 | 说明 |
|------|------|------|
| NOT_IMPLEMENTED | 6大项 | 文档要求但代码未实现 |
| GAP_ONLY | 8项 | 有定义但代码路径不同/未完全实现 |
| PENDING_OK | 9项 | 文档明确pending，第一阶段不要求 |
| SPEC_TARGET | 3项 | 未来目标，当前不要求 |
| **无 FAIL** | **0** | 没有文档-代码矛盾或旧口径污染 |

---

## 一、NOT_IMPLEMENTED（需实现）

### 1.1 MONSTER_TYPES 只有6/12种
- 当前代码: normal, thick, fast, heavy, elite, boss (通用小Boss)
- 缺失: swarm, blocker, siege, boss5, minion, boss8, boss10
- 来源: `04_第一阶段10天怪物刷怪闭环设计 §二`

### 1.2 10天扩展未实现
- DAY_WAVE_CONFIG 仅 Day1-5
- DAY_ROUND_CONFIG 仅 Day1-5
- SHOP_POOLS 仅 Day1-5
- 缺失 Day6-10 全部配置

### 1.3 pT3/pT4 节点未实现
- Day4 稀有商人(黄金首触)
- Day5 Boss奖励(半价黄金)
- Day6 Boss奖励(免费钻石)
- Day7 传说宝箱(钻石入池)
- 来源: `03_10天商店闭环验证 §三`

### 1.4 T3/T4 英雄未定义
- 文档定义的黄金级: 烈焰使、锻火灵、令芽灵
- 文档定义的钻石级: 龙焰灵、主芽灵
- 代码中无 priceTier≥3 的英雄

### 1.5 大巴扎摊位系统未实现
- stallDefs 数组未定义
- 标签AND过滤(filterLogic)未接入
- 保证位(guaranteeSlots)未实现

### 1.6 ability system 框架未实现
- 9个hooks均未建立框架
- 怪物ability字段未接入执行
- 英雄passive字段定义了但未走统一framework

---

## 二、GAP_ONLY（有定义但路径不同）

### 2.1 商店结构
- GRADE_BASE 已定义(青铜2/白银4/黄金6/钻石8)，但 genShop 用 SHOP_PRICE_CONFIG(tier1:3/tier2:6)
- 刷新/冻结逻辑存在但非摊位级
- excludeOwned 未显式设为false

### 2.2 旧ID遗留
- water_torrent, wind_storm, earth_mountain 在 SHOP_POOLS 中
- earth_shield 和 pebble_guard 都叫"岩岩灵"（重复名）
- bubble_sprite, balance 等 utility 英雄仍存在

### 2.3 代码数值与文档差异
- elite.hp: 代码=18, 文档=20
- boss.hp: 代码=30(通用), 文档boss5=35/boss8=45/boss10=60
- 这些差异不是矛盾，而是代码的monster定义比文档的完整表更早期/更通用

### 2.4 召唤流口径
- C01已确认: 文档明确"中立召唤流闭环，不绑定水"
- 代码中 sprout_summoner 标签正确: ['召唤','水','构筑核心'] — 有召唤标签+水元素但未绑定
- fluff_speaker, split_sprite, spring_sprite 等也正确使用召唤标签

---

## 三、PENDING_OK（第一阶段不要求）

| 项目 | 状态 | 计划 |
|------|------|------|
| 怪物ability: blocker/siege/boss5/boss8/boss10 | pending | 二阶段 |
| 英雄passive: ember_seed/fluff_speaker/boom_sprite/split_sprite | pending | 一阶段后期 |
| 英雄passive: breeze_sprite/spring_sprite/pebble_guard | pending | 二阶段 |
| T3/T4英雄特殊能力: 锻火灵/令芽灵/龙焰灵/主芽灵 | pending | 一阶段最小版 |
| ability system framework | pending | 架构先于实现 |
| 水治疗(泉泉灵) | pending | 二阶段 |
| 风牵制(风风灵) | pending | 二阶段 |
| 土阻挡(岩岩灵) | pending | 二阶段 |
| 利息系统 | pending | 二阶段 |

---

## 四、SPEC_TARGET（未来目标）

| 项目 | 说明 |
|------|------|
| Day1保证位召芽灵(4金) | sprout_summoner在SHOP_POOLS中但无保证位逻辑 |
| Day3/Day5/Day7同名保证位 | 文档已定义，代码路径待实现 |
| 保证位绕过品级骰子 | 设计已明确，实现路径待定 |

---

## 五、已确认一致（PASS）

| 检查 | 说明 |
|------|------|
| C01a 召唤流中立 | ✅ 文档明确中立召唤流闭环 |
| C01c 火+召唤核心 | ✅ 7/7核心英雄存在 |
| C05a 文档-fixture定价 | ✅ 青铜2/白银4/黄金6/钻石8 |
| C05c JSON配置定价 | ✅ 02_shop_config_bazaar.json一致 |
| C06b 同名合成规则 | ✅ 文档§五明确 |
| C06c 合成逻辑 | ✅ 代码有同名合成 |
| C08 经济闭环 | ✅ 10天经济全部自洽 |
| C09b/c 怪物字段 | ✅ fixture字段完整 |
| C10 HP/ATK计算 | ✅ 20/20段验证一致 |
| C11 压力曲线 | ✅ 文档自洽，Day9>Day10有解释 |
