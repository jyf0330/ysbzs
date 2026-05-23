# AGENTS.md · 元素背包史

本项目使用 `docs/00_AI_PROJECT_RULES.md` 作为 AI 规则唯一源头。

## 项目信息

- 项目名称：元素背包史（ysbzs）
- 类型：browser-based web game（回合制棋盘战术）
- 工作流：`ywh-game`
- 主文件：`index.html`（单文件，所有 CSS/HTML/JS 内联）
- 测试：`node test.js`（139 项）

## 开始前必须做

1. 读取 `docs/00_AI_PROJECT_RULES.md`。
2. 读取相关文档（GDD / 技术架构 / CHANGELOG）。
3. 运行 `git status --short`，记录初始状态。

## 文档门禁

- 大需求 / 新系统 → 先检查 8 份最小开工文档 → 缺则补草稿 → `BLOCKED_FOR_DOCS` → 不进入实现。
- 小修改 → 直接实现 → 验证后同步相关文档。

## 执行规则

- 修改 `index.html` 前先 `read_file` 理解上下文。
- 每次改动后运行 `node test.js`，139 项全部通过才算验证完成。
- 有意义的游戏改动后需运行 Playwright 脚本验证。
- 验证通过后更新相关文档和 `docs/10_CHANGELOG.md`。

## Git 规则

- 有改动 → `git add .` → `git commit -m "<type>: <摘要>"`。
- 安全检查通过后 → `git push`。
- 禁止提交 `.env`、密钥、`node_modules`。
- 无 remote → 输出 `PUSH_SKIPPED_NO_REMOTE`。

## 禁止事项

- 禁止绕过文档门禁。
- 禁止自动大范围重构（除非用户明确要求）。
- 禁止拆分单文件架构（不拆 index.html）。
- 禁止提交后不验证。
