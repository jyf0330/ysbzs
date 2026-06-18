# 纸上西游 · 实际数据描线界面 v3

这版把“参考图描线布局”接入到项目真实 UI Server：

- 页面：`web/paper-battle.html`
- 样式：`web/paper-battle.css`
- 数据/操作：`web/paper-battle.js`
- 参考底图：`web/assets/reference_trace_base.jpeg`
- 验证脚本：`tools/check_paper_battle_ui.cjs`

## 运行

```bash
npm run ui
# 打开：
# http://127.0.0.1:4173/paper-battle.html
```

## 已接入的真实接口

页面不再依赖静态 `ViewModel`。进入页面后会调用：

- `GET /api/view`
- `POST /api/session/new`
- `POST /api/action SETUP_DAY7_FIRE_TRIAL`
- `POST /api/action SELECT_UNIT`
- `POST /api/action SELECT_SLOT`
- `POST /api/action SELECT_CELL`
- `POST /api/action SET_ACTION_DIRECTION`
- `POST /api/action MOVE_HERO`
- `POST /api/action USE_SLOT`
- `POST /api/action END_PLAYER_TURN`
- `POST /api/action RUN_MONSTER_TURN`
- `POST /api/action RUN_PLAYER_ALL_OUT`
- `POST /api/action RUN_DAY7_FIRE_TRIAL_ALL`

## 操作

- 点左侧角色：真实 `SELECT_UNIT`
- 点 12 个作用形状：真实 `SELECT_SLOT`
- 点棋盘空格：真实 `SELECT_CELL`
- 右侧方向按钮：真实 `SET_ACTION_DIRECTION`
- 右侧“移动到选中格”：真实 `MOVE_HERO`
- 右侧“施放当前形状”：真实 `USE_SLOT`
- 右下“开始行动”：根据阶段调用真实 `START_BATTLE / RUN_PLAYER_ALL_OUT / RUN_MONSTER_TURN / START_NEXT_ROUND`
- 顶部“新试炼”：新建 session 并真实初始化第7天试炼

## 验证

```bash
node tools/check_paper_battle_ui.cjs
```

通过后会输出：

```text
PASS paper-battle.html -> live /api/view + /api/action flow
```

## 说明

这版重点是“布局按参考图描线 + 数据/操作走真实 API”。美术素材仍是 CSS/字符占位，后续可替换为 PNG、Spine 或 Godot 资源。
