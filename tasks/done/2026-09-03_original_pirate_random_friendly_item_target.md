# Original Pirate 随机友方物品单目标 v1

task_id: 2026-09-03_original_pirate_random_friendly_item_target
status: DONE
owner: codex-original-pirate-random-friendly-item-data
branch: codex/original-pirate-content
target_ids: BZ-OP-TARGET-RANDOM-FRIENDLY-ITEM-01

## Goal

新增完全原创、正式可买的 1 格物品 `item_crosswind_selector` / “侧风择发器”：四品质均严格包含一条 `item_ready + always -> random_friendly_item_with_any_tag(tags=[weapon], excludeSelf=true, count=1) + charge`，并完成 workbook→CSV→exporter→generated/display/upgrade/enchant 单一真相链。

## related_files

- `xlsx/ysbzs_master.xlsx`
- `data/csv/44_bz_gameplay.csv`
- `data/csv/46_bz_items.csv`
- `data/csv/47_bz_item_effects.csv`
- `data/csv/48_bz_item_skills.csv`
- `data/csv/50_bz_stall_offers.csv`
- `data/csv/56_bz_source_snapshot.csv`
- `data/csv/57_bz_item_upgrades.csv`
- `data/csv/58_bz_enchantments.csv`
- `data/csv/60_bz_ghost_snapshots.csv`
- `tools/export_original_pirate_content.py`
- `tests/original_pirate_content_export.test.cjs`
- `data/csv/README_csv_source.md`
- `tasks/index.md`
- 本任务卡

## write_scopes

- workbook/CSV：新增随机目标专用 `target_exclude_self` / `target_count` 列、侧风择发器四品质 item/effect/skill/upgrade/铭刻数据，替换 refresh 5 三项候选之一，并执行一次原子版本迁移；CSV `slot_order=3` 只记录作者顺序，不承诺 content-hash 排序后的视觉槽位
- exporter：只接纳 `random_friendly_item_with_any_tag` 的 canonical 非空 tags、必填严格 bool `excludeSelf=true|false`、`count=1`，限定 `item_ready + always + charge`；正式物品数据仍固定 `true`
- tests：锁定随机目标 exact params、商品自然可达性、升级/铭刻/计数/hash，并覆盖目标参数、触发、条件、操作、旧版本伪造
- docs/tasks：记录原创语义、数据真相链与版本边界
- generated output：生成隔离 content/display 包，不纳入 Git

## exclusive_files

- `xlsx/ysbzs_master.xlsx`
- `tools/export_original_pirate_content.py`
- `tests/original_pirate_content_export.test.cjs`

## shared_file_policy

开工基线 `d7473a142b515b470f55c0c79ec53ceb34e536bc` 且 clean；同仓旧 workbook/exporter 租约均为已交付历史任务或其他分支，不占用本 worktree 当前 BZ 44–65 域。本任务不修改 Godot 仓库、外部 reference 域或现有来源身份集合。

## validation

- RED：新增 `OPC02E` 后，旧 v22/v20/v13 包与 v23/v21/v14 预期不符，确认新合同未被旧 exporter 静默接纳
- PASS：`python3 tools/export_master_to_csv.py --check --original-pirate-only`
- PASS：`python3 tools/export_original_pirate_content.py --check`
- PASS：`node --test tests/original_pirate_content_export.test.cjs`（15/15）
- PASS：`PATH=<bundled-python>:$PATH node --test --test-name-pattern='CSV02F|CSV08B|CSV09' tests/csv_source.test.cjs`（3/3）
- PASS：`node --test tests/unit/hero_skill_catalog_source.test.cjs`（1/1）
- PASS：`node tools/check_csv_data.cjs`
- PASS：`git diff --check`

## Content result

- `item_crosswind_selector` / “侧风择发器”：1 格，canonical tags `tool, weapon`；四品质购买价 `2/5/9/14`、出售价 `1/2/4/7`、冷却 `8/7/6/5`。
- 每品质严格一条 `item_ready + always -> random_friendly_item_with_any_tag(tags=[weapon], excludeSelf=true, count=1) + charge`；推进 ticks `1/1/2/2`，priority `20`。
- `offer_refresh_5_crosswind_selector` 替换 refresh 5 三项候选之一的旧 signal-flare 报价；CSV `slot_order=3` 不是视觉槽位合同。青铜价格 2，初始 12 金按刷新价 2 连续刷新五次后恰余 2 金；正式 Session 从 Snapshot 按内容身份取得动态 `offerId`，不依赖候选排序。
- 升阶价 `3/6/10`；仅适用既有顺风铭刻，四品质价格 `4/6/9/12`。破浪伤害和弹仓铭刻因无对应伤害/弹药 operation 保持 fail-closed。
- CSV 新增独立 `target_exclude_self` / `target_count` 列；`excludeSelf` 的 canonical `true` 与 `false` 均有正例，空值、数字和非 canonical 字符串均 fail closed。随机目标以外的目标携带这些字段会被拒绝，集合目标继续只拥有 `tags`。

## Result

- 版本：source content v21、source runtime v19、content v23、runtime bundle v21、executable catalogs v14、rules v19；source/content/bundle/snapshot revisions 迁移到 v20，Ghost 内容引用同步迁移。
- 目录：19 items、70 quality profiles、132 effects、19 item skills、51 upgrades、132 enchantment profiles、33 shop templates、115 display entries。
- 隔离生成结果：`output/original_pirate_random_friendly_item_target/content.json` SHA-256 `775aa98c1fd7bc72f743b4088299b43a433140a77e3ae145b0dffca5e68d5eb3`；`display.zh-CN.json` SHA-256 `40a52f35d797ce383f1540ff261facd895d7a9f4169a6c9d1705fb7964e6b63d`；canonical bundle hash `3366145eb3436b79dc8e3487dae34a5b994b4f8f422ef7dbb0a5141c023e6bb8`。
- 首次 CSV08B/CSV09 使用系统 `python3` 时因环境缺少 `openpyxl` 失败；切换到工作区 bundled Python 后 3/3 通过，属于执行环境问题，不是数据或代码失败。

## collaboration

- lead_scope: workbook、CSV、导出器、专项门禁、文档、任务归档与隔离候选生成
- specialist_input: 运行时消费方确认正式 Session 将从 Snapshot 安装新物品并验证确定性随机 Trace；数据层冻结 exact target params 和正式报价身份
- tester_pass: 无；纯数据与导出合同，以 workbook 重建、Node fail-closed 与 canonical hash 验证
- lead_decision: 随机目标参数使用独立列，禁止由 target type 隐式补全；仅开放对该物品实际有效的冷却铭刻

## commit_plan

- 不提交；完成验证后归档到 `tasks/done/`，保留未提交 diff 供下游集成。
