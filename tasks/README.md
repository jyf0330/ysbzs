# 任务系统

本目录用于在多 AI/多任务环境中占用文件级写入租约，避免不同任务同时改同一文件，同时允许多个 AI 在互不重叠的文件范围内并行推进。

## 目录

- `index.md`: 当前任务总览与恢复入口；这是汇总视图，不是唯一冲突源。
- `doing/`: ACTIVE 任务卡，可有多个；是否冲突由文件级租约判断。
- `paused/`: 暂停任务。
- `done/`: 已归档任务。

## 任务状态

`tasks/doing/` 中的任务卡必须使用以下状态之一：

- `ACTIVE_IMPL`: 正在实现，占用 `related_files` 写入租约。
- `ACTIVE_TEST`: 实现完成，等待独立 tester pass 或补充验证证据。
- `READY_TO_MERGE`: 验证证据齐全，等待 Lead 做最终集成、精确暂存和提交。
- `BLOCKED`: 冲突、验收失败、正式流程不可达或需要用户拍板。

`tasks/paused/` 中的任务状态为 `PAUSED`；`tasks/done/` 中的任务状态为 `DONE`。

## 开工门禁

准备修改代码、功能行为、项目规则或会影响交付的文档前：

1. 读取 `docs/02_CURRENT_WORKFLOW.md` 和本文件。
2. 运行 `git status --short --untracked-files=all`。
3. 读取 `tasks/index.md`、`tasks/doing/*.md`、`tasks/paused/*.md`。
4. 创建或更新 `tasks/doing/当前任务.md`，写清任务卡必填字段。
5. 检查本轮要改文件是否与其他任务卡 `related_files` / `exclusive_files` 重叠。
6. 检查 dirty/staged 文件是否能归属到当前任务或其他任务卡；不能归属且会影响提交边界时，触发 `FILE_CONFLICT_STOP`。

任务卡必填字段：

- `task_id`
- `type`
- `status`
- `owner`: 负责实现或集成的 AI / 线程 / worker 名称；未知时写 `unknown`。
- `branch` 或 `worktree`: 当前分支或工作区；不适用时写 `shared-worktree`。
- `Goal`
- `Scope`
- `related_files`: 当前任务可写文件租约。
- `exclusive_files`: 高风险共享文件；同一时刻只允许一个 ACTIVE 任务占用。没有时写 `无`。
- `read_files`: 只读参考文件；不形成写入租约。
- `validation`
- `commit_plan`
- `collaboration`: Lead / Specialist / Tester / External AI 输入和决策摘要。

高风险共享文件示例：

- `src/core/reducer.cjs`
- `src/core/state.cjs`
- `src/uiAdapter.cjs`
- `src/uiAdapterCommands.cjs`
- `web/js/main.js`
- `web/ux-app.js`
- `tests/ui_adapter.test.cjs`
- `docs/02_CURRENT_WORKFLOW.md`
- `tasks/README.md`
- `tasks/index.md`
- `docs/10_CHANGELOG.md`

这些文件不是永久禁止并行，而是默认需要显式独占；如果多个任务都要改，Lead 必须先拆分顺序或合并任务边界。

## FILE_CONFLICT_STOP

出现以下任一情况必须暂停，输出冲突报告并等待用户拍板：

- 本轮要改文件与其他 ACTIVE / PAUSED 任务卡 `related_files` 重叠。
- 本轮要改文件与其他 ACTIVE 任务卡 `exclusive_files` 重叠。
- 本轮任务需要改高风险共享文件，但没有在任务卡 `exclusive_files` 中声明。
- 工作区脏文件无法归属到当前任务，且会影响本轮提交边界。
- 暂存区已有不属于当前任务的文件。
- `tasks/index.md` 与真实 `tasks/doing/` / `tasks/paused/` / `tasks/done/` 目录不一致，且本轮要依赖它做提交边界判断。
- 多个 AI 对同一任务卡的 `owner` / `related_files` / `exclusive_files` 记录不一致。

不再因为 `tasks/doing/` 中存在其他 ACTIVE 任务而自动停止；只有文件租约、独占文件、dirty/staged 边界或任务卡记录冲突时才停止。

## 并行协作规则

Lead 可以拆出多个 `ACTIVE_IMPL` 任务，只要它们的 `related_files` 和 `exclusive_files` 不重叠。

- 实现 AI 只写自己任务卡的 `related_files`。
- Specialist 默认只读；若需要写文件，必须成为独立任务卡或由 Lead 明确加入当前任务 `related_files`。
- Tester Pass 只写 `output/playwright/` 和任务卡证据；不得改实现文件。
- External AI 不直接提交，不直接改主线任务卡；Lead 必须复核并筛选其输出。
- 共享接口变更必须先占用对应 `exclusive_files`，并在 `Scope` 中写清下游影响。
- 如果一个任务完成后会影响另一个任务的验证，后者在 `merge_order` 或 `collaboration` 中记录依赖顺序。

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
3. 更新任务卡的验证结果、文档同步、提交状态，并把状态改为 `READY_TO_MERGE` 或 `BLOCKED`。
4. Lead 做集成检查：确认该任务文件集合与其他任务卡、dirty 文件和暂存区不混杂。
5. 如满足自动提交条件，精确暂存当前任务文件并提交。
6. 将任务卡移动到 `tasks/done/<task_id>.md`。
7. 更新 `tasks/index.md`。如果 `tasks/index.md` 被其他 ACTIVE 任务占用，先把当前任务标记为 `READY_TO_MERGE`，等待 `git-c` 或 Lead 集成。

禁止 `git add .` 或 `git add -A`。

## git-c 集成细则

`git-c` 是多任务批量收口提交器，必须按任务卡边界分组。

Phase 1 诊断：

1. 读取 `tasks/index.md`。
2. 读取所有 `tasks/doing/*.md`、`tasks/paused/*.md` 和相关 `tasks/done/*.md`。
3. 检查 `git status --short --untracked-files=all`、`git diff`、`git diff --cached`。
4. 对每个 dirty/staged 文件找到唯一归属任务卡。

Phase 2 分类：

- `Task Groups`: 可唯一归属到某个任务卡 `related_files` 的文件组。
- `Ignore Group`: 明显垃圾文件或已 gitignore 文件。
- `Leftovers Group`: 有效项目文件但暂时无法归属，低风险，可单独提交或等待用户确认。
- `Blocked Group`: 高风险共享文件冲突、多个任务同时声称拥有、暂存区混杂、验证缺失或 UI 证据缺失。

Phase 3 执行：

1. 每个 `Task Group` 单独验证、精确暂存、单独提交。
2. 每个提交只能包含一个任务的文件。
3. UI / 棋盘 / 可见反馈任务必须先满足提交前可见验收门禁。
4. `tasks/index.md` 和 `docs/10_CHANGELOG.md` 可以作为收口文件加入对应任务提交；如果包含多个任务内容，Lead 必须拆成多个精确补丁或单独做 workflow / changelog maintenance commit。
5. 存在 `Blocked Group` 时不得继续自动提交。
