# Debug 面板 v3 重构实施计划

## 目标

将 Debug 面板格子详情从扁平格式升级为 v3 树形详情面板格式（┃┣ 风格），同时扩展 VM 数据层提供更丰富的字段。

## 不碰

- 游戏核心逻辑（`useSlot`、`settleExplosions`、`doExplode`、`simMonAct`）
- 棋盘渲染（`renderBoard`、`buildBoardVM`）
- 右侧面板（`renderTurn`、`renderCellDetail`）
- CSS 样式（仅 debug panel 内部新增少量样式）

## 改动文件

| 文件 | 改动范围 |
|------|---------|
| `index.html:2542-2708` | `buildPreviewGrid` — 扩展 `incomingActions` 和 `elementField` 字段 |
| `index.html:2985-3026` | `buildDebugPanelVM` — 映射新字段、新增调用方数据 |
| `index.html:3028-3330` | `renderDebugPanel` — 全量重写格子详情区 |
| `test.js` | 新增 DEBUG6~DEBUG15 测试 |
| `docs/10_CHANGELOG.md` | 记录变更 |

## 实施步骤

### 步骤 1：扩展 `buildPreviewGrid` 数据字段

**位置**：`index.html:2542-2708`

**改动**：

1. `elementField[el]` 增加字段：
   - `beforeLayers` — 同 `boardLayers`（语义化别名）
   - `addLayers` — 同 `addedLayers`（语义化别名）
   - `afterLayers` — 同 `layers`（语义化别名）
   - `directDamage` — 本格元素直接伤害（三角伤）
   - `splashDamage` — 波及伤害（从 splashDamage.total 析出）
   - `pathDamage` — 路径踩伤（当前无，预留 0）
   - `totalDamage` — 元素总伤害

2. `incomingActions[]` 增加字段：
   - `slotIndex` — 槽号 1-based（从 `heroSlotCount` 获取）
   - `sn` — 形状编号（从 `slot.sn`）
   - `dir` — 方向（从 `slot.dir`）
   - `fromR` / `fromC` — 英雄坐标（从 `hero.pos`）
   - `heroName` — 显示名（如 `焱A`，从 `hero.name`）
   - `sourceType` — `'heroSlot'`
   - `resolvedEffects` — 由渲染层按坐标关系推导（暂在 VM 层预计算）
   - `sequenceIndex` — 执行顺序（按槽遍历顺序）

3. `incomingActions` 中 `resolvedEffects` 推导规则：
   - 本格是中心格（`ap.r===center.r && ap.c===center.c`）→ `['directElement', 'explosionCenter']`（仅当 `sn===12`）
   - 本格是波及格（非中心格，但 `sn===12`）→ `['directElement', 'splash']`
   - 本格是目标格（`sn===1` 或非十字非中心）→ `['directElement']`
   - 英雄自身格 → `['ignored']`（英雄不承受自身元素）

### 步骤 2：增强怪物威胁数据

**位置**：`buildPreviewGrid` 步骤 6（`computeMonsterActionPreview` 结果写入）

**改动**：

1. `threatFromMonsters[]` 每项增加：
   - `stableId` — `怪物名#索引`（从 `G.monsters[idx].name` + `idx`）
   - `alive` — 本回合是否存活（`!mon.dead`）
   - `fromR` / `fromC` — 怪物当前位置
   - `toR` / `toC` — 攻击目标（英雄位置）
   - `attackType` — `'近战攻击'`（当前全为近战，预留扩展）
   - `dmg` — 已有 ✓

2. 新增 `explosionSources[]`：
   - 在步骤 5b 波及处理时收集
   - 每个波及格记录 `{r, c, element, layers}`

### 步骤 3：重写 `buildDebugPanelVM`

**位置**：`index.html:2985-3026`

**改动**：

1. `selectedCell` 字段映射更新：
   - 用新字段名：`beforeLayers` / `addLayers` / `afterLayers` / `directDamage` / `splashDamage` / `pathDamage` / `totalDamage`
   - 保留旧字段名向后兼容（`boardLayers` / `addedLayers` / `layers` / `damage`）
   - 新增 `explosionSources`
   - 新增 `pos` 字段（从 `sel.r`, `sel.c` 复制）

2. `threats` 增强（从 `pg.preview.threatFromMonsters` 读取新字段）

3. `incomingActions` 透传新字段

### 步骤 4：重写 `renderDebugPanel` 格子详情区

**位置**：`index.html:3028-3330`

**改动**：

1. **删除**旧的 `buildDebugOneLiner` 函数和 `buildSourceDetail` 函数

