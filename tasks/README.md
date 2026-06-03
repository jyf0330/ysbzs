# 任务系统规则

## 目录结构

```
tasks/
├── README.md          # 本文件 — 任务系统规则
├── index.md           # 当前任务总览（断线恢复入口）
├── doing/             # 当前 ACTIVE 任务（最多 1 个）
├── paused/            # 暂停的任务
└── done/              # 已完成任务
```

- 项目可以有多个任务，但真正执行的 P0 任务只能有 1 个。
- 其他任务必须处于 `PAUSED` / `DONE` 等明确状态。

## 任务状态

| 状态 | 含义 |
|---|---|
| `ACTIVE` | 当前正在推进或当前可执行 |
| `PAUSED` | 被更高优先级任务打断，后续可恢复 |
| `READY_TO_VALIDATE` | 主要改动已完成，等待测试/检查/验收/提交 |
| `BLOCKED` | 缺用户决策、资料、环境或外部输入 |
| `BLOCKED_FILE_CONFLICT` | 检测到同文件冲突，等待用户拍板 |
| `DONE` | 已完成并记录 commit / 验收结果 |
| `SUPERSEDED` | 被新方案替代，不再继续 |
| `BACKLOG` | 待办，尚未开始 |

## 每张任务卡必须包含

- `task_id`、`status`、`priority`、`created_at`、`updated_at`
- `related_files`：该任务会修改的所有文件清单
- `excluded_files`：不应修改的文件
- `resume_next_step`：恢复后第一步做什么
- `validation_needed`：如何验收
- `interruption_log` / `conflict_log`：中断和冲突记录

## FILE_CONFLICT_STOP 硬规则

### 执行时机

每次以下操作前必须执行冲突检查：
1. 开始新任务
2. 修改文件前
3. 暂存文件前
4. 提交前
5. 断线恢复前

### 检查内容

1. `git status --short`
2. `git diff --stat`
3. `git diff --cached --stat`
4. 本任务 `related_files` 与 dirty 文件重叠情况
5. 其他 active / paused 任务的 `related_files`
6. staged 区是否混入其他任务文件

### 触发条件（任一即暂停）

1. 本任务要修改的文件已 dirty 但不确定归属
2. 本任务要修改的文件已 staged 但内容不属于本任务
3. 本任务文件出现在其他 active 任务的 `related_files` 中
4. 本任务文件出现在 paused 任务的 `related_files` 中且该任务未完成
5. 本任务文件出现在 blocked 任务的 `related_files` 中
6. 同一文件被两个任务卡声明
7. AI 无法判断文件归属
8. staged 区包含多个任务范围
9. 工作区有旧脏文件，本任务也准备修改同一文件

### 触发后操作

1. 停止编辑文件
2. 不得自动合并
3. 不得继续实现
4. 不得提交
5. 将当前任务改为 `BLOCKED_FILE_CONFLICT`
6. 输出冲突报告
7. 等待用户拍板

### 冲突报告格式

```
检测到文件冲突，已暂停执行。

冲突文件：
  * ui.js

当前任务：
  * 四阶元素重构

可能冲突任务：
  * 商店界面文档

建议处理：
  A. 先验收并提交已有改动
  B. 当前任务暂停，恢复原任务
  C. 用户确认合并处理（记录 merged_task_scope）
  D. 拆分文件改动，分别提交
```

## 任务切换规则

1. 判断当前是否有 `ACTIVE` 任务。
2. 如果新任务是插队，先保存当前任务进度：
   - 写 `updated_at`、`paused_at`、`paused_reason`、`resume_next_step`
   - 状态改为 `PAUSED`（或移入 `paused/`）
3. 为新任务创建任务卡，放入 `doing/`。
4. 更新 `tasks/index.md`。
5. 检查 `related_files` 冲突。
6. 无冲突才继续。

## 提交规则

1. 确认 staged 文件全部属于本任务 `related_files`。
2. 检查未混入其他 active / paused 任务文件。
3. 发现混入 → 触发 `FILE_CONFLICT_STOP`。
4. 提交信息对应本任务。
5. 提交后写入 `done_at`、`commit_id`、`validation_result`。
6. 更新 `tasks/index.md`。

**禁止**：一次提交多个任务的文件 / 把旧脏文件顺手提交 / 混入 paused 任务文件。

## 断线恢复流程

当用户说"继续"时：
1. 读取 `tasks/index.md`。
2. 找到 P0 任务，读取对应任务卡。
3. 运行 `git status --short`、`git diff --stat`。
4. 检查 dirty 文件是否全部归属当前任务。
5. 检查 `FILE_CONFLICT_STOP` 条件。
6. 无冲突后按 `resume_next_step` 继续。
7. 若任务卡和 git 状态不一致，先输出状态校准报告，不继续改文件。

