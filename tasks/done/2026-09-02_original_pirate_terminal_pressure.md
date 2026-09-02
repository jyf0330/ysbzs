# 原创海盗正式终局压力配置

task_id: 2026-09-02_original_pirate_terminal_pressure
type: data-contract
status: DONE
owner: codex-pirate-source-audit
branch: codex/original-pirate-content
worktree: /Users/ywh/.codex/worktrees/original-pirate-content/ysbzs

## Goal

把原创终局压力参数从 `BZ_GAMEPLAY` 经 workbook/CSV/exporter 单向投影到
`runtimeBundle.battleRules.terminalPressure`，并以严格 exact schema、完整 bundle hash
和 forged package 门禁保护该正式运行输入。

## related_files

- `xlsx/ysbzs_master.xlsx`
- `data/csv/44_bz_gameplay.csv`
- `data/csv/56_bz_source_snapshot.csv`
- `tools/export_original_pirate_content.py`
- `tests/original_pirate_content_export.test.cjs`
- `tasks/done/2026-09-02_original_pirate_terminal_pressure.md`

## write_scopes

- `BZ_GAMEPLAY`：新增终局压力五个正式字段，并原子迁移 source/runtime/rules/revision 身份。
- `BZ_SOURCE_SNAPSHOT`：同步 source revision 与本地原创内容范围说明。
- exporter：root v8/runtimeBundle v6，新增唯一 `battleRules.terminalPressure` 运行真相。
- tests：保持现有 Node 6 项结构，新增 source 与 forged package fail-closed 向量。

## exclusive_files

- `xlsx/ysbzs_master.xlsx`
- `data/csv/44_bz_gameplay.csv`
- `data/csv/56_bz_source_snapshot.csv`
- `tools/export_original_pirate_content.py`
- `tests/original_pirate_content_export.test.cjs`

## validation

- `python3 tools/export_original_pirate_content.py --check`
- `python3 tools/export_master_to_csv.py --check --original-pirate-only`
- `node --test tests/original_pirate_content_export.test.cjs`（6/6）
- `git diff --check`

## commit_plan

- message: `feat(original-pirate): 增加正式终局压力配置`
- auto_commit: 本任务验证通过后精确暂存并提交，不推送。

## collaboration

- lead_scope: Godot 运行时消费与跨仓集成。
- specialist_input: 本任务只负责上游正式数据合同。
- tester_pass: 非 UI 数据切片，以 workbook/CSV 重建、canonical hash 与整包拒绝为验收证据。

## validation_results

- PASS：`python3 tools/export_original_pirate_content.py --check`；输出 root v8/runtimeBundle v6，正式 revision v5，6 物品、6 时段、33 商店模板、20 战斗模板、61 条显示目录。
- PASS：`python3 tools/export_master_to_csv.py --check --original-pirate-only`；15 个 BZ 页的本任务相关 master/CSV 合同无漂移，Node OPC01 同时逐字核对 `44..58`。
- PASS：`node --test tests/original_pirate_content_export.test.cjs`，6/6；覆盖正式参数、完整 bundle hash、源字段缺失/非法/disabled，以及 package 缺字段、多字段、伪造类型、disabled 和数值越界整包拒绝。
- 基线缺口：全量 `python3 tools/export_master_to_csv.py --check` 仍在既有旧域报 `pet pal_001 missing required base stat action`；与本任务前已有记录一致，不影响 `--original-pirate-only` 真相链门禁。
- 本任务不涉及玩家 UI，无实窗验收项。
