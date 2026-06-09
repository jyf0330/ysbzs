# 真实浏览器玩家链路验证

- 时间：2026-06-09T15:53:05.574Z
- URL：http://127.0.0.1:4196
- 浏览器：/Applications/Google Chrome.app/Contents/MacOS/Google Chrome
- 验证方式：CDP `Input.dispatchMouseEvent` 发送真实鼠标事件，页面按钮/格子自己触发 DOM click 监听。
- 禁止事项：本脚本不调用 `/api/action` 改状态，不使用 fallback，不把 API 调用当作玩家操作。

## 通过的玩家操作
- 点击“备战”：#prep-open-btn @ (276, 129)
- 点击备战筛选框：#prep-filter @ (598, 264)
- 拖拽上阵宠物到备战席：.prep-card[data-prep-active="1"] -> [data-prep-drop-zone="bench"] @ (788, 347)
- 拖拽备战宠物回到上阵阵容：.prep-card[data-prep-active="0"] -> [data-prep-drop-zone="active"] @ (492, 369)
- 点击“准备开始”：#prep-ready-btn @ (893, 264)
- 点击棋盘上的英雄棋子：#board .cell.hero-cell @ (524, 388)
- 点击左侧英雄卡片：.hero-card .hero-select @ (163, 186)
- 点击棋盘空格移动英雄：#board .cell[data-r="6"][data-c="3"] @ (626, 439)
- 点击左下行动块：#slot-list [data-slot="0"] @ (69, 405)
- 点击右侧行动槽 AP 分配 1 点：#slot-action-panel [data-ap-choice="1"] @ (1000, 371)
- 点击方向箭头：左：#slot-action-panel [data-slot-dir="0"][data-dir="left"] @ (1001, 386)
- 点击方向箭头：右：#slot-action-panel [data-slot-dir="0"][data-dir="right"] @ (1069, 386)
- 点击目标格：#board .cell[data-r="6"][data-c="4"] @ (677, 439)
- 点击“释放”：#slot-action-panel [data-use="0"] @ (1184, 386)
- 点击“保存”：#save-game-btn @ (865, 137)
- 点击“新开一天”验证读取前状态会重置：#new-game-btn @ (726, 137)
- 点击“读取”恢复刚才存档：#load-game-btn @ (921, 134)
- 点击“结束回合”：#etb @ (1045, 445)
- 点击“怪物行动”：#monster-btn @ (1187, 445)
- 点击“战报”标签：[data-log-tab="report"] @ (376, 627)
- 点击“回放”标签：[data-log-tab="replay"] @ (376, 662)
- 回放下一步：[data-replay-next] @ (657, 601)
- 按 Ctrl+` 打开调试面板：keyboard:Ctrl+Backquote @ (0, 0)
- 关闭调试面板：[data-debug-close] @ (1247, 400)
- 新开一天准备验证“我方全部出击”：#new-game-btn @ (726, 137)
- 开始战斗准备“我方全部出击”：#etb @ (1045, 445)
- 点击“我方全部出击”：#all-out-btn @ (1116, 486)
- 切回事件标签查看最新日志：[data-log-tab="events"] @ (376, 592)

## 截图
- screenshots/01_loaded.png：页面真实加载；全屏按钮、棋盘、英雄列表、行动槽都已由浏览器渲染。
- screenshots/02_prep_overlay_opened.png：备战台覆盖主战斗区，表达当前不是开战状态。
- screenshots/03_prep_filter_fire.png：备战台可以按元素、名称或职能筛选。
- screenshots/04_prep_drag_restored.png：拖拽上阵/下阵走真实浏览器事件并通过 API 更新阵容。
- screenshots/05_start_battle_player_turn.png：准备开始后进入玩家回合，备战入口锁定。
- screenshots/06_board_hero_selected.png：点击棋盘英雄也能选中单位，允许随后点空格移动。
- screenshots/07_hero_selected.png：英雄卡片出现选中态，棋盘可移动格出现提示。
- screenshots/08_hero_moved_by_cell_click.png：英雄通过点棋盘空格移动到新位置。
- screenshots/09_slot_selected_armed.png：左侧行动块进入瞄准态，右侧详细信息显示方向与施放。
- screenshots/10_inline_ap_allocation.png：行动槽 AP 分配位于右侧当前行动槽面板，不再压在棋盘上。
- screenshots/11_slot_direction_left.png：方向调整通过按钮进入核心状态。
- screenshots/12_target_cell_selected.png：选中目标格，右侧详细信息同步更新。
- screenshots/13_slot_used_event_log.png：施放后事件日志出现行动槽事件，棋盘出现元素/预览反馈。
- screenshots/14_save_game_written.png：真实点击保存按钮后，本地存档写入 localStorage。
- screenshots/15_load_game_restored.png：读取按钮恢复保存后的战斗状态、事件流和棋盘反馈。
- screenshots/16_player_turn_ended.png：结束玩家回合，事件日志记录 PLAYER_TURN_END。
- screenshots/17_monster_action_clicked.png：怪物行动通过按钮推进。
- screenshots/18_battle_report_tab.png：战报标签通过前端读取 report 并显示文本。
- screenshots/19_battle_replay_tab.png：回放标签显示事件列表、步骤计数和 JSON 导出输入框。
- screenshots/20_debug_panel_opened.png：Ctrl+` 打开可拖拽调试面板并显示当前 ViewModel 摘要。
- screenshots/21_all_out_flow.png：我方全部出击按左侧行动块顺序走核心行动槽流程。

