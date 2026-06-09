# 02_CURRENT_WORKFLOW - AI Routing Rules

Use this file as project-level routing instructions.

## Hard Triggers

| 触发词 | 模式 | 入口 |
|--------|------|------|
| `Goal` <目标描述> | 默认执行 | 见本节 |
| `diff` | 只读分析，出 diff 不动代码 | 见本节 |
| <目标> `策划` | 只做方案/规则/文档，不改代码 | 见本节 |
| <目标> `diff` | 同上只读模式 | 见本节 |
| `git-c` | 批量收口提交 | 见本节 |
| `同步内容` | 表格同步 | 见本节 |

## Goal

用户说一个开发目标 → 默认按 Goal 推进，不逐步询问。

Do not require words like "start", "continue", or "execute".
Do not ask for step-by-step approval.
Do not pause unless a High-Risk Exception applies.

启动前必须：

```text
1. git status --short                           # 检查 dirty
2. read tasks/index.md                          # 读任务总览
3. read tasks/doing/*.md tasks/paused/*.md      # 读任务卡
4. check related_files overlap                  # FILE_CONFLICT_STOP
5. 无冲突 → 推进；有冲突 → 暂停输出报告
```

推进流程：

```text
read entry docs -> classify -> check tasks/ + git status ->
resolve conflicts -> plan -> execute -> verify (node test.js) ->
update docs -> if auto-commit conditions met -> commit
```

**详细执行规则（Goal 默认执行、不机械执行、核心层/显示层分离、模块拆分、四层棋盘格）见 `docs/00_AI_START_HERE.md` →「Goal 执行规则」章节。**

## diff

If `diff` is the user intent or a standalone suffix, enter `diff` mode.

Do not edit files in `diff` mode.
Return proposed changes only.
Use patch-style diffs when useful.

Run:

```text
classify task -> trigger planning skills -> propose diff -> report
```

## 策划

如果用户指令以「策划」结尾（或含 `diff` 后缀），进入策划/只读模式。

- 只做方案分析、规则收束、表格设计、文档建议
- **不改代码、不提交、不进入实现**
- 输出可以是：方案文档、规则冲突报告、数据流分析、表格设计建议
- 除非用户明确要求执行，否则不进入实现

Run:

```text
read project entry -> read task cards -> analyze current state -> output plan / diff / suggestion -> stop
```

## git-c

`git-c = 任务感知的多任务批量收口提交器`

如果用户说 `git-c`，进入批量收口模式。

### 定位

- 允许工作区同时存在多个任务的未提交改动。
- 按任务边界自动拆成多个 commit，**每个 commit 只属于一个任务**。
- 无法归属的文件：自动忽略垃圾文件 → 低风险 leftovers 集合提交 → 高风险 blocked 暂停。
- **禁止** `git add .` / `git add -A`，只精确暂存。

### 流程

```text
Phase 1 诊断:
  read tasks/index.md
  read tasks/doing/*.md  ->  tasks/paused/*.md  (所有任务卡)
  inspect git status/diff/staged
  read docs/10_CHANGELOG.md  (辅助判断)

Phase 2 分类:
  生成 Commit Plan，分四类:
    Task Groups     — 可归属到任务卡的文件组
    Ignore Group    — 明显垃圾文件 (已 gitignore 或建议加入)
    Leftovers Group — 有效项目文件但无法归属，低风险
    Blocked Group   — 高风险/冲突/无法自动处理
  输出 Commit Plan。
  如果存在 Blocked Group -> 暂停，等待用户拍板。

Phase 3 执行:
  for each Task Group:
    git add <group files>   (精确暂存，禁止 git add .)
    verify git diff --cached --stat
    run validation command  (如 node test.js)
    git commit
    update task card (done_at, commit_id)
  gitignore maintenance commit  (如有需要)
  Leftovers commit  (低风险可集合提交)
  update tasks/index.md
```

**详细规则（文件分类判断、Ignore/Leftovers/Blocked 标准、Commit Plan 模板等）见 `tasks/README.md` → 「git-c 集成细则」章节。**

## 同步内容

If the user says `同步内容`, enter table-sync mode.

先执行任务冲突检查：

1. 读取 `tasks/index.md`。
2. 读取 `tasks/doing/` 和 `tasks/paused/` 下所有任务卡的 `related_files`。
3. 检查同步内容要修改的文件是否属于其他任务卡。
4. 检查是否与 dirty 文件冲突，触发 `FILE_CONFLICT_STOP` 条件。
5. 有冲突 → 暂停并输出冲突报告，不执行同步。
6. 无冲突才继续同步。

同步流程：

```text
read tasks/index.md + task cards          # 冲突检查
read SYNC_RULES.md                        # 表格同步细则
read pending/                             # 待同步变更单
check conflicts against task cards        # 再次确认
if conflict -> FILE_CONFLICT_STOP         # 暂停
apply changes                             # 同步表格
generate report to reports/               # 生成报告
archive pending/                          # 归档变更单
update task cards                         # 归入对应任务 / 新建表格同步任务卡
update tasks/index.md
report
```

