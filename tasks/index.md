# 任务总览

最后刷新：2026-09-03，由 `2026-09-03_original_pirate_damage_aura` 数据侧验证收口刷新。

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

- `tasks/done/2026-09-03_original_pirate_damage_aura.md` — data rules: 独立固定伤害 Aura 域、雾藻疗匣四品质武器加伤、exact battle rules 与 effect/Aura 身份分域已完成 workbook→CSV→exporter 真相链及确定性生成验证。

- `tasks/done/2026-09-03_original_pirate_heal_status_cleanse.md` — data rules: 有效治疗清除 Burn/Poison 的 exact v1 合同、Poison v2 委托关系与 Day 1 双状态 Ghost 已完成 workbook→CSV→exporter 真相链及确定性生成验证。

- `tasks/done/2026-09-03_original_pirate_poison.md` — data content: 项目原创 Poison v1 与“墨航滴液器”已完成 workbook→CSV→exporter 真相链、refresh 5 自然商店可达、精确规则/层数门禁与隔离生成验证。

- `tasks/done/2026-09-03_original_pirate_burn.md` — data content: 项目原创 Burn v1 与“烬航灯”已完成 workbook→CSV→exporter 真相链、自然初始商店可达、精确规则/层数门禁与隔离生成验证。

- `tasks/done/2026-09-03_original_pirate_critical_damage.md` — data content: 项目原创 Crit v1 与“潮镜短铳”已完成 workbook→CSV→exporter 真相链、自然初始商店可达、双层 fail-closed 门禁与隔离生成验证。

- `tasks/done/2026-09-03_original_pirate_random_friendly_item_target.md` — data content: 原创“侧风择发器”与 `random_friendly_item_with_any_tag(tags=[weapon], excludeSelf=true, count=1)` 已完成 workbook→CSV→exporter 真相链、自然商店可达性与 fail-closed 门禁。

- `tasks/done/2026-09-03_original_pirate_friendly_tag_collection_target.md` — data content: 原创“齐射传令台”与 `friendly_items_with_any_tag(tags=[weapon])` 已完成 workbook→CSV→exporter 真相链、自然商店可达性及 fail-closed 门禁。

- `tasks/done/2026-09-03_original_pirate_battle_start_item.md` — data content: 原创“晨潮校时器”和首版 `battle_start + always -> owner_hero + gain_shield` 已完成 workbook→CSV→exporter 真相链与 fail-closed 门禁。

- `tasks/done/2026-09-03_original_pirate_trigger_source_target.md` — data content: 无参数 `trigger_source_item` 动态目标与原创“继航校炮仪”已完成真相链及 fail-closed 门禁。

- `tasks/done/2026-09-03_original_pirate_deterministic_item_targets.md` — data content: 一件原创正式物品逐品质覆盖 left/right adjacent 与 leftmost/rightmost friendly-item 四种确定性目标，并锁定空目标 no-op 与可达报价。

- `tasks/done/2026-09-03_original_pirate_item_adjacency.md` — data content: 新增原创“雾索棘轮”与 `condition_source_relation=any|adjacent` 复合条件真相链。

- `tasks/done/2026-09-03_bazaar_local_gamedata_source_lock.md` — data source: 固定本机已安装客户端的 build-bound GameData、Vanessa 138/138 身份集合与不可再分发边界。

- `tasks/done/2026-09-03_original_pirate_tidescar_matchlock.md` — data content: 新增正式可达的“潮痕火绳枪”、当场伤害成长 operation 与完整品质/刷新/进阶/适用铭刻数据。

- `tasks/done/2026-09-03_bazaar_external_reference_source_lock.md` — data source: 分离 Steam Patch 18.0 live 边界与未知版本 legacy catalog，369 条旧来源记录全部严格绑定为 reference-only。

- `tasks/done/2026-09-03_original_pirate_hero_defense_items.md` — data contract: 英雄治疗/护盾物品效果与三件原创防御物品。