## 视频
- 未生成：--check mode

## 最终状态摘要
```json
{
  "phase": "player_turn",
  "day": 1,
  "round": 1,
  "selected": {
    "unitId": "hero_pal_038_4",
    "slotId": 2,
    "cell": null,
    "direction": "right"
  },
  "heroCount": 4,
  "enemyCount": 2,
  "eventCount": 30,
  "roster": {
    "active": 4,
    "bench": 0,
    "maxActive": 4
  },
  "replayEventsInPanel": 0,
  "lastEvents": [
    {
      "step": 56,
      "type": "APPLY_ELEMENT",
      "text": "我方疾风隼 给 敌方翠叶鼠 叠风1层，风层 1→2。"
    },
    {
      "step": 57,
      "type": "PLAYER_SELECT_SLOT",
      "text": "我方疾风隼 施放第2槽：长柄T/风/1层（AP1）。\n本次影响10格：\n1）第6行第4列：空格，火0/水0/风0，受到3点威胁\n2）第6行第5列：空格，火0/水0/风0，受到3点威胁\n3）第6行第6列：空格，火0/水0/风0，有威胁\n4）第6行第7列：敌方翠叶鼠 HP10/10，风2，无威胁"
    },
    {
      "step": 58,
      "type": "ELEMENT_WEAKEN",
      "text": "我方疾风隼打散 R5C6 未成型元素：所有元素-1。"
    },
    {
      "step": 59,
      "type": "APPLY_ELEMENT_CELL",
      "text": "我方疾风隼 向 R5C6 施加风1层，风层 1→3。"
    },
    {
      "step": 60,
      "type": "TERRAIN_MODULE_ADD",
      "text": "R5C6 生成风地形模块 3层。"
    },
    {
      "step": 61,
      "type": "ELEMENT_FORMED",
      "text": "R5C6 风3层达到3层，形成元素成型状态；元素包与来源保留。"
    },
    {
      "step": 62,
      "type": "APPLY_ELEMENT",
      "text": "我方疾风隼 给 敌方翠叶鼠 叠风1层，风层 2→3。"
    },
    {
      "step": 63,
      "type": "PLAYER_SELECT_SLOT",
      "text": "我方疾风隼 施放第3槽：长柄T/风/1层（AP1）。\n本次影响10格：\n1）第6行第4列：空格，火0/水0/风0，受到3点威胁\n2）第6行第5列：空格，火0/水0/风0，受到3点威胁\n3）第6行第6列：空格，火0/水0/风0，有威胁\n4）第6行第7列：敌方翠叶鼠 HP10/10，风3，无威胁"
    }
  ]
}
```