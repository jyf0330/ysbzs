# Original Pirate 项目原创 Burn v1 数据合同

task_id: 2026-09-03_original_pirate_burn
status: COMPLETED
owner: remaining_rules_gap_audit（data）+ codex-root（merge）
branch: codex/original-pirate-content
target_ids: BZ-OP-BURN-01

## Goal

在 `ysbzs_master.xlsx -> CSV -> exporter -> generated` 单一真相链中加入项目原创 Burn v1：玩法级 `burnRules` 唯一声明脉冲、衰减、盾与终局顺序；item effect 只声明正整数 `stacks`。新增一件原创、初始商店自然可达的纯 Burn 物品，不复制参考作品专有内容或未验证数值。

## Frozen contract

- contract: `ysbzs.original-pirate-burn.v1`
- `pulseIntervalTicks=1`
- `firstPulsePolicy=next_tick`
- `pulsePhase=tick_start_before_item_progress`
- `damagePerStack=1`
- `decayStacksPerPulse=1`
- `shieldPolicy=shield_first_consuming`
- `resolutionOrder=simultaneous_sides_then_terminal`
- `maxStacks=1000000`
- `stackOverflowPolicy=reject_advance`
- effect: `item_ready + [always] -> selected_enemy -> apply_burn {stacks>0}`
- apply 当刻不造成伤害；Burn 不暴击、不消费 RNG；治疗不清除 Burn。

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
- `tools/export_master_to_csv.py`
- `tools/export_original_pirate_content.py`
- `tests/original_pirate_content_export.test.cjs`
- `tests/original_pirate_csv_subset.test.cjs`
- `tasks/index.md`
- 本任务卡

## write_scopes

- 数据版本：source 23/runtime 21；content 25/runtime bundle 23/catalog 16/rules v21；revision v22。
- `BZ_GAMEPLAY` 增加 exact Burn rules 列，导出为 `runtimeBundle.battleRules.burnRules`。
- `BZ_ITEM_EFFECTS` 增加独立 `stacks` 列；禁止把层数复用为即时伤害 amount 或物品 status。
- 新增原创 `item_emberwake_lantern`“烬航灯”及四品质 profile/effect/skill、连续升级、仅 tailwind 铭刻和 Ghost/source 引用；青铜至钻石分别为冷却 `9/8/7/6`、施加 `3/5/8/12` 层、买卖 `3/1、5/2、8/4、12/6`。
- 初始商店保持恰好 3 项，以烬航灯替换 initial signal flare；测试从内容身份取动态 offer，不冻结视觉槽位。
- strict/fail-closed 覆盖 Burn rules、operation/target/trigger/params、层数类型/范围、版本/revision/计数/hash。

## exclusive_files

- 上述 xlsx、CSV、两个 exporter、两个数据测试、本数据任务卡和 `tasks/index.md`

## shared_file_policy

数据 worktree 基线为已推送且 clean 的 `b3d3eeefbe307e590f2d1922221d80fe007fb394`。data agent 独占本卡列出的数据文件；Godot agent 不写本仓。完成后由 codex-root 全量审查、验证、精确暂存、提交与推送。

## validation

- workbook -> CSV `--check`
- original pirate exporter `--check`
- Node full/subset 与全量 CSV 门禁
- deterministic generation/hash、`git diff --check`

## commit_plan

- `data(content): add original pirate burn`

## Result

- TDD：先加入 v25/v23、`burnRules`、独立 `stacks`、烬航灯与 source/package forged 向量，旧 v24/v22 exporter 如期 RED；随后只沿 `ysbzs_master.xlsx -> CSV -> exporter -> generated` 单向真相链完成实现。
- 数据合同：源 `content v23/runtime v21`，可执行 `content v25/runtime v23/catalog v16/rules v21`；source/content/bundle/snapshot revision 统一升为 v22，Ghost `opponent_content_revision` 同步。`burnRules` 精确冻结本卡十字段，`apply_burn` 仅接受 `item_ready + [always] -> selected_enemy` 与正整数 `stacks<=1000000`；即时伤害、Crit/RNG、其他参数、英雄技能或错误目标/触发均 fail closed。
- 正式内容：新增 `item_emberwake_lantern` / “烬航灯”与 `skill_emberwake_lantern` / “余烬追潮”；1 格 canonical tags `burn, relic, tool`，四品质买卖价 `3/1、5/2、8/4、12/6`、冷却 `9/8/7/6`、Burn 层数 `3/5/8/12`。初始商店以青铜烬航灯替换 signal flare，仍恰好 3 项，12 金新局购买后余 9 金；三段升级价 `4/7/10`，只开放四品质 tailwind 铭刻，并在 Day 1 Ghost 构筑中保留正式引用。
- 平衡边界：低品质以较长冷却限制叠层频率，升品同时缩短冷却并提高层数，形成明确的持续伤害成长；不赋予直接伤害、暴击、弹药或 breaker 数值通道，避免同一层数被第二套伤害倍率修改。
- 生成计数：21 items / 78 quality profiles / 140 effects / 21 item skills / 57 upgrades / 144 enchant profiles / 33 shop templates / 119 display entries。
- 隔离输出：`output/original_pirate_burn/content.json` SHA-256 `8a151ba6e1372862beba7e418a75b945b100c1a97d56808f45be86bf89ac8f00`；`output/original_pirate_burn/display.json` SHA-256 `3adf47bc05ffe5cb84702717c74dcbaae5211e5208426ed6103205ce5432e895`；canonical bundle hash `59d113acd7f2c0153674abfa84b8e32694dcefbf6a95cc513082e7e36a9b33e5`。
- 验证：workbook→CSV `--check` PASS；exporter `--check` PASS；original-pirate full/subset Node 门禁 `23/23` PASS；定向 CSV02F/CSV08B/CSV09 `3/3` PASS；hero-skill source `1/1` PASS；`check_csv_data.cjs` 与 `git diff --check` PASS。全量 legacy `csv_source.test.cjs` 另有既存 `pal_001` 缺 `action`；系统 Python 缺 `openpyxl` 的两项已用 bundled Python 复验通过，不影响本切片的 22 域真相链。
- 版权边界：名称、文案、标签和数值均为本项目原创；未复制 reference-only 缓存的专有名称、效果原文、美术或未冻结数值，Vanessa build-bound Item/Skill 正式映射仍为 `0/138 + 0/138`。
