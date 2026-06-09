# UI_ADAPTER_START_HERE

`src/uiAdapter.cjs` 是当前 UI、测试、脚本进入核心规则的主门面。

这版已补上 Command 信封：所有玩家操作都可以带 `commandId / battleId / playerId / baseStateVersion`。旧的字符串命令仍兼容，但新代码优先用对象命令。

## 常用命令

- `START_BATTLE`
- `SELECT_UNIT`
- `SELECT_CELL`
- `MOVE_HERO`
- `SELECT_SLOT`
- `SET_ACTION_DIRECTION`
- `USE_SLOT`
- `END_PLAYER_TURN`
- `RUN_MONSTER_TURN`
- `START_NEXT_ROUND`
- `RUN_BATTLE`
- `REWARD_OPTIONS`
- `PICK_REWARD`
- `ENTER_SHOP`
- `ROLL_SHOP`
- `FREEZE_OFFER`
- `UNFREEZE_OFFER`
- `BUY_OFFER`
- `EXIT_SHOP`
- `SELL_UNIT`
- `TOGGLE_UNIT_ACTIVE`
- `APPLY_SHOP_EVENT`
- `BUILD_PREVIEW`
- `GET_CELL_DETAIL`
- `EXPORT_BATTLE_TRACE`
- `REPLAY_BATTLE_TRACE`
- `EXPORT_REPLAY`

## 推荐命令格式

```js
adapter.run({
  commandId: 'client_000001',
  battleId: 'battle_01_local',
  playerId: 'p1',
  baseStateVersion: 0,
  type: 'START_BATTLE'
})
```

## 本地预测 / 服务器权威入口

- `src/adapters/localAdapter.cjs`
- `src/adapters/serverAuthorityAdapter.cjs`

同一初始状态 + 同一串 command，二者输出的 `stateHash` 必须一致。对应测试：

```bash
npm run test:prediction
```

## 回放口径

`exportBattleTrace()` 导出结构化事件；`replayBattleTrace(events)` 必须只调用 `REPLAY_BATTLE_TRACE`，不能串到 `EXPORT_REPLAY`。

新事件会补齐 `commandId / playerId / teamId`，方便以后回放、战报、合作统计、PVP 归属。


## Round 4 架构口径

- `SELECT_UNIT / SELECT_CELL / SELECT_SLOT` 是 per-player UI ViewState，不再写入权威 GameState，也不推进 `stateVersion`。
- `createViewModel(state)` 仍兼容单人；新代码优先使用 `buildViewModelForPlayer(state, playerId, viewState)`。
- `RUN_FULL_DAY` 是脚本流，不再外层重复写入子命令 battleTrace。
- Debug/host 命令已经与普通 player command 分开，非 solo 模式可关闭。
- `SELL_UNIT / TOGGLE_UNIT_ACTIVE` 已接入阵容管理闭环：商店购买默认进入备战席，玩家手动上阵。
