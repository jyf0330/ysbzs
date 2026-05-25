# CLAUDE.md · 元素背包史

本文件是 Claude 入口薄文件。项目规则入口是 `docs/00_AI_PROJECT_RULES.md`，细则是 `docs/00_AI_WORKFLOW_DETAILS.md`。

## 必读

- 先调用并阅读 `ywh-game` skill。
- 再读 `docs/00_AI_PROJECT_RULES.md`。
- 再读 `docs/00_AI_WORKFLOW_DETAILS.md`。
- 开始前运行 `git status --short --untracked-files=all`。
- 执行前使用或更新 `tasks/doing/当前任务.md`，只读取任务卡指定范围。

## 项目约束

- 主文件：`index.html`，保持单文件架构。
- 测试：`node test.js`，当前基准 199/199。
- 归档文档：`docs/99_归档/` 只作历史参考。
- “同步 ywh 工作流”只同步项目工作流结构与 AI 入口，不改 `index.html`、`test.js` 或游戏核心代码。
- 任意有效改动后更新 `docs/10_CHANGELOG.md`。

## 禁止

- 禁止跳过变更分类。
- 禁止所有 AI 默认全量读取 `docs/`。
- 禁止多个 AI 同时修改同一代码文件。
- 禁止把归档草稿当成当前规则源头。
