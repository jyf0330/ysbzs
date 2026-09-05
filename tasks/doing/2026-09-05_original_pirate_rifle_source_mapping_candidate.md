# Rifle 来源 Ability 映射候选

task_id: 2026-09-05_original_pirate_rifle_source_mapping_candidate
status: READY_TO_MERGE
owner: pirate_top_three_source_audit
merge_owner: /root
worktree: /private/tmp/original-pirate-priority.rMm6UL/ysbzs
Goal: 从锁定 GameData.db 严格导出 Rifle 四品质 Ability 0/1 的来源优先级、单效果顺序与已证实数值，不补写未知初始弹药/默认暴击，不声明完整物品。
related_files: tools/export_original_pirate_rifle_source_mapping_candidate.py; tools/add_original_pirate_rifle_source_mapping_candidate.py; xlsx/candidates/original_pirate_rifle_source_mapping.xlsx; data/candidates/original_pirate/rifle_source_mapping/*; tests/original_pirate_rifle_source_mapping_candidate.test.cjs; tasks/index.md; 本卡
write_scopes: 新增隔离候选 workbook/CSV/JSON/provenance 与专项测试；不修改正式 master、data/csv、正式 content/display 或 runtime schema。
exclusive_files: 无
validation: 锁DB SHA与Rifle UUID/Abilities/Tiers逐字段核对；候选 workbook→CSV 确定性；专项正负测；正式 exporter 字节/hash前后不变；git diff --check。
commit_plan: 不暂存、不提交、不推送；READY_TO_MERGE 后交 Lead。

## 交付证据

- 锁定 DB SHA `7d8df658...46ee9` 与 UUID `1dcc7604...c0ed` 逐字段核验通过：Ability `0` 为 `Medium` 对敌伤害，Ability `1` 为 `Low` 自身本场加伤，均 `TTriggerOnCardFired`、单 Action、`effectOrder=0`。
- 四品质映射为伤害 `20/40/80/160`、本场加伤 `10/20/40/80`；继承的 `CooldownMax=2000`、`Multicast=1`、`AmmoMax=1` 仅作为锁定来源属性。没有把 `AmmoMax` 推导成初始弹药。
- `initialAmmo` 与 `baseCritChance` 只列入 `unknownSourceFields`，未写入任一品质 profile；附魔、价格、获取、Run 初态均排除。
- 专项 `tests/original_pirate_rifle_source_mapping_candidate.test.cjs`：`1/1 PASS`。迁移工具二次运行通过，workbook→CSV 可重复确定。
- Godot 可读映射：`/tmp/original-pirate-rifle-mapping.tlvHpO/source-effect-mapping.json`；canonical mapping SHA `375ddb54719ff93e3632db4ad7ba2bad9556e7f82b86380f091dc03226e7c4fd`；同目录 provenance 明确 `notValidatedAs=ysbzs.original-pirate-content.v1`。
- 正式导出复核路径 `/tmp/original-pirate-rifle-formal-check.gIWbQe`；content/display SHA 分别为 `f48af398...c49b1`、`7b927288...b36f3`，与 Godot 正式文件逐字相同。
