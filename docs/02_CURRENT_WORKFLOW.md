# 02_CURRENT_WORKFLOW - AI Routing Rules

Use this file as project-level routing instructions.

## Hard Triggers

| 触发词 | 模式 | 入口 |
|--------|------|------|
| `Goal` <目标描述> | 默认执行 | 见本节 |
| `diff` | 只读分析，出 diff 不动代码 | 见本节 |
| <目标> `策划` | 只做方案/规则/文档，不改代码 | 见本节 |
| <目标> `diff` | 同上只读模式 | 见本节 |
| `git-c` | 全工作区任务感知收口提交 | 见本节 |
| `同步内容` | 表格同步 | 见本节 |

## Goal

用户说一个开发目标 → 默认按 Goal 推进，不逐步询问。

Do not require words like "start", "continue", or "execute".
Do not ask for step-by-step approval.
Do not pause unless a High-Risk Exception applies.

先判断任务形态：

- 只读查询、源码定位、流程审计、`diff` / `策划`、简单命令检查：不创建任务卡，不改文件，直接回答或输出方案。
- 要修改仓库文件、项目规则、数据、生成物或交付资产：创建或更新任务卡。
- 已有同一玩家目标/同一交付面的任务卡时，优先复用并扩展该卡的 `write_scopes`，不要为每个小修新开一张卡。

启动前必须：

```text
1. git status --short                           # 检查 dirty
2. read tasks/index.md                          # 读任务总览
3. read tasks/doing/*.md tasks/paused/*.md      # 读任务卡
4. if editing: create/update thin task card     # 声明 owner/status/related_files/write_scopes/exclusive_files
5. if editing: check exclusive/write-scope overlap
6. 无冲突 → 推进；有冲突 → 暂停输出报告
```

推进流程：

```text
read entry docs -> classify -> check tasks/ + git status ->
reserve task lease and write scopes -> resolve conflicts -> plan -> execute -> run current task validation ->
if visible change -> visual QA subthread gate ->
update docs -> if auto-commit conditions met -> commit
```

任务卡只作为写入租约和交付记录。开工时保持薄卡，先写最小字段：`task_id`、`status`、`owner`、`Goal`、`related_files`、`write_scopes`、`exclusive_files`、`validation`、`commit_plan`。验证证据、浏览器截图、外部 AI 结论和详细复盘只在完成相应步骤后追加。

当 `tasks/doing/` 中 READY_TO_MERGE / BLOCKED 明显堆积、`tasks/index.md` 与真实目录不一致，或新任务会继续碰共享 UI/core 文件时，优先刷新 index 并做 `git-c` / Lead 收口；不要继续用新任务卡掩盖旧 dirty 边界。

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
| Lead Agent | 创建/更新任务卡、决定范围、分配文件和 `write_scopes`、整合外部意见、运行最终验证、提交或输出 Commit Plan | 当前任务 `related_files` / `write_scopes` / `exclusive_files` |
| Specialist Agent | 只做窄域审查、方案对照、代码风险点或测试建议；结论必须可被 Lead 复核 | 默认只读，除非 Lead 在任务卡中明确分配文件 |
| Tester Pass | 独立真实入口验收，保存截图，记录操作步骤、DOM/ViewModel/state/console 证据 | `output/playwright/` 与任务卡证据；不改实现文件 |
| External AI | 外部建议、草案、灵感来源 | 不直接写仓库；必须由 Lead 按项目规则筛选 |

### 并行任务模型

`tasks/doing/` 允许多个 ACTIVE 任务卡。并行是否合法不再由“是否已有 ACTIVE”或“是否同一个文件”单独决定，而由独占文件、写入范围和提交边界决定：

- `related_files`: 当前任务可能写入的文件集合；用于提交归属和粗略检索，不再天然等于整文件独占。
- `write_scopes`: 当前任务在文件内的真实写入范围，写到函数、导出对象、CSS selector、测试 `describe`/fixture、文档章节、生成物分区等粒度。
- `shared_file_policy`: 当 `related_files` 与其他任务重叠时，说明为什么可以并行、如何合并、谁负责最终验证。
- `exclusive_files`: 高风险共享文件，同一时刻只能被一个 ACTIVE 任务占用。
- `read_files`: 只读参考文件，不形成写入租约。
- `owner`: 当前任务的负责 AI / 线程 / worker。
- `branch` / `worktree`: 当前分支或工作区；共享工作区写 `shared-worktree`。
- `merge_owner`: 当同一文件由多个 AI 贡献时，负责最终 patch 合并、冲突判断、验证和提交的 Lead。
- `tasks/index.md`: 维护索引，不属于普通功能任务的独占实现文件。任何 Lead 在开工、收口或 `git-c` 时都可以按真实 `tasks/doing` / `tasks/paused` / `tasks/done` 刷新它；旧任务卡若把它列入 `exclusive_files`，视为过期写法，不得阻止索引维护。

