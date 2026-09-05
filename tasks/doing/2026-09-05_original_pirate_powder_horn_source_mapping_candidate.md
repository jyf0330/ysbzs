# Powder Horn 来源装填映射候选

task_id: 2026-09-05_original_pirate_powder_horn_source_mapping_candidate
status: READY_TO_MERGE
owner: root
worktree: /private/tmp/original-pirate-priority.rMm6UL/ysbzs
Goal: 锁定 Powder Horn 原始 Ability 的 Lowest 顺序、右邻目标与四品质装填量，为 Rifle 自然第二发提供真实来源，不补写 Rifle 初始弹药。

## 边界

- 只新增隔离候选 workbook/CSV/JSON/provenance 与专项测试。
- 不修改正式 master、正式 content/display、runtime schema 或既有 Rifle 候选。
- 候选只证明来源映射，不等于完整物品或完整战斗验收。锁定 DB 没有定义
  `emptyAmmoCooldownPolicy` 或 `reloadWakePolicy`，两者必须保持来源未决。

## 交付证据

- 锁定 DB SHA `7d8df658...46ee9` 与 Powder Horn UUID
  `03e4c71d...edc03`；身份、四品质继承属性、Ability `0`、`Lowest`、
  `TActionCardReload`、右邻位置目标及 `AmmoMax > 0` 条件逐字段核验通过。
- 四品质装填量为 `1/2/3/4`，`CooldownMax=3000ms`、`Multicast=1`、
  `ReloadTargets=1`。没有推导 Rifle 的初始弹药、默认暴击或完整 Run 初态。
- 候选 mapping canonical SHA 为
  `e28a46a1612813d570a24805e4bec476a8f10007e4d0e827c76e6a297149457e`；
  摘要包含两项来源未决时序字段。
- 专项 `tests/original_pirate_powder_horn_source_mapping_candidate.test.cjs`：
  `1/1 PASS`；迁移工具和 workbook→CSV→JSON 重跑通过。