## 时间规则

所有时间精确到分钟。推荐格式：`YYYY-MM-DD HH:mm`。

---

## git-c 集成细则

`git-c = 任务感知的多任务批量收口提交器`

详见 `docs/02_CURRENT_WORKFLOW.md` → `git-c` 章节的流程骨架。本文件展开细则。

### 一、启动前必须读取

1. `tasks/index.md`
2. `tasks/doing/*.md`（所有 ACTIVE 任务卡）
3. `tasks/paused/*.md`（所有 PAUSED 任务卡）
4. `git status --short --untracked-files=all`
5. `git diff --stat`
6. `git diff --cached --stat`
7. `docs/10_CHANGELOG.md`（辅助判断，不覆盖任务卡）
8. 当前任务卡的 `related_files`、`commit_plan`、`validation_needed`

### 二、文件归属判断优先级

1. staged 文件归属
2. 任务卡 `related_files`
3. 任务卡 `commit_plan`
4. 任务卡 `done_so_far`
5. 同步报告 / 表格变更报告
6. CHANGELOG（辅助，不覆盖任务卡）
7. git diff 内容语义判断
8. 无法判断 → `UNKNOWN`

**规则**：
- 任务卡 `related_files` 优先级高于 CHANGELOG。
- 如果 CHANGELOG 和任务卡冲突，以任务卡为准，输出冲突说明。
- 一个文件同时属于多个任务卡 → 触发 `FILE_CONFLICT_STOP`。
- AI 无法判断 → 归为 `UNKNOWN`，不进任何 Task Group。

### 三、Commit Plan 模板

`git-c` 必须先生成 Commit Plan，不直接提交。

```
## Commit Plan

updated_at: 2026-06-03 HH:mm

### Task Group 1：<任务名>

任务卡：`tasks/doing/<文件名>.md`
状态：<当前任务状态>

文件：
  * <文件名>
  * <文件名>

建议 commit message：
  <提交信息>

验收：
  * node test.js
  <其他验收项>

是否包含 staged 文件：是/否
是否存在风险：是/否
可否自动提交：是/否

### Task Group 2：<任务名>
...

### Ignore Group

文件：
  * <文件名> — 原因：<为什么忽略>
  * <文件名> — 原因：<为什么忽略>
是否已被 .gitignore 覆盖：是/否
是否建议加入 .gitignore：是/否

### Leftovers Group

文件：
  * <文件名> — <简短判断>
  * <文件名> — <简短判断>
建议 commit message：
  收口未归类项目改动
风险评估：低/中（高风险应进入 Blocked Group）
可否自动提交：是/否

### Blocked Group

文件：
  * <文件名> — <风险说明>
  * <文件名> — <风险说明>
处理建议：
  <建议用户如何处理>
```

### 四、Task Groups 规则

- 一个 Task Group 只对应一个任务卡。
- 一个 commit 只提交一个 Task Group。
- 不允许把 paused / blocked 任务文件混入 active 任务 commit。
- 不允许使用 `git add .` 或 `git add -A`。
- 只能显式暂存当前 Task Group 的文件。
- commit 前必须检查 `git diff --cached --stat`。
- 如果 staged 区混入别的任务文件，触发 `FILE_CONFLICT_STOP`。
- 提交前运行该任务要求的验收命令（如 `node test.js`）。

### 五、Ignore Group（自动忽略）

可以自动归入 Ignore Group 的类型：

| 类型 | 示例 |
|---|---|
| 系统文件 | `.DS_Store`, `Thumbs.db` |
| 日志/缓存 | `*.log`, `*.tmp`, `*.cache` |
| 本地生成目录 | `node_modules/`, `dist/`, `build/`, `coverage/`, `.pycache/` |
| 编辑器残留 | `*.swp`, `*.swo`, `.idea/`, `*.bak` |
| 密钥/敏感配置 | `.env`, `.env.*`, `*.pem`, `credentials.*` |
| 临时运行产物 | `test-results/`, `*.curr`, `_apply_*.js` |

处理规则：
1. 如果已被 `.gitignore` 覆盖，只报告，不操作。
2. 如果未被忽略，建议加入 `.gitignore`，生成单独维护提交。
3. 不要把 Ignore Group 文件提交进业务 commit。
4. 不要把 `.env` / token / key 提交。

### 六、Leftovers Group（低风险收口）

