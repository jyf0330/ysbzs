# 任务系统

本目录用于在多 AI/多任务环境中记录写入租约。高风险文件用 `exclusive_files` 独占；普通同文件改动用 `write_scopes` 拆到函数、选择器、测试块或文档章节，允许多个 AI 在不碰同一语义接口的前提下并行推进。

## 目录

- `index.md`: 当前任务总览与恢复入口；这是维护索引，不是普通功能任务的独占实现文件，也不是唯一冲突源。
- `doing/`: ACTIVE 任务卡，可有多个；是否冲突由文件级租约判断。
- `paused/`: 暂停任务。
- `done/`: 已归档任务。

## 什么时候需要任务卡

需要创建或更新任务卡：

- 修改代码、测试、UI、数据、生成物、项目规则、工作流文档或交付资产。
- 继续一个已有 dirty/未收口任务。
- 做 `git-c`、归档任务、提交或推送前的收口。

不创建任务卡：

- 只读源码定位、source-of-truth 查询、流程审计、简单命令检查。
- 以 `diff` 或 `策划` 结尾的只读/策划模式。
- 用户只问“要不要做 / 怎么做 / 是否值得”且本轮不落盘改文件。

## 任务状态

`tasks/doing/` 中的任务卡必须使用以下状态之一：

- `ACTIVE_IMPL`: 正在实现，声明 `related_files` 和具体 `write_scopes` 写入范围。
- `ACTIVE_TEST`: 实现完成，等待独立 tester pass 或补充验证证据。
- `READY_TO_MERGE`: 验证证据齐全，等待 Lead 做最终集成、精确暂存和提交。
- `BLOCKED`: 冲突、验收失败、正式流程不可达或需要用户拍板。

`tasks/paused/` 中的任务状态为 `PAUSED`；`tasks/done/` 中的任务状态为 `DONE`。

## 开工门禁

准备修改代码、功能行为、项目规则或会影响交付的文档前：

1. 读取 `docs/02_CURRENT_WORKFLOW.md` 和本文件。
2. 运行 `git status --short --untracked-files=all`。
3. 读取 `tasks/index.md`、`tasks/doing/*.md`、`tasks/paused/*.md`。
4. 创建或更新 `tasks/doing/当前任务.md`，开工时只写薄任务卡字段。
5. 检查本轮要改文件是否与其他任务卡 `exclusive_files` 重叠；若只与 `related_files` 重叠，继续比较 `write_scopes`。
6. 检查 dirty/staged 文件是否能归属到当前任务或其他任务卡；不能归属且会影响提交边界时，触发 `FILE_CONFLICT_STOP`。

薄任务卡开工必填字段：

- `task_id`
- `status`
- `owner`: 负责实现或集成的 AI / 线程 / worker 名称；未知时写 `unknown`。
- `Goal`
- `related_files`: 当前任务可能写入的文件集合，用于提交归属和粗略检索，不等于整文件独占。
- `write_scopes`: 文件内真实写入范围。至少写清 file、scope、mode；scope 写到函数/导出对象/CSS selector/测试 describe 或 fixture/文档章节/生成物分区。
- `exclusive_files`: 高风险共享文件；同一时刻只允许一个 ACTIVE 任务占用。没有时写 `无`。
- `validation`
- `commit_plan`

需要时再补字段：

- `type`
- `branch` 或 `worktree`: 当前分支或工作区；不适用时写 `shared-worktree`。
- `Scope`
- `shared_file_policy`: 当 `related_files` 与其他任务重叠时，说明为什么可以并行、如何合并、谁做最终验证。
- `read_files`: 只读参考文件；不形成写入租约。
- `collaboration`: Lead / Specialist / Tester / External AI 输入和决策摘要。
- `merge_owner`: 同一文件由多个 AI 贡献时，负责最终 patch 合并、验证和提交的 Lead；没有同文件并行时可省略。

验证证据、截图路径、浏览器操作步骤、失败复盘和外部 AI 结论只在对应步骤发生后追加，不要在开工卡里预写长篇报告。

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
- `docs/10_CHANGELOG.md`

这些文件不是永久禁止并行，但默认需要显式独占；如果多个任务都要改，Lead 必须先拆分顺序、改为 `patch_only` / 独立 worktree，或合并任务边界。

例外：`tasks/index.md` 是维护索引，不作为普通功能任务的 `exclusive_files`。任何 Lead 在开工、收口或 `git-c` 时都可以按真实 `tasks/doing` / `tasks/paused` / `tasks/done` 刷新它；旧任务卡若把它列为独占文件，视为过期记录，不得阻止索引维护。

`write_scopes` 的 `mode` 取值：

- `direct`: 可以在共享 worktree 直接修改，但必须和其他任务的 `write_scopes` 不重叠。
- `patch_only`: Worker 只输出 patch/建议，不直接写源文件；由 Lead 合并。
- `worktree`: Worker 在独立 worktree/branch 修改，Lead 后续 cherry-pick 或手工合并。

同文件并行允许的典型边界：

- 同一 JS 文件的不同函数或不同导出对象。
- 同一 CSS 文件的不同 selector 区域。
- 同一测试文件的不同 `describe` 块或 fixture。
- 同一文档的不同章节。

同文件仍必须停下或合并为单任务的边界：

- 同一个函数、reducer 分支、公开 ViewModel 字段、CSV/export 合同、状态 schema、事件 payload 或 action command。
- 一个任务会改变另一个任务的验证前提。
- 多个任务都要写同一个生成物，且生成输入不同或顺序不可交换。

## FILE_CONFLICT_STOP

出现以下任一情况必须暂停，输出冲突报告并等待用户拍板：

