# UI_ADAPTER_START_HERE

`src/uiAdapter.cjs` 是 UI、测试、脚本进入核心规则的唯一门面。

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
- `EXPORT_BATTLE_TRACE`
- `REPLAY_BATTLE_TRACE`
- `EXPORT_REPLAY`

## 回放口径

`exportBattleTrace()` 导出结构化事件；`replayBattleTrace(events)` 必须只调用 `REPLAY_BATTLE_TRACE`，不能串到 `EXPORT_REPLAY`。该点已有 `tests/ui_adapter.test.cjs` 的 UI15 覆盖。
