task_id: 2026-08-28_bazaar_day1_route_source
status: DONE
owner: codex-root-20260828-bazaar-route

Goal: 恢复 `ROUTE` 策划域对 24/25/26 路线程序表的可重建真相链，并仅将 Day 1 `node_event_free_roll` 与 `node_rest_gold` 开放为正式节点，供 Godot 首批外循环事件/休整切片使用。

related_files:
- `xlsx/ysbzs_master.xlsx`
- `data/csv/24_node_schedule.csv`
- `data/csv/25_node_pool.csv`
- `data/csv/26_encounter_pool.csv`
- `tests/csv_source.test.cjs`
- `tests/run_all_tests.cjs`
- `tests/unit/route_node_pool_status.test.cjs`
- `tasks/done/2026-08-28_bazaar_day1_route_source.md`
- `tasks/index.md`

write_scopes:
- file: `xlsx/ysbzs_master.xlsx`; scope: 新增 `ROUTE` 域页，收录 24/25/26 三个 `#csv` 分区；mode: direct
- file: `data/csv/25_node_pool.csv`; scope: 仅 `node_event_free_roll` 与 `node_rest_gold` 的 `status` 字段，由 exporter 生成；mode: direct
- file: `data/csv/24_node_schedule.csv`; scope: exporter 无损再生；mode: direct
- file: `data/csv/26_encounter_pool.csv`; scope: exporter 无损再生；mode: direct
- file: `tests/csv_source.test.cjs`; scope: CSV08B 可见域表名单与 `ROUTE` 分区合同；mode: direct
- file: `tests/run_all_tests.cjs`; scope: Day 1 正式即时节点名单与玩家指令结算合同；mode: direct
- file: `tests/unit/route_node_pool_status.test.cjs`; scope: Day 1 即时节点生成、Day 2-10 禁用边界；mode: direct
- file: `tasks/done/2026-08-28_bazaar_day1_route_source.md`; scope: 本任务状态与验证证据；mode: direct
- file: `tasks/index.md`; scope: DONE 索引条目；mode: direct

exclusive_files:
- `xlsx/ysbzs_master.xlsx`

shared_file_policy: `2026-07-03_godot-singleplayer-remake` 仅把 24/25/26 CSV 声明为只读输入，本任务是路线数据源的唯一写入者；不改其任务卡或 Godot 目录。

validation:
- `npm run data:export`
- `npm run data:export:check`
- 核对 24/26 CSV 字节级无漂移，25 CSV 仅两处状态变化
- artifact-tool 渲染 `ROUTE` 页并扫描公式错误

validation_results:
- PASS `npm run data:export`
- PASS `npm run data:export:check`
- PASS `npm run check:csv`（18/18 CSV tests + normalized data validation）
- PASS `node tests/run_all_tests.cjs`（68/68）
- PASS `node --test tests/unit/route_node_pool_status.test.cjs`（2/2）
- PASS 24/26 CSV 无漂移；25 CSV 仅两个 Day 1 节点状态变化
- PASS artifact-tool 整本 15 页缩略巡检、`ROUTE` 目标页放大检查、公式错误 0 项
- evidence: `outputs/2026-08-28-bazaar-day1-route-source/all-sheets-contact.png`, `route-day1-after.png`, `verification.json`

commit_plan: `data(route): open first day event and rest nodes`
