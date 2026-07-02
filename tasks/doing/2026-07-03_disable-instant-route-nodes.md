# 2026-07-03_disable-instant-route-nodes

task_id: 2026-07-03_disable-instant-route-nodes
status: ACTIVE_IMPL
owner: Codex
branch: shared-worktree

Goal:
- 三选一先禁用“不需要进入/退出界面”的即时结算节点，只保留需要进入/退出闭环的商店/奖励类节点。

related_files:
- `data/csv/25_node_pool.csv`
- `tests/unit/route_node_pool_status.test.cjs`
- `tasks/doing/2026-07-03_disable-instant-route-nodes.md`

write_scopes:
- file: `data/csv/25_node_pool.csv`
  scope: node_pool rows with `node_type=rest` and immediate `event` rows status only
  mode: direct
- file: `tests/unit/route_node_pool_status.test.cjs`
  scope: new test file for active route node type/status contract
  mode: direct
- file: `tasks/doing/2026-07-03_disable-instant-route-nodes.md`
  scope: this task card
  mode: direct

exclusive_files:
- 无

shared_file_policy:
- Existing tasks may read route CSV data, but no active dirty diff currently modifies `data/csv/25_node_pool.csv`.
- This pass does not touch shared core route functions, seed preview outputs, or generated browser bundle.

validation:
- pending: `node --test tests/unit/route_node_pool_status.test.cjs`
- pending: focused adapter route smoke after data change

commit_plan:
- message: `data: disable instant route nodes`
- auto_commit: no; shared worktree has many unrelated dirty task groups, leave staging/commit to git-c/Lead.
