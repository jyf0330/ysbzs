# 优化计划 · 元素背包史

> 基于 2026-06-09 代码审计。三个阶段，7 个优化点 + UI 层专项。
>
> 篇幅较长，按优先级排序。每个优化点含：现状 → 问题 → 方案 → 代码示例 → 验收标准。

---

## 目录

1. [P0：拆分 battle.cjs 上帝文件](#p0)
2. [P0：渲染机制分析与优化](#p0-ui-dom)
3. [P0：移动系统 —— 消除 moveMode: infinite 特判](#p0-move)
4. [P1：模块化 ux-app.js](#p1-module)
5. [P1：服务器 session 与状态持久化](#p1-session)
6. [P1：事件系统增强](#p1-events)
7. [P2：JSDoc 类型标注](#p2-jsdoc)
8. [P2：补单元测试](#p2-ut)
9. [P2：开发者工具](#p2-devtools)

---

## <a name="p0"></a>P0：拆分 battle.cjs 上帝文件

### 现状

```
src/core/battle.cjs — 956 行，39 个 function
```

一个文件承担了：

| 职责 | 函数举例 | 行数 |
|------|----------|------|
| 位置/移动 | `moveHero`, `moveUnitGeneral`, `canStandAt` | ~120 |
| 行动槽使用 | `useActionSlot`, `setActionDirection` | ~100 |
| 预览/威胁网格 | `buildPreviewGrid`, `threatGrid` | ~150 |
| 怪物 AI | `runMonsterTurn`, `targetPlan`, `sandboxPlanning` | ~200 |
| 回合流程 | `startBattle`, `endPlayerTurn`, `startNextRound` | ~80 |
| 自动战斗 | `runBattle` | ~50 |
| 通用工具 | `dist`, `clone`, `living`, `getUnit` | ~80 |
| 胜负判定 | `checkBattleEnd` | ~30 |
| 攻击路线 | `combatTargets`, `actionPaths` | ~80 |

### 问题

1. 改 `moveHero` 的校验逻辑，通读全文件才能确认不误伤其他函数
2. 新加一个命令要在 956 行的文件里找位置插
3. 无法单独 mock，测试只能跑完整战斗流程
4. `useActionSlot` 和 `previewGrid` 之间隐式依赖

### 方案

按职责拆成 5 个文件：

```
src/core/
  battle.cjs               ← 主入口 + 回合流程编排（~150 行）
  battle/
    position.cjs            ← 移动、站位、碰撞、同步棋盘
    actions.cjs             ← useActionSlot、setActionDirection
    preview.cjs             ← previewGrid、threatGrid
    ai.cjs                  ← 怪物 AI、沙盒规划、目标选择
```

**接口设计：**

```js
// battle/position.cjs
function moveHero(state, unitId, to)      // 返回 boolean
function moveUnitGeneral(state, unit, to)  // 无校验移动（供 trialEngine）
function canStandAt(state, actor, pos)     // 返回 boolean
function syncBoardUnits(state)
module.exports = { moveHero, moveUnitGeneral, canStandAt, syncBoardUnits, ... }

// battle/actions.cjs
function useActionSlot(state, unitId, slotId, targetCell)
function setActionDirection(state, unitId, slotId, dir)
module.exports = { useActionSlot, setActionDirection, ... }

// battle/preview.cjs
function buildPreviewGrid(state)            // 依赖 actions 的计算，但不调用它
function buildThreatGrid(state)
module.exports = { buildPreviewGrid, buildThreatGrid, ... }

// battle/ai.cjs
function runMonsterTurn(state)
function targetPlan(state, actor)
function sandboxPlanning(state)
module.exports = { runMonsterTurn, targetPlan, sandboxPlanning, ... }

// battle.cjs
const position = require('./battle/position.cjs');
const actions  = require('./battle/actions.cjs');
const preview  = require('./battle/preview.cjs');
const ai       = require('./battle/ai.cjs');

function startBattle(state) { /* 编排 */ }
function endPlayerTurn(state) { /* 编排 */ }
function runBattle(state) { /* 编排 */ }

module.exports = { startBattle, endPlayerTurn, runBattle, ...position, ...actions, ...preview, ...ai }
```

### 验收标准

```bash
npm test                          # 全部通过（行为不变）
diff -r src/core/ src/core/        # 旧 battle.cjs 缩小 800 行
node tools/check_browser_player_flow.cjs  # 浏览器验证
```

---

## <a name="p0-ui-dom"></a>P0：渲染机制分析与优化

### 当前的渲染机制

**触发渲染的两个入口：**

```js
// 入口 1：页面加载
loadView() → await api('/api/view') → render()

// 入口 2：每次按钮点击
runCommand() → await api('/api/action') → ui.vm = data.viewModel → render()
```

**`render()` 内部完整流程：**

```js
function render() {
  const vm = ui.vm;

  // ✅ 顶部状态条 — 直接改 .textContent（正确做法）
  $('phase-label').textContent = phaseText(vm.phase);
  $('day-label').textContent = `第${vm.day || 1}天 ${vm.period || ''}`;
  $('round-label').textContent = `${vm.round || 0}/${vm.maxRounds || '-'}`;
  $('gold-label').textContent = vm.gold ?? 0;
  $('p-castle-txt').textContent = pl ? `${pl.hp}/${pl.maxHp}` : '-/-';
  $('e-castle-txt').textContent = en ? `${en.hp}/${en.maxHp}` : '-/-';

  // ⚠️ 以下全部是 innerHTML = 全量 DOM 重建
  renderHeroes();     // innerHTML = heroes.map(h => `<button>...</button>`).join('')
  renderBoard();      // innerHTML = cells.map(c => `<button>...</button>`).join('')
  renderCellDetail(); // textContent
  renderSlots();      // innerHTML = flat.map(x => `<div>...</div>`).join('')
  renderControls();   // ✅ 逐个改 .disabled，非 innerHTML
  renderRewards();    // innerHTML = rewards.map(...)
  renderShop();       // innerHTML = offers.map(...)
  renderTrial();      // textContent
  renderLog();        // textContent（但 report 标签下会 fetch）
  maybeBanner();      // className 切换
}
```

**`renderBoard()` 是重灾区：**

```js
function renderBoard() {
  // ...设置 gridTemplateColumns（✅ 这个不重建）

  // ⚠️ 64 格全部删除重建
  $('board').innerHTML = board.cells.map(cell => {
    return `<button class="${classes.join(' ')}" data-r="..." data-c="..." ...>
      ${elements ? `<div class="element-stack">${elements}</div>` : ''}
      ${unit ? unitToken(unit) : '<span class="empty-dot">·</span>'}
      ${p ? `<span class="preview-num">...</span>` : ''}
      ${t ? `<span class="threat-num">...</span>` : ''}
    </button>`;
  }).join('');

  // ⚠️ 重新绑定 64 个监听器（旧的随 innerHTML 清除）
  qsa('.cell', $('board')).forEach(btn =>
    btn.addEventListener('click', () => onCellClick(...))
  );
}
```

### 点一次按钮的完整渲染链路

```
点棋盘空格
  → onCellClick(r, c)
  → SELECT_CELL API 调用（POST /api/action）
  → api 返回 data
  → ui.vm = data.viewModel        ← 新 ViewModel 对象
  → normalizeSelection()           ← 同步本地选中状态
  → render()                       ← ⚠️ 第 1 次全量渲染

    hero-list:   4 个按钮删了重建
    board:      64 个按钮删了重建 + 64 次事件绑定
    slot-list:   N 个槽删了重建 + N 次事件绑定
    shop/reward: 若有则重建
    log:         textContent 更新
    controls:    disabled 属性更新

  → finally: ui.busy = false;
  → render()                       ← ⚠️ 第 2 次全量渲染（重复）
```

**关键观察：** `runCommand` 的 `finally` 块里又调了一次 `render()`。等于每次点击渲染两遍。

### 三个核心问题

| # | 问题 | 后果 |
|---|------|------|
| 1 | `finally { render() }` 导致每次操作渲染两遍 | 浪费一倍算力，无任何收益 |
| 2 | `innerHTML` 全量重建 64 棋盘格 + N 行动槽 | DOM 节点反复创建销毁，绑定的监听器随 innerHTML 被清除 |
| 3 | `qsa('.cell').forEach(btn => addEventListener)` 每次绑定 N 个监听器 | 监听器数量随交互次数线性增长又销毁，可能产生闪烁 |

### 优化方案

#### 方案 A：先止血（改动 10 行，立即生效）

**A1：删掉 finally 里多余的 render**

```js
async function runCommand(type, payload = {}) {
  if (ui.busy) return;
  ui.busy = true;
  setBusy(true);
  try {
    const data = await api('/api/action', Object.assign({ type }, payload));
    ui.vm = data.viewModel || ui.vm;
    if (data.events && data.events.length)
      toast(data.events[data.events.length - 1].text || data.events[data.events.length - 1].type);
    normalizeSelection();
    render();            // ✅ 只在 try 里调一次
    return data;
  } catch (err) {
    toast(err.message || String(err), true);
    document.body.classList.add('shake');
    setTimeout(() => document.body.classList.remove('shake'), 300);
  } finally {
    ui.busy = false;
    // ❌ 删掉 render() — try 里已经调过了
    // render();
  }
}
```

**A2：事件委托替代 N 次绑定**

```js
// ✅ 棋盘：1 个监听器代替 64 个
$('board').addEventListener('click', ev => {
  const btn = ev.target.closest('[data-r]');
  if (btn) onCellClick(Number(btn.dataset.r), Number(btn.dataset.c));
});
// 删掉 qsa('.cell').forEach(...)

// ✅ 英雄列表：1 个监听器代替 4 个
$('hero-list').addEventListener('click', ev => {
  const btn = ev.target.closest('[data-hero-id]');
  if (btn) selectHero(btn.dataset.heroId);
});
// 删掉 qsa('.hero-card').forEach(...)

// ✅ 行动槽：1 个监听器代替 N 个
$('slot-list').addEventListener('click', ev => {
  const slot = ev.target.closest('[data-slot]');
  if (slot && !ev.target.closest('button')) selectSlot(Number(slot.dataset.slot));
  const dirBtn = ev.target.closest('[data-slot-dir]');
  if (dirBtn) setSlotDir(Number(dirBtn.dataset.slotDir), dirBtn.dataset.dir);
  const useBtn = ev.target.closest('[data-use]');
  if (useBtn) useSlot(Number(useBtn.dataset.use));
});
// 删掉 qsa('[data-slot]').forEach(...) 等三行

// ✅ 奖励列表：同理
// ✅ 商店列表：同理
// ✅ 日志标签：同理
```

绑定次数从 `O(N)` 降到 `O(1)`，且 render 不再需要重新绑定任何事件。

---

#### 方案 B：脏检查（对象引用对比，决定渲染范围）

每次 API 返回时 `ui.vm = data.viewModel` —— ViewModel 是一个**新对象**。基于这个特性，用引用比较判断哪些区域变了：

```js
function render() {
  const vm = ui.vm;
  if (!vm) return;

  // 引用比较：对象变了才重绘
  if (vm.heroes !== ui._lastHeroes)  renderHeroes();
  if (vm.board   !== ui._lastBoard)  renderBoard();
  if (vm.shop    !== ui._lastShop)   { renderShop(); renderRewards(); }
  if (vm.events  !== ui._lastEvents) renderLog();
  if (vm.day7Trial !== ui._lastTrial) renderTrial();

  // 值比较：数字/字符串变了才更新
  if (vm.gold !== ui._lastGold)  $('gold-label').textContent = vm.gold;
  if (vm.phase !== ui._lastPhase) $('phase-label').textContent = phaseText(vm.phase);
  if (vm.round !== ui._lastRound) $('round-label').textContent = `${vm.round}/${vm.maxRounds}`;

  // 英雄卡/行动槽/棋盘不变 → 不重绘 → 选中态闪烁消失
  // 存档当前引用，供下次比较
  ui._lastHeroes  = vm.heroes;
  ui._lastBoard   = vm.board;
  ui._lastShop    = vm.shop;
  ui._lastEvents  = vm.events;
  ui._lastTrial   = vm.day7Trial;
  ui._lastGold    = vm.gold;
  ui._lastPhase   = vm.phase;
  ui._lastRound   = vm.round;
}
```

**典型场景收益：**

| 操作 | 渲染区域 | 脏检查后 |
|------|----------|----------|
| 点英雄卡 | 全量 9 个子函数 | 仅 `heroes` + `board`（移动范围变化） |
| 点棋盘移动 | 全量 | 仅 `board`（位置变化）+ `heroes`（位置信息） |
| 生成奖励 | 全量 | 仅 `rewards` |
| 自动战斗 | 全量 | `board` + `heroes` + `slots` + `events`（全变了） |
| 新开一天 | 全量 | 全部重绘（因为 `vm` 整个换了） |

---

#### 方案 C：棋盘单格细粒度更新

在脏检查基础上，对棋盘从不重建升级为**逐格更新**：

```js
function renderBoard() {
  const vm = ui.vm;
  const board = vm.board || { rows: 0, cols: 0, cells: [] };

  // 尺寸变化时才重建 grid 和 DOM 结构
  if (board.cols !== ui._boardSize?.cols || board.rows !== ui._boardSize?.rows) {
    rebuildBoardStructure(board);
    ui._boardSize = { rows: board.rows, cols: board.cols };
    return;
  }

  // 正常情况：只更新有变化的格子
  board.cells.forEach(cell => {
    const btn = $('board').querySelector(`[data-r="${cell.r}"][data-c="${cell.c}"]`);
    if (!btn) return;

    // 只更新 className
    const newClass = computeCellClass(cell, vm, ui);
    if (btn.className !== newClass) btn.className = newClass;

    // 只更新元素层
    const elHTML = renderElementStack(cell.elements);
    const elEl = btn.querySelector('.element-stack');
    if (!elEl && elHTML) btn.insertAdjacentHTML('afterbegin', `<div class="element-stack">${elHTML}</div>`);
    else if (elEl && !elHTML) elEl.remove();
    else if (elEl && elEl.innerHTML !== elHTML) elEl.innerHTML = elHTML;

    // 只更新单位层
    const unit = unitById(cell.unitId);
    const token = btn.querySelector('.unit-token');
    if (unit && !token) btn.insertAdjacentHTML('beforeend', unitToken(unit));
    else if (!unit && token) token.remove();
    else if (unit && token && token._lastUnitId !== unit.id) {
      token.outerHTML = unitToken(unit);
    }

    // 只更新预览/威胁数字
    const preview = previewMap.get(`${cell.r},${cell.c}`);
    const threat  = threatMap.get(`${cell.r},${cell.c}`);
    updateLabel(btn, '.preview-num', preview ? `${preview.damage ?? preview.layers ?? '+'}` : null);
    updateLabel(btn, '.threat-num',  threat  ? `${threat.damage ?? threat.atk ?? '!'}`     : null);
  });
}

// 工具：只在变化时设置/移除标签
function updateLabel(parent, selector, text) {
  const el = parent.querySelector(selector);
  if (text && !el) parent.insertAdjacentHTML('beforeend', `<span class="${selector.slice(1)}">${text}</span>`);
  else if (!text && el) el.remove();
  else if (el && el.textContent !== text) el.textContent = text;
}
```

**收益对比：**

| 指标 | 当前 | 方案 A | 方案 B | 方案 C |
|------|------|--------|--------|--------|
| 一次点击渲染次数 | 2 | **1** | 1 | 1 |
| 棋盘格重建 | 64 格 | 64 格 | 64 格 | **N 格（仅变化的）** |
| 事件绑定/次 | 80+ 次 | **0 次** | 0 次 | 0 次 |
| 代码复杂度 | 低 | 低 | 中 | 中高 |
| 可加动画 | ❌ | ❌ | ❌ | ✅ |

### 验收标准

```js
// 1. 双 render 修复验证：在 runCommand 的 render() 前后加计数，确认每次操作只渲染一次
// 2. 事件委托验证：点击格子/英雄卡/行动槽，交互正常，Console 无报错
// 3. 脏检查验证：移动后只有 board 和 heroes 重绘，金币不变不更新 DOM
// 4. 单格更新验证：移动后只有旧位置和新位置的 HTML/className 变化
```

---

## <a name="p0-move"></a>P0：移动系统 —— 消除 moveMode: infinite 特判

### 现状

当前玩家英雄的移动靠一个特殊标志 `moveMode: 'infinite'` 来绕过 AP 距离检查：

```js
// battle.cjs:33
player: { leaderType: 'hero', moveMode: 'infinite', ... }
enemy:  { leaderType: 'boss', moveMode: 'stat_ap', ... }

// battle.cjs:44
function hasInfiniteMove(state, unit) {
  return factionRules(state, unitCamp(unit)).moveMode === 'infinite';
}

// battle.cjs:666 — moveHero 里
if (!hasInfiniteMove(state, unit) && d > Number(unit.ap || 3)) {
  pushEvent(state, 'MOVE_HERO_BLOCKED', ...);
  return false;
}

// battle.cjs:273 — 目标选择里
const standCells = hasInfiniteMove(state, actor)
  ? allStandCells(state, actor)                               // 所有空格
  : allStandCells(state, actor).filter(p => dist(p) <= ap);  // AP 范围内
```

涉及的文件：

| 文件 | 行数 |
|------|------|
| `src/core/battle.cjs` | 33, 44, 132, 254, 273, 359, 666, 677 |
| `src/core/state.cjs` | 179 |
| `src/core/mechanics.cjs` | 75 |

### 问题

1. **`moveMode: 'infinite'` 是一个逃避设计的 flag** —— 不是通过数据属性自然达到"覆盖全棋盘"的效果，而是用特判绕过距离校验
2. **两套逻辑维护** —— `moveHero` 和 `targetPlan` 里都有 `hasInfiniteMove` 分支，改一个容易漏另一个
3. **AP 对玩家英雄无意义** —— 玩家英雄有 AP 属性但从不消耗，新人看代码会困惑
4. **`mech_move_free_field` 以 flag 方式实现** —— 机制词条本应通过数据驱动，现在变硬编码

### 方案

**核心思路：去掉 `hasInfiniteMove` 这个函数，让所有单位移动都走同一套 AP 检查逻辑。为玩家英雄设定一个可以覆盖 8×8 棋盘的 AP 值，使其自然支持"棋盘内任意移动"。**

#### 改造步骤

**第一步：设定玩家英雄 AP 覆盖棋盘**

8×8 棋盘的最大曼哈顿距离是 `(7-0) + (7-0) = 14`。给出合理的 AP 值：

```js
// data/csv/01_宠物主表.csv 或 unitFactory.cjs
// 玩家英雄起始 AP 设为 14（覆盖全棋盘）
// 或更优雅：通过 BOARD_ROWS + BOARD_COLS 自动计算
```

**第二步：删除 `moveMode` 和相关函数**

```js
// state.cjs — 删除 factionRules 中的 moveMode
factionRules: {
  player: { leaderType: 'hero', terrainFormThreshold: 3, ... },
  enemy:  { leaderType: 'boss', terrainFormThreshold: 99, ... },
}

// battle.cjs — 删除
function defaultFactionRules() { ... }  // 删 moveMode 字段
function hasInfiniteMove(state, unit) { ... }  // 整个函数删除
```

**第三步：统一移动距离检查**

```js
function moveHero(state, unitId, to) {
  // ... 边界检查、占用检查、hasAttacked 检查 ...

  // ✅ 统一 AP 检查：所有单位走同一逻辑
  const d = dist(from, target);
  if (d > Number(unit.ap || 0)) {
    pushEvent(state, 'MOVE_HERO_BLOCKED', ...);
    return false;
  }

  // ... 移动 ...
}
```

**第四步：统一目标选择**

```js
// targetPlan / buildAutoPlan 里
const standCells = allStandCells(state, actor)
  .filter(p => dist(start, p) <= Number(actor.ap || 0));  // 统一 AP 范围
// 不再区分 infinite / stat_ap
```

#### 玩家英雄 AP 设定方案

| 方案 | AP 值 | 说明 |
|------|-------|------|
| A | 14（8×8 对角线） | 恰好覆盖全棋盘，无余量 |
| B | 16（BOARD_ROWS + BOARD_COLS） | 有余量，未来棋盘变大也能覆盖 |
| C | 99 | 简单粗暴，但数值上不优雅 |
| D | 不设固定值，由 CSV 配置 | 不同英雄有不同移动力 |

**推荐方案 D：** 在 `data/csv/01_宠物主表.csv` 里为每个英雄配置 AP 值。融焰娘 AP14 可以全图移动，其他英雄 AP 不同则移动范围不同。这样：

- 不再需要 `moveMode` flag
- 不同英雄有不同移动力 → 策略性出来
- CSV 改 AP 就改了移动范围，不改代码

### 涉及修改的文件

| 文件 | 改动 |
|------|------|
| `src/core/battle.cjs` | 删 `hasInfiniteMove`、`defaultFactionRules.moveMode`、统一 `moveHero` 距离检查、统一 `targetPlan` 目标选择 |
| `src/core/state.cjs` | 删 `createGameState` 中的 `factionRules.moveMode` |
| `src/core/mechanics.cjs` | 更新 `mech_move_free_field` 实现方式 | 
| `src/core/unitFactory.cjs` | 设定英雄 AP（从 CSV 读取） |
| `data/csv/01_宠物主表.csv` | 为每个英雄添加 AP 列 |

### 验收标准

```bash
# 1. 移动测试：英雄可以移动到全棋盘任意位置（AP 足够覆盖）
curl -s -X POST /api/action -d '{"type":"MOVE_HERO","unitId":"hero_pal_072_1","to":{"r":7,"c":7}}' | jq '.ok'
# 返回 true

# 2. 代码中无 hasInfiniteMove 引用
grep -r "hasInfiniteMove\|moveMode.*infinite" src/  # 无结果

# 3. 敌方移动仍然受 AP 限制
# 4. 全部测试通过
npm test
```

---

## <a name="p1-module"></a>P1：模块化 ux-app.js

### 现状

单文件 395 行 IIFE：

```js
(() => {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const qsa = (sel, root) => Array.from(root.querySelectorAll(sel));
  // ... 395 行
})();
```

所有变量在同一个闭包里：`ui.vm`, `ui.selectedUnitId`, `ui.slotArmed` ...

### 问题

1. 新增一个 UI 区域 → 在 395 行里找位置插 → 变量名冲突风险
2. 函数只能按引用顺序理解，不能单独阅读
3. 无法复用（没有 `import/export`）
4. 板上钉钉的架构层分离在文件层面不存在

### 方案

ES module 拆分，零构建工具，直接 `<script type="module">`。

```html
<!-- index.html -->
<script type="module" src="js/main.js"></script>
```

```
web/
  index.html
  ux-app.css
  js/
    main.js       ← loadView + render 编排 + bind()
    state.js      ← ui 对象 + normalizeSelection + selectedHero
    api.js        ← fetch /api/* + runCommand
    heroes.js     ← renderHeroes + selectHero
    board.js      ← renderBoard + onCellClick + legalMoveTargets
    slots.js      ← renderSlots + selectSlot + setSlotDir + useSlot
    shop.js       ← renderRewards + renderShop
    log.js        ← renderLog + switchTab
    ui.js         ← renderControls + renderCellDetail + renderTrial + hint
    util.js       ← esc / pct / clsForEl / phaseText / unitIcon / toast / $
```

**关键接口约定：**

```js
// board.js — 只导出渲染和事件处理，不持有状态
export function renderBoard(board, vm, ui) { ... }
export function onCellClick(r, c) { ... }

// state.js — 唯一持有可变状态
export const ui = {
  vm: null,
  selectedUnitId: null,
  selectedSlotGlobal: null,
  busy: false,
  slotArmed: false,
  _lastBoard: null,
  _lastHeroes: null,
  // ...
};

// main.js — 导入并启动
import { ui } from './state.js';
import { api, runCommand } from './api.js';
import { renderBoard } from './board.js';
// ...

function render() {
  renderBoard(ui.vm?.board, ui.vm, ui);
  renderHeroes(ui.vm?.heroes, ui);
  // ...
}
```

### 验收标准

```bash
npm test                          # 测试不受影响
# 页面刷新后所有交互正常工作
# 打开 Network 面板，确认 ux-app.js 不再加载（改为 js/main.js 等）
```

---

## <a name="p1-session"></a>P1：服务器 session 与状态持久化

### 现状

```js
// run_ui_server.cjs
let adapter = createYSBZSUIAdapter({ day: 1, period: '上午', gold: 8 });
```

一个全局 `adapter`，服务器重启 → 状态丢失。

### 问题

1. 多人同时使用不可能
2. 开发时改代码重启服务 → 手动重开游戏
3. 不能存档读档
4. 测试间不能隔离

### 方案

核心是给 `uiAdapter` 加序列化/反序列化，然后在服务器端加 session 管理。

**第一步：adapter 可序列化（改动 1 个文件）**

```js
// uiAdapter.cjs 新增
function serialize() {
  return JSON.stringify({ state: this.getStateSnapshot(), ... });
}
function deserialize(json) {
  const data = JSON.parse(json);
  // 重建 state 和 adapter 内部状态
  this.state = data.state;
  // ...
}
```

**第二步：服务器 session 管理（改动 run_ui_server.cjs）**

```js
const sessions = new Map();   // key = sessionId
const DEFAULT_SESSION = '_default';

function getSession(req) {
  const id = req.headers['x-session-id'] || DEFAULT_SESSION;
  if (!sessions.has(id)) {
    const a = createYSBZSUIAdapter({ day: 1, gold: 8 });
    sessions.set(id, a);
  }
  return sessions.get(id);
}

// handleApi 里 adapter 改为 getSession(req)
```

**第三步：持久化（可选）**

```js
const fs = require('fs');
const SAVE_FILE = path.join(__dirname, '..', 'save.json');

// 每 30 秒自动存档
setInterval(() => {
  const data = Array.from(sessions.entries()).map(([k, a]) => [k, a.serialize()]);
  fs.writeFileSync(SAVE_FILE, JSON.stringify(Object.fromEntries(data)));
}, 30000);

// 启动时读档
if (fs.existsSync(SAVE_FILE)) {
  const data = JSON.parse(fs.readFileSync(SAVE_FILE, 'utf-8'));
  Object.entries(data).forEach(([k, v]) => sessions.set(k, deserializeAdapter(v)));
}
```

### 验收标准

```js
// 1. 浏览器 F5 刷新后状态还在
// 2. `curl -X POST /api/session/new` 创建新 session 且不影响旧 session
// 3. 杀死服务器重启 → 状态恢复
```

---

## <a name="p1-events"></a>P1：事件系统增强

### 现状

`events.cjs` 共 3 行：

```js
function pushEvent(state, type, payload) {
  const evt = { step: state.nextStep++, phase: state.phase, round: state.round || 0, type, ...payload };
  state.events.push(evt);
  return evt;
}
```

事件结构是开放的——`payload` 可以带任何字段。没有事件类型表，没有过滤工具。

### 问题

1. 想知道有哪些事件类型 → 只能 grep `pushEvent(state, '`
2. 想看某类事件 → 手动写 `state.events.filter(e => e.type === ...)`
3. 错误事件没有分类（致命错误 vs 操作驳回 vs 信息）
4. 事件和 ViewModel 之间没有映射关系

### 方案

```js
// src/core/events.cjs — 增强版

// 事件类型枚举
const EVENT_TYPES = Object.freeze({
  // 回合流程
  PHASE_CHANGE:        'PHASE_CHANGE',
  ROUND_CHANGE:        'ROUND_CHANGE',

  // 移动
  MOVE_HERO:           'MOVE_HERO',
  MOVE_HERO_BLOCKED:   'MOVE_HERO_BLOCKED',

  // 行动
  USE_SLOT:            'USE_SLOT',
  USE_SLOT_BLOCKED:    'USE_SLOT_BLOCKED',
  SET_DIRECTION:       'SET_ACTION_DIRECTION',

  // 战斗
  BATTLE_START:        'BATTLE_START',
  BATTLE_END:          'BATTLE_END',
  MONSTER_ACTION:      'MONSTER_ACTION',

  // 元素
  ELEMENT_ADD:         'ELEMENT_ADD',
  ELEMENT_CONSUME:     'ELEMENT_CONSUME',
  EXPLOSION:           'ELEMENT_EXPLOSION',

  // 商店
  SHOP_ENTER:          'SHOP_ENTER',
  SHOP_EXIT:           'SHOP_EXIT',
  BUY:                 'BUY_OFFER',
  REWARD:              'REWARD_PICK',
});

// 事件严重级别
const EVENT_LEVEL = Object.freeze({
  INFO:    'info',
  WARNING: 'warning',
  ERROR:   'error',
  SUCCESS: 'success',
});

function pushEvent(state, type, payload = {}, level = EVENT_LEVEL.INFO) {
  const evt = {
    step: state.nextStep++,
    phase: state.phase,
    round: state.round || 0,
    type,
    level,
    timestamp: Date.now(),
    ...payload,
  };
  state.events.push(evt);
  return evt;
}

// 过滤工具
function filterEvents(state, opts = {}) {
  const { type, phase, level, limit, offset } = opts;
  let list = state.events;
  if (type)  list = list.filter(e => e.type === type || (Array.isArray(type) && type.includes(e.type)));
  if (phase) list = list.filter(e => e.phase === phase);
  if (level) list = list.filter(e => e.level === level);
  if (offset) list = list.slice(offset);
  if (limit)  list = list.slice(-limit);
  return list;
}

module.exports = { pushEvent, filterEvents, EVENT_TYPES, EVENT_LEVEL };
```

**日志渲染随之升级：**

```js
// log.js — 给不同类型/级别的事件加颜色
function renderLog() {
  const events = ui.vm.events || [];
  $('log').innerHTML = events.slice(-22).map(e => {
    const cls = e.level === 'error' ? 'log-error'
               : e.level === 'warning' ? 'log-warn'
               : e.level === 'success' ? 'log-success'
               : 'log-info';
    return `<div class="${cls}">${esc(e.text || e.type)}</div>`;
  }).join('\n');
}
```

### 验收标准

```js
filterEvents(state, { type: EVENT_TYPES.MOVE_HERO }).length  // 本次战斗移动次数
filterEvents(state, { level: EVENT_LEVEL.ERROR }).length       // 错误操作次数
```

---

## <a name="p2-jsdoc"></a>P2：JSDoc 类型标注

### 现状

全项目 `.cjs`，无任何类型信息。

```js
function moveHero(state, unitId, to) {
  const unit = getUnit(state, unitId);
  // ...
}
```

`state` 长什么样？`unitId` 是 string 还是 number？`to` 的结构是 `{r, c}` 还是其他？全部靠读代码推测。

### 问题

1. 新接手改一处逻辑，不确定返回值类型
2. 改 `state.board` 结构 → IDE 无法提示哪些文件引用了它
3. `.cjs` 不支持 TypeScript，但 JSDoc 可以被 `tsc --checkJs` 检查和 IDE 理解

### 方案

JSDoc + `// @ts-check` 模式，逐步引入，不改文件后缀。

```js
// src/core/state.cjs — 核心类型定义

/**
 * @typedef {Object} Position
 * @property {number} r - 行 (0-based)
 * @property {number} c - 列 (0-based)
 */

/**
 * @typedef {Object} Unit
 * @property {string} id
 * @property {string} name
 * @property {string} displayName
 * @property {'hero'|'enemy'|'boss'|'hero_leader'} side
 * @property {Position} position
 * @property {number} hp
 * @property {number} maxHp
 * @property {number} ap - 行动力
 * @property {number} [atk]
 * @property {boolean} [hasAttacked]
 * @property {string} [element]
 * @property {Slot[]} [slots]
 */

/**
 * @typedef {Object} Cell
 * @property {number} r
 * @property {number} c
 * @property {string|null} unitId
 * @property {Object<string, number>} elements - 元素层 { 火: 3, 水: 1 }
 * @property {Object} [preview] - 预览层
 * @property {Object} [threat] - 威胁层
 */

/**
 * @param {GameState} state
 * @param {string} unitId
 * @param {Position} to
 * @returns {boolean}
 */
function moveHero(state, unitId, to) { ... }
```

在 `battle.cjs` 文件头加：

```js
// @ts-check
```

IDE 和 `npx tsc --noEmit --checkJs` 就能做类型检查了。

### 验收标准

```bash
npx tsc --noEmit --checkJs src/core/*.cjs  # 零错误
# IDE 中 hover moveHero → 显示完整的参数类型和返回值
```

---

## <a name="p2-ut"></a>P2：补单元测试

### 现状

```
tests/
  csv_source.test.cjs             ← CSV 校验（7 个测试点，全集成）
  day7_fire_trial.test.cjs        ← 试炼集成（1 个测试点）
  full_coverage.test.cjs          ← 全流程覆盖（9 个测试点）
  full_player_operations.test.cjs ← 玩家操作链路（12 个测试点）
  leader_boss_rules.test.cjs      ← 领袖Boss规则（集成）
  planning_ai_rules.test.cjs      ← AI 规则（集成）
  ui_adapter.test.cjs             ← 适配层（15 个测试点）
  run_all_tests.cjs               ← 测试编排
```

全部是**集成测试**——建立一个完整 state，跑完整流程，断言最终结果。

### 问题

1. `battle.moveHero` 里的 `hasAttacked` 拦截 → 要跑完整战斗才能测
2. `ap` 距离校验 → 同上
3. 边界检查 → 同上
4. 集成测试失败时不知道是哪个环节出问题

### 方案

每个核心函数拆出来后，单独建单元测试文件。

```
tests/
  unit/
    position.test.cjs   ← moveHero、moveUnitGeneral、canStandAt
    actions.test.cjs    ← useActionSlot、setActionDirection
    preview.test.cjs    ← buildPreviewGrid、buildThreatGrid
    ai.test.cjc         ← targetPlan、sandboxPlanning
```

**示例：`tests/unit/position.test.cjs`**

```js
const { createGameState } = require('../../src/core/state.cjs');
const { moveHero } = require('../../src/core/battle/position.cjs');
const { startBattle } = require('../../src/core/battle.cjs');

describe('moveHero', () => {
  test('AP 不足时返回 false', () => {
    const state = createGameState({ day: 1 });
    startBattle(state);
    const hero = state.units.find(u => u.side === 'hero');
    hero.ap = 1;
    const result = moveHero(state, hero.id, { r: 7, c: 7 }); // 距离 > 1
    expect(result).toBe(false);
  });

  test('hasAttacked 为 true 时禁止移动', () => {
    const state = createGameState({ day: 1 });
    startBattle(state);
    const hero = state.units.find(u => u.side === 'hero');
    hero.hasAttacked = true;
    const result = moveHero(state, hero.id, { r: 3, c: 3 });
    expect(result).toBe(false);
  });

  test('移出棋盘边界返回 false', () => {
    const state = createGameState({ day: 1 });
    startBattle(state);
    const hero = state.units.find(u => u.side === 'hero');
    const result = moveHero(state, hero.id, { r: -1, c: 0 });
    expect(result).toBe(false);
  });
});
```

**测试也纳入校验命令：**

```bash
# package.json
"test:unit": "node --test tests/unit/*.test.cjs"
```

### 验收标准

```bash
npm run test:unit         # 新增单元测试全部通过
npm run test:coverage     # 覆盖率不降反升
```

---

## <a name="p2-devtools"></a>P2：开发者工具

### 现状

唯一调试方式：`console.log` 和浏览器 DevTools。

没有：
- 状态 diff 工具（改前 vs 改后）
- 事件时间线可视化
- 回放比对器（两次同样的操作序列结果是否一致）

### 方案

#### 工具 1：状态快照对比器

```js
// tools/inspect_state_diff.cjs
// 使用方法：node tools/inspect_state_diff.cjs <snapshot-before.json> <snapshot-after.json>
const fs = require('fs');
const before = JSON.parse(fs.readFileSync(process.argv[2]));
const after  = JSON.parse(fs.readFileSync(process.argv[3]));

function deepDiff(b, a, path = '') {
  const diffs = [];
  const allKeys = new Set([...Object.keys(b), ...Object.keys(a)]);
  for (const k of allKeys) {
    const curPath = path ? `${path}.${k}` : k;
    if (typeof b[k] !== typeof a[k]) {
      diffs.push({ path: curPath, from: b[k], to: a[k], reason: 'type_change' });
    } else if (typeof b[k] === 'object' && b[k] !== null && a[k] !== null) {
      diffs.push(...deepDiff(b[k], a[k], curPath));
    } else if (b[k] !== a[k]) {
      diffs.push({ path: curPath, from: b[k], to: a[k], reason: 'value_change' });
    }
  }
  return diffs;
}

const diffs = deepDiff(before, after);
console.log(JSON.stringify(diffs, null, 2));
```

#### 工具 2：UI 注入调试面板

```js
// web/js/debug.js — 按 Ctrl+` 打开
export function toggleDebugPanel() {
  const panel = document.getElementById('ysbzs-debug');
  if (panel) { panel.remove(); return; }

  const vm = ui.vm;
  const html = `
    <div id="ysbzs-debug" style="position:fixed;bottom:0;right:0;width:400px;height:300px;
         background:#111;color:#0f0;font:12px monospace;overflow:auto;z-index:9999;padding:8px;">
      <div><strong>phase:</strong> ${vm?.phase}</div>
      <div><strong>events:</strong> ${vm?.events?.length || 0}</div>
      <div><strong>heroes:</strong> ${vm?.heroes?.length || 0}</div>
      <div><strong>selected:</strong> ${JSON.stringify(vm?.selected)}</div>
      <div><strong>last api:</strong> <span id="ysbzs-debug-last">-</span></div>
      <button onclick="document.querySelector('#ysbzs-debug').remove()">关闭</button>
    </div>`;
  document.body.insertAdjacentHTML('beforeend', html);
}
```

#### 工具 3：事件序列比对器

```js
// tools/compare_replays.cjs
// node tools/compare_replays.cjs replay-a.json replay-b.json
const a = JSON.parse(fs.readFileSync(process.argv[2]));
const b = JSON.parse(fs.readFileSync(process.argv[3]));

const mismatches = [];
const maxLen = Math.max(a.events.length, b.events.length);

for (let i = 0; i < maxLen; i++) {
  const ea = a.events[i];
  const eb = b.events[i];
  if (!ea) { mismatches.push({ step: i, missing: 'a', event: eb }); continue; }
  if (!eb) { mismatches.push({ step: i, missing: 'b', event: ea }); continue; }
  if (ea.type !== eb.type || ea.text !== eb.text) {
    mismatches.push({ step: i, a: ea, b: eb });
  }
}

if (mismatches.length === 0) {
  console.log('PASS: 两条事件序列一致');
} else {
  console.log(`FAIL: ${mismatches.length} 处差异`);
  console.log(JSON.stringify(mismatches, null, 2));
}
```

### 验收标准

```bash
node tools/inspect_state_diff.cjs save-before.json save-after.json
# 输出发生变化的字段路径

node tools/compare_replays.cjs replay-1.json replay-2.json
# PASS: 两条事件序列一致
```

---

## 实施顺序建议

| 轮次 | 做什么 | 预估耗时 | 风险 |
|------|--------|----------|------|
| 第 1 轮 | 拆分 battle.cjs | 2-4 小时 | 低——纯拆分，不改行为，跑测试 |
| 第 2 轮 | ux-app.js 模块化 + 事件委托 | 2 小时 | 低——拆分 + 删 addEventListener 循环 |
| 第 3 轮 | 事件系统增强 + 类型标注 | 1-2 小时 | 中——需要改所有 pushEvent 调用点 |
| 第 4 轮 | 增量 DOM 更新 | 1-2 小时 | 中——render 逻辑变了，需要验证 |
| 第 5 轮 | 服务器 session | 1 小时 | 低——纯新增，不碰旧逻辑 |
| 第 6 轮 | 补单元测试 + 开发者工具 | 持续 | 低——纯新增 |

**推荐：** 先做第 1 轮和第 2 轮（架构拆分），再做第 4 轮和第 5 轮（功能增强），单元测试和工具穿插进行。
