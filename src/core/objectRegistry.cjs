/** objectRegistry.cjs — 收集当前可触发物体 */
function collectEffectObjects(state) {
  const out = [];
  for (const u of state.units || []) {
    if (!u.alive) continue;
    out.push({ objectId: u.id, objectType: 'unit', sourceId: u.petId, owner: u.camp, position: u.position, mechanics: u.mechanics || [] });
    for (const p of u.elementPackets || []) out.push({ objectId: p.packetId, objectType: 'element_packet', element: p.element, amount: p.amount, sourceId: p.sourceUnitId, owner: p.ownerSide, position: u.position, modifiers: p.modifiers || [] });
  }
  for (const cell of state.board?.cells || []) {
    for (const p of cell.elementPackets || []) out.push({ objectId: p.packetId, objectType: 'element_packet', element: p.element, amount: p.amount, sourceId: p.sourceUnitId, owner: p.ownerSide, position: { r: cell.r, c: cell.c }, modifiers: p.modifiers || [] });
    if ((cell.elements?.火 || 0) >= 3) out.push({ objectId: `fire_trap_${cell.r}_${cell.c}`, objectType: 'fire_trap', element: '火', amount: cell.elements.火, owner: cell.elementCamps?.火 || null, position: { r: cell.r, c: cell.c }, trigger: 'on_enemy_enter' });
  }
  return out;
}
module.exports = { collectEffectObjects };
