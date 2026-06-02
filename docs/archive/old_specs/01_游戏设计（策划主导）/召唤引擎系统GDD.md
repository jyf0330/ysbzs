# 召唤引擎系统 GDD · 水+召唤垂直切片

## 文档状态

| 项 | 值 |
|---|---|
| 状态 | **正式（原型垂直切片）** |
| 最后更新 | 2026-05-30 |
| 来源 | `.omx/specs/deep-interview-v1-scope.md` |
| 实现细则 | `战斗系统.md` §12 |
| 代码入口 | `index.html`（`G.summons` / `spawnSummon` / `runSummonActions` 等） |
| 测试 | ENG1–ENG26 · `node playable_day1.js` |

> **与文字战争对齐（2026-05-30）**：教学文档与代码一致，为 **水+召唤**、死亡**留水层**；火苗/滴滴/十字分属火/水/风。

## 1. 系统目的

在完整 roguelite 壳子搭好之前，**只验证一条玩法链是否成立**：

> **SAP 式召唤 + Bazaar 式自动滚雪球 + 元素水层连锁**

玩家应能在一局内感到：**前期难 → 引擎成型临界点 → 越转越强 →  mostly 点「下一步」续航**。

本系统是 v1 原型的**唯一神圣验证对象**；其它流派（水/风/土 build）不在本阶段精调。

## 2. 设计支柱（本系统）

1. **治疗 = 成长**：每次治疗召唤物 → ATK +1（引擎越转越硬）。
2. **死亡 = 燃料**：召唤物死亡 → 原地留 1 层火 → 参与 `settleExplosions` 连锁。
3. **自动兑现**：玩家回合结算后、怪物回合前 → `runSummonActions()` 邻格攻击。
4. **战斗内确定**：与 ITB 一致，召唤/治疗/怪物攻召唤物均可预览。

## 3. 核心事件链（不可简化）

```
召芽灵 summonFromCell
  → 泉泉灵 / 绒语灵 healSummons（+ 绒语被动加 HP/ATK）
    → 召唤物 ATK 成长
      → runSummonActions 打相邻怪
        → 召唤物被击杀 killSummon
          → 留水层 → 叠层/十字引爆
            → 下一回合更多伤害 / 更多召唤位价值
```

**与宏观「元素连锁爽点」的关系**：本链用**火层**接入既有 `elementCells` 通道；宏观四元素循环连锁仍是产品招牌，但 **v1 首验目标是召唤滚雪球 + 前期单火教学**，二者可共存，优先级以本 GDD 为准。

## 4. 实体与状态

### 4.1 召唤物 `G.summons[]`

| 字段 | 说明 |
|---|---|
| `id` | `sm_*` |
| `kind` | `'summon'` |
| `el` | 默认 **`water`**；可由格上元素决定 |
| `hp` / `maxHp` / `atk` | 战斗属性 |
| `pos` | 棋盘格 |
| `ownerHid` | 所属英雄 `ha`/`hb`/… |
| `dead` | 死亡后仍留记录，不参与占用 |

### 4.2 引擎统计 `G.engineStats`

| 键 | 含义 |
|---|---|
| `summonCount` | 累计生成次数 |
| `healCount` | 累计治疗次数（每次 healSummon +1 atk） |

### 4.3 占用规则

- `summonAt(pos)`：活体召唤物占用格。
- 英雄移动、怪物移动（不可进入，可绕路）、怪物 **左/下邻格攻击** 召唤物。
- 预览：`summonIncomingDmg` + 棋盘 ⚠ 受击。

## 5. 回合时序（与双层状态机对齐）

玩家回合内：移动 / 使用行动槽（含 skill 槽）→ `endPlayerTurn`：

1. `commitPlayerActionsToElementField`
2. `settleExplosions`
3. **`runSummonActions()`** ← 召唤引擎行动
4. 怪物回合（`monsterAct` × N）
5. `finishMonsters` → 下一小回合 / 商店 / 阶段切换

> 注：`05_双层状态机设计.md` 中「SUMMON_ACTION 独立阶段」与本实现等价，已并入 `endPlayerTurn` 步骤 3。

## 6. 英雄与 skill 槽（原型 roster）

