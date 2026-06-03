# G14 Legacy Fallback 审计报告

生成时间: 2026-06-04
审核范围: 外部 JSON 配置接入后的旧数据引用

---

## 符号引用清单

### UNIT_DEFS

| 位置 | 内容 | 触发路径 | 是否仅 fallback |
|------|------|----------|-----------------|
| `externalDataAdapter.js:352-363` | 外部 UNIT_DEFS 合并 | 每次加载 | 否（合并后覆盖旧数据） |
| `game.js:233` | addOwnedUnit 查找 def | 游戏内所有单位创建 | 否（创建 Pal 时也走这里） |
| `game.js:281` | syncUnitsToHeroes 读 def | 上阵同步 | 否 |
| `shop.js:68` | getShopPoolIds 验证 | 旧池 fallback | **是** |
| `shop.js:98/119/189` | genShop / buyUnit | 商店操作 | 否（同时服务于 Pal 和旧单位） |
| `ui.js:1778/1794/1807/1826` | UI 渲染（单位名/卡牌） | 每次渲染 | 否 |
| `test.js:1055/1292-1315/3044-3943` | 测试断言 | 测试 | 否（测试覆盖了旧和新的 UNIT_DEFS） |
| `elements.js:202-276` | passive 技能 | 战斗回合 | 否 |

**结论**: UNIT_DEFS 被大量代码依赖，不仅仅是 fallback。在游戏逻辑中它是所有单位定义的统一入口（已通过 externalDataAdapter 合并外部 Pal 数据）。**不可删除**，但可考虑将旧 25 单位定义移到单独文件。

### UNIT_TIER_POOL

| 位置 | 内容 | 触发路径 | 是否仅 fallback |
|------|------|----------|-----------------|
| `shop.js:107` | genShop fallback 池 | extPool 不存在时 | **是** |
| `shop.js:276` | addLevelupUnit fallback | extPool 不存在时 | **是** |

**结论**: 仅当 getExternalOnlyPool() 返回 null 时 fallback。当前 extPool 覆盖 Day1-10，**正常运行不触发**。

### SHOP_POOLS

| 位置 | 内容 | 触发路径 | 是否仅 fallback |
|------|------|----------|-----------------|
| `externalDataAdapter.js:165` | buildMergedShopPools 合并旧 ID | 外部池构建 | 否（用于兼容性合并） |
| `externalDataAdapter.js:370-371` | 被 newShopPools 替换 | 外部数据加载 | 否（被覆盖为外部池） |
| `shop.js:66` | getShopPoolIds 读取 | 旧池 fallback | **是** |
| `test.js:3029-3946` | 测试断言 | 测试 | 否（测试同时覆盖了新旧池） |

**结论**: 运行时已被 getExternalOnlyPool 取代。旧 SHOP_POOLS 仅存于 legacy fallback 路径。

### MONSTER_TYPES

| 位置 | 内容 | 触发路径 | 是否仅 fallback |
|------|------|----------|-----------------|
| `waves.js:16/44` | buildWaveForDay 读怪物模板 | 旧抽象波次系统 | **是**（仅在 Pal 波次失败时触发） |
| `battle.js:437/455` | 战斗中读怪物能力 / 基础属性 | 战斗结算 | 否（即使 Pal 敌人也 fallback 读能力） |
| `test.js:3129-3976` | 测试断言 | 测试 | 否 |
| `elements.js` | 依赖注释 | 文档 | - |

**结论**: `MONSTER_TYPES` 在 `battle.js:437` 处仍有实际作用 —— 当 Pal 敌人没有 `ability` 字段时 fallback 读取。需确认 boss_encounter 的 ability 已正确传递。`battle.js:455` 用于获取怪物类型的基础属性（如 `cost`），Pal 敌人有自己的属性，此路实际不走。**可标记为 legacy_fallback_only**，但 `battle.js:437` 的 fallback 需先确认。

### DAY_WAVE_CONFIG

| 位置 | 内容 | 触发路径 | 是否仅 fallback |
|------|------|----------|-----------------|
| `waves.js:8` | buildWaveForDay 读波次配置 | 旧波次生成 | **是**（仅 Pal 波次失败时触发） |
| `test.js:3910-3916` | 测试断言 | 测试 | 否 |

**结论**: 已由 encounter_config 全覆盖（Day1-10）。**正常运行不触发**。

### SHOP_PRICE_CONFIG

| 位置 | 内容 | 触发路径 | 是否仅 fallback |
|------|------|----------|-----------------|
| `shop.js:26-28` | openShop 读收入/利息 | 每次开店 | **否**（但优先读 shop_runtime，次选此 fallback） |
| `shop.js:114` | genShop fallback 读 shopSlots | extPool 不存在时 | **是** |
| `shop.js:222` | rollShop 读刷新费 | 刷新 | **否**（优先读 shop_runtime，次选 fallback） |
| `ui.js:1771` | UI 显示刷新费 | 渲染 | **否**（优先读 shop_runtime 的 roll_cost） |

**结论**: `openShop` 和 `rollShop` 已优先读 `shop_runtime.economy`。`SHOP_PRICE_CONFIG` 只在 JSON 缺失时 fallback。**JSON 正常时不读**。

