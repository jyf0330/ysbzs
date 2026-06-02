# CLAUDE.md · 元素背包史

<!-- ywh: web-game -->

本文件是 Claude 入口薄文件。项目规则入口是 `docs/00_AI_PROJECT_RULES.md`，细则是 `docs/00_AI_WORKFLOW_DETAILS.md`，不要在这里复制完整规则。

## 开始前必须做

1. 开工第一步走变更分类表 → 路由到对应 Superpowers 执行链。
2. 按任务类型创建或更新 `tasks/doing/当前任务.md`，执行 AI 只读任务卡指定范围；只读评审 / 流程审计不创建任务卡。

## 项目信息

- 项目名称：元素背包史（ysbzs）
- 类型：browser-based web game（回合制棋盘战术）
- 工作流：`ywh-game`
- 主文件：`index.html`
- 测试：`node test.js`（当前基准只维护在 `docs/00_CURRENT_CONTEXT.md`，入口文件不要复制数字）

## 核心纪律

- 开工第一步：走变更分类表，确定任务类型后再路由执行链。
- 不允许所有 AI 默认全量读取 `docs/`。
- 一个任务只允许一个 AI 修改同一代码文件，其他 AI 只能审查、验收或写指定文档。
- 归档目录 `docs/99_归档/` 只作历史参考，不是当前规则源头。
- 任意有效改动都要更新 `docs/10_CHANGELOG.md`。
- 代码是事实基线，文档是意图基线。代码或文档冲突时，先列差异清单、冲突点、影响范围和可选方案，不盲选一方。
- 默认自主执行；但遇到破坏性操作、未归属核心改动、代码-文档冲突或 `[NEEDS_REVIEW]` 决策时，先暂停并列出取舍。
- 完成的任务卡归档到 `tasks/done/`，`tasks/doing/当前任务.md` 只保留当前进行中的任务。
- 代码改动默认执行 TDD：bugfix、核心机制、UI 可观察行为、重构或行为变化，必须先写失败测试或复现用例并确认 RED，再改实现。
- subagent 可用于并行审查、验收或文档分析，但不是硬门禁；同一任务仍只允许一个 AI 修改同一代码文件。
- 外部 AI 建议不是项目真实规则；执行以代码/目录/任务卡/正式文档/用户指令为准，只吸收有用部分。
- 商店/经济/成长相关建议优先向《The Bazaar》异步自走棋商店结构对齐。

## 常用命令

- 验证：`node test.js`
- 状态：`git status --short --untracked-files=all`
- 规则入口：`docs/00_AI_PROJECT_RULES.md`
