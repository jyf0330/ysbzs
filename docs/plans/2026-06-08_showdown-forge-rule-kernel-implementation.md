# 2026-06-08 Showdown/Forge 思想接入报告

## 目标

不 fork Pokémon Showdown，不 fork Forge，不接入大型规则库；只吸收两类优秀思想：

- Pokémon Showdown：battle log 是结构化协议，中文只是展示。
- Forge/MTG：规则分为 triggered ability / replacement effect / continuous effect。

## 已新增模块

| 文件 | 作用 |
|---|---|
| `src/core/battleEventProtocol.cjs` | 结构化 battle event protocol：eventId/type/actor/target/payload/changes/source/text/protocol |
| `src/core/replacementEffects.cjs` | 事件执行前改写：例如 next_element_x2、风转火这类 replacement effect |
| `src/core/continuousEffects.cjs` | 持续修饰 base→final：例如相邻火宠附火×2、领域持续改写 |

## 已改模块

| 文件 | 改动 |
|---|---|
| `src/core/changeLog.cjs` | `recordChange` 会同步生成 battleTrace 协议事件；replayVersion 升为 `ysbzs_replay_v2_protocol` |
| `src/core/elementPackets.cjs` | `before_next_add_element` modifier 改为委托 `replacementEffects.applyReplacementEffects` 执行；保留旧 `APPLY_ELEMENT_MODIFIERS` 事件兼容测试/战报 |
| `src/core/battle.cjs` | 战斗结束时不再覆盖协议事件；保留已有 battleTrace，再补 legacy events |
| `src/uiAdapter.cjs` | battleTrace 输出保留完整结构化字段，不再只输出 step/type/text |
| `tests/run_all_tests.cjs` | 新增 battleTrace 协议、replacementEffects、continuousEffects 三个测试 |

## 当前规则内核分层

| 分层 | 当前实现 |
|---|---|
| battle event protocol | `battleEventProtocol.cjs` |
| replacement effect | `replacementEffects.cjs` |
| continuous effect | `continuousEffects.cjs` |
| triggered ability | 仍使用现有 `triggerQueue.cjs`，尚未全量接入 battle action |
| 元素包 | `elementPackets.cjs` |
| change/replay | `changeLog.cjs` |

## 已验证场景

1. `battleTrace` 中 `ADD_ELEMENT_PACKET` 是机器可读协议事件：包含 `eventId/protocol/changes/actor`。
2. `replacementEffects` 可以在事件执行前把 `火+1` 改写成 `火+2`。
3. `continuousEffects` 可以计算相邻持续修饰：基础值1，经相邻效果变成2。
4. 原有元素包链路仍然成立：风2带 `next_element_x2`，风转火后保留 modifier，下次火1变火2。
5. 第7天浏览器链路仍然通过公开 `/api/action` 触发。

## 没做的部分

| 未完成项 | 说明 |
|---|---|
| `triggerQueue` 尚未全量贯穿 battle action | 当前已存在排序器，但普通攻击仍主要同步结算 |
| 18~23 表还没有完全驱动 replacement/continuous | 这次先做代码内核，后续再把更多规则从表读入 |
| battleTrace 中文生成仍在过渡期 | 已有结构化协议事件，但旧事件 text 仍保留 |
| replay 播放器未做 | 只保留 replay 数据导出基础 |

## 验收结果

已运行：

```bash
npm test
npm run check:csv
npm run check:day7
npm run check:dom
npm run check:all
```

结果：全部通过。

- `npm test`：37/37 passed
- `check:csv`：7/7 passed + CSV data validation passed
- `check:day7`：node test passed + chromium browser passed
- `check:dom`：PASS no DOM/UI calls in src
- `check:all`：全部通过

## 下一步建议

1. 把 `triggerQueue` 接入 `battle.useSlot/addElement` 后置触发。
2. 让 `replacementEffects` 从 `22_元素转换规则表.csv` 加载规则。
3. 让 `continuousEffects` 从 `20_修饰器表.csv` 和 `18_效果物体表.csv` 加载相邻/前后左右修饰。
4. 逐步让中文战报完全由 `battleEventProtocol + explainTrace` 生成。
