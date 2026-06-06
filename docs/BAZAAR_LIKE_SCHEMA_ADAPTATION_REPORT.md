# Bazaar-like YAML Schema 接入报告

created_at: 2026-06-04_17-12
updated_at: 2026-06-04_17-12
integrated_from: ysbzs-master-bazaar-yaml-v3-integrated.zip
status: PASS

## 结论

已把 `ysbzs_bazaar_like_yaml_schema_v3` 的完整结构接入当前代码包。商店主流程已优先走 Bazaar-like YAML schema：

`day/dayHalf -> merchant_master -> merchant_rule -> merchant_pool_rule -> runtime Pal cards -> shop offers -> buy/reroll/event/log`

旧 `SHOP_POOLS` 仅保留 fallback；主流程在 `shop.js/genShop()` 中先调用 `rollBazaarLikeShopOffers()`。

## 接入文件

新增 YAML 源数据目录：

`game-data-source/yaml/bazaar-like-schema/`

新增 generated JSON 目录：

`external-data/generated-json/bazaar-like-schema/`

已纳入 27 张 YAML/JSON 结构表，包含 v3 要求的 8 张扩展表：

- `effect_trigger_rule.yaml/json`
- `effect_resolve_rule.yaml/json`
- `economy_rule.yaml/json`
- `pve_reward_rule.yaml/json`
- `affix_rule.yaml/json`
- `ai_shop_pick_rule.yaml/json`
- `log_template.yaml/json`
- `compatibility_rule.yaml/json`

同时包含商店/事件/等级基础表：

- `card_master`
- `merchant_master`
- `merchant_rule`
- `merchant_pool_rule`
- `merchant_reroll_rule`
- `event_master`
- `event_rule`
- `reward_table`
- `encounter_schedule`
- `hero_level_rule`
- `pal_level_rule`
- `level_reward_table`

## 代码改动

### externalDataAdapter.js

新增 Bazaar-like schema 适配 API：

- `getBazaarLikeTable(name)`
- `getBazaarLikeSchema()`
- `buildBazaarRuntimeCards()`
- `selectBazaarMerchant(day, dayHalf)`
- `rollBazaarLikeShopOffers(ctx)`
- `writeStructuredLog(logKey, data, fallbackText)`

并让以下配置优先读取 Bazaar-like 结构：

- `getCapacityConfig()` -> `economy_rule.capacity`
- `getShopEconomyConfig()` -> `economy_rule.daily_income / interest / reroll_cost`

### shop.js

`genShop()` 已改为：

1. 先读 `rollBazaarLikeShopOffers()`。
2. 使用 `merchant_master + merchant_rule + merchant_pool_rule` 生成商品。
3. 商品仍映射到当前真实 Pal 数据，避免示例 YAML ID 影响运行。
4. 旧外部 Pal 池和 `SHOP_POOLS` 只保留 fallback。

新增结构化日志：

- `shop_enter`
- `shop_offer_roll`
- `shop_buy`
- `shop_buy_fail`
- `shop_reroll`
- `event_select`

日志会写入 `G.actionLog`，并在有文本时同步 DOM log，避免之前“DOM 有日志、结构化日志没有”的分裂问题。

### gpt_test.js

新增 Bazaar-like schema 验收组：

- 检查 27 张 YAML 源表存在。
- 检查 27 张 generated JSON 存在。
- 检查商人、商人规则、商人池、事件、触发、效果、经济、AI、日志、兼容规则完整。
- 检查 `genShop()` 主流程先走 Bazaar-like schema，旧池只 fallback。
- 检查 YAML 未使用外部游戏原英雄名。

事件行为测试从原来的大量 SKIP 改为真实执行：

- 生成事件
- 生成事件选项
- 解析奖励池
- 执行事件
- 标记 done
- 从事件列表移除
- 写入 `G.actionLog`

## 修复项

上传代码原始状态：

- `node test.js` = 471/472，失败项：`buildWaveForDay Day4 含精英怪`

当前状态：

- `node test.js` = 473/473 PASS
- `node gpt_test.js` = 524 total / 523 pass / 0 fail / 1 warn
- `node playable_run.js` = PASS
- `node playable_day1.js` = PASS

## 验证命令

```bash
node test.js
node gpt_test.js
node playable_run.js
node playable_day1.js
```

## 注意

- 本次只学 Bazaar-like 结构，不搬 The Bazaar / BazaarDB 的原名、原文案、完整数值、图片或图标。
- YAML 中少量示例 `card_master` ID 不作为运行商品来源；运行商品由 `buildBazaarRuntimeCards()` 从当前真实 Pal 数据生成。
- 普通商店仍只卖 Pal；遗物继续通过事件、等级、战斗/Boss 奖励获得。
- pT3 Day5、pT4 Day7 的 ysbzs 快节奏压缩口径保留。
