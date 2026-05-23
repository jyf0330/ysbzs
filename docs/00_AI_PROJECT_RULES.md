# AI 项目总规则 · 元素背包史

## 项目标识

- 项目名称：元素背包史（ysbzs）
- 项目类型：`game`
- 工作流：`ywh-game`
- 仓库：`git@github.com:jyf0330/ysbzs.git`

## 工作流总则

- AI 必须先读取项目文档和当前任务上下文，再开始实现。
- AI 必须按 `ywh-game` 工作流执行，不允许绕过文档门禁。
- AI 不允许自动做大范围重构，除非用户明确要求。
- 本项目是游戏，不得按工具项目规则实现。

## 文档门禁

大需求 / 新游戏 / 新系统开工前，必须检查以下 8 份最小开工文档：

1. `docs/01_游戏设计（策划主导）/游戏概述文档GDD.md`
2. `docs/01_游戏设计（策划主导）/功能拆解与优先级.md`
3. `docs/02_程序开发（程序主导）/技术架构总览.md`
4. `docs/03_美术资产（美术主导）/美术风格指南.md`
5. `docs/03_美术资产（美术主导）/资源目录结构与命名.md`
6. `docs/04_测试验收（测试主导）/版本发布验收清单.md`
7. `docs/08_ROADMAP.md`
8. `docs/10_CHANGELOG.md`

缺失文档时先补草稿，标记 `[NEEDS_USER_INPUT]` / `[NEEDS_REVIEW]`，输出 `BLOCKED_FOR_DOCS`，不进入实现。

小修改不检查完整开工文档，直接做最小改动，验证后更新相关文档。

## 实现规则

- 单文件架构：所有逻辑在 `index.html` 中，禁止无故拆分。
- 修改前先读文件，理解上下文后再改。
- 每次改动最小化，不过度工程化。
- 不添加无关注释、docstring、类型注解。

## 测试规则

- 测试文件：`test.js`（Node.js，`node test.js`）。
- 每次改动后运行 `node test.js`，确保 139 项全部通过。
- 测试失败时不进入文档同步和 Git 提交。

## Web-Game 验证规则

有意义改动后必须：

1. 运行 Playwright 脚本或 action_payloads 验证游戏行为。
2. 检查截图和 console error。
3. 用 `render_game_to_text` 输出游戏状态。
4. 验证通过后再进入文档同步。

## 小修改规则

1. 定位相关文件，做最小修改。
2. 运行 `node test.js` 验证。
3. 验证通过后同步相关文档。
4. 更新 `docs/10_CHANGELOG.md`。
5. Git commit + push。

## 文档同步规则

- 改玩法 / 数值 / 规则 → 更新 GDD 或功能拆解。
- 改代码结构 / 模块边界 / 数据结构 → 更新技术架构总览。
- 改 UI / 美术 / 资源路径 → 更新美术文档。
- 改验收标准 → 更新版本发布验收清单。
- 任意文件改动 → 更新 `docs/10_CHANGELOG.md`。

## Bug / 验收规则

1. 先复现问题（读代码、读测试、读日志）。
2. 定位根因，做最小修复。
3. 运行 `node test.js` + Playwright 验证。
4. 更新相关文档和 CHANGELOG。
5. Git commit + push。

## Git 规则

- 有改动必须 `git add .` → `git commit`。
- commit 格式：`<type>: <中文摘要> / <English summary>`。
- type 可用：`feat` / `fix` / `refactor` / `test` / `docs` / `chore`。
- 安全检查通过后默认 `git push`。
- 禁止 push `.env`、密钥、`node_modules`、大体积临时文件。
- 无 remote 时输出 `PUSH_SKIPPED_NO_REMOTE`。

## 禁止事项

- 禁止绕过文档门禁。
- 禁止自动大范围重构。
- 禁止把游戏项目当工具项目写。
- 禁止 force push 到主分支。
- 禁止提交后不验证。
