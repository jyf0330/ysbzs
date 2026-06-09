# UI 功能缺口分析

> 对比 2026-06-06（旧多文件 UI）与 2026-06-09（重构单文件 UI）之间的功能差异。
>
> 后端接口已存在但界面未暴露，或旧界面有但新界面缺失的功能。

---

## 总览

| 分类 | 缺口数量 |
|------|---------|
| 后端有接口、新 UI 没调 | 8 |
| 旧 UI 有、新 UI 无（纯前端） | 3 |
| 新 UI 有但交互不如旧版 | 2 |

---

## 一、后端有接口，新 UI 没调用

### 1. 阵容管理：SELL_UNIT / TOGGLE_UNIT_ACTIVE

**后端接口：**

```js
'SELL_UNIT'            // 出售宠物（返回金币）
'TOGGLE_UNIT_ACTIVE'   // 上阵/备战切换
```

**旧 UI（3 天前）：**

```html
<!-- 宠物卡底部按钮 -->
<button onclick="sellUnit('${u.instanceId}')">💸出售</button>
<button onclick="toggleUnitActive('${u.instanceId}')">→备战</button>
<!-- 或 -->
<button onclick="toggleUnitActive('${u.instanceId}')">上阵</button>
```

**新 UI 现状：** 无任何宠物管理界面

**影响：**
- 玩家无法出售不需要的宠物 → 金币产出小于消耗
- 无法将宠物从备战席换到上场位 → 阵容锁定
- 核心游戏循环（战斗 → 商店 → 购买 → 上阵 → 再战）断在最后一步

**实现方案：**

```html
<!-- 在英雄选择面板下方增加阵容管理区 -->
<div class="panel-head compact">
  <h2>阵容</h2>
  <span id="roster-count">0/0</span>
</div>
<div id="roster-list" class="roster-list">
  <!-- 上场区 active -->
  <!-- 备战区 bench -->
</div>
```

```js
// roster.js — 宠物管理渲染
function renderRoster() {
  const vm = ui.vm;
  const active = vm.inventory?.active || [];
  const bench  = vm.inventory?.bench  || [];
  const gold   = vm.gold || 0;

  // 渲染上场区
  // 渲染备战区
  // 每张宠物卡：名称、元素、HP、品质、等级
  // 按钮：上阵 / 备战 / 出售
}

async function sellUnit(instanceId) {
  await runCommand('SELL_UNIT', { instanceId });
}
async function toggleUnitActive(instanceId) {
  await runCommand('TOGGLE_UNIT_ACTIVE', { instanceId });
}
```

**优先度：★★★★★**（核心循环断裂）

**验收标准：**
```bash
# 1. 进入商店购买一个宠物 → 宠物出现在备战区
# 2. 点击宠物卡上的「上阵」→ 宠物移到上场位，阵容数 +1
# 3. 点击已上场宠物的「备战」→ 宠物移回备战区
# 4. 点击「出售」→ 金币增加 ${售价}，宠物从列表消失
# 5. 上场位满 4 个时「上阵」按钮禁用
# 6. 金币不足时不出售按钮（或出售后金币正确增加）
```

---

### 2. AVATAR 战斗回放：EXPORT_BATTLE_TRACE / REPLAY_BATTLE_TRACE / EXPORT_REPLAY

**后端接口：**

```js
'EXPORT_BATTLE_TRACE'   // 导出原始战斗追踪事件
'REPLAY_BATTLE_TRACE'   // 回放一组事件（返回 { replayed: true, events: [...] }）
'EXPORT_REPLAY'         // 导出结构化回放（支持过滤/选择）
```

**旧 UI：**

```html
<div id="battle-replay-panel">
  <div id="bb-battle">⚔ 战斗</div>
  <div id="bb-log">📋 日志</div>
  <div id="brp-count">步骤 0/0</div>
  <div id="brp-events"></div>
  <div id="brp-text"></div>
  <button onclick="…">📋 复制JSON</button>
</div>
```

**新 UI 现状：** 无回放功能

**影响：**
- 战斗结束后无法回看每步事件序列
- 无法导出 JSON 用于调试
- 自动化测试依赖的命令在 UI 层不可用

**实现方案：**

```js
// 在底栏日志标签中增加「回放」标签
async function renderReplay() {
  const data = await api('/api/action', { type: 'EXPORT_BATTLE_TRACE' });
  const events = data.events || [];
  // 渲染事件列表 + 复制按钮
}
```