- `tasks/done/2026-09-03_original_pirate_item_tag_reactions.md` — data contract: canonical 物品标签、跨物品标签响应与三件原创正式物品。

- `tasks/done/2026-09-03_original_pirate_hero_skill_training.md` — data contract: 新增独立英雄技能训练师与学习/相邻升阶 offer，冻结价格、日窗、逐品质中文效果及 Day 10 可达性。

- `tasks/done/2026-09-03_original_pirate_hero_skill_content.md` — data contract: 物品技能与英雄技能正式分域，新增两项原创雾航英雄被动、起始实例与十日 Ghost 品质实例。

- `tasks/done/2026-09-02_original_pirate_last_chance_choices.md` — data contract: Ghost-only Prestige 与首次归零后一次性正式最后机会三选一，冻结三项原创代价和恢复量。

- `tasks/done/2026-09-02_original_pirate_ghost_snapshots.md` — data contract: PvE template、Ghost encounter、Ghost snapshot 三段单一真相，冻结完整英雄构筑与 canonical build hash。

- `tasks/done/2026-09-02_original_pirate_level_up_choices.md` — data contract: 新增 3 个正式等级里程碑与每级金币、物品、定向升阶三选一，迁移到 root v9/runtimeBundle v7 单一 progressionRules 真相。

- `tasks/done/2026-09-02_original_pirate_terminal_pressure.md` — data contract: 将正式终局压力从 BZ_GAMEPLAY 投影到 root v8/runtimeBundle v6，并以 exact schema、完整 hash 与 forged vectors fail-closed。

- `tasks/done/2026-09-02_original_pirate_content_domains.md` — data: 建立原创海盗 13 域 workbook/CSV 真相链，导出 open-ended generation.v1 与独立中文显示目录。

- `tasks/done/2026-09-01_bazaar_shop_reward_profiles.md` — data: 为 56 个 Vanessa 商店事件逐条冻结本地奖励档案，服务摊位显式映射当前可执行商品并 fail-closed。

- `tasks/done/2026-08-31_godot_hero_skill_slice_data.md` — data: 新增首批 7 条英雄技能正式 workbook/CSV 真相链，并完成 Godot 第 17 内容包消费验证。

- `tasks/done/2026-08-31_bazaar_route_content_completion.md` — data: 完成 16 事件、10 休整、20 个真实遭遇三选一锚点及 workbook→CSV 真相链。

- `tasks/done/2026-08-28_bazaar_day1_route_source.md` — 恢复 `ROUTE` 策划域对 24/25/26 路线表的可重建真相链，并开放 Day 1 免费刷新事件与休整补给节点。

- `tasks/done/2026-07-31_generic-pet-attribute-data.md` — 已增加 47 个属性、8 个状态和通用特性 modifier 的 workbook→CSV 真相链。

- `tasks/done/2026-07-31_pet-skill-action-queue.md` — 已为正式 Godot 提供每宠 8 个可排序基础技能及 workbook→CSV 数据真相链。

- `tasks/done/2026-07-30_bazaar-source-complete-shop-roster.md` — 已补全 93 个商人包，369 宠按 56 个真实来源摊位映射至前 30 地点，并补齐前三天开放与 13 类附魔。
- `tasks/done/2026-07-30_vanessa-369-pets-shops-enchantments.md` — 以 Vanessa 物品/技能对象为基线设计 369 只纯宠物，压缩为前 30 家交叉商店，并补齐品质、攻击格数与 13 类附魔。
- `tasks/done/2026-07-29_journey-shop-min-six.md` — 合并西游宠物短名与 79 个西游商店，全部正式宠物商店候选池不少于 6，并完成 CSV 与 Godot 数据链验证。
- `tasks/done/2026-07-29_enemy-movement-attack-count-split.md` — data contract: 敌方移动力与攻击次数已拆成独立总表/怪物模板字段。

见 `tasks/done/`。旧归档任务不在本索引全文展开，避免 index 成为长历史清单；需要审计时以目录真实文件为准。
