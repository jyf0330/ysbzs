# 单文件拆分模块化实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 4981 行单文件 `index.html` 拆分为 4 个模块文件，保持功能不变，通过 `node test.js` 全量测试

**Architecture:** 保持单文件运行时架构（无构建工具），通过 `<script>` 标签顺序加载模块；核心层（game.js）+ 数据层（data.js）+ UI 层（ui.js）+ 入口壳（index.html）

**Tech Stack:** Vanilla JS，无框架，无构建工具

---

## 文件结构

```
ysbzs/
├── index.html          # 入口壳：CSS + HTML 结构 + <script> 加载顺序
├── data.js             # 数据层：UNIT_DEFS, SHOP_POOLS, 常量, 配置
├── game.js             # 核心层：G 状态, 战斗规则, 元素系统, 商店逻辑
├── ui.js               # UI 层：renderXxx, buildXxxVM, DOM 操作
├── test.js             # 测试：保持不变，仍通过 eval 加载 index.html
└── docs/plans/         # 本计划
```

### 模块职责

| 文件 | 职责 | 行数(估) | 依赖 |
|------|------|----------|------|
| `data.js` | 常量、UNIT_DEFS、SHOP_POOLS、配置表 | ~600 | 无 |
| `game.js` | 全局状态 G、战斗规则、元素系统、商店逻辑、怪物 AI | ~2800 | data.js |
| `ui.js` | renderXxx、buildXxxVM、DOM 操作、事件绑定 | ~1500 | game.js |
| `index.html` | CSS、HTML 结构、script 加载 | ~30 | data.js, game.js, ui.js |

---

## Task 1: 创建 `data.js` — 数据层

**Files:**
- Create: `data.js`

**提取内容：**
- L763-766: `EL`, `EC`, `ADV` 常量
- L798-1369: `UNIT_DEFS` 完整定义
- L1370: `GRADE_BASE`, `calcUnitPrice`
- L1372-1381: `REWARD_NODE_CONFIG`
- L1410-1421: `DAY_ROUND_CONFIG`
- L2795+: `SHOP_POOLS`

- [ ] **Step 1: 创建 data.js 文件头**

```javascript
/**
 * 元素背包史 · 数据层
 * 包含：常量、单位定义、商店池、配置表
 * 依赖：无
 */
```

- [ ] **Step 2: 提取元素常量**

从 `index.html` L763-766 复制：

```javascript
const EL = {fire:'火',water:'水',wind:'风',earth:'土'};
const EL_ORDER = ['fire','water','wind','earth'];
const EC = {fire:'#d4855e',water:'#5e95b5',wind:'#6ea86c',earth:'#b8844a'};
const ADV = {water:'fire',fire:'wind',wind:'earth',earth:'water'};
const ELICON = {fire:'🔥',water:'💧',wind:'🌬',earth:'🪨'};
const ELNAME = {fire:'火',water:'水',wind:'风',earth:'土'};
```

- [ ] **Step 3: 提取 UNIT_DEFS**

从 `index.html` L798-1369 完整复制 `UNIT_DEFS` 对象。

- [ ] **Step 4: 提取商店与配置**

从 `index.html` 复制：
- `GRADE_BASE` + `calcUnitPrice` (L1370)
- `REWARD_NODE_CONFIG` (L1372-1381)
- `DAY_ROUND_CONFIG` (L1410-1421)
- `SHOP_POOLS` (L2795+)

- [ ] **Step 5: 验证 data.js 语法**

```bash
node -e "require('./data.js')" 2>&1 || node --check data.js
```

预期：无语法错误（或 "require is not defined" 正常报错）

- [ ] **Step 6: 提交**

```bash
git add data.js
git commit -m "refactor: extract data layer to data.js"
```

---

## Task 2: 创建 `game.js` — 核心层

**Files:**
- Create: `game.js`

