# Original Pirate 项目原创 Crit v1

task_id: 2026-09-03_original_pirate_critical_damage
status: DONE
owner: codex-root（Lead）+ remaining_rules_gap_audit（data implementation）
branch: codex/original-pirate-content
target_ids: BZ-OP-CRIT-01

## Goal

为 `original_pirate` 增加项目原创、版本化的 Crit v1：物品品质档位拥有 `critChanceBps`，单条直接伤害效果只声明 `canCrit`，玩法级 `critRules` 冻结倍率、取整、每次物品使用判定一次及唯一 RNG draw 政策；新增正式可买的原创“潮镜短铳”，不把参考缓存的专有数值或客户端静态路径伪装成来源复刻。

## related_files

- `xlsx/ysbzs_master.xlsx`
- `data/csv/44_bz_gameplay.csv`
- `data/csv/46_bz_items.csv`
- `data/csv/47_bz_item_effects.csv`
- `data/csv/48_bz_item_skills.csv`
- `data/csv/50_bz_stall_offers.csv`
- `data/csv/56_bz_source_snapshot.csv`
- `data/csv/57_bz_item_upgrades.csv`
- `data/csv/58_bz_enchantments.csv`
- `data/csv/60_bz_ghost_snapshots.csv`
- `data/csv/README_csv_source.md`
- `tools/export_original_pirate_content.py`
- `tests/original_pirate_content_export.test.cjs`
- `tasks/index.md`
- 本任务卡

## write_scopes

- workbook/CSV：新增玩法级 Crit 规则字段、物品品质 `crit_chance_bps`、伤害效果严格布尔 `can_crit`；新增潮镜短铳四品质 item/effect/skill/upgrade/铭刻并替换初始重复的拼板冲角报价；执行一次原子版本迁移
- exporter：生成 exact `critRules`、`critChanceBps` 与 `canCrit`；只开放 `item_ready + always + selected_enemy + deal_damage` 的单伤害 Crit v1，正几率必须恰有一条 eligible 效果，可暴击 authored 伤害不得超过 `922337203685477580`，其他伤害/操作继续 fail-closed
- tests：锁定字段分工、0/满值边界、普通伤害无隐式 Crit、商店自然可达性、升级/铭刻/计数/hash 与旧版本拒绝
- docs/tasks：记录项目原创合同、来源边界、版本与生成证据
- generated output：生成隔离 content/display 包，不纳入 Git

## exclusive_files

- `xlsx/ysbzs_master.xlsx`
- `tools/export_original_pirate_content.py`
- `tests/original_pirate_content_export.test.cjs`

## shared_file_policy

开工基线 `f6e7d38a9cb0f2a53490e5a0e9e904708bd68ee8` 且 clean；旧 workbook/exporter 租约均为已交付历史任务或其他 worktree，当前 READY 文档任务只读 workbook，不占用本任务的 BZ 44–60 域与 original-pirate 导出接口。remaining_rules_gap_audit 独占本卡列出的 data implementation 文件；codex-root 不并发写这些文件，只负责复核、生成同步、最终验证、精确提交与推送。

## validation

- 先写 exporter/Node RED 门禁，再修改 workbook 并完整重建 CSV
- `python3 tools/export_master_to_csv.py --check --original-pirate-only`
- `python3 tools/export_original_pirate_content.py --check`
- `node --test tests/original_pirate_content_export.test.cjs`
- `node --test --test-name-pattern='CSV02F|CSV08B|CSV09' tests/csv_source.test.cjs`
- `node --test tests/unit/hero_skill_catalog_source.test.cjs`
- `node tools/check_csv_data.cjs`
- `git diff --check`

## commit_plan

- 一个原子提交：`data(content): add original pirate critical damage`
- 数据与 Godot 消费链均验证后精确暂存、提交并推送当前分支

## collaboration

- lead_scope: 数据合同裁决、实现复核、生成同步、最终验证、归档与 Git 交付
- specialist_input: adjacency_review 只读确认 CritChance 属于 item profile、effect 只声明 canCrit，倍率/取整/roll scope 属于玩法规则；remaining_rules_gap_audit 提供原创潮镜短铳与自然报价候选
- tester_pass: 无；纯数据与导出合同，以 workbook 重建、严格 schema、canonical hash 和下游 Godot 正式 Session 验证
- external_ai_input: 无
- lead_decision: 使用 basis points；倍率与取整放入玩法规则包，暴击率不复制到 effect，所有随机判定复用唯一 kernel RNG

merge_owner: codex-root

## Result

- TDD：先加 `OPC02G` 并确认旧 v23/v21 输出按预期 RED；随后完成 workbook→CSV→exporter 的 Crit v1 单向生成与严格校验。运行包 exact 身份字段为 `critRules.contractId`；当前倍率锁定 20000 bps，但 schema 允许 10001..100000 整数并已用 15000 正向迁移向量验证。
- 数据合同：源 `content v22/runtime v20`，可执行 `content v24/runtime v22/catalog v15/rules v20`，source/content/bundle/snapshot revisions 均升为 v21；Ghost `opponent_content_revision` 同步。
- 正式内容：新增 `item_tideglass_sidearm`/潮镜短铳与 `skill_tideglass_sidearm`/镜潮点射；1 格 `tool, weapon`，四品质暴击率 2500/4000/5500/7000 bps，买价 4/7/11/16，卖价 2/3/5/8，冷却 5/4/3/2，伤害 2/3/5/7。初始商店第 2 格替换重复的拼板冲角报价，12 金新局可以直接购买；三段升级价 4/7/10，tailwind + breaker 共 8 条铭刻 profile。
- 平衡边界：青铜以低单发伤害和 25% 概率控制开局爆发；升品同时降冷却、增基础伤害和概率，但仍只有一条可暴击直伤效果，不引入群体、多段或额外 RNG 权威。
- 生成计数：20 items / 74 quality profiles / 136 effects / 20 item skills / 54 upgrades / 140 enchant profiles / 33 shop templates / 117 display entries。
- 隔离输出：`output/original_pirate_critical_damage/content.json` SHA-256 `1e4837593a47481d73ce83afa3da4310bfffa717f9db281e1490542585e18bfd`，`display.json` SHA-256 `497acea5b77e92b6ce6ecba08d23702c320360d8f4816029ce7a9b70f4e27216`，bundle hash `e5e5c5b608da604bd37edf1f2261c682cfdc67252ff51d1bd99733bfcc1be6fb`。
- 安全门禁：独立静态复审发现正几率与 eligibility 可能在内容层脱钩、合法超大整数可能令 Crit 中间乘法溢出，随后又识别 0% eligible 与多伤害口径的跨层漂移；exporter 两条入口现统一强制 `eligible_count<=1`、`critChanceBps>0=>eligible_count==1`、`eligible_count>0=>damage_count==1`，0% eligible 合法，并以 `922337203685477580` 作为最大 eligible authored 伤害。最大值、0% 正测与超限/多伤害负测均通过，正式包和 bundle hash 不变。
- 验证：workbook→CSV `--check` PASS；exporter `--check` PASS；`original_pirate_content_export.test.cjs` 20/20 PASS；CSV02F/CSV08B/CSV09 3/3 PASS；hero skill source 1/1 PASS；CSV data validation PASS；`git diff --check` PASS；最终静态 spot-check 无 P0/P1/P2。
- 版权边界：此切片仅含项目原创名称、文案与数值，未复制 reference-only 缓存的专有 payload；Vanessa build-bound Item/Skill 正式映射仍为 `0/138 + 0/138`。
