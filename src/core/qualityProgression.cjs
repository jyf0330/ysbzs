// @ts-check

/**
 * qualityProgression.cjs — 纸上西游品质成长系统
 *
 * 青铜：基础数值 + 3 个行动形状
 * 白银：小幅数值成长 + 1 个白银 Buff
 * 黄金：中幅数值成长 + 1 个黄金升级
 * 钻石：高幅数值成长 + 1 个钻石质变
 *
 * 规则约束：
 * - 不使用百分比。
 * - 保留固定数值、翻倍、重复结算、必定暴击。
 * - 不增加第 4 个行动形状。
 * - 黄金以强化格 / 方向强化 / 简单双形态为主，少量手动选格。
 * - 钻石以形状质变 / 结算质变 / 棋盘留痕为主。
 */

const QUALITY_ALIASES = Object.freeze({
  bronze: 'bronze',
  silver: 'silver',
  gold: 'gold',
  diamond: 'diamond',
  青铜: 'bronze',
  白银: 'silver',
  黄金: 'gold',
  钻石: 'diamond'
});

const QUALITY_LABELS = Object.freeze({
  bronze: '青铜',
  silver: '白银',
  gold: '黄金',
  diamond: '钻石'
});

const QUALITY_GROWTH_RULES = Object.freeze({
  bronze: {
    quality: 'bronze',
    label: '青铜',
    statBonusByShapeSize: {
      1: { hpBonus: 0, attackBonus: 0 },
      2: { hpBonus: 0, attackBonus: 0 },
      3: { hpBonus: 0, attackBonus: 0 }
    },
    mechanic: '基础',
    description: '只有基础生命、攻击和 3 个行动形状。'
  },
  silver: {
    quality: 'silver',
    label: '白银',
    statBonusByShapeSize: {
      1: { hpBonus: 4, attackBonus: 1 },
      2: { hpBonus: 5, attackBonus: 1 },
      3: { hpBonus: 6, attackBonus: 1 }
    },
    mechanic: '白银 Buff',
    description: '获得小幅数值成长，并获得 1 个自动触发的白银 Buff。'
  },
  gold: {
    quality: 'gold',
    label: '黄金',
    statBonusByShapeSize: {
      1: { hpBonus: 8, attackBonus: 2 },
      2: { hpBonus: 10, attackBonus: 2 },
      3: { hpBonus: 12, attackBonus: 2 }
    },
    mechanic: '黄金升级',
    description: '获得中幅数值成长，并获得 1 个黄金升级。黄金升级主要围绕形状强化。'
  },
  diamond: {
    quality: 'diamond',
    label: '钻石',
    statBonusByShapeSize: {
      1: { hpBonus: 12, attackBonus: 3 },
      2: { hpBonus: 15, attackBonus: 3 },
      3: { hpBonus: 18, attackBonus: 3 }
    },
    mechanic: '钻石质变',
    description: '获得高幅数值成长，并获得 1 个钻石质变。钻石主要改变形状、结算或棋盘。'
  }
});

const SILVER_BUFFS = Object.freeze([
  { id: 'S01', name: '护体', quality: 'silver', category: 'passive', operationLevel: 'none', allowedShapeSizes: [1, 2, 3], effect: '回合开始时，获得 15 点护盾。' },
  { id: 'S02', name: '自愈', quality: 'silver', category: 'passive', operationLevel: 'none', allowedShapeSizes: [1, 2, 3], effect: '回合开始时，恢复自身 20 点生命值。' },
  { id: 'S03', name: '壮体', quality: 'silver', category: 'passive', operationLevel: 'none', allowedShapeSizes: [1, 2, 3], effect: '回合开始时，最大生命值翻倍，但最大生命值最多不超过 30。' },
  { id: 'S04', name: '元素回响', quality: 'silver', category: 'passive', operationLevel: 'none', allowedShapeSizes: [1, 2, 3], effect: '造成元素伤害时，该元素伤害重复结算 1 次。' },
  { id: 'S05', name: '收尾暴击', quality: 'silver', category: 'passive', operationLevel: 'none', allowedShapeSizes: [2, 3], effect: '本次行动的最后一击必定暴击。', designNote: '更适合二格、三格、多段结算角色。' },
  { id: 'S06', name: '连击倍增', quality: 'silver', category: 'passive', operationLevel: 'none', allowedShapeSizes: [2, 3], effect: '第一击伤害减半，之后每一击都是前一击的 2 倍。' },
  { id: 'S07', name: '越战越勇', quality: 'silver', category: 'passive', operationLevel: 'none', allowedShapeSizes: [1, 2, 3], effect: '每击杀 5 个怪，永久 +1 攻击力。' },
  { id: 'S08', name: '本命爆发', quality: 'silver', category: 'passive', operationLevel: 'none', allowedShapeSizes: [1, 2, 3], effect: '如果自身携带和自己相同的元素，元素爆发翻倍。' }
]);

