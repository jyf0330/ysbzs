/**
 * unitFactory.cjs — 统一 Unit 创建工厂
 *
 * 合并 state.cjs:makeUnit / trialEngine.cjs:makeTrialUnit / day7FireTrial 旧 makeScenarioUnit
 * 所有场景统一走同一个工厂。
 */

const { makeEmptyElements, ACTIVE_ELEMENTS } = require('./elements.cjs');
const { buildIndexes } = require('./data.cjs');
const { applyQualityProgressionToUnit } = require('./qualityProgression.cjs');

function clone(v) { return JSON.parse(JSON.stringify(v)); }
function normalizePosition(pos, fallback) {
  if (!pos) return clone(fallback || { r: 0, c: 0 });
  if (pos.r !== undefined && pos.c !== undefined) return { r: Number(pos.r), c: Number(pos.c) };
  return clone(fallback || { r: 0, c: 0 });
}

/**
 * 创建通用单位
 *
 * @param {object} opts
 * @param {string} opts.id - 唯一 ID
 * @param {string} opts.petId - 宠物模板 ID
 * @param {string} opts.side - 'hero' | 'enemy'
 * @param {string} [opts.camp] - 'player' | 'enemy'（默认从 side 推断）
 * @param {string} opts.name - 显示名
 * @param {string} [opts.element] - 元素（null = 无元素，用于复制体）
 * @param {string} [opts.quality] - 品质
 * @param {string} [opts.bodySize] - 体型
 * @param {string} [opts.role] - 角色/定位
 * @param {number} opts.maxHp - 最大 HP
 * @param {number} [opts.hp] - 当前 HP（默认等于 maxHp）
 * @param {number} opts.atk - 攻击力
 * @param {number} [opts.def] - 防御
 * @param {number} [opts.shield] - 护盾
 * @param {number} opts.ap - 行动力
 * @param {string[]} [opts.mechanics] - 机制 ID 列表
 * @param {object} [opts.shape] - 攻击形状
 * @param {object} opts.position - {r, c} 棋盘位置
 * @param {object} [opts.flags] - 额外标记
 * @param {boolean} [opts.alive] - 存活状态
 * @param {boolean} [opts.applyQualityProgression] - 是否应用品质成长，默认开启
 * @param {string} [opts.qualityUpgradeId] - 指定品质升级 ID，不填则根据 petId 稳定抽取
 * @param {number} [opts.shapeSize] - 形状格数限制：1 / 2 / 3
 * @returns {object} unit 对象
 */
function createUnit(opts) {
  const side = opts.side || 'hero';
  const camp = opts.camp || (side === 'hero' ? 'player' : 'enemy');
  const hp = opts.hp !== undefined ? opts.hp : (opts.maxHp || 1);

  const unit = {
    id: opts.id,
    petId: opts.petId || opts.id,
    side,
    camp,
    name: opts.name,
    displayName: opts.displayName || `${side === 'hero' ? '我方' : '敌方'}${opts.name || ''}`,
    element: opts.element || null,        // null = 无元素（复制体）
    quality: opts.quality || '青铜',
    bodySize: opts.bodySize || '中型',
    role: opts.role || '单位',
    effectScore: opts.effectScore || 0,
    maxHp: opts.maxHp || hp,
    hp,
    atk: opts.atk || 0,
    def: opts.def || 0,
    shield: opts.shield || 0,
    maxShield: opts.maxShield ?? opts.shield ?? 0,
    ap: opts.ap || 3,
    moveRange: opts.moveRange ?? opts.moveAp ?? null,
    mechanics: (opts.mechanics && opts.mechanics.length ? opts.mechanics : ['none']).filter(Boolean),
    shape: opts.shape || null,
    position: normalizePosition(opts.position, { r: 0, c: 0 }),
    elements: makeEmptyElements(true),   // 兼容 4 元素
    elementPackets: [],
    alive: opts.alive !== false,
    flags: Object.assign({}, opts.flags || {}),
    roundDamageTaken: 0,
    actionSlotsUsed: {},
    hasAttacked: false
  };

  return applyQualityProgressionToUnit(unit, {
    enabled: opts.applyQualityProgression !== false,
    upgradeId: opts.qualityUpgradeId,
    shapeSize: opts.shapeSize,
    seed: opts.qualityUpgradeSeed || opts.petId || opts.id || opts.name
  });
}

/**
 * 从 CSV 宠物主表创建单位（标准路径）
 *
 * @param {object} state - 游戏状态（含 indexes）
 * @param {string} side - 'hero' | 'enemy'
 * @param {string} petId - 宠物 ID
 * @param {object} [override] - 覆盖字段
 * @returns {object} unit
 */