`write_scopes` 模式：

- `direct`: 可以在共享 worktree 直接修改，但必须和其他任务的 `write_scopes` 不重叠。
- `patch_only`: Worker 只输出 patch/建议，不直接写源文件；由 Lead 手工合并。
- `worktree`: Worker 在独立 worktree/branch 修改，Lead 后续 cherry-pick 或手工合并。

同文件并行默认允许的例子：

- 同一 JS 文件中互不调用的两个函数或两个导出对象。
- 同一 CSS 文件中互不覆盖的 selector 区域。
- 同一测试文件中不同 `describe` 块或不同 fixture。
- 同一文档中不同章节。

同文件仍必须暂停或合并为单任务的例子：

- 同一个函数、reducer 分支、公开 ViewModel 字段、CSV/export 合同、状态 schema、事件 payload 或 action command。
- 一个改动会改变另一个任务正在验证的语义接口。
- 多个任务都要重建同一个生成物，并且生成输入不同或顺序不可交换。

任务状态：

- `ACTIVE_IMPL`: 正在实现。
- `ACTIVE_TEST`: 等待独立 tester pass 或补充验收。
- `READY_TO_MERGE`: 证据齐全，等待 Lead 集成/提交。
- `BLOCKED`: 冲突、验收失败、正式流程不可达或需要用户拍板。

同一任务的实现、测试和提交可以由不同角色参与，但最终精确暂存、提交和归档只由 Lead 执行。

### 什么时候派其他 AI

优先单线程推进：

- 小范围文档、局部代码、明确 bug、一次性数据查询。
- 文件边界清楚且没有 UI / 可见验收要求。

必须或优先增加独立协作：

- UI、棋盘、可见预览、交互反馈、布局、文案可读性：必须有 `Tester Pass` 或测试子线程证据。
- 大范围规则、架构、经济/数值、跨模块改动：优先派 `Specialist Agent` 做只读审查，再由 Lead 落地。
- 用户给出外部 AI 建议包：Lead 必须先做适配审查，不能直接照搬。
- `git-c` 或多任务收口：Lead 先按任务卡和 `write_scopes` 分组；必要时让 Specialist 做只读归属审查。

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

1. 任意 AI 发现目标文件与其他 ACTIVE 任务 `exclusive_files` 重叠，立即触发 `FILE_CONFLICT_STOP`。
2. 目标文件只与其他任务 `related_files` 重叠时，不直接停止；必须比较 `write_scopes`。范围不重叠且 `shared_file_policy` 写清合并方式时可以继续。
3. `write_scopes` 缺失、重叠、指向同一语义接口，或多个 AI 对 scope 边界理解不一致时，触发 `FILE_CONFLICT_STOP`。
4. Specialist 与 External AI 的意见不能覆盖项目规则；只能作为 Lead 的输入。
5. Tester Pass 如果发现截图、DOM、ViewModel、状态或 console 不匹配，Lead 必须回到实现或输出 blocked，不得自动提交。
6. 多 AI 之间不互相转交提交权；只有 Lead 执行精确暂存、提交和任务归档。
7. 不再因为 `tasks/doing/` 里存在其他 ACTIVE 任务或普通 `related_files` 重叠而自动停止；只有独占文件、写入范围、同一语义接口、dirty/staged 边界或任务卡记录冲突才停止。

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
classify task -> inspect relevant rules -> propose diff -> report
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

`git-c = 全工作区任务感知收口提交器`

如果用户说 `git-c`，进入批量收口模式。

### 定位

