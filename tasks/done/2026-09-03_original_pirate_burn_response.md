# Original Pirate Burn 成功响应 v1 数据合同

task_id: 2026-09-03_original_pirate_burn_response
status: COMPLETED
owner: codex-root（Lead）+ remaining_rules_gap_audit（data implementation）
branch: codex/original-pirate-content
target_ids: BZ-OP-BURN-RESPONSE-01

## Goal

在 `ysbzs_master.xlsx -> CSV -> exporter -> generated` 单一真相链中，为尾潮回响鼓新增项目原创结果型响应：另一件同方上板物品成功施加 Burn 后，为回响鼓自身推进充能。

## Data Contract

- `burnRules` 迁移为 v2，并成为 Burn 成功判定的唯一规则权威；不得另建第二份成功判定。
- 新 trigger 为 `another_friendly_item_applied_burn`；条件必须恰为 `source_item_has_any_tag{tags:[burn]}`，目标必须为 `self_item {}`，operation 必须为 `charge {ticks:int>0}`。
- 来源必须是另一件、同 owner、仍在活跃棋盘的真实物品；资格来自同次 USE 下已提交且 `burnAfter = burnBefore + stacks` 的 `APPLY_BURN`。
- Burn pulse、英雄技能、敌方来源、普通使用和无效施加均不触发；响应不消费 RNG。
- 尾潮回响鼓四品质新增 priority 40、推进 `1/1/2/2 ticks`，其余现有行为与报价保持不变。
- 版本目标：source content/runtime `29/27`，generated content/runtime `31/29`，catalog `21`，rules `v27`，revision `v28`，effects `156`。

## related_files

- `xlsx/ysbzs_master.xlsx`
- `data/csv/44_bz_gameplay.csv`
- `data/csv/47_bz_item_effects.csv`
- `data/csv/48_bz_item_skills.csv`
- `data/csv/56_bz_source_snapshot.csv`
- `data/csv/60_bz_ghost_snapshots.csv`
- `tools/export_original_pirate_content.py`
- `tests/original_pirate_content_export.test.cjs`
- `tests/original_pirate_csv_subset.test.cjs`
- `tasks/index.md`

## shared_file_policy

开工基线 `906778c83138a457f7c5c6b14a58526984c22807` 且 clean。remaining_rules_gap_audit 独占 workbook、44/47/48/56/60 CSV、exporter 与数据测试；Lead 负责任务卡、合同复核、生成同步、最终验证、精确提交与推送。不得在本提交改写 build-bound 66 来源快照。

## validation

- `python3 tools/export_master_to_csv.py --check --original-pirate-only`
- `python3 tools/export_original_pirate_content.py --check`
- Node full/subset、CSV 专项、全表检查、隔离二次生成逐字一致
- `git diff --check`

## commit_plan

- 一个原子提交：`data(content): add original pirate burn response`

merge_owner: codex-root

## Result

- `burnRules` 升至 v2，新增 `another_friendly_item_applied_burn` 的 exact 成功施加合同，并保持 Burn 成功判定只有一份玩法级权威。
- 尾潮回响鼓四品质各新增 priority 40 响应：青铜/白银推进 1 tick，黄金/钻石推进 2 ticks；正式物品、报价、升级与显示目录数量不变。
- 版本迁移为 source content/runtime `29/27`、generated content/runtime `31/29`、catalog `21`、rules `v27`、source/content/bundle revision `v28`；正式数量为 22 items / 82 profiles / 156 effects / 4 auras / 22 item skills / 60 upgrades / 148 enchant profiles / 33 offers / 121 display entries。
- canonical bundle hash 为 `f08cf9d11d2ba714b80f85e0779a0c1210a438f4bb9092a1700f4e7cab5886af`；Content/Display SHA-256 分别为 `bbb32f9bc383edd3e0c3af044d7f7367164a28c90f02f2c5f89bbc003790e06c` 与 `8b09099e19c86c4d58e88682c9aed99d8ea82e8757fa928fa9b06765610ccc42`。

## Validation Result

- 主线程复核 workbook→CSV `--check`、exporter `--check` 均通过。
- Node content+CSV 联合专项 `33/33`，`tools/check_csv_data.cjs` 通过。
- 数据线程二次隔离生成逐字一致，`git diff --check` 通过。

## Delivery Boundary

- 本提交不触碰 `66_bazaar_reference_snapshots.csv`，不混入本机 build `25079259` 的来源重锁。
- 本原创规则不计入外部 Vanessa executable mapping；来源映射口径在独立 source re-lock 完成前保持旧锁下的 `0/138 + 0/138`。
