# CLAUDE.md · 元素背包史

<!-- ywh: web-game -->

本文件是 Claude 入口薄文件。项目规则入口是 `docs/00_AI_PROJECT_RULES.md`，细则是 `docs/00_AI_WORKFLOW_DETAILS.md`。

## 必读

- 先调用并阅读 `ywh-game` skill。
- 再读 `docs/00_AI_PROJECT_RULES.md`。
- 再读 `docs/00_AI_WORKFLOW_DETAILS.md`（特别是执行纪律总纲、Codex Goal 适配、Goal Skill Hooks 表、变更分类、建议来源与执行优先级）。
- 开始前运行 `git status --short --untracked-files=all`；如有非 `.omx/` 改动，继续读 `git diff --stat` 和必要 diff 摘要。
- 开工第一步走变更分类表 → 路由到对应执行链。
- 执行前使用或更新 `tasks/doing/当前任务.md`，只读取任务卡指定范围；只读评审 / 流程审计不创建任务卡。

## 项目约束

- 主文件：`index.html`，保持单文件架构。
- 测试：`node test.js`，当前基准只维护在 `docs/00_CURRENT_CONTEXT.md`。
- `[NEEDS_REVIEW]` / `BLOCKED_FOR_DOCS` 决策未拍板前禁止开工实现。
- 归档文档：`docs/99_归档/` 只作历史参考。
- “同步 ywh 工作流”只同步项目工作流结构与 AI 入口，不改 `index.html`、`test.js` 或游戏核心代码。
- 任意有效改动后更新 `docs/10_CHANGELOG.md`。
- 代码是事实基线，文档是意图基线；冲突时先列差异清单再逐项判断。
- 默认自主执行；但遇到破坏性操作、未归属核心改动、代码-文档冲突或 `[NEEDS_REVIEW]` 决策时，先暂停并列出取舍。
- 完成的任务卡归档到 `tasks/done/`，`tasks/doing/当前任务.md` 只保留当前进行中的任务。
- 代码改动默认执行 TDD：bugfix、核心机制、UI 可观察行为、重构或行为变化，必须先写失败测试或复现用例并确认 RED，再改实现。
- subagent 可用于并行审查、验收或文档分析，但不是硬门禁；同一任务仍只允许一个 AI 修改同一代码文件。
- 外部 AI/ChatGPT 建议不是项目真实规则；执行以代码/目录/任务卡/正式文档/用户指令为准，只吸收有用部分。
- 商店/经济/成长相关建议优先向《The Bazaar》异步自走棋商店结构对齐。

## 禁止

- 禁止跳过变更分类。
- 禁止 `[NEEDS_REVIEW]` / `BLOCKED_FOR_DOCS` 未拍板时开工实现。
- 禁止所有 AI 默认全量读取 `docs/`。
- 禁止多个 AI 同时修改同一代码文件。
- 禁止把归档草稿当成当前规则源头。
