# Run C 跨物品同事件优先级来源映射

task_id: 2026-09-05_original_pirate_run_c_listener_mapping_candidate
status: READY_TO_MERGE
owner: root
worktree: /private/tmp/original-pirate-priority.rMm6UL/ysbzs
Goal: 锁定代表 Run C 中 Cannonade 与 Grapeshot 对同一次其他弹药武器使用事件的 Medium→Lowest 调度输入，不引入空弹冷却策略。

## 边界

- 只生成隔离候选 workbook/CSV/JSON/provenance 与专项测试。
- 不修改正式 master、content/display 或 runtime schema。
- 当前只锁两个 listener；完整 emitter、完整三物品自然链与六局验收另行接入。

## 交付证据

- 锁定 DB SHA `7d8df658...46ee9`，逐字段验证 Cannonade UUID
  `c264f900...fb2a` Ability `1` 与 Grapeshot UUID `e6a183ce...3de2`
  Ability `1` 的身份、品质继承、完整 Trigger、Action、Priority 和空前置条件。
- Diamond Cannonade：`Medium`，其他己方 Weapon 或隐藏 Burn 物品使用时，
  自身充能 `2000ms`；Diamond Grapeshot：`Lowest`，其他己方
  `AmmoMax>0` 物品使用时，自身装填 `1`。
- 两个 listener 均可由同一次具备 Weapon 且 AmmoMax>0 的 USE 命中；组合
  mapping SHA 为 `c8555673ba5a7cd1f24f94ac3ad7e0e8c7814d58608a6ef1b5393216bcc31e6e`。
- 新专项与 Rifle、Powder Horn 来源专项合跑 `3/3 PASS`；workbook→CSV→JSON
  确定性生成通过，正式数据未改动。
- 两件来自代表 Run C，但测试 emitter 不属于该 Run；本候选不声明自然 Run
  重现或精确 Top 3 身份。
