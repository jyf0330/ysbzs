# CLAUDE.md · 元素背包史

本项目使用 `docs/00_AI_PROJECT_RULES.md` 作为 AI 规则唯一源头。

## Claude Code 额外要求

- **先读文档再开始**：必须先读 `docs/00_AI_PROJECT_RULES.md` 和相关文档。
- **先给计划再执行**：大改动前输出简短实现计划，等用户确认。
- **不绕过文档门禁**：大需求必须先检查 8 份最小开工文档。
- **不自动大范围重构**：只做被要求的最小必要改动。

## 项目信息

- 名称：元素背包史（ysbzs）
- 类型：browser-based web game，工作流：`ywh-game`
- 主文件：`index.html`（单文件架构，所有 CSS/HTML/JS 内联）
- 测试：`node test.js`（139 项，需全部通过）

## 验证要求

每次改动后必须：

1. 运行 `node test.js`，确认 139/139 通过。
2. 有意义的游戏行为改动 → 运行 Playwright 或手动验证。
3. 验证通过后更新相关文档和 `docs/10_CHANGELOG.md`。
4. `git add .` → `git commit` → `git push`（通过安全检查）。

## 禁止事项

- 禁止绕过文档门禁。
- 禁止未经验证就提交。
- 禁止拆分 `index.html` 单文件结构。
- 禁止自动添加不必要的抽象、辅助函数、注释。
