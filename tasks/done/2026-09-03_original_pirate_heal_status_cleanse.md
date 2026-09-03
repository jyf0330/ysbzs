# Original Pirate 项目原创治疗清除状态 v1 数据合同

task_id: 2026-09-03_original_pirate_heal_status_cleanse
status: COMPLETED
owner: remaining_rules_gap_audit（data）
branch: codex/original-pirate-content
target_ids: BZ-OP-HEAL-STATUS-CLEANSE-01

## Goal

在 `ysbzs_master.xlsx -> CSV -> exporter -> generated` 单一真相链中加入治疗清除 Burn/Poison 的项目原创 v1 规则，并为正式 Day 1 Ghost 增加可自然产生两种状态的既有原创物品组合。

## Result

- 数据版本已迁移为 source content 25/source runtime 23、content 27/runtime bundle 25/catalog 17/rules v23，source/bundle/content revision 统一为 v24；旧 v26/v24 与旧 rules/Poison 合同继续 fail closed。
- 新增唯一 `battleRules.healStatusCleanseRules`，exact 字段为 `contractId/triggerPolicy/healBasis/cleanseScaleBps/roundingMode/statusTargets/statusResolutionPolicy/poisonSchedulePolicy/traceEmitPolicy/critPolicy/rngPolicy`，值与 Godot 任务卡 Frozen contract 一致。
- Poison 升级为 `ysbzs.original-pirate-poison.v2`，并以 `healCleansePolicy=delegated_to_heal_status_cleanse_rules` 显式委托；未在 Poison 内保留第二套清除语义。
- Day 1 正式 Ghost 仅含白银 `item_emberwake_lantern`（`ghost_d01_emberwake`，slot 2）与青铜 `item_inkwake_doser`（`ghost_d01_inkwake`，slot 3），移除旧 `item_patchwork_ram`。白银档使正式 Session 能自然存活至第 16 tick，同时观察 Burn/Poison 清除；canonical build hash 为 `5114a444e1b3bde715358ae39d203c8fce7cc111c822cf2bbda55a4e075803d5`。
- 内容目录数量保持 22 items / 82 profiles / 144 effects / 22 item skills / 60 upgrades / 148 enchant profiles / 33 shop templates / 10 ghost snapshots / 121 display entries。
- runtime bundle hash：`446b94ec453e724535cfc333bf63dd484fdb43819c35cd23658f179bc5138af5`。
- 隔离生成物：`output/original_pirate_heal_status_cleanse/content.json`（SHA-256 `fed89600a1ec55ceb8baa88e5fdfd0cd9cda33ddb325e501b080ed95c584de49`）与 `output/original_pirate_heal_status_cleanse/display.json`（SHA-256 `a73c8228c37c12c09b41f6614cf977b3a4eec049300542e7dfee7b35c1a7fb2a`）。

## Validation

- TDD RED：正式数据仍为 v26/v24、Poison v1 且缺 Heal/Cleanse 规则与新 Ghost 时，25 项中 13 项按预期失败。
- bundled Python `tools/export_master_to_csv.py --check --original-pirate-only`：PASS，workbook 可逐字重建 22 个 BZ CSV 域。
- bundled Python `tools/export_original_pirate_content.py --check`：PASS，22 items / 33 shop templates / 10 battle templates / 10 ghost encounters / 10 ghost snapshots / 121 display entries。
- bundled Node `--test tests/original_pirate_content_export.test.cjs tests/original_pirate_csv_subset.test.cjs`：25/25 PASS，0 failed。
- 第二次隔离生成与上述 runtime/display 文件逐字一致，SHA-256 相同。
- `git diff --check`：PASS。

## Delivery Boundary

- 本切片不新增玩家内容，只调整项目原创规则合同与正式 Ghost 构筑；未复制参考作品专有名称、效果原文、图像或精确未冻结数值。
- 外部 Vanessa Item/Skill 正式可执行映射仍为 `0/138 + 0/138`。
- 数据合同首个原子提交已推送；随后依据 Godot 正式 Session 失败证据，把 Day 1 火焰物从黄金校准为白银并重新生成 hash。数据侧仍不修改 Godot，运行时与实窗验收由 Godot 侧任务承担。
