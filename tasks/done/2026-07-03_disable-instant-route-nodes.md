# 2026-07-03_disable-instant-route-nodes

task_id: 2026-07-03_disable-instant-route-nodes
status: DONE
owner: Codex
branch: shared-worktree

Goal:
- 三选一先禁用“不需要进入/退出界面”的即时结算节点，只保留需要进入/退出闭环的商店/奖励类节点。

related_files:
- `data/csv/25_node_pool.csv`
- `tests/unit/route_node_pool_status.test.cjs`
- `tests/unit/seeded_route_options.test.cjs`
- `tests/run_all_tests.cjs`
- `web/js/local-engine.js`
- `tasks/done/2026-07-03_disable-instant-route-nodes.md`

write_scopes:
- file: `data/csv/25_node_pool.csv`
  scope: node_pool rows with `node_type=rest` and immediate `event` rows status only
  mode: direct
- file: `tests/unit/route_node_pool_status.test.cjs`
  scope: new test file for active route node type/status contract
  mode: direct
- file: `tests/unit/seeded_route_options.test.cjs`
  scope: node sampling contract fixture decoupled from the now-smaller active route node pool
  mode: direct
- file: `tests/run_all_tests.cjs`
  scope: route event tests decoupled from disabled official node pool via explicit test fixtures
  mode: direct
- file: `web/js/local-engine.js`
  scope: generated local browser bundle refreshed from current worktree snapshot
  mode: direct
- file: `tasks/done/2026-07-03_disable-instant-route-nodes.md`
  scope: this task card
  mode: direct

exclusive_files:
- 无

shared_file_policy:
- Existing tasks may read route CSV data, but no active dirty diff currently modifies `data/csv/25_node_pool.csv`.
- This pass does not touch shared core route functions or seed preview outputs.
- `web/js/local-engine.js` is refreshed because browser-visible data changed; it may include the current shared worktree source snapshot per project bundle rules.

validation:
- pass: `node --test tests/unit/route_node_pool_status.test.cjs`
- pass: `node --test tests/unit/normal_game_three_scenes.test.cjs`
- pass: `node --test tests/unit/daily_flow_battle_first_route.test.cjs`
- pass: `node --test tests/unit/route_node_pool_status.test.cjs tests/unit/seeded_route_options.test.cjs tests/unit/daily_flow_battle_first_route.test.cjs`
- pass: `node tests/run_all_tests.cjs` (67/67)
- pass: `node tools/build_local_engine_bundle.cjs`
- pass: `node tools/build_local_engine_bundle.cjs && node --check web/js/local-engine.js`
- pass: `node --test tests/unit/seed_episode_preview.test.cjs`
- pass: `git diff --check -- data/csv/25_node_pool.csv tests/unit/route_node_pool_status.test.cjs web/js/local-engine.js tasks/doing/2026-07-03_disable-instant-route-nodes.md`
- pass: 4173 normal-game browser pass at `http://127.0.0.1:4173/normal-game.html?seed=disable-instant-route-nodes-4173`; visible first node choices were `宠物奖励` / `夜市商人` / `火系补货商人`, with ViewModel node types `reward/shop/shop`; clicked the first official choice card and entered `reward` with 3 rewards; console/page errors = 0.
- screenshot reviewed by Lead: `/Users/ywh/Documents/ysbzs/output/playwright/disable-instant-route-nodes-normal-game-2026-07-02T19-13-54-293Z.png`; route cards are readable and no obvious overlap or missing state was visible.
- pass: 4173 real browser recheck at `http://127.0.0.1:4173/normal-game.html?seed=disable-instant-route-live`; clicked `菜单`, filled seed, clicked `重开本局`; visible route choices were `夜市商人`, `火系补货商人`, `宠物奖励`; node types were `shop`, `shop`, `reward`; console/page errors=0.
- screenshot: `/Users/ywh/Documents/ysbzs/output/playwright/disable-instant-route-nodes-1783019672281.png`
- not run: full `npm run check:all`; shared worktree already has many unrelated dirty task groups and known CSV08 workbook blockers in existing task cards.

commit_plan:
- message: `data: disable instant route nodes`
- auto_commit: no; shared worktree has many unrelated dirty task groups, leave staging/commit to git-c/Lead.