- 本轮要改文件与其他 ACTIVE 任务卡 `exclusive_files` 重叠。
- 本轮要改文件只与其他 ACTIVE / PAUSED 任务卡 `related_files` 重叠，但任一方缺少 `write_scopes` / `shared_file_policy`，或 scope 边界不清。
- 本轮 `write_scopes` 与其他任务重叠，或指向同一语义接口。
- 本轮任务需要改高风险共享文件，但没有在任务卡 `exclusive_files` 中声明。
- 工作区脏文件无法归属到当前任务，且会影响本轮提交边界。
- 暂存区已有不属于当前任务的文件。
- `tasks/index.md` 与真实 `tasks/doing/` / `tasks/paused/` / `tasks/done/` 目录不一致，且本轮要依赖它做提交边界判断；此时先刷新 index，而不是把 index 视为被旧任务独占。
- 多个 AI 对同一任务卡的 `owner` / `related_files` / `exclusive_files` 记录不一致。

不再因为 `tasks/doing/` 中存在其他 ACTIVE 任务或普通 `related_files` 重叠而自动停止；只有独占文件、`write_scopes`、同一语义接口、dirty/staged 边界或任务卡记录冲突时才停止。

例外：`web/js/local-engine.js` 是本地浏览器 runtime 的生成产物。凡是源码改动会影响浏览器行为，必须运行 `node tools/build_local_engine_bundle.cjs` 重建它；不得因为该生成文件被其他任务卡列入 `related_files` 或当前工作区有 dirty core/UI 改动而跳过 build。生成 bundle 会反映当前工作区源码快照，任务卡需要记录这一点，提交分组仍由 `git-c` 或 Lead 后续精确归属。

## 并行协作规则

Lead 可以拆出多个 `ACTIVE_IMPL` 任务。`exclusive_files` 不得重叠；普通 `related_files` 可以重叠，但必须有不重叠的 `write_scopes` 和明确的 `shared_file_policy`。

- 实现 AI 只写自己任务卡的 `related_files` 中声明的 `write_scopes`。
- Specialist 默认只读；若需要写文件，必须成为独立任务卡或由 Lead 明确加入当前任务 `related_files`。
- Tester Pass 只写 `output/playwright/` 和任务卡证据；不得改实现文件。
- External AI 不直接提交，不直接改主线任务卡；Lead 必须复核并筛选其输出。
- 共享接口变更必须先占用对应 `exclusive_files` 或把相关任务合并到同一个 Lead 下，并在 `Scope` 中写清下游影响。
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
7. 更新 `tasks/index.md`。`tasks/index.md` 是维护索引，不能因为旧任务卡声明独占而跳过刷新。

`READY_TO_MERGE` 不应长期堆在 `tasks/doing/`。开始新共享 UI/core 改动前，如果 `READY_TO_MERGE` / `BLOCKED` 卡片已经明显堆积，Lead 应先运行 `git-c` 或至少刷新 index 并输出当前收口计划。

禁止 `git add .` 或 `git add -A`。

## git-c 集成细则

`git-c` 是全工作区任务感知收口提交器。它必须按任务卡边界尽量分组，但最终目标是工作区干净、所有收口 commit 已推送；模糊边界只能降低说明精度，不能成为留下 dirty 文件的理由。

Phase 1 诊断：

1. 读取 `tasks/index.md`。
2. 读取所有 `tasks/doing/*.md`、`tasks/paused/*.md` 和相关 `tasks/done/*.md`。
3. 检查 `git status --short --untracked-files=all`、`git diff`、`git diff --cached`。
4. 对每个 dirty/staged/untracked 文件找到唯一归属任务卡；无法唯一归属时记录可得证据、可能来源、风险和推荐 commit 归类。
5. 检查当前分支、upstream 和 push 目标；没有 upstream 时先建立或把无法 push 记录为真实 blocker。

Phase 2 分类：

- `Task Groups`: 可唯一归属到某个任务卡 `related_files` 的文件组，或同一文件中可按 `write_scopes` 拆分的 patch 组。
- `Fuzzy Groups`: 有效项目文件但边界模糊；按能提供的信息做 best-effort 收口提交，commit body 写清不确定性和后续复核点。
- `Cleanup Group`: 明显垃圾、临时文件、应 gitignore 的文件；能安全删除就删除，应该忽略就补 `.gitignore`，有交付价值就作为 artifact 提交。
- `Blocker Group`: 秘密/token、破坏性删除、未知大型二进制、无法解决的合并冲突、无远端/认证/网络导致无法 push 等真实外部阻塞。

Phase 3 执行：

1. 每个 `Task Group` 单独验证、精确暂存、单独提交；同一文件中只属于当前任务的 hunk 用 `git add -p` 或等价精确暂存。
2. 每个提交只能包含一个任务的文件。
3. UI / 棋盘 / 可见反馈任务必须先满足提交前可见验收门禁。
4. `tasks/index.md` 和 `docs/10_CHANGELOG.md` 可以作为收口文件加入对应任务提交；如果包含多个任务内容，Lead 必须拆成多个精确补丁或单独做 workflow / changelog maintenance commit。
5. `Fuzzy Groups` 和 `Cleanup Group` 也必须被提交、删除或忽略规则收口；不能在最终状态留下 dirty/untracked 文件。
6. 存在 `Blocker Group` 时先尝试在本轮解决；只有秘密、破坏性风险、无法解决冲突或无法 push 这类真实阻塞允许最终不干净/未推送，并必须逐文件报告。
7. 收尾必须验证 `git status --short --untracked-files=all` 无输出，随后 `git push` 当前分支/upstream，并复核 push 成功。