const GOLD_UPGRADES = Object.freeze([
  { id: 'G01', name: '攻守切换', quality: 'gold', category: 'dualMode', operationLevel: 'low', allowedShapeSizes: [1, 2, 3], effect: '每回合可在攻/守之间切换。攻形态伤害 +2；守形态回合开始获得 8 护盾。' },
  { id: 'G02', name: '稳爆切换', quality: 'gold', category: 'dualMode', operationLevel: 'low', allowedShapeSizes: [1, 2, 3], effect: '可在稳定/爆发之间切换。稳定形态攻击 +1；爆发形态本回合第一次命中伤害 +4。' },
  { id: 'G03', name: '金色核心格', quality: 'gold', category: 'empoweredCell', operationLevel: 'none', allowedShapeSizes: [1, 2, 3], effect: '每个行动形状中有 1 个金色核心格，核心格命中敌人时伤害 +3。' },
  { id: 'G04', name: '守护核心格', quality: 'gold', category: 'empoweredCell', operationLevel: 'none', allowedShapeSizes: [1, 2, 3], effect: '核心格覆盖友方时，该友方获得 8 护盾。' },
  { id: 'G05', name: '回春核心格', quality: 'gold', category: 'empoweredCell', operationLevel: 'none', allowedShapeSizes: [1, 2, 3], effect: '核心格覆盖友方时，恢复 6 生命。' },
  { id: 'G06', name: '破敌核心格', quality: 'gold', category: 'empoweredCell', operationLevel: 'none', allowedShapeSizes: [1, 2, 3], effect: '核心格命中敌人时，额外造成 2 点破甲伤害。' },
  { id: 'G07', name: '正向强化', quality: 'gold', category: 'directionBonus', operationLevel: 'none', allowedShapeSizes: [1, 2, 3], effect: '形状朝向正前方的最远格伤害 +3。' },
  { id: 'G08', name: '背向守势', quality: 'gold', category: 'directionBonus', operationLevel: 'none', allowedShapeSizes: [1, 2, 3], effect: '形状背后的格子若覆盖友方，该友方获得 10 护盾。' },
  { id: 'G09', name: '左右借势', quality: 'gold', category: 'directionBonus', operationLevel: 'none', allowedShapeSizes: [2, 3], effect: '形状左右两侧格命中敌人时，各额外造成 1 点伤害。' },
  { id: 'G10', name: '终点重击', quality: 'gold', category: 'empoweredCell', operationLevel: 'none', allowedShapeSizes: [1, 2, 3], effect: '形状最远端格子命中敌人时，伤害 +4。' },
  { id: 'G11', name: '单挑', quality: 'gold', category: 'empoweredCell', operationLevel: 'none', allowedShapeSizes: [1], effect: '如果本次形状只命中 1 个敌人，伤害 +5。' },
  { id: 'G12', name: '点穴', quality: 'gold', category: 'empoweredCell', operationLevel: 'none', allowedShapeSizes: [1], effect: '命中敌人后，使该敌人下次受到伤害 +3。' },
  { id: 'G13', name: '隔山打牛', quality: 'gold', category: 'directionBonus', operationLevel: 'none', allowedShapeSizes: [1], effect: '隔点形状命中时，伤害 +4。' },
  { id: 'G14', name: '破绽一击', quality: 'gold', category: 'dualMode', operationLevel: 'low', allowedShapeSizes: [1], effect: '可切换稳击/重击。稳击伤害 +2；重击伤害 +6，但本回合只能结算这一个形状格。' },
  { id: 'G15', name: '斩首', quality: 'gold', category: 'empoweredCell', operationLevel: 'none', allowedShapeSizes: [1], effect: '如果目标生命值不高于 8，额外造成 8 点伤害。' },
  { id: 'G16', name: '追魂点', quality: 'gold', category: 'empoweredCell', operationLevel: 'none', allowedShapeSizes: [1], effect: '若该格击杀敌人，对最近敌人追加 3 点伤害。' },
  { id: 'G17', name: '精准印记', quality: 'gold', category: 'manualMark', operationLevel: 'medium', allowedShapeSizes: [1], effect: '每回合可选择自己 1 个作用格，使其获得印记。该格本回合伤害 +5。', designNote: '手动选格，数量要少。只给一格英雄比较安全。' },
  { id: 'G18', name: '双点连击', quality: 'gold', category: 'empoweredCell', operationLevel: 'none', allowedShapeSizes: [2], effect: '如果两个作用格都命中敌人，第二个命中的敌人伤害 +4。' },
  { id: 'G19', name: '前后夹击', quality: 'gold', category: 'directionBonus', operationLevel: 'none', allowedShapeSizes: [2], effect: '前后两个格子都命中敌人时，两个敌人各额外受到 2 点伤害。' },
  { id: 'G20', name: '对角穿心', quality: 'gold', category: 'directionBonus', operationLevel: 'none', allowedShapeSizes: [2], effect: '对角两格命中时，较远的目标伤害 +4。' },
  { id: 'G21', name: '一攻一守', quality: 'gold', category: 'dualMode', operationLevel: 'low', allowedShapeSizes: [2], effect: '两格中靠前格伤害 +2；靠后格若覆盖友方，则该友方获得 8 护盾。' },
  { id: 'G22', name: '双印择一', quality: 'gold', category: 'manualMark', operationLevel: 'medium', allowedShapeSizes: [2], effect: '每回合可在两个作用格中选择 1 格加金印。命中敌人伤害 +4；覆盖友方护盾 +8。', designNote: '二格英雄可少量使用，不能泛滥。' },
  { id: 'G23', name: '连环标记', quality: 'gold', category: 'empoweredCell', operationLevel: 'none', allowedShapeSizes: [2], effect: '第一个命中的敌人被标记，第二个命中的敌人伤害 +3。' },
  { id: 'G24', name: '双锋', quality: 'gold', category: 'dualMode', operationLevel: 'low', allowedShapeSizes: [2], effect: '可切换同伤/主副。同伤为两个格子各 +1 伤害；主副为第一个格子 +4，第二个格子不加成。' },
  { id: 'G25', name: '三格核心', quality: 'gold', category: 'empoweredCell', operationLevel: 'none', allowedShapeSizes: [3], effect: '三格形状中固定 1 个核心格，核心格伤害 +3。' },
  { id: 'G26', name: '横扫压制', quality: 'gold', category: 'empoweredCell', operationLevel: 'none', allowedShapeSizes: [3], effect: '横扫三格命中 2 个以上敌人时，每个敌人额外受到 1 点伤害。' },
  { id: 'G27', name: '竖线贯通', quality: 'gold', category: 'directionBonus', operationLevel: 'none', allowedShapeSizes: [3], effect: '直线三格从近到远结算，第三格伤害 +3。' },
  { id: 'G28', name: '三点成阵', quality: 'gold', category: 'empoweredCell', operationLevel: 'none', allowedShapeSizes: [3], effect: '三个作用格都覆盖到单位时，敌人受伤 +2，友方获得 5 护盾。' },
  { id: 'G29', name: '首尾呼应', quality: 'gold', category: 'directionBonus', operationLevel: 'none', allowedShapeSizes: [3], effect: '形状第一格和最远格同时命中时，最远格伤害 +4。' },
  { id: 'G30', name: '三选一金印', quality: 'gold', category: 'manualMark', operationLevel: 'medium', allowedShapeSizes: [3], effect: '每回合可从三个作用格中选 1 个加金印。该格伤害 +3。', designNote: '三格本身覆盖大，所以手动强化数值要比一格、二格低。' }
]);

