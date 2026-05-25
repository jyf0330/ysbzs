# CLAUDE.md · 元素背包史

本项目使用 `docs/00_AI_PROJECT_RULES.md` 作为 AI 规则唯一源头。

## 强制前置步骤（每次任务开始，缺一不可）

1. **调用 `ywh-game` skill**，阅读完整工作流。
2. **分类变更**：查 `docs/00_AI_PROJECT_RULES.md` 中的分类表。
   - 战斗机制 / 回合结构 / 元素规则 / 引爆时序 → **大需求**，代码量多少无关。
   - 大需求 → 文档门禁 → 确认后再实现。
3. **大改动前先给计划**，等用户确认。

## 项目信息

- 名称：元素背包史（ysbzs）
- 类型：browser-based web game，工作流：`ywh-game`
- 主文件：`index.html`（单文件架构，所有 CSS/HTML/JS 内联）
- 测试：`node test.js`（当前基准：151 项，需全部通过）

## 验证与同步（每次改动后）

1. 运行 `node test.js`，全部通过。
2. 有意义的游戏行为改动 → 运行 Playwright 或手动验证。
3. **按文档同步表更新对应文档**（见 `docs/00_AI_PROJECT_RULES.md`）——不得省略。
4. 更新 `docs/10_CHANGELOG.md`。
5. `git add .` → `git commit` → `git push`（通过安全检查）。

## 禁止事项

- 禁止跳过 ywh-game skill 调用。
- 禁止跳过变更分类步骤。
- 禁止把「代码量小」当做「不同步文档」的理由。
- 禁止绕过文档门禁。
- 禁止未经验证就提交。
- 禁止拆分 `index.html` 单文件结构。
- 禁止自动添加不必要的抽象、辅助函数、注释。
