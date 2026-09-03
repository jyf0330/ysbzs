# Original Pirate 友方标签集合目标 v1

task_id: 2026-09-03_original_pirate_friendly_tag_collection_target
status: DONE
owner: codex-original-pirate-friendly-tag-collection-data
branch: codex/original-pirate-content
target_ids: BZ-OP-TARGET-FRIENDLY-TAG-COLLECTION-01

## Goal

新增完全原创、正式可买的 2 格物品 `item_broadside_signal_relay` / “齐射传令台”：四品质均严格包含一条 `item_ready + always -> friendly_items_with_any_tag(tags=[weapon]) + charge`。集合目标仅匹配同 owner 战场物品，source 若具备标签亦包含；空集合合法 no-op，不得回退或改写为静态 target identity。

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

- workbook/CSV：新增 `target_tags` 独立列、齐射传令台四品质 item/effect/skill/upgrade/铭刻数据，并替换 refresh 4 slot 3 offer；执行一次包含 Ghost 内容修订引用的原子版本升级
- exporter：新增且只接纳 `friendly_items_with_any_tag` 的 canonical `tags` 参数，限定为 `item_ready + always + charge`
- tests：锁定正式目录、集合标签 canonical、报价/升级/铭刻/计数/hash，并覆盖空标签、未知/重复/乱序标签、别名、错误触发/条件/操作/参数及旧版本 fail-closed
- docs/tasks：记录原创语义、数据真相链、外部正式映射仍为 0/138
- generated output：生成隔离 content/display 包，不纳入 Git

## exclusive_files

- `xlsx/ysbzs_master.xlsx`
- `tools/export_original_pirate_content.py`
- `tests/original_pirate_content_export.test.cjs`

## shared_file_policy

开工基线 `78e9456f` 且 clean；同仓旧任务卡中的 workbook 租约均为已交付历史任务、位于其他分支/工作树，未占用本分支 BZ 44–58 域或 original-pirate 导出接口。本任务不修改 Godot 仓库、外部 reference 域或现有 138 条来源身份集合。

## validation

- PASS：`python3 tools/export_master_to_csv.py --check --original-pirate-only`
- PASS：`python3 tools/export_original_pirate_content.py --check`
- PASS：`node --test tests/original_pirate_content_export.test.cjs`（13/13）
- PASS：`node --test --test-name-pattern='CSV02F|CSV08B|CSV09' tests/csv_source.test.cjs`（3/3）
- PASS：`node --test tests/unit/hero_skill_catalog_source.test.cjs`（1/1）
- PASS：`node tools/check_csv_data.cjs`
- PASS：`git diff --check`
- 已知基线：`npm run check:csv` 为 19/20；唯一 CSV08 因 `pet pal_001 missing required base stat action` 失败。该错误存在于非 BZ 宠物总表投影，不由本任务修改；本任务相关 CSV08B 与 CSV09 均通过。

## Content result

- `item_broadside_signal_relay` / “齐射传令台”：2 格，canonical tags `relic, tool`，青铜/白银/黄金/钻石购买价 `4/7/11/16`、出售价 `2/3/5/8`、冷却 `9/8/7/6`。
- 每品质严格只有一条 `item_ready + always -> friendly_items_with_any_tag(tags=[weapon]) + charge`；推进 ticks 为 `1/1/1/2`。筛选标签只存在于 `target_tags`，不复用 `condition_tags`。
- `offer_refresh_4_broadside_signal_relay` 替换 refresh 4 第三槽原盐雾炮报价，出售青铜品质且报价 4；模板总数仍为 33，10 层刷新覆盖不变。
- 升阶价 `4/7/10`；只适用既有顺风铭刻，四品质价格 `4/6/9/12`，不开放破浪或备弹铭刻。
- 集合规则冻结为同 owner、board-only、任一 canonical tag 命中；source 若命中标签亦包含；按 `boardSlot -> instanceId` 稳定排序。空集合合法 no-op，不回退、不生成静态 `targetInstanceId`。

## Result

- 版本：source content v20、source runtime v18、content v22、runtime bundle v20、executable catalogs v13、rules v18；source/content/bundle/snapshot revisions 均迁移至 v19，Ghost 内容引用同步迁移。
- 目录：18 items、66 quality profiles、128 effects、18 item skills、48 upgrades、128 enchantment profiles、33 shop templates、113 display entries。
- 隔离生成结果：`output/original_pirate_friendly_tag_collection_target/content.json` SHA-256 `c9125a7baa247ad009f21dd2106ac212c35ce14c9b3056f12fc06c22babc07d8`；`display.zh-CN.json` SHA-256 `52bcc88b3f79f1d3372e435f40e734e6015b51b0501d15ff076870efa72ad243`；canonical bundle hash `4c50d967a64289af7f0b8209dd12283d363d504573467ecc5527330c2534fbf7`。
- 构建绑定 Vanessa 参考目录未新增本原创 ID，正式可执行映射继续保持 Item `0/138`、Skill `0/138`。

## collaboration

- lead_scope: workbook、CSV、导出器、专项门禁、文档、任务归档与 Git 交付
- specialist_input: 规则审计冻结 `friendly_items_with_any_tag(tags=[weapon])`、同 owner/board-only/source 可包含/空集合 no-op 合同
- tester_pass: 无；纯数据与导出合同，以 workbook 重建、Node fail-closed 与 canonical hash 验证
- external_ai_input: 无
- lead_decision: 独立 `target_tags` 避免将目标筛选误写成响应条件；refresh 4 slot 3 替换保持商店模板数量与刷新覆盖不变

## commit_plan

- 一个原子提交：`data(content): add friendly tag collection target`
- 验证通过后精确暂存、提交并推送 `codex/original-pirate-content`
