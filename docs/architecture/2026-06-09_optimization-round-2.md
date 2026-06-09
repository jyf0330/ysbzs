# 2026-06-09 优化第 2 轮：移动规则、UI 渲染、事件系统、Session

本轮以《优化计划 · 元素背包史》指出的问题为问题清单，但没有机械照搬方案。目标是先消掉会影响后续“本地预测 + 服务器权威 + 未来合作/PVP”的风险点。

## 已实现

### 1. 移动系统去掉 `moveMode: infinite`

- 删除 `factionRules.player.moveMode = infinite` 和 `hasInfiniteMove()`。
- 所有玩家移动都走统一距离校验：`effectiveMoveRange(state, unit)`。
- 玩家单位由 `unitFactory` 写入显式 `moveRange`，默认等于当前棋盘最大曼哈顿距离。
- 敌方仍然默认走 `ap`，不会被玩家全图移动规则影响。

这样不是用 faction flag 绕过规则，而是把“移动范围”变成单位数据字段，未来不同英雄可以直接通过表/覆盖字段配置不同移动范围。

### 2. UI 动态列表改事件委托

- 棋盘、英雄列表、行动槽、奖励、商店商品不再每次渲染后重新绑定 N 个监听器。
- `renderHeroes/renderBoard/renderSlots/renderRewards/renderShop` 只负责输出 DOM。
- `bind()` 里对容器绑定一次点击委托。

### 3. 去掉一次操作后的第二次全量渲染

- `runCommand()` 成功后仍然完整渲染一次。
- `finally` 不再再次 `render()`，只解除 busy 并刷新控制按钮状态。

### 4. 事件系统增强但保持确定性

- `src/core/events.cjs` 增加：
  - `EVENT_TYPES`
  - `EVENT_LEVEL`
  - `filterEvents()`
  - `lastEvents()`
- 没有把 `Date.now()` 写进核心事件，避免破坏本地预测/服务器权威一致性。

### 5. UI Server 支持多 Session

- `tools/run_ui_server.cjs` 从单全局 adapter 改为 `sessions: Map`。
- 支持 `x-session-id` 请求头或 `?sessionId=`。
- `/api/session/new` 可以创建/重置指定 session。

### 6. 新增开发者工具

- `tools/inspect_state_diff.cjs`：比较两个状态快照的字段差异。
- `tools/compare_replays.cjs`：比较两条事件/回放序列是否等价。

### 7. 新增单元测试

新增 `tests/unit/architecture_optimization.test.cjs`，覆盖：

- `moveMode/hasInfiniteMove` 已从核心代码移除。
- `moveRange` 能正常允许/阻止移动。
- 事件系统支持 level/filter 且不引入时间戳。
- UI 已使用事件委托，并且 `finally` 不做第二次全量 render。

## 暂未做

### battle.cjs 机械拆分

这轮没有把 `battle.cjs` 机械拆成多个文件。原因：当前文件内部函数闭包依赖较多，如果只为了“拆文件”硬拆，容易在元素结算、预览、AI 规划之间引入行为差异。

更稳的下一轮做法：先把 `position/actions/preview/ai` 的纯函数依赖显式化，再拆文件并保持 `battle.cjs` 作为 façade。

### 棋盘单格增量 DOM 更新

本轮先消掉重复渲染和重复事件绑定。单格 diff 更新可以下一轮做，因为它需要更细的 DOM patch 逻辑和动画状态机，风险高于当前收益。

## 验收命令

```bash
npm test
npm run test:unit
npm run verify:browser:evidence
npm run check:all
```
