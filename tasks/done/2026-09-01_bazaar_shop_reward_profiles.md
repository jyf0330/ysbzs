# 大巴扎 56 商店事件本地奖励映射

task_id: 2026-09-01_bazaar_shop_reward_profiles
status: DONE
owner: codex-root-20260901-shop-reward-profiles
branch: codex/bazaar-day1-day3-route

## Goal

为 Vanessa 冻结基线中的 `56 = 41 merchant + 15 trainer` 个可遇商店事件逐条建立稳定本地奖励档案；保持事件数量与身份不变，商品与效果按 Godot 项目当前宠物、训练、A/B 成长、英雄成长和经济服务转译。

## related_files

- `xlsx/ysbzs_master.xlsx`
- `data/csv/35_bazaar_shop_mapping.csv`
- `tasks/done/2026-09-01_bazaar_shop_reward_profiles.md`
- `tasks/index.md`

## write_scopes

- `SHOP_MAPPING`: 只新增 5 个奖励档案列并填写既有 56 行；不改变摊位数量、身份、日程、地点、商品模式或既有来源关系
- `35_bazaar_shop_mapping.csv`: 只接收 `SHOP_MAPPING` 同 5 列导出结果
- 任务文档：记录本轮数据真相链、跨仓消费和验证证据

## exclusive_files

- `xlsx/ysbzs_master.xlsx`
- `data/csv/35_bazaar_shop_mapping.csv`

## shared_file_policy

现有引用总表的任务卡均已标记 `DONE`，其 write scope 位于 PETS、MECHANISMS 或其他 CSV；本轮只写 `SHOP_MAPPING` 新列。开工时两项正式文件均干净，仓库既有 `outputs/**` 未跟踪产物不纳入本任务。

## validation

- workbook `SHOP_MAPPING` 与 CSV 逐单元一致：56 行、25 列、56 个唯一 `reward_profile_id`
- Godot 重新导出 `data/content/generated/006_economy.json`
- Godot `smoke_bazaar_shop_reward_profiles.gd`：56 个事件全部可进入、候选合法、奖励来源可追踪，缺档案和档案外商品 fail-closed
- Godot 商店目录、规则、外层节点、命令边界与路线推进专项
- 两仓 `git diff --check`

## validation_result

- `SHOP_MAPPING_XLSX_CSV_OK rows=56 columns=25 profiles=56`。
- Godot 商店专项 6/6 通过，包含 56 条逐事件运行时覆盖。
- Godot fast 19/23 通过；4 项失败均位于开工前已有的宠物重生/战斗/存档 WIP：组合服务仍期待 `pet_reset_policy`、双人重置测试访问已删除字段并超时、可玩流程末战不结束、Seed Bot 读档/hash 不一致。本任务商店专项未出现失败。
- 全量 `tools/export_master_to_csv.py` 被既有 `pal_001` 缺少 `action` 基础字段阻断；本轮使用同一导出器的 `SHOP_MAPPING` 单表读取/写出函数完成目标 CSV，逐单元复核通过，未改写其他 CSV。

## collaboration

- lead_scope: 上游工作簿/CSV、Godot 导出消费、权威候选过滤、专项与 Spec 同步
- specialist_input: 无
- tester_pass: 纯数据与规则切片，无新增 UI；Godot 正式入口实窗证据仍按 Target Spec 保留为后续集中验收
- external_ai_input: 无
- lead_decision: 宠物商人继续以真实来源关系为候选真相；19 个服务摊位使用显式本地商品集合，缺档案或越权商品一律 fail-closed

## commit_plan

- 上游提交：`data(shop): map 56 local reward profiles`
- Godot 提交：`feat(shop): enforce 56 local reward profiles`
- 两仓均只精确暂存本任务文件；不纳入其他 WIP 或 `outputs/**`
