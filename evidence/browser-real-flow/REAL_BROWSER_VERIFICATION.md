# 真实浏览器玩家链路验证

- 时间：2026-06-09T11:09:12.806Z
- URL：http://127.0.0.1:4196
- 浏览器：/Applications/Google Chrome.app/Contents/MacOS/Google Chrome
- 验证方式：CDP `Input.dispatchMouseEvent` 发送真实鼠标事件，页面按钮/格子自己触发 DOM click 监听。
- 禁止事项：本脚本不调用 `/api/action` 改状态，不使用 fallback，不把 API 调用当作玩家操作。

## 通过的玩家操作
- 点击“开始战斗”：#etb @ (1045, 343)
- 点击棋盘上的英雄棋子：#board .cell.hero-cell @ (524, 388)
- 点击左侧英雄卡片：.hero-card @ (163, 182)
- 点击棋盘空格移动英雄：#board .cell[data-r="6"][data-c="3"] @ (626, 439)
- 点击左侧行动块：#hero-list [data-slot="0"] @ (74, 236)
- 点击 AP 分配 1 点：#ap-modal [data-ap-choice="1"] @ (790, 241)
- 关闭 AP 分配弹窗：#ap-modal [data-ap-close] @ (901, 241)
- 点击方向箭头：右：[data-slot-dir="0"][data-dir="right"] @ (1077, 238)
- 点击目标格：#board .cell[data-r="6"][data-c="4"] @ (677, 439)
- 点击“施放”：[data-use="0"] @ (1190, 238)
- 点击“保存”：#save-game-btn @ (865, 137)
- 点击“新开一天”验证读取前状态会重置：#new-game-btn @ (726, 137)
- 点击“读取”恢复刚才存档：#load-game-btn @ (921, 134)
- 点击“结束回合”：#etb @ (1045, 360)
- 点击“怪物行动”：#monster-btn @ (1187, 360)
- 点击“战报”标签：[data-log-tab="report"] @ (66, 631)
- 点击“回放”标签：[data-log-tab="replay"] @ (66, 657)
- 回放下一步：[data-replay-next] @ (347, 601)
- 鼠标悬停机制词条显示工具提示：[data-tip] @ (483, 320)
- 按 Ctrl+` 打开调试面板：keyboard:Ctrl+Backquote @ (0, 0)
- 关闭调试面板：[data-debug-close] @ (1247, 400)

## 截图
- screenshots/01_loaded.png：页面真实加载；棋盘、英雄列表、行动槽都已由浏览器渲染。
- screenshots/02_start_battle_player_turn.png：进入玩家回合，按钮文字变为“结束回合”。
- screenshots/03_board_hero_selected.png：点击棋盘英雄也能选中单位，允许随后点空格移动。
- screenshots/04_hero_selected.png：英雄卡片出现选中态，棋盘可移动格出现提示。
- screenshots/05_hero_moved_by_cell_click.png：英雄通过点棋盘空格移动到新位置。
- screenshots/06_slot_selected_armed.png：左侧行动块进入瞄准态，右侧详细信息显示方向与施放。
- screenshots/07_ap_modal_allocation.png：行动槽 AP 分配弹窗可通过真实点击选择 AP。
- screenshots/08_slot_direction_right.png：方向调整通过按钮进入核心状态。
- screenshots/09_target_cell_selected.png：选中目标格，右侧详细信息同步更新。
- screenshots/10_slot_used_event_log.png：施放后事件日志出现行动槽事件，棋盘出现元素/预览反馈。
- screenshots/11_save_game_written.png：真实点击保存按钮后，本地存档写入 localStorage。
- screenshots/12_load_game_restored.png：读取按钮恢复保存后的战斗状态、事件流和棋盘反馈。
- screenshots/13_player_turn_ended.png：结束玩家回合，事件日志记录 PLAYER_TURN_END。
- screenshots/14_monster_action_clicked.png：怪物行动通过按钮推进。
- screenshots/15_battle_report_tab.png：战报标签通过前端读取 report 并显示文本。
- screenshots/16_battle_replay_tab.png：回放标签显示事件列表、步骤计数和 JSON 导出输入框。
- screenshots/17_tooltip_hover.png：鼠标悬停元素/机制词条弹出说明浮窗。
- screenshots/18_debug_panel_opened.png：Ctrl+` 打开可拖拽调试面板并显示当前 ViewModel 摘要。

## 视频
- 未生成：--check mode

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
  "enemyCount": 5,
  "eventCount": 21,
  "roster": {
    "active": 4,
    "bench": 0,
    "maxActive": 4
  },
  "replayEventsInPanel": 29,
  "lastEvents": [
    {
      "step": 14,
      "type": "DAMAGE",
      "text": "敌方翠叶鼠 对 我方融焰娘 造成风伤害：原始3→有效3，盾0→0，HP20→17。"
    },
    {
      "step": 15,
      "type": "APPLY_ELEMENT_CELL",
      "text": "敌方翠叶鼠 向 R6C5 施加风1层，风层 0→1。"
    },
    {
      "step": 16,
      "type": "APPLY_ELEMENT_CELL",
      "text": "敌方翠叶鼠 向 R6C4 施加风1层，风层 0→1。"
    },
    {
      "step": 17,
      "type": "APPLY_ELEMENT_CELL",
      "text": "敌方翠叶鼠 向 R6C3 施加风1层，风层 0→1。"
    },
    {
      "step": 18,
      "type": "ROUND_START",
      "text": "第1天上午第2回合开始。"
    },
    {
      "step": 19,
      "type": "SPAWN_ENEMY",
      "text": "敌方Boss召唤 敌方捣蛋猫(青铜) HP20/攻3，位置 R2C6。"
    },
    {
      "step": 20,
      "type": "SPAWN_ENEMY",
      "text": "敌方Boss召唤 敌方棉悠悠(青铜) HP6/攻1，位置 R6C6。"
    },
    {
      "step": 21,
      "type": "SPAWN_ENEMY",
      "text": "敌方Boss召唤 敌方翠叶鼠(青铜) HP10/攻3，位置 R2C6。"
    }
  ]
}
```