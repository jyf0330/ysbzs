# UI_UX_START

当前界面是三栏布局：左英雄，中棋盘，右行动槽/控制，底部日志。

## Skill Gate

界面、交互、HUD、棋盘点击、按钮、布局、可读性任务，改文件前必须先读并回执：

- `game-ui-frontend`
- `frontend-skill`
- `ywh-web-game`
- `playwright` 或 `game-playtest`

如果是“点不了、移动不了、选不中、状态不对”等可观察行为异常，还必须走：

- `systematic-debugging`
- `test-driven-development`

回执格式：

```text
本轮命中 skill：<skill names>
已读取：docs/roles/UI_UX_START.md, <SKILL.md names>
```

交互主线：选英雄 → 点空格移动 / 点目标格查看 → 选槽 → 调方向 → 施放 → 结束回合。

注意：选中行动槽后进入瞄准态，点击棋盘不再移动，只改变目标格。

## Board Interaction Acceptance

棋盘交互改动完成前，至少验证：

- 点棋盘英雄能选中英雄。
- 选中英雄后点空格能移动。
- 点敌人 / Boss 能查看详情，不误触移动。
- 点行动槽后进入瞄准态，点棋盘只改目标格。
- 瞄准态下点我方英雄能退出瞄准并回到移动选择。
- 选中态、可移动态、禁用态、提示文案和实际状态一致。
- 浏览器真实点击路径通过，并保留截图 / console / 状态文本证据。
