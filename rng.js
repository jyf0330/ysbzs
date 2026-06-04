/**
 * 元素背包史 · RNG 随机模块
 * 所有随机的总闸门，支持 seed 分流和复现
 * 依赖：无
 */

// ── 种子生成器（Mulberry32）───────────────────────────────────
let _rngSeed = null;
let _rngState = null;

/**
 * 设置随机种子，启用确定性随机
 * @param {number} seed - 整数种子
 */
function setRngSeed(seed) {
  _rngSeed = seed;
  _rngState = seed >>> 0;
}

/**
 * 获取当前种子
 */
function getRngSeed() {
  return _rngSeed;
}

/**
 * 获取确定性状态（用于快照/恢复）
 */
function getRngState() {
  return _rngState;
}

/**
 * 恢复确定性状态
 */
function setRngState(state) {
  _rngState = state >>> 0;
}

/**
 * 内部确定性 next() — Mulberry32
 */
function _rngNext() {
  if (_rngState === null) return Math.random();
  _rngState |= 0;
  _rngState = (_rngState + 0x6D2B79F5) | 0;
  let t = Math.imul(_rngState ^ (_rngState >>> 15), 1 | _rngState);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

/**
 * 返回 [0, 1) 随机数（有 seed 时确定性）
 */
function rngNext() {
  if (_rngSeed !== null) return _rngNext();
  return Math.random();
}

/**
 * 返回 [min, max) 随机整数
 */
function rngInt(min, max) {
  return Math.floor(rngNext() * (max - min)) + min;
}

/**
 * 从数组中随机选一个元素
 */
function rngPick(list) {
  if (!list || list.length === 0) return undefined;
  return list[rngInt(0, list.length)];
}

/**
 * 权重随机：返回 { index, item }
 * pool: [{item: any, weight: number}, ...]
 */
function rngPickWeighted(pool) {
  if (!pool || pool.length === 0) return null;
  const total = pool.reduce((s, p) => s + Math.max(0, p.weight || 1), 0);
  let r = rngNext() * total;
  for (let i = 0; i < pool.length; i++) {
    r -= Math.max(0, pool[i].weight || 1);
    if (r <= 0) return { index: i, item: pool[i].item };
  }
  return { index: pool.length - 1, item: pool[pool.length - 1].item };
}

/**
 * Fisher-Yates 洗牌
 */
function rngShuffle(list) {
  if (!list) return [];
  const arr = [...list];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = rngInt(0, i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// ── 旧接口兼容 ──────────────────────────────────────────────
function ri(n) { return rngInt(0, n); }
