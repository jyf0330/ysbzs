# 任务系统

本目录用于在多 AI/多任务环境中占用修改名额，避免不同任务同时改同一文件。

## 目录

- `index.md`: 当前任务总览与恢复入口。
- `doing/`: ACTIVE 任务，最多 1 个。
- `paused/`: 暂停任务。
- `done/`: 已归档任务。

## 开工门禁

准备修改代码、功能行为、项目规则或会影响交付的文档前：

1. 读取 `docs/02_CURRENT_WORKFLOW.md` 和本文件。
2. 运行 `git status --short --untracked-files=all`。
3. 读取 `tasks/index.md`、`tasks/doing/*.md`、`tasks/paused/*.md`。
4. 创建或更新 `tasks/doing/当前任务.md`，写清 `task_id`、目标、`related_files`、验证命令和 `commit_plan`。
5. 检查本轮要改文件是否与其他任务卡 `related_files` 重叠。

## FILE_CONFLICT_STOP

出现以下任一情况必须暂停，输出冲突报告并等待用户拍板：

- `tasks/doing/` 已有其他 ACTIVE 任务。
- 本轮要改文件与其他任务卡 `related_files` 重叠。
- 工作区脏文件无法归属到当前任务，且会影响本轮提交边界。
- 暂存区已有不属于当前任务的文件。

## 收尾

任务完成后：

1. 运行任务卡里的验证命令。
2. 更新任务卡的验证结果、文档同步、提交状态。
3. 如满足自动提交条件，精确暂存当前任务文件并提交。
4. 将任务卡移动到 `tasks/done/<task_id>.md`。
5. 更新 `tasks/index.md`。

禁止 `git add .` 或 `git add -A`。
