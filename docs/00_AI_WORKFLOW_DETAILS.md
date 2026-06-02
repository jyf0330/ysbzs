# AI 工作流细则 · 元素背包史

## 执行纪律总纲

### 任务先分类

开工第一步：走变更分类表，确定任务类型 → 路由到对应 Superpowers 执行链。不要先写代码再分类。

### 代码是事实基线，文档是意图基线

发现代码和文档不一致时：

- 代码代表当前实际行为。
- 正式文档代表设计意图。
- 先输出差异清单，列冲突点、影响范围和可选方案。
- 用户选择前，不得擅自同时改代码和文档把分歧抹平。
- 默认不以盲选方式"以代码为准"或"以文档为准"；每个冲突点逐项判断。

### 设计未拍板前不实现

`[NEEDS_REVIEW]` 或 `BLOCKED_FOR_DOCS` 标记的决策尚未拍板时，禁止开工实现。先推动决策拍板，再进入执行。

### 建议来源与执行优先级

涉及 ysbzs 的外部 AI（如 ChatGPT、其他 Agent）建议不是项目真实规则。执行时以当前项目代码、目录结构、任务卡、正式文档、用户最新指令和执行者判断为准。只吸收有用部分，丢弃无用、过重、重复或不适配内容。

项目规则建议末尾不需要强制写清单。以下情况必须写短清单：

- 涉及工作流规则、执行边界、禁止事项、代码风险
- 涉及多 AI 协作、项目方向、验收风险
- 建议会对游戏行为或规则产生潜在影响

普通小建议、简单问答、低风险临时命令不需要强行加清单。

## Superpowers 执行链

YWH 负责项目治理；Superpowers 负责执行纪律。两者分层，不互相替代。

| YWH 分类 | 必须先调用的 Superpowers skill | 说明 |
|---|---|---|
| 大需求 / 新模块 | `brainstorming` → `writing-plans` | 设计批准后再写计划；完整计划放 `docs/plans/` |
| 排查 / 修 bug / 验收 | `systematic-debugging` → `test-driven-development` | 先根因，再 RED/GREEN |
| 有书面实施计划 | `executing-plans` 或 `subagent-driven-development` | 独立任务优先 subagent |
| 任何代码任务完成前 | `verification-before-completion` | 没跑验证命令，不得宣称通过 |
| 需要隔离分支 / 并行 | `using-git-worktrees` | 大需求或多 AI 并行时使用 |

降级：Superpowers skill 缺失时，不得阻塞任务；退回 YWH TDD、任务卡和 `node test.js`，并在报告说明降级路径。

### 文档门禁分级

- **大系统**（新玩法 / 新模块）：Demo 最小文档包 + `brainstorming` + 设计 spec
- **中等改动**（已有 GDD 下的增量）：只更新相关 GDD 章节 + 短 plan（`docs/plans/`）
- **小修改 / 修 bug**：跳过 brainstorming；最小任务卡 + TDD + 验证

## Codex Goal：从游戏文档到长任务

游戏项目的 goal 流程写在项目规则、`ywh-game` 和任务卡里。Codex goal 是会话级长任务容器，不是项目真相源。项目真相源仍然是源文档、`tasks/doing/当前任务.md`、当前上下文、正式设计/技术/验收文档和 `docs/10_CHANGELOG.md`。

### 何时开启

**硬性触发条件：用户消息中包含 "goal" 一词。**

- 只有用户明确说 "goal" 时才走 Goal 工作流。
- 用户没说 "goal" 时，即使任务很大，也走标准工作流（brainstorming → writing-plans → 执行）。
- 不要自动判断是否开 goal；以用户消息中的 "goal" 关键词为准。

触发示例：

- "按 `docs/plans/xxx.md` 开一个 Codex goal。"
- "根据这个 GDD 做成 goal，跑到验收完成。"
- "把当前任务卡开 goal，预算 N tokens。"
- "用 goal 做这个重构。"

以下情况不开 goal（即使任务很大）：

- 用户消息中没有 "goal" 一词。
- 只读评审、流程审计、解释规则。
- 单轮小修改或单条命令可完成的任务。
- 文档缺关键决策，无法抽出明确验收标准。