const DIAMOND_MUTATIONS = Object.freeze([
  { id: 'D01', name: '末端延伸', quality: 'diamond', category: 'shapeMutation', operationLevel: 'none', allowedShapeSizes: [1, 2, 3], effect: '形状最远端额外延伸 1 格。' },
  { id: 'D02', name: '起点回扫', quality: 'diamond', category: 'shapeMutation', operationLevel: 'none', allowedShapeSizes: [2, 3], effect: '形状结算后，反方向再结算 1 次，反向伤害 -2。' },
  { id: 'D03', name: '镜像形状', quality: 'diamond', category: 'shapeMutation', operationLevel: 'none', allowedShapeSizes: [1, 2], effect: '当前形状会向相反方向复制 1 次。', designNote: '不建议给三格，容易爆表。' },
  { id: 'D04', name: '斜向复制', quality: 'diamond', category: 'shapeMutation', operationLevel: 'none', allowedShapeSizes: [1, 2], effect: '当前形状命中后，在斜向相邻位置额外生成 1 个作用格。' },
  { id: 'D05', name: '核心扩散', quality: 'diamond', category: 'shapeMutation', operationLevel: 'none', allowedShapeSizes: [1], effect: '命中目标后，对目标上下左右各造成 1 点溅射伤害。' },
  { id: 'D06', name: '双端开花', quality: 'diamond', category: 'shapeMutation', operationLevel: 'none', allowedShapeSizes: [2], effect: '两个作用格的外侧各额外延伸 1 格，但额外格伤害 -2。' },
  { id: 'D07', name: '三格收束', quality: 'diamond', category: 'shapeMutation', operationLevel: 'none', allowedShapeSizes: [3], effect: '三格形状如果只命中 1 个敌人，该敌人额外受到 6 点伤害。' },
  { id: 'D08', name: '三格外放', quality: 'diamond', category: 'shapeMutation', operationLevel: 'none', allowedShapeSizes: [3], effect: '三格形状命中 2 个以上敌人时，额外对每个目标造成 2 点伤害。' },
  { id: 'D09', name: '角形补点', quality: 'diamond', category: 'shapeMutation', operationLevel: 'none', allowedShapeSizes: [3], effect: 'L 型三格的缺角位置额外生成 1 个作用格，伤害 -2。' },
  { id: 'D10', name: '直线贯穿', quality: 'diamond', category: 'shapeMutation', operationLevel: 'none', allowedShapeSizes: [3], effect: '直线形状末端再贯穿 1 格，额外格伤害 -1。' },
  { id: 'D11', name: '抢先结算', quality: 'diamond', category: 'settlementMutation', operationLevel: 'none', allowedShapeSizes: [1, 2, 3], effect: '该角色总是最先结算。' },
  { id: 'D12', name: '压轴结算', quality: 'diamond', category: 'settlementMutation', operationLevel: 'none', allowedShapeSizes: [1, 2, 3], effect: '该角色总是最后结算，最后一击伤害 +5。' },
  { id: 'D13', name: '残血追击', quality: 'diamond', category: 'settlementMutation', operationLevel: 'none', allowedShapeSizes: [1, 2, 3], effect: '若本次结算后有敌人生命不高于 5，对其追加 5 点伤害。' },
  { id: 'D14', name: '击杀连锁', quality: 'diamond', category: 'settlementMutation', operationLevel: 'none', allowedShapeSizes: [1, 2], effect: '击杀敌人后，对最近敌人追加 4 点伤害。' },
  { id: 'D15', name: '破阵启动', quality: 'diamond', category: 'settlementMutation', operationLevel: 'none', allowedShapeSizes: [3], effect: '若本次命中 3 个单位，立即额外结算一次核心格。' },
  { id: 'D16', name: '反复敲打', quality: 'diamond', category: 'settlementMutation', operationLevel: 'none', allowedShapeSizes: [1], effect: '如果只命中 1 个敌人，同一格重复结算 1 次。' },
  { id: 'D17', name: '二段行动', quality: 'diamond', category: 'settlementMutation', operationLevel: 'none', allowedShapeSizes: [1, 2, 3], effect: '本角色先结算一半伤害，所有友方结算后再结算剩余伤害。', designNote: '有一定理解成本，建议少量使用。' },
  { id: 'D18', name: '元素先爆', quality: 'diamond', category: 'settlementMutation', operationLevel: 'none', allowedShapeSizes: [1, 2, 3], effect: '如果本次触发元素爆发，该元素爆发提前到本角色普通伤害前结算。' },
  { id: 'D19', name: '收割顺序', quality: 'diamond', category: 'settlementMutation', operationLevel: 'none', allowedShapeSizes: [1, 2, 3], effect: '结算时优先攻击生命最低的目标。', designNote: '会改变默认结算逻辑，建议只给少数角色。' },
  { id: 'D20', name: '反向结算', quality: 'diamond', category: 'settlementMutation', operationLevel: 'none', allowedShapeSizes: [2, 3], effect: '形状从最远格开始结算，而不是从近格开始结算。' },
  { id: 'D21', name: '火痕', quality: 'diamond', category: 'boardTrace', operationLevel: 'none', allowedShapeSizes: [1, 2, 3], effect: '形状覆盖过的空格留下火痕 1 回合，敌人站上受到 3 点火伤害。' },
  { id: 'D22', name: '水痕', quality: 'diamond', category: 'boardTrace', operationLevel: 'none', allowedShapeSizes: [1, 2, 3], effect: '覆盖格留下水痕 1 回合，友方站上恢复 5 生命。' },
  { id: 'D23', name: '风痕', quality: 'diamond', category: 'boardTrace', operationLevel: 'none', allowedShapeSizes: [1, 2, 3], effect: '覆盖格留下风痕 1 回合，友方站上时下次伤害 +2。' },
  { id: 'D24', name: '土痕', quality: 'diamond', category: 'boardTrace', operationLevel: 'none', allowedShapeSizes: [1, 2, 3], effect: '覆盖格留下土痕 1 回合，友方站上获得 8 护盾。' },
  { id: 'D25', name: '金痕', quality: 'diamond', category: 'boardTrace', operationLevel: 'none', allowedShapeSizes: [1, 2, 3], effect: '覆盖格留下金痕 1 回合，下一次命中该格敌人的攻击伤害 +2。' },
  { id: 'D26', name: '木痕', quality: 'diamond', category: 'boardTrace', operationLevel: 'none', allowedShapeSizes: [1, 2, 3], effect: '覆盖格留下木痕 1 回合，回合开始时恢复站在上面的友方 4 生命。' },
  { id: 'D27', name: '佛光', quality: 'diamond', category: 'boardTrace', operationLevel: 'none', allowedShapeSizes: [1, 2, 3], effect: '覆盖格留下佛光 1 回合，友方站上恢复 6 生命，敌人站上无效果。' },
  { id: 'D28', name: '流沙', quality: 'diamond', category: 'boardTrace', operationLevel: 'none', allowedShapeSizes: [1, 2, 3], effect: '覆盖格留下流沙 1 回合，敌人站上受到 2 点伤害，并使其下次受伤 +2。' },
  { id: 'D29', name: '妖印', quality: 'diamond', category: 'boardTrace', operationLevel: 'none', allowedShapeSizes: [1, 2, 3], effect: '覆盖格留下妖印 1 回合，敌人站上后被标记，下次受到伤害 +4。' },
  { id: 'D30', name: '纸符', quality: 'diamond', category: 'boardTrace', operationLevel: 'none', allowedShapeSizes: [1, 2, 3], effect: '核心格留下纸符 1 回合，下一次经过该格的作用形状额外结算 1 次。', designNote: '最有纸上西游特色，但强度较高，建议稀有。' }
]);

