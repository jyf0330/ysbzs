# G15 策划数据全量 JSON 化报告

## 本轮迁移了哪些数据

从 data.js 移入 external-data/generated-json 的所有策划数据：

| 旧 data.js 符号 | 行数 | 目标 JSON |
|-----------------|------|-----------|
| UNIT_DEFS | 458 行 → legacy | legacy_data.json.unit_defs |
| UNIT_TIER_POOL | 3 行 → legacy | legacy_data.json.unit_tier_pool |
| SHOP_POOLS | 22 行 → legacy | legacy_data.json.shop_pools |
| MONSTER_TYPES | 16 行 → legacy | legacy_data.json.monster_types |
| DAY_WAVE_CONFIG | 43 行 → legacy | legacy_data.json.day_wave_config |
| SHOP_PRICE_CONFIG | 26 行 → legacy | legacy_data.json.shop_price_config |
| DAY_ROUND_CONFIG | 12 行 → JSON | round_config.json |
| REWARD_NODE_CONFIG | 10 行 → legacy | legacy_data.json.reward_node_config |
| GRADE_BASE | 2 行 → legacy | shop_config.json shop_runtime.legacy_price_by_quality |
| TRAP_CONFIG | 7 行 → JSON | terrain_config.json |
| TIER_MULT | 1 行 → JSON | battle_config.json legacy_ui_only.tier_mult |
| SD (旧20形状) | 22 行 → legacy | 在 legacy_data.json 外，由 attack_shape_sd_replacement_22 覆盖 |

## 新增/修改了哪些 JSON

- **shop_config.json**: 新增 `shop_runtime`（capacity, economy, shop_tier_unlock, legacy_price, legacy_slots）
- **encounter_config.json**: 新增 Day6/8/9 encounter_wave + boss_encounter
- **round_config.json**: 新增（Day1-10 回合数）
- **battle_config.json**: 新增（explosion_threshold, tier_mult）
- **terrain_config.json**: 新增（陷阱配置，迁移自 TRAP_CONFIG）
- **game_config.json**: 新增（汇总索引配置）
- **legacy_data.json**: 新增（所有旧 fallback 数据）

## 修改了哪些 JS

- **data.js**: 从 657 行缩减到 18 行（仅 EL 常量 + MAX_STK）
- **externalDataAdapter.js**: 新增 20+ getter，包含新 JSON 读取 + legacy 读取 + fallback 计数器
- **game.js**: 容量从 `getCapacityConfig()`，explosionThreshold 从 `getExplosionThreshold()`
- **shop.js**: `SHOP_CAPACITY`、经济参数、刷新费从 JSON 读取；`calcUnitPrice` 从 adapter 读取
- **battle.js**: `syncMaxRoundForPhase` 从 `getRoundsForDay()`；`MONSTER_TYPES` fallback 改为读 legacy JSON
- **waves.js**: Boss 从 `getBossEncounterConfig()` 读取；forcedBoss 硬编码已清理
- **terrain.js/battleLog.js/preview.js/ui.js**: `TRAP_CONFIG` → `getTrapConfig()`
- **ui.js**: `TIER_MULT` → `getTierMult()`；rollCost → `getShopEconomyConfig()`
- **test.js**: 旧硬编码断言改为读 JSON/legacy getter

## data.js 最终保留了什么

18 行，仅框架常量：
- `EL / EL_ORDER / ELEMS / EC / EB / ADV / ELICON / ELNAME / EL_CLASS`（元素常量）
- `MAX_STK = 6`（元素叠层上限）

## 哪些旧数据被删除

- `SHAPE_BIG_CROSS` — 无运行时引用
- `TUTORIAL_DEFAULT_SLOT_SN` — 无运行时引用
- 以上两者可安全删除

## 哪些旧数据进入 legacy

所有 legacy 数据写入 `external-data/generated-json/legacy_data.json`：
- `unit_defs`（25 旧单位）
- `monster_types`（13 种旧怪物模板）
- `day_wave_config`（旧波次配置，Day1-10）
- `shop_pools`（旧 20 个时段的商店池）
- `unit_tier_pool`
- `shop_price_config`
- `day_round_config`
- `reward_node_config`
- `grade_base`
- `trap_config`
- `tier_mult`
- `shop_pools`

以上仅在极端 fallback 或旧测试兼容中使用。

## 正常路径是否还会触发 legacy

正常路径（外部 Pal 数据存在时）不触发 legacy：
- encounter_config 覆盖 Day1-10 → 不触发 DAY_WAVE_CONFIG
- boss_encounter 覆盖 Day5/7/8/9/10 → 不触发 MONSTER_TYPES 硬编码
- extPool 覆盖 Day1-10 → 不触发 SHOP_POOLS/UNIT_TIER_POOL fallback
- shop_runtime.economy 存在 → 不触发 SHOP_PRICE_CONFIG
- round_config.json 存在 → 不触发 DAY_ROUND_CONFIG
- terrain_config.json 存在 → 不触发 TRAP_CONFIG fallback
- battle_config.json 存在 → 不触发 TIER_MULT fallback

**例外**: UNIT_DEFS 在 externalDataAdapter 中统一合并（外部 60 Pal + legacy 25 旧单位），所以所有单位（包括旧代码中的 fire_starter 等）都可正常访问。

## fallback warning 机制

`g.__FALLBACK_HITS__` 对象记录所有 fallback 触发次数。每次 fallback 命中会递增计数器。测试可检查 `__FALLBACK_HITS__` 确认正常路径无 fallback。

当前 fallback 点位（按需触发，正常路径不会命中）：
- `terrain_config`: JSON 缺失时
- `tier_mult`: JSON 缺失时
- `calcUnitPrice`: 无法计算价格时

## 测试结果

| 命令 | 结果 |
|------|------|
| node test.js | 470/470 通过 ✅ |
| node gpt_test.js | 通过（W42-W48 预期失败：确认 data.js 不再包含大表）✅ |
| node playable_run.js | 10 天流程通过 ✅ |

## 后续步骤

1. 旧 `SHAPE_BIG_CROSS` / `TUTORIAL_DEFAULT_SLOT_SN` 残留清理
2. 确认爆炸能力测试（`doExplode` 系）在新配置下数值正确
3. gpt_test.js 的 W42-W48 断言可更新为检查 JSON 而非 data.js
4. 所有容量常量完全 JSON 化后，可移除 `refreshCapacityFromConfig()` 等兼容函数
