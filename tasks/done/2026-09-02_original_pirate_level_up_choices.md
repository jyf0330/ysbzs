# 原创海盗正式升级三选一目录

task_id: 2026-09-02_original_pirate_level_up_choices
type: data-contract
status: DONE
owner: codex-pirate-source-audit
branch: codex/original-pirate-content
worktree: /Users/ywh/.codex/worktrees/original-pirate-content/ysbzs

## Goal

把原创局内升级三选一从 workbook/CSV 单向投影为可执行 `progressionRules`，
让正式经验阈值与金币、物品、定向升阶选项由同一数据真相链拥有，移除只记录
`record_level_reward` 而没有玩家成长选择的旧占位语义。

## related_files

- `xlsx/ysbzs_master.xlsx`
- `data/csv/44_bz_gameplay.csv`
- `data/csv/55_bz_rewards.csv`
- `data/csv/56_bz_source_snapshot.csv`
- `data/csv/59_bz_level_up_choices.csv`
- `tools/export_master_to_csv.py`
- `tools/export_original_pirate_content.py`
- `tests/original_pirate_content_export.test.cjs`
- `tasks/done/2026-09-02_original_pirate_level_up_choices.md`
- `tasks/index.md`

## write_scopes

- workbook/CSV：新增 BZ_LEVEL_UP_CHOICES/59 域，迁移三个等级里程碑与九个正式选项；BZ_REWARDS 删除 record-only level 行；44/56 同步 v6 revision 身份。
- master exporter：original-pirate-only 覆盖完整 44..59 BZ 域。
- content exporter：root v9/runtimeBundle v7 `progressionRules.v1`、catalog v3、单一阈值真相和严格引用/effect 校验。
- schedule/new run：schedule config v2 不再复制等级阈值；newRunTemplate 只初始化空的 `levelRewards` 权威运行态。
- tests：保持 Node 六项结构，覆盖 deterministic/hash 与 source/package forged fail-closed。

## exclusive_files

- `xlsx/ysbzs_master.xlsx`
- `tools/export_master_to_csv.py`
- `tools/export_original_pirate_content.py`
- `tests/original_pirate_content_export.test.cjs`

## validation

- `python3 tools/export_original_pirate_content.py --check`
- `python3 tools/export_master_to_csv.py --check --original-pirate-only`
- `node --test tests/original_pirate_content_export.test.cjs`（6/6）
- `git diff --check`

## commit_plan

- message: `feat(original-pirate): 增加正式升级选择目录`
- auto_commit: 验证通过后精确暂存并提交，不推送。

## collaboration

- lead_scope: Godot progression command、Snapshot 投影和玩家 UI 后续接线。
- specialist_input: 本任务仅建立正式上游数据合同，不修改 Godot worktree。
- tester_pass: 非 UI 数据切片，以 workbook/CSV 重建、exact schema、canonical hash 与整包拒绝为证据。

## validation_results

- PASS：`python3 tools/export_original_pirate_content.py --check`；root v9/runtimeBundle v7、source v7/v5、rules v5、revision v6，输出 3 个里程碑、9 个升级选项和 68 条中文显示目录。
- PASS：`python3 tools/export_master_to_csv.py --check --original-pirate-only`；16 个 BZ 页与 `44..59` CSV 一致。
- PASS：`node --test tests/original_pirate_content_export.test.cjs`，6/6；覆盖 4/8/12 XP、每时段 1 XP、PvE 额外 2 XP、三类结构化 effect、canonical hash、行重排确定性及 source/package forged fail-closed。
- forged 门禁覆盖缺/多字段、未知引用、重复 option/milestone ID、非法数量/品质/目标规则、`enabled=false`、schedule 阈值双真相、非空 newRun levelRewards 初始态及旧 level reward trigger。
- 全量 `python3 tools/export_master_to_csv.py --check` 仍命中既有旧域 `pet pal_001 missing required base stat action`；本任务未改该域，不顺修。
- 本任务不涉及玩家 UI，无实窗验收项。
