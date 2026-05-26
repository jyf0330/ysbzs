# AI 项目总规则 · 元素背包史

## 必读顺序

1. 调用并阅读 `ywh-game` skill。
2. 读取本文件。
3. 读取 [docs/00_AI_WORKFLOW_DETAILS.md](./00_AI_WORKFLOW_DETAILS.md)。
4. 运行 `git status --short --untracked-files=all`。
5. 按任务类型决定是否创建或更新 `tasks/doing/当前任务.md`。

## 项目标识

- 项目：元素背包史（ysbzs）
- 类型：`game`
- 工作流：`ywh-game`
- 仓库：`git@github.com:jyf0330/ysbzs.git`
- 主文件：`index.html`（单文件原型，禁止无故拆分）
- 测试：`node test.js`（当前基准：244/244）

## 硬红线

- 禁止跳过 `ywh-game` 和 [docs/00_AI_WORKFLOW_DETAILS.md](./00_AI_WORKFLOW_DETAILS.md)。
- 禁止默认全量读取 `docs/` 或源码。
- 禁止把归档文档当成当前规则。
- 禁止多个 AI 同时修改同一代码文件。
- 禁止未读 `git diff --stat` / 必要 diff 摘要就汇报未归属改动。
- 禁止文档未同步就 `git add` / `git commit` / `git push`。
- 禁止把“同步 ywh 工作流”理解成业务代码重构。

## 快捷口令

- `同步 ywh 工作流`：以上游 `ywh` / `ywh-game` 为准，只同步项目工作流结构与 AI 入口，不改 `index.html`、`test.js` 或游戏核心代码。
- `只读评审 / 流程审计`：只判断、解释、审查建议或分析流程风险；不改文件、不更新 CHANGELOG、不进入 Git 收尾。

## 语言策略

本项目规则使用中文为主，保留英文命令、路径、固定关键词和必要短句。原因是项目文档和用户决策均为中文；全英文会降低维护效率，纯中文又会削弱命令/工具语义。

## 细则入口

所有细则维护在 [docs/00_AI_WORKFLOW_DETAILS.md](./00_AI_WORKFLOW_DETAILS.md)，包括：

- 任务分流与最小读取
- 工作区状态必读门禁
- graphify 使用边界
- Demo 阶段文档门禁
- 文档同步规则
- 验证后文档同步与 Git 收尾判断
- 代码与文档不一致处理