**提取内容：**
- L1384: `let G;` 全局状态声明
- L1386-1408: 城堡系统函数
- L1422-1483: `initGame`, `mkBoard`
- L1491-1598: 波次生成、怪物生成
- L1599-1658: 形状旋转、攻击范围、位置查询
- L1656-1838: 元素系统 (`addEl`, `settleExplosions` 等)
- L1840-1908: 伤害系统 (`dealDmg`, `useSlot`)
- L1909-1974: 英雄选择、移动、行动槽
- L2162-2260: 回合管理 (`endPlayerTurn`, `monsterAct`)
- L4096-4219: `dispatchGameAction`, `applyActionToState`
- 商店逻辑: `openShop`, `buyUnit`, `sellUnit`, `rollShop`
- 召唤引擎: `spawnSummon`, `runSummonActions`, `killSummon`
- AI 战斗: `buildAiBattleTurnPlan`, `runAiBattleTurn_sync`

- [ ] **Step 1: 创建 game.js 文件头**

```javascript
/**
 * 元素背包史 · 核心层
 * 包含：全局状态 G、战斗规则、元素系统、商店逻辑、怪物 AI、召唤引擎
 * 依赖：data.js
 */
```

- [ ] **Step 2: 提取全局状态声明**

```javascript
// 全局状态（唯一可变状态源）
let G;
```

- [ ] **Step 3: 提取城堡系统函数**

从 `index.html` L1386-1408 复制：
- `playerCastleAt(pos)`
- `enemyCastleAt(pos)`
- `castleAt(pos)`
- `damagePlayerCastle(dmg, src)`
- `enemyCastle(dmg, src)`

- [ ] **Step 4: 提取棋盘与初始化**

从 `index.html` 复制：
- `mkBoard()` (L1485-1489)
- `initGame()` (L1428-1483)
- `syncMaxRoundForPhase()` (L1422-1427)

- [ ] **Step 5: 提取位置查询函数**

从 `index.html` L1630-1658 复制：
- `monAt(pos)`
- `heroAt(pos)`
- `cellFree(pos)`
- `boardRows()`, `boardCols()`
- `inBoard(pos)`
- `canHeroAttackEnemyFrom(pos, hid)`

- [ ] **Step 6: 提取元素系统**

从 `index.html` L1656-1838 复制：
- `addEl(pos, el)`
- `explDmg(stk)`
- `calcElementLayerDamage(layers)`
- `explCells(pos)`
- `topElementAt(pos)`
- `hasElementAt(pos)`
- `syncBoardElementFromElementCells(pos)`
- `clearElementAt(pos, el)`
- `doExplode(pos)`
- `recomputeGrowth()`
- `calcHealAmount()`
- `calcHealAtkGain()`
- `settleExplosions()`
- `settleDamage()`

- [ ] **Step 7: 提取伤害与战斗函数**

从 `index.html` L1840-1974 复制：
- `dealDmg(monster, dmg, src)`
- `useSlot(idx)`
- `commitPlayerActionsToElementField(G)`
- `checkAllDead()`
- `selHero(id)`
- `moveHero(r, c)`
- `selSlot(idx)`
- `updPreview()`
- `setDir(idx, dir)`
- `setHero(idx, hid)`

- [ ] **Step 8: 提取回合管理**

从 `index.html` L2162-2260+ 复制：
- `endPlayerTurn()`
- `monsterAct(m)`
- `simMonAct(m)` (预览)
- `nextMoveFromPos(pos, m)`
- `finishMonsters()`

- [ ] **Step 9: 提取商店逻辑**

从 `index.html` 复制：
- `openShop()`
- `buyUnit(idx)`
- `sellUnit(idx)`
- `rollShop()`
- `genShop()`
- `freezeShopItem(type, idx)`

- [ ] **Step 10: 提取召唤引擎**

从 `index.html` 复制：
- `spawnSummon(heroId, pos, el)`
- `summonAt(pos)`
- `runSummonActions()`
- `killSummon(sm, src)`
- `healSummons(heroId)`
- `calcSproutSpawnParams(heroId)`

- [ ] **Step 11: 提取 AI 战斗**

从 `index.html` 复制：
- `buildAiBattleTurnPlan()`
- `runAiBattleTurn_sync()`
- `runAiBattleTurn_async()`
- `execAllHeroSlots()`

- [ ] **Step 12: 提取 dispatch 系统**

从 `index.html` L4096-4219 复制：
- `dispatchGameAction(action)`
- `applyActionToState(action)`
- `refreshUI()`
- `recomputeCorePreview()`

