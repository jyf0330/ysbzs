# 2026-07-29_journey-shop-min-six

task_id: 2026-07-29_journey-shop-min-six
status: DONE
owner: Codex / root
type: planner-data
branch: codex/bazaar-day1-day3-route

## Goal

把用户在 `godot-latest/ysbzs_master_西游宠物短名.xlsx` 中明确修改的西游宠物短名与西游商店合并回正式策划总表，并保证每个正式商店至少有 6 个不同宠物候选。

## related_files

- `xlsx/ysbzs_master.xlsx`
- `data/csv/01_pets.csv`
- `data/csv/02_monster_templates.csv`
- `data/csv/06_shop_rewards.csv`
- `data/csv/08_action_shapes.csv`
- `data/csv/30_shop_stores.csv`
- `tasks/doing/2026-07-29_journey-shop-min-six.md`
- `tasks/index.md`
- `/Users/ywh/Documents/godot-latest/data/ysbzs_singleplayer_data.json`

## write_scopes

- `xlsx/ysbzs_master.xlsx`: 仅合并用户副本的 `README` 西游元素释义、`PETS.name` 短名、`SHOP_STORES` 西游商店行，并更新 `PETS.shop_store_ids` 使所有正式商店候选数不低于 6；保留正式总表现有其余字段、格式和新增敌方移动/攻击列。
- `data/csv/01_pets.csv`: 由正式总表导出的宠物短名与商店池相关行。
- `data/csv/02_monster_templates.csv`: 由正式总表同步引用的西游宠物短名。
- `data/csv/06_shop_rewards.csv`: 由正式总表导出的宠物短名与商店池相关行。
- `data/csv/08_action_shapes.csv`: 由正式总表同步引用的西游宠物短名。
- `data/csv/30_shop_stores.csv`: 由正式总表导出的西游商店定义。
- `tasks/doing/2026-07-29_journey-shop-min-six.md`: 当前任务记录。
- `tasks/index.md`: 当前任务索引与完成归档条目。
- `/Users/ywh/Documents/godot-latest/data/ysbzs_singleplayer_data.json`: 由上述 CSV 重新生成的 Godot 下游快照。

## exclusive_files

- `xlsx/ysbzs_master.xlsx`
- `data/csv/01_pets.csv`
- `data/csv/02_monster_templates.csv`
- `data/csv/06_shop_rewards.csv`
- `data/csv/08_action_shapes.csv`
- `data/csv/30_shop_stores.csv`

## shared_file_policy

- 用户副本只作为只读变更来源，不整本覆盖正式总表；忽略副本中意外写入的 `708` 与缺失列。
- Godot JSON 只通过正式总表导出链重建，不单独手改。
- 当前其他任务仅把相关 CSV 作为只读输入，没有同一写入 scope。

## validation

- pass: 工作簿合并保留正式总表 15 列 `PETS` 结构与 `enemy_move_range` / `enemy_attack_count`，只合并 126 个变化的西游短名、README 西游元素释义、79 个商店及商店池。
- pass: 工作簿公式错误扫描 0；7 张工作表全部渲染，`PETS` / `SHOP_STORES` 已人工复核，商店名列加宽后无明显裁切。
- pass: 商店候选审计为 `stores=79 pets=127 minimumCandidates=6 maximumCandidates=127 exactlySix=50 belowSix=[]`。
- pass: `npm run data:export` 导出 32 张程序 CSV。
- pass: `npm run check:csv` 14/14，normalized `shopStores=79`，跨表引用全部有效。
- pass: `/Users/ywh/Downloads/Godot.app/Contents/MacOS/Godot --headless --path /Users/ywh/Documents/godot-latest --script res://tests/core/smoke_bazaar_day1_shop_categories.gd` 输出 `SMOKE_BAZAAR_DAY1_SHOP_CATEGORIES_OK`。
- pass: `python3 /Users/ywh/Documents/godot-latest/tools/export_ysbzs_singleplayer_data.py`；Godot 快照 `shop_stores=81`，其中正式总表 79 个宠物商店全部至少 6 宠，额外 `day1_growth` / `day1_skill` 是非宠物商品专店。
- baseline note: `npm run check:all` 通过 67/67 主测试及 174/175 Node 子测试，唯一失败是 `manual_flow_preview_lethal_diff.test.cjs` 的既有 `6 !== 0`；已在干净 `HEAD 67e3d9e` 临时 worktree 单独复现相同失败，非本次数据变更引入。
- unrelated smoke note: `smoke_multi_element_catalog.gd` 仍把 9 个非宠物商品计入 127 宠总数，并调用已移除的 `_element_summary`；本任务未修改该测试或 UI 控制器。

## collaboration

- lead_scope: 合并用户明确的短名/商店改动，补足 6 宠下限并跑完整导出链。
- specialist_input: 无。
- tester_pass: 非 UI 改动；工作簿 7 表渲染和 Godot headless 商店专项 smoke 已完成。
- external_ai_input: 无。
- lead_decision: 不整本覆盖用户副本；副本中的 `708` 污染和缺失新列不进入正式总表。

## commit_plan

- ysbzs: `data: add Journey shops with six-pet minimum`
- godot-latest: `data: refresh Journey shop snapshot`