const ALL_QUALITY_UPGRADES = Object.freeze([
  ...SILVER_BUFFS,
  ...GOLD_UPGRADES,
  ...DIAMOND_MUTATIONS
]);

function normalizeQuality(quality) {
  return QUALITY_ALIASES[String(quality || '').trim()] || 'bronze';
}

function qualityLabel(quality) {
  return QUALITY_LABELS[normalizeQuality(quality)];
}

function shapeSizeFromBodySize(bodySize) {
  const text = String(bodySize || '').trim();
  if (/小|small|一格|1/.test(text)) return 1;
  if (/大|large|三格|3/.test(text)) return 3;
  return 2;
}

function normalizeShapeSize(value, fallback = 2) {
  const n = Number(value);
  if (Number.isFinite(n) && n > 0) return Math.max(1, Math.min(3, Math.round(n)));
  return fallback;
}

function shapeSizeFromUnit(unit) {
  const byBodySize = shapeSizeFromBodySize(unit?.bodySize || unit?.size || unit?.体型);
  const hitCells = Number(unit?.shape?.hitCells || unit?.hitCells || 0);
  if (Number.isFinite(hitCells) && hitCells >= 1 && hitCells <= 3) return normalizeShapeSize(hitCells, byBodySize);
  return byBodySize;
}

