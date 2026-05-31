# ysbzs v1 基准测试报告

> 时间: 2026-05-31T13:59:13.830Z
> 模式: FULL (C01-C12)
> 套件: ysbzs-benchmark-v1

## 判据统计

### Case 级（12 个 Case）

| 判据 | 数量 |
|------|------|
| ⬜ GAP_ONLY | 6 |
| ⚪ NOT_IMPLEMENTED | 2 |
| 🔵 SPEC_TARGET | 1 |
| 🟢 PASS | 3 |

### 子检查级（38 项检查）

| 判据 | 数量 |
|------|------|
| 🟢 PASS | 20 |
| ⬜ GAP_ONLY | 10 |
| ⚪ NOT_IMPLEMENTED | 4 |
| 🟡 PENDING_OK | 2 |
| 🔵 SPEC_TARGET | 2 |

## Case 结果

### C01: Phase1 口径检查 — ⬜ GAP_ONLY

> 来源: `docs/01_游戏设计（策划主导）/关卡策划/04_第一阶段10天怪物刷怪闭环设计.md`

| 检查 | 判据 | 详情 |
|------|------|------|
| C01a 召唤流不绑定水 | 🟢 PASS | 04_刷怪闭环设计前提明确: 中立召唤流闭环，不绑定水系 |
| C01b 水/风/土=pending | ⬜ GAP_ONLY | 水治疗/风牵制/土阻挡为pending状态 |
| C01c 火+召唤=active | 🟢 PASS | 火+召唤核心英雄全部存在于代码中: 7/7 |

### C02: 大巴扎商店结构检查 — ⬜ GAP_ONLY

> 来源: `docs/01_游戏设计（策划主导）/关卡策划/03_10天商店闭环验证_大巴扎对齐版.md`

| 检查 | 判据 | 详情 |
|------|------|------|
| C02a 摊位定义 | ⬜ GAP_ONLY | 摊位定义在fixture中存在，代码未实现 |
| C02b 标签AND过滤 | ⬜ GAP_ONLY | 标签AND过滤(filterLogic)在fixture中定义，代码未实现 |
| C02c 品级定价结构 | 🟢 PASS | GRADE_BASE已定义 |
| C02d 保证位定义 | ⬜ GAP_ONLY | 保证位生成逻辑在fixture中定义，代码未实现 |
| C02e 刷新规则 | 🟢 PASS | 刷新/冻结逻辑存在于代码中 |

### C03: 10天节奏节点检查 — ⚪ NOT_IMPLEMENTED

> 来源: `docs/01_游戏设计（策划主导）/关卡策划/03_10天商店闭环验证_大巴扎对齐版.md`

| 检查 | 判据 | 详情 |
|------|------|------|
| C03a Day1教学 | 🟢 PASS | Day1配置存在 |
| C03b Day4黄金首触 | ⚪ NOT_IMPLEMENTED | Day4稀有商人未实现。代码仅Day1-5 |
| C03c Day5 pT3 | 🟢 PASS | Day5配置存在(但pT3入池未实现) |
| C03d Day7 pT4 | ⚪ NOT_IMPLEMENTED | Day7 pT4入池未实现。DAY_WAVE_CONFIG仅Day1-5 |
| C03e Day10最终战 | ⚪ NOT_IMPLEMENTED | Day10未实现。boss10未定义 |

### C04: Ability pending边界检查 — ⬜ GAP_ONLY

> 来源: `docs/01_游戏设计（策划主导）/关卡策划/04_第一阶段10天怪物刷怪闭环设计.md`

| 检查 | 判据 | 详情 |
|------|------|------|
| C04a 怪物ability=pending | 🟡 PENDING_OK | 怪物无ability实现，全部pending。符合第一阶段规则 |
| C04b 英雄passive=pending | 🟡 PENDING_OK | 7个被动字段定义，可能部分已执行但标记为pending |
| C04c ability framework未启用 | ⬜ GAP_ONLY | 1/9 hooks出现但未形成framework |

### C05: 品级定价检查 — ⬜ GAP_ONLY

> 来源: `docs/01_游戏设计（策划主导）/关卡策划/03_10天商店闭环验证_大巴扎对齐版.md §七 + 02_shop_config_bazaar.json`

| 检查 | 判据 | 详情 |
|------|------|------|
| C05a 文档-fixture一致 | 🟢 PASS | fixture定价与文档一致: 青铜2/白银4/黄金6/钻石8 |
| C05b 文档-代码GRADE_BASE一致 | ⬜ GAP_ONLY | 代码中GRADE_BASE未定义 |
| C05c json配置一致 | 🟢 PASS | JSON定价与文档一致(bronze2/silver4/gold8) |

