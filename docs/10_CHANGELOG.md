# CHANGELOG · 元素背包史

## 未发布

| 日期 | 类型 | 摘要 | 涉及文件 | 验证 |
|---|---|---|---|---|
| 2026-05-24 | refactor | 视觉层重构：抽离预览计算为 computeHeroAttackPreview / computeMonsterActionPreview；新增 buildBattleVM / buildBoardVM / buildHeroesVM / buildSlotsVM / buildTurnVM ViewModel 层；renderBoard / renderHS / renderSlots / renderTurn 改为接受 VM 参数，不再计算规则 | index.html / docs/02 / docs/03 | node test.js 151/151 |

---

## 2026-05-24 · Demo v0.1 里程碑积累

| 日期 | 类型 | 摘要 | 涉及文件 | 验证 | Commit |
|---|---|---|---|---|---|
| 2026-05-24 | chore | ywh-init：初始化文档结构和 AI 规则文件 | docs/** / AGENTS.md / CLAUDE.md / .github/copilot-instructions.md | node test.js 139/139 | 待提交 |
| 2026-05-24 | feat | 怪物 3AP 系统：monsterAct 升级为 3 行动点循环 | index.html | node test.js 139/139 | a51d6ac |
| 2026-05-24 | feat | 攻击预览常驻：所有英雄行动槽始终显示预览 | index.html | node test.js 139/139 | a51d6ac |
| 2026-05-24 | feat | 怪物 3AP 预警：simMonAct 模拟完整 3AP 轨迹 | index.html | node test.js 139/139 | a51d6ac |
| 2026-05-24 | feat | 单位卡片重设计：HP/ATK 清晰显示，伤害徽章居中 | index.html | node test.js 139/139 | a51d6ac |
| 2026-05-24 | feat | nextMoveFromPos：提取显式位置参数的移动函数 | index.html | node test.js 139/139 | a51d6ac |
| 早期 | feat | 英雄 B 独立行动槽（3 槽）| index.html / test.js | node test.js 通过 | - |
| 早期 | feat | 商店系统、背包系统、合成升级 | index.html / test.js | node test.js 通过 | - |
| 早期 | feat | 元素叠层与引爆系统 | index.html / test.js | node test.js 通过 | - |
| 早期 | feat | 13×13 棋盘、两英雄、怪物基础系统 | index.html / test.js | node test.js 通过 | - |