### 输入优先级

1. 用户明确指定的源文档。
2. `tasks/doing/当前任务.md`。
3. `docs/00_CURRENT_CONTEXT.md`。
4. 与任务直接相关的 2-4 个正式文档。
5. 必要代码文件和测试文件。

禁止默认把完整 `docs/`、`docs/99_归档/` 或长篇历史讨论塞进 goal。归档内容只有在任务卡点名时才可作为背景。

### 转换步骤

1. 读项目入口：`AGENTS.md` 或 `CLAUDE.md`，确认 `<!-- ywh: web-game -->`。
2. 读工作区：`git status --short --untracked-files=all`，区分本轮改动、未归属改动和运行噪音。
3. 读源文档：只抽取本轮目标、明确范围、禁止范围、验收项、验证方式和文档同步要求。
4. 生成 `Codex Goal Charter`：用 `references/doc-templates/Codex Goal Charter.md`（位于上游 ywh-game）的结构压缩，不复制源文档全文。
5. 同步任务卡：把 Charter 中的可执行部分写入或更新 `tasks/doing/当前任务.md`。
6. 开启 goal：用户已明确授权时调用 Codex `create_goal`，objective 只保留一句精炼目标。
7. 执行计划：使用 `update_plan` 维护步骤；Superpowers 决定设计、计划、TDD、调试、并行或验收路径。
8. 验证和同步：先跑验证，再更新正式文档、当前上下文、任务卡和 `docs/10_CHANGELOG.md`。
9. 收尾 goal：全部验收完成后才 `update_goal complete`；同一阻塞连续三轮无法推进时才 `update_goal blocked`。

### Charter 必填字段

| 字段 | 要求 |
|---|---|
| 来源 | 源文档路径、任务卡路径、当前上下文路径 |
| Goal Objective | 一句话，包含交付、验证、文档同步和收尾 |
| 任务分类 | 对应 YWH 分类，不用自由命名 |
| 必须交付 | 本轮必须完成的玩家可见或项目可验收结果 |
| 本次不做 | 明确排除项，防止长任务膨胀 |
| 必须读取 | 限定读取范围 |
| 允许修改 / 禁止修改 | 限定写入范围 |
| 验收标准 | 可检查、可复现、能判断通过或失败 |
| 验证命令 | 具体命令、浏览器检查或截图验收 |
| 文档同步 | 必须更新的正式文档和 changelog |
| Goal 状态规则 | 何时 complete，何时 blocked |

### Goal Skill Hooks

不要把这些 skill 合并进 `ywh-game` 正文。`ywh-game` 只保留政策层规则；skill 作为 Codex Goal / Claude 长任务的阶段钩子存在。hook 的输出必须写回 Charter，必要时同步 `tasks/doing/当前任务.md` 或 evidence 文档。

Claude / Codex 兼容规则：

- Codex 有 `create_goal` / `update_plan` / `update_goal` 时，按 Codex Goal 流程执行；Claude 没有这些 API 时，用任务卡、Todo / plan 和最终报告承载同等状态。
- Claude 和 Codex 共用本节 hook registry，不维护第二套 Claude 专属顺序；`CLAUDE.md` 只做入口指针。
- hook 是路由与证据契约，不是无条件 shell 自动化。skill 缺失、输入不足或用户排除时，写 `SKIPPED` 或 `UNAVAILABLE`，不得伪造执行结果。
- 当前 `tasks/doing/当前任务.md` 已被其他 AI / 其他任务占用时，不得覆盖；先在最终报告或独立 evidence 中记录，获得授权后再更新任务卡。

批判性使用规则：

- `required` 只适用于实际创建 Codex goal 的任务；只读评审、解释流程、普通小修不触发完整 hook 链。
- `required` 不等于无条件阻塞。缺少输入、项目文档结构不支持、skill 不存在或用户明确排除时，记录 `SKIPPED` 或 `UNAVAILABLE`，并说明是否阻塞。
- `consistency-check` 必须限定在本 goal 相关正式文档和实体/规则范围内，不得借此默认全量读取整个 `docs/`。
- hook 结果只能影响 Charter、任务卡、计划和验收判断；不能绕过任务卡的允许修改 / 禁止修改边界。