### C06: 同名合成与重复出现检查 — ⬜ GAP_ONLY

> 来源: `docs/01_游戏设计（策划主导）/关卡策划/03_10天商店闭环验证_大巴扎对齐版.md`

| 检查 | 判据 | 详情 |
|------|------|------|
| C06a 不排除已拥有 | ⬜ GAP_ONLY | 未发现排除已拥有英雄的逻辑。fixture定义excludeOwned=false |
| C06b 同名重复规则明确 | 🟢 PASS | 文档§五明确同名合成升阶，保证位优先同名 |
| C06c 合成逻辑存在 | 🟢 PASS | 代码存在同名合成逻辑 |

### C07: 保证位检查 — 🔵 SPEC_TARGET

> 来源: `docs/01_游戏设计（策划主导）/关卡策划/03_10天商店闭环验证_大巴扎对齐版.md`

| 检查 | 判据 | 详情 |
|------|------|------|
| C07a Day1召芽灵 | 🟢 PASS | sprout_summoner(召芽灵)存在于代码中 |
| C07b Day3/5/7保证位 | 🔵 SPEC_TARGET | Day3/Day5/Day7同名保证位为未来目标 |
| C07c 保证位绕过品级骰子 | 🔵 SPEC_TARGET | 保证位绕过品级骰子为未来目标 |

### C08: 经济闭环检查 — 🟢 PASS

> 来源: `docs/01_游戏设计（策划主导）/关卡策划/03_10天商店闭环验证_大巴扎对齐版.md`

| 检查 | 判据 | 详情 |
|------|------|------|
| C08a 收入来源完整 | 🟢 PASS | fixture 10天经济数据完整且与文档一致 |
| C08b Day5能买pT3 | 🟢 PASS | Day5累计40金，pT3=6金 |
| C08c Day7能买pT4 | 🟢 PASS | Day7累计49金，pT4=8金 |

### C09: 怪物类型字段完整性检查 — ⚪ NOT_IMPLEMENTED

> 来源: `docs/01_游戏设计（策划主导）/关卡策划/04_第一阶段10天怪物刷怪闭环设计.md`

| 检查 | 判据 | 详情 |
|------|------|------|
| C09a 12种齐全 | ⚪ NOT_IMPLEMENTED | 代码仅有6种(normal:  {,thick:   {,fast:    {,heavy:   {,elite:   {,boss:    {)，缺失12种(normal,thick,fast,heavy,swarm,elite,blocker,siege,boss5,minion,boss8,boss10) |
| C09b 字段完整 | 🟢 PASS | fixture中全部12种怪物字段完整(hp/atk/ap/gold/tags/role) |
| C09c ability字段占位 | 🟢 PASS | 全部5种需要ability占位的怪物都有ability字段 |

### C10: 20战斗小段HP/ATK自动计算检查 — 🟢 PASS

> 来源: `docs/01_游戏设计（策划主导）/关卡策划/04_第一阶段10天怪物刷怪闭环设计.md`

| 检查 | 判据 | 详情 |
|------|------|------|
| C10a 20段HP/ATK自动计算 | 🟢 PASS | 全部20段HP/ATK由monster_types自动计算验证一致 |

### C11: 压力曲线检查 — 🟢 PASS

> 来源: `docs/01_游戏设计（策划主导）/关卡策划/04_第一阶段10天怪物刷怪闭环设计.md`

| 检查 | 判据 | 详情 |
|------|------|------|
| C11a 关键天有压力说明 | 🟢 PASS | Day5/7/9/10战斗小段完整(共8段) |
| C11b Day9>Day10有解释 | 🟢 PASS | Day9总HP=443>Day10=386，文档§七已解释: Day10数量少但单体超强 |
| C11c T4依赖有替代 | 🟢 PASS | 文档§七已标注Day7-8依赖T4的风险，建议降数值或补T4池 |

### C12: 实现缺口与旧ID污染报告 — ⬜ GAP_ONLY

> 来源: `index.html (当前代码) + docs/01_游戏设计（策划主导）/关卡策划/04_第一阶段10天怪物刷怪闭环设计.md`

| 检查 | 判据 | 详情 |
|------|------|------|
| C12a 旧ID标注清晰 | ⬜ GAP_ONLY | 8个legacy ID已标注。部分(water_torrent/wind_storm/earth_mountain等)仍在SHOP_POOLS中但属于遗留代码。 |
| C12b 无口径污染 | ⬜ GAP_ONLY | 1个legacy/utility ID存在于SHOP_POOLS中，属于遗留代码，非新规则主动引用 |
| C12c MONSTER_TYPES无旧ID | ⬜ GAP_ONLY | 缺失swarm,blocker,siege,boss5,minion,boss8,boss10，额外boss |

