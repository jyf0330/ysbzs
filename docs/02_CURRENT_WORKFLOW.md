# 02_CURRENT_WORKFLOW · AI 工作流与执行纪律

本文档定义 AI 在本项目中必须遵守的工作流程和执行纪律。

## 1. 开工第一步：任务分类

确定任务类型 → 路由到对应执行链。不要先写代码再分类。

| 任务类型 | 流程 |
|---|---|
| 大需求/新模块 | `brainstorming` → `writing-plans` → 设计批准 → 执行 |
| 排查/修 bug/验收 | `systematic-debugging` → `test-driven-development` |
| 有书面实施计划 | 按计划执行 |
| 中等改动 | 更新相关文档 + 短 plan + 执行 |
| 小修改/修 bug | 最小任务卡 + TDD + 验证 |
| 只读评审/流程审计 | 不创建任务卡，不改文件 |

### Superpowers skill 解析口径

- 本文中的 `using-superpowers`、`brainstorming`、`writing-plans`、`executing-plans`、`subagent-driven-development`、`using-git-worktrees`、`verification-before-completion`、`systematic-debugging`、`test-driven-development`、`finishing-a-development-branch` 是真实 skill 名称。
- 本项目的 YWH 适配 skill 是 `ywh`、`ywh-game`、`ywh-web-game`、`ywh-app`；它们只承载个人/项目约定，不复制 Superpowers 或专项 skill 正文。
- 在 Codex 本机，Superpowers 子 skill 的标准位置是 `~/.codex/skills/superpowers/skills/<skill-name>/SKILL.md`；共享源是 `~/ai-shared-config/skills/superpowers/skills/<skill-name>/SKILL.md`。
- Claude / 通用 agent 安装目标分别是 `~/.claude/skills/` 与 `~/.agents/skills/`；同名 skill 可以是顶层安装，也可以位于 `superpowers/skills/<skill-name>/SKILL.md`。
- 不要只按 `~/.codex/skills/<skill-name>/SKILL.md` 判断缺失；部分 skill 以 Superpowers 子目录形式安装。
- 如果某个 AI 工具确实缺少对应 skill，本轮不得伪造已调用；在任务卡或最终报告写 `UNAVAILABLE`，并退回本文件的 TDD、任务卡、验证和文档同步规则。
- 项目任务中不要临时从 registry 安装 skill，除非用户明确要求处理技能安装/同步。

### 三层规则边界

| 层 | 存放内容 | 本项目口径 |
|---|---|---|
| 项目共同规则 | 项目内所有 AI 都要遵守的任务分类、TDD、文档同步、验收和降级规则 | 只在 `docs/00_AI_START_HERE.md`、本文和角色入口维护 |
| 各 AI 工具技能 | 各工具自己的真实 `SKILL.md` / 插件 / 内置能力 | Codex、Claude、agent 各自安装；Cursor 等工具按自身 skill / rules 机制处理 |
| 个人工作流 | 跨项目的 YWH 路由、共享 skill 来源、同步原则 | 维护在 `~/Desktop/AI-Memory-Pack/10-workflows.md` 和 `~/ai-shared-config/skills` |

## 2. 代码基线 vs 文档基线

- **代码**是事实基线（代表当前实际行为）。
- **文档**是意图基线（代表设计目标）。
- 冲突时：先列差异清单 → 每个冲突点逐项判断 → 用户选择前不得擅自同时改代码和文档。
- 默认不以盲选方式"以代码为准"或"以文档为准"。

## 3. TDD 硬门禁

### 适用范围

Bugfix、核心机制、UI 可观察行为、重构、状态结构或行为变化。

### 强制顺序

1. 先写最小失败测试或复现用例（优先使用 `node test.js` 中的真实路径）
2. 运行目标测试，确认 RED
3. 做最小实现，只写足以让测试通过的代码
4. 运行目标测试和必要全量测试，确认 GREEN
5. 需要重构时只在 GREEN 后做

### 例外

纯文档、AI 规则、任务卡、CHANGELOG 等不改变运行行为的改动不要求 TDD。

### 任务卡记录要求

代码任务必须写明 RED 命令、失败摘要、GREEN 命令和通过摘要。

## 4. 任务卡生命周期

- `tasks/doing/当前任务.md` 只保存**当前正在执行**的任务。
- 完成的任务卡归档到 `tasks/done/`，文件名 = 日期 + 简短任务名。
- 只读评审/流程审计不创建任务卡。
- 任务卡必须写清：允许读取、允许修改、禁止范围、验收方式。
- 代码任务还要写 TDD 清单和 RED/GREEN 证据。

## 5. 工作区状态门禁

遇到未提交改动时：

1. `git status --short --untracked-files=all`
2. 对非 `.omx/` 改动运行 `git diff --stat`
3. 标记为本轮改动 / 未归属改动 / 运行噪音
4. 未归属业务改动存在时，禁止自动补测、补文档、提交或推送
5. 禁止 `git add .`，只能按 allowlist 精确暂存

## 6. 文档同步规则

- 任意有效改动都要更新 `docs/10_CHANGELOG.md`
- 改 UI/HUD 同步 `04_CURRENT_UI_ART_SPEC.md`
- 改核心规则同步 `01_CURRENT_GAME_SPEC.md`
- 改数值同步 `03_CURRENT_NUMBERS.md`
- 重大决策记录到 `06_DECISION_LOG.md`

## 7. Subagent 使用边界

- 可用于并行审查、验收、文档核对、测试方案设计
- 不是硬门禁；小任务、高冲突任务不强制拆分
- 同一任务只允许一个 AI 修改同一代码文件
- subagent 结论写回任务卡或最终报告

## 8. 读取范围限制

- 1 个任务卡：`tasks/doing/当前任务.md`
- 1 个入口：`docs/00_AI_START_HERE.md`
- 2-4 个相关文档
- 1-3 个相关代码文件
- **禁止**默认全量读取 `docs/`

## 9. 云服务器部署

| 项 | 值 |
|---|---|
| 服务器别名 | sts2-cloud |
| IP | 124.222.83.113 |
| 用户 | ubuntu |
| SSH 密钥 | `~/.ssh/web.pem` |
| nginx 站点路径 | `/var/www/ysbzs/` |
| 访问地址 | `http://124.222.83.113/ysbzs/` |

### 部署铁律

- **必须**使用 `git show HEAD:<文件>` 提取最新 commit 的稳定版本上传。
- **禁止**直接上传工作区文件——可能包含未提交修改。
- **禁止**因此规则替其他 AI 提交代码。

## 10. 外部建议处理

外部 AI（ChatGPT、其他 Agent）建议不是项目真实规则。执行以当前代码、目录结构、任务卡、正式文档、用户指令和自身判断为准。

## 11. 语言策略

本项目规则使用中文为主，保留英文命令、路径、固定关键词和必要短句。