Leftovers 条件（全部满足）：
1. 不在任何任务卡 `related_files` 中。
2. 不属于 Ignore Group。
3. 不是高风险文件。
4. 看起来是有效项目文件。
5. 不涉及敏感信息。
6. 不会覆盖其他任务边界。

Leftovers 提交前必须输出：
- 文件列表
- 每个文件的简短判断
- 为什么没有归入具体任务
- 是否有敏感信息 / 大文件 / 删除风险
- 是否需要用户拍板

Leftovers 可以提交，但必须满足：
1. 没有敏感文件（token/密钥/数据库/二进制/压缩包）。
2. 没有大规模删除。
3. 没有核心业务入口的未知修改。
4. 用户没有要求先停。

建议 commit message：`收口未归类项目改动`

### 七、Blocked Group（高风险暂停）

以下文件必须进入 Blocked Group，**不能自动提交**：
1. `.env` / token / key / secret / credential
2. 大型二进制文件、不明来源压缩包
3. 数据库文件、个人隐私文件
4. 大量删除文件、生成目录整体变更
5. 不明来源图片/视频/音频大文件
6. 修改核心业务入口但无任务卡说明
7. 触发了 `FILE_CONFLICT_STOP` 条件
8. AI 无法判断是否安全提交
9. staged 区有不明归属文件
10. 用户明确要求不要提交

处理：不暂存 → 不提交 → 输出风险 → 等用户拍板。

### 八、逐组执行流程

1. 生成 Commit Plan，输出四组分类。
2. 如果有 Blocked Group → 暂停，输出冲突报告，等用户拍板。
3. 如果无 Blocked Group，逐 Task Group 提交：
   - 显式暂存该组文件（列举 `git add <file1> <file2>`）
   - 检查 `git diff --cached --stat`，确认只包含该组
   - 运行验收命令
   - `git commit`
   - 记录 `commit_id`
4. `.gitignore` 维护提交（如需要）。
5. Leftovers 提交（如存在且安全）。
6. 更新任务卡和 `tasks/index.md`。

### 九、提交后更新任务卡

每个 Task Group commit 后，更新对应任务卡：
- `status: DONE`
- `done_at: YYYY-MM-DD HH:mm`
- `commit_id: <hash>`
- `validation_result: <通过/跳过/失败>`
- `remaining_risks: <说明>`
- `updated_at: YYYY-MM-DD HH:mm`

如果 leftover commit 执行了，在 `tasks/index.md` 中追加记录：
```
last_leftovers_commit: <hash>
leftovers_files: <列表>
leftovers_reason: <为什么未归属>
```

### 十、同步内容 / syncontent 接入任务冲突检查

当执行「同步内容」时，启动前必须先执行冲突检查：
1. 读取 `tasks/index.md`。
2. 读取 `tasks/doing/` 和 `tasks/paused/` 下所有任务卡的 `related_files`。
3. 解析 `docs/tables/_changes/pending/` 变更单中的 `affected_files` / `affected_tables`。
4. 检查同步内容要修改的文件是否属于其他任务卡。
5. 检查是否与当前 dirty 文件冲突。
6. 有冲突 → 触发 `FILE_CONFLICT_STOP` 并暂停。
7. 无冲突才允许执行表格同步。

同步完成后，将同步相关文件归入对应任务卡，或新建「表格同步」任务卡。

---

## 冲突报告模板（完整版）

`git-c` 和 `同步内容` 共用此报告格式：

```
检测到文件冲突，已暂停执行。

冲突文件：
  * <文件名>

当前任务：
  * <任务名>

可能冲突任务：
  * <任务名>

当前文件状态：
  * 是否 dirty：是/否
  * 是否 staged：是/否
  * 是否属于当前任务 related_files：是/否/不确定
  * 是否出现在其他任务卡：是/否（列出）

风险：
  * 继续修改会把多个任务的 diff 混在一起
  * 后续提交无法清楚归因
  * 断线恢复时 AI 可能续错任务
  * 旧任务可能被覆盖或误改

建议处理：
  A. 先验收并提交已有改动，再继续当前任务
  B. 当前任务暂停，恢复原任务
  C. 用户确认允许合并处理，并记录 merged_task_scope
  D. 拆分文件改动，分别提交
  E. 将文件归入 leftovers
  F. 将文件加入 ignore group

需要用户拍板：
请选择 A / B / C / D / E / F。
```

用户拍板后记录到相关任务卡：
- `conflict_confirmed_at: YYYY-MM-DD HH:mm`
- `user_decision: <选项>`
- `merged_task_scope: <说明>`
- `affected_files: <列表>`
- `resolved_at: YYYY-MM-DD HH:mm`

---

（本文件最后更新：2026-06-03 16:55）
