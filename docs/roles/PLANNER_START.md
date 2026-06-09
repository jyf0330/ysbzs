# PLANNER_START

当前数据口径是 127 宠 + 134 行波次随机池规则。不要按旧 30 宠 / 12 波次口径验收。

日常策划改数据优先改 `xlsx/ysbzs_master.xlsx`，再运行 `npm run data:export` 生成 `data/csv/*.csv`；需要完整策划好读版时运行 `npm run data:workbook` 刷新 `xlsx/ysbzs_v1_linked_data_tables.xlsx`。程序仍从 CSV 重建 normalized data。新机制要能进入结构化事件、战报和回放。
