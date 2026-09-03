# The Bazaar 本机 GameData 来源重锁 v2

task_id: 2026-09-03_bazaar_local_gamedata_source_relock_v2
status: COMPLETED
owner: codex-root（Lead）+ remaining_rules_gap_audit（data source implementation）
branch: codex/original-pirate-content

## Goal

保留既有 build `24720155` reference-only 快照，并为当前本机已安装 build `25079259` 追加新的版本化 build-bound reference-only 快照。只锁定来源元数据与 Vanessa `Always` 身份集合，不提交或转译专有 payload，不改变原创可执行内容。

## Source Contract

- 新身份：`snapshot_vanessa_local_cache_25079259_db8914ab`；旧 `snapshot_vanessa_local_cache_24720155_398715e6` 必须完整保留。
- 构建绑定：Steam build `25079259`、lastupdated `1788421691`、macOS ARM64 client `1.0.12221-prod-macos-arm64-adc9ca50`、GameData ETag `db8914ab78bb1832b18bb89e9f5d8113`。
- 主 artifact：GameData.db 41,586,688 bytes，mtime epoch `1788411702`，SHA-256 `7d8df658ebce967edf59ab8d0c889fa266f56917b87336928694cdce54246ee9`，manifest observed epoch `1788445021`。
- Vanessa + `SpawningEligibility=Always`：Item 140、Skill 138，均无空/重复 UUID；排序 UTF-8、换行连接且无末尾换行的 ID-set SHA-256 分别为 `b18e167f48956a4ef63dcb4a2ba265c05cc7c6aac87739a737c45acea35af7bd` 与 `66cacbf986415cf6218e98254274d4b58c528136186e7fc7b632d0b01588d81b`。
- `game_patch` 保持空；`license_status=unverified`、`usage_scope=reference_only`、`catalog_status=reference_reserved`；逐条规则仍要求独立语义证据与 live trace。
- 不把新的 140/138 集合绑定到旧 369 条 legacy 对象；不改变任何 executable mapping 或原创内容版本。

## related_files

- `xlsx/ysbzs_master.xlsx`
- `data/csv/66_bazaar_reference_snapshots.csv`
- `tools/export_master_to_csv.py`
- `tests/csv_source.test.cjs`
- `data/csv/README_csv_source.md`
- `tasks/index.md`
- 本任务卡

## validation

- `python3 tools/export_master_to_csv.py --check --reference-source-lock-only`
- Node `CSV02F|CSV02H|CSV08B` 来源专项及 forged vectors
- 只读 SQLite integrity/count/unique/hash 复算；zip 解压内容与 DB SHA 一致
- `git diff --check`

## commit_plan

- 一个原子提交：`data(source): relock installed GameData reference`

merge_owner: codex-root

## Result

- 旧 `24720155/398715e6` 快照完整保留，并追加 `snapshot_vanessa_local_cache_25079259_db8914ab`；两代均由 exporter exact 常量和行顺序 fail closed。
- 新快照锁定 Steam build `25079259`、client `1.0.12221-prod-macos-arm64-adc9ca50`、GameData ETag `db8914ab78bb1832b18bb89e9f5d8113`、DB bytes/mtime/SHA 与 Vanessa `140 Item + 138 Skill` ID-set hash。
- `game_patch` 仍为空，许可仍未确认；usage 继续限定为 reference-only，未写入 DB、zip、名称、文案、图像、规则数值或逐条对象。
- 最新 `66_bazaar_reference_snapshots.csv` SHA-256 为 `befb82d8bb13807d7c828892768044100920b178746c245874b2b212deaaf455`；zip SHA-256 `e4b5bad9fe998fa7bf0c7370eba41b86b5189345c02d1545e476d38483b2cada` 仅作为验证证据，未进入 23 列 schema。

## Validation Result

- 主线程复核 `python3 tools/export_master_to_csv.py --check --reference-source-lock-only` 通过。
- `CSV02F|CSV02H|CSV08B` 来源专项 `3/3`；覆盖新旧行、缺行、ETag/DB hash/数量/许可/ID-set 篡改与 workbook 表结构。
- 只读复算得到 SQLite integrity `ok`、Item `140/140/0`、Skill `138/138/0`；zip 解压 DB SHA 与裸 DB 一致。
- `git diff --check` 通过。

## Delivery Boundary

- 本卡只锁 build-bound 身份集合，不把新的 `140/138` 快照绑定到旧 369 条 legacy 对象，也不证明任何逐条规则已经可执行。
- 原创 Burn 响应内容提交 `0912f88` 与本来源提交保持原子分离；逐条 executable mapping 和 live Trace 另行推进。