function getQualityStatBonus(quality, shapeSize) {
  const normalizedQuality = normalizeQuality(quality);
  const size = normalizeShapeSize(shapeSize);
  return QUALITY_GROWTH_RULES[normalizedQuality].statBonusByShapeSize[size] || { hpBonus: 0, attackBonus: 0 };
}

function getQualityUpgradePool(quality, shapeSize) {
  const q = normalizeQuality(quality);
  const size = normalizeShapeSize(shapeSize);
  if (q === 'silver') return SILVER_BUFFS.filter(x => x.allowedShapeSizes.includes(size));
  if (q === 'gold') return GOLD_UPGRADES.filter(x => x.allowedShapeSizes.includes(size));
  if (q === 'diamond') return DIAMOND_MUTATIONS.filter(x => x.allowedShapeSizes.includes(size));
  return [];
}

function hashString(text) {
  let h = 2166136261;
  const s = String(text || '');
  for (let i = 0; i < s.length; i += 1) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function pickDeterministicUpgrade(quality, shapeSize, seed) {
  const pool = getQualityUpgradePool(quality, shapeSize);
  if (!pool.length) return null;
  const index = hashString(`${normalizeQuality(quality)}:${shapeSize}:${seed || ''}`) % pool.length;
  return pool[index] || null;
}

function findQualityUpgrade(id) {
  if (!id) return null;
  return ALL_QUALITY_UPGRADES.find(x => x.id === id) || null;
}

function applyQualityStatsToNumbers(base, quality, shapeSize) {
  const bonus = getQualityStatBonus(quality, shapeSize);
  return {
    hp: Number(base.hp || 0) + bonus.hpBonus,
    maxHp: Number(base.maxHp ?? base.hp ?? 0) + bonus.hpBonus,
    atk: Number(base.atk ?? base.attack ?? 0) + bonus.attackBonus,
    bonus
  };
}

function applyQualityProgressionToUnit(unit, options = {}) {
  if (!unit || options.enabled === false) return unit;
  if (unit.flags && unit.flags.qualityProgressionApplied) return unit;

  const quality = normalizeQuality(unit.quality);
  const shapeSize = normalizeShapeSize(options.shapeSize, shapeSizeFromUnit(unit));
  const bonus = getQualityStatBonus(quality, shapeSize);
  const upgrade = options.upgradeId
    ? findQualityUpgrade(options.upgradeId)
    : pickDeterministicUpgrade(quality, shapeSize, options.seed || unit.petId || unit.id || unit.name);

  unit.maxHp = Number(unit.maxHp || unit.hp || 0) + bonus.hpBonus;
  unit.hp = Number(unit.hp || 0) + bonus.hpBonus;
  unit.atk = Number(unit.atk || 0) + bonus.attackBonus;
  unit.quality = qualityLabel(quality);
  unit.qualityUpgrade = upgrade;
  unit.qualityProgression = {
    quality,
    label: qualityLabel(quality),
    shapeSize,
    statBonus: bonus,
    upgradeId: upgrade ? upgrade.id : null,
    upgradeName: upgrade ? upgrade.name : null,
    upgradeCategory: upgrade ? upgrade.category : null,
    upgradeEffect: upgrade ? upgrade.effect : null
  };
  unit.flags = Object.assign({}, unit.flags || {}, { qualityProgressionApplied: true });
  return unit;
}

module.exports = {
  QUALITY_GROWTH_RULES,
  SILVER_BUFFS,
  GOLD_UPGRADES,
  DIAMOND_MUTATIONS,
  ALL_QUALITY_UPGRADES,
  normalizeQuality,
  qualityLabel,
  shapeSizeFromBodySize,
  shapeSizeFromUnit,
  getQualityStatBonus,
  getQualityUpgradePool,
  pickDeterministicUpgrade,
  findQualityUpgrade,
  applyQualityStatsToNumbers,
  applyQualityProgressionToUnit
};