| 阶段 | Skill | 触发方式 | 结果写回 |
|---|---|---|---|
| 开工前 | `project-stage-detect` | required | Charter + `tasks/doing` |
| 开工前 | `scope-check` | required | Charter + `tasks/doing` |
| 开工前 | `estimate` | required | Charter + `tasks/doing` |
| 开工前 | `gate-check` | required | Charter + `tasks/doing` |
| Charter 抽取 | `consistency-check` | required | Charter |
| 验证 | `smoke-check` | required | Charter + `tasks/doing` |
| 验证 | `regression-suite` | conditional: `code_changed_or_large_goal` | Charter + evidence |
| 验证 | `test-evidence-review` | conditional: `before_commit_or_goal_complete` | Charter + evidence |

条件型 hook 只在任务类型命中时触发，不得为了凑流程把 30 个 skill 全部串行执行：

| 触发场景 | Skill | 强度 | 写回 |
|---|---|---|---|
| 文档反推 / 原型补文档 | `reverse-document` | conditional | Charter + 目标文档 |
| 大型策划 / GDD 变更 | `design-review`、`review-all-gdds` | conditional | Charter + 相关 GDD |
| 设计变更影响架构 / ADR | `propagate-design-change` | conditional | Charter + 技术文档 |
| 多 bug 整理 / 缺陷队列 | `bug-triage` | conditional | Charter + 任务卡 |
| 数值 / 经济 / 成长系统 | `balance-check` | conditional | Charter + 数值/玩法文档 |
| UI / HUD / 可观察交互 | `ux-design`、`ux-review` | conditional | Charter + HUD / UX 文档 |
| 浏览器游戏体验验收 | `ywh-web-game`、`playwright`、`game-playtest`、`visual-verdict`、`webapp-testing` | conditional | evidence + 最终报告 |
| 自动试玩 / playtest 报告 | `playtest-report` | conditional | reports + 验收文档 |
| 代码审查 / 外部评审 | `code-review`、`requesting-code-review`、`receiving-code-review` | conditional | review notes + 任务卡 |
| 存档 / 联网 / 公开发布风险 | `security-audit` | conditional | Charter + 风险记录 |
| CI 多次失败 / 疑似不稳定 | `test-flakiness` | conditional | evidence |
| 对外版本发布 | `launch-checklist` | conditional | 发布验收清单 |
| 大 goal 拆 sprint | `sprint-plan` | advisory | 计划文档 |
| 查询进度 / 阶段复盘 | `sprint-status` | advisory | 最终报告 |
| 项目地图 / 影响范围辅助 | `graphify` | advisory | 任务卡摘要，不替代读源码 |

每个触发的 hook 必须写回：

```md
### Hook Result: <skill-name>

- 状态：`DONE | SKIPPED | UNAVAILABLE`
- 结论：
- 风险：
- 影响文件：
- 后续动作：
- 是否阻塞：`是 | 否`
```

### Objective 格式

```text
按 <源文档路径> 完成 <一句话目标>：实现 <核心交付>，同步 <必要文档>，通过 <验证命令/验收方式>，并按 YWH 游戏项目收尾规则完成交付。
```

示例：

```text
按 docs/plans/背包战斗结算.md 完成战斗结算重构：实现伤害层数结算、同步战斗系统和测试验收文档，通过 node test.js 与浏览器回放检查，并按 YWH 游戏项目收尾规则完成交付。
```

### 与任务卡的关系

- Goal 负责跨轮状态：目标、预算、完成或阻塞。
- 任务卡负责项目执行真相：读什么、改什么、怎么验收、哪些文档同步。
- 如果 goal 和任务卡冲突，以任务卡和正式项目文档为准，先修正 goal 计划，不直接改代码。
- 当前任务完成后，任务卡按项目规则归档；goal 标记完成不能替代任务卡归档。

### 与 Superpowers / ywh-game 的关系

