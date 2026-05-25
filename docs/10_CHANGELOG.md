# CHANGELOG · 元素背包史

## 未发布

| 日期 | 类型 | 摘要 | 涉及文件 | 验证 |
|---|---|---|---|---|
| 2026-05-28 | feat | 事件驱动架构 + 核心统一重算 + 文字战斗流程：①新增 `dispatchGameAction(action)` 统一入口，路由 6 种 action（MOVE_HERO/UPDATE_ACTION_SLOT/SELECT_ACTION_SLOT/SET_ACTION_TARGET/SET_ACTION_DIRECTION/END_PLAYER_ACTIONS）；②新增 `applyActionToState(action)` 状态修改路由；③新增 `recomputeCorePreview()` 统一重算，生成 `G.coreSnapshot`（含 _version/_ts/monsterStats/cellInfoMap/monsterThreats/heroStats/battleReport/warnings）；④新增 `buildHeroStats()` 英雄状态快照；⑤新增 `buildBattleReport(monsterStats,monsterThreats)` 文字战斗流程，覆盖行动日志/怪物格单体伤害/空格十字引爆/怪物攻击英雄预警；⑥接线 moveHero/selSlot/setDir/setHero 走 dispatchGameAction；⑦initGame 新增 coreSnapshot/coreVersion/actionLog 字段；⑧新增 I 组测试 case_core_001~007（199→206 全通过） | index.html / test.js | node test.js 206/206 |
| 2026-05-26 | docs | 瘦身 AI 规则入口：`00_AI_PROJECT_RULES.md` 改为极短必读入口，新增 `00_AI_WORKFLOW_DETAILS.md` 承载细则；入口文件和系统 ywh 模板同步要求必读细则；明确项目规则中文为主、保留英文命令和固定关键词；同步测试基线为 199/199 | docs/00_AI_PROJECT_RULES.md / docs/00_AI_WORKFLOW_DETAILS.md / docs/00_CURRENT_CONTEXT.md / AGENTS.md / CLAUDE.md / .github/copilot-instructions.md | node test.js 199/199；rg 一致性检查；git diff --check |
| 2026-05-25 | feat | 教程关默认配置统一全 fire + 规则测试矩阵：①initGame() 默认槽位改为 ha=fire/fire/fire、hb=fire/fire/fire（原 ha slot1=water、hb=wind/earth/water）；②新增 A 组 initGame 默认配置测试 5 条（教程关槽位全 fire、无多元素、英雄位置、怪物属性、threshold）；③新增 B 组怪物格单体结算测试 4 条（fire 1/2/3/6 层单体，相邻怪不受波及）；④新增 C 组空格十字爆炸测试 4 条（fire 1/2 不爆、fire 3/6 十字）；⑤新增 D 组怪物格 vs 空格差异测试 2 条；⑥新增 E 组多元素规则测试 5 条（含 TODO 标记的多元素同格引爆）；⑦新增 G 组 buildMonsterStats 预览统计测试 4 条（selfCellDamage/splash/合并/不改状态）；⑧新增 H 组怪物攻击预警测试 3 条（一步后攻击/两怪同攻/与 simMonAct 一致性）；I 组 UI/Playwright 测试因无 render_game_to_text 暂缓；172→199 全通过 | index.html / test.js | node test.js 199/199 |
| 2026-05-27 | feat | 新增格子信息层 CellInfoLayer：①`buildCellInfoMap()` 读取 G.elementCells/G.heroes/G.monsters/G.slots 及 buildMonsterStats/computeMonsterActionPreview 生成 cellInfoMap，结构含 entities/elementField/incomingEffects/selfCellDamagePreview/explosionPreview/splashIncomingPreview/monsterThreatPreview/summaryBadges；②UI 层新增 `renderCellDetail(ci)` 函数，分实体/元素场/本格结算/行动点来源四区展示；③更新 `onCell(r,c)`，无选中状态时切换格子详情面板（同格二次点击关闭）；④`render()` 调用 buildCellInfoMap+renderCellDetail；⑤`G.selectedCell` 新增至 initGame；⑥新增 #cd 面板及 CSS（.cd-pos/.cd-sec/.cd-badge/.cd-rule）；⑦新增测试 case_cellinfo_001~007，165→172 全通过 | index.html / test.js | node test.js 172/172 |
| 2026-05-27 | feat | 怪物格/空格结算规则分离：①`settleExplosions` 区分怪物格（有层即单体结算，不需达到引爆阈值，不触发十字）与空格（达到 willExplode 才十字引爆）；②新增 `buildMonsterStats()` 统计层，为每个怪物计算 selfCellDamage/splashDamage/finalPreview；③`computeHeroAttackPreview` 后处理区分怪物格/空格；④`buildBoardVM` dmgMap 同步区分；⑤怪物卡 UI 读取 monStats 显示预计扣血+☠死亡标记；⑥测试修复 验收-8（相邻格不受波及），更新 threshold=3 组两条期望值，新增 case_001~007 共 7 条，158→165 全通过 | index.html / test.js | node test.js 165/165 |
| 2026-05-26 | feat | 格子优先元素场：①`useSlot` 移除 hitCount/previewDamage 直伤，统一叠层（攻击怪物格与空地均一视同仁，仅叠 elementCells 层数）；②`settleExplosions` 改为十字范围引爆，explDmg(layers) 对十字内怪物和英雄各自结算，元素克制 ×2 在引爆时判定；③`computeHeroAttackPreview` 移除 simHit/tier 乘数，后处理阶段在引爆时将 explDmg 写到怪物所在格 monDmg；④`buildBoardVM` dmgMap 改为爆炸范围预览；⑤英雄卡承伤改为 `⚠×N -总伤` 格式；⑥测试从 156→158，替换 7 条过时用例，新增 2 条（空地引爆不崩溃、双元素同格引爆） | index.html / test.js | node test.js 158/158 |
| 2026-05-25 | feat | 怪物预览系统三项决策落地：①`simMonAct` 新增 `startPos/remainAp/stopReason` 返回字段（决策2）；②`computeMonWarn` 内部改为调用 `simMonAct`，log 预警与视觉预览来自同一模拟源（决策1）；③`heroIncomingDmg` 改为数组，英雄卡受伤显示从 `⚠-6` 升级为 `⚠-6;-3`（多怪各伤分列，决策3） | index.html | node test.js 156/156 |
| 2026-05-25 | fix | 怪物攻击方向扩展为左+下：①`monsterAct` 在左方检查后补充下方英雄攻击检查；②`simMonAct` 同步添加下方攻击模拟，确保英雄卡⚠-N 预览覆盖下方场景；③`computeMonWarn` 调整为 if/else if/else 结构，左/下均可触发 atk 类型预警 | index.html | node test.js 156/156 |
| 2026-05-25 | docs | 补充 graphify 使用边界：graphify 只作为总控 AI 的项目地图和影响范围分析工具，输出用于生成任务卡；执行 AI 仍只读任务卡指定文件，改代码前必须读真实源码，不能借图谱全量扫描项目 | docs/00_AI_PROJECT_RULES.md / tasks/doing/当前任务.md | rg 一致性检查；git diff --check |
| 2026-05-25 | docs | 明确固定口令“同步 ywh 工作流”：定义为以上游 ywh/ywh-game 为准，只同步项目工作流结构与 AI 入口，不改 index.html、test.js 或游戏核心代码；同步到入口文件、项目规则、决策记录和当前任务卡 | docs/00_AI_PROJECT_RULES.md / AGENTS.md / CLAUDE.md / .github/copilot-instructions.md / docs/09_DECISIONS.md / tasks/doing/当前任务.md | rg 一致性检查；git diff --check |
| 2026-05-25 | docs | 文档体系与多 AI 工作流清理：压缩 AGENTS/CLAUDE/Copilot 为薄入口；新增 CURRENT_CONTEXT、DECISIONS 和当前任务卡；将根目录 main/srd/数据/验收草稿归档并拆出攻击形状编号表、第一波教学脚本、基础数值表；将 Demo 门禁收敛为 10 份核心文档，补充任务卡分流、最小读取范围和单任务单代码编辑者规则 | AGENTS.md / CLAUDE.md / .github/copilot-instructions.md / docs/00_AI_PROJECT_RULES.md / docs/00_CURRENT_CONTEXT.md / docs/09_DECISIONS.md / tasks/doing/当前任务.md / docs/99_归档/** / docs/01_游戏设计（策划主导）/数值策划/** / docs/01_游戏设计（策划主导）/关卡策划/** / docs/02_程序开发（程序主导）/数据文件归档与分类规范.md / docs/04_测试验收（测试主导）/版本发布验收清单.md | node test.js 156/156；rg 结构检查 |
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
