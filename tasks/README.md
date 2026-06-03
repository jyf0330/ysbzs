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

（本文件由任务管理制度落地生成，2026-06-03）
