# Original Pirate 友方物品暴击成功响应数据合同

task_id: 2026-09-04_original_pirate_crit_success_response
status: DONE
owner: remaining_rules_gap_audit
branch: codex/original-pirate-content
target_ids: BZ-OP-CRIT-SUCCESS-RESPONSE-01

## Goal

在 `ysbzs_master.xlsx -> CSV -> exporter -> generated` 单一真相链中，将 Crit 合同升级为 v3，并复用继航校炮仪新增“另一件友方物品成功暴击后为自身充能”的四品质项目原创响应。

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

- workbook/CSV：Crit v3 六项 success-response exact 规则字段；继航校炮仪四品质 priority 50、`another_friendly_item_crit + [always] -> self_item + charge`、ticks `1/1/2/2`；版本与 revision 原子迁移。
- exporter：新增 trigger vocabulary、Crit v3 精确导出及严格 fail-closed，保持外部来源锁与 executable mapping 不变。
- tests：先 RED 后 GREEN，覆盖 exact 规则、四品质效果、版本/计数、报价保持可达和非法 trigger/condition/target/operation/params/版本拒绝。
- docs/tasks：记录项目原创边界、隔离生成 hash、验证结果与提交。

## exclusive_files

- `xlsx/ysbzs_master.xlsx`
- `tools/export_original_pirate_content.py`
- `tests/original_pirate_content_export.test.cjs`

## validation

- `python3 tools/export_master_to_csv.py --check --original-pirate-only`
- `python3 tools/export_original_pirate_content.py --check`
- `node --test tests/original_pirate_content_export.test.cjs tests/original_pirate_csv_subset.test.cjs`
- `node --test --test-name-pattern='CSV02F|CSV08B|CSV09' tests/csv_source.test.cjs`
- `node tools/check_csv_data.cjs`
- 二次隔离生成逐字与 SHA-256 一致
- `git diff --check`

## commit_plan

- 一个原子提交：`data(content): add original pirate crit success response`
- 精确暂存本任务归属文件，不推送。

## Result

- Crit 唯一合同升级为 `ysbzs.original-pirate-critical-damage.v3`，新增六项 success-response exact 规则；成功证据唯一绑定既有 `ITEM_EFFECT_CRIT_RESOLVED.isCritical=true` 与已提交 `DAMAGE`，响应不重新掷骰。
- 继航校炮仪四品质新增 priority 50 的 `another_friendly_item_crit + [always] -> self_item + charge`，ticks 为 `1/1/2/2`；既有主动伤害、伤害成长、暴击率成长、价格、升级、铭刻及 refresh 2 正式报价均保持不变。
- 版本原子迁移：source content/runtime `30/28`，generated content/runtime `32/30`，catalog `22`，rules `ysbzs.original-pirate-rules.2026-09-04-v28`，source/content/bundle revision `v29`。
- 数量：22 items / 82 profiles / 160 effects / 4 auras / 22 item skills / 60 upgrades / 148 enchant profiles / 33 shop templates / 121 display entries。
- canonical runtime bundle hash：`e93ff8b4cab090766e0cf2197878d958e02d0001be3e1a40f1eace51eefc3fd5`。
- 隔离生成物：`output/original_pirate_crit_success_response/content.json`（SHA-256 `53776eee3423d87556dbaed8b42c787769b15c7e431835b648d68aa104b74113`）与 `display.json`（SHA-256 `52aedc68ae98dda9513767e5f3fcb5fa5d9f0839815f259fe6222b00bdf5fc1e`）；二次生成逐字一致。
- 未修改 `66_bazaar_reference_snapshots.csv`，外部 executable mapping 仍为 Item `0/138` + Skill `0/138`。

## Validation Result

- TDD RED：`OPC02R` 与 `OPCSV08` 在旧 v31/v29/catalog21/Crit v2 上按预期 0/2。
- `python3 tools/export_master_to_csv.py --check --original-pirate-only`：PASS。
- `python3 tools/export_original_pirate_content.py --check`：PASS。
- `node --test tests/original_pirate_content_export.test.cjs tests/original_pirate_csv_subset.test.cjs`：35/35 PASS。
- `node --test --test-name-pattern='CSV02F|CSV08B|CSV09' tests/csv_source.test.cjs`：3/3 PASS。
- `node tools/check_csv_data.cjs`：PASS。
- 二次隔离生成 content/display 逐字一致。

## collaboration

- lead_scope: 数据真相链实现、验证、任务归档与精确提交。
- specialist_input: 本线程先行只读审计冻结了来源结构边界与原创合同。
- tester_pass: 无；纯数据合同由 workbook parity、严格 schema、canonical hash 与下游 Godot 正式 Session 消费测试覆盖。
- external_ai_input: 无。
- lead_decision: 复用继航校炮仪，避免新增物品与报价；成功响应只消费既有 Crit Resolve/DAMAGE 证据，避免双权威。
