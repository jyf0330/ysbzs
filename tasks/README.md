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
2. 如果任务涉及 UI、棋盘、可见预览、交互反馈、布局或文案可读性，必须先完成提交前可见验收门禁：
   - 派独立测试子线程在真实浏览器里操作页面执行验收。
   - 如果当前工具没有可用子线程，执行独立 tester pass，并在任务卡记录 `TEST_SUBTHREAD_UNAVAILABLE` 与替代验证命令。
   - 测试动作必须包含真实玩家操作，例如按钮点击、棋盘点击、hover、结束回合、dispatch 或 `autoExecuteTurn`；`/api/action`、DOM / ViewModel 断言只能作为辅助证据。
   - 截图证据必须来自正式界面和玩家可实际触发的正式流程；不得用临时构造存档、`localStorage`/`importSave` 注入、`page.evaluate` 改状态、调试对象、内部函数或一次性脚本直接制造目标画面来替代验收。
   - 构造状态只允许作为单元测试、辅助诊断或复现说明；如果目标状态不能从正式界面自然到达，必须记录 blocked/Commit Plan，不能用构造场景截图冒充通过。
   - 截图必须保存到 `output/playwright/` 或任务卡指定路径。
   - 任务卡必须记录正式界面操作步骤、截图路径、关键 DOM / ViewModel / 状态断言、console error 结果，并说明未使用构造存档或内部状态注入作为截图主证据。
   - 主线程必须查看截图并记录“截图效果正确、无明显问题”后，才允许进入提交检查。
3. 更新任务卡的验证结果、文档同步、提交状态。
4. 如满足自动提交条件，精确暂存当前任务文件并提交。
5. 将任务卡移动到 `tasks/done/<task_id>.md`。
6. 更新 `tasks/index.md`。

禁止 `git add .` 或 `git add -A`。