- Codex goal 不决定执行方法。
- Superpowers 决定设计、计划、调试、TDD、执行计划和完成前验证。
- `ywh-game` 决定游戏文档门禁、读取范围、验收证据、CHANGELOG 和 Git 收尾。
- `ywh-web-game` 只在浏览器游戏验收时接管 Playwright、截图、控制台和状态检查要求。

## 任务分流与最小读取

不要让所有 AI 读所有文件。正确流程是：总控 AI 先判断任务类型并生成任务卡；执行 AI 只读任务卡、当前上下文、相关 2-4 份文档和指定代码文件；验收 AI 只读任务卡、验收清单和测试结果。

### 测试基准单一来源

- 当前 `node test.js` 基准只维护在 `docs/00_CURRENT_CONTEXT.md`。
- `AGENTS.md`、`CLAUDE.md`、`.github/copilot-instructions.md`、`docs/00_AI_PROJECT_RULES.md` 不复制具体测试数量。
- 如果测试数量变化，本轮必须同步 `docs/00_CURRENT_CONTEXT.md`、`docs/10_CHANGELOG.md` 和必要验收文档；入口文件只保留“以 CURRENT_CONTEXT 为准”。

### 通用读取上限

- 1 个任务卡：`tasks/doing/当前任务.md`
- 1 个当前上下文：`docs/00_CURRENT_CONTEXT.md`
- 2-4 个相关文档
- 1-3 个相关代码文件

超过这个范围，先拆任务，不要默认全量读取 `docs/`。

### 任务类型读取表

| 任务类型 | 必须读取 | 禁止默认读取 |
|---|---|---|
| 小 Bug / 小改动 | `docs/00_CURRENT_CONTEXT.md`、任务卡、相关代码文件、`docs/10_CHANGELOG.md` | 完整 GDD、归档草稿 |
| HUD / UI / 战斗预览 | `docs/00_CURRENT_CONTEXT.md`、任务卡、`战斗系统.md`、`用户界面与操作规范.md`、`技术架构总览.md`、`HUD与界面信息设计.md`、`index.html` | 无关美术草稿、归档草稿 |
| 核心规则：伤害 / 元素 / 怪物 AI / 引爆 | `docs/00_CURRENT_CONTEXT.md`、任务卡、`战斗系统.md`、`技术架构总览.md`、`index.html`、`test.js` | 美术文档、归档草稿 |
| 文档整理 / 合并 / 归档 | `docs/00_AI_PROJECT_RULES.md`、`docs/00_AI_WORKFLOW_DETAILS.md`、`docs/00_CURRENT_CONTEXT.md`、`docs/09_DECISIONS.md`、任务卡、目标文档、`docs/10_CHANGELOG.md` | 游戏核心代码 |
| 测试 / 验收 | 任务卡、`版本发布验收清单.md`、`test.js`、测试日志或截图、`docs/10_CHANGELOG.md` | 核心规则文档，除非报告冲突 |
| 只读评审 / 流程审计 | 用户问题、`git status`、目标规则或目标代码片段；必要时读取 1-3 个相关文件 | 默认不读完整项目、不改文件、不更新 CHANGELOG |

## 工作区状态必读门禁

看到未提交改动时，必须先读状态再行动：

1. 运行 `git status --short --untracked-files=all`。
2. 对非 `.omx/` 的改动运行 `git diff --stat`，并按需读取对应文件 diff 摘要。
3. 把改动标成：本轮改动 / 未归属改动 / 运行噪音。
4. 报告未归属改动时，禁止只列文件名；必须说明改动性质、可能归属、为什么不提交、推荐下一步。
5. 未归属业务改动存在时，禁止自动补测、补文档、提交或推送。
6. 只有任务卡授权，或用户明确说“提交这组改动”，才允许接管。
7. 有未归属改动时禁止 `git add .`，只能按 allowlist 精确暂存。
8. 未归属改动不得混入当前任务提交；需要接管时先让任务卡或用户授权扩大范围。

## 任务卡生命周期

