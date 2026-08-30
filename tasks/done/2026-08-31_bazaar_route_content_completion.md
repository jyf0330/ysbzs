# 完整事件、休整与真实遭遇数据

task_id: 2026-08-31_bazaar_route_content_completion
status: DONE
owner: codex-root-20260831
branch: shared-worktree

## Goal

把十天正式路线扩展为完整事件/休整生态，并让 20 个战斗锚点全部提供三张真实不同的遭遇；工作簿继续是正式策划真相源。

## related_files

- `xlsx/ysbzs_master.xlsx`
- `data/csv/03_monster_waves.csv`
- `data/csv/24_node_schedule.csv`
- `data/csv/25_node_pool.csv`
- `data/csv/26_encounter_pool.csv`
- `tests/run_all_tests.cjs`
- `tests/ui_adapter.test.cjs`
- `tests/unit/autoplay_live_report.test.cjs`
- `tests/unit/daily_flow_battle_first_route.test.cjs`
- `tests/unit/normal_game_three_scenes.test.cjs`
- `tests/unit/route_node_pool_status.test.cjs`
- `tests/unit/runtime_data_report.test.cjs`
- `tests/unit/seed_episode_preview.test.cjs`
- `tasks/done/2026-08-31_bazaar_route_content_completion.md`
- `tasks/index.md`

## write_scopes

- `WAVES` / `03_monster_waves.csv`: 新增完整 Run 遭遇所需的正式波次与机制压力。
- `ROUTE` / `24_node_schedule.csv`: 60 步日程中的 20 个战斗锚点统一改为 `battle_choice`。
- `ROUTE` / `25_node_pool.csv`: 开放 16 个事件和 10 个休整并配置确定性候选池。
- `ROUTE` / `26_encounter_pool.csv`: 为 20 个锚点各定义 3 个两两不同的敌阵/风险/奖励候选。
- `tests/**`: 只迁移被完整事件生态、20 个 `battle_choice` 和 194 套波次改变的正式行为基线。
- `tasks/index.md`: 仅新增本任务索引与刷新时间。

## shared_file_policy

- 旧 Godot 和 seed 预览任务只读这些 CSV；本任务是正式策划数据的唯一写入者。
- `2026-08-13` 与 `2026-08-25` 三张任务卡状态均为 `DONE`，其 workbook/CSV 独占租约已释放；本任务保留其已提交数值结果。
- 工作区既有 `outputs/**` 未跟踪证据不属于本任务，不暂存、不删除。

## exclusive_files

- `xlsx/ysbzs_master.xlsx`
- `data/csv/03_monster_waves.csv`
- `data/csv/24_node_schedule.csv`
- `data/csv/25_node_pool.csv`
- `data/csv/26_encounter_pool.csv`

## validation

- PASS：`npm run check:csv`（19/19）。
- PASS：工作簿与四张 CSV 差异通过 `git diff --check`。
- PASS：`tests/run_all_tests.cjs`（68/68）；路线 focused unit（33/33）与 UI（5/5）。
- 已知非本切片门禁：完整 `npm test` 仍被宠物数量、来源商店元素映射、机制/品质与形状旧基线阻断；本提交没有把这些无关漂移改成新真相。
- 跨仓 Godot exporter、注册表、事件行为、生产调用者、固定战入口和完整日程专项均通过；可见实窗证据由 Godot 项目集中验收，不在本数据提交中伪造。

## commit_plan

- message: `data(route): complete event and encounter catalogs`
- auto_commit: 精确暂存上述策划真相、路线测试基线、任务卡和索引；不纳入既有 `outputs/**`。

## collaboration

- lead_scope: 上游 workbook/CSV 真相链、冲突审计、验证与提交。
- specialist_input: `route_content_programmer` 完成数据扩展和跨仓 focused 验证。
- tester_pass: 非浏览器 UI 改动；跨仓 Godot 实窗集中门禁另行执行。
- lead_decision: 事件生态与完整遭遇目录共享同一 ROUTE/WAVES 原子迁移，拆开会产生半生成状态，因此同一提交交付。
