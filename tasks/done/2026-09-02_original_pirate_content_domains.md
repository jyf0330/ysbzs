# 原规则级海盗玩法正式内容域

task_id: 2026-09-02_original_pirate_content_domains
status: DONE
owner: codex-pirate-source-audit
branch: codex/original-pirate-content
worktree: /Users/ywh/.codex/worktrees/original-pirate-content/ysbzs

## Goal

为 Godot `original_pirate` 独立玩法建立正式 workbook -> CSV -> exporter 内容链，
先交付覆盖六时段日程的原创中文海盗正式源数据与 bootstrap candidate 内容包；外部来源审计字段与本地可执行字段分离，
不复制参考作品的专有文本、美术或未冻结版本数值，也不把 fixture 冒充正式内容。

## related_files

- `xlsx/ysbzs_master.xlsx`
- `data/csv/44_bz_gameplay.csv` 至 `data/csv/56_bz_source_snapshot.csv`
- `tools/export_master_to_csv.py`
- 新增 `tools/export_original_pirate_content.py`
- 新增内容链专项测试
- `tasks/doing/2026-09-02_original_pirate_content_domains.md`

## write_scopes

- workbook: 新增 `BZ_GAMEPLAY/BZ_HEROES/BZ_ITEMS/BZ_ITEM_EFFECTS/BZ_SKILLS/BZ_STALLS/BZ_STALL_OFFERS/BZ_EVENTS/BZ_EVENT_OPTIONS/BZ_ENCOUNTERS/BZ_ENEMIES/BZ_REWARDS/BZ_SOURCE_SNAPSHOT` 独立页；不改现有元素棋盘域。
- CSV: 只新增上述 13 个域对应的 `44..56` 表，不修改 `00..43` 现有表。
- exporter: 将 13 个 CSV 机械投影为 root v4/runtimeBundle v2/generation.v1；shop/battle 候选形成连续层且最终层开放，价格只由物品品质 profile 派生；同时机械导出独立 `ysbzs.original-pirate-display-directory.v1` sidecar。
- tests: 锁定 workbook/CSV 可重建、稳定 ID/引用、generation 覆盖/开放层/确定性/hash 兼容、display sidecar 机械中文投影及缺字段整体拒绝。

## exclusive_files

- `xlsx/ysbzs_master.xlsx`
- `tools/export_master_to_csv.py`

## shared_file_policy

- 现有 `2026-07-03_godot-singleplayer-remake` 只读消费 `00..30` CSV；本任务只新增 `44..56`，不改其读取范围。
- 历史任务卡中声明 workbook 独占的条目状态均为 `DONE`；本任务在隔离 worktree 内实施，由当前 Lead 负责跨仓集成。

## validation

- workbook 页/表头/行数与公式错误扫描
- `python3 tools/export_master_to_csv.py --check`（按实际 CLI 调整）
- 新增 original-pirate exporter 专项
- 新增 CSV/source contract 专项
- `git diff --check`

## commit_plan

- message: `data(pirate): add formal original gameplay domains`
- auto_commit: Specialist 不提交；Lead 复核、验证后精确提交。

## collaboration

- lead_scope: Godot runtime/Session/UI/Repository 与跨仓最终接线
- specialist_input: codex-mode-arch-audit 负责本 worktree 的正式数据域实现
- tester_pass: 数据任务不含玩家 UI；本阶段以 workbook 结构、导出 determinism 与上游关系门禁为准，旧 v3 包不作为 Godot 正式验收。
- lead_decision: 先建立真实数据链与可执行候选；generation/display 新 schema 冻结后再接正式 runtime，且不宣称参考作品 18.0 全目录条数完成。

## validation_results

- `node --test tests/original_pirate_content_export.test.cjs`：PASS，5/5；覆盖 workbook/CSV 逐字重建、v4/v2/generation.v1 精确字段、最终开放层、完整 canonical hash、独立中文 sidecar、13 域行重排确定性，以及缺关系/字段/中间层/最终候选/不支持附魔或冻结时整包拒绝。
- `python3 tools/export_master_to_csv.py --check --original-pirate-only`：PASS；13 个 BZ 页与 `44..56` CSV 一致。
- `python3 tools/export_original_pirate_content.py --check`：PASS；候选包含 6 个物品、6 个时段、33 个商店模板、20 个战斗模板、58 条中文展示目录。
- `PATH=/Users/ywh/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin:$PATH node --test --test-name-pattern='CSV08B' tests/csv_source.test.cjs`：PASS；31 个可见 workbook 页合同通过。
- Godot `b3b14b4a` 的正式 `original_pirate_content_validator.gd`：PASS；实际导出包被 root v4 validator 接受，generation service 对 refresh 11、Day 11 PvE/幽灵均成功生成。
- workbook 结构/错误扫描：PASS；31/31 页可见，13 个 BZ 页无公式，未发现 `#REF!/#DIV/0!/#VALUE!/#NAME?`。
- `data/csv/00..43` 任务前后 SHA-256：全部一致；`git diff --check`：PASS。
- 全量 `python3 tools/export_master_to_csv.py --check` 仍失败于既有 `pal_001 missing required base stat action`；对任务前基线 workbook 执行同命令得到相同失败，因此本任务使用不求值旧公式域的 `--original-pirate-only` 专项门禁。

## integration_boundary

- exporter 已将旧 v3 finite source candidate 单向投影为 root v4/runtimeBundle v2 `generation.v1`；不保留 `initialOffers/refreshPackages/battlePackages` 兼容双真相。
- `bootstrap_run_day_coverage=10` 与 `bootstrap_refresh_package_coverage=10` 仅验证 source candidate 的连续输入范围；第 10 日与刷新 10 被投影为最终 `null` 开放层，不构成运行上限。
- CSV 的 offer `price` 只验证对应 `qualityProfiles[quality].buyPrice`，不进入 generation template；最终运行价格由 Godot generation service 派生。
- `ysbzs.original-pirate-display-directory.v1` 是独立候选 sidecar，不属于 Godot root content schema；正式 Snapshot projector 接线由下游另行完成。
- 未覆盖参考作品 18.0 全目录；本任务只有本地原创 bootstrap：1 英雄、6 物品、6 技能、1 摊位、4 事件、2 敌方阵容、10 奖励。