- `tasks/doing/当前任务.md` 只保存当前正在执行的任务。
- 完成的任务卡归档到 `tasks/done/`，文件名使用日期 + 简短任务名。
- 只读评审 / 流程审计不创建任务卡；如果用户要求落地，再切换为执行任务并创建或更新任务卡。
- 新任务不得沿用已完成任务卡里的禁止范围、验收数字、阻塞条件或旧决策；需要复用旧任务内容时，必须先归档旧卡，再生成新任务卡。
- 当前任务卡必须只表达当前任务或当前 goal 的范围、限制、验收方式和阻塞条件。
- 当前任务卡必须写清允许读取、允许修改、禁止范围和验收方式；代码任务还要写 TDD 清单、实施步骤和 RED/GREEN 证据。
- 如果任务由 Codex goal 驱动，任务卡必须写明 goal objective、源文档、完成条件和阻塞条件；goal 完成前必须确认任务卡字段已闭环。

## TDD 硬门禁

适用范围：

- Bugfix、核心机制、UI 可观察行为、重构、状态结构或行为变化。
- 会改变玩家可见结果或测试行为的代码改动。

强制顺序：

1. 先写最小失败测试或复现用例，优先使用 `node test.js` 中的真实行为路径。
2. 运行目标测试，确认 RED：失败原因必须来自缺失行为或已知 bug，而不是语法错误、夹具错误或断言写错。
3. 再做最小实现，只写足以让测试通过的代码。
4. 运行目标测试和必要全量 `node test.js`，确认 GREEN。
5. 需要重构时只在 GREEN 后做，并保持测试通过。

前置步骤：TDD 测试清单

在写任何测试代码之前，必须先输出一份 TDD 测试清单，明确每个测试组的名称、断言内容和预期 RED 原因。大需求写入 `docs/plans/` 或任务卡；小改动可直接写入任务卡。

清单输出后：
- **交互模式**：建议用户审阅后再写测试代码；但非硬门禁，用户明确跳过时可直接进入实现。
- **Goal / 自主模式**：清单写完后自行确认无遗漏即可进入实现，不需要等待外部审阅。Goal 模式的目标是全程无需人干预，审阅门会阻塞流水线。

例外：

- 纯文档、AI 规则、任务卡、CHANGELOG 等不改变运行行为的改动，不要求先写失败测试。
- 若现有测试框架无法可靠表达该行为，必须在任务卡记录原因，并补充最接近真实 UI / log / 状态路径的可执行回归检查后才能完成。
- 不允许把“事后跑 `node test.js` 通过”当作 TDD；没有 RED 记录时，只能称为事后验证。

任务卡记录要求：

- 代码任务必须写明 RED 命令、失败摘要、GREEN 命令和通过摘要。
- 如果 TDD 豁免，必须写明豁免原因和替代验证方式。

## subagent 使用边界

- subagent 可用于并行审查、验收、文档核对、测试方案设计或影响范围分析。
- subagent 不是硬门禁；小任务、单文件高冲突任务、上下文不足任务，不强制并行拆分。
- 有 `writing-plans` 且任务独立时，优先考虑 `subagent-driven-development`，但必须先确认拆分不会扩大冲突面。
- 同一任务只允许一个 AI 修改同一代码文件；其他 AI 只能审查、验收或写任务卡指定的独立文档。
- 使用 subagent 时，总控 AI 必须把结论压缩进任务卡或最终报告，只吸收决策、风险、影响文件和后续动作。
- subagent 结论不得扩大任务卡允许读取 / 修改范围；需要扩大范围时，先更新任务卡并说明原因。

## 变更分类

开工第一步必须走此表，再路由到对应执行链。

| 分类 | 判断标准 | 走哪条路 |
|---|---|---|
| 大需求 / 新模块 | 新系统、新玩法机制、架构重构、核心战斗规则变更 | 文档门禁 → brainstorming → writing-plans → 实现 |
| 小修改 / 局部补丁 | 纯 bug、数字调参、非核心 UI 微调、不改玩法规则 | 最小实现 → 验证 → 同步文档 |
| 排查 / 修 bug / 验收 | 复现问题、读日志、验收测试 | systematic-debugging → 最小修复 → 验证 |
| 工作流规则变更 / 文档治理 | 修改 ywh / 模板 / AI 规则 / 文档结构，不改变游戏运行行为 | 最小规则修改 → 一致性验证 → 同步 CHANGELOG |
| 只读评审 / 流程审计 | 用户只要求判断、解释、审查建议、分析流程问题，不要求改文件 | 轻量读取 → 输出结论 / 风险 / 建议；不生成任务卡、不改文档、不提交 |

