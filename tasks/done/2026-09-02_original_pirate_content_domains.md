# 原规则级海盗玩法正式内容域

task_id: 2026-09-02_original_pirate_content_domains
status: DONE
owner: codex-pirate-source-audit
branch: codex/original-pirate-content
worktree: /Users/ywh/.codex/worktrees/original-pirate-content/ysbzs

## Goal

为 Godot `original_pirate` 独立玩法建立正式 workbook -> CSV -> exporter 内容链，
交付覆盖六时段日程的原创中文海盗正式源数据与 root v5/runtimeBundle v3 integration-pending 内容包；
事件、奖励、摊位、英雄和技能进入严格 executable catalogs，外部来源审计字段与本地可执行字段分离，
不复制参考作品的专有文本、美术或未冻结版本数值，也不把 fixture 冒充正式内容。

## related_files

- `xlsx/ysbzs_master.xlsx`
- `data/csv/44_bz_gameplay.csv` 至 `data/csv/56_bz_source_snapshot.csv`
- `tools/export_master_to_csv.py`
- 新增 `tools/export_original_pirate_content.py`
- 新增内容链专项测试
- `tasks/done/2026-09-02_original_pirate_content_domains.md`

## write_scopes

- workbook: 新增 `BZ_GAMEPLAY/BZ_HEROES/BZ_ITEMS/BZ_ITEM_EFFECTS/BZ_SKILLS/BZ_STALLS/BZ_STALL_OFFERS/BZ_EVENTS/BZ_EVENT_OPTIONS/BZ_ENCOUNTERS/BZ_ENEMIES/BZ_REWARDS/BZ_SOURCE_SNAPSHOT` 独立页；不改现有元素棋盘域。
- CSV: 只新增上述 13 个域对应的 `44..56` 表，不修改 `00..43` 现有表。
- exporter: 将 13 个 CSV 机械投影为 root v5/runtimeBundle v3/generation.v1；shop/battle 候选形成连续层且最终层开放，价格只由物品品质 profile 派生；`executableCatalogs` 进入 exact-field/hash 合同；同时机械导出独立 `ysbzs.original-pirate-display-directory.v1` sidecar。
- tests: 锁定 workbook/CSV 可重建、稳定 ID/引用、generation 覆盖/开放层/确定性、catalog exact fields/hash、奖励授权和原子语义、display sidecar 机械中文投影及伪造/缺字段整体拒绝。

## exclusive_files

- `xlsx/ysbzs_master.xlsx`
- `tools/export_master_to_csv.py`

## shared_file_policy

- 现有 `2026-07-03_godot-singleplayer-remake` 只读消费 `00..30` CSV；本任务只新增 `44..56`，不改其读取范围。
- 历史任务卡中声明 workbook 独占的条目状态均为 `DONE`；本任务在隔离 worktree 内实施，由当前 Lead 负责跨仓集成。

## validation

- workbook 页/表头/行数与公式错误扫描
- `python3 tools/export_master_to_csv.py --check`（按实际 CLI 调整）
- original-pirate exporter v5/v3 与 forged package 专项
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

- `node --test tests/original_pirate_content_export.test.cjs`：PASS，6/6；覆盖 workbook/CSV 逐字重建、v5/v3/generation.v1 与 executable catalogs 精确字段、最终开放层、完整 canonical hash、独立中文 sidecar、13 域行重排确定性，以及缺关系/字段/中间层/最终候选/不支持附魔或冻结时整包拒绝。
- forged package 门禁：额外 catalog 字段、事件引用等级奖励、item reward 注入 board slot、等级奖励伪造玩家触发、摊位模板缺失/offerCount 漂移、初始 activeNode 伪造、battle reward 未知、newRun 重复 hero skill 真相、bundle hash 篡改均整包拒绝。
- `python3 tools/export_master_to_csv.py --check --original-pirate-only`：PASS；13 个 BZ 页与 `44..56` CSV 一致。
- `python3 tools/export_original_pirate_content.py --check`：PASS；候选包含 6 个物品、6 个时段、33 个商店模板、20 个携带 `rewardId` 的战斗模板、58 条中文展示目录。
- `PATH=/Users/ywh/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin:$PATH node --test --test-name-pattern='CSV08B' tests/csv_source.test.cjs`：PASS；31 个可见 workbook 页合同通过。
- 当前 Godot `b3b14b4a` 只接受 root v4/runtimeBundle v2；本 v5/v3 是正式 integration-pending 候选，必须由下游一次迁移后才能对玩家开放，不再用旧 v4 接受证据冒充当前兼容。
- workbook 结构/错误扫描：PASS；31/31 页可见，13 个 BZ 页无公式，未发现 `#REF!/#DIV/0!/#VALUE!/#NAME?`。
- `data/csv/00..43` 任务前后 SHA-256：全部一致；`git diff --check`：PASS。
- 全量 `python3 tools/export_master_to_csv.py --check` 仍失败于既有 `pal_001 missing required base stat action`；对任务前基线 workbook 执行同命令得到相同失败，因此本任务使用不求值旧公式域的 `--original-pirate-only` 专项门禁。

