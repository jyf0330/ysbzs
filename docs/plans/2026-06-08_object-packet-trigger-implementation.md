# 2026-06-08 物体触发 / 元素包 / 回放 MVP 实装报告

## 本次目标

把最新需求“不是单纯高颗粒度，而是大巴扎式物体触发系统”落到当前项目里，保留现有表驱动第7天试炼，同时补上最小可用的：

- 元素包 elementPackets
- modifier 保留与触发
- 元素转换 convertElementPackets
- 触发队列排序 triggerQueue
- 结构化 changeLog
- replay 导出基础
- 18~23 联动表

## 已实现模块

| 文件 | 作用 |
|---|---|
| `src/core/elementPackets.cjs` | 元素包创建、消耗、转换、同步聚合值、保留 modifier、下个元素翻倍 |
| `src/core/modifierEngine.cjs` | 基础值 + 修饰器链，当前提供通用数值修改和元素包 modifier 调用 |
| `src/core/triggerQueue.cjs` | 触发队列排序：priority -> sourceKind -> 棋盘顺序 -> createdAt -> id |
| `src/core/objectRegistry.cjs` | 收集单位、元素包、火陷阱等效果物体 |
| `src/core/changeLog.cjs` | 结构化 change/input 记录，支持 replay 导出 |
| `src/core/explainTrace.cjs` | 结构化 change 转中文解释的初版工具 |

## 已接入主链路

| 链路 | 状态 |
|---|---|
| 棋盘格 `cell.elementPackets` | 已加入 `state.createBoard` |
| 单位 `unit.elementPackets` | 已加入 `unitFactory.createUnit` |
| 普通 `battle.addElementToCell` | 已改为调用 `elements.addElementToCell`，生成元素包与 changeLog |
| `elements.waterCatalyst` | 已改为消耗水元素包；只消耗1水 |
| `elements.transferFire` | 已改为消耗来源火包并在目标格生成转移火包 |
| `elements.explodeIfEnemyOnFire` | 已清除火包和聚合火层 |
| `EXPORT_REPLAY` / `getReplay()` | 已接入 reducer/uiAdapter |
| CSV Unicode #U 文件名 | `csvData.cjs` 已支持 `#Uxxxx` 文件名解析 |

## 新增数据表

| 表 | 作用 |
|---|---|
| `17_试炼胜负规则_联动版.csv` | direct_win / trial_pass / trial_fail / turn1_pass |
| `18_效果物体表.csv` | 当前场上可触发物体样例：火核心领域、水催化、风聚火 |
| `19_触发器表.csv` | before_add_element / on_element_convert / on_fire_formed / on_enemy_enter |
| `20_修饰器表.csv` | next_element_x2 / water_catalyst_x2 / adjacent_fire_bonus |
| `21_元素包规则表.csv` | 转换保留来源、保留 modifier、允许拆分、同步聚合值 |
| `22_元素转换规则表.csv` | 风转火保留增幅等转换规则 |
| `23_触发排序规则表.csv` | 大巴扎式稳定触发顺序 |

## 已验证的新需求示例

测试已覆盖：

1. 宠物A添加火2元素包。
2. 宠物B添加风2元素包，并携带 `next_element_x2`。
3. 宠物C把风2转换成火2，保留来源和 modifier。
4. 宠物D再添加火1时，触发保留下来的 modifier，火1→火2。
5. 最终目标火聚合值为6。
6. changeLog 中有 `CONVERT_ELEMENT_PACKETS` 与 `APPLY_ELEMENT_MODIFIERS`。

## 已验证回放基础

`changeLog.cjs` 提供：

- `recordInput`
- `recordChange`
- `buildReplay`

`uiAdapter` 提供：

- `EXPORT_REPLAY`
- `getReplay()`

当前回放是数据回放基础，不是完整前端播放器。

## 测试结果

已通过：

```bash
npm test
npm run check:csv
npm run check:day7
npm run check:dom
npm run check:all
```

结果摘要：

- `npm test`：34/34 passed
- `check:csv`：7/7 passed + CSV data validation passed
- `check:day7`：node test passed + chromium browser passed
- `check:dom`：PASS no DOM/UI calls in src
- `check:all`：全部通过

## 仍然没有完全做完的部分

当前是 MVP，不是完整大巴扎系统最终版。

| 未完成项 | 说明 |
|---|---|
| 触发队列还没有贯穿所有 battle action | 已有 `triggerQueue.cjs`，但普通战斗仍主要同步执行 |
| `objectRegistry` 只是收集器 | 后续要接入真正监听/派发 |
| `modifierEngine` 只做基础数值链 | 还没把所有宠物相邻修饰器迁进去 |
| 18~23表是初版规则表 | 后续需要和宠物技能/行动槽深度联动 |
| replay 还不能前端播放 | 当前能导出结构化 input/change/battleTrace |

## 后续建议

下一步不要继续扩 day7。应优先做：

1. 把 `triggerQueue` 接入 `battle.useActionSlot`。
2. 把相邻/前后左右修饰器从表读入 `modifierEngine`。
3. 把 `battleTrace` 从结构化 change 自动生成文本。
4. 做一个最小 replay 播放页面，按 changeLog 分步更新棋盘。
