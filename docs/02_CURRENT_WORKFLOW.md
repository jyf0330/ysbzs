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
if visible change -> visual QA subthread gate ->
update docs -> if auto-commit conditions met -> commit
```

**详细执行规则（Goal 默认执行、不机械执行、核心层/显示层分离、模块拆分、四层棋盘格）见 `docs/00_AI_START_HERE.md` →「Goal 执行规则」章节。**

## 提交前可见验收门禁

适用范围：任何 UI、棋盘、可见预览、交互反馈、布局、文案可读性、浏览器画面相关改动。

这些任务在进入暂存和自动提交检查前，必须先完成以下顺序：

```text
implementation thread finishes code/tests
-> testing subthread operates the real browser through player actions
-> testing subthread saves screenshot and DOM/state/console evidence
-> main thread reviews screenshot for visible correctness
-> only then run auto-commit eligibility check
```

硬规则：

1. 优先派独立测试子线程做验收；如果当前工具没有可用子线程，必须执行独立 tester pass，并在任务卡记录 `TEST_SUBTHREAD_UNAVAILABLE` 与替代验证命令。
2. 测试子线程必须在真实浏览器里操作页面，动作包含按钮点击、棋盘点击、hover、结束回合、dispatch 或 `autoExecuteTurn` 等玩家可触发入口。
3. `/api/action`、DOM / ViewModel / 状态断言只能作为辅助证据；直接调用内部函数只能补单元测试，不能替代真实浏览器操作验收。
4. 截图证据必须来自玩家会实际使用的正式界面和正式入口；不得用临时构造存档、`localStorage`/`importSave` 注入、`page.evaluate` 改状态、调试对象、内部函数或一次性脚本直接制造目标画面来替代验收。
5. 如果需要构造状态复现 bug，只能作为单元测试、辅助诊断或复现说明；提交前可见验收仍必须从正式界面可达流程自然走到目标状态。若正式流程暂时不可达，必须标记 blocked/Commit Plan，不得用构造场景截图冒充通过。
6. 必须保存真实浏览器截图到 `output/playwright/` 或任务卡指定路径。
7. 任务卡验证记录必须包含正式界面操作步骤、截图路径、关键 DOM / ViewModel / 状态断言、console error 结果，并说明没有使用构造存档或内部状态注入作为截图主证据。
8. 主线程必须查看截图，确认关键可见效果“感觉正确”、没有明显遮挡、错位、缺失或错误数值。
9. 缺少正式界面真实操作、缺少截图、截图未复核、console 有新增 error、DOM/状态断言不匹配时，不得进入自动提交检查；只能输出 blocked/Commit Plan。

## Multi-AI Collaboration

目标：多 AI 协作只用来提高独立性和吞吐，不允许制造第二套真相源。项目真相源仍是当前代码、`docs/00_AI_START_HERE.md`、`docs/02_CURRENT_WORKFLOW.md`、任务卡和用户最新指令。

### 角色

| 角色 | 责任 | 允许写入 |
|---|---|---|
| Lead Agent | 占用任务卡、决定范围、修改文件、整合外部意见、运行最终验证、提交或输出 Commit Plan | 当前任务 `related_files` |
| Specialist Agent | 只做窄域审查、方案对照、代码风险点或测试建议；结论必须可被 Lead 复核 | 默认只读，除非 Lead 在任务卡中明确分配文件 |
| Tester Pass | 独立真实入口验收，保存截图，记录操作步骤、DOM/ViewModel/state/console 证据 | `output/playwright/` 与任务卡证据；不改实现文件 |
| External AI | 外部建议、草案、灵感来源 | 不直接写仓库；必须由 Lead 按项目规则筛选 |

### 什么时候派其他 AI

优先单线程推进：

- 小范围文档、局部代码、明确 bug、一次性数据查询。
- 文件边界清楚且没有 UI / 可见验收要求。

必须或优先增加独立协作：

- UI、棋盘、可见预览、交互反馈、布局、文案可读性：必须有 `Tester Pass` 或测试子线程证据。
- 大范围规则、架构、经济/数值、跨模块改动：优先派 `Specialist Agent` 做只读审查，再由 Lead 落地。
- 用户给出外部 AI 建议包：Lead 必须先做适配审查，不能直接照搬。
- `git-c` 或多任务收口：Lead 先按任务卡分组；必要时让 Specialist 做只读归属审查。

### 协作交接格式

Lead 在任务卡或最终报告中记录以下最小证据：

```text
collaboration:
  lead_scope: <本轮负责的目标与文件>
  specialist_input: <无 / agent 名称 + 只读结论路径或摘要>
  tester_pass: <无 / TEST_SUBTHREAD_UNAVAILABLE / 截图路径 + 操作步骤 + console 结果>
  external_ai_input: <无 / 来源 + Lead 采纳与拒绝摘要>
  lead_decision: <最终采用的方案和原因>
