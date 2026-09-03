# Original Pirate 战斗内暴击率成长 v1 数据合同

task_id: 2026-09-03_original_pirate_crit_growth
status: COMPLETED
owner: codex-root（Lead）+ remaining_rules_gap_audit（data implementation）
branch: codex/original-pirate-content
target_ids: BZ-OP-CRIT-GROWTH-01

## Goal

在 `ysbzs_master.xlsx -> CSV -> exporter -> generated` 单一真相链中，将 Crit 合同升级为 v2；复用“继航校炮仪”和正式 `trigger_source_item` 动态目标，为另一件拥有唯一可暴击伤害效果的友方物品增加仅限本场战斗、只影响后续使用的暴击率。

## related_files

- `xlsx/ysbzs_master.xlsx`
- `data/csv/44_bz_gameplay.csv`
- `data/csv/47_bz_item_effects.csv`
- `data/csv/48_bz_item_skills.csv`
- `data/csv/56_bz_source_snapshot.csv`
- `data/csv/60_bz_ghost_snapshots.csv`
- `data/csv/README_csv_source.md`
- `tools/export_original_pirate_content.py`
- `tests/original_pirate_content_export.test.cjs`
- `tests/original_pirate_csv_subset.test.cjs`
- `tasks/index.md`
- 本任务卡

## write_scopes

- workbook/CSV：Crit v2 exact 规则字段；`source_item_can_crit` 条件；`gain_crit_chance_for_fight` 操作及独立 `crit_chance_bps_delta`；继航校炮仪四品质新增 500/750/1000/1250 bps 动态来源效果；版本/revision 原子迁移
- exporter：严格导出/校验上述条件、操作、参数和 Crit v2；目标必须是同一次真实友方 USE 的 `trigger_source_item`，且目标品质必须恰有一条 `canCrit=true` 的 item-ready 直伤；成长不消费 RNG、当前 USE 不追溯、有效概率封顶 `chanceScaleBps`
- tests：先 RED 后 GREEN，锁定字段分工、四品质数据、自然 refresh-2 可达性、计数/hash、非法条件/目标/参数/非 Crit 来源/旧版本拒绝
- docs/tasks：记录项目原创合同、来源边界、版本与确定性生成证据
- generated output：生成隔离 content/display 包，不纳入 Git

## exclusive_files

- `xlsx/ysbzs_master.xlsx`
- `tools/export_original_pirate_content.py`
- `tests/original_pirate_content_export.test.cjs`

## shared_file_policy

开工基线 `e5af059600f22897017074a25866e12e8b29ba95` 且 clean；旧 workbook/exporter 租约均为已交付历史任务或其他 worktree。本卡数据实现文件由 remaining_rules_gap_audit 独占，codex-root 不并发写这些文件，只负责合同复核、生成同步、最终验证、精确提交与推送。

## validation

- `python3 tools/export_master_to_csv.py --check --original-pirate-only`
- `python3 tools/export_original_pirate_content.py --check`
- `node --test tests/original_pirate_content_export.test.cjs tests/original_pirate_csv_subset.test.cjs`
- `node --test --test-name-pattern='CSV02F|CSV08B|CSV09' tests/csv_source.test.cjs`
- `node tools/check_csv_data.cjs`
- 二次隔离生成逐字/hash 一致
- `git diff --check`

## commit_plan

- 一个原子提交：`data(content): add original pirate crit growth`
- Godot 消费链完成并通过后精确暂存、提交并推送当前分支

## collaboration

- lead_scope: 合同裁决、实现复核、生成同步、最终验证、归档与 Git 交付
- specialist_input: adjacency_runtime 推荐复用 battle-local bonus/RNG；adjacency_review 对比 Lifesteal/Multicast/Regeneration 玩家链；remaining_rules_gap_audit 确认 Crit growth 的正式数据复用路线与缓存漂移边界
- tester_pass: 无；纯数据合同由 workbook 重建、严格 schema、canonical hash 与下游正式 Session 验证
- external_ai_input: 无
- lead_decision: 采用 Crit growth；不采用当前相位仍有歧义的 Lifesteal，也不把已漂移本机缓存静默替换为仓库来源基线

merge_owner: codex-root

## Result

- Crit 唯一合同升级为 `ysbzs.original-pirate-critical-damage.v2`；保留原本的 10000 bps 概率尺度、20000 bps 倍率、向下取整、每次物品 USE 单次资格抽取，并新增逐 effect 相加、有效概率封顶、当前 USE 完成后才影响后续 USE、动态来源必须恰有一条可暴击就绪直伤、成长本身不消费 RNG 的五项 exact 规则。
- `47_bz_item_effects.csv` 新增 operation-owned `crit_chance_bps_delta`；仅允许 `another_friendly_item_used + [source_item_can_crit] -> trigger_source_item + gain_crit_chance_for_fight`，生成参数 exact 为 `critChanceBpsDelta`。缺失/伪造来源语义、标签/相邻参数、错误目标、错误 operation、非法数值均 fail closed。
- 继航校炮仪保留原有就绪伤害和来源武器当场伤害成长，新增四条 priority 40 的 Crit growth effect，青铜/白银/黄金/钻石分别增加 500/750/1000/1250 bps；正式 refresh 2、slot 2、青铜价格 4 的可达报价不变，已有升级与尾风/破阵铭刻不变。
- 版本原子迁移：source content/runtime `27/25`，executable content/runtime `29/27`，catalog `19`，rules `v25`，source/content/bundle revision `v26`。数量为 22 items / 82 profiles / 148 effects / 4 auras / 22 item skills / 60 upgrades / 148 enchant profiles / 33 shop templates / 121 display entries。
- canonical runtime bundle hash：`491219aa40e7e93bd2fd1cc739363412e0a22e7551b4e99980a4a95b25e44a76`。隔离生成物为 `output/original_pirate_crit_growth/content.json`（SHA-256 `1ae1ecbac4a7bd6adc633d4060681c68236e389c73db02407ea654fcfe66bae4`）和 `output/original_pirate_crit_growth/display.json`（SHA-256 `3deef3baa5aa74968abfa5c12ca3a820b87613383a0f37eac6d9e8f22617aacb`）；二次隔离生成逐字一致。
- 所有内容与数值均为本项目原创；Vanessa build-bound 外部目录的正式 executable mapping 仍为 Item `0/138` + Skill `0/138`，没有复制 reference-only 名称、文本、图像或未冻结数值。

## Validation Result

- TDD RED：`OPC02O` 在旧 `28/26/catalog18/rulesv24` 包上按预期失败。
- `python3 tools/export_master_to_csv.py --check --original-pirate-only`：PASS。
- `python3 tools/export_original_pirate_content.py --check`：PASS，22 items / 6 hours / 33 shop templates / 10 battle templates / 10 Ghost encounters / 10 Ghost snapshots / 121 display entries。
- `node --test tests/original_pirate_content_export.test.cjs tests/original_pirate_csv_subset.test.cjs`：29/29 PASS。
- `node --test --test-name-pattern='CSV02F|CSV08B|CSV09' tests/csv_source.test.cjs`：3/3 PASS（以 bundled Python 提供 openpyxl）。
- `node tools/check_csv_data.cjs`：PASS。
- `git diff --check`：PASS。