## integration_boundary

- exporter 将 workbook 中的 v3 finite source candidate 单向投影为 root v5/runtimeBundle v3 `generation.v1`；不保留 `initialOffers/refreshPackages/battlePackages` 兼容双真相。
- 正式身份已迁移到 `ysbzs.original-pirate-rules.2026-09-02-v1`，source/bundle/content revision 全链为 v2；初始 `phase=schedule`，`activeNode={nodeId:'',kind:'',rewardId:''}`。
- `bootstrap_run_day_coverage=10` 与 `bootstrap_refresh_package_coverage=10` 仅验证 source candidate 的连续输入范围；第 10 日与刷新 10 被投影为最终 `null` 开放层，不构成运行上限。
- CSV 的 offer `price` 只验证对应 `qualityProfiles[quality].buyPrice`，不进入 generation template；最终运行价格由 Godot generation service 派生。
- `ysbzs.original-pirate-display-directory.v1` 是独立候选 sidecar，不属于 Godot root content schema；正式 Snapshot projector 接线由下游另行完成。
- `ysbzs.original-pirate-executable-catalogs.v1` 精确包含 1 英雄、6 技能、1 摊位、4 事件、8 选项、10 奖励；不重复 encounters。全部 18 个 item effect ID 被技能目录恰好引用一次，全部非等级奖励至少被事件、日程直接奖励或 battle template 引用，2 个等级奖励只由 schedule `levelThresholds` 引用。
- 事件玩家意图边界为后续 `CHOOSE_EVENT_OPTION(eventId,optionId)`；command 不携带 reward/effects/gold。选项只绑定 `rewardId + goldDelta`，运行时必须把两者作为单一原子候选解析。
- 下游日程语义建议为 `SELECT_SCHEDULE_NODE(nodeId)` 填充 authority `activeNode`，摊位节点继续复用 `BUY_OFFER/FREEZE_OFFER/REFRESH_SHOP`，直接奖励节点用不携带 reward/effects 的 `CLAIM_ACTIVE_REWARD`；节点完成后才允许 `COMPLETE_HOUR`。这些 command 尚未在本上游数据切片实现。
- item reward 的唯一语义为 `grant_item(...,destination=stash)`，不携带 board slot；当前无正式 stash capacity，只有 instance ordinal/ID 冲突等真实失败才整条候选拒绝且不部分发金币/物品。
- level reward 固定 `trigger={scope:system,event:LEVEL_UP}`，不得作为事件选项或玩家日程节点；其他奖励固定由系统 `REWARD_RESOLUTION` 解释。battle 胜利按 template 的 `rewardId` 结算。
- stall 目录持有全部 generation shop template refs；验证引用存在、唯一、覆盖全部模板，且每层引用数与 `offerCount` 一致。价格仍只由物品 `qualityProfiles[quality].buyPrice` 派生。
- skill 目录只为 `item_ready` 建立 effect ID 归属索引，结构化效果正文仍唯一保存在 item quality profile；下游不得同时执行“catalog skill”和“item profile effect”两条路径造成重复结算。hero -> skill 绑定只存在 executable catalog，newRun 不再复制 `skillIds`。
- 未覆盖参考作品 18.0 全目录；本任务仅包含本地原创正式 bootstrap，不复制外部作品专有文本、美术或未冻结数值。