- 目标不是“提交一部分能归属的文件”，而是把当前工作区全部收口：执行完成后 `git status --short --untracked-files=all` 必须干净，相关 commit 必须已经推送到当前分支的 upstream。
- 允许工作区同时存在多个任务的未提交改动，但不能把模糊边界当成留下 dirty 的理由。
- 按任务边界自动拆成多个 commit，**每个 commit 只属于一个任务**；同一物理文件若包含多个任务的改动，必须按 patch/scope 精确拆分，不能整文件暂存。
- 多个 `tasks/doing/` 任务可以并行存在；`git-c` 必须按 `related_files` / `write_scopes` / `exclusive_files` 分组收口。
- 模糊边界文件：能判断多少归属信息就记录多少；无法唯一归属时建立 `git-c fuzzy/leftovers` 收口提交或 cleanup 提交，提交说明必须写清可能来源、证据、风险和后续复核点。
- 明显垃圾文件：能安全删除就删除，应该忽略就补 `.gitignore`，有交付价值就作为 artifact 提交；不得仅因为“不属于任务卡”就留在工作区。
- 只有秘密/token、破坏性删除、大型未知二进制、无法解决的合并冲突、无远端/认证/网络导致无法 push 这类真实外部阻塞，才允许最后不是 clean+pushed；最终报告必须写明具体 blocker 和剩余文件。
- **禁止** `git add .` / `git add -A`，只精确暂存。

### 流程

```text
Phase 1 诊断:
  read tasks/index.md
  read tasks/doing/*.md  ->  tasks/paused/*.md  (所有任务卡)
  inspect git status/diff/staged
  read docs/10_CHANGELOG.md  (辅助判断)

Phase 2 分类:
  生成 Commit Plan，分五类:
    Task Groups     — 可归属到任务卡的文件组或同文件 patch/scope 组
    Fuzzy Groups    — 有效项目文件但边界模糊，按可得证据做 best-effort 收口提交
    Cleanup Group   — 明显垃圾、临时文件、应 gitignore 的文件，删除或 gitignore/cleanup commit
    Blocker Group   — 秘密/token、未知大型二进制、无法解决冲突、无法 push 等真实阻塞
    Push Target     — 当前分支/upstream/remote，不存在时先创建或明确 blocker
  输出 Commit Plan；除 Blocker Group 外不得暂停等待用户确认。

Phase 3 执行:
  for each Task Group:
    git add <group files> 或 git add -p <file>   (精确暂存，禁止 git add .)
    verify git diff --cached --stat
    run current task validation command
    git commit
    update task card (done_at, commit_id)
  for each Fuzzy/Cleanup Group:
    commit best-effort metadata or cleanup/gitignore change
    commit message/body records uncertainty and follow-up review points
  update tasks/index.md
  git status --short --untracked-files=all must be empty
  git push current branch/upstream
  verify pushed branch and final clean status
```

**详细规则（文件分类判断、Ignore/Leftovers/Blocked 标准、Commit Plan 模板等）见 `tasks/README.md` → 「git-c 集成细则」章节。**

## 同步内容

If the user says `同步内容`, enter table-sync mode.

先执行任务冲突检查：

1. 读取 `tasks/index.md`。
2. 读取 `tasks/doing/` 和 `tasks/paused/` 下所有任务卡的 `exclusive_files`、`related_files`、`write_scopes`。
3. 检查同步内容要修改的文件是否与其他任务卡的 `exclusive_files`、`write_scopes` 或同一语义接口冲突。
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

## 任务系统入口

项目使用 `tasks/` 目录管理多任务并行。

| 用途 | 文件 |
|---|---|
| 任务总览与断线恢复；维护索引，不是普通任务独占文件 | `tasks/index.md` |
| 任务系统细则（含 FILE_CONFLICT_STOP、git-c 集成） | `tasks/README.md` |
| 当前 ACTIVE 任务卡 | `tasks/doing/` 中，可有多个 |
| PAUSED 任务卡 | `tasks/paused/` 中 |
| 批量收口提交细则 | `tasks/README.md` → 「git-c 集成细则」 |
| Goal 执行规则、核心层分离、模块拆分 | `docs/00_AI_START_HERE.md` → 「Goal 执行规则」 |

每次开始要修改文件的任务前，必须先读取 `tasks/index.md` 检查任务状态和文件冲突。只读查询不创建任务卡。`git-c` 必须先读任务卡再分组提交。以「策划」或 `diff` 结尾的指令进入只读/策划模式，不改代码。

## 冲突硬停规则

如果检测到当前任务要修改的文件与其他任务卡中的 `exclusive_files` 重叠、`write_scopes` / 同一语义接口重叠，或工作区脏文件无法归属当前任务，必须：

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
