# 2026-06-21_superpowers-workflow-routing

task_id: 2026-06-21_superpowers-workflow-routing
type: workflow rules
status: DONE
owner: Codex
worktree: shared-worktree
branch: codex/bazaar-day1-day3-route
done_at: 2026-06-21

## Goal

更新 Superpowers / YWH skill 路由和项目任务说明，减少无关 skill 过早加载，修正任务总览里的旧单 ACTIVE 规则，并保持文件级租约、真实入口验收和精确提交边界。

## Scope

- 优化 `docs/02_CURRENT_WORKFLOW.md` 的 Skill Routing：明确 Superpowers 是主流程，YWH 是项目适配层，浏览器/UI 验收 skill 只在相关阶段加载。
- 同步 `tasks/index.md` 当前规则说明，去掉“ACTIVE 最多 1 个”的旧口径。
- 同步 `docs/10_CHANGELOG.md` 的工作流变更记录。
- 不修改游戏核心代码、UI 文件、数据表或素材。

## related_files

- `docs/02_CURRENT_WORKFLOW.md`
- `tasks/index.md`
- `docs/10_CHANGELOG.md`
- `tasks/done/2026-06-21_superpowers-workflow-routing.md`

## exclusive_files

- `docs/02_CURRENT_WORKFLOW.md`
- `tasks/index.md`
- `docs/10_CHANGELOG.md`

## read_files

- `AGENTS.md`
- `docs/00_AI_START_HERE.md`
- `docs/roles/PROGRAMMER_START.md`
- `tasks/README.md`
- `/Users/ywh/Desktop/AI-Memory-Pack/10-workflows.md`
- `/Users/ywh/.codex/skills/superpowers/skills/using-superpowers/SKILL.md`
- `/Users/ywh/.codex/skills/task-occupancy/SKILL.md`
- `/Users/ywh/.codex/skills/ywh/SKILL.md`
- `/Users/ywh/.codex/skills/ywh-game/SKILL.md`
- `/Users/ywh/.codex/skills/ywh-web-game/SKILL.md`
- `/Users/ywh/.codex/skills/superpowers/skills/verification-before-completion/SKILL.md`

## validation

- `rg -n "Superpowers|required now|deferred|ywh-web-game|多个 ACTIVE|文件级写入租约" docs/02_CURRENT_WORKFLOW.md tasks/index.md docs/10_CHANGELOG.md tasks/done/2026-06-21_superpowers-workflow-routing.md`
- `rg -n "ACTIVE 任务最多 1 个|当前 ACTIVE 任务（最多|已有任何 ACTIVE" tasks/index.md docs/02_CURRENT_WORKFLOW.md tasks/README.md`
- `git diff --check`

## commit_plan

message: `workflow: tune superpowers skill routing`

## collaboration

lead_scope: 更新项目工作流路由和任务总览规则说明。
specialist_input: 无
tester_pass: 不适用，纯工作流文档变更，无 UI 可见改动。
external_ai_input: 无
lead_decision: 只改工作流文档、任务索引和 changelog；保留当前未跟踪 Playwright/performance 产物为无关脏文件，不纳入本任务。

## evidence

- `rg -n "Superpowers|required now|deferred|ywh-web-game|多个 ACTIVE|文件级写入租约" ...` passed and found the new Superpowers / YWH routing policy, deferred browser evidence wording, changelog entry, and task index file-level lease wording.
- `rg -n "ACTIVE 任务最多 1 个|当前 ACTIVE 任务（最多|已有任何 ACTIVE" tasks/index.md docs/02_CURRENT_WORKFLOW.md tasks/README.md` returned no matches, confirming the stale single-ACTIVE rule is gone from current workflow files.
- `git diff --check` passed with exit 0.
- No browser screenshot gate was required because this task changed workflow documentation only and did not affect UI, chessboard, interaction, layout, or visible game text.

## commit_status

- not committed automatically: docs-only workflow change; full project test suite was not required for this task, and the shared worktree still has unrelated untracked Playwright/performance artifacts outside this task.
