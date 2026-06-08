# 事件溯源架构方案

> 日期：2026-06-08，基于当前代码架构评审结论
> 状态：设计方案，非立即实施

## 一、当前问题

当前代码只存最终值：

```js
cell.elements.fire = 5
unit.hp = 20
```

无法追溯：
- 这 5 层火分别来自谁、哪个技能、哪回合
- 伤害的来源是物理还是元素爆炸
- 盾的增减链路

## 二、目标结构：聚合值 + 来源包 + 变更事件

### 格子元素层 → 两层结构

```js
cell.elements.fire = {
  total: 5,           // 聚合值，快结算用
  stacks: [           // 来源包，战报/回放/调试用
    {
      stackId: "fire_001",
      amount: 2,
      sourceUnitId: "pal_005",
      sourceActionId: "fox_fire_hit",
      createdRound: 1,
      tags: ["secondary", "catalyzed"]
    },
    {
      stackId: "fire_002",
      amount: 3,
      sourceUnitId: "pal_072",
      sourceActionId: "fire_core_hit",
      createdRound: 1,
      tags: ["main"]
    }
  ],
  flags: { formed: true, trap: true, threshold: 3 }
}
```

### 伤害/HP 变化 → 记录来源

```js
{
  type: "fire_explosion",
  cell: [1, 6],
  fireBefore: 4,
  formula: "sum_1_to_n",
  damage: 10,
  consumedStacks: [
    { stackId: "fire_001", amount: 2, source: "融焰娘" },
    { stackId: "fire_002", amount: 2, source: "水催化翻倍" }
  ],
  targetUnitId: "enemy_dragon",
  targetHpBefore: 30,
  targetHpAfter: 20,
  fireAfter: 0
}
```

## 三、统一变更入口

建议新增 `applyChange(state, change, context)`，所有操作都走这个入口：

| 操作 | 对应 change type |
|------|-----------------|
| 伤害 | `damage` |
| 回血 | `heal` |
| 加元素 | `add_element` |
| 消耗元素 | `consume_element` |
| 风聚火 | `transfer_element` |
| 移动 | `move` |
| 召唤 | `summon` |
| 死亡 | `death` |
| 盾重生 | `restore_shield` |
| 领域挂接 | `domain_attach` |

`applyChange` 内部负责：
1. 修改聚合值（快）
2. 更新来源包（细）
3. 触发连锁反应（水催化/火爆/领域）
4. 写入 battleEvents
5. 生成可读战报片段

## 四、实施优先级

### 第一版必须细记录

- 元素层来源（谁加的、多少、哪回合）
- 伤害来源（物理/元素爆炸/催化）
- 盾/HP 变化（先盾后血，记录前后值）
- 移动来源（从哪到哪）
- 领域挂接（谁挂的、什么效果）
- 召唤来源
- 死亡原因

### 第一版可以先只聚合

- 普通 UI 派生值
- 预览路径
- 临时动画状态
- 鼠标 hover 信息

**原则：规则结算相关的变化必须可追踪。纯显示派生信息不需要进入事件流。**

## 五、CSV 与 Runtime 的边界

- CSV 只放规则和配置（宠物属性、机制ID、形状ID、元素反应表、英雄领域表）
- 战斗中生成的细节放 runtime（`state.elementStacks`, `state.changeEvents`, `state.battleTrace`）
- 不要把每一次火层来源写回 CSV

## 六、最终口径

> 《元素背包史》的核心状态应采用"聚合状态 + 来源包 + 变更事件"的结构。格子元素不能只存 fire=5，而要能记录这些火层分别来自哪个单位、哪个攻击槽、哪个技能、哪个领域、哪一回合，以及是否被水催化、风聚火、引爆消耗。HP、盾、行动力、移动、召唤、领域挂接、死亡也应按同一思路记录变化。
>
> 核心结算读取聚合值保证性能；战报、回放、调试、AI 分析读取来源包和变更事件，解释为什么 fire=5、为什么造成 10 伤害、为什么盾 0→20。
>
> 不要把每一层都强行拆成独立对象，优先使用"来源包 amount=N"的方式，必要时再展开成逐层显示。
