export const DIR = Object.freeze({ up: '↑', down: '↓', left: '←', right: '→' });

export const EL_CLASS = Object.freeze({
  '火': 'el-fire',
  '水': 'el-water',
  '风': 'el-wind',
  '土': 'el-earth'
});

export const EL_ICON = Object.freeze({ '火': '火', '水': '水', '风': '风', '土': '土' });

export const PHASE_TEXT = Object.freeze({
  init: '准备',
  player_turn: '玩家回合',
  monster_turn: '怪物行动',
  round_end: '回合结算',
  battle_end: '战斗结束',
  shop: '商店',
  day_end: '当天结束',
  loading: '加载中'
});

export const TIP_TEXT = Object.freeze({
  '火': '火：叠层达到阈值会引爆并造成爆发伤害。水可催化火，让本次火层提高。',
  '水': '水：可作为催化层，参与火/风等元素反应。',
  '风': '风：偏向扩散、转化和位移相关机制。',
  '土': '土：兼容元素，偏向防御、地形和阻挡。',
  preview: '行动预览：根据当前选中英雄、行动槽、方向和目标格计算。',
  threat: '敌方威胁：怪物下一步可能攻击或移动影响范围。'
});
