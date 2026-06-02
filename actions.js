/**
 * 元素背包史 · 行动槽/形状模块
 * 负责"一个行动槽打到哪里"：形状旋转、命中格计算、多格攻击
 * 依赖：data.js（SD 形状定义）、board.js（inBoard）
 */

// ── 形状旋转 ──────────────────────────────────────────────────
function rotCells(cells, dir) {
  switch (dir) {
    case 'right': return cells;
    case 'left':  return cells.map(([r, c]) => [r, -c]);
    case 'up':    return cells.map(([r, c]) => [-c, r]);
    case 'down':  return cells.map(([r, c]) => [c, r]);
  }
}

// ── 命中格计算 ────────────────────────────────────────────────
function atkCells(heroPos, sn, dir) {
  const s = SD[sn]; if (!s) return [];
  return rotCells(s.cells, dir)
    .map(([dr, dc]) => ({ r: heroPos.r + dr, c: heroPos.c + dc }))
    .filter(p => p.r >= 0 && p.r < 8 && p.c >= 0 && p.c < 8);
}

// ── 中心格（用于 centerBonus）───────────────────────────────
function findCenterCell(cells) {
  if (cells.length === 1) return cells[0];
  let best = cells[0], bestCount = 0;
  for (const c1 of cells) {
    let count = 0;
    for (const c2 of cells) {
      if (c1 !== c2 && Math.abs(c1.r - c2.r) + Math.abs(c1.c - c2.c) === 1) count++;
    }
    if (count > bestCount) { bestCount = count; best = c1; }
  }
  return best;
}

// ── 检查英雄从某位置能否攻击到敌方 ────────────────────────
function canHeroAttackEnemyFrom(pos, hid) {
  const hasEnemy = (G.monsters || []).some(m => !m.dead);
  const hasCastle = G.enemyCastle && G.enemyCastle.hp > 0;
  if (!hasEnemy && !hasCastle) return false;
  for (const s of G.slots || []) {
    if (s.used || s.hid !== hid) continue;
    const shape = SD[s.sn]; if (!shape) continue;
    const cells = rotCells(shape.cells, s.dir)
      .map(([dr, dc]) => ({ r: pos.r + dr, c: pos.c + dc }))
      .filter(inBoard);
    for (const p of cells) {
      if (monAt(p)) return true;
      if (enemyCastleAt(p)) return true;
    }
  }
  return false;
}
