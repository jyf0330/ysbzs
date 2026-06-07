# UI 适配层从这里开始

这版新增单一 UI 门面：

```text
src/uiAdapter.cjs
```

UI 只允许通过它展示和操作游戏。核心层不接 UI、不接 DOM。

## 一次运行

```bash
npm run check:all
npm run ui:demo
```

## UI 应调用的入口

```js
const { createYSBZSUIAdapter } = require('./src/uiAdapter.cjs');
const game = createYSBZSUIAdapter({ day: 1, period: '上午', gold: 8 });

game.getViewModel();
game.runBattle();
game.rewardOptions('reward_pT1', 3);
game.pickReward(0);
game.enterShop('night_base', 6);
game.rollShop({ slots: 6 });
game.freezeOffer(offerId);
game.unfreezeOffer(offerId);
game.buyOffer(offerId);
game.applyShopEvent(eventId);
game.exitShop();
game.getTextReport('player');
```

## 验收口径

- 战斗、奖励、商店、刷新、冻结、购买、商店事件、离店全部可由适配层触发。
- UI 数据从 `getViewModel()` 读取。
- UI 日志从 `run(...)` 返回的 `events` 或 `getTextReport()` 读取。
- UI 不直接 import core 文件。