function makeUnitFromData(state, side, petId, override = {}) {
  const ix = state.indexes || buildIndexes(state.data);
  const pet = ix.petsById.get(petId);
  if (!pet) throw new Error(`unknown petId: ${petId}`);
  const shape = ix.shapesByPetId.get(petId);
  const monster = side === 'enemy' ? ix.monstersByPetId.get(petId) : null;
  const base = side === 'enemy' && monster ? monster : pet;
  const seq = state.nextUnit || 1;
  if (state.nextUnit !== undefined) state.nextUnit += 1;
  const id = override.id || `${side}_${petId}_${seq}`;
  const position = override.position || (side === 'enemy' ? { r: 5, c: 3 } : null);
  const boardRows = Number(state.board?.rows || 8);
  const boardCols = Number(state.board?.cols || 8);
  const boardMaxMove = Math.max(0, boardRows - 1) + Math.max(0, boardCols - 1);
  const configuredMoveRange = override.moveRange ?? override.moveAp ?? base.moveRange ?? pet.moveRange ?? base['移动范围'] ?? pet['移动范围'];

  return createUnit({
    id,
    petId,
    side,
    camp: side === 'hero' ? 'player' : 'enemy',
    name: base.name || pet.name,
    displayName: `${side === 'hero' ? '我方' : '敌方'}${base.name || pet.name}`,
    element: base.element || pet.element || null,
    quality: override.quality || base.quality || pet.quality,
    bodySize: override.bodySize || base.bodySize || base.size || pet.bodySize || pet.size || pet.体型 || '中型',
    role: override.role || base.enemyRole || base.role || pet.role || pet.定位,
    effectScore: override.effectScore ?? base.effectScore ?? base.panelScore ?? pet.score ?? 0,
    maxHp: override.hp || base.hp || pet.hp || 1,
    hp: override.hp || base.hp || pet.hp || 1,
    atk: override.atk || base.atk || pet.atk || 1,
    def: override.def ?? base.def ?? pet.def ?? 0,
    shield: override.shield ?? base.shield ?? pet.shield ?? 0,
    ap: override.ap || base.ap || pet.ap || 3,
    moveRange: configuredMoveRange ?? (side === 'hero' ? boardMaxMove : null),
    mechanics: override.mechanics || base.mechanics || pet.mechanics || ['none'],
    shape: shape || null,
    shapeSize: override.shapeSize,
    qualityUpgradeId: override.qualityUpgradeId || base.qualityUpgradeId || pet.qualityUpgradeId,
    qualityUpgradeSeed: override.qualityUpgradeSeed || `${petId}:${side}`,
    applyQualityProgression: override.applyQualityProgression,
    position: clone(position),
    flags: { sourceTable: 'csv_01', ...(override.flags || {}) }
  });
}

/**
 * 从试炼配置 def 创建单位（试炼路径）
 *
 * @param {object} def - 试炼配置 def 对象
 * @returns {object} unit
 */
function makeTrialUnit(def) {
  const boardRows = Number(def.boardRows || 8);
  const boardCols = Number(def.boardCols || 8);
  const boardMaxMove = Math.max(0, boardRows - 1) + Math.max(0, boardCols - 1);
  return createUnit({
    id: def.id,
    petId: def.petId || def.id,
    side: def.side,
    camp: def.camp || (def.side === 'hero' ? 'player' : 'enemy'),
    name: def.name,
    displayName: def.displayName,
    element: def.element || null,
    quality: def.quality,
    bodySize: def.bodySize,
    role: def.role,
    effectScore: def.effectScore || 0,
    maxHp: def.hp,
    hp: def.hp,
    atk: def.atk,
    def: def.def || 0,
    shield: def.shield || 0,
    maxShield: def.maxShield ?? def.shield ?? 0,
    ap: def.ap,
    moveRange: def.moveRange ?? def.moveAp ?? (def.side === 'hero' ? boardMaxMove : null),
    mechanics: def.mechanics || ['table_driven_trial'],
    shape: def.shape || null,
    shapeSize: def.shapeSize,
    qualityUpgradeId: def.qualityUpgradeId,
    qualityUpgradeSeed: def.qualityUpgradeSeed || def.petId || def.id,
    applyQualityProgression: def.applyQualityProgression,
    position: clone(def.position),
    flags: { sourceTable: def.flags?.sourceTable || 'trial_csv', sourceRow: def.sourceRow || null, ...(def.flags || {}) }
  });
}

module.exports = { createUnit, makeUnitFromData, makeTrialUnit };
