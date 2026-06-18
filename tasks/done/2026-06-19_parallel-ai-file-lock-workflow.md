# 2026-06-19_parallel-ai-file-lock-workflow

task_id: 2026-06-19_parallel-ai-file-lock-workflow
type: workflow rules / multi-agent task system
status: DONE
owner: Codex
worktree: shared-worktree

## Goal

把当前任务门禁从“全局单 ACTIVE 槽”优化为“多个 ACTIVE 任务 + 文件级写入租约”，方便多个 AI 在不争抢同一文件的前提下并行实现、测试和收口。

## Scope

- 保留 `FILE_CONFLICT_STOP`、真实浏览器可见验收、精确暂存、Lead 最终集成等硬门禁。
- 允许 `tasks/doing/` 中存在多个 ACTIVE 任务卡。
- 冲突判断从“已有任何 ACTIVE”改为“`related_files` / `exclusive_files` / 未归属 dirty 文件重叠”。
- 明确任务状态、任务卡字段、并行协作角色、`git-c` 分组收口规则。
- 不修改游戏核心代码、UI 文件或当前战斗预览 ACTIVE 任务实现。

## related_files

- `docs/02_CURRENT_WORKFLOW.md`
- `tasks/README.md`
- `AGENTS.md`
- `tasks/doing/2026-06-19_parallel-ai-file-lock-workflow.md`

## exclusive_files

- `docs/02_CURRENT_WORKFLOW.md`
- `tasks/README.md`
- `AGENTS.md`

## read_files

- `docs/00_AI_START_HERE.md`
- `tasks/index.md`
- `tasks/doing/2026-06-19_battle-resolution-preview.md`
- `tasks/paused/2026-06-19_rename-turn-buttons.md`

## validation

- `rg -n "ACTIVE_IMPL|READY_TO_MERGE|exclusive_files|文件级|FILE_CONFLICT_STOP|git-c 集成细则" AGENTS.md docs/02_CURRENT_WORKFLOW.md tasks/README.md tasks/doing/2026-06-19_parallel-ai-file-lock-workflow.md`
- `git diff -- AGENTS.md docs/02_CURRENT_WORKFLOW.md tasks/README.md tasks/doing/2026-06-19_parallel-ai-file-lock-workflow.md`

## commit_plan

message: `workflow: allow file-level parallel ai tasks`

## collaboration

lead_scope: 更新工作流规则为文件级并行租约，并保持当前战斗预览任务文件边界。
specialist_input: 无
tester_pass: 不适用，纯工作流文档变更，无 UI 可见改动。
external_ai_input: 无
lead_decision: 不修改当前战斗预览 ACTIVE 任务占用的 `tasks/index.md` / `docs/10_CHANGELOG.md`，避免混入无关 dirty 文件。

## evidence

- `rg -n "ACTIVE_IMPL|READY_TO_MERGE|exclusive_files|文件级|FILE_CONFLICT_STOP|git-c 集成细则" AGENTS.md docs/02_CURRENT_WORKFLOW.md tasks/README.md tasks/doing/2026-06-19_parallel-ai-file-lock-workflow.md` passed and found the new file-level lease terms in all intended rule files.
- `rg -n "最多 1 个|当前 ACTIVE 任务（最多|ACTIVE 任务，最多|已有其他 ACTIVE 任务|ACTIVE task owns the slot|owns the slot" AGENTS.md docs/02_CURRENT_WORKFLOW.md tasks/README.md tasks/doing/2026-06-19_parallel-ai-file-lock-workflow.md` found no stale effective rule text; only positive new-rule statements and this task's description of the replaced old model remain.
- `git diff -- AGENTS.md docs/02_CURRENT_WORKFLOW.md tasks/README.md tasks/doing/2026-06-19_parallel-ai-file-lock-workflow.md` reviewed; changes are limited to workflow docs and this task card.
- `git status --short --untracked-files=all` shows unrelated ACTIVE battle-preview dirty files remain; this workflow task did not modify them.
- Closeout verification: 2026-06-19 Lead reran `node tools/build_local_engine_bundle.cjs && npm run check:all && npm run test:coverage && node --test tests/browser_detail_selection.test.cjs && git diff --check`; command exited 0.

## commit_status

- blocked: cannot auto-commit because the shared worktree has unrelated dirty files from `2026-06-19_battle-resolution-preview`, including `docs/10_CHANGELOG.md`, `tasks/index.md`, core/UI files, and its task card.
