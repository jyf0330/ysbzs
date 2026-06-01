# 通用 AI 游戏评测台设计

## 背景

本设计面向“通用 AI 游戏测试框架/评测台”，不是继续给 ysbzs 的 `test.js` 增加项目专用断言。

当前项目已有四类验证入口：

- `test.js`：逻辑回归。通过 DOM stub 加载 `index.html` 脚本，验证确定性规则。
- `playable_day1.js` / `playable_run.js`：脚本化可玩性走查，生成文字报告。
- `replay.js` 与 `index.html` 内的 replay 函数：可保存初始状态、动作步骤、最终 hash，并回放。
- `e2e/smoke.js`：Playwright 浏览器冒烟，验证页面、棋盘和 debug 面板。
- `benchmarks/ysbzs/`：文档、fixture、代码的一致性基准，明确不测试不同 Agent。

这些入口缺少一层统一协议：游戏适配器输入状态，Agent 产生动作，游戏执行动作，记录轨迹，评估器判定结果。新增评测台应利用现有 replay/action 能力，而不是替代现有测试。

## 目标

1. 抽象一个可复用的评测流程：`Scenario -> GameAdapter -> Agent -> TraceRecorder -> Evaluator -> Report`。
2. 第一版支持 ysbzs 的纯逻辑执行路径，能运行多个脚本或策略 Agent。
3. 评测输出必须包含机器可读 trace 和人类可读 summary。
4. 评估器分层：状态不变量、目标达成、Agent 行为质量、浏览器证据。
5. 后续可以为其他小游戏新增 adapter，而不重写 agent 和 evaluator。

## 非目标

1. 第一版不训练强化学习模型。
2. 第一版不让 LLM 直接看截图乱点 UI。
3. 不把评测台塞进 `test.js`。
4. 不重构 `index.html` 单文件架构。
5. 不替代 `benchmarks/ysbzs/` 的文档/fixture 一致性职责。

## 推荐方案

采用“核心评测台 + ysbzs adapter”的方案。

目录建议：

```text
ai-eval/
  core/
    types.js
    runner.js
    trace-recorder.js
    report-writer.js
  agents/
    script-agent.js
    random-legal-agent.js
    heuristic-agent.js
  evaluators/
    invariant-evaluator.js
    goal-evaluator.js
    behavior-evaluator.js
  adapters/
    ysbzs-core-adapter.js
    ysbzs-browser-adapter.js
  scenarios/
    ysbzs-day1.json
    ysbzs-run-smoke.json
  reports/
```

`ysbzs-core-adapter.js` 直接复用当前游戏脚本和 replay/action 函数。`ysbzs-browser-adapter.js` 作为第二阶段，用 Playwright 执行关键 episode 并保存截图、console error 和 trace。

## 核心接口

### Scenario

Scenario 描述一次评测的起点、约束和目标。

```js
{
  "id": "ysbzs-day1-summon",
  "game": "ysbzs",
  "seed": 1,
  "adapter": "ysbzs-core",
  "agent": "script-day1",
  "maxSteps": 80,
  "initial": {
    "mode": "freshGame"
  },
  "goals": [
    { "type": "phaseIs", "value": "SHOP" },
    { "type": "engineStatAtLeast", "key": "summonCount", "value": 1 }
  ]
}
```

### GameAdapter

GameAdapter 是游戏与评测台之间唯一耦合点。

```js
class GameAdapter {
  async reset(scenario) {}
  async observe() {}
  async legalActions(observation) {}
  async step(action) {}
  async snapshot() {}
  async restore(snapshot) {}
  async close() {}
}
```

`ysbzs-core-adapter` 的实现来源：

- reset：调用 `initGame()` 或 `applyReplaySnapshot()`。
- observe：读取 `G`、`buildReplayFinalResult()`、必要时读取 `G.coreSnapshot`。
- legalActions：根据 `G.phase`、英雄位置、行动槽、商店状态生成合法动作。
- step：调用 `dispatchGameAction(action)`、`endPlayerTurn()`、`closeShop()` 等已有入口。
- snapshot/restore：使用 `snapshotCoreStateForReplay()` 和 `applyReplaySnapshot()`。

### Agent

Agent 只接收结构化 observation 和 legalActions，不直接操作全局状态。

```js
class Agent {
  async act({ observation, legalActions, history }) {}
}
```

第一版 Agent：

- `ScriptAgent`：按固定脚本执行，迁移 `playable_day1.js` / `playable_run.js` 的稳定路径。
- `RandomLegalAgent`：从 legalActions 随机选，用于发现非法状态、死循环和 action mask 漏洞。
- `HeuristicAgent`：优先使用未用技能槽、清怪、进商店、关闭商店，模拟低成本玩家。