## Skill Routing

Always trigger matching skills when available:

| Intent | Skills |
|---|---|
| Any clear `Goal` that implies edits | `task-occupancy`, `using-superpowers`, `ywh-game`, `ywh-web-game` |
| Before modifying code, UI, rules, tests, project workflow files, or delivery assets | `task-occupancy` |
| Implement code, UI, or rules | `task-occupancy`, `executing-plans`, `test-driven-development`, `verification-before-completion`, `ywh-game` |
| Bug, anomaly, failed test, failed acceptance | `systematic-debugging`, `test-driven-development`, `verification-before-completion` |
| Existing plan, task card, executable GDD | `executing-plans`, `subagent-driven-development`, `verification-before-completion` |
| Unclear goal, exploration, standalone `diff` | `brainstorming`, `writing-plans`, `ywh-game` |
| Numbers, rules, levels, systems | `brainstorming`, `writing-plans`, `balance-check`, `ywh-game` |
| Browser UI, H5, Canvas, E2E | `ywh-web-game`, `playwright`, `game-playtest`, `verification-before-completion` |
| UI/UX, interface, 界面, 交互, HUD, 棋盘点击, 按钮, 布局, 可读性 | `game-ui-frontend`, `frontend-skill`, `ywh-web-game`, `playwright`, `game-playtest`, `verification-before-completion` |
| UI behavior bug, 点不了, 移动不了, 选不中, 状态不对 | `systematic-debugging`, `test-driven-development`, `game-ui-frontend`, `ywh-web-game`, `playwright`, `verification-before-completion` |
| Docs, CHANGELOG, workflow rules that require edits | `task-occupancy`, `ywh-game`, `verification-before-completion` |
| `git-c`, finish, pre-commit check | `task-occupancy`, `verification-before-completion`, `ywh-game` |
| Read-only review or workflow audit | `ywh-game` |

### Skill Invocation Requirement

When a row in the Skill Routing table matches the current task, the agent must
invoke the matching Skill tool before answering, planning, or editing files.

Before editing files for any matched task, write a short Skill Receipt:

```text
本轮命中 skill：<skill names>
已读取：<project entry / role entry / SKILL.md names>
```

For UI/UX, HUD, board-click, or visible interaction work, this receipt is a hard
gate. Do not edit UI files until `game-ui-frontend` or `frontend-skill` and
`ywh-web-game` have been read or explicitly marked `UNAVAILABLE`.

For any task that will edit files, `task-occupancy` is the first gate:

```text
read workflow/task docs -> git status ->
create/update ACTIVE task card -> reserve related_files ->
check overlap / dirty files -> edit -> verify ->
archive task card -> commit if conditions allow
```

If the task system is required but `tasks/` is missing, create the minimal
`tasks/index.md`, `tasks/README.md`, `tasks/doing/`, `tasks/paused/`, and
`tasks/done/` structure before editing. If another ACTIVE task owns the slot,
stop with `FILE_CONFLICT_STOP` unless the user explicitly continues that task.

If the agent cannot invoke a listed skill because the current AI tool does not
expose it, the skill is missing, the user explicitly excludes it, or the task
is a trivial one-command check, the final report must include one of:

- `SKIPPED <skill-name>: <reason>`
- `UNAVAILABLE <skill-name>: <reason>`

For Claude/DeepSeek sessions, `cys` appends a routing reminder at startup, but
this file remains the project-level source of truth. The model choice does not
change this rule.

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
| 任务系统细则（含 FILE_CONFLICT_STOP、git-c 集成） | `tasks/README.md` |
| 当前 ACTIVE 任务卡 | `tasks/doing/` 中 |
| PAUSED 任务卡 | `tasks/paused/` 中 |
| 批量收口提交细则 | `tasks/README.md` → 「git-c 集成细则」 |
| Goal 执行规则、核心层分离、模块拆分 | `docs/00_AI_START_HERE.md` → 「Goal 执行规则」 |

每次开始任务或修改文件前，必须先读取 `tasks/index.md` 检查任务状态和文件冲突。`git-c` 必须先读任务卡再分组提交。以「策划」或 `diff` 结尾的指令进入只读/策划模式，不改代码。

## 冲突硬停规则

如果检测到当前任务要修改的文件与其他任务卡中的 `related_files` 重叠，或工作区脏文件无法归属当前任务，必须：

1. **立即暂停**，不得继续修改或提交
2. 输出冲突报告
3. 等待用户拍板

细则见 `tasks/README.md` → `FILE_CONFLICT_STOP 硬规则` 和 → `git-c 集成细则` 章节。

## High-Risk Exceptions

Ask the user before:

- deleting or overwriting many files
- changing core design direction
- proceeding through a clear conflict between the latest user instruction and project docs
- using accounts, secrets, payment, or external authorization
- choosing between options with major long-term impact
- expanding scope after tests fail
