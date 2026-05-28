# 已归档任务卡 · skill 流程优化

## 任务类型

工作流规则变更 / 文档治理

## 任务目标

落地 skill 流程优化：统一入口文件的测试基准来源，明确只读评审不创建任务卡，补充任务卡生命周期，收紧脏工作区门禁，并写清自主执行的暂停边界。

## 完成状态

已完成（2026-05-28）

## 允许读取

- `AGENTS.md`
- `CLAUDE.md`
- `.github/copilot-instructions.md`
- `docs/00_AI_PROJECT_RULES.md`
- `docs/00_AI_WORKFLOW_DETAILS.md`
- `docs/00_CURRENT_CONTEXT.md`
- `docs/10_CHANGELOG.md`
- `tasks/doing/当前任务.md`

## 允许修改

- `AGENTS.md`
- `CLAUDE.md`
- `.github/copilot-instructions.md`
- `docs/00_AI_PROJECT_RULES.md`
- `docs/00_AI_WORKFLOW_DETAILS.md`
- `docs/00_CURRENT_CONTEXT.md`
- `docs/10_CHANGELOG.md`
- `tasks/doing/当前任务.md`
- `tasks/done/2026-05-26-商店系统.md`
- `tasks/done/2026-05-28-skill-flow-optimization.md`

## 禁止

- 不修改 `index.html`、`test.js` 或任何游戏核心代码。
- 不接管当前未归属的 `index.html` 改动。
- 不把测试基准数字复制到多个入口文件。

## 验收

- `rg` 确认入口文件不再保留过期测试基准数字。
- `rg` 确认入口文件指向 `docs/00_CURRENT_CONTEXT.md` 作为测试基准来源。
- `git diff --check` 通过。
