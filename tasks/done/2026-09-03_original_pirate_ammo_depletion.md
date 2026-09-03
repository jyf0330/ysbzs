# Original Pirate 弹药耗尽条件 v1 数据合同

task_id: 2026-09-03_original_pirate_ammo_depletion
status: COMPLETED
owner: codex-root（Lead）+ remaining_rules_gap_audit（data implementation）
branch: codex/original-pirate-content
target_ids: BZ-OP-AMMO-DEPLETION-01

## Goal

在 `ysbzs_master.xlsx -> CSV -> exporter -> generated` 单一真相链中，为潮鳍投筒新增项目原创 `source_item_ammo_depleted` 条件：当前物品真实 USE 从正弹药变为零时，为己方船长获得品质相关护盾。

## Data Contract

- `ammoDepletionRules` exact 为 contract、trigger/evaluation/snapshot/repeat/non-ammo/reload/RNG 八个字段。
- 条件 `source_item_ammo_depleted` 无参数，只允许 `item_ready -> owner_hero -> gain_shield`；禁止 tags、adjacency、其他 trigger/target/operation 和英雄技能借用。
- 潮鳍投筒四品质新增 priority 10 效果，护盾 `2/3/5/7`，先于既有 priority 20 伤害；青铜正式报价与 refresh 3 路线不变。
- 版本迁移：source content/runtime `28/26`，generated content/runtime `30/28`，catalog `20`，rules `v26`，source/content/bundle revision `v27`，effects `152`。

## related_files

- `xlsx/ysbzs_master.xlsx`
- `data/csv/44_bz_gameplay.csv`
- `data/csv/47_bz_item_effects.csv`
- `data/csv/48_bz_item_skills.csv`
- `tools/export_original_pirate_content.py`
- `tests/original_pirate_content_export.test.cjs`
- `tests/original_pirate_csv_subset.test.cjs`
- `tasks/index.md`

## shared_file_policy

开工基线 `f77effde4af214f0376089a7b689b97add6974bb` 且 clean。remaining_rules_gap_audit 独占 workbook/CSV/exporter/数据测试；Lead 负责任务卡、合同复核、生成同步、最终验证、精确提交与推送。不得把本机漂移缓存覆盖仓库锁定来源。

## validation

- `python3 tools/export_master_to_csv.py --check --original-pirate-only`
- `python3 tools/export_original_pirate_content.py --check`
- Node full/subset、CSV 专项、全表检查
- 二次隔离生成逐字/hash 一致
- `git diff --check`

## commit_plan

- 一个原子提交：`data(content): add original pirate ammo depletion`
- Godot 消费链完成并通过后精确暂存、提交并推送当前分支

## collaboration

- lead_scope: 合同裁决、生成物复核、下游 Godot 集成、最终验证与 Git 交付
- specialist_input: remaining_rules_gap_audit 独占实现 workbook/CSV/exporter/数据测试
- tester_pass: 主线程复核 canonical JSON、SHA、下游 production Session 与全量 fast
- external_ai_input: 无
- lead_decision: 使用项目原创精确时序与 `2/3/5/7` 护盾数值，不把 build-bound 身份缓存伪装成可执行来源规则

merge_owner: codex-root

## Result

- workbook→CSV 单一真相链新增 exact 八字段 `ammoDepletionRules` 与无参数 `source_item_ammo_depleted`；只允许 `item_ready -> owner_hero -> gain_shield`。
- 潮鳍投筒青铜至钻石新增四条 priority 10 耗尽护盾效果 `2/3/5/7`，保留既有 priority 20 伤害、priority 30 水生友方使用响应装填与 refresh-3 青铜价格 3。
- 版本迁移为 source content/runtime `28/26`、generated content/runtime `30/28`、catalog `20`、rules `v26`、source/content/bundle revision `v27`；数量为 22 items / 82 profiles / 152 effects / 4 auras / 22 item skills / 60 upgrades / 148 enchant profiles / 33 offers / 121 display entries。
- canonical bundle hash 为 `c35c52bd5ccd5e01ef932294d46a6d17f12cd4848dd70f52d8c61c404e3e691f`；隔离生成 Content/Display SHA-256 分别为 `91fd2168207a7c96f068d22052f2a47fb490a743c3f934146f7b503246633053` 与 `ba1fb5a1e297e4a9933acc8bc48372a0bd7b6d12b9a67136fa879590658c5290`。

## Validation Result

- workbook→CSV `--check`、exporter `--check`、全表数据检查与二次隔离生成逐字一致均通过。
- Node full/subset `31/31`，CSV 专项 `3/3`，`git diff --check` 通过。
- 下游 Godot ammo-depletion focused `9/9`、headless fast `57/57`，production Session 自然 refresh×3 购买/上板并验证同一次 `USE 1→0 -> GAIN_SHIELD +2 -> DAMAGE`。

## Delivery Boundary

- 精确转移、时序与 `2/3/5/7` 数值均为项目原创 v1，不声明为 build-bound 原规则复刻。
- 外部 Vanessa Item/Skill 正式可执行映射仍为 `0/138 + 0/138`。
