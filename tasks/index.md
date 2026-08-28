# 任务总览

最后刷新：2026-07-30，由 `2026-07-30_bazaar-source-complete-shop-roster` 收口。

## 使用规则

- 只读查询、源码定位、`diff`、`策划`、简单命令检查不创建任务卡。
- 修改仓库文件前才创建或更新薄任务卡，先声明 `related_files` / `write_scopes` / `exclusive_files`。
- `tasks/index.md` 是维护索引，不属于普通功能任务的独占文件；开工、收口或 `git-c` 时都可以按真实目录刷新。
- `READY_TO_MERGE` 不应长期停在 `doing/`；继续新共享 UI/core 改动前，优先做 `git-c` 或 Lead 收口。

## ACTIVE_IMPL

- `tasks/done/2026-08-28_run_health_outer_loop.md` — outer-run rule: 战败改为按当前天数扣英雄耐久，移除城堡扣线与经济衰减口径。

- `tasks/done/2026-07-22_pet-reset-five-round-interval.md` — battle balance: 宠物重置取消开局次数，改为第 5、10 回合各获得 1 次。

- `tasks/doing/2026-07-03_godot-singleplayer-remake.md` — Godot port: 独立 Godot 单机版垂直切片；涉及 `/Users/ywh/Documents/godot/scenes/game/` 与 `/Users/ywh/Documents/godot/scripts/game/`。
- `tasks/doing/2026-07-02_animated-pet-move.md` — UI feedback: 宠物移动动画仍在实现；涉及 `web/js/main.js` / `web/ux-app.css`。
- `tasks/doing/2026-07-02_pet-merge-quality-upgrade.md` — bugfix: 同名宠物合成改为品质推进；涉及核心库存/合成规则。

## READY_TO_MERGE

- `tasks/doing/2026-06-29_auto-enemy-turn-flow.md` — UI flow: 我方出击后自动推进敌方行动。
- `tasks/doing/2026-06-30_attack-event-animation.md` — UI feedback: 战斗攻击/伤害/KO 动画反馈。
- `tasks/doing/2026-06-30_battle-debug-route-page.md` — UI tool: 独立战斗调试入口页。
- `tasks/doing/2026-06-30_command-console-page.md` — UI tool: 独立命令控制台页。
- `tasks/doing/2026-06-30_main-page-hub.md` — UI navigation: 主入口大厅页。
- `tasks/doing/2026-06-30_pet-detail-cards-image.md` — asset: 宠物中文详情图。
- `tasks/doing/2026-06-30_pet-detail-final-stats.md` — UI detail: 棋盘详情面板只显示最终战斗属性。
- `tasks/done/2026-06-30_pets-redesign-v3-data-source.md` — data pipeline: 宠物重设计、九系双属性、商品店表和七张策划工作表已完成并释放总表租约。
- `tasks/doing/2026-06-30_quality-evolution-point-rng.md` — rules: 品质成长随机进化点。
- `tasks/doing/2026-06-30_round-placement-preview-reset.md` — bugfix: 新回合智能站位可用性。
- `tasks/doing/2026-06-30_seeded-pet-levels-excel.md` — data artifact: seed 全品质成长 Excel。
- `tasks/doing/2026-07-01_data-source-split-audit.md` — data audit: 未接入数据集中与核对。
- `tasks/doing/2026-07-01_runtime-json-data-report.md` — data tooling: runtime JSON / SQLite / HTML 审核页。
- `tasks/doing/2026-07-02_real-click-flow-audit.md` — browser tester pass: 正常游戏真人点击巡检。
- `tasks/doing/2026-07-02_remove-pet-injury-popover.md` — UI feedback: 移除宠物受伤 hover 浮窗。
- `tasks/doing/2026-07-02_seed-episode-preview.md` — data tooling: 3 个 seed 的整集预览表。
- `tasks/doing/2026-07-02_settings-unification-cleanup.md` — docs cleanup: 删除旧口径生成说明。
- `tasks/doing/2026-07-02_write-scope-task-cards.md` — workflow: 任务卡/write_scope/index/git-c 规则优化。

## BLOCKED

- `tasks/doing/2026-06-28_replay-command-stream.md` — replay feature: 已验证实现，完整 `check:all` 被无关 CSV08 workbook 问题阻断。
- `tasks/doing/2026-06-29_auto-position-boss-priority.md` — bugfix: 已验证实现，完整 `check:all` 被无关 CSV08 workbook 问题阻断。
- `tasks/doing/2026-06-29_live-4173-bundle-rule.md` — workflow: 4173 bundle 规则已写入；等待收口归档。
- `tasks/doing/2026-07-02_action-slot-element-layers.md` — bugfix: 行动槽元素层数；需要和当前 bundle/dirty 边界统一收口。
- `tasks/doing/2026-07-02_party-wipe-hero-hp.md` — bugfix: 团灭扣英雄 HP；被核心/bundle/shared dirty 边界阻断。
- `tasks/doing/2026-07-02_preview-dead-target-element-spread.md` — bugfix: 预览不展示未来铺元素；被 bundle/shared dirty 边界阻断。

## PAUSED

- 无

## DONE

- `tasks/done/2026-08-28_bazaar_day1_route_source.md` — 恢复 `ROUTE` 策划域对 24/25/26 路线表的可重建真相链，并开放 Day 1 免费刷新事件与休整补给节点。

- `tasks/done/2026-07-31_generic-pet-attribute-data.md` — 已增加 47 个属性、8 个状态和通用特性 modifier 的 workbook→CSV 真相链。

- `tasks/done/2026-07-31_pet-skill-action-queue.md` — 已为正式 Godot 提供每宠 8 个可排序基础技能及 workbook→CSV 数据真相链。

- `tasks/done/2026-07-30_bazaar-source-complete-shop-roster.md` — 已补全 93 个商人包，369 宠按 56 个真实来源摊位映射至前 30 地点，并补齐前三天开放与 13 类附魔。
- `tasks/done/2026-07-30_vanessa-369-pets-shops-enchantments.md` — 以 Vanessa 物品/技能对象为基线设计 369 只纯宠物，压缩为前 30 家交叉商店，并补齐品质、攻击格数与 13 类附魔。
- `tasks/done/2026-07-29_journey-shop-min-six.md` — 合并西游宠物短名与 79 个西游商店，全部正式宠物商店候选池不少于 6，并完成 CSV 与 Godot 数据链验证。
- `tasks/done/2026-07-29_enemy-movement-attack-count-split.md` — data contract: 敌方移动力与攻击次数已拆成独立总表/怪物模板字段。

见 `tasks/done/`。旧归档任务不在本索引全文展开，避免 index 成为长历史清单；需要审计时以目录真实文件为准。
