# 02_CURRENT_WORKFLOW - AI Routing Rules

Use this file as project-level routing instructions.

## Hard Triggers

Only four hard triggers exist: `Goal`, `diff`, `git-c`, and `同步内容`.

## Goal

If the user gives a clear objective, enter `Goal` mode.

Do not require words like "start", "continue", or "execute".
Do not ask for step-by-step approval.
Do not pause unless a High-Risk Exception applies.

Run:

```text
read entry docs -> classify task -> trigger skills -> plan steps -> execute -> verify -> update required docs -> report
```

## diff

If `diff` is the user intent or a standalone suffix, enter `diff` mode.

Do not edit files in `diff` mode.
Return proposed changes only.
Use patch-style diffs when useful.

Run:

```text
classify task -> trigger planning skills -> propose diff -> report
```

## git-c

If the user says `git-c`, enter commit-cleanup mode.

Read project logs and CHANGELOG first.
Inspect `git status` and diffs.
Group changes into commits by matching log entries.
Use precise staging.
Commit unknown leftovers last.
Finish with a clean worktree.
Do not stop unless a High-Risk Exception applies.

Run:

```text
read logs -> inspect status/diff -> group by log entry -> commit matching groups -> commit leftovers -> verify clean worktree -> report
```

## 同步内容

If the user says `同步内容`, enter table-sync mode.

Read `docs/tables/_changes/SYNC_RULES.md` for full rules.
Read `docs/tables/_changes/pending/` for pending change orders.
Check for conflicts, then apply changes to formal tables.
Generate a sync report.
Archive completed change orders.
Check for stale/wrong rules in current docs.
Report what was synced.

Run:

```text
read SYNC_RULES.md -> read pending/ -> check conflicts -> apply changes -> generate report to reports/ -> archive to archive/ -> check stale rules -> report
```

## Skill Routing

Always trigger matching skills when available:

| Intent | Skills |
|---|---|
| Any clear `Goal` | `using-superpowers`, `ywh-game`, `ywh-web-game` |
| Implement code, UI, or rules | `executing-plans`, `test-driven-development`, `verification-before-completion`, `ywh-game` |
| Bug, anomaly, failed test, failed acceptance | `systematic-debugging`, `test-driven-development`, `verification-before-completion` |
| Existing plan, task card, executable GDD | `executing-plans`, `subagent-driven-development`, `verification-before-completion` |
| Unclear goal, exploration, standalone `diff` | `brainstorming`, `writing-plans`, `ywh-game` |
| Numbers, rules, levels, systems | `brainstorming`, `writing-plans`, `balance-check`, `ywh-game` |
| Browser UI, H5, Canvas, E2E | `ywh-web-game`, `playwright`, `game-playtest`, `verification-before-completion` |
| Docs, CHANGELOG, workflow rules | `ywh-game`, `verification-before-completion` |
| `git-c`, finish, pre-commit check | `verification-before-completion`, `finishing-a-development-branch`, `ywh-game` |
| Read-only review or workflow audit | `ywh-game` |

## Missing Skills

If a matching skill is unavailable, write `UNAVAILABLE`.
Do not pretend the skill was used.
Continue with this file's rules.
Do not edit another tool's skill directory.

## 任务系统入口

项目使用 `tasks/` 目录管理多任务并行。

| 用途 | 文件 |
|---|---|
| 任务总览与断线恢复 | `tasks/index.md` |
| 任务系统细则（含 FILE_CONFLICT_STOP） | `tasks/README.md` |
| 当前 ACTIVE 任务卡 | `tasks/doing/` 中 |
| PAUSED 任务卡 | `tasks/paused/` 中 |

每次开始任务或修改文件前，必须先读取 `tasks/index.md` 检查任务状态和文件冲突。

## 冲突硬停规则

如果检测到当前任务要修改的文件与其他任务卡中的 `related_files` 重叠，或工作区脏文件无法归属当前任务，必须：

1. **立即暂停**，不得继续修改或提交
2. 输出冲突报告
3. 等待用户拍板

细则见 `tasks/README.md` → `FILE_CONFLICT_STOP 硬规则` 章节。

## High-Risk Exceptions

Ask the user before:

- deleting or overwriting many files
- changing core design direction
- proceeding through a clear conflict between the latest user instruction and project docs
- using accounts, secrets, payment, or external authorization
- choosing between options with major long-term impact
- expanding scope after tests fail