代码量小不等于小修改。凡涉及回合结构、伤害时序、引爆逻辑、元素规则、状态机等核心战斗机制，无论代码量，一律视为大需求。

## 只读评审 / 流程审计轻量通道

只判断、解释、审查建议、分析流程风险时，走轻量通道：

- 可读：用户内容、`git status`、目标规则文件或目标代码片段。
- 输出：结论、风险、可采纳项、不可采纳项、推荐下一步。
- 禁止：默认任务卡、默认 CHANGELOG、默认 Git 收尾、默认全量读取、未授权改文件。
- 如需落地，先说明切换为执行任务，再按执行分支走。

## 自主执行边界

默认自主执行，不为了明显下一步反复询问；但以下情况必须先暂停并输出冲突点、影响范围和可选方案：

- 需要破坏性操作，例如删除大量文件、重置分支、覆盖未归属改动。
- 存在未归属的 `index.html`、`test.js`、正式文档或 `docs/10_CHANGELOG.md`，且本轮任务需要接管这些文件。
- 代码和文档对同一规则给出不同事实。
- 文档模板或评审规则要求 `[NEEDS_REVIEW]` 的玩法方向、MVP 范围、安全边界、平台选择、数据模型、模块边界或架构决策。
- `[NEEDS_REVIEW]` 或 `BLOCKED_FOR_DOCS` 标记的决策尚未拍板时，禁止开工实现；必须先推动决策拍板。

## graphify 使用边界

`graphify` 只用于总控 AI 做项目地图和影响范围分析，不作为执行 AI 默认全量读取项目的理由。

- 总控 AI 可用 `graphify` 辅助判断读取范围，并把结论压缩进任务卡。
- 执行 AI 仍然只能读取任务卡指定文件。
- 修改代码前必须读取真实源码，不能只凭图谱修改。
- graphify / 代码图谱不能代替读取真实源码、正式文档和当前任务卡。
- 图谱、缓存、历史结论与当前源码或正式文档冲突时，以当前源码和正式文档为准。

## Demo 阶段文档门禁

大需求开工前，必须确认以下当前 Demo 必需文档存在且覆盖本次改动范围：

1. `docs/01_游戏设计（策划主导）/游戏概述文档GDD.md`
2. `docs/01_游戏设计（策划主导）/功能拆解与优先级.md`
3. `docs/01_游戏设计（策划主导）/战斗系统.md`
4. `docs/02_程序开发（程序主导）/技术架构总览.md`
5. `docs/01_游戏设计（策划主导）/UI-UX策划/用户界面与操作规范.md`
6. `docs/03_美术资产（美术主导）/美术风格指南.md`
7. `docs/03_美术资产（美术主导）/HUD与界面信息设计.md`
8. `docs/04_测试验收（测试主导）/版本发布验收清单.md`
9. `docs/08_ROADMAP.md`
10. `docs/10_CHANGELOG.md`

以下文档按需补充，不作为 Demo 阶段每次大需求硬门禁：

- `docs/02_程序开发（程序主导）/核心层与展示层分离设计.md`
- `docs/02_程序开发（程序主导）/数据文件归档与分类规范.md`
- `docs/04_测试验收（测试主导）/游戏闭环成熟度评分.md`

## 文档同步规则