| defId | 名称 | 原型角色 | skill |
|---|---|---|---|
| `sprout_summoner` | 召芽灵 | **构筑核心** | `summonFromCell` |
| `spring_sprite` | 泉泉灵 | 治疗引擎 | `healSummons` |
| `fluff_speaker` | 绒语灵 | 被动增益 | `healSummons` + passive |
| `split_sprite` | 分分灵 | 拆分规则 | passive（仅影响召芽灵） |
| `boom_sprite` | 爆爆灵 | 死亡铺火 | passive（主人召唤物死亡） |
| `bubble_sprite` | 泡泡灵 | 火范围占位 | 元素槽 |

### 6.1 召芽灵召唤数值

- 空格基础 **HP = 6** + `bonusHp` + min(格上层数, 2)（`calcSproutSpawnParams`）。
- 有 **`split_sprite` 在 roster**：拆 2~3 只，HP × 0.5 / 0.75 / 0.6（仅召芽灵触发）。

### 6.2 被动 `UNIT_DEFS.passive`

| 类型 | 单位 | 规则 |
|---|---|---|
| `buffAllSummons` | 绒语灵 | roster 内所有绒语灵叠加；spawn 后 +HP/+ATK |
| `onSummonDeath` | 爆爆灵 | **该英雄**拥有的召唤物死亡：留火 + 额外铺火 2/3/4 层（火元素英雄） |
| `splitSproutSummon` | 分分灵 | 仅改召芽灵 `summonFromCell` 的 count/hpMul |

被动扫描范围：**全部 `ownedUnits`**（含备战，不限上阵 2 人）。

## 7. 商店与 Day1

- `SHOP_POOLS` 按 `day` + `dayHalf` 过滤；`genShop` 优先当日池。
- **Day1 夜池**含 `sprout_summoner`（引擎入口）。
- Day2+ 池含绒语/爆爆/分分等（见 `02_shop_config_bazaar.json`）。

## 8. UI / 可观测

| 表面 | 内容 |
|---|---|
| 棋盘 `.sm` | 召唤物 🔥、ATK、HP、受击 ⚠ |
| `#es` | 引擎统计（召唤/治疗次数） |
| `buildPreviewGrid` | summon 实体 + 怪物威胁 |

走查脚本：`node playable_day1.js` → `recordings/playable_day1_report.md`。

## 9. 验收标准（来自 deep-interview）

| # | 标准 | 状态 |
|---|---|---|
| AC1 | 一局内出现「引擎成型临界点」，链每回合自我放大 | ⚠️ 链路通（ENG16/25），**爽感曲线待人工 sign-off** |
| AC2 | 难 → 临界 → 碾压；临界后清怪跳升 | ⚠️ 未量化 |
| AC3 | 同开局可复现临界 | ⚠️ 待 playtest 协议 |
| AC4 | 死亡留层不与 `settleExplosions`/预览冲突 | ✅ ENG1–5、16 |
| AC5 | 怪物可攻召唤物且可预览 | ✅ ENG17–18 |
| AC6 | 被动三分（绒/爆/分） | ✅ ENG21–24 |

## 10. 明确不做（本 GDD 范围外）

- 水/风/土完整流派平衡（第6天以后宏观 GDD）
- 完整商店经济（刷新/meta/路径）
- roguelite 地图、跨局解锁
- 永久成长（英雄按次数局内成长）— **下一迭代**
- 连锁飘字 / 完美回合仪式化 — 属宏观 GDD，本切片不阻塞

## 11. 待做 backlog（策划 → 程序）

| 优先级 | 项 | 说明 |
|---|---|---|
| P0 | 人工 playable sign-off | 按 AC1–AC2 填 playtest 表 |
| P0 | 维持水+召唤垂直切片 | 与文字战争 / `index.html` 一致 |
| P1 | 永久成长 | `engineStats` → 英雄/单位局内加成 |
| P1 | §12 / HUD 文档同步 | 召唤物、引擎 HUD 写入 UI 规范 |
| P2 | 被动 tooltip | 商店/单位卡展示 passive 摘要 |
| P2 | 4 英雄上阵 | spec 上限 4，代码 MAX_ACTIVE=6 需对齐决策 |
| P3 | 双层状态机文档合并 | 降级或标注「已实现等价逻辑」 |

## 12. 残留设计风险

- **A4（spec）**：临界点后全自动碾压可能稀释 ITB 手动层 — 正式版需定「临界后是否加决策/难度回升」。
- **元素统一**：前期单火教学与四元素宏观 GDD 的衔接点需在第6天文字过程里一次性引入。
