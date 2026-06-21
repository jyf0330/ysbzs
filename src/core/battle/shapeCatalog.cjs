// @ts-check

/**
 * shapeCatalog.cjs — 《纸上西游》19 个战斗形状规则
 *
 * 坐标约定：
 * - ● 为角色位置，坐标是 {dr:0, dc:0}。
 * - ■ 为作用格。
 * - 所有 ■ 默认都结算 3 次；结算次数不是形状差异。
 * - offsets 全部按“默认向右”记录，其他方向运行时旋转得到。
 *
 * 重要约束：
 * - 旧形状 ID 已停用，不再解析 A1 / B1 / T1 / T2 / C1。
 * - 每个宠物在创建单位时都会被分配到 01-19 中的一个新形状。
 */

const DEFAULT_SHAPE_SETTLE_COUNT = 3;

/** @type {ReadonlyArray<Readonly<{id:string, group:'one'|'two'|'three', label:string, cellCount:number, settleCount:number, offsets:ReadonlyArray<Readonly<{dr:number,dc:number}>>, grid:ReadonlyArray<string>, note:string}>>} */
const SHAPE_DEFINITIONS = Object.freeze([
  { id: '01', group: 'one', label: '形状01', cellCount: 1, settleCount: DEFAULT_SHAPE_SETTLE_COUNT, offsets: Object.freeze([{ dr: 0, dc: 1 }]), grid: Object.freeze(['.......', '...●■..', '.......']), note: '一格，右侧相邻。' },
  { id: '02', group: 'one', label: '形状02', cellCount: 1, settleCount: DEFAULT_SHAPE_SETTLE_COUNT, offsets: Object.freeze([{ dr: 0, dc: 2 }]), grid: Object.freeze(['.......', '...●.■.', '.......']), note: '一格，右侧隔一格。' },
  { id: '03', group: 'one', label: '形状03', cellCount: 1, settleCount: DEFAULT_SHAPE_SETTLE_COUNT, offsets: Object.freeze([{ dr: 0, dc: 3 }]), grid: Object.freeze(['.......', '...●..■', '.......']), note: '一格，右侧隔两格。' },
  { id: '04', group: 'one', label: '形状04', cellCount: 1, settleCount: DEFAULT_SHAPE_SETTLE_COUNT, offsets: Object.freeze([{ dr: 0, dc: 4 }]), grid: Object.freeze(['........', '...●...■', '........']), note: '一格，右侧更远点。' },

  { id: '05', group: 'two', label: '形状05', cellCount: 2, settleCount: DEFAULT_SHAPE_SETTLE_COUNT, offsets: Object.freeze([{ dr: 0, dc: 1 }, { dr: 0, dc: 2 }]), grid: Object.freeze(['.......', '...●■■.', '.......']), note: '二格，右侧连续两格。' },
  { id: '06', group: 'two', label: '形状06', cellCount: 2, settleCount: DEFAULT_SHAPE_SETTLE_COUNT, offsets: Object.freeze([{ dr: 0, dc: -1 }, { dr: 0, dc: 1 }]), grid: Object.freeze(['.......', '..■●■..', '.......']), note: '二格，角色左右各一格。' },
  { id: '07', group: 'two', label: '形状07', cellCount: 2, settleCount: DEFAULT_SHAPE_SETTLE_COUNT, offsets: Object.freeze([{ dr: 0, dc: -2 }, { dr: 0, dc: 2 }]), grid: Object.freeze(['.......', '.■.●.■.', '.......']), note: '二格，角色左右隔点。' },
  { id: '08', group: 'two', label: '形状08', cellCount: 2, settleCount: DEFAULT_SHAPE_SETTLE_COUNT, offsets: Object.freeze([{ dr: 0, dc: 2 }, { dr: 0, dc: 3 }]), grid: Object.freeze(['.......', '...●.■■', '.......']), note: '二格，右侧远端连续两格。' },
  { id: '09', group: 'two', label: '形状09', cellCount: 2, settleCount: DEFAULT_SHAPE_SETTLE_COUNT, offsets: Object.freeze([{ dr: -1, dc: 1 }, { dr: 1, dc: 1 }]), grid: Object.freeze(['....■..', '...●...', '....■..']), note: '二格，右上与右下。' },
  { id: '10', group: 'two', label: '形状10', cellCount: 2, settleCount: DEFAULT_SHAPE_SETTLE_COUNT, offsets: Object.freeze([{ dr: -1, dc: 2 }, { dr: 1, dc: 2 }]), grid: Object.freeze(['.....■.', '...●...', '.....■.']), note: '二格，隔点右上与右下。' },
  { id: '11', group: 'two', label: '形状11', cellCount: 2, settleCount: DEFAULT_SHAPE_SETTLE_COUNT, offsets: Object.freeze([{ dr: -1, dc: -1 }, { dr: 1, dc: 1 }]), grid: Object.freeze(['..■....', '...●...', '....■..']), note: '二格，左上与右下对角。' },
  { id: '12', group: 'two', label: '形状12', cellCount: 2, settleCount: DEFAULT_SHAPE_SETTLE_COUNT, offsets: Object.freeze([{ dr: 0, dc: -1 }, { dr: 0, dc: 3 }]), grid: Object.freeze(['.......', '..■●...■', '.......']), note: '二格，左邻一格与右侧远点。' },

  { id: '13', group: 'three', label: '形状13', cellCount: 3, settleCount: DEFAULT_SHAPE_SETTLE_COUNT, offsets: Object.freeze([{ dr: -1, dc: 1 }, { dr: 0, dc: 1 }, { dr: 1, dc: 1 }]), grid: Object.freeze(['....■..', '...●■..', '....■..']), note: '三格，右侧相邻竖三格。' },
  { id: '14', group: 'three', label: '形状14', cellCount: 3, settleCount: DEFAULT_SHAPE_SETTLE_COUNT, offsets: Object.freeze([{ dr: -1, dc: 2 }, { dr: 0, dc: 1 }, { dr: 1, dc: 2 }]), grid: Object.freeze(['.....■.', '...●■..', '.....■.']), note: '三格，右侧近点加远端上下。' },
  { id: '15', group: 'three', label: '形状15', cellCount: 3, settleCount: DEFAULT_SHAPE_SETTLE_COUNT, offsets: Object.freeze([{ dr: 0, dc: 1 }, { dr: 0, dc: 2 }, { dr: 0, dc: 3 }]), grid: Object.freeze(['.......', '...●■■■', '.......']), note: '三格，右侧连续三格。' },
  { id: '16', group: 'three', label: '形状16', cellCount: 3, settleCount: DEFAULT_SHAPE_SETTLE_COUNT, offsets: Object.freeze([{ dr: -1, dc: 2 }, { dr: 0, dc: 2 }, { dr: 1, dc: 2 }]), grid: Object.freeze(['.....■.', '...●.■.', '.....■.']), note: '三格，隔点竖三格。' },
  { id: '17', group: 'three', label: '形状17', cellCount: 3, settleCount: DEFAULT_SHAPE_SETTLE_COUNT, offsets: Object.freeze([{ dr: -1, dc: 0 }, { dr: 0, dc: 1 }, { dr: 1, dc: 0 }]), grid: Object.freeze(['...■...', '...●■..', '...■...']), note: '三格，上下夹身加右侧相邻。' },
  { id: '18', group: 'three', label: '形状18', cellCount: 3, settleCount: DEFAULT_SHAPE_SETTLE_COUNT, offsets: Object.freeze([{ dr: -1, dc: 0 }, { dr: -1, dc: 1 }, { dr: 0, dc: 1 }]), grid: Object.freeze(['...■■..', '...●■..', '.......']), note: '三格，右上小角。' },
  { id: '19', group: 'three', label: '形状19', cellCount: 3, settleCount: DEFAULT_SHAPE_SETTLE_COUNT, offsets: Object.freeze([{ dr: -1, dc: 1 }, { dr: -1, dc: 2 }, { dr: 0, dc: 2 }]), grid: Object.freeze(['....■■.', '...●.■.', '.......']), note: '三格，隔点右上小角。' }
]);