**优先度：★★★★☆**（开发调试关键）

**验收标准：**
```bash
# 1. 战斗结束后点击「回放」标签 → 显示事件列表（step + type + text）
# 2. 点击「复制JSON」→ 剪贴板包含完整的 events 数组
# 3. 将复制的事件 JSON 粘贴回回放输入框 → 点击回放 → 事件序列重新播放
# 4. 回放过程中 step 计数正确递增（brp-count）
```

---

### 3. 手动预览/格详情：BUILD_PREVIEW / GET_CELL_DETAIL

**后端接口：**

```js
'BUILD_PREVIEW'      // 手动触发预览网格计算
'GET_CELL_DETAIL'    // 获取指定格子的详细数据（比 ViewModel 更细：元素层/预览/威胁/单位）
```

**新 UI 现状：**
- `previewGrid` / `threatGrid` 已随 ViewModel 返回，但 `BUILD_PREVIEW` 从未被调用
- 格子详情通过 `renderCellDetail()` 从 `ui.selectedCell` 读取 ViewModel 数据，没有调 `GET_CELL_DETAIL`

**影响：**
- 预览网格的触发时机完全由后端控制（随 `syncDerivedBoard` 自动计算）
- 无法单独请求更细腻的格子数据（比如元素层堆叠明细）

**实现方案：**

```js
// 方案 A：不做改动——当前 ViewModel 已经带了 previewGrid/threatGrid
// 方案 B：单独加「刷新预览」按钮或点击格子时调用 GET_CELL_DETAIL
async function onCellClick(r, c) {
  // 现有逻辑...
  // 可选：调 GET_CELL_DETAIL 拿更细的数据
  // const detail = await api('/api/action', { type: 'GET_CELL_DETAIL', r, c });
}
```

**优先度：★★☆☆☆**（ViewModel 已满足基本需求）

**验收标准（如果方案 B）：**
```bash
# 1. 点击任意棋盘格 → 底栏「目标信息」显示该格的元素层/单位/预览/威胁全部字段
# 2. 空格子：显示「无单位」+ 元素层数值
# 3. 有单位格子：显示单位名、HP、ATK
# 4. 元素层堆叠数 > 0 时显示各元素具体数值
```

---

### 4. 商店事件：APPLY_SHOP_EVENT

**后端接口：**

```js
'APPLY_SHOP_EVENT'   // 应用商店特殊事件（折扣/刷新/特殊商品）
```

**新 UI 现状：** 无商店事件入口

**影响：**
- 商店中的特殊事件（如限时折扣、刷新机会）无法触发
- 此功能仅在特定波次/条件下出现，日常用不到

**优先度：★★☆☆☆**（非日常功能）

**验收标准：**
```bash
# 1. 商店中出现特殊事件（折扣标签/限时商品）时，有对应的按钮或提示
# 2. 点击商店事件按钮 → 事件效果生效（价格变化/商品刷新）
```

---

## 二、旧 UI 有、新 UI 无（纯前端）

### 5. 调试面板

**旧 UI：**

```html
<div id="debug-dock" class="drag-handle">🐛 调试</div>
<div id="debug-panel">
  <!-- 显示 G.phase, selHero, 事件列表等 -->
</div>
```

可拖动的调试浮窗，实时显示游戏状态。不需要 API 调用，纯本地读取 `window.__YSBZS__` 或 ViewModel 即可。

**实现方案：**

```js
// 按 Ctrl+` 切换调试面板
document.addEventListener('keydown', ev => {
  if (ev.ctrlKey && ev.key === '`') {
    toggleDebugPanel();
  }
});

