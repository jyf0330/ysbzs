# The Bazaar 外部参考来源锁 v1

task_id: 2026-09-03_bazaar_external_reference_source_lock
status: DONE
owner: codex-data-catalog-gap
branch: codex/original-pirate-content

## Goal

建立互不混用的两类 reference-only snapshot：Steam 官方 Patch 18.0 只作为当前 live 版本边界；369 条既有 Bazaar 来源审计记录只绑定 patch/build 均未知、以现有行集合 canonical hash 固定的 legacy catalog snapshot。将对象身份确认和现行规则确认拆成严格字段；全部 legacy 记录保持 `rule_verified=false`，不向 `original_pirate` 可执行内容升格任何来源条目。

## related_files

- `xlsx/ysbzs_master.xlsx`
- `data/csv/34_bazaar_objects.csv`
- `data/csv/66_bazaar_reference_snapshots.csv`
- `tools/export_master_to_csv.py`
- `tests/csv_source.test.cjs`
- `tests/unit/hero_skill_catalog_source.test.cjs`
- `data/csv/README_csv_source.md`
- `tasks/index.md`
- `tasks/done/2026-09-03_bazaar_external_reference_source_lock.md`

## write_scopes

- `xlsx/ysbzs_master.xlsx`: `BAZAAR_OBJECTS` legacy snapshot 绑定、Patch 18.0 对照边界和来源状态列；新增 `BAZAAR_REFERENCE_SNAPSHOTS` reference-only 页
- `34_bazaar_objects.csv`: 由 master 导出的 369 条 reference-only 来源绑定与未解析字段
- `66_bazaar_reference_snapshots.csv`: 由 master 导出的 Steam Patch 18.0 live-version boundary 与 legacy catalog binding 两条严格分离的来源锁
- `tools/export_master_to_csv.py`: 双快照 exact schema、角色分离、legacy canonical 行集合 hash、全量绑定与 fail-closed 校验
- `tests/csv_source.test.cjs`: workbook/CSV 可重建、来源锁正向与 forged 负向门禁
- `tests/unit/hero_skill_catalog_source.test.cjs`: 已结构化的 7 条英雄技能切片继续只引用 reference-only legacy 记录
- `data/csv/README_csv_source.md`: reference-only 边界说明
- `tasks/index.md`: 当前任务索引与收口状态
- task card: 实施、验证和提交证据

## exclusive_files

- `xlsx/ysbzs_master.xlsx`
- `data/csv/34_bazaar_objects.csv`
- `data/csv/66_bazaar_reference_snapshots.csv`
- `tools/export_master_to_csv.py`
- `tests/csv_source.test.cjs`
- `tests/unit/hero_skill_catalog_source.test.cjs`

## shared_file_policy

目标文件在本独立 worktree 开工时均干净；其他 `tasks/doing` 中涉及 master/exporter 的卡片已经标记 `DONE`，当前 ACTIVE 卡片没有相同 CSV/export schema 写入范围。本任务只修改来源审计域，不改宠物、战斗、UI 或 `original_pirate` 44–65 可执行域。

## validation

- `tools/export_master_to_csv.py --check --reference-source-lock-only`：PASS；master 可重建 `34`/`66` 两张 CSV，且不进入旧宠物公式域。
- `CSV02F|CSV02G|CSV02H|CSV08B`：4/4 PASS；覆盖 workbook 顺序、双快照绑定、canonical hash 和 6 类 forged 输入 fail-closed。
- `original_pirate_content_export.test.cjs` + `unit/hero_skill_catalog_source.test.cjs`：9/9 PASS；已有原创可执行目录不变，7 条英雄技能只引用 reference-only legacy 记录。
- `tests/csv_source.test.cjs` 全量：19/20 PASS；唯一失败为既存、本切片外的 `pet pal_001 missing required base stat action`，未表述为 full pass，也未修改宠物域。
- 变更前后 369 条 legacy 21 字段逐行一致，canonical CSV UTF-8 SHA-256 均为 `44d1f157bd4f27d4fe3cd12827f67a9b2cd8d64fbd2e03032c10fff1dd7c4cb9`。
- Steam `newsitem.contents` UTF-8 长度 30017，SHA-256 `c3d70877395c8fcd6b64f36a72cfd2ce46583f4b493588bd8e4e955ca6d71681`，仅用于 Patch 18.0 current-version boundary。
- `git diff --check`、staged diff 全量审计。

## deferred_scope

- 审计中 11 个语法候选 effect atom 不纳入本原子提交；它们缺当前版本对应与 cooldown/price/ammo/逐品质数值，下一批必须先取得可核验条目级来源，缺失字段保持 null/unresolved，禁止补假值。

## commit_plan

- 一个原子提交：`data(source): lock external reference boundaries`
- 验证通过后精确暂存、提交并推送 `codex/original-pirate-content`