const SHAPE_BY_ID = new Map(SHAPE_DEFINITIONS.map(shape => [shape.id, shape]));
const SHAPE_IDS_BY_GROUP = Object.freeze({
  one: Object.freeze(['01', '02', '03', '04']),
  two: Object.freeze(['05', '06', '07', '08', '09', '10', '11', '12']),
  three: Object.freeze(['13', '14', '15', '16', '17', '18', '19'])
});

function padShapeId(n) {
  const num = Number(n);
  if (!Number.isFinite(num)) return null;
  if (num < 1 || num > 19) return null;
  return String(Math.floor(num)).padStart(2, '0');
}

function normalizeShapeId(raw) {
  if (raw === undefined || raw === null || raw === '') return null;
  const text = String(raw).trim();
  if (!text) return null;
  if (SHAPE_BY_ID.has(text)) return text;
  const m = text.match(/^(?:shape[_-]?|s)?0?([1-9]|1[0-9])$/i) || text.match(/^形状\s*0?([1-9]|1[0-9])$/);
  return m ? padShapeId(m[1]) : null;
}

function resolveShapeDefinition(raw) {
  const id = normalizeShapeId(raw);
  return id ? (SHAPE_BY_ID.get(id) || null) : null;
}

function shapeGroupFromBodySize(bodySize) {
  const text = String(bodySize || '').trim();
  if (/小|small|一格|1/.test(text)) return 'one';
  if (/大|large|三格|3/.test(text)) return 'three';
  return 'two';
}