### DAY_ROUND_CONFIG

| 位置 | 内容 | 触发路径 | 是否仅 fallback |
|------|------|----------|-----------------|
| `battle.js:748-754` | syncMaxRoundForPhase | 每次换阶段 | **否**（优先读 round_config，次选 fallback） |
| `test.js:3587-3908` | 测试断言 | 测试 | 否 |

**结论**: `syncMaxRoundForPhase` 已优先读 `getRoundsForDay()`。仅 JSON 缺失时 fallback。

### GRADE_BASE / calcUnitPrice

| 位置 | 内容 | 触发路径 | 是否仅 fallback |
|------|------|----------|-----------------|
| `shop.js:132/133/300/301` | genShop / addLevelupUnit 价格计算 | 商店生成 | **否**（extPool 模式下仍然调用） |

**结论**: `calcUnitPrice` 被 genShop 直接调用，无论是否 extPool 模式。shop_source 已有 `price` 字段，但商品对象创建时仍复用 `calcUnitPrice(def)`。这不是严格的 fallback —— 它是统一价格计算入口。**可迁移为从 shop_runtime.legacy_price_by_quality 读取**，但需改 shop.js 逻辑。

### REWARD_NODE_CONFIG

| 位置 | 内容 | 触发路径 | 是否仅 fallback |
|------|------|----------|-----------------|
| `test.js:3949-3952` | 测试断言 | 仅测试 | **运行时完全未使用** |

**结论**: **无运行时引用**。可在删除测试断言后直接删除。

### buildWaveForDay

| 位置 | 内容 | 触发路径 | 是否仅 fallback |
|------|------|----------|-----------------|
| `waves.js:114` | 在 Pal 波次失败时调用 | 旧系统 fallback | **是** |
| `test.js:968-1012` | 测试 | 测试 | 否 |

**结论**: 仅当 `buildPalWaveForDay` 返回 null 时触发。目前 encounter_config 覆盖 Day1-10，不应触发。

### buildFallbackPalWaveConfig

| 位置 | 内容 | 触发路径 | 是否仅 fallback |
|------|------|----------|-----------------|
| `waves.js:157` | encounter_config 无此天时调用 | 旧派生配置 | **是** |

**结论**: 现在 encounter_config 已有 Day6/8/9，**正常运行不触发**。可保留为安全网。

### forcedBoss / boss5 / boss8 / boss10

| 位置 | 内容 | 触发路径 | 状态 |
|------|------|----------|------|
| `waves.js:39-54` | buildWaveForDay 内 forcedBoss 逻辑 | 旧波次系统 | 仍存在，但旧路径不触发 |
| `waves.js:91-105` | spawnWaveForDay 内新增 boss 逻辑 | Pal 波次 | **已改为读 getBossEncounterConfig** |
| `playable_run.js:183/188` | boss 确认检查 | playable_run | 不需要改，只是检查 typeId |
| `test.js:3536/3918/3921/3926-3976` | 测试断言 | 测试 | 测试需要适配但非紧急 |

---

## 总结

### 正常运行路径不再触发的旧数据

| 旧数据 | 原因 | 是否可删除 |
|--------|------|-----------|
| `REWARD_NODE_CONFIG` | **无运行时引用** | ✅ 可移除 |
| `DAY_WAVE_CONFIG` | 全部由 encounter_config 覆盖 | ✅ 可移除（需改测试） |
| `buildWaveForDay` | Pal 波次路径全覆盖 | ✅ 可移除（需改测试） |
| `buildFallbackPalWaveConfig` | encounter_config 覆盖 Day6/8/9 | 🔶 保留为安全网 |
| `SHOP_POOLS` (旧池) | 被级联外部池完全取代 | ✅ 可移除（需改测试） |

### 正常运行路径仍在使用的旧数据

| 旧数据 | 说明 | 行动计划 |
|--------|------|----------|
| `UNIT_DEFS` | 游戏核心依赖，外部数据已合并进来 | 🔶 移到 legacyData.js |
| `UNIT_TIER_POOL` | fallback 路径使用 | 🔶 改测试后移除 |
| `MONSTER_TYPES` | battle.js:437 仍 fallback 读 ability | 🔶 移除依赖后标记 |
| `SHOP_PRICE_CONFIG` | JSON 优先，此为 fallback | 🔶 保持现状态 |
| `DAY_ROUND_CONFIG` | JSON 优先，此为 fallback | 🔶 保持现状态 |
| `GRADE_BASE / calcUnitPrice` | 统一价格计算入口 | 🔶 可改从 legacy_price_by_quality 读 |

### 已验证

- encounter_config 覆盖 Day1-10 ✅
- boss_encounter 覆盖 Day5/7/8/9/10 afternoon ✅
- shop_runtime 已接入 openShop / rollShop ✅
- round_config 已接入 syncMaxRoundForPhase ✅
- battle_config 已接入 initGame ✅
- node test.js: 470/470 ✅
- node gpt_test.js: 通过 ✅
- node playable_run.js: 通过 ✅
