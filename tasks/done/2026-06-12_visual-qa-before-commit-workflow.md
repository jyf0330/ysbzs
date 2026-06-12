# 2026-06-12_visual-qa-before-commit-workflow

## task_id

2026-06-12_visual-qa-before-commit-workflow

## 类型

工作流规则变更

## 目标

把 UI / 棋盘 / 可见预览 / 交互反馈类变更的收尾顺序改成：实现与本地验证后，必须先派独立测试子线程或等价独立测试流程在真实浏览器里操作页面，产出截图与 DOM / ViewModel / console 辅助证据；主线程复核截图效果正确后，才能进入自动提交检查。

## related_files

- `AGENTS.md`
- `docs/00_AI_START_HERE.md`
- `docs/02_CURRENT_WORKFLOW.md`
- `tasks/README.md`
- `tasks/index.md`
- `tasks/doing/2026-06-12_visual-qa-before-commit-workflow.md`
- `tasks/done/2026-06-12_visual-qa-before-commit-workflow.md`

## 验证命令

- `git diff --check`
- `git status --short --untracked-files=all`

## commit_plan

`docs: 强化可见变更提交前截图验收`

## 约束

- 只改当前工作流规则文档。
- 不修改游戏核心、UI 实现或测试代码。
- 不伪造测试子线程结果；规则只定义之后的执行门槛。

## 进展

- 2026-06-12：开工，已确认现有规则只要求测试通过和任务卡条件，没有把截图验收作为提交前硬门槛。
- 2026-06-12：已在 `AGENTS.md`、`docs/02_CURRENT_WORKFLOW.md`、`tasks/README.md`、`docs/00_AI_START_HERE.md` 增加可见变更提交前验收门禁：测试子线程或等价 tester pass -> 真实入口 -> 截图与 DOM / ViewModel / console 证据 -> 主线程截图复核 -> 自动提交检查。
- 2026-06-12：按最新用户口径收紧：测试子线程必须真实在浏览器里操作页面，截图看效果是否正确；`/api/action`、DOM / ViewModel 断言只能作为辅助证据。
- 2026-06-12：仓库内未发现 `docs/10_CHANGELOG.md`，本轮不新建 changelog；以本任务卡记录工作流变更。

## 验证记录

- `rg -n "测试子线程|tester pass|真实浏览器|操作页面|截图|自动提交检查|可见验收门禁|TEST_SUBTHREAD_UNAVAILABLE" AGENTS.md docs/00_AI_START_HERE.md docs/02_CURRENT_WORKFLOW.md tasks/README.md`：通过，四个入口均包含新门禁关键词。
- `git diff --check`：通过。
- `git status --short --untracked-files=all`：仅本任务文件变更。

## 提交状态

- 已满足当前工作流文档任务收口条件，按任务卡 `commit_plan` 随本轮收口提交。