| 改动类型 | 必须更新的文档 |
|---|---|
| 回合结构 / 伤害时序 / 元素规则 / 引爆机制 | `docs/01_游戏设计（策划主导）/战斗系统.md` |
| 新玩法 / 核心数值 / 胜负条件 | `docs/01_游戏设计（策划主导）/游戏概述文档GDD.md` |
| 新功能 / 优先级变更 | `docs/01_游戏设计（策划主导）/功能拆解与优先级.md` |
| 代码结构 / 新函数边界 / 新状态字段 | `docs/02_程序开发（程序主导）/技术架构总览.md` |
| UI / HUD / 菜单 / 界面信息层级 | `docs/03_美术资产（美术主导）/HUD与界面信息设计.md` |
| 输入操作 / 按钮行为 / 模式切换 / 反馈规则 | `docs/01_游戏设计（策划主导）/UI-UX策划/用户界面与操作规范.md` |
| 美术风格 / 资源路径 / 资源命名 | `docs/03_美术资产（美术主导）/美术风格指南.md`、`docs/03_美术资产（美术主导）/资源目录结构与命名.md` |
| 验收标准 / 测试项数量变化 | `docs/04_测试验收（测试主导）/版本发布验收清单.md` |
| 核心状态结构 / 接口边界 / 存档回放 | `docs/02_程序开发（程序主导）/核心层与展示层分离设计.md` |
| 零散数据文件整理 / 数据目录迁移 | `docs/02_程序开发（程序主导）/数据文件归档与分类规范.md` |
| 大需求完成 / 核心闭环跑通 / 接口重构 | `docs/04_测试验收（测试主导）/游戏闭环成熟度评分.md` |
| 工作流规则 / AI 规则 / Skill 模板 / registry | 对应规则文件、模板或 registry；项目内变更时同步 `docs/10_CHANGELOG.md` |
| 任意有效改动 | `docs/10_CHANGELOG.md` |

## 验证后文档同步与 Git 收尾判断

测试通过不等于任务完成。顺序固定：

1. 读工作区状态，区分本轮改动 / 未归属改动 / 运行噪音。
2. 走 `verification-before-completion`：先跑验证命令，再宣称通过。
3. 对照“文档同步规则”，先补必要正式文档和 `docs/10_CHANGELOG.md`。
4. 文档未同步前，禁止 `git add`、`git commit`、`git push`。
5. 全部交付改动属于本轮授权范围后，运行 `git diff --check`，精确暂存、提交，并按规则或用户要求推送。
6. 有未归属业务改动时，不提交；必须报告改动性质、可能归属和推荐下一步。
7. 最终明确落到：已提交并推送 / 已提交未推送 / 未提交并说明原因 / 无需提交。

## 代码与文档不一致处理

如果发现实际代码和现有文档不一致：

- 代码是事实基线——代表当前实际行为。
- 正式文档是意图基线——代表设计目标。
- 必须先输出代码-文档差异清单，列明冲突点、影响范围和可选方案。
- 用户选择前，不得擅自同时改代码和文档把分歧抹平。
- 每个冲突点逐项判断以代码为准、以文档为准或逐项处理；不盲选全局策略。

## 商店/经济/成长系统参考方向

商店系统、经济数值、成长节奏的设计讨论，优先向《The Bazaar》的异步自走棋商店结构对齐。具体方向应以项目正式设计文档和用户决策为准。

## 建议来源与执行优先级

涉及 ysbzs 的外部建议（ChatGPT、其他 AI Agent 等）不是项目真实规则。收到外部建议时：

1. 先判断是否属于 AI 工作流/规则/模板，还是涉及游戏设计/数值/机制。
2. 涉及游戏内容的外部建议，执行时以当前项目代码、目录结构、任务卡、正式文档、用户最新指令和执行者判断为准。
3. 只吸收有用部分，丢弃无用、过重、重复或不适配内容。
4. 涉及工作流规则、执行边界、禁止事项、代码风险、多 AI 协作、项目方向、验收风险时，末尾必须写短清单说明执行优先级和风险。
5. 普通小建议、简单问答、低风险临时命令不需要强行加清单。

## 归档与语言

- `docs/99_归档/` 只保存历史草稿，不是当前规则源头。
- 根目录不长期存放 `main.txt`、`srd.txt`、`数据.txt`、`验收结果.txt`、`notes.md` 这类临时草稿；发现后应移动到 `docs/99_归档/` 或按项目分类归入正式文档目录。
- 项目规则以中文为主，保留英文命令、路径、固定关键词和必要短句。