2. **新增** `buildCellTree(sc, vm)` 函数，按 v3 格式生成树形 HTML：

```
首行: 实体名(r,c) HP当前/最大 [攻N 元素]
  ┃ 怪物威胁           (仅英雄格)
  ┣ 怪物#id   打Ndmg (攻击类型 从(r,c)→(toR,toC))  若存活
  ┣ ...                或 (已死亡，威胁取消)
  ┃ 元素层
  ┣ 当前    元素: N层
  ┣ H名-SN   元素: +N层 (英雄名 覆盖方式 方向 从(r,c)释放)
  ┃ 预计    元素: N层 [→ 💥爆炸]
  ┃ 本格元素伤害        (仅实体格非英雄，结算层≥1)
  ┣ 元素N层  三角伤 1+2+...+N=N
  ┃ 爆炸结算            (仅空地，结算层≥3)
  ┣ 中心伤  三角伤 1+2+...+N=N (仅中心格有实体时生效)
  ┣ 波及伤  层数直伤 N (上下左右各-N)
  ┣ 波及格  (r,c) (r,c) ...
  ┃ 爆炸波及            (仅英雄/实体，被其他格爆炸扫到)
  ┣ 来自(r,c) 💥元素N层爆炸 波及伤: -N
  ┃ 伤害合计  -N，存活(剩N) / ☠
  ┃ 英雄不承受本格元素伤害  (仅英雄格)
```

3. 各段显示条件（用 v3 格式规则表判断）

4. 保留下方"怪物列表 / 行动槽 / 引擎 / actionLog"不变

### 步骤 5：新增测试

**位置**：`test.js`，追加在现有 `Debug 面板 VM` 测试组后

**测试用例**：

| 编号 | 测试名 | 验证内容 |
|------|--------|---------|
| DEBUG6 | 怪物格树形格式含本格元素伤害 | 首行含坐标、HP、攻、元素；有 `┃ 本格元素伤害` 段 |
| DEBUG7 | 空格爆炸树形格式 | 有 `💥爆炸`、`┃ 爆炸结算`、`波及格` |
| DEBUG8 | 英雄格树形格式无本格元素伤害 | 有 `┃ 英雄不承受本格元素伤害`，无 `┃ 本格元素伤害` |
| DEBUG9 | 英雄格含怪物威胁 | 有 `┃ 怪物威胁` 和 `┃ 伤害合计` |
| DEBUG10 | 空地有元素不爆炸 | 有 `┃ 元素层`，无爆炸段，无伤害段 |
| DEBUG11 | 城堡格含元素伤害 | 首行含 `🏰`、HP；有 `┃ 本格元素伤害` |
| DEBUG12 | incomingActions 含 slotIndex/sn/dir/heroName | 新字段均可读取且非空 |
| DEBUG13 | 怪物威胁含 stableId/alive/fromR/fromC | 新字段均可读取 |
| DEBUG14 | elementField 含 beforeLayers/addLayers/afterLayers | 新旧字段一致 |
| DEBUG15 | 空地被爆炸波及 | 有 `┃ 波及伤害`、来源格坐标 |

### 步骤 6：验证与收尾

```bash
node test.js              # 确认全部通过（含新增测试）
node replay.js recordings/day1_fire_sample.json  # 回放无异常
node e2e/smoke.js         # 烟雾测试（如有）
```

更新 `docs/10_CHANGELOG.md`。

## RED/GREEN 节点

| 节点 | 触发条件 | 验证方式 |
|------|---------|---------|
| RED-1 | 步骤 1 完成后，旧 DEBUG3 可能字段名变化 | `node test.js` 只跑 Debug 组，预期部分失败 |
| GREEN-1 | 步骤 3 完成后，VM 字段映射正确 | `node test.js` Debug 组全部通过 |
| RED-2 | 步骤 4 完成后，新测试 DEBUG6~15 首次跑 | 预期全部失败（测试新增但渲染未完成等价） |
| GREEN-2 | 步骤 4 实现完成 | DEBUG6~15 全部通过 |
| FINAL | 全部步骤完成 | 381+10=391 测试通过（Day4 精英怪测试仍预期失败） |

## 风险

| 风险 | 缓解 |
|------|------|
| `elementField` 字段重命名可能影响 `renderCellDetail` | 保留旧字段名别名，不删旧字段 |
| `incomingActions` 字段增加可能影响 `renderBoard` 读 `pvEl` | 不改变 `element`/`amount` 字段位置，只追加新字段 |
| `computeMonsterActionPreview` 缺少怪物坐标/ID 信息 | 在写入 `threatFromMonsters` 时从 `G.monsters` 关联补齐 |