```

### 冲突处理

1. 任意 AI 发现目标文件被其他任务卡占用，立即触发 `FILE_CONFLICT_STOP`。
2. Specialist 与 External AI 的意见不能覆盖项目规则；只能作为 Lead 的输入。
3. Tester Pass 如果发现截图、DOM、ViewModel、状态或 console 不匹配，Lead 必须回到实现或输出 blocked，不得自动提交。
4. 多 AI 之间不互相转交提交权；只有 Lead 执行精确暂存、提交和任务归档。

### External AI CLI Runner

当用户明确要求 DeepSeek / Claude / Gemini / 其他外部 AI “干明确的活”时，Lead 应把它当成 External AI Worker，而不是让高智能 Lead 直接包办实现。

优先使用可观察会话：

- 通过 `tmux`、真实终端或等价可见会话运行外部 CLI，例如 `cys`。
- 避免默认使用完全黑箱的 `--print` 一次性输出模式；除非任务很小且用户不要求观看过程。
- 若使用后台会话，Lead 必须提供会话名、日志路径或查看方式。

后台会话监控优先使用 tmux pane activity，不要求外部 AI 额外写状态文件：

```bash
last=$(tmux display-message -p -t <session-name> '#{pane_last}')
now=$(date +%s)
echo $((now - last)) "秒前有活动"
```

如果当前 tmux 版本返回 `0` 或空值，改用 `pipe-pane` 日志文件 mtime：

```bash
tmux pipe-pane -o -t <session-name> 'cat >> <log-path>'
last=$(stat -f '%m' <log-path>)
now=$(date +%s)
echo $((now - last)) "秒前有日志活动"
```

执行规则：

1. Lead 每轮只检查 tmux pane activity、pane log 和 git diff，不抢写外部 AI 的 owned files。
2. pane activity 小于 180 秒：继续等待。
3. pane activity 大于等于 180 秒：先保存 pane 输出和日志，再中断外部 AI，不接管实现。
4. 同一问题最多允许外部 AI 修 3 次；每次失败都必须记录失败证据、原因假设和下一次修正边界。
5. 第 3 次仍未解决时，终止该外部 AI 任务，写入任务卡 `EXTERNAL_AI_FAILED_THREE_TIMES`，记录失败原因分析和后续建议；除非用户明确授权，Lead 不继续代写实现。
6. External AI 不得提交；最终测试、截图复核、精确暂存、提交和任务归档只由 Lead 执行。

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
| Consultation, architecture evaluation, engine/tool choice, “要不要做 / 值不值得做” | `ywh-game` + 1 个最相关领域 skill；先不要默认加载实现/验收 skill |
| Numbers, rules, levels, systems | `brainstorming`, `writing-plans`, `balance-check`, `ywh-game` |
| Browser UI, H5, Canvas, E2E | `ywh-web-game`, `playwright`, `game-playtest`, `verification-before-completion`; before commit run 提交前可见验收门禁 |
| UI/UX, interface, 界面, 交互, HUD, 棋盘点击, 按钮, 布局, 可读性 | `game-ui-frontend`, `frontend-skill`, `ywh-web-game`, `playwright`, `game-playtest`, `verification-before-completion`; before commit run 提交前可见验收门禁 |
| UI behavior bug, 点不了, 移动不了, 选不中, 状态不对 | `systematic-debugging`, `test-driven-development`, `game-ui-frontend`, `ywh-web-game`, `playwright`, `verification-before-completion` |
| Docs, CHANGELOG, workflow rules that require edits | `task-occupancy`, `ywh-game`, `verification-before-completion` |
| `git-c`, finish, pre-commit check | `task-occupancy`, `verification-before-completion`, `ywh-game` |
| Read-only review or workflow audit | `ywh-game` |

### Skill Load Discipline

Do not load every matched skill at once by default.

- `required now`: 当前阶段立刻决定方法或边界的 skill，先读这些。
- `supporting`: 只有当主 skill 明显不够时再补读。
- `deferred`: 只有任务进入实现、浏览器取证、测试修复或完成宣称阶段才加载。

默认规则：

- 咨询 / 评估 / 选型 / “是否值得做” → 先加载 `required now`，通常是 `ywh-game` + 1 个最相关领域 skill。
- 不改文件、不开浏览器、不宣称完成时，不要默认加载 `playwright`、`game-playtest`、`verification-before-completion`、`test-driven-development`。
- 一旦任务从咨询态切到实现态、验收态或完成态，再补齐对应 skill。
- 若多个领域 skill 都可能适用，先选最窄的一组；需要时再增量追加。

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
visible changes: testing subthread screenshot gate ->
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

Codex note:

- Before writing `UNAVAILABLE` for a Superpowers skill, check both `~/.codex/skills/<skill-name>/SKILL.md` and `~/.codex/skills/superpowers/skills/<skill-name>/SKILL.md`.

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