- [ ] **Step 13: 验证 game.js 语法**

```bash
node --check game.js
```

预期：无语法错误

- [ ] **Step 14: 提交**

```bash
git add game.js
git commit -m "refactor: extract core layer to game.js"
```

---

## Task 3: 创建 `ui.js` — UI 层

**Files:**
- Create: `ui.js`

**提取内容：**
- L3174-3232: `buildBoardVM`
- L3233-3439: `buildPreviewGrid`
- L3440-3471: `buildHeroesVM`, `buildSlotsVM`, `buildTurnVM`
- L3472-3550: `buildBattleVM`
- L3551-3839: `buildPreviewGrid` 辅助函数
- L3840-4095: `renderDebugPanel`
- L4220-4235: `render()`
- L4236-4345: `renderBoard(boardVM)`
- L4346-4537: `renderCellDetail(cell)`
- L4538-4565: `renderHS(heroesVM)`
- L4566-4613: `renderSlots(slotsVM)`
- L4614-4698: `renderTurn(turnVM)`
- L4699+: `renderShop()`
- 事件绑定函数

- [ ] **Step 1: 创建 ui.js 文件头**

```javascript
/**
 * 元素背包史 · UI 层
 * 包含：ViewModel 构建、DOM 渲染、事件绑定
 * 依赖：game.js (G 状态), data.js (常量)
 */
```

- [ ] **Step 2: 提取 ViewModel 构建函数**

从 `index.html` 复制：
- `buildBoardVM()` (L3174-3232)
- `buildHeroesVM()` (L3440-3448)
- `buildSlotsVM()` (L3449-3458)
- `buildTurnVM()` (L3459-3471)
- `buildBattleVM()` (L3472-3550)

- [ ] **Step 3: 提取 buildPreviewGrid**

从 `index.html` L3233-3439 + L3551-3839 完整复制 `buildPreviewGrid` 及其辅助函数。

- [ ] **Step 4: 提取渲染函数**

从 `index.html` 复制：
- `render()` (L4220-4235)
- `renderBoard(boardVM)` (L4236-4345)
- `renderCellDetail(cell)` (L4346-4537)
- `renderHS(heroesVM)` (L4538-4565)
- `renderSlots(slotsVM)` (L4566-4613)
- `renderTurn(turnVM)` (L4614-4698)
- `renderShop()` (L4699+)
- `renderDebugPanel()` (L3840-4095)

- [ ] **Step 5: 提取事件绑定函数**

从 `index.html` 复制：
- `onCellClick(r, c)`
- `onSlotUse(idx)`
- `onHeroSelect(id)`
- `onDirChange(idx, dir)`
- 其他 DOM 事件处理函数

- [ ] **Step 6: 验证 ui.js 语法**

```bash
node --check ui.js
```

预期：无语法错误

- [ ] **Step 7: 提交**

```bash
git add ui.js
git commit -m "refactor: extract UI layer to ui.js"
```

---

## Task 4: 重构 `index.html` — 入口壳

**Files:**
- Modify: `index.html`

**改动：**
1. 保留 CSS（L1-762）
2. 保留 HTML 结构（L4900+）
3. 删除所有 JS 代码（L763-4899）
4. 添加 script 加载标签

- [ ] **Step 1: 备份当前 index.html**

```bash
cp index.html index.html.bak
```

- [ ] **Step 2: 重写 index.html**

保留 CSS 和 HTML 结构，替换 JS 部分为：

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<title>元素背包史 · Demo v0.1</title>
<style>
/* 保留原有 CSS L1-762 */
</style>
</head>
<body>
<!-- 保留原有 HTML 结构 -->

<!-- 模块加载顺序：data → game → ui -->
<script src="data.js"></script>
<script src="game.js"></script>
<script src="ui.js"></script>
</body>
</html>
```

- [ ] **Step 3: 验证 index.html 语法**

在浏览器打开 `index.html`，确认：
- 页面正常加载
- 棋盘显示正常
- 可以点击操作

- [ ] **Step 4: 提交**

```bash
git add index.html
git commit -m "refactor: convert index.html to entry shell with script tags"
```

---

## Task 5: 适配测试文件

**Files:**
- Modify: `test.js`

**改动：**
修改 eval 加载逻辑，从多文件加载

- [ ] **Step 1: 修改 test.js 加载逻辑**

找到 L29-36，修改为：

```javascript
// ── 载入游戏脚本（多文件模式）───────────────────────────────
const htmlPath = process.env.YSBZS_HTML_PATH || path.join(__dirname, 'index.html');
const dataPath = path.join(__dirname, 'data.js');
const gamePath = path.join(__dirname, 'game.js');
const uiPath = path.join(__dirname, 'ui.js');

