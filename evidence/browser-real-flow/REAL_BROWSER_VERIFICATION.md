# 真实浏览器玩家链路验证

- 时间：2026-06-09T03:22:53.900Z
- URL：http://127.0.0.1:4196
- 浏览器：/usr/bin/chromium
- 验证方式：CDP `Input.dispatchMouseEvent` 发送真实鼠标事件，页面按钮/格子自己触发 DOM click 监听。
- 禁止事项：本脚本不调用 `/api/action` 改状态，不使用 fallback，不把 API 调用当作玩家操作。

## 通过的玩家操作
- 点击“开始战斗”：#etb @ (1037, 360)
- 点击左侧英雄卡片：.hero-card @ (135, 174)
- 点击棋盘空格移动英雄：#board .cell[data-r="6"][data-c="3"] @ (599, 433)
- 点击行动槽卡片：[data-slot="0"] @ (1102, 182)
- 点击 AP 分配 1 点：#ap-modal [data-ap-choice="1"] @ (790, 245)
- 关闭 AP 分配弹窗：#ap-modal [data-ap-close] @ (901, 245)
- 点击方向箭头：右：[data-slot-dir="0"][data-dir="right"] @ (1184, 167)
- 点击目标格：#board .cell[data-r="6"][data-c="4"] @ (653, 433)
- 点击“施放”：[data-use="0"] @ (1169, 196)
- 点击“保存”：#save-game-btn @ (855, 137)
- 点击“新开一天”验证读取前状态会重置：#new-game-btn @ (697, 137)
- 点击“读取”恢复刚才存档：#load-game-btn @ (911, 136)
- 点击“结束回合”：#etb @ (1037, 360)
- 点击“怪物行动”：#monster-btn @ (1185, 360)
- 点击“战报”标签：[data-log-tab="report"] @ (68, 631)
- 点击“回放”标签：[data-log-tab="replay"] @ (68, 657)
- 回放下一步：[data-replay-next] @ (355, 601)
- 鼠标悬停机制词条显示工具提示：[data-tip] @ (114, 347)
- 按 Ctrl+` 打开调试面板：keyboard:Ctrl+Backquote @ (0, 0)
- 关闭调试面板：[data-debug-close] @ (1232, 400)

## 截图
- screenshots/01_loaded.png：页面真实加载；棋盘、英雄列表、行动槽都已由浏览器渲染。
- screenshots/02_start_battle_player_turn.png：进入玩家回合，按钮文字变为“结束回合”。
- screenshots/03_hero_selected.png：英雄卡片出现选中态，棋盘可移动格出现提示。
- screenshots/04_hero_moved_by_cell_click.png：英雄通过点棋盘空格移动到新位置。
- screenshots/05_slot_selected_armed.png：行动槽进入瞄准态，点棋盘只选目标，不再误移动。
- screenshots/06_ap_modal_allocation.png：行动槽 AP 分配弹窗可通过真实点击选择 AP。
- screenshots/07_slot_direction_right.png：方向调整通过按钮进入核心状态。
- screenshots/08_target_cell_selected.png：选中目标格，左侧目标信息同步更新。
- screenshots/09_slot_used_event_log.png：施放后事件日志出现行动槽事件，棋盘出现元素/预览反馈。
- screenshots/10_save_game_written.png：真实点击保存按钮后，本地存档写入 localStorage。
- screenshots/11_load_game_restored.png：读取按钮恢复保存后的战斗状态、事件流和棋盘反馈。
- screenshots/12_player_turn_ended.png：结束玩家回合，事件日志记录 PLAYER_TURN_END。
- screenshots/13_monster_action_clicked.png：怪物行动通过按钮推进。
- screenshots/14_battle_report_tab.png：战报标签通过前端读取 report 并显示文本。
- screenshots/15_battle_replay_tab.png：回放标签显示事件列表、步骤计数和 JSON 导出输入框。
- screenshots/16_tooltip_hover.png：鼠标悬停元素/机制词条弹出说明浮窗。
- screenshots/17_debug_panel_opened.png：Ctrl+` 打开可拖拽调试面板并显示当前 ViewModel 摘要。

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
  "eventCount": 13,
  "roster": {
    "active": 4,
    "bench": 0,
    "maxActive": 4
  },
  "replayEventsInPanel": 17,
  "lastEvents": [
    {
      "step": 6,
      "type": "PLAYER_SELECT_SLOT",
      "text": "玩家施放 我方融焰娘 第1槽：爆心二连/火/1层（AP1），命中 R6C4、R6C5。"
    },
    {
      "step": 7,
      "type": "APPLY_ELEMENT_CELL",
      "text": "我方融焰娘 向 R6C4 施加火1层，火层 0→1。"
    },
    {
      "step": 8,
      "type": "APPLY_ELEMENT_CELL",
      "text": "我方融焰娘 向 R6C5 施加火1层，火层 0→1。"
    },
    {
      "step": 9,
      "type": "PLAYER_TURN_END",
      "text": "玩家点击结束行动，进入元素统一结算。"
    },
    {
      "step": 10,
      "type": "MONSTER_INTENT",
      "text": "敌方棉悠悠 锁定 融焰娘，路径 R1C5→R1C4→R1C3。"
    },
    {
      "step": 11,
      "type": "MONSTER_MOVE",
      "text": "敌方棉悠悠 移动：R1C6→R1C3。"
    },
    {
      "step": 12,
      "type": "ROUND_START",
      "text": "第1天上午第2回合开始。"
    },
    {
      "step": 13,
      "type": "SPAWN_ENEMY",
      "text": "敌方Boss召唤 敌方捣蛋猫 HP16/攻6，位置 R2C6。"
    }
  ]
}
```