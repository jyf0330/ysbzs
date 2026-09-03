# Original Pirate 武器吸血 Aura v1 数据合同

task_id: 2026-09-04_original_pirate_lifesteal_aura
status: DONE
owner: root（接管 Data 线程）
branch: codex/original-pirate-content
target_ids: BZ-OP-LIFESTEAL-AURA-01

## Goal

在 `ysbzs_master.xlsx -> CSV -> exporter -> generated` 单一真相链中增加项目原创 Lifesteal v1；复用雾藻疗匣，为其他友方武器按品质授予吸血 bps，不修改外部来源锁或 executable mapping。

## related_files

- `xlsx/ysbzs_master.xlsx`
- `data/csv/44_bz_gameplay.csv`
- `data/csv/48_bz_item_skills.csv`
- `data/csv/56_bz_source_snapshot.csv`
- `data/csv/60_bz_ghost_snapshots.csv`
- `data/csv/66_bz_item_auras.csv`
- `data/csv/README_csv_source.md`
- `tools/export_original_pirate_content.py`
- `tests/original_pirate_content_export.test.cjs`
- `tests/original_pirate_csv_subset.test.cjs`
- `tests/csv_source.test.cjs`
- `tasks/index.md`
- 本任务卡

## write_scopes

- workbook/CSV：Lifesteal v1 exact 规则字段；雾藻疗匣四品质 `grant_lifesteal_bps` Aura `2500/4000/5500/7000`；版本与 revision 原子迁移。
- exporter：规则、Aura 操作、品质完整性及数值范围的严格 fail-closed；保持 damage Aura 与 Lifesteal Aura 身份同域、语义分离。
- tests：先 RED 后 GREEN，覆盖 exact 规则、四品质 Aura、引用、错误 target/operation/params/数值/版本拒绝、计数和报价不变。
- docs/tasks：记录原创边界、隔离生成 hash、验证和提交结果。

## exclusive_files

- `xlsx/ysbzs_master.xlsx`
- `tools/export_original_pirate_content.py`
- `tests/original_pirate_content_export.test.cjs`

## validation

- PASS：绑定 Python 运行时执行 `tools/export_master_to_csv.py --check --original-pirate-only`，workbook 与 23 个 BZ CSV 页逐字一致。
- PASS：`tools/export_original_pirate_content.py --check`，得到 content v33 / runtime v31 / 22 items / 23 executable catalogs。
- PASS：两个 original-pirate Node 测试文件共 35/35，其中 Lifesteal exact、四品质与 fail-closed 均覆盖。
- PASS：`CSV02F|CSV08B|CSV09` 3/3；子进程使用绑定 Python 以提供 `openpyxl`。
- PASS：`node tools/check_csv_data.cjs` 与 `git diff --check`。
- PASS：两次隔离生成逐字一致；content SHA-256 `504d0e9ab815f7654692705a76f62af7a65563bfaace416a41d47b41fcf6d59d`，display SHA-256 `70ea417e7bf85d906495636297a2b1ac142fc20fe7ee4d73e158e06f45b64355`。

## completion

- 雾藻疗匣四品质正式导出 `2500/4000/5500/7000` bps Lifesteal Aura；伤害 Aura 与 Lifesteal Aura 使用独立操作与身份。
- 外部来源锁仍保持 140 Item / 138 Skill，executable mapping 仍为 0/138；本切片明确属于项目原创规则，不伪装成《The Bazaar》原规则映射。
- 内容报价、升级与 Ghost 引用未被 Lifesteal 迁移改变。

## commit_plan

- 一个原子提交：`data(content): add original pirate lifesteal aura`
- 精确暂存本任务归属文件；整体验证后按项目长期授权推送当前上游。
