# 任务：Bazaar-like full runtime 集成 + 测试覆盖

task_id: 2026-06-04_bazaar-full-runtime-integration
status: DONE
priority: P0
created_at: 2026-06-04 17:00
done_at: 2026-06-04 17:40

## 目标

从 ysbzs-master-bazaar-yaml-v3-full-runtime.zip 集成 9 个 Bazaar-like 规则到运行时：
hero_level_rule, pal_level_rule, pve_reward_rule, affix_rule,
effect_trigger_rule, effect_resolve_rule, ai_shop_pick_rule,
log_template, compatibility_rule

## 改动文件

- externalDataAdapter.js: 新增 31 个 Bazaar-like v3 runtime 函数
- battle.js: settleExplosions/useSlot/move 触发点 + 奖励结算
- game.js: 接入 bazaarAddHeroXp/palLevel/affixes/结构日志
- elements.js: 十字火检查扩展 pal_fire_archon
- shop.js: Merchant reroll 读取 + 背包容量 + Pal 工厂
- playable_run.js: AI 购买改为 bazaarPickShopAction
- ui.js: 简化城堡 HUD + Shop 渲染
- gpt_test.js: 新增 K_bazaar 分组(33项) + H_event 完整闭环(15项)

## 验收

- node test.js: ✅ 472/472
- node gpt_test.js: ✅ 422/422, 0 fail, 1 warn
- node playable_run.js: ✅ 10 天完整 Run
- node playable_day1.js: ✅ Day1 走查
- Bazaar运行时测试: 33/33 ✅
- 事件行为测试: 15/15 ✅

## related_files

- externalDataAdapter.js
- battle.js
- game.js
- elements.js
- shop.js
- playable_run.js
- ui.js
- index.html
- preview.js
- test.js
- gpt_test.js
- tasks/index.md

## commit_plan

type: feat
scope: core
subject: Bazaar-like full runtime 集成 — 9 规则闭环 + 测试覆盖
