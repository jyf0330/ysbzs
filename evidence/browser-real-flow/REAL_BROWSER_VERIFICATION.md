# 真实浏览器玩家链路验证

- 时间：2026-06-08T19:38:32.150Z
- URL：http://127.0.0.1:4196
- 浏览器：/usr/bin/chromium
- 验证方式：CDP `Input.dispatchMouseEvent` 发送真实鼠标事件，页面按钮/格子自己触发 DOM click 监听。
- 禁止事项：本脚本不调用 `/api/action` 改状态，不使用 fallback，不把 API 调用当作玩家操作。

## 通过的玩家操作
- 点击“开始战斗”：#etb @ (1037, 360)
- 点击左侧英雄卡片：.hero-card @ (135, 174)
- 点击棋盘空格移动英雄：#board .cell[data-r="6"][data-c="3"] @ (599, 433)
- 点击行动槽卡片：[data-slot="0"] @ (1102, 182)
- 点击方向箭头：右：[data-slot-dir="0"][data-dir="right"] @ (1184, 167)
- 点击目标格：#board .cell[data-r="6"][data-c="4"] @ (653, 433)
- 点击“施放”：[data-use="0"] @ (1169, 196)
- 点击“结束回合”：#etb @ (1037, 360)
- 点击“怪物行动”：#monster-btn @ (1185, 360)
- 点击“战报”标签：[data-log-tab="report"] @ (68, 631)

## 截图
- screenshots/01_loaded.png：页面真实加载；棋盘、英雄列表、行动槽都已由浏览器渲染。
- screenshots/02_start_battle_player_turn.png：进入玩家回合，按钮文字变为“结束回合”。
- screenshots/03_hero_selected.png：英雄卡片出现选中态，棋盘可移动格出现提示。
- screenshots/04_hero_moved_by_cell_click.png：英雄通过点棋盘空格移动到新位置。
- screenshots/05_slot_selected_armed.png：行动槽进入瞄准态，点棋盘只选目标，不再误移动。
- screenshots/06_slot_direction_right.png：方向调整通过按钮进入核心状态。
- screenshots/07_target_cell_selected.png：选中目标格，左侧目标信息同步更新。
- screenshots/08_slot_used_event_log.png：施放后事件日志出现行动槽事件，棋盘出现元素/预览反馈。
- screenshots/09_player_turn_ended.png：结束玩家回合，事件日志记录 PLAYER_TURN_END。
- screenshots/10_monster_action_clicked.png：怪物行动通过按钮推进。
- screenshots/11_battle_report_tab.png：战报标签通过前端读取 report 并显示文本。

## 视频
- ysbzs_real_browser_player_flow.mp4

## 最终状态摘要
```json
{
  "phase": "player_turn",
  "day": 1,
  "round": 2,
  "selected": {
    "unitId": "hero_pal_072_1",
    "slotId": 0,
    "cell": {
      "r": 6,
      "c": 4
    },
    "direction": "right"
  },
  "heroCount": 4,
  "enemyCount": 2,
  "eventCount": 17,
  "lastEvents": [
    {
      "step": 10,
      "type": "PLAYER_SELECT_SLOT",
      "text": "玩家施放 我方融焰娘 第1槽：爆心二连/火/1层，命中 R6C4、R6C5。"
    },
    {
      "step": 11,
      "type": "APPLY_ELEMENT_CELL",
      "text": "我方融焰娘 向 R6C4 施加火1层，火层 0→1。"
    },
    {
      "step": 12,
      "type": "APPLY_ELEMENT_CELL",
      "text": "我方融焰娘 向 R6C5 施加火1层，火层 0→1。"
    },
    {
      "step": 13,
      "type": "PLAYER_TURN_END",
      "text": "玩家点击结束行动，进入元素统一结算。"
    },
    {
      "step": 14,
      "type": "MONSTER_INTENT",
      "text": "敌方棉悠悠 锁定 融焰娘，路径 R1C5→R1C4→R1C3。"
    },
    {
      "step": 15,
      "type": "MONSTER_MOVE",
      "text": "敌方棉悠悠 移动：R1C6→R1C3。"
    },
    {
      "step": 16,
      "type": "ROUND_START",
      "text": "第1天上午第2回合开始。"
    },
    {
      "step": 17,
      "type": "SPAWN_ENEMY",
      "text": "敌方Boss召唤 敌方捣蛋猫 HP16/攻6，位置 R2C6。"
    }
  ]
}
```