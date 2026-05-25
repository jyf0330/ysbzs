<!-- AUTONOMY DIRECTIVE — DO NOT REMOVE -->
YOU ARE AN AUTONOMOUS CODING AGENT. EXECUTE TASKS TO COMPLETION WITHOUT ASKING FOR PERMISSION.
DO NOT STOP TO ASK "SHOULD I PROCEED?" — PROCEED. DO NOT WAIT FOR CONFIRMATION ON OBVIOUS NEXT STEPS.
IF BLOCKED, TRY AN ALTERNATIVE APPROACH. ONLY ASK WHEN TRULY AMBIGUOUS OR DESTRUCTIVE.
USE CODEX NATIVE SUBAGENTS FOR INDEPENDENT PARALLEL SUBTASKS WHEN THAT IMPROVES THROUGHPUT. THIS IS COMPLEMENTARY TO OMX TEAM MODE.
<!-- END AUTONOMY DIRECTIVE -->

# AGENTS.md · 元素背包史

本文件是 AI 入口薄文件。项目规则入口是 `docs/00_AI_PROJECT_RULES.md`，细则是 `docs/00_AI_WORKFLOW_DETAILS.md`，不要在这里复制完整规则。

## 开始前必须做

1. 调用并阅读 `ywh-game` skill。
2. 阅读 `docs/00_AI_PROJECT_RULES.md`。
3. 阅读 `docs/00_AI_WORKFLOW_DETAILS.md`。
4. 运行 `git status --short --untracked-files=all`，把既有改动和本轮改动分开。
5. 按任务类型创建或更新 `tasks/doing/当前任务.md`，执行 AI 只读任务卡指定范围。

## 项目信息

- 项目名称：元素背包史（ysbzs）
- 类型：browser-based web game（回合制棋盘战术）
- 工作流：`ywh-game`
- 主文件：`index.html`（单文件，所有 CSS/HTML/JS 内联，禁止无故拆分）
- 测试：`node test.js`（当前基准：199 项，全部通过）

## 核心纪律

- 用户说“同步 ywh 工作流”时，固定含义是：以上游 `ywh` / `ywh-game` 为准，只同步项目工作流结构与 AI 入口，不改 `index.html`、`test.js` 或游戏核心代码。
- 不允许所有 AI 默认全量读取 `docs/`。
- 一个任务只允许一个 AI 修改同一代码文件，其他 AI 只能审查、验收或写指定文档。
- 归档目录 `docs/99_归档/` 只作历史参考，不是当前规则源头。
- 任意有效改动都要更新 `docs/10_CHANGELOG.md`。
- 代码或文档冲突时，先列冲突点、影响范围和可选方案，不要自行抹平。

## 常用命令

- 验证：`node test.js`
- 状态：`git status --short --untracked-files=all`
- 规则入口：`docs/00_AI_PROJECT_RULES.md`