LLM Agent 放到后续阶段，并强制 JSON action schema，不允许自由文本直接驱动 UI。

### TraceRecorder

每一步记录最小可复现信息：

```js
{
  "step": 12,
  "observationHash": "a1b2c3",
  "action": { "type": "USE_SLOT", "slotId": 0 },
  "accepted": true,
  "result": {
    "phase": "PLAYER",
    "day": 1,
    "round": 1,
    "monstersAlive": 2,
    "playerCastleHp": 100
  },
  "errors": []
}
```

Trace 输出为 JSONL，summary 输出为 Markdown。失败时保存最终 snapshot，确保能通过 adapter restore 或 replay 复现。

## 评估器

### InvariantEvaluator

每步检查状态不变量：

- `phase` 必须属于合法集合。
- HP 不得出现非法负数，死亡实体必须有一致 dead 标记。
- `elementCells` 与 board 上的元素层显示不得明显背离。
- hero、monster、summon、castle 不得占用同一格。
- episode 不得超过 `maxSteps` 后仍无解释地停在同一 phase。

### GoalEvaluator

根据 Scenario 的 goals 判定目标：

- 是否到达指定 phase。
- 是否进入指定 day / dayHalf。
- 是否通关或失败。
- 指定统计值是否达到阈值。
- 最终 hash 是否匹配预期。

### BehaviorEvaluator

评估 Agent 行为质量：

- invalid action 数量。
- 重复无收益动作数量。
- 到达目标所需 step 数。
- 城堡 HP、金币、召唤/治疗/击杀等效率指标。

### BrowserEvaluator

第二阶段启用。用 Playwright 对关键 trace 做 UI 复跑：

- 页面能打开。
- console 无新增 error。
- 棋盘、debug 面板、日志文本与 adapter summary 对齐。
- 失败时保存截图和 Playwright trace。

## 与现有文件的关系

- `test.js` 保持逻辑回归职责，不迁移到评测台。
- `playable_day1.js` / `playable_run.js` 可在评测台稳定后降级为兼容入口，内部调用 `ai-eval` runner。
- `replay.js` 继续负责单条 replay 的 hash 回放。
- `benchmarks/ysbzs/` 继续负责文档/fixture/代码一致性，不测试 Agent。
- `e2e/smoke.js` 继续做最小浏览器冒烟；浏览器评测另建 episode 级 runner。

## 错误处理

Runner 对每个 scenario 独立捕获错误。单个 scenario 失败不得中断整个 suite，除非 CLI 使用 `--fail-fast`。

错误分类：

- `ADAPTER_ERROR`：adapter 初始化、观察、执行、恢复失败。
- `AGENT_ERROR`：agent 未返回动作或返回无法解析动作。
- `INVALID_ACTION`：动作不在 legalActions 内。
- `EVALUATION_FAIL`：评估器判定失败。
- `TIMEOUT`：超过 maxSteps 或浏览器超时。

## 验收标准

第一版完成时必须满足：

1. `node ai-eval/run.js scenarios/ysbzs-day1.json` 能生成 JSONL trace 和 Markdown summary。
2. `ScriptAgent` 能复现 Day1 召唤/治疗/商店目标。
3. `RandomLegalAgent` 能运行至少 20 个 seed，不出现 adapter 崩溃。
4. `InvariantEvaluator` 至少覆盖 phase、HP、占位、maxSteps 四类不变量。
5. `node test.js` 仍可独立运行。
6. 不修改 `index.html` 的核心游戏规则；如果必须暴露 hook，只做最小测试入口。

## 风险与控制

- 当前游戏主文件仍是单文件原型。评测台不能推动大规模拆分，只能从外部加载和调用已有 hook。
- `legalActions` 容易漏动作。第一版只覆盖 PLAYER 与 SHOP 的核心动作，未知动作不生成。
- 浏览器 adapter 易受 UI 文本和布局变化影响。第二阶段只复跑少量关键 trace，不承担全部搜索。
- 当前工作区有未归属改动。实施前应使用隔离分支或 worktree，避免混入既有半成品。

## 后续实施顺序

1. 写最小 runner、trace recorder、report writer。
2. 写 `ysbzs-core-adapter`，只支持 fresh reset、observe、step、snapshot。
3. 写 `ScriptAgent`，迁移 Day1 走查为 scenario。
4. 写 `InvariantEvaluator` 和 `GoalEvaluator`。
5. 增加 `RandomLegalAgent` 和多 seed runner。
6. 再接浏览器 adapter 和 Playwright evidence。
