# CHANGELOG · 元素背包史

## 未发布

| 日期 | 类型 | 摘要 | 涉及文件 | 验证 |
|---|---|---|---|---|
| 2026-05-25 | docs | 工作流规则优化：将 UI 文档分层同步到项目规则，新增用户界面与操作规范草稿；补齐核心/展示分离、数据归档、闭环成熟度评分 3 份门禁草稿；补充工作流规则变更 / 文档治理分类，明确用引用搜索、模板存在性、同步映射一致性验证 | docs/00_AI_PROJECT_RULES.md / AGENTS.md / CLAUDE.md / .github/copilot-instructions.md / docs/01_游戏设计（策划主导）/UI-UX策划/用户界面与操作规范.md / docs/02_程序开发（程序主导）/核心层与展示层分离设计.md / docs/02_程序开发（程序主导）/数据文件归档与分类规范.md / docs/04_测试验收（测试主导）/游戏闭环成熟度评分.md | rg 一致性检查 |
| 2026-05-25 | feat | 怪物行为预览补全：①computeMonsterActionPreview 新增 monCardMap，记录每个怪物攻击目标（atkTargetId）、伤害（atkDmg）、是否能攻击（canAttack）；②buildBoardVM 将 atkInfo 注入怪物 VM；③renderBoard 怪物卡新增 .mm-atkinfo 行，显示 →A（蓝）/-N（红）攻击信息，无法攻击时显示灰色·；④以上显示无条件启用，不依赖任何选中状态；明确战斗界面「两套预览始终共存」决策 | index.html | node test.js 156/156 |
| 2026-05-25 | docs | 补充决策文档：战斗系统.md 新增「§11 怪物行为预览是核心玩法数据」；用户界面与操作规范.md 新增「七、战斗界面默认可见信息」 | docs/01_游戏设计/战斗系统.md / docs/01_游戏设计/UI-UX策划/用户界面与操作规范.md | — |
| 2026-05-25 | fix | 战斗预览系统全面修复：①`computeHeroAttackPreview` 新增 `addLayers`/`elLabel`/`willExplode`/`fromSelHero` 字段，格子上常驻显示"火+1"/"水+2"等元素叠层文字；②选中英雄格子 overlay 更亮（0.42）、未选中淡色（0.20）；③将引爆时格子显示橙色"将引爆"警告；④`computeMonsterActionPreview` 新增 `monFinalSet` 区分怪物路过格（橙）/停留格（黄）/攻击格（红）；⑤`renderBoard` 新增 `.el-prev-badge`/`.explode-warn` 标签渲染 | index.html | node test.js 156/156 |
| 2026-05-25 | feat | HUD 显示层全面改造（Phase 2）：①棋盘格子 42px→52px，单位标记 38px→48px；②英雄卡改为 hm-row 两行布局，预测承伤集成进卡片（⚠-N）；③怪物卡改为四区布局（HP/ATK 顶行、👾图标、底部预测伤害/爆炸警告）；④元素预览标签从单一主元素改为全元素显示（🔥cur→next 格式）；⑤`simMonAct` 新增步骤编号（step:1/2/3），`computeMonsterActionPreview` 传递步骤至 VM，格子显示 M1/M2/M3 标签；⑥行动槽面板改为 2 列紧凑迷你卡（方向改为 ↑↓←→ 横排，去除 3×3 方向网格） | index.html | node test.js 156/156 |
| 2026-05-25 | docs | 新增 HUD与界面信息设计.md：从 index.html 实际代码逆向梳理，覆盖棋盘格子状态类、英雄/怪物/元素卡片规格、右侧面板4个box、4个覆盖层、元素色表、操作提示文案 | docs/03/HUD与界面信息设计.md | — |
| 2026-05-25 | docs | 代码-文档差异核查（排查验收）：对齐7项差异；技术架构总览清理3处乱码、修正 explosionThreshold 默认值说明（1→3）、hitCount 重置时机补文档、previewDamage 澄清（行动阶段预览，settleExplosions 时转真实扣血）；AI 规则文件补齐系统 ywh-game 缺失3规则（小修改防膨胀、代码-文档不一致处理流程、文档门禁+3个文档） | docs/02/技术架构总览.md / docs/00_AI_PROJECT_RULES.md / AGENTS.md | — |
| 2026-05-25 | fix | 规则一致性修复：G.explosionThreshold 默认值 1→3；useSlot 行动阶段直接更新棋盘不调用 addEl（杜绝 doExplode 在行动块中立即扣血）；doExplode 标注兼容路径注释；补测试 threshold=3 引爆阈值行为（5 新测试，共 156 项） | index.html / test.js | node test.js 156/156 |
| 2026-05-25 | refactor | elementCells 四元素槽架构：用 G.elementCells{"r,c":{fire/water/wind/earth:{layers,previewDamage,willExplode}}} 替代 G.pendingDmg；doExplode 恢复立即结算；useSlot 写入格子槽；新增 settleExplosions()，settleDamage 成为向后兼容别名；新增 G.previewEvents 供飘字显示 | index.html / docs/02 | node test.js 151/151 |
| 2026-05-25 | feat | 行动/结算两阶段分离（初版）：行动阶段只叠元素/记录待伤害；结算阶段统一引爆/扣血/清层 | index.html / test.js | node test.js 151/151 |
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