function shapeClassForGroup(group) {
  if (group === 'one') return '一格形状';
  if (group === 'three') return '三格形状';
  return '二格形状';
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

function assignedShapeIdForPet(petId, bodySize, role = '') {
  const group = shapeGroupFromBodySize(bodySize);
  const pool = SHAPE_IDS_BY_GROUP[group] || SHAPE_IDS_BY_GROUP.two;
  const seed = `${petId || ''}:${bodySize || ''}:${role || ''}`;
  return pool[hashString(seed) % pool.length];
}

function assignPetShapeToShapeRow(shapeRow, context = {}) {
  const petId = context.petId || shapeRow?.petId || shapeRow?.['宠物ID'] || '';
  const bodySize = context.bodySize || context.size || shapeRow?.bodySize || shapeRow?.size || '中型';
  const role = context.role || shapeRow?.role || '';
  const validExistingId = normalizeShapeId(shapeRow?.shapeId || shapeRow?.id);
  const shapeId = validExistingId || assignedShapeIdForPet(petId, bodySize, role);
  const def = resolveShapeDefinition(shapeId);
  const group = def ? def.group : shapeGroupFromBodySize(bodySize);
  const note = '新19形状；所有作用格默认结算3次；旧形状ID不参与战斗。';
  return Object.assign({}, shapeRow || {}, {
    petId,
    shapeId,
    shapeName: def ? def.label : `形状${shapeId}`,
    shapeClass: shapeClassForGroup(group),
    hitCells: def ? def.cellCount : 1,
    direction: shapeRow?.direction || '默认向右',
    slotCount: Number(shapeRow?.slotCount || 3),
    baseLayers: Number(shapeRow?.baseLayers || 1),
    settleCount: DEFAULT_SHAPE_SETTLE_COUNT,
    sourceShapeId: shapeRow?.sourceShapeId || shapeRow?.shapeId || null,
    note: shapeRow?.note ? `${note}${String(shapeRow.note).includes('旧形状') ? '' : ` 原备注：${shapeRow.note}`}` : note
  });
}

function rotateOffset(offset, dir = 'right') {
  const d = String(dir || 'right').toLowerCase();
  const dr = Number(offset.dr || 0);
  const dc = Number(offset.dc || 0);
  if (['up', 'u', '↑', 'north', '上'].includes(d)) return { dr: -dc, dc: dr };
  if (['down', 'd', '↓', 'south', '下'].includes(d)) return { dr: dc, dc: -dr };
  if (['left', 'l', '←', 'west', '左'].includes(d)) return { dr: -dr, dc: -dc };
  return { dr, dc };
}

function targetCellsForShape(start, shapeId, dir = 'right', inBoard = null) {
  const def = resolveShapeDefinition(shapeId);
  if (!def || !start) return [];
  const out = [];
  const seen = new Set();
  for (const offset of def.offsets) {
    const rotated = rotateOffset(offset, dir);
    const p = { r: Number(start.r || 0) + rotated.dr, c: Number(start.c || 0) + rotated.dc };
    const key = `${p.r},${p.c}`;
    if (seen.has(key)) continue;
    if (typeof inBoard === 'function' && !inBoard(p)) continue;
    seen.add(key);
    out.push(p);
  }
  return out;
}

function allShapeDefinitions() {
  return SHAPE_DEFINITIONS.slice();
}

module.exports = {
  DEFAULT_SHAPE_SETTLE_COUNT,
  SHAPE_DEFINITIONS,
  SHAPE_IDS_BY_GROUP,
  normalizeShapeId,
  resolveShapeDefinition,
  shapeGroupFromBodySize,
  assignedShapeIdForPet,
  assignPetShapeToShapeRow,
  rotateOffset,
  targetCellsForShape,
  allShapeDefinitions
};
