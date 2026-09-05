# 来源 Ability 优先级与效果顺序

task_id: 2026-09-05_original_pirate_source_ability_priority
status: READY_TO_MERGE
owner: pirate_top_three_source_audit
merge_owner: /root
Goal: 47来源效果可显式声明Ability身份、六档触发优先级和Ability内效果顺序，legacy正式包逐字不变。
related_files: tools/export_original_pirate_content.py; tools/add_original_pirate_source_ability_priority.py; xlsx/ysbzs_master.xlsx; data/csv/47_bz_item_effects.csv; data/csv/README_csv_source.md; tests/original_pirate_source_ability_priority.test.cjs; tests/support/original_pirate_source_ability_priority_fixture.json; tests/csv_source.test.cjs; tasks/index.md; 本卡
write_scopes: 47表追加三个来源列；exporter仅增加optional来源Ability验证/候选JSON字段；新专项覆盖六档、分组与legacy包字节；CSV08工作表名单不变。
exclusive_files: xlsx/ysbzs_master.xlsx; tools/export_original_pirate_content.py
validation: TDD RED/GREEN；专项；master original-pirate check；正式content/display逐字对照；CSV08B；git diff --check。
commit_plan: 不暂存、不提交、不推送；READY_TO_MERGE后交Lead。

## 交付证据

- 锁定 `GameData.db` SHA 为 `7d8df658...46ee9`；Rifle `1dcc7604...c0ed` 的 Ability `0/1` 分别为 `Medium/Low`、均单 Action、`effectOrder=0`。六档枚举样例均由同一锁定 DB 的真实 Ability 身份组成，仅证明闭集，不声明这些样例的执行规则映射。
- 全 cards 未发现顶层多 Action 列表；按 Lead 决策，本切片不伪造多 effect 正例，CSV 与 JSON 都拒绝同物品同品质的来源 Ability 多 effect 以及非零 `effectOrder`。
- 新专项 `1/1 PASS`；`generated_original_pirate_tables` 的 `26/26` 表与正式 CSV 逐字一致；exporter `--check` PASS（22 items）；CSV08B PASS。
- 正式输出位于 `/tmp/source-priority-formal.1CJYJw`，content SHA `f48af398...c49b1`、display SHA `7b927288...b36f3`，与 Godot 当前正式文件逐字相同。
- 完整 `tests/csv_source.test.cjs` 为 `19/20`：唯一 CSV08 失败 `pet pal_001 missing required base stat action`，是既有普通宠物 master 导出门禁；不修改、不弱化。`export_master_to_csv.py --check` 同因失败。
- 迁移工具不保存本机安装路径；使用 `python3 tools/add_original_pirate_source_ability_priority.py --db <GameData.db绝对路径>` 显式提供只读来源，并先核对锁定 SHA 与 fixture 身份。
