# 原创海盗正式离线 Ghost 构筑快照

task_id: 2026-09-02_original_pirate_ghost_snapshots
type: data-contract
status: DONE
owner: codex-ghost-data-slice
branch: codex/original-pirate-content
worktree: /Users/ywh/.codex/worktrees/original-pirate-content/ysbzs

## Goal

把 Ghost 对手从普通 PvE enemy 引用中拆出，建立 workbook -> CSV -> exporter 的
不可变离线构筑快照真相链；Ghost 遭遇只引用 `snapshot_id`，PvE 遭遇只引用
`enemy_id`，并让 battle generation 输出可校验来源、内容修订、完整构筑与 canonical hash。

## related_files

- `xlsx/ysbzs_master.xlsx`
- `data/csv/44_bz_gameplay.csv`
- `data/csv/53_bz_encounters.csv`
- `data/csv/54_bz_enemies.csv`
- `data/csv/56_bz_source_snapshot.csv`
- `data/csv/60_bz_ghost_snapshots.csv`
- `tools/export_master_to_csv.py`
- `tools/export_original_pirate_content.py`
- `tests/original_pirate_content_export.test.cjs`
- `tests/csv_source.test.cjs`
- `tasks/done/2026-09-02_original_pirate_ghost_snapshots.md`
- `tasks/index.md`

## write_scopes

- workbook/CSV：新增 `BZ_GHOST_SNAPSHOTS/60` 域；`BZ_ENCOUNTERS` 的 Ghost 行只引用 `snapshot_id`，PvE 行只引用 `enemy_id`，并移除旧 Ghost enemy 双真相。
- master exporter：`--original-pirate-only` 覆盖完整 `44..60` BZ 域。
- content exporter：battle generation 分离 PvE `templates`、`ghostEncounters`、`ghostSnapshots`；layer 只持 `pveTemplateIds/ghostEncounterIds`。
- snapshot：冻结 `offline_content`、opponent content revision、完整 build 与 canonical build hash；hero exact 为 `{heroId,level,skillIds,hp,maxHp}`。
- identity：迁移到 root v11/runtimeBundle v9/generation v2、source v9/v7、rules v7、content/source/bundle v8。
- tests：覆盖 workbook/CSV 重建、exact schema、hash 稳定、行重排确定性与 forged source/package 拒绝。

## exclusive_files

- `xlsx/ysbzs_master.xlsx`
- `tools/export_master_to_csv.py`
- `tools/export_original_pirate_content.py`
- `tests/original_pirate_content_export.test.cjs`

## validation

- PASS：`python3 tools/export_master_to_csv.py --check --original-pirate-only`；17 个 BZ 页与 `44..60` CSV 逐字一致。
- PASS：`python3 tools/export_original_pirate_content.py --check`；10 个 PvE template、10 个 Ghost encounter、10 个 Ghost snapshot、10 个连续日层。
- PASS：`node --test tests/original_pirate_content_export.test.cjs`，6/6；包含 source/package forged vectors 与 17 域逆序 canonical 稳定性。
- PASS：`PATH=.../dependencies/python/bin:$PATH node --test --test-name-pattern='CSV08B' tests/csv_source.test.cjs`，1/1。
- PASS：workbook 35/35 页可见，`BZ_GHOST_SNAPSHOTS` 20 个构筑物品行，公式错误扫描 0。
- PASS：`git diff --check`；本任务生成的 `tools/__pycache__` 已清理。

## contract_result

- `battle.templates` 只允许 `{encounterTemplateId,rewardId,enemy}`，不接受 Ghost 字段。
- `battle.ghostEncounters` 只允许 `{encounterId,rewardId,snapshotId}`；当前正式内容要求 encounter 与 snapshot 一对一。
- `battle.ghostSnapshots` 只允许 `{schema,schemaVersion,snapshotId,matchSource,opponentContentRevision,buildHash,build}`，不含 encounter/reward。
- `battle.layers` 只允许 `{fromDay,toDay,pveTemplateIds,ghostEncounterIds}`，并拒绝跨池、重复、未知或未覆盖引用。
- Ghost `build` 只允许 `{hero,board,itemInstances}`；`hero` 只允许 `{heroId,level,skillIds,hp,maxHp}`，其中 hero/skill 必须引用正式目录，skillIds canonical 排序。
- `buildHash` 是 canonical 完整 build 的 SHA-256；runtime `bundleHash` 同时覆盖 items 与完整 runtimeBundle。

## commit_plan

- message: `feat(original-pirate): 冻结正式 Ghost 构筑快照`
- auto_commit: 验证通过后精确暂存、提交并推送当前上游。

## collaboration

- lead_scope: Godot Authority/Session 消费 Ghost Snapshot 的后续接线。
- specialist_input: 本任务只实现上游数据合同，未修改 Godot worktree。
- tester_pass: 非 UI 数据切片，以 workbook/CSV 重建、exact schema、canonical hash 与 forged vectors 为证据。
