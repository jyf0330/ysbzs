# UI 单一适配层说明

本包新增 `src/uiAdapter.cjs`，它是 UI 唯一允许调用的新架构入口。

## 强规则

1. UI 不直接调用 `src/core/*`、`src/render/*`、`src/scenarios/*`。
2. UI 只调用 `src/uiAdapter.cjs`。
3. UI 展示只读 `adapter.getViewModel()`、`adapter.getTextReport()`、`adapter.run(...)` 返回的 `events`。
4. 玩家操作必须转成公开 Command：`START_BATTLE`、`MOVE_HERO`、`SELECT_CELL`、`SELECT_SLOT`、`SET_ACTION_DIRECTION`、`USE_SLOT`、`END_PLAYER_TURN`、`RUN_MONSTER_TURN`、`RUN_BATTLE`、`REWARD_OPTIONS`、`PICK_REWARD`、`ENTER_SHOP`、`ROLL_SHOP`、`FREEZE_OFFER`、`UNFREEZE_OFFER`、`BUY_OFFER`、`APPLY_SHOP_EVENT`、`EXIT_SHOP`。
5. 核心层继续保持无 DOM、无 window、无 renderBoard、无 refreshUI。

## 数据流

```text
UI 点击/按钮
  ↓
src/uiAdapter.cjs
  ↓
Command → Reducer → StateChange/EventLog
  ↓
ViewModel/TextReport
  ↓
UI 展示
```

## 已接功能

- 战斗：开始战斗、波次召唤、玩家移动、选槽、转向、施放、统一结算、怪物行动、战斗结果。
- Leader/Boss：`state.leaders.player` 和 `state.leaders.enemy` 进入棋盘、血量、元素结算和胜负判断；胜利真源是敌方Boss HP <= 0，失败真源包含我方英雄 HP <= 0 和10回合未击败Boss。
- 阵营规则：`factionRules.player/enemy` 控制移动、3/99层地形成型、3/99层引爆和敌方元素默认隐藏，不在 UI 里硬编码。
- 全队规划：`buildPlayerAutoPlan` 生成站位、方向、槽、命中格、命中单位/Boss、元素/地形候选，并用沙盒 beam 评分有效伤害、击杀、Boss伤害、地形成型、地形叠加、未成型削弱、溢出和站位冲突。
- 敌方 AI：枚举我方宠物和我方英雄目标、AP 可达站位和攻击方向，收益最高者执行；移动逐格触发地形模块，攻击后在核心保留敌方元素。
- 奖励：奖励候选、选择奖励、背包变化。
- 商店：进入商店、刷新、冻结、解冻、购买、金币不足拦截、商店事件、离开商店。
- 数据查询：9张表数量、商店池、奖励池、可用商品、可用商店事件。
- 输出：玩家流程报告、商店链路报告、事件列表、ViewModel。

## 兼容遗留

- `castleLine` 仍作为失败惩罚兼容字段保留，但不再是胜负真源。
- `web/battle.js`、`web/elements.js` 已壳化，只保留旧函数名，真实战斗/元素结算不在 web 层执行。
- `web/index.html` 的旧 DOM id 继续保留，展示数据来自 `ViewModel`。

## UI 示例

```js
const { createYSBZSUIAdapter } = require('./src/uiAdapter.cjs');
const game = createYSBZSUIAdapter({ day: 1, period: '上午', gold: 8 });

const vm0 = game.getViewModel();
const result = game.runBattle();
const vm1 = result.viewModel;
const text = game.getTextReport('player');
```

不要机械执行，结合当前项目真实代码、目录结构、已有规则和上下文，吸收有用部分，丢弃无用、过重、重复或不适配的部分，最终以项目实际情况和执行者判断为准。
