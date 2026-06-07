const fs = require('fs');
const path = require('path');
const { createYSBZSUIAdapter } = require('../src/uiAdapter.cjs');

const adapter = createYSBZSUIAdapter({ day: 1, period: '上午', gold: 8 });
adapter.runFullPlayerDayFlow();
const vm = adapter.getViewModel();
const report = adapter.getTextReport('player');
const shopReport = adapter.getTextReport('shop');
const behavior = [
  '《元素背包史》UI适配层玩家行为测试说明',
  '',
  '核心约束：UI 不直接 import core/battle、core/shop、core/reducer、render/textReport。UI 只 import src/uiAdapter.cjs。',
  'UI 只做三件事：读取 ViewModel、把玩家点击转成 adapter.run(command)、展示 adapter 返回的 events/textReport。',
  '',
  '【测试链路】',
  '1. 创建适配层：createYSBZSUIAdapter({ day:1, period:"上午", gold:8 })。',
  '2. UI 调 adapter.getViewModel() 展示开场：英雄、金币、阶段、可执行动作。',
  '3. 玩家点击“开始战斗”：UI 调 adapter.runBattle()。',
  '4. 适配层内部发 RUN_BATTLE，核心完成战斗，返回新增事件和 ViewModel。',
  '5. UI 展示战斗文字：敌方召唤、玩家选槽、叠元素、统一结算、怪物行动、胜负奖励。',
  '6. 玩家点击“生成奖励”：UI 调 adapter.rewardOptions("reward_pT1", 3)。',
  '7. 玩家点击第1个奖励：UI 调 adapter.pickReward(0)，背包变化从 ViewModel 展示。',
  '8. 玩家点击“进入商店”：UI 调 adapter.enterShop("night_base", 6)，展示商品、价格、冻结状态、商店事件。',
  '9. 玩家点击冻结第1个商品：UI 调 adapter.freezeOffer(offerId)，再次刷新时该商品保留。',
  '10. 玩家点击刷新：UI 调 adapter.rollShop({ slots:6 })，金币和商品列表变化。',
  '11. 玩家点击购买可负担商品：UI 调 adapter.buyOffer(offerId)，金币、背包、同名合成状态更新。',
  '12. 玩家点击商店事件：UI 调 adapter.applyShopEvent(eventId)，免费刷新/折扣/补货等奖励进入状态。',
  '13. 玩家点击离开商店：UI 调 adapter.exitShop()，当天流程结束。',
  '',
  '【验收点】',
  '- 所有 UI 数据来自 getViewModel()，不能读取核心 state 原对象。',
  '- 所有玩家操作都通过 adapter 的公开命令。',
  '- 每次操作都返回 events，UI 可直接追加文字日志。',
  '- 战斗、奖励、商店、刷新、冻结、购买、商店事件、离店全部接上。',
  '- src/core 仍无 DOM、无 window、无 renderBoard、无 refreshUI。',
  '',
  `【本次实际运行摘要】阶段=${vm.phase}，金币=${vm.gold}，事件数=${adapter.getEvents().length}，背包=${vm.inventory.length}，商店剩余=${vm.shop.offers.length}。`,
  '',
  '【普通文字输出摘录】',
  report.split('\n').slice(0, 80).join('\n')
].join('\n');

fs.writeFileSync(path.join(__dirname, '..', 'REPORT_SAMPLE_ui_adapter.txt'), report, 'utf8');
fs.writeFileSync(path.join(__dirname, '..', 'REPORT_SAMPLE_ui_adapter_shop.txt'), shopReport, 'utf8');
fs.writeFileSync(path.join(__dirname, '..', '玩家行为测试说明_UI适配层_20260607.txt'), behavior, 'utf8');

if (process.argv.includes('--check')) {
  if (!report.includes('SHOP_ENTER') && !report.includes('进入第')) throw new Error('ui adapter report missing shop flow');
  if (!vm.nextActions) throw new Error('viewModel missing nextActions');
  if (adapter.publicCommands.length < 10) throw new Error('public commands incomplete');
  console.log('PASS ui adapter demo check');
} else {
  console.log(behavior);
}
