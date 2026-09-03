# Original Pirate 减速响应再生 v1 数据合同

task_id: 2026-09-04_original_pirate_regen_on_slow
status: DONE
owner: codex-root
branch: codex/original-pirate-content
target_ids: BZ-OP-REGEN-ON-SLOW-01

## Goal

在 `ysbzs_master.xlsx -> CSV -> exporter -> generated` 单一真相链中增加项目原创 Regen v1：复用归辉航标，在另一件友方物品成功施加 Slow 后为己方英雄增加本场战斗再生；不修改外部来源锁或 executable mapping。

## Frozen Data Contract

- `regenRules=ysbzs.original-pirate-regen.v1` exact 保存：20 tick 周期、全局 tick 对齐、tick-start 位于 Burn/Poison/物品推进之前、双方快照后按 player/enemy 稳定结算、生命封顶并记录过量、不触发治疗净化、不暴击、不抽 RNG。
- 新触发 `another_friendly_item_applied_slow` 只能绑定一条已提交且生效的 `APPLY_STATUS(status=slow)`；来源必须是另一件同 owner 活跃棋盘物品。
- 新操作 `gain_regen_for_fight` 只能由上述触发作用于 `owner_hero`，四品质归辉航标分别增加 `1/2/3/4`；数据必须为正整数且不携带其他参数。

## Version Plan

- Data/content：rules v30、source content/runtime 32/30、generated content/runtime 34/32、catalog 24、revision v31；物品与 Aura 数量不变，effects 160→164。

## Validation

- PASS：绑定 Python 运行 `tools/export_master_to_csv.py --check --original-pirate-only`，workbook 与 23 个 BZ CSV 页逐字一致。
- PASS：`tools/export_original_pirate_content.py --check`，得到 content v34 / runtime v32 / 22 items / 24 executable catalogs / 121 display entries / revision v31。
- PASS：两个 original-pirate Node 测试文件共 `37/37`，覆盖 exact Regen 规则、四品质效果和错误 trigger/target/operation/params/value/version fail-closed。
- PASS：`node tools/check_csv_data.cjs` 与两个 exporter 的 Python `py_compile`。
- 未更改 source snapshot、Ghost 身份、报价、升级、铭刻和 `Item 0/138 + Skill 0/138` executable mapping。

## Completion

- “归辉航标”四品质正式导出 `1/2/3/4` Regen，且只绑定另一件同方物品成功施加 Slow 的响应。
- 唯一 Regen v1 规则由正式玩法数据拥有；导出器和测试拒绝缺失、别名、错误顺序及越界值。
- 外部来源只保留结构参考，本切片没有把项目原创数值和时序记作参考作品的精确实现。

## commit_plan

- 一个原子提交：`data(content): add original pirate regen on slow`
