# 界面评审 · 元素背包史

> 基于 2026-06-09 optimization round5 版本的前端界面审查。
>
> 聚焦：信息完整度、交互反馈、视觉布局。3 个主要问题。

---

## 目录

1. [英雄卡信息不完整](#hero-card)
2. [棋盘格详情框 —— 位置与内容](#cell-detail)
3. [阵容卡信息缺失](#roster-card)

---

## <a name="hero-card"></a>1. 左边英雄卡信息不完整

### 现状

`web/ux-app.js:196-211` — `renderHeroes()`

当前显示的内容：

```
┌─────────────────────┐
│ 🔥 融焰娘      火  │
│ 火 · HP 60/60 · AP 3│
│ ████████████░░░░░░  │
└─────────────────────┘
```

ViewModel 中英雄对象实际包含的可用字段：

```json
{
  "name": "融焰娘",
  "element": "火",
  "hp": 60, "maxHp": 60,
  "atk": 10,
  "ap": 3,
  "availableAp": 3,
  "moveRange": 14,
  "quality": "黄金",
  "role": "单位",
  "shape": { "shapeName": "爆心二连", "slotCount": 3, "hitCells": 2 },
  "mechanics": ["none"],
  "slots": [{ "element": "火", "layers": 1 }, ...]
}
```

### 问题

| 字段 | ViewModel 有 | UI 显示 | 影响 |
|------|-------------|---------|------|
| `quality`（品质） | ✅ 黄金/白银/青铜 | ❌ 不显示 | 玩家不知道宠物稀有度 |
| `atk`（攻击力） | ✅ 10 | ❌ 不显示 | 不知道这个英雄打人痛不痛 |
| `role`（角色） | ✅ "单位" | ❌ 不显示 | 不知道定位 |
| `moveRange`（移动范围） | ✅ 14 | ❌ 不显示 | 不知道能走多远 |
| `shape.shapeName` | ✅ "爆心二连" | ❌ 不显示 | 不知道攻击形状 |
| `slots.length` | ✅ 3 个槽 | ❌ 不显示 | 不知道有几个行动槽 |
| `mechanics` | ✅ 机制列表 | ❌ 不显示 | 不知道特殊能力 |
| `availableAp` | ✅ 3 | 只显示 `ap` | 应该优先显示剩余可用 AP |

### 方案

**改动文件：** `web/ux-app.js:199-210`

```js
function renderHeroes() {
  const heroes = ui.vm.heroes || [];
  $('hero-count').textContent = `${heroes.length}人`;
  $('hero-list').innerHTML = heroes.map(h => {
    const sel = h.id === ui.selectedUnitId;
    const dead = h.alive === false || h.hp <= 0;
    const qualityLabel = { '黄金': '★', '白银': '◆', '青铜': '●' }[h.quality] || '';
    const slotCount = (h.slots || []).length;
    const usedSlots = (h.slots || []).filter(s => s.used).length;
    const statusText = [h.atk ? `攻${h.atk}` : '', `槽${usedSlots}/${slotCount}`].filter(Boolean).join(' · ');
    return `<button class="hero-card${sel ? ' sel' : ''}" data-hero-id="${esc(h.id)}" type="button">
      <div class="avatar ${clsForEl(h.element)}">${esc(unitIcon(h))}</div>
      <div class="hero-main">
        <strong>${esc(h.name)} <span class="quality-tag quality-${h.quality}">${qualityLabel}${esc(h.quality || '')}</span></strong>
        <span>${esc(h.element || '-')} · HP ${esc(h.hp)}/${esc(h.maxHp)} · AP ${esc(h.availableAp ?? h.ap ?? 0)}/${esc(h.ap)}${dead ? ' · 已退场' : ''}</span>
        <span class="hero-sub">${esc(statusText)}${h.shape?.shapeName ? ' · ' + esc(h.shape.shapeName) : ''}</span>
        <div class="hpbar"><i style="width:${pct(h.hp, h.maxHp)}%"></i></div>
      </div>
      <span class="element-tag ${clsForEl(h.element)}">${esc(h.element || '-')}</span>
    </button>`;
  }).join('') || '<div class="detail-card empty">没有可操作英雄。</div>';
}
```

```css
/* web/ux-app.css */
.quality-黄金 { color: #d4a639; }
.quality-白银 { color: #a8b8c8; }
.quality-青铜 { color: #b8735a; }
.hero-sub { display: block; font-size: 11px; color: #a09080; margin-top: 1px; }
```

改后效果：

```
┌─────────────────────────┐
│ 🔥 融焰娘 ★黄金   火   │
│ 火 · HP 60/60 · AP 3/3 │
│ 攻10 · 槽0/3 · 爆心二连│
│ ████████████░░░░░░░░░░░│
└─────────────────────────┘
```

### 验收标准

```bash
# 英雄卡显示 atk、品质标签、形状名、可用槽数
curl -s http://127.0.0.1:4173/api/view | jq '.viewModel.heroes[0].quality'  # → "黄金"
# 浏览器中英雄卡应看到 ★黄金 标签
```

---

## <a name="cell-detail"></a>2. 棋盘格详情框 —— 位置与内容

### 现状

当前 `renderCellDetail()` (`web/ux-app.js:355-373`)：

```js
function renderCellDetail() {
  const c = ui.selectedCell || ui.vm.selected?.cell;
  if (!c) { /* ... 显示空提示 */ return; }
  // ...
  const lines = [`位置：第${Number(c.r) + 1}行第${Number(c.c) + 1}列`];
  if (unit) lines.push(`单位：${unit.displayName || unit.name} · HP ${unit.hp}/${unit.maxHp} · 攻 ${unit.atk || 0}`);
  else lines.push('单位：无单位');
  lines.push(`元素：${els || '无'}`);
  if (terrain?.modules?.length) lines.push(`地形：${terrain.modules.join('、')}`);
  if (preview) lines.push(`预览：${JSON.stringify(preview)}`);
  if (threat) lines.push(`威胁：${JSON.stringify(threat)}`);
  $('cell-detail').className = 'detail-card';
  $('cell-detail').textContent = lines.join('\n');
}
```

### 问题

1. **位置在左栏底部**：用户点击某个棋盘格后，详情出现在左边栏（与棋盘格物理位置无关联），眼睛要从棋盘跳到左边看，再跳回去
2. **纯文本**：`textContent` 没有内联样式、没有图标标记、没有颜色区分
3. **预览/威胁是 JSON 裸对象**：`JSON.stringify(preview)` 直接输出给玩家看，可读性差
4. **元素层无视觉**：元素只有文字 "火3 水1"，没有颜色和图标辅助

### 方案

**方案 A（推荐）： 浮动提示框 + 左栏详情同步更新**

在棋盘格上实现 hover/click 浮动工具提示，靠近被点击格显示：

```js
// ux-app.js — 新增函数
function showCellPopup(r, c, detail) {
  const popup = document.getElementById('cell-popup') || createCellPopup();
  const cell = cellAt(r, c);
  const unit = detail?.unit || unitById(cell?.unitId);

  // 格式化元素层
  const elHTML = Object.entries(detail?.elements || cell?.elements || {})
    .filter(([, n]) => Number(n) > 0)
    .map(([el, n]) => `<span class="el-badge ${clsForEl(el)}">${EL_ICON[el] || el}${n}</span>`)
    .join('');

  // 格式化单位
  const unitHTML = unit ? `
    <div class="popup-unit">
      <span class="${clsForEl(unit.element)}">${unitIcon(unit)}</span>
      <strong>${esc(unit.displayName || unit.name)}</strong>
      <span>HP ${unit.hp}/${unit.maxHp}</span>
      ${unit.atk ? `<span>攻${unit.atk}</span>` : ''}
    </div>` : '<div class="popup-unit empty">空格</div>';

  popup.innerHTML = `<div class="popup-header">第${r + 1}行第${c + 1}列</div>
    ${unitHTML}
    ${elHTML ? `<div class="popup-elements">${elHTML}</div>` : ''}
    ${detail?.preview ? `<div class="popup-preview">⚡ ${esc(detail.preview.damage ?? detail.preview.layers ?? '')}伤害</div>` : ''}
    ${detail?.threat ? `<div class="popup-threat">⚠ ${esc(detail.threat.damage ?? detail.threat.atk ?? '')}威胁</div>` : ''}`;

  // 定位: 靠近被点击格，但不超出棋盘边界
  const boardEl = $('board');
  const boardRect = boardEl.getBoundingClientRect();
  const cellEl = boardEl.querySelector(`[data-r="${r}"][data-c="${c}"]`);
  if (cellEl) {
    const cellRect = cellEl.getBoundingClientRect();
    const popW = 220, popH = popup.offsetHeight || 120;
    let left = cellRect.right + 8;
    let top = cellRect.top;
    if (left + popW > boardRect.right) left = cellRect.left - popW - 8;
    if (top + popH > boardRect.bottom) top = boardRect.bottom - popH;
    popup.style.left = `${left - boardRect.left}px`;
    popup.style.top = `${top - boardRect.top}px`;
  }

  popup.classList.remove('hidden');
}

// 在 onCellClick 中调用
async function onCellClick(r, c) {
  // ...现有逻辑...
  // 获取详情
  const detail = await api('/api/action', { type: 'GET_CELL_DETAIL', r, c });
  ui.cellDetail = detail.cellDetail || { r, c };
  showCellPopup(r, c, ui.cellDetail);
  renderCellDetail(); // 同时更新左栏
}
```

```css
/* ux-app.css */
#cell-popup {
  position: absolute; z-index: 100; width: 220px;
  background: #fff6e6; border: 2px solid #8a6944; border-radius: 8px;
  padding: 8px 12px; box-shadow: 2px 2px 12px rgba(0,0,0,0.3);
  font-size: 13px;
}
#cell-popup.hidden { display: none; }
.popup-header { font-weight: bold; border-bottom: 1px dashed #c7a978; padding-bottom: 4px; margin-bottom: 4px; }
.popup-unit { display: flex; gap: 6px; align-items: center; margin: 4px 0; }
.popup-elements { display: flex; gap: 4px; margin: 4px 0; }
.popup-preview { color: #b87440; }
.popup-threat { color: #a84f3e; }
```

**方案 B（最低成本）： 左栏详情改用 HTML 而非纯文本**

只改 `renderCellDetail()`，把 `textContent` 改成 `innerHTML`，加颜色和结构：

```js
function renderCellDetail() {
  const c = ui.selectedCell || ui.vm.selected?.cell;
  if (!c) { /* ... */ return; }
  const unit = unitById(cell?.unitId);
  const html = `<div class="detail-pos">📌 第${c.r + 1}行第${c.c + 1}列</div>
    ${unit ? `<div class="detail-unit">${unitIcon(unit)} ${esc(unit.displayName || unit.name)} · HP ${unit.hp}/${unit.maxHp} ${unit.atk ? '· 攻' + unit.atk : ''}</div>` : '<div class="detail-unit dim">空格</div>'}
    <div class="detail-els">${elHTML}</div>
    ${previewHTML}
    ${threatHTML}`;
  $('cell-detail').innerHTML = html;
}
```

### 验收标准

```bash
# 方案 A：点击棋盘格 → 棋盘上出现浮动提示框，靠近被点击格
# 方案 B：左栏详情从纯文本改为结构化 HTML，元素有颜色
# 两种方案：预览/威胁不再显示 JSON.stringify 裸对象
```

---

## <a name="roster-card"></a>3. 阵容卡信息缺失

### 现状

`web/ux-app.js:221-240` — `renderRoster()`

当前阵容卡显示：

```
融焰娘 · 火 · Lv1 · HP 60/60 · 售1金
[上阵] [出售]
```

### 问题

| 字段 | ViewModel inventory 有 | UI 显示 | 影响 |
|------|----------------------|---------|------|
| `quality`（品质） | ✅ | ❌ 不显示 | 不知道宠物品质 |
| `atk`（攻击力） | ✅ | ❌ 不显示 | 不知道战斗力 |
| `role` | ✅ | ❌ 不显示 | 不知道定位 |
| `mechanicStatus` | ✅ | ⚠️ 只显示未实装的 | 已实装的机制从来不显示 |

### 方案

```js
function renderRoster() {
  // ...
  const card = (item, active) => {
    const mechReady = (item.mechanicStatus || []).filter(x => x.status === 'implemented' && x.id !== 'none');
    const mechUnsupported = (item.mechanicStatus || []).filter(x => x.id !== 'none' && x.status !== 'implemented');
    const qualityLabel = { '黄金': '★', '白银': '◆', '青铜': '●' }[item.quality] || '';
    return `<div class="roster-card${active ? '' : ' bench'}" data-roster-id="${esc(id)}">
      <div class="roster-info">
        <strong>${esc(item.name)}</strong>
        <span class="quality-tag quality-${item.quality}">${qualityLabel}${esc(item.quality || '')}</span>
        <span class="${clsForEl(item.element)}">${esc(item.element)} · Lv${item.level}</span>
        <span>HP ${item.hp}/${item.maxHp} · 攻${item.atk || '?'} · 售${item.sellValue}金</span>
        ${mechReady.length ? `<span class="mech-ready">✓ ${mechReady.map(x => x.id).join(', ')}</span>` : ''}
        ${mechUnsupported.length ? `<span class="mech-pending">⏳ ${mechUnsupported.map(x => x.id).join(', ')}</span>` : ''}
      </div>
      <div class="roster-actions">
        <button class="mini-btn" data-roster-toggle="${esc(id)}" type="button" ...>${active ? '备战' : '上阵'}</button>
        <button class="mini-btn sell" data-roster-sell="${esc(id)}" type="button" ...>出售</button>
      </div>
    </div>`;
  };
}
```

### 验收标准

```bash
# 阵容卡显示品质、atk、已实装机制
curl -s http://127.0.0.1:4173/api/view | jq '.viewModel.inventory.active[0].quality'  # → "黄金"
```

---

## 优先级汇总

| 排位 | 问题 | 改动量 | 影响 |
|------|------|--------|------|
| 🥇 | **浮动详情框**（cell-popup） | ~60 行 js + ~30 行 css | 交互直观度大幅提升 |
| 🥇 | **英雄卡信息补全** | ~10 行 js + ~5 行 css | 信息完整度 |
| 🥈 | **阵容卡信息补全** | ~10 行 js | 信息完整度 |
| 🥉 | **左栏详情改用 HTML** | ~10 行 js | 可读性 |

## 涉及文件

| 文件 | 改动 |
|------|------|
| `web/ux-app.js` | renderHeroes / renderRoster / renderCellDetail + 新增 showCellPopup |
| `web/ux-app.css` | 新增 .quality-* / #cell-popup / .popup-* 样式 |
| `web/index.html` | 可选：新增 `<div id="cell-popup" class="hidden">` |
