# 原创海盗最后机会三选一目录

task_id: 2026-09-02_original_pirate_last_chance_choices
type: data-contract
status: DONE
owner: codex-last-chance-data
branch: codex/original-pirate-content
worktree: /Users/ywh/.codex/worktrees/original-pirate-content/ysbzs

## Goal

把 Prestige 冻结为只受 Ghost 战斗 loss/draw 影响，并建立首次 Prestige 归零后
一次性正式最后机会三选一的 workbook -> CSV -> exporter 单一真相链。

## related_files

- `xlsx/ysbzs_master.xlsx`
- `data/csv/44_bz_gameplay.csv`
- `data/csv/56_bz_source_snapshot.csv`
- `data/csv/61_bz_last_chance_choices.csv`
- `tools/export_master_to_csv.py`
- `tools/export_original_pirate_content.py`
- `tests/original_pirate_content_export.test.cjs`
- `tests/csv_source.test.cjs`
- `tasks/doing/2026-09-02_original_pirate_last_chance_choices.md`
- `tasks/index.md`

## write_scopes

- workbook/CSV：新增 `BZ_LAST_CHANCE_CHOICES/61` 域，移除 PvE Prestige 扣除字段，冻结 Ghost-only policy 与三项最后机会。
- content exporter：输出 schedule v4 `prestigePolicy/lastChanceRules` exact schema，并升级 newRun lastChance 状态形状。
- tests：覆盖 workbook/CSV 重建、exact fields、三项/唯一 fallback、policy link、display、canonical hash 与 forged vectors。

## exclusive_files

- `xlsx/ysbzs_master.xlsx`
- `tools/export_master_to_csv.py`
- `tools/export_original_pirate_content.py`
- `tests/original_pirate_content_export.test.cjs`

## validation

- `python3 tools/export_master_to_csv.py --check --original-pirate-only`
- `python3 tools/export_original_pirate_content.py --check`
- `node --test tests/original_pirate_content_export.test.cjs`
- `PATH=.../dependencies/python/bin:$PATH node --test --test-name-pattern='CSV08B' tests/csv_source.test.cjs`
- `git diff --check`

## commit_plan

- message: `feat(original-pirate): 增加最后机会选择目录`
- auto_commit: 验证通过后精确暂存、提交并推送当前上游。

## collaboration

- lead_scope: Godot Authority/Session/UI 消费最后机会规则的后续接线。
- specialist_input: 本任务只实现上游数据合同，不修改 Godot worktree。

## contract_result

- `scheduleConfig.v4` 以 `prestigePolicy.affectedBattleKind=ghost` 物理移除 PvE Prestige 扣除入口。
- `lastChanceRules.v1` 冻结 Ghost loss/draw 首次归零触发、每局一次、三项正式选择与唯一无成本 fallback。
- 三项依 order 输出：恢复 10/支付 12 金币、恢复 8/降低 2 收入、恢复 6/无成本。
- `newRunTemplate.v2` 以 exact `available` 状态初始化最后机会，不预填运行时 policy/options。
- display sidecar 新增 `last_chance_options`，三项中文名称与说明全部来自 workbook。

## validation_results

- PASS：`python3 tools/export_master_to_csv.py --check --original-pirate-only`；18 个 BZ 页与 `44..61` CSV 一致。
- PASS：`python3 tools/export_original_pirate_content.py --check`；root v12/runtimeBundle v10/schedule v4/newRun v2，display 70 条。
- PASS：`node --test tests/original_pirate_content_export.test.cjs`，6/6；覆盖 exact schema、Ghost-only、三项/唯一 fallback、policy link、hash 与 forged vectors。
- PASS：bundled Python 环境运行 `CSV08B`，1/1；36 个 workbook sheet 全部可见，新域位于 Ghost 快照之后。
- PASS：`git diff --check`；测试生成的 `tools/__pycache__` 已清理。
