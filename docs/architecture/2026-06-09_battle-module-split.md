# 2026-06-09 · battle.cjs 职责拆分完成记录

## 背景

上一轮已经完成移动规则、UI 事件委托、事件过滤和 session 隔离。本轮继续处理审计清单里的 P0：`src/core/battle.cjs` 上帝文件。

## 改动结果

`src/core/battle.cjs` 从约 970 行降到约 466 行。主文件保留战斗流程编排、波次、回合、胜负结算入口；细分职责迁移到：

| 文件 | 职责 |
|---|---|
| `src/core/battle/position.cjs` | 站位、可站立判断、玩家移动、通用移动 |
| `src/core/battle/actions.cjs` | 行动槽读取、方向设置、目标格计算、手动施放 |
| `src/core/battle/planning.cjs` | 玩家自动规划、敌方意图、威胁格、AI 目标选择 |
| `src/core/battle/preview.cjs` | 预览格、威胁格落盘、格子详情 |
| `src/core/battle/resolution.cjs` | 元素施加、地形触发、伤害、元素统一结算 |

## 设计选择

没有直接做“机械 require 原文件”或“纯复制导出”，而是用 `createXXXModule(deps)` 显式传入依赖。这样做有三个目的：

1. 避免循环 require。
2. 保留现有 CJS 项目结构，不引入构建链。
3. 让每个模块的依赖边界可见，后续再拆 `flow / wave / victory` 时不需要猜闭包。

## 保持兼容

外部仍然通过：

```js
const battle = require('./src/core/battle.cjs')
```

访问旧 API。以下公开函数保持可用：

- `moveHero`
- `moveUnitGeneral`
- `setActionDirection`
- `useActionSlot`
- `buildPreviewGrid`
- `buildThreatGrid`
- `getCellDetail`
- `syncDerivedBoard`
- `slotsForUnit`
- `computeMonsterIntent`
- `buildPlayerAutoPlan`
- `damageUnit`
- `settleElements`

## 新增测试

新增：

```txt
tests/unit/battle_module_split.test.cjs
```

覆盖：

1. 五个职责模块存在。
2. `battle.cjs` 保持在 520 行以内，避免上帝文件回流。
3. 拆分后公开 battle API 不变。
4. start → move → slot → settle 的核心烟测仍可跑。

## 验收

```bash
npm test
npm run test:unit
npm run test:coverage
npm run check:all
npm run verify:browser:evidence
```

结果：全部通过。

## 未做的事

本轮没有继续拆 `startBattle / startNextRound / endPlayerTurn / runBattle / finishBattle` 到 `flow.cjs`。原因是这些函数是主编排入口，当前留在 `battle.cjs` 反而更清晰。下一轮如果继续拆，建议把 `spawnWave` 和回合流程一起拆成 `battle/flow.cjs`，而不是零散移动。
