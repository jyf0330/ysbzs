# 2026-06-09 · 本地预测 + 服务器权威验证架构补完

## 目标

这次不是把项目改成“只能本地”或“只能服务器”，而是把核心链路改成以后两边都能走：

```txt
玩家点击 → Command 信封 → localAdapter 可预测 → serverAuthorityAdapter 可验证 → stateVersion/stateHash 对齐 → ViewModel 渲染
```

## 已落地代码

### 1. 多人/合作/PVP 预留字段

`createGameState()` 现在会初始化：

- `battleId`
- `mode`: `solo | coop | pvp`
- `stateVersion`
- `players`
- `teams`
- `turn.activeTeamId`
- `turn.activePlayerId`
- `turn.readyPlayerIds`
- `rngState`
- `commandLog`

单位和双方核心会补齐：

- `teamId`
- `controllerId`

因此以后不要再把“我方/敌方”写死成“当前玩家/AI”。正确口径是：

```txt
teamId = 属于哪个队伍
controllerId = 谁可以操作
playerId = 当前发命令的人
```

### 2. Command 信封

所有 `/api/action` 命令现在都可以带：

```js
{
  commandId: 'client_000001',
  battleId: 'battle_01_local',
  playerId: 'p1',
  baseStateVersion: 3,
  type: 'USE_SLOT',
  unitId: 'hero_pal_072_1',
  slotId: 0,
  cell: { r: 6, c: 4 }
}
```

服务器只接受“玩家想做什么”，不接受“玩家声称结果是什么”。

### 3. 本地预测 adapter

新增：

- `src/adapters/localAdapter.cjs`
- `src/adapters/serverAuthorityAdapter.cjs`
- `src/adapters/index.cjs`

用途：

```js
const { createLocalPredictionAdapter, createServerAuthorityAdapter } = require('./src/adapters/index.cjs')

const local = createLocalPredictionAdapter({ battleId: 'b1', seed: 'fixed' })
const server = createServerAuthorityAdapter({ battleId: 'b1', seed: 'fixed' })
```

同一个初始状态 + 同一个 command，local 与 server 应输出相同 `stateHash`。

### 4. 服务器权威验证

`serverAuthorityAdapter` 会严格检查：

- `baseStateVersion` 是否等于当前 `stateVersion`
- `playerId` 是否有权操作目标单位
- 命令是否是公开命令

如果版本过期：

```js
{
  ok: false,
  accepted: false,
  error: { code: 'STATE_VERSION_MISMATCH' }
}
```

如果玩家操作了不属于自己的单位：

```js
{
  ok: false,
  accepted: false,
  error: { code: 'FORBIDDEN_UNIT_CONTROL' }
}
```

### 5. battleTrace 结构化归属

新事件会补齐：

- `eventId`
- `seq`
- `battleId`
- `commandId`
- `playerId`
- `teamId`

这让以后回放、战报、合作贡献统计、PVP 归属都能从同一条事件流生成。

## 浏览器 UI 改动

`web/ux-app.js` 现在发命令时自动带：

- `commandId`
- `playerId`
- `battleId`
- `baseStateVersion`

顶部状态栏显示 `stateVersion`。

## 新增验收

```bash
npm run test:prediction
```

覆盖：

1. local prediction 与 server authority 同命令同 hash。
2. 服务器拒绝旧版本 command。
3. PVP/合作字段可以阻止玩家操作别人单位。
4. ViewModel 暴露多人预留信息，trace 事件带 command/player/team 归属。

## 现在还没有做的事

当前只完成架构地基，还没有做真正联机房间层：

- WebSocket 广播
- 房间匹配
- 多客户端状态同步
- 断线重连
- 隐藏信息裁剪

但现在的核心已经不会阻碍以后接这些东西。

