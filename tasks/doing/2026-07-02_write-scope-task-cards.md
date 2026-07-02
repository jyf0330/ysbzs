# 2026-07-02_write-scope-task-cards

task_id: 2026-07-02_write-scope-task-cards
type: workflow rules / multi-agent task system
status: READY_TO_MERGE
owner: Codex
worktree: shared-worktree

## Goal

把任务卡从“同一个文件只能一个 AI 改”优化为“高风险文件独占 + 普通同文件按 `write_scopes` 并行”，让多个 AI 可以在同一文件的不同函数、选择器、测试块或文档段落内并行工作，同时保留 Lead 集成、真实验收和精确提交。

## Scope

- 更新项目任务规则，新增 `write_scopes` / `shared_file_policy` / `merge_owner` 口径。
- `related_files` 重叠不再默认触发 `FILE_CONFLICT_STOP`；只有 `exclusive_files`、`write_scopes` 重叠、同一语义接口冲突或 dirty/staged 边界不清时才停。
- 保留高风险共享文件独占、UI 可见验收、`web/js/local-engine.js` 刷新、Lead 最终提交等硬门禁。
- 不修改任何游戏实现、测试实现或数据文件。
- 不更新 `tasks/index.md`，因为旧 replay 任务仍把它列为独占收口文件；本任务等 `git-c` 或 Lead 后续统一维护索引。

## related_files

- `AGENTS.md`
- `docs/02_CURRENT_WORKFLOW.md`
- `tasks/README.md`
- `tasks/doing/2026-07-02_write-scope-task-cards.md`

## write_scopes

- file: `AGENTS.md`
  scope: 任务系统 / 核心纪律中的多 AI 同文件规则描述
  mode: direct
- file: `docs/02_CURRENT_WORKFLOW.md`
  scope: Multi-AI Collaboration / 并行任务模型 / 冲突处理 / git-c 归属规则
  mode: direct
- file: `tasks/README.md`
  scope: 任务卡字段、开工门禁、FILE_CONFLICT_STOP、并行协作规则、git-c 分类
  mode: direct
- file: `tasks/doing/2026-07-02_write-scope-task-cards.md`
  scope: 本任务卡全文
  mode: direct

## shared_file_policy

- This workflow migration intentionally updates files that older task cards may list as read-only references or stale workflow exclusives.
- No game implementation file is modified.
- `tasks/index.md` is not touched because it is still a shared closeout surface.

## exclusive_files

- `AGENTS.md`
- `docs/02_CURRENT_WORKFLOW.md`
- `tasks/README.md`

## read_files

- `docs/00_AI_START_HERE.md`
- `tasks/index.md`
- `tasks/doing/*.md`
- `tasks/paused/*.md`
- `/Users/ywh/ai-shared-config/skills/task-occupancy/SKILL.md`

## validation

- pass: `rg -n "write_scopes|shared_file_policy|merge_owner|同一语义接口|同文件" AGENTS.md docs/02_CURRENT_WORKFLOW.md tasks/README.md tasks/doing/2026-07-02_write-scope-task-cards.md`
- pass: `git diff --check -- AGENTS.md docs/02_CURRENT_WORKFLOW.md tasks/README.md tasks/doing/2026-07-02_write-scope-task-cards.md`
- pass: synced `task-occupancy` skill source to `/Users/ywh/.codex/skills/task-occupancy/SKILL.md` and `/Users/ywh/.agents/skills/task-occupancy/SKILL.md`; the old single-active-slot rule is removed from installed copies.
- note: `AGENTS.md` also contains a separate concurrent/local hunk about `web/js/local-engine.js` bundle refresh policy; do not include that hunk in this workflow-scope commit unless Lead explicitly groups it with the older 4173 bundle-rule task.

## commit_plan

- message: `workflow: allow scoped same-file ai tasks`
- auto_commit: allowed if only this workflow task's files are staged and validation passes; full test suite not required for workflow-only documentation.

## collaboration

- lead_scope: Project workflow rule migration only.
- specialist_input: 无
- tester_pass: 不适用，纯 workflow 文档变更，无 UI/棋盘/浏览器可见行为改动。
- external_ai_input: 无
- lead_decision: Move conflict detection from coarse file overlap to `exclusive_files` plus `write_scopes`, while keeping Lead-owned merge/commit and high-risk semantic interface locks.