const dataScript = fs.readFileSync(dataPath, 'utf8');
const gameScript = fs.readFileSync(gamePath, 'utf8').replace(/\bconst\b/g, 'var').replace(/\blet\b/g, 'var');
const uiScript = fs.readFileSync(uiPath, 'utf8').replace(/\bconst\b/g, 'var').replace(/\blet\b/g, 'var');

global.__TEST__ = true;
eval(dataScript);
eval(gameScript);
eval(uiScript);
```

- [ ] **Step 2: 运行测试**

```bash
node test.js
```

预期：405+ 通过，17 失败（与当前基准一致）

- [ ] **Step 3: 提交**

```bash
git add test.js
git commit -m "refactor: adapt test.js for multi-file loading"
```

---

## Task 6: 清理与验证

**Files:**
- Modify: `index.html` (删除备份)
- Modify: `docs/02_程序开发（程序主导）/技术架构总览.md`

- [ ] **Step 1: 删除备份文件**

```bash
rm index.html.bak
```

- [ ] **Step 2: 更新技术架构总览**

更新项目结构部分：

```markdown
## 项目结构

├── index.html          # 入口壳（CSS + HTML + script 加载）
├── data.js             # 数据层（常量、UNIT_DEFS、SHOP_POOLS）
├── game.js             # 核心层（G 状态、战斗规则、元素系统）
├── ui.js               # UI 层（ViewModel、DOM 渲染）
├── test.js             # 测试
└── docs/
```

- [ ] **Step 3: 全量测试验证**

```bash
node test.js
```

预期：与拆分前一致（405+ 通过，17 失败）

- [ ] **Step 4: 更新 CHANGELOG**

在 `docs/10_CHANGELOG.md` 添加：

```markdown
## 2026-06-02 架构重构：单文件拆分模块化

- 将 index.html (4981行) 拆分为 data.js + game.js + ui.js + index.html
- data.js: 数据层（~600行）— 常量、UNIT_DEFS、SHOP_POOLS
- game.js: 核心层（~2800行）— G 状态、战斗规则、元素系统、商店逻辑
- ui.js: UI 层（~1500行）— ViewModel、DOM 渲染
- index.html: 入口壳（~30行）— CSS + HTML + script 加载
- 测试通过率不变（405+ 通过，17 失败）
```

- [ ] **Step 5: 最终提交**

```bash
git add -A
git commit -m "refactor: complete single-file to multi-file split"
```

---

## 验收标准

| 检查项 | 预期结果 |
|--------|----------|
| `node test.js` | 405+ 通过，17 失败（与拆分前一致） |
| 浏览器打开 `index.html` | 页面正常加载，棋盘显示正常 |
| 点击棋盘格 | 打开详情面板 |
| 选中英雄移动 | 英雄位置更新 |
| 使用行动槽 | 元素生成，怪物受伤 |
| 商店开启 | 商品显示正常 |
| 文件行数 | data.js ~600, game.js ~2800, ui.js ~1500, index.html ~30 |

---

## 风险与缓解

| 风险 | 缓解 |
|------|------|
| 全局变量污染 | 使用 `<script>` 顺序加载，data → game → ui |
| 测试加载失败 | 适配 test.js 多文件加载逻辑 |
| 函数未定义 | 按依赖顺序提取，game.js 依赖 data.js，ui.js 依赖 game.js |
| CSS 选择器失效 | 保留原有 HTML 结构不变 |

---

## 后续优化（不在本次范围）

- [ ] 引入构建工具（Vite/Rollup）支持模块化
- [ ] TypeScript 类型安全
- [ ] 状态管理封装（createGameState 工厂函数）
- [ ] ADR 文档记录架构决策