function toggleDebugPanel() {
  const existing = document.getElementById('ysbzs-debug');
  if (existing) { existing.remove(); return; }

  const vm = ui.vm;
  const panel = document.createElement('div');
  panel.id = 'ysbzs-debug';
  panel.style.cssText = 'position:fixed;bottom:0;right:0;width:420px;height:320px;background:#111;color:#0f0;font:12px monospace;overflow:auto;z-index:9999;padding:8px;border:1px solid #333;';
  panel.innerHTML = `
    <div style="cursor:move;background:#222;padding:4px;margin:-8px -8px 8px;border-bottom:1px solid #444;" id="debug-drag">🐛 调试面板 <span style="float:right;cursor:pointer" onclick="this.closest('#ysbzs-debug').remove()">✕</span></div>
    <pre id="debug-content">${JSON.stringify({ phase: vm?.phase, selected: vm?.selected, heroCount: vm?.heroes?.length, gold: vm?.gold, events: (vm?.events || []).slice(-5) }, null, 2)}</pre>
  `;
  document.body.appendChild(panel);
  // 拖拽逻辑
}
```

**优先度：★★★☆☆**（开发效率）

**验收标准：**
```bash
# 1. 按 Ctrl+` → 页面右下角出现调试面板，显示 phase / selected / heroCount / gold
# 2. 调试面板中的数值随游戏状态变化实时更新
# 3. 点击面板右上角 ✕ → 面板关闭
# 4. 拖拽面板标题栏 → 面板跟随鼠标移动
```

---

### 6. 行动槽 AP 选择弹窗

**旧 UI：**

```html
<div id="ap-modal">
  <!-- 弹出式 AP 设置面板 -->
</div>
<div id="apbtns">
  <!-- AP 值按钮 -->
</div>
```

选择行动槽时弹出 AP 分配界面。

**新 UI 现状：** 行动槽直接显示当前方向 + 施放按钮，没有 AP 分配交互。

**影响：**
- AP 分配全部由后端默认计算，玩家无法手动控制
- 当前后端默认分配 1 AP，如果玩家想用更多 AP 强化本次行动没有界面操作

**优先度：★★☆☆☆**（当前后端已自动分配，不影响功能）

**验收标准：**
```bash
# 1. 选择行动槽时弹出 AP 分配弹窗
# 2. 弹窗中显示当前 AP 总量和已分配量
# 3. 调整 AP 后行动预览更新
# 4. 关闭弹窗后回到行动槽列表
```

---

### 7. 工具提示系统

**旧 UI：** `tt` / `ttc` 鼠标悬停/点击弹出机制说明浮窗。

**新 UI 现状：** 没有任何元素/机制说明浮窗。

**影响：** 新玩家不知道火水风元素、引爆阈值、地形形成等机制。

**优先度：★★★☆☆**（用户体验）

**验收标准：**
```bash
# 1. 鼠标悬停元素标签（火/水/风/土）→ 弹出浮窗说明该元素的基础规则
# 2. 悬停机制词条 → 浮窗显示该机制的完整描述和数值
# 3. 点击棋盘格上的威胁/预览数字 → 浮窗显示详细计算
# 4. 点击浮窗外任意区域 → 浮窗关闭
```

---

## 三、优先级排序

| 排位 | 功能 | 接口 | 原因 |
|------|------|------|------|
| 🥇 | **阵容管理** | SELL_UNIT / TOGGLE_UNIT_ACTIVE | 核心循环断裂，不补等于不能正常玩游戏 |
| 🥈 | **战斗回放** | EXPORT_BATTLE_TRACE / REPLAY | 调试和自动化测试需要 |
| 🥉 | **调试面板** | 无（纯前端） | 开发效率，但可先用 Console 替代 |
| 4 | **工具提示** | 无（纯前端） | 用户体验，非阻塞 |
| 5 | **预览/格详情** | BUILD_PREVIEW / GET_CELL_DETAIL | ViewModel 已带基本数据 |
| 6 | **AP 分配弹窗** | 无（纯前端） | 当前后端已自动分配 |
| 7 | **商店事件** | APPLY_SHOP_EVENT | 非日常功能 |

---

## 四、各功能涉及文件

| 功能 | 主要改动文件 |
|------|-------------|
| 阵容管理 | `web/ux-app.js`（新增 renderRoster 等）<br>`web/ux-app.css`（新增 roster 样式） |
| 战斗回放 | `web/ux-app.js`（新增回放标签/按钮） |
| 调试面板 | `web/ux-app.js`（新增 Ctrl+` 切换） |
| 工具提示 | `web/ux-app.js`（新增浮窗）+ `web/ux-app.css` |
| AP 分配 | `web/ux-app.js`（新增弹窗）+ 可能需要后端配合 |
| 格详情 | `web/ux-app.js`（onCellClick 加调用） |
| 商店事件 | `web/ux-app.js`（商店渲染区加事件按钮） |
